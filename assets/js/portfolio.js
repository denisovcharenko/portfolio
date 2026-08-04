'use strict';

// ─── PROJECTS ─────────────────────────────────────────
const PROJECTS = [
  { idx:  0, color: '#E8917A', name: '', thumbnail: null, content: [], description: '' },
  { idx:  1, color: '#7AB4E8', name: '', thumbnail: null, content: [], description: '' },
  { idx:  2, color: '#7AE8A5', name: 'Burger', thumbnail: 'assets/media/cases/case-burger.webp', content: [], description: '' },
  { idx:  3, color: '#C47AE8', name: '', thumbnail: null, content: [], description: '' },
  { idx:  4, color: '#7AE8D4', name: '', thumbnail: null, content: [], description: '' },
  { idx:  5, color: '#E8C97A', name: '', thumbnail: null, content: [], description: '' },
  { idx:  6, color: '#7A7AE8', name: 'Tattoo', thumbnail: 'assets/media/cases/case-tattoo.webp', content: [], description: '' },
  { idx:  7, color: '#E87A7A', name: '', thumbnail: null, content: [], description: '' },
  { idx:  8, color: '#7AE8E8', name: '', thumbnail: null, content: [], description: '' },
  { idx:  9, color: '#B07AE8', name: '', thumbnail: null, content: [], description: '' },
  { idx: 10, color: '#F0A080', name: '', thumbnail: null, content: [], description: '' },
  { idx: 11, color: '#80C0F0', name: '', thumbnail: null, content: [], description: '' },
  { idx: 12, color: '#80F0A8', name: '', thumbnail: null, content: [], description: '' },
  { idx: 13, color: '#D080F0', name: 'Barber', thumbnail: 'assets/media/cases/case-barber.webp', content: [], description: '' },
  { idx: 14, color: '#80F0D8', name: '', thumbnail: null, content: [], description: '' },
  { idx: 15, color: '#F0D880', name: '', thumbnail: null, content: [], description: '' },
  { idx: 16, color: '#8080F0', name: '', thumbnail: null, content: [], description: '' },
  {
    idx: 17, color: '#F08080', name: 'Oyvdoma',
    thumbnail: 'assets/media/cases/case-oyvdoma.webp',
    content: [
      { type: 'image', src: 'assets/media/cases/oyvdoma/oyvdoma-1.webp', w: 2880, h: 1668 },
      { type: 'image', src: 'assets/media/cases/oyvdoma/oyvdoma-2.webp', w: 2880, h: 6253 },
      { type: 'image', src: 'assets/media/cases/oyvdoma/oyvdoma-3.webp', w: 2880, h: 5491 },
      { type: 'image', src: 'assets/media/cases/oyvdoma/oyvdoma-4.webp', w: 2880, h: 2698 },
      { type: 'image', src: 'assets/media/cases/oyvdoma/oyvdoma-5.webp', w: 2880, h: 5610 },
      { type: 'image', src: 'assets/media/cases/oyvdoma/oyvdoma-6.webp', w: 2880, h: 9921 },
      { type: 'image', src: 'assets/media/cases/oyvdoma/oyvdoma-7.webp', w: 2880, h: 6373 },
    ],
    description: 'Home textiles brand — e-commerce website, product catalog, and visual identity. Designed around the warmth of natural fabrics with clean layouts that let the product photography breathe.',
  },
  { idx: 18, color: '#80F0F0', name: '', thumbnail: null, content: [], description: '' },
  { idx: 19, color: '#C080F0', name: '', thumbnail: null, content: [], description: '' },
  { idx: 20, color: '#FFB59A', name: '', thumbnail: null, content: [], description: '' },
  { idx: 21, color: '#9AC5FF', name: '', thumbnail: null, content: [], description: '' },
  { idx: 22, color: '#9AFFB5', name: 'Sauced', thumbnail: 'assets/media/cases/case-sauced.webp', content: [], description: '' },
  { idx: 23, color: '#D89AFF', name: '', thumbnail: null, content: [], description: '' },
  { idx: 24, color: '#9AFFE5', name: '', thumbnail: null, content: [], description: '' },
  { idx: 25, color: '#FFE99A', name: 'Lotos', thumbnail: 'assets/media/cases/case-lotos.webp', content: [], description: '' },
  { idx: 26, color: '#9A9AFF', name: '', thumbnail: null, content: [], description: '' },
  { idx: 27, color: '#FF9A9A', name: '', thumbnail: null, content: [], description: '' },
  { idx: 28, color: '#9AFFFF', name: 'Funcity', thumbnail: 'assets/media/cases/case-funcity.webp', content: [], description: '' },
  { idx: 29, color: '#CE9AFF', name: '', thumbnail: null, content: [], description: '' },
];

