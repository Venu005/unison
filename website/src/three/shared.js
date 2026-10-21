// Helpers shared by the three scenes (Plan 12), ported from the approved mockup (website/reference/mockup-v7.html).
// The devices are our own procedural models: "MacBook-style" and "Nothing Phone (3)-style", with no brand marks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export { THREE, RoundedBoxGeometry };

export const GREEN = 0x4CB873, PEACH = 0xF9C9A6, INK = 0x1F2933;

export function setup(section, { alpha = true, exposure = 1, quality = 'full' } = {}) {
  const canvas = section.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'full', alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(quality === 'full' ? Math.min(devicePixelRatio, 2) : 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = quality === 'full';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const pointer = new THREE.Vector2(0, 0), smooth = new THREE.Vector2(0, 0);
  const onMove = e => {
    const r = section.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const onLeave = () => pointer.set(0, 0);
  section.addEventListener('pointermove', onMove);
  section.addEventListener('pointerleave', onLeave);
  const s = { renderer, scene, camera, pointer, smooth, section, quality, visible: true, onResize: null, composer: null };
  const resize = () => {
    const w = section.clientWidth, h = section.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    s.composer?.setSize(w, h); s.onResize?.(w, h);
  };
  const ro = new ResizeObserver(resize); ro.observe(section);
  const io = new IntersectionObserver(([e]) => s.visible = e.isIntersecting); io.observe(section);
  s.resize = resize;
  s.dispose = () => {
    ro.disconnect(); io.disconnect();
    section.removeEventListener('pointermove', onMove); section.removeEventListener('pointerleave', onLeave);
    s.composer?.dispose?.(); renderer.dispose();
  };
  resize();
  return s;
}

/** Runs `tick(t)` every frame while the section is on screen and the tab is visible. Returns stop(). */
export function run(s, tick) {
  const clock = new THREE.Clock();
  let id = 0, stopped = false;
  const frame = () => {
    if (stopped) return;
    id = requestAnimationFrame(frame);
    if (!s.visible || document.hidden) return;
    tick(clock.getElapsedTime());
  };
  frame();
  return () => { stopped = true; cancelAnimationFrame(id); s.dispose(); };
}
// How far the section has scrolled through the viewport: 0 entering, 1 leaving.
export const progress = el => { const r = el.getBoundingClientRect(); return THREE.MathUtils.clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1); };
export const clay = (color, rough = 0.55) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4 });

export function makeRobot() {
  const robot = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), clay(GREEN, 0.4));
  head.castShadow = true; robot.add(head);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 64), clay(GREEN, 0.4)); cap.rotation.x = Math.PI / 2; robot.add(cap);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 16), clay(GREEN, 0.4)); stalk.position.y = 1.12; robot.add(stalk);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 16), new THREE.MeshPhysicalMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 0.6, roughness: 0.3 }));
  bulb.position.y = 1.32; robot.add(bulb);
  const eyes = [];
  for (const x of [-0.34, 0.34]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 16), new THREE.MeshPhysicalMaterial({ color: INK, roughness: 0.15, clearcoat: 1 }));
    eye.position.set(x, 0.42, 0.86); robot.add(eye); eyes.push(eye);
  }
  const hands = [];
  for (const x of [-0.7, 0.7]) {
    const hand = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.42, 0.22, 4, 0.1), clay(GREEN, 0.4));
    hand.position.set(x, -0.05, 0.98); hand.castShadow = true; robot.add(hand); hands.push(hand);
  }
  return { robot, eyes, hands, bulb };
}

export function screenTexture(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return { cv, ctx: cv.getContext('2d'), tex };
}
export function roundRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
export const ALU = () => new THREE.MeshPhysicalMaterial({ color: 0xd4d6db, metalness: 0.92, roughness: 0.3 });

/* A MacBook: origin at the hinge. Base runs forward (+z), the lid pivots at the hinge. Notch on the screen. */
export function makeMacBook(w = 3.8, h = 2.45, open = -0.16) {
  const mb = new THREE.Group();
  const d = w * 0.69;
  const base = new THREE.Mesh(new RoundedBoxGeometry(w, 0.11, d, 6, 0.05), ALU());
  base.position.set(0, 0, d / 2); base.castShadow = true; base.receiveShadow = true; mb.add(base);
  // Keyboard well and trackpad.
  const kb = screenTexture(1024, 420), k = kb.ctx;
  k.fillStyle = '#9fa3aa'; k.fillRect(0, 0, 1024, 420);
  k.fillStyle = '#16181b'; roundRect(k, 0, 0, 1024, 420, 18); k.fill();
  for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) {
    const kw = r === 5 && c > 4 && c < 9 ? 0 : 64; if (!kw) continue;
    k.fillStyle = '#2a2d31'; roundRect(k, 14 + c * 71.5, 14 + r * 67, 62, r === 0 ? 34 : 58, 8); k.fill();
  }
  k.fillStyle = '#2a2d31'; roundRect(k, 14 + 5 * 71.5, 14 + 5 * 67, 62 * 4 + 9.5 * 3, 58, 8); k.fill();
  kb.tex.needsUpdate = true;
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, d * 0.4), new THREE.MeshStandardMaterial({ map: kb.tex, roughness: 0.6 }));
  keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.056, d * 0.27); mb.add(keys);
  const pad = new THREE.Mesh(new RoundedBoxGeometry(w * 0.4, 0.004, d * 0.3, 2, 0.002), new THREE.MeshPhysicalMaterial({ color: 0xc9ccd1, metalness: 0.6, roughness: 0.18 }));
  pad.position.set(0, 0.056, d * 0.7); mb.add(pad);
  // Lid.
  const lid = new THREE.Group(); lid.position.set(0, 0.055, 0.02); lid.rotation.x = open; mb.add(lid);
  const shell = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.07, 6, 0.03), ALU());
  shell.position.y = h / 2; shell.castShadow = true; lid.add(shell);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(w - 0.05, h - 0.05, 0.01, 4, 0.06), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.15 }));
  bezel.position.set(0, h / 2, 0.036); lid.add(bezel);
  const sc = screenTexture(1280, Math.round(1280 * (h - 0.2) / (w - 0.14)));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, h - 0.2), new THREE.MeshBasicMaterial({ map: sc.tex, toneMapped: false }));
  screen.position.set(0, h / 2 + 0.03, 0.042); lid.add(screen);
  return { mb, lid, h, ...sc };
}
/* The notch, drawn last onto a Mac screen canvas. */
export function notch(c, W) { c.fillStyle = '#000'; roundRect(c, W / 2 - 92, -20, 184, 50, 16); c.fill(); }

