/**
 * Voci delle skin: ogni dado ha il suo suono quando viene agitato, quando
 * atterra e quando lo tieni (legno, vetro, pop it, pizza, dadi musicali…).
 * Le animazioni di lancio e le skin delle carte aggiungono il loro rumore.
 * Tutto è sintetizzato al momento con le primitive di SoundFX (tone, burst).
 */
const rnd = (a, b) => a + Math.random() * (b - a);
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const PENTA = [60, 62, 64, 67, 69, 72]; // dadi musicali: do re mi sol la do
const CHORD = [60, 64, 67, 72, 76, 79]; // pianoforte: arpeggio di do maggiore

/* ---------------- mattoncini ---------------- */
const click = (s, o) => s.burst({ dur: 0.018, q: 5, ...o });
const thump = (s, { freq = 160, gain = 0.2, delay = 0, pan = 0, dur = 0.07 }) => s.tone({ freq, to: freq * 0.5, type: 'sine', dur, gain, delay, pan });
const bell = (s, { freq, gain = 0.15, delay = 0, pan = 0, dur = 0.5, send = 0.4 }) => {
  s.tone({ freq, type: 'sine', dur, gain, delay, pan, send });
  s.tone({ freq: freq * 2.76, type: 'sine', dur: dur * 0.4, gain: gain * 0.3, delay, pan, send });
};
const marimba = (s, { m, gain = 0.2, delay = 0, pan = 0, send = 0.35 }) => {
  const f = midi(m);
  s.tone({ freq: f, type: 'sine', dur: 0.55, gain, delay, pan, send });
  s.tone({ freq: f * 4, type: 'sine', dur: 0.06, gain: gain * 0.35, delay, pan });
};
const pianoNote = (s, { m, gain = 0.18, delay = 0, pan = 0 }) => {
  const f = midi(m);
  s.tone({ freq: f, type: 'triangle', dur: 1.1, gain, delay, pan, send: 0.4 });
  s.tone({ freq: f * 2, type: 'sine', dur: 0.6, gain: gain * 0.35, delay, pan, send: 0.3 });
  click(s, { freq: 3000, gain: gain * 0.25, delay, pan });
};
const pop = (s, { freq = 420, gain = 0.25, delay = 0, pan = 0 }) => {
  s.tone({ freq, to: freq * 0.45, type: 'sine', dur: 0.07, gain, delay, pan, send: 0.12 });
  click(s, { freq: 2600, gain: gain * 0.5, delay, pan, q: 2 });
};
const squish = (s, { freq = 260, gain = 0.2, delay = 0, pan = 0 }) => {
  s.burst({ dur: 0.12, gain: gain * 0.6, freq: 700, sweepTo: 250, q: 1.2, type: 'lowpass', delay, pan, attack: 0.01 });
  s.tone({ freq, to: freq * 0.7, type: 'sine', dur: 0.1, gain: gain * 0.6, delay, pan });
};
const boing = (s, { freq = 220, gain = 0.2, delay = 0, pan = 0 }) => s.tone({ freq, to: freq * 2.2, type: 'sine', dur: 0.18, gain, delay, pan, vibrato: freq * 0.08, send: 0.2 });
const sizzle = (s, { gain = 0.1, delay = 0, dur = 0.35, pan = 0 }) => s.burst({ dur, gain, freq: 6500, q: 0.4, type: 'highpass', delay, pan, attack: 0.02 });
const whoosh = (s, { from = 400, to = 3000, gain = 0.14, delay = 0, dur = 0.4, pan = 0 }) => s.burst({ dur, gain, freq: from, sweepTo: to, q: 1, delay, pan, attack: dur * 0.4, send: 0.3 });
const blip = (s, { freq = 880, gain = 0.08, delay = 0, pan = 0, dur = 0.06 }) => s.tone({ freq, type: 'square', dur, gain, delay, pan });
const meow = (s, { gain = 0.14, delay = 0, pan = 0, pitch = 1 }) => {
  s.tone({ freq: 480 * pitch, to: 760 * pitch, type: 'sawtooth', dur: 0.16, gain: gain * 0.5, delay, pan, send: 0.2 });
  s.tone({ freq: 760 * pitch, to: 420 * pitch, type: 'triangle', dur: 0.26, gain, delay: delay + 0.15, pan, send: 0.2 });
};

/* ---------------- famiglie di voci ----------------
 * hit = colpo durante l'agitazione · land = atterraggio · hold = tieni/rilascia */
