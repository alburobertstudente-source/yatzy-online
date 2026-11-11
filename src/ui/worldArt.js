/**
 * Mappe illustrate dei 10 mondi della campagna, viste dall'alto come una
 * cartina disegnata: acqua, rive, piattaforme sotto ogni livello (ninfee,
 * isolotti di sabbia, ceppi, lastre di ghiaccio…), decorazioni a tema e
 * l'arena del boss in fondo. Tutto in SVG con contorni e ombre cartoon.
 *
 * worldScene(n, nodes) riceve le posizioni (in px) dei 9 livelli e del boss.
 */
import { toon } from './toon.js';

export const MAP_W = 390;
export const MAP_H = 860;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (v) => (+v).toFixed(1);

/** Forma morbida e irregolare (rive, isole, nuvole). */
function blob(cx, cy, rx, ry, rng, { n = 11, jag = 0.18 } = {}) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 - jag / 2 + rng() * jag;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) d += `M${f(p1[0])} ${f(p1[1])}`;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** Punti liberi per le decorazioni (lontani dai livelli e dall'arena). */
function freeSpots(rng, count, nodes, { minDist = 52, pad = 12, top = 70, bottom = MAP_H - 150 } = {}) {
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const x = pad + rng() * (MAP_W - pad * 2);
    const y = top + rng() * (bottom - top);
    if (nodes.some((nd) => Math.hypot(nd.x - x, nd.y - y) < minDist)) continue;
    if (out.some((o) => Math.hypot(o[0] - x, o[1] - y) < 26)) continue;
    out.push([x, y]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* decorazioni                                                         */
/* ------------------------------------------------------------------ */
const lilyPad = (x, y, rx, ry, rot, fill = '#58a23e') => {
  const notch = `M${x} ${y} L${f(x + rx * 1.05)} ${f(y - ry * 0.18)} L${f(x + rx * 1.05)} ${f(y + ry * 0.12)} Z`;
  return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><ellipse cx="${f(x)}" cy="${f(y + 3)}" rx="${f(rx)}" ry="${f(ry)}" fill="#2f6a3a" opacity=".35" data-flat/><path d="M${f(x + rx * 0.98)} ${f(y - ry * 0.2)} A${f(rx)} ${f(ry)} 0 1 0 ${f(x + rx * 0.98)} ${f(y + ry * 0.14)} L${f(x)} ${f(y)} Z" fill="${fill}"/><path d="${notch}" fill="none" data-flat/>${[200, 245, 290, 335, 25, 110, 155]
    .map((a) => `<path d="M${f(x)} ${f(y)} L${f(x + Math.cos((a * Math.PI) / 180) * rx * 0.82)} ${f(y + Math.sin((a * Math.PI) / 180) * ry * 0.82)}" stroke="rgba(30,80,30,.35)" stroke-width="1.6" stroke-linecap="round"/>`)
    .join('')}<ellipse cx="${f(x - rx * 0.25)}" cy="${f(y - ry * 0.3)}" rx="${f(rx * 0.35)}" ry="${f(ry * 0.22)}" fill="rgba(255,255,255,.18)" data-flat/></g>`;
};

const lotus = (x, y, s = 1, c = '#ffb3cf') =>
  `<g>${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="${f(x + Math.cos((a * Math.PI) / 180) * 5 * s)}" cy="${f(y + Math.sin((a * Math.PI) / 180) * 5 * s)}" rx="${f(5 * s)}" ry="${f(3 * s)}" transform="rotate(${a} ${f(x + Math.cos((a * Math.PI) / 180) * 5 * s)} ${f(y + Math.sin((a * Math.PI) / 180) * 5 * s)})" fill="${c}"/>`).join('')}<circle cx="${f(x)}" cy="${f(y)}" r="${f(3.2 * s)}" fill="#ffe14d"/></g>`;

const reeds = (x, y, s = 1) =>
  `<g>${[-8, -2, 5, 10].map((dx, i) => `<path d="M${f(x + dx * s)} ${f(y)} q${f((i - 1.5) * 3 * s)} ${f(-22 * s)} ${f((i - 1.5) * 6 * s)} ${f(-42 * s)}" fill="none" stroke="#4f8a2a" stroke-width="${f(3 * s)}" stroke-linecap="round"/>`).join('')}${[-2, 6].map((dx) => `<rect x="${f(x + dx * s - 3 * s)}" y="${f(y - 46 * s)}" width="${f(6 * s)}" height="${f(14 * s)}" rx="${f(3 * s)}" fill="#8a5326"/>`).join('')}</g>`;

const tadpole = (x, y, a) => `<g class="ws-swim" transform="rotate(${f(a)} ${f(x)} ${f(y)})"><path d="M${f(x)} ${f(y)} q8 3 14 -1" fill="none" stroke="#2a3a2a" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="4" ry="3" fill="#2a3a2a" data-flat/></g>`;

const dragonfly = (x, y, c = '#3d9bff') =>
  `<g class="ws-fly"><ellipse cx="${f(x - 5)}" cy="${f(y - 3)}" rx="6" ry="2.2" fill="rgba(220,240,255,.85)" stroke="#5a7a9a" stroke-width=".6" transform="rotate(-25 ${f(x - 5)} ${f(y - 3)})"/><ellipse cx="${f(x + 5)}" cy="${f(y - 3)}" rx="6" ry="2.2" fill="rgba(220,240,255,.85)" stroke="#5a7a9a" stroke-width=".6" transform="rotate(25 ${f(x + 5)} ${f(y - 3)})"/><rect x="${f(x - 1)}" y="${f(y - 4)}" width="2.2" height="14" rx="1.1" fill="${c}" data-flat/></g>`;

const rock = (x, y, s, rng, c = '#9aa0a8') => `<path d="${blob(x, y, 9 * s, 6.5 * s, rng, { n: 7, jag: 0.35 })}" fill="${c}"/>`;
const specks = (rng, n, area, colors) => Array.from({ length: n }, () => `<circle cx="${f(area.x + rng() * area.w)}" cy="${f(area.y + rng() * area.h)}" r="${f(0.8 + rng() * 1.6)}" fill="${colors[Math.floor(rng() * colors.length)]}" data-flat/>`).join('');
const shell = (x, y, s = 1, c = '#ffd6b8') => `<g><path d="M${f(x - 8 * s)} ${f(y + 4 * s)} Q${f(x)} ${f(y - 14 * s)} ${f(x + 8 * s)} ${f(y + 4 * s)} Z" fill="${c}"/>${[-5, -2, 1, 4].map((dx) => `<path d="M${f(x)} ${f(y + 4 * s)} L${f(x + dx * 1.6 * s)} ${f(y - 6 * s)}" stroke="rgba(160,90,60,.45)" stroke-width="1"/>`).join('')}</g>`;
const starfish = (x, y, s = 1, c = '#ff9f43') => `<path d="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = (i % 2 ? 4 : 10) * s; return `${i ? 'L' : 'M'}${f(x + r * Math.cos(a))} ${f(y + r * Math.sin(a))}`; }).join('')}Z" fill="${c}"/>`;
const palmTop = (x, y, s = 1) => `<g>${[0, 72, 144, 216, 288].map((a) => `<path d="M${f(x)} ${f(y)} q${f(Math.cos(((a + 20) * Math.PI) / 180) * 14 * s)} ${f(Math.sin(((a + 20) * Math.PI) / 180) * 14 * s)} ${f(Math.cos((a * Math.PI) / 180) * 26 * s)} ${f(Math.sin((a * Math.PI) / 180) * 26 * s)} q${f(-Math.cos(((a - 30) * Math.PI) / 180) * 8 * s)} ${f(-Math.sin(((a - 30) * Math.PI) / 180) * 8 * s)} ${f(-Math.cos((a * Math.PI) / 180) * 26 * s)} ${f(-Math.sin((a * Math.PI) / 180) * 26 * s)} Z" fill="#3fae4a"/>`).join('')}<circle cx="${f(x)}" cy="${f(y)}" r="${f(4 * s)}" fill="#8a5a2a"/></g>`;
const treeTop = (x, y, s, rng, c = '#3f7a3a') => `<path d="${blob(x, y, 26 * s, 24 * s, rng, { n: 9, jag: 0.25 })}" fill="${c}"/><path d="${blob(x - 6 * s, y - 6 * s, 13 * s, 11 * s, rng, { n: 7, jag: 0.3 })}" fill="rgba(255,255,255,.12)" data-flat/>`;
const pineTop = (x, y, s, snow = false) => `<path d="${Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8; const r = (i % 2 ? 9 : 20) * s; return `${i ? 'L' : 'M'}${f(x + r * Math.cos(a))} ${f(y + r * Math.sin(a))}`; }).join('')}Z" fill="${snow ? '#e8f4ff' : '#2f6a4a'}"/><path d="${Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8 + 0.2; const r = (i % 2 ? 5 : 11) * s; return `${i ? 'L' : 'M'}${f(x + r * Math.cos(a))} ${f(y + r * Math.sin(a))}`; }).join('')}Z" fill="${snow ? '#ffffff' : '#3f8a5a'}"/>`;
const mushroomTop = (x, y, s = 1, c = '#e8384f') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(9 * s)}" fill="${c}"/><circle cx="${f(x - 3 * s)}" cy="${f(y - 3 * s)}" r="${f(2 * s)}" fill="#ffffff" data-flat/><circle cx="${f(x + 3.5 * s)}" cy="${f(y + 1 * s)}" r="${f(1.6 * s)}" fill="#ffffff" data-flat/><circle cx="${f(x - 1 * s)}" cy="${f(y + 4 * s)}" r="${f(1.3 * s)}" fill="#ffffff" data-flat/>`;
const stump = (x, y, rx, ry) => `<ellipse cx="${f(x)}" cy="${f(y + 5)}" rx="${f(rx)}" ry="${f(ry)}" fill="#6a3f1f"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#d9a46a"/>${[0.75, 0.5, 0.25].map((k) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx * k)}" ry="${f(ry * k)}" fill="none" stroke="#a8703a" stroke-width="1.6"/>`).join('')}`;
const tomb = (x, y, s = 1) => `<rect x="${f(x - 9 * s)}" y="${f(y - 12 * s)}" width="${f(18 * s)}" height="${f(22 * s)}" rx="${f(8 * s)}" fill="#9aa0b0"/><path d="M${f(x)} ${f(y - 7 * s)} v${f(10 * s)} M${f(x - 4 * s)} ${f(y - 3 * s)} h${f(8 * s)}" stroke="#5a6070" stroke-width="2"/>`;
const cactus = (x, y, s = 1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(10 * s)}" fill="#4fae4a"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M${f(x + Math.cos((a * Math.PI) / 180) * 6 * s)} ${f(y + Math.sin((a * Math.PI) / 180) * 6 * s)} l${f(Math.cos((a * Math.PI) / 180) * 4 * s)} ${f(Math.sin((a * Math.PI) / 180) * 4 * s)}" stroke="#2f6a2a" stroke-width="1.2"/>`).join('')}<circle cx="${f(x)}" cy="${f(y)}" r="${f(3 * s)}" fill="#ff8fb4"/>`;
const crystal = (x, y, s = 1, c = '#56ff9e') => `<path d="M${f(x)} ${f(y - 12 * s)} L${f(x + 6 * s)} ${f(y)} L${f(x)} ${f(y + 6 * s)} L${f(x - 6 * s)} ${f(y)} Z" fill="${c}"/><path d="M${f(x)} ${f(y - 12 * s)} L${f(x)} ${f(y + 6 * s)}" stroke="rgba(255,255,255,.6)" stroke-width="1.2"/>`;
const cloudShape = (x, y, s, rng, c = '#ffffff') => `<path d="${blob(x, y, 34 * s, 20 * s, rng, { n: 12, jag: 0.35 })}" fill="${c}"/>`;
const coinPile = (x, y, s = 1) => [[0, 0], [-7, 3], [7, 2], [-3, -5], [4, -4], [0, -9]].map(([dx, dy]) => `<ellipse cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" rx="${f(5 * s)}" ry="${f(3.4 * s)}" fill="#ffcf33"/>`).join('');

