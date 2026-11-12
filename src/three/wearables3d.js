/**
 * Vestiti e accessori dell'avatar in 3D, uno per ogni "type" del catalogo
 * (cappelli, viso, magliette, pantaloni, scarpe, schiena). Ogni funzione
 * restituisce un THREE.Group già posizionato sul personaggio standard
 * (vedi BODY in avatarKit.js), così lo stesso modello serve sia per vestire
 * l'avatar sia per l'anteprima dell'oggetto da solo.
 */
import * as THREE from 'three';
import { BODY, G, TEX, cached, mesh, limb, segment, shade, hexOf, fabric, leather, rubber, plastic, metal, glass, gloss, glow, cosmic, fxMat, haloSprite, placeOnHead, onHead, headShell } from './avatarKit.js';

const PI = Math.PI;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HD = BODY.head;
const TOP = HD.y + HD.r * HD.sy; // cima della testa

/* ---------------- geometrie speciali (in cache) ---------------- */

/** Tubo che si assottiglia verso la punta (corna, baffi, piume). */
function taperTube(key, pts, r0, r1 = 0.01, seg = 32) {
  return cached(`g:taper${key}`, () => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const geo = new THREE.TubeGeometry(curve, seg, 1, 14, false);
    const pos = geo.attributes.position;
    const rad = 15;
    for (let i = 0; i <= seg; i++) {
      const c = curve.getPointAt(i / seg);
      const r = r0 + (r1 - r0) * (i / seg) ** 1.2;
      for (let j = 0; j < rad; j++) {
        const k = i * rad + j;
        const v = V(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).normalize().multiplyScalar(r).add(c);
        pos.setXYZ(k, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
    return geo;
  });
}

/** Piega una geometria attorno all'asse Y (raggio R): per tese e stemmi curvi. */
function bendY(geo, R) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = x / R;
    pos.setXYZ(i, Math.sin(a) * (R + z), pos.getY(i), Math.cos(a) * (R + z) - R);
  }
  geo.computeVertexNormals();
  return geo;
}

function starShape(r = 1, inner = 0.45, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * PI * 2 + PI / 2;
    const rr = i % 2 ? r * inner : r;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}

const starGeo = (depth = 0.04) => G.extrude(`star${depth}`, () => starShape(1, 0.45), depth, 0.02);

/** Piccole scintille (effetto cosmico/brillante). */
function sparkles(group, color, n, box, size = 0.05) {
  let s = 17;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const m = mesh(G.box(1, 1, 1, 0.2, 1), glow(color, 2.6), { p: [box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4])], s: size * (0.6 + r()), r: [r() * 3, r() * 3, r() * 3], shadow: false });
    group.add(m);
  }
}

/** Fiammella (cono luminoso + alone). */
function flame(group, p, scale = 1, c1 = '#ffe14d', c2 = '#ff7a1a', dir = [0, 1, 0]) {
  const f = new THREE.Group();
  f.add(mesh(G.cone(0.16, 0.5, 20), glow(c2, 2.2, 0.85), { p: [0, 0.25, 0], shadow: false }));
  f.add(mesh(G.cone(0.09, 0.32, 16), glow(c1, 3, 0.95), { p: [0, 0.17, 0.01], shadow: false }));
  const h = haloSprite(c2, 0.9, 0.55);
  h.position.set(0, 0.22, 0);
  f.add(h);
  f.position.set(...p);
  f.scale.setScalar(scale);
  f.quaternion.setFromUnitVectors(V(0, 1, 0), V(...dir).normalize());
  group.add(f);
}

/* ======================================================================
 * CAPPELLI
 * ==================================================================== */
