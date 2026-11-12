/**
 * Dadi 3D: geometria smussata, facce dipinte in un atlante (colore, rilievo dei
 * punti, materiali, luce propria) ed effetti animati per le skin più rare.
 *
 * API (usata dal vassoio 3D e dalle anteprime):
 *   createDie(skinId, { size })  -> THREE.Group (centro nell'origine, lato = size)
 *   quatForValue(value, spin)    -> rotazione con `value` in alto (+Y)
 *   valueOnTop(object3d)         -> faccia in alto (1..6)
 *   preloadDice(skinIds)         -> Promise (prepara le texture in anticipo)
 *
 * Facce: +Y 1 · -Y 6 · +Z 2 · -Z 5 · +X 3 · -X 4 (le opposte fanno 7).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { diceSpec, drawPip, pipCenters, rng, hash } from './diceSkins.js';

/* ---------------- facce e orientamento ---------------- */
// ordine dei gruppi di BoxGeometry: +X, -X, +Y, -Y, +Z, -Z
const GROUP_VALUE = [3, 4, 1, 6, 2, 5];
const NORMALS = {
  1: new THREE.Vector3(0, 1, 0),
  6: new THREE.Vector3(0, -1, 0),
  2: new THREE.Vector3(0, 0, 1),
  5: new THREE.Vector3(0, 0, -1),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
};
const UP = new THREE.Vector3(0, 1, 0);

export function quatForValue(value, spin = 0) {
  const n = NORMALS[value] || NORMALS[1];
  const align = new THREE.Quaternion().setFromUnitVectors(n, UP);
  const yaw = new THREE.Quaternion().setFromAxisAngle(UP, spin);
  return yaw.multiply(align);
}

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
export function valueOnTop(object3d) {
  object3d.getWorldQuaternion(_q);
  let best = 1;
  let by = -2;
  for (const [val, n] of Object.entries(NORMALS)) {
    const y = _v.copy(n).applyQuaternion(_q).y;
    if (y > by) {
      by = y;
      best = Number(val);
    }
  }
  return best;
}

/* ---------------- geometria (una sola, condivisa) ---------------- */
const RADIUS = 0.17;
let geoCache = null;
function dieGeometry() {
  if (geoCache) return geoCache;
  const g = new RoundedBoxGeometry(1, 1, 1, 4, RADIUS);
  const uv = g.attributes.uv;
  // ogni faccia nella sua cella dell'atlante (4 colonne x 2 righe, ne usiamo 3x2);
  // riga 0 del canvas (in alto, flipY) = metà superiore della texture
  for (let gi = 0; gi < g.groups.length; gi++) {
    const { start, count } = g.groups[gi];
    const v = GROUP_VALUE[gi];
    const col = (v - 1) % 3;
    const row = Math.floor((v - 1) / 3);
    for (let i = start; i < start + count; i++) uv.setXY(i, (col + uv.getX(i)) / 4, (1 - row) * 0.5 + uv.getY(i) * 0.5);
  }
  uv.needsUpdate = true;
  g.clearGroups();
  g.computeBoundingSphere();
  geoCache = g;
  return g;
}

/* ---------------- texture ---------------- */
const canvas = (w, h) => {
  const c = typeof OffscreenCanvas !== 'undefined' && !globalThis.__noOffscreen ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  return c;
};