/* Nothing Phone (3)-style: flat aluminium frame, thin even bezels, centred punch-hole; transparent-look back
   with a circular dot-matrix (Glyph-style) light that flashes on arrivals. */
export const DOTS = { '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '11110000010000101110000010000111110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100' };
export function dotText(c, text, x, y, dot, color) {
  c.fillStyle = color;
  for (const ch of text) {
    if (ch === ':') { for (const ry of [2, 4]) { c.beginPath(); c.arc(x + dot / 2, y + ry * dot + dot / 2, dot * 0.38, 0, 7); c.fill(); } x += dot * 2; continue; }
    const p = DOTS[ch]; if (!p) { x += dot * 3; continue; }
    for (let i = 0; i < 35; i++) if (p[i] === '1') { c.beginPath(); c.arc(x + (i % 5) * dot + dot / 2, y + Math.floor(i / 5) * dot + dot / 2, dot * 0.38, 0, 7); c.fill(); }
    x += dot * 6;
  }
}
export function makePhone() {
  const W = 1.3, H = 2.76, D = 0.12;
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 10, 0.2), new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, metalness: 0.85, roughness: 0.28 }));
  g.add(frame);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(W - 0.03, H - 0.03, 0.01, 6, 0.18), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, clearcoat: 1 }));
  glass.position.z = D / 2; g.add(glass);
  const front = screenTexture(600, 1290);
  const screen = new THREE.Mesh(new RoundedBoxGeometry(W - 0.1, H - 0.1, 0.002, 6, 0.15), new THREE.MeshBasicMaterial({ map: front.tex, toneMapped: false }));
  screen.position.z = D / 2 + 0.007; g.add(screen);
  const back = screenTexture(600, 1290);
  const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.04), new THREE.MeshPhysicalMaterial({ map: back.tex, roughness: 0.15, clearcoat: 1, emissive: 0xffffff, emissiveMap: back.tex, emissiveIntensity: 0.25 }));
  backMesh.position.z = -D / 2 - 0.002; backMesh.rotation.y = Math.PI; g.add(backMesh);
  // Camera bumps on the back.
  for (const [x, y, r] of [[-0.36, 1.0, 0.12], [-0.12, 1.12, 0.1], [-0.3, 0.74, 0.1]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 32), new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(-x, y, -D / 2 - 0.02); g.add(ring);
  }
  return { phone: g, front, back, W, H };
}
export function drawPhoneBack(b, glow, color) {
  const c = b.ctx; c.clearRect(0, 0, 600, 1290);
  const bg = c.createLinearGradient(0, 0, 600, 1290); bg.addColorStop(0, '#3a3d42'); bg.addColorStop(1, '#1c1e21');
  c.fillStyle = bg; c.fillRect(0, 0, 600, 1290);
  // The "see-through" panels and screws.
  c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 3;
  roundRect(c, 60, 520, 480, 300, 30); c.stroke(); roundRect(c, 90, 860, 200, 330, 24); c.stroke(); roundRect(c, 320, 860, 190, 150, 24); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.18)'; for (const [x, y] of [[80, 540], [520, 540], [80, 800], [520, 800], [300, 1150]]) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }
  // Circular dot-matrix, top right.
  const cx = 430, cy = 250, R = 120, step = 17;
  for (let y = -R; y <= R; y += step) for (let x = -R; x <= R; x += step) {
    if (x * x + y * y > R * R) continue;
    const lit = glow > 0 && Math.random() < 0.25 + glow * 0.6;
    c.fillStyle = lit ? color : 'rgba(255,255,255,.08)'; c.globalAlpha = lit ? Math.min(1, 0.4 + glow) : 1;
    c.beginPath(); c.arc(cx + x, cy + y, 5.2, 0, 7); c.fill();
  }
  c.globalAlpha = 1; b.tex.needsUpdate = true;
}
