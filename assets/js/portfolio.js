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

const lc  = (key, def) => (window.__cylCfg  && window.__cylCfg[key]  != null) ? window.__cylCfg[key]  : def;
const lcl = (key, def) => (window.__leftCfg && window.__leftCfg[key] != null) ? window.__leftCfg[key] : def;

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
let leftScrollTimer = null;
let rightOneSetH = 1, thumbH = 120;
let crossAngle = 0, crossAngLY = 0;
let currentProjectIdx = -1;
let descOpen = false;

const MOBILE = window.innerWidth <= 599;
let currentlyMobile = MOBILE;

let sceneBulge = 0; // current lerped bulge angle (degrees)
let warpDepth  = 0; // lerped translateZ amplitude (px) for mobile parabolic depth

// ─── RESPONSIVE COLUMN SYSTEM ────────────────────────
const COL_W        = 140;   // column width px
const COL_G        = 20;    // gutter between columns px
const COL_RM       = 10;    // right margin px
const COL_LVW      = 0.32;  // left panel ratio of VW
const COL_LMAX     = 460;   // left panel max px
const COL_LMIN     = 280;   // left panel min px
const COL_CCLEAR   = 200;   // minimum center clearance (100px each side)
const COL_HYSTER   = 30;    // hysteresis px before column count change commits
const COL_MAX      = 3;

let activeN   = 3;   // current column count
let pendingN  = null;
let pendingVW = null;

function calcN(vw) {
  const lw    = Math.min(COL_LMAX, Math.max(COL_LMIN, vw * COL_LVW));
  const avail = vw - lw - COL_CCLEAR - COL_RM;
  return Math.max(1, Math.min(COL_MAX, Math.floor((avail + COL_G) / (COL_W + COL_G))));
}

function applyN(n, animated) {
  activeN = n;
  cols.forEach((col, i) => {
    const visible = i >= COL_MAX - n; // rightmost N columns are visible
    if (animated) {
      gsap.to(col, { opacity: visible ? 1 : 0, duration: 0.4, ease: 'power2.inOut' });
    } else {
      col.style.opacity = visible ? '1' : '0';
    }
    col.style.pointerEvents = visible ? '' : 'none';
  });
}

const thumbCaches = [[], [], []];
const colCenterX  = [0, 0, 0];

// Video preload pool
const videoPool   = new Map(); // key → div element
let poolContainer = null;

// ─── ELEMENTS ────────────────────────────────────────
const sceneEl     = document.getElementById('col-3d-scene');
const leftPanel   = document.getElementById('portfolio-left');
const crosshairEl = document.querySelector('.portfolio-crosshair svg');
const descBtn     = document.getElementById('desc-btn');
const descPanel   = document.getElementById('desc-panel');
const descText    = document.getElementById('desc-text');
const descTitle   = document.getElementById('desc-title');
const descWrap    = document.querySelector('[data-desc-status]');
const descBg      = document.querySelector('.portfolio-desc-nav__bg');
const cols        = [
  document.getElementById('col-0'),
  document.getElementById('col-1'),
  document.getElementById('col-2'),
];

// ─── VIDEO POOL ──────────────────────────────────────
function makeVideoEl(item) {
  const el = document.createElement('div');
  el.className = 'portfolio-left-img is-video';
  el.style.paddingTop = item.ratio || '56.25%';

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;pointer-events:none;';
  if (item.thumb) video.poster = item.thumb;
  video.src = item.src;

  el.appendChild(video);
  return el;
}

function triggerPlay(key) {
  const el = videoPool.get(key);
  const video = el && el.querySelector('video');
  if (video) video.play().catch(() => {});
}

function preloadVideos() {
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
      }
    });
  });
}

