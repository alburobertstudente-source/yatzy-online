/**
 * Texture disegnate con il canvas 2D (niente WebGL): servono sia al tavolo di
 * gioco (grana del panno, del legno, della sabbia… sopra lo sfondo) sia alle
 * anteprime 3D di tavoli, carte e casse.
 */

/** Palette dei temi del tavolo: metà rossa, metà blu, materiale del bordo, luce d'accento. */
export const THEME_PAL = {
  classic: { red: ['#ff9274', '#f2595f', '#b42c4a'], blue: ['#7ccdff', '#3a8eea', '#1b429c'], tex: 'felt', rim: 'wood', accent: '#fff1dc' },
  sunset: { red: ['#ffb56b', '#f2595f', '#8f2a5c'], blue: ['#ffb8d9', '#6c63e8', '#23266e'], tex: 'felt', rim: 'wood', accent: '#ffb56b' },
  meadow: { red: ['#ffb08a', '#ee5a5a', '#3f8a3a'], blue: ['#a8e2ff', '#3a8eea', '#2f7a3a'], tex: 'grass', rim: 'lightwood', accent: '#fff4c2' },
  ocean: { red: ['#ff9a8b', '#e2475a', '#1d6f8f'], blue: ['#8ff0ff', '#1b9ad6', '#0b3a73'], tex: 'water', rim: 'driftwood', accent: '#8ff0ff' },
  candy: { red: ['#ffd0e6', '#ff6fa8', '#c2306f'], blue: ['#d8f2ff', '#7fb8ff', '#7a4dff'], tex: 'sugar', rim: 'candy', accent: '#ffd0e6' },
  night: { red: ['#8a2a4a', '#4a1230', '#12081c'], blue: ['#2a4a9a', '#13235a', '#070b1f'], tex: 'velvet', rim: 'darkwood', accent: '#9fb4ff' },
  desert: { red: ['#ffd27a', '#f08a4b', '#b0442a'], blue: ['#9fe0ff', '#4a9ad6', '#c48a4a'], tex: 'sand', rim: 'sandstone', accent: '#ffd27a' },
  glacier: { red: ['#ffe3ea', '#f07a8c', '#7a8fd6'], blue: ['#ffffff', '#8fd0ff', '#2a6fc0'], tex: 'ice', rim: 'ice', accent: '#cfefff' },
  volcano: { red: ['#ffb02e', '#e2312b', '#3a0b0b'], blue: ['#ff7a1a', '#5a2a8a', '#12081c'], tex: 'rock', rim: 'obsidian', accent: '#ff7a1a' },
  space: { red: ['#c0408a', '#3b1d8f', '#0b0626'], blue: ['#2fd0ff', '#1b3f8f', '#050818'], tex: 'stars', rim: 'chrome', accent: '#b38bff' },
  neoncity: { red: ['#ff2a8a', '#6a0f5a', '#2a0a3a'], blue: ['#20e3ff', '#0f2a6a', '#050a2a'], tex: 'grid', rim: 'neon', accent: '#ff3dbb' },
  aurora: { red: ['#56ff9e', '#c2306f', '#3a0f3a'], blue: ['#56ff9e', '#2a6fc0', '#071a3a'], tex: 'velvet', rim: 'chrome', accent: '#56ff9e' },
  heaven: { red: ['#fff8d0', '#ffcf33', '#e2475a'], blue: ['#fffbe8', '#ffe27a', '#3a8eea'], tex: 'cloud', rim: 'gold', accent: '#fff3a8' },
};

/** Generatore pseudo-casuale con seme: le texture escono sempre uguali. */
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/* ------------------------------------------------------------------ */
/* Grana del tavolo di gioco: texture grigio-neutra (50%) che, in "overlay",
 * aggiunge rilievo a qualunque colore del tema senza cambiarlo. */
const texCache = new Map();