// ─── CONSTANTS ────────────────────────────────────────
const N_PER_COL  = 10;
const SPEEDS     = [1.0, 0.85, 0.7];
const RIGHT_GAP  = 80;
const LEFT_GAP   = 4;
const COL_TOPS   = [-27, -9, 10];
const CYLR       = 3000;

const SMOOTH_R     = 88;
const SMOOTH_L     = 91;
const FRICTION     = 0.91;
const MAX_VEL      = 120;
const MIN_VEL      = 0.12;
const SHRINK_DELAY = 140;

const lc = (key, def) => (window.__cylCfg && window.__cylCfg[key] != null) ? window.__cylCfg[key] : def;

let lastT = null;
function lerpK(smoothness, dt) {
  const base = (100 - smoothness) / 100;
  return base >= 1 ? 1 : 1 - Math.pow(1 - base, dt / 16.7);
}

// ─── STATE ───────────────────────────────────────────
const rightVY = [0, 0, 0];
const rightLY = [0, 0, 0];
const velR    = [0, 0, 0];

// Left panel — infinite scroll (velocity → target → lerped position)
let leftVel = 0, leftTarget = 0, leftLY = 0;
let leftOneSetH = 1, leftItemH = 1;
let leftContentCount = 4; // items in one set (before clone)

let shrinkTimer = null;
let rightOneSetH = 1, thumbH = 120;
let crossAngle = 0, crossAngLY = 0;
let currentProjectIdx = -1;
let descOpen = false;

const thumbCaches = [[], [], []];
const colCenterX  = [0, 0, 0];

// Video preload pool — iframes живуть тут і грають приховано
const videoPool    = new Map(); // key → div element
const vimeoPlayers = new Map(); // key → Vimeo.Player instance
let poolContainer  = null;

// ─── ELEMENTS ────────────────────────────────────────
const leftPanel   = document.getElementById('portfolio-left');
const crosshairEl = document.querySelector('.portfolio-crosshair svg');
const descBtn     = document.getElementById('desc-btn');
const descPanel   = document.getElementById('desc-panel');
const descText    = document.getElementById('desc-text');
const descTitle   = document.getElementById('desc-title');
const cols        = [
  document.getElementById('col-0'),
  document.getElementById('col-1'),
  document.getElementById('col-2'),
];

// ─── VIDEO POOL ──────────────────────────────────────
function makeVideoEl(item) {
  const el = document.createElement('div');
  el.className = 'portfolio-left-img is-video';
  // Default 16/9 until SDK reports actual dimensions
  el.style.aspectRatio = item.aspectRatio || '16/9';
  el.innerHTML = item.embed || '';
  const iframe = el.querySelector('iframe');
  if (iframe) {
    iframe.removeAttribute('width');
    iframe.removeAttribute('height');
    iframe.removeAttribute('sandbox');
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    iframe.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:none;pointer-events:none;';
    // Ensure autoplay params (no background=1 — requires Vimeo Pro)
    let src = iframe.getAttribute('src') || '';
    if (src.includes('vimeo.com') && !src.includes('autoplay=1')) {
      src += (src.includes('?') ? '&' : '?') + 'autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0&playsinline=1';
      iframe.setAttribute('src', src);
    }
  }
  return el;
}

