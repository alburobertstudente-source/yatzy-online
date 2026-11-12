/**
 * Avatar 3D: personaggio "giocattolo" (testa grande, occhi lucidi, sorriso)
 * vestito con i modelli di wearables3d.js, disegnato con luce da studio,
 * ombre morbide e riflessi. Le immagini si generano una volta (renderer
 * condiviso di core.js) e restano in cache.
 *
 * Tipi di immagine registrati:
 *   'avatar' chiave "tono|b o f|cappello,viso,maglietta,pantaloni,scarpe,schiena"
 *   'wear'   chiave = id dell'oggetto (anteprima dell'oggetto da solo)
 */
import * as THREE from 'three';
import { ITEMS, SKIN_TONES } from '../meta/catalog.js';
import { renderThumb, registerArt, studioLights, shadowCatcher, has3D } from './core.js';
import { BODY, G, TEX, mesh, limb, segment, skinMat, shade, hexOf, onHead, placeOnHead, headShell, cached } from './avatarKit.js';
import { buildWearable, COVERING_HATS } from './wearables3d.js';

const PI = Math.PI;
const HD = BODY.head;
const CATS = ['hat', 'face', 'shirt', 'pants', 'shoes', 'back'];
const DEFAULTS = { shirt: 'shirt.basic', pants: 'pants.basic', shoes: 'shoes.basic' };

/* ---------------- testa ---------------- */
const HAIR = '#5a3418';

function hairMat() {
  return cached('m:hair', () => new THREE.MeshPhysicalMaterial({ color: HAIR, roughness: 0.42, sheen: 1, sheenColor: '#d9a070', sheenRoughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.25, bumpMap: TEX.hairBump(), bumpScale: 0.8 }));
}

