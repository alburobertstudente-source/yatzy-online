/**
 * Applicazione delle skin: dadi (colori, forma dei punti, effetti), stile di
 * lancio, tema del tavolo e skin delle carte.
 */
import { ITEMS } from '../meta/catalog.js';
import { artSpan } from '../three/core.js';
import '../three/diceThumbs.js';

const PIP_POS = { tl: [13, 13], tr: [35, 13], ml: [13, 24], mm: [24, 24], mr: [35, 24], bl: [13, 35], br: [35, 35] };
const PIPS = { 1: ['mm'], 2: ['tr', 'bl'], 3: ['tr', 'mm', 'bl'], 4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'mm', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] };

const SPRINKLES = ['#ff3d7f', '#ffd23f', '#2fd0ff', '#56ff9e', '#a54dff', '#ffffff'];
const f1 = (v) => v.toFixed(1);

function pipShape(shape, x, y, r, k = 0) {
  switch (shape) {
    case 'bubble':
      return `<circle cx="${x}" cy="${y}" r="${f1(r * 1.3)}"/><circle cx="${x}" cy="${y}" r="${f1(r * 1.3)}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/><circle cx="${f1(x - r * 0.45)}" cy="${f1(y - r * 0.5)}" r="${f1(r * 0.42)}" fill="rgba(255,255,255,.8)"/>`;
    case 'pepperoni':
      return `<circle cx="${x}" cy="${y}" r="${f1(r * 1.35)}"/><circle cx="${f1(x - r * 0.45)}" cy="${f1(y - r * 0.3)}" r="${f1(r * 0.28)}" fill="rgba(80,10,5,.45)"/><circle cx="${f1(x + r * 0.4)}" cy="${f1(y + r * 0.35)}" r="${f1(r * 0.24)}" fill="rgba(80,10,5,.45)"/><circle cx="${f1(x + r * 0.3)}" cy="${f1(y - r * 0.55)}" r="${f1(r * 0.2)}" fill="rgba(255,200,170,.5)"/>`;
    case 'seed':
      return `<path d="M${x} ${f1(y - r * 1.3)}C${f1(x + r)} ${f1(y - r * 0.2)} ${f1(x + r * 0.7)} ${f1(y + r)} ${x} ${f1(y + r * 1.1)}C${f1(x - r * 0.7)} ${f1(y + r)} ${f1(x - r)} ${f1(y - r * 0.2)} ${x} ${f1(y - r * 1.3)}Z"/><circle cx="${f1(x - r * 0.25)}" cy="${f1(y - r * 0.2)}" r="${f1(r * 0.22)}" fill="rgba(255,255,255,.5)"/>`;
    case 'chip':
      return `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2 + k; const rr = r * (i % 2 ? 0.95 : 1.3); return `${f1(x + rr * Math.cos(a))},${f1(y + rr * Math.sin(a))}`; }).join(' ')}"/>`;
    case 'hole':
      return `<ellipse cx="${x}" cy="${y}" rx="${f1(r * 1.25)}" ry="${f1(r * 1.1)}"/><ellipse cx="${f1(x + r * 0.25)}" cy="${f1(y + r * 0.3)}" rx="${f1(r * 0.85)}" ry="${f1(r * 0.7)}" fill="rgba(140,90,0,.25)"/>`;
    case 'note':
      return `<ellipse cx="${f1(x - r * 0.35)}" cy="${f1(y + r * 0.75)}" rx="${f1(r * 0.85)}" ry="${f1(r * 0.62)}" transform="rotate(-20 ${f1(x - r * 0.35)} ${f1(y + r * 0.75)})"/><rect x="${f1(x + r * 0.35)}" y="${f1(y - r * 1.4)}" width="${f1(r * 0.32)}" height="${f1(r * 2.2)}"/><path d="M${f1(x + r * 0.5)} ${f1(y - r * 1.4)}q${f1(r * 1.2)} ${f1(r * 0.5)} ${f1(r * 0.9)} ${f1(r * 1.4)}q-${f1(r * 0.2)} -${f1(r * 0.8)} -${f1(r * 0.9)} -${f1(r * 0.7)}z"/>`;
    case 'paw':
      return `<ellipse cx="${x}" cy="${f1(y + r * 0.45)}" rx="${f1(r * 0.85)}" ry="${f1(r * 0.68)}"/>${[[-0.9, -0.15], [0.9, -0.15], [-0.35, -0.8], [0.35, -0.8]].map(([dx, dy]) => `<circle cx="${f1(x + dx * r)}" cy="${f1(y + dy * r)}" r="${f1(r * 0.34)}"/>`).join('')}`;
    case 'dollar':
      return `<text x="${x}" y="${f1(y + r * 0.95)}" font-size="${f1(r * 2.7)}" font-weight="700" text-anchor="middle" font-family="Fredoka,Arial,sans-serif">$</text>`;
    case 'sprinkle':
      return [0, 1].map((j) => `<rect x="${f1(x - r * 0.9)}" y="${f1(y - r * 0.28 + (j - 0.5) * r * 0.9)}" width="${f1(r * 1.8)}" height="${f1(r * 0.55)}" rx="${f1(r * 0.27)}" fill="${SPRINKLES[(k * 2 + j) % SPRINKLES.length]}" transform="rotate(${(k * 47 + j * 70) % 180} ${x} ${y})"/>`).join('');
    case 'salmon':
      return `<circle cx="${x}" cy="${y}" r="${f1(r * 1.35)}"/><path d="M${f1(x - r)} ${f1(y - r * 0.3)}q${f1(r)} -${f1(r * 0.6)} ${f1(r * 2)} 0M${f1(x - r)} ${f1(y + r * 0.4)}q${f1(r)} -${f1(r * 0.6)} ${f1(r * 2)} 0" stroke="rgba(255,255,255,.75)" stroke-width="${f1(r * 0.25)}" fill="none"/>`;
    case 'fish':
      return `<ellipse cx="${f1(x - r * 0.2)}" cy="${y}" rx="${f1(r * 1.05)}" ry="${f1(r * 0.7)}"/><path d="M${f1(x + r * 0.7)} ${y}l${f1(r * 0.8)} -${f1(r * 0.65)}v${f1(r * 1.3)}z"/><circle cx="${f1(x - r * 0.65)}" cy="${f1(y - r * 0.15)}" r="${f1(r * 0.18)}" fill="#13304a"/>`;
    case 'flake':
      return `<g style="stroke:var(--die-pip)" stroke-width="${f1(r * 0.32)}" stroke-linecap="round">${[0, 60, 120].map((a) => `<line x1="${f1(x - r * 1.3)}" y1="${y}" x2="${f1(x + r * 1.3)}" y2="${y}" transform="rotate(${a} ${x} ${y})"/>`).join('')}</g><circle cx="${x}" cy="${y}" r="${f1(r * 0.35)}"/>`;
    case 'tri':
      return `<polygon points="${x},${f1(y - r * 1.1)} ${f1(x + r * 1.1)},${f1(y + r * 0.8)} ${f1(x - r * 1.1)},${f1(y + r * 0.8)}"/>`;
    case 'star': {
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 ? r * 0.48 : r * 1.25;
        pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(' ')}"/>`;
    }
    case 'heart':
      return `<path d="M${x} ${y + r * 1.1}C${x - r * 1.9} ${y - r * 0.2} ${x - r * 0.9} ${y - r * 1.5} ${x} ${y - r * 0.45}C${x + r * 0.9} ${y - r * 1.5} ${x + r * 1.9} ${y - r * 0.2} ${x} ${y + r * 1.1}Z"/>`;
    case 'diamond':
      return `<polygon points="${x},${y - r * 1.3} ${x + r},${y} ${x},${y + r * 1.3} ${x - r},${y}"/>`;
    case 'square':
      return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.2}"/>`;
    default:
      return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  }
}