function initVimeoPlayer(el, key) {
  if (!window.Vimeo) return;
  const iframe = el.querySelector('iframe');
  if (!iframe) return;
  const player = new Vimeo.Player(iframe);
  vimeoPlayers.set(key, player);
  player.on('play', () => {});
  player.ready()
    .then(() => Promise.all([player.getVideoWidth(), player.getVideoHeight(), player.play()]))
    .then(([w, h]) => {
      if (w && h) {
        el.style.aspectRatio = `${w}/${h}`;
        // Re-measure scroll if this video is currently visible in the panel
        if (leftPanel.contains(el)) measureLeftPanel();
      }
    })
    .catch(() => {});
}

function triggerPlay(key) {
  const player = vimeoPlayers.get(key);
  if (player) {
    player.play().catch(() => {});
    return;
  }
  // pass=1 clones have no SDK Player — use raw postMessage to resume if Safari paused
  const el = videoPool.get(key);
  const iframe = el && el.querySelector('iframe');
  if (iframe) {
    try { iframe.contentWindow.postMessage('{"method":"play"}', '*'); } catch (_) {}
  }
}

function preloadVideos() {
  // no visibility:hidden — some browsers throttle hidden iframes
  poolContainer = document.createElement('div');
  poolContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:460px;pointer-events:none;';
  document.body.appendChild(poolContainer);

  PROJECTS.forEach(proj => {
    (proj.content || []).forEach((item, ci) => {
      if (item.type !== 'video') return;
      for (let pass = 0; pass < 2; pass++) {
        const key = `v-${proj.idx}-${ci}-${pass}`;
        if (videoPool.has(key)) continue;
        const el = makeVideoEl(item);
        el.dataset.vkey = key;
        videoPool.set(key, el);
        poolContainer.appendChild(el);
        // SDK only for pass=0 — halves Player instances, avoids autoplay conflicts
        if (pass === 0) initVimeoPlayer(el, key);
      }
    });
  });
}

// ─── DOM BUILD ───────────────────────────────────────
function buildDOM() {
  buildLeftPanel(PROJECTS[0]);

  cols.forEach((col, ci) => {
    col.innerHTML = '';
    const start = ci * N_PER_COL;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < N_PER_COL; i++) {
        const el  = document.createElement('div');
        el.className = 'portfolio-thumb';
        const gIdx = start + i;
        const proj = PROJECTS[gIdx] || PROJECTS[0];
        if (proj.thumbnail) {
          el.style.backgroundImage = `url(${proj.thumbnail})`;
        } else {
          el.style.backgroundColor = proj.color;
        }
        el.dataset.globalIdx = gIdx;
        if (pass === 1) el.dataset.clone = '1';
        col.appendChild(el);
      }
    }
  });
}

// Build left panel with infinite scroll clones
function buildLeftPanel(proj) {
  // Return any pooled video elements to pool before clearing
  if (poolContainer) {
    leftPanel.querySelectorAll('[data-vkey]').forEach(el => poolContainer.appendChild(el));
  }

  leftPanel.innerHTML = '';
  leftVel = 0; leftTarget = 0; leftLY = 0;

  const items = (proj && proj.content && proj.content.length > 0)
    ? proj.content
    : Array.from({ length: 4 }, () => ({ type: 'color', color: proj ? proj.color : '#E8917A' }));

  leftContentCount = items.length;

  // Two passes (real + clone) for infinite scroll
  for (let pass = 0; pass < 2; pass++) {
    items.forEach((item, ci) => {
      if (item.type === 'video') {
        const key = `v-${proj.idx}-${ci}-${pass}`;
        const pooled = videoPool.get(key);
        if (pooled) {
          leftPanel.appendChild(pooled);
          triggerPlay(key); // re-play after reparent (Safari may pause on DOM move)
          return;
        }
        // Fallback: create fresh (only if not preloaded)
        const el = makeVideoEl(item);
        el.dataset.vkey = key;
        videoPool.set(key, el);
        leftPanel.appendChild(el);
        initVimeoPlayer(el, key);
      } else if (item.type === 'image' && item.src) {
        const img = document.createElement('img');
        img.className = 'portfolio-left-img';
        img.src = item.src;
        img.alt = '';
        // width/height attrs let browser reserve space before decode → leftOneSetH is correct immediately
        if (item.w && item.h) { img.width = item.w; img.height = item.h; }
        leftPanel.appendChild(img);
      } else {
        const el = document.createElement('div');
        el.className = 'portfolio-left-img is-color';
        el.style.backgroundColor = item.color || (proj && proj.color) || '#888';
        leftPanel.appendChild(el);
      }
    });
  }
}

