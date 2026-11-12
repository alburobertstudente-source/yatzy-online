/**
 * Vassoio dei dadi in 3D (three.js): i 5 dadi veri, con luci da studio,
 * riflessi, ombre morbide sul tavolo, lanci con rimbalzi, polvere e scintille.
 *
 * Il DOM resta quello di prima (slot, .die con data-value, classi is-held…):
 * la logica del gioco e i test continuano a usarlo; i .die diventano solo
 * trasparenti (si toccano ancora per tenerli) e sopra il vassoio c'è una tela
 * WebGL che disegna i dadi esattamente sugli slot.
 *
 * Si disegna solo quando serve (lanci, effetti, animazioni degli slot): da
 * fermo la tela resta com'è e non consuma batteria. Se WebGL non c'è (?no3d)
 * o il contesto si perde, tornano i dadi CSS di prima.
 */
import * as THREE from 'three';
import { has3D, setupRenderer, studioEnv, studioLights, shadowCatcher } from './core.js';
import * as Dice from './diceModel.js';
import { ms } from '../anim/animations.js';
import { buildMotion, throwStart } from './trayPaths.js';
import { Particles, contactShadow, holdGlow, vortexDisc, dust, landBurst, bigOverlay, trail, styleLand, yatzyBurst } from './trayFx.js';
import { ITEMS } from '../meta/catalog.js';

const UP = new THREE.Vector3(0, 1, 0);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (k) => k * k * (3 - 2 * k);
const ROUND = 0.17; // raggio degli spigoli arrotondati (in lati di dado, come in diceModel.js)

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();

/** Quanto sta in alto il centro di un dado appoggiato con questa rotazione. */
function support(q) {
  _m.makeRotationFromQuaternion(q);
  const e = _m.elements;
  return (0.5 - ROUND) * (Math.abs(e[1]) + Math.abs(e[5]) + Math.abs(e[9])) + ROUND;
}

function randomQuat() {
  const u = Math.random();
  const v = Math.random();
  const w = Math.random();
  return new THREE.Quaternion(Math.sqrt(1 - u) * Math.sin(2 * Math.PI * v), Math.sqrt(1 - u) * Math.cos(2 * Math.PI * v), Math.sqrt(u) * Math.sin(2 * Math.PI * w), Math.sqrt(u) * Math.cos(2 * Math.PI * w));
}