/* piattaforme sotto i livelli e arena del boss, per tema */
const THEMES = {
  pond: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#86d3ea"/>${Array.from({ length: 18 }, () => { const x = r() * MAP_W; const y = r() * MAP_H; return `<path d="M${f(x)} ${f(y)} q10 -5 20 0 t20 0" fill="none" stroke="#b6e8f6" stroke-width="2" stroke-linecap="round" opacity=".8"/>`; }).join('')}`,
    banks: (r) => [`<path d="${blob(-20, 260, 90, 120, r)}" fill="#9aae3e"/>`, `<path d="${blob(420, 470, 100, 140, r)}" fill="#9aae3e"/>`, `<path d="${blob(-30, 700, 80, 90, r)}" fill="#9aae3e"/>`, `<path d="${blob(395, 110, 70, 90, r)}" fill="#9aae3e"/>`, `<path d="${blob(330, 130, 40, 70, r)}" fill="#6a4a26"/>`].join(''),
    landSpecks: [],
    platform: (x, y, k, r) => lilyPad(x, y, 46, 38, r() * 40 - 20),
    deco: (x, y, i, r) => [lotus(x, y, 1), reeds(x, y + 12, 0.9), tadpole(x, y, r() * 360), `<ellipse cx="${f(x)}" cy="${f(y)}" rx="10" ry="8" fill="#58a23e"/>`, lotus(x, y, 0.8, '#ffffff')][i % 5],
    arena: (x, y, r) => `${lilyPad(x, y + 10, 150, 92, -4, '#4f9a3a')}<ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="118" ry="70" fill="#66b04a"/>${lotus(x - 120, y - 30, 1.3)}${lotus(x + 110, y + 50, 1.2, '#ffffff')}${lotus(x + 125, y - 40, 1.1)}<g><ellipse cx="${f(x - 70)}" cy="${f(y - 34)}" rx="11" ry="9" fill="#7cc84a"/><circle cx="${f(x - 74)}" cy="${f(y - 41)}" r="3.4" fill="#ffffff" data-flat/><circle cx="${f(x - 66)}" cy="${f(y - 41)}" r="3.4" fill="#ffffff" data-flat/><path d="M${f(x - 76)} ${f(y - 46)} l2 -5 l2 4 l2 -5 l2 5" fill="#ffd23f"/></g><g><ellipse cx="${f(x + 74)}" cy="${f(y - 20)}" rx="10" ry="8" fill="#7cc84a"/><circle cx="${f(x + 71)}" cy="${f(y - 26)}" r="3" fill="#ffffff" data-flat/><circle cx="${f(x + 78)}" cy="${f(y - 26)}" r="3" fill="#ffffff" data-flat/></g>`,
    fx: (r, nodes) => `${dragonfly(80, 150)}${dragonfly(320, 420, '#a54dff')}${dragonfly(60, 560, '#2fb36f')}${Array.from({ length: 6 }, () => tadpole(r() * MAP_W, 100 + r() * 600, r() * 360)).join('')}`,
  },
  beach: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#f3d698"/>${specks(r, 160, { x: 0, y: 0, w: MAP_W, h: MAP_H }, ['#e8c27a', '#fff0c8', '#dcb46a'])}`,
    banks: (r) => `<path d="M0 0 H130 Q90 140 150 260 Q210 380 120 520 Q60 640 150 860 H0 Z" fill="#3fb4e6"/><path d="M0 0 H112 Q72 140 132 260 Q192 380 102 520 Q42 640 132 860 H0 Z" fill="#5fc8f0"/><g class="ws-foam"><path d="M130 0 Q90 140 150 260 Q210 380 120 520 Q60 640 150 860" fill="none" stroke="#ffffff" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/></g><path d="M0 0 H70 Q40 160 80 300 Q110 440 40 600 Q10 700 60 860 H0 Z" fill="#2a8ad6"/>`,
    landSpecks: [],
    platform: (x, y, k, r) => `<ellipse cx="${f(x)}" cy="${f(y + 5)}" rx="46" ry="34" fill="rgba(160,110,40,.3)" data-flat/><path d="${blob(x, y, 44, 32, r, { n: 9, jag: 0.15 })}" fill="#ffe8b8"/>${shell(x - 30, y + 16, 0.8)}${starfish(x + 32, y - 14, 0.7, '#ff7a59')}`,
    deco: (x, y, i, r) => [shell(x, y, 1), starfish(x, y, 1), palmTop(x, y, 1), `<circle cx="${f(x)}" cy="${f(y)}" r="16" fill="#ff5a66"/><path d="M${f(x - 16)} ${f(y)} A16 16 0 0 1 ${f(x)} ${f(y - 16)} L${f(x)} ${f(y)} Z" fill="#ffffff"/><path d="M${f(x)} ${f(y)} A16 16 0 0 1 ${f(x + 16)} ${f(y)} L${f(x)} ${f(y)} Z" fill="#ffffff"/>`, rock(x, y, 1.1, r, '#c9b8a0')][i % 5],
    arena: (x, y, r) => `<path d="${blob(x, y + 10, 150, 90, r, { n: 14, jag: 0.12 })}" fill="#e8c27a"/>${[-1, 1].map((sd) => `<rect x="${f(x + sd * 110 - 14)}" y="${f(y - 30)}" width="28" height="34" fill="#dcb46a"/><path d="M${f(x + sd * 110 - 14)} ${f(y - 30)} h7 v-6 h7 v6 h7 v-6 h7 v6" fill="#dcb46a"/>`).join('')}${shell(x - 60, y + 60, 1.3, '#ffc4d6')}${starfish(x + 70, y + 64, 1.1)}`,
    fx: () => `<g class="ws-gull"><path d="M300 120 q8 -8 16 0 q8 -8 16 0" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/></g><g class="ws-gull" style="animation-delay:-3s"><path d="M220 300 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/></g>`,
  },
  forest: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#3e5a2e"/>${specks(r, 140, { x: 0, y: 0, w: MAP_W, h: MAP_H }, ['#4f6a38', '#2e4422', '#5a7a3a'])}<path d="M200 0 Q120 200 220 420 Q320 640 190 860" fill="none" stroke="#6a4a2a" stroke-width="64" opacity=".55" stroke-linecap="round"/>`,
    banks: (r) => [treeTop(20, 120, 1.6, r, '#2f5a2e'), treeTop(380, 260, 1.8, r, '#2a4f2a'), treeTop(10, 480, 1.7, r, '#2f5a2e'), treeTop(385, 640, 1.5, r, '#2a4f2a'), treeTop(330, 40, 1.2, r, '#35643a')].join(''),
    landSpecks: [],
    platform: (x, y) => stump(x, y, 44, 32),
    deco: (x, y, i, r) => [mushroomTop(x, y, 1), mushroomTop(x, y, 0.8, '#b38bff'), rock(x, y, 1, r, '#7a8a8a'), treeTop(x, y, 0.6, r, '#35643a'), `<circle class="ws-firefly" cx="${f(x)}" cy="${f(y)}" r="2.6" fill="#e8ff8a" data-flat/>`][i % 5],
    arena: (x, y, r) => `<ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="150" ry="90" fill="#5a4a3a"/>${Array.from({ length: 10 }, (_, i) => rock(x + Math.cos((i / 10) * 6.283) * 132, y + 10 + Math.sin((i / 10) * 6.283) * 78, 1.4, r, '#8a8a9a')).join('')}<ellipse cx="${f(x + 90)}" cy="${f(y + 30)}" rx="20" ry="14" fill="#2a2a3a"/><ellipse cx="${f(x + 90)}" cy="${f(y + 27)}" rx="15" ry="9" fill="#9ae04a"/>`,
    fx: () => `<g class="ws-fog"><rect x="-60" y="240" width="520" height="44" rx="22" fill="rgba(230,225,255,.16)" data-flat/><rect x="-60" y="560" width="520" height="54" rx="27" fill="rgba(230,225,255,.12)" data-flat/></g>${[60, 150, 270, 330, 110, 240].map((x, i) => `<circle class="ws-firefly" cx="${x}" cy="${160 + i * 100}" r="2.4" fill="#e8ff8a" style="animation-delay:${i * 0.5}s"/>`).join('')}`,
  },
  ice: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#eaf6ff"/>${specks(r, 90, { x: 0, y: 0, w: MAP_W, h: MAP_H }, ['#cfe6ff', '#ffffff'])}<path d="${blob(200, 430, 170, 330, r, { n: 14, jag: 0.12 })}" fill="#a8d8f8"/>`,
    banks: (r) => [pineTop(30, 120, 1.4, true), pineTop(360, 200, 1.6, true), pineTop(25, 420, 1.5, true), pineTop(370, 520, 1.3, true), pineTop(40, 700, 1.4, true), pineTop(350, 760, 1.2, true)].join(''),
    landSpecks: [],
    platform: (x, y, k, r) => `<path d="${blob(x, y + 5, 46, 32, r, { n: 6, jag: 0.25 })}" fill="#8ac2ea" opacity=".6" data-flat/><path d="${blob(x, y, 44, 30, r, { n: 6, jag: 0.25 })}" fill="#ffffff"/><path d="M${f(x - 22)} ${f(y - 10)} l14 6 l10 -8" fill="none" stroke="#a8d8f8" stroke-width="2" stroke-linecap="round"/>`,
    deco: (x, y, i, r) => [`<circle cx="${f(x)}" cy="${f(y)}" r="12" fill="#ffffff"/><circle cx="${f(x)}" cy="${f(y - 14)}" r="8" fill="#ffffff"/><path d="M${f(x)} ${f(y - 14)} l7 2 l-7 2 Z" fill="#ff9f1a"/>`, rock(x, y, 1, r, '#b8c8d8'), `<path d="M${f(x - 10)} ${f(y)} l10 -6 l10 6 l-10 6 Z" fill="#cfe6ff"/>`, pineTop(x, y, 0.7, true)][i % 4],
    arena: (x, y, r) => `<ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="150" ry="90" fill="#cfeaff"/><path d="M${f(x - 120)} ${f(y)} l40 10 l20 -20 l40 30 l30 -10 l40 20 l40 -14" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`,
    fx: () => Array.from({ length: 24 }, (_, i) => `<circle class="ws-snow" cx="${(i * 47) % MAP_W}" cy="${(i * 89) % MAP_H}" r="${1.4 + (i % 3)}" fill="#ffffff" style="animation-delay:${(i % 7) * 0.7}s"/>`).join(''),
  },
  sea: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#2f8fd6"/>${Array.from({ length: 26 }, () => { const x = r() * MAP_W; const y = r() * MAP_H; return `<path d="M${f(x)} ${f(y)} q8 -5 16 0 t16 0" fill="none" stroke="#7fd0ff" stroke-width="2" stroke-linecap="round"/>`; }).join('')}`,
    banks: (r) => `<path d="${blob(360, 160, 60, 50, r)}" fill="#f2cf8a"/>${palmTop(360, 150, 1.2)}<g transform="translate(60 360) rotate(-20)"><path d="M-30 -10 Q0 26 30 -10 L22 14 Q0 30 -22 14 Z" fill="#8a4a22"/><rect x="-2" y="-46" width="4" height="40" fill="#5a3418"/><path d="M2 -44 L28 -30 L2 -18 Z" fill="#fff3e6"/></g>`,
    landSpecks: [],
    platform: (x, y, k, r) => `<ellipse cx="${f(x)}" cy="${f(y + 6)}" rx="46" ry="34" fill="rgba(10,50,100,.35)" data-flat/><path d="${blob(x, y, 44, 32, r, { n: 10, jag: 0.18 })}" fill="#f6d690"/><path d="${blob(x, y - 2, 34, 22, r, { n: 9, jag: 0.2 })}" fill="#ffe8b0"/>`,
    deco: (x, y, i, r) => [`<rect x="${f(x - 9)}" y="${f(y - 11)}" width="18" height="22" rx="7" fill="#a8622e"/><path d="M${f(x - 9)} ${f(y - 4)} h18 M${f(x - 9)} ${f(y + 4)} h18" stroke="#ffd23f" stroke-width="2"/>`, rock(x, y, 1.2, r, '#7a8a9a'), `<path d="M${f(x - 12)} ${f(y)} q12 -16 24 0" fill="#ffffff" opacity=".8"/>`, palmTop(x, y, 0.7)][i % 4],
    arena: (x, y, r) => `<path d="${blob(x, y + 10, 155, 92, r, { n: 14, jag: 0.14 })}" fill="#f2cf8a"/><path d="${blob(x, y + 6, 125, 70, r, { n: 12, jag: 0.12 })}" fill="#ffe0a0"/><rect x="${f(x + 70)}" y="${f(y + 20)}" width="44" height="28" rx="5" fill="#8a4a22"/><path d="M${f(x + 70)} ${f(y + 30)} h44" stroke="#ffd23f" stroke-width="3"/>${coinPile(x - 90, y + 30, 1.4)}`,
    fx: () => `<g class="ws-wave"><path d="M-40 820 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="3"/></g>`,
  },
  desert: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#f2c27a"/>${Array.from({ length: 12 }, (_, i) => `<path d="M-20 ${40 + i * 70} q100 -30 200 0 t220 0" fill="none" stroke="#e0a85a" stroke-width="5" opacity=".5"/>`).join('')}`,
    banks: (r) => `<path d="M300 40 L370 140 L230 140 Z" fill="#e8b46a"/><path d="M300 40 L370 140 L300 140 Z" fill="#c8883a"/><path d="${blob(40, 520, 50, 36, r)}" fill="#3fb4e6"/>${palmTop(20, 500, 0.9)}${palmTop(70, 550, 0.8)}`,
    landSpecks: [],
    platform: (x, y) => `<path d="M${f(x - 40)} ${f(y + 6)} l20 -30 h40 l20 30 l-20 30 h-40 Z" fill="rgba(140,80,20,.3)" data-flat/><path d="M${f(x - 40)} ${f(y)} l20 -30 h40 l20 30 l-20 30 h-40 Z" fill="#ffd89a"/><path d="M${f(x - 20)} ${f(y - 30)} l10 16 M${f(x + 25)} ${f(y + 10)} l8 12" stroke="#d9a65a" stroke-width="2"/>`,
    deco: (x, y, i, r) => [cactus(x, y, 1), rock(x, y, 1.1, r, '#c89a6a'), `<path d="M${f(x - 10)} ${f(y)} q10 -6 20 0" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="${f(x - 12)}" cy="${f(y)}" r="3" fill="#ffffff"/><circle cx="${f(x + 12)}" cy="${f(y)}" r="3" fill="#ffffff"/>`, cactus(x, y, 0.7)][i % 4],
    arena: (x, y) => `<ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="150" ry="90" fill="#e8a85a"/>${coinPile(x - 90, y + 20, 1.6)}${coinPile(x + 90, y + 30, 1.5)}${coinPile(x - 40, y + 70, 1.3)}${coinPile(x + 40, y + 70, 1.2)}`,
    fx: () => `<g class="ws-heat"><path d="M0 400 q40 -6 80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="3"/></g>`,
  },
  chaos: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#2a1060"/>${specks(r, 80, { x: 0, y: 0, w: MAP_W, h: MAP_H }, ['#ffffff', '#b38bff', '#2fd0ff'])}<circle cx="320" cy="120" r="50" fill="none" stroke="#c04dff" stroke-width="6" opacity=".6" class="ws-spin" style="transform-origin:320px 120px" stroke-dasharray="24 16"/>`,
    banks: () => '',
    landSpecks: [],
    platform: (x, y, k, r) => `<ellipse cx="${f(x)}" cy="${f(y + 16)}" rx="38" ry="18" fill="rgba(0,0,0,.35)" data-flat/><path d="${blob(x, y, 44, 30, r, { n: 9, jag: 0.2 })}" fill="#7a5a9a"/><path d="${blob(x, y - 4, 38, 22, r, { n: 9, jag: 0.2 })}" fill="#56d08a"/>${crystal(x - 30, y + 4, 0.8)}`,
    deco: (x, y, i, r) => [crystal(x, y, 1.2, '#2fd0ff'), crystal(x, y, 1, '#ff3dbb'), `<path class="ws-twinkle" d="M${f(x)} ${f(y - 8)} l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="#ffe14d"/>`, rock(x, y, 1, r, '#5a3a8a')][i % 4],
    arena: (x, y) => `<ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="150" ry="90" fill="#3b1d8f"/><ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="130" ry="76" fill="none" stroke="#2fd0ff" stroke-width="4" stroke-dasharray="10 8"/><ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="100" ry="58" fill="none" stroke="#c04dff" stroke-width="3"/>`,
    fx: () => Array.from({ length: 10 }, (_, i) => `<path class="ws-twinkle" d="M${(i * 41) % MAP_W} ${(i * 113) % MAP_H} l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="#2fd0ff" style="animation-delay:${i * 0.3}s"/>`).join(''),
  },
  castle: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#3a3448"/>${Array.from({ length: 30 }, (_, i) => `<rect x="${(i % 6) * 70 - 10 + (Math.floor(i / 6) % 2) * 35}" y="${Math.floor(i / 6) * 180 + 20}" width="60" height="40" rx="6" fill="#433c54"/>`).join('')}<path d="M0 0 H${MAP_W} V60 H0 Z" fill="#2a2438"/>`,
    banks: (r) => `<path d="M0 0 Q60 300 20 860 H0 Z" fill="#1f5a6a"/><path d="M${MAP_W} 0 Q330 300 370 860 H${MAP_W} Z" fill="#1f5a6a"/>`,
    landSpecks: [],
    platform: (x, y) => `<rect x="${f(x - 42)}" y="${f(y - 26)}" width="84" height="58" rx="10" fill="rgba(0,0,0,.35)" data-flat/><rect x="${f(x - 42)}" y="${f(y - 30)}" width="84" height="58" rx="10" fill="#8a8498"/><path d="M${f(x - 42)} ${f(y)} h84 M${f(x)} ${f(y - 30)} v58" stroke="#6a6478" stroke-width="2"/>`,
    deco: (x, y, i, r) => [tomb(x, y, 1), `<rect x="${f(x - 2)}" y="${f(y - 10)}" width="4" height="14" fill="#f4f0e0"/><circle class="ws-twinkle" cx="${f(x)}" cy="${f(y - 13)}" r="3" fill="#ffd23f"/>`, tomb(x, y, 0.8), rock(x, y, 1, r, '#6a6478')][i % 4],
    arena: (x, y) => `<ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="150" ry="90" fill="#5a1020"/><ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="128" ry="74" fill="#8a1a30"/>${[-1, 1].map((sd) => `<rect x="${f(x + sd * 120 - 3)}" y="${f(y - 40)}" width="6" height="22" fill="#f4f0e0"/><circle class="ws-twinkle" cx="${f(x + sd * 120)}" cy="${f(y - 44)}" r="4" fill="#ffd23f"/>`).join('')}`,
    fx: () => [60, 180, 300].map((x, i) => `<g class="ws-bat" style="animation-delay:${i * 1.3}s"><path d="M${x} 200 q-10 -10 -22 -4 q8 2 10 8 q4 -4 12 -4 q8 0 12 4 q2 -6 10 -8 q-12 -6 -22 4 Z" fill="#15101f"/></g>`).join(''),
  },
  sky: {
    base: (r) => `<rect width="${MAP_W}" height="${MAP_H}" fill="#6a86b8"/><rect class="ws-flash" width="${MAP_W}" height="${MAP_H}" fill="#ffffff"/>`,
    banks: (r) => [cloudShape(40, 150, 1.4, r, '#8aa0c8'), cloudShape(360, 360, 1.5, r, '#8aa0c8'), cloudShape(30, 600, 1.3, r, '#8aa0c8')].join(''),
    landSpecks: [],
    platform: (x, y, k, r) => `<path d="${blob(x, y + 6, 50, 30, r, { n: 12, jag: 0.35 })}" fill="#b8c8e0" data-flat/><path d="${blob(x, y, 50, 30, r, { n: 12, jag: 0.35 })}" fill="#ffffff"/>`,
    deco: (x, y, i, r) => [`<path class="ws-bolt" d="M${f(x)} ${f(y - 16)} l-8 14 h7 l-7 16 l16 -20 h-7 l7 -10 Z" fill="#ffe14d"/>`, cloudShape(x, y, 0.5, r, '#e8eef8'), `<path d="M${f(x - 8)} ${f(y)} q8 -6 16 0" fill="none" stroke="#2a3a5a" stroke-width="2"/>`][i % 3],
    arena: (x, y, r) => `<path d="${blob(x, y + 10, 160, 95, r, { n: 16, jag: 0.3 })}" fill="#4a5a7a"/><path d="${blob(x, y + 6, 130, 74, r, { n: 14, jag: 0.25 })}" fill="#5a6a8a"/>`,
    fx: () => Array.from({ length: 30 }, (_, i) => `<line class="ws-rain" x1="${(i * 37) % MAP_W}" y1="${(i * 71) % MAP_H}" x2="${((i * 37) % MAP_W) - 6}" y2="${((i * 71) % MAP_H) + 18}" stroke="rgba(220,235,255,.55)" stroke-width="1.6" style="animation-delay:${(i % 6) * 0.15}s"/>`).join(''),
  },
  throne: {
    base: () => `<rect width="${MAP_W}" height="${MAP_H}" fill="#f4e6c8"/>${Array.from({ length: 140 }, (_, i) => ((i + Math.floor(i / 10)) % 2 ? `<rect x="${(i % 10) * 39}" y="${Math.floor(i / 10) * 62}" width="39" height="62" fill="#e8d6b0"/>` : '')).join('')}<path d="M150 0 H240 V860 H150 Z" fill="#c4102a"/><path d="M158 0 V860 M232 0 V860" stroke="#ffd23f" stroke-width="4"/>`,
    banks: () => [30, 360].map((x) => [120, 360, 600].map((y) => `<circle cx="${x}" cy="${y}" r="20" fill="#fff3d6"/><circle cx="${x}" cy="${y}" r="12" fill="#e8d6b0"/>`).join('')).join(''),
    landSpecks: [],
    platform: (x, y) => `<rect x="${f(x - 40)}" y="${f(y - 26)}" width="80" height="58" rx="12" fill="rgba(120,70,0,.35)" data-flat/><rect x="${f(x - 40)}" y="${f(y - 30)}" width="80" height="58" rx="12" fill="#ffcf33"/><rect x="${f(x - 32)}" y="${f(y - 23)}" width="64" height="44" rx="8" fill="none" stroke="#fff3a8" stroke-width="2"/>`,
    deco: (x, y, i) => [coinPile(x, y, 1), `<path d="M${f(x)} ${f(y - 9)} l3 6 l6 1 l-5 4 l2 6 l-6 -3 l-6 3 l2 -6 l-5 -4 l6 -1 Z" fill="#ffd23f"/>`, `<rect x="${f(x - 8)}" y="${f(y - 8)}" width="16" height="16" rx="4" fill="#ffffff"/><circle cx="${f(x - 3)}" cy="${f(y - 3)}" r="1.6" fill="#262a3d" data-flat/><circle cx="${f(x + 3)}" cy="${f(y + 3)}" r="1.6" fill="#262a3d" data-flat/>`][i % 3],
    arena: (x, y) => `<ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="150" ry="90" fill="#a8243a"/><ellipse cx="${f(x)}" cy="${f(y + 10)}" rx="130" ry="76" fill="none" stroke="#ffd23f" stroke-width="5"/>${coinPile(x - 100, y + 40, 1.4)}${coinPile(x + 100, y + 40, 1.4)}`,
    fx: () => Array.from({ length: 14 }, (_, i) => `<circle class="ws-twinkle" cx="${(i * 53) % MAP_W}" cy="${(i * 97) % MAP_H}" r="2" fill="#fff3a8" style="animation-delay:${i * 0.25}s"/>`).join(''),
  },
};

