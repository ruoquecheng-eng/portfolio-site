export const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().trim();
export const searchTypes = ['all','projects','research','resume','materials','pages'];
const validType = value => searchTypes.includes(value) ? value : 'all';
export function searchDocuments(documents,query,type='all') {
  const tokens=normalize(query).split(/\s+/).filter(Boolean);
  type=validType(type);
  if(!tokens.length&&type==='all')return [];
  return documents.map((doc,index)=>{
    if(type!=='all'&&doc.type!==type)return null;
    const fields=[doc.title,doc.keywords,doc.summary,doc.text].map(normalize);
    if(!tokens.every(token=>fields.some(f=>f.includes(token))))return null;
    const score=tokens.reduce((sum,token)=>sum+(fields[0].includes(token)?12:0)+(fields[1].includes(token)?6:0)+(fields[2].includes(token)?3:0)+(fields[3].includes(token)?1:0),0);
    return {doc,score,index};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index).map(r=>r.doc);
}

// Map normalized matches back to the original text, including full-width text
// and composed characters, so highlighting never changes the displayed content.
export function highlightSegments(text,query) {
  text=String(text ?? '');
  const tokens=[...new Set(normalize(query).split(/\s+/).filter(Boolean))];
  if(!tokens.length)return [{text,match:false}];
  const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text);
  let normalized='';
  const starts=[],ends=[];
  for(const {segment,index} of graphemes) {
    const value=segment.normalize('NFKC').toLowerCase();
    normalized+=value;
    for(let i=0;i<value.length;i++){starts.push(index);ends.push(index+segment.length);}
  }
  const ranges=[];
  for(const token of tokens) {
    let from=0,at;
    while((at=normalized.indexOf(token,from))!==-1) {
      ranges.push([starts[at],ends[at+token.length-1]]);
      from=at+1;
    }
  }
  ranges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const merged=[];
  for(const range of ranges) {
    const last=merged.at(-1);
    if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);
    else merged.push([...range]);
  }
  const segments=[];
  let cursor=0;
  for(const [start,end] of merged) {
    if(start>cursor)segments.push({text:text.slice(cursor,start),match:false});
    segments.push({text:text.slice(start,end),match:true});cursor=end;
  }
  if(cursor<text.length||!segments.length)segments.push({text:text.slice(cursor),match:false});
  return segments;
}

export function searchSnippet(doc,query,length=220) {
  const text=String(doc.text ?? '').replace(/\s+/g,' ').trim();
  const tokens=normalize(query).split(/\s+/).filter(Boolean);
  let cursor=0;
  const hits=[];
  for(const segment of highlightSegments(text,query)) {
    if(segment.match)hits.push({start:cursor,end:cursor+segment.text.length});
    cursor+=segment.text.length;
  }
  if(!hits.length) {
    const fallback=String(doc.summary||text);
    return fallback.length>length?`${fallback.slice(0,length)}…`:fallback;
  }
  let start=0,best=-1;
  for(const hit of hits) {
    let candidate=Math.max(0,Math.min(hit.start-Math.floor(length/3),text.length-length));
    if(candidate+length<hit.end)candidate=Math.max(0,hit.end-length);
    const window=normalize(text.slice(candidate,candidate+length));
    const score=tokens.filter(token=>window.includes(token)).length;
    if(score>best){start=candidate;best=score;}
  }
  let end=Math.min(text.length,start+length);
  // Do not cut an English word at the edges. Chinese has no space boundary.
  if(start>0&&/[\p{L}\p{N}]/u.test(text[start-1])&&/[A-Za-z0-9]/.test(text[start])) {
    const space=text.indexOf(' ',start);
    if(space>=start&&space<start+30&&space<hits.find(hit=>hit.start>=start)?.start)start=space+1;
  }
  if(end<text.length&&/[A-Za-z0-9]/.test(text[end-1])&&/[A-Za-z0-9]/.test(text[end])) {
    const space=text.lastIndexOf(' ',end);
    if(space>end-30&&space>=hits.findLast(hit=>hit.start<end)?.end)end=space;
  }
  return `${start?'…':''}${text.slice(start,end).trim()}${end<text.length?'…':''}`;
}