/** Punti di una faccia con la forma della skin. */
export function skinPips(n, shape = 'dot', r = 4.6) {
  const dots = (PIPS[n] || []).map((k, i) => pipShape(shape, PIP_POS[k][0], PIP_POS[k][1], r, n * 3 + i)).join('');
  return `<svg viewBox="0 0 48 48" class="pips" aria-hidden="true">${dots}</svg>`;
}

const FX = ['glow', 'wave', 'frost', 'gem', 'shine', 'stars', 'lava', 'ghost', 'holo', 'rainbow', 'sparkle', 'fire', 'cosmic', 'divine', 'jelly', 'bubbles', 'storm', 'glowin', 'lavalamp', 'scan', 'dj', 'vortex', 'fireflow', 'kaleido', 'disco', 'fuse', 'confettiflow'];

/**
 * Applica la skin dei dadi a un contenitore (vassoio, anteprima…).
 * @param {HTMLElement} el contenitore con dentro dei .die
 * @param {string} id oggetto della categoria 'dice'
 */
export function applyDiceSkin(el, id) {
  const it = ITEMS[id] && ITEMS[id].cat === 'dice' ? ITEMS[id] : ITEMS['dice.classic'];
  if (el.dataset.diceSkin === it.id) return;
  el.dataset.diceSkin = it.id;
  el.classList.add('skinned');
  el.style.setProperty('--die-face', it.face);
  el.style.setProperty('--die-pip', it.pip);
  el.style.setProperty('--die-edge', it.edge);
  el.style.setProperty('--die-ring', it.ring || '0 0 0 0 transparent');
  for (const f of FX) el.classList.toggle(`dfx-${f}`, it.fx === f);
  const shape = it.shape || 'dot';
  el.querySelectorAll('.face').forEach((face) => {
    const n = Number([...face.classList].find((c) => /^f\d$/.test(c))?.slice(1));
    if (n) face.innerHTML = skinPips(n, shape);
  });
}

