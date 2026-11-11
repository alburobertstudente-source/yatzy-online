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
import { lib } from './library.js';

/** File WAV vuoto: serve a "sbloccare" i lettori audio dentro il primo tocco (iOS). */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
/** Volume della musica e degli ambienti registrati rispetto al resto. */
const STREAM_LEVEL = 1;

/** Lettore in streaming (musica o ambiente) con dissolvenza, collegato a Web Audio. */
class Stream {
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.loop = true;
    this.el.setAttribute('playsinline', '');
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    try {
      ctx.createMediaElementSource(this.el).connect(this.gain);
    } catch {
      /* lettore non collegabile: resterà muto */
    }
    this.gain.connect(dest);
    this.key = null;
    this.timer = null;
  }

  /** Dentro un gesto dell'utente: dopo, il lettore può partire da solo. */
  prime() {
    this.el.src = SILENT;
    const p = this.el.play();
    if (p && p.then) p.then(() => this.key || this.el.pause()).catch(() => {});
  }

  start(url, key, level, fade = 1.6) {
    clearTimeout(this.timer);
    this.key = key;
    this.level = level;
    if (!this.el.src.endsWith(url)) this.el.src = url;
    try {
      this.el.currentTime = 0;
    } catch {
      /* non ancora caricato */
    }
    const p = this.el.play();
    if (p && p.catch) p.catch(() => {});
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(level, t + fade);
  }

  stop(fade = 1.4) {
    if (!this.key) return;
    this.key = null;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(0, t + fade);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.key) this.el.pause();
    }, fade * 1000 + 200);
  }

  pause() {
    if (this.key) this.el.pause();
  }

  resume() {
    if (this.key && this.el.paused) {
      const p = this.el.play();
      if (p && p.catch) p.catch(() => {});
    }
  }
}

/** Ambienti: dal tipo di ambiente (mondo o tema del tavolo) al file registrato. */
const AMB_FILE = { tBirds: 'birds', tWaves: 'waves', tChimes: 'chimes', tCrickets: 'crickets', tWind: 'wind', tRumble: 'rumble', tShimmer: 'shimmer', tHum: 'hum', tHarp: 'harp' };

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
    gain: 0.62,
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