function eye(sx) {
  const e = new THREE.Group();
  const white = cached('m:eyew', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const iris = cached('m:iris', () => new THREE.MeshPhysicalMaterial({ color: '#6b4226', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 }));
  const pupil = cached('m:pupil', () => new THREE.MeshPhysicalMaterial({ color: '#120c0a', roughness: 0.1, clearcoat: 1 }));
  const spark = cached('m:spark', () => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
  e.add(mesh(G.sphere(32), white, { s: [0.125, 0.15, 0.07] }));
  e.add(mesh(G.sphere(32), iris, { p: [0.008 * sx, -0.012, 0.045], s: [0.088, 0.1, 0.035] }));
  e.add(mesh(G.sphere(24), pupil, { p: [0.008 * sx, -0.012, 0.068], s: [0.05, 0.058, 0.02] }));
  e.add(mesh(G.sphere(12), spark, { p: [0.04, 0.035, 0.085], s: [0.026, 0.03, 0.01], shadow: false }));
  e.add(mesh(G.sphere(10), spark, { p: [-0.025, -0.045, 0.083], s: 0.012, shadow: false }));
  placeOnHead(e, sx * 0.34, -0.02, -0.03);
  return e;
}

function head(skin, { coveringHat = false } = {}) {
  const g = new THREE.Group();
  const s = skinMat(skin);
  const h = mesh(G.sphere(48), s, { p: [0, HD.y, 0], s: [HD.r * HD.sx, HD.r * HD.sy, HD.r * HD.sz] });
  g.add(h);
  // orecchie
  for (const sx of [-1, 1]) {
    const ear = mesh(G.sphere(24), s, { s: [0.08, 0.15, 0.11] });
    placeOnHead(ear, sx * 1.5, 0.0, -0.01);
    g.add(ear);
    const inner = mesh(G.sphere(16), skinMat(hexOf(shade(skin, 0.85))), { s: [0.05, 0.1, 0.06] });
    placeOnHead(inner, sx * 1.52, 0.0, 0.035);
    g.add(inner);
  }
  // occhi, sopracciglia, naso, bocca, guance
  g.add(eye(-1), eye(1));
  const brow = cached('m:brow', () => new THREE.MeshPhysicalMaterial({ color: '#4a2a14', roughness: 0.6 }));
  for (const sx of [-1, 1]) {
    const a = onHead(sx * 0.2, 0.27, 0.015).p;
    const m = onHead(sx * 0.34, 0.31, 0.02).p;
    const b = onHead(sx * 0.48, 0.27, 0.01).p;
    g.add(mesh(G.tube(`brow${sx}`, [[a.x, a.y, a.z], [m.x, m.y, m.z], [b.x, b.y, b.z]], 0.026, false, 16), brow));
  }
  const nose = mesh(G.sphere(20), skinMat(hexOf(shade(skin, 0.97))), { s: [0.075, 0.06, 0.06] });
  placeOnHead(nose, 0, -0.2, 0.0);
  g.add(nose);
  // bocca sorridente: interno scuro, lingua, labbro
  const mouth = new THREE.Group();
  const dark = cached('m:mouth', () => new THREE.MeshPhysicalMaterial({ color: '#7a2418', roughness: 0.5 }));
  const tongue = cached('m:tongue', () => new THREE.MeshPhysicalMaterial({ color: '#ff7f86', roughness: 0.4, clearcoat: 0.5 }));
  const smileShape = cached('g:smile', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.15, 0.02);
    sh.quadraticCurveTo(0, -0.02, 0.15, 0.02);
    sh.quadraticCurveTo(0.13, -0.15, 0, -0.16);
    sh.quadraticCurveTo(-0.13, -0.15, -0.15, 0.02);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3, curveSegments: 20 });
    return geo;
  });
  mouth.add(mesh(smileShape, dark, { shadow: false }));
  mouth.add(mesh(G.sphere(16), tongue, { p: [0, -0.1, 0.02], s: [0.075, 0.04, 0.02], shadow: false }));
  mouth.add(mesh(G.box(0.18, 0.035, 0.02, 0.012), cached('m:teeth', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1 })), { p: [0, -0.005, 0.02], shadow: false }));
  placeOnHead(mouth, 0, -0.39, -0.02);
  g.add(mouth);
  const blush = cached('m:blush', () => new THREE.MeshBasicMaterial({ color: '#ff6f6f', transparent: true, opacity: 0.28, depthWrite: false }));
  for (const sx of [-1, 1]) {
    const c = mesh(G.sphere(16), blush, { s: [0.1, 0.06, 0.02], shadow: false });
    placeOnHead(c, sx * 0.48, -0.27, 0.005);
    g.add(c);
  }
  // capelli: calotta, nuca, ciuffo sulla fronte
  const hm = hairMat();
  if (!coveringHat) {
    const top = headShell(G.dome(1.18, 48), hm, 0.035);
    top.rotation.x = -0.32;
    g.add(top);
    for (const [yaw, pitch, rz, sc] of [[-0.42, 0.62, 0.7, 1], [-0.12, 0.72, 0.3, 1.15], [0.2, 0.7, -0.2, 1.05], [0.46, 0.6, -0.65, 0.9]]) {
      const tuft = mesh(G.sphere(24), hm, { s: [0.16 * sc, 0.26 * sc, 0.1] });
      placeOnHead(tuft, yaw, pitch, -0.02, rz);
      g.add(tuft);
    }
  }
  const back = headShell(G.band(PI * 1.25, coveringHat ? 1.15 : 0.6, coveringHat ? 0.85 : 1.35, 48), hm, 0.03);
  back.rotation.y = PI;
  g.add(back);
  for (const sx of [-1, 1]) {
    const side = mesh(G.sphere(20), hm, { s: [0.09, 0.2, 0.12] });
    placeOnHead(side, sx * 1.2, 0.18, -0.03, sx * 0.2);
    g.add(side);
  }
  return g;
}

