/**
 * Aspetto 3D di ogni skin dei dadi: come dipingere le facce (colore, rilievo,
 * luce propria), che materiale usare e quale effetto animato.
 *
 * Le facce si dipingono su canvas in unità "48" come le skin SVG del gioco
 * (punti in 13/24/35), così forme e posizioni dei punti restano le stesse.
 */
import { ITEMS } from '../meta/catalog.js';

/* ---------------- utilità ---------------- */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Colori (#hex e rgba) citati in una stringa CSS. */
export function cssColors(str = '') {
  return (String(str).match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) || []).map((c) => c.toLowerCase());
}

const PIP_POS = { tl: [13, 13], tr: [35, 13], ml: [13, 24], mm: [24, 24], mr: [35, 24], bl: [13, 35], br: [35, 35] };
const PIPS = { 1: ['mm'], 2: ['tr', 'bl'], 3: ['tr', 'mm', 'bl'], 4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'mm', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] };
const SPRINKLES = ['#ff3d7f', '#ffd23f', '#2fd0ff', '#56ff9e', '#a54dff', '#ffffff'];

export function pipCenters(n) {
  return (PIPS[n] || []).map((k) => PIP_POS[k]);
}

/* ---------------- disegno dei punti (canvas, unità 48) ---------------- */
function star(ctx, x, y, r, inner = 0.48, outer = 1.25, n = 5) {
  ctx.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / n;
    const rr = k % 2 ? r * inner : r * outer;
    ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath();
}

function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.1);
  ctx.bezierCurveTo(x - r * 1.9, y - r * 0.2, x - r * 0.9, y - r * 1.5, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.5, x + r * 1.9, y - r * 0.2, x, y + r * 1.1);
  ctx.closePath();
}

const circle = (ctx, x, y, r) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
};

/**
 * Disegna un punto. mode 'color': colore e dettagli; 'mask': solo la sagoma (per
 * rilievo e materiali). k = indice del punto (per le varianti).
 */
