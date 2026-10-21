// Features, "Phone. Mac. One link." (Plan 12): a Nothing Phone (3)-style phone and a MacBook-style laptop with two
// glowing lanes between them. Items fly across, land on the other screen and light up the matching feature card.
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { THREE, RoundedBoxGeometry, setup, run, progress, screenTexture, roundRect, makeMacBook, notch, makePhone, drawPhoneBack, dotText } from '../three/shared.js';

export function mount(section, quality) {
  const el = section;
  const stage = el.querySelector('.stage');
  const s = setup(stage, { alpha: false, quality });
  s.scene.background = new THREE.Color(0x07080a);
  if (quality === 'full') {
    s.composer = new EffectComposer(s.renderer);
    s.composer.addPass(new RenderPass(s.scene, s.camera));
    s.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 1024), 0.7, 0.6, 0.55));
  }
  // Fit the whole scene: further back on narrow screens.
  let baseZ = 13;
  s.onResize = (w, h) => { baseZ = Math.max(11.5, 7.2 / (Math.tan(THREE.MathUtils.degToRad(17.5)) * (w / h))); };
  s.resize();

  const rig = new THREE.Group(); s.scene.add(rig);
  s.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const rim = new THREE.DirectionalLight(0x9fffc8, 1.8); rim.position.set(0, 4, -6); s.scene.add(rim);
  const keyL = new THREE.DirectionalLight(0xffffff, 1.2); keyL.position.set(-3, 4, 8); s.scene.add(keyL);

  const P = makePhone();
  P.phone.position.set(-4.7, -0.2, 0); P.phone.rotation.y = 0.42; rig.add(P.phone);
  const M = makeMacBook(3.9, 2.5, -0.12);
  M.mb.position.set(4.3, -1.6, -0.9); M.mb.rotation.set(0.12, -0.42, 0); rig.add(M.mb);

  const up = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.1, 0.6, 0.5), new THREE.Vector3(-1.7, 2.3, 1.5), new THREE.Vector3(1.3, 2.3, 1.5), new THREE.Vector3(3.5, 0.7, 0.5)]);
  const down = new THREE.CatmullRomCurve3([new THREE.Vector3(3.5, -0.9, 0.6), new THREE.Vector3(1.3, -2.4, 1.6), new THREE.Vector3(-1.6, -2.4, 1.6), new THREE.Vector3(-4.1, -1.0, 0.5)]);
  const flowMat = color => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uBoost: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uBoost; varying vec2 vUv;
      void main(){
        float pulse = fract(vUv.x * 5.0 - uTime * 0.9);
        float head = smoothstep(0.0, 0.08, pulse) * pow(1.0 - pulse, 3.0);
        float ends = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float a = (0.14 + head * (1.4 + uBoost)) * ends * edge;
        gl_FragColor = vec4(uColor * (0.7 + head * 2.2), a);
      }`
  });
  const lanes = [{ curve: up, mat: flowMat(0x4CB873) }, { curve: down, mat: flowMat(0xF9C9A6) }];
  lanes.forEach(l => {
    rig.add(new THREE.Mesh(new THREE.TubeGeometry(l.curve, 160, 0.05, 12), l.mat));
    rig.add(new THREE.Mesh(new THREE.TubeGeometry(l.curve, 160, 0.006, 6), new THREE.MeshBasicMaterial({ color: l.mat.uniforms.uColor.value, transparent: true, opacity: 0.5 })));
  });
  const N = quality === 'full' ? 700 : 250, pos = new Float32Array(N * 3), seed = new Float32Array(N), lane = new Uint8Array(N);
  for (let i = 0; i < N; i++) { seed[i] = Math.random(); lane[i] = i % 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const sparks = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aSeed; uniform float uTime; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
        float tw = 0.5 + 0.5 * sin(uTime * 4.0 + aSeed * 60.0); vA = tw;
        gl_PointSize = (1.5 + aSeed * 4.5) * (0.6 + tw * 0.6) * (14.0 / -mv.z); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        gl_FragColor = vec4(vec3(0.8, 1.0, 0.9), (1.0 - d * 2.0) * vA); }`
  }));
  rig.add(sparks);

  // A soft round glow texture for behind the cards (no more hard coloured squares).
  const glowTex = (() => { const g = screenTexture(256, 256), x = g.ctx; const r = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 256, 256); g.tex.needsUpdate = true; return g.tex; })();

  const items = [
    { lane: 0, f: 'photos', color: '#ffd36b', icon: '▦', title: 'IMG_2041.heic', sub: '4.2 MB · from Photos' },
    { lane: 1, f: 'files', color: '#4CB873', icon: '⬆', title: 'Report.pdf', sub: '12 MB · to Downloads' },
    { lane: 0, f: 'notifs', color: '#6fb6ff', icon: '✉', title: 'WhatsApp', sub: 'on my way 🚲' },
    { lane: 1, f: 'clip', color: '#F9C9A6', icon: '⎘', title: 'Copied link', sub: 'github.com/macdroid' },
    { lane: 0, f: 'calls', color: '#ff7b7b', icon: '☏', title: 'Mum is calling', sub: 'Answer on your Mac' },
    { lane: 0, f: 'mirror', color: '#c7a6ff', icon: '▣', title: 'Screen mirroring', sub: '60 fps · 38 ms' },
  ];
  const cardGeo = new RoundedBoxGeometry(1.9, 0.62, 0.06, 4, 0.03);
  const cards = items.map((it, i) => {
    const sc = screenTexture(620, 200), x = sc.ctx;
    x.fillStyle = '#1b1f24'; roundRect(x, 0, 620, 200, 44); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 4; roundRect(x, 2, 2, 616, 196, 42); x.stroke();
    x.fillStyle = it.color; roundRect(x, 34, 34, 132, 132, 34); x.fill();
    x.fillStyle = '#111'; x.font = '700 74px -apple-system, sans-serif'; x.textAlign = 'center'; x.fillText(it.icon, 100, 126);
    x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '700 44px -apple-system, Inter, sans-serif'; x.fillText(it.title, 196, 92);
    x.fillStyle = 'rgba(255,255,255,.62)'; x.font = '500 32px -apple-system, Inter, sans-serif'; x.fillText(it.sub, 196, 142);
    sc.tex.needsUpdate = true;
    const g = new THREE.Group();
    const slab = new THREE.Mesh(cardGeo, new THREE.MeshPhysicalMaterial({ color: 0x1b1f24, roughness: 0.3, metalness: 0.2, transparent: true }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.6), new THREE.MeshBasicMaterial({ map: sc.tex, transparent: true, toneMapped: false }));
    face.position.z = 0.032; g.add(slab, face);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.8), new THREE.MeshBasicMaterial({ map: glowTex, color: it.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.z = -0.08; g.add(glow);
    g.userData = { ...it, offset: i / items.length, last: 0, glow, mats: [slab.material, face.material] };
    rig.add(g); return g;
  });

  const chips = [...el.querySelectorAll('.feature[data-f]')];
  const arrivals = { mac: null, phone: null };
  const recent = [];
  let backGlow = 0, backColor = '#fff';
  function arrive(it, t) {
    const to = it.lane === 0 ? 'mac' : 'phone';
    arrivals[to] = { ...it, t };
    if (to === 'mac') { recent.unshift(it); recent.length = Math.min(recent.length, 4); }
    else { backGlow = 1; backColor = it.color; }
    chips.forEach(ch => ch.classList.toggle('on', ch.dataset.f === it.f));
    lanes[it.lane].mat.uniforms.uBoost.value = 2.5;
  }

  // Mac desktop: a vivid wallpaper (pre-rendered), menu bar, the Unison window, dock, notification banners.
  const MW = M.cv.width, MH = M.cv.height;
  const wall = document.createElement('canvas'); wall.width = MW; wall.height = MH;
  { const w = wall.getContext('2d'); const g = w.createLinearGradient(0, 0, MW, MH); g.addColorStop(0, '#1b2a6b'); g.addColorStop(0.5, '#5b2a86'); g.addColorStop(1, '#ff7a45');
    w.fillStyle = g; w.fillRect(0, 0, MW, MH); w.filter = 'blur(80px)';
    for (const [x, y, r, col] of [[0.2, 0.8, 300, '#2fd3a0'], [0.75, 0.25, 340, '#ff5fa2'], [0.55, 0.9, 260, '#ffc04a'], [0.1, 0.15, 220, '#4f7dff']]) { w.fillStyle = col; w.globalAlpha = 0.75; w.beginPath(); w.arc(x * MW, y * MH, r, 0, 7); w.fill(); }
    w.filter = 'none'; w.globalAlpha = 1; }
  const dockColors = ['#4f8dff', '#34c759', '#ff9f0a', '#ff375f', '#bf5af2', '#F9C9A6', '#64d2ff'];
  function drawMac(t) {
    const c = M.ctx; c.drawImage(wall, 0, 0);
    // Menu bar.
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(0, 0, MW, 36);
    c.fillStyle = '#fff'; c.font = '700 19px -apple-system, Inter, sans-serif'; c.fillText('Unison', 54, 25);
    c.font = '500 19px -apple-system, Inter, sans-serif'; c.fillText('File   Edit   View   Window', 154, 25);
    c.textAlign = 'right'; c.fillText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), MW - 24, 25); c.textAlign = 'left';
    c.fillStyle = '#4CB873'; roundRect(c, MW - 140, 9, 20, 20, 5); c.fill();
    // Unison window.
    const wx = 90, wy = 80, ww = 720, wh = 520;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.filter = 'blur(24px)'; roundRect(c, wx + 10, wy + 20, ww, wh, 22); c.fill(); c.filter = 'none';
    c.fillStyle = 'rgba(28,30,34,.92)'; roundRect(c, wx, wy, ww, wh, 22); c.fill();
    c.fillStyle = 'rgba(255,255,255,.05)'; roundRect(c, wx, wy, 200, wh, 22); c.fill();
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(wx + 26 + i * 24, wy + 26, 8, 0, 7); c.fill(); });
    c.font = '600 19px -apple-system, Inter, sans-serif';
    ['Phone', 'Files', 'Notifications', 'Clipboard', 'Photos'].forEach((lbl, i) => {
      if (i === 1) { c.fillStyle = 'rgba(76,184,115,.3)'; roundRect(c, wx + 12, wy + 66 + i * 44, 176, 36, 10); c.fill(); }
      c.fillStyle = i === 1 ? '#fff' : 'rgba(255,255,255,.65)'; c.fillText(lbl, wx + 28, wy + 91 + i * 44);
    });
    c.fillStyle = '#fff'; c.font = '700 28px -apple-system, Inter, sans-serif'; c.fillText('Received', wx + 228, wy + 60);
    recent.forEach((it, i) => {
      const y = wy + 90 + i * 100, fresh = i === 0 && arrivals.mac ? Math.max(0, 1 - (t - arrivals.mac.t) / 1.2) : 0;
      c.fillStyle = `rgba(255,255,255,${0.06 + fresh * 0.12})`; roundRect(c, wx + 220, y, ww - 244, 84, 16); c.fill();
      c.fillStyle = it.color; roundRect(c, wx + 236, y + 14, 56, 56, 14); c.fill();
      c.fillStyle = '#fff'; c.font = '600 22px -apple-system, Inter, sans-serif'; c.fillText(it.title, wx + 308, y + 38);
      c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '500 18px -apple-system, Inter, sans-serif'; c.fillText(it.sub, wx + 308, y + 64);
    });
    // Dock.
    const dw = dockColors.length * 70 + 20, dx = (MW - dw) / 2, dy = MH - 92;
    c.fillStyle = 'rgba(255,255,255,.25)'; roundRect(c, dx, dy, dw, 80, 24); c.fill();
    dockColors.forEach((col, i) => { c.fillStyle = col; roundRect(c, dx + 18 + i * 70, dy + 12, 56, 56, 14); c.fill(); });
    // Notification banner sliding in from the right.
    const a = arrivals.mac;
    if (a) {
      const age = t - a.t, inK = Math.min(1, age / 0.35), out = age > 2.6 ? Math.min(1, (age - 2.6) / 0.4) : 0;
      const bx = MW - 420 + (1 - inK) * 440 + out * 440;
      c.fillStyle = 'rgba(245,245,247,.95)'; roundRect(c, bx, 52, 396, 100, 22); c.fill();
      c.fillStyle = a.color; roundRect(c, bx + 18, 70, 64, 64, 16); c.fill();
      c.fillStyle = '#111'; c.font = '700 21px -apple-system, Inter, sans-serif'; c.fillText(a.title, bx + 98, 96);
      c.fillStyle = '#444'; c.font = '500 18px -apple-system, Inter, sans-serif'; c.fillText(a.sub, bx + 98, 124);
      c.fillStyle = '#888'; c.font = '500 14px -apple-system, Inter, sans-serif'; c.fillText('Unison · now', bx + 260, 76);
    }
    notch(c, MW);
    M.tex.needsUpdate = true;
  }
  // Phone: Nothing-style home screen, dot-matrix clock, a glow in the colour of whatever just arrived.
  function drawPhone(t) {
    const c = P.front.ctx, a = arrivals.phone, k = a ? Math.max(0, 1 - (t - a.t) / 3) : 0;
    c.fillStyle = '#000'; c.fillRect(0, 0, 600, 1290);
    c.globalAlpha = 0.55 + k * 0.4; c.filter = 'blur(90px)';
    c.fillStyle = a ? a.color : '#4CB873'; c.beginPath(); c.arc(420, 1000, 300, 0, 7); c.fill();
    c.fillStyle = '#ff2d55'; c.globalAlpha = 0.35; c.beginPath(); c.arc(120, 420, 200, 0, 7); c.fill();
    c.filter = 'none'; c.globalAlpha = 1;
    const now = new Date(), hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
    dotText(c, hh + ':' + mm, 70, 210, 17, '#fff');
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '600 28px ui-monospace, Menlo, monospace';
    c.fillText(now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(), 74, 380);
    // Widgets.
    c.fillStyle = 'rgba(30,30,30,.9)'; roundRect(c, 40, 440, 250, 250, 44); c.fill(); roundRect(c, 310, 440, 250, 250, 44); c.fill();
    c.fillStyle = '#fff'; c.font = '300 92px -apple-system, Inter, sans-serif'; c.fillText('18°', 66, 600);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '500 24px ui-monospace, Menlo, monospace'; c.fillText('LONDON', 70, 650);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 18; c.beginPath(); c.arc(435, 565, 80, 0, 7); c.stroke();
    c.strokeStyle = '#D71921'; c.beginPath(); c.arc(435, 565, 80, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.82); c.stroke();
    c.fillStyle = '#fff'; c.font = '600 40px -apple-system, Inter, sans-serif'; c.textAlign = 'center'; c.fillText('82', 435, 580); c.textAlign = 'left';
    // App row.
    ['#fff', '#D71921', '#fff', '#fff'].forEach((col, i) => { c.fillStyle = 'rgba(40,40,40,.95)'; c.beginPath(); c.arc(105 + i * 130, 1160, 52, 0, 7); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(105 + i * 130, 1160, 14, 0, 7); c.fill(); });
    if (a) {
      const age = t - a.t, inK = Math.min(1, age / 0.35), y = 40 + (1 - inK) * -160 - (age > 2.6 ? Math.min(1, (age - 2.6) / 0.4) * 200 : 0);
      c.fillStyle = 'rgba(245,245,245,.97)'; roundRect(c, 24, y, 552, 150, 40); c.fill();
      c.fillStyle = a.color; roundRect(c, 48, y + 30, 90, 90, 24); c.fill();
      c.fillStyle = '#111'; c.font = '700 34px -apple-system, Inter, sans-serif'; c.fillText(a.title, 160, y + 70);
      c.fillStyle = '#555'; c.font = '500 26px -apple-system, Inter, sans-serif'; c.fillText(a.sub, 160, y + 110);
    }
    // Punch-hole camera, centred.
    c.fillStyle = '#000'; c.beginPath(); c.arc(300, 44, 20, 0, 7); c.fill();
    P.front.tex.needsUpdate = true;
  }

  let drag = null, yaw = 0, yawTarget = 0;
  stage.addEventListener('pointerdown', e => { drag = e.clientX; stage.setPointerCapture(e.pointerId); });
  const release = () => { drag = null; };
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
  let spin = 0;
  stage.addEventListener('pointermove', e => { if (drag !== null) { const dx = (e.clientX - drag) * 0.006; yawTarget += dx; spin = dx; drag = e.clientX; } });

  const tmp = new THREE.Vector3(), tan = new THREE.Vector3(), lift = new THREE.Vector3(), SPEED = 0.075;
  let lastBack = -1, lastSecond = -1;
  // A screen redraws while an arrival is animating on it, and once a second for its clock.
  const busy = (a, t) => a && t - a.t < 3.1;
  const stop = run(s, t => {
    const p = progress(el);
    s.smooth.lerp(s.pointer, 0.05);
    if (drag === null) { yawTarget += spin; spin *= 0.95; }
    yaw += (yawTarget - yaw) * 0.08;
    const inK = THREE.MathUtils.smoothstep(p, 0.15, 0.5);
    s.camera.position.set(0, -1 + inK, baseZ + 2.5 - inK * 2.5);
    s.camera.lookAt(0, 0, 0);
    rig.rotation.y = yaw + s.smooth.x * 0.15; rig.rotation.x = -s.smooth.y * 0.05;
    // The phone turns now and then to show its back lighting up.
    P.phone.rotation.y = 0.42 + THREE.MathUtils.smoothstep(Math.sin(t * 0.7 - 1), 0.2, 0.7) * (Math.PI - 0.84);
    P.phone.position.y = -0.2 + Math.sin(t * 0.9) * 0.08; M.mb.position.y = -1.6 + Math.sin(t * 0.9 + 1.4) * 0.06;
    lanes.forEach(l => { l.mat.uniforms.uTime.value = t; l.mat.uniforms.uBoost.value *= 0.94; });
    sparks.material.uniforms.uTime.value = t;
    for (let i = 0; i < N; i++) {
      const curve = lane[i] ? down : up, u = (seed[i] + t * (0.05 + seed[i] * 0.06)) % 1; curve.getPointAt(u, tmp);
      const r = 0.12 + Math.sin(seed[i] * 91) * 0.18, a = seed[i] * 50 + t * (1 + seed[i]);
      pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y + Math.cos(a) * r; pos[i * 3 + 2] = tmp.z + Math.sin(a) * r;
    }
    pg.attributes.position.needsUpdate = true;
    for (const g of cards) {
      const d = g.userData, curve = d.lane ? down : up, u = (d.offset + t * SPEED) % 1;
      if (u < d.last) arrive(d, t);
      d.last = u;
      curve.getPointAt(u, tmp); curve.getTangentAt(u, tan);
      g.position.copy(tmp).add(lift.set(0, d.lane ? -0.42 : 0.42, 0));
      g.lookAt(s.camera.position);
      g.rotateZ(Math.atan2(tan.y, Math.abs(tan.x) + 0.001) * (d.lane ? -0.6 : 0.6));
      g.rotateY(Math.sin(t * 1.5 + d.offset * 9) * 0.12);
      const a = THREE.MathUtils.smoothstep(u, 0.0, 0.12), b = 1 - THREE.MathUtils.smoothstep(u, 0.86, 1.0), o = Math.min(a, b);
      d.mats.forEach(m => m.opacity = o);
      g.scale.setScalar(0.55 + 0.45 * a * (0.4 + 0.6 * b));
      d.glow.material.opacity = o * 0.35;
    }
    backGlow *= 0.97;
    if (Math.floor(t * 12) !== lastBack) { lastBack = Math.floor(t * 12); drawPhoneBack(P.back, backGlow > 0.05 ? backGlow : 0, backColor); }
    const second = Math.floor(t);
    if (busy(arrivals.mac, t) || second !== lastSecond) drawMac(t);
    if (busy(arrivals.phone, t) || second !== lastSecond) drawPhone(t);
    lastSecond = second;
    if (s.composer) s.composer.render(); else s.renderer.render(s.scene, s.camera);
  });
  return { stop };
}