// ─── MEASURE ─────────────────────────────────────────
function measure() {
  const thumb = cols[0].querySelector('.portfolio-thumb');
  if (thumb) {
    thumbH = thumb.getBoundingClientRect().height;
    rightOneSetH = N_PER_COL * (thumbH + RIGHT_GAP);
  }

  const leftImgs = Array.from(leftPanel.querySelectorAll('.portfolio-left-img')).slice(0, leftContentCount);
  if (leftImgs.length > 0) {
    leftItemH = leftImgs[0].getBoundingClientRect().height + LEFT_GAP;
    const totalH = leftImgs.reduce((s, el) => s + el.getBoundingClientRect().height, 0);
    leftOneSetH = totalH + leftImgs.length * LEFT_GAP;
  }

  cols.forEach((col, i) => {
    thumbCaches[i] = Array.from(col.querySelectorAll('.portfolio-thumb'));
    const r = col.getBoundingClientRect();
    colCenterX[i] = r.left + r.width * 0.5;
  });
}

// ─── LEFT CONTENT ────────────────────────────────────
function measureLeftPanel() {
  const items = Array.from(leftPanel.querySelectorAll('.portfolio-left-img')).slice(0, leftContentCount);
  if (items.length === 0) return;
  const totalH = items.reduce((s, el) => s + el.getBoundingClientRect().height, 0);
  if (totalH > 0) {
    leftItemH  = items[0].getBoundingClientRect().height + LEFT_GAP;
    leftOneSetH = totalH + items.length * LEFT_GAP;
  }
}

function setLeftContent(idx) {
  const proj = PROJECTS[idx] || { color: '#888', content: [] };
  buildLeftPanel(proj);
  requestAnimationFrame(() => {
    measureLeftPanel();
    // Re-measure once all <img> elements have loaded (they may be 0-height until decoded)
    const imgs = Array.from(leftPanel.querySelectorAll('img.portfolio-left-img'));
    let pending = imgs.filter(img => !img.complete).length;
    if (pending > 0) {
      imgs.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', () => { pending--; if (pending === 0) measureLeftPanel(); }, { once: true });
          img.addEventListener('error', () => { pending--; if (pending === 0) measureLeftPanel(); }, { once: true });
        }
      });
    }
  });
}

// ─── DESCRIPTION ─────────────────────────────────────
function updateDescription(idx) {
  const proj = PROJECTS[idx];
  if (!proj) return;
  if (descTitle) descTitle.textContent = proj.name || '';
  if (descText)  descText.textContent  = proj.description || '';
  if (!proj.description && descOpen) setDescOpen(false);
}

function setDescOpen(open) {
  descOpen = open;
  descPanel?.classList.toggle('is-open', open);
  descBtn?.classList.toggle('is-open', open);
}

