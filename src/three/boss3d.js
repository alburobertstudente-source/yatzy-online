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
import { G, mesh, limb, plastic, metal, glow, gloss, fabric, rubber, cached } from './avatarKit.js';
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
const LOOKS = {
  frog([a, b, c]) {
    const g = new THREE.Group();
    g.add(blob(a, [1, 0.78, 0.85]).translateY(0.75));
    g.add(blob('#f2f8c0', [0.72, 0.5, 0.5], 0.6).translateY(0.62).translateZ(0.42));
    for (const s of [-1, 1]) {
      const e = new THREE.Group();
      e.add(blob(a, 0.3));
      const ey = eyeBall(0.24, { iris: '#7a4a10' });
      ey.position.set(0, 0.04, 0.12);
      e.add(ey);
      e.position.set(s * 0.45, 1.42, 0.25);
      g.add(e);
      g.add(blob(b, [0.36, 0.2, 0.5]).translateX(s * 0.72).translateY(0.12).translateZ(0.35));
    }
    const m = smile(0.42, '#a8253a');
    m.position.set(0, 0.92, 0.72);
    g.add(m);
    for (const s of [-1, 1]) g.add(mesh(G.sphere(16), plastic('#ff8aa0', 0.4), { p: [s * 0.62, 1.0, 0.6], s: [0.12, 0.07, 0.05] }));
    const cr = crown(0.32, c);
    cr.position.set(0, 1.78, -0.05);
    g.add(cr);
    return g;
  },
  crab([a, b, c]) {
    const g = new THREE.Group();
    g.add(blob(a, [1.15, 0.75, 0.9]).translateY(0.75));
    for (const s of [-1, 1]) {
      g.add(limb([s * 0.12, 1.05, 0.3], [s * 0.2, 1.55, 0.35], 0.06, plastic(b)));
      const ey = eyeBall(0.18, { angry: s, iris: '#1a1a1a' });
      ey.position.set(s * 0.2, 1.62, 0.38);
      g.add(ey);
      // chele
      g.add(limb([s * 0.95, 0.75, 0.2], [s * 1.35, 1.05, 0.45], 0.12, plastic(a)));
      const claw = new THREE.Group();
      claw.add(blob(a, [0.36, 0.26, 0.24]));
      claw.add(mesh(G.cone(0.13, 0.4, 16), plastic(a), { p: [0.05, 0.28, 0], r: [0, 0, -0.5 * s] }));
      claw.add(mesh(G.cone(0.1, 0.32, 16), plastic(b), { p: [-0.12, 0.25, 0], r: [0, 0, 0.6 * s] }));
      claw.position.set(s * 1.45, 1.25, 0.5);
      g.add(claw);
      for (let i = 0; i < 3; i++) g.add(limb([s * 0.7, 0.55, 0.15 - i * 0.25], [s * 1.15, 0.05, 0.3 - i * 0.3], 0.06, plastic(b)));
    }
    const m = smile(0.3, '#6a1810');
    m.position.set(0, 0.82, 0.78);
    g.add(m);
    return g;
  },
  witch([a, b, c]) {
    const g = new THREE.Group();
    g.add(mesh(G.cone(0.85, 1.4, 40), fabric(b), { p: [0, 0.7, 0] }));
    g.add(blob('#b8e07a', [0.55, 0.58, 0.52], 0.5).translateY(1.55));
    for (const s of [-1, 1]) {
      const ey = eyeBall(0.15, { iris: '#5a2a8a', angry: -s * 0.6 });
      ey.position.set(s * 0.2, 1.62, 0.43);
      g.add(ey);
    }
    g.add(mesh(G.cone(0.08, 0.38, 16), plastic('#8fc05a'), { p: [0, 1.5, 0.6], r: [PI / 2.3, 0, 0] }));
    const m = smile(0.18, '#4a1030');
    m.position.set(0, 1.33, 0.47);
    g.add(m);
    g.add(mesh(G.cyl(0.95, 0.95, 0.06, 48), fabric(a), { p: [0, 1.95, 0] }));
    g.add(mesh(G.cone(0.48, 1.1, 32), fabric(a), { p: [0.05, 2.5, -0.05], r: [0, 0, -0.18] }));
    g.add(mesh(G.cyl(0.5, 0.5, 0.1, 32), fabric(c), { p: [0, 2.03, 0] }));
    // capelli e bacchetta
    for (const s of [-1, 1]) g.add(mesh(G.capsule(0.12, 0.5, 12), fabric('#3a2050'), { p: [s * 0.52, 1.45, -0.05], r: [0, 0, s * 0.3] }));
    g.add(limb([0.75, 0.9, 0.3], [1.15, 1.6, 0.5], 0.04, plastic('#6a3a1a')));
    const star = mesh(G.sphere(16), glow(c, 3), { p: [1.18, 1.66, 0.52], s: 0.1, shadow: false });
    g.add(star);
    return g;
  },
  golem([a, b, c]) {
    const g = new THREE.Group();
    const ice = new THREE.MeshPhysicalMaterial({ color: a, roughness: 0.15, transmission: 0.4, thickness: 0.6, clearcoat: 1, ior: 1.3 });
    g.add(mesh(G.box(1.5, 1.2, 1.0, 0.25), ice, { p: [0, 0.95, 0] }));
    g.add(mesh(G.box(0.95, 0.75, 0.8, 0.2), ice, { p: [0, 1.85, 0.05] }));
    for (const s of [-1, 1]) {
      g.add(mesh(G.box(0.45, 0.95, 0.5, 0.15), ice, { p: [s * 1.0, 0.85, 0.1], r: [0, 0, s * 0.15] }));
      g.add(mesh(G.box(0.5, 0.5, 0.5, 0.15), ice, { p: [s * 0.45, 0.25, 0] }));
      const ey = eyeBall(0.12, { iris: b, angry: s * 0.5 });
      ey.position.set(s * 0.22, 1.95, 0.45);
      g.add(ey);
      g.add(mesh(G.cone(0.12, 0.45, 6), ice, { p: [s * 0.35, 2.35, 0], r: [0, 0, -s * 0.3] }));
    }
    const m = smile(0.22, '#1d3f70');
    m.position.set(0, 1.7, 0.45);
    g.add(m);
    g.add(mesh(G.sphere(16), glow(c, 2), { p: [0, 1.0, 0.52], s: 0.12, shadow: false }));
    return g;
  },
  pirate([a, b, c]) {
    const g = new THREE.Group();
    g.add(blob(b, [0.75, 0.75, 0.6]).translateY(0.7));
    for (let i = 0; i < 4; i++) g.add(mesh(G.torus(0.62 - Math.abs(i - 1.5) * 0.05, 0.045, PI * 2, 40), fabric('#ffffff'), { p: [0, 0.45 + i * 0.16, 0], r: [PI / 2, 0, 0] }));
    g.add(blob('#e8b48a', [0.55, 0.55, 0.5], 0.45).translateY(1.55));
    const ey = eyeBall(0.15, { iris: '#2a5a8a', angry: 0.4 });
    ey.position.set(0.2, 1.62, 0.42);
    g.add(ey);
    g.add(mesh(G.cyl(0.15, 0.15, 0.06, 24), plastic('#151515', 0.5), { p: [-0.2, 1.62, 0.47], r: [PI / 2, 0, 0] }));
    g.add(mesh(G.torus(0.56, 0.02, PI * 2, 40), plastic('#151515'), { p: [0, 1.7, 0], r: [0.25, 0, 0.2] }));
    g.add(mesh(G.capsule(0.22, 0.4, 16), fabric('#5a3418'), { p: [0, 1.25, 0.32], r: [0, 0, PI / 2] }));
    const m = smile(0.17, '#5a1820');
    m.position.set(0, 1.38, 0.46);
    g.add(m);
    // tricorno
    const hat = new THREE.Group();
    hat.add(mesh(G.cyl(0.75, 0.75, 0.08, 3), fabric('#1f1a24'), { r: [0, PI / 6, 0] }));
    hat.add(mesh(G.dome(PI / 2, 32), fabric('#1f1a24'), { s: [0.5, 0.45, 0.5] }));
    hat.add(mesh(G.sphere(16), plastic('#ffffff', 0.6), { p: [0, 0.22, 0.45], s: [0.12, 0.1, 0.03] }));
    hat.position.set(0, 1.98, 0);
    g.add(hat);
    g.add(limb([0.7, 0.9, 0.2], [1.1, 1.3, 0.45], 0.06, metal(c, 0.2)));
    return g;
  },
  dragon([a, b, c]) {
    const g = new THREE.Group();
    g.add(blob(a, [0.9, 0.85, 0.8]).translateY(0.85));
    g.add(blob('#ffe0a0', [0.6, 0.62, 0.4], 0.5).translateY(0.75).translateZ(0.48));
    const head = new THREE.Group();
    head.add(blob(a, [0.6, 0.5, 0.55]));
    head.add(blob(a, [0.4, 0.28, 0.4]).translateZ(0.42).translateY(-0.08));
    for (const s of [-1, 1]) {
      const ey = eyeBall(0.15, { iris: '#ff3a10', angry: s * 0.6 });
      ey.position.set(s * 0.25, 0.18, 0.38);
      head.add(ey);
      head.add(mesh(G.cone(0.1, 0.42, 16), plastic(c), { p: [s * 0.3, 0.5, -0.05], r: [-0.4, 0, -s * 0.3] }));
      head.add(mesh(G.sphere(10), plastic('#3a1a08'), { p: [s * 0.1, 0.0, 0.8], s: 0.04 }));
      // ali
      const wing = mesh(G.extrude('wing', () => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.quadraticCurveTo(0.6, 0.9, 1.2, 0.8);
        sh.lineTo(1.0, 0.4);
        sh.lineTo(1.1, 0.1);
        sh.lineTo(0.8, -0.05);
        sh.lineTo(0.9, -0.35);
        sh.quadraticCurveTo(0.4, -0.3, 0, 0);
        return sh;
      }, 0.04, 0.02), fabric(b), { p: [s * 0.75, 1.15, -0.35], s: [s, 1, 1], r: [0, s * 0.5, 0] });
      g.add(wing);
    }
    head.position.set(0, 1.65, 0.1);
    g.add(head);
    g.add(mesh(G.cone(0.2, 0.9, 16), plastic(a), { p: [0.6, 0.4, -0.6], r: [1.2, 0, -0.9] }));
    // tesoro
    for (let i = 0; i < 7; i++) g.add(mesh(G.cyl(0.12, 0.12, 0.04, 24), metal(c, 0.2), { p: [-0.6 + i * 0.2, 0.05 + (i % 2) * 0.04, 0.75 + (i % 3) * 0.05], r: [0.2 * (i % 3), 0, 0] }));
    return g;
  },
  wizard([a, b, c]) {
    const g = new THREE.Group();
    g.add(mesh(G.cone(0.8, 1.5, 40), fabric(a), { p: [0, 0.75, 0] }));
    g.add(blob('#f0c8a0', [0.5, 0.5, 0.48], 0.45).translateY(1.6));
    g.add(mesh(G.cone(0.42, 0.9, 32), fabric('#f2f2f2'), { p: [0, 1.15, 0.28], r: [PI, 0, 0] }));
    for (const s of [-1, 1]) {
      const ey = eyeBall(0.13, { iris: c, angry: s * 0.4 });
      ey.position.set(s * 0.18, 1.68, 0.4);
      g.add(ey);
    }
    g.add(mesh(G.cyl(0.85, 0.85, 0.06, 48), fabric(b), { p: [0, 2.0, 0] }));
    g.add(mesh(G.cone(0.5, 1.3, 32), fabric(b), { p: [-0.1, 2.62, 0], r: [0, 0, 0.25] }));
    for (let i = 0; i < 5; i++) g.add(mesh(G.sphere(8), glow(c, 2.5), { p: [Math.sin(i * 1.3) * 0.3, 2.2 + i * 0.18, 0.28], s: 0.04, shadow: false }));
    g.add(limb([-0.7, 0.2, 0.35], [-0.85, 2.0, 0.35], 0.05, plastic('#6a3a1a')));
    g.add(mesh(G.sphere(24), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 1.5, transmission: 0.5, roughness: 0.05 }), { p: [-0.85, 2.12, 0.35], s: 0.16 }));
    return g;
  },
  vampire([a, b, c]) {
    const g = new THREE.Group();
    g.add(mesh(G.cone(0.85, 1.4, 40), fabric(b), { p: [0, 0.7, 0] }));
    g.add(mesh(G.cone(0.9, 1.5, 40, ), fabric(a), { p: [0, 0.78, -0.08], s: [1.05, 1, 0.9] }));
    g.add(blob(c === '#f2f2f2' ? '#e8e4f0' : '#e8e4f0', [0.52, 0.56, 0.5], 0.5).translateY(1.6));
    g.add(mesh(G.dome(PI / 2.2, 40), plastic('#1a1220', 0.8), { p: [0, 1.66, -0.02], s: [0.55, 0.5, 0.54] }));
    for (const s of [-1, 1]) {
      const ey = eyeBall(0.13, { iris: '#e0283d', angry: s * 0.6 });
      ey.position.set(s * 0.19, 1.65, 0.42);
      g.add(ey);
      g.add(mesh(G.cone(0.035, 0.12, 12), plastic('#ffffff', 0.9), { p: [s * 0.08, 1.33, 0.5], r: [PI, 0, 0] }));
      g.add(mesh(G.extrude('collar', () => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.lineTo(0.5, 0.9);
        sh.lineTo(0.15, 0.55);
        sh.lineTo(0, 0);
        return sh;
      }, 0.03, 0.01), fabric(a), { p: [s * 0.45, 1.5, -0.1], s: [s, 1, 1] }));
    }
    const m = smile(0.15, '#5a0a18');
    m.position.set(0, 1.4, 0.46);
    g.add(m);
    g.add(mesh(G.sphere(16), gloss('#e0283d'), { p: [0, 1.15, 0.55], s: 0.08 }));
    return g;
  },
  storm([a, b, c]) {
    const g = new THREE.Group();
    const cloud = plastic('#eef4ff', 0.3);
    [[0, 0.9, 0, 0.75], [-0.6, 0.75, 0, 0.5], [0.6, 0.75, 0, 0.55], [-0.3, 1.25, 0.05, 0.5], [0.35, 1.3, 0, 0.45]].forEach(([x, y, z, r]) => g.add(mesh(G.sphere(32), cloud, { p: [x, y, z], s: r })));
    g.add(blob('#f6dfc8', [0.42, 0.44, 0.4], 0.45).translateY(1.75).translateZ(0.15));
    for (const s of [-1, 1]) {
      const ey = eyeBall(0.12, { iris: a, angry: s * 0.3 });
      ey.position.set(s * 0.15, 1.8, 0.48);
      g.add(ey);
      g.add(mesh(G.capsule(0.12, 0.7, 12), fabric(a), { p: [s * 0.42, 1.6, 0], r: [0, 0, s * 0.5] }));
    }
    const m = smile(0.12, '#6a1830');
    m.position.set(0, 1.6, 0.52);
    g.add(m);
    const cr = crown(0.26, c, '#5aa8ff');
    cr.position.set(0, 2.12, 0.1);
    g.add(cr);
    for (const s of [-1, 1]) {
      const bolt = mesh(G.extrude('bolt', () => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0.6);
        sh.lineTo(0.18, 0.1);
        sh.lineTo(0.06, 0.12);
        sh.lineTo(0.15, -0.4);
        sh.lineTo(-0.12, 0.18);
        sh.lineTo(0.0, 0.16);
        return sh;
      }, 0.04, 0.01), glow(c, 2.5), { p: [s * 0.9, 0.4, 0.3], r: [0, 0, s * 0.2] });
      g.add(bolt);
    }
    return g;
  },
  lord([a, b, c]) {
    const g = new THREE.Group();
    // trono
    g.add(mesh(G.box(1.8, 2.0, 0.3, 0.1), plastic(b, 0.6), { p: [0, 1.0, -0.6] }));
    g.add(mesh(G.box(1.8, 0.5, 1.1, 0.1), plastic(b, 0.6), { p: [0, 0.25, -0.1] }));
    // signore a forma di dado
    g.add(mesh(G.box(1.1, 1.1, 1.1, 0.22), plastic('#ffffff', 0.9), { p: [0, 1.05, 0.1] }));
    for (const s of [-1, 1]) {
      const ey = eyeBall(0.16, { iris: c, angry: s * 0.6 });
      ey.position.set(s * 0.22, 1.22, 0.62);
      g.add(ey);
      for (const y of [0.75, 1.4]) g.add(mesh(G.sphere(16), plastic(b, 0.8), { p: [s * 0.38, y, 0.66], s: [0.08, 0.08, 0.03] }));
      g.add(mesh(G.capsule(0.1, 0.4, 12), fabric(c), { p: [s * 0.7, 0.9, 0.2], r: [0.3, 0, s * 0.6] }));
    }
    const m = smile(0.2, '#4a0a20');
    m.position.set(0, 0.9, 0.64);
    g.add(m);
    const cr = crown(0.42, a, c);
    cr.position.set(0, 1.78, 0.1);
    g.add(cr);
    g.add(mesh(G.box(1.2, 0.5, 0.06, 0.03), fabric(c), { p: [0, 0.45, 0.55], r: [-0.2, 0, 0] }));
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
// riferimento per evitare avvisi di import inutilizzati
void rubber;
