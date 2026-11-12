/**
 * Apertura delle casse in 3D: la cassa cade e rimbalza, trema (di più se
 * dentro c'è qualcosa di raro), il coperchio salta sul cardine con un fascio
 * di luce del colore della rarità e una pioggia di scintille.
 * Un solo canvas WebGL, creato all'apertura e liberato alla fine.
 */
import * as THREE from 'three';
import { has3D, setupRenderer, studioEnv, studioLights, shadowCatcher, disposeScene, DPR } from './core.js';
import { chestModel } from './cosmetics3d.js';

const easeOutBack = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const easeOut = (t) => 1 - (1 - t) ** 3;

function sparkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class ChestScene {
  /** @returns {ChestScene|null} null se il 3D non c'è (si usa la versione disegnata) */
  static create(host, type, color, rank = 0) {
    if (!has3D()) return null;
    try {
      return new ChestScene(host, type, color, rank);
    } catch {
      return null;
    }
  }

  constructor(host, type, color, rank) {
    this.rank = rank;
    this.color = new THREE.Color(color);
    const canvas = document.createElement('canvas');
    canvas.className = 'co-canvas';
    host.append(canvas);
    this.canvas = canvas;
    const w = 360;
    const h = 420;
    this.r = setupRenderer(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
    this.r.setPixelRatio(DPR);
    this.r.setSize(w, h, false);
    this.r.setClearColor(0, 0);
    const scene = (this.scene = new THREE.Scene());
    scene.environment = studioEnv(this.r);
    scene.environmentIntensity = 0.8;
    studioLights(scene, { intensity: 0.9 });
    scene.add(shadowCatcher(12, 0.35));
    this.cam = new THREE.PerspectiveCamera(32, w / h, 0.1, 50);
    this.cam.position.set(0, 2.6, 6.2);
    this.cam.lookAt(0, 0.75, 0);

    const chest = chestModel(type);
    chest.traverse((o) => o.isMesh && (o.castShadow = true));
    // cardine del coperchio sul bordo posteriore
    const lid = chest.userData.lid;
    const D = 1.1;
    const H = 0.85;
    const pivot = new THREE.Group();
    pivot.position.set(0, H, -D / 2);
    chest.remove(lid);
    lid.position.set(0, 0, D / 2);
    pivot.add(lid);
    chest.add(pivot);
    this.pivot = pivot;
    this.chest = chest;
    chest.rotation.y = -0.45;
    this.root = new THREE.Group();
    this.root.add(chest);
    scene.add(this.root);

    // luce interna e fascio
    this.inner = new THREE.PointLight(this.color, 0, 6, 1.5);
    this.inner.position.set(0, 0.9, 0);
    chest.add(this.inner);
    const beamMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.55, 5, 32, 1, true), beamMat);
    this.beam.position.set(0, 3.3, 0);
    chest.add(this.beam);
    // raggi rotanti dietro
    const rays = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 7), rayMat);
      m.rotation.z = (i / 14) * Math.PI * 2;
      m.position.set(Math.sin(-m.rotation.z) * 3.5, Math.cos(m.rotation.z) * 3.5, 0);
      rays.add(m);
    }
    rays.position.set(0, 1.2, -2.5);
    this.rays = rays;
    this.rayMat = rayMat;
    scene.add(rays);

    // scintille
    const N = 260 + rank * 80;
    this.N = N;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    const col = new Float32Array(N * 3);
    const pal = [this.color, new THREE.Color('#ffffff'), new THREE.Color('#ffe27a')];
    for (let i = 0; i < N; i++) {
      const c = pal[i % 3];
      col.set([c.r, c.g, c.b], i * 3);
      this.pos[i * 3 + 1] = -99;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.sparks = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, map: sparkTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(this.sparks);

    this.anims = [];
    this.t0 = performance.now();
    this.shakeAmp = 0;
    this.open = false;
    this.alive = true;
    this.root.position.y = 6;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /** anima fn(k 0..1) per `ms` millisecondi */
  tween(msDur, fn) {
    return new Promise((resolve) => this.anims.push({ start: performance.now(), dur: msDur, fn, resolve }));
  }

  loop(now) {
    if (!this.alive) return;
    const t = (now - this.t0) / 1000;
    this.anims = this.anims.filter((a) => {
      const k = Math.min(1, (now - a.start) / a.dur);
      a.fn(k);
      if (k >= 1) a.resolve();
      return k < 1;
    });
    // tremolio
    if (this.shakeAmp > 0.001) {
      this.chest.rotation.z = Math.sin(t * 48) * this.shakeAmp;
      this.chest.position.x = Math.sin(t * 37) * this.shakeAmp * 0.4;
      this.shakeAmp *= 0.9;
    }
    if (this.open) {
      this.rays.rotation.z = t * 0.35;
      this.chest.rotation.y = -0.45 + Math.sin(t * 0.8) * 0.12;
    }
    // particelle
    const dt = 1 / 60;
    let any = false;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 4.5 * dt;
      for (let a = 0; a < 3; a++) this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -99;
    }
    if (any || this.open) this.sparks.geometry.attributes.position.needsUpdate = true;
    this.r.render(this.scene, this.cam);
    this.raf = requestAnimationFrame(this.loop);
  }

  burst(count, power = 1) {
    let n = 0;
    for (let i = 0; i < this.N && n < count; i++) {
      if (this.life[i] > 0) continue;
      n++;
      const a = Math.random() * Math.PI * 2;
      const sp = (1.5 + Math.random() * 3.5) * power;
      this.pos.set([(Math.random() - 0.5) * 0.8, 1.1, (Math.random() - 0.5) * 0.5], i * 3);
      this.vel.set([Math.cos(a) * sp * 0.6, 3 + Math.random() * 4 * power, Math.sin(a) * sp * 0.4], i * 3);
      this.life[i] = 1.2 + Math.random() * 1.2;
    }
  }

  /** la cassa cade e rimbalza */
  async drop() {
    await this.tween(650, (k) => {
      const e = k < 0.62 ? (k / 0.62) ** 2 : 1;
      this.root.position.y = 6 * (1 - e) + (k >= 0.62 ? Math.sin(((k - 0.62) / 0.38) * Math.PI) * 0.45 * (1 - k) * 2 : 0);
      const sq = k > 0.58 && k < 0.75 ? Math.sin(((k - 0.58) / 0.17) * Math.PI) * 0.18 : 0;
      this.root.scale.set(1 + sq, 1 - sq, 1 + sq);
    });
    this.root.position.y = 0;
    this.root.scale.set(1, 1, 1);
  }

  /** un colpo di tremolio (k = quanti ne sono già stati) */
  async shake(k) {
    this.shakeAmp = 0.06 + k * 0.025;
    this.inner.intensity = 0.4 + k * 0.5;
    if (k >= 2) this.burst(6 + k * 3, 0.4);
    await this.tween(170, (q) => {
      const s = 1 + Math.sin(q * Math.PI) * (0.03 + k * 0.012);
      this.root.scale.set(s, 1 / s, s);
    });
  }

  /** il coperchio salta via e la luce esce */
  async openLid() {
    this.open = true;
    this.burst(140 + this.rank * 50, 1 + this.rank * 0.12);
    const extra = this.rank >= 5;
    await this.tween(700, (k) => {
      const e = easeOutBack(k);
      this.pivot.rotation.x = -1.95 * e;
      this.inner.intensity = 3 + this.rank * 1.2;
      this.beam.material.opacity = 0.35 * easeOut(k);
      this.rayMat.opacity = (0.18 + this.rank * 0.03) * easeOut(k);
      this.root.position.y = Math.sin(k * Math.PI) * 0.25;
    });
    if (extra) {
      // mitico / assurdo: seconda e terza esplosione
      setTimeout(() => this.alive && this.burst(160, 1.6), 250);
      setTimeout(() => this.alive && this.burst(160, 2), 600);
    }
  }

  /** la cassa si fa da parte quando escono gli oggetti */
  dim() {
    return this.tween(300, (k) => {
      this.beam.material.opacity = 0.35 * (1 - k * 0.6);
      this.root.position.y = -0.4 * k;
    });
  }

  dispose() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    disposeScene(this.scene);
    this.r.dispose();
    this.r.forceContextLoss?.();
    this.canvas.remove();
  }
}
