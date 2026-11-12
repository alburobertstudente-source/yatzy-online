/**
 * Effetti 3D del vassoio dei dadi: particelle (polvere, scintille, note,
 * cuori, monete, bolle, fiamme, coriandoli…), anelli d'urto e i grandi effetti
 * (DOM) dei dadi assurdi. Unità: 1 = lato del dado.
 */
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------------- texture disegnate al volo (in cache) ---------------- */
const TEX = new Map();
function tex(kind) {
  if (TEX.has(kind)) return TEX.get(kind);
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const m = S / 2;
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  switch (kind) {
    case 'soft': {
      const gr = g.createRadialGradient(m, m, 0, m, m, m);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
      break;
    }
    case 'blob': {
      const gr = g.createRadialGradient(m, m, 0, m, m, m);
      gr.addColorStop(0, 'rgba(0,0,0,.62)');
      gr.addColorStop(0.45, 'rgba(0,0,0,.32)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
      break;
    }
    case 'spark': {
      const gr = g.createRadialGradient(m, m, 0, m, m, m * 0.5);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const r = k % 2 ? 6 : 31;
        g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
      }
      g.closePath();
      g.fillStyle = '#fff';
      g.fill();
      break;
    }
    case 'note':
      g.font = 'bold 50px Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('♪', m, m + 2);
      break;
    case 'heart':
      g.beginPath();
      g.moveTo(m, 54);
      g.bezierCurveTo(4, 30, 14, 4, m, 20);
      g.bezierCurveTo(50, 4, 60, 30, m, 54);
      g.fill();
      break;
    case 'flake':
      g.lineWidth = 5;
      g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        g.beginPath();
        g.moveTo(m - Math.cos(a) * 26, m - Math.sin(a) * 26);
        g.lineTo(m + Math.cos(a) * 26, m + Math.sin(a) * 26);
        g.stroke();
      }
      break;
    case 'bubble': {
      g.lineWidth = 3;
      g.globalAlpha = 0.9;
      g.beginPath();
      g.arc(m, m, 26, 0, Math.PI * 2);
      g.stroke();
      const gr = g.createRadialGradient(m, m, 10, m, m, 27);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,.35)');
      g.fillStyle = gr;
      g.fill();
      g.globalAlpha = 1;
      g.beginPath();
      g.ellipse(m - 9, m - 11, 7, 4, -0.6, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'bolt':
      g.beginPath();
      g.moveTo(38, 0);
      g.lineTo(18, 30);
      g.lineTo(31, 30);
      g.lineTo(20, 64);
      g.lineTo(48, 24);
      g.lineTo(34, 24);
      g.lineTo(46, 0);
      g.closePath();
      g.shadowColor = '#fff';
      g.shadowBlur = 8;
      g.fill();
      break;
    case 'drop':
      g.beginPath();
      g.moveTo(m, 6);
      g.bezierCurveTo(m + 22, 34, m + 18, 58, m, 58);
      g.bezierCurveTo(m - 18, 58, m - 22, 34, m, 6);
      g.fill();
      break;
    case 'ring':
      g.lineWidth = 5;
      g.beginPath();
      g.arc(m, m, 27, 0, Math.PI * 2);
      g.stroke();
      break;
    case 'vortex': {
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.lineWidth = 4 - k * 0.5;
        g.globalAlpha = 0.9 - k * 0.12;
        for (let a = 0; a < Math.PI * 2.2; a += 0.08) {
          const r = 4 + a * 4 + k * 2;
          const x = m + Math.cos(a + (k * Math.PI * 2) / 5) * r;
          const y = m + Math.sin(a + (k * Math.PI * 2) / 5) * r;
          if (a === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      break;
    }
    default:
      g.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  TEX.set(kind, t);
  return t;
}

/* ---------------- sistema di particelle ---------------- */
const GOLDS = ['#ffd23f', '#fff3a8', '#ffb627'];
const CONFETTI = ['#ff4d6d', '#ffd23f', '#3dd6ff', '#56ff9e', '#a54dff', '#ffffff', '#ff9a3d'];
const RAINBOW = ['#ff4d4d', '#ffa64d', '#ffe14d', '#59e36b', '#4db8ff', '#9b6bff'];

let confettiGeo = null;
let coinGeo = null;
let coinMat = null;

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.group = new THREE.Group();
    this.group.renderOrder = 5;
    scene.add(this.group);
  }

  get alive() {
    return this.list.length > 0;
  }

  /** Una particella "sprite" (quadratino rivolto alla telecamera). */
  sprite(kind, { pos, vel = [0, 0, 0], color = '#ffffff', size = 0.3, grow = 0, life = 0.8, gravity = 0, drag = 0, additive = false, spin = 0, fadeIn = 0, opacity = 1, swirl = null }) {
    const mat = new THREE.SpriteMaterial({ map: tex(kind), color: new THREE.Color(color), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0 });
    mat.rotation = rnd(0, Math.PI * 2);
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.scale.setScalar(size);
    this.group.add(s);
    this.list.push({ obj: s, mat, vel: new THREE.Vector3(...vel), size, grow, life, age: 0, gravity, drag, spin, fadeIn, opacity, swirl });
    return s;
  }

  /** Coriandolo 3D (rettangolino che gira su sé stesso). */
  confetti(pos, { color = pick(CONFETTI), vel = [0, 0, 0], life = 1.4 } = {}) {
    confettiGeo ||= new THREE.PlaneGeometry(0.13, 0.07);
    const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.1, transparent: true });
    const m = new THREE.Mesh(confettiGeo, mat);
    m.position.copy(pos);
    m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
    this.group.add(m);
    this.list.push({ obj: m, mat, vel: new THREE.Vector3(...vel), life, age: 0, gravity: -5, drag: 1.8, tumble: new THREE.Vector3(rnd(-12, 12), rnd(-12, 12), rnd(-12, 12)), opacity: 1, mesh: true, floor: 0.01 });
  }

  /** Monetina d'oro 3D che salta e gira. */
  coin(pos, vel) {
    coinGeo ||= new THREE.CylinderGeometry(0.11, 0.11, 0.025, 20);
    coinMat ||= new THREE.MeshStandardMaterial({ color: '#ffcf33', metalness: 0.95, roughness: 0.22 });
    const mat = coinMat.clone();
    mat.transparent = true;
    const m = new THREE.Mesh(coinGeo, mat);
    m.position.copy(pos);
    m.castShadow = true;
    this.group.add(m);
    this.list.push({ obj: m, mat, vel: new THREE.Vector3(...vel), life: 1.2, age: 0, gravity: -9, drag: 0.4, tumble: new THREE.Vector3(rnd(8, 16), rnd(-3, 3), rnd(-6, 6)), opacity: 1, mesh: true, floor: 0.02, bounce: 0.4 });
  }

  /** Anello d'urto sul tavolo che si allarga. */
  ring(pos, { color = '#ffffff', from = 0.4, to = 1.6, life = 0.5, opacity = 0.8, additive = true } = {}) {
    const mat = new THREE.MeshBasicMaterial({ map: tex('ring'), color: new THREE.Color(color), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos);
    m.position.y = 0.015;
    m.scale.setScalar(from);
    this.group.add(m);
    this.list.push({ obj: m, mat, vel: new THREE.Vector3(), life, age: 0, ringFrom: from, ringTo: to, opacity, mesh: true, ownGeo: true });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        this.group.remove(p.obj);
        p.mat.dispose();
        if (p.ownGeo) p.obj.geometry.dispose();
        this.list.splice(i, 1);
        continue;
      }
      if (p.ringFrom !== undefined) {
        const e = 1 - (1 - k) ** 2;
        p.obj.scale.setScalar(p.ringFrom + (p.ringTo - p.ringFrom) * e);
        p.mat.opacity = p.opacity * (1 - k);
        continue;
      }
      if (p.gravity) p.vel.y += p.gravity * dt;
      if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      if (p.swirl) {
        // gira attorno a un centro (vortice, risucchio)
        const { c, w, pull } = p.swirl;
        const dx = p.obj.position.x - c.x;
        const dz = p.obj.position.z - c.z;
        const a = Math.atan2(dz, dx) + w * dt;
        const r = Math.max(0, Math.hypot(dx, dz) * (1 - pull * dt));
        p.obj.position.x = c.x + Math.cos(a) * r;
        p.obj.position.z = c.z + Math.sin(a) * r;
      }
      p.obj.position.addScaledVector(p.vel, dt);
      if (p.floor !== undefined && p.obj.position.y < p.floor) {
        p.obj.position.y = p.floor;
        p.vel.y = p.bounce ? -p.vel.y * p.bounce : 0;
        p.vel.x *= 0.6;
        p.vel.z *= 0.6;
        if (p.tumble) p.tumble.multiplyScalar(0.5);
      }
      if (p.tumble) {
        p.obj.rotation.x += p.tumble.x * dt;
        p.obj.rotation.y += p.tumble.y * dt;
        p.obj.rotation.z += p.tumble.z * dt;
      }
      const fade = p.fadeIn && k < p.fadeIn ? k / p.fadeIn : k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      p.mat.opacity = p.opacity * fade;
      if (!p.mesh) {
        p.obj.scale.setScalar(Math.max(0.001, p.size * (1 + p.grow * k)));
        if (p.spin) p.mat.rotation += p.spin * dt;
      }
    }
  }

  clear() {
    for (const p of this.list) {
      this.group.remove(p.obj);
      p.mat.dispose();
    }
    this.list.length = 0;
  }
}