/* ------------------------------------------------------------------ */
/* Una canzone per ogni mondo della campagna, con i suoi rumori         */
/* ------------------------------------------------------------------ */
const ch = (bass, notes) => ({ bass, notes });
Object.assign(TRACKS, {
  // 1. Stagno: kalimba e marimba morbide, grilli, gocce, ranocchi
  w1: {
    bpm: 70, swing: 0.1, gain: 0.8, ambient: 'pond',
    chords: [ch(36, [60, 64, 67, 71, 74]), ch(33, [57, 60, 64, 67]), ch(41, [53, 57, 60, 64]), ch(43, [55, 59, 62, 64])],
    step(m, t, s, bar, c) {
      if (s === 0) m.pad(t, c.notes.slice(0, 4), 0.032, (60 / 70) * 4 + 0.5);
      if (s === 0 || s === 10) m.bass(t, c.bass, 0.15, 1.4);
      if ([0, 3, 6, 8, 11, 14].includes(s) && Math.random() < 0.7) m.kalimba(t, pick(c.notes) + 12, 0.06);
      if ((s === 4 || s === 12) && Math.random() < 0.4) m.marimba(t, pick(c.notes), 0.04);
    },
  },
  // 2. Spiaggia: ukulele, steel drum, shaker, onde e gabbiani
  w2: {
    bpm: 96, swing: 0.12, gain: 0.8, ambient: 'beach',
    chords: [ch(41, [57, 60, 65, 69]), ch(36, [55, 60, 64, 67]), ch(38, [57, 62, 65, 69]), ch(46, [58, 62, 65, 70])],
    step(m, t, s, bar, c) {
      if (s === 0 || s % 4 === 2) m.strum(t, c.notes, s === 0 ? 0.05 : 0.035);
      if ([0, 3, 6, 8, 11].includes(s) && Math.random() < 0.5) m.steel(t, pick([65, 67, 69, 72, 74, 77]), 0.06);
      if (s === 0 || s === 6 || s === 8) m.bass(t, c.bass, 0.2, 0.35);
      if (s === 0 || s === 8) m.kick(t, 0.16);
      if (s % 2 === 0) m.shaker(t, 0.018);
    },
  },
  // 3. Bosco nebbioso: arpa, flauto, pad misterioso, gufi e vento
  w3: {
    bpm: 66, swing: 0, gain: 0.8, ambient: 'forest',
    chords: [ch(38, [62, 65, 69, 72, 76]), ch(36, [60, 64, 67, 72]), ch(34, [58, 62, 65, 69]), ch(33, [57, 60, 64, 67])],
    step(m, t, s, bar, c) {
      if (s === 0) m.pad(t, c.notes.slice(0, 3).map((n) => n - 12), 0.035, (60 / 66) * 4 + 0.5);
      if (s % 2 === 0) m.pluck(t, c.notes[(s / 2) % c.notes.length] + 12, 0.045, 'harp');
      if ((s === 0 || s === 8) && Math.random() < 0.6) m.flute(t, pick([74, 76, 77, 79, 81]), 0.045, 1.3);
      if (s === 0) m.bass(t, c.bass, 0.14, 2.4);
    },
  },
  // 4. Ghiaccio: carillon, celesta, vento gelido e cristalli
  w4: {
    bpm: 76, swing: 0, gain: 0.75, ambient: 'ice',
    chords: [ch(45, [57, 60, 64, 69]), ch(41, [53, 57, 60, 65]), ch(48, [55, 60, 64, 67]), ch(40, [56, 59, 64, 68])],
    step(m, t, s, bar, c) {
      if (s % 2 === 0 && Math.random() < 0.6) m.musicbox(t, c.notes[(s / 2 + bar) % c.notes.length] + 24, 0.04);
      if (s === 4 || s === 12) m.musicbox(t, pick(c.notes) + 12, 0.03);
      if (s === 0) m.pad(t, c.notes.slice(0, 3), 0.03, (60 / 76) * 4 + 0.4);
      if (s === 0) m.bass(t, c.bass, 0.12, 2);
    },
  },
  // 5. Mari del pirata: canzone marinaresca con fisarmonica, onde e scricchiolii
  w5: {
    bpm: 112, swing: 0.18, gain: 0.8, ambient: 'sea',
    chords: [ch(38, [62, 65, 69]), ch(36, [60, 64, 67]), ch(34, [58, 62, 65]), ch(33, [61, 64, 69])],
    step(m, t, s, bar, c) {
      if (s === 0 || s === 8) m.bass(t, c.bass, 0.24, 0.4);
      if (s === 4 || s === 12) m.accordion(t, c.notes, 0.04, 0.3);
      if (s % 2 === 0 && Math.random() < 0.65) {
        m.melo = Math.max(62, Math.min(77, (m.melo || 69) + pick([-2, -1, 1, 2, 0])));
        m.accordion(t, [m.melo + (([62, 64, 65, 67, 69, 70, 72, 74, 76, 77].includes(m.melo) ? 0 : 1))], 0.045, 0.22);
      }
      if (s === 0 || s === 8) m.kick(t, 0.2);
      if (s === 4 || s === 12) m.clap(t, 0.05);
      if (s % 4 === 2) m.shaker(t, 0.025);
    },
  },
  // 6. Deserto del drago: liuto, tamburo a cornice, bordone, vento
  w6: {
    bpm: 88, swing: 0.08, gain: 0.8, ambient: 'desert',
    chords: [ch(40, [52, 59, 64]), ch(41, [53, 60, 65]), ch(40, [52, 59, 64]), ch(38, [50, 57, 62])],
    step(m, t, s, bar, c) {
      if (s === 0) m.pad(t, [c.bass + 12, c.bass + 19], 0.035, (60 / 88) * 4 + 0.3);
      if ([0, 2, 3, 6, 8, 10, 11, 14].includes(s) && Math.random() < 0.7) {
        const scale = [64, 65, 68, 69, 71, 72, 74, 76];
        m.mel = Math.max(0, Math.min(scale.length - 1, (m.mel ?? 3) + pick([-1, 1, 1, -2, 0])));
        m.pluck(t, scale[m.mel], 0.055, 'oud');
      }
      if (s === 0 || s === 6 || s === 8) m.tom(t, 70, 0.3);
      if ([3, 4, 11, 12, 14].includes(s)) m.rim(t, 0.05);
    },
  },
  // 7. Torre del caos: arpeggi elettronici, sub basso, scintille
  w7: {
    bpm: 104, swing: 0, gain: 0.75, ambient: 'chaos',
    chords: [ch(36, [60, 64, 66, 71]), ch(38, [62, 66, 68, 72]), ch(39, [63, 67, 70, 74]), ch(35, [59, 63, 66, 69])],
    step(m, t, s, bar, c) {
      m.lead(t, c.notes[s % c.notes.length] + 12 + (s >= 8 ? 12 : 0), 0.025);
      if (s === 0 || s === 8) m.sawBass(t, c.bass, 0.14);
      if (s % 2 === 1) m.hat(t, 0.018);
      if (s === 0) m.pad(t, c.notes, 0.025, (60 / 104) * 4);
      if (Math.random() < 0.06) m.bell(t, pick(c.notes) + 24, 0.02);
    },
  },
  // 8. Castello oscuro: organo, clavicembalo, campana, corvi
  w8: {
    bpm: 64, swing: 0, gain: 0.8, ambient: 'castle',
    chords: [ch(38, [62, 65, 69]), ch(43, [62, 67, 70]), ch(45, [61, 64, 67]), ch(38, [62, 65, 69])],
    step(m, t, s, bar, c) {
      if (s === 0) m.organ(t, c.notes, 0.035, (60 / 64) * 4);
      if (s === 0) m.bass(t, c.bass, 0.16, 3);
      if (s % 2 === 0 && Math.random() < 0.7) m.harpsi(t, c.notes[(s / 2) % c.notes.length] + 12, 0.04);
      if (s === 0 && bar % 4 === 0) m.bell(t, 50, 0.06);
    },
  },
  // 9. Cieli in tempesta: archi tremolo, timpani, pioggia e tuoni
  w9: {
    bpm: 120, swing: 0, gain: 0.8, ambient: 'sky',
    chords: [ch(40, [64, 67, 71]), ch(36, [60, 64, 67]), ch(38, [62, 66, 69]), ch(35, [63, 66, 71])],
    step(m, t, s, bar, c) {
      if (s === 0) m.strings(t, c.notes, 0.035, (60 / 120) * 4);
      if (s % 2 === 0) m.sawBass(t, c.bass + (s % 8 === 4 ? 12 : 0), 0.1);
      if (s === 0 || s === 8) m.tom(t, 55, 0.4);
      if (bar % 4 === 3 && s >= 12) m.snare(t, 0.05);
      if (bar % 4 === 0 && s === 0 && bar) m.crash(t, 0.06);
    },
  },
  // 10. Trono dei dadi: fanfara di ottoni, timpani, clavicembalo, campanelli
  w10: {
    bpm: 92, swing: 0, gain: 0.8, ambient: 'throne',
    chords: [ch(38, [62, 66, 69, 74]), ch(43, [62, 67, 71, 74]), ch(45, [61, 64, 69, 73]), ch(38, [62, 66, 69, 74])],
    step(m, t, s, bar, c) {
      if (bar % 2 === 0 && [0, 3, 6].includes(s)) m.brass(t, c.notes, 0.04, 0.22);
      if (s === 8) m.brass(t, c.notes, 0.035, 0.8);
      if (s === 0 || s === 12) m.tom(t, 50, 0.38);
      if (s % 2 === 1) m.harpsi(t, c.notes[((s - 1) / 2) % c.notes.length] + 12, 0.03);
      if (s === 4 || s === 12) m.snare(t, 0.035);
      if (s === 0 && bar % 4 === 3) m.bell(t, c.notes[3] + 12, 0.04);
    },
  },
});
TRACKS.casino.ambient = 'casino';

