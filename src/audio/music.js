/**
 * Musica di sottofondo generata dal vivo con Web Audio (nessun file audio):
 *   menu      lo-fi rilassante (piano elettrico, basso morbido, spazzole, fruscio del vinile)
 *   game      ambient tranquilla per giocare (pad, kalimba)
 *   campaign  allegra e leggera (marimba, shaker)
 *   boss      scontro: batteria, basso incalzante, accordi minori, crescendo ogni 8 battute
 *   casino    jazz da casinò: walking bass, spazzole, piano elettrico in swing
 * Più un sottofondo d'ambiente legato al tema del tavolo (onde, uccellini, grilli…).
 */
import { sound } from './sound.js';

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const TRACKS = {
  menu: {
    bpm: 76,
    swing: 0.14,
    gain: 0.7,
    chords: [
      { bass: 41, notes: [65, 69, 72, 76] },
      { bass: 40, notes: [64, 67, 71, 74] },
      { bass: 38, notes: [62, 65, 69, 72] },
      { bass: 36, notes: [60, 64, 67, 71] },
    ],
    step(m, t, s, bar, ch) {
      if (s === 0 || s === 10) m.ep(t, ch.notes, s === 0 ? 0.11 : 0.07, 1.6);
      if (s === 0 || s === 7 || s === 8) m.bass(t, ch.bass + (s === 7 ? 12 : 0), 0.32, s === 0 ? 0.9 : 0.3);
      if (s === 0 || s === 8 || (s === 11 && bar % 2)) m.kick(t, 0.33);
      if (s === 4 || s === 12) m.rim(t, 0.09);
      if (s % 2 === 0) m.hat(t, s % 4 === 2 ? 0.035 : 0.02);
      if ([2, 5, 9, 13, 14].includes(s) && Math.random() < 0.35) m.kalimba(t, pick(ch.notes) + 12 + pick([0, 2, 0]), 0.06);
      m.crackle(t);
    },
  },
  game: {
    bpm: 64,
    swing: 0,
    gain: 0.75,
    chords: [
      { bass: 36, notes: [60, 64, 67, 71, 74] },
      { bass: 33, notes: [57, 60, 64, 67, 71] },
      { bass: 41, notes: [53, 57, 60, 64, 67] },
      { bass: 43, notes: [55, 59, 62, 64, 69] },
    ],
    step(m, t, s, bar, ch) {
      if (s === 0) {
        m.pad(t, ch.notes.slice(0, 4), 0.045, (60 / 64) * 4 + 0.6);
        m.bass(t, ch.bass, 0.18, 2.6);
      }
      if ([0, 3, 6, 10, 13].includes(s) && Math.random() < 0.55) m.kalimba(t, ch.notes[Math.floor(rnd(1, ch.notes.length))] + 12, 0.055);
      if (s % 4 === 2 && Math.random() < 0.3) m.shaker(t, 0.015);
    },
  },
  campaign: {
    bpm: 98,
    swing: 0.08,
    gain: 0.8,
    chords: [
      { bass: 36, notes: [60, 64, 67, 72] },
      { bass: 43, notes: [59, 62, 67, 71] },
      { bass: 45, notes: [57, 60, 64, 69] },
      { bass: 41, notes: [57, 60, 65, 69] },
    ],
    step(m, t, s, bar, ch) {
      if (s % 2 === 0) m.marimba(t, ch.notes[(s / 2 + bar) % ch.notes.length] + (s >= 8 ? 12 : 0), 0.07);
      if (s === 0 || s === 6 || s === 8) m.bass(t, ch.bass, 0.26, 0.35);
      if (s === 0 || s === 8) m.kick(t, 0.25);
      if (s === 4 || s === 12) m.clap(t, 0.08);
      m.shaker(t, s % 2 ? 0.012 : 0.02);
      if (s === 0 && bar % 4 === 3) m.bell(t, ch.notes[3] + 12, 0.05);
    },
  },
  casino: {
    bpm: 112,
    swing: 0.33,
    gain: 0.8,
    chords: [
      { bass: 43, notes: [62, 65, 69, 72], walk: [43, 46, 50, 53] },
      { bass: 36, notes: [60, 64, 67, 70], walk: [36, 40, 43, 46] },
      { bass: 41, notes: [64, 65, 69, 72], walk: [41, 45, 48, 52] },
      { bass: 38, notes: [61, 66, 69, 72], walk: [38, 42, 45, 49] },
    ],
    step(m, t, s, bar, ch) {
      if (s % 4 === 0) m.bass(t, ch.walk[s / 4], 0.3, 0.32);
      if (s === 6 || s === 14 || (s === 3 && bar % 2)) m.ep(t, ch.notes, 0.06, 0.35);
      if (s % 4 === 0) m.hat(t, 0.03);
      if (s % 4 === 3) m.shaker(t, 0.025);
      if (s === 4 || s === 12) m.rim(t, 0.05);
      if (s === 0 && bar % 2 === 0) m.kick(t, 0.18);
      if ([0, 2, 5, 9, 10].includes(s) && bar % 4 >= 2 && Math.random() < 0.45) m.bell(t, ch.notes[Math.floor(Math.random() * 4)] + 12, 0.035);
    },
  },
  boss: {
    bpm: 128,
    swing: 0,
    gain: 0.85,
    chords: [
      { bass: 33, notes: [57, 60, 64] },
      { bass: 29, notes: [57, 60, 65] },
      { bass: 36, notes: [55, 60, 64] },
      { bass: 28, notes: [56, 59, 64] },
    ],
    step(m, t, s, bar, ch) {
      const phrase = bar % 8;
      if (s % 4 === 0) m.kick(t, 0.42);
      if (s === 4 || s === 12) m.snare(t, 0.16);
      if (s % 2 === 1) m.hat(t, 0.03);
      if (s % 2 === 0) m.sawBass(t, ch.bass + (s % 8 === 6 ? 12 : 0), s % 4 === 0 ? 0.22 : 0.15);
      if (s === 0 || s === 3 || s === 6 || (s === 10 && bar % 2)) m.stab(t, ch.notes, 0.05);
      if (s === 0) m.pad(t, ch.notes.map((n) => n - 12), 0.03, (60 / 128) * 4);
      if (phrase >= 4 && s % 2 === 0) m.lead(t, ch.notes[(s / 2) % ch.notes.length] + 12 + (s % 8 === 4 ? 7 : 0), 0.035);
      if (phrase === 7 && s === 0) m.riser(t, (60 / 128) * 4, 0.1);
      if (phrase === 0 && s === 0 && bar > 0) m.crash(t, 0.08);
    },
  },
};

