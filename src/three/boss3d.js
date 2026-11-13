/**
 * I 10 boss della campagna in 3D, stesso stile dei dadi e dell'avatar:
 * pupazzi "giocattolo" lucidi, occhioni con riflessi, luce da studio.
 * Immagini statiche (renderer condiviso) animate con CSS: respiro, sguardo,
 * provocazione all'entrata, sconfitta e vittoria (classi .boss3d.is-*).
 *
 * Tipo di immagine registrato: 'boss' con chiave = look (frog, crab, …) + colori.
 */
import * as THREE from 'three';
import { renderThumb, registerArt, has3D } from './core.js';
import { G, mesh, limb, plastic, metal, glow, gloss, fabric, leather, haloSprite, cached } from './avatarKit.js';
import { tag } from './liveStage.js';
import { sceneFor } from './avatar3d.js';

const PI = Math.PI;

/* ---------------- pezzi comuni ---------------- */
function eyeBall(r = 0.22, { iris = '#2a1a10', angry = 0, look = 0 } = {}) {
  const g = new THREE.Group();
  const white = cached('b:eyew', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.1, clearcoat: 1 }));
  const ir = cached(`b:iris${iris}`, () => new THREE.MeshPhysicalMaterial({ color: iris, roughness: 0.15, clearcoat: 1 }));
  const pupil = cached('b:pupil', () => new THREE.MeshPhysicalMaterial({ color: '#0d0907', roughness: 0.1, clearcoat: 1 }));
  const spark = cached('b:spark', () => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
  g.add(mesh(G.sphere(32), white, { s: r }));
  g.add(mesh(G.sphere(24), ir, { p: [look * r * 0.3, -r * 0.05, r * 0.72], s: [r * 0.55, r * 0.6, r * 0.32] }));
  g.add(mesh(G.sphere(20), pupil, { p: [look * r * 0.32, -r * 0.05, r * 0.88], s: [r * 0.3, r * 0.34, r * 0.16] }));
  g.add(mesh(G.sphere(10), spark, { p: [r * 0.22, r * 0.25, r * 0.98], s: r * 0.12, shadow: false }));
  if (angry) {
    // palpebra arrabbiata
    const lid = mesh(G.dome(PI / 2, 24), cached('b:lid', () => plastic('#3a2a20', 0.4)), { s: r * 1.06, r: [-0.5, 0, angry * 0.5] });
    g.add(lid);
  }
  return g;
}