// ─── TICK ────────────────────────────────────────────
function tick() {
  const now = performance.now();
  const dt  = Math.min(50, lastT ? now - lastT : 16.7);
  lastT = now;

  const kR = lerpK(lc('smoothR', SMOOTH_R), dt);
  const kL = lerpK(SMOOTH_L, dt);
  const VH = window.innerHeight;

  // ── Right columns ─────────────────────────────────
  cols.forEach((col, i) => {
    rightVY[i] += velR[i];
    velR[i] *= lc('friction', FRICTION);
    if (Math.abs(velR[i]) < MIN_VEL) velR[i] = 0;

    rightLY[i] += (rightVY[i] - rightLY[i]) * kR;

    if (rightOneSetH > 1) {
      if (rightLY[i] >= rightOneSetH) {
        const d = rightLY[i] - rightOneSetH;
        rightLY[i] = d; rightVY[i] -= rightOneSetH;
      }
      if (rightLY[i] < 0) {
        rightLY[i] += rightOneSetH; rightVY[i] += rightOneSetH;
      }
    }

    col.style.transform = `translateY(${-rightLY[i]}px)`;

    const step     = thumbH + RIGHT_GAP;
    const c        = window.__cylCfg || {};
    const liveCYL  = c.cylR         ?? CYLR;
    const zMult    = c.zMult        ?? 1;
    const maxRad   = (c.maxDeg      ?? 89) * (Math.PI / 180);
    const flatZone = c.flatZone     ?? 0;
    const fadeZone = c.fadeZone     ?? 0;
    const axisT    = (c.cylAxis     ?? 0) * Math.PI * 0.5;
    const bowlStr  = c.bowlStrength ?? 0;
    const pitCY    = VH * (c.pitCenterY ?? 0.75);
    const pitSigma = c.pitRadius    ?? 200;
    const pitDepth = c.pitDepth     ?? 0;
    const VW       = window.innerWidth;
    const dx       = colCenterX[i] - VW * 0.5;
    const radH     = (dx / liveCYL) * bowlStr;

    thumbCaches[i].forEach((thumb, j) => {
      const cardCY = COL_TOPS[i] + j * step + thumbH * 0.5 - rightLY[i];
      const dy     = cardCY - VH * 0.5;
      const absdy  = Math.abs(dy);

      let t = 1;
      if (absdy <= flatZone) {
        t = 0;
      } else if (fadeZone > 0 && absdy <= flatZone + fadeZone) {
        const p = (absdy - flatZone) / fadeZone;
        t = p * p * (3 - 2 * p);
      }

      const rawRad = (dy / liveCYL) * t;
      const rad    = Math.sign(rawRad) * Math.min(Math.abs(rawRad), maxRad);
      const deg    = rad * (180 / Math.PI);

      const rotX_f = -deg * Math.cos(axisT);
      const rotY_f = -deg * Math.sin(axisT) + (-radH * (180 / Math.PI));

      const radCombined = Math.sqrt(rad * rad + radH * radH);
      const zCyl  = liveCYL * (1 - Math.cos(Math.min(radCombined, maxRad))) * zMult;

      const pitDY     = cardCY - pitCY;
      const pitFactor = Math.exp(-(pitDY * pitDY) / (2 * pitSigma * pitSigma));
      const zPit      = -pitDepth * pitFactor;

      thumb.style.rotate    = '';
      thumb.style.translate = '';
      thumb.style.transform = `rotateX(${rotX_f.toFixed(2)}deg) rotateY(${rotY_f.toFixed(2)}deg) translateZ(${(zCyl + zPit).toFixed(2)}px)`;
    });
  });

  // ── Left panel — infinite scroll ──────────────────
  leftTarget += leftVel;
  leftVel *= lc('friction', FRICTION);
  if (Math.abs(leftVel) < MIN_VEL) leftVel = 0;

  leftLY += (leftTarget - leftLY) * kL;

  if (leftOneSetH > 1) {
    if (leftLY >= leftOneSetH) {
      const d = leftLY - leftOneSetH;
      leftLY = d; leftTarget -= leftOneSetH;
    }
    if (leftLY < 0) {
      leftLY += leftOneSetH; leftTarget += leftOneSetH;
    }
  }

  leftPanel.style.transform = `translateY(${-leftLY}px)`;

  // ── Crosshair ─────────────────────────────────────
  const avgVel = (velR[0] + velR[1] + velR[2] + leftVel) / 4;
  crossAngle += avgVel * lc('crossSpeed', 0.4);
  const kCross = lerpK(lc('crossSmooth', 82), dt);
  crossAngLY += (crossAngle - crossAngLY) * kCross;
  if (crosshairEl) crosshairEl.style.transform = `rotate(${crossAngLY}deg)`;
}