const FAMILIES = {
  classic: {
    hit: (s, o) => click(s, { freq: rnd(2200, 4200), gain: o.gain * 0.9, ...o }),
    land: (s, o) => {
      click(s, { freq: rnd(1500, 2300), gain: o.gain, q: 3, ...o });
      thump(s, { freq: rnd(170, 210), gain: o.gain * 0.6, ...o });
    },
    hold: (s, on) => pop(s, { freq: on ? 620 : 480, gain: 0.16 }),
  },
  wood: {
    hit: (s, o) => click(s, { freq: rnd(900, 1500), gain: o.gain, q: 6, ...o }),
    land: (s, o) => {
      s.burst({ dur: 0.05, gain: o.gain, freq: rnd(650, 900), q: 9, ...o, send: 0.2 });
      thump(s, { freq: rnd(120, 150), gain: o.gain * 0.7, ...o });
    },
    hold: (s, on) => s.burst({ dur: 0.05, gain: 0.2, freq: on ? 900 : 700, q: 10 }),
  },
  stone: {
    hit: (s, o) => click(s, { freq: rnd(1200, 2000), gain: o.gain, q: 2, ...o }),
    land: (s, o) => {
      click(s, { freq: rnd(900, 1300), gain: o.gain * 1.2, q: 2, ...o });
      thump(s, { freq: rnd(90, 120), gain: o.gain * 0.9, dur: 0.12, ...o });
    },
    hold: (s, on) => thump(s, { freq: on ? 200 : 150, gain: 0.25 }),
  },
  glass: {
    hit: (s, o) => s.tone({ freq: rnd(2600, 4200), type: 'sine', dur: 0.08, gain: o.gain * 0.35, ...o, send: 0.3 }),
    land: (s, o) => bell(s, { freq: rnd(1800, 2600), gain: o.gain * 0.5, dur: 0.6, ...o }),
    hold: (s, on) => bell(s, { freq: on ? 2400 : 1800, gain: 0.12, dur: 0.4 }),
  },
  metal: {
    hit: (s, o) => s.tone({ freq: rnd(3000, 5200), type: 'triangle', dur: 0.05, gain: o.gain * 0.25, ...o }),
    land: (s, o) => {
      const f = rnd(1100, 1500);
      s.tone({ freq: f, type: 'sine', dur: 0.7, gain: o.gain * 0.35, ...o, send: 0.35 });
      s.tone({ freq: f * 2.76, type: 'sine', dur: 0.35, gain: o.gain * 0.18, ...o });
      s.tone({ freq: f * 5.4, type: 'sine', dur: 0.15, gain: o.gain * 0.1, ...o });
      click(s, { freq: 5000, gain: o.gain * 0.4, ...o });
    },
    hold: (s, on) => s.tone({ freq: on ? 2600 : 2000, type: 'triangle', dur: 0.25, gain: 0.1, send: 0.3 }),
  },
  gem: {
    hit: (s, o) => s.tone({ freq: midi(84 + Math.floor(rnd(0, 5)) * 2), type: 'sine', dur: 0.12, gain: o.gain * 0.25, ...o, send: 0.5 }),
    land: (s, o) => {
      bell(s, { freq: midi([84, 88, 91, 96][o.k % 4]), gain: o.gain * 0.45, dur: 1, ...o, send: 0.6 });
    },
    hold: (s, on) => bell(s, { freq: midi(on ? 91 : 86), gain: 0.12, dur: 0.6 }),
  },
  candy: {
    hit: (s, o) => squish(s, { freq: rnd(300, 420), gain: o.gain * 0.5, ...o }),
    land: (s, o) => {
      squish(s, { freq: rnd(220, 300), gain: o.gain, ...o });
      s.tone({ freq: rnd(900, 1200), type: 'sine', dur: 0.05, gain: o.gain * 0.2, ...o });
    },
    hold: (s, on) => squish(s, { freq: on ? 380 : 260, gain: 0.2 }),
  },
  jelly: {
    hit: (s, o) => boing(s, { freq: rnd(260, 360), gain: o.gain * 0.3, ...o }),
    land: (s, o) => boing(s, { freq: rnd(150, 210), gain: o.gain * 0.7, ...o }),
    hold: (s, on) => boing(s, { freq: on ? 300 : 200, gain: 0.16 }),
  },
  popit: {
    hit: (s, o) => pop(s, { freq: rnd(350, 520), gain: o.gain * 0.6, ...o }),
    land: (s, o) => {
      pop(s, { freq: rnd(300, 380), gain: o.gain, ...o });
      pop(s, { freq: rnd(420, 520), gain: o.gain * 0.6, ...o, delay: (o.delay || 0) + 0.07 });
    },
    hold: (s, on) => pop(s, { freq: on ? 520 : 360, gain: 0.3 }),
  },
  bubble: {
    hit: (s, o) => s.tone({ freq: rnd(300, 500), to: rnd(900, 1300), type: 'sine', dur: 0.06, gain: o.gain * 0.35, ...o }),
    land: (s, o) => {
      s.tone({ freq: rnd(250, 350), to: rnd(1000, 1400), type: 'sine', dur: 0.09, gain: o.gain * 0.6, ...o, send: 0.3 });
      s.tone({ freq: rnd(500, 700), to: rnd(1500, 1900), type: 'sine', dur: 0.06, gain: o.gain * 0.35, ...o, delay: (o.delay || 0) + 0.08 });
    },
    hold: (s, on) => s.tone({ freq: on ? 400 : 700, to: on ? 1300 : 300, type: 'sine', dur: 0.08, gain: 0.2 }),
  },
  pizza: {
    hit: (s, o) => s.burst({ dur: 0.04, gain: o.gain * 0.5, freq: rnd(500, 900), q: 1, ...o }),
    land: (s, o) => {
      squish(s, { freq: rnd(180, 240), gain: o.gain * 0.9, ...o });
      sizzle(s, { gain: o.gain * 0.25, dur: 0.4, ...o });
      click(s, { freq: rnd(1800, 2400), gain: o.gain * 0.4, ...o }); // crosta croccante
    },
    hold: (s, on) => squish(s, { freq: on ? 320 : 220, gain: 0.22 }),
  },
  juicy: {
    hit: (s, o) => s.burst({ dur: 0.05, gain: o.gain * 0.5, freq: rnd(1200, 1800), q: 1.5, ...o }),
    land: (s, o) => {
      squish(s, { freq: rnd(200, 260), gain: o.gain, ...o });
      s.tone({ freq: rnd(700, 900), to: rnd(1400, 1800), type: 'sine', dur: 0.05, gain: o.gain * 0.25, ...o, delay: (o.delay || 0) + 0.05 });
    },
    hold: (s, on) => squish(s, { freq: on ? 340 : 240, gain: 0.2 }),
  },
  crunch: {
    hit: (s, o) => s.burst({ dur: 0.03, gain: o.gain * 0.6, freq: rnd(2500, 4500), q: 0.8, ...o }),
    land: (s, o) => {
      for (let i = 0; i < 4; i++) s.burst({ dur: 0.025, gain: o.gain * 0.5, freq: rnd(1500, 4000), q: 0.8, ...o, delay: (o.delay || 0) + i * 0.018 });
      thump(s, { freq: 140, gain: o.gain * 0.4, ...o });
    },
    hold: (s, on) => s.burst({ dur: 0.06, gain: 0.2, freq: on ? 3000 : 2000, q: 0.8 }),
  },
  duck: {
    hit: (s, o) => s.tone({ freq: rnd(900, 1100), type: 'sine', dur: 0.05, gain: o.gain * 0.2, ...o }),
    land: (s, o) => s.tone({ freq: rnd(950, 1150), to: rnd(1300, 1500), type: 'triangle', dur: 0.16, gain: o.gain * 0.45, vibrato: 60, ...o, send: 0.2 }),
    hold: (s, on) => s.tone({ freq: on ? 1200 : 1000, to: on ? 1500 : 800, type: 'triangle', dur: 0.14, gain: 0.2, vibrato: 50 }),
  },
  ball: {
    hit: (s, o) => thump(s, { freq: rnd(200, 260), gain: o.gain * 0.4, ...o }),
    land: (s, o) => {
      thump(s, { freq: rnd(110, 140), gain: o.gain, dur: 0.12, ...o });
      boing(s, { freq: rnd(120, 160), gain: o.gain * 0.3, ...o });
    },
    hold: (s, on) => thump(s, { freq: on ? 260 : 180, gain: 0.3 }),
  },
  musical: {
    hit: (s, o) => s.tone({ freq: midi(84 + [0, 2, 4, 7, 9][Math.floor(rnd(0, 5))]), type: 'sine', dur: 0.08, gain: o.gain * 0.15, ...o, send: 0.4 }),
    land: (s, o) => marimba(s, { m: PENTA[(o.value || 1) - 1] + (o.k % 2 ? 12 : 0), gain: o.gain * 0.75, ...o }),
    hold: (s, on) => marimba(s, { m: on ? 79 : 72, gain: 0.18 }),
  },
  piano: {
    hit: (s, o) => click(s, { freq: rnd(2500, 3500), gain: o.gain * 0.4, ...o }),
    land: (s, o) => pianoNote(s, { m: CHORD[(o.value || 1) - 1], gain: o.gain * 0.7, ...o }),
    hold: (s, on) => pianoNote(s, { m: on ? 84 : 79, gain: 0.14 }),
  },
  drum: {
    hit: (s, o) => s.burst({ dur: 0.02, gain: o.gain * 0.5, freq: rnd(6000, 9000), q: 0.5, type: 'highpass', ...o }),
    land: (s, o) => {
      const v = o.value || 1;
      const d = o.delay || 0;
      if (v === 1) s.tone({ freq: 140, to: 45, type: 'sine', dur: 0.3, gain: o.gain * 1.2, delay: d });
      else if (v === 2) {
        s.burst({ dur: 0.16, gain: o.gain * 0.8, freq: 1800, q: 0.7, delay: d, send: 0.3 });
        s.tone({ freq: 190, to: 140, type: 'triangle', dur: 0.1, gain: o.gain * 0.5, delay: d });
      } else if (v === 3) s.burst({ dur: 0.05, gain: o.gain * 0.6, freq: 8000, q: 0.5, type: 'highpass', delay: d });
      else if (v === 4) s.tone({ freq: 110, to: 70, type: 'sine', dur: 0.3, gain: o.gain, delay: d });
      else if (v === 5) s.tone({ freq: 190, to: 120, type: 'sine', dur: 0.22, gain: o.gain, delay: d });
      else s.burst({ dur: 0.9, gain: o.gain * 0.5, freq: 5000, q: 0.3, type: 'highpass', delay: d, send: 0.4 });
    },
    hold: (s, on) => s.burst({ dur: 0.05, gain: 0.25, freq: on ? 8000 : 6000, q: 0.5, type: 'highpass' }),
  },
  retro: {
    hit: (s, o) => blip(s, { freq: midi(72 + Math.floor(rnd(0, 12))), gain: o.gain * 0.25, dur: 0.03, ...o }),
    land: (s, o) => {
      const base = 60 + (o.value || 1) * 2;
      [0, 4, 7, 12].forEach((iv, i) => blip(s, { freq: midi(base + iv), gain: o.gain * 0.3, dur: 0.05, ...o, delay: (o.delay || 0) + i * 0.035 }));
    },
    hold: (s, on) => blip(s, { freq: on ? 1320 : 660, gain: 0.08, dur: 0.07 }),
  },
  synth: {
    hit: (s, o) => s.tone({ freq: midi(76 + Math.floor(rnd(0, 7))), type: 'sawtooth', dur: 0.04, gain: o.gain * 0.12, ...o }),
    land: (s, o) => {
      const f = midi(57 + [0, 3, 7, 10, 12, 15][(o.value || 1) - 1]);
      s.tone({ freq: f, type: 'sawtooth', dur: 0.4, gain: o.gain * 0.25, ...o, send: 0.5 });
      s.tone({ freq: f * 1.005, type: 'sawtooth', dur: 0.4, gain: o.gain * 0.2, ...o });
    },
    hold: (s, on) => s.tone({ freq: on ? 880 : 660, type: 'sawtooth', dur: 0.12, gain: 0.07, send: 0.3 }),
  },
  space: {
    hit: (s, o) => s.tone({ freq: rnd(1500, 3000), to: rnd(500, 900), type: 'sine', dur: 0.08, gain: o.gain * 0.2, ...o, send: 0.5 }),
    land: (s, o) => {
      s.tone({ freq: rnd(300, 500), to: rnd(1600, 2400), type: 'sine', dur: 0.35, gain: o.gain * 0.35, ...o, send: 0.7 });
      bell(s, { freq: rnd(2000, 3000), gain: o.gain * 0.2, dur: 0.8, ...o, send: 0.7 });
    },
    hold: (s, on) => s.tone({ freq: on ? 600 : 1200, to: on ? 1800 : 400, type: 'sine', dur: 0.2, gain: 0.12, send: 0.5 }),
  },
  lava: {
    hit: (s, o) => sizzle(s, { gain: o.gain * 0.2, dur: 0.06, ...o }),
    land: (s, o) => {
      thump(s, { freq: rnd(70, 90), gain: o.gain * 0.9, dur: 0.25, ...o });
      sizzle(s, { gain: o.gain * 0.35, dur: 0.6, ...o });
      s.tone({ freq: 200, to: 600, type: 'sine', dur: 0.08, gain: o.gain * 0.15, ...o, delay: (o.delay || 0) + 0.2 }); // blub
    },
    hold: (s, on) => sizzle(s, { gain: 0.15, dur: on ? 0.3 : 0.15 }),
  },
  ghost: {
    hit: (s, o) => whoosh(s, { from: 600, to: 1500, gain: o.gain * 0.15, dur: 0.15, ...o }),
    land: (s, o) => s.tone({ freq: rnd(330, 400), to: rnd(250, 290), type: 'sine', dur: 0.7, gain: o.gain * 0.35, vibrato: 12, attack: 0.15, ...o, send: 0.7 }),
    hold: (s, on) => s.tone({ freq: on ? 500 : 350, type: 'sine', dur: 0.4, gain: 0.12, vibrato: 10, attack: 0.1, send: 0.6 }),
  },
  thunder: {
    hit: (s, o) => click(s, { freq: rnd(4000, 7000), gain: o.gain * 0.5, q: 1, ...o }),
    land: (s, o) => {
      s.burst({ dur: 0.06, gain: o.gain, freq: 5000, q: 0.5, type: 'highpass', ...o });
      s.burst({ dur: 0.9, gain: o.gain * 0.6, freq: 300, sweepTo: 80, q: 0.7, type: 'lowpass', ...o, send: 0.4 });
    },
    hold: (s, on) => s.burst({ dur: 0.08, gain: 0.25, freq: 6000, q: 0.5, type: 'highpass' }),
  },
  slime: {
    hit: (s, o) => squish(s, { freq: rnd(140, 200), gain: o.gain * 0.4, ...o }),
    land: (s, o) => {
      s.burst({ dur: 0.22, gain: o.gain * 0.7, freq: 900, sweepTo: 200, q: 3, ...o, attack: 0.02 });
      s.tone({ freq: 120, to: 260, type: 'sine', dur: 0.15, gain: o.gain * 0.3, ...o });
    },
    hold: (s, on) => squish(s, { freq: on ? 240 : 150, gain: 0.22 }),
  },
  cat: {
    hit: (s, o) => click(s, { freq: rnd(2500, 3500), gain: o.gain * 0.5, ...o }),
    land: (s, o) => (o.k === 0 ? meow(s, { gain: o.gain * 0.6, pitch: rnd(0.9, 1.15), ...o }) : thump(s, { freq: 220, gain: o.gain * 0.3, ...o })),
    hold: (s, on) => meow(s, { gain: 0.1, pitch: on ? 1.4 : 1.1 }),
  },
  coin: {
    hit: (s, o) => s.tone({ freq: rnd(3500, 5500), type: 'triangle', dur: 0.04, gain: o.gain * 0.2, ...o }),
    land: (s, o) => {
      bell(s, { freq: rnd(1900, 2200), gain: o.gain * 0.35, dur: 0.4, ...o, send: 0.2 });
      bell(s, { freq: rnd(2600, 3000), gain: o.gain * 0.25, dur: 0.5, ...o, delay: (o.delay || 0) + 0.06 });
    },
    hold: (s, on) => bell(s, { freq: on ? 2600 : 2000, gain: 0.12, dur: 0.3 }),
  },
  spooky: {
    hit: (s, o) => click(s, { freq: rnd(1500, 2500), gain: o.gain * 0.6, ...o }),
    land: (s, o) => {
      s.tone({ freq: midi([57, 60, 63, 66][o.k % 4]), type: 'triangle', dur: 0.5, gain: o.gain * 0.35, ...o, send: 0.6 });
      thump(s, { freq: 110, gain: o.gain * 0.4, ...o });
    },
    hold: (s, on) => s.tone({ freq: on ? 311 : 262, type: 'triangle', dur: 0.3, gain: 0.12, send: 0.5 }),
  },
};

