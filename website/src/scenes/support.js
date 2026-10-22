// Support, "Buy the robot a chai." (Plan 13): an empty bean bag; the whole robot walks in with a glass of cutting chai,
// flops into the bag, raises the chai to the visitor, then alternates a cheers and a sip. Hovering Sponsor makes it
// cheer; clicking makes it sip (the link still opens). Ported from website/reference/support-beanbag-spike.html.
import { THREE, setup, run, clay, makeFullRobot } from '../three/shared.js';
import { STORY, storyAt, createIdle } from '../support/story.js';

const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp, ss = THREE.MathUtils.smoothstep;
const ease = k => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
const BAG = 1.3, SEAT_Z = 0.22, FLOOR = -0.38;   // bag size (world), seat spot and flat bottom in bag units
const S = 0.55;                                   // robot units → world

// Bean bag: a squashed sphere with a flat bottom, a wide slouchy backrest, a seat dent, a low front lip and folds.
function makeBeanBag(segments) {
  const geo = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.75)), p = geo.attributes.position, v = new THREE.Vector3();
  let seatY = -1;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const { x, y, z } = v, up = Math.max(0, y), a = Math.atan2(x, z);
    let X = x * 1.16 * (1 + 0.07 * Math.max(0, -y)), Y = y * 0.5, Z = z;
    const back = ss(-z, -0.2, 0.7), front = ss(z, 0.35, 1);
    Y += 0.72 * back * up * (1 - 0.2 * x * x);                         // wide, rounded backrest
    Z -= 0.1 * back * up;                                              // that slouches back
    X *= 1 + 0.28 * back * up;                                         // keeps the top of the back wide, not a cone
    Y += Math.sin(x * 6.5) * 0.035 * back * up;                        // lumps along the top of the back
    Y -= 0.22 * Math.exp(-(x * x * 1.3 + (z - 0.2) ** 2) / 0.3) * up; // seat dent
    Y -= 0.2 * front * up;                                             // low front lip, so the legs hang over it
    if (Y < FLOOR) Y = FLOOR + (Y - FLOOR) * 0.12;                     // flat on the floor
    const crease = Math.cos(a * 7 + y * 3) * 0.016 * (0.3 + up) + Math.sin(a * 13 - y * 9) * 0.006;
    X *= 1 + crease; Z *= 1 + crease;                                  // fabric folds running up to the top
    p.setXYZ(i, X, Y, Z);
    if (Math.abs(X) < 0.06 && Math.abs(Z - SEAT_Z) < 0.06 && y > 0 && Y > seatY) seatY = Y;
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xA9502E, roughness: 0.95, sheen: 0.6, sheenColor: 0xd98a5f, sheenRoughness: 0.7 }));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.scale.setScalar(BAG); mesh.position.y = -FLOOR * BAG;
  return { mesh, seatTop: (seatY - FLOOR) * BAG };
}

// A cutting-chai glass: a faceted, flared tumbler (12 sides gives the fluted look) with chai and a little froth.
function makeChai() {
  const glass = new THREE.Group(); glass.scale.setScalar(0.95);
  const v2 = pts => pts.map(([x, y]) => new THREE.Vector2(x, y));
  glass.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[0.001, 0], [0.15, 0], [0.155, 0.02], [0.2, 0.5], [0.205, 0.52]]), 12),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.08, roughness: 0.04, ior: 1.45, transparent: true, side: THREE.DoubleSide, flatShading: true })));
  glass.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[0.001, 0.03], [0.14, 0.03], [0.178, 0.4]]), 12),
    new THREE.MeshPhysicalMaterial({ color: 0xB06A2C, roughness: 0.35, clearcoat: 0.6 })));
  const froth = new THREE.Mesh(new THREE.CircleGeometry(0.178, 12), clay(0xD9A877, 0.6)); froth.rotation.x = -Math.PI / 2; froth.position.y = 0.4; glass.add(froth);
  return glass;
}

function makeSteam(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const map = new THREE.CanvasTexture(c);
  return Array.from({ length: 7 }, (_, i) => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0 }));
    m.userData.o = i / 7; scene.add(m); return m;
  });
}

