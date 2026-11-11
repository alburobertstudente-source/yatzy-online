/**
 * Base comune della grafica 3D (three.js / WebGL).
 *
 * - has3D(): WebGL disponibile (e non disattivato con ?no3d)
 * - thumbRenderer(): UN renderer nascosto condiviso per le immagini statiche
 *   (anteprime di dadi, vestiti, carte, avatar), così non si esauriscono i
 *   contesti WebGL del telefono
 * - studioEnv() / studioLights(): luce "da studio" uguale per tutti gli oggetti,
 *   stile cartoon ma con riflessi e ombre veri
 * - renderThumb(key, build, size): disegna una scena una volta e restituisce
 *   l'URL di un'immagine (in cache)
 * - registerArt(kind, fn) + artSpan(kind, key, size, fallbackHtml): segnaposto
 *   nell'HTML che viene sostituito da sé con l'immagine 3D appena pronta
 *   (il fallback SVG resta se il 3D non c'è)
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
let support = null;

export function has3D() {
  if (params.has('no3d') || typeof document === 'undefined') return false;
  if (support !== null) return support;
  try {
    const c = document.createElement('canvas');
    support = Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    support = false;
  }
  return support;
}

/** Densità di pixel limitata (i telefoni a 3× sprecano batteria senza vantaggi visibili). */
export const DPR = typeof devicePixelRatio === 'number' ? Math.min(2, devicePixelRatio || 1) : 1;

/** Impostazioni di colore e luce comuni a tutti i renderer. */
export function setupRenderer(r) {
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.08;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

const envCache = new WeakMap();
/** Riflessi morbidi di una stanza luminosa (niente file esterni). */
export function studioEnv(renderer) {
  let tex = envCache.get(renderer);
  if (!tex) {
    const pm = new THREE.PMREMGenerator(renderer);
    tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    envCache.set(renderer, tex);
  }
  return tex;
}

/**
 * Luci da studio: principale calda dall'alto a sinistra (con ombre morbide),
 * riempimento freddo dal basso, controluce per staccare il bordo.
 */
export function studioLights(scene, { shadows = true, intensity = 1 } = {}) {
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4 * intensity);
  key.position.set(-2.5, 5, 3.5);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    key.shadow.bias = -0.0004;
    const c = key.shadow.camera;
    c.left = -4;
    c.right = 4;
    c.top = 4;
    c.bottom = -4;
    c.near = 0.5;
    c.far = 20;
  }
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6a5040, 0.7 * intensity));
  const rim = new THREE.DirectionalLight(0xbfd8ff, 1.3 * intensity);
  rim.position.set(3, 2.5, -4);
  scene.add(rim);
  return { key, rim };
}

/** Piano invisibile che riceve solo l'ombra (gli oggetti "poggiano" sullo sfondo). */
export function shadowCatcher(size = 10, opacity = 0.28) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

/** Libera la memoria di una scena usata una volta (geometrie, materiali, texture non condivise). */
export function disposeScene(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture && !v.userData?.shared) v.dispose();
      m.dispose?.();
    }
  });
}

/* ---------------- renderer condiviso per le immagini ---------------- */
let thumbR = null;
export function thumbRenderer() {
  if (thumbR) return thumbR;
  const canvas = document.createElement('canvas');
  thumbR = setupRenderer(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' }));
  thumbR.setClearColor(0x000000, 0);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    thumbR = null;
  });
  return thumbR;
}

const thumbCache = new Map();
const queue = [];
let busy = false;

/**
 * Disegna una scena e restituisce l'URL dell'immagine (blob), in cache per chiave.
 * build(THREE, renderer) => { scene, camera, dispose? } (anche asincrona).
 */
export function renderThumb(key, build, size = 128) {
  const ck = `${key}@${size}`;
  if (thumbCache.has(ck)) return thumbCache.get(ck);
  const p = new Promise((resolve, reject) => {
    queue.push({ build, size, resolve, reject });
    pump();
  });
  thumbCache.set(ck, p);
  p.catch(() => thumbCache.delete(ck));
  return p;
}

function pump() {
  if (busy || !queue.length) return;
  busy = true;
  const job = queue.shift();
  const next = () => {
    busy = false;
    // lascia respirare l'interfaccia fra un'immagine e l'altra
    (globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 16)))(pump, { timeout: 120 });
  };
  Promise.resolve()
    .then(async () => {
      const r = thumbRenderer();
      const px = Math.round(job.size * DPR);
      r.setPixelRatio(1);
      r.setSize(px, px, false);
      const { scene, camera, dispose } = await job.build(THREE, r);
      if (!scene.environment) scene.environment = studioEnv(r);
      camera.aspect = 1;
      camera.updateProjectionMatrix?.();
      r.render(scene, camera);
      const url = await new Promise((res) => r.domElement.toBlob((b) => res(b ? URL.createObjectURL(b) : r.domElement.toDataURL('image/png')), 'image/png'));
      if (dispose) dispose();
      else disposeScene(scene);
      return url;
    })
    .then(job.resolve, job.reject)
    .finally(next);
}

/** Telecamera per le anteprime: guarda l'oggetto dall'alto in 3/4 come un'icona. */
export function thumbCamera({ fov = 30, dist = 6, height = 3.2, target = [0, 0.3, 0] } = {}) {
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  cam.position.set(dist * 0.55, height, dist * 0.85);
  cam.lookAt(...target);
  return cam;
}

/* ---------------- segnaposti nell'HTML ---------------- */
const builders = new Map();

/** fn(key, size) => Promise<url>: chi sa disegnare un certo tipo di immagine 3D. */
export function registerArt(kind, fn) {
  builders.set(kind, fn);
  scan(document.body);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Segnaposto: mostra fallbackHtml finché l'immagine 3D non è pronta. */
export function artSpan(kind, key, size, fallbackHtml = '', cls = '') {
  if (!has3D()) return fallbackHtml;
  return `<span class="art3d ${cls}" data-kind="${esc(kind)}" data-key="${esc(key)}" data-size="${size}" style="width:${size}px;height:${size}px">${fallbackHtml}</span>`;
}

function hydrate(el) {
  if (el.dataset.done) return;
  const fn = builders.get(el.dataset.kind);
  if (!fn) return;
  el.dataset.done = '1';
  const size = Number(el.dataset.size) || 96;
  Promise.resolve(fn(el.dataset.key, size))
    .then((url) => {
      if (!url) return;
      const img = new Image();
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      img.className = 'art3d-img';
      img.width = size;
      img.height = size;
      img.src = url;
      img.onload = () => el.replaceChildren(img);
    })
    .catch(() => {
      /* resta il disegno di riserva */
    });
}

function scan(root) {
  if (!root || !root.querySelectorAll) return;
  if (root.classList?.contains('art3d')) hydrate(root);
  root.querySelectorAll('.art3d:not([data-done])').forEach(hydrate);
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const start = () => {
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
    }).observe(document.body, { childList: true, subtree: true });
    scan(document.body);
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
}

export { THREE };
