/**
 * Personaggi 3D "vivi" (boss, croupier): un canvas WebGL dentro un elemento,
 * con animazioni procedurali (respiro, battito di ciglia, parti che si muovono)
 * e azioni a tempo (entrata, incantesimo, colpo, sconfitta, vittoria…) più
 * particelle. Si disegna solo mentre l'elemento è in pagina e visibile; a riposo
 * va a 30 fps. Senza WebGL o con WebGL software (prove automatiche) non parte:
 * resta l'immagine statica. Con ?force3d parte comunque.
 *
 * I modelli marcano le parti da muovere con tag(obj, tipo, opzioni):
 *   flap  ali / orecchie (rotazione oscillante)      bob   galleggia su e giù
 *   spin  ruota di continuo                          wag   coda / mantello
 *   snap  chele che si chiudono                      blink palpebre (scala Y)
 *   pulse bagliore che pulsa (scala)                 nod   testa che dondola
 */
import * as THREE from 'three';
import { has3D, DPR, setupRenderer, studioEnv, studioLights, shadowCatcher } from './core.js';

const PI = Math.PI;
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

let live = null;
/** Si può usare un canvas vivo? (WebGL vero, non software.) */
export function canLive() {
  if (live !== null) return live;
  live = false;
  if (!has3D()) return false;
  if (params.has('force3d')) return (live = true);
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    live = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    live = false;
  }
  return live;
}

/** Marca una parte del modello come animata. */
export function tag(obj, type, opts = {}) {
  obj.userData.anim = { type, ...opts };
  obj.userData.base = null;
  return obj;
}

const ease = {
  out: (k) => 1 - (1 - k) ** 3,
  in: (k) => k ** 3,
  inOut: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  back: (k) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2,
  bounce: (k) => {
    const n = 7.5625;
    const d = 2.75;
    if (k < 1 / d) return n * k * k;
    if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
    if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
    return n * (k -= 2.625 / d) * k + 0.984375;
  },
};
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
/** 0→1→0 morbido */
const hump = (k) => Math.sin(clamp01(k) * PI);

let dotTex = null;
function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  dotTex.userData.shared = true;
  return dotTex;
}

/** Sistema di particelle semplice (sprite additivi o scuri). */
class Particles {
  constructor(scene, max = 160) {
    this.max = max;
    this.items = [];
    this.pool = [];
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  emit({ at = [0, 1, 0], count = 20, color = '#ffffff', colors = null, speed = 1.6, up = 0.6, gravity = -1.2, life = 0.9, size = 0.16, spread = 0.2, dark = false, ring = false }) {
    for (let i = 0; i < count && this.items.length < this.max; i++) {
      let s = this.pool.pop();
      if (!s) {
        s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }));
        s.userData.noFrame = true;
      }
      const m = s.material;
      m.blending = dark ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.color.set(colors ? colors[i % colors.length] : color);
      m.toneMapped = false;
      const a = Math.random() * PI * 2;
      const el = ring ? 0 : (Math.random() - 0.3) * PI * 0.8;
      const v = speed * (0.5 + Math.random() * 0.7);
      s.position.set(at[0] + (Math.random() - 0.5) * spread, at[1] + (Math.random() - 0.5) * spread, at[2] + (Math.random() - 0.5) * spread);
      s.userData.v = [Math.cos(a) * Math.cos(el) * v, Math.sin(el) * v + up, Math.sin(a) * Math.cos(el) * v * 0.6];
      s.userData.g = gravity;
      s.userData.life = s.userData.max = life * (0.6 + Math.random() * 0.7);
      s.userData.size = size * (0.6 + Math.random() * 0.8);
      this.group.add(s);
      this.items.push(s);
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const s = this.items[i];
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) {
        this.group.remove(s);
        this.items.splice(i, 1);
        this.pool.push(s);
        continue;
      }
      u.v[1] += u.g * dt;
      s.position.x += u.v[0] * dt;
      s.position.y += u.v[1] * dt;
      s.position.z += u.v[2] * dt;
      const k = u.life / u.max;
      s.material.opacity = Math.min(1, k * 2);
      s.scale.setScalar(u.size * (0.5 + (1 - k) * 0.9));
    }
    return this.items.length > 0;
  }

  dispose() {
    for (const s of [...this.items, ...this.pool]) s.material.dispose();
    this.items.length = 0;
  }
}

const actors = new Set();
function purge() {
  for (const a of actors) if (!a.host.isConnected) a.dispose();
}

