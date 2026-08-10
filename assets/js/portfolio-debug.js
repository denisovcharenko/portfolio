'use strict';

(function () {
  if (!new URLSearchParams(window.location.search).has('admin')) return;

  // ── Default config ────────────────────────────────────
  const DEFAULTS = {
    cylR: 3000, zMult: 8.0, maxDeg: 9,
    flatZone: 110, fadeZone: 545,
    persp: 1450, origX: 85, origY: 92,
    sensitivity: 0.09, friction: 0.93, maxVel: 80, smoothR: 3, shrinkDelay: 60,
    crossSpeed: 0.40, crossSmooth: 82,
    speed0: 1.00, speed1: 0.85, speed2: 0.70,
    sceneTiltX: 0, sceneTiltY: 0, sceneSkewX: 0, cylAxis: 0, bowlStrength: 0,
    pitCenterY: 0.75, pitRadius: 200, pitDepth: 0,
    curveSharp: 1.0, curveBias: 0,
  };

  window.__cylCfg = Object.assign({}, DEFAULTS);
  const cfg = window.__cylCfg;

  // ── Built-in presets ──────────────────────────────────
  const BUILT_IN = [
    { name: 'Default', values: { ...DEFAULTS } },
    {
      name: 'Subtle',
      values: { ...DEFAULTS, cylR: 6000, zMult: 4.0, maxDeg: 5, flatZone: 220, fadeZone: 400, sensitivity: 0.06, friction: 0.95, crossSpeed: 0.20, speed1: 0.92, speed2: 0.84 },
    },
    {
      name: 'Bold',
      values: { ...DEFAULTS, cylR: 1200, zMult: 12.0, maxDeg: 16, flatZone: 50, fadeZone: 280, sensitivity: 0.13, friction: 0.90, crossSpeed: 0.70, speed1: 0.75, speed2: 0.50 },
    },
    {
      name: 'Flat',
      values: { ...DEFAULTS, cylR: 10000, zMult: 0, maxDeg: 2, flatZone: 600, fadeZone: 0, bowlStrength: 0, pitDepth: 0 },
    },
  ];

  // ── Sections ──────────────────────────────────────────
  const sections = [
    {
      title: 'CYLINDER',
      rows: [
        { id: 'cylR',   label: 'Radius',    tip: 'Радіус уявного циліндра вздовж якого вигинаються колонки. Менше значення — різкіший вигин (як трубочка), більше — майже пласка поверхня.', min: 100, max: 10000, step: 50, fmt: v => Math.round(v), unit: 'px' },
        { id: 'zMult',  label: 'Z Depth',   tip: 'Наскільки далеко від глядача зміщуються картинки у глибину. 0 — всі в одній площині, 16 — максимальний просторовий провал.', min: 0, max: 16, step: 0.1, fmt: v => v.toFixed(1), unit: '×' },
        { id: 'maxDeg', label: 'Max Angle', tip: 'Максимальний кут нахилу крайніх карток. Більше — агресивніша перспектива по краях сцени.', min: 1, max: 89, step: 1, fmt: v => Math.round(v), unit: '°' },
      ],
    },
    {
      title: 'ZONES',
      rows: [
        { id: 'flatZone', label: 'Flat Zone', tip: 'Ширина центральної зони де картинки залишаються рівними без будь-якого вигину циліндра.', min: 0, max: 600, step: 5, fmt: v => Math.round(v), unit: 'px' },
        { id: 'fadeZone', label: 'Fade Zone', tip: 'Ширина зони плавного переходу від рівних картинок до вигнутих. Більше = м\'якший перехід.', min: 0, max: 600, step: 5, fmt: v => Math.round(v), unit: 'px' },
      ],
    },
    {
      title: 'PERSPECTIVE',
      rows: [
        { id: 'persp', label: 'Depth',    tip: 'Різкість CSS 3D перспективи. Менше — сильніший ефект "риб\'ячого ока". Більше — майже паралельна проекція без спотворень.', min: 200, max: 3000, step: 50, fmt: v => Math.round(v), unit: 'px' },
        { id: 'origX', label: 'Origin X', tip: 'Горизонтальне положення точки сходу — звідки ніби "дивимось" на 3D-сцену. 50% = центр екрану, 85% = правіше від центру.', min: 0, max: 100, step: 1, fmt: v => Math.round(v), unit: '%' },
        { id: 'origY', label: 'Origin Y', tip: 'Вертикальне положення точки сходу. 0% = верхній край, 100% = нижній. Впливає на відчуття висоти огляду.', min: 0, max: 100, step: 1, fmt: v => Math.round(v), unit: '%' },
      ],
    },
    {
      title: 'SCROLL',
      rows: [
        { id: 'sensitivity', label: 'Sensitivity', tip: 'Чутливість до руху миші або трекпаду. Більше — швидша реакція на менший рух пальця.', min: 0.01, max: 0.5, step: 0.01, fmt: v => v.toFixed(2), unit: '' },
        { id: 'friction',    label: 'Friction',    tip: 'Тертя — як швидко зупиняється скрол після відпускання. 0.99 = дуже плавне та довге гальмування, 0.80 = майже миттєва зупинка. Графік показує криву загасання.', min: 0.80, max: 0.999, step: 0.001, fmt: v => v.toFixed(3), unit: '', graph: 'friction' },
        { id: 'maxVel',      label: 'Max Velocity', tip: 'Максимальна швидкість прокрутки в пікселях за кадр. Обмежує "розкид" при різких та швидких рухах.', min: 20, max: 400, step: 5, fmt: v => Math.round(v), unit: 'px' },
        { id: 'smoothR',     label: 'Smoothness',   tip: 'Кількість кадрів для усереднення швидкості колонок. Більше = плавніший, але менш чуйний рух.', min: 0, max: 98, step: 1, fmt: v => Math.round(v), unit: '' },
        { id: 'shrinkDelay', label: 'Shrink Delay', tip: 'Затримка перед поверненням карток до повного розміру після зупинки скролу. 0 = миттєво, 600 = затримка 600мс.', min: 0, max: 600, step: 10, fmt: v => Math.round(v), unit: 'ms' },
      ],
    },
    {
      title: 'CROSSHAIR',
      rows: [
        { id: 'crossSpeed',  label: 'Spin Speed',  tip: 'Швидкість обертання плюсика-перехрестя. Права панель крутить в протилежному напрямку від лівої.', min: 0, max: 2, step: 0.05, fmt: v => v.toFixed(2), unit: '×' },
        { id: 'crossSmooth', label: 'Stop Smooth', tip: 'Плавність зупинки плюсика. Більше значення — довше крутиться після закінчення скролу.', min: 0, max: 98, step: 1, fmt: v => Math.round(v), unit: '' },
      ],
    },
    {
      title: 'PARALLAX',
      rows: [
        { id: 'speed0', label: 'Column 1', tip: 'Швидкість лівої колонки thumbnail відносно скролу. 1.0 = синхронно зі скролом, більше = швидше.', min: 0.1, max: 2, step: 0.05, fmt: v => v.toFixed(2), unit: '×' },
        { id: 'speed1', label: 'Column 2', tip: 'Швидкість середньої колонки. Зазвичай трохи менша ніж Column 1 — створює відчуття паралакс-глибини.', min: 0.1, max: 2, step: 0.05, fmt: v => v.toFixed(2), unit: '×' },
        { id: 'speed2', label: 'Column 3', tip: 'Швидкість правої колонки. Найменша для найбільш "далекого" відчуття у просторі.', min: 0.1, max: 2, step: 0.05, fmt: v => v.toFixed(2), unit: '×' },
      ],
    },
    {
      title: 'SHAPE',
      rows: [
        { id: 'sceneTiltX',   label: 'Tilt X',      tip: 'Нахил всієї 3D-сцени вперед або назад (по осі X). 0 = нейтральне положення.', min: -40, max: 40, step: 0.5, fmt: v => v.toFixed(1), unit: '°' },
        { id: 'sceneTiltY',   label: 'Tilt Y',       tip: 'Нахил сцени вліво або вправо (по осі Y). 0 = нейтральне положення.', min: -40, max: 40, step: 0.5, fmt: v => v.toFixed(1), unit: '°' },
        { id: 'sceneSkewX',   label: 'Skew X',       tip: 'Горизонтальний скіс всієї сцени. Надає відчуття динаміки, руху або нестабільності.', min: -30, max: 30, step: 0.5, fmt: v => v.toFixed(1), unit: '°' },
        { id: 'cylAxis',      label: 'Cylinder Axis', tip: 'Вісь циліндра. 0 = вертикальний (↕ — колонки вигинаються зліва-направо), 1 = горизонтальний (↔). Можна змішувати.', min: 0, max: 1, step: 0.05, fmt: v => v.toFixed(2), unit: '' },
        { id: 'bowlStrength', label: 'Bowl Depth',   tip: 'Глибина ефекту "чаші" — крайні колонки додатково вигинаються у глибину. 0 = вимкнено.', min: 0, max: 3, step: 0.05, fmt: v => v.toFixed(2), unit: '×' },
      ],
    },
    {
      title: 'PIT',
      rows: [
        { id: 'pitCenterY', label: 'Position', tip: 'Вертикальне положення "ями". 0 = верх екрану, 1 = низ. Звідси починається провал карток углиб.', min: 0, max: 1, step: 0.01, fmt: v => v.toFixed(2), unit: '' },
        { id: 'pitRadius',  label: 'Width',    tip: 'Ширина зони провалу. Менше = вузька різка яма, більше = широка поступова западина.', min: 50, max: 600, step: 10, fmt: v => Math.round(v), unit: 'px' },
        { id: 'pitDepth',   label: 'Depth',    tip: 'Глибина провалу карток у "яму". 0 = ефект вимкнено. Більше = картки глибше тонуть при наближенні до центру.', min: 0, max: 2000, step: 10, fmt: v => Math.round(v), unit: 'px' },
      ],
    },
    {
      title: 'CURVE',
      rows: [
        { id: 'curveSharp', label: 'Sharpness', tip: 'Крутість кривої розгортки ефекту. 1.0 = лінійно. > 1 = плавний старт і різкий фінал (ефект концентрується на краях). < 1 = різкий старт і плавне загасання (ефект сильніший поряд з центром).', min: 0.2, max: 3.0, step: 0.05, fmt: v => v.toFixed(2), unit: '' },
        { id: 'curveBias',  label: 'Travel',    tip: 'Зсув кривої вгору або вниз. 0 = симетрично. + = ефект відчутніший ближче до 1. − = ефект різко набирає силу вже від початку зони.', min: -0.95, max: 0.95, step: 0.05, fmt: v => v.toFixed(2), unit: '', graph: 'curve' },
      ],
    },
  ];

  // ── CSS apply ─────────────────────────────────────────
  const scene = document.getElementById('col-3d-scene');
  function applyCSS() {
    scene.style.perspective       = cfg.persp + 'px';
    scene.style.perspectiveOrigin = cfg.origX + '% ' + cfg.origY + '%';
    scene.style.transform = `rotateX(${cfg.sceneTiltX}deg) rotateY(${cfg.sceneTiltY}deg) skewX(${cfg.sceneSkewX}deg)`;
  }

  // ── User presets (localStorage) ───────────────────────
  const STORAGE_KEY = 'portfolio-debug-presets';
  function getUserPresets() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
  function saveUserPresets(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
  function getAllPresets()    { return [...BUILT_IN, ...getUserPresets()]; }

  // ── Build panel DOM ───────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'dbg-panel';
  document.body.appendChild(panel);

  // Header
  panel.insertAdjacentHTML('beforeend', `
    <div id="dbg-header">
      <span>COMPOSITION</span>
      <button id="dbg-close">✕</button>
    </div>
  `);

  // Preset row
  panel.insertAdjacentHTML('beforeend', `
    <div id="dbg-preset-row">
      <select id="dbg-sel"></select>
      <button id="dbg-save-btn" title="Зберегти поточний стан як пресет">✦</button>
      <button id="dbg-del-btn"  title="Видалити збережений пресет">✕</button>
    </div>
    <div id="dbg-action-row">
      <button id="dbg-copy-btn">⊞ Copy</button>
      <button id="dbg-reset-btn">↺ Reset</button>
    </div>
    <div class="dbg-div"></div>
  `);

  // Sections
  for (const sec of sections) {
    const secEl = document.createElement('div');
    secEl.className = 'dbg-sec';

    const head = document.createElement('div');
    head.className = 'dbg-sec-head';
    head.innerHTML = `<span>${sec.title}</span><span class="dbg-arrow">▾</span>`;
    secEl.appendChild(head);

    const body = document.createElement('div');
    body.className = 'dbg-sec-body';

    let collapsed = false;
    head.addEventListener('click', () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? 'none' : '';
      head.querySelector('.dbg-arrow').textContent = collapsed ? '▸' : '▾';
    });

    for (const r of sec.rows) {
      const val  = cfg[r.id];
      const disp = r.fmt ? r.fmt(val) : val;

      const row = document.createElement('div');
      row.className = 'dbg-row';
      row.innerHTML = `
        <div class="dbg-row-top">
          <span class="dbg-lbl" data-tip="${r.tip}">${r.label}</span>
          <span class="dbg-val" id="v-${r.id}">${disp}${r.unit}</span>
        </div>
        <input type="range" class="dbg-slider" id="s-${r.id}"
          min="${r.min}" max="${r.max}" step="${r.step}" value="${val}">
        ${r.graph === 'friction' ? '<canvas id="dbg-curve" width="240" height="36" class="dbg-graph"></canvas>' : r.graph === 'curve' ? '<canvas id="dbg-curve-shape" width="240" height="80" class="dbg-graph"></canvas>' : ''}
      `;
      body.appendChild(row);
    }

    secEl.appendChild(body);
    panel.appendChild(secEl);
  }

  // ── Toggle button ─────────────────────────────────────
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'dbg-toggle';
  toggleBtn.textContent = '⌘';
  document.body.appendChild(toggleBtn);

  // ── Tooltip element ───────────────────────────────────
  const tooltip = document.createElement('div');
  tooltip.id = 'dbg-tip';
  document.body.appendChild(tooltip);

  // ── Friction curve graph ──────────────────────────────
  function drawFriction() {
    const c = document.getElementById('dbg-curve');
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, W, H);
    ctx.beginPath();
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 1.5;
    let v = 1;
    for (let x = 0; x < W; x++) {
      const y = H - 4 - v * (H - 8);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      v *= cfg.friction;
    }
    ctx.stroke();
    // zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H - 4); ctx.lineTo(W, H - 4); ctx.stroke();
  }

  // ── Curve shape preview ───────────────────────────
  function drawCurve() {
    const canvas = document.getElementById('dbg-curve-shape');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = 8;
    const iW = W - pad * 2, iH = H - pad * 2;

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, W, H);

    // axis lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, pad);      ctx.lineTo(pad, H - pad);     ctx.stroke();

    // linear reference diagonal
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, pad); ctx.stroke();
    ctx.setLineDash([]);

    // actual curve
    const sharp = cfg.curveSharp ?? 1.0;
    const bias  = cfg.curveBias  ?? 0;

    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let px = 0; px <= iW; px++) {
      let t = px / iW;
      if (Math.abs(sharp - 1.0) > 0.001) t = Math.pow(t, 1.0 / sharp);
      if (Math.abs(bias) > 0.001) t = Math.max(0, Math.min(1, t + bias * t * (1 - t)));
      const x = pad + px;
      const y = H - pad - t * iH;
      px === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // dot at current sharpness/bias point (t=0.5 → mapped)
    let tMid = 0.5;
    if (Math.abs(sharp - 1.0) > 0.001) tMid = Math.pow(0.5, 1.0 / sharp);
    if (Math.abs(bias) > 0.001) tMid = Math.max(0, Math.min(1, tMid + bias * tMid * (1 - tMid)));
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.arc(pad + iW * 0.5, H - pad - tMid * iH, 3, 0, Math.PI * 2);
    ctx.fill();

    // axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '8px Inter, sans-serif';
    ctx.fillText('in', pad + 1, H - 1);
    ctx.fillText('out', 1, pad + 7);
  }

  // ── Sync all sliders to current cfg ──────────────────
  function syncSliders() {
    for (const sec of sections) {
      for (const r of sec.rows) {
        const inp = document.getElementById('s-' + r.id);
        const val = document.getElementById('v-' + r.id);
        if (!inp || !val) continue;
        inp.value = cfg[r.id];
        val.textContent = (r.fmt ? r.fmt(cfg[r.id]) : cfg[r.id]) + (r.unit || '');
      }
    }
    drawFriction();
    drawCurve();
  }

  // ── Wire sliders ──────────────────────────────────────
  for (const sec of sections) {
    for (const r of sec.rows) {
      const inp = document.getElementById('s-' + r.id);
      const val = document.getElementById('v-' + r.id);
      inp.addEventListener('input', function () {
        cfg[r.id] = +this.value;
        val.textContent = (r.fmt ? r.fmt(+this.value) : this.value) + (r.unit || '');
        applyCSS();
        if (r.graph === 'friction') drawFriction();
        if (r.graph === 'curve' || r.id === 'curveSharp') drawCurve();
      });
    }
  }

  // ── Preset select ─────────────────────────────────────
  function rebuildSelect(activeName) {
    const sel = document.getElementById('dbg-sel');
    sel.innerHTML = '';
    for (const p of getAllPresets()) {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      if (p.name === activeName) opt.selected = true;
      sel.appendChild(opt);
    }
    // Show delete only for user presets
    const isUser = getUserPresets().some(p => p.name === sel.value);
    document.getElementById('dbg-del-btn').style.display = isUser ? '' : 'none';
  }
  rebuildSelect('Default');

  document.getElementById('dbg-sel').addEventListener('change', function () {
    const preset = getAllPresets().find(p => p.name === this.value);
    if (!preset) return;
    Object.assign(cfg, preset.values);
    applyCSS(); syncSliders();
    const isUser = getUserPresets().some(p => p.name === this.value);
    document.getElementById('dbg-del-btn').style.display = isUser ? '' : 'none';
  });

  document.getElementById('dbg-save-btn').addEventListener('click', () => {
    const name = prompt('Назва пресету:', 'Preset ' + (getUserPresets().length + 1));
    if (!name) return;
    const list = getUserPresets();
    const ex   = list.findIndex(p => p.name === name);
    const entry = { name, values: { ...cfg } };
    if (ex >= 0) list[ex] = entry; else list.push(entry);
    saveUserPresets(list);
    rebuildSelect(name);
  });

  document.getElementById('dbg-del-btn').addEventListener('click', () => {
    const sel  = document.getElementById('dbg-sel');
    const name = sel.value;
    if (BUILT_IN.some(p => p.name === name)) return;
    const list = getUserPresets().filter(p => p.name !== name);
    saveUserPresets(list);
    rebuildSelect('Default');
    const preset = getAllPresets().find(p => p.name === 'Default');
    Object.assign(cfg, preset.values); applyCSS(); syncSliders();
  });

  // ── Copy ──────────────────────────────────────────────
  document.getElementById('dbg-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2)).catch(() => {});
    const b = document.getElementById('dbg-copy-btn');
    b.textContent = '✓ Copied';
    setTimeout(() => { b.textContent = '⊞ Copy'; }, 1500);
  });

  // ── Reset ─────────────────────────────────────────────
  document.getElementById('dbg-reset-btn').addEventListener('click', () => {
    Object.assign(cfg, DEFAULTS); applyCSS(); syncSliders();
    rebuildSelect('Default');
    document.getElementById('dbg-sel').value = 'Default';
  });

  // ── Toggle open/close ─────────────────────────────────
  let isOpen = false;
  function openPanel()  { isOpen = true;  panel.classList.add('is-open');    toggleBtn.classList.add('is-active');    drawFriction(); drawCurve(); }
  function closePanel() { isOpen = false; panel.classList.remove('is-open'); toggleBtn.classList.remove('is-active'); }

  toggleBtn.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  document.getElementById('dbg-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closePanel(); });

  // ── Tooltip ───────────────────────────────────────────
  let tipTimer = null;
  document.addEventListener('mouseover', e => {
    const lbl = e.target.closest('.dbg-lbl');
    if (!lbl?.dataset.tip) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      tooltip.textContent = lbl.dataset.tip;
      tooltip.classList.add('is-on');
      const pr = panel.getBoundingClientRect();
      const lr = lbl.getBoundingClientRect();
      tooltip.style.left = (pr.right + 10) + 'px';
      const top = Math.max(8, Math.min(lr.top, window.innerHeight - tooltip.offsetHeight - 8));
      tooltip.style.top = top + 'px';
    }, 300);
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.dbg-lbl')) {
      clearTimeout(tipTimer);
      tooltip.classList.remove('is-on');
    }
  });

  // ── Styles ────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #dbg-toggle {
      position: fixed; bottom: 10px; left: 10px; z-index: 9999;
      width: 28px; height: 28px; border-radius: 6px; border: none;
      background: rgba(255,255,255,0.12); color: #fff; font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    #dbg-toggle.is-active { background: rgba(255,255,255,0.28); }

    #dbg-panel {
      position: fixed; bottom: 44px; left: 10px; z-index: 9998;
      width: 276px; max-height: calc(100vh - 58px); overflow-y: auto;
      background: rgba(14,14,14,0.97);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.07); border-radius: 14px;
      padding: 14px 14px 12px;
      font-family: 'Inter', sans-serif; font-size: 11px; color: #ccc;
      display: none; flex-direction: column; gap: 0;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    #dbg-panel.is-open { display: flex; }

    #dbg-header {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #fff;
      margin-bottom: 11px; flex-shrink: 0;
    }
    #dbg-close {
      background: none; border: none; color: #444; font-size: 13px;
      cursor: pointer; padding: 0; line-height: 1;
    }
    #dbg-close:hover { color: #fff; }

    #dbg-preset-row {
      display: flex; gap: 5px; margin-bottom: 6px;
    }
    #dbg-sel {
      flex: 1; background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
      color: #ddd; font-family: inherit; font-size: 11px;
      padding: 5px 8px; cursor: pointer; outline: none;
    }
    #dbg-save-btn, #dbg-del-btn {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
      border-radius: 6px; color: #888; font-size: 11px; padding: 5px 9px;
      cursor: pointer; transition: background 0.15s, color 0.15s;
    }
    #dbg-save-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }
    #dbg-del-btn:hover  { background: rgba(255,80,80,0.15);   color: #f88; }
    #dbg-del-btn { display: none; }

    #dbg-action-row {
      display: flex; gap: 5px; margin-bottom: 10px;
    }
    #dbg-copy-btn, #dbg-reset-btn {
      flex: 1; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
      color: #777; font-family: inherit; font-size: 10px; font-weight: 600;
      letter-spacing: 0.3px; padding: 6px 0; cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    #dbg-copy-btn:hover, #dbg-reset-btn:hover {
      background: rgba(255,255,255,0.1); color: #fff;
    }

    .dbg-div {
      height: 1px; background: rgba(255,255,255,0.06);
      margin: 2px 0 6px; flex-shrink: 0;
    }

    .dbg-sec { flex-shrink: 0; }
    .dbg-sec-head {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 9px; font-weight: 700; letter-spacing: 1.2px; color: #3a3a3a;
      padding: 7px 0 5px; border-top: 1px solid rgba(255,255,255,0.05);
      cursor: pointer; user-select: none; transition: color 0.15s;
    }
    .dbg-sec + .dbg-sec .dbg-sec-head { }
    .dbg-sec:first-of-type .dbg-sec-head { border-top: none; }
    .dbg-sec-head:hover { color: #666; }
    .dbg-arrow { font-size: 8px; color: #2a2a2a; }

    .dbg-sec-body { display: flex; flex-direction: column; gap: 7px; padding-bottom: 6px; }

    .dbg-row { display: flex; flex-direction: column; gap: 3px; }
    .dbg-row-top { display: flex; justify-content: space-between; align-items: center; }
    .dbg-lbl {
      color: #5a5a5a; font-size: 11px; cursor: default;
      border-bottom: 1px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }
    .dbg-lbl:hover { color: #aaa; border-bottom-color: rgba(255,255,255,0.2); }
    .dbg-val {
      color: #ccc; font-weight: 600; font-size: 11px;
      font-variant-numeric: tabular-nums;
    }

    .dbg-slider {
      width: 100%; height: 2px; cursor: pointer;
      -webkit-appearance: none; appearance: none;
      background: rgba(255,255,255,0.1); border-radius: 1px;
    }
    .dbg-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px;
      border-radius: 50%; background: #fff; cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
    .dbg-slider::-moz-range-thumb {
      width: 12px; height: 12px; border-radius: 50%;
      background: #fff; border: none; cursor: pointer;
    }

    .dbg-graph {
      width: 100%; height: 36px; border-radius: 4px;
      display: block; margin-top: 3px;
    }

    #dbg-tip {
      position: fixed; z-index: 100000;
      max-width: 210px; padding: 10px 12px;
      background: rgba(22,22,22,0.98);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.09); border-radius: 9px;
      font-family: 'Inter', sans-serif; font-size: 11px; color: #aaa;
      line-height: 1.55; pointer-events: none;
      opacity: 0; transition: opacity 0.15s;
    }
    #dbg-tip.is-on { opacity: 1; }
  `;
  document.head.appendChild(style);

  applyCSS();
  drawFriction();
  drawCurve();
})();