// ─── WHEEL ───────────────────────────────────────────
function onWheel(e) {
  const half = window.innerWidth * 0.5;

  if (e.clientX < half) {
    // Left half → scroll left panel
    let raw = e.deltaY;
    if (e.deltaMode === 1) raw *= 32;
    if (e.deltaMode === 2) raw *= window.innerHeight;
    leftVel += raw * lc('sensitivity', 0.09) * 0.6;
    const mv = lc('maxVel', MAX_VEL);
    leftVel = Math.max(-mv, Math.min(mv, leftVel));
  } else {
    // Right half → scroll thumbnails
    let raw = e.deltaY;
    if (e.deltaMode === 1) raw *= 32;
    if (e.deltaMode === 2) raw *= window.innerHeight;
    const sens = lc('sensitivity', 0.09);
    const mv   = lc('maxVel', MAX_VEL);
    const spd  = [lc('speed0', SPEEDS[0]), lc('speed1', SPEEDS[1]), lc('speed2', SPEEDS[2])];
    cols.forEach((_, i) => {
      velR[i] += raw * sens * spd[i];
      const cap = mv * spd[i];
      velR[i] = Math.max(-cap, Math.min(cap, velR[i]));
    });
    const delay = lc('shrinkDelay', SHRINK_DELAY);
    cols.forEach(col => col.classList.add('is-scrolling'));
    clearTimeout(shrinkTimer);
    shrinkTimer = setTimeout(() => {
      cols.forEach(col => col.classList.remove('is-scrolling'));
    }, delay);
  }
}

// ─── CLICK ───────────────────────────────────────────
function onThumbClick(e) {
  const thumb = e.target.closest('.portfolio-thumb');
  if (!thumb) return;
  const idx = parseInt(thumb.dataset.globalIdx ?? 0, 10);
  currentProjectIdx = idx;
  setLeftContent(idx);
  updateDescription(idx);
}

// ─── INIT ────────────────────────────────────────────
// Merge saved file data into PROJECTS (called before loadAdminData)
function applyFileData() {
  const data = window.__portfolioData;
  if (!Array.isArray(data)) return;
  data.forEach(saved => {
    const target = PROJECTS.find(p => p.idx === saved.idx);
    if (!target) return;
    if (saved.name        !== undefined) target.name        = saved.name;
    if (saved.color)                     target.color       = saved.color;
    if (saved.description !== undefined) target.description = saved.description;
    if (saved.thumbnail   !== undefined) target.thumbnail   = saved.thumbnail;
    if (saved.content)                   target.content     = saved.content;
  });
}

async function init() {
  applyFileData();
  if (typeof window.loadAdminData === 'function') {
    await window.loadAdminData(PROJECTS);
  }

  buildDOM();
  preloadVideos();

  if (descBtn) {
    descBtn.addEventListener('click', () => {
      const proj = PROJECTS[currentProjectIdx];
      if (proj && proj.description) setDescOpen(!descOpen);
    });
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    measure();
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }));

  const portfolio = document.querySelector('.portfolio');
  portfolio.addEventListener('wheel', onWheel, { passive: true });
  portfolio.addEventListener('click', onThumbClick);
  window.addEventListener('resize', () => requestAnimationFrame(measure), { passive: true });

  // API for admin panel
  window.portfolioAdmin = {
    getProjects: () => PROJECTS,
    setProject: (idx, data) => {
      if (idx >= 0 && idx < PROJECTS.length) {
        Object.assign(PROJECTS[idx], data);
        if (idx === currentProjectIdx) {
          setLeftContent(idx);
          updateDescription(idx);
        }
        // Update thumbnail card in DOM
        cols.forEach(col => {
          col.querySelectorAll(`[data-global-idx="${idx}"]`).forEach(card => {
            const proj = PROJECTS[idx];
            if (proj.thumbnail) {
              card.style.backgroundImage = `url(${proj.thumbnail})`;
              card.style.backgroundColor = '';
            } else {
              card.style.backgroundImage = '';
              card.style.backgroundColor = proj.color;
            }
          });
        });
      }
    },
  };
}

document.addEventListener('DOMContentLoaded', init);