export class LiveActor {
  /**
   * @param {HTMLElement} host elemento che ospita il canvas (position relativa)
   * @param {THREE.Object3D} model
   * @param {{azimuth?:number, elev?:number, fov?:number, fill?:number, colors?:string[], idle?:number, pad?:number, lookY?:number}} opts
   */
  static mount(host, model, opts = {}) {
    if (!canLive() || !host?.isConnected) return null;
    purge();
    if (actors.size >= 2) [...actors][0].dispose(); // mai più di due canvas vivi
    try {
      const a = new LiveActor(host, model, opts);
      actors.add(a);
      return a;
    } catch {
      return null;
    }
  }

  constructor(host, model, { azimuth = 0.2, elev = 0.12, fov = 26, fill = 0.8, colors = ['#ffd23f', '#ffffff'], idle = 1, light = null } = {}) {
    this.host = host;
    this.model = model;
    this.colors = colors;
    this.idleAmt = idle;
    const canvas = document.createElement('canvas');
    canvas.className = 'live3d';
    canvas.setAttribute('aria-hidden', 'true');
    this.canvas = canvas;
    const r = setupRenderer(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }));
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1;
    r.setClearColor(0x000000, 0);
    this.renderer = r;
    const scene = new THREE.Scene();
    scene.environment = studioEnv(r);
    scene.environmentIntensity = 0.5;
    const { key, rim } = studioLights(scene, { shadows: true, intensity: 0.85 });
    key.shadow.mapSize.set(512, 512);
    this.key = key;
    this.rim = rim;
    if (light) {
      // luce colorata d'atmosfera dal basso (il colore del boss)
      const p = new THREE.PointLight(light, 6, 12);
      p.position.set(0, 0.4, 2.2);
      scene.add(p);
      this.mood = p;
      rim.color.set(light);
      rim.intensity = 2.2;
    }
    this.scene = scene;
    this.root = new THREE.Group(); // riceve le azioni (entrata, colpo…)
    this.body = new THREE.Group(); // riceve il respiro
    this.body.add(model);
    this.root.add(this.body);
    scene.add(this.root);
    // inquadratura sulle mesh del modello
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    model.traverse((o) => o.isMesh && !o.userData.noFrame && o.visible && box.expandByObject(o, false));
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.height = size.y;
    this.center = center;
    this.floor = box.min.y;
    const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 100);
    const radius = Math.max(size.x, size.y, size.z) * 0.5 * 1.08;
    const dist = radius / Math.tan(((fov / 2) * PI) / 180) / fill + Math.max(size.x, size.z) * 0.25;
    cam.position.set(center.x + Math.sin(azimuth) * Math.cos(elev) * dist, center.y + Math.sin(elev) * dist, center.z + Math.cos(azimuth) * Math.cos(elev) * dist);
    cam.lookAt(center);
    this.cam = cam;
    this.camBase = cam.position.clone();
    const catcher = shadowCatcher(14, 0.26);
    catcher.position.y = box.min.y - 0.002;
    scene.add(catcher);
    this.parts = [];
    model.traverse((o) => {
      if (o.userData.anim) {
        o.userData.base = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() };
        this.parts.push(o);
      }
    });
    this.fx = new Particles(scene);
    this.t = 0;
    this.last = 0;
    this.action = null;
    this.pose = { y: 0, x: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, op: 1 };
    this.energy = 0; // 0 calmo, 1 scatenato (parti più veloci)
    this.blinkAt = 1.5;
    this.shakeAmt = 0;
    this.dead = false;
    host.classList.add('has-live3d');
    host.append(canvas);
    this.#resize();
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.#resize()) : null;
    this.ro?.observe(host);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.dispose();
    });
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  #resize() {
    const w = this.host.clientWidth || 160;
    const h = this.host.clientHeight || w;
    this.renderer.setPixelRatio(DPR);
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  /** Posa di base (su cui si sommano respiro e azioni). */
  setRest(pose) {
    this.rest = { ...this.rest, ...pose };
  }

  /**
   * Azione a tempo. fn(k, pose, actor) con k 0..1; ritorna una promessa.
   * hold = la posa finale resta (sconfitta).
   */
  act(fn, dur = 1, { hold = false, loop = false } = {}) {
    return new Promise((resolve) => {
      this.action?.resolve();
      this.action = { fn, dur, k: 0, hold, loop, resolve, fired: new Set() };
      this.#wake();
    });
  }

  /** Esegue cb una sola volta quando l'azione supera il punto k. */
  at(k, id, cb) {
    const a = this.action;
    if (a && a.k >= k && !a.fired.has(id)) {
      a.fired.add(id);
      cb();
    }
  }

  burst(opts) {
    this.fx.emit({ at: [this.center.x, this.center.y, this.center.z + 0.3], colors: this.colors, ...opts });
    this.#wake();
  }

  shake(amt = 0.12) {
    this.shakeAmt = Math.max(this.shakeAmt, amt);
  }

  #wake() {
    if (!this.raf && !this.dead) this.raf = requestAnimationFrame(this.tick);
  }

  tick(now) {
    this.raf = 0;
    if (this.dead) return;
    if (!this.host.isConnected) return this.dispose();
    const busy = Boolean(this.action) || this.fx.items.length > 0 || this.shakeAmt > 0.001;
    // a riposo 30 fps
    if (!busy && now - this.last < 30) {
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    if (document.hidden || !this.host.offsetParent) {
      // nascosto: ricontrolla ogni tanto senza disegnare
      this.timer = setTimeout(() => this.#wake(), 400);
      return;
    }
    this.t += dt;
    const t = this.t;
    const P = this.pose;
    Object.assign(P, { y: 0, x: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, op: 1 }, this.rest);
    const a = this.action;
    if (a) {
      a.k = Math.min(1, a.k + dt / a.dur);
      a.fn(a.k, P, this);
      if (a.k >= 1) {
        if (a.loop) {
          a.k = 0;
          a.fired.clear();
        } else {
          if (a.hold) this.rest = { ...P };
          this.action = null;
          a.resolve();
        }
      }
    }
    this.energy = lerp(this.energy, a ? 1 : 0, Math.min(1, dt * 4));
    // respiro e dondolio
    const idle = this.idleAmt * (this.frozen ? 0 : 1);
    const br = Math.sin(t * 2.1) * 0.022 * idle;
    this.body.scale.set(1 - br * 0.6, 1 + br, 1 - br * 0.6);
    this.body.rotation.z = Math.sin(t * 1.3) * 0.022 * idle;
    this.body.rotation.y = Math.sin(t * 0.8) * 0.06 * idle;
    const r = this.root;
    r.position.set(P.x, P.y + (P.sy - 1) * 0, P.z);
    r.rotation.set(P.rx, P.ry, P.rz);
    // lo schiacciamento resta appoggiato a terra
    r.scale.set(P.sx, P.sy, P.sx);
    r.position.y += this.floor * (1 - P.sy);
    this.canvas.style.opacity = P.op >= 0.999 ? '' : String(P.op);
    // parti
    const sp = 1 + this.energy * 1.6;
    for (const o of this.parts) {
      const an = o.userData.anim;
      const b = o.userData.base;
      const ph = an.phase || 0;
      const speed = (an.speed || 1) * sp;
      const amp = an.amp ?? 0.3;
      const w = Math.sin(t * speed * 2 + ph);
      if (an.type === 'flap' || an.type === 'wag' || an.type === 'nod') {
        const ax = an.axis || (an.type === 'nod' ? 'x' : an.type === 'wag' ? 'y' : 'z');
        o.rotation[ax] = b.r[ax] + w * amp * (an.type === 'flap' ? 1 + this.energy * 0.6 : 1);
      } else if (an.type === 'bob') o.position.y = b.p.y + w * amp;
      else if (an.type === 'spin') o.rotation[an.axis || 'y'] = b.r[an.axis || 'y'] + t * speed;
      else if (an.type === 'pulse') o.scale.copy(b.s).multiplyScalar(1 + (w * 0.5 + 0.5) * amp * (1 + this.energy));
      else if (an.type === 'snap') {
        const k = Math.max(0, Math.sin(t * speed * 3 + ph)) ** 6;
        o.rotation[an.axis || 'z'] = b.r[an.axis || 'z'] + k * amp;
      } else if (an.type === 'blink') o.scale.y = b.s.y * (this.blinkK ?? 1);
    }
    // battito di ciglia
    this.blinkAt -= dt;
    if (this.blinkAt < 0) this.blinkAt = 2.2 + Math.random() * 2.5;
    this.blinkK = this.blinkAt < 0.12 ? 0.12 : 1;
    // tremolio della telecamera
    if (this.shakeAmt > 0.001) {
      this.cam.position.set(this.camBase.x + (Math.random() - 0.5) * this.shakeAmt, this.camBase.y + (Math.random() - 0.5) * this.shakeAmt, this.camBase.z);
      this.shakeAmt *= 0.86;
    } else this.cam.position.copy(this.camBase);
    this.fx.update(dt);
    this.onFrame?.(dt, t, this);
    this.renderer.render(this.scene, this.cam);
    if (!this.shown) {
      this.shown = true;
      this.host.classList.add('live3d-on');
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    this.ro?.disconnect();
    this.action?.resolve();
    this.fx.dispose();
    this.host.classList.remove('has-live3d', 'live3d-on');
    this.canvas.remove();
    // materiali e geometrie sono in cache condivisa: si libera solo il contesto
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    actors.delete(this);
  }
}

export { ease, lerp, hump, clamp01 };