function boxBlur(src, w, h, r) {
  if (r < 1) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * k;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * k;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

const hexRgb = (c) => {
  const s = new THREE.Color(c);
  return [s.r, s.g, s.b];
};

/** Dipinge l'atlante di una skin: colore, normali, AO/ruvidità/metallo, luce propria. */
function buildTextures(spec, S) {
  const W = S * 4;
  const H = S * 2;
  const cc = canvas(W, H);
  const hc = canvas(W, H);
  const mc = canvas(W, H);
  const ec = spec.emissive ? canvas(W, H) : null;
  const c = cc.getContext('2d', { willReadFrequently: true });
  const h = hc.getContext('2d', { willReadFrequently: true });
  const m = mc.getContext('2d', { willReadFrequently: true });
  const e = ec ? ec.getContext('2d', { willReadFrequently: true }) : null;
  h.fillStyle = '#808080';
  h.fillRect(0, 0, W, H);
  m.fillStyle = '#000';
  m.fillRect(0, 0, W, H);
  if (e) {
    e.fillStyle = '#000';
    e.fillRect(0, 0, W, H);
  }
  const rnd = rng(hash(spec.id));
  const k = S / 48;
  const pipR = 4.6;
  for (let v = 1; v <= 6; v++) {
    const x0 = ((v - 1) % 3) * S;
    const y0 = Math.floor((v - 1) / 3) * S;
    for (const ctx of [c, h, m, e]) {
      if (!ctx) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, S, S);
      ctx.clip();
      ctx.translate(x0, y0);
    }
    const p = { c, h, e: e || canvas(4, 4).getContext('2d'), S, rnd, v, it: spec.it };
    // fondo della faccia
    if (spec.paint) spec.paint(p);
    else {
      // la luce vera fa già le sfumature: la faccia ha un colore pieno, appena più chiaro al centro
      const g = c.createRadialGradient(S * 0.42, S * 0.38, S * 0.05, S * 0.5, S * 0.5, S * 0.8);
      g.addColorStop(0, '#' + new THREE.Color(spec.base[0]).lerp(new THREE.Color(spec.base[1]), spec.mix ?? 0.72).getHexString());
      g.addColorStop(1, spec.base[1]);
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
    }
    // bordo (crosta, buccia, alga…) sugli spigoli arrotondati
    if (spec.ring) {
      const band = S * 0.15;
      spec.ring.forEach((col, i) => {
        const w = (band / spec.ring.length) * (spec.ring.length - i);
        c.strokeStyle = col;
        c.lineWidth = w * 2;
        c.strokeRect(0, 0, S, S);
      });
      h.strokeStyle = 'rgba(255,255,255,.35)';
      h.lineWidth = band * 1.4;
      h.strokeRect(0, 0, S, S);
    }
    // punti
    for (const ctx of [c, h, m, e]) ctx?.save();
    for (const ctx of [c, h, m, e]) ctx?.scale(k, k);
    pipCenters(v).forEach(([x, y], i) => {
      const kk = v * 3 + i;
      const col = spec.pipColor || 'rgba(255,255,255,.28)';
      if (spec.pipMode === 'bubble') {
        // bolla del pop-it: cupola in rilievo con un solco intorno
        drawPip(c, spec.shape === 'dot' ? 'bubble' : spec.shape, x, y, pipR, kk, col);
        const rr = pipR * 1.45;
        const g = h.createRadialGradient(x - pipR * 0.3, y - pipR * 0.3, 0, x, y, rr);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.75, 'rgba(200,200,200,1)');
        g.addColorStop(0.92, 'rgba(70,70,70,1)');
        g.addColorStop(1, 'rgba(128,128,128,1)');
        h.fillStyle = g;
        h.beginPath();
        h.arc(x, y, rr, 0, Math.PI * 2);
        h.fill();
      } else {
        drawPip(c, spec.shape, x, y, pipR, kk, col);
      }
      drawPip(m, spec.shape === 'dot' && spec.pipMode === 'bubble' ? 'bubble' : spec.shape, x, y, pipR, kk, '#fff', 'mask');
      if (e && spec.pipGlow) drawPip(e, spec.shape, x, y, pipR * (spec.pipMode === 'carved' ? 0.74 : 1), kk, spec.pipGlow);
    });
    for (const ctx of [c, h, m, e]) ctx?.restore();
    for (const ctx of [c, h, m, e]) ctx?.restore();
  }

  // il rilievo dei punti: la sagoma in 'mask' è bianca → la ricoloro nei toni giusti
  const hd = h.getImageData(0, 0, W, H).data;
  const md = m.getImageData(0, 0, W, H).data;
  const N = W * H;
  const height = new Float32Array(N);
  const mask = new Float32Array(N);
  const depth = { recess: 0.55, deep: 0.85, engrave: 0.45, carved: 0.9, raised: -0.4, flat: -0.08, bubble: 0 }[spec.pipMode] ?? 0.55;
  for (let i = 0; i < N; i++) {
    mask[i] = md[i * 4] / 255;
    let hv = hd[i * 4] / 255;
    if (spec.pipMode !== 'bubble' && mask[i] > 0) hv = hv * (1 - mask[i]) + (0.5 - depth * 0.5) * mask[i];
    height[i] = hv;
  }
  const blurR = Math.max(1, Math.round(S / (spec.pipMode === 'engrave' ? 160 : 90)));
  const hs = boxBlur(boxBlur(height, W, H, blurR), W, H, blurR);
  const big = boxBlur(hs, W, H, Math.round(S / 26));

  // normali
  const nc = canvas(W, H);
  const nctx = nc.getContext('2d');
  const nimg = nctx.createImageData(W, H);
  const strength = S * 0.045;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = hs[y * W + Math.min(W - 1, x + 1)] - hs[y * W + Math.max(0, x - 1)];
      const dy = hs[Math.min(H - 1, y + 1) * W + x] - hs[Math.max(0, y - 1) * W + x];
      let nx = -dx * strength;
      let ny = dy * strength;
      const len = Math.hypot(nx, ny, 1);
      nx /= len;
      ny /= len;
      const nz = 1 / len;
      const o = i * 4;
      nimg.data[o] = (nx * 0.5 + 0.5) * 255;
      nimg.data[o + 1] = (ny * 0.5 + 0.5) * 255;
      nimg.data[o + 2] = (nz * 0.5 + 0.5) * 255;
      nimg.data[o + 3] = 255;
    }
  nctx.putImageData(nimg, 0, 0);

  // AO (R), ruvidità (G), metallo (B)
  const oc = canvas(W, H);
  const octx = oc.getContext('2d');
  const oimg = octx.createImageData(W, H);
  const mat = spec.mat;
  const faceRough = mat.roughness ?? 0.3;
  const pipRough = mat.pipRough ?? Math.min(1, faceRough + (spec.pipMode === 'carved' ? 0.5 : 0.08));
  const faceMetal = mat.metalness ?? 0;
  const pipMetal = spec.pipMetal ? 1 : (mat.pipMetal ?? faceMetal);
  const pipRoughM = spec.pipMetal ? 0.25 : pipRough;
  for (let i = 0; i < N; i++) {
    const pit = Math.max(0, big[i] - hs[i]);
    const ao = 1 - Math.min(0.78, pit * 5.5);
    const mk = mask[i];
    const o = i * 4;
    oimg.data[o] = ao * 255;
    oimg.data[o + 1] = (faceRough * (1 - mk) + pipRoughM * mk) * 255;
    oimg.data[o + 2] = (faceMetal * (1 - mk) + pipMetal * mk) * 255;
    oimg.data[o + 3] = 255;
  }
  octx.putImageData(oimg, 0, 0);

  // colori un po' più saturi (stile cartoon) e trasparenza: facce trasparenti, punti pieni
  const cimg = c.getImageData(0, 0, W, H);
  const cd = cimg.data;
  const sat = spec.sat ?? 1.18;
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    const r = cd[o];
    const g = cd[o + 1];
    const b = cd[o + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    cd[o] = Math.max(0, Math.min(255, l + (r - l) * sat));
    cd[o + 1] = Math.max(0, Math.min(255, l + (g - l) * sat));
    cd[o + 2] = Math.max(0, Math.min(255, l + (b - l) * sat));
    if (spec.alpha < 1) cd[o + 3] = Math.min(1, (cd[o + 3] / 255) * spec.alpha + mask[i]) * 255;
  }
  c.putImageData(cimg, 0, 0);
  return { color: cc, normal: nc, orm: oc, emissive: ec };
}