// ─── DOM BUILD ───────────────────────────────────────
function buildDOM() {
  const oyvdoma = PROJECTS.find(p => p.name === 'Oyvdoma') || PROJECTS[0];

  // On mobile the left panel starts hidden — user opens a case by tapping a thumbnail
  if (!MOBILE) {
    currentProjectIdx = oyvdoma.idx;
    buildLeftPanel(oyvdoma);
    updateDescription(oyvdoma.idx);
  }

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
  if (poolContainer) {
    leftPanel.querySelectorAll('[data-vkey]').forEach(el => poolContainer.appendChild(el));
  }

  leftPanel.innerHTML = '';
  leftVel = 0; leftTarget = 0; leftLY = 0;

  const items = (proj && proj.content && proj.content.length > 0)
    ? proj.content
    : Array.from({ length: 4 }, () => ({ type: 'color', color: proj ? proj.color : '#E8917A' }));

  leftContentCount = items.length;

  const passes = MOBILE ? 1 : 2; // no infinite-scroll clones on mobile (native scroll)
  for (let pass = 0; pass < passes; pass++) {
    items.forEach((item, ci) => {
      if (item.type === 'video') {
        const key = `v-${proj.idx}-${ci}-${pass}`;
        const pooled = videoPool.get(key);
        if (pooled) {
          leftPanel.appendChild(pooled);
          triggerPlay(key);
          return;
        }
        const el = makeVideoEl(item);
        el.dataset.vkey = key;
        videoPool.set(key, el);
        leftPanel.appendChild(el);
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
  // Use the first visible (non-display:none) column to sample thumb dimensions
  const sampleCol = cols.find(c => c.offsetParent !== null) || cols[0];
  const thumb = sampleCol.querySelector('.portfolio-thumb');
  if (thumb) {
    thumbH = thumb.getBoundingClientRect().height;
    // Gap between cards matches the CSS gap on the column
    const rightGap = window.innerWidth <= 599 ? 12 : RIGHT_GAP;
    rightOneSetH = N_PER_COL * (thumbH + rightGap);
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
    // Update natural column top (compensate for current scroll offset so resize mid-scroll is correct)
    COL_TOPS[i] = r.top + rightLY[i];
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
  if (descText) {
    const escaped = (proj.description || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    descText.innerHTML = escaped.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('') || '';
  }
  if (!proj.description && descOpen) setDescOpen(false);
}

function setDescOpen(open) {
  descOpen = open;
  gsap.killTweensOf([descBg, descPanel]);
  descWrap?.setAttribute('data-desc-status', open ? 'active' : 'not-active');

  if (open) {
    const btnH   = descBtn?.offsetHeight  || 27;
    const groupH = descPanel?.offsetHeight || 80;
    gsap.to(descBg, { width: 260, height: btnH + groupH, borderRadius: 8, duration: 0.7, ease: 'power3.out' });
    gsap.set(descPanel, { visibility: 'visible' });
    gsap.to(descPanel, { scale: 1, opacity: 1, duration: 0.5, delay: 0.1, ease: 'power3.out' });
  } else {
    gsap.to(descBg, { width: 110, height: 27, borderRadius: 5, duration: 0.6, ease: 'power2.inOut' });
    gsap.to(descPanel, {
      scale: 0.15, opacity: 0, duration: 0.4, ease: 'power2.inOut',
      onComplete: () => gsap.set(descPanel, { visibility: 'hidden' }),
    });
  }
}

// ─── TICK ────────────────────────────────────────────
function tick() {
  const now = performance.now();
  const dt  = Math.min(50, lastT ? now - lastT : 16.7);
  lastT = now;

  const kR = lerpK(lc('smoothR', SMOOTH_R), dt);
  const kL = lerpK(lcl('smoothL', SMOOTH_L), dt);
  const VH = window.innerHeight;
  const VW = window.innerWidth;

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

    // Mobile cylinder — simplified formula (no trig/exp), same visual as desktop.
    // Linear rotateX + parabolic translateZ: fast enough on A-series GPU at 60fps.
    if (currentlyMobile) {
      const c    = window.__cylCfg || {};
      const step = thumbH + 12;
      const maxR = (c.maxDeg ?? 9);
      thumbCaches[i].forEach((thumb, j) => {
        if (i < COL_MAX - activeN) { thumb.style.transform = ''; return; }
        const cardCY = COL_TOPS[i] + j * step + thumbH * 0.5 - rightLY[i];
        const t  = (cardCY - VH * 0.5) / (VH * 0.5); // -1…+1 from centre
        const tc = Math.max(-1, Math.min(1, t));
        const rotX = -(tc * maxR).toFixed(2);          // linear tilt — no cos/sin
        const tz   = (warpDepth * (1 - tc * tc)).toFixed(1); // parabolic depth
        thumb.style.transform = `rotateX(${rotX}deg) translateZ(${tz}px)`;
      });
      return;
    }

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
    const pitDepth = c.pitDepth ?? 0;
    const dx       = colCenterX[i] - VW * 0.5;
    const radH     = (dx / liveCYL) * bowlStr;

    thumbCaches[i].forEach((thumb, j) => {
      if (i < COL_MAX - activeN) { thumb.style.transform = ''; return; }
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

      if (t > 0 && c.curveLUT) {
        const lut = c.curveLUT;
        const idx = Math.max(0, Math.min(lut.length - 1, Math.round(t * (lut.length - 1))));
        t = lut[idx];
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

  // ── Left panel + crosshair — desktop only ────────
  if (!MOBILE) {
    if (!window.__portfolioFreezeLeft) {
      leftTarget += leftVel;
      leftVel *= lcl('friction', FRICTION);
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
    }

    leftPanel.style.transform = `translateY(${-leftLY}px)`;

    const rightAvg = (velR[0] + velR[1] + velR[2]) / 3;
    crossAngle += (leftVel - rightAvg) * lc('crossSpeed', 0.4);
    const kCross = lerpK(lc('crossSmooth', 82), dt);
    crossAngLY += (crossAngle - crossAngLY) * kCross;
    if (crosshairEl) crosshairEl.style.transform = `rotate(${crossAngLY}deg)`;
  }

  // ── Velocity-driven scene bulge + mobile warp depth ──
  const c2      = window.__cylCfg || {};
  const avgVel  = (velR[0] + velR[1] + velR[2]) / 3;
  const kBulge  = lerpK(c2.bulgeSmooth ?? 72, dt);

  // Scene rotateX (desktop) — perspective tilt of the whole composition
  const bulgeCoef   = (c2.bulgeStrength ?? 18) * 1e-6;
  const bulgeTarget = avgVel * Math.abs(avgVel) * bulgeCoef;
  sceneBulge += (bulgeTarget - sceneBulge) * kBulge;

  // Mobile warp depth — base cylinder depth always present, amplified by velocity
  const warpStr    = (c2.warpStrength ?? 50);
  const baseDepth  = warpStr * 1.2;             // always-on depth (px) — creates the static curve
  const velBoost   = Math.abs(avgVel) * Math.abs(avgVel) * warpStr * 0.00015; // velocity bonus
  const warpTarget = baseDepth + velBoost;
  warpDepth += (warpTarget - warpDepth) * kBulge;

  // Apply scene transform (both mobile and desktop)
  const bulgeDeg = Math.max(-5, Math.min(5, sceneBulge));
  const tiltX = (c2.sceneTiltX ?? 0) + (currentlyMobile ? 0 : bulgeDeg);
  const tiltY =  c2.sceneTiltY ?? 0;
  const skewX =  c2.sceneSkewX ?? 0;
  sceneEl.style.transform = (Math.abs(tiltX) > 0.005 || Math.abs(tiltY) > 0.005 || Math.abs(skewX) > 0.005)
    ? `rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg) skewX(${skewX.toFixed(3)}deg)`
    : '';
}

// ─── WHEEL ───────────────────────────────────────────
function onWheel(e) {
  const half = window.innerWidth * 0.5;

  if (e.clientX < half) {
    // Left half → scroll left panel
    let raw = e.deltaY;
    if (e.deltaMode === 1) raw *= 32;
    if (e.deltaMode === 2) raw *= window.innerHeight;
    leftVel += raw * lcl('sensitivity', 0.054);
    const mv = lcl('maxVel', MAX_VEL);
    leftVel = Math.max(-mv, Math.min(mv, leftVel));
    leftPanel.classList.add('is-scrolling');
    clearTimeout(leftScrollTimer);
    leftScrollTimer = setTimeout(() => leftPanel.classList.remove('is-scrolling'), 150);
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
  if (MOBILE) { openMobileCase(idx); return; }
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
    if (!MOBILE) applyN(calcN(window.innerWidth), false);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }));

  const portfolio = document.querySelector('.portfolio');
  portfolio.addEventListener('wheel', onWheel, { passive: true });
  portfolio.addEventListener('click', onThumbClick);

  const MOBILE_BP = 599; // must match CSS breakpoint
  let prevWasMobile = MOBILE; // tracks last known side of the breakpoint

  function onResize() {
    requestAnimationFrame(() => {
      measure();
      const vw         = window.innerWidth;
      const nowMobile  = vw <= MOBILE_BP;
      const crossed    = nowMobile !== prevWasMobile;
      prevWasMobile    = nowMobile;
      currentlyMobile  = nowMobile;

      // ── Entered mobile CSS range ─────────────────────
      if (nowMobile) {
        cols.forEach(col => { col.style.opacity = ''; col.style.pointerEvents = ''; });
        // Clear any 3D cylinder transforms left over from desktop
        if (crossed) thumbCaches.forEach(col => col.forEach(t => { t.style.transform = ''; }));
        activeN = COL_MAX; pendingN = null; pendingVW = null;
        // If just crossed from desktop: push leftClip off-screen
        if (crossed && !mobileCaseOpen) gsap.set(leftClip, { x: '100%' });
        return;
      }

      // ── Just entered desktop from mobile ─────────────
      if (crossed) {
        mobileCaseOpen = false;
        leftClip.classList.remove('mobile-open');
        if (descWrap) descWrap.classList.remove('mobile-desc-on');
        if (descOpen) setDescOpen(false);
        gsap.set(leftClip, { clearProps: 'x' }); // show at natural CSS position

        // Load a project into the left panel
        const deskIdx = currentProjectIdx >= 0
          ? currentProjectIdx
          : (PROJECTS.find(p => p.name === 'Oyvdoma') || PROJECTS[0]).idx;
        if (currentProjectIdx < 0) currentProjectIdx = deskIdx;
        setLeftContent(deskIdx);
        updateDescription(deskIdx);

        applyN(calcN(vw), false);
        pendingN = null; pendingVW = null;
        return;
      }

      // ── Normal desktop column-count hysteresis ────────
      const n = calcN(vw);
      if (n === activeN) { pendingN = null; pendingVW = null; return; }
      if (pendingN !== n) { pendingN = n; pendingVW = vw; return; }
      if (Math.abs(vw - pendingVW) >= COL_HYSTER) {
        applyN(n, true);
        pendingN = null; pendingVW = null;
      }
    });
  }
  window.addEventListener('resize', onResize, { passive: true });

  if (MOBILE) {
    window.__portfolioFreezeLeft = true;
    initMobile(portfolio);
  }

  // API for admin panel
  window.portfolioAdmin = {
    getProjects: () => PROJECTS,
    getActiveIdx: () => currentProjectIdx,
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

// ─── MOBILE ──────────────────────────────────────────
let mobileCaseOpen = false;
const leftClip = document.getElementById('portfolio-left-clip');

function openMobileCase(idx) {
  const proj = PROJECTS[idx];
  if (!proj) return;

  currentProjectIdx = idx;
  setLeftContent(idx);
  updateDescription(idx);

  const nameEl = document.getElementById('mobile-case-name');
  if (nameEl) nameEl.textContent = proj.name || '';

  mobileCaseOpen = true;
  leftClip.classList.add('mobile-open');
  leftClip.scrollTop = 0;

  if (descWrap) descWrap.classList.add('mobile-desc-on');

  gsap.fromTo(leftClip, { x: '100%' }, { x: '0%', duration: 0.38, ease: 'power3.out' });
}

function closeMobileCase() {
  mobileCaseOpen = false;
  if (descOpen) setDescOpen(false);
  if (descWrap) descWrap.classList.remove('mobile-desc-on');

  gsap.to(leftClip, {
    x: '100%', duration: 0.30, ease: 'power2.inOut',
    onComplete: () => {
      leftClip.classList.remove('mobile-open');
      // Keep GSAP x:100% transform in place — do NOT clearProps, or the panel
      // snaps back to its CSS position (position:fixed inset:0) and covers the screen.
      leftClip.scrollTop = 0;
    },
  });
}

function initMobile(portfolio) {
  // ── Position clip off-screen initially ──────────
  gsap.set(leftClip, { x: '100%' });

  // ── Back button ──────────────────────────────────
  document.getElementById('mobile-back')?.addEventListener('click', closeMobileCase);

  // ── Touch scroll for thumbnail columns ───────────
  let tY = 0, tActive = false;

  portfolio.addEventListener('touchstart', e => {
    if (mobileCaseOpen) return;
    tY = e.touches[0].clientY;
    tActive = true;
    velR.fill(0);
    cols.forEach(col => col.classList.remove('is-scrolling'));
  }, { passive: true });

  portfolio.addEventListener('touchmove', e => {
    if (!tActive || mobileCaseOpen) return;
    const dy = e.touches[0].clientY - tY;
    tY = e.touches[0].clientY;

    const mv  = lc('maxVel', MAX_VEL);
    const spd = [lc('speed0', SPEEDS[0]), lc('speed1', SPEEDS[1]), lc('speed2', SPEEDS[2])];
    cols.forEach((_, i) => {
      velR[i] -= dy * spd[i]; // invert: finger down → columns scroll up (content moves up)
      velR[i] = Math.max(-mv * spd[i], Math.min(mv * spd[i], velR[i]));
    });

    cols.forEach(col => col.classList.add('is-scrolling'));
    clearTimeout(shrinkTimer);
    shrinkTimer = setTimeout(() => cols.forEach(col => col.classList.remove('is-scrolling')), 300);
    e.preventDefault();
  }, { passive: false });

  portfolio.addEventListener('touchend', () => { tActive = false; }, { passive: true });

  // ── Swipe-to-close from left edge of case detail ─
  let swipeStartX = 0, swipeStartY = 0;
  let swipeActive = false, swipeCommitted = false;

  leftClip.addEventListener('touchstart', e => {
    if (!mobileCaseOpen) return;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeActive = true;
    swipeCommitted = false;
  }, { passive: true });

  leftClip.addEventListener('touchmove', e => {
    if (!swipeActive || !mobileCaseOpen) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = Math.abs(e.touches[0].clientY - swipeStartY);

    if (!swipeCommitted) {
      // Commit only if started near left edge AND primarily horizontal
      if (Math.abs(dx) > 8 || dy > 8) {
        if (Math.abs(dx) > dy && dx > 0 && swipeStartX < 50) {
          swipeCommitted = true;
        } else {
          swipeActive = false; // vertical scroll, let native scroll handle it
          return;
        }
      }
      return;
    }

    if (dx > 0) {
      gsap.set(leftClip, { x: dx });
      e.preventDefault();
    }
  }, { passive: false });

  leftClip.addEventListener('touchend', e => {
    if (!swipeActive || !swipeCommitted) { swipeActive = false; return; }
    swipeActive = false;
    swipeCommitted = false;

    const dx = e.changedTouches[0].clientX - swipeStartX;
    if (dx > 80) {
      closeMobileCase();
    } else {
      gsap.to(leftClip, { x: 0, duration: 0.22, ease: 'power2.out' });
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', init);