const HAT = {
  cap(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1), key: 'cap' });
    const dome = headShell(G.dome(1.2), m, 0.05);
    dome.rotation.x = -0.12;
    g.add(dome);
    // cuciture e bottone
    for (const a of [-0.9, 0, 0.9]) {
      const seam = mesh(G.torus(HD.r + 0.055, 0.008, 1.2, 40), fabric(hexOf(shade(it.c1, 0.75))), { p: [0, HD.y, 0], r: [0, a + PI / 2, PI / 2 - 1.2 / 2 + 0.02] });
      seam.scale.set(HD.sy, HD.sx, HD.sz);
      g.add(seam);
    }
    g.add(mesh(G.sphere(16), fabric(it.c2), { p: [0, TOP + 0.05, -0.08], s: [0.07, 0.04, 0.07] }));
    // visiera
    const brim = mesh(G.cyl(0.46, 0.46, 0.035, 40), plastic(it.c2, 0.3), { p: [0, HD.y + 0.3, 0.55], s: [1, 1, 0.78], r: [0.18, 0, 0] });
    g.add(brim);
    return g;
  },
  beanie(it) {
    const g = new THREE.Group();
    g.add(headShell(G.dome(1.3), fabric(it.c1, { map: TEX.knit(it.c1), key: 'knit' }), 0.06));
    const cuff = mesh(G.torus(1, 0.1, PI * 2, 56), fabric(hexOf(shade(it.c1, 0.82)), { map: TEX.knit(hexOf(shade(it.c1, 0.82))), key: 'knit' }), { p: [0, HD.y + Math.cos(1.3) * HD.r * HD.sy + 0.03, 0], r: [PI / 2, 0, 0] });
    cuff.scale.set(HD.r * Math.sin(1.3) * HD.sx + 0.06, HD.r * Math.sin(1.3) * HD.sz + 0.06, 1);
    g.add(cuff);
    const pom = mesh(G.sphere(24), fabric(it.c2, { map: TEX.knit(it.c2), key: 'knit', sheen: 1 }), { p: [0, TOP + 0.16, 0], s: 0.19 });
    g.add(pom);
    return g;
  },
  bandana(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.dots(it.c1, it.c2), key: 'dots' });
    const d = headShell(G.dome(1.22), m, 0.04);
    d.rotation.x = -0.18;
    g.add(d);
    // nodo e code dietro
    g.add(mesh(G.sphere(16), m, { p: [0, HD.y + 0.2, -0.72], s: [0.13, 0.1, 0.09] }));
    g.add(mesh(G.sphere(16), m, { p: [0.1, HD.y + 0.05, -0.74], s: [0.08, 0.22, 0.03], r: [0.3, 0, -0.5] }));
    g.add(mesh(G.sphere(16), m, { p: [-0.08, HD.y + 0.02, -0.73], s: [0.08, 0.24, 0.03], r: [0.3, 0, 0.35] }));
    return g;
  },
  bucket(it) {
    const g = new THREE.Group();
    const m1 = fabric(it.c1, { map: TEX.plain(it.c1, 0.08), key: 'bkt' });
    g.add(mesh(G.cyl(0.52, 0.68, 0.46, 48), m1, { p: [0, HD.y + 0.5, -0.02] }));
    g.add(mesh(G.sphere(40), m1, { p: [0, HD.y + 0.72, -0.02], s: [0.52, 0.1, 0.52] }));
    const brim = new THREE.Mesh(G.cyl(0.68, 1.02, 0.2, 56, true), new THREE.MeshPhysicalMaterial({ color: it.c2, roughness: 0.85, sheen: 1, sheenColor: '#ffffff', side: THREE.DoubleSide }));
    brim.position.set(0, HD.y + 0.2, -0.02);
    brim.castShadow = brim.receiveShadow = true;
    g.add(brim);
    g.add(mesh(G.torus(1.02, 0.025, PI * 2, 64), fabric(it.c2), { p: [0, HD.y + 0.1, -0.02], r: [PI / 2, 0, 0] }));
    g.add(mesh(G.cyl(0.69, 0.69, 0.08, 48, true), fabric(hexOf(shade(it.c2, 0.8))), { p: [0, HD.y + 0.33, -0.02] }));
    return g;
  },
  headphones(it) {
    const g = new THREE.Group();
    const band = mesh(G.torus(0.8, 0.06, PI, 48), plastic(it.c1, 0.8), { p: [0, HD.y + 0.02, 0], s: [0.98, 1, 1] });
    g.add(band);
    g.add(mesh(G.torus(0.8, 0.04, PI * 0.6, 32), rubber('#1b1d2a'), { p: [0, HD.y + 0.0, 0], r: [0, 0, PI * 0.2] }));
    for (const sx of [-1, 1]) {
      g.add(mesh(G.cyl(0.21, 0.21, 0.16, 40), plastic(it.c2, 0.9), { p: [sx * 0.8, HD.y - 0.02, 0], r: [0, 0, PI / 2] }));
      g.add(mesh(G.torus(0.17, 0.06, PI * 2, 32), leather('#20222e'), { p: [sx * 0.71, HD.y - 0.02, 0], r: [0, PI / 2, 0] }));
      g.add(mesh(G.cyl(0.12, 0.12, 0.02, 32), metal('#d9dde6'), { p: [sx * 0.89, HD.y - 0.02, 0], r: [0, 0, PI / 2] }));
    }
    return g;
  },
  chef(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1, 0.04), key: 'chef' });
    g.add(mesh(G.cyl(0.66, 0.68, 0.32, 48), fabric(it.c2), { p: [0, HD.y + 0.55, -0.03] }));
    for (const [x, y, z, r] of [[0, 1.05, 0, 0.44], [-0.32, 0.9, 0.06, 0.34], [0.32, 0.9, 0.06, 0.34], [0, 0.92, -0.3, 0.36], [0, 0.92, 0.32, 0.32], [-0.22, 1.02, -0.22, 0.3], [0.22, 1.02, -0.2, 0.3]]) g.add(mesh(G.sphere(28), m, { p: [x, HD.y + y, z - 0.03], s: r }));
    return g;
  },
  party(it) {
    const g = new THREE.Group();
    const tex = cached(`t:partystripes${it.c1}${it.c2}`, () => {
      const t = TEX.stripes(it.c1, it.c2).clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1, 2.5);
      t.rotation = 0.5;
      t.needsUpdate = true;
      t.userData.shared = true;
      return t;
    });
    const cone = mesh(G.cone(0.38, 0.95, 40), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.5 }), { p: [0.05, TOP + 0.4, 0], r: [0, 0, -0.12] });
    g.add(cone);
    g.add(mesh(G.sphere(20), fabric(it.c2, { map: TEX.knit(it.c2), key: 'knit' }), { p: [0.11, TOP + 0.9, 0], s: 0.13 }));
    g.add(mesh(G.torus(0.37, 0.025, PI * 2, 40), plastic(it.c2), { p: [0.0, TOP - 0.06, 0], r: [PI / 2, 0.12, 0] }));
    return g;
  },
  tophat(it) {
    const g = new THREE.Group();
    const felt = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.55, sheen: 1, sheenColor: '#6a6f8a', sheenRoughness: 0.35, clearcoat: 0.2 });
    const h = new THREE.Group();
    h.add(mesh(G.cyl(0.44, 0.4, 0.82, 48), felt, { p: [0, 0.45, 0] }));
    h.add(mesh(G.cyl(0.415, 0.405, 0.15, 48), new THREE.MeshPhysicalMaterial({ color: it.c2, roughness: 0.35, sheen: 1, sheenColor: '#ffffff', clearcoat: 0.6 }), { p: [0, 0.14, 0] }));
    const brim = mesh(G.lathe('topbrim', [[0.36, 0], [0.62, -0.01], [0.74, 0.04], [0.76, 0.07], [0.74, 0.06], [0.6, 0.02], [0.36, 0.02]]), felt, { p: [0, 0.02, 0], s: [1, 1, 0.86] });
    brim.material = felt;
    h.add(brim);
    h.position.set(0.02, TOP - 0.1, -0.05);
    h.rotation.set(-0.08, 0, -0.1);
    g.add(h);
    return g;
  },
  cowboy(it) {
    const g = new THREE.Group();
    const m1 = leather(it.c1);
    const h = new THREE.Group();
    const crown = mesh(G.lathe('cowcrown', [[0, 0.5], [0.22, 0.46], [0.36, 0.5], [0.46, 0.46], [0.52, 0.3], [0.54, 0.05], [0.53, 0]]), m1, { s: [1, 1, 0.9] });
    h.add(crown);
    h.add(mesh(G.cyl(0.545, 0.545, 0.09, 48, true), leather(it.c2), { p: [0, 0.08, 0], s: [1, 1, 0.9] }));
    const brim = mesh(G.lathe('cowbrim', [[0.5, 0.03], [0.75, 0.0], [0.98, 0.05], [1.12, 0.17], [1.16, 0.22], [1.12, 0.2], [0.98, 0.09], [0.75, 0.04], [0.5, 0.05]]), leather(it.c2), { s: [1, 1, 0.82] });
    h.add(brim);
    h.position.set(0, TOP - 0.2, -0.04);
    h.rotation.x = -0.1;
    g.add(h);
    return g;
  },
  viking(it) {
    const g = new THREE.Group();
    const steel = metal(it.c1, 0.32);
    g.add(headShell(G.dome(1.42), steel, 0.06));
    const rimY = HD.y + Math.cos(1.42) * HD.r * HD.sy + 0.05;
    const rim = mesh(G.torus(1, 0.06, PI * 2, 56), metal(hexOf(shade(it.c1, 0.8)), 0.4), { p: [0, rimY, 0], r: [PI / 2, 0, 0] });
    rim.scale.set(HD.r * HD.sx + 0.07, HD.r * HD.sz + 0.07, 1);
    g.add(rim);
    // cresta centrale e borchie
    const ridge = mesh(G.torus(HD.r + 0.08, 0.05, PI * 0.95, 40), metal(hexOf(shade(it.c1, 0.85)), 0.3), { p: [0, HD.y - 0.02, 0], r: [0, PI / 2, 0.08] });
    ridge.scale.set(HD.sz, HD.sy, 1);
    g.add(ridge);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      g.add(mesh(G.sphere(10), metal('#c9b27a', 0.3), { p: [Math.sin(a) * (HD.r + 0.1), rimY, Math.cos(a) * (HD.r + 0.08) * HD.sz], s: 0.035 }));
    }
    // corna
    const horn = taperTube('vikhorn', [[0, 0, 0], [0.22, 0.08, 0], [0.38, 0.32, 0.02], [0.4, 0.62, 0.06]], 0.13, 0.015);
    const ivory = new THREE.MeshPhysicalMaterial({ color: it.c2, roughness: 0.45, clearcoat: 0.4, sheen: 0.5, sheenColor: '#ffffff' });
    for (const sx of [-1, 1]) {
      const hm = mesh(horn, ivory, { p: [sx * 0.6, HD.y + 0.3, 0], s: [sx, 1, 1] });
      g.add(hm);
      g.add(mesh(G.torus(0.13, 0.03, PI * 2, 24), metal('#c9b27a', 0.3), { p: [sx * 0.62, HD.y + 0.31, 0], r: [0, 0, PI / 2] }));
    }
    return g;
  },
  pirate(it) {
    const g = new THREE.Group();
    const felt = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.6, sheen: 1, sheenColor: '#55597a', sheenRoughness: 0.4 });
    g.add(headShell(G.dome(1.15), felt, 0.05));
    const flap = cached('g:pirflap', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.95, 0);
      s.quadraticCurveTo(-0.8, 0.18, -0.6, 0.3);
      s.quadraticCurveTo(0, 0.95, 0.6, 0.3);
      s.quadraticCurveTo(0.8, 0.18, 0.95, 0);
      s.quadraticCurveTo(0, 0.2, -0.95, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 24 });
      geo.translate(0, 0, -0.025);
      const pos = geo.attributes.position;
      // più segmenti per piegarla bene
      return bendY(geo.toNonIndexed ? geo : geo, 0.85);
    });
    const front = mesh(flap, felt, { p: [0, HD.y + 0.42, 0.62], r: [-0.25, 0, 0] });
    g.add(front);
    const back = mesh(flap, felt, { p: [0, HD.y + 0.42, -0.62], r: [0.25, PI, 0] });
    g.add(back);
    // bordo dorato e teschio
    const trim = taperTube('pirtrim', [[-0.92, 0.02, 0], [-0.55, 0.32, 0.05], [0, 0.64, 0.12], [0.55, 0.32, 0.05], [0.92, 0.02, 0]], 0.022, 0.022);
    g.add(mesh(trim, metal('#e2b23a', 0.3), { p: [0, HD.y + 0.43, 0.6], r: [-0.25, 0, 0] }));
    const skull = new THREE.Group();
    const bone = new THREE.MeshPhysicalMaterial({ color: it.c2, roughness: 0.4, clearcoat: 0.5 });
    skull.add(mesh(G.sphere(20), bone, { s: [0.13, 0.12, 0.06] }));
    skull.add(mesh(G.box(0.12, 0.06, 0.08, 0.02), bone, { p: [0, -0.1, 0] }));
    for (const sx of [-1, 1]) skull.add(mesh(G.sphere(10), gloss('#111'), { p: [sx * 0.05, 0.01, 0.05], s: [0.032, 0.036, 0.02] }));
    for (const a of [0.7, -0.7]) skull.add(mesh(G.capsule(0.022, 0.32, 8), bone, { p: [0, -0.06, -0.02], r: [0, 0, a] }));
    skull.position.set(0, HD.y + 0.66, 0.73);
    skull.rotation.x = -0.25;
    g.add(skull);
    return g;
  },
  bunny(it) {
    const g = new THREE.Group();
    g.add(mesh(G.torus(0.74, 0.035, PI, 48), plastic(it.c1, 0.4), { p: [0, HD.y + 0.02, 0.05], r: [0, 0, 0], s: [1, 0.98, 1] }));
    const fur = fabric(it.c1, { sheen: 1 });
    const inner = fabric(it.c2);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group();
      ear.add(mesh(G.sphere(28), fur, { p: [0, 0.5, 0], s: [0.17, 0.56, 0.09] }));
      ear.add(mesh(G.sphere(24), inner, { p: [0, 0.48, 0.055], s: [0.1, 0.42, 0.05] }));
      ear.position.set(sx * 0.27, TOP - 0.12, 0.02);
      ear.rotation.set(-0.08, 0, -sx * 0.22);
      if (sx > 0) ear.children.forEach((c) => (c.rotation.x = 0));
      g.add(ear);
    }
    // un orecchio piegato a metà
    const tip = mesh(G.sphere(20), fur, { p: [0.5, TOP + 0.85, 0.05], s: [0.14, 0.22, 0.08], r: [0, 0, -1.1] });
    g.add(tip);
    g.children[2].scale.y = 0.85;
    return g;
  },
  horns(it) {
    const g = new THREE.Group();
    const horn = taperTube('devhorn', [[0, 0, 0], [0.05, 0.16, 0], [0.02, 0.32, 0], [-0.08, 0.44, 0]], 0.11, 0.008);
    const m = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
    for (const sx of [-1, 1]) {
      const h = mesh(horn, m, { s: [-sx, 1, 1] });
      placeOnHead(h, sx * 0.48, 0.72, -0.04);
      h.rotation.z += sx * 0.1;
      const base = new THREE.Group();
      base.add(h);
      g.add(base);
      const ring = mesh(G.torus(0.1, 0.03, PI * 2, 24), plastic(it.c2), {});
      placeOnHead(ring, sx * 0.48, 0.72, 0.0);
      g.add(ring);
    }
    return g;
  },
  wizard(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.62, sheen: 1, sheenColor: hexOf(shade(it.c1, 2.2)), sheenRoughness: 0.4 });
    const cone = cached('g:wizcone', () => {
      const geo = new THREE.ConeGeometry(0.6, 1.5, 48, 24);
      geo.translate(0, 0.75, 0);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const k = Math.max(0, y - 0.6);
        pos.setX(i, pos.getX(i) - k * k * 0.42);
        pos.setY(i, y - k * k * 0.12);
      }
      geo.computeVertexNormals();
      return geo;
    });
    g.add(mesh(cone, m, { p: [0, TOP - 0.18, -0.05], r: [-0.05, 0, 0] }));
    g.add(mesh(G.lathe('wizbrim', [[0.5, 0.02], [0.8, -0.01], [1.02, -0.05], [1.05, -0.03], [0.8, 0.02], [0.5, 0.05]]), m, { p: [0, TOP - 0.16, -0.05] }));
    g.add(mesh(G.cyl(0.6, 0.62, 0.12, 48, true), fabric(it.c2), { p: [0, TOP - 0.1, -0.05] }));
    const gold = glow(it.c2, 0.9);
    for (const [x, y, z, s, r] of [[-0.25, 0.42, 0.42, 0.11, 0.2], [0.18, 0.75, 0.3, 0.08, -0.4], [-0.1, 1.05, 0.18, 0.06, 0.6]]) g.add(mesh(starGeo(), gold, { p: [x, TOP + y, z], s: [s, s, s], r: [-0.3, x, r] }));
    return g;
  },
  crown(it) {
    const g = new THREE.Group();
    const gold = it.fx === 'cosmic' ? cosmic(it.c1, it.c2) : it.fx === 'fire' ? metal(it.c1, 0.2) : metal(it.c1, 0.16);
    const c = new THREE.Group();
    const ring = new THREE.Mesh(G.cyl(0.58, 0.55, 0.3, 64, true), gold);
    ring.material = gold.clone();
    ring.material.side = THREE.DoubleSide;
    ring.castShadow = true;
    c.add(ring);
    c.add(mesh(G.torus(0.565, 0.04, PI * 2, 64), gold, { p: [0, -0.15, 0], r: [PI / 2, 0, 0] }));
    c.add(mesh(G.torus(0.585, 0.03, PI * 2, 64), gold, { p: [0, 0.15, 0], r: [PI / 2, 0, 0] }));
    const gem = new THREE.MeshPhysicalMaterial({ color: it.c2, roughness: 0.05, metalness: 0.1, clearcoat: 1, transmission: 0, emissive: it.c2, emissiveIntensity: it.fx ? 0.5 : 0.18, iridescence: 0.4 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      const x = Math.sin(a) * 0.57;
      const z = Math.cos(a) * 0.57;
      c.add(mesh(G.cone(0.13, 0.36, 4), gold, { p: [x, 0.32, z], r: [0, a + PI / 4, 0] }));
      c.add(mesh(G.sphere(16), gold, { p: [x * 1.0, 0.52, z * 1.0], s: 0.055 }));
      const gm = mesh(G.sphere(16), gem, { p: [Math.sin(a + PI / 5) * 0.6, 0.0, Math.cos(a + PI / 5) * 0.6], s: [0.075, 0.075, 0.04] });
      gm.lookAt(gm.position.clone().multiplyScalar(2));
      c.add(gm);
    }
    c.position.set(0, TOP - 0.06, -0.02);
    c.rotation.set(-0.06, 0, 0.06);
    g.add(c);
    if (it.fx === 'fire') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2;
        flame(g, [Math.sin(a) * 0.55, TOP + 0.2, Math.cos(a) * 0.55], 0.75, '#ffe14d', it.c1);
      }
    }
    if (it.fx === 'cosmic') sparkles(g, it.c2, 9, [-0.8, 0.8, TOP, TOP + 0.9, -0.5, 0.6], 0.05);
    if (it.fx === 'shine') sparkles(g, '#fff6c2', 5, [-0.7, 0.7, TOP + 0.1, TOP + 0.8, 0.2, 0.7], 0.04);
    return g;
  },
  halo(it) {
    const g = new THREE.Group();
    const ring = mesh(G.torus(0.44, 0.06, PI * 2, 64), new THREE.MeshPhysicalMaterial({ color: it.c2, emissive: it.c1, emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.2, clearcoat: 1 }), { p: [0, TOP + 0.32, -0.05], r: [PI / 2 - 0.25, 0, 0.08], shadow: false });
    g.add(ring);
    const h = haloSprite(it.c1, 1.6, 0.6);
    h.position.set(0, TOP + 0.32, -0.05);
    g.add(h);
    return g;
  },
};