/* ---------------- ombra di contatto sotto ogni dado ---------------- */
export function contactShadow() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex('blob'), transparent: true, depthWrite: false, opacity: 0.85 }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

/** Alone dorato sotto un dado tenuto. */
export function holdGlow() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.8, 48), new THREE.MeshBasicMaterial({ color: '#ffc531', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  ring.rotation.x = -Math.PI / 2;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: tex('soft'), color: '#ffb627', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  halo.rotation.x = -Math.PI / 2;
  g.add(halo, ring);
  g.userData = { ring, halo };
  return g;
}

/** Disco del portale / buco nero (sul tavolo). */
export function vortexDisc(color = '#a54dff', dark = false) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.8),
    new THREE.MeshBasicMaterial({ map: tex(dark ? 'vortex' : 'ring'), color: new THREE.Color(color), transparent: true, depthWrite: false, blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: 0 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  return m;
}

/* ---------------- effetti all'atterraggio di ogni skin ---------------- */
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Sbuffo di polvere sotto al dado (più forte = più polvere). */
export function dust(P, at, strength = 1, color = '#f4ead8') {
  const n = Math.round(4 + strength * 6);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const sp = rnd(0.6, 1.4) * strength;
    P.sprite('soft', { pos: v3(at.x + Math.cos(a) * 0.4, 0.06, at.z + Math.sin(a) * 0.4), vel: [Math.cos(a) * sp, rnd(0.2, 0.6), Math.sin(a) * sp], color, size: rnd(0.22, 0.36), grow: 1.6, life: rnd(0.45, 0.7), drag: 3.5, opacity: 0.45 });
  }
}

