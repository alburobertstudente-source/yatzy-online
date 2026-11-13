/**
 * Mondi 3D: oggetti di scena (alberi, rocce, palme, torri…) e la composizione
 * di ciascuno dei 10 mondi. Le misure sono in unità di mondo (1 = 10 px di mappa).
 */
import { THREE } from './core.js';

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* oggetti di scena                                                    */
/* ------------------------------------------------------------------ */
const P = {
  tree(K, c1 = '#3f9a4a', c2 = '#5cb85a', trunk = '#8a5a30') {
    const { L } = K;
    return L.group(L.cyl(0.32, 0.5, 1.8, trunk), L.sph(1.75, c1, 0, 2.7, 0, 1, 0.9, 1), L.sph(1.25, c2, -0.7, 3.4, 0.5), L.sph(1.1, c2, 0.9, 3.1, 0.3), L.sph(0.9, c1, 0.2, 4.1, -0.2));
  },
  pine(K, c = '#2f7a55', snow = false, trunk = '#7a4a2a') {
    const { L } = K;
    const g = L.group(L.cyl(0.28, 0.4, 1, trunk));
    [[1.7, 1.9, 0.8], [1.35, 1.7, 1.9], [0.95, 1.5, 2.9]].forEach(([r, h, y]) => {
      g.add(L.cone(r, h, c, 0, y, 0, undefined, 10));
      if (snow) g.add(L.cone(r * 0.72, h * 0.62, '#ffffff', 0, y + h * 0.42, 0, { rough: 0.9 }, 10));
    });
    return g;
  },
  palm(K, lean = 0.5) {
    const { L } = K;
    const g = L.group();
    let x = 0;
    for (let i = 0; i < 6; i++) {
      const s = L.cyl(0.26 - i * 0.015, 0.3 - i * 0.015, 0.75, i % 2 ? '#a8763e' : '#946432', x, i * 0.68, 0);
      s.rotation.z = -lean * 0.12 * i * 0.4;
      g.add(s);
      x += lean * 0.07 * i;
    }
    const top = 6 * 0.68;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const leaf = L.sph(1, i % 2 ? '#3fae4a' : '#58c858', 0, 0, 0, 1.55, 0.13, 0.42);
      const piv = L.group(leaf);
      leaf.position.set(1.35, -0.25, 0);
      leaf.rotation.z = -0.38;
      piv.rotation.y = a;
      piv.position.set(x, top + 0.15, 0);
      g.add(piv);
    }
    g.add(L.sph(0.3, '#6a4020', x + 0.25, top - 0.15, 0.2), L.sph(0.3, '#6a4020', x - 0.2, top - 0.2, -0.1));
    return g;
  },
  rock(K, c = '#9aa2b0', s = 1) {
    const { L, rnd } = K;
    const g = L.group(L.ico(1 * s, c, 0, 0.45 * s, 0, 1.2, 0.75, 1, undefined, 1));
    g.add(L.ico(0.55 * s, c, 0.9 * s, 0.25 * s, 0.4 * s, 1, 0.8, 1, undefined, 0));
    g.rotation.y = rnd(0, TAU);
    return g;
  },
  reeds(K) {
    const { L, rnd } = K;
    const g = L.group();
    for (let i = 0; i < 5; i++) {
      const h = rnd(2, 3.4);
      const x = rnd(-0.6, 0.6);
      const z = rnd(-0.4, 0.4);
      const st = L.cyl(0.07, 0.09, h, '#4f9a32', x, 0, z, undefined, 8);
      st.rotation.z = rnd(-0.16, 0.16);
      g.add(st);
      if (i % 2 === 0) g.add(L.cyl(0.17, 0.17, 0.75, '#7a4a22', x - st.rotation.z * h * 0.9, h - 0.5, z, { rough: 0.9 }, 10));
    }
    return g;
  },
  lotus(K, c = '#ff9ac4', c2 = '#ffd0e4') {
    const { L } = K;
    const g = L.group(L.cyl(0.95, 0.95, 0.1, '#4aa23c'));
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ring * 0.4;
        const r = ring ? 0.28 : 0.52;
        const pt = L.sph(0.36, ring ? c2 : c, Math.cos(a) * r, 0.3 + ring * 0.22, Math.sin(a) * r, 1.15, 0.5, 0.62);
        pt.rotation.y = -a;
        pt.rotation.z = 0.5 + ring * 0.35;
        g.add(pt);
      }
    }
    g.add(L.sph(0.2, '#ffd83a', 0, 0.55, 0));
    return g;
  },
  lily(K, r, c = '#58b044', h = 0.22) {
    const geo = new THREE.CylinderGeometry(r, r * 0.96, h, 40, 1, false, 0.35, TAU - 0.5);
    const m = new THREE.Mesh(geo, K.mat(c, { rough: 0.5, coat: 0.5 }));
    m.position.y = h / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    const veins = K.L.group(m);
    for (let i = 0; i < 6; i++) {
      const v = K.L.box(r * 0.8, 0.03, 0.06, '#3f8a34', 0, h, 0);
      const piv = K.L.group(v);
      v.position.x = r * 0.45;
      piv.rotation.y = 0.9 + (i / 6) * (TAU - 1.1);
      veins.add(piv);
    }
    return veins;
  },
  mushroom(K, c = '#e8384f', glow = false) {
    const { L } = K;
    const g = L.group(L.cyl(0.22, 0.3, 0.8, '#fff4e0'), L.sph(0.75, c, 0, 0.75, 0, 1, 0.62, 1, glow ? { emi: c, ei: 0.7 } : undefined));
    [[0.3, 1.1, 0.25], [-0.35, 1.05, 0.1], [0, 1.2, -0.25], [0.1, 1.0, 0.55]].forEach(([x, y, z]) => g.add(L.sph(0.13, '#ffffff', x, y, z)));
    return g;
  },
  tuft(K, c = '#5ab84a') {
    const { L, rnd } = K;
    const g = L.group();
    for (let i = 0; i < 5; i++) {
      const b = L.cone(0.14, rnd(0.6, 1.1), c, rnd(-0.3, 0.3), 0, rnd(-0.2, 0.2), undefined, 6);
      b.rotation.z = rnd(-0.3, 0.3);
      g.add(b);
    }
    return g;
  },
  flower(K, c = '#ffffff') {
    const { L } = K;
    const g = L.group(L.cyl(0.05, 0.05, 0.6, '#3f8a34', 0, 0, 0, undefined, 6), L.sph(0.14, '#ffd83a', 0, 0.68, 0));
    for (let i = 0; i < 5; i++) g.add(L.sph(0.16, c, Math.cos((i / 5) * TAU) * 0.2, 0.64, Math.sin((i / 5) * TAU) * 0.2, 1, 0.5, 1));
    return g;
  },
  shell(K, c = '#ffd6c0') {
    const { L } = K;
    const g = L.group(L.sph(0.5, c, 0, 0.12, 0, 1, 0.45, 0.85));
    for (let i = -2; i <= 2; i++) g.add(L.box(0.05, 0.05, 0.7, '#e8a890', i * 0.17, 0.3, 0));
    return g;
  },
  starfish(K, c = '#ff8a3a') {
    const { L } = K;
    const g = L.group(L.sph(0.3, c, 0, 0.12, 0, 1, 0.5, 1));
    for (let i = 0; i < 5; i++) {
      const arm = L.sph(0.42, c, 0, 0, 0, 1, 0.3, 0.38);
      const piv = L.group(arm);
      arm.position.set(0.42, 0.1, 0);
      piv.rotation.y = (i / 5) * TAU;
      g.add(piv);
    }
    return g;
  },
  umbrella(K, c1 = '#ff5a66', c2 = '#ffffff') {
    const { L } = K;
    const g = L.group(L.cyl(0.07, 0.07, 2.6, '#f0e6d0', 0, 0, 0, undefined, 8));
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.ConeGeometry(2, 0.9, 3, 1, false, (i / 8) * TAU, TAU / 8);
      const m = new THREE.Mesh(geo, K.mat(i % 2 ? c1 : c2, { rough: 0.7 }));
      m.position.y = 2.7;
      m.castShadow = true;
      g.add(m);
    }
    g.add(L.sph(0.15, c1, 0, 3.2, 0));
    g.rotation.z = 0.12;
    return g;
  },
  ball(K) {
    const { L } = K;
    return L.group(L.sph(0.55, '#ffffff', 0, 0.55, 0), L.sph(0.56, '#ff5a66', 0, 0.55, 0, 1, 1, 0.42), L.sph(0.565, '#3d9bff', 0, 0.55, 0, 0.42, 1, 1));
  },
  sandcastle(K, s = 1, c = '#f2cf8a', roof = '#ff6a5a') {
    const { L } = K;
    const g = L.group(L.cyl(1.5, 1.8, 0.9, c, 0, 0, 0, { rough: 0.95, coat: 0 }));
    g.add(L.cyl(0.85, 0.95, 1.5, c, 0, 0.9, 0, { rough: 0.95, coat: 0 }), L.cone(1, 1, roof, 0, 2.4, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.6;
      g.add(L.cyl(0.42, 0.48, 1.5, c, Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35, { rough: 0.95, coat: 0 }), L.cone(0.5, 0.6, roof, Math.cos(a) * 1.35, 1.5, Math.sin(a) * 1.35));
    }
    const flag = L.box(0.5, 0.3, 0.04, '#ffd23f', 0.3, 3.7, 0);
    g.add(L.cyl(0.03, 0.03, 0.8, '#ffffff', 0, 3.3, 0, undefined, 6), flag);
    g.scale.setScalar(s);
    return g;
  },
  snowman(K) {
    const { L } = K;
    return L.group(L.sph(0.85, '#ffffff', 0, 0.75, 0), L.sph(0.62, '#ffffff', 0, 1.8, 0), L.sph(0.45, '#ffffff', 0, 2.6, 0), L.cone(0.09, 0.45, '#ff8a2a', 0, 2.4, 0.5).rotateX(Math.PI / 2), L.sph(0.06, '#222', -0.16, 2.72, 0.4), L.sph(0.06, '#222', 0.16, 2.72, 0.4), L.cyl(0.5, 0.5, 0.08, '#2a2a3a', 0, 2.95, 0), L.cyl(0.32, 0.32, 0.5, '#2a2a3a', 0, 3, 0), L.torus(0.5, 0.13, '#e8384f', 0, 2.25, 0));
  },
  crystal(K, c = '#8fe0ff', s = 1, glow = 0.9) {
    const { L } = K;
    const o = { emi: c, ei: glow, rough: 0.15, coat: 1, flat: true };
    const g = L.group(L.ico(0.55 * s, c, 0, 1.1 * s, 0, 1, 2.2, 1, o), L.ico(0.36 * s, c, 0.6 * s, 0.7 * s, 0.2 * s, 1, 2, 1, o), L.ico(0.3 * s, c, -0.5 * s, 0.55 * s, -0.25 * s, 1, 1.9, 1, o));
    g.children[1].rotation.z = -0.4;
    g.children[2].rotation.z = 0.45;
    return g;
  },
  igloo(K) {
    const { L } = K;
    return L.group(L.sph(1.6, '#f4fbff', 0, 0, 0, 1, 0.85, 1), L.box(0.9, 0.9, 0.9, '#e2f0ff', 0, 0, 1.4), L.box(0.5, 0.6, 0.2, '#2a3a5a', 0, 0, 1.8));
  },
  barrel(K, c = '#a86a32') {
    const { L } = K;
    return L.group(L.cyl(0.62, 0.62, 1.2, c), L.cyl(0.7, 0.7, 0.14, '#5a4a40', 0, 0.22, 0, { metal: 0.6, rough: 0.4 }), L.cyl(0.7, 0.7, 0.14, '#5a4a40', 0, 0.84, 0, { metal: 0.6, rough: 0.4 }), L.cyl(0.52, 0.52, 0.04, '#c88a4a', 0, 1.2, 0));
  },
  crate(K) {
    const { L } = K;
    return L.group(L.box(1.1, 1.1, 1.1, '#b8813e'), L.box(1.16, 0.16, 1.16, '#8a5a26', 0, 0.47, 0));
  },
  boat(K, sail = '#ffffff') {
    const { L } = K;
    const g = L.group(L.sph(1, '#a8632e', 0, 0.2, 0, 1.7, 0.55, 0.8), L.box(2.4, 0.12, 1.1, '#d8a060', 0, 0.42, 0), L.cyl(0.06, 0.06, 2.4, '#6a3f1f', 0, 0.4, 0, undefined, 8));
    const s = L.box(0.06, 1.5, 1.1, sail, 0.05, 1.1, 0, { rough: 0.9 });
    g.add(s);
    return g;
  },
  ship(K) {
    const { L } = K;
    const g = L.group(L.sph(1, '#7a4424', 0, 0.5, 0, 4.4, 1.3, 1.7), L.box(7.4, 0.3, 2.9, '#c08a4c', 0, 1.2, 0), L.box(2.2, 1.3, 2.6, '#8a5028', -2.9, 1.3, 0), L.box(1.4, 0.8, 2.4, '#8a5028', 3.2, 1.3, 0));
    g.add(L.torus(0.0, 0.0, '#000'));
    [[-0.6, 6.2], [1.9, 5]].forEach(([x, h], i) => {
      g.add(L.cyl(0.12, 0.15, h, '#5a3418', x, 1.3, 0, undefined, 10));
      g.add(L.box(0.12, h * 0.42, 3.2 - i * 0.6, '#f2ead8', x + 0.25, 1.3 + h * 0.38, 0, { rough: 0.95 }));
      g.add(L.box(0.12, h * 0.2, 2.2 - i * 0.4, '#f2ead8', x + 0.25, 1.3 + h * 0.84 - h * 0.2, 0, { rough: 0.95 }));
    });
    g.add(L.box(0.06, 0.7, 1, '#15131a', -0.6, 7.6, 0.5), L.sph(0.2, '#ffffff', -0.56, 7.95, 0.5));
    for (let i = -2; i <= 2; i++) g.add(L.sph(0.2, '#2a2a30', i * 1.1, 0.85, 1.55, 1, 1, 0.6, { metal: 0.7, rough: 0.35 }));
    g.add(L.cyl(0.05, 0.05, 2.2, '#5a3418', 4.6, 1.5, 0, undefined, 6).rotateZ(-1.1));
    return g;
  },
  fin(K) {
    const { L } = K;
    const g = L.group(L.cone(0.5, 1.2, '#5a6a80', 0, 0, 0, undefined, 4));
    g.children[0].scale.z = 0.14;
    g.add(L.torus(0.75, 0.07, '#ffffff', 0, 0.03, 0, { op: 0.75 }));
    return g;
  },
  buoy(K) {
    const { L } = K;
    return L.group(L.sph(0.55, '#ff4a4a', 0, 0.3, 0), L.cyl(0.4, 0.4, 0.14, '#ffffff', 0, 0.3, 0), L.cyl(0.06, 0.06, 0.9, '#3a3a40', 0, 0.7, 0, undefined, 6), L.sph(0.14, '#ffe14d', 0, 1.65, 0, 1, 1, 1, { emi: '#ffe14d', ei: 1.4 }));
  },
  islet(K, r = 2.2) {
    const { L } = K;
    return L.group(L.sph(r, '#f2cf8a', 0, 0, 0, 1, 0.32, 1, { rough: 0.95, coat: 0 }), L.torus(r * 0.97, 0.16, '#ffffff', 0, 0.02, 0, { op: 0.8 }));
  },
  cactus(K) {
    const { L } = K;
    const c = '#4fae4a';
    const g = L.group(L.cyl(0.42, 0.45, 2, c), L.sph(0.42, c, 0, 2, 0));
    [[-1, 0.9], [1, 1.25]].forEach(([d, y]) => {
      g.add(L.cyl(0.24, 0.24, 0.7, c, d * 0.6, y, 0).rotateZ((d * Math.PI) / 2), L.cyl(0.24, 0.24, 0.85, c, d * 0.92, y, 0), L.sph(0.24, c, d * 0.92, y + 0.85, 0));
    });
    g.add(L.sph(0.18, '#ff7ab0', 0, 2.42, 0));
    return g;
  },
  bones(K) {
    const { L } = K;
    const g = L.group(L.sph(0.42, '#f6f0e0', 0, 0.4, 0, 1, 0.9, 1.1), L.sph(0.1, '#2a1a10', -0.15, 0.45, 0.38), L.sph(0.1, '#2a1a10', 0.15, 0.45, 0.38));
    [0.6, -0.6].forEach((r) => {
      const b = L.cyl(0.08, 0.08, 1.4, '#f6f0e0', 0.9, 0.08, 0, undefined, 8);
      b.rotation.z = Math.PI / 2;
      b.rotation.y = r;
      g.add(b);
    });
    return g;
  },
  pyramid(K, s = 1) {
    const { L } = K;
    const g = L.group(L.cone(2.6 * s, 2.6 * s, '#e8b060', 0, 0, 0, { rough: 0.9, flat: true }, 4), L.cone(0.7 * s, 0.7 * s, '#ffd86a', 0, 1.93 * s, 0, { metal: 0.8, rough: 0.3, flat: true }, 4));
    g.rotation.y = Math.PI / 4 + 0.25;
    return g;
  },
  volcano(K) {
    const { L } = K;
    return L.group(L.cyl(1.3, 4.2, 4, '#6a2a1c', 0, 0, 0, { flat: true, rough: 0.9 }, 9), L.cyl(1.1, 1.3, 0.3, '#3a1410', 0, 3.9, 0, undefined, 9), L.cyl(1, 1, 0.1, '#ff7a1a', 0, 4.15, 0, { emi: '#ff5a10', ei: 2.6 }), L.box(0.5, 2.6, 0.2, '#ff8a2a', 0.9, 1.2, 1.9, { emi: '#ff5a10', ei: 2.2 }).rotateX(-0.75), L.box(0.4, 2, 0.2, '#ff8a2a', -1.6, 1.4, 1.2, { emi: '#ff5a10', ei: 2.2 }).rotateX(-0.6));
  },
  gold(K, n = 9) {
    const { L, rnd } = K;
    const g = L.group(L.sph(1, '#ffc22a', 0, 0, 0, 1, 0.5, 1, { metal: 0.9, rough: 0.28 }));
    for (let i = 0; i < n; i++) {
      const c = L.cyl(0.26, 0.26, 0.08, '#ffd84a', rnd(-0.9, 0.9), rnd(0.3, 0.6), rnd(-0.8, 0.8), { metal: 0.9, rough: 0.22 }, 14);
      c.rotation.set(rnd(-0.6, 0.6), 0, rnd(-0.6, 0.6));
      g.add(c);
    }
    g.add(L.ico(0.2, '#ff4a6a', 0.3, 0.6, 0.3, 1, 1, 1, { emi: '#ff4a6a', ei: 0.6, rough: 0.1 }), L.ico(0.18, '#4ad8ff', -0.4, 0.55, 0.1, 1, 1, 1, { emi: '#4ad8ff', ei: 0.6, rough: 0.1 }));
    return g;
  },
  tower(K, { wall = '#8a8ea8', roof = '#5a3a8a', h = 4.5, r = 1, win = '#ffd86a' } = {}) {
    const { L } = K;
    const g = L.group(L.cyl(r, r * 1.12, h, wall, 0, 0, 0, { rough: 0.85 }), L.cyl(r * 1.22, r * 1.1, 0.45, wall, 0, h, 0, { rough: 0.85 }), L.cone(r * 1.25, r * 2.1, roof, 0, h + 0.45, 0));
    g.add(L.box(0.36, 0.6, 0.12, win, 0, h * 0.6, r * 1.02, { emi: win, ei: 2.4 }), L.box(0.36, 0.6, 0.12, win, r * 0.8, h * 0.3, r * 0.68, { emi: win, ei: 2.4 }, 0.9));
    return g;
  },
  hut(K, { wall = '#6a4a6a', roof = '#7a3ab8', win = '#8aff6a' } = {}) {
    const { L } = K;
    const g = L.group(L.box(2.6, 1.9, 2.4, wall), L.cone(2.3, 2.4, roof, 0, 1.9, 0, undefined, 4), L.box(0.6, 1.1, 0.12, '#2a1a2a', -0.5, 0, 1.22), L.box(0.6, 0.6, 0.12, win, 0.6, 0.8, 1.22, { emi: win, ei: 2.6 }), L.cyl(0.22, 0.26, 1.1, '#4a3a4a', 0.8, 2.9, -0.3));
    g.children[1].rotation.y = Math.PI / 4;
    g.children[1].rotation.z = 0.06;
    return g;
  },
  cauldron(K, c = '#7aff5a') {
    const { L } = K;
    return L.group(L.sph(1, '#2a2a34', 0, 0.7, 0, 1, 0.8, 1, { metal: 0.6, rough: 0.4 }), L.torus(0.9, 0.12, '#3a3a46', 0, 1.2, 0, { metal: 0.6, rough: 0.4 }), L.cyl(0.84, 0.84, 0.08, c, 0, 1.2, 0, { emi: c, ei: 2.8 }), L.sph(0.2, c, 0.3, 1.5, 0.1, 1, 1, 1, { emi: c, ei: 2.8 }), L.sph(0.13, c, -0.3, 1.75, -0.1, 1, 1, 1, { emi: c, ei: 2.8 }));
  },
  tomb(K) {
    const { L } = K;
    const g = L.group(L.box(0.95, 1.3, 0.3, '#9aa0b4', 0, 0, 0, { rough: 0.9 }), L.sph(0.475, '#9aa0b4', 0, 1.3, 0, 1, 1, 0.32, { rough: 0.9 }), L.box(0.12, 0.6, 0.06, '#5a6074', 0, 0.75, 0.16), L.box(0.4, 0.12, 0.06, '#5a6074', 0, 1.05, 0.16), L.sph(0.8, '#3a5a3a', 0, 0, 0.5, 1, 0.16, 0.8));
    g.rotation.z = K.rnd(-0.1, 0.1);
    return g;
  },
  deadTree(K, c = '#3a2a34') {
    const { L } = K;
    const g = L.group(L.cyl(0.2, 0.42, 3, c, 0, 0, 0, { rough: 0.95 }, 8));
    [[0.9, 1.6, 1.5], [-1, 2.1, 1.3], [0.6, 2.7, 1], [-0.5, 1.2, 0.9]].forEach(([rz, y, len]) => {
      const b = L.cyl(0.07, 0.13, len, c, 0, 0, 0, { rough: 0.95 }, 6);
      const piv = L.group(b);
      piv.position.y = y;
      piv.rotation.z = rz;
      g.add(piv);
    });
    return g;
  },
  pumpkin(K) {
    const { L } = K;
    return L.group(L.sph(0.6, '#ff8a1a', 0, 0.42, 0, 1, 0.75, 1, { emi: '#ff5a00', ei: 0.35 }), L.sph(0.6, '#f07a10', 0, 0.42, 0, 0.6, 0.78, 1.04), L.cyl(0.07, 0.1, 0.25, '#3f6a2a', 0, 0.82, 0, undefined, 6), L.box(0.14, 0.14, 0.05, '#ffe14d', -0.2, 0.5, 0.56, { emi: '#ffe14d', ei: 3 }), L.box(0.14, 0.14, 0.05, '#ffe14d', 0.2, 0.5, 0.56, { emi: '#ffe14d', ei: 3 }));
  },
  lantern(K, c = '#ffd86a', pole = '#3a3a46') {
    const { L } = K;
    return L.group(L.cyl(0.07, 0.1, 2.2, pole, 0, 0, 0, undefined, 8), L.box(0.42, 0.5, 0.42, c, 0, 2.2, 0, { emi: c, ei: 3 }), L.cone(0.36, 0.3, pole, 0, 2.7, 0, undefined, 4));
  },
  cloud(K, c = '#ffffff', s = 1, o) {
    const { L, rnd } = K;
    const g = L.group();
    const opt = { rough: 0.95, coat: 0, ...o };
    [[0, 0, 1.5], [1.5, -0.1, 1.15], [-1.5, -0.15, 1.1], [0.7, 0.55, 1.05], [-0.7, 0.5, 0.95], [2.5, -0.3, 0.7], [-2.4, -0.35, 0.65]].forEach(([x, y, r]) => g.add(L.sph(r * s, c, x * s, (y + 0.9) * s, rnd(-0.3, 0.3) * s, 1, 0.78, 1, opt)));
    return g;
  },
  skyIsland(K) {
    const { L } = K;
    const g = L.group(L.cone(1.7, 2, '#8a6a4a', 0, 0, 0, { flat: true }, 7), L.cyl(1.9, 1.7, 0.5, '#6cc04a', 0, 2, 0));
    g.children[0].rotation.x = Math.PI;
    g.children[0].position.y = 1;
    g.add(P.tree(K).translateY(2.4).translateX(0.4));
    g.children[2].scale.setScalar(0.6);
    return g;
  },
  bolt(K, c = '#ffe14d') {
    const { L } = K;
    const o = { emi: c, ei: 3.2 };
    const g = L.group();
    [[0.25, 2.2, 0.45], [-0.25, 1.4, -0.5], [0.2, 0.6, 0.45]].forEach(([x, y, rz]) => {
      const b = L.box(0.22, 1.1, 0.12, c, x, y, 0, o);
      b.rotation.z = rz;
      g.add(b);
    });
    return g;
  },
  column(K, h = 4, c = '#f6efe2', cap = '#ffc83a') {
    const { L } = K;
    const g = L.group(L.box(1.5, 0.4, 1.5, cap, 0, 0, 0, { metal: 0.85, rough: 0.3 }), L.cyl(0.52, 0.58, h, c, 0, 0.4, 0, { rough: 0.35, coat: 0.6 }, 14), L.box(1.4, 0.4, 1.4, cap, 0, h + 0.4, 0, { metal: 0.85, rough: 0.3 }));
    return g;
  },
  banner(K, c = '#c4102a') {
    const { L } = K;
    return L.group(L.cyl(0.07, 0.07, 3.6, '#ffc83a', 0, 0, 0, { metal: 0.85, rough: 0.3 }, 8), L.box(1.1, 1.9, 0.08, c, 0.62, 1.6, 0, { rough: 0.9 }), L.box(0.5, 0.5, 0.1, '#ffc83a', 0.62, 2.3, 0.02, { metal: 0.85, rough: 0.3 }), L.sph(0.15, '#ffc83a', 0, 3.7, 0, 1, 1, 1, { metal: 0.85, rough: 0.3 }));
  },
  die(K, s = 1, c = '#ffffff', pip = '#262a3d') {
    const { L } = K;
    const g = L.group(L.box(1.6, 1.6, 1.6, c, 0, 0, 0, { rough: 0.25, coat: 1 }));
    const pips = [[0, 1.62, 0], [-0.42, 1.62, -0.42], [0.42, 1.62, 0.42], [-0.42, 1.62, 0.42], [0.42, 1.62, -0.42], [-0.4, 1.15, 0.81], [0.4, 0.45, 0.81], [0, 0.8, 0.81]];
    pips.forEach(([x, y, z]) => g.add(L.sph(0.16, pip, x, y, z, 1, y > 1.6 ? 0.4 : 1, z > 0.8 ? 0.4 : 1)));
    g.scale.setScalar(s);
    return g;
  },
  throne(K) {
    const { L } = K;
    const gold = { metal: 0.85, rough: 0.28 };
    return L.group(L.box(2.6, 0.9, 2.2, '#ffc83a', 0, 0, 0, gold), L.box(2.2, 0.35, 1.8, '#c4102a', 0, 0.9, 0.1), L.box(2.6, 3.6, 0.5, '#ffc83a', 0, 0.9, -0.9, gold), L.box(1.9, 2.6, 0.2, '#c4102a', 0, 1.3, -0.62), L.box(0.45, 1, 2, '#ffc83a', -1.2, 0.9, 0.05, gold), L.box(0.45, 1, 2, '#ffc83a', 1.2, 0.9, 0.05, gold), L.sph(0.3, '#ff4a6a', -1.1, 4.6, -0.9, 1, 1, 1, { emi: '#ff4a6a', ei: 0.8, rough: 0.1 }), L.sph(0.3, '#4ad8ff', 1.1, 4.6, -0.9, 1, 1, 1, { emi: '#4ad8ff', ei: 0.8, rough: 0.1 }), L.cone(0.5, 0.9, '#ffc83a', 0, 4.5, -0.9, gold, 4));
  },
  brazier(K, c = '#ff8a2a') {
    const { L } = K;
    return L.group(L.cyl(0.14, 0.4, 1.4, '#ffc83a', 0, 0, 0, { metal: 0.85, rough: 0.3 }, 10), L.cyl(0.7, 0.3, 0.5, '#ffc83a', 0, 1.4, 0, { metal: 0.85, rough: 0.3 }, 14), L.sph(0.5, c, 0, 2, 0, 1, 1.3, 1, { emi: c, ei: 3.2 }), L.sph(0.28, '#ffe14d', 0, 2.5, 0, 1, 1.5, 1, { emi: '#ffe14d', ei: 3.2 }));
  },
  portal(K, c = '#2fd0ff') {
    const { L } = K;
    const g = L.group(L.torus(1.3, 0.2, c, 0, 1.7, 0, { emi: c, ei: 2.6 }, false), L.sph(1.15, '#12062c', 0, 1.7, 0, 1, 1, 0.08, { emi: c, ei: 0.5 }), L.box(1.2, 0.4, 1.2, '#2a1a4a', -1.3, 0, 0), L.box(1.2, 0.4, 1.2, '#2a1a4a', 1.3, 0, 0));
    return g;
  },
  shard(K, c = '#ff5ad8') {
    const { L, rnd } = K;
    const g = L.group();
    for (let i = 0; i < 3; i++) {
      const b = L.box(rnd(0.5, 1), rnd(0.5, 1), rnd(0.5, 1), i ? '#2a1a5a' : c, rnd(-0.8, 0.8), rnd(0.6, 2.4), rnd(-0.5, 0.5), i ? { rough: 0.3, coat: 1 } : { emi: c, ei: 1.8 });
      b.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
      g.add(b);
    }
    return g;
  },
  wall(K, len = 6, c = '#5a5e78') {
    const { L } = K;
    const g = L.group(L.box(len, 2.6, 1, c, 0, 0, 0, { rough: 0.9 }));
    for (let x = -len / 2 + 0.5; x < len / 2; x += 1.1) g.add(L.box(0.6, 0.6, 1.05, c, x, 2.6, 0, { rough: 0.9 }));
    return g;
  },
  frog(K) {
    const { L } = K;
    const c = '#6cc84a';
    return L.group(L.sph(0.6, c, 0, 0.4, 0, 1, 0.75, 1.1), L.sph(0.22, c, -0.25, 0.85, 0.3), L.sph(0.22, c, 0.25, 0.85, 0.3), L.sph(0.12, '#ffffff', -0.25, 0.9, 0.42), L.sph(0.12, '#ffffff', 0.25, 0.9, 0.42), L.sph(0.06, '#111', -0.25, 0.92, 0.52), L.sph(0.06, '#111', 0.25, 0.92, 0.52));
  },
  log(K, len = 3) {
    const { L } = K;
    const g = L.group(L.cyl(0.5, 0.5, len, '#8a5a30', 0, 0, 0, { rough: 0.9 }, 14), L.cyl(0.4, 0.4, len + 0.04, '#d9a46a', 0, -0.02, 0, { rough: 0.9 }, 14));
    g.rotation.z = Math.PI / 2;
    g.position.y = 0.5;
    return L.group(g);
  },
};