/** Sottofondo d'ambiente dei temi del tavolo. */
const AMBIENT = {
  meadow: 'birds',
  sunset: 'birds',
  ocean: 'waves',
  candy: 'chimes',
  night: 'crickets',
  desert: 'wind',
  glacier: 'wind',
  volcano: 'rumble',
  space: 'shimmer',
  neoncity: 'hum',
  aurora: 'shimmer',
  heaven: 'harp',
};

class Music {
  constructor() {
    this.enabled = true;
    this.want = null;
    this.track = null;
    this.ambient = null;
    this.out = null;
    this.trackGain = null;
    this.timer = null;
    this.step = 0;
    this.bar = 0;
    this.next = 0;
    this.tempo = 1;
    sound.onReady(() => this.#start());
  }

  get ctx() {
    return sound.ctx;
  }

  #build() {
    if (this.out || !this.ctx) return Boolean(this.out);
    const ctx = this.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.enabled ? 1 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.gain.value = 0.2;
    this.out.connect(this.master).connect(comp).connect(ctx.destination);
    this.verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.6);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    this.verb.buffer = buf;
    this.verbIn = ctx.createGain();
    this.verbIn.gain.value = 0.35;
    this.verbIn.connect(this.verb).connect(this.out);
    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = 0.55;
    this.ambBus.connect(this.out);
    return true;
  }

  #start() {
    if (!this.#build()) return;
    if (this.want) this.play(this.want.name, this.want.opts);
    if (this.ambientWant) this.setAmbient(this.ambientWant);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.out) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(on ? 1 : 0, t, 0.25);
  }

  /**
   * Cambia brano con dissolvenza.
   * @param {'menu'|'game'|'campaign'|'boss'|null} name
   * @param {{intensity?:number}} [opts] boss: 0..1 (più veloce per i boss finali)
   */
  play(name, opts = {}) {
    this.want = name ? { name, opts } : null;
    if (!this.#build()) return;
    const key = name ? `${name}:${opts.intensity ?? ''}` : null;
    if (key === this.playingKey) return;
    this.playingKey = key;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.trackGain) {
      const old = this.trackGain;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0, t + 1.4);
      setTimeout(() => old.disconnect(), 2600);
    }
    this.trackGain = null;
    this.track = name ? TRACKS[name] : null;
    if (!this.track) {
      clearInterval(this.timer);
      this.timer = null;
      return;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(this.track.gain, t + 1.6);
    g.connect(this.out);
    this.trackGain = g;
    this.tempo = name === 'boss' ? 1 + (opts.intensity ?? 0) * 0.12 : 1;
    this.step = 0;
    this.bar = 0;
    this.next = t + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.#tick(), 30);
  }

  #tick() {
    const ctx = this.ctx;
    if (!ctx || !this.track || !this.trackGain) return;
    if (ctx.state !== 'running') {
      this.next = ctx.currentTime + 0.05;
      return;
    }
    const sixteenth = 60 / (this.track.bpm * this.tempo) / 4;
    while (this.next < ctx.currentTime + 0.14) {
      const swing = this.step % 2 ? this.track.swing * sixteenth : 0;
      const ch = this.track.chords[this.bar % this.track.chords.length];
      try {
        this.track.step(this, this.next + swing, this.step, this.bar, ch);
        this.#ambientStep(this.next);
      } catch {
        /* una nota persa non ferma la musica */
      }
      this.next += sixteenth;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }

  /* ---------------- strumenti ---------------- */
  #env(t, peak, attack, dur, to = this.trackGain) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(to);
    return g;
  }

  #osc(type, freq, t, dur, dest, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  #send(node, amount) {
    const g = this.ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(this.verbIn);
  }

  /** Piano elettrico morbido (FM leggera). */
  ep(t, notes, vel, dur) {
    for (const [i, m] of notes.entries()) {
      const tt = t + i * 0.012;
      const g = this.#env(tt, vel * 0.5, 0.012, dur);
      this.#send(g, 0.4);
      const f = midi(m);
      const car = this.#osc('sine', f, tt, dur, g);
      const mod = this.ctx.createOscillator();
      const mg = this.ctx.createGain();
      mod.frequency.value = f * 2;
      mg.gain.setValueAtTime(f * 1.2, tt);
      mg.gain.exponentialRampToValueAtTime(1, tt + 0.5);
      mod.connect(mg).connect(car.frequency);
      mod.start(tt);
      mod.stop(tt + dur);
    }
  }

  pad(t, notes, vel, dur) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + Math.min(1.2, dur * 0.4));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.trackGain);
    this.#send(g, 0.6);
    for (const m of notes) {
      this.#osc('sawtooth', midi(m), t, dur, f, -7);
      this.#osc('sawtooth', midi(m), t, dur, f, 7);
    }
  }

  bass(t, m, vel, dur) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    const g = this.#env(t, vel, 0.02, dur);
    f.connect(g);
    this.#osc('sine', midi(m), t, dur, f);
    this.#osc('triangle', midi(m), t, dur, f);
  }

  sawBass(t, m, vel) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(200, t + 0.18);
    f.Q.value = 6;
    const g = this.#env(t, vel, 0.005, 0.22);
    f.connect(g);
    this.#osc('sawtooth', midi(m), t, 0.22, f);
    this.#osc('square', midi(m - 12), t, 0.22, f);
  }

  kalimba(t, m, vel) {
    const g = this.#env(t, vel, 0.004, 1.1);
    this.#send(g, 0.6);
    this.#osc('sine', midi(m), t, 1.1, g);
    const g2 = this.#env(t, vel * 0.25, 0.002, 0.15);
    this.#osc('sine', midi(m) * 5.4, t, 0.15, g2);
  }

  marimba(t, m, vel) {
    const g = this.#env(t, vel, 0.003, 0.45);
    this.#send(g, 0.3);
    this.#osc('sine', midi(m), t, 0.45, g);
    const g2 = this.#env(t, vel * 0.3, 0.002, 0.05);
    this.#osc('sine', midi(m) * 4, t, 0.05, g2);
  }

  bell(t, m, vel) {
    const g = this.#env(t, vel, 0.003, 2);
    this.#send(g, 0.8);
    this.#osc('sine', midi(m), t, 2, g);
    this.#osc('sine', midi(m) * 2.76, t, 0.8, this.#env(t, vel * 0.3, 0.003, 0.8));
  }

  stab(t, notes, vel) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2800, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.2);
    const g = this.#env(t, vel, 0.004, 0.24);
    this.#send(g, 0.3);
    f.connect(g);
    for (const m of notes) this.#osc('sawtooth', midi(m), t, 0.24, f, rnd(-6, 6));
  }

  lead(t, m, vel) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    const g = this.#env(t, vel, 0.005, 0.16);
    this.#send(g, 0.4);
    f.connect(g);
    this.#osc('square', midi(m), t, 0.16, f);
  }

  #noise(t, dur, { type = 'highpass', freq = 7000, q = 0.7, vel = 0.05, attack = 0.001, to = this.trackGain, sweepTo = null } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = sound.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = this.#env(t, vel, attack, dur, to);
    src.connect(f).connect(g);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.05);
    return g;
  }

  kick(t, vel) {
    const g = this.#env(t, vel, 0.002, 0.3);
    const o = this.#osc('sine', 120, t, 0.3, g);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  }

  snare(t, vel) {
    this.#send(this.#noise(t, 0.18, { type: 'bandpass', freq: 1900, q: 0.8, vel }), 0.3);
    this.#osc('triangle', 190, t, 0.08, this.#env(t, vel * 0.6, 0.002, 0.08));
  }

  rim(t, vel) {
    this.#noise(t, 0.05, { type: 'bandpass', freq: 2600, q: 4, vel });
  }

  clap(t, vel) {
    [0, 0.012, 0.024].forEach((d) => this.#noise(t + d, 0.09, { type: 'bandpass', freq: 1400, q: 1, vel }));
  }

  hat(t, vel) {
    this.#noise(t, 0.045, { freq: 8000, vel });
  }

  shaker(t, vel) {
    this.#noise(t, 0.07, { type: 'bandpass', freq: 6500, q: 1, vel, attack: 0.02 });
  }

  crash(t, vel) {
    this.#send(this.#noise(t, 1.6, { freq: 5000, q: 0.4, vel }), 0.4);
  }

  riser(t, dur, vel) {
    this.#noise(t, dur, { type: 'bandpass', freq: 300, sweepTo: 6000, q: 1.5, vel, attack: dur * 0.9 });
  }

  /** Fruscio del vinile (lo-fi). */
  crackle(t) {
    if (Math.random() < 0.35) this.#noise(t + rnd(0, 0.1), 0.006, { type: 'highpass', freq: 3000, vel: rnd(0.01, 0.035) });
  }

  /* ---------------- ambiente del tavolo ---------------- */
  setAmbient(theme) {
    this.ambientWant = theme;
    const kind = AMBIENT[theme] || null;
    if (!this.#build()) return;
    if (kind === this.ambient) return;
    this.ambient = kind;
    // suoni continui (onde, vento, rombo, ronzio)
    if (this.ambNode) {
      const old = this.ambNode;
      old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      setTimeout(() => old.disconnect(), 2000);
      this.ambNode = null;
    }
    if (!kind || !['waves', 'wind', 'rumble', 'hum'].includes(kind)) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(1, ctx.currentTime, 1);
    g.connect(this.ambBus);
    this.ambNode = g;
    if (kind === 'hum') {
      [55, 110, 165].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const og = ctx.createGain();
        og.gain.value = 0.012 / (i + 1);
        o.connect(og).connect(g);
        o.start();
      });
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = sound.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'rumble' ? 'lowpass' : 'bandpass';
    f.frequency.value = { waves: 500, wind: 800, rumble: 90 }[kind];
    f.Q.value = kind === 'wind' ? 1.8 : 0.6;
    const vol = ctx.createGain();
    vol.gain.value = { waves: 0.05, wind: 0.035, rumble: 0.09 }[kind];
    // onda lenta del volume (le onde vanno e vengono)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = kind === 'waves' ? 0.12 : 0.07;
    const lg = ctx.createGain();
    lg.gain.value = vol.gain.value * 0.8;
    lfo.connect(lg).connect(vol.gain);
    src.connect(f).connect(vol).connect(g);
    src.start();
    lfo.start();
  }

  #ambientStep(t) {
    const k = this.ambient;
    if (!k || this.track !== TRACKS.game) return;
    const to = this.ambBus;
    if (k === 'birds' && Math.random() < 0.03) {
      const f = rnd(2400, 4200);
      for (let i = 0; i < 3; i++) this.#osc('sine', f, t + i * 0.09, 0.07, this.#env(t + i * 0.09, 0.02, 0.01, 0.07, to)).frequency.exponentialRampToValueAtTime(f * 1.3, t + i * 0.09 + 0.06);
    }
    if (k === 'crickets' && this.step % 4 === 0 && Math.random() < 0.6) {
      for (let i = 0; i < 4; i++) this.#osc('sine', 4600, t + i * 0.025, 0.015, this.#env(t + i * 0.025, 0.012, 0.002, 0.015, to));
    }
    if ((k === 'shimmer' || k === 'chimes') && Math.random() < 0.05) {
      const m = 84 + pick([0, 2, 4, 7, 9, 12]);
      this.#osc('sine', midi(m), t, 1.5, this.#env(t, 0.018, 0.005, 1.5, to));
    }
    if (k === 'harp' && this.step === 0 && this.bar % 2 === 0) {
      [72, 76, 79, 84, 88].forEach((m, i) => this.#osc('triangle', midi(m), t + i * 0.06, 1, this.#env(t + i * 0.06, 0.014, 0.003, 1, to)));
    }
  }
}

export const music = new Music();