/** Piccolo dado (una faccia) con la skin, per negozio e armadio. */
export function diceSwatch(id, value = 5, size = 44) {
  const it = ITEMS[id] || ITEMS['dice.classic'];
  const fx = it.fx ? ` dfx-${it.fx}` : '';
  const flat = `<span class="dice-swatch skinned${fx}" style="--die-face:${it.face};--die-pip:${it.pip};--die-edge:${it.edge};--die-ring:${it.ring || '0 0 0 0 transparent'};width:${size}px;height:${size}px"><span class="face">${skinPips(value, it.shape)}</span></span>`;
  // dado 3D (immagine generata al volo); il disegno piatto resta finché non è pronta
  return artSpan('dice', `${it.id}:${value}`, Math.round(size * 1.3), flat, 'dice-art');
}

export function rollStyleOf(id) {
  return ITEMS[id]?.style || 'classic';
}

/** Tema del tavolo e skin delle carte valgono per tutta l'app. */
export function applyTheme(app, { table, cards }) {
  app.dataset.theme = ITEMS[table]?.theme || 'classic';
  app.dataset.cardskin = ITEMS[cards]?.skin || 'silver';
}

/** Colori della lamina da grattare per ogni skin delle carte. */
export const FOIL = {
  silver: { stops: ['#aeb7c8', '#eef1f6', '#b3bccc', '#e6eaf1', '#9ea8bb'], dots: 'rgba(70,80,110,0.13)', ink: '#5d667c' },
  bronze: { stops: ['#a8683a', '#f0c08f', '#b8763f', '#e9b07a', '#93592c'], dots: 'rgba(80,40,10,0.15)', ink: '#5c3414' },
  kraft: { stops: ['#c8a271', '#e3c497', '#c19866', '#dcbb8c', '#b38a58'], dots: 'rgba(90,60,20,0.16)', ink: '#5a4022' },
  ocean: { stops: ['#2a7fc0', '#7fd6ff', '#2f8fd0', '#62c4f2', '#1b5f99'], dots: 'rgba(255,255,255,0.18)', ink: '#0e3a63' },
  forest: { stops: ['#2f7d3e', '#8bd37a', '#378b45', '#71c063', '#24612f'], dots: 'rgba(255,255,255,0.15)', ink: '#123d1a' },
  carbon: { stops: ['#22252e', '#4a4f5e', '#262a34', '#41465a', '#1a1c23'], dots: 'rgba(255,255,255,0.08)', ink: '#c9d0e0' },
  neon: { stops: ['#13152a', '#2d1d5a', '#141832', '#1d3a5a', '#120f22'], dots: 'rgba(93,255,156,0.25)', ink: '#5dff9c' },
  frost: { stops: ['#bfe7ff', '#ffffff', '#a8dcff', '#eaf8ff', '#9ccff2'], dots: 'rgba(30,110,170,0.14)', ink: '#2a6f9e' },
  lava: { stops: ['#2a0c06', '#ff6a1a', '#3a1208', '#ffb02e', '#200805'], dots: 'rgba(255,200,80,0.18)', ink: '#ffd27a' },
  galaxy: { stops: ['#1a0c4a', '#7a4dff', '#25105e', '#2fd0ff', '#120830'], dots: 'rgba(255,255,255,0.3)', ink: '#ffffff' },
  gold: { stops: ['#d98c00', '#fff3a8', '#e6a400', '#ffe27a', '#c27a00'], dots: 'rgba(120,70,0,0.16)', ink: '#6b4300' },
  holo: { stops: ['#ff9de2', '#9de6ff', '#b5ff9d', '#fff59d', '#d99dff'], dots: 'rgba(255,255,255,0.3)', ink: '#5a4a8a' },
  rainbow: { stops: ['#ff4d4d', '#ffe14d', '#59e36b', '#4db8ff', '#9b6bff'], dots: 'rgba(255,255,255,0.25)', ink: '#ffffff' },
  prism: { stops: ['#ff3dbb', '#2fd0ff', '#ffe14d', '#7a4dff', '#56ff9e'], dots: 'rgba(255,255,255,0.35)', ink: '#ffffff' },
};