/** Sigla dell'intro: rullo di tamburi mentre rotolano i dadi, poi un tema allegro. */
const MOTIF = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 79, 77, 76, 74];
TRACKS.intro = {
  bpm: 118,
  swing: 0,
  gain: 0.85,
  chords: [ch(36, [60, 64, 67, 72]), ch(33, [57, 60, 64, 69]), ch(41, [57, 60, 65, 69]), ch(43, [59, 62, 67, 71])],
  step(m, t, s, bar, c) {
    if (bar < 1) {
      // rullo che cresce mentre i dadi entrano
      m.snare(t, 0.05 + (s / 16) * 0.13);
      if (s === 0) m.riser(t, (60 / 118) * 4, 0.08);
      return;
    }
    if (s % 2 === 0) m.marimba(t, MOTIF[(s / 2 + (bar % 2) * 8) % 16], 0.065);
    if (s === 0 || s === 8) m.bass(t, c.bass, 0.24, 0.5);
    if (s === 0 || s === 8) m.kick(t, 0.26);
    if (s === 4 || s === 12) m.clap(t, 0.07);
    m.shaker(t, s % 2 ? 0.012 : 0.022);
    if (s === 0) m.pad(t, c.notes, 0.03, (60 / 118) * 4);
    if (s === 0 && bar % 4 === 1) m.bell(t, c.notes[3] + 12, 0.045);
  },
};