/* ---------------- voci "assurde" (le rarità più alte) ---------------- */
const ABSURD = {
  dj: (s, o) => {
    if (o.k > 0) return s.burst({ dur: 0.04, gain: o.gain * 0.5, freq: 8000, q: 0.5, type: 'highpass', ...o });
    s.tone({ freq: 140, to: 38, type: 'sine', dur: 0.9, gain: 0.5, ...o });
    s.tone({ freq: 70, to: 35, type: 'square', dur: 0.6, gain: 0.06, ...o });
    s.burst({ dur: 0.35, gain: 0.18, freq: 900, sweepTo: 3500, q: 6, ...o }); // scratch
    s.burst({ dur: 0.25, gain: 0.15, freq: 3500, sweepTo: 700, q: 6, ...o, delay: (o.delay || 0) + 0.35 });
  },
  blackhole: (s, o) => {
    if (o.k > 0) return thump(s, { freq: 60, gain: o.gain * 0.5, dur: 0.2, ...o });
    s.burst({ dur: 0.9, gain: 0.3, freq: 4000, sweepTo: 60, q: 0.8, type: 'lowpass', attack: 0.6, ...o, send: 0.8 });
    s.tone({ freq: 90, to: 28, type: 'sine', dur: 1.3, gain: 0.45, ...o });
  },
  unicorn: (s, o) => {
    if (o.k > 0) return bell(s, { freq: midi(88 + o.k * 2), gain: 0.1, dur: 0.6, ...o });
    [72, 74, 76, 79, 81, 84, 86, 88, 91, 93].forEach((m, i) => marimba(s, { m, gain: 0.13, delay: (o.delay || 0) + i * 0.035, pan: -0.6 + i * 0.12, send: 0.7 }));
    sizzle(s, { gain: 0.06, dur: 0.8, delay: (o.delay || 0) + 0.3 });
  },
  phoenix: (s, o) => {
    if (o.k > 0) return sizzle(s, { gain: 0.08, dur: 0.2, ...o });
    whoosh(s, { from: 200, to: 4000, gain: 0.28, dur: 0.7, ...o });
    [0, 0.12].forEach((d) => s.tone({ freq: 2200, to: 3600, type: 'sine', dur: 0.1, gain: 0.12, delay: (o.delay || 0) + 0.55 + d, send: 0.5 }));
  },
  infinity: (s, o) => {
    if (o.k > 0) return bell(s, { freq: midi(84 + o.k * 3), gain: 0.08, dur: 0.8, ...o });
    for (let r = 0; r < 4; r++) [72, 79, 84, 91].forEach((m, i) => bell(s, { freq: midi(m + r * 2), gain: 0.12 / (r + 1), dur: 0.7, delay: (o.delay || 0) + r * 0.22 + i * 0.05, pan: (i - 1.5) * 0.4, send: 0.8 }));
  },
  disco: (s, o) => {
    if (o.k > 0) return [540, 800].forEach((f) => s.tone({ freq: f, type: 'square', dur: 0.08, gain: 0.04, ...o }));
    [60, 64, 67, 71].forEach((m) => s.tone({ freq: midi(m), type: 'sawtooth', dur: 0.18, gain: 0.07, ...o, send: 0.4 }));
    s.burst({ dur: 0.08, gain: 0.25, freq: 1500, q: 0.8, ...o, delay: (o.delay || 0) + 0.2 });
    s.tone({ freq: midi(48), to: midi(36), type: 'sine', dur: 0.4, gain: 0.3, ...o });
  },
  tnt: (s, o) => {
    if (o.k > 0) return pop(s, { freq: 300, gain: 0.15, ...o });
    s.burst({ dur: 0.25, gain: 0.12, freq: 6000, q: 0.5, type: 'highpass', ...o }); // miccia
    const d = (o.delay || 0) + 0.25;
    s.burst({ dur: 1.4, gain: 0.55, freq: 1400, sweepTo: 120, q: 0.6, type: 'lowpass', delay: d, send: 0.5 });
    s.tone({ freq: 90, to: 30, type: 'sine', dur: 0.9, gain: 0.55, delay: d });
  },
  cosmiccat: (s, o) => {
    if (o.k > 0) return meow(s, { gain: 0.06, pitch: 1.5 + o.k * 0.1, ...o });
    meow(s, { gain: 0.2, pitch: 1, ...o });
    [0.45, 0.6, 0.75].forEach((d, i) => bell(s, { freq: midi(91 + i * 3), gain: 0.08, dur: 0.6, delay: (o.delay || 0) + d }));
  },
  tsunami: (s, o) => {
    if (o.k > 0) return s.tone({ freq: rnd(700, 900), to: rnd(1500, 1900), type: 'sine', dur: 0.06, gain: 0.15, ...o });
    s.burst({ dur: 1.1, gain: 0.35, freq: 3000, sweepTo: 400, q: 0.5, ...o, attack: 0.2, send: 0.5 });
    for (let i = 0; i < 6; i++) s.tone({ freq: rnd(400, 700), to: rnd(1200, 2000), type: 'sine', dur: 0.06, gain: 0.1, delay: (o.delay || 0) + 0.5 + i * 0.08 });
  },
  party: (s, o) => {
    if (o.k > 0) return pop(s, { freq: rnd(500, 700), gain: 0.15, ...o });
    s.burst({ dur: 0.07, gain: 0.35, freq: 3000, q: 0.6, ...o }); // sparacoriandoli
    s.tone({ freq: 440, to: 470, type: 'sawtooth', dur: 0.7, gain: 0.08, vibrato: 25, delay: (o.delay || 0) + 0.12, send: 0.3 }); // trombetta
  },
  divine: (s, o) => {
    if (o.k > 0) return bell(s, { freq: midi(84 + o.k * 4), gain: 0.06, dur: 1, ...o });
    [60, 64, 67, 72, 76].forEach((m, i) => s.tone({ freq: midi(m), type: 'triangle', dur: 1.6, gain: 0.07, attack: 0.25, delay: (o.delay || 0) + i * 0.03, send: 0.9 }));
  },
  cosmic: (s, o) => {
    if (o.k > 0) return FAMILIES.space.land(s, { ...o, gain: o.gain * 0.5 });
    FAMILIES.space.land(s, o);
    [84, 88, 91, 96].forEach((m, i) => bell(s, { freq: midi(m), gain: 0.07, dur: 0.9, delay: (o.delay || 0) + 0.15 + i * 0.06, send: 0.8 }));
  },
  fire: (s, o) => {
    FAMILIES.lava.land(s, o);
    if (o.k === 0) s.tone({ freq: 90, to: 60, type: 'sawtooth', dur: 0.5, gain: 0.08, delay: (o.delay || 0) + 0.1 }); // ruggito
  },
};