/** Particelle dell'effetto della skin (landFx del catalogo). */
export function landBurst(P, type, at, k = 0) {
  const up = (spread = 1.6, lift = [1.6, 3]) => [rnd(-spread, spread), rnd(...lift), rnd(-spread, spread) * 0.6];
  const top = v3(at.x, 0.9, at.z);
  switch (type) {
    case 'notes':
      for (let i = 0; i < 3; i++) P.sprite('note', { pos: top.clone(), vel: up(0.8, [1.4, 2.2]), color: pick(['#5a2bd8', '#ff3d7f', '#2fa8ff']), size: 0.42, life: 1.1, drag: 0.8, gravity: -0.6, spin: rnd(-2, 2) });
      break;
    case 'rings':
    case 'infinity':
      for (let i = 0; i < (type === 'infinity' ? 3 : 1); i++) P.ring(at, { color: type === 'infinity' ? pick(['#9de6ff', '#d99dff', '#ffffff']) : '#ffffff', from: 0.6, to: 2.2 + i * 0.6, life: 0.6 + i * 0.15 });
      break;
    case 'bubbles':
    case 'tsunami':
      for (let i = 0; i < (type === 'tsunami' ? 10 : 6); i++)
        P.sprite(type === 'tsunami' && i % 2 ? 'drop' : 'bubble', { pos: v3(at.x + rnd(-0.4, 0.4), 0.4, at.z + rnd(-0.3, 0.3)), vel: up(0.7, [1.2, 2.4]), color: type === 'tsunami' ? '#5ec8ff' : '#bfefff', size: rnd(0.18, 0.34), life: rnd(0.8, 1.2), drag: 1.2, gravity: type === 'tsunami' ? -4 : 0.3, opacity: 0.9 });
      break;
    case 'snow':
      for (let i = 0; i < 7; i++) P.sprite('flake', { pos: top.clone(), vel: up(1.1, [0.8, 1.8]), color: '#e8f6ff', size: rnd(0.16, 0.26), life: 1.3, drag: 1.6, gravity: -0.5, spin: rnd(-3, 3) });
      break;
    case 'zap':
      P.sprite('bolt', { pos: v3(at.x, 1.4, at.z), color: '#fff27a', size: 1.5, life: 0.28, additive: true });
      P.sprite('soft', { pos: v3(at.x, 0.5, at.z), color: '#fff6b0', size: 2.4, life: 0.3, additive: true, opacity: 0.8 });
      break;
    case 'hearts':
      for (let i = 0; i < 4; i++) P.sprite('heart', { pos: top.clone(), vel: up(0.8, [1.2, 2]), color: pick(['#ff4d8a', '#ff8ab3', '#ff2f5d']), size: rnd(0.24, 0.34), life: 1.2, drag: 1.2, gravity: -0.3 });
      break;
    case 'sparkle':
    case 'unicorn':
    case 'disco':
    case 'cosmiccat':
      for (let i = 0; i < 8; i++) P.sprite('spark', { pos: v3(at.x + rnd(-0.5, 0.5), rnd(0.3, 1.1), at.z + rnd(-0.4, 0.4)), vel: up(1, [0.4, 1.4]), color: type === 'sparkle' ? '#ffffff' : pick(type === 'disco' ? CONFETTI : RAINBOW), size: rnd(0.2, 0.38), life: rnd(0.5, 0.9), drag: 2, additive: true, spin: rnd(-4, 4) });
      break;
    case 'coins':
      for (let i = 0; i < 5; i++) P.coin(v3(at.x, 0.7, at.z), [rnd(-1.3, 1.3), rnd(2.5, 3.8), rnd(-0.6, 0.6)]);
      break;
    case 'dj':
      for (let i = 0; i < 6; i++) P.sprite('note', { pos: top.clone(), vel: up(1.4, [1.6, 2.6]), color: pick(['#ff3dbb', '#2fd0ff', '#56ff9e']), size: 0.36, life: 1, drag: 1, additive: true });
      P.ring(at, { color: '#ff3dbb', to: 2.4 });
      break;
    case 'blackhole':
      for (let i = 0; i < 14; i++) {
        const a = rnd(0, Math.PI * 2);
        const r = rnd(1, 1.8);
        P.sprite('soft', { pos: v3(at.x + Math.cos(a) * r, rnd(0.1, 0.8), at.z + Math.sin(a) * r), color: pick(['#a54dff', '#2b0f6b', '#ffffff']), size: rnd(0.14, 0.3), life: 0.8, swirl: { c: at.clone(), w: 7, pull: 2.6 }, additive: true });
      }
      break;
    case 'phoenix':
    case 'fire':
      for (let i = 0; i < 9; i++) P.sprite('soft', { pos: v3(at.x + rnd(-0.4, 0.4), 0.3, at.z + rnd(-0.3, 0.3)), vel: [rnd(-0.4, 0.4), rnd(1.4, 2.6), 0], color: pick(['#ff6a1a', '#ffb02e', '#ff3d1a']), size: rnd(0.3, 0.5), grow: -0.6, life: rnd(0.5, 0.8), additive: true });
      break;
    case 'tnt':
      dust(P, at, 2.2, '#8a8070');
      for (let i = 0; i < 8; i++) P.sprite('soft', { pos: v3(at.x, 0.5, at.z), vel: up(2.4, [1, 2.4]), color: pick(['#ffb02e', '#ff6a1a']), size: 0.4, grow: 1, life: 0.4, additive: true, drag: 3 });
      break;
    case 'party':
      for (let i = 0; i < 18; i++) P.confetti(v3(at.x, 0.9, at.z), { vel: up(2, [2.4, 4]) });
      break;
    default:
      break;
  }
  if (k === 0 && BIG[type]) P.flash = 1;
}

