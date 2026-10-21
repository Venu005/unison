// Hero, "The Peek" (Plan 12): the robot peeks over a MacBook-style laptop whose screen cycles the features.
import { THREE, RoundedBoxGeometry, setup, run, progress, clay, makeRobot, makeMacBook, notch, GREEN } from '../three/shared.js';

const SLIDES = [
  ['Drop a file.', 'It lands on your phone.', '#4CB873'],
  ['Copy here.', 'Paste on your phone.', '#F9C9A6'],
  ['Your notifications,', 'on your Mac.', '#6fb6ff'],
  ["Your phone's screen,", 'in a window.', '#c7a6ff'],
];
const SLIDE_SECONDS = 3.2;

export function mount(section, quality) {
  const s = setup(section, { exposure: 1.05, quality });
  const world = new THREE.Group(); s.scene.add(world);
  s.onResize = w => {
    const wide = w >= 900;
    s.camera.position.set(0, 1.1, wide ? 8.4 : 9.8);
    world.position.set(wide ? 2.3 : 0, wide ? -0.55 : -1.6, 0);
  };
  s.resize();

  const key = new THREE.DirectionalLight(0xfff1e6, 2.4); key.position.set(-4, 6, 6);
  key.castShadow = quality === 'full'; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6;
  s.scene.add(key, new THREE.HemisphereLight(0xffe7d6, 0x7a3e22, 0.8));

  const mac = makeMacBook(3.8, 2.5, -0.14);
  mac.mb.position.set(0, -1.25, -0.4); world.add(mac.mb);
  // The robot lives on the lid, behind the screen, hands hooked over the top edge (like the icon).
  const { robot, eyes, hands, bulb } = makeRobot();
  hands.forEach(hd => robot.remove(hd));
  robot.scale.setScalar(1.05); mac.lid.add(robot);
  const handGeo = new RoundedBoxGeometry(0.3, 0.46, 0.16, 4, 0.07);
  const grips = [-0.72, 0.72].map(x => {
    const hd = new THREE.Mesh(handGeo, clay(GREEN, 0.4)); hd.castShadow = true; hd.position.set(x, mac.h - 0.06, 0.1); mac.lid.add(hd); return hd;
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.31; floor.receiveShadow = true; world.add(floor);

  // Each slide's coloured glow is blurred once; the frame loop only fades it in.
  const c = mac.ctx, W = mac.cv.width, H = mac.cv.height;
  const glows = SLIDES.map(([, , col]) => {
    const g = document.createElement('canvas'); g.width = W; g.height = H;
    const x = g.getContext('2d'); x.fillStyle = col; x.filter = 'blur(70px)'; x.beginPath(); x.arc(W * 0.8, H * 0.3, 300, 0, 7); x.fill();
    return g;
  });
  let slide = 0, slideStart = 0;
  function drawScreen(t) {
    const [a, b, col] = SLIDES[slide], k = Math.min(1, (t - slideStart) / 0.6);
    const grd = c.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#16201b'); grd.addColorStop(1, '#0a0c0b');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.globalAlpha = k;
    c.drawImage(glows[slide], W * 0.8 * (1 - k), H * 0.3 * (1 - k), W * k, H * k);
    c.fillStyle = '#fff'; c.font = '800 92px -apple-system, Inter, sans-serif'; c.fillText(a, 90, H * 0.5 + (1 - k) * 30);
    c.fillStyle = 'rgba(255,255,255,.65)'; c.fillText(b, 90, H * 0.5 + 115 + (1 - k) * 30);
    c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(90, H - 90, W - 180, 7);
    c.fillStyle = col; c.fillRect(90, H - 90, (W - 180) * Math.min(1, (t - slideStart) / SLIDE_SECONDS), 7);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, 0, W, 34); notch(c, W);
    mac.tex.needsUpdate = true;
    if (t - slideStart > SLIDE_SECONDS) { slide = (slide + 1) % SLIDES.length; slideStart = t; }
  }

  const stop = run(s, t => {
    const p = progress(section);
    s.smooth.lerp(s.pointer, 0.06);
    world.rotation.y = s.smooth.x * 0.3 - 0.28 + (p - 0.5) * 0.8;
    world.rotation.x = -s.smooth.y * 0.06;
    // Scrolling away: the camera swings round and the robot ducks behind the lid.
    const duck = THREE.MathUtils.smoothstep(p, 0.5, 0.85);
    const peek = Math.sin(t * 1.3) * 0.1 + Math.max(0, Math.sin(t * 0.45)) ** 8 * 0.35;
    // Head centre just above the top edge, behind the lid: the dome, eyes and antenna show.
    robot.position.set(0, mac.h + 0.02 + peek - duck * 1.9, -1.12);
    robot.rotation.set(-s.smooth.y * 0.1 + 0.08, s.smooth.x * 0.25, -s.smooth.x * 0.08);
    grips.forEach((hd, i) => {
      hd.position.y = mac.h - 0.06 + peek * 0.5 - duck * 0.3 + Math.sin(t * 5 + i * 2) * 0.006;
      hd.position.z = 0.1 - duck * 0.5;
    });
    eyes.forEach((e, i) => {
      e.position.x = (i ? 0.34 : -0.34) + s.smooth.x * 0.07; e.position.y = 0.42 + s.smooth.y * 0.05;
      e.scale.y = THREE.MathUtils.lerp(e.scale.y, (t % 4.2) < 0.12 ? 0.15 : 1, 0.5);
    });
    bulb.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.35;
    drawScreen(t);
    s.renderer.render(s.scene, s.camera);
  });
  return { stop };
}
