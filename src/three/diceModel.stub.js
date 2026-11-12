/**
 * TEMPORANEO: modello di dado semplice usato dal vassoio 3D finché non è pronto
 * src/three/diceModel.js (stessa interfaccia). Da cancellare dopo il cambio.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ITEMS } from '../meta/catalog.js';

// facce del BoxGeometry: +X, -X, +Y, -Y, +Z, -Z (opposte sommano 7)
const FACE_OF_GROUP = [2, 5, 1, 6, 3, 4];
const PIPS = { 1: [[0.5, 0.5]], 2: [[0.72, 0.28], [0.28, 0.72]], 3: [[0.72, 0.28], [0.5, 0.5], [0.28, 0.72]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]], 6: [[0.28, 0.26], [0.72, 0.26], [0.28, 0.5], [0.72, 0.5], [0.28, 0.74], [0.72, 0.74]] };

const firstColor = (css, fb) => (String(css || '').match(/#[0-9a-f]{6}|#[0-9a-f]{3}\b|rgba?\([^)]*\)/i) || [fb])[0];

const texCache = new Map();
function faceTexture(skinId, n) {
  const k = `${skinId}:${n}`;
  if (texCache.has(k)) return texCache.get(k);
  const it = ITEMS[skinId] || ITEMS['dice.classic'];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = firstColor(it.face, '#ffffff');
  g.fillRect(0, 0, 128, 128);
  for (const [x, y] of PIPS[n]) {
    const gr = g.createRadialGradient(x * 128 - 3, y * 128 - 3, 1, x * 128, y * 128, 13);
    gr.addColorStop(0, firstColor(it.pip, '#262a3d'));
    gr.addColorStop(1, firstColor(it.pip, '#262a3d'));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x * 128, y * 128, 12, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.shared = true;
  texCache.set(k, t);
  return t;
}

let geo = null;
export function createDie(skinId = 'dice.classic', { size = 1 } = {}) {
  geo ||= new RoundedBoxGeometry(1, 1, 1, 4, 0.14);
  const mats = FACE_OF_GROUP.map((n) => new THREE.MeshPhysicalMaterial({ map: faceTexture(skinId, n), roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }));
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  g.scale.setScalar(size);
  g.userData.skinId = skinId;
  g.userData.dispose = () => mats.forEach((m) => m.dispose());
  return g;
}

const Q_BASE = {
  1: new THREE.Quaternion(),
  6: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI),
  2: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
  5: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2),
  3: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
  4: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
};

export function quatForValue(value, spin = 0) {
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin).multiply(Q_BASE[value] || Q_BASE[1]);
}

const NORMALS = { 2: [1, 0, 0], 5: [-1, 0, 0], 1: [0, 1, 0], 6: [0, -1, 0], 3: [0, 0, 1], 4: [0, 0, -1] };
export function valueOnTop(obj) {
  let best = 1;
  let by = -2;
  const v = new THREE.Vector3();
  for (const [n, d] of Object.entries(NORMALS)) {
    v.set(...d).applyQuaternion(obj.quaternion);
    if (v.y > by) {
      by = v.y;
      best = Number(n);
    }
  }
  return best;
}

export function preloadDice() {
  return Promise.resolve();
}