/** Per le voci assurde l'agitazione e il "tieni" usano una famiglia vicina. */
const BASE_OF = { dj: 'synth', blackhole: 'space', unicorn: 'gem', phoenix: 'lava', infinity: 'gem', disco: 'synth', tnt: 'stone', cosmiccat: 'cat', tsunami: 'bubble', party: 'popit', divine: 'gem', cosmic: 'space', fire: 'lava' };
const family = (voice) => FAMILIES[voice] || FAMILIES[BASE_OF[voice]] || FAMILIES.classic;

export const VOICES = {
  /** Agitazione e lancio: una raffica di colpi distribuiti nello stereo. */
  shake(s, voice, count = 5, duration = 0.9) {
    const fam = family(voice);
    const hits = 5 + count * 3;
    for (let i = 0; i < hits; i++) {
      fam.hit(s, { delay: (i / hits) * duration * 0.7 + rnd(0, 0.04), gain: rnd(0.1, 0.2), pan: rnd(-0.6, 0.6) });
    }
  },
  land(s, voice, { delay = 0, value = null, k = 0 }) {
    const o = { delay, value, k, gain: k === 0 ? 0.44 : 0.32, pan: [-0.5, 0.5, -0.2, 0.25, 0][k % 5] };
    if (ABSURD[voice]) ABSURD[voice](s, o);
    else family(voice).land(s, o);
  },
  hold(s, voice, on) {
    family(voice).hold(s, on);
  },
  /** Sapore della skin delle carte mentre si gratta. */
  scratch(s, cv) {
    if (Math.random() > 0.35) return;
    if (cv === 'gold') s.tone({ freq: rnd(3000, 4200), type: 'triangle', dur: 0.05, gain: 0.04 });
    else if (cv === 'holo' || cv === 'rainbow' || cv === 'prism') s.tone({ freq: midi(84 + Math.floor(rnd(0, 12))), type: 'sine', dur: 0.12, gain: 0.04, send: 0.6 });
    else if (cv === 'frost') bell(s, { freq: rnd(2500, 3500), gain: 0.04, dur: 0.3 });
    else if (cv === 'lava') sizzle(s, { gain: 0.04, dur: 0.1 });
    else if (cv === 'neon') blip(s, { freq: rnd(900, 1800), gain: 0.03, dur: 0.03 });
    else if (cv === 'ocean') s.tone({ freq: rnd(400, 600), to: rnd(1000, 1400), type: 'sine', dur: 0.05, gain: 0.05 });
  },
  revealFlavor(s, cv) {
    if (cv === 'holo' || cv === 'rainbow' || cv === 'prism') [72, 76, 79, 84, 88, 91].forEach((m, i) => bell(s, { freq: midi(m), gain: 0.05, dur: 0.6, delay: i * 0.04 }));
    else if (cv === 'gold') FAMILIES.coin.land(s, { gain: 0.3, k: 0 });
    else if (cv === 'galaxy') FAMILIES.space.land(s, { gain: 0.3, k: 0 });
    else if (cv === 'lava') sizzle(s, { gain: 0.12, dur: 0.5 });
    else if (cv === 'frost') FAMILIES.glass.land(s, { gain: 0.3, k: 0 });
    else if (cv === 'neon') FAMILIES.retro.land(s, { gain: 0.3, k: 0, value: 4 });
  },
};