export function readSearchState(url) {
  const params=new URL(url).searchParams;
  return {query:(params.get('q')||'').trim().slice(0,160),type:validType(params.get('type'))};
}
export function searchStateUrl(url,{query,type}) {
  const next=new URL(url);
  query=String(query ?? '').trim().slice(0,160);type=validType(type);
  query?next.searchParams.set('q',query):next.searchParams.delete('q');
  type==='all'?next.searchParams.delete('type'):next.searchParams.set('type',type);
  return next;
}
export function writeSearchHistory(history,url,state,commit=true,preserveDraft=false) {
  const next=searchStateUrl(url,state);
  const draft=history.state?.portfolioSearch?.draft===true;
  const unchanged=next.href===new URL(url).href;
  if(unchanged&&!(draft&&commit))return;
  // A first edit preserves the last committed URL. Further edits replace only
  // that draft; submitting it confirms the draft in place. Explicit controls
  // preserve a draft's query/type before pushing their changed state.
  if(draft&&preserveDraft&&!unchanged) {
    history.replaceState({...history.state,portfolioSearch:{draft:false}},'',new URL(url).href);
  }
  history[(draft&&!preserveDraft)||unchanged?'replaceState':'pushState'](
    {...history.state,portfolioSearch:{draft:!commit}},'',next.href
  );
}
export function shouldFocusSearch(event) {
  return event.key==='/'&&!event.defaultPrevented&&!event.isComposing&&
    !event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&
    !event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
}