export function drawPip(ctx, shape, x, y, r, k, color, mode = 'color') {
  const solid = mode === 'mask';
  const fill = (c) => {
    ctx.fillStyle = solid ? '#fff' : c;
    ctx.fill();
  };
  const detail = (fn) => {
    if (!solid) fn();
  };
  switch (shape) {
    case 'bubble':
      circle(ctx, x, y, r * 1.32);
      fill(color);
      break;
    case 'pepperoni':
      circle(ctx, x, y, r * 1.38);
      fill(color);
      detail(() => {
        ctx.fillStyle = 'rgba(80,10,5,.45)';
        circle(ctx, x - r * 0.45, y - r * 0.3, r * 0.28);
        ctx.fill();
        circle(ctx, x + r * 0.4, y + r * 0.35, r * 0.24);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,170,.45)';
        circle(ctx, x + r * 0.3, y - r * 0.55, r * 0.2);
        ctx.fill();
      });
      break;
    case 'seed':
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.3);
      ctx.bezierCurveTo(x + r, y - r * 0.2, x + r * 0.7, y + r, x, y + r * 1.1);
      ctx.bezierCurveTo(x - r * 0.7, y + r, x - r, y - r * 0.2, x, y - r * 1.3);
      fill(color);
      break;
    case 'chip': {
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + k;
        const rr = r * (i % 2 ? 0.95 : 1.3);
        ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
      }
      ctx.closePath();
      fill(color);
      break;
    }
    case 'hole':
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.3, r * 1.15, 0.3, 0, Math.PI * 2);
      fill(color);
      break;
    case 'note':
      ctx.beginPath();
      ctx.ellipse(x - r * 0.35, y + r * 0.75, r * 0.88, r * 0.64, -0.35, 0, Math.PI * 2);
      fill(color);
      ctx.beginPath();
      ctx.rect(x + r * 0.3, y - r * 1.4, r * 0.34, r * 2.25);
      fill(color);
      ctx.beginPath();
      ctx.moveTo(x + r * 0.5, y - r * 1.4);
      ctx.quadraticCurveTo(x + r * 1.7, y - r * 0.9, x + r * 1.4, y);
      ctx.quadraticCurveTo(x + r * 1.2, y - r * 0.8, x + r * 0.5, y - r * 0.7);
      ctx.closePath();
      fill(color);
      break;
    case 'paw':
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.45, r * 0.88, r * 0.7, 0, 0, Math.PI * 2);
      fill(color);
      for (const [dx, dy] of [[-0.95, -0.15], [0.95, -0.15], [-0.36, -0.82], [0.36, -0.82]]) {
        circle(ctx, x + dx * r, y + dy * r, r * 0.36);
        fill(color);
      }
      break;
    case 'dollar':
      ctx.font = `700 ${r * 2.9}px Fredoka, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = solid ? '#fff' : color;
      ctx.fillText('$', x, y + r * 0.1);
      break;
    case 'sprinkle':
      for (let j = 0; j < 2; j++) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((((k * 47 + j * 70) % 180) * Math.PI) / 180);
        const yy = (j - 0.5) * r * 0.95;
        ctx.beginPath();
        ctx.roundRect(-r * 0.95, yy - r * 0.29, r * 1.9, r * 0.58, r * 0.29);
        fill(SPRINKLES[(k * 2 + j) % SPRINKLES.length]);
        ctx.restore();
      }
      break;
    case 'salmon':
      circle(ctx, x, y, r * 1.38);
      fill(color);
      detail(() => {
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.lineWidth = r * 0.26;
        ctx.lineCap = 'round';
        for (const dy of [-0.3, 0.4]) {
          ctx.beginPath();
          ctx.moveTo(x - r, y + r * dy);
          ctx.quadraticCurveTo(x, y + r * (dy - 0.6), x + r, y + r * dy);
          ctx.stroke();
        }
      });
      break;
    case 'fish':
      ctx.beginPath();
      ctx.ellipse(x - r * 0.2, y, r * 1.08, r * 0.72, 0, 0, Math.PI * 2);
      fill(color);
      ctx.beginPath();
      ctx.moveTo(x + r * 0.7, y);
      ctx.lineTo(x + r * 1.55, y - r * 0.68);
      ctx.lineTo(x + r * 1.55, y + r * 0.68);
      ctx.closePath();
      fill(color);
      detail(() => {
        ctx.fillStyle = '#13304a';
        circle(ctx, x - r * 0.65, y - r * 0.15, r * 0.18);
        ctx.fill();
      });
      break;
    case 'flake':
      ctx.strokeStyle = solid ? '#fff' : color;
      ctx.lineWidth = r * 0.34;
      ctx.lineCap = 'round';
      for (const a of [0, 60, 120]) {
        const c = Math.cos((a * Math.PI) / 180);
        const s = Math.sin((a * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(x - r * 1.3 * c, y - r * 1.3 * s);
        ctx.lineTo(x + r * 1.3 * c, y + r * 1.3 * s);
        ctx.stroke();
        for (const end of [-1, 1]) {
          const ex = x + end * r * 0.85 * c;
          const ey = y + end * r * 0.85 * s;
          for (const side of [-1, 1]) {
            const b = ((a + side * 45) * Math.PI) / 180;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + end * r * 0.42 * Math.cos(b), ey + end * r * 0.42 * Math.sin(b));
            ctx.stroke();
          }
        }
      }
      circle(ctx, x, y, r * 0.38);
      fill(color);
      break;
    case 'tri':
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r * 1.15, y + r * 0.82);
      ctx.lineTo(x - r * 1.15, y + r * 0.82);
      ctx.closePath();
      fill(color);
      break;
    case 'star':
      star(ctx, x, y, r);
      fill(color);
      break;
    case 'heart':
      heart(ctx, x, y, r);
      fill(color);
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.32);
      ctx.lineTo(x + r * 1.02, y);
      ctx.lineTo(x, y + r * 1.32);
      ctx.lineTo(x - r * 1.02, y);
      ctx.closePath();
      fill(color);
      break;
    case 'square':
      ctx.beginPath();
      ctx.rect(x - r, y - r, r * 2, r * 2);
      fill(color);
      break;
    default:
      circle(ctx, x, y, r);
      fill(color);
  }
}

/* ---------------- motivi per le facce ---------------- */
// Ogni pittore riceve p = { c, h, e, S (lato in px), rnd, v (valore della faccia), it }
// c: colore (canvas 2D, coordinate 0..S) · h: rilievo (grigio 128 = piatto) · e: luce propria (nero = spenta)

const radial = (c, S, a, b, cx = 0.36, cy = 0.3) => {
  const g = c.createRadialGradient(S * cx, S * cy, S * 0.05, S * 0.5, S * 0.5, S * 0.78);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
};

const linear = (c, S, stops, angle = 135) => {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a) * S * 0.5;
  const dy = -Math.cos(a) * S * 0.5;
  const g = c.createLinearGradient(S / 2 - dx, S / 2 - dy, S / 2 + dx, S / 2 + dy);
  stops.forEach((col, i) => g.addColorStop(i / Math.max(1, stops.length - 1), col));
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
};

const stripes = (c, S, colors, width, angle = 45) => {
  c.save();
  c.translate(S / 2, S / 2);
  c.rotate((angle * Math.PI) / 180);
  const n = Math.ceil((S * 1.6) / width);
  for (let i = -n; i < n; i++) {
    c.fillStyle = colors[((i % colors.length) + colors.length) % colors.length];
    c.fillRect(i * width, -S, width + 0.6, S * 2);
  }
  c.restore();
};

const specks = (c, S, rnd, colors, count, rmin, rmax, alpha = 1) => {
  c.save();
  c.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    c.fillStyle = colors[i % colors.length];
    circle(c, rnd() * S, rnd() * S, rmin + rnd() * (rmax - rmin));
    c.fill();
  }
  c.restore();
};

const bumps = (h, S, rnd, count, rmin, rmax, up = true, alpha = 0.35) => {
  for (let i = 0; i < count; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = rmin + rnd() * (rmax - rmin);
    const g = h.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, up ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, up ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
    h.fillStyle = g;
    h.fillRect(x - r, y - r, r * 2, r * 2);
  }
};

const starsOn = (ctx, S, rnd, count, colors = ['#fff'], maxR = 1.6) => {
  for (let i = 0; i < count; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.4 + rnd() ** 3 * maxR * (S / 128);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.5 + rnd() * 0.5;
    circle(ctx, x, y, r);
    ctx.fill();
    if (r > 1.2 * (S / 128)) {
      ctx.fillRect(x - r * 3, y - 0.3, r * 6, 0.6);
      ctx.fillRect(x - 0.3, y - r * 3, 0.6, r * 6);
    }
  }
  ctx.globalAlpha = 1;
};

const nebula = (c, S, rnd, colors, count = 9, alpha = 0.45) => {
  for (let i = 0; i < count; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = S * (0.2 + rnd() * 0.35);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const col = colors[i % colors.length];
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = alpha;
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  }
  c.globalAlpha = 1;
};

function woodGrain(p, light, mid, dark, ringScale = 1) {
  const { c, h, S, rnd } = p;
  c.fillStyle = mid;
  c.fillRect(0, 0, S, S);
  const cx = -S * (0.3 + rnd() * 0.6);
  const cy = S * (0.2 + rnd() * 0.6);
  // anelli del tronco visti di taglio: linee curve
  for (let i = 0; i < 46; i++) {
    const r = (i * S * 0.055 + rnd() * 6) * ringScale;
    c.strokeStyle = i % 3 === 0 ? dark : light;
    c.globalAlpha = 0.25 + rnd() * 0.35;
    c.lineWidth = 1 + rnd() * (S / 70);
    c.beginPath();
    for (let a = -0.9; a <= 0.9; a += 0.05) {
      const wob = Math.sin(a * 9 + i) * (S / 90);
      c.lineTo(cx + Math.cos(a) * (r + wob) * 2.2, cy + Math.sin(a) * (r + wob));
    }
    c.stroke();
    h.strokeStyle = 'rgba(0,0,0,.12)';
    h.lineWidth = 1;
    h.stroke();
  }
  c.globalAlpha = 1;
  specks(c, S, rnd, [dark], 30, 0.3, 1.2, 0.35);
}

function marbleVeins(p, base, veins) {
  const { c, S, rnd } = p;
  c.fillStyle = base;
  c.fillRect(0, 0, S, S);
  nebula(c, S, rnd, ['#ffffff', '#e8e8ef'], 5, 0.5);
  for (let i = 0; i < 7; i++) {
    let x = rnd() * S;
    let y = -10;
    let a = Math.PI / 2 + (rnd() - 0.5) * 1.4;
    c.strokeStyle = veins[i % veins.length];
    c.globalAlpha = 0.25 + rnd() * 0.45;
    c.lineWidth = 0.6 + rnd() * (S / 90);
    c.beginPath();
    c.moveTo(x, y);
    while (y < S + 10 && x > -20 && x < S + 20) {
      a += (rnd() - 0.5) * 0.7;
      x += Math.cos(a) * 6;
      y += Math.abs(Math.sin(a)) * 6 + 1;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  c.globalAlpha = 1;
}

function cracks(p, color, glow, n = 9) {
  const { c, e, S, rnd } = p;
  for (const ctx of [c, e]) {
    if (!ctx) continue;
    ctx.strokeStyle = ctx === e ? glow : color;
    ctx.lineCap = 'round';
  }
  for (let i = 0; i < n; i++) {
    let x = rnd() * S;
    let y = rnd() * S;
    let a = rnd() * Math.PI * 2;
    const len = 6 + Math.floor(rnd() * 10);
    const pts = [[x, y]];
    for (let j = 0; j < len; j++) {
      a += (rnd() - 0.5) * 1.3;
      x += Math.cos(a) * S * 0.05;
      y += Math.sin(a) * S * 0.05;
      pts.push([x, y]);
    }
    for (const ctx of [c, e]) {
      if (!ctx) continue;
      ctx.lineWidth = (ctx === e ? 2.4 : 1.6) * (S / 128);
      ctx.beginPath();
      pts.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.stroke();
    }
  }
}

const P = {
  wood: (p) => woodGrain(p, '#e0a868', '#c98b4f', '#8a5426'),
  marble: (p) => marbleVeins(p, '#f6f6f9', ['#9aa0b2', '#c2c6d4', '#7d8396']),
  coal: (p) => {
    radial(p.c, p.S, '#4a4f63', '#23263a');
    specks(p.c, p.S, p.rnd, ['#6b7088', '#15172a'], 260, 0.3, 1.2, 0.6);
    bumps(p.h, p.S, p.rnd, 70, 2, 6, false, 0.25);
  },
  terracotta: (p) => {
    radial(p.c, p.S, '#eea27a', '#c8643a');
    specks(p.c, p.S, p.rnd, ['#a9512c', '#ffd2b4'], 240, 0.3, 1, 0.5);
    bumps(p.h, p.S, p.rnd, 120, 1, 3, false, 0.25);
  },
  lemon: (p) => {
    radial(p.c, p.S, '#fffbd0', '#ffe14a');
    bumps(p.h, p.S, p.rnd, 260, 1, 2.2, false, 0.18);
  },
  candy: (p) => {
    stripes(p.c, p.S, ['#ffffff', '#ff8fb4'], p.S / 8, 45);
  },
  denim: (p) => {
    const { c, h, S, rnd } = p;
    c.fillStyle = '#3f6fb0';
    c.fillRect(0, 0, S, S);
    for (let i = -S; i < S * 2; i += S / 64) {
      c.strokeStyle = rnd() > 0.5 ? 'rgba(160,190,235,.35)' : 'rgba(20,40,80,.35)';
      c.lineWidth = S / 128;
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + S, S);
      c.stroke();
      h.strokeStyle = 'rgba(255,255,255,.15)';
      h.lineWidth = S / 200;
      h.stroke();
    }
    specks(c, S, rnd, ['rgba(255,255,255,.4)'], 160, 0.3, 0.8, 0.5);
    // cucitura arancione lungo il bordo
    c.setLineDash([S / 30, S / 50]);
    c.strokeStyle = '#e8a34a';
    c.lineWidth = S / 90;
    c.strokeRect(S * 0.16, S * 0.16, S * 0.68, S * 0.68);
    c.setLineDash([]);
  },
  ocean: (p) => {
    linear(p.c, p.S, ['#5ee0ff', '#1b8fd6', '#0b4f8f'], 160);
    const { c, e, S, rnd } = p;
    for (let i = 0; i < 18; i++) {
      c.strokeStyle = 'rgba(200,250,255,.35)';
      c.lineWidth = 0.8 + rnd() * 1.4;
      c.beginPath();
      const y0 = rnd() * S;
      for (let x = -4; x <= S + 4; x += 4) c.lineTo(x, y0 + Math.sin(x / (S / 9) + i) * (S / 40));
      c.stroke();
    }
    nebula(e, S, rnd, ['rgba(80,200,255,.6)'], 3, 0.25);
  },
  choco: (p) => {
    radial(p.c, p.S, '#8f5f3d', '#4e2d18');
    const { h, S } = p;
    // quadretti della tavoletta
    h.strokeStyle = 'rgba(0,0,0,.35)';
    h.lineWidth = S / 40;
    h.strokeRect(S * 0.14, S * 0.14, S * 0.72, S * 0.72);
  },
  ice: (p) => {
    linear(p.c, p.S, ['rgba(235,250,255,.75)', 'rgba(150,215,255,.55)', 'rgba(220,245,255,.75)'], 140);
    specks(p.c, p.S, p.rnd, ['rgba(255,255,255,.9)'], 70, 0.4, 1.6, 0.7);
    bumps(p.h, p.S, p.rnd, 40, 4, 12, true, 0.18);
  },
  gem: (p) => {
    const cols = cssColors(p.it.face);
    linear(p.c, p.S, [cols[0], cols[1], cols[2] || cols[0]].map((x) => x), 140);
    // sfaccettature
    const { c, h, S, rnd } = p;
    for (let i = 0; i < 8; i++) {
      c.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)';
      c.beginPath();
      c.moveTo(S / 2, S / 2);
      const a = (i / 8) * Math.PI * 2;
      c.lineTo(S / 2 + Math.cos(a) * S, S / 2 + Math.sin(a) * S);
      c.lineTo(S / 2 + Math.cos(a + 0.785) * S, S / 2 + Math.sin(a + 0.785) * S);
      c.fill();
      h.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},.08)`;
      h.fill();
    }
  },
  gold: (p) => {
    linear(p.c, p.S, ['#fff0a0', '#ffcf33', '#e8a000', '#ffe27a'], 140);
    specks(p.c, p.S, p.rnd, ['rgba(255,255,255,.5)'], 30, 0.3, 0.8, 0.4);
  },
  galaxy: (p) => {
    const { c, e, S, rnd } = p;
    c.fillStyle = '#0b0626';
    c.fillRect(0, 0, S, S);
    nebula(c, S, rnd, ['#7a4dff', '#ff3dbb', '#2b0f6b', '#2fd0ff'], 10, 0.5);
    nebula(e, S, rnd, ['#5a2dff', '#ff2a9b'], 5, 0.35);
    starsOn(c, S, rnd, 120);
    starsOn(e, S, rnd, 60, ['#fff', '#cfe8ff']);
  },
  lava: (p) => {
    const { c, S, rnd } = p;
    radial(c, S, '#3a1208', '#140603');
    specks(c, S, rnd, ['#2a0c06', '#4a1a0c'], 200, 0.5, 2, 0.8);
    bumps(p.h, S, rnd, 90, 3, 9, true, 0.3);
    cracks(p, '#ff6a1a', '#ff7a1a', 11);
  },
  ghost: (p) => {
    radial(p.c, p.S, 'rgba(255,255,255,.85)', 'rgba(200,215,255,.45)');
    nebula(p.e, p.S, p.rnd, ['rgba(130,150,255,.5)'], 4, 0.4);
  },
  stars: (p) => {
    radial(p.c, p.S, '#2a3a7a', '#0f1638');
    starsOn(p.c, p.S, p.rnd, 70, ['#fff', '#ffe9a0']);
    starsOn(p.e, p.S, p.rnd, 40, ['#ffe9a0']);
  },
  pixel: (p) => {
    const { c, h, S } = p;
    const n = 8;
    const s = S / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        c.fillStyle = (i + j) % 2 ? '#7fd84f' : '#9cf06a';
        c.fillRect(i * s, j * s, s + 0.5, s + 0.5);
        h.fillStyle = 'rgba(0,0,0,.25)';
        h.fillRect(i * s + s - 1.5, j * s, 1.5, s);
        h.fillRect(i * s, j * s + s - 1.5, s, 1.5);
      }
  },
  holo: (p) => {
    linear(p.c, p.S, ['#ffd0f0', '#cdeeff', '#d9ffd0', '#fff8c8', '#ffd6c8', '#ead0ff'], 120);
    nebula(p.c, p.S, p.rnd, ['#ffffff'], 3, 0.35);
  },
  rainbow: (p) => {
    const { c, S } = p;
    const cols = ['#ff4d4d', '#ffa64d', '#ffe14d', '#59e36b', '#4db8ff', '#9b6bff'];
    cols.forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect((i * S) / cols.length, 0, S / cols.length + 1, S);
    });
    linear(c, S, ['rgba(255,255,255,.25)', 'rgba(255,255,255,0)', 'rgba(0,0,0,.12)'], 180);
  },
  diamond: (p) => {
    linear(p.c, p.S, ['rgba(255,255,255,.7)', 'rgba(223,244,255,.55)', 'rgba(255,255,255,.75)', 'rgba(233,226,255,.55)'], 135);
    P.gemFacets(p, 0.1);
  },
  gemFacets: (p, a = 0.12) => {
    const { c, h, S, rnd } = p;
    for (let i = 0; i < 10; i++) {
      c.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(120,160,255,${a * 0.6})`;
      c.beginPath();
      c.moveTo(rnd() * S, rnd() * S);
      c.lineTo(rnd() * S, rnd() * S);
      c.lineTo(rnd() * S, rnd() * S);
      c.fill();
      h.fillStyle = `rgba(255,255,255,${a * 0.5})`;
      h.fill();
    }
  },
  dragon: (p) => {
    const { c, h, e, S, rnd } = p;
    linear(c, S, ['#d81e24', '#8c0a10', '#5e0408'], 140);
    const s = S / 7;
    for (let row = -1; row < 9; row++)
      for (let col = -1; col < 9; col++) {
        const x = col * s + (row % 2 ? s / 2 : 0);
        const y = row * s * 0.7;
        const g = c.createRadialGradient(x, y - s * 0.2, 0, x, y, s * 0.62);
        g.addColorStop(0, 'rgba(255,120,80,.5)');
        g.addColorStop(0.8, 'rgba(120,0,10,.1)');
        g.addColorStop(1, 'rgba(40,0,0,.6)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, s * 0.6, 0, Math.PI);
        c.fill();
        const gh = h.createRadialGradient(x, y - s * 0.1, 0, x, y, s * 0.6);
        gh.addColorStop(0, 'rgba(255,255,255,.4)');
        gh.addColorStop(1, 'rgba(0,0,0,.35)');
        h.fillStyle = gh;
        h.beginPath();
        h.arc(x, y, s * 0.6, 0, Math.PI);
        h.fill();
        if (rnd() > 0.85) {
          e.fillStyle = 'rgba(255,90,20,.35)';
          e.beginPath();
          e.arc(x, y, s * 0.5, 0, Math.PI);
          e.fill();
        }
      }
  },
  cosmic: (p) => {
    linear(p.c, p.S, ['#ff3dbb', '#7a4dff', '#2fd0ff', '#56ff9e', '#ffe14d', '#ff3dbb'], 120);
    nebula(p.c, p.S, p.rnd, ['#ffffff', '#2b0f6b'], 4, 0.25);
    starsOn(p.e, p.S, p.rnd, 30);
    nebula(p.e, p.S, p.rnd, ['#7a4dff', '#ff3dbb'], 3, 0.25);
  },
  divine: (p) => {
    linear(p.c, p.S, ['#fffbe0', '#ffd84a', '#fff3a8', '#e09a00'], 140);
    const { c, S } = p;
    // raggi di luce incisi
    c.save();
    c.translate(S / 2, S / 2);
    for (let i = 0; i < 24; i++) {
      c.rotate(Math.PI / 12);
      c.fillStyle = i % 2 ? 'rgba(255,255,255,.18)' : 'rgba(200,120,0,.1)';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(S, -S * 0.07);
      c.lineTo(S, S * 0.07);
      c.fill();
    }
    c.restore();
  },
  sand: (p) => {
    radial(p.c, p.S, '#fff0cf', '#e3c288');
    specks(p.c, p.S, p.rnd, ['#c9a86a', '#fff6e0', '#b08a4e'], 900, 0.3, 0.9, 0.8);
    bumps(p.h, p.S, p.rnd, 500, 0.8, 2, true, 0.25);
  },
  cloud: (p) => {
    radial(p.c, p.S, '#ffffff', '#cfe4ff');
    const { c, h, S, rnd } = p;
    for (let i = 0; i < 14; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = S * (0.08 + rnd() * 0.12);
      const g = c.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    bumps(h, S, rnd, 26, S * 0.06, S * 0.14, true, 0.22);
  },
  popit: (p) => linear(p.c, p.S, ['#b39bff', '#a3c2f2', '#8fe3c6'], 135),
  popitRainbow: (p) => {
    const { c, S } = p;
    const cols = ['#ff8a8a', '#ffc46b', '#fff07b', '#86e39a', '#7bc8ff', '#c19bff'];
    cols.forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(0, (i * S) / cols.length, S, S / cols.length + 1);
    });
  },
  pizza: (p, gold = false) => {
    const { c, h, S, rnd } = p;
    if (gold) linear(c, S, ['#fff3a8', '#ffcf33', '#d98c00'], 140);
    else radial(c, S, '#f2643f', '#c8301f', 0.5, 0.5);
    // formaggio fuso a chiazze (in rilievo)
    for (let i = 0; i < 9; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = S * (0.08 + rnd() * 0.1);
      c.fillStyle = gold ? '#fff6c2' : '#ffe9a0';
      c.globalAlpha = 0.95;
      c.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.4) {
        const rr = r * (0.75 + rnd() * 0.4);
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.fill();
      h.fillStyle = 'rgba(255,255,255,.35)';
      h.fill();
    }
    c.globalAlpha = 1;
    if (!gold) {
      // basilico
      for (let i = 0; i < 2; i++) {
        c.fillStyle = '#2f8a3a';
        c.beginPath();
        c.ellipse(rnd() * S, rnd() * S, S * 0.06, S * 0.03, rnd() * 3, 0, Math.PI * 2);
        c.fill();
      }
      specks(c, S, rnd, ['#2a6a2a'], 30, 0.4, 1, 0.6);
    }
  },
  watermelon: (p) => {
    radial(p.c, p.S, '#ff8a98', '#e8384f', 0.45, 0.4);
    specks(p.c, p.S, p.rnd, ['rgba(255,255,255,.35)'], 60, 0.4, 1.4, 0.5);
    bumps(p.h, p.S, p.rnd, 80, 2, 5, false, 0.15);
  },
  cookie: (p) => {
    radial(p.c, p.S, '#f0c98a', '#cf9450', 0.4, 0.35);
    specks(p.c, p.S, p.rnd, ['#b8854a', '#fff0c8', '#9a6a32'], 260, 0.4, 1.4, 0.7);
    bumps(p.h, p.S, p.rnd, 160, 1, 5, p.rnd() > 0.5, 0.3);
    bumps(p.h, p.S, p.rnd, 80, 2, 6, false, 0.3);
  },
  cheese: (p) => {
    radial(p.c, p.S, '#fff2a8', '#ffcf3a');
    // buchetti piccoli oltre ai punti
    const { c, h, S, rnd } = p;
    for (let i = 0; i < 6; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = S * (0.015 + rnd() * 0.03);
      c.fillStyle = '#eab400';
      circle(c, x, y, r);
      c.fill();
      h.fillStyle = 'rgba(0,0,0,.6)';
      circle(h, x, y, r);
      h.fill();
    }
  },
  bamboo: (p) => {
    const { c, h, S } = p;
    for (let i = 0; i < 6; i++) {
      const x = (i * S) / 6;
      const g = c.createLinearGradient(x, 0, x + S / 6, 0);
      g.addColorStop(0, '#a2c955');
      g.addColorStop(0.5, '#cfe88a');
      g.addColorStop(1, '#93ba48');
      c.fillStyle = g;
      c.fillRect(x, 0, S / 6 + 1, S);
      h.fillStyle = 'rgba(0,0,0,.25)';
      h.fillRect(x, 0, S / 90, S);
    }
    for (const y of [0.3, 0.72]) {
      c.fillStyle = '#86a83c';
      c.fillRect(0, S * y, S, S / 40);
      h.fillStyle = 'rgba(255,255,255,.5)';
      h.fillRect(0, S * y, S, S / 40);
    }
  },
  duck: (p) => radial(p.c, p.S, '#fff4a0', '#ffcf10'),
  soccer: (p) => {
    const { c, h, S } = p;
    c.fillStyle = '#fafafa';
    c.fillRect(0, 0, S, S);
    const poly = (ctx, x, y, r, n, rot) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
    };
    // cuciture esagonali del pallone e pentagoni neri sugli spigoli
    h.strokeStyle = 'rgba(0,0,0,.35)';
    c.strokeStyle = 'rgba(0,0,0,.12)';
    h.lineWidth = c.lineWidth = S / 120;
    const R = S * 0.16;
    for (let row = -1; row < 5; row++)
      for (let col = -1; col < 5; col++) {
        const x = col * R * 1.73 + (row % 2 ? R * 0.87 : 0);
        const y = row * R * 1.5;
        for (const ctx of [c, h]) {
          poly(ctx, x, y, R, 6, Math.PI / 6);
          ctx.stroke();
        }
      }
    for (const [x, y] of [[0, 0], [S, 0], [0, S], [S, S], [S / 2, -S * 0.02], [S / 2, S * 1.02], [-S * 0.02, S / 2], [S * 1.02, S / 2]]) {
      poly(c, x, y, S * 0.1, 5, 0.3);
      c.fillStyle = '#23232c';
      c.fill();
    }
  },
  donut: (p) => {
    radial(p.c, p.S, '#ffc0dd', '#ff6fa8');
    linear(p.c, p.S, ['rgba(255,255,255,.18)', 'rgba(255,255,255,0)'], 160);
  },
  sushi: (p) => {
    radial(p.c, p.S, '#ffffff', '#efe9d8', 0.5, 0.5);
    const { c, h, S, rnd } = p;
    for (let i = 0; i < 140; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      c.fillStyle = rnd() > 0.5 ? '#fbf8ef' : '#e4ddca';
      c.beginPath();
      c.ellipse(x, y, S * 0.02, S * 0.01, rnd() * 3, 0, Math.PI * 2);
      c.fill();
      h.fillStyle = 'rgba(255,255,255,.35)';
      h.beginPath();
      h.ellipse(x, y, S * 0.02, S * 0.011, rnd() * 3, 0, Math.PI * 2);
      h.fill();
    }
  },
  musical: (p) => {
    const { c, h, S } = p;
    for (let i = 0; i < 7; i++) {
      c.fillStyle = '#fbfbff';
      c.fillRect((i * S) / 7, 0, S / 7, S);
      c.fillStyle = '#c9c9d6';
      c.fillRect(((i + 1) * S) / 7 - 1, 0, 1.5, S);
      h.fillStyle = 'rgba(0,0,0,.4)';
      h.fillRect(((i + 1) * S) / 7 - 1, 0, 1.5, S);
    }
    for (const i of [1, 2, 4, 5, 6]) {
      c.fillStyle = '#1b1b2a';
      c.fillRect((i * S) / 7 - S / 28, 0, S / 14, S * 0.36);
      h.fillStyle = 'rgba(255,255,255,.5)';
      h.fillRect((i * S) / 7 - S / 28, 0, S / 14, S * 0.36);
    }
  },
  gummy: (p) => radial(p.c, p.S, 'rgba(255,170,185,.75)', 'rgba(215,30,70,.82)'),
  paw: (p) => {
    radial(p.c, p.S, '#ffffff', '#f6e3ea');
    specks(p.c, p.S, p.rnd, ['rgba(255,220,230,.6)'], 300, 0.4, 1, 0.5);
  },
  money: (p) => {
    linear(p.c, p.S, ['#cdeec0', '#9bd98a', '#6cbf5a'], 135);
    const { c, S } = p;
    c.strokeStyle = 'rgba(30,100,40,.25)';
    c.lineWidth = 0.8;
    for (let i = 0; i < 20; i++) {
      c.beginPath();
      for (let x = 0; x <= S; x += 3) c.lineTo(x, S * 0.5 + Math.sin(x / (S / 12) + i * 0.5) * S * (0.05 + i * 0.02));
      c.stroke();
    }
    c.strokeStyle = 'rgba(30,100,40,.5)';
    c.lineWidth = S / 60;
    c.strokeRect(S * 0.15, S * 0.15, S * 0.7, S * 0.7);
  },
  arcade: (p) => {
    const { c, e, S } = p;
    c.fillStyle = '#14102a';
    c.fillRect(0, 0, S, S);
    for (let i = 0; i <= 6; i++) {
      for (const [ctx, col] of [[c, '#ff3df2'], [e, '#ff3df2']]) {
        ctx.fillStyle = col;
        ctx.globalAlpha = ctx === e ? 0.55 : 0.6;
        ctx.fillRect((i * S) / 6, 0, 1.2, S);
      }
      for (const [ctx, col] of [[c, '#20e3ff'], [e, '#20e3ff']]) {
        ctx.fillStyle = col;
        ctx.globalAlpha = ctx === e ? 0.55 : 0.6;
        ctx.fillRect(0, (i * S) / 6, S, 1.2);
      }
    }
    c.globalAlpha = 1;
    e.globalAlpha = 1;
  },
  slime: (p) => {
    radial(p.c, p.S, 'rgba(230,255,180,.8)', 'rgba(70,170,30,.82)');
    bumps(p.h, p.S, p.rnd, 18, 6, 16, true, 0.25);
    specks(p.c, p.S, p.rnd, ['rgba(255,255,255,.5)'], 20, 1, 3, 0.6);
  },
  drum: (p) => {
    const { c, h, S } = p;
    c.fillStyle = '#c4102a';
    c.fillRect(0, 0, S, S);
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.46);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.9, '#f1f1f5');
    g.addColorStop(1, '#d4d4de');
    c.fillStyle = g;
    circle(c, S / 2, S / 2, S * 0.44);
    c.fill();
    c.strokeStyle = '#dcdce6';
    c.lineWidth = S / 26;
    circle(c, S / 2, S / 2, S * 0.455);
    c.stroke();
    h.strokeStyle = 'rgba(255,255,255,.6)';
    h.lineWidth = S / 26;
    circle(h, S / 2, S / 2, S * 0.455);
    h.stroke();
    // tiranti metallici
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.39;
      c.fillStyle = '#e8e8f0';
      circle(c, S / 2 + Math.cos(a) * S * 0.47, S / 2 + Math.sin(a) * S * 0.47, S * 0.025);
      c.fill();
    }
  },
  aquarium: (p) => {
    const { c, S, rnd } = p;
    linear(c, S, ['rgba(160,235,255,.7)', 'rgba(40,150,220,.7)'], 180);
    c.fillStyle = '#e8c98f';
    c.beginPath();
    c.moveTo(0, S * 0.8);
    for (let x = 0; x <= S; x += 8) c.lineTo(x, S * 0.78 + Math.sin(x / 14) * 3);
    c.lineTo(S, S);
    c.lineTo(0, S);
    c.fill();
    c.strokeStyle = '#2fae5a';
    c.lineWidth = S / 50;
    for (let i = 0; i < 3; i++) {
      const x = rnd() * S;
      c.beginPath();
      c.moveTo(x, S * 0.82);
      c.quadraticCurveTo(x + 10, S * 0.6, x - 4, S * 0.45);
      c.stroke();
    }
    specks(c, S, rnd, ['rgba(255,255,255,.7)'], 14, 1, 3, 0.8);
  },
  synthwave: (p) => {
    const { c, e, S } = p;
    linear(c, S, ['#2b0f55', '#7a1f6a', '#c2306f'], 180);
    // sole a strisce
    const sun = c.createLinearGradient(0, S * 0.25, 0, S * 0.62);
    sun.addColorStop(0, '#ffe14d');
    sun.addColorStop(1, '#ff3dbb');
    c.fillStyle = sun;
    c.beginPath();
    c.arc(S / 2, S * 0.55, S * 0.3, Math.PI, 0);
    c.fill();
    e.fillStyle = 'rgba(255,90,140,.45)';
    e.beginPath();
    e.arc(S / 2, S * 0.55, S * 0.3, Math.PI, 0);
    e.fill();
    c.fillStyle = '#2b0f55';
    for (let i = 0; i < 4; i++) c.fillRect(0, S * (0.42 + i * 0.035), S, S * (0.006 + i * 0.004));
    c.fillStyle = '#1a0838';
    c.fillRect(0, S * 0.56, S, S * 0.44);
    e.strokeStyle = '#ff3dbb';
    c.strokeStyle = '#ff3dbb';
    for (const ctx of [c, e]) {
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const y = S * 0.56 + (i / 5) ** 1.7 * S * 0.44;
        ctx.moveTo(0, y);
        ctx.lineTo(S, y);
        ctx.stroke();
      }
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(S / 2 + i * S * 0.04, S * 0.56);
        ctx.lineTo(S / 2 + i * S * 0.22, S);
        ctx.stroke();
      }
    }
  },
  snowflake: (p) => {
    radial(p.c, p.S, '#ffffff', '#cfeaff');
    specks(p.c, p.S, p.rnd, ['rgba(255,255,255,1)', 'rgba(180,220,255,.8)'], 120, 0.3, 1, 0.8);
    bumps(p.h, p.S, p.rnd, 140, 1, 3, true, 0.2);
  },
  pumpkin: (p) => {
    const { c, h, S } = p;
    radial(c, S, '#f08a1e', '#c4560a', 0.45, 0.4);
    for (let i = 1; i < 6; i++) {
      const x = (i * S) / 6;
      const g = c.createLinearGradient(x - S / 20, 0, x + S / 20, 0);
      g.addColorStop(0, 'rgba(160,60,0,0)');
      g.addColorStop(0.5, 'rgba(160,60,0,.35)');
      g.addColorStop(1, 'rgba(160,60,0,0)');
      c.fillStyle = g;
      c.fillRect(x - S / 20, 0, S / 10, S);
      const gh = h.createLinearGradient(x - S / 12, 0, x + S / 12, 0);
      gh.addColorStop(0, 'rgba(0,0,0,0)');
      gh.addColorStop(0.5, 'rgba(0,0,0,.5)');
      gh.addColorStop(1, 'rgba(0,0,0,0)');
      h.fillStyle = gh;
      h.fillRect(x - S / 12, 0, S / 6, S);
    }
  },
  planet: (p) => {
    const { c, S, rnd } = p;
    const bands = ['#ffe2b8', '#e8a46a', '#c4723a', '#f5c48c', '#a4552a', '#e9b07a', '#6a2f10'];
    let y = 0;
    while (y < S) {
      const hgt = S * (0.05 + rnd() * 0.12);
      c.fillStyle = bands[Math.floor(rnd() * bands.length)];
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= S; x += 6) c.lineTo(x, y + Math.sin(x / (S / 5) + y) * 2);
      c.lineTo(S, y + hgt + 2);
      c.lineTo(0, y + hgt + 2);
      c.fill();
      y += hgt;
    }
    c.fillStyle = 'rgba(200,80,40,.7)';
    c.beginPath();
    c.ellipse(S * 0.7, S * 0.62, S * 0.09, S * 0.05, 0, 0, Math.PI * 2);
    c.fill();
  },
  storm: (p) => {
    const { c, e, S, rnd } = p;
    linear(c, S, ['#4a5578', '#2a3150', '#1b2033'], 180);
    nebula(c, S, rnd, ['#6a7598', '#141828'], 10, 0.45);
    // fulmine
    const bolt = [[0.62, 0.02], [0.44, 0.4], [0.58, 0.42], [0.36, 0.98], [0.66, 0.36], [0.5, 0.34], [0.7, 0.02]];
    for (const ctx of [c, e]) {
      ctx.fillStyle = ctx === e ? 'rgba(255,240,120,.8)' : '#fff3a0';
      ctx.beginPath();
      bolt.forEach(([x, y]) => ctx.lineTo(x * S, y * S));
      ctx.closePath();
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  cat: (p) => {
    const { c, h, S, rnd } = p;
    radial(c, S, '#ffbe6a', '#f08a2a');
    for (let i = 0; i < 9; i++) {
      const y = (i / 9) * S + rnd() * 6;
      c.fillStyle = 'rgba(200,90,20,.6)';
      c.beginPath();
      c.moveTo(-5, y);
      c.quadraticCurveTo(S * 0.3, y + 6, S * (0.35 + rnd() * 0.3), y + 2);
      c.quadraticCurveTo(S * 0.3, y + 10, -5, y + 8);
      c.fill();
      c.beginPath();
      c.moveTo(S + 5, y + 4);
      c.quadraticCurveTo(S * 0.7, y + 10, S * (0.65 - rnd() * 0.25), y + 6);
      c.quadraticCurveTo(S * 0.7, y + 14, S + 5, y + 12);
      c.fill();
    }
    // pelo
    c.strokeStyle = 'rgba(255,230,190,.35)';
    c.lineWidth = 0.6;
    for (let i = 0; i < 500; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 2, y + 3);
      c.stroke();
    }
    bumps(h, S, rnd, 300, 0.6, 1.4, true, 0.15);
  },
  geode: (p) => {
    const { c, h, S, rnd } = p;
    const pts = Array.from({ length: 28 }, () => [rnd() * S, rnd() * S]);
    const cols = ['#5a2a9a', '#b38bff', '#3b1d8f', '#e0c8ff', '#7a4dff', '#9a6bff'];
    // getImageData/putImageData ignorano la traslazione: uso la posizione della cella
    const { e: x0, f: y0 } = c.getTransform();
    const img = c.getImageData(x0, y0, S, S);
    const hi = h.getImageData(x0, y0, S, S);
    const rgb = cols.map((col) => [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)]);
    const pc = pts.map((_, i) => rgb[i % rgb.length]);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        let best = 1e9;
        let second = 1e9;
        let bi = 0;
        for (let i = 0; i < pts.length; i++) {
          const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2;
          if (d < best) {
            second = best;
            best = d;
            bi = i;
          } else if (d < second) second = d;
        }
        const edge = Math.sqrt(second) - Math.sqrt(best);
        const o = (y * S + x) * 4;
        const k = Math.min(1, edge / 3);
        img.data[o] = pc[bi][0] * (0.6 + 0.4 * k);
        img.data[o + 1] = pc[bi][1] * (0.6 + 0.4 * k);
        img.data[o + 2] = pc[bi][2] * (0.6 + 0.4 * k);
        img.data[o + 3] = 255;
        const hv = 128 + Math.min(60, edge * 6) - 30;
        hi.data[o] = hi.data[o + 1] = hi.data[o + 2] = hv;
        hi.data[o + 3] = 255;
      }
    c.putImageData(img, x0, y0);
    h.putImageData(hi, x0, y0);
  },
  lavalamp: (p) => {
    const { c, e, S, rnd } = p;
    linear(c, S, ['rgba(110,20,80,.8)', 'rgba(50,12,50,.85)'], 180);
    for (let i = 0; i < 4; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = S * (0.1 + rnd() * 0.12);
      for (const ctx of [c, e]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, i % 2 ? '#ffb02e' : '#ff5a3c');
        g.addColorStop(0.7, i % 2 ? 'rgba(255,150,40,.8)' : 'rgba(255,80,50,.8)');
        g.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = ctx === e ? 0.7 : 1;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
    }
  },
  hologram: (p) => {
    const { c, e, S } = p;
    linear(c, S, ['rgba(32,227,255,.45)', 'rgba(122,77,255,.38)'], 135);
    for (let y = 0; y < S; y += S / 40) {
      c.fillStyle = 'rgba(168,255,247,.28)';
      c.fillRect(0, y, S, S / 100);
      e.fillStyle = 'rgba(100,240,255,.35)';
      e.fillRect(0, y, S, S / 100);
    }
    e.strokeStyle = 'rgba(120,250,255,.7)';
    e.lineWidth = S / 70;
    e.strokeRect(S * 0.12, S * 0.12, S * 0.76, S * 0.76);
  },
  piano: (p) => {
    linear(p.c, p.S, ['#3a3a46', '#0f0f16', '#22222c'], 160);
    p.c.strokeStyle = 'rgba(255,207,51,.6)';
    p.c.lineWidth = p.S / 80;
    p.c.strokeRect(p.S * 0.14, p.S * 0.14, p.S * 0.72, p.S * 0.72);
  },
  aurora: (p) => {
    const { c, e, S, rnd } = p;
    linear(c, S, ['#0b1a3a', '#0e2448', '#0b1a3a'], 180);
    starsOn(c, S, rnd, 60);
    for (let i = 0; i < 5; i++) {
      const col = ['#56ff9e', '#2fd0aa', '#7a4dff', '#9dffcf', '#b38bff'][i];
      for (const ctx of [c, e]) {
        ctx.strokeStyle = col;
        ctx.globalAlpha = ctx === e ? 0.35 : 0.45;
        ctx.lineWidth = S * (0.04 + rnd() * 0.06);
        ctx.beginPath();
        const y0 = S * (0.15 + i * 0.13);
        for (let x = -10; x <= S + 10; x += 6) ctx.lineTo(x, y0 + Math.sin(x / (S / 4) + i * 1.3) * S * 0.08);
        ctx.stroke();
      }
    }
    c.globalAlpha = 1;
    e.globalAlpha = 1;
  },
  crystalheart: (p) => {
    linear(p.c, p.S, ['rgba(255,224,240,.75)', 'rgba(255,156,208,.65)', 'rgba(255,255,255,.75)', 'rgba(255,111,184,.7)'], 135);
    P.gemFacets(p, 0.14);
  },
  dj: (p) => {
    const { c, e, S, rnd } = p;
    radial(c, S, '#2b1050', '#07060f', 0.5, 0.3);
    // equalizzatore in basso
    for (let i = 0; i < 9; i++) {
      const hgt = S * (0.08 + rnd() * 0.22);
      const x = S * 0.08 + i * S * 0.095;
      for (const ctx of [c, e]) {
        const g = ctx.createLinearGradient(0, S - hgt, 0, S);
        g.addColorStop(0, '#ff3df2');
        g.addColorStop(1, '#20e3ff');
        ctx.fillStyle = g;
        ctx.globalAlpha = ctx === e ? 0.7 : 1;
        ctx.fillRect(x, S * 0.95 - hgt, S * 0.06, hgt);
      }
    }
    c.globalAlpha = 1;
    e.globalAlpha = 1;
  },
  blackhole: (p) => {
    const { c, e, S } = p;
    c.fillStyle = '#000';
    c.fillRect(0, 0, S, S);
    for (const ctx of [c, e]) {
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 8;
        const r = S * 0.12 + (i / 90) * S * 0.42;
        ctx.strokeStyle = i % 3 ? '#ff7a1a' : '#7a4dff';
        ctx.globalAlpha = (ctx === e ? 0.5 : 0.8) * (1 - i / 110);
        ctx.lineWidth = S / 70;
        ctx.beginPath();
        ctx.arc(S / 2, S / 2, r, a, a + 0.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    c.fillStyle = '#000';
    circle(c, S / 2, S / 2, S * 0.13);
    c.fill();
  },
  unicorn: (p) => {
    linear(p.c, p.S, ['#ffd1f0', '#d1e8ff', '#d9ffd1', '#fff6c8', '#ffd1f0'], 135);
    starsOn(p.c, p.S, p.rnd, 50, ['#fff', '#ffe9f8']);
    nebula(p.e, p.S, p.rnd, ['rgba(255,200,240,.5)', 'rgba(200,230,255,.5)'], 4, 0.25);
  },
  phoenix: (p) => {
    const { c, e, S, rnd } = p;
    linear(c, S, ['#ffe14d', '#ff9f1a', '#ff2a00'], 0);
    linear(e, S, ['#ffd23f', '#ff7a1a', '#ff2a00'], 0);
    // piume di fuoco
    for (let i = 0; i < 12; i++) {
      const x = rnd() * S;
      const y = S * (0.3 + rnd() * 0.7);
      for (const ctx of [c, e]) {
        ctx.fillStyle = i % 2 ? 'rgba(255,240,180,.5)' : 'rgba(200,20,0,.4)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - S * 0.08, y - S * 0.15, x, y - S * 0.3);
        ctx.quadraticCurveTo(x + S * 0.08, y - S * 0.15, x, y);
        ctx.fill();
      }
    }
  },
  infinity: (p) => {
    const { c, e, S } = p;
    const g = c.createConicGradient ? c.createConicGradient(0, S / 2, S / 2) : null;
    if (g) {
      ['#ff3dbb', '#7a4dff', '#2fd0ff', '#56ff9e', '#ffe14d', '#ff3dbb'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
    } else linear(c, S, ['#ff3dbb', '#7a4dff', '#2fd0ff', '#56ff9e', '#ffe14d'], 120);
    e.strokeStyle = 'rgba(255,255,255,.6)';
    e.lineWidth = S / 40;
    e.beginPath();
    for (let t = 0; t <= Math.PI * 2 + 0.05; t += 0.05) {
      const d = 1 + Math.sin(t) ** 2;
      e.lineTo(S / 2 + (S * 0.36 * Math.cos(t)) / d, S / 2 + (S * 0.36 * Math.sin(t) * Math.cos(t)) / d);
    }
    e.stroke();
  },
  disco: (p) => {
    const { c, h, S, rnd } = p;
    const n = 10;
    const s = S / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 190 + Math.floor(rnd() * 60);
        c.fillStyle = `rgb(${v},${v + 4 > 255 ? 255 : v + 4},${Math.min(255, v + 12)})`;
        c.fillRect(i * s, j * s, s, s);
        h.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rnd() * 0.1})`;
        h.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
        h.fillStyle = 'rgba(0,0,0,.5)';
        h.fillRect(i * s, j * s, s, 1);
        h.fillRect(i * s, j * s, 1, s);
      }
  },
  tnt: (p) => {
    const { c, h, S } = p;
    for (let i = 0; i < 4; i++) {
      const x = (i * S) / 4;
      const g = c.createLinearGradient(x, 0, x + S / 4, 0);
      g.addColorStop(0, '#9a1424');
      g.addColorStop(0.45, '#e2333f');
      g.addColorStop(1, '#8a0f1e');
      c.fillStyle = g;
      c.fillRect(x, 0, S / 4 + 1, S);
      const gh = h.createLinearGradient(x, 0, x + S / 4, 0);
      gh.addColorStop(0, 'rgba(0,0,0,.45)');
      gh.addColorStop(0.5, 'rgba(255,255,255,.3)');
      gh.addColorStop(1, 'rgba(0,0,0,.45)');
      h.fillStyle = gh;
      h.fillRect(x, 0, S / 4, S);
    }
    // nastro con la scritta
    c.fillStyle = '#f4e3b0';
    c.fillRect(0, S * 0.42, S, S * 0.16);
    c.fillStyle = '#2a1408';
    c.font = `800 ${S * 0.12}px Fredoka, Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('TNT', S / 2, S * 0.505);
  },
  cosmiccat: (p) => {
    const { c, e, S, rnd } = p;
    radial(c, S, '#8f5bff', '#1a0c4a', 0.3, 0.3);
    nebula(c, S, rnd, ['#ff5ad0', '#2fd0ff'], 4, 0.3);
    starsOn(c, S, rnd, 80);
    starsOn(e, S, rnd, 40, ['#ffd1f0', '#fff']);
  },
  tsunami: (p) => {
    const { c, S, rnd } = p;
    linear(c, S, ['#e6fbff', '#5fd3ff', '#1b8fd6', '#0b3f7a'], 180);
    for (let i = 0; i < 6; i++) {
      const y = S * (0.15 + i * 0.14);
      c.strokeStyle = 'rgba(255,255,255,.6)';
      c.lineWidth = S / 50;
      c.beginPath();
      for (let x = -4; x <= S + 4; x += 4) c.lineTo(x, y + Math.sin(x / (S / 6) + i) * S * 0.03);
      c.stroke();
    }
    specks(c, S, rnd, ['rgba(255,255,255,.85)'], 40, 0.6, 2, 0.8);
  },
  party: (p) => {
    const { c, h, S, rnd } = p;
    radial(c, S, '#fffdf6', '#fff1d6');
    const cols = ['#ff3d7f', '#ffd23f', '#2fd0ff', '#56ff9e', '#a54dff'];
    for (let i = 0; i < 40; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      c.save();
      c.translate(x, y);
      c.rotate(rnd() * 3);
      c.fillStyle = cols[i % cols.length];
      if (i % 3) c.fillRect(-S * 0.025, -S * 0.01, S * 0.05, S * 0.02);
      else {
        circle(c, 0, 0, S * 0.018);
        c.fill();
      }
      c.restore();
      h.fillStyle = 'rgba(255,255,255,.25)';
      circle(h, x, y, S * 0.02);
      h.fill();
    }
  },
};

/* ---------------- materiali ---------------- */
// rough/metal/clearcoat… valgono per la faccia; pip* per i punti.
const MAT = {
  plastic: { roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.12 },
  satin: { roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.25 },
  candy: { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 },
  matte: { roughness: 0.75, clearcoat: 0 },
  stone: { roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.1 },
  wood: { roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.28 },
  fabric: { roughness: 0.9, sheen: 1, sheenRoughness: 0.6, clearcoat: 0 },
  silicone: { roughness: 0.58, sheen: 0.5, sheenRoughness: 0.5, clearcoat: 0.1 },
  rubber: { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  food: { roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.4 },
  metal: { roughness: 0.22, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.1, pipMetal: 0, pipRough: 0.45 },
  mirror: { roughness: 0.12, metalness: 1, clearcoat: 0.2, pipMetal: 0, pipRough: 0.3 },
  gem: { roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, ior: 2.2, iridescence: 0.35, alpha: 0.62, core: 'crystal' },
  glass: { roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, alpha: 0.5 },
  jelly: { roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, ior: 1.4, alpha: 0.72, core: 'soft' },
  lacquer: { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 },
  rock: { roughness: 0.92, clearcoat: 0 },
  holo: { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.6 },
};

/** Specifiche 3D per skin (le altre derivano dal catalogo). */
const SPEC = {
  classic: { base: ['#ffffff', '#e8e8f0'], mat: 'plastic' },
  ivory: { mat: 'satin', paint: (p) => (radial(p.c, p.S, '#fffaf0', '#ecdab4'), specks(p.c, p.S, p.rnd, ['rgba(160,120,60,.25)'], 80, 0.3, 1, 0.5)) },
  mint: { base: ['#ecfff7', '#93e3bd'], mat: 'candy' },
  peach: { base: ['#fff3ea', '#ffb08a'], mat: 'candy' },
  sky: { base: ['#f0f9ff', '#86c5ff'], mat: 'plastic' },
  lavender: { base: ['#f7f1ff', '#bf9dff'], mat: 'plastic' },
  coal: { paint: P.coal, mat: 'rock', mat2: { roughness: 0.62 } },
  lemon: { paint: P.lemon, mat: 'satin' },
  wood: { paint: P.wood, mat: 'wood', pipMode: 'engrave' },
  marble: { paint: P.marble, mat: 'stone' },
  candy: { paint: P.candy, mat: 'candy' },
  tomato: { base: ['#ff8a7a', '#de2c26'], mat: 'candy' },
  pistachio: { base: ['#ecf8cf', '#a2cf62'], mat: 'matte', mat2: { roughness: 0.55 } },
  denim: { paint: P.denim, mat: 'fabric', sheenColor: '#9ec0ff', pipMode: 'flat' },
  terracotta: { paint: P.terracotta, mat: 'rock', mat2: { roughness: 0.82 } },
  neon: { base: ['#2f374c', '#121624'], mat: 'satin', pipGlow: '#5dff9c', fx: 'pulse' },
  ocean: { paint: P.ocean, mat: 'candy', fx: 'pulse' },
  choco: { paint: P.choco, mat: 'satin', pipMode: 'raised' },
  ice: { paint: P.ice, mat: 'glass', core: 'soft', coreColor: '#bfe8ff', fx: 'sparkle' },
  ruby: { paint: P.gem, mat: 'gem', coreColor: '#ff2a55', pipGlow: null },
  emerald: { paint: P.gem, mat: 'gem', coreColor: '#18c070' },
  sapphire: { paint: P.gem, mat: 'gem', coreColor: '#2b62ff' },
  hearts: { base: ['#fff3f8', '#ffaccd'], mat: 'candy' },
  gold: { paint: P.gold, mat: 'metal', color: '#ffd04a', fx: 'shine' },
  galaxy: { paint: P.galaxy, mat: 'lacquer', pipGlow: '#ffffff', fx: 'pulse' },
  lava: { paint: P.lava, mat: 'rock', pipGlow: '#ffb02e', fx: 'lava' },
  ghost: { paint: P.ghost, mat: 'glass', alpha: 0.55, core: 'soft', coreColor: '#c8d4ff', fx: 'ghost' },
  stars: { paint: P.stars, mat: 'lacquer', pipGlow: '#ffd94a' },
  pixel: { paint: P.pixel, mat: 'satin', pipMode: 'raised' },
  holo: { paint: P.holo, mat: 'holo', fx: 'iris' },
  rainbow: { paint: P.rainbow, mat: 'holo', mat2: { iridescence: 0.45 }, fx: 'iris' },
  diamond: { paint: P.diamond, mat: 'gem', coreColor: '#e8f6ff', mat2: { iridescence: 0.7 }, fx: 'sparkle' },
  dragon: { paint: P.dragon, mat: 'satin', pipMetal: true, pipColor: '#ffcf33', fx: 'embers' },
  cosmic: { paint: P.cosmic, mat: 'holo', pipGlow: '#ffffff', fx: 'halo', haloColor: '#b38bff' },
  divine: { paint: P.divine, mat: 'metal', color: '#ffe27a', pipGlow: '#ffffff', fx: 'halo', haloColor: '#ffe9a0' },
  bubblegum: { base: ['#ffe7f3', '#ff94c4'], mat: 'rubber' },
  sand: { paint: P.sand, mat: 'rock', mat2: { roughness: 0.95 } },
  cloud: { paint: P.cloud, mat: 'silicone', sheenColor: '#dfeeff', mat2: { roughness: 0.7, sheen: 0.25 } },
  popit: { paint: P.popit, mat: 'silicone', pipMode: 'bubble', pipColor: '#a98cff' },
  pizza: { paint: (p) => P.pizza(p), mat: 'food', ring: ['#f0be72', '#c98a3e'], pipMode: 'raised' },
  watermelon: { paint: P.watermelon, mat: 'candy', ring: ['#f6ffe9', '#3fae4a', '#2a8a36'], pipMode: 'raised' },
  cookie: { paint: P.cookie, mat: 'food', mat2: { roughness: 0.85 }, pipMode: 'raised' },
  cheese: { paint: P.cheese, mat: 'satin', pipMode: 'deep' },
  bamboo: { paint: P.bamboo, mat: 'wood', pipMode: 'engrave' },
  duck: { paint: P.duck, mat: 'rubber' },
  soccer: { paint: P.soccer, mat: 'satin' },
  donut: { paint: P.donut, mat: 'candy', ring: ['#f3c48a', '#d99a5a'], pipMode: 'raised' },
  sushi: { paint: P.sushi, mat: 'food', ring: ['#2a4a35', '#14281c'], pipMode: 'raised' },
  musical: { paint: P.musical, mat: 'lacquer' },
  popit_rainbow: { paint: P.popitRainbow, mat: 'silicone', pipMode: 'bubble', pipColor: 'face' },
  gummy: { paint: P.gummy, mat: 'jelly', coreColor: '#d0203f', fx: 'wobble' },
  paw: { paint: P.paw, mat: 'fabric', sheenColor: '#ffe0ea', mat2: { sheen: 0.4 } },
  money: { paint: P.money, mat: 'matte', mat2: { roughness: 0.7 } },
  arcade: { paint: P.arcade, mat: 'satin', pipGlow: '#ff3df2', fx: 'pulse' },
  slime: { paint: P.slime, mat: 'jelly', coreColor: '#3fa31a', fx: 'wobble' },
  drum: { paint: P.drum, mat: 'satin' },
  aquarium: { paint: P.aquarium, mat: 'glass', alpha: 0.7, core: 'soft', coreColor: '#2a9ad6', fx: 'bubbles' },
  synthwave: { paint: P.synthwave, mat: 'lacquer', pipGlow: '#20e3ff', fx: 'pulse' },
  snowflake: { paint: P.snowflake, mat: 'satin', fx: 'sparkle' },
  pumpkin: { paint: P.pumpkin, mat: 'satin', pipMode: 'carved', pipColor: '#2a1405', pipGlow: '#ffe066', fx: 'flicker' },
  planet: { paint: P.planet, mat: 'satin', fx: 'ring' },
  storm: { paint: P.storm, mat: 'satin', pipGlow: '#ffe14d', fx: 'storm' },
  cat: { paint: P.cat, mat: 'fabric', sheenColor: '#ffd8a8', mat2: { roughness: 0.75 } },
  geode: { paint: P.geode, mat: 'gem', alpha: 1, core: false, coreColor: '#9a6bff', fx: 'shine' },
  lavalamp: { paint: P.lavalamp, mat: 'jelly', alpha: 0.78, core: 'blobs', coreColor: '#ff7a2a', fx: 'blobs' },
  hologram: { paint: P.hologram, mat: 'glass', alpha: 0.45, pipGlow: '#c8fff9', fx: 'scan' },
  piano: { paint: P.piano, mat: 'lacquer', pipMetal: true, pipColor: '#ffcf33' },
  goldpizza: { paint: (p) => P.pizza(p, true), mat: 'metal', color: '#ffd34a', ring: ['#ffe27a', '#c98300'], pipMode: 'raised', fx: 'shine' },
  aurora: { paint: P.aurora, mat: 'lacquer', pipGlow: '#e8fff4', fx: 'iris' },
  crystalheart: { paint: P.crystalheart, mat: 'gem', coreColor: '#ff4aa8', core: 'heart', fx: 'sparkle' },
  dj: { paint: P.dj, mat: 'lacquer', pipGlow: '#20e3ff', fx: 'dj' },
  blackhole: { paint: P.blackhole, mat: 'lacquer', pipGlow: '#ffe9c4', fx: 'vortex' },
  unicorn: { paint: P.unicorn, mat: 'holo', fx: 'unicorn' },
  phoenix: { paint: P.phoenix, mat: 'satin', pipGlow: '#fff7d6', fx: 'phoenix' },
  infinity: { paint: P.infinity, mat: 'holo', pipGlow: '#ffffff', fx: 'infinity' },
  disco: { paint: P.disco, mat: 'mirror', color: '#e8eef8', pipGlow: '#ff3dbb', fx: 'disco' },
  tnt: { paint: P.tnt, mat: 'satin', fx: 'fuse' },
  cosmiccat: { paint: P.cosmiccat, mat: 'lacquer', pipGlow: '#ffd1f0', fx: 'cosmiccat' },
  tsunami: { paint: P.tsunami, mat: 'candy', pipMode: 'bubble', fx: 'tsunami' },
  party: { paint: P.party, mat: 'candy', fx: 'party' },
};

/** Specifiche complete di una skin (con materiale risolto). */
export function diceSpec(skinId) {
  const it = ITEMS[skinId] && ITEMS[skinId].cat === 'dice' ? ITEMS[skinId] : ITEMS['dice.classic'];
  const key = it.id.slice(5);
  const s = SPEC[key] || {};
  const cols = cssColors(it.face);
  const mat = { ...(MAT[s.mat || 'plastic'] || MAT.plastic), ...(s.mat2 || {}) };
  return {
    id: it.id,
    key,
    it,
    rarity: it.rarity,
    shape: it.shape || 'dot',
    mix: s.mix,
    sat: s.sat,
    base: s.base || (cols.length >= 2 ? [cols[0], cols[cols.length - 1]] : [cols[0] || '#ffffff', cols[0] || '#e8e8f0']),
    paint: s.paint || null,
    pipColor: s.pipColor === 'face' ? null : s.pipColor || it.pip,
    pipMode: s.pipMode || 'recess',
    pipGlow: s.pipGlow || null,
    pipMetal: Boolean(s.pipMetal),
    ring: s.ring || null,
    mat,
    color: s.color || '#ffffff',
    sheenColor: s.sheenColor || null,
    alpha: s.alpha ?? mat.alpha ?? 1,
    core: s.core ?? mat.core ?? null,
    coreColor: s.coreColor || cols[1] || '#ffffff',
    fx: s.fx || null,
    haloColor: s.haloColor || '#ffffff',
    emissive: Boolean(s.pipGlow || /galaxy|lava|ghost|stars|ocean|arcade|synthwave|storm|lavalamp|hologram|aurora|dj|blackhole|unicorn|phoenix|infinity|cosmiccat|dragon|cosmic/.test(key)),
  };
}

export { P as PAINTERS };