function tex(src, srgb = false) {
  const t = new THREE.CanvasTexture(src);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/* ---------------- materiali ---------------- */
function buildMaterial(spec, S) {
  const t = buildTextures(spec, S);
  const m = spec.mat;
  const params = {
    map: tex(t.color, true),
    normalMap: tex(t.normal),
    normalScale: new THREE.Vector2(1, 1),
    roughnessMap: null,
    metalnessMap: null,
    aoMap: null,
    roughness: 1,
    metalness: 1,
    color: new THREE.Color(spec.color),
    clearcoat: m.clearcoat ?? 0,
    clearcoatRoughness: m.clearcoatRoughness ?? 0.1,
    ior: m.ior ?? 1.5,
    envMapIntensity: m.metalness ? 1.15 : 0.8,
  };
  const orm = tex(t.orm);
  params.roughnessMap = orm;
  params.metalnessMap = orm;
  params.aoMap = orm;
  params.aoMapIntensity = 0.9;
  if (m.sheen) {
    params.sheen = m.sheen;
    params.sheenRoughness = m.sheenRoughness ?? 0.5;
    params.sheenColor = new THREE.Color(spec.sheenColor || '#ffffff');
  }
  if (m.iridescence) {
    params.iridescence = m.iridescence;
    params.iridescenceIOR = m.iridescenceIOR ?? 1.4;
    params.iridescenceThicknessRange = [120, 420];
  }
  if (t.emissive) {
    params.emissiveMap = tex(t.emissive, true);
    params.emissive = new THREE.Color('#ffffff');
    params.emissiveIntensity = 1.2;
  }
  if (spec.alpha < 1) {
    params.transparent = true;
    params.side = THREE.DoubleSide;
    params.depthWrite = false;
  }
  const mat = new THREE.MeshPhysicalMaterial(params);
  for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap']) if (mat[k]) mat[k].userData.shared = true;
  return mat;
}

/* ---------------- texture e forme comuni degli effetti ---------------- */
const shared = {};
function glowTexture() {
  if (shared.glow) return shared.glow;
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  shared.glow = tex(c, true);
  shared.glow.userData.shared = true;
  return shared.glow;
}

function sparkTexture() {
  if (shared.spark) return shared.spark;
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 22);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#fff';
  for (const [w, hh] of [[60, 3], [3, 60]]) {
    const lg = g.createLinearGradient(64 - w, 64 - hh, 64 + w, 64 + hh);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,1)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.fillRect(64 - w, 64 - hh, w * 2, hh * 2);
  }
  shared.spark = tex(c, true);
  shared.spark.userData.shared = true;
  return shared.spark;
}