/* ---------------- corpo ---------------- */
function body(skin, it) {
  const g = new THREE.Group();
  const s = skinMat(skin);
  // collo
  g.add(segment([0, BODY.neck.y0, 0], [0, BODY.neck.y1, 0], BODY.neck.r, BODY.neck.r, s, 24));
  // braccia e mani (le maniche le coprono)
  for (const sx of [-1, 1]) {
    g.add(limb([sx * (BODY.shoulder.x - 0.02), BODY.shoulder.y, 0], [sx * BODY.wrist.x, BODY.wrist.y, 0.02], BODY.arm.r, s));
    const hand = new THREE.Group();
    hand.add(mesh(G.sphere(24), s, { s: [0.13, 0.14, 0.12] }));
    hand.add(mesh(G.sphere(16), s, { p: [-sx * 0.08, 0.03, 0.06], s: [0.05, 0.075, 0.05], r: [0, 0, sx * 0.6] }));
    hand.position.set(sx * (BODY.wrist.x + 0.02), BODY.wrist.y - 0.1, 0.04);
    g.add(hand);
  }
  // gambe
  for (const sx of [-1, 1]) g.add(limb([sx * BODY.hip.x, 0.98, 0], [sx * (BODY.hip.x + 0.01), 0.22, 0.02], BODY.leg.r, s));
  return g;
}

/** Personaggio completo (Group) per un equipaggiamento. */
export function buildAvatar(equip = {}, skinTone = 0) {
  const skin = SKIN_TONES[skinTone] || SKIN_TONES[0];
  const get = (cat) => ITEMS[equip[cat]] || (DEFAULTS[cat] ? ITEMS[DEFAULTS[cat]] : null);
  const it = Object.fromEntries(CATS.map((c) => [c, get(c)]));
  const root = new THREE.Group();
  root.add(body(skin, it));
  const hd = head(skin, { coveringHat: Boolean(it.hat && COVERING_HATS.has(it.hat.type)) });
  root.add(hd);
  for (const c of ['pants', 'shirt', 'shoes', 'back', 'face', 'hat']) if (it[c]) root.add(buildWearable(it[c], { skinMat: skinMat(skin) }));
  return root;
}

/* ---------------- scena e inquadratura ---------------- */
let stage = null;
function getStage() {
  if (stage) return stage;
  const scene = new THREE.Scene();
  // luci un po' più morbide e riflessi più bassi: colori pieni, niente effetto "slavato"
  studioLights(scene, { shadows: true, intensity: 0.8 });
  scene.environmentIntensity = 0.45;
  const catcher = shadowCatcher(12, 0.22);
  scene.add(catcher);
  stage = { scene, catcher };
  return stage;
}

const box = new THREE.Box3();
const tmpV = new THREE.Vector3();

/**
 * Inquadra un oggetto: azimuth (radianti, 0 = davanti), elevazione della
 * telecamera, quanto deve riempire l'immagine.
 */
function frame(obj, { azimuth = 0.42, elev = 0.22, fill = 0.88, fov = 26, fit = 'sphere', range = null } = {}) {
  // solo le mesh: aloni e scintille non contano per l'inquadratura
  box.makeEmpty();
  obj.traverse((o) => {
    if (o.isMesh && !o.userData.noFrame && o.visible) box.expandByObject(o, false);
  });
  if (range) {
    box.min.y = Math.max(box.min.y, range[0]);
    box.max.y = Math.min(box.max.y, range[1]);
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(tmpV);
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 100);
  const half = (fov / 2) * (PI / 180);
  let radius;
  if (fit === 'height') radius = Math.max(size.y / 2, Math.max(size.x, size.z) * 0.36);
  else radius = Math.max(size.x, size.y, size.z) * 0.5 * 1.08;
  const dist = radius / Math.tan(half) / fill + Math.max(size.x, size.z) * 0.25;
  const dir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elev), Math.sin(elev), Math.cos(azimuth) * Math.cos(elev));
  cam.position.copy(center).addScaledVector(dir, dist);
  cam.lookAt(center);
  cam.near = Math.max(0.05, dist - 10);
  cam.far = dist + 10;
  cam.updateProjectionMatrix();
  return { cam, floor: box.min.y };
}

/**
 * Il renderer è condiviso: per i colori pieni da cartone uso il tone mapping
 * "Neutral" (non sbiadisce i colori saturi) e rimetto tutto com'era dopo.
 */
