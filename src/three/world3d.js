/**
 * Mondi della campagna come diorami 3D (stile giocattolo, come dadi e avatar).
 *
 * Ogni mondo è una scena three.js vista dall'alto in tre quarti (telecamera
 * ortografica inclinata): terreno, acqua, piattaforme sotto i livelli, sentiero,
 * vegetazione, costruzioni e l'arena del boss. La scena viene disegnata UNA
 * volta sola in un'immagine (JPEG) e messa in cache: sulla mappa non gira
 * nessun ciclo WebGL. La "vita" (lucciole, neve, nuvole, lampi…) è fatta in CSS.
 *
 *   worldImage(n, nodes) -> Promise<url>   nodes: centri in px dei 9 livelli + boss
 */
import { THREE, has3D, renderThumb, studioEnv } from './core.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { paintGround, THEME_ORDER, MOODS } from './worldKit.js';
import { BUILDERS } from './worldThemes.js';

export const W = 390;
export const H = 860;
/** px per unità di mondo e inclinazione della telecamera */
const U = 10;
const PITCH = (56 * Math.PI) / 180;
const SIN = Math.sin(PITCH);
const COS = Math.cos(PITCH);
/** risoluzione dell'immagine rispetto ai px della mappa */
const SCALE = 1.6;

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Attrezzi per costruire una scena ragionando in px della mappa. */
function makeKit(scene, rng) {
  const mats = new Map();
  const geos = new Map();
  const geo = (key, make) => {
    if (!geos.has(key)) geos.set(key, make());
    return geos.get(key);
  };
  /** materiale "plastica morbida" (cache per colore e opzioni) */
  const mat = (color, o = {}) => {
    const key = `${color}|${o.rough ?? ''}|${o.metal ?? ''}|${o.emi ?? ''}|${o.ei ?? ''}|${o.op ?? ''}|${o.flat ?? ''}|${o.coat ?? ''}`;
    if (!mats.has(key)) {
      const m = new THREE.MeshPhysicalMaterial({
        color,
        roughness: o.rough ?? 0.62,
        metalness: o.metal ?? 0,
        clearcoat: o.coat ?? 0.22,
        clearcoatRoughness: 0.45,
        flatShading: Boolean(o.flat),
        emissive: o.emi ?? 0x000000,
        emissiveIntensity: o.ei ?? (o.emi ? 1.6 : 0),
        transparent: o.op !== undefined && o.op < 1,
        opacity: o.op ?? 1,
      });
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const M = (c, o) => (c && c.isMaterial ? c : mat(c, o));
  const sh = (m, cast = true, recv = true) => {
    m.castShadow = cast;
    m.receiveShadow = recv;
    return m;
  };
  /* ---- primitive locali (unità di mondo, y in alto) ---- */
  const L = {
    sph(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, o) {
      const m = sh(new THREE.Mesh(geo('s', () => new THREE.SphereGeometry(1, 28, 20)), M(c, o)));
      m.position.set(x, y, z);
      m.scale.set(r * sx, r * sy, r * sz);
      return m;
    },
    ico(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, o, detail = 0) {
      const m = sh(new THREE.Mesh(geo(`i${detail}`, () => new THREE.IcosahedronGeometry(1, detail)), M(c, { flat: true, ...o })));
      m.position.set(x, y, z);
      m.scale.set(r * sx, r * sy, r * sz);
      return m;
    },
    cyl(rt, rb, h, c, x = 0, y = 0, z = 0, o, seg = 28) {
      const b = rb || rt;
      const ratio = Math.round((rt / b) * 100) / 100;
      const m = sh(new THREE.Mesh(geo(`c${ratio}|${seg}`, () => new THREE.CylinderGeometry(ratio, 1, 1, seg)), M(c, o)));
      m.scale.set(b, h, b);
      m.position.set(x, y + h / 2, z);
      return m;
    },
    cone(r, h, c, x = 0, y = 0, z = 0, o, seg = 24) {
      const m = sh(new THREE.Mesh(geo(`k${seg}`, () => new THREE.ConeGeometry(1, 1, seg)), M(c, o)));
      m.scale.set(r, h, r);
      m.position.set(x, y + h / 2, z);
      return m;
    },
    box(w, h, d, c, x = 0, y = 0, z = 0, o, ry = 0) {
      const rad = Math.min(w, h, d) * 0.18;
      const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), M(c, o)));
      m.position.set(x, y + h / 2, z);
      m.rotation.y = ry;
      return m;
    },
    torus(r, t, c, x = 0, y = 0, z = 0, o, flat = true) {
      const m = sh(new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, 36), M(c, o)));
      m.position.set(x, y, z);
      if (flat) m.rotation.x = Math.PI / 2;
      return m;
    },
    group(...items) {
      const g = new THREE.Group();
      for (const it of items.flat()) if (it) g.add(it);
      return g;
    },
  };
  /** punto del terreno sotto il px (x, y) della mappa */
  const at = (x, y, h = 0) => new THREE.Vector3((x - W / 2) / U, h, (y - H / 2) / (U * SIN));
  /** come at(), ma tale che un oggetto alto h abbia la CIMA sul px (x, y) */
  const atTop = (x, y, h) => at(x, y + h * COS * U, 0);
  /** mette un gruppo nella scena al px (x, y), scala s, rotazione ry */
  const put = (obj, x, y, s = 1, ry = 0, h = 0) => {
    obj.position.copy(at(x, y, h));
    obj.scale.multiplyScalar(s);
    obj.rotation.y += ry;
    scene.add(obj);
    return obj;
  };
  /** chiazza di terreno dal bordo morbido (rx, ry in px sullo schermo), alta h unità */
  const blob = (x, y, rx, ry, color, { h = 0.5, n = 11, jag = 0.22, o, bevel = 0.22, y0 = 0 } = {}) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 - jag / 2 + rng() * jag;
      pts.push(new THREE.Vector3((Math.cos(a) * rx * k) / U, (-Math.sin(a) * ry * k) / (U * SIN), 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const shape = new THREE.Shape(curve.getPoints(n * 5).map((v) => new THREE.Vector2(v.x, v.y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, h - bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    const m = sh(new THREE.Mesh(g, M(color, o)), h > 0.25, true);
    m.position.copy(at(x, y, y0));
    scene.add(m);
    return m;
  };
  /** punti liberi per le decorazioni (lontani da livelli e arena) */
  const free = (count, nodes, { minDist = 50, gap = 30, pad = 14, top = 60, bottom = H - 20, left = 0, right = W } = {}) => {
    const out = [];
    for (let tries = 0; out.length < count && tries < count * 50; tries++) {
      const x = left + pad + rng() * (right - left - pad * 2);
      const y = top + rng() * (bottom - top);
      if (nodes.some((nd) => Math.hypot(nd.x - x, (nd.y - y) * 1.1) < (nd.r || minDist))) continue;
      if (out.some((o) => Math.hypot(o[0] - x, o[1] - y) < gap)) continue;
      out.push([x, y]);
    }
    return out;
  };
  /** sassi/passi lungo il sentiero fra i livelli */
  const trail = (nodes, make, step = 17, skip = 30) => {
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const end = i === nodes.length - 2 ? 62 : skip;
      for (let t = skip; t < d - end; t += step) {
        const k = t / d;
        const wob = Math.sin(t * 0.09 + i) * 5;
        make(a.x + (b.x - a.x) * k + ((b.y - a.y) / d) * wob, a.y + (b.y - a.y) * k - ((b.x - a.x) / d) * wob, i, t);
      }
    }
  };
  return { scene, rng, mat, L, at, atTop, put, blob, free, trail, U, SIN, COS, W, H, pick: (arr) => arr[Math.floor(rng() * arr.length)], rnd: (a, b) => a + rng() * (b - a) };
}

/** Sfumature finali sull'immagine (foschia in lontananza, vignettatura, bagliori). */
function grade(ctx, w, h, mood) {
  if (mood.haze) {
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.42);
    g.addColorStop(0, mood.haze);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * 0.42);
  }
  for (const s of mood.glows || []) {
    const g = ctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, s.r * w);
    g.addColorStop(0, s.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = s.op || 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, h * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, mood.vignette || 'rgba(10,14,40,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function buildScene(n, nodes, renderer) {
  const theme = THEME_ORDER[n - 1] || 'pond';
  const mood = MOODS[theme];
  const rng = seeded(n * 7919 + 11);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(mood.bg);
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = mood.env ?? 0.55;
  const key = new THREE.DirectionalLight(mood.key || 0xfff0d8, mood.keyI ?? 2.6);
  key.position.set(-55, 95, 48);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.04;
  Object.assign(key.shadow.camera, { left: -34, right: 34, top: 62, bottom: -62, near: 10, far: 260 });
  scene.add(key);
  scene.add(new THREE.HemisphereLight(mood.sky || 0xdfeeff, mood.ground || 0x6a5040, mood.hemiI ?? 0.75));
  const rim = new THREE.DirectionalLight(mood.rim || 0xbfd8ff, mood.rimI ?? 0.8);
  rim.position.set(50, 40, -60);
  scene.add(rim);

  const K = makeKit(scene, rng);
  // terreno di base con una texture dipinta (variazioni, increspature, granelli)
  const tex = new THREE.CanvasTexture(paintGround(theme, rng));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W / U + 4, H / (U * SIN) + 4), new THREE.MeshPhysicalMaterial({ map: tex, roughness: mood.groundRough ?? 0.8, clearcoat: mood.groundCoat ?? 0, clearcoatRoughness: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const levels = nodes.slice(0, 9);
  const boss = nodes[9];
  BUILDERS[theme](K, { levels, boss, nodes });

  const cam = new THREE.OrthographicCamera(-W / U / 2, W / U / 2, H / U / 2, -H / U / 2, 1, 400);
  cam.position.set(0, 150 * SIN, 150 * COS);
  cam.lookAt(0, 0, 0);
  return { scene, cam, mood, tex };
}

const cache = new Map();

/** URL dell'immagine del mondo n (1..10), disegnata una volta sola. */
export function worldImage(n, nodes) {
  if (!has3D()) return Promise.resolve(null);
  if (cache.has(n)) return cache.get(n);
  const p = new Promise((resolve, reject) => {
    // passa dalla coda condivisa delle immagini 3D: un solo renderer per tutto il gioco
    renderThumb(
      `world3d:${n}`,
      async (T, r) => {
        const old = r.getSize(new T.Vector2());
        const oldTone = r.toneMapping;
        const oldExp = r.toneMappingExposure;
        try {
          const { scene, cam, mood, tex } = buildScene(n, nodes, r);
          const w = Math.round(W * SCALE);
          const h = Math.round(H * SCALE);
          r.setPixelRatio(1);
          r.setSize(w, h, false);
          r.toneMapping = T.NeutralToneMapping ?? T.ACESFilmicToneMapping;
          r.toneMappingExposure = mood.exposure ?? 1.05;
          r.render(scene, cam);
          const cv = document.createElement('canvas');
          cv.width = w;
          cv.height = h;
          const ctx = cv.getContext('2d');
          ctx.drawImage(r.domElement, 0, 0);
          grade(ctx, w, h, mood);
          cv.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('blob'))), 'image/jpeg', 0.9);
          scene.traverse((o) => {
            o.geometry?.dispose?.();
            const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
            ms.forEach((m) => m.dispose?.());
          });
          tex.dispose();
          r.shadowMap.needsUpdate = true;
        } catch (e) {
          reject(e);
        } finally {
          r.toneMapping = oldTone;
          r.toneMappingExposure = oldExp;
          r.setSize(old.x, old.y, false);
        }
        return { scene: new T.Scene(), camera: new T.PerspectiveCamera(), dispose() {} };
      },
      2,
    ).catch(reject);
  });
  cache.set(n, p);
  p.catch(() => cache.delete(n));
  return p;
}

export { THEME_ORDER };