/* ------------------------------------------------------------------ */
/* piattaforme e composizione                                          */
/* ------------------------------------------------------------------ */
/** mette una piattaforma alta h con la cima sotto il gettone del livello */
function pad(K, p, obj, h, dy = 14) {
  obj.position.copy(K.atTop(p.x, p.y + dy, h));
  K.scene.add(obj);
  return obj;
}

/** distribuisce oggetti sui punti liberi, scegliendo fra più "ricette" */
function scatter(K, spots, makers) {
  spots.forEach(([x, y], i) => {
    const mk = makers[i % makers.length];
    const res = mk(K, x, y, i);
    if (res) K.put(res.obj || res, x, y, res.s || 1, res.ry ?? K.rnd(0, TAU));
  });
}

const zones = (levels, boss) => [...levels.map((p) => ({ x: p.x, y: p.y + 6, r: 54 })), { x: boss.x, y: boss.y + 10, r: 118 }];
const disc = (K, r, h, c, o) => K.L.group(K.L.cyl(r, r * 1.04, h, c, 0, 0, 0, o, 36));

export const BUILDERS = {
  /* 1. stagno: acqua, rive erbose, ninfee, canne e fiori di loto */
  pond(K, { levels, boss }) {
    const { L, put, blob, free, trail, rnd } = K;
    const grass = '#7ccf4c';
    [[-18, 250, 96, 150], [410, 480, 104, 170], [-26, 720, 92, 120], [398, 96, 84, 110], [420, 820, 80, 90]].forEach(([x, y, rx, ry]) => {
      blob(x, y, rx + 9, ry + 9, '#e8d49a', { h: 0.25, o: { rough: 0.95 } });
      blob(x, y, rx, ry, grass, { h: 0.9 });
      blob(x + (x < 195 ? -12 : 12), y - 10, rx * 0.62, ry * 0.6, '#8fdc58', { h: 1.25 });
    });
    levels.forEach((p, k) => {
      const g = P.lily(K, 4.3, k % 2 ? '#58b044' : '#66c04c');
      g.rotation.y = rnd(0, TAU);
      pad(K, p, g, 0.22);
    });
    const arena = P.lily(K, 10.6, '#4fa83e', 0.3);
    arena.rotation.y = 2.2;
    pad(K, boss, arena, 0.3, 26);
    pad(K, boss, disc(K, 7.6, 0.2, '#74cc52', { rough: 0.5, coat: 0.5 }), 0.5, 22);
    trail(levels.concat(boss), (x, y) => put(L.group(L.cyl(0.55, 0.6, 0.16, '#e8f2e0', 0, 0, 0, { rough: 0.6 }, 16)), x, y));
    // rive: alberi, funghi, fiori, sassi
    [[22, 200], [18, 300], [372, 420], [380, 540], [20, 690], [368, 70], [30, 760], [376, 800]].forEach(([x, y], i) => put(P.tree(K, i % 2 ? '#3f9a4a' : '#4aa85a', i % 2 ? '#62c060' : '#7ad06a'), x, y, rnd(0.95, 1.25), rnd(0, TAU)));
    [[40, 250], [352, 470], [48, 730], [350, 110], [8, 360], [384, 600]].forEach(([x, y], i) => put(i % 2 ? P.mushroom(K) : P.rock(K, '#a8b0bc', 0.8), x, y, 1));
    [[58, 290], [340, 520], [26, 650], [362, 150], [345, 400]].forEach(([x, y], i) => put(P.flower(K, i % 2 ? '#ffffff' : '#ffb0d8'), x, y, 1.3));
    scatter(K, free(26, zones(levels, boss), { left: 60, right: 330, gap: 34 }), [
      (k) => ({ obj: P.lotus(k), s: rnd(0.9, 1.3) }),
      (k) => ({ obj: P.reeds(k), s: 1 }),
      (k) => ({ obj: P.lily(k, rnd(1.3, 2.1), '#5ab848'), s: 1 }),
      (k) => ({ obj: P.lotus(k, '#ffffff', '#ffe6f0'), s: 1 }),
      (k) => ({ obj: P.rock(k, '#9aa8b0', 0.6), s: 1 }),
      (k) => ({ obj: L.group(P.lily(k, 1.5, '#66c04c'), P.frog(k).translateY(0.2)), s: 1.1 }),
    ]);
    put(P.log(K, 4), boss.x - 128, boss.y + 44, 1.2, 0.5);
    put(P.reeds(K), boss.x + 128, boss.y + 30, 1.5);
    put(P.reeds(K), boss.x - 146, boss.y - 10, 1.4);
    put(P.lotus(K), boss.x + 136, boss.y - 30, 1.7);
    put(P.lantern(K, '#fff0a0', '#6a4a26'), boss.x - 100, boss.y - 40, 1.2);
    put(P.lantern(K, '#fff0a0', '#6a4a26'), boss.x + 100, boss.y - 44, 1.2);
  },

  /* 2. spiaggia: sabbia dorata, mare a sinistra, palme, ombrelloni, castelli */
  beach(K, { levels, boss }) {
    const { L, put, blob, free, trail, rnd } = K;
    const sand = { rough: 0.95, coat: 0 };
    const shore = blob(300, 430, 232, 470, '#ffffff', { h: 0.12, n: 16, jag: 0.16, o: { op: 0.85, rough: 0.4 } });
    shore.receiveShadow = false;
    blob(308, 430, 226, 466, '#f6d894', { h: 0.55, n: 16, jag: 0.16, o: sand });
    blob(330, 300, 150, 190, '#ffe6ac', { h: 0.9, o: sand });
    blob(320, 690, 150, 150, '#ffe6ac', { h: 0.9, o: sand });
    // isolotti nel mare
    [[40, 200, 2.4], [30, 560, 2.0], [60, 380, 1.4]].forEach(([x, y, r], i) => {
      put(P.islet(K, r), x, y);
      if (i < 2) put(P.palm(K, i ? -0.6 : 0.6), x, y - 2, 0.9);
    });
    levels.forEach((p, k) => {
      const g = L.group(L.cyl(4.1, 4.5, 0.7, '#e8c070', 0, 0, 0, sand, 36), L.cyl(3.5, 3.5, 0.12, '#fff0c4', 0, 0.7, 0, sand, 36));
      if (p.x < 110) g.add(L.torus(4.5, 0.2, '#ffffff', 0, 0.05, 0, { op: 0.8 }));
      pad(K, p, g, 0.82);
      void k;
    });
    const ar = L.group(L.cyl(10.4, 11, 0.9, '#e8c070', 0, 0, 0, sand, 48), L.cyl(8.6, 8.6, 0.14, '#fff0c4', 0, 0.9, 0, sand, 48));
    pad(K, boss, ar, 1.04, 28);
    trail(levels.concat(boss), (x, y, i, t) => put(L.group(L.sph(0.36, '#d8a85a', 0, 0, 0, 1.3, 0.22, 0.8, sand)), x + (Math.round(t / 17) % 2 ? 3 : -3), y, 1, 0.4));
    put(P.sandcastle(K, 1.25), boss.x - 142, boss.y + 2);
    put(P.sandcastle(K, 1.05, '#f2cf8a', '#3d9bff'), boss.x + 146, boss.y + 12);
    put(P.palm(K, 0.7), boss.x + 120, boss.y - 62, 1.25);
    put(P.palm(K, -0.7), boss.x - 108, boss.y - 70, 1.15);
    scatter(K, free(24, zones(levels, boss), { left: 150, right: 390, gap: 36 }), [
      (k) => ({ obj: P.palm(k, rnd(-0.8, 0.8)), s: rnd(1, 1.3), ry: 0 }),
      (k) => ({ obj: P.shell(k, k.pick(['#ffd6c0', '#ffe9a8', '#f6c0e0'])), s: 1.2 }),
      (k) => ({ obj: P.umbrella(k, k.pick(['#ff5a66', '#3d9bff', '#ffb02a', '#35c46a'])), s: 1, ry: 0 }),
      (k) => ({ obj: P.starfish(k, k.pick(['#ff8a3a', '#ff5a8a'])), s: 1.3 }),
      (k) => ({ obj: P.rock(k, '#c8a888', 0.7), s: 1 }),
      (k) => ({ obj: P.ball(k), s: 1.1 }),
      (k) => ({ obj: P.tuft(k, '#8ac85a'), s: 1.2 }),
    ]);
    scatter(K, free(7, zones(levels, boss), { left: 0, right: 90, gap: 50 }), [(k) => ({ obj: P.rock(k, '#7a8a9a', 0.7) }), (k) => ({ obj: P.buoy(k) }), (k) => ({ obj: P.boat(k, '#ff5a66'), s: 0.9, ry: rnd(-0.5, 0.5) })]);
  },

  /* 3. bosco nebbioso: muschio scuro, ceppi, funghi luminosi, capanna della strega */
  forest(K, { levels, boss }) {
    const { L, put, blob, free, trail, rnd } = K;
    [[60, 180, 110, 90], [330, 380, 110, 100], [70, 600, 120, 110], [320, 720, 100, 90]].forEach(([x, y, rx, ry]) => blob(x, y, rx, ry, '#35583c', { h: 0.35, o: { rough: 0.95, coat: 0 } }));
    blob(250, 250, 60, 46, '#3a6a8a', { h: 0.08, bevel: 0.03, o: { rough: 0.12, coat: 1 } });
    levels.forEach((p) => {
      const g = L.group(L.cyl(3.9, 4.4, 1.1, '#7a4c2a', 0, 0, 0, { rough: 0.95 }, 20), L.cyl(3.7, 3.7, 0.1, '#e2b47a', 0, 1.1, 0, { rough: 0.8 }, 28), L.torus(2.5, 0.07, '#b8824a', 0, 1.2, 0), L.torus(1.4, 0.07, '#b8824a', 0, 1.2, 0));
      for (let i = 0; i < 4; i++) g.add(L.sph(0.9, '#7a4c2a', Math.cos(i * 1.7) * 4.2, 0.1, Math.sin(i * 1.7) * 4.2, 1.2, 0.5, 0.7, { rough: 0.95 }));
      g.add(P.mushroom(K, '#8affc0', true).translateX(3.6).translateZ(2.2));
      pad(K, p, g, 1.2);
    });
    const ar = L.group(L.cyl(10, 10.8, 1.2, '#4a3a4a', 0, 0, 0, { rough: 0.9 }, 12), L.cyl(8.6, 8.6, 0.14, '#6a5a7a', 0, 1.2, 0, { rough: 0.8 }, 40), L.torus(7.4, 0.14, '#b07aff', 0, 1.36, 0, { emi: '#b07aff', ei: 2 }));
    pad(K, boss, ar, 1.36, 28);
    trail(levels.concat(boss), (x, y, i, t) => put(L.group(L.sph(0.28, '#ffe9a0', 0, 0.3, 0, 1, 1, 1, { emi: '#ffd86a', ei: Math.round(t / 17) % 2 ? 2.4 : 0.6 })), x, y));
    put(P.hut(K), boss.x - 138, boss.y - 14, 1.25, 0.35);
    put(P.cauldron(K), boss.x + 132, boss.y + 22, 1.25);
    put(P.deadTree(K, '#2a2030'), boss.x + 150, boss.y - 50, 1.5);
    put(P.lantern(K, '#b07aff'), boss.x - 96, boss.y + 62, 1.1);
    put(P.lantern(K, '#b07aff'), boss.x + 96, boss.y + 66, 1.1);
    const dark = ['#24523e', '#1f4a44', '#2c5a3a'];
    const lite = ['#357a52', '#2f6a5a', '#44804a'];
    scatter(K, free(34, zones(levels, boss), { gap: 32 }), [
      (k) => ({ obj: P.tree(k, k.pick(dark), k.pick(lite), '#4a3428'), s: rnd(1.15, 1.6) }),
      (k) => ({ obj: P.pine(k, k.pick(dark), false, '#4a3428'), s: rnd(1.2, 1.6) }),
      (k) => ({ obj: P.mushroom(k, k.pick(['#ff5a8a', '#8affc0', '#b07aff']), true), s: rnd(1, 1.5) }),
      (k) => ({ obj: P.tree(k, k.pick(dark), k.pick(lite), '#4a3428'), s: rnd(1, 1.4) }),
      (k) => ({ obj: P.rock(k, '#5a6a72', 0.8) }),
      (k) => ({ obj: P.tuft(k, '#4a8a52'), s: 1.4 }),
      (k) => ({ obj: P.deadTree(k), s: 1.1 }),
      (k) => ({ obj: P.pumpkin(k), s: 1.1, ry: 0 }),
    ]);
  },

  /* 4. ghiacci: neve, laghi gelati, lastre di ghiaccio, pini innevati, cristalli */
  ice(K, { levels, boss }) {
    const { L, put, blob, free, trail, rnd } = K;
    const iceO = { rough: 0.08, coat: 1 };
    [[90, 330, 80, 62], [300, 560, 86, 70], [300, 180, 60, 44], [80, 640, 60, 50]].forEach(([x, y, rx, ry]) => {
      blob(x, y, rx + 8, ry + 8, '#ffffff', { h: 0.3, o: { rough: 0.95, coat: 0 } });
      blob(x, y, rx, ry, '#8fd4f6', { h: 0.34, bevel: 0.04, o: iceO });
    });
    [[-10, 120, 80, 90], [400, 380, 70, 110], [-10, 780, 70, 90], [404, 760, 60, 80]].forEach(([x, y, rx, ry]) => blob(x, y, rx, ry, '#ffffff', { h: 1.4, bevel: 0.6, o: { rough: 0.95, coat: 0 } }));
    levels.forEach((p) => {
      const g = L.group(L.cyl(4.2, 4.6, 1, '#bfe8ff', 0, 0, 0, { ...iceO, flat: true }, 6), L.cyl(3.7, 3.9, 0.16, '#eaf8ff', 0, 1, 0, { ...iceO, flat: true }, 6), L.sph(1.2, '#ffffff', 3.6, 0, 1.8, 1, 0.5, 1, { rough: 0.95 }), L.sph(1, '#ffffff', -3.8, 0, 1.2, 1, 0.5, 1, { rough: 0.95 }));
      g.rotation.y = rnd(0, 1);
      pad(K, p, g, 1.16);
    });
    const ar = L.group(L.cyl(10.2, 11, 1.2, '#a8dcff', 0, 0, 0, { ...iceO, flat: true }, 8), L.cyl(8.8, 9, 0.2, '#eaf8ff', 0, 1.2, 0, { ...iceO, flat: true }, 8));
    pad(K, boss, ar, 1.4, 28);
    trail(levels.concat(boss), (x, y) => put(L.group(L.cyl(0.6, 0.7, 0.2, '#cfeeff', 0, 0, 0, { ...iceO, flat: true }, 6)), x, y, 1, rnd(0, 1)));
    [[-150, -10, 1.9], [150, 0, 2.1], [-118, -64, 1.3], [122, -62, 1.4], [-160, 50, 1.2], [164, 56, 1.2]].forEach(([dx, dy, s]) => put(P.crystal(K, '#8fe0ff', s, 0.7), boss.x + dx, boss.y + dy));
    scatter(K, free(30, zones(levels, boss), { gap: 34 }), [
      (k) => ({ obj: P.pine(k, '#2f7a6a', true), s: rnd(1.2, 1.6) }),
      (k) => ({ obj: P.crystal(k, k.pick(['#8fe0ff', '#b8a8ff', '#a8fff0']), rnd(0.8, 1.2), 0.6) }),
      (k) => ({ obj: P.pine(k, '#2f7a6a', true), s: rnd(1, 1.4) }),
      (k) => ({ obj: P.snowman(k), s: 1.05, ry: rnd(-0.5, 0.5) }),
      (k) => ({ obj: L.group(P.rock(k, '#9ab0cc', 0.9), L.sph(0.8, '#ffffff', 0, 0.75, 0, 1.1, 0.4, 0.9, { rough: 0.95 })), s: 1 }),
      (k) => ({ obj: P.igloo(k), s: 1, ry: rnd(-0.6, 0.6) }),
      (k) => ({ obj: L.group(L.sph(1.2, '#ffffff', 0, 0, 0, 1.3, 0.45, 1, { rough: 0.95 })), s: rnd(0.8, 1.4) }),
    ]);
  },

  /* 5. mari del pirata: mare aperto, zattere e barili, isolotti, il veliero */
  sea(K, { levels, boss }) {
    const { L, put, free, trail, rnd } = K;
    levels.forEach((p, k) => {
      const g = L.group();
      for (let i = -3; i <= 3; i++) g.add(L.box(1.2, 0.55, 7.6 - Math.abs(i) * 0.5, i % 2 ? '#b8813e' : '#a8702e', i * 1.22, 0, 0, { rough: 0.9 }));
      g.add(L.box(8.6, 0.25, 0.6, '#7a4c22', 0, 0.5, 2.4), L.box(8.6, 0.25, 0.6, '#7a4c22', 0, 0.5, -2.4), L.torus(5.2, 0.16, '#ffffff', 0, 0.04, 0, { op: 0.75 }));
      if (k % 3 === 0) g.add(P.barrel(K).translateX(3.6).translateZ(-2.6).translateY(0.5));
      if (k % 3 === 1) g.add(P.crate(K).translateX(-3.5).translateZ(-2.6).translateY(0.5));
      g.rotation.y = rnd(-0.25, 0.25);
      pad(K, p, g, 0.6);
    });
    const ar = L.group(P.islet(K, 11.5), L.cyl(8.4, 8.8, 0.3, '#ffe6ac', 0, 3.2, 0, { rough: 0.95, coat: 0 }, 40));
    ar.children[0].scale.y = 1.4;
    pad(K, boss, ar, 3.5, 30);
    trail(levels.concat(boss), (x, y) => put(L.group(L.sph(0.32, '#ffffff', 0, 0.12, 0, 1, 0.6, 1), L.torus(0.5, 0.05, '#ffffff', 0, 0.03, 0, { op: 0.7 })), x, y));
    put(P.ship(K), 78, boss.y - 30, 1.15, 0.5);
    put(P.palm(K, 0.6), boss.x + 128, boss.y + 14, 1.3);
    put(L.group(P.crate(K), P.gold(K, 7).translateY(0.9)), boss.x + 104, boss.y + 62, 1.1);
    put(P.barrel(K), boss.x - 96, boss.y + 72, 1.2);
    scatter(K, free(26, zones(levels, boss).concat({ x: 78, y: boss.y - 40, r: 96 }), { gap: 40 }), [
      (k) => ({ obj: L.group(P.islet(k, 2.6), P.palm(k, rnd(-0.6, 0.6)).translateY(0.5)), s: rnd(0.9, 1.2), ry: 0 }),
      (k) => ({ obj: P.rock(k, '#5a6a80', 1.1) }),
      (k) => ({ obj: P.fin(k), s: 1.2, ry: rnd(-0.6, 0.6) }),
      (k) => ({ obj: P.buoy(k), s: 1.1 }),
      (k) => ({ obj: P.boat(k, k.pick(['#ffffff', '#ffe14d', '#ff8a8a'])), s: 1, ry: rnd(-0.6, 0.6) }),
      (k) => ({ obj: L.group(P.barrel(k).rotateZ(0.5), L.torus(0.9, 0.07, '#ffffff', 0, 0.03, 0, { op: 0.7 })), s: 0.9 }),
      (k) => ({ obj: L.group(P.rock(k, '#4a5a70', 1.3), P.rock(k, '#5a6a80', 0.8).translateX(1.4)), s: 1 }),
    ]);
  },

  /* 6. deserto del drago: dune, lastre d'arenaria, cactus, piramidi, vulcano */
  desert(K, { levels, boss }) {
    const { L, put, blob, free, trail, rnd } = K;
    const sand = { rough: 0.95, coat: 0 };
    [[50, 150, 120, 60], [340, 300, 130, 70], [60, 470, 130, 64], [330, 620, 120, 60], [120, 300, 90, 40]].forEach(([x, y, rx, ry], i) => {
      blob(x, y, rx, ry, i % 2 ? '#f6b860' : '#f2a850', { h: 0.9, bevel: 0.7, o: sand });
      blob(x - 14, y - 8, rx * 0.6, ry * 0.55, '#ffc878', { h: 1.5, bevel: 0.7, o: sand });
    });
    blob(60, 330, 40, 26, '#3ab8d8', { h: 1.0, bevel: 0.05, o: { rough: 0.1, coat: 1 } });
    put(P.palm(K, 0.5), 34, 322, 1.1);
    put(P.palm(K, -0.5), 92, 318, 0.95);
    levels.forEach((p) => {
      const g = L.group(L.cyl(4.1, 4.6, 1, '#d8884a', 0, 0, 0, { flat: true, rough: 0.9 }, 8), L.cyl(3.6, 3.8, 0.18, '#f2b870', 0, 1, 0, { flat: true, rough: 0.9 }, 8), L.box(1.4, 0.7, 1.2, '#c87838', 3.8, 0, 2, { rough: 0.9 }, 0.5), L.box(1, 0.5, 0.9, '#c87838', -4, 0, 1.4, { rough: 0.9 }, 0.2));
      g.rotation.y = rnd(0, 0.8);
      pad(K, p, g, 1.18);
    });
    blob(boss.x, boss.y + 36, 150, 96, '#5a2418', { h: 0.5, o: { rough: 0.9 } });
    blob(boss.x, boss.y + 36, 128, 80, '#ff6a1a', { h: 0.62, bevel: 0.05, o: { emi: '#ff4a08', ei: 2.4 } });
    const ar = L.group(L.cyl(9.2, 10, 1.1, '#4a2018', 0, 0, 0, { flat: true, rough: 0.85 }, 9), L.cyl(8, 8.3, 0.2, '#6a3020', 0, 1.1, 0, { flat: true, rough: 0.85 }, 9));
    pad(K, boss, ar, 1.3 + 0.6, 30);
    trail(levels.concat(boss), (x, y) => put(L.group(L.box(0.9, 0.2, 0.7, '#c87838', 0, 0, 0, { rough: 0.9 })), x, y, 1, rnd(0, 1)));
    put(P.volcano(K), boss.x - 150, boss.y - 30, 1.3);
    put(P.volcano(K), boss.x + 156, boss.y - 20, 1.05, 2);
    put(P.gold(K, 12), boss.x + 118, boss.y + 78, 1.5);
    put(P.gold(K, 10), boss.x - 112, boss.y + 84, 1.3);
    scatter(K, free(26, zones(levels, boss).concat({ x: 60, y: 330, r: 60 }), { gap: 36, bottom: 700 }), [
      (k) => ({ obj: P.cactus(k), s: rnd(1, 1.4), ry: rnd(-0.4, 0.4) }),
      (k) => ({ obj: P.rock(k, '#c0683a', 1.1) }),
      (k) => ({ obj: P.pyramid(k, rnd(0.8, 1.2)), ry: 0 }),
      (k) => ({ obj: P.bones(k), s: 1.2 }),
      (k) => ({ obj: P.cactus(k), s: rnd(0.8, 1.1), ry: rnd(-0.4, 0.4) }),
      (k) => ({ obj: L.group(P.rock(k, '#a8502a', 1.4), P.rock(k, '#c0683a', 0.8).translateX(1.3)) }),
      (k) => ({ obj: P.tuft(k, '#b8a04a'), s: 1.3 }),
    ]);
  },

  /* 7. torre del caos: vuoto viola, dischi runici sospesi, cristalli al neon, portali */
  chaos(K, { levels, boss }) {
    const { L, put, free, trail, rnd } = K;
    const dark = { rough: 0.3, coat: 1 };
    levels.forEach((p, k) => {
      const c = k % 2 ? '#ff5ad8' : '#2fd0ff';
      const g = L.group(L.cone(3.4, 3.2, '#2a1a5a', 0, 0, 0, { ...dark, flat: true }, 6), L.cyl(4.3, 4.3, 0.5, '#3a2a7a', 0, 3.2, 0, dark, 6), L.torus(3.5, 0.14, c, 0, 3.74, 0, { emi: c, ei: 2.6 }), L.cyl(3.2, 3.2, 0.06, '#4a3a9a', 0, 3.7, 0, dark, 32));
      g.children[0].rotation.x = Math.PI;
      g.children[0].position.y = 1.6;
      g.rotation.y = rnd(0, 1);
      pad(K, p, g, 3.76);
    });
    const ar = L.group(L.cone(9, 5, '#2a1a5a', 0, 0, 0, { ...dark, flat: true }, 8), L.cyl(10.4, 10.4, 0.7, '#3a2a7a', 0, 5, 0, dark, 8), L.torus(8.6, 0.2, '#56ff9e', 0, 5.74, 0, { emi: '#56ff9e', ei: 2.6 }), L.torus(6.2, 0.1, '#ff5ad8', 0, 5.74, 0, { emi: '#ff5ad8', ei: 2.6 }));
    ar.children[0].rotation.x = Math.PI;
    ar.children[0].position.y = 2.5;
    pad(K, boss, ar, 5.76, 30);
    trail(levels.concat(boss), (x, y, i, t) => {
      const c = Math.round(t / 17) % 2 ? '#2fd0ff' : '#ff5ad8';
      put(L.group(L.box(0.5, 0.5, 0.5, c, 0, 1.2, 0, { emi: c, ei: 2.2 }, 0.8)), x, y);
    });
    put(P.tower(K, { wall: '#3a2a7a', roof: '#ff5ad8', h: 8, r: 1.5, win: '#56ff9e' }), boss.x - 150, boss.y + 30, 1.1);
    put(P.tower(K, { wall: '#3a2a7a', roof: '#2fd0ff', h: 6, r: 1.2, win: '#ff5ad8' }), boss.x + 154, boss.y + 44, 1.1);
    put(P.portal(K, '#56ff9e'), boss.x + 120, boss.y - 60, 1.2, 0);
    put(P.portal(K, '#ff5ad8'), boss.x - 118, boss.y - 66, 1.1, 0);
    scatter(K, free(30, zones(levels, boss), { gap: 36 }), [
      (k) => ({ obj: P.crystal(k, k.pick(['#56ff9e', '#ff5ad8', '#2fd0ff', '#ffe14d']), rnd(0.9, 1.5), 1.6) }),
      (k) => ({ obj: P.shard(k, k.pick(['#ff5ad8', '#2fd0ff', '#56ff9e'])), s: 1.1 }),
      (k) => ({ obj: P.die(k, rnd(0.7, 1), '#2a1a5a', '#56ff9e'), ry: rnd(0, 1) }),
      (k) => ({ obj: P.portal(k, k.pick(['#2fd0ff', '#ffe14d'])), s: 0.8, ry: rnd(-0.5, 0.5) }),
      (k) => ({ obj: P.crystal(k, k.pick(['#b07aff', '#2fd0ff']), rnd(0.7, 1.1), 1.6) }),
      (k) => ({ obj: L.group(L.cone(1.4, 1.6, '#2a1a5a', 0, 0, 0, { flat: true, rough: 0.3, coat: 1 }, 5).rotateX(Math.PI).translateY(-1.6), L.cyl(1.7, 1.7, 0.3, '#4a3a9a', 0, 1.6, 0, dark, 5)), s: rnd(0.8, 1.3) }),
    ]);
  },

  /* 8. castello oscuro: selciato, lapidi, alberi spogli, zucche, mura e torri */
  castle(K, { levels, boss }) {
    const { L, put, blob, free, trail, rnd } = K;
    [[50, 220, 100, 80], [340, 460, 110, 90], [60, 640, 100, 80]].forEach(([x, y, rx, ry]) => blob(x, y, rx, ry, '#2f4a36', { h: 0.3, o: { rough: 0.95, coat: 0 } }));
    levels.forEach((p) => {
      const g = L.group(L.cyl(4.2, 4.6, 0.9, '#5a5e78', 0, 0, 0, { rough: 0.9, flat: true }, 10), L.cyl(3.7, 3.8, 0.16, '#7a80a0', 0, 0.9, 0, { rough: 0.8 }, 32), L.torus(3.1, 0.1, '#c4102a', 0, 1.08, 0, { emi: '#ff2a3a', ei: 1.4 }));
      pad(K, p, g, 1.06);
    });
    const ar = L.group(L.cyl(10.2, 11, 1.1, '#4a4e68', 0, 0, 0, { rough: 0.9, flat: true }, 12), L.cyl(8.8, 9, 0.2, '#6a7090', 0, 1.1, 0, { rough: 0.8 }, 40), L.torus(7.6, 0.16, '#c4102a', 0, 1.32, 0, { emi: '#ff2a3a', ei: 2 }));
    pad(K, boss, ar, 1.3, 28);
    trail(levels.concat(boss), (x, y) => put(L.group(L.cyl(0.6, 0.66, 0.2, '#8a90ac', 0, 0, 0, { rough: 0.8 }, 10)), x, y));
    const wall = '#565a76';
    put(P.wall(K, 7, wall), boss.x - 150, boss.y + 86, 1, 0.12);
    put(P.wall(K, 7, wall), boss.x + 150, boss.y + 86, 1, -0.12);
    put(P.tower(K, { wall, roof: '#8a1a3a', h: 7.5, r: 1.6, win: '#ff5a3a' }), boss.x - 150, boss.y + 30, 1.1);
    put(P.tower(K, { wall, roof: '#8a1a3a', h: 6.2, r: 1.4, win: '#ff5a3a' }), boss.x + 152, boss.y + 36, 1.1);
    put(P.tower(K, { wall, roof: '#5a1a5a', h: 4.6, r: 1.1, win: '#ffd86a' }), boss.x - 104, boss.y - 62, 1);
    put(P.tower(K, { wall, roof: '#5a1a5a', h: 4.6, r: 1.1, win: '#ffd86a' }), boss.x + 106, boss.y - 58, 1);
    scatter(K, free(32, zones(levels, boss), { gap: 32 }), [
      (k) => ({ obj: P.tomb(k), s: 1.2, ry: rnd(-0.4, 0.4) }),
      (k) => ({ obj: P.deadTree(k, '#2a2230'), s: rnd(1.2, 1.7) }),
      (k) => ({ obj: P.pumpkin(k), s: 1.2, ry: rnd(-0.5, 0.5) }),
      (k) => ({ obj: P.tomb(k), s: 1.1, ry: rnd(-0.4, 0.4) }),
      (k) => ({ obj: P.lantern(k, '#ffb04a'), s: 1.1 }),
      (k) => ({ obj: P.pine(k, '#1f3a38', false, '#2a2230'), s: rnd(1.2, 1.5) }),
      (k) => ({ obj: P.rock(k, '#5a5e74', 0.9) }),
      (k) => ({ obj: L.group(L.box(1.2, 0.6, 2.4, '#4a2a22', 0, 0, 0, { rough: 0.8 }), L.box(0.16, 0.08, 1, '#c8a84a', 0, 0.6, 0), L.box(0.6, 0.08, 0.16, '#c8a84a', 0, 0.6, -0.3)), s: 1, ry: rnd(-0.6, 0.6) }),
    ]);
  },

  /* 9. cieli in tempesta: nuvole come isole, isolette volanti, nubi nere e fulmini */
  sky(K, { levels, boss }) {
    const { L, put, free, trail, rnd } = K;
    levels.forEach((p) => {
      const g = P.cloud(K, '#ffffff', 1.9);
      g.add(L.cyl(3.5, 3.6, 0.3, '#fff6d8', 0, 2.6, 0, { rough: 0.5 }, 32), L.torus(3.5, 0.12, '#ffd86a', 0, 2.9, 0, { metal: 0.8, rough: 0.3 }));
      pad(K, p, g, 2.9);
    });
    const ar = P.cloud(K, '#4a4a7a', 4.4, { rough: 0.8 });
    ar.add(L.cyl(8.6, 8.8, 0.4, '#6a6aa8', 0, 6.2, 0, { rough: 0.4, coat: 0.8 }, 40), L.torus(8.6, 0.18, '#ffe14d', 0, 6.6, 0, { emi: '#ffe14d', ei: 2.4 }));
    pad(K, boss, ar, 6.6, 30);
    trail(levels.concat(boss), (x, y) => put(L.group(L.sph(0.5, '#ffffff', 0, 1.4, 0, 1.2, 0.7, 1, { rough: 0.95 })), x, y));
    [[-150, 20], [150, 30], [-110, -60], [116, -56]].forEach(([dx, dy], i) => {
      put(P.cloud(K, '#3a3a6a', 1.5, { rough: 0.8 }), boss.x + dx, boss.y + dy, 1, 0, 3.4);
      put(P.bolt(K), boss.x + dx + (i % 2 ? 6 : -6), boss.y + dy + 6, 1.5, 0, 0.6);
    });
    scatter(K, free(30, zones(levels, boss), { gap: 40 }), [
      (k) => ({ obj: P.cloud(k, '#ffffff', rnd(1, 1.6)), ry: 0 }),
      (k) => ({ obj: P.skyIsland(k), s: rnd(0.9, 1.2) }),
      (k) => ({ obj: P.cloud(k, '#eaf2ff', rnd(0.8, 1.2)), ry: 0 }),
      (k) => ({ obj: L.group(P.cloud(k, '#4a4a7a', 1.2, { rough: 0.8 }).translateY(1.6), P.bolt(k)), ry: 0 }),
      (k) => ({ obj: P.cloud(k, '#ffe6f0', rnd(0.8, 1.3)), ry: 0 }),
      (k) => ({ obj: L.group(L.sph(0.9, k.pick(['#ff5a66', '#ffd23f', '#35c46a']), 0, 3.2, 0, 1, 1.2, 1, { rough: 0.3, coat: 1 }), L.cyl(0.03, 0.03, 2.2, '#ffffff', 0, 0.6, 0, undefined, 5), L.box(0.5, 0.4, 0.5, '#a8702e', 0, 0.3, 0)), s: 1.1 }),
    ]);
  },

  /* 10. trono dei dadi: sala di marmo, tappeto rosso, colonne, dadi giganti, oro */
  throne(K, { levels, boss }) {
    const { L, put, free, trail, rnd } = K;
    const gold = { metal: 0.85, rough: 0.28 };
    levels.forEach((p) => {
      const g = L.group(L.cyl(4.3, 4.6, 0.8, '#ffc83a', 0, 0, 0, gold, 40), L.cyl(3.7, 3.7, 0.14, '#c4102a', 0, 0.8, 0, { rough: 0.8 }, 40), L.torus(3.7, 0.16, '#ffe27a', 0, 0.94, 0, gold));
      pad(K, p, g, 0.94);
    });
    const ar = L.group(L.cyl(11, 11.4, 0.7, '#ffc83a', 0, 0, 0, gold, 48), L.cyl(9.8, 10.2, 0.7, '#f6efe2', 0, 0.7, 0, { rough: 0.3, coat: 0.8 }, 48), L.cyl(8.6, 9, 0.6, '#c4102a', 0, 1.4, 0, { rough: 0.8 }, 48), L.torus(8.6, 0.2, '#ffe27a', 0, 2, 0, gold));
    pad(K, boss, ar, 2, 30);
    trail(levels.concat(boss), (x, y, i, t) => put(L.group(L.box(1.1, 0.14, 1.1, Math.round(t / 17) % 2 ? '#c4102a' : '#ffc83a', 0, 0, 0, Math.round(t / 17) % 2 ? { rough: 0.8 } : gold, 0.78)), x, y));
    put(P.throne(K), boss.x, boss.y - 84, 1.25);
    [[-150, -30], [150, -30], [-160, 60], [160, 60]].forEach(([dx, dy]) => put(P.column(K, 5.5), boss.x + dx, boss.y + dy, 1.15));
    put(P.brazier(K), boss.x - 104, boss.y + 78, 1.2);
    put(P.brazier(K), boss.x + 104, boss.y + 78, 1.2);
    put(P.die(K, 1.5, '#c4102a', '#ffffff'), boss.x - 124, boss.y - 78, 1, 0.5);
    put(P.die(K, 1.3), boss.x + 122, boss.y - 80, 1, -0.4);
    scatter(K, free(30, zones(levels, boss), { gap: 38 }), [
      (k) => ({ obj: P.column(k, rnd(3.4, 5)), s: 1 }),
      (k) => ({ obj: P.gold(k, 10), s: rnd(1.1, 1.6) }),
      (k) => ({ obj: P.die(k, rnd(0.8, 1.3), k.pick(['#ffffff', '#c4102a', '#2f8ae8', '#262a3d']), '#ffc83a'), ry: rnd(0, 1.5) }),
      (k) => ({ obj: P.banner(k, k.pick(['#c4102a', '#5a2070', '#1f5fb4'])), s: 1.1, ry: rnd(-0.4, 0.4) }),
      (k) => ({ obj: P.brazier(k), s: 1 }),
      (k) => ({ obj: P.gold(k, 8), s: rnd(0.9, 1.3) }),
      (k) => ({ obj: L.group(P.die(k, 0.9), P.die(k, 0.7, '#c4102a', '#ffffff').translateX(1.6).translateZ(0.5)), ry: rnd(0, 1.5) }),
    ]);
  },
};
