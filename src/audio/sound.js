import { VOICES, BASE_OF } from './voices.js';
import { lib, pick } from './library.js';

/**
 * Effetti sonori: campioni registrati (cartella audio/, vedi library.js) con
 * i suoni sintetizzati come riserva quando i file non ci sono.
 * L'AudioContext viene creato al primo tocco (requisito di iOS/Android).
 */
/** Volume generale dei campioni registrati (normalizzati a -1 dBFS). */
const SAMPLE_GAIN = 0.62;


class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.noise = null;
    /** voce dei dadi del vassoio visibile (skin): cambia lanci, atterraggi e "tieni" */
    this.voice = 'classic';
    /** sapore della skin delle carte (gratta e rivela) */
    this.cardVoice = 'silver';
    this.listeners = new Set();
  }

  /** Avvisa (es. la musica) quando l'audio è pronto. */
  onReady(fn) {
    this.listeners.add(fn);
    if (this.ctx) fn(this.ctx);
  }

  /** Da chiamare dentro un gesto dell'utente. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.comp = comp;
      // riverbero corto per gli effetti "ASMR" (risposta all'impulso generata)
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.#impulse(1.4, 3.2);
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.32;
      this.wet.connect(this.reverb).connect(this.master);
      // buffer di rumore bianco riutilizzabile
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      lib.init(this.ctx).then(() => {
        this.prepareVoice(this.voice);
      });
      this.listeners.forEach((fn) => fn(this.ctx));
    } catch {
      this.ctx = null;
    }
  }

  #impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
    }
    return buf;
  }

  /** Collega un nodo all'uscita con posizione stereo e un po' di riverbero. */
  out(node, { pan = 0, send = 0 } = {}) {
    let last = node;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      last = node.connect(p);
    }
    last.connect(this.master);
    if (send > 0) {
      const g = this.ctx.createGain();
      g.gain.value = send;
      last.connect(g).connect(this.wet);
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state !== 'closed';
  }

  /* ---------- campioni registrati ---------- */
  /** Suona un file già caricato; false se non è pronto (allora si usa il sintetizzato). */
  sample(path, { gain = 1, rate = 1, pan = 0, send = 0, delay = 0 } = {}) {
    if (!this.ready) return true; // audio spento: niente, nemmeno la riserva
    const buf = lib.buffer(path);
    if (!buf) return false;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain * SAMPLE_GAIN;
    src.connect(g);
    this.out(g, { pan, send });
    src.start(t);
    return true;
  }

  /** Effetto del gioco per chiave (una variante a caso). */
  fx(key, opts = {}) {
    if (!this.ready) return true;
    const def = lib.sfx(key);
    if (!def) return false;
    const file = pick(def.files);
    return this.sample(file, { ...opts, gain: (opts.gain ?? 1) * (def.gain ?? 1) });
  }

  /** Carica in anticipo i suoni di una skin dei dadi. */
  prepareVoice(voice) {
    if (lib.usable) lib.preload(lib.voiceFiles(voice, BASE_OF));
  }

  /** Carica in anticipo i suoni di una skin delle carte. */
  prepareCards(cv) {
    if (!lib.usable) return;
    const c = lib.cards();
    lib.preload([...(c.scratchFlavors?.[cv] || []), ...(c.revealFlavors?.[cv] || [])]);
  }

  /** Aspetta (poco) che i suoni di una skin siano pronti: per l'anteprima nell'armadio. */
  whenVoiceReady(voice, ms = 1200) {
    return lib.ready().then((ok) => (ok ? lib.ensure(lib.voiceFiles(voice, BASE_OF), ms) : false));
  }

  /**
   * Voce dei dadi registrata. kind: 'shake' | 'land' | 'hold'.
   * Ritorna false se la skin non ha campioni pronti.
   */
  sampleVoice(voice, kind, o = {}) {
    if (!lib.usable) return false;
    const d = lib.voice(voice, BASE_OF);
    if (!d) return false;
    const [lo, hi] = d.rate || [0.96, 1.04];
    const rate = lo + Math.random() * (hi - lo);
    const gain = d.gain ?? 1;
    if (kind === 'shake') {
      const file = pick(d.shake);
      if (!file) return false;
      const n = o.count ?? 5;
      const ok = this.sample(file, { gain: gain * (n >= 4 ? 0.95 : 0.75), rate, pan: (Math.random() - 0.5) * 0.3, send: 0.12 });
      if (ok && n >= 4 && d.shake.length > 1) this.sample(pick(d.shake), { gain: gain * 0.45, rate: rate * 1.04, pan: 0.35, delay: 0.09, send: 0.12 });
      return ok;
    }
    if (kind === 'land') {
      const k = o.k ?? 0;
      const file = d.notes && o.value ? d.notes[(o.value - 1) % d.notes.length] : pick(d.land);
      if (!file) return false;
      const ok = this.sample(file, { gain: gain * (k === 0 ? 1 : 0.78), rate: d.notes ? 1 : rate, pan: [-0.5, 0.5, -0.2, 0.25, 0][k % 5], delay: o.delay || 0, send: 0.18 });
      if (ok && k === 0 && d.extra) this.sample(pick(d.extra), { gain: gain * 0.9, delay: (o.delay || 0) + 0.05, send: 0.3 });
      return ok;
    }
    if (kind === 'hold') {
      const file = pick(d.hold);
      if (!file) return false;
      return this.sample(file, { gain: gain * 0.7, rate: o.on ? 1.08 : 0.9 });
    }
    return false;
  }

  /** Animazione di lancio registrata. */
  sampleStyle(style) {
    const d = lib.usable ? lib.style(style) : null;
    if (!d) return false;
    return this.sample(pick(d.files), { gain: d.gain ?? 1, send: 0.2 });
  }

  /** Carte: kind 'scratch' | 'reveal' | 'revealFlavor'. */
  sampleCard(kind, arg) {
    if (!lib.usable) return false;
    const c = lib.cards();
    if (kind === 'scratch') {
      const flavor = c.scratchFlavors?.[arg];
      const now = performance.now();
      if (now - (this.lastScratch || 0) < 70) return true; // grana del grattare, non una raffica
      this.lastScratch = now;
      const ok = this.sample(pick(c.scratch), { gain: 0.5, rate: 0.9 + Math.random() * 0.25, pan: (Math.random() - 0.5) * 0.4 });
      if (ok && flavor && Math.random() < 0.3) this.sample(pick(flavor), { gain: 0.35, send: 0.3 });
      return ok;
    }
    if (kind === 'reveal') return this.sample(pick(c.reveal?.[arg] || c.reveal?.common), { gain: 1, send: 0.25 });
    if (kind === 'revealFlavor') {
      const f = c.revealFlavors?.[arg];
      return f ? this.sample(pick(f), { gain: 0.8, send: 0.3 }) : false;
    }
    return false;
  }

  /* ---------- primitive ---------- */
  tone({ freq = 440, to = null, type = 'sine', dur = 0.15, gain = 0.3, delay = 0, attack = 0.005, pan = 0, send = 0, vibrato = 0 }) {
    attack = Math.min(attack, dur * 0.8);
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (vibrato) {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.02);
    }
    o.connect(g);
    this.out(g, { pan, send });
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  burst({ dur = 0.05, gain = 0.3, freq = 2500, q = 1.2, type = 'bandpass', delay = 0, sweepTo = null, pan = 0, send = 0, attack = 0 }) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    if (attack) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
    } else g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g);
    this.out(g, { pan, send });
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.02);
  }

  /* ---------- effetti del gioco ---------- */
  /** Rumore dei dadi agitati e lanciati (dipende dalla skin dei dadi). */
  roll(count = 5, duration = 0.9, voice = this.voice) {
    if (!this.ready) return;
    VOICES.shake(this, voice, count, duration);
  }

  /** Dado che si ferma sul tavolo: k = ordine di arrivo, value = faccia (dadi musicali). */
  land(delay = 0, value = null, k = 0, voice = this.voice) {
    if (!this.ready) return;
    VOICES.land(this, voice, { delay, value, k });
  }

  hold(on, voice = this.voice) {
    if (!this.ready) return;
    VOICES.hold(this, voice, on);
  }

  /** Tocco morbido: piccola bolla con un filo di riverbero. */
  tap() {
    if (this.fx('tap')) return;
    this.tone({ freq: 620, to: 880, type: 'sine', dur: 0.06, gain: 0.16, send: 0.15 });
    this.burst({ dur: 0.012, gain: 0.06, freq: 4200, q: 4 });
  }

  select() {
    if (this.fx('select')) return;
    this.tone({ freq: 660, to: 990, type: 'sine', dur: 0.09, gain: 0.2, send: 0.25 });
    this.tone({ freq: 1320, type: 'sine', dur: 0.16, gain: 0.06, delay: 0.05, send: 0.4 });
    this.burst({ dur: 0.01, gain: 0.05, freq: 5000, q: 5 });
  }

  denied() {
    if (this.fx('denied')) return;
    this.tone({ freq: 220, to: 160, type: 'square', dur: 0.12, gain: 0.08 });
  }

  /** Dado che entra nella casella (tono crescente). */
  plink(step = 0) {
    if (this.fx('plink', { rate: 2 ** (step / 12) })) return;
    const f = 520 * 2 ** (step / 8);
    this.tone({ freq: f, type: 'triangle', dur: 0.12, gain: 0.22 });
    this.tone({ freq: f * 2, type: 'sine', dur: 0.08, gain: 0.07 });
  }

  scored() {
    if (this.fx('scored')) return;
    [784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.22, gain: 0.2, delay: i * 0.07 }));
  }

  zero() {
    if (this.fx('zero')) return;
    this.tone({ freq: 200, to: 110, type: 'triangle', dur: 0.25, gain: 0.25 });
  }

  combo() {
    if (this.fx('combo')) return;
    [660, 880, 1320].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.14, gain: 0.14, delay: i * 0.06 }));
  }

  upperBonus() {
    if (this.fx('upperBonus')) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.25, gain: 0.2, delay: i * 0.08 }));
    this.tone({ freq: 1568, type: 'sine', dur: 0.5, gain: 0.08, delay: 0.32 });
  }

  yatzy() {
    if (this.fx('yatzy')) return;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.16, gain: 0.07, delay: i * 0.075 }));
    notes.forEach((f, i) => this.tone({ freq: f / 2, type: 'triangle', dur: 0.2, gain: 0.12, delay: i * 0.075 }));
    this.burst({ dur: 0.8, gain: 0.08, freq: 6000, type: 'highpass', q: 0.5, delay: 0.45 });
  }

  yatzyBonus() {
    if (this.fx('yatzyBonus')) return;
    const notes = [392, 523, 659, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.14, gain: 0.05, delay: i * 0.06 }));
    notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.22, gain: 0.14, delay: i * 0.06 }));
    [1047, 1319, 1568].forEach((f) => this.tone({ freq: f, type: 'sine', dur: 0.9, gain: 0.09, delay: 0.48 }));
    this.burst({ dur: 1.1, gain: 0.1, freq: 7000, type: 'highpass', q: 0.4, delay: 0.5 });
  }

  turn() {
    if (this.fx('turn')) return;
    this.burst({ dur: 0.55, gain: 0.16, freq: 400, sweepTo: 3200, q: 0.9 });
    this.tone({ freq: 330, to: 660, type: 'sine', dur: 0.4, gain: 0.08, delay: 0.1 });
  }

  win() {
    if (this.fx('win')) return;
    const seq = [523, 659, 784, 1047, 0, 784, 1047];
    seq.forEach((f, i) => f && this.tone({ freq: f, type: 'triangle', dur: 0.24, gain: 0.2, delay: i * 0.12 }));
    this.tone({ freq: 1568, type: 'sine', dur: 1.0, gain: 0.08, delay: 0.85 });
  }

  /** Vincita al casinò: cassa che suona, pioggia di monete, fanfara (più ricca se grande). */
  casinoWin(big = false) {
    if (this.fx(big ? 'casinoWinBig' : 'casinoWin') || (big && this.fx('casinoWin'))) return;
    this.burst({ dur: 0.05, gain: 0.25, freq: 2600, q: 3 });
    [1568, 2093].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.14, delay: 0.04 + i * 0.09, send: 0.3 }));
    for (let i = 0; i < (big ? 26 : 12); i++) this.tone({ freq: 1700 + Math.random() * 1500, type: 'triangle', dur: 0.09, gain: 0.06, delay: 0.25 + i * 0.045 + Math.random() * 0.02, pan: Math.random() * 1.4 - 0.7 });
    const fan = big ? [523, 659, 784, 1047, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
    fan.forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.14, gain: 0.05, delay: 0.3 + i * 0.09 }));
    fan.forEach((f, i) => this.tone({ freq: f / 2, type: 'triangle', dur: 0.2, gain: 0.1, delay: 0.3 + i * 0.09 }));
    if (big) {
      for (let i = 0; i < 16; i++) this.tone({ freq: i % 2 ? 1319 : 1760, type: 'sine', dur: 0.08, gain: 0.06, delay: 1.1 + i * 0.07, send: 0.4 });
      this.burst({ dur: 1.6, gain: 0.08, freq: 900, q: 0.4, delay: 1, attack: 0.3, send: 0.4 });
    }
  }

  /** Perdita al casinò: fiche spazzate via e un "uà-uà-uà-uààà" triste. */
  casinoLose() {
    if (this.fx('casinoLose')) return;
    this.burst({ dur: 0.35, gain: 0.1, freq: 3500, sweepTo: 900, q: 0.8 });
    [466, 440, 415, 392].forEach((f, i) => this.tone({ freq: f, to: i === 3 ? f * 0.94 : null, type: 'sawtooth', dur: i === 3 ? 0.9 : 0.3, gain: 0.05, delay: 0.25 + i * 0.32, vibrato: i === 3 ? 7 : 0 }));
    [233, 220, 207, 196].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: i === 3 ? 0.9 : 0.3, gain: 0.08, delay: 0.25 + i * 0.32 }));
  }

  lose() {
    if (this.fx('lose')) return;
    [392, 349, 311, 262].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.16, delay: i * 0.16 }));
  }

  /* ---------- carte potenziamento ---------- */
  /** Raschiata sullo strato argentato (con il sapore della skin delle carte). */
  scratch() {
    if (this.sampleCard('scratch', this.cardVoice)) return;
    this.burst({ dur: 0.06, gain: 0.12, freq: 5200 + Math.random() * 2500, q: 0.7, type: 'highpass' });
    VOICES.scratch(this, this.cardVoice);
  }

  /** Rivelazione della carta: più rara, più ricca. */
  reveal(rarity) {
    VOICES.revealFlavor(this, this.cardVoice);
    if (this.sampleCard('reveal', rarity)) return;
    if (rarity === 'absurd') {
      this.yatzyBonus();
      [130.8, 164.8, 196, 261.6].forEach((f, i) => this.tone({ freq: f, to: f * 2, type: 'sawtooth', dur: 1.2, gain: 0.05, delay: 0.1 + i * 0.05, send: 0.6 }));
      this.burst({ dur: 1.6, gain: 0.12, freq: 200, sweepTo: 9000, q: 0.6, send: 0.5 });
      return;
    }
    if (rarity === 'mythic') rarity = 'legendary';
    if (rarity === 'uncommon') rarity = 'rare';
    if (rarity === 'legendary') return this.yatzyBonus();
    if (rarity === 'epic') {
      [392, 494, 587, 784].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.16, delay: i * 0.07 }));
      this.tone({ freq: 98, to: 196, type: 'sawtooth', dur: 0.6, gain: 0.05 });
      this.burst({ dur: 0.7, gain: 0.08, freq: 600, sweepTo: 5000, q: 0.8, delay: 0.05 });
      return;
    }
    if (rarity === 'rare') {
      [659, 880, 1175].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.22, gain: 0.16, delay: i * 0.06 }));
      this.burst({ dur: 0.45, gain: 0.06, freq: 7000, type: 'highpass', q: 0.4, delay: 0.1 });
      return;
    }
    [784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.18, gain: 0.2, delay: i * 0.07 }));
  }

  /** Carta giocata. */
  cast(rarity = 'common') {
    if (this.fx(`cast.${rarity}`) || this.fx('cast.common')) return;
    const base = { common: 440, rare: 523, epic: 392, legendary: 523 }[rarity] || 440;
    this.burst({ dur: 0.35, gain: 0.12, freq: 500, sweepTo: 4000, q: 1 });
    this.tone({ freq: base, to: base * 2, type: 'triangle', dur: 0.3, gain: 0.14, delay: 0.05 });
  }

  shieldUp() {
    if (this.fx('shieldUp')) return;
    this.tone({ freq: 880, type: 'square', dur: 0.08, gain: 0.06 });
    this.tone({ freq: 1320, type: 'triangle', dur: 0.45, gain: 0.14, delay: 0.02 });
    this.tone({ freq: 1760, type: 'sine', dur: 0.6, gain: 0.06, delay: 0.05 });
  }

  steal() {
    if (this.fx('steal')) return;
    [1568, 2093, 1568, 2349].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.06, gain: 0.05, delay: i * 0.05 }));
    this.burst({ dur: 0.18, gain: 0.18, freq: 1200, sweepTo: 300, q: 1.2, delay: 0.02 });
  }

  blocked() {
    if (this.fx('blocked')) return;
    this.tone({ freq: 220, type: 'square', dur: 0.12, gain: 0.08 });
    this.tone({ freq: 1100, to: 700, type: 'triangle', dur: 0.4, gain: 0.16, delay: 0.03 });
    this.burst({ dur: 0.12, gain: 0.2, freq: 3000, q: 2 });
  }

  curse() {
    if (this.fx('curse')) return;
    [311, 294, 277, 262].forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.25, gain: 0.05, delay: i * 0.09 }));
    this.tone({ freq: 70, to: 45, type: 'sine', dur: 0.9, gain: 0.25 });
    this.burst({ dur: 0.8, gain: 0.08, freq: 300, sweepTo: 80, q: 2, type: 'lowpass' });
  }

  curseHit() {
    if (this.fx('curseHit')) return;
    this.tone({ freq: 110, to: 55, type: 'sawtooth', dur: 0.5, gain: 0.12 });
    this.burst({ dur: 0.5, gain: 0.2, freq: 900, sweepTo: 120, q: 1 });
    [466, 440, 415].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.14, gain: 0.05, delay: 0.1 + i * 0.1 }));
  }

  prison() {
    if (this.fx('prison')) return;
    [0, 0.09, 0.18].forEach((d) => {
      this.burst({ dur: 0.08, gain: 0.25, freq: 2400, q: 6, delay: d });
      this.tone({ freq: 160, type: 'square', dur: 0.06, gain: 0.08, delay: d });
    });
  }

  rewind() {
    if (this.fx('rewind')) return;
    this.burst({ dur: 0.7, gain: 0.14, freq: 4000, sweepTo: 300, q: 1.1 });
    [1047, 880, 784, 659, 523].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.12, gain: 0.12, delay: i * 0.08 }));
  }

  godHand() {
    if (this.fx('godHand')) return;
    [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 1.2, gain: 0.07, delay: i * 0.05, attack: 0.2 }));
    this.burst({ dur: 1.2, gain: 0.06, freq: 6000, type: 'highpass', q: 0.4, delay: 0.2 });
  }

  /* ---------- tradizioni della casa ---------- */
  /** Penna che scrive sul contratto. */
  scribble(duration = 0.9) {
    if (!this.ready) return;
    if (this.fx('scribble')) return;
    const n = 14;
    for (let i = 0; i < n; i++) {
      this.burst({ dur: 0.05 + Math.random() * 0.04, gain: 0.07, freq: 2500 + Math.random() * 2500, q: 2, delay: (i / n) * duration, sweepTo: 1800 });
    }
  }

  /** Timbro che sbatte sul foglio. */
  stamp() {
    if (this.fx('stamp')) return;
    this.tone({ freq: 120, to: 45, type: 'sine', dur: 0.25, gain: 0.45 });
    this.burst({ dur: 0.12, gain: 0.35, freq: 700, q: 0.8, type: 'lowpass' });
  }

  /** Jingle allegro del Dottore. */
  doctor() {
    if (this.fx('doctor')) return;
    const seq = [659, 784, 1047, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.16, gain: 0.16, delay: i * 0.09 }));
    this.tone({ freq: 1568, type: 'sine', dur: 0.6, gain: 0.07, delay: 0.55 });
  }

  /** Foglio strappato. */
  rip() {
    if (this.fx('rip')) return;
    this.burst({ dur: 0.5, gain: 0.3, freq: 1200, sweepTo: 6000, q: 0.7 });
    for (let i = 0; i < 8; i++) this.burst({ dur: 0.03, gain: 0.15, freq: 3000 + Math.random() * 3000, q: 4, delay: i * 0.05 });
  }

  /** Trombone triste ("wah wah wah waaah"). */
  sadTrombone() {
    if (this.fx('sadTrombone')) return;
    [[392, 370], [370, 349], [349, 330], [330, 262]].forEach(([a, b], i) =>
      this.tone({ freq: a, to: b, type: 'sawtooth', dur: i === 3 ? 0.9 : 0.32, gain: 0.07, delay: 0.25 + i * 0.36, attack: 0.04 }),
    );
  }

  /** Arrivo di Satana: accordo cupo e risata. */
  satan() {
    if (this.fx('satan')) return;
    this.tone({ freq: 55, to: 41, type: 'sawtooth', dur: 1.6, gain: 0.16, attack: 0.3 });
    this.tone({ freq: 58, to: 43, type: 'sawtooth', dur: 1.6, gain: 0.12, attack: 0.3 });
    this.tone({ freq: 82, to: 62, type: 'square', dur: 1.4, gain: 0.05, attack: 0.4 });
    [0.5, 0.68, 0.86, 1.04].forEach((d, i) => this.tone({ freq: 220 - i * 18, to: 150 - i * 12, type: 'sawtooth', dur: 0.14, gain: 0.1, delay: d }));
    this.burst({ dur: 1.4, gain: 0.12, freq: 400, sweepTo: 90, q: 1.5, type: 'lowpass' });
  }

  /** Luce celeste che scaccia il diavolo. */
  holy() {
    if (this.fx('holy')) return;
    [523, 659, 784, 1047].forEach((f) => this.tone({ freq: f, type: 'sine', dur: 1.6, gain: 0.08, attack: 0.25 }));
    [1319, 1568, 2093].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.07, delay: 0.3 + i * 0.12 }));
    this.burst({ dur: 1.2, gain: 0.08, freq: 8000, type: 'highpass', q: 0.4, delay: 0.1 });
  }

  /** Nuvola di fumo. */
  poof() {
    if (this.fx('poof')) return;
    this.burst({ dur: 0.45, gain: 0.3, freq: 1500, sweepTo: 200, q: 0.7, type: 'lowpass' });
  }

  crown() {
    if (this.fx('crown')) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.2, gain: 0.15, delay: i * 0.06 }));
  }

  /* ---------- effetti che esistono solo come campioni (con una riserva semplice) ---------- */
  coin(delay = 0) {
    if (this.fx('coin', { delay, rate: 0.95 + Math.random() * 0.12 })) return;
    this.tone({ freq: 2200 + Math.random() * 600, type: 'triangle', dur: 0.08, gain: 0.08, delay });
  }

  coins() {
    if (this.fx('coins')) return;
    for (let i = 0; i < 6; i++) this.coin(i * 0.06);
  }

  chips(delay = 0) {
    if (this.fx('chips', { delay })) return;
    this.burst({ dur: 0.04, gain: 0.18, freq: 3200, q: 3, delay });
  }

  cupShake() {
    if (this.fx('cupShake')) return;
    this.roll(5, 0.9);
  }

  cupSlam() {
    if (this.fx('cupSlam')) return;
    this.stamp();
  }

  chestShake() {
    if (this.fx('chestShake')) return;
    this.burst({ dur: 0.12, gain: 0.15, freq: 600, q: 1.2 });
  }

  chestOpen() {
    if (this.fx('chestOpen')) return;
    this.burst({ dur: 0.4, gain: 0.12, freq: 900, sweepTo: 2400, q: 1 });
  }

  whoosh() {
    if (this.fx('whoosh')) return;
    this.burst({ dur: 0.35, gain: 0.12, freq: 600, sweepTo: 3000, q: 0.8 });
  }

  /** Colpo d'orchestra dell'intro (scritta YATZY che esplode). */
  introHit() {
    return this.fx('introHit');
  }

  star(i = 0) {
    if (this.fx('star', { rate: 1 + i * 0.12, delay: 0 })) return;
    this.tone({ freq: 1047 * 2 ** (i / 6), type: 'triangle', dur: 0.3, gain: 0.14 });
  }

  levelUp() {
    if (this.fx('levelUp')) return;
    this.upperBonus();
  }

  buy() {
    if (this.fx('buy')) return;
    this.casinoWin(false);
  }

  unlockFx() {
    if (this.fx('unlock')) return;
    this.select();
  }

  pageOpen() {
    this.fx('pageOpen');
  }
}

export const sound = new SoundFX();