function diskTexture(inner, outer) {
  const key = `disk${inner}${outer}`;
  if (shared[key]) return shared[key];
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 64;
    g.strokeStyle = Math.random() > 0.4 ? inner : outer;
    g.globalAlpha = 0.25 + Math.random() * 0.5;
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    g.arc(128, 128, r, a, a + 0.4 + Math.random() * 1.2);
    g.stroke();
  }
  shared[key] = tex(c, true);
  shared[key].userData.shared = true;
  return shared[key];
}

function particles(n, { color = '#ffffff', size = 0.12, map = sparkTexture(), opacity = 1, colors = null } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  if (colors) {
    const ca = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const col = new THREE.Color(colors[i % colors.length]);
      ca.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
  }
  const m = new THREE.PointsMaterial({ color: colors ? '#ffffff' : color, size, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: Boolean(colors), sizeAttenuation: true });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

function halo(color, scale = 2.6, opacity = 0.55) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(scale, scale, 1);
  s.renderOrder = -1;
  return s;
}

/* ---------------- nuclei interni (dadi trasparenti) ---------------- */
function coreMesh(spec) {
  const col = new THREE.Color(spec.coreColor);
  if (spec.core === 'crystal') {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 0),
      new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.05, metalness: 0.15, clearcoat: 1, flatShading: true, emissive: col, emissiveIntensity: 0.25, iridescence: 0.5 }),
    );
    m.rotation.set(0.4, 0.7, 0.2);
    return m;
  }
  if (spec.core === 'heart') {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.28);
    sh.bezierCurveTo(-0.5, 0.05, -0.25, 0.4, 0, 0.16);
    sh.bezierCurveTo(0.25, 0.4, 0.5, 0.05, 0, -0.28);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 10 });
    g.center();
    return new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.08, clearcoat: 1, emissive: col, emissiveIntensity: 0.35 }));
  }
  if (spec.core === 'blobs') {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.3 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.025, 16, 12), mat);
      b.userData.phase = i * 1.7;
      grp.add(b);
    }
    grp.userData.blobs = true;
    return grp;
  }
  return new THREE.Mesh(
    new RoundedBoxGeometry(0.64, 0.64, 0.64, 2, 0.16),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: col, emissiveIntensity: 0.18, transparent: true, opacity: 0.55, depthWrite: false }),
  );
}