function sceneFor(obj, opts, renderer) {
  const st = getStage();
  const prev = renderer ? { tm: renderer.toneMapping, ex: renderer.toneMappingExposure } : null;
  if (renderer) {
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
  }
  st.scene.add(obj);
  obj.updateMatrixWorld(true);
  const full = new THREE.Box3().setFromObject(obj);
  const { cam } = frame(obj, opts);
  st.catcher.position.y = full.min.y - 0.002;
  st.catcher.visible = opts.shadow !== false;
  return {
    scene: st.scene,
    camera: cam,
    dispose: () => {
      st.scene.remove(obj);
      if (prev) {
        renderer.toneMapping = prev.tm;
        renderer.toneMappingExposure = prev.ex;
      }
    },
  };
}

/* ---------------- chiavi e immagini ---------------- */
export function avatarKey({ equip = {}, skinTone = 0 } = {}, bust = false) {
  return `${skinTone | 0}|${bust ? 'b' : 'f'}|${CATS.map((c) => equip[c] || '').join(',')}`;
}

function parseKey(key) {
  const [tone, mode, list] = key.split('|');
  const ids = (list || '').split(',');
  const equip = {};
  CATS.forEach((c, i) => ids[i] && (equip[c] = ids[i]));
  return { skinTone: Number(tone) || 0, bust: mode === 'b', equip };
}

export function avatarImage(key, size) {
  return renderThumb(
    `av3d:${key}`,
    (_T, r) => {
      const { equip, skinTone, bust } = parseKey(key);
      const obj = buildAvatar(equip, skinTone);
      obj.rotation.y = -0.18;
      if (bust) return sceneFor(obj, { azimuth: 0.1, elev: 0.08, fov: 24, fit: 'height', fill: 0.94, range: [1.42, 4.2] }, r);
      return sceneFor(obj, { azimuth: 0.18, elev: 0.14, fov: 24, fit: 'height', fill: 0.93 }, r);
    },
    size,
  );
}

/** Inquadrature delle anteprime per categoria. */
const WEAR_VIEW = {
  hat: { azimuth: 0.55, elev: 0.38, fill: 0.86 },
  face: { azimuth: 0.4, elev: 0.12, fill: 0.84 },
  shirt: { azimuth: 0.42, elev: 0.18, fill: 0.86 },
  pants: { azimuth: 0.42, elev: 0.2, fill: 0.86 },
  shoes: { azimuth: 0.85, elev: 0.42, fill: 0.86 },
  back: { azimuth: PI - 0.55, elev: 0.2, fill: 0.86 },
};

export function wearImage(id, size) {
  const it = ITEMS[id];
  if (!it) return Promise.resolve(null);
  return renderThumb(
    `wear3d:${id}`,
    (_T, r) => {
      const obj = buildWearable(it);
      return sceneFor(obj, WEAR_VIEW[it.cat] || {}, r);
    },
    size,
  );
}

registerArt('avatar', (key, size) => avatarImage(key, size));
registerArt('wear', (id, size) => wearImage(id, size));

/* ---------------- HTML ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent =
    '.av3d{display:inline-grid;place-items:center;vertical-align:middle;flex-shrink:0;overflow:visible}' +
    '.av3d.av3d-full>.art3d-img{object-fit:cover}' +
    '.av3d>.art3d-img{filter:drop-shadow(0 2px 2px rgba(20,10,30,.18))}';
  document.head.append(st);
}

/** Segnaposto HTML dell'avatar (l'SVG resta come riserva finché l'immagine 3D non è pronta). */
export function avatarArtHtml(who, { size = 120, bust = false } = {}, fallback = '') {
  if (!has3D()) return fallback;
  css();
  const h = bust ? size : Math.round((size * 142) / 100);
  const key = avatarKey(who, bust);
  return `<span class="art3d av3d avatar-svg ${bust ? 'av3d-bust' : 'av3d-full'}" data-kind="avatar" data-key="${esc(key)}" data-size="${Math.max(size, h)}" style="width:${size}px;height:${h}px">${fallback}</span>`;
}

/** Segnaposto HTML dell'anteprima di un vestito. */
export function wearArtHtml(id, size = 64, fallback = '') {
  if (!has3D()) return fallback;
  css();
  return `<span class="art3d av3d wear3d" data-kind="wear" data-key="${esc(id)}" data-size="${size}" style="width:${size}px;height:${size}px">${fallback}</span>`;
}
