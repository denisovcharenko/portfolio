'use strict';

(function () {
  const canvas = document.getElementById('dent-canvas');
  if (!canvas) return;

  const W = 440, H = 380;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  // Camera: aspect matches canvas
  const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 20);
  camera.position.z = 4.2;

  // ── Concave bowl ─────────────────────────────────────
  // Large circle, parabolic Z displacement → bowl shape.
  // Centered at bottom-right of canvas so only the inner
  // curved surface is visible in the top-left area.
  const RADIUS   = 4.0;
  const DEPTH    = 0.55; // curvature strength
  const geo = new THREE.CircleGeometry(RADIUS, 128);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.sqrt(x * x + y * y);
    pos.setZ(i, -(r * r) * DEPTH);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1d1d1d,
    roughness: 0.82,
    metalness: 0.08,
  });

  const bowl = new THREE.Mesh(geo, mat);

  // Shift center to bottom-right corner of canvas view
  bowl.position.set(2.2, -1.9, 0);
  scene.add(bowl);

  // ── Lighting ─────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-3, 3, 3);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8899bb, 0.25);
  rim.position.set(2, -2, 1);
  scene.add(rim);

  // ── Animate: slow light drift for depth life ─────────
  function animate(t) {
    requestAnimationFrame(animate);
    const s = t * 0.0004;
    key.position.x = -3 + Math.sin(s) * 0.6;
    key.position.y =  3 + Math.cos(s * 0.8) * 0.4;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
})();
