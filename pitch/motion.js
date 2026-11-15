/* Stage motion for deck.html: a persistent 3D Mars, a warp starfield and GSAP slide transitions.
   Loaded as classic scripts (works from file://). If GSAP or Three.js is missing, deck.html
   keeps its plain CSS transitions. Print and the PDF never use any of this. */
(function () {
  if (!window.gsap) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('motion');

  /* ---------------- 3D scene (optional) ---------------- */
  const has3D = !!window.THREE && (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; } })();
  const scene3d = has3D ? buildScene() : null;

  /* Planet placement per slide, in viewport units: x,y in -1..1, r = radius as a share of the viewport height, o = opacity */
  const SPOTS = {
    intro: { x: 0, y: 0, r: 0.2, o: 1 },
    1: { x: 0.97, y: 0.52, r: 0.30, o: 0.95 },
    2: { x: 1.02, y: 1.02, r: 0.20, o: 0.7 },
    3: { x: -1.04, y: -1.06, r: 0.20, o: 0.3 },
    4: { x: 0.0, y: -3.30, r: 1.45, o: 0.60 },
    5: { x: 1.06, y: -1.00, r: 0.26, o: 0.60 },
    6: { x: -1.06, y: 1.00, r: 0.24, o: 0.55 },
    7: { x: 0.0, y: -0.02, r: 0.30, o: 0.38 },
  };

  function buildScene() {
    const T = window.THREE;
    const canvas = document.getElementById('space');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x060a13, 1);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(35, 1, 0.1, 400);
    camera.position.set(0, 0, 10);

    /* procedural Mars texture: fractal value noise, no image files (file:// safe) */
    const W = 1024, H = 512, tex = document.createElement('canvas');
    tex.width = W; tex.height = H;
    const ctx = tex.getContext('2d'), img = ctx.createImageData(W, H);
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const G = 64, grid = Array.from({ length: G * G }, rnd);
    const at = (x, y) => grid[((y % G + G) % G) * G + ((x % G + G) % G)];
    const smooth = (t) => t * t * (3 - 2 * t);
    const noise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    };
    const fbm = (x, y) => { let v = 0, amp = 0.5, f = 1; for (let o = 0; o < 5; o++) { v += amp * noise(x * f, y * f); amp *= 0.5; f *= 2; } return v; };
    const dark = [92, 38, 22], mid = [168, 76, 42], light = [214, 128, 78];
    for (let y = 0; y < H; y++) {
      const lat = Math.abs(y / H - 0.5) * 2;
      for (let x = 0; x < W; x++) {
        const u = (x / W) * G * 0.5, v = (y / H) * G * 0.25;
        let n = fbm(u, v);
        n = n * 0.85 + 0.15 * fbm(u * 4 + 9, v * 4 + 3);
        const c = n < 0.45 ? dark.map((d0, i) => d0 + (mid[i] - d0) * (n / 0.45)) : mid.map((m, i) => m + (light[i] - m) * ((n - 0.45) / 0.55));
        const cap = Math.max(0, (lat - 0.86) / 0.14) * (0.6 + 0.4 * n);
        const k = (y * W + x) * 4;
        img.data[k] = c[0] + (238 - c[0]) * cap;
        img.data[k + 1] = c[1] + (228 - c[1]) * cap;
        img.data[k + 2] = c[2] + (220 - c[2]) * cap;
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const map = new T.CanvasTexture(tex);
    map.encoding = T.sRGBEncoding;

    const group = new T.Group();
    scene.add(group);
    const planetMat = new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.035, roughness: 0.95, metalness: 0, transparent: true });
    const planet = new T.Mesh(new T.SphereGeometry(1, 96, 96), planetMat);
    planet.rotation.z = 0.44;
    group.add(planet);

    /* fresnel atmosphere */
    const atmoMat = new T.ShaderMaterial({
      uniforms: { color: { value: new T.Color(0xff8a4c) }, op: { value: 1 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 color; uniform float op; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - max(dot(vN, vV), 0.), 3.); gl_FragColor = vec4(color, f*0.9*op); }',
      side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false,
    });
    const atmo = new T.Mesh(new T.SphereGeometry(1.16, 64, 64), atmoMat);
    group.add(atmo);

    /* CAD-style orbit: dashed ring with orange handles */
    const ringPts = [];
    for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; ringPts.push(new T.Vector3(Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7)); }
    const ringGeo = new T.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new T.LineDashedMaterial({ color: 0xff8a3d, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.55 });
    const ring = new T.Line(ringGeo, ringMat);
    ring.computeLineDistances();
    ring.rotation.x = 1.18; ring.rotation.y = 0.25;
    group.add(ring);
    const sat = new T.Mesh(new T.SphereGeometry(0.035, 12, 12), new T.MeshBasicMaterial({ color: 0x3fdcbc, transparent: true }));
    group.add(sat);

    scene.add(new T.AmbientLight(0x404a66, 0.35));
    const sun = new T.DirectionalLight(0xfff1e0, 2.2);
    sun.position.set(-6, 3, 5);
    scene.add(sun);

    /* warp starfield as line segments: length grows with speed */
    const N = 1800, pos = new Float32Array(N * 6), stars = [];
    for (let i = 0; i < N; i++) stars.push({ x: (Math.random() - 0.5) * 90, y: (Math.random() - 0.5) * 60, z: -Math.random() * 200 });
    const starGeo = new T.BufferGeometry();
    starGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const starMat = new T.LineBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.85 });
    scene.add(new T.LineSegments(starGeo, starMat));

    const state = { speed: 0.04, x: 0, y: 0, r: 0.24, o: 0, spin: 0 };
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    };
    addEventListener('resize', resize); resize();

    const viewH = () => 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      state.spin += dt * 0.06;
      const vh = viewH(), vw = vh * camera.aspect;
      group.position.set(state.x * vw / 2, state.y * vh / 2, 0);
      group.scale.setScalar(state.r * vh);
      planet.rotation.y = state.spin;
      ring.rotation.z = state.spin * 0.6;
      const a = state.spin * 3.2;
      sat.position.copy(new T.Vector3(Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7).applyEuler(ring.rotation));
      planetMat.opacity = state.o; atmoMat.uniforms.op.value = state.o;
      ringMat.opacity = 0.55 * state.o; sat.material.opacity = state.o;
      const len = 0.15 + state.speed * 9;
      for (let i = 0; i < N; i++) {
        const s = stars[i];
        s.z += state.speed * 60 * dt * 10;
        if (s.z > 10) { s.z = -200; s.x = (Math.random() - 0.5) * 90; s.y = (Math.random() - 0.5) * 60; }
        const k = i * 6;
        pos[k] = s.x; pos[k + 1] = s.y; pos[k + 2] = s.z;
        pos[k + 3] = s.x; pos[k + 4] = s.y; pos[k + 5] = s.z - len;
      }
      starGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return { state };
  }

  /* ---------------- planet + warp helpers ---------------- */
  const moveTo = (key, dur = 1.4) => {
    if (!scene3d) return;
    const p = SPOTS[key];
    gsap.to(scene3d.state, { x: p.x, y: p.y, r: p.r, o: p.o, duration: reduce ? 0 : dur, ease: 'power3.inOut' });
  };
  const warp = () => {
    if (!scene3d || reduce) return;
    gsap.timeline()
      .to(scene3d.state, { speed: 1.1, duration: 0.35, ease: 'power2.in' })
      .to(scene3d.state, { speed: 0.04, duration: 1.1, ease: 'power3.out' });
  };

  /* ---------------- slide transitions ---------------- */
  const reveal = (slide) => {
    const r = slide.querySelectorAll('.r'), pops = slide.querySelectorAll('.pop');
    gsap.fromTo(r, { y: 46, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.07, ease: 'power3.out', delay: 0.15, overwrite: true });
    gsap.fromTo(pops, { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(2.2)', delay: 0.6, overwrite: true });
  };

  let busy = false;
  window.DeckMotion = {
    go(from, to, dir, n) {
      if (busy && from) { gsap.globalTimeline.getChildren(false, true, true).forEach((t) => t.progress(1)); }
      busy = true;
      moveTo(n);
      const tl = gsap.timeline({ onComplete: () => { busy = false; } });
      if (from && from !== to) {
        warp();
        tl.to(from, { autoAlpha: 0, y: -40 * dir, scale: 0.97, duration: reduce ? 0 : 0.42, ease: 'power2.in' });
        tl.set(from, { y: 0, scale: 1 });
      }
      tl.set(to, { autoAlpha: 1, y: 0, scale: 1 });
      tl.add(() => reveal(to));
      return tl;
    },
  };

  /* ---------------- intro: blueprint circle that becomes Mars ---------------- */
  window.DeckMotion.intro = (done) => {
    const el = document.getElementById('intro');
    if (!el || reduce || location.hash.length > 1) { el && el.remove(); moveTo(1, 0); done(); return; }
    const paths = el.querySelectorAll('.draw');
    paths.forEach((p) => { const L = p.getTotalLength ? p.getTotalLength() : 1000; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      removeEventListener('keydown', skip, true); removeEventListener('click', skip, true);
      gsap.to(el, { autoAlpha: 0, duration: 0.6, onComplete: () => el.remove() });
      moveTo(1, 1.6);
      done();
    };
    const skip = (e) => { e.stopPropagation(); e.preventDefault(); tl.kill(); finish(); };
    addEventListener('keydown', skip, true); addEventListener('click', skip, true);
    if (scene3d) Object.assign(scene3d.state, SPOTS.intro, { o: 0 });
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(paths, { strokeDashoffset: 0, duration: 1.3, stagger: 0.06, ease: 'power2.inOut' })
      .fromTo(el.querySelectorAll('.handle'), { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(3)' }, '-=0.6')
      .fromTo(el.querySelectorAll('.lbl'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
      .add(() => { if (scene3d) gsap.to(scene3d.state, { o: 1, duration: 1.0, ease: 'power2.out' }); }, '+=0.2')
      .to(el.querySelector('svg'), { autoAlpha: 0, scale: 1.25, duration: 0.9, ease: 'power2.in' }, '+=0.5');
  };
})();
