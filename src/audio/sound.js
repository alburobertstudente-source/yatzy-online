/**
 * Effetti sonori sintetizzati con Web Audio (nessun file audio esterno).
 * L'AudioContext viene creato al primo tocco (requisito di iOS/Android).
 */

class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.noise = null;
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
      // buffer di rumore bianco riutilizzabile
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state !== 'closed';
  }

  /* ---------- primitive ---------- */
  tone({ freq = 440, to = null, type = 'sine', dur = 0.15, gain = 0.3, delay = 0, attack = 0.005 }) {
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
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  burst({ dur = 0.05, gain = 0.3, freq = 2500, q = 1.2, type = 'bandpass', delay = 0, sweepTo = null }) {
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
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.02);
  }

  /* ---------- effetti del gioco ---------- */
  /** Rumore dei dadi agitati e lanciati. */
  roll(count = 5, duration = 0.9) {
    if (!this.ready) return;
    const hits = 6 + count * 3;
    for (let i = 0; i < hits; i++) {
      const d = (i / hits) * duration * 0.7 + Math.random() * 0.04;
      this.burst({ dur: 0.025 + Math.random() * 0.02, gain: 0.12 + Math.random() * 0.12, freq: 1800 + Math.random() * 2600, q: 3, delay: d });
    }
  }

  /** Dado che si ferma sul tavolo. */
  land(delay = 0) {
    this.burst({ dur: 0.06, gain: 0.35, freq: 900 + Math.random() * 500, q: 2.5, delay });
    this.tone({ freq: 180 + Math.random() * 40, to: 90, type: 'triangle', dur: 0.08, gain: 0.18, delay });
  }

  hold(on) {
    this.tone({ freq: on ? 660 : 520, to: on ? 990 : 380, type: 'triangle', dur: 0.09, gain: 0.22 });
  }

  tap() {
    this.tone({ freq: 520, to: 700, type: 'sine', dur: 0.07, gain: 0.18 });
  }

  select() {
    this.tone({ freq: 600, to: 900, type: 'sine', dur: 0.1, gain: 0.25 });
    this.tone({ freq: 1200, type: 'sine', dur: 0.08, gain: 0.08, delay: 0.05 });
  }

  denied() {
    this.tone({ freq: 220, to: 160, type: 'square', dur: 0.12, gain: 0.08 });
  }

  /** Dado che entra nella casella (tono crescente). */
  plink(step = 0) {
    const f = 520 * 2 ** (step / 8);
    this.tone({ freq: f, type: 'triangle', dur: 0.12, gain: 0.22 });
    this.tone({ freq: f * 2, type: 'sine', dur: 0.08, gain: 0.07 });
  }

  scored() {
    [784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.22, gain: 0.2, delay: i * 0.07 }));
  }

  zero() {
    this.tone({ freq: 200, to: 110, type: 'triangle', dur: 0.25, gain: 0.25 });
  }

  combo() {
    [660, 880, 1320].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.14, gain: 0.14, delay: i * 0.06 }));
  }

  upperBonus() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.25, gain: 0.2, delay: i * 0.08 }));
    this.tone({ freq: 1568, type: 'sine', dur: 0.5, gain: 0.08, delay: 0.32 });
  }

  yatzy() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.16, gain: 0.07, delay: i * 0.075 }));
    notes.forEach((f, i) => this.tone({ freq: f / 2, type: 'triangle', dur: 0.2, gain: 0.12, delay: i * 0.075 }));
    this.burst({ dur: 0.8, gain: 0.08, freq: 6000, type: 'highpass', q: 0.5, delay: 0.45 });
  }

  yatzyBonus() {
    const notes = [392, 523, 659, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.14, gain: 0.05, delay: i * 0.06 }));
    notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.22, gain: 0.14, delay: i * 0.06 }));
    [1047, 1319, 1568].forEach((f) => this.tone({ freq: f, type: 'sine', dur: 0.9, gain: 0.09, delay: 0.48 }));
    this.burst({ dur: 1.1, gain: 0.1, freq: 7000, type: 'highpass', q: 0.4, delay: 0.5 });
  }

  turn() {
    this.burst({ dur: 0.55, gain: 0.16, freq: 400, sweepTo: 3200, q: 0.9 });
    this.tone({ freq: 330, to: 660, type: 'sine', dur: 0.4, gain: 0.08, delay: 0.1 });
  }

  win() {
    const seq = [523, 659, 784, 1047, 0, 784, 1047];
    seq.forEach((f, i) => f && this.tone({ freq: f, type: 'triangle', dur: 0.24, gain: 0.2, delay: i * 0.12 }));
    this.tone({ freq: 1568, type: 'sine', dur: 1.0, gain: 0.08, delay: 0.85 });
  }

  lose() {
    [392, 349, 311, 262].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.16, delay: i * 0.16 }));
  }

  /* ---------- carte potenziamento ---------- */
  /** Raschiata sullo strato argentato. */
  scratch() {
    this.burst({ dur: 0.06, gain: 0.12, freq: 5200 + Math.random() * 2500, q: 0.7, type: 'highpass' });
  }

  /** Rivelazione della carta: più rara, più ricca. */
  reveal(rarity) {
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
    const base = { common: 440, rare: 523, epic: 392, legendary: 523 }[rarity] || 440;
    this.burst({ dur: 0.35, gain: 0.12, freq: 500, sweepTo: 4000, q: 1 });
    this.tone({ freq: base, to: base * 2, type: 'triangle', dur: 0.3, gain: 0.14, delay: 0.05 });
  }

  shieldUp() {
    this.tone({ freq: 880, type: 'square', dur: 0.08, gain: 0.06 });
    this.tone({ freq: 1320, type: 'triangle', dur: 0.45, gain: 0.14, delay: 0.02 });
    this.tone({ freq: 1760, type: 'sine', dur: 0.6, gain: 0.06, delay: 0.05 });
  }

  steal() {
    [1568, 2093, 1568, 2349].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.06, gain: 0.05, delay: i * 0.05 }));
    this.burst({ dur: 0.18, gain: 0.18, freq: 1200, sweepTo: 300, q: 1.2, delay: 0.02 });
  }

  blocked() {
    this.tone({ freq: 220, type: 'square', dur: 0.12, gain: 0.08 });
    this.tone({ freq: 1100, to: 700, type: 'triangle', dur: 0.4, gain: 0.16, delay: 0.03 });
    this.burst({ dur: 0.12, gain: 0.2, freq: 3000, q: 2 });
  }

  curse() {
    [311, 294, 277, 262].forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.25, gain: 0.05, delay: i * 0.09 }));
    this.tone({ freq: 70, to: 45, type: 'sine', dur: 0.9, gain: 0.25 });
    this.burst({ dur: 0.8, gain: 0.08, freq: 300, sweepTo: 80, q: 2, type: 'lowpass' });
  }

  curseHit() {
    this.tone({ freq: 110, to: 55, type: 'sawtooth', dur: 0.5, gain: 0.12 });
    this.burst({ dur: 0.5, gain: 0.2, freq: 900, sweepTo: 120, q: 1 });
    [466, 440, 415].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.14, gain: 0.05, delay: 0.1 + i * 0.1 }));
  }

  prison() {
    [0, 0.09, 0.18].forEach((d) => {
      this.burst({ dur: 0.08, gain: 0.25, freq: 2400, q: 6, delay: d });
      this.tone({ freq: 160, type: 'square', dur: 0.06, gain: 0.08, delay: d });
    });
  }

  rewind() {
    this.burst({ dur: 0.7, gain: 0.14, freq: 4000, sweepTo: 300, q: 1.1 });
    [1047, 880, 784, 659, 523].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.12, gain: 0.12, delay: i * 0.08 }));
  }

  godHand() {
    [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 1.2, gain: 0.07, delay: i * 0.05, attack: 0.2 }));
    this.burst({ dur: 1.2, gain: 0.06, freq: 6000, type: 'highpass', q: 0.4, delay: 0.2 });
  }

  /* ---------- tradizioni della casa ---------- */
  /** Penna che scrive sul contratto. */
  scribble(duration = 0.9) {
    if (!this.ready) return;
    const n = 14;
    for (let i = 0; i < n; i++) {
      this.burst({ dur: 0.05 + Math.random() * 0.04, gain: 0.07, freq: 2500 + Math.random() * 2500, q: 2, delay: (i / n) * duration, sweepTo: 1800 });
    }
  }

  /** Timbro che sbatte sul foglio. */
  stamp() {
    this.tone({ freq: 120, to: 45, type: 'sine', dur: 0.25, gain: 0.45 });
    this.burst({ dur: 0.12, gain: 0.35, freq: 700, q: 0.8, type: 'lowpass' });
  }

  /** Jingle allegro del Dottore. */
  doctor() {
    const seq = [659, 784, 1047, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.16, gain: 0.16, delay: i * 0.09 }));
    this.tone({ freq: 1568, type: 'sine', dur: 0.6, gain: 0.07, delay: 0.55 });
  }

  /** Foglio strappato. */
  rip() {
    this.burst({ dur: 0.5, gain: 0.3, freq: 1200, sweepTo: 6000, q: 0.7 });
    for (let i = 0; i < 8; i++) this.burst({ dur: 0.03, gain: 0.15, freq: 3000 + Math.random() * 3000, q: 4, delay: i * 0.05 });
  }

  /** Trombone triste ("wah wah wah waaah"). */
  sadTrombone() {
    [[392, 370], [370, 349], [349, 330], [330, 262]].forEach(([a, b], i) =>
      this.tone({ freq: a, to: b, type: 'sawtooth', dur: i === 3 ? 0.9 : 0.32, gain: 0.07, delay: 0.25 + i * 0.36, attack: 0.04 }),
    );
  }

  /** Arrivo di Satana: accordo cupo e risata. */
  satan() {
    this.tone({ freq: 55, to: 41, type: 'sawtooth', dur: 1.6, gain: 0.16, attack: 0.3 });
    this.tone({ freq: 58, to: 43, type: 'sawtooth', dur: 1.6, gain: 0.12, attack: 0.3 });
    this.tone({ freq: 82, to: 62, type: 'square', dur: 1.4, gain: 0.05, attack: 0.4 });
    [0.5, 0.68, 0.86, 1.04].forEach((d, i) => this.tone({ freq: 220 - i * 18, to: 150 - i * 12, type: 'sawtooth', dur: 0.14, gain: 0.1, delay: d }));
    this.burst({ dur: 1.4, gain: 0.12, freq: 400, sweepTo: 90, q: 1.5, type: 'lowpass' });
  }

  /** Luce celeste che scaccia il diavolo. */
  holy() {
    [523, 659, 784, 1047].forEach((f) => this.tone({ freq: f, type: 'sine', dur: 1.6, gain: 0.08, attack: 0.25 }));
    [1319, 1568, 2093].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.07, delay: 0.3 + i * 0.12 }));
    this.burst({ dur: 1.2, gain: 0.08, freq: 8000, type: 'highpass', q: 0.4, delay: 0.1 });
  }

  /** Nuvola di fumo. */
  poof() {
    this.burst({ dur: 0.45, gain: 0.3, freq: 1500, sweepTo: 200, q: 0.7, type: 'lowpass' });
  }

  crown() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.2, gain: 0.15, delay: i * 0.06 }));
  }
}

export const sound = new SoundFX();