/* ---------------- grandi effetti dei dadi assurdi (sopra il vassoio, in DOM) ---------------- */
const BIG = { dj: 'bigeq', blackhole: 'bighole', unicorn: 'bigrainbow', phoenix: 'bigfire', infinity: 'bigrings', disco: 'bigdisco', tnt: 'bigboom', cosmiccat: 'bigmiao', tsunami: 'bigwave', party: 'bigparty' };

/** Effetto grande sul vassoio (le classi .lfx-big sono già nei CSS delle skin). @returns {boolean} se c'è stato un terremoto */
export function bigOverlay(host, type) {
  const big = BIG[type];
  if (!big || !host) return false;
  const b = document.createElement('div');
  b.className = `lfx-big lfx-${big}`;
  if (big === 'bigmiao') b.textContent = 'MIAO!';
  if (big === 'bigeq') b.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
  host.append(b);
  setTimeout(() => b.remove(), 1700);
  return big === 'bigboom' || big === 'bighole';
}

/* ---------------- scie degli stili di lancio ---------------- */
/** Particelle emesse dal dado in volo (chiamata a ogni fotogramma). */
export function trail(P, style, pos, { k = 0, t = 0, dt = 0.016 } = {}) {
  const chance = (rate) => Math.random() < rate * dt;
  switch (style) {
    case 'bubbles':
      if (chance(14)) P.sprite('bubble', { pos: pos.clone().add(v3(rnd(-0.5, 0.5), rnd(-0.3, 0.3), rnd(-0.3, 0.3))), vel: [rnd(-0.2, 0.2), rnd(0.6, 1.2), 0], color: '#cdf3ff', size: rnd(0.16, 0.3), life: 1, opacity: 0.85 });
      break;
    case 'tornado':
      if (chance(26)) P.sprite('soft', { pos: pos.clone().add(v3(rnd(-0.7, 0.7), rnd(-0.6, 0.2), rnd(-0.5, 0.5))), color: '#e6f2ff', size: rnd(0.16, 0.3), grow: 1, life: 0.5, opacity: 0.55, swirl: { c: pos.clone(), w: 9, pull: 0.4 }, vel: [0, 0.8, 0] });
      break;
    case 'rocket':
      if (chance(40)) {
        P.sprite('soft', { pos: pos.clone().add(v3(rnd(-0.15, 0.15), -0.55, 0)), vel: [rnd(-0.3, 0.3), -rnd(1, 2), rnd(-0.2, 0.2)], color: pick(['#ffb02e', '#ff6a1a', '#fff3a8']), size: rnd(0.3, 0.45), grow: -0.5, life: 0.3, additive: true });
        P.sprite('soft', { pos: pos.clone().add(v3(rnd(-0.2, 0.2), -0.7, 0)), vel: [rnd(-0.5, 0.5), -rnd(0.2, 0.6), rnd(-0.3, 0.3)], color: '#c9c3bb', size: rnd(0.3, 0.5), grow: 2.2, life: 0.8, opacity: 0.5, drag: 1.5 });
      }
      break;
    case 'meteor':
      if (chance(70)) P.sprite('soft', { pos: pos.clone().add(v3(rnd(-0.2, 0.2), rnd(-0.2, 0.2), rnd(-0.2, 0.2))), vel: [rnd(-0.3, 0.3), rnd(0, 0.5), rnd(-0.3, 0.3)], color: pick(['#ff6a1a', '#ffb02e', '#ff3d1a', '#fff3a8']), size: rnd(0.35, 0.7), grow: -0.7, life: rnd(0.25, 0.45), additive: true });
      break;
    case 'stardust':
      if (chance(30)) P.sprite('spark', { pos: pos.clone().add(v3(rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(-0.3, 0.3))), vel: [rnd(-0.3, 0.3), rnd(-0.6, 0), 0], color: pick(['#fff6b0', '#ffffff', '#9de6ff']), size: rnd(0.16, 0.3), life: 0.7, additive: true, spin: 3 });
      break;
    case 'rainbow':
      if (chance(45)) P.sprite('soft', { pos: pos.clone().add(v3(rnd(-0.12, 0.12), rnd(-0.12, 0.12), 0)), color: RAINBOW[Math.floor((t * 14 + k) % RAINBOW.length)], size: 0.5, grow: -0.3, life: 0.55, additive: true, opacity: 0.8 });
      break;
    case 'ghost':
      if (chance(12)) P.sprite('soft', { pos: pos.clone(), vel: [rnd(-0.4, 0.4), rnd(0.2, 0.7), 0], color: '#cfe0ff', size: 0.6, grow: 1, life: 0.6, opacity: 0.35 });
      break;
    case 'glitch':
      if (chance(10)) P.sprite('soft', { pos: pos.clone().add(v3(rnd(-0.4, 0.4), 0, 0)), color: pick(['#ff2f5d', '#2fd0ff', '#56ff9e']), size: 0.9, life: 0.08, additive: true, opacity: 0.5 });
      break;
    default:
      break;
  }
}