/* ---------------- cache dei materiali per skin ---------------- */
const matCache = new Map();
function materialFor(skinId, S = 256) {
  const key = `${skinId}@${S}`;
  let entry = matCache.get(key);
  if (!entry) {
    const spec = diceSpec(skinId);
    entry = { spec, material: buildMaterial(spec, S) };
    matCache.set(key, entry);
  }
  return entry;
}

export function preloadDice(skinIds = []) {
  const list = [...new Set(skinIds.filter(Boolean))];
  return new Promise((resolve) => {
    const step = () => {
      const id = list.shift();
      if (!id) return resolve();
      materialFor(id);
      setTimeout(step, 0);
    };
    step();
  });
}

/* ---------------- effetti animati ---------------- */
const _wq = new THREE.Quaternion();
/** Gli effetti "attorno" al dado restano dritti mentre il dado rotola. */
function keepUpright(fxRoot, group) {
  group.getWorldQuaternion(_wq);
  fxRoot.quaternion.copy(_wq).invert();
}

function addFx(spec, group, body, mat) {
  const fx = spec.fx;
  const ups = [];
  const fxRoot = new THREE.Group();
  fxRoot.name = 'fx';
  group.add(fxRoot);
  const own = [];
  const baseEm = mat.emissiveIntensity;
  const pulse = (speed = 2.2, amt = 0.35) => ups.push((dt, t) => (mat.emissiveIntensity = baseEm * (1 + Math.sin(t * speed) * amt)));
  const glints = (n, colors, spread = 0.62, size = 0.32) => {
    const p = particles(n, { colors, size });
    const pos = p.geometry.attributes.position;
    const seeds = Array.from({ length: n }, (_, i) => [(Math.random() * 2 - 1) * spread, (Math.random() * 2 - 1) * spread, (Math.random() * 2 - 1) * spread, Math.random() * 6]);
    seeds.forEach(([x, y, z], i) => pos.setXYZ(i, x, y, z));
    pos.needsUpdate = true;
    body.add(p);
    own.push(p);
    ups.push((dt, t) => {
      p.material.size = size * (0.55 + 0.45 * Math.abs(Math.sin(t * 2.4)));
      p.material.opacity = 0.6 + 0.4 * Math.sin(t * 3.1);
    });
    return p;
  };
  const orbit = (n, { colors, radius = 0.95, size = 0.16, speed = 1.2, tilt = 0.35, wobble = 0.15, map } = {}) => {
    const p = particles(n, { colors, size, map });
    const pos = p.geometry.attributes.position;
    fxRoot.add(p);
    own.push(p);
    const seeds = Array.from({ length: n }, (_, i) => [(i / n) * Math.PI * 2, 0.8 + Math.random() * 0.4, Math.random() * 6]);
    const place = (t) => {
      seeds.forEach(([a0, rr, ph], i) => {
        const a = a0 + t * speed;
        const r = radius * rr;
        const y = Math.sin(a * 2 + ph) * wobble + Math.sin(a) * tilt * r * 0.4;
        pos.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
      });
      pos.needsUpdate = true;
    };
    place(0);
    ups.push((dt, t) => place(t));
    return p;
  };
  const rising = (n, { colors, size = 0.22, spread = 0.55, height = 1.3, speed = 0.6, inside = false, map } = {}) => {
    const p = particles(n, { colors, size, map });
    const pos = p.geometry.attributes.position;
    (inside ? body : fxRoot).add(p);
    own.push(p);
    const seeds = Array.from({ length: n }, () => [(Math.random() * 2 - 1) * spread, (Math.random() * 2 - 1) * spread, Math.random()]);
    const place = (t) => {
      seeds.forEach(([x, z, ph], i) => {
        const k = (ph + t * speed) % 1;
        pos.setXYZ(i, x * (1 - k * 0.5), (inside ? -0.4 : -0.2) + k * height, z * (1 - k * 0.5));
      });
      pos.needsUpdate = true;
    };
    place(0);
    ups.push((dt, t) => place(t));
    return p;
  };
  const ring = (color, { r = 0.9, tube = 0.025, tiltX = 1.2, tiltZ = 0.25, speed = 0.8, emissive = 1.6 } = {}) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 64), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.3 }));
    m.rotation.set(tiltX, 0, tiltZ);
    fxRoot.add(m);
    own.push(m);
    ups.push((dt, t) => {
      m.rotation.y = t * speed;
    });
    return m;
  };

  switch (fx) {
    case 'pulse':
      pulse();
      break;
    case 'lava':
      pulse(1.3, 0.45);
      break;
    case 'flicker':
      ups.push(() => (mat.emissiveIntensity = baseEm * (0.75 + Math.random() * 0.5)));
      break;
    case 'storm':
      ups.push((dt, t) => (mat.emissiveIntensity = baseEm * (0.6 + (Math.sin(t * 7) > 0.96 || Math.sin(t * 2.3 + 1) > 0.985 ? 2.2 : 0.4))));
      break;
    case 'ghost': {
      pulse(1.5, 0.4);
      ups.push((dt, t) => (mat.opacity = 0.82 + Math.sin(t * 1.5) * 0.18));
      fxRoot.add(halo('#9fb0ff', 2.1, 0.35));
      break;
    }
    case 'iris':
      ups.push((dt, t) => (mat.iridescenceThicknessRange = [120, 420 + Math.sin(t * 0.9) * 260]));
      break;
    case 'sparkle':
      glints(6, ['#ffffff', '#dff4ff', '#fff6d0'], 0.6, 0.24);
      break;
    case 'shine':
      glints(4, ['#fff6d0', '#ffffff'], 0.58, 0.28);
      break;
    case 'embers':
      rising(14, { colors: ['#ff7a1a', '#ffcf33', '#ff3a1a'], size: 0.12, speed: 0.45 });
      pulse(3, 0.4);
      break;
    case 'halo': {
      const hcol = spec.haloColor;
      const s = halo(hcol, 2.5, 0.5);
      fxRoot.add(s);
      ups.push((dt, t) => s.scale.setScalar(2.4 + Math.sin(t * 1.8) * 0.15));
      glints(5, ['#ffffff', hcol]);
      pulse(1.8, 0.3);
      break;
    }
    case 'wobble':
      ups.push((dt, t) => {
        const w = Math.sin(t * 5) * 0.025;
        body.scale.set(1 + w, 1 - w, 1 + w);
      });
      break;
    case 'bubbles':
      rising(12, { colors: ['#e8fbff', '#bfeaff'], size: 0.09, spread: 0.3, height: 0.8, speed: 0.35, inside: true, map: glowTexture() });
      break;
    case 'ring': {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.84, 1.02, 64), new THREE.MeshStandardMaterial({ color: '#ffe2b8', roughness: 0.6, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
      m.rotation.set(-1.95, -0.3, 0);
      m.castShadow = true;
      fxRoot.add(m);
      own.push(m);
      ups.push((dt, t) => (m.rotation.z = t * 0.3));
      break;
    }
    case 'blobs': {
      const core = body.children.find((ch) => ch.userData.blobs);
      ups.push((dt, t) => {
        core?.children.forEach((b, i) => {
          const ph = b.userData.phase;
          b.position.set(Math.sin(t * 0.7 + ph) * 0.16, Math.sin(t * 0.55 + ph * 2) * 0.24, Math.cos(t * 0.6 + ph) * 0.14);
          const s = 1 + Math.sin(t * 1.3 + ph) * 0.18;
          b.scale.set(s, 1 / s, s);
        });
      });
      break;
    }
    case 'scan': {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: '#7ffcff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      plane.rotation.x = -Math.PI / 2;
      body.add(plane);
      own.push(plane);
      ups.push((dt, t) => {
        plane.position.y = Math.sin(t * 1.6) * 0.45;
        plane.material.opacity = 0.25 + Math.random() * 0.15;
      });
      pulse(6, 0.2);
      break;
    }
    case 'dj': {
      ring('#20e3ff', { r: 0.92, tiltX: 1.35, speed: 1.6 });
      ring('#ff3df2', { r: 1.02, tiltX: 1.7, tiltZ: -0.4, speed: -1.2 });
      ups.push((dt, t) => (mat.emissiveIntensity = baseEm * (0.7 + Math.max(0, Math.sin(t * Math.PI * 4)) ** 4 * 1.6)));
      orbit(10, { colors: ['#20e3ff', '#ff3df2'], radius: 1.15, size: 0.14, speed: 1.4 });
      break;
    }
    case 'vortex': {
      const disk = new THREE.Mesh(new THREE.RingGeometry(0.72, 1.22, 64), new THREE.MeshBasicMaterial({ map: diskTexture('#ff7a1a', '#7a4dff'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      disk.rotation.x = -Math.PI / 2 + 0.3;
      fxRoot.add(disk);
      own.push(disk);
      fxRoot.add(halo('#7a4dff', 2.2, 0.4));
      ups.push((dt, t) => (disk.rotation.z = -t * 1.4));
      orbit(14, { colors: ['#ffb36a', '#b38bff'], radius: 1.05, size: 0.1, speed: 2.2, wobble: 0.05 });
      break;
    }
    case 'unicorn':
      orbit(14, { colors: ['#ff9de2', '#9de6ff', '#b5ff9d', '#fff59d', '#d99dff'], radius: 1.05, size: 0.24, speed: 0.9 });
      fxRoot.add(halo('#ffd1f0', 2.4, 0.4));
      ups.push((dt, t) => (mat.iridescenceThicknessRange = [120, 420 + Math.sin(t) * 300]));
      break;
    case 'phoenix':
      rising(22, { colors: ['#ffe14d', '#ff9f1a', '#ff3a00'], size: 0.3, spread: 0.6, height: 1.5, speed: 0.8, map: glowTexture() });
      fxRoot.add(halo('#ff7a1a', 2.6, 0.5));
      pulse(4, 0.25);
      break;
    case 'infinity':
      ring('#ff3dbb', { r: 0.95, tiltX: 1.1, speed: 1 });
      ring('#2fd0ff', { r: 1.05, tiltX: 2.0, tiltZ: 0.6, speed: -0.8 });
      ring('#ffe14d', { r: 1.15, tiltX: 0.4, tiltZ: -0.5, speed: 0.6 });
      ups.push((dt, t) => {
        mat.iridescenceThicknessRange = [120, 420 + Math.sin(t * 1.3) * 320];
        mat.emissive.setHSL((t * 0.15) % 1, 0.8, 0.6);
      });
      break;
    case 'disco': {
      glints(12, ['#ff3dbb', '#20e3ff', '#ffe14d', '#ffffff', '#56ff9e'], 0.62, 0.36);
      orbit(12, { colors: ['#ff3dbb', '#20e3ff', '#ffe14d', '#56ff9e'], radius: 1.3, size: 0.12, speed: 0.7, map: glowTexture() });
      pulse(5, 0.4);
      break;
    }
    case 'fuse': {
      const spark = halo('#ffd23f', 0.45, 1);
      spark.position.set(0.42, 0.62, 0.42);
      body.add(spark);
      own.push(spark);
      const sp = rising(10, { colors: ['#ffd23f', '#ff7a1a', '#ffffff'], size: 0.09, spread: 0.08, height: 0.5, speed: 1.8, inside: true });
      sp.position.set(0.42, 0.95, 0.42);
      ups.push(() => spark.scale.setScalar(0.3 + Math.random() * 0.35));
      break;
    }
    case 'cosmiccat':
      orbit(16, { colors: ['#ffd1f0', '#ffffff', '#b38bff', '#2fd0ff'], radius: 1.1, size: 0.2, speed: 0.8 });
      fxRoot.add(halo('#8f5bff', 2.3, 0.4));
      pulse(2, 0.3);
      break;
    case 'tsunami':
      orbit(18, { colors: ['#bfefff', '#5fd3ff', '#ffffff'], radius: 1.05, size: 0.15, speed: 1.6, wobble: 0.3, map: glowTexture() });
      fxRoot.add(halo('#5fd3ff', 2.2, 0.3));
      break;
    case 'party': {
      const cols = ['#ff3d7f', '#ffd23f', '#2fd0ff', '#56ff9e', '#a54dff'];
      const grp = new THREE.Group();
      const confetti = [];
      for (let i = 0; i < 16; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, roughness: 0.4, emissive: cols[i % cols.length], emissiveIntensity: 0.3 }));
        m.userData.seed = [(i / 16) * Math.PI * 2, 0.85 + Math.random() * 0.4, Math.random() * 6];
        grp.add(m);
        confetti.push(m);
      }
      fxRoot.add(grp);
      own.push(...confetti);
      ups.push((dt, t) =>
        confetti.forEach((m) => {
          const [a0, rr, ph] = m.userData.seed;
          const a = a0 + t * 0.9;
          m.position.set(Math.cos(a) * rr, Math.sin(t * 1.5 + ph) * 0.35, Math.sin(a) * rr);
          m.rotation.set(t * 3 + ph, t * 2 + ph, 0);
        }),
      );
      break;
    }
    default:
      break;
  }
  if (!ups.length && !fxRoot.children.length) group.remove(fxRoot);
  return {
    update(dt, t) {
      if (fxRoot.parent) keepUpright(fxRoot, group);
      for (const u of ups) u(dt, t);
    },
    own,
  };
}

/* ---------------- dado ---------------- */
/**
 * Dado 3D di una skin. size = lato. Materiali e texture sono condivisi fra i
 * dadi della stessa skin; dispose() libera solo ciò che è di questo dado.
 */
export function createDie(skinId, { size = 1, quality = 256 } = {}) {
  const { spec, material } = quality === 256 ? materialFor(skinId) : { spec: diceSpec(skinId), material: buildMaterial(diceSpec(skinId), quality) };
  const group = new THREE.Group();
  group.name = `die:${spec.id}`;
  const body = new THREE.Group();
  group.add(body);
  const mat = spec.fx && /pulse|lava|flicker|storm|ghost|iris|halo|dj|unicorn|phoenix|infinity|disco|cosmiccat|embers|scan/.test(spec.fx) ? material.clone() : material;
  const mesh = new THREE.Mesh(dieGeometry(), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  if (spec.core) {
    const core = coreMesh(spec);
    core.renderOrder = 0;
    body.add(core);
    mesh.renderOrder = 1;
  }
  body.add(mesh);
  const fx = spec.fx ? addFx(spec, group, body, mat) : null;
  group.scale.setScalar(size);
  group.userData = {
    skinId: spec.id,
    spec,
    mesh,
    update(dt = 0.016, time = performance.now() / 1000) {
      fx?.update(dt, time);
    },
    dispose() {
      if (mat !== material) mat.dispose();
      group.traverse((o) => {
        if (o === mesh) return;
        o.geometry?.dispose?.();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach((m) => m !== material && m.dispose());
      });
      if (quality !== 256) {
        for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap']) material[k]?.dispose();
        material.dispose();
      }
    },
  };
  return group;
}

/** Colore principale di una skin (per bagliori e particelle di altri moduli). */
export function diceAccent(skinId) {
  const s = diceSpec(skinId);
  return s.pipGlow || s.pipColor || s.base[0];
}
