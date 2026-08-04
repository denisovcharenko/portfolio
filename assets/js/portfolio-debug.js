'use strict';

(function () {
  // ── Live config — all parameters read by portfolio.js ─
  window.__cylCfg = {
    // Cylinder
    cylR:     3000,
    zMult:    8.0,
    maxDeg:   9,
    // Zones
    flatZone: 110,
    fadeZone: 545,
    // Perspective
    persp:    1450,
    origX:    85,
    origY:    92,
    // Scroll
    sensitivity: 0.09,
    friction:    0.93,
    maxVel:      80,
    smoothR:     3,
    shrinkDelay: 60,
    // Crosshair
    crossSpeed:  0.40,
    crossSmooth: 82,
    // Parallax speeds (per column)
    speed0: 1.00,
    speed1: 0.85,
    speed2: 0.70,
    // Shape
    sceneTiltX: 0,
    sceneTiltY: 0,
    sceneSkewX: 0,
    cylAxis:      0,
    bowlStrength: 0,
    // Pit
    pitCenterY: 0.75,
    pitRadius:  200,
    pitDepth:   0,
  };

  const cfg   = window.__cylCfg;
  const scene = document.getElementById('col-3d-scene');

  function applyCSS() {
    scene.style.perspective       = cfg.persp + 'px';
    scene.style.perspectiveOrigin = cfg.origX + '% ' + cfg.origY + '%';
    scene.style.transform =
      `rotateX(${cfg.sceneTiltX}deg) rotateY(${cfg.sceneTiltY}deg) skewX(${cfg.sceneSkewX}deg)`;
  }

  // ── Slider definition table ───────────────────────────
  const sections = [
    {
      title: 'CYLINDER',
      rows: [
        { id: 'cylR',   label: 'Radius (крутизна вигину колонок)',          unit: 'px', min: 100, max: 3000, step: 10  },
        { id: 'zMult',  label: 'Z Depth (глибина провалу картинок у глиб)', unit: '×',  min: 0,   max: 8,    step: 0.1, fmt: v => v.toFixed(1) },
        { id: 'maxDeg', label: 'Max Angle (ліміт нахилу крайніх карток)',   unit: '°',  min: 1,   max: 89,   step: 1   },
      ],
    },
    {
      title: 'ZONES',
      rows: [
        { id: 'flatZone', label: 'Flat Zone (зона де картинки рівні, без ефекту)',       unit: 'px', min: 0, max: 600, step: 5 },
        { id: 'fadeZone', label: 'Fade Zone (плавний перехід від рівних до вигнутих)',   unit: 'px', min: 0, max: 600, step: 5 },
      ],
    },
    {
      title: 'PERSPECTIVE',
      rows: [
        { id: 'persp', label: 'Depth (різкість 3D, менше = агресивніша перспектива)',   unit: 'px', min: 200, max: 3000, step: 50 },
        { id: 'origX', label: 'Origin X (горизонталь точки сходу, звідки "дивимось")',  unit: '%',  min: 0,   max: 100,  step: 1  },
        { id: 'origY', label: 'Origin Y (вертикаль точки сходу)',                        unit: '%',  min: 0,   max: 100,  step: 1  },
      ],
    },
    {
      title: 'SCROLL',
      rows: [
        { id: 'sensitivity', label: 'Sensitivity (чутливість до руху миші/трекпаду)',   unit: '',   min: 0.01, max: 0.5,  step: 0.01, fmt: v => v.toFixed(2) },
        { id: 'friction',    label: 'Friction (тертя — як швидко зупиняється скрол)',   unit: '',   min: 0.80, max: 0.99, step: 0.01, fmt: v => v.toFixed(2) },
        { id: 'maxVel',      label: 'Max Velocity (максимальна швидкість прокрутки)',   unit: 'px', min: 20,   max: 400,  step: 5    },
        { id: 'smoothR',     label: 'Smoothness (плавність руху колонок)',              unit: '',   min: 0,    max: 98,   step: 1    },
        { id: 'shrinkDelay', label: 'Shrink Delay (затримка повернення до повного розміру)', unit: 'ms', min: 0, max: 600, step: 10  },
      ],
    },
    {
      title: 'CROSSHAIR',
      rows: [
        { id: 'crossSpeed',  label: 'Spin Speed (швидкість обертання плюсика при скролі)',  unit: '×', min: 0, max: 2,  step: 0.05, fmt: v => v.toFixed(2) },
        { id: 'crossSmooth', label: 'Stop Smooth (плавність зупинки плюсика)',              unit: '',  min: 0, max: 98, step: 1    },
      ],
    },
    {
      title: 'PARALLAX',
      rows: [
        { id: 'speed0', label: 'Column 1 (швидкість лівої колонки)',    unit: '×', min: 0.1, max: 2, step: 0.05, fmt: v => v.toFixed(2) },
        { id: 'speed1', label: 'Column 2 (швидкість середньої колонки)',unit: '×', min: 0.1, max: 2, step: 0.05, fmt: v => v.toFixed(2) },
        { id: 'speed2', label: 'Column 3 (швидкість правої колонки)',   unit: '×', min: 0.1, max: 2, step: 0.05, fmt: v => v.toFixed(2) },
      ],
    },
    {
      title: 'SHAPE',
      rows: [
        { id: 'sceneTiltX', label: 'Tilt X (нахил сцени вперед / назад)',          unit: '°', min: -40, max: 40, step: 0.5, fmt: v => v.toFixed(1) },
        { id: 'sceneTiltY', label: 'Tilt Y (нахил сцени вліво / вправо)',           unit: '°', min: -40, max: 40, step: 0.5, fmt: v => v.toFixed(1) },
        { id: 'sceneSkewX', label: 'Skew X (горизонтальний скіс всієї сцени)',     unit: '°', min: -30, max: 30, step: 0.5, fmt: v => v.toFixed(1) },
        { id: 'cylAxis',      label: 'Cylinder Axis (0=верт. ↕  1=горизонт. ↔)',                    unit: '',  min: 0, max: 1,   step: 0.05, fmt: v => v.toFixed(2) },
        { id: 'bowlStrength', label: 'Bowl Depth (глибина чаші — вигин лівої/правої колонок у глиб)', unit: '×', min: 0, max: 3,   step: 0.05, fmt: v => v.toFixed(2) },
      ],
    },
    {
      title: 'PIT',
      rows: [
        { id: 'pitCenterY', label: 'Pit Position (де знаходиться яма — 0=верх, 1=низ екрану)',   unit: '',   min: 0,    max: 1,    step: 0.01, fmt: v => v.toFixed(2) },
        { id: 'pitRadius',  label: 'Pit Width (ширина ями — менше=вузька, більше=широка яма)',   unit: 'px', min: 50,   max: 600,  step: 10 },
        { id: 'pitDepth',   label: 'Pit Depth (глибина провалу — картки тонуть у дно)',          unit: 'px', min: 0,    max: 2000, step: 10 },
      ],
    },
  ];

  // ── Build panel HTML ──────────────────────────────────
  let html = `<div id="debug-header"><span>CURVE & ANIMATION</span><button id="debug-copy">COPY</button></div>`;
  for (const sec of sections) {
    html += `<div class="debug-section">${sec.title}</div>`;
    for (const r of sec.rows) {
      const val = cfg[r.id];
      const disp = r.fmt ? r.fmt(val) : val;
      html += `
        <div class="debug-row">
          <label>${r.label} <span id="v-${r.id}">${disp}</span>${r.unit}</label>
          <input type="range" id="s-${r.id}" min="${r.min}" max="${r.max}" step="${r.step}" value="${val}">
        </div>`;
    }
  }

  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  // ── Toggle button ─────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'debug-toggle';
  btn.innerText = '⌘';
  document.body.appendChild(btn);

  let open = false;
  btn.addEventListener('click', () => {
    open = !open;
    panel.classList.toggle('is-open', open);
    btn.classList.toggle('is-active', open);
  });

  // ── Wire up all sliders ───────────────────────────────
  for (const sec of sections) {
    for (const r of sec.rows) {
      const input = document.getElementById('s-' + r.id);
      const valEl = document.getElementById('v-' + r.id);
      input.addEventListener('input', function () {
        cfg[r.id] = +this.value;
        valEl.textContent = r.fmt ? r.fmt(+this.value) : this.value;
        applyCSS();
      });
    }
  }

  // ── Copy all values ───────────────────────────────────
  document.getElementById('debug-copy').addEventListener('click', () => {
    const lines = [
      '// Cylinder',
      `CYLR:      ${cfg.cylR}`,
      `zMult:     ${cfg.zMult.toFixed(1)}`,
      `maxDeg:    ${cfg.maxDeg}`,
      '// Zones',
      `flatZone:  ${cfg.flatZone}`,
      `fadeZone:  ${cfg.fadeZone}`,
      '// Perspective',
      `perspective:        ${cfg.persp}px`,
      `perspective-origin: ${cfg.origX}% ${cfg.origY}%`,
      '// Scroll',
      `sensitivity: ${cfg.sensitivity.toFixed(2)}`,
      `friction:    ${cfg.friction.toFixed(2)}`,
      `maxVel:      ${cfg.maxVel}`,
      `smoothR:     ${cfg.smoothR}`,
      `shrinkDelay: ${cfg.shrinkDelay}`,
      '// Crosshair',
      `crossSpeed:  ${cfg.crossSpeed.toFixed(2)}`,
      `crossSmooth: ${cfg.crossSmooth}`,
      '// Parallax',
      `speeds: [${cfg.speed0.toFixed(2)}, ${cfg.speed1.toFixed(2)}, ${cfg.speed2.toFixed(2)}]`,
      '// Shape',
      `sceneTiltX: ${cfg.sceneTiltX.toFixed(1)}`,
      `sceneTiltY: ${cfg.sceneTiltY.toFixed(1)}`,
      `sceneSkewX: ${cfg.sceneSkewX.toFixed(1)}`,
      `cylAxis:      ${cfg.cylAxis.toFixed(2)}`,
      `bowlStrength: ${cfg.bowlStrength.toFixed(2)}`,
      '// Pit',
      `pitCenterY: ${cfg.pitCenterY.toFixed(2)}`,
      `pitRadius:  ${cfg.pitRadius}`,
      `pitDepth:   ${cfg.pitDepth}`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    const b = document.getElementById('debug-copy');
    b.textContent = 'COPIED!';
    setTimeout(() => { b.textContent = 'COPY'; }, 1500);
  });

  // ── Styles ───────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #debug-toggle {
      position: fixed;
      bottom: 10px;
      left: 10px;
      z-index: 9999;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: rgba(255,255,255,0.12);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    #debug-toggle.is-active { background: rgba(255,255,255,0.28); }

    #debug-panel {
      position: fixed;
      bottom: 44px;
      left: 10px;
      z-index: 9998;
      width: 272px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      background: rgba(14,14,14,0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      color: #ccc;
      display: none;
      flex-direction: column;
      gap: 7px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    #debug-panel.is-open { display: flex; }

    #debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #fff;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    #debug-copy {
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 4px;
      color: #fff;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      cursor: pointer;
      font-family: inherit;
    }
    #debug-copy:hover { background: rgba(255,255,255,0.2); }

    .debug-section {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #444;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .debug-section:first-of-type { margin-top: 0; border-top: none; }

    .debug-row { display: flex; flex-direction: column; gap: 3px; }
    .debug-row label {
      display: flex;
      justify-content: space-between;
      color: #777;
      gap: 6px;
    }
    .debug-row label span { color: #eee; font-weight: 600; }
    .debug-row input[type=range] {
      width: 100%;
      accent-color: #fff;
      cursor: pointer;
      height: 2px;
    }
  `;
  document.head.appendChild(style);

  applyCSS();
})();