function smile(w, color = '#5a1820', { open = true } = {}) {
  const g = new THREE.Group();
  const m = cached(`b:mouth${color}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4 }));
  if (open) {
    g.add(mesh(G.sphere(24), m, { s: [w, w * 0.45, w * 0.3] }));
    g.add(mesh(G.box(w * 1.1, w * 0.18, w * 0.2, 0.03), cached('b:teeth', () => plastic('#ffffff', 0.9)), { p: [0, w * 0.26, w * 0.12] }));
  } else g.add(mesh(G.torus(w, w * 0.12, PI, 24), m, { r: [0, 0, PI] }));
  return g;
}

function crown(r, gold = '#ffcf33', gem = '#ff3d7f') {
  const g = new THREE.Group();
  const gm = metal(gold, 0.18);
  g.add(mesh(G.cyl(r, r * 1.02, r * 0.45, 40, true), gm));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    g.add(mesh(G.cone(r * 0.2, r * 0.55, 16), gm, { p: [Math.sin(a) * r, r * 0.45, Math.cos(a) * r] }));
    g.add(mesh(G.sphere(12), gloss(i % 2 ? gem : '#3d9bff'), { p: [Math.sin(a) * r * 1.01, 0, Math.cos(a) * r * 1.01], s: r * 0.09 }));
  }
  return g;
}

function blob(color, s, gl = 0.75) {
  return mesh(G.sphere(48), plastic(color, gl), { s });
}

/* ---------------- i boss ---------------- */
const at = (o, x, y, z) => (o.position.set(x, y, z), o);
const grp = (...kids) => {
  const g = new THREE.Group();
  kids.forEach((k) => k && g.add(k));
  return g;
};
/** Occhio che sbatte le palpebre. */
const eye = (r, o, x, y, z) => tag(at(eyeBall(r, o), x, y, z), 'blink');
const cheek = (x, y, z, s = 0.12) => mesh(G.sphere(16), plastic('#ff8aa0', 0.3), { p: [x, y, z], s: [s, s * 0.6, s * 0.4], shadow: false });
const halo = (color, size, x, y, z, op = 0.6) => {
  const h = haloSprite(color, size, op);
  h.position.set(x, y, z);
  h.userData.noFrame = true;
  return h;
};
const shape = (pts) => () => {
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  return sh;
};
const BOLT = shape([[0, 0.6], [0.18, 0.1], [0.06, 0.12], [0.15, -0.4], [-0.12, 0.18], [0, 0.16]]);
const STAR = () => {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.4 : 1;
    const a = (i / 10) * PI * 2 + PI / 2;
    sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  return sh;
};
const BAT = shape([[0, 0.1], [0.25, 0.3], [0.6, 0.25], [0.5, 0.05], [0.4, 0.1], [0.3, -0.05], [0.18, 0.05], [0, -0.15], [-0.18, 0.05], [-0.3, -0.05], [-0.4, 0.1], [-0.5, 0.05], [-0.6, 0.25], [-0.25, 0.3]]);
/** Piccolo dado giocattolo (per il Signore dei Dadi e il mago). */
function miniDie(size, color = '#ffffff', pip = '#262a3d') {
  const g = grp(mesh(G.box(1, 1, 1, 0.2), plastic(color, 0.9)));
  const pm = plastic(pip, 0.6);
  [[0, 0, 0.5], [0.25, 0.25, 0.5], [-0.25, -0.25, 0.5], [0.5, 0, 0], [0, 0.5, 0.2], [0, 0.5, -0.2]].forEach(([x, y, z]) => g.add(mesh(G.sphere(10), pm, { p: [x, y, z], s: 0.09, shadow: false })));
  g.scale.setScalar(size);
  return g;
}

const LOOKS = {
  frog([a, b, c]) {
    const g = new THREE.Group();
    // ninfea
    g.add(mesh(G.cyl(1.25, 1.2, 0.08, 40), plastic('#3fae5a', 0.5), { p: [0, 0.0, 0.05] }));
    g.add(mesh(G.cyl(1.05, 1.05, 0.085, 40), plastic('#55c56e', 0.5), { p: [0, 0.005, 0.05] }));
    g.add(blob(a, [1, 0.8, 0.86]).translateY(0.82));
    g.add(tag(at(blob('#f4f9c8', [0.74, 0.52, 0.5], 0.6), 0, 0.68, 0.42), 'pulse', { amp: 0.035, speed: 1.1 }));
    // macchie sul dorso
    [[-0.55, 1.3, -0.25, 0.16], [0.6, 1.2, -0.3, 0.13], [0.1, 1.5, -0.4, 0.12], [-0.8, 0.9, -0.1, 0.1]].forEach(([x, y, z, r]) => g.add(mesh(G.sphere(16), plastic(b, 0.6), { p: [x, y, z], s: [r, r * 0.5, r], shadow: false })));
    for (const s of [-1, 1]) {
      g.add(at(blob(a, 0.31), s * 0.46, 1.5, 0.22));
      g.add(eye(0.25, { iris: '#7a4a10', look: -s * 0.25 }, s * 0.46, 1.54, 0.36));
      g.add(mesh(G.torus(0.26, 0.035, PI, 24), plastic(b, 0.6), { p: [s * 0.46, 1.58, 0.33], r: [-0.5, 0, 0] }));
      // zampe dietro con dita
      g.add(at(blob(b, [0.4, 0.26, 0.55]), s * 0.82, 0.24, 0.3));
      for (let i = 0; i < 3; i++) g.add(mesh(G.sphere(12), plastic(a, 0.7), { p: [s * (0.66 + i * 0.16), 0.14, 0.82 - Math.abs(i - 1) * 0.06], s: [0.1, 0.07, 0.14] }));
      // braccia sul pancione
      g.add(limb([s * 0.72, 0.95, 0.5], [s * 0.42, 0.5, 0.82], 0.1, plastic(a)));
      g.add(mesh(G.sphere(16), plastic(a), { p: [s * 0.4, 0.46, 0.86], s: [0.15, 0.1, 0.13] }));
      g.add(cheek(s * 0.66, 1.05, 0.62));
      g.add(mesh(G.sphere(8), plastic('#1f4a1a'), { p: [s * 0.1, 1.28, 0.8], s: 0.03, shadow: false }));
    }
    g.add(at(smile(0.46, '#a8253a'), 0, 0.98, 0.74));
    g.add(mesh(G.sphere(16), plastic('#ff6f8a', 0.6), { p: [0, 0.9, 0.82], s: [0.2, 0.08, 0.1], shadow: false }));
    const cr = crown(0.27, c);
    cr.position.set(0.04, 1.72, 0.05);
    cr.rotation.z = -0.12;
    g.add(cr);
    return g;
  },
  crab([a, b, c]) {
    const g = new THREE.Group();
    // sabbia e conchiglia
    g.add(mesh(G.cyl(1.35, 1.45, 0.1, 40), plastic('#f3d9a0', 0.15), { p: [0, 0, 0] }));
    g.add(mesh(G.cone(0.14, 0.3, 12), plastic('#ffd0e0', 0.8), { p: [1.0, 0.16, 0.7], r: [1.2, 0.4, 0] }));
    g.add(at(blob(a, [1.08, 0.82, 0.9]), 0, 0.95, 0));
    g.add(mesh(G.dome(PI / 2.4, 40), plastic(b, 0.8), { p: [0, 1.02, -0.05], s: [1.1, 0.84, 0.92] }));
    g.add(at(blob(c, [0.8, 0.45, 0.5], 0.5), 0, 0.7, 0.42));
    [[-0.45, 1.68, -0.1], [0.4, 1.72, -0.2], [0, 1.82, -0.05], [0.7, 1.45, -0.1], [-0.75, 1.42, -0.2]].forEach(([x, y, z]) => g.add(mesh(G.sphere(12), plastic('#ffb39a', 0.7), { p: [x, y, z], s: [0.1, 0.05, 0.1], shadow: false })));
    for (const s of [-1, 1]) {
      g.add(limb([s * 0.2, 1.5, 0.45], [s * 0.3, 1.95, 0.55], 0.07, plastic(a)));
      g.add(eye(0.25, { angry: s, iris: '#1a1a1a', look: -s * 0.2 }, s * 0.32, 2.08, 0.6));
      // braccio e chela (si apre e chiude)
      g.add(limb([s * 0.92, 1.0, 0.25], [s * 1.2, 1.5, 0.5], 0.14, plastic(a)));
      const claw = new THREE.Group();
      claw.add(at(blob(a, [0.42, 0.34, 0.3]), 0, 0.1, 0));
      claw.add(mesh(G.cone(0.2, 0.62, 16), plastic(a), { p: [s * 0.12, 0.6, 0], r: [0, 0, -0.35 * s] }));
      const thumb = tag(grp(mesh(G.cone(0.14, 0.5, 16), plastic(b), { p: [0, 0.25, 0] })), 'snap', { amp: 0.75 * s, speed: 0.55, phase: s });
      thumb.position.set(-s * 0.2, 0.3, 0);
      thumb.rotation.z = 0.25 * s;
      claw.add(thumb);
      claw.position.set(s * 1.3, 1.7, 0.55);
      claw.rotation.z = -s * 0.25;
      g.add(tag(claw, 'flap', { amp: 0.12, speed: 0.7, phase: s * 1.5 }));
      for (let i = 0; i < 3; i++) g.add(tag(limb([s * 0.7, 0.6, 0.25 - i * 0.28], [s * 1.2, 0.08, 0.45 - i * 0.34], 0.07, plastic(b)), 'flap', { amp: 0.06, speed: 1.6, phase: i + s }));
      g.add(cheek(s * 0.6, 0.95, 0.74, 0.13));
    }
    g.add(at(smile(0.32, '#6a1810'), 0, 0.92, 0.84));
    return g;
  },
  witch([a, b, c]) {
    const g = new THREE.Group();
    g.add(mesh(G.cone(0.9, 1.45, 40), fabric(b), { p: [0, 0.72, 0] }));
    g.add(mesh(G.torus(0.86, 0.06, PI * 2, 40), fabric(a), { p: [0, 0.06, 0], r: [PI / 2, 0, 0] }));
    // mantello
    g.add(tag(mesh(G.cone(1.0, 1.5, 32, ), fabric('#2a1a48'), { p: [0, 0.78, -0.22], s: [1, 1, 0.6] }), 'wag', { amp: 0.05, speed: 0.6 }));
    g.add(at(blob('#b8e07a', [0.56, 0.6, 0.53], 0.5), 0, 1.6, 0));
    for (const s of [-1, 1]) {
      g.add(eye(0.17, { iris: '#5a2a8a', angry: -s * 0.6, look: -s * 0.2 }, s * 0.21, 1.68, 0.43));
      g.add(mesh(G.capsule(0.13, 0.75, 12), fabric('#3a2050'), { p: [s * 0.55, 1.35, -0.05], r: [0, 0, s * 0.25] }));
      g.add(cheek(s * 0.36, 1.48, 0.38, 0.09));
    }
    g.add(mesh(G.cone(0.09, 0.42, 16), plastic('#8fc05a'), { p: [0, 1.55, 0.62], r: [PI / 2.3, 0, 0] }));
    g.add(mesh(G.sphere(8), plastic('#6a9a3a'), { p: [0.05, 1.6, 0.7], s: 0.035 }));
    g.add(at(smile(0.19, '#4a1030'), 0, 1.36, 0.47));
    // cappello con fibbia e punta piegata
    g.add(mesh(G.cyl(0.98, 1.02, 0.07, 48), fabric(a), { p: [0, 2.02, 0], r: [0.08, 0, -0.06] }));
    g.add(mesh(G.cone(0.5, 0.8, 32), fabric(a), { p: [0.02, 2.42, -0.03], r: [0, 0, -0.1] }));
    g.add(tag(grp(mesh(G.cone(0.26, 0.6, 24), fabric(a), { p: [0, 0.25, 0] })), 'flap', { amp: 0.12, speed: 0.8 }).translateX(0.1).translateY(2.75).rotateZ(-0.75));
    g.add(mesh(G.cyl(0.52, 0.54, 0.13, 32), fabric(c), { p: [0, 2.1, 0] }));
    g.add(mesh(G.box(0.2, 0.17, 0.05, 0.02), metal('#ffcf33'), { p: [0, 2.1, 0.52] }));
    // braccio e bacchetta con stella
    g.add(limb([0.55, 1.15, 0.2], [1.0, 1.35, 0.5], 0.11, fabric(b)));
    g.add(mesh(G.sphere(16), plastic('#b8e07a', 0.5), { p: [1.05, 1.38, 0.52], s: 0.13 }));
    const wand = tag(grp(limb([0, 0, 0], [0.18, 0.62, 0.05], 0.035, plastic('#6a3a1a')), mesh(G.extrude('star', STAR, 0.06, 0.02), glow(c, 2.6), { p: [0.2, 0.72, 0.06], s: 0.14, shadow: false }), halo(c, 0.9, 0.2, 0.72, 0.1)), 'flap', { amp: 0.25, speed: 1.1 });
    wand.position.set(1.05, 1.4, 0.55);
    g.add(wand);
    // calderone che ribolle
    g.add(mesh(G.sphere(32), metal('#2a2a34', 0.5), { p: [-0.85, 0.36, 0.6], s: [0.42, 0.36, 0.42] }));
    g.add(mesh(G.torus(0.36, 0.06, PI * 2, 32), metal('#2a2a34', 0.5), { p: [-0.85, 0.62, 0.6], r: [PI / 2, 0, 0] }));
    g.add(mesh(G.cyl(0.33, 0.33, 0.04, 32), glow(c, 1.6), { p: [-0.85, 0.62, 0.6], shadow: false }));
    for (let i = 0; i < 4; i++) g.add(tag(mesh(G.sphere(12), glow(c, 2, 0.8), { p: [-0.98 + i * 0.09, 0.78 + i * 0.16, 0.6 + (i % 2) * 0.08], s: 0.07 - i * 0.008, shadow: false }), 'bob', { amp: 0.1, speed: 1.2, phase: i * 1.7 }));
    g.add(halo(c, 1.1, -0.85, 0.75, 0.7, 0.4));
    return g;
  },
  golem([a, b, c]) {
    const g = new THREE.Group();
    const ice = cached(`b:ice${a}`, () => new THREE.MeshPhysicalMaterial({ color: a, roughness: 0.12, transmission: 0.45, thickness: 0.8, clearcoat: 1, ior: 1.3, attenuationColor: new THREE.Color(b), attenuationDistance: 1.6 }));
    const deep = cached(`b:ice2${b}`, () => new THREE.MeshPhysicalMaterial({ color: b, roughness: 0.2, transmission: 0.2, thickness: 0.6, clearcoat: 1 }));
    const snow = plastic('#ffffff', 0.2);
    g.add(mesh(G.cyl(1.4, 1.5, 0.1, 32), snow, { p: [0, 0, 0] }));
    g.add(mesh(G.box(1.55, 1.25, 1.05, 0.25), ice, { p: [0, 1.05, 0] }));
    g.add(mesh(G.box(1.0, 0.8, 0.85, 0.2), ice, { p: [0, 2.0, 0.05] }));
    g.add(mesh(G.dome(PI / 2, 24), snow, { p: [0, 2.3, 0.02], s: [0.52, 0.2, 0.45] }));
    // cuore di ghiaccio che pulsa
    g.add(tag(mesh(G.sphere(20), glow(c, 2.4), { p: [0, 1.1, 0.5], s: 0.16, shadow: false }), 'pulse', { amp: 0.3, speed: 0.9 }));
    g.add(halo('#bfe9ff', 1.3, 0, 1.1, 0.6, 0.5));
    for (const s of [-1, 1]) {
      const arm = grp(mesh(G.box(0.5, 1.05, 0.55, 0.15), ice, { p: [0, -0.5, 0] }), mesh(G.box(0.62, 0.55, 0.62, 0.18), deep, { p: [0, -1.15, 0.05] }), mesh(G.cone(0.16, 0.5, 6), ice, { p: [0, 0.2, 0], r: [0, 0, -s * 0.5] }), mesh(G.cone(0.11, 0.36, 6), deep, { p: [s * 0.18, 0.1, 0.1], r: [0.3, 0, -s * 0.9] }));
      arm.position.set(s * 1.08, 1.6, 0.1);
      arm.rotation.z = s * 0.14;
      g.add(tag(arm, 'flap', { amp: 0.07, speed: 0.5, phase: s }));
      g.add(mesh(G.box(0.6, 0.5, 0.65, 0.15), deep, { p: [s * 0.45, 0.28, 0.02] }));
      g.add(eye(0.14, { iris: b, angry: s * 0.5 }, s * 0.24, 2.08, 0.46));
      g.add(mesh(G.box(0.34, 0.09, 0.1, 0.03), snow, { p: [s * 0.24, 2.27, 0.48], r: [0, 0, -s * 0.3] }));
      g.add(mesh(G.cone(0.13, 0.5, 6), ice, { p: [s * 0.36, 2.55, 0], r: [0, 0, -s * 0.3] }));
    }
    g.add(mesh(G.cone(0.16, 0.62, 6), ice, { p: [0, 2.68, -0.05] }));
    g.add(at(smile(0.24, '#1d3f70'), 0, 1.82, 0.47));
    return g;
  },
  pirate([a, b, c]) {
    const g = new THREE.Group();
    // barile e ponte
    g.add(mesh(G.cyl(1.25, 1.25, 0.1, 32), plastic('#8a5a30', 0.3), { p: [0, 0, 0] }));
    g.add(at(blob(b, [0.78, 0.78, 0.64]), 0, 0.85, 0));
    for (let i = 0; i < 4; i++) g.add(mesh(G.torus(0.66 - Math.abs(i - 1.5) * 0.06, 0.05, PI * 2, 40), fabric(i % 2 ? '#ffffff' : a), { p: [0, 0.6 + i * 0.16, 0], r: [PI / 2, 0, 0] }));
    // giacca
    g.add(mesh(G.dome(PI / 1.7, 32), leather('#3a2030'), { p: [0, 0.9, -0.1], s: [0.86, 0.86, 0.66], r: [0.25, 0, 0] }));
    g.add(mesh(G.box(0.5, 0.12, 0.1, 0.03), leather('#2a1810'), { p: [0, 0.42, 0.58] }));
    g.add(mesh(G.box(0.16, 0.16, 0.06, 0.02), metal(c), { p: [0, 0.42, 0.63] }));
    for (const s of [-1, 1]) g.add(mesh(G.box(0.3, 0.38, 0.42, 0.1), leather('#2a1810'), { p: [s * 0.32, 0.2, 0.1] }));
    g.add(at(blob('#e8b48a', [0.56, 0.56, 0.52], 0.45), 0, 1.72, 0));
    g.add(eye(0.17, { iris: '#2a5a8a', angry: 0.4, look: -0.2 }, 0.21, 1.8, 0.43));
    g.add(mesh(G.cyl(0.17, 0.17, 0.06, 24), plastic('#151515', 0.6), { p: [-0.21, 1.8, 0.47], r: [PI / 2, 0, 0] }));
    g.add(mesh(G.torus(0.57, 0.022, PI * 2, 40), plastic('#151515'), { p: [0, 1.87, 0], r: [0.25, 0, 0.2] }));
    // barba e baffi
    g.add(mesh(G.sphere(24), fabric('#5a3418'), { p: [0, 1.4, 0.3], s: [0.42, 0.34, 0.3] }));
    for (const s of [-1, 1]) g.add(mesh(G.capsule(0.07, 0.22, 10), fabric('#5a3418'), { p: [s * 0.16, 1.6, 0.5], r: [0, 0, s * 1.1] }));
    g.add(mesh(G.sphere(12), plastic('#d89a70', 0.5), { p: [0, 1.7, 0.53], s: [0.09, 0.08, 0.09] }));
    g.add(at(smile(0.15, '#5a1820'), 0, 1.5, 0.52));
    g.add(mesh(G.torus(0.08, 0.02, PI * 2, 16), metal(c), { p: [0.57, 1.55, 0.05] }));
    // tricorno con teschio e piuma
    const hat = new THREE.Group();
    hat.add(mesh(G.cyl(0.8, 0.8, 0.09, 3), leather('#1f1a24'), { r: [0, PI / 6, 0] }));
    hat.add(mesh(G.torus(0.56, 0.03, PI * 2, 3), metal(c), { p: [0, 0.05, 0], r: [PI / 2, 0, PI / 6] }));
    hat.add(mesh(G.dome(PI / 2, 32), leather('#1f1a24'), { s: [0.5, 0.45, 0.5] }));
    hat.add(mesh(G.sphere(16), plastic('#ffffff', 0.6), { p: [0, 0.22, 0.46], s: [0.13, 0.11, 0.05] }));
    hat.add(tag(grp(mesh(G.capsule(0.07, 0.6, 10), fabric('#e0283d'), { p: [0, 0.3, 0], s: [1, 1, 0.4] })), 'flap', { amp: 0.15, speed: 0.9 }).translateX(-0.35).translateY(0.2).rotateZ(0.6));
    hat.position.set(0, 2.16, 0);
    hat.rotation.z = 0.06;
    g.add(hat);
    // braccio con lo specchio magico
    g.add(limb([0.6, 1.1, 0.2], [1.0, 1.25, 0.5], 0.12, leather('#3a2030')));
    const mirror = tag(grp(limb([0, 0, 0], [0, 0.3, 0], 0.045, metal(c)), mesh(G.torus(0.3, 0.05, PI * 2, 32), metal(c), { p: [0, 0.62, 0] }), mesh(G.cyl(0.28, 0.28, 0.03, 32), cached('b:mirror', () => new THREE.MeshPhysicalMaterial({ color: '#dff6ff', metalness: 1, roughness: 0.02, envMapIntensity: 2 })), { p: [0, 0.62, 0], r: [PI / 2, 0, 0] }), halo(a, 0.9, 0, 0.62, 0.1, 0.35)), 'flap', { amp: 0.2, speed: 0.8, axis: 'y' });
    mirror.position.set(1.05, 1.25, 0.55);
    mirror.rotation.z = -0.3;
    g.add(mirror);
    // uncino
    g.add(limb([-0.6, 1.1, 0.2], [-0.95, 0.85, 0.45], 0.12, leather('#3a2030')));
    g.add(mesh(G.torus(0.12, 0.035, PI * 1.4, 20), metal('#d8dde8', 0.15), { p: [-1.02, 0.72, 0.5], r: [0, 0, 2.2] }));
    return g;
  },
  dragon([a, b, c]) {
    const g = new THREE.Group();
    // mucchio d'oro
    g.add(mesh(G.dome(PI / 2, 32), metal(c, 0.3), { p: [0, 0, 0.1], s: [1.35, 0.3, 1.1] }));
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * PI * 2;
      g.add(mesh(G.cyl(0.13, 0.13, 0.04, 20), metal(c, 0.18), { p: [Math.cos(an) * (0.95 + (i % 3) * 0.12), 0.1 + (i % 2) * 0.06, 0.15 + Math.sin(an) * 0.85], r: [0.3 * (i % 3), i, 0.2] }));
    }
    g.add(mesh(G.sphere(12), gloss('#ff3d7f'), { p: [-0.7, 0.2, 0.85], s: 0.1 }));
    g.add(mesh(G.sphere(12), gloss('#3d9bff'), { p: [0.8, 0.18, 0.8], s: 0.09 }));
    g.add(at(blob(a, [0.9, 0.88, 0.8]), 0, 1.0, 0));
    g.add(at(blob('#ffe0a0', [0.62, 0.66, 0.4], 0.5), 0, 0.9, 0.48));
    for (let i = 0; i < 4; i++) g.add(mesh(G.torus(0.42 - i * 0.03, 0.025, PI, 24), plastic('#e8b860', 0.4), { p: [0, 0.55 + i * 0.22, 0.72 - i * 0.03], r: [-0.2, 0, PI], shadow: false }));
    const head = new THREE.Group();
    head.add(blob(a, [0.62, 0.52, 0.56]));
    head.add(at(blob(a, [0.36, 0.22, 0.34]), 0, -0.2, 0.44));
    head.add(at(smile(0.22, '#6a1810'), 0, -0.3, 0.6));
    for (const s of [-1, 1]) {
      head.add(at(blob(a, 0.2), s * 0.27, 0.3, 0.28));
      head.add(eye(0.19, { iris: '#ff3a10', angry: s * 0.6, look: -s * 0.2 }, s * 0.27, 0.32, 0.36));
      head.add(mesh(G.cone(0.11, 0.5, 16), plastic(c), { p: [s * 0.36, 0.62, -0.1], r: [-0.4, 0, -s * 0.35] }));
      head.add(tag(mesh(G.sphere(10), glow('#ff7a1a', 2), { p: [s * 0.1, -0.12, 0.76], s: 0.05, shadow: false }), 'pulse', { amp: 0.5, speed: 1.2 }));
      head.add(mesh(G.cone(0.035, 0.11, 8), plastic('#ffffff', 0.9), { p: [s * 0.14, -0.38, 0.66], r: [PI, 0, 0] }));
      // ali che battono
      const wing = tag(grp(mesh(G.extrude('wing', () => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.quadraticCurveTo(0.6, 0.9, 1.2, 0.8);
        sh.lineTo(1.0, 0.4);
        sh.lineTo(1.1, 0.1);
        sh.lineTo(0.8, -0.05);
        sh.lineTo(0.9, -0.35);
        sh.quadraticCurveTo(0.4, -0.3, 0, 0);
        return sh;
      }, 0.04, 0.02), fabric(b), { p: [0.62, 0.2, 0], s: [1.15, 1.15, 1] })), 'flap', { amp: 0.28, speed: 1.1, axis: 'y', phase: 0 });
      wing.position.set(s * 0.6, 1.35, -0.4);
      wing.scale.x = s;
      wing.rotation.y = s * 0.35;
      wing.userData.anim.amp *= s;
      g.add(wing);
      g.add(limb([s * 0.7, 0.95, 0.45], [s * 0.5, 0.5, 0.75], 0.12, plastic(a)));
      g.add(at(blob(a, [0.3, 0.2, 0.4]), s * 0.6, 0.32, 0.5));
    }
    for (let i = 0; i < 4; i++) head.add(mesh(G.cone(0.07, 0.2, 8), plastic(b), { p: [0, 0.5 - i * 0.02, -0.15 - i * 0.14], r: [-0.5 - i * 0.3, 0, 0] }));
    head.position.set(0, 1.95, 0.12);
    g.add(tag(head, 'nod', { amp: 0.05, speed: 0.6 }));
    const tail = tag(grp(mesh(G.cone(0.22, 1.1, 16), plastic(a), { p: [0, 0.5, 0] }), mesh(G.cone(0.14, 0.3, 4), plastic(c), { p: [0, 1.1, 0] })), 'wag', { amp: 0.35, speed: 0.8, axis: 'z' });
    tail.position.set(0.6, 0.45, -0.5);
    tail.rotation.set(0.9, 0, -1.0);
    g.add(tail);
    return g;
  },
  wizard([a, b, c]) {
    const g = new THREE.Group();
    g.add(mesh(G.cone(0.85, 1.55, 40), fabric(a), { p: [0, 0.78, 0] }));
    g.add(mesh(G.torus(0.8, 0.06, PI * 2, 40), fabric(c), { p: [0, 0.07, 0], r: [PI / 2, 0, 0] }));
    for (let i = 0; i < 6; i++) g.add(mesh(G.extrude('star', STAR, 0.06, 0.02), glow(c, 1.6), { p: [Math.sin(i * 2.2) * (0.3 + i * 0.07), 0.3 + i * 0.16, 0.74 - i * 0.085], s: 0.05, shadow: false }));
    g.add(at(blob('#f0c8a0', [0.5, 0.5, 0.48], 0.45), 0, 1.66, 0));
    // barbona e baffi
    g.add(mesh(G.cone(0.44, 1.0, 32), fabric('#f2f2f2'), { p: [0, 1.15, 0.3], r: [PI + 0.12, 0, 0] }));
    for (const s of [-1, 1]) {
      g.add(mesh(G.capsule(0.08, 0.3, 10), fabric('#ffffff'), { p: [s * 0.2, 1.52, 0.46], r: [0, 0, s * 1.0] }));
      g.add(eye(0.15, { iris: c, angry: s * 0.4, look: -s * 0.15 }, s * 0.19, 1.74, 0.4));
      g.add(mesh(G.capsule(0.05, 0.2, 8), fabric('#ffffff'), { p: [s * 0.2, 1.92, 0.42], r: [0, 0, s * 1.2 + PI / 2] }));
    }
    g.add(mesh(G.sphere(12), plastic('#e0a080', 0.5), { p: [0, 1.64, 0.5], s: 0.09 }));
    // cappello storto con punta che dondola
    g.add(mesh(G.cyl(0.9, 0.94, 0.07, 48), fabric(b), { p: [0, 2.06, 0], r: [0.06, 0, 0.08] }));
    g.add(mesh(G.cone(0.52, 0.9, 32), fabric(b), { p: [-0.05, 2.5, 0], r: [0, 0, 0.15] }));
    g.add(tag(grp(mesh(G.cone(0.25, 0.6, 24), fabric(b), { p: [0, 0.25, 0] }), mesh(G.sphere(12), glow(c, 2.4), { p: [0, 0.58, 0], s: 0.08, shadow: false })), 'flap', { amp: 0.15, speed: 0.9 }).translateX(-0.17).translateY(2.86).rotateZ(0.7));
    g.add(mesh(G.cyl(0.54, 0.56, 0.12, 32), fabric(c), { p: [-0.01, 2.13, 0] }));
    // bastone con sfera del caos
    g.add(limb([-0.55, 1.1, 0.25], [-0.85, 1.3, 0.4], 0.11, fabric(a)));
    g.add(limb([-0.85, 0.1, 0.4], [-0.9, 2.1, 0.4], 0.05, plastic('#6a3a1a')));
    g.add(mesh(G.torus(0.17, 0.035, PI * 1.5, 20), metal('#ffcf33'), { p: [-0.9, 2.2, 0.4], r: [0, 0, -PI / 4] }));
    g.add(tag(mesh(G.sphere(24), cached(`b:orb${c}`, () => new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, transmission: 0.5, roughness: 0.05 })), { p: [-0.9, 2.24, 0.4], s: 0.17 }), 'pulse', { amp: 0.18, speed: 1.3 }));
    g.add(halo(c, 1.2, -0.9, 2.24, 0.5, 0.55));
    // dadi che gli orbitano attorno
    const orbit = tag(new THREE.Group(), 'spin', { speed: 0.5 });
    [[a, 0], [c, 2.1], ['#ffffff', 4.2]].forEach(([col, an], i) => orbit.add(tag(at(miniDie(0.2, col, col === '#ffffff' ? '#5a1c99' : '#ffffff'), Math.cos(an) * 1.15, 0.2 * i, Math.sin(an) * 1.15), 'spin', { speed: 1.5, axis: 'x' })));
    orbit.position.y = 1.0;
    g.add(orbit);
    g.add(limb([0.55, 1.1, 0.25], [0.95, 1.5, 0.5], 0.11, fabric(a)));
    g.add(mesh(G.sphere(12), plastic('#f0c8a0', 0.45), { p: [0.98, 1.54, 0.52], s: 0.12 }));
    return g;
  },
  vampire([a, b, c]) {
    const g = new THREE.Group();
    g.add(mesh(G.cone(0.82, 1.45, 40), fabric('#1a1220'), { p: [0, 0.72, 0] }));
    // mantello: fuori nero, dentro rosso
    g.add(tag(mesh(G.cone(1.05, 1.6, 40), fabric(b), { p: [0, 0.8, -0.2], s: [1.1, 1, 0.75] }), 'wag', { amp: 0.06, speed: 0.5 }));
    g.add(mesh(G.cone(0.9, 1.45, 40), fabric(a), { p: [0, 0.76, -0.1], s: [1.05, 1, 0.82] }));
    // camicia e gilet
    g.add(mesh(G.sphere(24), fabric('#ffffff'), { p: [0, 1.0, 0.36], s: [0.26, 0.4, 0.14] }));
    g.add(mesh(G.sphere(16), gloss('#e0283d'), { p: [0, 1.22, 0.52], s: 0.09 }));
    g.add(mesh(G.torus(0.1, 0.02, PI * 2, 16), metal('#ffcf33'), { p: [0, 1.22, 0.5] }));
    g.add(at(blob('#e8e4f0', [0.52, 0.57, 0.5], 0.5), 0, 1.66, 0));
    g.add(mesh(G.dome(PI / 2.2, 40), plastic('#1a1220', 0.9), { p: [0, 1.72, -0.02], s: [0.55, 0.52, 0.54] }));
    g.add(mesh(G.cone(0.16, 0.3, 3), plastic('#1a1220', 0.9), { p: [0, 1.98, 0.42], r: [PI + 0.5, 0, 0] }));
    for (const s of [-1, 1]) {
      g.add(eye(0.15, { iris: '#e0283d', angry: s * 0.6, look: -s * 0.15 }, s * 0.2, 1.72, 0.42));
      g.add(mesh(G.cone(0.04, 0.15, 12), plastic('#ffffff', 0.9), { p: [s * 0.09, 1.36, 0.5], r: [PI, 0, 0] }));
      g.add(mesh(G.cone(0.1, 0.26, 12), plastic('#e8e4f0', 0.5), { p: [s * 0.54, 1.74, 0], r: [0, 0, -s * 0.5] }));
      // colletto alto
      g.add(mesh(G.extrude('collar', shape([[0, 0], [0.55, 1.0], [0.15, 0.6]]), 0.04, 0.015), fabric(a), { p: [s * 0.48, 1.6, -0.12], s: [s, 1, 1], r: [0, -s * 0.3, 0] }));
      g.add(limb([s * 0.6, 1.2, 0.15], [s * 0.25, 0.85, 0.5], 0.1, fabric('#1a1220')));
    }
    g.add(mesh(G.sphere(12), plastic('#e8e4f0', 0.5), { p: [0, 0.85, 0.55], s: [0.2, 0.1, 0.12] }));
    g.add(at(smile(0.16, '#5a0a18'), 0, 1.45, 0.46));
    // pipistrelli
    const bats = tag(new THREE.Group(), 'spin', { speed: 0.6 });
    for (let i = 0; i < 3; i++) {
      const an = (i / 3) * PI * 2;
      const bat = tag(mesh(G.extrude('bat', BAT, 0.03, 0.01), plastic('#2a1830', 0.5), { p: [Math.cos(an) * 1.25, 0.25 * i, Math.sin(an) * 1.25], s: 0.42, r: [0, -an + PI / 2, 0] }), 'bob', { amp: 0.1, speed: 2, phase: i * 2 });
      bats.add(bat);
    }
    bats.position.y = 1.9;
    g.add(bats);
    return g;
  },
  storm([a, b, c]) {
    const g = new THREE.Group();
    const cloud = plastic('#eef4ff', 0.3);
    const dark = plastic('#b8c6e6', 0.3);
    const base = tag(new THREE.Group(), 'bob', { amp: 0.06, speed: 0.7 });
    [[0, 0.95, 0, 0.78, cloud], [-0.65, 0.78, 0, 0.52, dark], [0.65, 0.78, 0, 0.56, cloud], [-0.3, 1.3, 0.05, 0.5, cloud], [0.38, 1.34, 0, 0.46, dark], [0, 0.6, 0.35, 0.5, dark]].forEach(([x, y, z, r, m]) => base.add(mesh(G.sphere(32), m, { p: [x, y, z], s: r })));
    // gocce di pioggia
    for (let i = 0; i < 7; i++) base.add(tag(mesh(G.sphere(8), gloss(a), { p: [-0.75 + i * 0.25, 0.12 + (i % 3) * 0.1, 0.25 + (i % 2) * 0.2], s: [0.04, 0.09, 0.04], shadow: false }), 'bob', { amp: 0.12, speed: 2.4, phase: i * 1.3 }));
    g.add(base);
    // vestito e busto
    g.add(mesh(G.cone(0.5, 0.8, 32), fabric(b), { p: [0, 1.55, 0.1] }));
    g.add(at(blob('#f6dfc8', [0.42, 0.44, 0.4], 0.45), 0, 2.08, 0.15));
    // capelli al vento
    g.add(mesh(G.dome(PI / 1.8, 32), fabric(a), { p: [0, 2.14, 0.1], s: [0.46, 0.46, 0.44], r: [-0.3, 0, 0] }));
    for (const s of [-1, 1]) {
      g.add(eye(0.14, { iris: a, angry: s * 0.3, look: -s * 0.15 }, s * 0.16, 2.12, 0.48));
      g.add(tag(grp(mesh(G.capsule(0.13, 0.75, 12), fabric(a), { p: [0, -0.4, 0] })), 'flap', { amp: 0.2, speed: 0.9, phase: s }).translateX(s * 0.4).translateY(2.2).rotateZ(s * 0.6));
      g.add(cheek(s * 0.28, 1.98, 0.42, 0.07));
      g.add(limb([s * 0.35, 1.75, 0.15], [s * 0.85, 1.9, 0.4], 0.07, plastic('#f6dfc8', 0.45)));
      // fulmini in mano
      const bolt = tag(grp(mesh(G.extrude('bolt', BOLT, 0.05, 0.015), glow(c, 2.8), { s: 0.85, shadow: false }), halo(c, 1.0, 0, 0, 0.05, 0.5)), 'pulse', { amp: 0.14, speed: 2.2, phase: s });
      bolt.position.set(s * 0.98, 1.75, 0.45);
      bolt.rotation.z = s * 0.25;
      g.add(bolt);
    }
    g.add(at(smile(0.12, '#6a1830'), 0, 1.93, 0.52));
    const cr = crown(0.27, c, '#5aa8ff');
    cr.position.set(0, 2.5, 0.1);
    g.add(cr);
    return g;
  },
  lord([a, b, c]) {
    const g = new THREE.Group();
    // trono con braccioli, cuscino e bordi d'oro
    const wood = plastic(b, 0.6);
    const gold = metal(a, 0.2);
    g.add(mesh(G.box(2.0, 0.12, 1.5, 0.04), gold, { p: [0, 0.06, -0.05] }));
    g.add(mesh(G.box(1.8, 2.3, 0.3, 0.1), wood, { p: [0, 1.25, -0.62] }));
    g.add(mesh(G.box(1.5, 1.9, 0.08, 0.04), fabric(c), { p: [0, 1.3, -0.46] }));
    g.add(mesh(G.box(1.8, 0.5, 1.1, 0.1), wood, { p: [0, 0.35, -0.1] }));
    for (const s of [-1, 1]) {
      g.add(mesh(G.box(0.28, 0.75, 1.0, 0.08), wood, { p: [s * 0.86, 0.85, -0.1] }));
      g.add(mesh(G.sphere(20), gold, { p: [s * 0.86, 1.28, 0.38], s: 0.17 }));
      g.add(mesh(G.cone(0.14, 0.5, 4), gold, { p: [s * 0.8, 2.6, -0.62] }));
    }
    g.add(mesh(G.sphere(20), gloss(c), { p: [0, 2.55, -0.6], s: 0.2 }));
    // il Signore: un dado bianco e oro con mantello
    const body = new THREE.Group();
    body.add(mesh(G.box(1.1, 1.1, 1.1, 0.24), plastic('#ffffff', 0.95)));
    for (const s of [-1, 1]) {
      body.add(eye(0.18, { iris: c, angry: s * 0.6, look: -s * 0.15 }, s * 0.23, 0.16, 0.5));
      for (const y of [-0.34, 0.4]) body.add(mesh(G.sphere(16), gold, { p: [s * 0.38, y, 0.55], s: [0.08, 0.08, 0.04] }));
      for (const [y, z] of [[0.3, 0.25], [-0.3, -0.25], [0, 0]]) body.add(mesh(G.sphere(12), gold, { p: [s * 0.55, y, z], s: [0.04, 0.08, 0.08] }));
      const arm = tag(grp(limb([0, 0, 0], [s * 0.3, -0.3, 0.25], 0.1, plastic('#ffffff', 0.9)), mesh(G.sphere(12), plastic('#ffffff', 0.9), { p: [s * 0.32, -0.33, 0.28], s: 0.14 })), 'flap', { amp: 0.1, speed: 0.6, phase: s });
      arm.position.set(s * 0.55, -0.1, 0.15);
      body.add(arm);
    }
    body.add(at(smile(0.21, '#4a0a20'), 0, -0.17, 0.55));
    body.add(mesh(G.box(0.44, 0.1, 0.1, 0.03), plastic(b, 0.6), { p: [-0.23, 0.4, 0.55], r: [0, 0, -0.35] }));
    body.add(mesh(G.box(0.44, 0.1, 0.1, 0.03), plastic(b, 0.6), { p: [0.23, 0.4, 0.55], r: [0, 0, 0.35] }));
    const cr = crown(0.44, a, c);
    cr.position.set(0, 0.72, 0);
    body.add(cr);
    body.add(mesh(G.box(1.3, 1.2, 0.08, 0.03), fabric(c), { p: [0, -0.1, -0.6] }));
    body.position.set(0, 1.17, 0.12);
    g.add(body);
    // scettro col dado
    g.add(limb([1.05, 0.15, 0.55], [1.05, 1.9, 0.55], 0.05, gold));
    g.add(tag(at(miniDie(0.3, c, '#ffffff'), 1.05, 2.1, 0.55), 'spin', { speed: 0.9 }));
    g.add(halo(c, 1.2, 1.05, 2.1, 0.6, 0.5));
    // dadi che orbitano
    const orbit = tag(new THREE.Group(), 'spin', { speed: 0.45 });
    [[a, 0.6], ['#ffffff', 2.7], [c, 4.8]].forEach(([col, an], i) => orbit.add(tag(at(miniDie(0.19, col, col === '#ffffff' ? b : '#ffffff'), Math.cos(an) * 1.45, 0.25 * i, Math.sin(an) * 1.1), 'spin', { speed: 1.4, axis: 'x' })));
    orbit.position.y = 2.2;
    g.add(orbit);
    return g;
  },
};

/* ---------------- immagini ---------------- */
export function bossKey(boss) {
  return `${boss.look}|${(boss.colors || []).join(',')}`;
}

export function bossImage(key, size) {
  return renderThumb(
    `boss3d:${key}`,
    (_T, r) => {
      const [look, cols] = key.split('|');
      const colors = (cols || '').split(',');
      const obj = (LOOKS[look] || LOOKS.frog)(colors);
      obj.rotation.y = -0.22;
      return sceneFor(obj, { azimuth: 0.2, elev: 0.12, fov: 26, fill: 0.9 }, r);
    },
    size,
  );
}
registerArt('boss', (key, size) => bossImage(key, size));

let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
.boss3d{display:inline-grid;place-items:center;vertical-align:middle;overflow:visible}
.boss3d>.art3d-img{transform-origin:50% 92%;animation:b3-idle 3.2s ease-in-out infinite;filter:drop-shadow(0 4px 4px rgba(20,10,30,.25))}
@keyframes b3-idle{0%,100%{transform:scale(1,1) rotate(0)}30%{transform:scale(1.025,.975) rotate(-1.2deg)}60%{transform:scale(.985,1.02) rotate(1deg)}}
.bi-art .boss3d>.art3d-img{animation:b3-taunt 1.1s cubic-bezier(.3,1.6,.5,1) both,b3-idle 2.6s 1.1s ease-in-out infinite}
@keyframes b3-taunt{0%{transform:translateY(60px) scale(.3);opacity:0}55%{transform:translateY(-12px) scale(1.12,.9);opacity:1}75%{transform:scale(.95,1.06) rotate(-4deg)}100%{transform:none}}
.rs-boss .boss3d>.art3d-img,.boss3d.is-defeat>.art3d-img{animation:b3-defeat 1.4s ease-out both}
@keyframes b3-defeat{0%{transform:none}20%{transform:translateX(-6px) rotate(-6deg)}40%{transform:translateX(6px) rotate(6deg)}100%{transform:translateY(10px) rotate(-14deg) scale(.92);filter:grayscale(.4) drop-shadow(0 4px 4px rgba(20,10,30,.25))}}
.boss3d.is-win>.art3d-img{animation:b3-win .6s ease-in-out infinite alternate}
@keyframes b3-win{to{transform:translateY(-10px) scale(1.05)}}
@media (prefers-reduced-motion:reduce){.boss3d>.art3d-img{animation:none!important}}`;
  document.head.append(st);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Segnaposto HTML del boss 3D (l'SVG resta come riserva). */
export function bossArtHtml(boss, size, fallback) {
  if (!has3D()) return fallback;
  css();
  return `<span class="art3d boss3d boss-${esc(boss.look)}" data-kind="boss" data-key="${esc(bossKey(boss))}" data-size="${size}" style="width:${size}px;height:${size}px">${fallback}</span>`;
}

export { LOOKS as BOSS_LOOKS };