/* ======================================================================
 * VISO
 * ==================================================================== */
const EYE = { yaw: 0.36, pitch: -0.02 };

function rimAt(yaw, pitch, out, geo, mat, s = 1) {
  const m = mesh(geo, mat, { s, shadow: true });
  placeOnHead(m, yaw, pitch, out);
  return m;
}

function temples(g, mat, out = 0.12) {
  for (const sx of [-1, 1]) {
    const a = onHead(sx * 0.62, EYE.pitch + 0.03, out).p;
    const b = onHead(sx * 1.45, EYE.pitch + 0.06, 0.04).p;
    g.add(segment([a.x, a.y, a.z], [b.x, b.y, b.z], 0.02, 0.02, mat, 10));
  }
}

const FACE = {
  glasses(it) {
    const g = new THREE.Group();
    const frame = plastic(it.c1, 0.9);
    for (const sx of [-1, 1]) {
      g.add(rimAt(sx * EYE.yaw, EYE.pitch, 0.1, G.torus(0.165, 0.028, PI * 2, 40), frame));
      g.add(rimAt(sx * EYE.yaw, EYE.pitch, 0.1, G.cyl(0.16, 0.16, 0.01, 32), glass('#dff1ff', 0.22), [1, 1, 1]));
      g.children[g.children.length - 1].rotateX(PI / 2);
    }
    const a = onHead(-0.16, EYE.pitch + 0.02, 0.12).p;
    const b = onHead(0.16, EYE.pitch + 0.02, 0.12).p;
    const mid = onHead(0, EYE.pitch + 0.06, 0.16).p;
    g.add(mesh(G.tube('gbridge', [[a.x, a.y, a.z], [mid.x, mid.y, mid.z], [b.x, b.y, b.z]], 0.022), frame));
    temples(g, frame);
    return g;
  },
  sunglasses(it) {
    const g = new THREE.Group();
    const lensGeo = G.extrude('sunlens', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.2, 0.08);
      s.lineTo(0.2, 0.08);
      s.quadraticCurveTo(0.21, -0.14, 0.02, -0.15);
      s.quadraticCurveTo(-0.2, -0.15, -0.2, 0.08);
      return s;
    }, 0.02, 0.012);
    for (const sx of [-1, 1]) {
      const l = mesh(lensGeo, gloss(it.c1), { s: [sx, 1, 1] });
      placeOnHead(l, sx * EYE.yaw, EYE.pitch, 0.1);
      g.add(l);
    }
    const a = onHead(-0.62, EYE.pitch + 0.06, 0.1).p;
    const m = onHead(0, EYE.pitch + 0.07, 0.16).p;
    const b = onHead(0.62, EYE.pitch + 0.06, 0.1).p;
    g.add(mesh(G.tube('sunbar', [[a.x, a.y, a.z], [m.x, m.y, m.z], [b.x, b.y, b.z]], 0.03), plastic(it.c2, 0.9)));
    temples(g, plastic(it.c2, 0.9));
    return g;
  },
  mustache(it) {
    const g = new THREE.Group();
    const hair = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.55, sheen: 1, sheenColor: hexOf(shade(it.c1, 2.2)), bumpMap: TEX.hairBump(), bumpScale: 0.6 });
    const half = taperTube('mus', [[0, 0, 0], [0.1, -0.02, 0.02], [0.2, -0.05, 0.0], [0.27, 0.02, -0.03], [0.24, 0.07, -0.04]], 0.06, 0.012);
    for (const sx of [-1, 1]) {
      const m = mesh(half, hair, { s: [sx, 1, 1] });
      placeOnHead(m, 0, -0.29, 0.03);
      g.add(m);
    }
    return g;
  },
  patch(it) {
    const g = new THREE.Group();
    const m = leather(it.c1);
    const p = mesh(G.sphere(24), m, { s: [0.2, 0.17, 0.05] });
    placeOnHead(p, EYE.yaw, EYE.pitch, 0.06);
    g.add(p);
    const strap = headShell(G.band(PI * 2, PI / 2 - 0.035, 0.07, 64), fabric(it.c1), 0.035);
    strap.rotation.z = -0.42;
    strap.position.y += 0.06;
    g.add(strap);
    return g;
  },
  starglasses(it) {
    const g = new THREE.Group();
    const frame = plastic(it.c1, 1);
    const lens = glass(it.c2, 0.45);
    for (const sx of [-1, 1]) {
      const f = mesh(starGeo(0.05), frame, { s: [0.22, 0.22, 0.6] });
      placeOnHead(f, sx * EYE.yaw, EYE.pitch + 0.02, 0.12);
      g.add(f);
      const l = mesh(starGeo(0.01), lens, { s: [0.15, 0.15, 1] });
      placeOnHead(l, sx * EYE.yaw, EYE.pitch + 0.02, 0.15);
      g.add(l);
    }
    const a = onHead(-0.15, EYE.pitch + 0.03, 0.13).p;
    const b = onHead(0.15, EYE.pitch + 0.03, 0.13).p;
    g.add(segment([a.x, a.y, a.z], [b.x, b.y, b.z], 0.025, 0.025, plastic(it.c2), 10));
    temples(g, frame);
    return g;
  },
  monocle(it) {
    const g = new THREE.Group();
    const gold = metal(it.c1, 0.2);
    g.add(rimAt(EYE.yaw, EYE.pitch, 0.1, G.torus(0.17, 0.03, PI * 2, 40), gold));
    const l = rimAt(EYE.yaw, EYE.pitch, 0.1, G.cyl(0.165, 0.165, 0.01, 32), glass('#e6f4ff', 0.25));
    l.rotateX(PI / 2);
    g.add(l);
    const a = onHead(EYE.yaw + 0.2, EYE.pitch - 0.14, 0.1).p;
    g.add(mesh(G.tube('monochain', [[a.x, a.y, a.z], [a.x + 0.1, a.y - 0.25, a.z - 0.02], [a.x + 0.08, a.y - 0.5, a.z - 0.15], [a.x + 0.02, a.y - 0.8, a.z - 0.25]], 0.012), gold));
    return g;
  },
  beard(it) {
    const g = new THREE.Group();
    const hair = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.6, sheen: 1, sheenColor: hexOf(shade(it.c1, 2)), alphaMap: TEX.beardAlpha(), alphaTest: 0.5, bumpMap: TEX.hairBump(), bumpScale: 1, side: THREE.DoubleSide });
    g.add(headShell(G.band(PI * 0.86, PI / 2 + 0.05, 0.95, 64), hair, 0.05));
    const solid = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.6, sheen: 1, sheenColor: hexOf(shade(it.c1, 2)), bumpMap: TEX.hairBump(), bumpScale: 1 });
    const chin = mesh(G.sphere(28), solid, { s: [0.36, 0.3, 0.24] });
    placeOnHead(chin, 0, -0.78, -0.08);
    g.add(chin);
    // baffi uniti alla barba
    g.add(FACE.mustache({ c1: it.c1 }));
    return g;
  },
  mask(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({
      color: it.c1,
      alphaMap: TEX.maskAlpha(),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: it.fx === 'shine' ? 0.2 : 0.45,
      metalness: it.fx === 'shine' ? 1 : 0,
      clearcoat: 0.8,
      sheen: it.fx === 'shine' ? 0 : 0.6,
      sheenColor: '#ffffff',
    });
    g.add(headShell(G.band(PI * 0.62, PI / 2 - 0.3, 0.56, 64), m, 0.07));
    if (it.fx === 'shine') sparkles(g, '#fff6c2', 4, [-0.6, 0.6, HD.y, HD.y + 0.4, 0.6, 0.9], 0.04);
    return g;
  },
  '3d'(it) {
    const g = new THREE.Group();
    g.add(headShell(G.band(PI * 0.52, PI / 2 - 0.16, 0.34, 48), new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.5, side: THREE.DoubleSide }), 0.11));
    const lens = (c, sx) => {
      const l = headShell(G.band(0.3, PI / 2 - 0.1, 0.22, 16), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.1, transparent: true, opacity: 0.82, clearcoat: 1, emissive: c, emissiveIntensity: 0.25, side: THREE.DoubleSide }), 0.12);
      l.rotation.y = sx * EYE.yaw;
      return l;
    };
    g.add(lens(it.c2, -1), lens(it.c3, 1));
    temples(g, plastic(it.c1), 0.12);
    return g;
  },
  visor(it) {
    const g = new THREE.Group();
    g.add(headShell(G.band(PI * 0.7, PI / 2 - 0.2, 0.4, 64), gloss(it.c2), 0.11));
    g.add(headShell(G.band(PI * 0.62, PI / 2 - 0.06, 0.1, 64), glow(it.c1, 2.6), 0.125));
    const h = haloSprite(it.c1, 1.4, 0.35);
    h.position.copy(onHead(0, EYE.pitch, 0.3).p);
    g.add(h);
    temples(g, plastic(it.c2), 0.1);
    return g;
  },
  laser(it) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const { p, n } = onHead(sx * EYE.yaw, EYE.pitch, 0.07);
      g.add(mesh(G.sphere(20), glow(it.c1, 3), { p: [p.x, p.y, p.z], s: 0.1, shadow: false }));
      const hs = haloSprite(it.c1, 0.75, 0.8);
      hs.position.copy(p);
      g.add(hs);
      const end = p.clone().add(n.clone().add(V(sx * 0.35, -0.25, 0)).normalize().multiplyScalar(1.6));
      g.add(segment([p.x, p.y, p.z], [end.x, end.y, end.z], 0.035, 0.07, glow(it.c1, 2.5, 0.75), 12));
      g.add(segment([p.x, p.y, p.z], [end.x, end.y, end.z], 0.012, 0.025, glow('#ffffff', 3, 0.9), 8));
    }
    return g;
  },
  cosmiceyes(it) {
    const g = new THREE.Group();
    for (const [sx, c] of [[-1, it.c1], [1, it.c2]]) {
      const { p } = onHead(sx * EYE.yaw, EYE.pitch, 0.07);
      g.add(mesh(G.sphere(24), cosmic(c, c), { p: [p.x, p.y, p.z], s: 0.13 }));
      g.add(mesh(G.sphere(12), glow('#ffffff', 3), { p: [p.x + 0.035, p.y + 0.04, p.z + 0.1], s: 0.03, shadow: false }));
      const hs = haloSprite(c, 0.9, 0.7);
      hs.position.copy(p);
      g.add(hs);
    }
    sparkles(g, it.c2, 8, [-0.7, 0.7, HD.y - 0.2, HD.y + 0.35, 0.55, 0.95], 0.035);
    return g;
  },
};