const ORDER = ['pond', 'beach', 'forest', 'ice', 'sea', 'desert', 'chaos', 'castle', 'sky', 'throne'];
/** Colori del sentiero tra i livelli. */
const PATHS = { pond: 'rgba(255,255,255,.75)', beach: 'rgba(200,140,60,.6)', forest: 'rgba(255,240,180,.55)', ice: 'rgba(120,180,230,.8)', sea: 'rgba(255,255,255,.7)', desert: 'rgba(180,110,40,.6)', chaos: 'rgba(47,208,255,.7)', castle: 'rgba(255,210,63,.6)', sky: 'rgba(255,255,255,.8)', throne: 'rgba(196,16,42,.6)' };

/**
 * @param {number} n mondo 1..10
 * @param {{x:number,y:number}[]} nodes centri dei 9 livelli e (ultimo) del boss
 * @returns {{scene:string, fx:string}}
 */
export function worldScene(n, nodes) {
  const theme = THEMES[ORDER[n - 1]] || THEMES.pond;
  const rng = seeded(n * 7919);
  const levels = nodes.slice(0, 9);
  const boss = nodes[9];
  const road = `<path d="${nodes.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ')}" fill="none" stroke="${PATHS[ORDER[n - 1]]}" stroke-width="5" stroke-dasharray="2 13" stroke-linecap="round"/>`;
  const spots = freeSpots(rng, 22, [...levels, { x: boss.x, y: boss.y - 30 }, { x: boss.x, y: boss.y + 40 }]);
  const decos = spots.map(([x, y], i) => theme.deco(x, y, i, rng)).join('');
  const land = theme.banks(rng);
  const plats = levels.map((p, k) => theme.platform(p.x, p.y + 6, k, rng)).join('');
  const arena = theme.arena(boss.x, boss.y + 4, rng);
  const art = toon(`<svg>${land}${decos}${plats}${arena}</svg>`, { outline: 1.6 }).replace(/^<svg>|<\/svg>$/g, '');
  const scene = `<svg class="ws-map" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${theme.base(rng)}${theme.landSpecks.length ? specks(rng, 120, { x: 0, y: 0, w: MAP_W, h: MAP_H }, theme.landSpecks).replace(/<circle/g, '<circle class="ws-speck"') : ''}${art}${road}</svg>`;
  const fx = `<svg class="ws-fx" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${toon(`<svg>${theme.fx(rng, nodes)}</svg>`, { outline: 0 }).replace(/^<svg>|<\/svg>$/g, '')}</svg>`;
  return { scene, fx, theme: ORDER[n - 1] };
}
