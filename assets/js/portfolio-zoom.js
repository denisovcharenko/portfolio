'use strict';

(function () {

  const CONFIG = {
    openDuration: 0.55,
    closeDuration: 0.45,
    openEase:  'power3.out',
    closeEase: 'power2.inOut',
  };

  let lbChild    = null;
  let srcEl      = null;
  let srcRect    = null;
  let isOpen     = false;
  let isAnim     = false;
  let isPortrait = false;

  document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.querySelector('[data-click-zoom-lightbox]');
    if (!lightbox) return;

    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-hidden', 'true');

    const backdropColor = window.getComputedStyle(lightbox).backgroundColor;
    const transparent   = 'rgba(0,0,0,0)';

    // ── Helpers ─────────────────────────────────────────
    function computeFlip(src, dst) {
      return {
        scaleX: src.width  / dst.width,
        scaleY: src.height / dst.height,
        tx: (src.left + src.width  * 0.5) - (dst.left + dst.width  * 0.5),
        ty: (src.top  + src.height * 0.5) - (dst.top  + dst.height * 0.5),
      };
    }

    // Landscape: fit entirely within viewport
    function fitLandscape(aspect) {
      const s = window.getComputedStyle(lightbox);
      const padX = parseFloat(s.paddingLeft)  + parseFloat(s.paddingRight);
      const padY = parseFloat(s.paddingTop)   + parseFloat(s.paddingBottom);
      // Use window dimensions (lightbox is fixed + inset:0) — clientWidth is 0 when display:none
      let w = window.innerWidth  - padX;
      let h = w / aspect;
      if (h > window.innerHeight - padY) { h = window.innerHeight - padY; w = h * aspect; }
      return { w, h };
    }

    // Portrait: 2× the panel width, may overflow viewport height (lightbox scrolls)
    function fitPortrait(aspect, srcWidth) {
      const vmin = Math.min(window.innerWidth, window.innerHeight) * 0.05;
      const w = Math.min(
        Math.max(srcWidth * 2, 280),        // at least 2× panel width, min 280px
        window.innerWidth * 0.92 - vmin * 2 // never wider than 92vw
      );
      const h = w / aspect;
      return { w, h, overflows: h > window.innerHeight - vmin * 2 };
    }

    function buildChild(type, el) {
      if (type === 'image') {
        const clone = el.cloneNode(false);
        clone.loading = 'eager';
        clone.style.cssText = 'display:block;border-radius:0.75em;object-fit:contain;';
        return clone;
      }
      const srcV = el.querySelector('video');
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.autoplay = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      if (srcV) v.src = srcV.src;
      v.style.cssText = 'display:block;border-radius:0.75em;object-fit:contain;';
      return v;
    }

    // ── Open ─────────────────────────────────────────────
    function open(type, el) {
      if (isOpen || isAnim) return;
      if (type === 'image' && (!el.complete || !el.naturalWidth)) return;

      isAnim  = true;
      srcEl   = el;
      srcRect = el.getBoundingClientRect();

      window.__portfolioFreezeLeft = true;

      const aspect = type === 'image'
        ? srcRect.width / srcRect.height
        : 100 / (parseFloat(el.style.paddingTop) || 56.25);

      isPortrait = type === 'image' && aspect < 1;

      lbChild = buildChild(type, el);

      if (isPortrait) {
        // ── Portrait mode: 2× size, scrollable ──────────
        const { w, h, overflows } = fitPortrait(aspect, srcRect.width);

        lightbox.style.alignItems    = 'flex-start';
        lightbox.style.overflowY     = overflows ? 'auto' : 'hidden';
        lightbox.style.paddingTop    = '5vmin';
        lightbox.style.paddingBottom = '5vmin';

        gsap.set(lightbox, { display: 'flex', backgroundColor: transparent });
        gsap.set(lbChild, { width: w, height: h });
        while (lightbox.firstChild) lightbox.removeChild(lightbox.firstChild);
        lightbox.appendChild(lbChild);
        lightbox.scrollTop = 0;

        const dstRect = lbChild.getBoundingClientRect();

        // FLIP anchored to the VISIBLE center of the source (image may extend off-screen)
        const visTop    = Math.max(srcRect.top, 0);
        const visBottom = Math.min(srcRect.bottom, window.innerHeight);
        const srcCenterX = srcRect.left + srcRect.width  * 0.5;
        const srcCenterY = (visTop + visBottom) * 0.5;
        const dstCenterX = dstRect.left + dstRect.width  * 0.5;
        const dstCenterY = dstRect.top  + dstRect.height * 0.5;

        // Uniform scale based on width (both axes same to avoid distortion)
        const scale = srcRect.width / w;

        lightbox.setAttribute('aria-hidden', 'false');
        document.documentElement.style.cursor = 'zoom-out';

        const tl = gsap.timeline({
          onComplete: () => { isAnim = false; isOpen = true; attachClose(); },
        });
        tl.to(lightbox, { backgroundColor: backdropColor, duration: 0.3, ease: 'none' }, 0);
        tl.fromTo(lbChild,
          {
            scale,
            x: srcCenterX - dstCenterX,
            y: srcCenterY - dstCenterY,
            transformOrigin: '50% 50%',
          },
          { scale: 1, x: 0, y: 0, duration: CONFIG.openDuration, ease: CONFIG.openEase },
          0
        );

      } else {
        // ── Landscape mode: fit to viewport, FLIP ───────
        lightbox.style.alignItems    = '';
        lightbox.style.overflowY     = '';
        lightbox.style.paddingTop    = '';
        lightbox.style.paddingBottom = '';

        const { w, h } = fitLandscape(aspect);

        gsap.set(lightbox, { display: 'flex', backgroundColor: transparent });
        gsap.set(lbChild, { width: w, height: h });
        while (lightbox.firstChild) lightbox.removeChild(lightbox.firstChild);
        lightbox.appendChild(lbChild);

        const dstRect = lbChild.getBoundingClientRect();
        const flip    = computeFlip(srcRect, dstRect);

        lightbox.setAttribute('aria-hidden', 'false');
        document.documentElement.style.cursor = 'zoom-out';

        const tl = gsap.timeline({
          onComplete: () => { isAnim = false; isOpen = true; attachClose(); },
        });
        tl.to(lightbox, { backgroundColor: backdropColor, duration: 0.3, ease: 'none' }, 0);
        tl.fromTo(lbChild,
          { x: flip.tx, y: flip.ty, scaleX: flip.scaleX, scaleY: flip.scaleY },
          { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: CONFIG.openDuration, ease: CONFIG.openEase },
          0
        );
      }
    }

    // ── Close ─────────────────────────────────────────────
    function close() {
      if (!isOpen || isAnim) return;
      isAnim = true;
      detachClose();
      document.documentElement.style.cursor = '';

      const cleanup = () => {
        lightbox.style.alignItems    = '';
        lightbox.style.overflowY     = '';
        lightbox.style.paddingTop    = '';
        lightbox.style.paddingBottom = '';
        lightbox.scrollTop = 0;
        gsap.set(lightbox, { display: 'none', clearProps: 'backgroundColor' });
        if (lbChild?.parentNode) lbChild.parentNode.removeChild(lbChild);
        lbChild = null; srcEl = null; srcRect = null;
        isOpen = false; isAnim = false;
        lightbox.setAttribute('aria-hidden', 'true');
        window.__portfolioFreezeLeft = false;
      };

      if (isPortrait) {
        // Freeze scrolling without resetting scroll position
        lightbox.style.overflowY = 'hidden';

        // Same computeFlip as landscape — geometric centers guarantee the element's
        // top edge lands exactly at srcRect.top regardless of off-screen extent.
        const lbRect     = lbChild.getBoundingClientRect();
        const targetRect = srcEl ? srcEl.getBoundingClientRect() : srcRect;
        const flip       = computeFlip(targetRect, lbRect);

        gsap.to(lbChild, {
          x: flip.tx, y: flip.ty, scaleX: flip.scaleX, scaleY: flip.scaleY,
          duration: CONFIG.closeDuration, ease: CONFIG.closeEase,
          onComplete: cleanup,
        });
        gsap.to(lightbox, {
          backgroundColor: transparent,
          duration: 0.3, ease: 'power2.in',
          delay: CONFIG.closeDuration * 0.4,
        });

      } else {
        // Landscape: FLIP back to source position
        const targetRect = srcEl ? srcEl.getBoundingClientRect() : srcRect;
        const dstRect    = lbChild.getBoundingClientRect();
        const flip       = computeFlip(targetRect, dstRect);

        gsap.to(lbChild, {
          x: flip.tx, y: flip.ty, scaleX: flip.scaleX, scaleY: flip.scaleY,
          duration: CONFIG.closeDuration, ease: CONFIG.closeEase,
          onComplete: cleanup,
        });
        gsap.to(lightbox, {
          backgroundColor: transparent,
          duration: 0.3, ease: 'power2.in',
          delay: CONFIG.closeDuration * 0.4,
        });
      }
    }

    // ── Close listeners ───────────────────────────────────
    function onLbClick()  { close(); }
    function onEsc(e)     { if (e.key === 'Escape') close(); }

    function attachClose() {
      lightbox.addEventListener('click', onLbClick);
      document.addEventListener('keydown', onEsc);
    }
    function detachClose() {
      lightbox.removeEventListener('click', onLbClick);
      document.removeEventListener('keydown', onEsc);
    }

    // ── Click delegation on left panel ────────────────────
    const leftPanel = document.getElementById('portfolio-left');
    if (!leftPanel) return;

    leftPanel.addEventListener('click', e => {
      if (isOpen || isAnim) return;
      if (window.innerWidth <= 599) return;

      const img = e.target.closest('img.portfolio-left-img');
      if (img) { open('image', img); return; }

      const videoWrap = e.target.closest('.portfolio-left-img.is-video');
      if (videoWrap) { open('video', videoWrap); return; }
    });
  });

})();