/* ======================================================================
 * MAGLIETTE
 * ==================================================================== */
const S = BODY.shoulder;
const W = BODY.wrist;
const TORSO_PTS = [[0, 0.9], [0.4, 0.9], [0.445, 0.97], [0.46, 1.18], [0.45, 1.42], [0.44, 1.6], [0.4, 1.73], [0.3, 1.82], [0.17, 1.87], [0.12, 1.88]];
const ROBE_PTS = [[0, 0.38], [0.62, 0.38], [0.6, 0.5], [0.52, 0.8], [0.47, 1.05], [0.46, 1.25], [0.45, 1.42], [0.44, 1.6], [0.4, 1.73], [0.3, 1.82], [0.17, 1.87], [0.12, 1.88]];

function torso(mat, pts = TORSO_PTS, key = 'tee') {
  const m = mesh(G.lathe(`torso${key}`, pts, 56), mat, { s: [1, 1, BODY.torso.depth] });
  return m;
}

/** Maniche: corte (t ~0.38) o lunghe (t ~0.93), con polsino. */
function sleeves(g, mat, t, cuffMat = null) {
  for (const sx of [-1, 1]) {
    const a = [sx * (S.x - 0.02), S.y + 0.02, 0];
    const b = [sx * (S.x + (W.x - S.x) * t), S.y + (W.y - S.y) * t, 0];
    g.add(mesh(G.sphere(28), mat, { p: [sx * (S.x - 0.03), S.y + 0.0, 0], s: [0.17, 0.15, 0.16] }));
    g.add(segment(a, b, 0.155, t > 0.6 ? 0.14 : 0.148, mat, 28));
    const cuff = segment([b[0] - sx * 0.006, b[1] + 0.03, 0], [b[0] + sx * 0.012, b[1] - 0.04, 0], 0.152, 0.15, cuffMat || mat, 28);
    g.add(cuff);
  }
}

function collar(g, mat, r = 0.155, y = 1.86, tube = 0.035) {
  g.add(mesh(G.torus(r, tube, PI * 2, 32), mat, { p: [0, y, 0.01], r: [PI / 2 + 0.25, 0, 0], s: [1, 0.8, 1] }));
}

function buttons(g, color, n = 4, z = 0.335, y0 = 1.72, step = 0.16) {
  for (let i = 0; i < n; i++) g.add(mesh(G.sphere(12), plastic(color), { p: [0, y0 - i * step, z + (i > 1 ? 0.01 : 0)], s: [0.03, 0.03, 0.015] }));
}