export function mount(section, quality) {
  const lite = quality === 'lite', coarse = matchMedia('(pointer: coarse)').matches;
  // `?still` renders one frozen frame (seated, mid-cheers) on a transparent page, for public/support-still.png (DEV-GUIDE).
  const still = new URLSearchParams(location.search).has('still');
  if (still) document.documentElement.classList.add('still-render');
  // The renderer follows the stage (the whole section on wide screens, the band above the copy on narrow ones);
  // the pointer is tracked over the whole section so the head turns toward the Sponsor button too.
  const stage = section.querySelector('.stage');
  const s = setup(stage, { exposure: 1, quality });
  const onMove = e => { const r = stage.getBoundingClientRect(); s.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); };
  section.addEventListener('pointermove', onMove);
  s.camera.fov = 32;

  const world = new THREE.Group(); s.scene.add(world);
  const key = new THREE.DirectionalLight(0xfff1e6, 2.6); key.position.set(-4, 7, 6);
  key.castShadow = !lite; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 7;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  const lamp = new THREE.PointLight(0xffb27a, 6, 8, 1.6); lamp.position.set(-2.4, 2.4, 0.6);
  s.scene.add(key, lamp, new THREE.HemisphereLight(0xfff0e0, 0x2a1a10, 0.55));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.02, 64), clay(0x2b2f36, 0.9));
  rug.scale.z = 0.55; rug.position.set(0, 0.01, 0.7); rug.receiveShadow = true; world.add(rug);
  const bag = makeBeanBag(lite ? 96 : 160); world.add(bag.mesh);

  const bot = makeFullRobot(), { root, body, head, eyes, bulb } = bot, { left: armL, right: armR } = bot.arms, { left: legL, right: legR } = bot.legs;
  root.scale.setScalar(S); world.add(root);
  const glass = makeChai(); armR.add(glass);
  const puffs = makeSteam(s.scene), rim = new THREE.Vector3();

  const START = new THREE.Vector3(5.4, 0, 2.0), FRONT = new THREE.Vector3(0, 0, 2.0);
  const SEAT = new THREE.Vector3(0, bag.seatTop - 0.74 * S - 0.03, SEAT_Z * BAG);

  const look = new THREE.Vector3(0, 0.85, 0.3);
  s.onResize = w => {
    const wide = w >= 900;
    world.position.set(wide ? 2.0 : 0, 0, 0);
    s.camera.position.set(0, 1.55, wide ? 9.2 : 8.4);
    s.camera.lookAt(look);
  };
  s.resize();

  // The story starts when the section is well in view; on lite (phones, touch) the robot is already seated.
  let t0 = lite || still ? -100 : null;
  const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio > 0.4 && t0 === null) t0 = performance.now() / 1000; }, { threshold: [0.4] });
  io.observe(section);

  const idle = createIdle();
  let raise = 0, raiseTarget = 0, seated = false;
  const sponsor = section.querySelector('#sponsor');
  const onEnter = () => { raiseTarget = 1; }, onLeave = () => { raiseTarget = 0; };
  const onClick = () => idle.request('sip', performance.now() / 1000, seated);   // no preventDefault: the link opens
  if (!coarse) { sponsor?.addEventListener('pointerenter', onEnter); sponsor?.addEventListener('pointerleave', onLeave); }
  sponsor?.addEventListener('click', onClick);

  const stopRun = run(s, () => {
    const now = still ? 100 : performance.now() / 1000, t = t0 === null ? -1 : now - t0;
    const { phase, k } = storyAt(Math.max(0, t));
    const walk = phase === 'walk' ? k : phase === 'waiting' ? 0 : 1;
    const turn = phase === 'turn' ? k : ['waiting', 'walk'].includes(phase) ? 0 : 1;
    const hop = phase === 'hop' ? k : phase === 'seated' ? 1 : 0;
    seated = phase === 'seated';
    const step = now * 9, swinging = phase === 'walk' ? 1 : 0;
    s.smooth.lerp(s.pointer, 0.05);
    world.rotation.y = -0.6 + s.smooth.x * 0.12;
    root.visible = t >= STORY.delay;

    if (hop > 0) {
      const e = ease(hop);
      root.position.set(lerp(FRONT.x, SEAT.x, e), lerp(0, SEAT.y, e) + Math.sin(hop * Math.PI) * 0.45, lerp(FRONT.z, SEAT.z, e));
    } else {
      root.position.lerpVectors(START, FRONT, ease(walk) * 0.15 + walk * 0.85);
      root.position.y = swinging ? Math.abs(Math.sin(step)) * 0.06 : 0;
    }
    root.rotation.y = lerp(-Math.PI / 2, 0, ease(turn));

    // The bag squashes on landing; the robot sinks in and leans back.
    const land = seated ? Math.exp(-(t - STORY.delay - STORY.walk - STORY.turn - STORY.hop) * 5) : 0;
    bag.mesh.scale.set(BAG * (1 + land * 0.06), BAG * (1 - land * 0.14), BAG * (1 + land * 0.06));
    body.scale.y = 1 - land * 0.1;
    const lean = -0.38 * ease(hop);
    body.rotation.x = lean;

    // Legs swing while walking, then rest forward over the front of the bag, a little splayed.
    legR.rotation.x = lerp(Math.sin(step) * 0.55 * swinging, -0.95, ease(hop));
    legL.rotation.x = lerp(-Math.sin(step) * 0.55 * swinging, -0.95, ease(hop));
    legR.position.z = legL.position.z = 0.55 * ease(hop);
    legR.rotation.z = 0.3 * ease(hop) + (seated ? Math.sin(now * 1.1) * 0.05 : 0);
    legL.rotation.z = -0.3 * ease(hop) - (seated ? Math.sin(now * 1.1 + 1) * 0.05 : 0);

    // Arms: the left swings, then flops on the bag; the right carries the chai.
    armL.rotation.x = seated ? -0.25 + Math.sin(now * 1.3) * 0.04 : Math.sin(step) * 0.5 * swinging;
    armL.rotation.z = seated ? -0.55 : 0;
    const act = still ? { action: 'cheers', k: 0.5 } : idle.tick(now, seated);
    const sip = act.action === 'sip' ? Math.sin(act.k * Math.PI) : 0;
    raise += ((seated ? raiseTarget : 0) - raise) * 0.08;
    const cheers = Math.max(act.action === 'cheers' ? Math.sin(act.k * Math.PI) ** 0.6 : 0, raise) * (1 - sip);
    armR.rotation.x = -1.0 - cheers * 0.95 - sip * 1.05;
    armR.rotation.z = sip * 0.55 + Math.sin(now * 7) * 0.32 * cheers;
    glass.position.set(0, -0.78, 0.12);
    glass.rotation.set(-armR.rotation.x - lean - sip * 0.7 + cheers * 0.3, 0, -armR.rotation.z);

    // The head follows the pointer once seated; the eyes squint on a sip or a cheers.
    head.rotation.y = seated ? s.smooth.x * 0.45 : 0;
    head.rotation.x = seated ? -s.smooth.y * 0.15 - lean * 0.6 : 0;
    head.rotation.z = Math.sin(now * 3.5) * 0.06 * cheers;
    const happy = (act.action === 'sip' && act.k > 0.35) || cheers > 0.5;
    eyes.forEach(e => { e.scale.y = lerp(e.scale.y, happy ? 0.3 : (now % 4.4) < 0.12 ? 0.15 : 1, 0.3); });
    bulb.material.emissiveIntensity = happy ? 2.6 : 0.55 + Math.sin(now * 3) * 0.3 + raise * 0.8;

    // Steam rises straight up in world space from the rim.
    glass.updateWorldMatrix(true, false); rim.set(0, 0.55, 0).applyMatrix4(glass.matrixWorld);
    puffs.forEach(p => {
      const q = (now * 0.35 + p.userData.o) % 1;
      p.position.set(rim.x + Math.sin(q * 6 + p.userData.o * 9) * 0.05, rim.y + q * 0.7, rim.z);
      p.scale.setScalar(0.12 + q * 0.3);
      p.material.opacity = root.visible ? Math.sin(q * Math.PI) * (0.5 - sip * 0.45) : 0;
    });

    s.renderer.render(s.scene, s.camera);
  });

  return {
    stop() {
      io.disconnect(); section.removeEventListener('pointermove', onMove);
      sponsor?.removeEventListener('pointerenter', onEnter); sponsor?.removeEventListener('pointerleave', onLeave); sponsor?.removeEventListener('click', onClick);
      stopRun();
    },
  };
}