export function tableGrainUrl(kind = 'felt') {
  if (typeof document === 'undefined') return '';
  if (texCache.has(kind)) return texCache.get(kind);
  const S = 256;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const rnd = seeded(kind.length * 977 + kind.charCodeAt(0));
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  // ripete un disegno ai bordi così la texture si affianca senza giunte
  const wrap = (fn) => {
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy);
  };
  const speck = (n, a, r) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const light = rnd() > 0.5;
      g.fillStyle = light ? `rgba(255,255,255,${a * rnd()})` : `rgba(0,0,0,${a * rnd()})`;
      const rr = r * (0.5 + rnd());
      wrap((dx, dy) => {
        g.beginPath();
        g.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
        g.fill();
      });
    }
  };
  const fibers = (n, a, len, w = 0.8, dir = null) => {
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const ang = dir ?? rnd() * Math.PI * 2;
      const l = len * (0.4 + rnd());
      g.strokeStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      g.lineWidth = w;
      wrap((dx, dy) => {
        g.beginPath();
        g.moveTo(x + dx, y + dy);
        g.quadraticCurveTo(x + dx + Math.cos(ang + 0.6) * l * 0.5, y + dy + Math.sin(ang + 0.6) * l * 0.5, x + dx + Math.cos(ang) * l, y + dy + Math.sin(ang) * l);
        g.stroke();
      });
    }
  };
  switch (kind) {
    case 'felt':
    case 'velvet':
      fibers(2600, kind === 'velvet' ? 0.05 : 0.07, 7, 0.7);
      speck(1800, 0.08, 0.6);
      break;
    case 'grass':
      fibers(2200, 0.08, 9, 1, -Math.PI / 2 + 0.2);
      speck(500, 0.1, 1);
      break;
    case 'water':
      for (let i = 0; i < 26; i++) {
        const y = (i / 26) * S;
        g.strokeStyle = `rgba(255,255,255,${0.05 + rnd() * 0.06})`;
        g.lineWidth = 1.2 + rnd() * 1.6;
        g.beginPath();
        for (let x = -4; x <= S + 4; x += 4) g.lineTo(x, y + Math.sin((x / S) * Math.PI * 4 + i) * 4);
        g.stroke();
      }
      speck(900, 0.06, 0.8);
      break;
    case 'sugar':
      speck(1600, 0.16, 1.1);
      fibers(500, 0.04, 6);
      break;
    case 'sand':
      speck(5200, 0.12, 0.7);
      for (let i = 0; i < 14; i++) {
        const y = (i / 14) * S;
        g.strokeStyle = 'rgba(255,255,255,0.07)';
        g.lineWidth = 2.5;
        g.beginPath();
        for (let x = -4; x <= S + 4; x += 4) g.lineTo(x, y + Math.sin((x / S) * Math.PI * 2 + i * 0.7) * 6);
        g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.06)';
        g.lineWidth = 2;
        g.beginPath();
        for (let x = -4; x <= S + 4; x += 4) g.lineTo(x, y + 3 + Math.sin((x / S) * Math.PI * 2 + i * 0.7) * 6);
        g.stroke();
      }
      break;
    case 'ice':
      speck(700, 0.08, 1);
      g.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        let x = rnd() * S;
        let y = rnd() * S;
        g.strokeStyle = `rgba(255,255,255,${0.12 + rnd() * 0.12})`;
        wrap((dx, dy) => {
          let px = x;
          let py = y;
          g.beginPath();
          g.moveTo(px + dx, py + dy);
          for (let k = 0; k < 5; k++) {
            px += (rnd() - 0.5) * 50;
            py += (rnd() - 0.5) * 50;
            g.lineTo(px + dx, py + dy);
          }
          g.stroke();
        });
        x = 0;
        y = 0;
      }
      break;
    case 'rock':
      speck(3000, 0.14, 1.2);
      speck(160, 0.12, 6);
      break;
    case 'stars':
      speck(1400, 0.07, 0.8);
      break;
    case 'grid':
      g.strokeStyle = 'rgba(255,255,255,0.06)';
      g.lineWidth = 1;
      for (let y = 0; y < S; y += 4) {
        g.beginPath();
        g.moveTo(0, y + 0.5);
        g.lineTo(S, y + 0.5);
        g.stroke();
      }
      speck(800, 0.06, 0.7);
      break;
    case 'cloud':
      for (let i = 0; i < 70; i++) {
        const x = rnd() * S;
        const y = rnd() * S;
        const r = 10 + rnd() * 26;
        wrap((dx, dy) => {
          const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
          gr.addColorStop(0, 'rgba(255,255,255,0.09)');
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr;
          g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        });
      }
      speck(600, 0.05, 0.8);
      break;
    default:
      speck(1500, 0.08, 0.7);
  }
  const url = c.toDataURL('image/png');
  texCache.set(kind, url);
  return url;
}

/* ------------------------------------------------------------------ */
/* Disegni per le anteprime 3D */

/** Legno con venature (per bordi del tavolo, casse, cornici). */
export function woodCanvas(base = '#a0632e', dark = '#6d3f18', { w = 512, h = 128, seed = 3, planks = 0 } = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rnd = seeded(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    const y = rnd() * h;
    g.strokeStyle = rnd() > 0.5 ? hexA(dark, 0.18 + rnd() * 0.25) : `rgba(255,235,200,${0.06 + rnd() * 0.08})`;
    g.lineWidth = 0.6 + rnd() * 2.2;
    g.beginPath();
    const amp = 2 + rnd() * 5;
    const f = 1 + rnd() * 3;
    const ph = rnd() * 6;
    for (let x = 0; x <= w; x += 6) g.lineTo(x, y + Math.sin((x / w) * Math.PI * f + ph) * amp);
    g.stroke();
  }
  // nodi del legno
  for (let i = 0; i < 3; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    for (let r = 2; r < 12; r += 2.5) {
      g.strokeStyle = hexA(dark, 0.22);
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(x, y, r * 2.2, r, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  if (planks) {
    g.strokeStyle = hexA(dark, 0.7);
    g.lineWidth = 3;
    for (let i = 1; i < planks; i++) {
      const y = (i / planks) * h;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  }
  return c;
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Sfuma un colore verso il bianco (t>0) o il nero (t<0). */
export function shade(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t));
  const r = f((n >> 16) & 255);
  const gg = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1)}`;
}
