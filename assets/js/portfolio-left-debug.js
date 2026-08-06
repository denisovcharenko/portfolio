'use strict';

(function () {
  if (!new URLSearchParams(window.location.search).has('admin')) return;

  const DEFAULTS = {
    sensitivity: 0.160,
    friction:    0.885,
    maxVel:      460,
    smoothL:     93,
  };

  window.__leftCfg = Object.assign({}, DEFAULTS);
  const cfg = window.__leftCfg;

  const rows = [
    { id: 'sensitivity', label: 'Sensitivity', tip: 'Чутливість ліворуч панелі до руху миші. Більше = швидша реакція на менший рух.', unit: '', min: 0.005, max: 0.35, step: 0.005, fmt: v => v.toFixed(3) },
    { id: 'friction',    label: 'Friction',    tip: 'Тертя — як швидко зупиняється ліва панель після відпускання. 0.99 = дуже плавно, 0.80 = різка зупинка.', unit: '', min: 0.80, max: 0.99, step: 0.005, fmt: v => v.toFixed(3) },
    { id: 'maxVel',      label: 'Max Velocity', tip: 'Максимальна швидкість прокрутки лівої панелі в пікселях за кадр.', unit: 'px', min: 20, max: 600, step: 10, fmt: v => Math.round(v) },
    { id: 'smoothL',     label: 'Smoothness',  tip: 'Кількість кадрів для усереднення швидкості ліво панелі. Більше = плавніший, але менш чуйний рух.', unit: '', min: 0, max: 98, step: 1, fmt: v => Math.round(v) },
  ];

  // ── Build panel ───────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'ld-panel';

  panel.innerHTML = `
    <div id="ld-header">
      <span>LEFT SCROLL</span>
      <button id="ld-close">✕</button>
    </div>
    <div id="ld-actions">
      <button id="ld-copy-btn">⊞ Copy</button>
      <button id="ld-reset-btn">↺ Reset</button>
    </div>
    <div class="ld-div"></div>
  `;

  for (const r of rows) {
    const disp = r.fmt ? r.fmt(cfg[r.id]) : cfg[r.id];
    const row = document.createElement('div');
    row.className = 'ld-row';
    row.innerHTML = `
      <div class="ld-row-top">
        <span class="ld-lbl" data-tip="${r.tip}">${r.label}</span>
        <span class="ld-val" id="lv-${r.id}">${disp}${r.unit}</span>
      </div>
      <input type="range" class="ld-slider" id="ls-${r.id}"
        min="${r.min}" max="${r.max}" step="${r.step}" value="${cfg[r.id]}">
    `;
    panel.appendChild(row);
  }

  document.body.appendChild(panel);

  const btn = document.createElement('button');
  btn.id = 'ld-toggle';
  btn.textContent = '↕';
  document.body.appendChild(btn);

  // ── Tooltip ───────────────────────────────────────────
  const tooltip = document.getElementById('dbg-tip') || (() => {
    const t = document.createElement('div');
    t.id = 'dbg-tip';
    document.body.appendChild(t);
    return t;
  })();

  // ── Toggle ────────────────────────────────────────────
  let open = false;
  btn.addEventListener('click', () => {
    open = !open;
    panel.classList.toggle('is-open', open);
    btn.classList.toggle('is-active', open);
  });

  panel.querySelector('#ld-close').addEventListener('click', () => {
    open = false;
    panel.classList.remove('is-open');
    btn.classList.remove('is-active');
  });

  // ── Wire sliders ──────────────────────────────────────
  for (const r of rows) {
    const inp = document.getElementById('ls-' + r.id);
    const val = document.getElementById('lv-' + r.id);
    inp.addEventListener('input', function () {
      cfg[r.id] = +this.value;
      val.textContent = (r.fmt ? r.fmt(+this.value) : this.value) + (r.unit || '');
    });
  }

  // ── Copy ──────────────────────────────────────────────
  panel.querySelector('#ld-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2)).catch(() => {});
    const b = panel.querySelector('#ld-copy-btn');
    b.textContent = '✓ Copied';
    setTimeout(() => { b.textContent = '⊞ Copy'; }, 1500);
  });

  // ── Reset ─────────────────────────────────────────────
  panel.querySelector('#ld-reset-btn').addEventListener('click', () => {
    Object.assign(cfg, DEFAULTS);
    for (const r of rows) {
      const inp = document.getElementById('ls-' + r.id);
      const val = document.getElementById('lv-' + r.id);
      if (!inp || !val) continue;
      inp.value = cfg[r.id];
      val.textContent = (r.fmt ? r.fmt(cfg[r.id]) : cfg[r.id]) + (r.unit || '');
    }
  });

  // ── Tooltip wiring ────────────────────────────────────
  let tipTimer = null;
  panel.addEventListener('mouseover', e => {
    const lbl = e.target.closest('.ld-lbl');
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
  panel.addEventListener('mouseout', e => {
    if (e.target.closest('.ld-lbl')) {
      clearTimeout(tipTimer);
      tooltip.classList.remove('is-on');
    }
  });

  // ── Styles ────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #ld-toggle {
      position: fixed; bottom: 10px; left: 44px; z-index: 9999;
      width: 28px; height: 28px; border-radius: 6px; border: none;
      background: rgba(255,255,255,0.12); color: #fff; font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    #ld-toggle.is-active { background: rgba(255,255,255,0.28); }

    #ld-panel {
      position: fixed; bottom: 44px; left: 44px; z-index: 9998;
      width: 260px; max-height: calc(100vh - 58px); overflow-y: auto;
      background: rgba(14,14,14,0.97);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.07); border-radius: 14px;
      padding: 14px 14px 12px;
      font-family: 'Inter', sans-serif; font-size: 11px; color: #ccc;
      display: none; flex-direction: column; gap: 7px;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    #ld-panel.is-open { display: flex; }

    #ld-header {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #fff;
      margin-bottom: 4px;
    }
    #ld-close {
      background: none; border: none; color: #444; font-size: 13px;
      cursor: pointer; padding: 0; line-height: 1;
    }
    #ld-close:hover { color: #fff; }

    #ld-actions {
      display: flex; gap: 5px;
    }
    #ld-copy-btn, #ld-reset-btn {
      flex: 1; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
      color: #777; font-family: inherit; font-size: 10px; font-weight: 600;
      letter-spacing: 0.3px; padding: 6px 0; cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    #ld-copy-btn:hover, #ld-reset-btn:hover {
      background: rgba(255,255,255,0.1); color: #fff;
    }

    .ld-div {
      height: 1px; background: rgba(255,255,255,0.06); margin: 2px 0;
    }

    .ld-row { display: flex; flex-direction: column; gap: 3px; }
    .ld-row-top { display: flex; justify-content: space-between; align-items: center; }
    .ld-lbl {
      color: #5a5a5a; font-size: 11px; cursor: default;
      border-bottom: 1px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }
    .ld-lbl:hover { color: #aaa; border-bottom-color: rgba(255,255,255,0.2); }
    .ld-val { color: #ccc; font-weight: 600; font-size: 11px; font-variant-numeric: tabular-nums; }

    .ld-slider {
      width: 100%; height: 2px; cursor: pointer;
      -webkit-appearance: none; appearance: none;
      background: rgba(255,255,255,0.1); border-radius: 1px;
    }
    .ld-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px;
      border-radius: 50%; background: #fff; cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
    .ld-slider::-moz-range-thumb {
      width: 12px; height: 12px; border-radius: 50%;
      background: #fff; border: none; cursor: pointer;
    }
  `;
  document.head.appendChild(style);
})();