/** Rumore delle animazioni di lancio. */
export function rollStyleSound(s, style) {
  if (!s.ready) return;
  switch (style) {
    case 'bounce':
    case 'hop':
      [0, 0.2, 0.36].forEach((d, i) => boing(s, { freq: 180 + i * 40, gain: 0.08, delay: d }));
      break;
    case 'tornado':
      whoosh(s, { from: 300, to: 2500, gain: 0.18, dur: 0.7 });
      break;
    case 'bubbles':
      for (let i = 0; i < 6; i++) FAMILIES.bubble.hit(s, { gain: 0.25, delay: i * 0.08, pan: rnd(-0.5, 0.5) });
      break;
    case 'confetti':
      ABSURD.party(s, { k: 0, delay: 0.45 });
      break;
    case 'ghost':
      FAMILIES.ghost.land(s, { gain: 0.3, k: 0 });
      break;
    case 'rocket':
      s.burst({ dur: 0.8, gain: 0.25, freq: 200, sweepTo: 1200, q: 0.6, type: 'lowpass', attack: 0.1 });
      break;
    case 'meteor':
      whoosh(s, { from: 4000, to: 300, gain: 0.22, dur: 0.5 });
      thump(s, { freq: 90, gain: 0.35, delay: 0.5, dur: 0.25 });
      break;
    case 'lightning':
      FAMILIES.thunder.land(s, { gain: 0.3, k: 0, delay: 0.5 });
      break;
    case 'glitch':
      for (let i = 0; i < 8; i++) blip(s, { freq: rnd(200, 2400), gain: 0.04, dur: 0.025, delay: i * 0.05 });
      break;
    case 'portal':
      s.tone({ freq: 200, to: 1600, type: 'sine', dur: 0.5, gain: 0.15, send: 0.7 });
      s.tone({ freq: 1600, to: 300, type: 'sine', dur: 0.4, gain: 0.12, delay: 0.5, send: 0.7 });
      break;
    case 'stardust':
      for (let i = 0; i < 8; i++) bell(s, { freq: midi(84 + [0, 2, 4, 7, 9, 12, 14, 16][i]), gain: 0.05, dur: 0.4, delay: i * 0.06 });
      break;
    case 'rainbow':
      for (let i = 0; i < 10; i++) s.tone({ freq: midi(72 + i * 2), type: 'triangle', dur: 0.12, gain: 0.05, delay: i * 0.04, send: 0.4 });
      break;
    case 'blackhole':
      ABSURD.blackhole(s, { k: 0, delay: 0 });
      break;
    default:
      break;
  }
}

/** Anteprima sonora di un oggetto (armadio, negozio). */
export function previewSound(s, item) {
  if (!s.ready || !item) return;
  if (item.cat === 'dice') {
    VOICES.shake(s, item.voice || 'classic', 3, 0.5);
    [0, 1, 2].forEach((k) => VOICES.land(s, item.voice || 'classic', { delay: 0.45 + k * 0.12, value: [5, 3, 6][k], k }));
  } else if (item.cat === 'roll') rollStyleSound(s, item.style);
  else if (item.cat === 'cards') VOICES.revealFlavor(s, item.skin);
  else s.select();
}