const SHIRT = {
  tee(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1), key: 'tee' });
    g.add(torso(m));
    sleeves(g, m, 0.36, fabric(it.c2, { map: TEX.plain(it.c2), key: 'tee' }));
    collar(g, fabric(it.c2, { map: TEX.plain(it.c2), key: 'tee' }));
    return g;
  },
  stripes(it) {
    const g = new THREE.Group();
    const m = fabric('#ffffff', { map: TEX.stripes(it.c1, it.c2), key: 'stripes' });
    g.add(torso(m));
    sleeves(g, m, 0.4, fabric(it.c2));
    collar(g, fabric(it.c2));
    return g;
  },
  hoodie(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1, 0.08), key: 'hood' });
    g.add(torso(m));
    sleeves(g, m, 0.94, fabric(it.c2));
    // cappuccio appoggiato sulla schiena (conca aperta verso l'alto)
    const hoodMat = cached(`m:hood${it.c1}`, () => {
      const hm = m.clone();
      hm.side = THREE.DoubleSide;
      return hm;
    });
    g.add(mesh(G.dome(PI / 2, 32), hoodMat, { p: [0, 1.74, -0.27], s: [0.34, 0.26, 0.2], r: [PI - 0.35, 0, 0] }));
    g.add(mesh(G.torus(0.33, 0.035, PI, 32), fabric(it.c2), { p: [0, 1.76, -0.2], r: [-0.35 - PI / 2, 0, 0], s: [1, 0.62, 1] }));
    g.add(mesh(G.box(0.46, 0.22, 0.06, 0.05), fabric(it.c2), { p: [0, 1.17, 0.335], r: [-0.05, 0, 0] }));
    for (const sx of [-1, 1]) g.add(segment([sx * 0.07, 1.82, 0.2], [sx * 0.08, 1.52, 0.335], 0.012, 0.012, fabric('#ffffff'), 8));
    for (const sx of [-1, 1]) g.add(mesh(G.sphere(8), plastic('#ffffff'), { p: [sx * 0.08, 1.5, 0.34], s: 0.025 }));
    g.add(mesh(G.torus(0.43, 0.05, PI * 2, 48), fabric(it.c2), { p: [0, 0.93, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth * 1.04, 1] }));
    return g;
  },
  tank(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1), key: 'tank' });
    g.add(torso(m, [[0, 0.9], [0.4, 0.9], [0.445, 0.97], [0.46, 1.18], [0.45, 1.42], [0.43, 1.58], [0.36, 1.66], [0.18, 1.72], [0.12, 1.73]], 'tank'));
    for (const sx of [-1, 1]) {
      g.add(segment([sx * 0.25, 1.62, 0.28], [sx * 0.28, 1.84, 0.0], 0.04, 0.04, fabric(it.c2), 10));
      g.add(segment([sx * 0.28, 1.84, 0.0], [sx * 0.25, 1.62, -0.28], 0.04, 0.04, fabric(it.c2), 10));
    }
    return g;
  },
  jersey(it) {
    const g = new THREE.Group();
    const m = fabric('#ffffff', { map: TEX.jersey(it.c1, it.c2, it.text || '10'), key: `jersey${it.text}` });
    g.add(torso(m));
    const sl = fabric(it.c1, { map: TEX.plain(it.c1), key: 'tee' });
    sleeves(g, sl, 0.4, fabric(it.c2));
    // collo a V
    const v = taperTube('jerV', [[-0.13, 1.85, 0.12], [-0.05, 1.74, 0.25], [0, 1.69, 0.28], [0.05, 1.74, 0.25], [0.13, 1.85, 0.12]], 0.03, 0.03);
    g.add(mesh(v, fabric(it.c2)));
    return g;
  },
  hawaii(it) {
    const g = new THREE.Group();
    const m = fabric('#ffffff', { map: TEX.hawaii(it.c1, it.c2), key: 'hawaii' });
    g.add(torso(m));
    sleeves(g, m, 0.4, m);
    // colletto aperto
    for (const sx of [-1, 1]) g.add(mesh(G.box(0.16, 0.05, 0.22, 0.02), m, { p: [sx * 0.12, 1.82, 0.14], r: [0.9, sx * 0.5, sx * 0.4] }));
    buttons(g, '#fff6e0', 4, 0.335, 1.62, 0.17);
    return g;
  },
  jacket(it) {
    const g = new THREE.Group();
    const m = it.fx === 'shine' ? metal(it.c1, 0.28) : leather(it.c1);
    g.add(torso(m));
    sleeves(g, m, 0.95, it.fx === 'shine' ? metal(it.c2, 0.3) : leather(it.c2));
    // risvolti e cerniera
    for (const sx of [-1, 1]) g.add(mesh(G.box(0.16, 0.42, 0.04, 0.02), it.fx === 'shine' ? metal(it.c2, 0.3) : leather(it.c2), { p: [sx * 0.11, 1.66, 0.3], r: [-0.35, sx * 0.25, sx * 0.35] }));
    g.add(segment([0, 1.62, 0.338], [0, 0.95, 0.335], 0.012, 0.012, metal('#d9dde6', 0.25), 8));
    g.add(mesh(G.box(0.04, 0.07, 0.02, 0.01), metal('#d9dde6', 0.2), { p: [0, 1.36, 0.345] }));
    collar(g, it.fx === 'shine' ? metal(it.c2, 0.3) : leather(it.c2), 0.17, 1.86, 0.05);
    if (it.fx === 'shine') sparkles(g, '#fff6c2', 6, [-0.5, 0.5, 1.0, 1.85, 0.3, 0.55], 0.035);
    return g;
  },
  tux(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.5, sheen: 1, sheenColor: '#7a7f9e', sheenRoughness: 0.35, clearcoat: 0.25 });
    g.add(torso(m));
    sleeves(g, m, 0.93, fabric(it.c2));
    // camicia bianca a V e papillon
    const front = mesh(G.extrude('tuxV', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.17, 0.42);
      s.lineTo(0.17, 0.42);
      s.lineTo(0, -0.38);
      s.closePath();
      return s;
    }, 0.01, 0.01), fabric(it.c2), { p: [0, 1.44, 0.322], r: [-0.12, 0, 0] });
    g.add(front);
    buttons(g, '#1e1f29', 3, 0.338, 1.58, 0.13);
    const tie = new THREE.Group();
    const red = new THREE.MeshPhysicalMaterial({ color: '#d6283d', roughness: 0.35, sheen: 1, sheenColor: '#ff9aa6', clearcoat: 0.4 });
    for (const sx of [-1, 1]) tie.add(mesh(G.cone(0.075, 0.15, 3), red, { p: [sx * 0.07, 0, 0], r: [0, 0, sx * PI / 2] }));
    tie.add(mesh(G.sphere(12), red, { s: [0.04, 0.035, 0.03] }));
    tie.position.set(0, 1.82, 0.22);
    tie.rotation.x = -0.4;
    g.add(tie);
    for (const sx of [-1, 1]) g.add(mesh(G.box(0.12, 0.5, 0.03, 0.015), new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.2, clearcoat: 1 }), { p: [sx * 0.19, 1.55, 0.315], r: [-0.15, sx * 0.3, sx * 0.3] }));
    return g;
  },
  space(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.55, sheen: 0.8, sheenColor: '#ffffff', clearcoat: 0.3 });
    g.add(torso(m));
    sleeves(g, m, 0.95, plastic(it.c2, 0.6));
    g.add(mesh(G.torus(0.2, 0.06, PI * 2, 32), metal('#c9d0dc', 0.3), { p: [0, 1.86, 0.01], r: [PI / 2 + 0.2, 0, 0] }));
    g.add(mesh(G.box(0.34, 0.22, 0.08, 0.04), plastic('#d9dee8', 0.4), { p: [0, 1.4, 0.33] }));
    for (const [x, c] of [[-0.09, it.c2], [0, '#2fd0ff'], [0.09, '#5dff9c']]) g.add(mesh(G.sphere(12), glow(c, 1.6), { p: [x, 1.42, 0.375], s: 0.035, shadow: false }));
    g.add(mesh(G.box(0.18, 0.04, 0.04, 0.015), gloss('#20232f'), { p: [0, 1.34, 0.37] }));
    for (const y of [1.0, 1.2]) g.add(mesh(G.torus(0.455, 0.025, PI * 2, 48), plastic(it.c2), { p: [0, y, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth * 1.02, 1] }));
    return g;
  },
  armor(it) {
    const g = new THREE.Group();
    const m = it.fx === 'fire' ? metal(it.c1, 0.35) : metal(it.c1, 0.3);
    g.add(torso(m));
    sleeves(g, fabric('#3a3f50'), 0.94, metal(it.c2, 0.35));
    const trim = metal(it.c2, 0.32);
    for (const y of [1.08, 1.3, 1.52]) g.add(mesh(G.torus(0.462, 0.03, PI * 0.95, 48), trim, { p: [0, y, 0], r: [PI / 2, 0, PI * 0.025], s: [1, BODY.torso.depth * 1.03, 1] }));
    for (const sx of [-1, 1]) {
      g.add(mesh(G.dome(PI / 2, 32), metal(it.c2, 0.28), { p: [sx * (S.x + 0.01), S.y + 0.02, 0], s: [0.25, 0.2, 0.25], r: [0, 0, -sx * 0.5] }));
      for (let i = 0; i < 3; i++) g.add(mesh(G.sphere(10), metal('#e6d29a', 0.3), { p: [sx * (S.x + 0.09 + i * 0.03), S.y + 0.1 - i * 0.05, 0.12 - i * 0.04], s: 0.025 }));
    }
    // stemma sul petto
    g.add(mesh(G.extrude('crest', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.13, 0.12);
      s.lineTo(0.13, 0.12);
      s.lineTo(0.13, -0.02);
      s.quadraticCurveTo(0.12, -0.14, 0, -0.18);
      s.quadraticCurveTo(-0.12, -0.14, -0.13, -0.02);
      s.closePath();
      return s;
    }, 0.03, 0.015), it.fx === 'fire' ? glow('#ffb347', 1.2) : metal(it.c2, 0.25), { p: [0, 1.45, 0.335] }));
    if (it.fx === 'fire') {
      flame(g, [-0.42, 1.78, 0.05], 0.55, '#ffe14d', '#ff7a1a');
      flame(g, [0.42, 1.78, 0.05], 0.55, '#ffe14d', '#ff7a1a');
    }
    return g;
  },
  flame(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: TEX.flames(it.c1, it.c2), emissiveMap: TEX.flames(it.c1, it.c2, true), emissive: new THREE.Color(it.c2), emissiveIntensity: 1.3, roughness: 0.8, sheen: 0.6, sheenColor: '#ff9a4d' });
    g.add(torso(m));
    sleeves(g, fabric(it.c1), 0.38, fabric(it.c2));
    collar(g, fabric(it.c2));
    flame(g, [-0.25, 0.92, 0.3], 0.5, '#ffe14d', it.c2, [0, 1, 0.3]);
    flame(g, [0.22, 0.92, 0.32], 0.42, '#ffe14d', it.c2, [0, 1, 0.3]);
    return g;
  },
  robe(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ map: TEX.galaxy(it.c1, it.c2), roughness: 0.55, sheen: 1, sheenColor: it.c2, sheenRoughness: 0.4, emissiveMap: TEX.galaxy(it.c1, it.c2), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25, iridescence: 0.5 });
    g.add(torso(m, ROBE_PTS, 'robe'));
    sleeves(g, m, 0.95, fabric(it.c2));
    const v = taperTube('robeV', [[-0.16, 1.86, 0.1], [-0.06, 1.7, 0.27], [0, 1.62, 0.3], [0.06, 1.7, 0.27], [0.16, 1.86, 0.1]], 0.035, 0.035);
    g.add(mesh(v, glow(it.c2, 1.2)));
    g.add(mesh(G.torus(0.6, 0.03, PI * 2, 56), glow(it.c2, 1.2), { p: [0, 0.4, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth, 1] }));
    sparkles(g, it.c2, 8, [-0.7, 0.7, 0.6, 1.9, 0.2, 0.6], 0.035);
    return g;
  },
};

/* ======================================================================
 * PANTALONI
 * ==================================================================== */
const P = BODY.hip;

function pelvis(mat) {
  return mesh(G.lathe('pelvis', [[0, 0.86], [0.38, 0.86], [0.43, 0.94], [0.44, 1.04], [0.43, 1.1], [0, 1.1]], 48), mat, { s: [1, 1, BODY.torso.depth] });
}

function legs(g, mat, bottom, hemMat = null, flare = 0) {
  for (const sx of [-1, 1]) {
    const top = [sx * P.x, 0.98, 0];
    const bot = [sx * (P.x + 0.01), bottom, 0];
    g.add(segment(top, bot, 0.205, 0.18 + flare, mat, 28));
    if (hemMat) g.add(mesh(G.torus(0.18 + flare, 0.022, PI * 2, 28), hemMat, { p: [bot[0], bottom + 0.02, 0], r: [PI / 2, 0, 0] }));
  }
}

function belt(g, color, buckle = '#d9dde6') {
  g.add(mesh(G.torus(0.44, 0.045, PI * 2, 48), leather(color), { p: [0, 1.06, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth * 1.02, 1] }));
  g.add(mesh(G.box(0.12, 0.09, 0.03, 0.015), metal(buckle, 0.25), { p: [0, 1.06, 0.33] }));
}

