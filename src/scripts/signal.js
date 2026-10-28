// Homepage signal stage: a small 16-QAM link over AWGN simulated in the browser.
// The readout reports values computed from the drawn symbols; nothing is measured.
(() => {
  'use strict';
  const canvas = document.querySelector('[data-signal-canvas]');
  const stage = canvas?.closest('.stage');
  if (!canvas || !stage || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const readout = Object.fromEntries([...stage.querySelectorAll('[data-readout]')].map((el) => [el.dataset.readout, el]));
  const levels = [-3, -1, 1, 3].map((v) => v / Math.sqrt(10));
  const capacity = 1600;
  const points = new Float32Array(capacity * 4); // received I, received Q, ideal I, ideal Q
  const born = new Float32Array(capacity);
  let head = 0, count = 0, total = 0;
  let width = 0, height = 0, dpr = 1;
  let snr = -2, target = 20, pointerTarget = null, start = performance.now();
  let running = false, visible = true, frame = 0, lastReadout = 0;
  let colors = {};
  const carriers = Array.from({ length: 12 }, () => ({ a: 0, b: 0 }));
  let carrierEpoch = -1;

  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const symbol = () => levels[(Math.random() * 4) | 0];

  function readColors() {
    const style = getComputedStyle(stage);
    colors = {
      signal: style.getPropertyValue('--stage-signal').trim() || '#5ee6d0',
      grid: style.getPropertyValue('--stage-grid').trim() || 'rgba(255,255,255,0.08)',
      ink: style.getPropertyValue('--stage-ink-faint').trim() || 'rgba(255,255,255,0.5)',
    };
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw(performance.now());
  }

  function geometry() {
    const wide = width >= 900;
    return {
      cx: wide ? width * 0.73 : width * 0.5,
      cy: wide ? height * 0.4 : height * 0.2,
      r: wide ? Math.min(height * 0.25, width * 0.17) : Math.min(width * 0.32, height * 0.13),
      alpha: wide ? 1 : 0.42,
    };
  }

  function emit(n, now) {
    const sigma = Math.sqrt(1 / (2 * Math.pow(10, snr / 10)));
    const phase = 0.05 * Math.sin(now / 3200);
    const c = Math.cos(phase), s = Math.sin(phase);
    for (let k = 0; k < n; k++) {
      const i = symbol(), q = symbol();
      const ni = i + sigma * gauss(), nq = q + sigma * gauss();
      const o = head * 4;
      points[o] = ni * c - nq * s;
      points[o + 1] = ni * s + nq * c;
      points[o + 2] = i;
      points[o + 3] = q;
      born[head] = now;
      head = (head + 1) % capacity;
      count = Math.min(count + 1, capacity);
      total++;
    }
  }

  function updateReadout(now) {
    if (now - lastReadout < 160) return;
    lastReadout = now;
    let err = 0, ref = 0;
    const n = Math.min(count, 600);
    for (let k = 1; k <= n; k++) {
      const o = ((head - k + capacity) % capacity) * 4;
      const di = points[o] - points[o + 2], dq = points[o + 1] - points[o + 3];
      err += di * di + dq * dq;
      ref += points[o + 2] * points[o + 2] + points[o + 3] * points[o + 3];
    }
    if (readout.snr) readout.snr.textContent = `${snr.toFixed(1)} dB`;
    if (readout.evm && ref) readout.evm.textContent = `${(Math.sqrt(err / ref) * 100).toFixed(1)}%`;
    if (readout.symbols) readout.symbols.textContent = total.toLocaleString('en-US');
  }

  function drawWaveform(now) {
    const epoch = Math.floor(now / 900);
    if (epoch !== carrierEpoch) {
      carrierEpoch = epoch;
      carriers.forEach((carrier) => { carrier.a = symbol(); carrier.b = symbol(); });
    }
    const base = height * (width >= 900 ? 0.88 : 0.93);
    const amp = Math.min(height * 0.035, 26);
    const shift = now / 1400;
    ctx.lineWidth = 1.25;
    for (const [part, alpha] of [[0, 0.4], [1, 0.16]]) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const t = x / width * 6 + shift;
        let y = 0;
        carriers.forEach((carrier, n) => {
          const w = 2 * Math.PI * (n + 1) * t;
          y += part ? carrier.b * Math.sin(w) : carrier.a * Math.cos(w);
        });
        const fade = Math.min(1, x / (width * 0.25), (width - x) / (width * 0.25));
        const py = base + (y / 3.2) * amp * fade;
        x ? ctx.lineTo(x, py) : ctx.moveTo(x, py);
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colors.signal;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    const { cx, cy, r, alpha } = geometry();
    const scale = r / 1.25;
    ctx.globalAlpha = alpha;
    // Axes and decision grid.
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.25, cy); ctx.lineTo(cx + r * 1.25, cy);
    ctx.moveTo(cx, cy - r * 1.25); ctx.lineTo(cx, cy + r * 1.25);
    for (const b of [-2, 2].map((v) => v / Math.sqrt(10))) {
      ctx.moveTo(cx + b * scale, cy - r * 1.15); ctx.lineTo(cx + b * scale, cy + r * 1.15);
      ctx.moveTo(cx - r * 1.15, cy + b * scale); ctx.lineTo(cx + r * 1.15, cy + b * scale);
    }
    ctx.setLineDash([2, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.ink;
    ctx.font = '11px "JetBrains Mono Variable", ui-monospace, monospace';
    ctx.fillText('I', cx + r * 1.25 + 6, cy + 4);
    ctx.fillText('Q', cx - 4, cy - r * 1.25 - 8);
    // Ideal constellation points.
    for (const i of levels) for (const q of levels) {
      ctx.strokeStyle = colors.ink;
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeRect(cx + i * scale - 4, cy - q * scale - 4, 8, 8);
    }
    // Received symbols fade with age.
    ctx.fillStyle = colors.signal;
    const life = reduce.matches ? Infinity : 2600;
    for (let k = 0; k < count; k++) {
      const age = now - born[k];
      if (age > life) continue;
      const o = k * 4;
      const x = cx + points[o] * scale, y = cy - points[o + 1] * scale;
      ctx.globalAlpha = alpha * (reduce.matches ? 0.7 : Math.max(0, 1 - age / life) * 0.95);
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.globalAlpha = alpha;
    drawWaveform(now);
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    if (!running) return;
    const intro = Math.min(1, (now - start) / 1800);
    const drift = 19 + 5 * Math.sin(now / 4200);
    target = pointerTarget ?? drift;
    const goal = intro < 1 ? -2 + (target + 2) * (1 - Math.pow(1 - intro, 3)) : target;
    snr += (goal - snr) * (intro < 1 ? 0.35 : 0.06);
    emit(18, now);
    draw(now);
    updateReadout(now);
    frame = requestAnimationFrame(tick);
  }

  function play() {
    if (running || reduce.matches || !visible || document.hidden) return;
    running = true;
    frame = requestAnimationFrame(tick);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function renderStatic() {
    pause();
    snr = 20;
    const now = performance.now();
    count = 0; head = 0; total = 0;
    emit(1200, now);
    lastReadout = 0;
    draw(now);
    updateReadout(now + 1000);
  }

  stage.addEventListener('pointermove', (event) => {
    if (reduce.matches) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    pointerTarget = 2 + x * 28;
  });
  stage.addEventListener('pointerleave', () => { pointerTarget = null; });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? play() : pause();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  reduce.addEventListener?.('change', () => (reduce.matches ? renderStatic() : (start = performance.now() - 1800, play())));
  new MutationObserver(() => { readColors(); if (!running) draw(performance.now()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new ResizeObserver(resize).observe(stage);

  readColors();
  resize();
  stage.dataset.signal = 'live';
  reduce.matches ? renderStatic() : play();
})();
