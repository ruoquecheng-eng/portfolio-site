(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const zh = document.documentElement.lang === 'zh-CN';
  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim();
  const active = new Map();
  const players = [];
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.dataset.input='keyboard'; }, {capture:true});
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.dataset.input='pointer'; }, {capture:true});

  function settle(element) {
    active.get(element)?.cancel();
    active.delete(element);
  }
  function enter(element, duration=220, distance=6) {
    if (reduce.matches || keyboard || document.hidden || !element.animate) return;
    const current = active.has(element) ? getComputedStyle(element) : null;
    const from = current ? {opacity:current.opacity,transform:current.transform} : {opacity:.7,transform:`translateY(${distance}px)`};
    settle(element);
    const animation = element.animate([from,{opacity:1,transform:'translateY(0)'}],{duration,easing:ease});
    active.set(element,animation);
    animation.finished.then(() => { if(active.get(element)===animation) active.delete(element); }).catch(() => {});
  }

  document.querySelectorAll('[data-showcase]').forEach(showcase => {
    const controls = showcase.querySelector('[data-showcase-controls]');
    const tabs = [...showcase.querySelectorAll('[data-showcase-tab]')];
    const panels = [...showcase.querySelectorAll('[data-panel]')];
    if (!controls || tabs.length !== panels.length || !panels.length) return;
    let selected = 0;
    function select(index, animate=false) {
      const changed = selected !== index;
      selected = index;
      tabs.forEach((tab,i) => {
        tab.setAttribute('aria-selected',String(i===index));
        tab.tabIndex = i===index ? 0 : -1;
        panels[i].hidden = i!==index;
        if(i!==index) settle(panels[i]);
      });
      if(changed && animate) enter(panels[index]);
    }
    controls.setAttribute('role','tablist');
    tabs.forEach((tab,i) => {
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-controls',panels[i].id);
      panels[i].setAttribute('role','tabpanel');
      panels[i].setAttribute('aria-labelledby',tab.id);
      panels[i].tabIndex = 0;
      tab.addEventListener('click',event => select(i,event.detail>0));
      tab.addEventListener('keydown',event => {
        let next;
        if(event.key==='ArrowRight') next=(selected+1)%tabs.length;
        if(event.key==='ArrowLeft') next=(selected+tabs.length-1)%tabs.length;
        if(event.key==='Home') next=0;
        if(event.key==='End') next=tabs.length-1;
        if(next===undefined) return;
        event.preventDefault(); select(next); tabs[next].focus();
      });
    });
    select(0);
    showcase.dataset.enhanced = 'true';
    controls.hidden = false;

    const sequence = showcase.querySelector('[data-probe-sequence]');
    if (!sequence) return;
    const button = sequence.querySelector('[data-sequence-play]');
    const progress = sequence.querySelector('[data-probe-progress]');
    const status = sequence.querySelector('[data-probe-status]');
    const steps = [...sequence.querySelectorAll('[data-probe-step]')];
    const duration = 1600;
    let animation, elapsed=0, running=false, timers=[];
    const labels = zh ? {play:'播放流程',pause:'暂停',resume:'继续播放',replay:'重新播放',idle:'流程示意',paused:'已暂停',done:'流程示意结束'} : {play:'Play sequence',pause:'Pause',resume:'Resume',replay:'Replay sequence',idle:'Conceptual sequence',paused:'Paused',done:'Sequence complete'};
    function paint(time) {
      steps.forEach((step,i) => step.toggleAttribute('data-complete',time>=i*duration/4));
    }
    function clearTimers() { timers.forEach(clearTimeout); timers=[]; }
    function pause() {
      if(!running) return;
      elapsed=Number(animation?.currentTime)||elapsed;
      animation?.pause(); clearTimers(); running=false;
      button.setAttribute('aria-pressed','false');
      button.textContent=labels.resume; status.textContent=labels.paused;
    }
    function staticState() {
      pause(); animation?.cancel(); animation=undefined;
      elapsed=reduce.matches?duration:0; paint(elapsed);
      progress.style.transform=reduce.matches?'scaleX(1)':'scaleX(0)';
      button.hidden=reduce.matches || !progress.animate;
      button.textContent=labels.play; button.setAttribute('aria-pressed','false');
      status.textContent=labels.idle;
    }
    button.addEventListener('click', () => {
      if(running) { pause(); return; }
      if(reduce.matches || document.hidden || !progress.animate) return;
      if(elapsed>=duration) { elapsed=0; animation?.cancel(); animation=undefined; }
      if(!animation) {
        animation=progress.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration,easing:'linear',fill:'forwards'});
        animation.pause();
      }
      animation.currentTime=elapsed; animation.play(); running=true;
      button.setAttribute('aria-pressed','true'); button.textContent=labels.pause;
      status.textContent=labels.idle; paint(elapsed);
      for(let i=1;i<=4;i++) {
        const time=i*duration/4;
        if(time>elapsed) timers.push(setTimeout(() => {
          elapsed=time; paint(time);
          if(i===4) {
            running=false; clearTimers(); animation.cancel(); animation=undefined;
            progress.style.transform='scaleX(1)';
            button.setAttribute('aria-pressed','false'); button.textContent=labels.replay; status.textContent=labels.done;
          }
        },time-elapsed));
      }
    });
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      if(!entries[0].isIntersecting) pause();
    },{threshold:0}) : null;
    observer?.observe(sequence);
    players.push({pause,staticState}); staticState();
  });

  if('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      for(const entry of entries) if(entry.isIntersecting) {
        enter(entry.target,420,8); observer.unobserve(entry.target);
      }
    },{threshold:.12});
    document.querySelectorAll('.selected-work .project-preview-link').forEach(element => observer.observe(element));
  }
  // Scroll reveal: only elements still below the fold start pending, so content
  // that is already visible never disappears, and printing reveals everything.
  const revealables = [...document.querySelectorAll('[data-reveal], main > article > .section:not(.notice-section), .project-index-page > .project-row, .project-card, .research-list > li')];
  revealables.forEach(element => element.setAttribute('data-reveal',''));
  function revealAll() { revealables.forEach(element => element.classList.remove('is-pending')); }
  document.addEventListener('keydown',revealAll,{capture:true,once:true});
  if('IntersectionObserver' in window && !reduce.matches && revealables.length) {
    const reveal = new IntersectionObserver(entries => {
      for(const entry of entries) if(entry.isIntersecting) {
        entry.target.classList.remove('is-pending'); reveal.unobserve(entry.target);
      }
    },{threshold:.15,rootMargin:'0px 0px -8% 0px'});
    revealables.forEach(element => {
      if(element.getBoundingClientRect().top > innerHeight * .9) element.classList.add('is-pending');
      reveal.observe(element);
    });
    document.documentElement.dataset.revealReady = 'true';
  }

  document.addEventListener('portfolio:content',event => {
    for(const element of active.keys()) if(element.hidden || !element.isConnected) settle(element);
    (event.detail?.targets||[]).slice(0,4).forEach(element => enter(element,180,4));
  });
  function finish() {
    for(const element of active.keys()) settle(element);
    players.forEach(player => player.pause());
  }
  document.addEventListener('visibilitychange', () => { if(document.hidden) finish(); });
  window.addEventListener('pagehide',finish);
  window.addEventListener('beforeprint',() => { finish(); revealAll(); });
  reduce.addEventListener('change', () => { finish(); revealAll(); players.forEach(player => player.staticState()); });
})();