const PANTS = {
  long(it) {
    const g = new THREE.Group();
    const jeans = /jeans/.test(it.id);
    const m = it.fx === 'shine' ? metal(it.c1, 0.22) : /leather/.test(it.id) ? leather(it.c1) : fabric(it.c1, { map: jeans ? TEX.denim(it.c1, it.c2) : TEX.plain(it.c1), key: jeans ? 'denim' : 'long' });
    g.add(pelvis(m));
    legs(g, m, 0.27, jeans ? fabric(it.c2) : null);
    if (jeans) for (const sx of [-1, 1]) g.add(mesh(G.box(0.012, 0.6, 0.01, 0.004), fabric('#e8a33d'), { p: [sx * (P.x + 0.19), 0.62, 0.0], r: [0, 0, sx * 0.02] }));
    belt(g, jeans ? '#6a4024' : hexOf(shade(it.c1, 0.6)), it.fx === 'shine' ? '#fff3b0' : '#d9dde6');
    if (it.fx === 'shine') sparkles(g, '#fff6c2', 5, [-0.45, 0.45, 0.3, 1.0, 0.15, 0.4], 0.035);
    return g;
  },
  shorts(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1), key: 'shorts' });
    g.add(pelvis(m));
    legs(g, m, 0.66, fabric(it.c2), 0.03);
    g.add(mesh(G.torus(0.44, 0.04, PI * 2, 48), fabric(it.c2), { p: [0, 1.07, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth * 1.02, 1] }));
    return g;
  },
  track(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1, 0.1), key: 'track', sheen: 1 });
    g.add(pelvis(m));
    legs(g, m, 0.27, fabric(it.c1));
    for (const sx of [-1, 1]) for (const dz of [-0.03, 0.03]) g.add(segment([sx * (P.x + 0.2), 1.0, dz], [sx * (P.x + 0.19), 0.28, dz], 0.012, 0.012, fabric(it.c2), 6));
    g.add(mesh(G.torus(0.44, 0.04, PI * 2, 48), fabric(it.c2), { p: [0, 1.07, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth * 1.02, 1] }));
    return g;
  },
  cargo(it) {
    const g = PANTS.long({ ...it, id: 'cargo' });
    for (const sx of [-1, 1]) {
      g.add(mesh(G.box(0.08, 0.2, 0.18, 0.025), fabric(it.c2), { p: [sx * (P.x + 0.2), 0.6, 0.02] }));
      g.add(mesh(G.box(0.085, 0.06, 0.19, 0.02), fabric(hexOf(shade(it.c2, 0.85))), { p: [sx * (P.x + 0.205), 0.69, 0.02] }));
    }
    return g;
  },
  plaid(it) {
    const g = new THREE.Group();
    const m = fabric('#ffffff', { map: TEX.plaid(it.c1, it.c2), key: 'plaid' });
    g.add(pelvis(m));
    legs(g, m, 0.27);
    belt(g, '#2a1d14');
    return g;
  },
  camo(it) {
    const g = new THREE.Group();
    const m = fabric('#ffffff', { map: TEX.camo(it.c1, it.c2), key: 'camo' });
    g.add(pelvis(m));
    legs(g, m, 0.27, fabric(it.c2));
    belt(g, '#3a2f1c');
    return g;
  },
  pirate(it) {
    const g = new THREE.Group();
    const m = fabric(it.c1, { map: TEX.plain(it.c1, 0.07), key: 'pirate' });
    g.add(pelvis(m));
    legs(g, m, 0.46, null, 0.04);
    // orlo frastagliato
    for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2;
      g.add(mesh(G.cone(0.05, 0.1, 6), m, { p: [sx * (P.x + 0.01) + Math.sin(a) * 0.2, 0.43, Math.cos(a) * 0.2], r: [PI, 0, 0] }));
    }
    // fascia in vita annodata
    const sash = fabric(it.c2);
    g.add(mesh(G.torus(0.445, 0.07, PI * 2, 48), sash, { p: [0, 1.05, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth * 1.03, 1] }));
    g.add(mesh(G.sphere(12), sash, { p: [0.3, 1.04, 0.26], s: [0.08, 0.07, 0.06] }));
    g.add(mesh(G.box(0.07, 0.3, 0.03, 0.02), sash, { p: [0.33, 0.86, 0.27], r: [0, 0, 0.15] }));
    return g;
  },
  rainbow(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ map: TEX.rainbow(), roughness: 0.75, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.4 });
    g.add(pelvis(m));
    legs(g, m, 0.27);
    g.add(mesh(G.torus(0.44, 0.04, PI * 2, 48), fabric('#ffffff'), { p: [0, 1.07, 0], r: [PI / 2, 0, 0], s: [1, BODY.torso.depth * 1.02, 1] }));
    return g;
  },
  lava(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: TEX.lava(it.c1, it.c2), emissiveMap: TEX.lava(it.c1, it.c2, true), emissive: new THREE.Color(it.c2), emissiveIntensity: 2, roughness: 0.5, clearcoat: 0.6 });
    g.add(pelvis(m));
    legs(g, m, 0.27);
    flame(g, [-0.22, 0.3, 0.15], 0.35, '#ffe14d', it.c2);
    flame(g, [0.24, 0.5, 0.17], 0.3, '#ffe14d', it.c2);
    return g;
  },
  stars(it) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ map: TEX.stars(it.c1, it.c2), emissiveMap: TEX.stars(it.c1, it.c2), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.35, roughness: 0.55, sheen: 1, sheenColor: '#8fa0ff', iridescence: 0.4 });
    g.add(pelvis(m));
    legs(g, m, 0.27);
    sparkles(g, it.c2, 6, [-0.5, 0.5, 0.3, 1.0, 0.2, 0.45], 0.035);
    return g;
  },
};

/* ======================================================================
 * SCARPE
 * ==================================================================== */
const FOOT = { x: 0.2, z: 0.06 };

function pair(build) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const s = build(sx);
    s.position.x += sx * FOOT.x;
    s.position.z += FOOT.z;
    s.rotation.y = sx * 0.08;
    g.add(s);
  }
  return g;
}

function sole(color, len = 0.52, w = 0.3, h = 0.07) {
  return mesh(G.box(w, h, len, 0.03), rubber(color), { p: [0, h / 2, 0.02] });
}

function sneakerShape(upper, trim, { high = false } = {}) {
  const s = new THREE.Group();
  s.add(mesh(G.sphere(28), upper, { p: [0, 0.14, 0.04], s: [0.145, 0.115, 0.255] }));
  s.add(mesh(G.cyl(0.16, 0.165, high ? 0.3 : 0.12, 28), upper, { p: [0, high ? 0.27 : 0.2, -0.04] }));
  s.add(mesh(G.torus(0.155, 0.025, PI * 2, 24), trim, { p: [0, high ? 0.42 : 0.26, -0.04], r: [PI / 2, 0, 0] }));
  s.add(mesh(G.sphere(20), trim, { p: [0, 0.11, 0.21], s: [0.12, 0.08, 0.09] }));
  for (let i = 0; i < 3; i++) s.add(mesh(G.box(0.12, 0.018, 0.03, 0.008), fabric('#ffffff'), { p: [0, 0.235 - i * 0.025, 0.06 + i * 0.05], r: [0.6, 0, 0] }));
  return s;
}