/** Effetto all'arrivo di uno stile di lancio. */
export function styleLand(P, style, at, strength = 1) {
  switch (style) {
    case 'confetti':
      for (let i = 0; i < 10; i++) P.confetti(v3(at.x, 0.8, at.z), { vel: [rnd(-1.6, 1.6), rnd(2, 3.4), rnd(-1, 1)] });
      break;
    case 'lightning':
      P.sprite('bolt', { pos: v3(at.x, 1.6, at.z), color: '#fff27a', size: 1.9, life: 0.3, additive: true });
      P.sprite('soft', { pos: v3(at.x, 0.4, at.z), color: '#fffbe0', size: 2.8, life: 0.35, additive: true });
      P.flash = Math.max(P.flash || 0, 0.8);
      break;
    case 'meteor':
      dust(P, at, 1.8, '#a89a88');
      P.ring(at, { color: '#ffb02e', to: 2.6 });
      break;
    case 'stardust':
      for (let i = 0; i < 6; i++) P.sprite('spark', { pos: v3(at.x, 0.6, at.z), vel: [rnd(-1.4, 1.4), rnd(0.6, 1.6), rnd(-0.6, 0.6)], color: '#fff6b0', size: 0.26, life: 0.6, additive: true, drag: 2 });
      break;
    case 'portal':
      P.ring(at, { color: '#a54dff', to: 2 });
      break;
    case 'bounce':
    case 'hop':
      if (strength > 0.6) P.ring(at, { color: '#ffffff', from: 0.5, to: 1.4, life: 0.35, opacity: 0.4 });
      break;
    default:
      break;
  }
}

/** Festa per lo Yatzy (5 dadi uguali): scintille d'oro e onda d'urto. */
export function yatzyBurst(P, at) {
  P.ring(at, { color: '#ffd23f', from: 0.6, to: 3, life: 0.7 });
  for (let i = 0; i < 7; i++) P.sprite('spark', { pos: v3(at.x, rnd(0.5, 1.2), at.z), vel: [rnd(-2, 2), rnd(1.4, 3), rnd(-1, 1)], color: pick(GOLDS), size: rnd(0.24, 0.4), life: rnd(0.7, 1.1), drag: 1.8, gravity: -2, additive: true, spin: rnd(-4, 4) });
  for (let i = 0; i < 4; i++) P.confetti(v3(at.x, 1, at.z), { vel: [rnd(-1.5, 1.5), rnd(2.5, 4), rnd(-1, 1)], color: pick(GOLDS) });
}
