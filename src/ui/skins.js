/**
 * Applicazione delle skin: dadi (colori, forma dei punti, effetti), stile di
 * lancio, tema del tavolo e skin delle carte.
 */
import { ITEMS } from '../meta/catalog.js';

const PIP_POS = { tl: [13, 13], tr: [35, 13], ml: [13, 24], mm: [24, 24], mr: [35, 24], bl: [13, 35], br: [35, 35] };
const PIPS = { 1: ['mm'], 2: ['tr', 'bl'], 3: ['tr', 'mm', 'bl'], 4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'mm', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] };

function pipShape(shape, x, y, r) {
  switch (shape) {
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
  const dots = (PIPS[n] || []).map((k) => pipShape(shape, PIP_POS[k][0], PIP_POS[k][1], r)).join('');
  return `<svg viewBox="0 0 48 48" class="pips" aria-hidden="true">${dots}</svg>`;
}

const FX = ['glow', 'wave', 'frost', 'gem', 'shine', 'stars', 'lava', 'ghost', 'holo', 'rainbow', 'sparkle', 'fire', 'cosmic', 'divine'];

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
  return `<span class="dice-swatch skinned${fx}" style="--die-face:${it.face};--die-pip:${it.pip};--die-edge:${it.edge};width:${size}px;height:${size}px"><span class="face">${skinPips(value, it.shape)}</span></span>`;
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