const SHOES = {
  sneaker(it) {
    const upper = it.fx === 'glow' ? fxMat(it, it.c1) : leather(it.c1);
    return pair(() => {
      const s = sneakerShape(upper, rubber(it.c2));
      s.add(sole(it.c2));
      // banda laterale
      for (const sx of [-1, 1]) s.add(mesh(G.torus(0.09, 0.02, PI * 0.8, 20), rubber(it.c2), { p: [sx * 0.14, 0.14, 0.0], r: [0, sx * PI / 2, 0.4] }));
      if (it.fx === 'glow') {
        const h = haloSprite(it.c1, 0.7, 0.5);
        h.position.set(0, 0.05, 0.02);
        s.add(h);
      }
      return s;
    });
  },
  flip(it, skin) {
    return pair((sx) => {
      const s = new THREE.Group();
      s.add(mesh(G.box(0.27, 0.05, 0.5, 0.025), rubber(it.c1), { p: [0, 0.025, 0.04] }));
      if (skin) {
        s.add(mesh(G.sphere(24), skin, { p: [0, 0.1, 0.06], s: [0.12, 0.07, 0.2] }));
        for (let i = 0; i < 4; i++) s.add(mesh(G.sphere(10), skin, { p: [-0.07 * sx + sx * i * 0.045, 0.08, 0.25 - i * 0.012], s: 0.032 }));
      }
      const strap = taperTube(`flipstrap${sx}`, [[-0.11, 0.05, -0.02], [-0.05, 0.13, 0.08], [0, 0.11, 0.2], [0.05, 0.13, 0.08], [0.11, 0.05, -0.02]], 0.022, 0.022);
      s.add(mesh(strap, plastic(it.c2, 0.6)));
      return s;
    });
  },
  boot(it) {
    const shine = it.fx === 'shine';
    const rain = /rain/.test(it.id);
    const m = shine ? metal(it.c1, 0.2) : rain ? plastic(it.c1, 1) : leather(it.c1);
    return pair(() => {
      const s = new THREE.Group();
      s.add(mesh(G.sphere(28), m, { p: [0, 0.14, 0.05], s: [0.155, 0.13, 0.26] }));
      s.add(mesh(G.cyl(0.18, 0.17, rain ? 0.42 : 0.3, 28), m, { p: [0, rain ? 0.32 : 0.26, -0.03] }));
      s.add(mesh(G.torus(0.18, 0.03, PI * 2, 28), shine ? metal(it.c2, 0.25) : rubber(it.c2), { p: [0, rain ? 0.53 : 0.41, -0.03], r: [PI / 2, 0, 0] }));
      s.add(sole(it.c2, 0.54, 0.32, rain ? 0.07 : 0.09));
      if (!rain && !shine) for (let i = 0; i < 4; i++) s.add(mesh(G.box(0.14, 0.018, 0.03, 0.008), fabric('#e6d3a8'), { p: [0, 0.32 - i * 0.05, 0.13 + i * 0.02], r: [0.4, 0, 0] }));
      if (shine) {
        const h = haloSprite('#fff3b0', 0.5, 0.4);
        h.position.set(0.1, 0.4, 0.1);
        s.add(h);
      }
      return s;
    });
  },
  high(it) {
    return pair(() => {
      const s = sneakerShape(fabric(it.c1, { sheen: 0.8 }), rubber(it.c2), { high: true });
      s.add(sole(it.c2));
      for (const sx of [-1, 1]) {
        s.add(mesh(G.cyl(0.055, 0.055, 0.02, 24), rubber(it.c2), { p: [sx * 0.163, 0.3, -0.04], r: [0, 0, PI / 2] }));
        s.add(mesh(G.cyl(0.03, 0.03, 0.022, 20), rubber(it.c1), { p: [sx * 0.164, 0.3, -0.04], r: [0, 0, PI / 2] }));
      }
      return s;
    });
  },
  cowboy(it) {
    const m = leather(it.c1);
    return pair(() => {
      const s = new THREE.Group();
      s.add(mesh(G.sphere(28), m, { p: [0, 0.13, 0.08], s: [0.14, 0.12, 0.28] }));
      s.add(mesh(G.cone(0.1, 0.16, 20), m, { p: [0, 0.09, 0.36], r: [PI / 2, 0, 0], s: [1, 1, 0.6] }));
      s.add(mesh(G.cyl(0.2, 0.17, 0.42, 28), m, { p: [0, 0.34, -0.04] }));
      s.add(mesh(G.box(0.16, 0.12, 0.12, 0.02), leather('#3a2412'), { p: [0, 0.06, -0.15] }));
      s.add(mesh(G.box(0.28, 0.035, 0.42, 0.015), leather('#3a2412'), { p: [0, 0.018, 0.1] }));
      for (const sx of [-1, 1]) s.add(mesh(G.torus(0.08, 0.012, PI, 20), metal(it.c2, 0.3), { p: [sx * 0.175, 0.38, -0.04], r: [0, sx * PI / 2, 0] }));
      s.add(mesh(G.torus(0.2, 0.02, PI * 2, 28), metal(it.c2, 0.3), { p: [0, 0.55, -0.04], r: [PI / 2, 0, 0] }));
      // sperone
      s.add(mesh(G.cyl(0.05, 0.05, 0.015, 8), metal('#d9dde6', 0.3), { p: [0, 0.12, -0.24], r: [0, 0, PI / 2] }));
      return s;
    });
  },
  flippers(it) {
    return pair(() => {
      const s = new THREE.Group();
      const fin = mesh(G.extrude('fin', () => {
        const sh = new THREE.Shape();
        sh.moveTo(-0.14, 0);
        sh.lineTo(-0.24, 0.62);
        sh.quadraticCurveTo(-0.12, 0.56, 0, 0.66);
        sh.quadraticCurveTo(0.12, 0.56, 0.24, 0.62);
        sh.lineTo(0.14, 0);
        sh.closePath();
        return sh;
      }, 0.02, 0.012), new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0.92 }), { p: [0, 0.03, 0.38], r: [-PI / 2 + 0.06, 0, 0] });
      s.add(fin);
      s.add(mesh(G.sphere(28), rubber(it.c2), { p: [0, 0.12, 0.0], s: [0.16, 0.12, 0.24] }));
      for (const sx of [-1, 0, 1]) s.add(mesh(G.box(0.02, 0.012, 0.4, 0.005), rubber(it.c2), { p: [sx * 0.08, 0.05, 0.4] }));
      return s;
    });
  },
  skates(it) {
    return pair(() => {
      const s = sneakerShape(leather(it.c1), fabric('#ffffff'), { high: true });
      s.position.y = 0.1;
      const g = new THREE.Group();
      g.add(s);
      g.add(mesh(G.box(0.22, 0.04, 0.5, 0.015), metal('#c9d0dc', 0.3), { p: [0, 0.1, 0.02] }));
      for (const z of [-0.17, 0.21]) for (const sx of [-1, 1]) g.add(mesh(G.cyl(0.065, 0.065, 0.05, 24), plastic(it.c2, 0.8), { p: [sx * 0.09, 0.065, z], r: [0, 0, PI / 2] }));
      g.add(mesh(G.cyl(0.04, 0.05, 0.06, 16), rubber('#e23a5a'), { p: [0, 0.08, 0.3], r: [PI / 2.4, 0, 0] }));
      return g;
    });
  },
  rocket(it) {
    return pair(() => {
      const s = sneakerShape(metal(it.c1, 0.28), plastic(it.c2), {});
      s.add(sole('#5a6170'));
      s.add(mesh(G.cyl(0.07, 0.1, 0.14, 20), metal('#9aa6b8', 0.3), { p: [0, 0.16, -0.24], r: [PI / 2 - 0.4, 0, 0] }));
      flame(s, [0, 0.11, -0.3], 0.55, '#ffe14d', it.c2, [0, -0.6, -1]);
      return s;
    });
  },
  winged(it) {
    return pair((sx) => {
      const s = sneakerShape(cosmic(it.c1, it.c2), metal(it.c2, 0.2));
      s.add(sole('#f1e6c8'));
      const wing = new THREE.Group();
      for (let i = 0; i < 4; i++) wing.add(mesh(G.sphere(16), metal(it.c2, 0.18), { p: [0, 0.07 + i * 0.03, -0.05 - i * 0.055], s: [0.02, 0.05, 0.11 - i * 0.015], r: [0.7 + i * 0.2, 0, 0] }));
      wing.position.set(sx * 0.17, 0.2, 0.02);
      s.add(wing);
      return s;
    });
  },
};

/* ======================================================================
 * SCHIENA
 * ==================================================================== */
const BACKZ = -BODY.torso.depth * 0.46;

function capeGeo() {
  return cached('g:cape', () => {
    const geo = new THREE.PlaneGeometry(1, 1, 24, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i); // -0.5..0.5
      const v = 0.5 - pos.getY(i); // 0 in alto, 1 in basso
      const width = 0.82 + v * 0.75;
      const R = 0.38 + v * 0.25;
      const a = (u * width) / R;
      const fold = Math.sin(u * 13) * 0.055 * (0.2 + v);
      const x = Math.sin(a) * (R + fold);
      const z = -Math.cos(a) * (R + fold) + 0.05 - v * 0.2;
      pos.setXYZ(i, x, -v * 1.55, z);
    }
    geo.computeVertexNormals();
    return geo;
  });
}

function featherWing(mat, accent, sx, scale = 1) {
  const w = new THREE.Group();
  const rows = [
    { n: 7, len: 0.55, r0: 0.25, a0: 0.15, a1: 1.5, m: mat },
    { n: 6, len: 0.38, r0: 0.18, a0: 0.3, a1: 1.45, m: accent },
    { n: 4, len: 0.24, r0: 0.08, a0: 0.5, a1: 1.4, m: mat },
  ];
  for (const [ri, row] of rows.entries()) {
    for (let i = 0; i < row.n; i++) {
      const t = i / (row.n - 1);
      const a = row.a0 + (row.a1 - row.a0) * t;
      const len = row.len * (1 - t * 0.35);
      const f = mesh(G.sphere(16), row.m, { s: [0.075, len, 0.025] });
      f.position.set(Math.sin(a) * (row.r0 + len * 0.85), Math.cos(a) * (row.r0 + len * 0.85) - 0.05, -0.01 * ri);
      f.rotation.z = -a;
      w.add(f);
    }
  }
  w.scale.set(sx * scale, scale, scale);
  return w;
}