/** Sottofondo d'ambiente dei temi del tavolo. */
const AMBIENT = {
  meadow: 'tBirds',
  sunset: 'tBirds',
  ocean: 'tWaves',
  candy: 'tChimes',
  night: 'tCrickets',
  desert: 'tWind',
  glacier: 'tWind',
  volcano: 'tRumble',
  space: 'tShimmer',
  neoncity: 'tHum',
  aurora: 'tShimmer',
  heaven: 'tHarp',
};

/** Ambienti: un fondo continuo (bed) e piccoli eventi casuali. */
const AMB = {
  pond: { bed: 'stream', events: ['crickets', 'drops', 'frog'] },
  beach: { bed: 'waves', events: ['gulls'] },
  forest: { bed: 'wind', events: ['owl', 'crickets'] },
  ice: { bed: 'wind', events: ['tinkle'] },
  sea: { bed: 'waves', events: ['creak', 'gulls'] },
  desert: { bed: 'wind', events: [] },
  chaos: { bed: 'hum', events: ['shimmer', 'whoosh'] },
  castle: { bed: 'wind', events: ['crow', 'crickets'] },
  sky: { bed: 'rain', events: ['thunder'] },
  throne: { bed: null, events: ['harp', 'chimes'] },
  casino: { bed: 'crowd', events: ['chips', 'slots'] },
  tBirds: { bed: null, events: ['birds'] },
  tWaves: { bed: 'waves', events: [] },
  tChimes: { bed: null, events: ['chimes'] },
  tCrickets: { bed: null, events: ['crickets'] },
  tWind: { bed: 'wind', events: [] },
  tRumble: { bed: 'rumble', events: [] },
  tShimmer: { bed: null, events: ['shimmer'] },
  tHum: { bed: 'hum', events: [] },
  tHarp: { bed: null, events: ['harp'] },
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
    this.ambBus.gain.value = 1.1;
    this.ambBus.connect(this.out);
    return true;
  }

  #start() {
    if (!this.#build()) return;
    this.#streams();
    if (this.want) this.play(this.want.name, this.want.opts);
    if (this.ambientWant) this.setAmbient(this.ambientWant);
  }

  setEnabled(on) {
    this.enabled = on;
    for (const st of this.streams || []) (on ? st.resume() : st.pause());
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
    const key = name ? `${name}:${opts.intensity ?? opts.world ?? ''}` : null;
    if (key === this.playingKey) return;
    this.playingKey = key;
    if (lib.state === 'idle' || lib.state === 'loading') {
      // aspetta di sapere se ci sono i brani registrati
      lib.ready().then(() => {
        if (this.playingKey !== key) return;
        this.playingKey = null;
        this.play(name, opts);
      });
      return;
    }
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const fileKey = !name ? null : name === 'world' ? `w${opts.world || 1}` : name === 'boss' && (opts.intensity ?? 0) >= 0.7 && lib.music('bossFinal') ? 'bossFinal' : name;
    const file = fileKey ? lib.music(fileKey) : null;
    // brano registrato: dissolvenza fra i due lettori
    const [a, b] = this.#streams();
    const cur = a.key ? a : b.key ? b : null;
    if (file && this.streams) {
      if (cur?.key !== fileKey) {
        cur?.stop(1.4);
        const next = cur === a ? b : a;
        next.start(lib.url(file.file), fileKey, (file.gain ?? 1) * STREAM_LEVEL, cur ? 1.8 : 1.2);
      }
    } else cur?.stop(1.4);
    if (this.trackGain) {
      const old = this.trackGain;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0, t + 1.4);
      setTimeout(() => old.disconnect(), 2600);
    }
    this.trackGain = null;
    this.track = name ? TRACKS[name === 'world' ? `w${opts.world || 1}` : name] : null;
    this.fileMode = Boolean(file && this.streams);
    this.#refreshBed();
    if (!this.track || this.fileMode) {
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

  /** Colpo d'orchestra (piatto, accordo di ottoni, cassa): quando esplode la scritta YATZY. */
  hit() {
    if (sound.introHit()) return;
    if (!this.out || !this.trackGain) return;
    const t = this.ctx.currentTime + 0.01;
    this.crash(t, 0.12);
    this.kick(t, 0.5);
    this.brass(t, [60, 64, 67, 72, 76], 0.06, 0.9);
    this.bell(t, 84, 0.06);
    // il tema parte subito dopo il colpo
    if (this.track === TRACKS.intro && this.bar < 1) {
      this.bar = 1;
      this.step = 0;
      this.next = t + 0.45;
    }
  }

  /* ---------------- ambienti ---------------- */
  /** Tema del tavolo: vale solo durante le partite (brano "game"). */
  /** Quattro lettori (due per la musica, due per gli ambienti), creati al primo tocco. */
  #streams() {
    if (!this.streams && this.ctx && typeof Audio !== 'undefined') {
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 1;
      this.musicBus.connect(this.out);
      this.streams = [new Stream(this.ctx, this.musicBus), new Stream(this.ctx, this.musicBus), new Stream(this.ctx, this.ambBus), new Stream(this.ctx, this.ambBus)];
      this.streams.forEach((st) => st.prime());
      document.addEventListener('visibilitychange', () => {
        for (const st of this.streams) (document.hidden || !this.enabled ? st.pause() : st.resume());
      });
    }
    return this.streams || [{}, {}];
  }

  /** Ambiente registrato in loop; false se manca il file (allora quello sintetizzato). */
  #fileAmbience(kind) {
    if (!this.streams) return false;
    const [, , a, b] = this.streams;
    const ak = kind ? AMB_FILE[kind] || kind : null;
    const file = ak && lib.usable ? lib.amb(ak) : null;
    const cur = a.key ? a : b.key ? b : null;
    if (!file) {
      cur?.stop(1.5);
      return false;
    }
    if (cur?.key === ak) return true;
    cur?.stop(1.5);
    (cur === a ? b : a).start(lib.url(file.file), ak, file.gain ?? 1, 2.2);
    return true;
  }

  setAmbient(theme) {
    this.ambientWant = theme;
    this.tableAmbient = AMBIENT[theme] || null;
    if (this.#build()) this.#refreshBed();
  }

  get ambientKind() {
    return this.track?.ambient ?? (this.track === TRACKS.game ? this.tableAmbient : null);
  }

  #refreshBed() {
    if (!this.out) return;
    const kind = this.ambientKind;
    if (kind === this.ambient) return;
    this.ambient = kind;
    const recorded = this.#fileAmbience(kind);
    this.recordedAmb = recorded;
    const bed = recorded ? null : AMB[kind]?.bed || null;
    if (bed === this.bedKind) return;
    this.bedKind = bed;
    if (this.ambNode) {
      const old = this.ambNode;
      old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      setTimeout(() => old.disconnect(), 2500);
      this.ambNode = null;
    }
    if (!bed) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    g.connect(this.ambBus);
    this.ambNode = g;
    if (bed === 'hum') {
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
    const layer = (type, freq, q, vol, lfoRate, depth = 0.8) => {
      const src = ctx.createBufferSource();
      src.buffer = sound.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const v = ctx.createGain();
      v.gain.value = vol;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoRate;
      const lg = ctx.createGain();
      lg.gain.value = vol * depth;
      lfo.connect(lg).connect(v.gain);
      src.connect(f).connect(v).connect(g);
      src.start(0, Math.random() * 0.4);
      lfo.start();
    };
    if (bed === 'waves') layer('bandpass', 500, 0.6, 0.05, 0.12);
    else if (bed === 'wind') layer('bandpass', 800, 1.8, 0.035, 0.07);
    else if (bed === 'rumble') layer('lowpass', 90, 0.6, 0.09, 0.1);
    else if (bed === 'stream') {
      layer('bandpass', 1800, 0.9, 0.018, 0.4, 0.4);
      layer('bandpass', 700, 0.8, 0.012, 0.23, 0.5);
    } else if (bed === 'rain') {
      layer('highpass', 3500, 0.5, 0.03, 0.15, 0.3);
      layer('lowpass', 400, 0.6, 0.03, 0.08, 0.5);
    } else if (bed === 'crowd') {
      layer('bandpass', 520, 0.7, 0.03, 0.17, 0.5);
      layer('bandpass', 1150, 1.2, 0.012, 0.29, 0.6);
    }
  }

  #ambientStep(t) {
    if (this.recordedAmb) return;
    const amb = AMB[this.ambientKind];
    if (!amb) return;
    const to = this.ambBus;
    const env = (tt, v, a, d) => this.#env(tt, v, a, d, to);
    for (const k of amb.events) {
      if (k === 'birds' && Math.random() < 0.03) {
        const f = rnd(2400, 4200);
        for (let i = 0; i < 3; i++) this.#osc('sine', f, t + i * 0.09, 0.07, env(t + i * 0.09, 0.02, 0.01, 0.07)).frequency.exponentialRampToValueAtTime(f * 1.3, t + i * 0.09 + 0.06);
      } else if (k === 'crickets' && this.step % 4 === 0 && Math.random() < 0.55) {
        const f = rnd(4300, 4900);
        for (let i = 0; i < 4; i++) this.#osc('sine', f, t + i * 0.025, 0.015, env(t + i * 0.025, 0.011, 0.002, 0.015));
      } else if (k === 'drops' && Math.random() < 0.05) {
        const o = this.#osc('sine', rnd(700, 1000), t, 0.09, env(t, 0.03, 0.002, 0.09));
        o.frequency.exponentialRampToValueAtTime(rnd(1500, 2100), t + 0.06);
      } else if (k === 'frog' && Math.random() < 0.007) {
        for (let i = 0; i < 3; i++) {
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 700;
          f.connect(env(t + i * 0.11, 0.035, 0.01, 0.09));
          this.#osc('sawtooth', rnd(95, 120), t + i * 0.11, 0.09, f);
        }
      } else if (k === 'gulls' && Math.random() < 0.007) {
        for (let i = 0; i < 2; i++) {
          const o = this.#osc('sine', 1500, t + i * 0.28, 0.25, env(t + i * 0.28, 0.018, 0.03, 0.25));
          o.frequency.linearRampToValueAtTime(1950, t + i * 0.28 + 0.08);
          o.frequency.linearRampToValueAtTime(1300, t + i * 0.28 + 0.24);
        }
      } else if (k === 'owl' && Math.random() < 0.005) {
        [0, 0.45].forEach((d, i) => this.#osc('sine', i ? 380 : 420, t + d, 0.35, env(t + d, 0.03, 0.08, 0.35)));
      } else if (k === 'tinkle' && Math.random() < 0.05) {
        this.#osc('sine', midi(91 + pick([0, 3, 5, 7, 10])), t, 1, env(t, 0.014, 0.003, 1));
      } else if (k === 'creak' && Math.random() < 0.01) {
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        f.Q.value = 4;
        f.connect(env(t, 0.03, 0.15, 0.7));
        const o = this.#osc('sawtooth', 70, t, 0.7, f);
        o.frequency.linearRampToValueAtTime(52, t + 0.7);
      } else if ((k === 'shimmer' || k === 'chimes') && Math.random() < 0.05) {
        this.#osc('sine', midi(84 + pick([0, 2, 4, 7, 9, 12])), t, 1.5, env(t, 0.018, 0.005, 1.5));
      } else if (k === 'harp' && this.step === 0 && this.bar % 2 === 0) {
        [72, 76, 79, 84, 88].forEach((m, i) => this.#osc('triangle', midi(m), t + i * 0.06, 1, env(t + i * 0.06, 0.014, 0.003, 1)));
      } else if (k === 'whoosh' && Math.random() < 0.01) {
        this.#noise(t, 0.9, { type: 'bandpass', freq: 400, sweepTo: 3000, q: 1, vel: 0.03, attack: 0.4, to });
      } else if (k === 'crow' && Math.random() < 0.006) {
        for (let i = 0; i < 2; i++) {
          const f = this.ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = 1200;
          f.Q.value = 2;
          f.connect(env(t + i * 0.22, 0.04, 0.01, 0.16));
          const o = this.#osc('sawtooth', 520, t + i * 0.22, 0.16, f);
          o.frequency.linearRampToValueAtTime(420, t + i * 0.22 + 0.16);
        }
      } else if (k === 'thunder' && Math.random() < 0.004) {
        this.#noise(t, 0.12, { type: 'highpass', freq: 3000, vel: 0.05, to });
        this.#noise(t + 0.05, 2.6, { type: 'lowpass', freq: 220, sweepTo: 70, q: 0.6, vel: 0.12, attack: 0.25, to });
      } else if (k === 'chips' && Math.random() < 0.05) {
        [0, 0.04].forEach((d) => this.#noise(t + d, 0.02, { type: 'bandpass', freq: rnd(3500, 4800), q: 6, vel: 0.02, to }));
      } else if (k === 'slots' && Math.random() < 0.006) {
        for (let i = 0; i < 8; i++) this.#osc('triangle', midi(76 + [0, 4, 7, 12, 7, 12, 16, 19][i]), t + i * 0.07, 0.1, env(t + i * 0.07, 0.01, 0.002, 0.1));
      }
    }
  }

  /* ---------------- strumenti in più (mondi) ---------------- */
  /** Corda pizzicata: ukulele, arpa, liuto. */
  pluck(t, m, vel, kind = 'harp') {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(kind === 'oud' ? 2600 : 4000, t);
    f.frequency.exponentialRampToValueAtTime(kind === 'oud' ? 500 : 900, t + 0.4);
    const dur = kind === 'harp' ? 1.4 : kind === 'oud' ? 0.5 : 0.6;
    const g = this.#env(t, vel, 0.003, dur);
    this.#send(g, kind === 'harp' ? 0.6 : 0.3);
    f.connect(g);
    const o = this.#osc(kind === 'harp' ? 'triangle' : 'sawtooth', midi(m), t, dur, f);
    if (kind === 'oud') o.frequency.setValueAtTime(midi(m) * 0.97, t), o.frequency.exponentialRampToValueAtTime(midi(m), t + 0.05);
  }

  strum(t, notes, vel) {
    notes.forEach((m, i) => this.pluck(t + i * 0.018, m, vel, 'uke'));
  }

  steel(t, m, vel) {
    const g = this.#env(t, vel, 0.004, 0.9);
    this.#send(g, 0.4);
    this.#osc('sine', midi(m), t, 0.9, g);
    this.#osc('sine', midi(m) * 2.02, t, 0.5, this.#env(t, vel * 0.4, 0.004, 0.5));
    this.#osc('sine', midi(m) * 3.0, t, 0.25, this.#env(t, vel * 0.2, 0.004, 0.25));
  }

  flute(t, m, vel, dur) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.12);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(this.trackGain);
    this.#send(g, 0.6);
    const o = this.#osc('sine', midi(m), t, dur, g);
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = 5;
    lg.gain.value = midi(m) * 0.006;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
    this.#noise(t, 0.12, { type: 'bandpass', freq: midi(m) * 2, q: 2, vel: vel * 0.25 });
  }

  musicbox(t, m, vel) {
    const g = this.#env(t, vel, 0.002, 1.6);
    this.#send(g, 0.7);
    this.#osc('sine', midi(m), t, 1.6, g);
    this.#osc('sine', midi(m) * 4.2, t, 0.2, this.#env(t, vel * 0.3, 0.001, 0.2));
  }

  accordion(t, notes, vel, dur) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    const g = this.#env(t, vel, 0.03, dur);
    this.#send(g, 0.2);
    f.connect(g);
    for (const m of notes) {
      this.#osc('square', midi(m), t, dur, f, -6);
      this.#osc('sawtooth', midi(m), t, dur, f, 6);
    }
  }

  organ(t, notes, vel, dur) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(this.trackGain);
    this.#send(g, 0.7);
    for (const m of notes) [1, 2, 3].forEach((h) => this.#osc('sine', midi(m) * h, t, dur, g));
  }

  harpsi(t, m, vel) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 400;
    const g = this.#env(t, vel, 0.002, 0.45);
    this.#send(g, 0.4);
    f.connect(g);
    this.#osc('sawtooth', midi(m), t, 0.45, f);
  }

  brass(t, notes, vel, dur) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(600, t);
    f.frequency.linearRampToValueAtTime(2600, t + 0.06);
    f.frequency.exponentialRampToValueAtTime(1200, t + dur);
    const g = this.#env(t, vel, 0.03, dur + 0.1);
    this.#send(g, 0.4);
    f.connect(g);
    for (const m of notes) this.#osc('sawtooth', midi(m), t, dur + 0.1, f, rnd(-5, 5));
  }

  strings(t, notes, vel, dur) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    const trem = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = 9;
    lg.gain.value = 0.45;
    lfo.connect(lg).connect(trem.gain);
    lfo.start(t);
    lfo.stop(t + dur + 0.3);
    f.connect(trem).connect(g).connect(this.trackGain);
    this.#send(g, 0.5);
    for (const m of notes) {
      this.#osc('sawtooth', midi(m), t, dur + 0.2, f, -8);
      this.#osc('sawtooth', midi(m), t, dur + 0.2, f, 8);
    }
  }

  tom(t, m, vel) {
    const g = this.#env(t, vel, 0.003, 0.5);
    this.#send(g, 0.3);
    const o = this.#osc('sine', midi(m) * 1.6, t, 0.5, g);
    o.frequency.exponentialRampToValueAtTime(midi(m), t + 0.15);
  }
}

export const music = new Music();