let cssDone = false;
function injectCss() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
.d3-on .die{opacity:0!important}
.d3-on .slot{perspective:none}
.d3-canvas{position:absolute;pointer-events:none;z-index:1;display:block;max-width:none}
.d3-on .hold-tag,.d3-on .fs-badge,.d3-on .nohold-tag{z-index:3}
.d3-on .slot.is-frozen::after{z-index:2}
.d3-on .lfx-big{z-index:4}`;
  document.head.append(st);
}

/**
 * WebGL senza scheda grafica (SwiftShader, llvmpipe…: browser senza GPU o in
 * prova automatica) disegna troppo lentamente: lì restano i dadi CSS.
 * Con ?force3d si usa comunque il 3D (per le prove).
 */
let softwareGL = null;
function isSoftwareGL(renderer) {
  if (softwareGL !== null) return softwareGL;
  softwareGL = false;
  try {
    if (new URLSearchParams(location.search).has('force3d')) return false;
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    softwareGL = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    /* se non si sa, si prova col 3D */
  }
  return softwareGL;
}

/** Tutti i vassoi 3D vivi (per liberare quelli tolti dalla pagina). */
const layers = new Set();
function purge() {
  for (const l of layers) if (!l.host.isConnected) l.dispose();
}

/** Calcola la posizione di un elemento dentro `host` (coordinate di layout, senza trasformazioni). */
function offsetIn(el, host) {
  let x = 0;
  let y = 0;
  let n = el;
  while (n && n !== host) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent;
  }
  if (n === host) return { x, y };
  const r = el.getBoundingClientRect();
  const hr = host.getBoundingClientRect();
  const s = hr.width / (host.offsetWidth || 1) || 1;
  return { x: (r.left - hr.left) / s, y: (r.top - hr.top) / s };
}

export class DiceLayer3D {
  /**
   * @param {HTMLElement} host contenitore degli slot (diventa il riferimento della tela)
   * @param {{el:HTMLElement, die:HTMLElement}[]} slots
   * @param {{top?:number, side?:number, bottom?:number, dieScale?:number, tilt?:number}} [opts]
   * @returns {DiceLayer3D|null}
   */
  static attach(host, slots, opts = {}) {
    if (!has3D() || softwareGL || !host?.isConnected || !host.offsetWidth || !host.offsetHeight) return null;
    purge();
    try {
      const l = new DiceLayer3D(host, slots, opts);
      if (isSoftwareGL(l.renderer)) {
        l.dispose();
        return null;
      }
      layers.add(l);
      return l;
    } catch {
      return null;
    }
  }

  constructor(host, slots, { top = 190, side = 16, bottom = 76, dieScale = 0.64, tilt = 22 } = {}) {
    injectCss();
    this.host = host;
    this.slots = slots;
    this.pad = { top, side, bottom };
    this.dieScale = dieScale;
    this.tilt = (tilt * Math.PI) / 180;
    this.alive = true;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'd3-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.prepend(this.canvas);
    this.renderer = setupRenderer(new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }));
    this.renderer.setClearColor(0x000000, 0);
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.dispose();
    });

    const scene = (this.scene = new THREE.Scene());
    scene.environment = studioEnv(this.renderer);
    scene.environmentIntensity = 0.9;
    const { key } = studioLights(scene, { shadows: true });
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });
    key.shadow.camera.updateProjectionMatrix();
    key.position.set(-3, 7, 4.5);
    this.flash = new THREE.PointLight('#fff2c4', 0, 14, 1.6);
    this.flash.position.set(0, 3, 1.5);
    scene.add(this.flash);

    this.camera = new THREE.PerspectiveCamera(24, 1, 0.3, 120);
    this.catcher = shadowCatcher(1, 0.34);
    this.catcher.position.y = 0.001;
    // bordi sfumati: l'ombra svanisce verso i lati invece di tagliarsi di netto
    this.catcher.material.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vEdgeUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdgeUv = uv;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vEdgeUv;')
        .replace('#include <fog_fragment>', 'gl_FragColor.a *= smoothstep(0.0, 0.16, vEdgeUv.x) * smoothstep(0.0, 0.16, 1.0 - vEdgeUv.x) * smoothstep(0.0, 0.2, vEdgeUv.y) * smoothstep(0.0, 0.2, 1.0 - vEdgeUv.y);\n#include <fog_fragment>');
    };
    scene.add(this.catcher);
    this.fx = new Particles(scene);
    this.discs = { portal: vortexDisc('#b98cff'), blackhole: vortexDisc('#1a0838', true) };
    scene.add(this.discs.portal, this.discs.blackhole);

    this.dice = slots.map((s, i) => {
      const holder = new THREE.Group();
      const shadow = contactShadow();
      const glow = holdGlow();
      scene.add(holder, shadow, glow);
      return { i, holder, obj: null, shadow, glow, visible: false, held: false, heldAmt: 0, value: Number(s.die.dataset.value) || 1, q: Dice.quatForValue(Number(s.die.dataset.value) || 1, rnd(-0.2, 0.2)), rest: new THREE.Vector3(), domScale: 1, anim: null, opacity: 1 };
    });

    this.style = 'classic';
    this.landFx = null;
    this.skin = null;
    this.raf = 0;
    this.last = 0;
    this.shake = 0;
    this.keepUntil = 0;
    this.domAnimUntil = 0;
    this.landCount = 0;
    this.raycaster = new THREE.Raycaster();
    this.#buildDice('dice.classic');
    this.layout();
    this.#warm();
    this.syncFromDom();
    host.classList.add('d3-on');

    this.ro = new ResizeObserver(() => {
      if (this.layout()) this.kick();
    });
    this.ro.observe(host);
    this.gone = 0;
    this.poll = setInterval(() => this.#poll(), 120);
  }

  /** Prepara in anticipo gli shader (dadi, particelle, anelli): niente scatti al primo lancio. */
  #warm() {
    const P = this.fx;
    const at = new THREE.Vector3(0, -5, 0);
    P.sprite('soft', { pos: at, life: 0.01 });
    P.sprite('soft', { pos: at, life: 0.01, additive: true });
    P.ring(at, { life: 0.01 });
    P.confetti(at, { life: 0.01 });
    P.coin(at, [0, 0, 0]);
    const done = () => {
      P.update(5);
      this.kick();
    };
    try {
      if (this.renderer.compileAsync) this.renderer.compileAsync(this.scene, this.camera).then(done, done);
      else {
        this.renderer.compile(this.scene, this.camera);
        done();
      }
    } catch {
      done();
    }
  }

  /* ---------------- impaginazione ---------------- */
  layout() {
    if (!this.alive) return false;
    const { host, pad } = this;
    const w = host.offsetWidth;
    const h = host.offsetHeight;
    if (!w || !h) return false;
    const W = w + pad.side * 2;
    const H = h + pad.top + pad.bottom;
    const cs = this.canvas.style;
    cs.left = `${-pad.side}px`;
    cs.top = `${-pad.top}px`;
    cs.width = `${W}px`;
    cs.height = `${H}px`;
    const stageScale = host.getBoundingClientRect().width / w || 1;
    const pr = Math.min(2, Math.max(1, (globalThis.devicePixelRatio || 1) * stageScale));
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(W, H, false);
    this.W = W;
    this.H = H;
    const s0 = this.slots[0].el;
    this.dpx = Math.min(s0.offsetWidth, s0.offsetHeight) * this.dieScale;
    const cam = this.camera;
    cam.aspect = W / H;
    cam.fov = 20;
    const D = H / 2 / Math.tan((cam.fov * Math.PI) / 360) / this.dpx;
    cam.position.set(0, D * Math.cos(this.tilt), D * Math.sin(this.tilt));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.camBase = cam.position.clone();
    this.#updateRest(false);
    // piano delle ombre grande quanto il vassoio
    const a = this.#toPlane(pad.side, pad.top, 0);
    const b = this.#toPlane(pad.side + w, pad.top + h, 0);
    if (a && b) {
      this.catcher.position.set((a.x + b.x) / 2, 0.001, (a.z + b.z) / 2);
      this.catcher.scale.set(Math.abs(b.x - a.x) + 1.6, Math.abs(b.z - a.z) + 1.4, 1);
      this.trayBox = { x0: Math.min(a.x, b.x) - 0.3, x1: Math.max(a.x, b.x) + 0.3, z0: Math.min(a.z, b.z) - 0.3, z1: Math.max(a.z, b.z) + 0.3 };
    }
    return true;
  }

  /** Punto del piano y=planeY che si vede nel pixel (px,py) della tela. */
  #toPlane(px, py, planeY) {
    const ndc = new THREE.Vector2((px / this.W) * 2 - 1, -((py / this.H) * 2 - 1));
    this.raycaster.setFromCamera(ndc, this.camera);
    const out = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(UP, -planeY), out) ? out : null;
  }

  /** Posizioni di riposo sui centri degli slot (con le eventuali animazioni CSS degli slot). */
  #updateRest(withDom) {
    this.slots.forEach((s, i) => {
      const o = offsetIn(s.el, this.host);
      let x = o.x + s.el.offsetWidth / 2;
      let y = o.y + s.el.offsetHeight / 2;
      let sc = 1;
      if (withDom) {
        const tf = getComputedStyle(s.el).transform;
        if (tf && tf !== 'none') {
          const m = new DOMMatrixReadOnly(tf);
          x += m.e;
          y += m.f;
          sc = Math.hypot(m.a, m.b) || 1;
        }
      }
      const p = this.#toPlane(x + this.pad.side, y + this.pad.top, 0.5);
      if (p) this.dice[i].rest.set(p.x, 0, p.z);
      this.dice[i].domScale = sc;
    });
  }

  /* ---------------- skin ---------------- */
  setSkin(diceId, rollStyle = 'classic') {
    this.style = rollStyle || 'classic';
    const it = ITEMS[diceId] && ITEMS[diceId].cat === 'dice' ? ITEMS[diceId] : ITEMS['dice.classic'];
    this.landFx = it.landFx || null;
    this.voice = it.voice;
    if (this.skin === it.id || this.pendingSkin === it.id) return;
    this.pendingSkin = it.id;
    Promise.resolve(Dice.preloadDice?.([it.id]))
      .catch(() => {})
      .then(() => {
        if (!this.alive || this.pendingSkin !== it.id) return;
        this.#buildDice(it.id);
        this.kick();
      });
  }

  #buildDice(id) {
    this.skin = id;
    this.pendingSkin = null;
    this.animatedSkin = false;
    for (const d of this.dice) {
      if (d.obj) {
        d.holder.remove(d.obj);
        d.obj.userData.dispose?.();
        d.clones?.forEach((m) => m.dispose());
        d.clones = null;
      }
      const obj = Dice.createDie(id, { size: 1 });
      obj.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      d.obj = obj;
      d.mats = null;
      d.opacity = 1;
      if (obj.userData.spec ? obj.userData.spec.fx : obj.userData.animated) this.animatedSkin = true;
      d.holder.add(obj);
    }
  }

  /** Materiali propri del dado (i dadi della stessa skin li condividono: per la trasparenza servono copie). */
  #ownMaterials(d) {
    if (d.mats) return d.mats;
    const others = new Set();
    for (const x of this.dice) if (x !== d && x.obj) x.obj.traverse((o) => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => others.add(m)));
    d.mats = [];
    d.obj.traverse((o) => {
      if (!o.material) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const own = list.map((m) => {
        if (!others.has(m)) return m;
        const c = m.clone();
        d.clones = d.clones || [];
        d.clones.push(c);
        return c;
      });
      o.material = Array.isArray(o.material) ? own : own[0];
      for (const m of own) d.mats.push({ m, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
    });
    return d.mats;
  }

  #setOpacity(d, k) {
    if (Math.abs(d.opacity - k) < 0.01) return;
    d.opacity = k;
    for (const e of this.#ownMaterials(d)) {
      e.m.transparent = k < 1 ? true : e.transparent;
      e.m.opacity = e.opacity * k;
      e.m.depthWrite = k < 1 ? k > 0.6 : e.depthWrite;
    }
  }

  /* ---------------- stato dal DOM ---------------- */
  /** Legge dagli slot cosa è visibile, tenuto e il valore (per tutto ciò che non è un lancio). */
  syncFromDom() {
    if (!this.alive) return;
    this.slots.forEach((s, i) => {
      const d = this.dice[i];
      const vis = !s.el.classList.contains('is-empty') && !s.el.classList.contains('is-out');
      d.held = s.el.classList.contains('is-held');
      if (d.anim) return;
      const v = Number(s.die.dataset.value) || 1;
      if (vis && (!d.visible || v !== d.value)) {
        d.value = v;
        d.q = Dice.quatForValue(v, rnd(-0.2, 0.2));
      }
      d.visible = vis;
    });
    this.kick();
  }

  /* ---------------- lancio ---------------- */
  /**
   * Lancia i dadi indicati: ognuno parte, rimbalza e si ferma sul valore deciso.
   * @param {number[]} values valori finali (tutti i 5)
   * @param {number[]} rolled indici dei dadi lanciati
   * @param {{entering?:boolean, timing:Record<number,{delay:number,duration:number}>, onLand?:(i:number)=>void}} o
   * @returns {Promise<void>} quando tutti sono fermi
   */
  roll(values, rolled, { entering = false, timing, onLand } = {}) {
    const now = performance.now();
    let end = 0;
    this.landCount = 0;
    this.styleThisRoll = this.style;
    for (const i of rolled) {
      const d = this.dice[i];
      const { delay = 0, duration = 950 } = timing?.[i] || {};
      const fresh = entering || !d.visible;
      this.#updateRest(false);
      const to = d.rest.clone();
      const from = fresh ? throwStart(to, this.style, i) : { x: d.holder.position.x, y: 0, z: d.holder.position.z };
      const motion = buildMotion(this.style, { entering: fresh, from, to });
      const qF = Dice.quatForValue(values[i], rnd(-0.22, 0.22));
      const dir = new THREE.Vector3(to.x - from.x, 0, to.z - from.z);
      if (dir.lengthSq() < 0.01) dir.set(rnd(-1, 1), 0, rnd(-0.4, 1));
      dir.normalize();
      const axis = new THREE.Vector3().crossVectors(dir, UP).normalize();
      const t0 = now + ms(delay);
      const dur = Math.max(1, ms(duration));
      d.anim = { kind: 'roll', motion, t0, dur, qF, q0: fresh ? randomQuat() : d.obj.quaternion.clone(), axis, fresh, fired: 0, k: -1, style: this.style };
      d.value = values[i];
      d.visible = true;
      setTimeout(() => onLand?.(i), Math.round(ms(delay) + dur * motion.firstContact));
      end = Math.max(end, ms(delay) + dur);
    }
    this.kick();
    return new Promise((resolve) =>
      setTimeout(() => {
        for (const i of rolled) {
          const d = this.dice[i];
          if (d.anim?.kind === 'roll' && !this.frozen) {
            d.q = d.anim.qF;
            d.anim = null;
          }
        }
        this.kick();
        this.#maybeYatzy();
        resolve();
      }, Math.round(end) + 20),
    );
  }

  /** Mostra subito un valore (senza lancio). */
  showValue(i, v) {
    const d = this.dice[i];
    d.anim = null;
    d.value = v;
    d.visible = true;
    d.q = Dice.quatForValue(v, rnd(-0.2, 0.2));
    this.kick();
  }

  /** Il dado gira di scatto su un altro valore (Mano degli Dei, anteprime). */
  flipTo(i, v) {
    const d = this.dice[i];
    if (!d.obj) return;
    const q0 = d.obj.quaternion.clone();
    d.value = v;
    d.visible = true;
    d.q = Dice.quatForValue(v, rnd(-0.2, 0.2));
    d.anim = { kind: 'flip', t0: performance.now(), dur: ms(260), q0, qF: d.q };
    this.kick();
  }

  /** Il dado sparisce (è volato nella tabella). */
  hide(i) {
    const d = this.dice[i];
    if (!d.visible) return;
    d.anim = { kind: 'out', t0: performance.now(), dur: ms(170) };
    this.kick();
  }

  /** I dadi rimasti scivolano via a fine turno. */
  clear(indices) {
    const now = performance.now();
    let end = 0;
    indices.forEach((i, k) => {
      const d = this.dice[i];
      if (!d.visible) return;
      d.anim = { kind: 'clear', t0: now + ms(k * 40), dur: ms(300), from: d.holder.position.clone(), q0: d.obj.quaternion.clone() };
      end = Math.max(end, ms(k * 40 + 300));
    });
    this.kick();
    return new Promise((r) => setTimeout(r, end + 16));
  }

  /** Festa quando i 5 dadi mostrano lo stesso numero. */
  #maybeYatzy() {
    if (this.dice.length !== 5 || !this.dice.every((d) => d.visible && !d.anim)) return;
    const v = this.dice[0].value;
    if (!this.dice.every((d) => d.value === v)) return;
    const now = performance.now();
    this.dice.forEach((d, k) => {
      d.anim = { kind: 'hop', t0: now + ms(k * 70), dur: ms(560), q0: d.q.clone(), k };
    });
    this.flashLevel = 1;
    this.kick();
  }

  /** Tieni il ridisegno attivo per un po' (es. animazioni CSS degli slot). */
  follow(msTime = 600) {
    this.domAnimUntil = Math.max(this.domAnimUntil, performance.now() + msTime);
    this.kick();
  }

  /* ---------------- ciclo di disegno ---------------- */
  kick() {
    if (!this.alive || this.raf || this.frozen) return;
    clearTimeout(this.idleTimer);
    this.raf = requestAnimationFrame((t) => this.#frame(t));
  }

  /** Solo per i test: ferma il tempo e disegna un fotogramma all'istante `now`. */
  debugFrame(now) {
    this.frozen = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.#frame(now);
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  #poll() {
    if (!this.host.isConnected) {
      if (++this.gone > 20) this.dispose();
      return;
    }
    this.gone = 0;
    if (this.slots.some((s) => s.el.getAnimations?.().length)) this.follow(220);
  }

  #visibleOnScreen() {
    if (document.hidden || !this.host.isConnected) return false;
    if (this.canvas.checkVisibility) return this.canvas.checkVisibility({ visibilityProperty: true, opacityProperty: true });
    return this.host.getClientRects().length > 0;
  }

  #frame(now) {
    this.raf = 0;
    if (!this.alive) return;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    let busy = false;
    if (now < this.domAnimUntil) {
      this.#updateRest(true);
      busy = true;
    }
    for (const d of this.dice) if (this.#updateDie(d, now, dt)) busy = true;
    this.fx.update(dt);
    if (this.fx.alive) busy = true;
    // lampo di luce (fulmine, Yatzy, effetti assurdi)
    if (this.fx.flash) {
      this.flashLevel = Math.max(this.flashLevel || 0, this.fx.flash);
      this.fx.flash = 0;
    }
    if (this.flashLevel > 0.01) {
      this.flash.intensity = this.flashLevel * 40;
      this.flashLevel *= Math.max(0, 1 - dt * 7);
      busy = true;
    } else this.flash.intensity = 0;
    // tremolio della telecamera negli impatti forti
    const cam = this.camera;
    if (this.shake > 0.002) {
      cam.position.set(this.camBase.x + rnd(-1, 1) * this.shake, this.camBase.y + rnd(-1, 1) * this.shake * 0.5, this.camBase.z + rnd(-1, 1) * this.shake);
      cam.lookAt(0, 0, 0);
      this.shake *= Math.max(0, 1 - dt * 12);
      busy = true;
    } else if (this.camBase && !cam.position.equals(this.camBase)) {
      cam.position.copy(this.camBase);
      cam.lookAt(0, 0, 0);
    }
    this.#discs(now);
    this.renderer.render(this.scene, cam);
    if (busy || now < this.keepUntil) this.kick();
    else {
      this.last = 0;
      if (this.animatedSkin && this.dice.some((d) => d.visible) && this.#visibleOnScreen()) this.idleTimer = setTimeout(() => this.kick(), 40);
    }
  }

  /** Dischi del portale e del buco nero sotto i dadi che li usano. */
  #discs(now) {
    for (const [name, disc] of Object.entries(this.discs)) {
      const users = this.dice.filter((d) => d.anim?.kind === 'roll' && d.anim.style === name && !d.anim.fresh);
      const fresh = this.dice.filter((d) => d.anim?.kind === 'roll' && d.anim.style === name);
      if (!fresh.length) {
        disc.material.opacity = 0;
        continue;
      }
      // un disco per il primo dado (abbastanza per l'effetto), sopra e poi sotto
      const d = (users[0] || fresh[0]);
      const t = (now - d.anim.t0) / d.anim.dur;
      const k = t < 0 ? 0 : t < 0.44 ? Math.sin((t / 0.44) * Math.PI) : 0;
      disc.position.set(d.rest.x, 0.02, d.rest.z);
      disc.rotation.z = now / (name === 'blackhole' ? 140 : 300);
      disc.scale.setScalar(0.6 + k * 0.9);
      disc.material.opacity = k * (name === 'blackhole' ? 0.95 : 0.9);
    }
  }

  /** Aggiorna un dado; true se sta ancora cambiando. */
  #updateDie(d, now, dt) {
    if (!d.obj) return false;
    let busy = false;
    const target = d.held && d.visible ? 1 : 0;
    if (Math.abs(target - d.heldAmt) > 0.002) {
      d.heldAmt += (target - d.heldAmt) * Math.min(1, dt * 14);
      busy = true;
    } else d.heldAmt = target;
    d.obj.userData.update?.(dt, now / 1000);

    const h = d.holder;
    let show = d.visible;
    let height = 0;
    let scale = d.domScale;
    let squash = 0;
    let op = 1;
    const a = d.anim;
    if (a) {
      busy = true;
      const t = (now - a.t0) / a.dur;
      if (a.kind === 'roll') {
        if (t < 0) {
          if (a.fresh) show = false;
          else {
            this.#restPose(d);
            d.obj.quaternion.copy(a.q0);
          }
        } else if (t >= 1) {
          d.q = a.qF;
          d.anim = null;
          this.#restPose(d);
        } else {
          const s = a.motion.sample(t);
          // rotazione: rotola attorno all'asse orizzontale e gira su sé stesso, poi si ferma sul valore
          _q.setFromAxisAngle(a.axis, a.motion.rollTurns * (1 - s.roll));
          _q2.setFromAxisAngle(UP, a.motion.yawTurns * (1 - s.yaw));
          const qp = _q2.multiply(_q).multiply(a.qF);
          const w = smooth(clamp01(t / 0.12));
          d.obj.quaternion.copy(a.q0).slerp(qp, w);
          // schiacciamento quando tocca il tavolo (molla smorzata)
          const sec = (t * a.dur) / 1000;
          for (const c of a.motion.contacts) {
            const dtc = sec - (c.t * a.dur) / 1000;
            if (dtc >= 0) squash += c.amp * Math.exp(-dtc / 0.05) * Math.cos(dtc * 46);
          }
          squash += s.squash || 0;
          scale *= s.scale;
          op = s.opacity;
          show = s.visible;
          height = s.y;
          const sup = support(d.obj.quaternion) * scale;
          h.position.set(s.x, height + sup * (1 - squash), s.z);
          this.#contacts(d, a, t);
          if (t < a.motion.firstContact + 0.05 && show) trail(this.fx, a.style, h.position, { k: d.i, t: now / 1000, dt });
        }
      } else if (a.kind === 'flip') {
        const k = clamp01(t);
        d.obj.quaternion.copy(a.q0).slerp(a.qF, smooth(k));
        h.position.set(d.rest.x, support(d.obj.quaternion) * scale + Math.sin(Math.PI * k) * 0.5, d.rest.z);
        height = Math.sin(Math.PI * k) * 0.5;
        if (t >= 1) d.anim = null;
      } else if (a.kind === 'out') {
        const k = clamp01(t);
        this.#restPose(d);
        scale *= 1 - smooth(k);
        h.position.y += k * 0.3;
        if (t >= 1) {
          d.anim = null;
          d.visible = false;
          show = false;
        }
      } else if (a.kind === 'clear') {
        const k = clamp01(t);
        if (t < 0) this.#restPose(d);
        else {
          _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), k * 1.2);
          d.obj.quaternion.copy(_q).multiply(a.q0);
          h.position.set(a.from.x, a.from.y * (1 - k) + 0.5 * (1 - k) * scale * 0, a.from.z + k * 0.6);
          scale *= 1 - k * k;
          if (t >= 1) {
            d.anim = null;
            d.visible = false;
            show = false;
          }
        }
      } else if (a.kind === 'hop') {
        if (t < 0) this.#restPose(d);
        else {
          const k = clamp01(t);
          _q.setFromAxisAngle(UP, smooth(k) * Math.PI * 2);
          d.obj.quaternion.copy(_q).multiply(a.q0);
          height = Math.sin(Math.PI * k) * 0.9;
          h.position.set(d.rest.x, support(d.obj.quaternion) + height, d.rest.z);
          if (!a.burst && k > 0.05) {
            a.burst = true;
            yatzyBurst(this.fx, d.rest);
          }
          if (t >= 1) {
            d.anim = null;
            this.#restPose(d);
          }
        }
      }
    } else this.#restPose(d);

    // dado tenuto: si alza un poco e brilla d'oro
    if (!a && d.heldAmt > 0) {
      h.position.y += d.heldAmt * 0.16;
      scale *= 1 + d.heldAmt * 0.05;
    }
    h.visible = show;
    h.scale.set(scale * (1 + squash * 0.5), scale * (1 - squash), scale * (1 + squash * 0.5));
    if (op < 1 || d.opacity < 1) this.#setOpacity(d, op);

    // ombra di contatto (più larga e chiara quando il dado è in alto)
    const sh = d.shadow;
    const up = Math.max(0, h.position.y - 0.5 * scale);
    sh.visible = show;
    sh.position.set(h.position.x, 0.004, h.position.z);
    sh.scale.setScalar((1.25 + up * 0.35) * scale);
    let inTray = 1;
    if (this.trayBox) {
      const b = this.trayBox;
      const out = Math.max(0, b.x0 - h.position.x, h.position.x - b.x1, b.z0 - h.position.z, h.position.z - b.z1);
      inTray = clamp01(1 - out * 1.5);
    }
    sh.material.opacity = 0.8 * clamp01(1 - up / 4) * op * inTray;

    const g = d.glow;
    g.position.set(d.rest.x, 0.006, d.rest.z);
    g.userData.ring.material.opacity = d.heldAmt * 0.95;
    g.userData.halo.material.opacity = d.heldAmt * 0.5;
    g.scale.setScalar(0.85 + d.heldAmt * 0.15);
    g.visible = d.heldAmt > 0.01 && show;
    return busy;
  }

  #restPose(d) {
    d.obj.quaternion.copy(d.q);
    d.holder.position.set(d.rest.x, support(d.q) * d.domScale, d.rest.z);
  }

  /** Rimbalzi: polvere, effetti della skin e dello stile, tremolio. */
  #contacts(d, a, t) {
    const list = a.motion.contacts;
    while (a.fired < list.length && list[a.fired].t <= t) {
      const c = list[a.fired];
      const at = d.holder.position;
      const strength = clamp01(c.amp / 0.2);
      if (a.fired === 0) {
        a.k = this.landCount++;
        dust(this.fx, at, 0.4 + strength * (a.fresh ? 1 : 0.6));
        if (this.landFx) {
          landBurst(this.fx, this.landFx, at, a.k);
          if (a.k === 0 && bigOverlay(this.host.closest('.tray') || this.host, this.landFx)) {
            this.shake = Math.max(this.shake, 0.22);
            this.#quake();
          }
        }
        styleLand(this.fx, a.style, at, strength);
        if (c.hard || (a.fresh && a.k === 0)) this.shake = Math.max(this.shake, c.hard ? 0.28 : 0.08);
      } else if (strength > 0.35) dust(this.fx, at, strength * 0.4);
      a.fired++;
    }
  }

  #quake() {
    const tray = this.host.closest('.tray');
    if (!tray) return;
    tray.classList.remove('is-quake');
    void tray.offsetWidth;
    tray.classList.add('is-quake');
    setTimeout(() => tray.classList.remove('is-quake'), 700);
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    layers.delete(this);
    cancelAnimationFrame(this.raf);
    clearTimeout(this.idleTimer);
    clearInterval(this.poll);
    this.ro?.disconnect();
    this.fx.clear();
    for (const d of this.dice) d.obj?.userData.dispose?.();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.canvas.remove();
    this.host.classList.remove('d3-on');
  }
}

/**
 * Dadi dell'intro: lancio 3D sopra la fila dei dadi; se il 3D non c'è usa il
 * lancio CSS. Dopo l'atterraggio la tela segue le animazioni CSS degli slot
 * (i dadi che si stringono prima dell'esplosione della scritta).
 * @returns {Promise<void>}
 */
export async function introRoll(row, dice, values, { diceId, onLand, fallback }) {
  const slots = dice.map((die) => ({ el: die.parentElement, die }));
  const layer = DiceLayer3D.attach(row, slots, { top: 170, side: 30, bottom: 60, dieScale: 0.86, tilt: 26 });
  if (!layer) return fallback();
  layer.setSkin(diceId, 'classic');
  values.forEach((v, i) => (dice[i].dataset.value = String(v)));
  const timing = {};
  values.forEach((_, i) => (timing[i] = { delay: i * 90, duration: 1100 }));
  await layer.roll(values, values.map((_, i) => i), { entering: true, timing, onLand });
  layer.follow(2600);
  setTimeout(() => layer.dispose(), ms(9000));
}
