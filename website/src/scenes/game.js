// The game, "Throw something at it." (Plan 12): the full robot sits on a letter of the wordmark and catches
// the things Unison moves around. Only throws count (src/game/rules.js).
import { THREE, RoundedBoxGeometry, setup, run, progress, clay, screenTexture, roundRect, makeRobot, GREEN } from '../three/shared.js';
import { catchDecision, THROW_FRAMES } from '../game/rules.js';

export function mount(section, quality) {
  const el = section, interactive = quality === 'full';
  const s = setup(el, { exposure: 1.1, quality });
  s.camera.position.set(0, 0, 16);
  s.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a8, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(5, 8, 8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -16, right: 16, top: 10, bottom: -10 });
  s.scene.add(key);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.ShadowMaterial({ opacity: 0.12 }));
  back.position.z = -2.5; back.receiveShadow = true; s.scene.add(back);

  const tex = (w, h, draw) => { const t = screenTexture(w, h); draw(t.ctx, w, h); t.tex.needsUpdate = true; return t.tex; };
  const faced = (geo, color, w, h, draw, z) => {   // a clay slab with a drawn front face
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, clay(color, 0.45)));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex(512, Math.round(512 * h / w), draw), roughness: 0.5 }));
    face.position.z = z; g.add(face); return g;
  };

  // Things you can send, each recognisable.
  const photo = faced(new RoundedBoxGeometry(2.2, 1.8, 0.14, 6, 0.08), 0xffffff, 1.95, 1.4, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7cc6ff'); g.addColorStop(0.6, '#ffd1a1'); g.addColorStop(1, '#ff9f6e');
    c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(w * 0.72, h * 0.35, 50, 0, 7); c.fill();
    c.fillStyle = '#4CB873'; c.beginPath(); c.moveTo(0, h); c.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h); c.fill();
    c.fillStyle = '#2f9a57'; c.beginPath(); c.moveTo(w * 0.35, h); c.quadraticCurveTo(w * 0.75, h * 0.5, w, h * 0.8); c.lineTo(w, h); c.fill();
  }, 0.075); photo.children[1].position.y = 0.12;
  const pdf = faced(new RoundedBoxGeometry(1.7, 2.2, 0.14, 6, 0.08), 0xffffff, 1.5, 2.0, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e6e6e6'; c.beginPath(); c.moveTo(w - 120, 0); c.lineTo(w, 120); c.lineTo(w - 120, 120); c.fill();
    c.fillStyle = '#e03a2f'; roundRect(c, 40, 60, 170, 80, 16); c.fill(); c.fillStyle = '#fff'; c.font = '800 54px -apple-system, sans-serif'; c.fillText('PDF', 64, 118);
    c.fillStyle = '#d5d5d5'; for (let i = 0; i < 6; i++) { roundRect(c, 40, 200 + i * 58, w - 80 - (i % 3) * 60, 22, 11); c.fill(); }
  }, 0.075);
  const board = faced(new RoundedBoxGeometry(1.8, 2.3, 0.14, 6, 0.1), 0xd9a066, 1.5, 1.85, (c, w, h) => {
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f2933'; c.font = '700 40px -apple-system, sans-serif'; c.fillText('Copied', 36, 90);
    c.fillStyle = '#2f6fdb'; c.font = '600 34px ui-monospace, Menlo, monospace'; c.fillText('https://', 36, 160); c.fillText('github.com/', 36, 205); c.fillText('macdroid', 36, 250);
    c.fillStyle = '#ddd'; for (let i = 0; i < 3; i++) { roundRect(c, 36, 310 + i * 50, w - 120, 18, 9); c.fill(); }
  }, 0.075); board.children[1].position.y = -0.12;
  const clipTop = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.3, 0.24, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: 0xc0c4ca, metalness: 0.9, roughness: 0.25 }));
  clipTop.position.y = 1.15; board.add(clipTop);
  const bubble = faced(new RoundedBoxGeometry(2.8, 1.3, 0.5, 8, 0.4), 0xffffff, 2.3, 0.9, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#4CB873'; c.beginPath(); c.arc(70, h / 2, 46, 0, 7); c.fill();
    c.fillStyle = '#111'; c.font = '700 44px -apple-system, sans-serif'; c.fillText('Mum', 140, h / 2 - 8);
    c.fillStyle = '#666'; c.font = '500 36px -apple-system, sans-serif'; c.fillText('dinner at 8? 🍝', 140, h / 2 + 40);
  }, 0.255);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), clay(0xff5a4e, 0.3)); dot.position.set(1.3, 0.6, 0.2); bubble.add(dot);
  const note = new THREE.Group();
  { const m = clay(0xa77bff, 0.35);
    for (const x of [-0.55, 0.55]) { const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16), m); head.scale.set(1.25, 0.9, 0.8); head.position.set(x, -0.7, 0); note.add(head);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 12), m); stem.position.set(x + 0.42, 0.1, 0); note.add(stem); }
    const beam = new RoundedBoxGeometry(1.25, 0.32, 0.2, 3, 0.08); const bm = new THREE.Mesh(beam, m); bm.position.set(0.42, 0.9, 0); note.add(bm); }
  const handset = new THREE.Group();
  { const m = clay(0xff6b6b, 0.35);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.24, 24, 48, Math.PI * 0.95), m); arc.rotation.z = Math.PI * 0.025; handset.add(arc);
    for (const x of [-1, 1]) { const cup = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.42, 0.55, 4, 0.18), m); cup.position.set(x * 0.98, -0.05, 0); handset.add(cup); } }
  const qr = new THREE.Group();
  { const qt = tex(256, 256, (c, w) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, w); const n = 21, u = w / (n + 2); c.fillStyle = '#111';
      const finder = (x, y) => { c.fillRect((x + 1) * u, (y + 1) * u, 7 * u, 7 * u); c.fillStyle = '#fff'; c.fillRect((x + 2) * u, (y + 2) * u, 5 * u, 5 * u); c.fillStyle = '#111'; c.fillRect((x + 3) * u, (y + 3) * u, 3 * u, 3 * u); };
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12); if (!inF && Math.random() < 0.48) c.fillRect((x + 1) * u, (y + 1) * u, u, u); }
      finder(0, 0); finder(14, 0); finder(0, 14); });
    qt.magFilter = THREE.NearestFilter;
    qr.add(new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.7, 1.7, 5, 0.18), [0, 1, 2, 3, 4, 5].map(() => new THREE.MeshStandardMaterial({ map: qt, roughness: 0.5 })))); }

  const things = [
    [photo, 1.25, 'IMG_2041.heic sent to your phone'], [pdf, 1.25, 'Report.pdf sent to your phone'],
    [board, 1.3, 'Link copied to your phone'], [bubble, 1.35, 'Reply sent: "yes!"'],
    [note, 1.05, 'Paused the music on your phone'], [handset, 1.15, 'Answered the call on your Mac'],
    [qr, 1.1, 'Paired with your phone 🎉'],
  ];
  const bodies = things.map(([obj, r, msg]) => {
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.body = true; } });
    s.scene.add(obj);
    return { obj, r, msg, v: new THREE.Vector3(), spin: new THREE.Vector3(), held: false, eaten: 0, thrown: 0 };
  });
  bodies.forEach(b => b.obj.traverse(o => { if (o.isMesh) o.userData.owner = b; }));

  // The whole robot sits on the D, legs dangling, and catches what you throw.
  const bot = new THREE.Group(); s.scene.add(bot);
  const { robot, eyes, hands, bulb } = makeRobot();
  hands.forEach(h => robot.remove(h));
  robot.position.y = 1.82; bot.add(robot);               // head, just above the body (the icon's little gap)
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.7, 1.5, 6, 0.42), clay(GREEN, 0.4));
  body.position.y = 0.85; bot.add(body);
  const limb = (r, len) => { const pivot = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), clay(GREEN, 0.4));
    m.position.y = -(len / 2 + r * 0.6); pivot.add(m); bot.add(pivot); return pivot; };
  const arms = [-1, 1].map(side => { const a = limb(0.24, 0.85); a.position.set(side * 1.25, 1.42, 0); a.userData.side = side; return a; });
  const legs = [-1, 1].map(side => { const l = limb(0.27, 0.55); l.position.set(side * 0.5, 0.12, 0.45); return l; });
  bot.traverse(o => { if (o.isMesh) o.castShadow = true; });
  let botScale = 1, excite = 0;
  const headPos = () => new THREE.Vector3(0, 1.82 + 0.45, 0).multiplyScalar(botScale).add(bot.position);
  let floorY = -3, halfH = 5, halfW = 9;
  s.onResize = (w, h) => {
    halfH = Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2)) * s.camera.position.z; halfW = halfH * (w / h);
    const word = el.querySelector('.word'), r = word.getBoundingClientRect(), sr = el.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(word).fontSize), topPx = r.top - sr.top + fs * 0.08;
    floorY = halfH - (topPx / h) * 2 * halfH;
    // Sit on the D: its centre and top, in world units.
    const d = el.querySelector('#seat').getBoundingClientRect(), u = 2 * halfH / h;
    botScale = THREE.MathUtils.clamp((d.width * u) / 2.6, 0.6, 1.6);
    bot.scale.setScalar(botScale);
    bot.position.set(((d.left + d.width * 0.42 - sr.left) - w / 2) * u, floorY, 0.6);
  };
  s.resize();

  const toast = el.querySelector('#toast'), count = el.querySelector('#sent');
  let sent = 0, gulp = 0, happy = 0;
  function eat(b) {
    b.eaten = 1; b.held = false; sent++; count.textContent = sent;
    toast.textContent = '✓ ' + b.msg; toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
    gulp = 1; happy = 1;
  }
  function respawn(b) {
    b.eaten = 0; b.obj.scale.setScalar(1);
    b.obj.position.set((Math.random() - 0.5) * halfW * 1.4, halfH + 2, 0); b.v.set((Math.random() - 0.5) * 0.06, 0, 0);
  }
  let dropped = false;
  const drop = () => { if (dropped) return; dropped = true;
    bodies.forEach((b, i) => { b.obj.position.set(-halfW + 1.5 + i * (halfW * 2 - 3) / (bodies.length - 1), halfH + 2 + i * 1.3, 0); b.v.set((Math.random() - .5) * .05, 0, 0);
      b.spin.set(Math.random() * .02, Math.random() * .02, Math.random() * .02); }); };
  bodies.forEach(b => b.obj.position.set(0, 40, 0));

  // Grab and throw.
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), prevHit = new THREE.Vector3();
  let held = null; const grabOffset = new THREE.Vector3();
  const pointerWorld = () => { ray.setFromCamera(s.pointer, s.camera); ray.ray.intersectPlane(plane, hit); return hit; };
  el.addEventListener('pointerdown', e => {
    // Touch screens get the lite scene: things still fall and the robot still moves, but nothing is grabbed,
    // so a swipe always scrolls the page. On a computer, only a press that lands on an object starts a grab.
    if (!interactive || e.target.closest('a')) return;
    ray.setFromCamera(s.pointer, s.camera);
    const meshes = []; bodies.forEach(b => !b.eaten && b.obj.traverse(o => o.isMesh && meshes.push(o)));
    const first = ray.intersectObjects(meshes, false)[0];
    if (!first) return;
    held = first.object.userData.owner; held.held = true;
    grabOffset.copy(held.obj.position).sub(pointerWorld()); grabOffset.z = 0;
    el.setPointerCapture(e.pointerId); el.classList.add('grabbing');
  });
  const letGo = () => { if (held) { held.held = false; held.thrown = THROW_FRAMES; held = null; } el.classList.remove('grabbing'); };
  el.addEventListener('pointerup', letGo); el.addEventListener('pointercancel', letGo);

  const stop = run(s, t => {
    if (progress(el) > 0.25) drop();
    pointerWorld(); const push = hit.clone().sub(prevHit); prevHit.copy(hit);
    // Robot: eyes on the cursor (or on what you're holding), a gulp when it eats, happy squint after.
    const look = held ? held.obj.position : hit, hp = headPos();
    const lx = THREE.MathUtils.clamp((look.x - hp.x) / 8, -1, 1), ly = THREE.MathUtils.clamp((look.y - hp.y) / 6, -1, 1);
    eyes.forEach((e, i) => { e.position.x = (i ? 0.34 : -0.34) + lx * 0.09; e.position.y = 0.42 + ly * 0.07;
      const blink = (t % 3.7) < 0.12 ? 0.15 : 1; e.scale.y = THREE.MathUtils.lerp(e.scale.y, happy > 0.35 ? 0.4 : blink, 0.35); });
    robot.rotation.set(-ly * 0.15, lx * 0.35, -lx * 0.1);
    gulp *= 0.9; happy *= 0.955;
    robot.scale.set(1 + gulp * 0.12, 1 - gulp * 0.1, 1);
    robot.position.y = 1.82 + gulp * 0.35 + Math.sin(t * 2) * 0.02;
    body.scale.set(1 + gulp * 0.05, 1 - gulp * 0.06 + Math.sin(t * 2) * 0.01, 1);
    // Legs kick over the edge; arms reach up for what you're holding, wave now and then, cheer when it eats.
    // Idle: legs crossed, left over right, the top foot bobbing. Holding something or a catch: uncross and kick.
    excite = THREE.MathUtils.lerp(excite, held || happy > 0.2 ? 1 : 0, 0.08);
    const bob = Math.sin(t * 2.2) * 0.14;
    const crossed = [{ x: -1.05 + bob, z: 0.62, py: 0.32, pz: 0.75 }, { x: -0.3, z: -0.12, py: 0.12, pz: 0.45 }];
    legs.forEach((l, i) => {
      const kick = -0.35 + Math.sin(t * 9 + i * Math.PI) * 0.5, c = crossed[i];
      l.rotation.x = THREE.MathUtils.lerp(c.x, kick, excite);
      l.rotation.z = THREE.MathUtils.lerp(c.z, 0, excite);
      l.position.y = THREE.MathUtils.lerp(c.py, 0.12, excite);
      l.position.z = THREE.MathUtils.lerp(c.pz, 0.45, excite);
    });
    const wave = Math.max(0, Math.sin(t * 0.6)) ** 12;
    arms.forEach(a => { const side = a.userData.side;
      let target = side * 0.12;                                       // resting
      if (held) target = side * (2.4 + Math.sin(t * 8) * 0.1);          // reach up
      else if (happy > 0.3) target = side * (2.7 + Math.sin(t * 14) * 0.25); // cheer
      else if (side > 0 && wave > 0.05) target = 2.5 + Math.sin(t * 12) * 0.35 * wave; // wave
      a.rotation.z = THREE.MathUtils.lerp(a.rotation.z, target, 0.15); });
    bulb.material.emissiveIntensity = 0.5 + gulp * 3 + Math.sin(t * 3) * 0.3;
    if (!dropped) { s.renderer.render(s.scene, s.camera); return; }

    for (const b of bodies) {
      if (b.eaten) {   // shrink into the robot, then fall back in from the top
        b.eaten += 1; const k = Math.min(1, b.eaten / 20);
        b.obj.position.lerp(headPos(), 0.25); b.obj.scale.setScalar(1 - k);
        b.obj.rotation.y += 0.3; if (b.eaten > 70) respawn(b); continue;
      }
      if (b.held) {
        const target = hit.clone().add(grabOffset);
        b.v.copy(target).sub(b.obj.position).multiplyScalar(0.35); b.obj.position.add(b.v);
        b.spin.z = -b.v.x * 0.05;
      } else {
        const d = b.obj.position.clone().sub(hit); d.z = 0;
        if (!held && d.length() < b.r + 1) { b.v.add(d.normalize().multiplyScalar(0.012)).add(push.clone().multiplyScalar(0.05)); }
        b.v.y -= 0.006; b.v.multiplyScalar(0.99); b.obj.position.add(b.v);
      }
      // Caught: touching the robot's head.
      if (b.thrown > 0) b.thrown--;
      const toRobot = b.obj.position.clone().sub(headPos()); toRobot.z = 0;
      const reach = b.r + 1.15 * botScale;
      const decision = catchDecision({ held: b.held, thrownFrames: b.thrown, distance: toRobot.length(), reach,
        aboveBody: b.obj.position.y > bot.position.y + 1.4 * botScale });
      if (decision === 'eat') { eat(b); continue; }
      if (decision === 'bounce') {
        const n = toRobot.normalize(); b.obj.position.copy(headPos()).addScaledVector(n, reach); b.obj.position.z = 0;
        b.v.addScaledVector(n, Math.max(0, -b.v.dot(n)) * 1.4 + 0.03);
      }
      for (const o of bodies) if (o !== b && !o.eaten) {
        const dd = b.obj.position.clone().sub(o.obj.position); dd.z = 0; const l = dd.length(), min = b.r + o.r;
        if (l < min && l > 0) { const n = dd.normalize(); b.obj.position.addScaledVector(n, (min - l) * 0.5); b.v.addScaledVector(n, 0.01); }
      }
      const fy = floorY + b.r * 0.8, wx = halfW - b.r * 0.8;
      if (b.obj.position.y < fy) { b.obj.position.y = fy; b.v.y *= -0.4; b.v.x *= 0.95; }
      if (b.obj.position.y > halfH + 6) { b.obj.position.y = halfH + 6; b.v.y = 0; }
      if (Math.abs(b.obj.position.x) > wx) { b.obj.position.x = Math.sign(b.obj.position.x) * wx; b.v.x *= -0.6; }
      b.spin.multiplyScalar(0.97);
      b.obj.rotation.x += b.spin.x + b.v.y * 0.04; b.obj.rotation.y += b.spin.y + b.v.x * 0.06; b.obj.rotation.z += b.spin.z - b.v.x * 0.04;
      // Settle face-forward when resting, so you can read them.
      if (!b.held && Math.abs(b.v.y) < 0.01 && b.obj.position.y <= fy + 0.01) { b.obj.rotation.x *= 0.9; b.obj.rotation.y *= 0.9; }
    }
    s.renderer.render(s.scene, s.camera);
  });
  return { stop };
}