const BACK = {
  backpack(it) {
    const g = new THREE.Group();
    const m = fabric(it.c2, { map: TEX.plain(it.c2, 0.08), key: 'pack' });
    g.add(mesh(G.box(0.66, 0.68, 0.3, 0.12), m, { p: [0, 1.36, BACKZ - 0.16] }));
    g.add(mesh(G.box(0.68, 0.24, 0.32, 0.1), fabric(it.c1), { p: [0, 1.66, BACKZ - 0.17], r: [0.1, 0, 0] }));
    g.add(mesh(G.box(0.42, 0.24, 0.1, 0.06), fabric(it.c1), { p: [0, 1.2, BACKZ - 0.33] }));
    g.add(mesh(G.box(0.08, 0.035, 0.02, 0.01), metal('#d9dde6'), { p: [0, 1.28, BACKZ - 0.39] }));
    // spallacci visibili davanti
    for (const sx of [-1, 1]) {
      g.add(mesh(G.torus(0.2, 0.035, PI, 20), fabric(hexOf(shade(it.c2, 0.75))), { p: [sx * 0.24, 1.7, 0.0], r: [0, PI / 2, 0], s: [1.6, 1, 1] }));
      g.add(segment([sx * 0.25, 1.72, 0.3], [sx * 0.27, 1.2, 0.34], 0.035, 0.035, fabric(hexOf(shade(it.c2, 0.75))), 8));
    }
    return g;
  },
  cape(it) {
    const g = new THREE.Group();
    const outer = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.6, sheen: 1, sheenColor: hexOf(shade(it.c1, 1.8)), sheenRoughness: 0.35, side: THREE.DoubleSide });
    const c = mesh(capeGeo(), outer, { p: [0, 1.84, -0.02] });
    g.add(c);
    // orlo dorato in fondo
    const hem = cached('g:capehem', () => {
      const pts = [];
      const v = 1;
      for (let i = 0; i <= 24; i++) {
        const u = i / 24 - 0.5;
        const width = 0.82 + v * 0.75;
        const R = 0.38 + v * 0.25;
        const a = (u * width) / R;
        const fold = Math.sin(u * 13) * 0.055 * (0.2 + v);
        pts.push(new THREE.Vector3(Math.sin(a) * (R + fold), -v * 1.55, -Math.cos(a) * (R + fold) + 0.05 - v * 0.2));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.028, 8, false);
    });
    g.add(mesh(hem, metal(/wizard/.test(it.id) ? it.c2 : '#e2b23a', 0.25), { p: [0, 1.84, -0.02] }));
    g.add(mesh(G.torus(0.2, 0.06, PI * 2, 32), fabric(it.c2), { p: [0, 1.84, 0.0], r: [PI / 2 + 0.2, 0, 0], s: [1.15, 0.95, 1] }));
    for (const sx of [-1, 1]) g.add(mesh(G.sphere(12), metal('#e2b23a', 0.25), { p: [sx * 0.17, 1.8, 0.16], s: 0.045 }));
    if (/wizard/.test(it.id)) for (const [x, y] of [[-0.3, 1.2], [0.25, 0.9], [0.0, 0.55], [-0.35, 0.6]]) g.add(mesh(starGeo(), glow(it.c2, 0.8), { p: [x, y, -0.55 - (1.84 - y) * 0.12], s: 0.07, r: [0, PI, 0] }));
    return g;
  },
  guitar(it) {
    const g = new THREE.Group();
    const gt = new THREE.Group();
    const wood = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
    gt.add(mesh(G.cyl(0.36, 0.36, 0.14, 40), wood, { p: [0, 0, 0], r: [PI / 2, 0, 0] }));
    gt.add(mesh(G.cyl(0.28, 0.28, 0.14, 40), wood, { p: [0, 0.38, 0], r: [PI / 2, 0, 0] }));
    gt.add(mesh(G.cyl(0.1, 0.1, 0.15, 32), gloss('#140b05'), { p: [0, 0.24, 0.005], r: [PI / 2, 0, 0] }));
    gt.add(mesh(G.box(0.1, 0.9, 0.05, 0.02), leather(it.c2), { p: [0, 0.95, 0.04] }));
    gt.add(mesh(G.box(0.16, 0.22, 0.05, 0.03), leather(it.c2), { p: [0, 1.48, 0.04] }));
    gt.add(mesh(G.box(0.2, 0.05, 0.04, 0.01), leather('#2a170a'), { p: [0, -0.12, 0.08] }));
    for (const x of [-0.03, -0.01, 0.01, 0.03]) gt.add(mesh(G.box(0.005, 1.5, 0.005, 0.002), metal('#e6e6e6', 0.2), { p: [x, 0.65, 0.08], shadow: false }));
    gt.position.set(0.08, 1.05, BACKZ - 0.2);
    gt.rotation.set(0, PI, 0.62);
    g.add(gt);
    g.add(mesh(G.torus(0.62, 0.03, PI * 2, 48), leather('#3a2412'), { p: [0, 1.38, 0], r: [PI / 2, 0.62, 0], s: [1, 0.62, 1] }));
    return g;
  },
  butterfly(it) {
    const g = new THREE.Group();
    const wingMat = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, transparent: true, opacity: 0.9, side: THREE.DoubleSide, iridescence: 0.7, iridescenceIOR: 1.6, sheen: 0.6, sheenColor: '#ffffff' });
    const lobe = (key, w, h) =>
      G.extrude(key, () => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.bezierCurveTo(w * 0.3, h * 0.9, w * 1.1, h * 1.05, w, h * 0.35);
        s.bezierCurveTo(w * 0.95, -h * 0.05, w * 0.4, -h * 0.05, 0, 0);
        return s;
      }, 0.01, 0.01);
    for (const sx of [-1, 1]) {
      const up = mesh(lobe('bfUp', 0.95, 0.85), wingMat(it.c1), { p: [sx * 0.42, 1.65, BACKZ - 0.2], s: [sx, 1, 1], r: [0, -sx * 0.5, 0] });
      const lo = mesh(lobe('bfLo', 0.68, -0.62), wingMat(it.c2), { p: [sx * 0.36, 1.2, BACKZ - 0.18], s: [sx, 1, 1], r: [0, -sx * 0.5, 0] });
      g.add(up, lo);
      g.add(mesh(G.sphere(12), glow('#ffffff', 1.2), { p: [sx * 0.95, 1.95, BACKZ - 0.55], s: 0.05, shadow: false }));
    }
    g.add(mesh(G.capsule(0.06, 0.5, 12), leather('#2b2f45'), { p: [0, 1.42, BACKZ - 0.12] }));
    return g;
  },
  jetpack(it) {
    const g = new THREE.Group();
    const m = metal(it.c1, 0.28);
    g.add(mesh(G.box(0.36, 0.5, 0.18, 0.06), metal('#5a6170', 0.35), { p: [0, 1.42, BACKZ - 0.12] }));
    for (const sx of [-1, 1]) {
      g.add(mesh(G.capsule(0.15, 0.42, 24), m, { p: [sx * 0.24, 1.4, BACKZ - 0.22] }));
      g.add(mesh(G.cyl(0.1, 0.13, 0.12, 24), metal('#3a3f4c', 0.3), { p: [sx * 0.24, 1.03, BACKZ - 0.22] }));
      g.add(mesh(G.torus(0.15, 0.02, PI * 2, 24), plastic(it.c2), { p: [sx * 0.24, 1.55, BACKZ - 0.22], r: [PI / 2, 0, 0] }));
      flame(g, [sx * 0.24, 0.96, BACKZ - 0.22], 0.85, '#ffe14d', it.c2, [0, -1, 0]);
    }
    for (const sx of [-1, 1]) g.add(segment([sx * 0.24, 1.75, 0.28], [sx * 0.26, 1.25, 0.34], 0.03, 0.03, leather('#2b2f45'), 8));
    return g;
  },
  wings(it) {
    const g = new THREE.Group();
    const mat = it.fx === 'cosmic' ? cosmic(it.c1, it.c2) : it.fx === 'fire' ? new THREE.MeshPhysicalMaterial({ color: it.c1, emissive: it.c1, emissiveIntensity: 0.9, roughness: 0.5, sheen: 1, sheenColor: '#ffe14d' }) : new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.55, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.3, emissive: it.c1, emissiveIntensity: it.fx === 'glow' ? 0.15 : 0 });
    const accent = it.fx === 'cosmic' ? cosmic(it.c2, it.c1) : it.fx === 'fire' ? glow(it.c2, 1.6) : new THREE.MeshPhysicalMaterial({ color: it.c2, roughness: 0.5, sheen: 1, sheenColor: '#ffffff' });
    for (const sx of [-1, 1]) {
      const w = featherWing(mat, accent, sx, 1.15);
      w.position.set(sx * 0.18, 1.6, BACKZ - 0.12);
      w.rotation.set(0.1, sx * 0.55, sx * -0.15);
      g.add(w);
    }
    if (it.fx === 'glow') {
      const h = haloSprite('#ffffff', 2.4, 0.35);
      h.position.set(0, 1.8, BACKZ - 0.5);
      g.add(h);
    }
    if (it.fx === 'fire') {
      for (const sx of [-1, 1]) flame(g, [sx * 0.9, 2.0, BACKZ - 0.4], 0.6, '#ffe14d', it.c1);
    }
    if (it.fx === 'cosmic') sparkles(g, it.c2, 12, [-1.4, 1.4, 1.2, 2.6, -0.8, 0.0], 0.05);
    return g;
  },
  batwings(it) {
    const g = new THREE.Group();
    const membrane = new THREE.MeshPhysicalMaterial({ color: it.c1, roughness: 0.4, clearcoat: 0.6, sheen: 0.6, sheenColor: '#ff6a6a', side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    const bone = new THREE.MeshPhysicalMaterial({ color: it.c2, roughness: 0.35, clearcoat: 0.8 });
    const geo = G.extrude('batw', () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.lineTo(0.35, 0.55);
      s.lineTo(1.3, 0.75);
      s.quadraticCurveTo(1.15, 0.45, 1.25, 0.2);
      s.quadraticCurveTo(1.0, 0.25, 0.95, -0.05);
      s.quadraticCurveTo(0.75, 0.05, 0.65, -0.25);
      s.quadraticCurveTo(0.45, -0.1, 0.32, -0.35);
      s.quadraticCurveTo(0.2, -0.15, 0, 0);
      return s;
    }, 0.01, 0.008);
    for (const sx of [-1, 1]) {
      const w = new THREE.Group();
      const mem = mesh(geo, membrane, {});
      mem.geometry.computeBoundingBox();
      w.add(mesh(geo, membrane, { p: [0.62, 0.15, 0] }));
      for (const [x, y] of [[1.3, 0.75], [1.25, 0.2], [0.95, -0.05], [0.65, -0.25], [0.32, -0.35]]) w.add(segment([0.0, 0.05, 0.02], [x - 0.02, y + 0.13, 0.02], 0.035, 0.012, bone, 8));
      w.add(mesh(G.cone(0.04, 0.14, 10), bone, { p: [1.3, 0.97, 0.02], r: [0, 0, -0.5] }));
      w.scale.set(sx * 1.05, 1.05, 1.05);
      w.position.set(sx * 0.15, 1.5, BACKZ - 0.12);
      w.rotation.set(0.05, sx * 0.55, 0);
      g.add(w);
    }
    return g;
  },
};

/* ---------------- ingresso unico ---------------- */
const TABLES = { hat: HAT, face: FACE, shirt: SHIRT, pants: PANTS, shoes: SHOES, back: BACK };

/**
 * Modello 3D di un oggetto del catalogo, posizionato sul personaggio.
 * @param {object} it oggetto del catalogo
 * @param {{skinMat?:THREE.Material}} [o] skinMat: per le parti di pelle (ciabatte)
 */
export function buildWearable(it, o = {}) {
  const table = TABLES[it?.cat];
  const fn = table?.[it.type] || (it?.cat === 'shirt' ? SHIRT.tee : it?.cat === 'pants' ? PANTS.long : it?.cat === 'shoes' ? SHOES.sneaker : null);
  if (!fn) return new THREE.Group();
  const g = fn(it, o.skinMat || null);
  g.userData.cat = it.cat;
  return g;
}

/** Cappelli che coprono i capelli in cima. */
export const COVERING_HATS = new Set(['cap', 'beanie', 'bandana', 'bucket', 'tophat', 'cowboy', 'viking', 'pirate', 'chef', 'wizard']);