if(typeof document!=='undefined') {
  const zh=document.documentElement.lang==='zh-CN';
  const filter=document.querySelector('[data-project-filter]');
  if(filter) {
    const items=[...document.querySelectorAll('[data-project-category]')];
    const choices=[...filter.querySelectorAll('input[name="project-category"]')];
    const restore=()=>{
      const category=new URLSearchParams(location.search).get('category');
      (choices.find(input=>input.value===category)||choices[0]).checked=true;
    };
    const update=()=>{
      const category=filter.querySelector('input:checked').value;
      const url=new URL(location.href);
      category==='all'?url.searchParams.delete('category'):url.searchParams.set('category',category);
      history.replaceState(null,'',url);
      items.forEach(item=>item.hidden=category!=='all'&&item.dataset.projectCategory!==category);
      filter.querySelector('[data-filter-count]').textContent=zh?`显示 ${items.filter(i=>!i.hidden).length} 个项目`:`Showing ${items.filter(i=>!i.hidden).length} projects`;
      for(const selector of ['.project-index-page','.supporting-projects']) {
        const section=document.querySelector(selector);
        if(section)section.hidden=![...section.querySelectorAll('[data-project-category]')].some(i=>!i.hidden);
      }
    };
    restore();filter.hidden=false;filter.addEventListener('change',update);update();
    window.addEventListener('popstate',()=>{restore();update();});
  }
  const form=document.getElementById('search-form');
  if(form) {
    const input=document.getElementById('search-query'),status=document.getElementById('search-status'),results=document.getElementById('search-results'),retry=document.getElementById('search-retry');
    const choices=[...document.querySelectorAll('input[name="search-type"]')];
    const clear=document.querySelector('.search-clear');
    const labels=zh?{projects:'项目',research:'研究',resume:'简历',materials:'材料',pages:'页面'}:{projects:'Projects',research:'Research',resume:'Resume',materials:'Materials',pages:'Pages'};
    let indexPromise,timer,revision=0,composing=false;
    const indexUrl=new URL(`../search-index-${zh?'zh-CN':'en'}.json`,import.meta.url);
    function loadIndex(){return indexPromise??=fetch(indexUrl,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Index unavailable');return r.json();}).then(data=>{if(!Array.isArray(data))throw Error('Invalid index');return data;});}
    const state=()=>({query:input.value.trim().slice(0,160),type:choices.find(choice=>choice.checked)?.value||'all'});
    function restore() {
      const {query,type}=readSearchState(location.href);input.value=query;
      choices.forEach(choice=>choice.checked=choice.value===type);
    }
    function appendHighlighted(element,text,query) {
      for(const segment of highlightSegments(text,query)) {
        if(segment.match){const mark=document.createElement('mark');mark.textContent=segment.text;element.append(mark);}
        else element.append(document.createTextNode(segment.text));
      }
    }
    function syncControls() {
      const {query,type}=state();
      for(const link of document.querySelectorAll('.language-switcher a')){
        link.href=searchStateUrl(link.href,{query,type}).href;
      }
      clear.disabled=!query&&type==='all';
    }
    async function render() {
      const current=++revision,{query,type}=state();
      syncControls();
      results.replaceChildren();retry.hidden=true;
      if(!query&&type==='all'){status.textContent=zh?'输入关键词，搜索当前语言版本的内容。':'Enter a keyword to search this language version.';return;}
      status.textContent=zh?'正在搜索…':'Searching…';
      try {
        const docs=await loadIndex();if(current!==revision)return;
        const matches=searchDocuments(docs,query,type);
        status.textContent=matches.length?(zh?`找到 ${matches.length} 条结果`:`${matches.length} results found`):(zh?'没有找到结果。试试项目名称、缩写或更短的关键词。':'No results. Try a project name, abbreviation, or shorter keyword.');
        for(const doc of matches){
          const url=new URL(doc.url,location.origin);
          if(url.origin!==location.origin||!url.pathname.startsWith(new URL('../',import.meta.url).pathname))continue;
          const li=document.createElement('li'),h=document.createElement('h2'),a=document.createElement('a'),p=document.createElement('p'),kind=document.createElement('p');
          a.href=url.href;appendHighlighted(a,doc.title,query);
          p.className='search-result-snippet';appendHighlighted(p,searchSnippet(doc,query),query);
          kind.className='search-result-type';kind.textContent=labels[doc.type]||labels.pages;
          h.append(a);li.append(kind,h,p);results.append(li);
        }
      }catch {
        if(current!==revision)return;
        status.textContent=zh?'搜索暂时不可用。请检查网络后重试，或从导航浏览项目与研究。':'Search is unavailable. Check your connection and retry, or browse Projects and Research.';
        retry.hidden=false;indexPromise=undefined;
      }
    }
    function update(commit=true,preserveDraft=false) {
      clearTimeout(timer);writeSearchHistory(history,location.href,state(),commit,preserveDraft);render();
    }
    function schedule() {
      revision++;clearTimeout(timer);
      if(!composing){syncControls();timer=setTimeout(()=>update(false),150);}
    }
    restore();
    document.querySelector('.search-tools').hidden=false;
    form.addEventListener('submit',event=>{event.preventDefault();if(!composing)update();});
    input.addEventListener('compositionstart',()=>{composing=true;revision++;clearTimeout(timer);});
    input.addEventListener('compositionend',()=>{composing=false;schedule();});
    input.addEventListener('input',event=>{
      if(event.isComposing){revision++;clearTimeout(timer);return;}
      schedule();
    });
    choices.forEach(choice=>choice.addEventListener('change',()=>{if(choice.checked)update(true,true);}));
    for(const button of document.querySelectorAll('.search-suggestions [data-query]')) {
      button.addEventListener('click',()=>{input.value=button.dataset.query;composing=false;update(true,true);input.focus();});
    }
    clear.addEventListener('click',()=>{
      input.value='';choices.forEach(choice=>choice.checked=choice.value==='all');composing=false;update(true,true);input.focus();
    });
    retry.addEventListener('click',()=>render());
    window.addEventListener('popstate',()=>{clearTimeout(timer);composing=false;restore();render();});
    document.addEventListener('keydown',event=>{if(shouldFocusSearch(event)&&!document.querySelector('dialog[open]')){event.preventDefault();input.focus();}});
    render();
  }
}