export function currentFoil() {
  return FOIL[document.getElementById('app')?.dataset.cardskin] || FOIL.silver;
}

/**
 * Effetto quando un dado atterra (skin speciali): particelle nello slot del
 * dado e, per i dadi assurdi, un effetto grande sul vassoio (solo il primo dado).
 * @param {string} type @param {HTMLElement} slot @param {number} k ordine di arrivo
 */
const LAND = {
  notes: { n: 3, cls: 'note' },
  rings: { n: 1, cls: 'ring' },
  bubbles: { n: 5, cls: 'bubble' },
  snow: { n: 6, cls: 'snow' },
  zap: { n: 1, cls: 'zap' },
  hearts: { n: 3, cls: 'heart' },
  sparkle: { n: 6, cls: 'spark' },
  coins: { n: 4, cls: 'coin' },
  dj: { n: 5, cls: 'eq', big: 'bigeq' },
  blackhole: { n: 6, cls: 'suck', big: 'bighole' },
  unicorn: { n: 8, cls: 'spark', big: 'bigrainbow' },
  phoenix: { n: 7, cls: 'flame', big: 'bigfire' },
  infinity: { n: 3, cls: 'ring', big: 'bigrings' },
  disco: { n: 6, cls: 'spark', big: 'bigdisco' },
  tnt: { n: 8, cls: 'smoke', big: 'bigboom' },
  cosmiccat: { n: 6, cls: 'spark', big: 'bigmiao' },
  tsunami: { n: 8, cls: 'drop', big: 'bigwave' },
  party: { n: 10, cls: 'confetti', big: 'bigparty' },
};

export function landFx(type, slot, k = 0) {
  const fx = LAND[type];
  if (!fx || !slot) return;
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < fx.n; i++) {
    const p = document.createElement('i');
    p.className = `lfx lfx-${fx.cls}`;
    p.style.setProperty('--x', `${rnd(-34, 34).toFixed(0)}px`);
    p.style.setProperty('--y', `${rnd(-70, -20).toFixed(0)}px`);
    p.style.setProperty('--r', `${rnd(-180, 180).toFixed(0)}deg`);
    p.style.setProperty('--h', `${Math.floor(rnd(0, 360))}`);
    p.style.animationDelay = `${(i * 40).toFixed(0)}ms`;
    slot.append(p);
    setTimeout(() => p.remove(), 1500);
  }
  if (fx.big && k === 0) {
    const tray = slot.closest('.tray');
    if (!tray) return;
    const b = document.createElement('div');
    b.className = `lfx-big lfx-${fx.big}`;
    if (fx.big === 'bigmiao') b.textContent = 'MIAO!';
    if (fx.big === 'bigeq') b.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
    tray.append(b);
    if (fx.big === 'bigboom' || fx.big === 'bighole') {
      tray.classList.remove('is-quake');
      void tray.offsetWidth;
      tray.classList.add('is-quake');
      setTimeout(() => tray.classList.remove('is-quake'), 700);
    }
    setTimeout(() => b.remove(), 1700);
  }
}
