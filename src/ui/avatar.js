/**
 * Avatar del giocatore in SVG: un personaggio standard vestito con gli
 * oggetti equipaggiati (cappello, viso, maglietta, pantaloni, scarpe, schiena).
 */
import { ITEMS, SKIN_TONES } from '../meta/catalog.js';
import { toon } from './toon.js';

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};

let gid = 0;

function back(it) {
  const { c1, c2 } = it;
  switch (it.type) {
    case 'backpack':
      return `<rect x="27" y="62" width="46" height="34" rx="9" fill="${c2}"/><rect x="30" y="58" width="40" height="10" rx="5" fill="${c1}"/>`;
    case 'cape':
      return `<path d="M33 60 Q50 56 67 60 L80 118 Q50 126 20 118 Z" fill="${c1}"/><path d="M33 60 Q50 56 67 60 L70 70 Q50 64 30 70 Z" fill="${c2}"/>`;
    case 'guitar':
      return `<g transform="rotate(-35 50 80)"><rect x="47" y="40" width="6" height="40" fill="${c2}"/><ellipse cx="50" cy="92" rx="15" ry="13" fill="${c1}"/><ellipse cx="50" cy="80" rx="11" ry="9" fill="${c1}"/><circle cx="50" cy="88" r="4" fill="${c2}"/></g>`;
    case 'butterfly':
      return `<path d="M50 70 C26 44 10 58 22 74 C10 92 30 98 50 80 Z" fill="${c1}" opacity=".92"/><path d="M50 70 C74 44 90 58 78 74 C90 92 70 98 50 80 Z" fill="${c2}" opacity=".92"/>`;
    case 'jetpack':
      return `<rect x="26" y="60" width="16" height="34" rx="7" fill="${c1}"/><rect x="58" y="60" width="16" height="34" rx="7" fill="${c1}"/><path d="M28 94 L34 112 L40 94 Z M60 94 L66 112 L72 94 Z" fill="${c2}" class="av-flicker"/>`;
    case 'batwings':
      return `<path d="M44 66 L6 52 L14 66 L4 74 L16 78 L10 90 L44 80 Z" fill="${c1}"/><path d="M56 66 L94 52 L86 66 L96 74 L84 78 L90 90 L56 80 Z" fill="${c1}"/><path d="M44 70 L18 64 M56 70 L82 64" stroke="${c2}" stroke-width="2"/>`;
    case 'wings':
      return `<path d="M46 66 C20 40 2 54 6 66 C0 76 14 86 46 82 Z" fill="${c1}"/><path d="M54 66 C80 40 98 54 94 66 C100 76 86 86 54 82 Z" fill="${c1}"/><path d="M44 72 C28 62 16 64 12 68 M56 72 C72 62 84 64 88 68" stroke="${c2}" stroke-width="3" fill="none"/>`;
    default:
      return '';
  }
}

function pants(it, skin) {
  const { c1, c2 } = it;
  const legs = `<rect x="38" y="94" width="11" height="22" rx="4" fill="${skin}"/><rect x="51" y="94" width="11" height="22" rx="4" fill="${skin}"/>`;
  const long = (fill, extra = '') => `${legs}<path d="M35 90 H65 V115 H52 V100 H48 V115 H35 Z" fill="${fill}"/>${extra}`;
  switch (it.type) {
    case 'shorts':
      return `${legs}<path d="M35 90 H65 V104 H52 V99 H48 V104 H35 Z" fill="${c1}"/><path d="M35 90 H65 V93 H35 Z" fill="${c2}"/>`;
    case 'track':
      return long(c1, `<rect x="36" y="92" width="2.5" height="23" fill="${c2}"/><rect x="61.5" y="92" width="2.5" height="23" fill="${c2}"/>`);
    case 'cargo':
      return long(c1, `<rect x="36" y="102" width="7" height="6" rx="1" fill="${c2}"/><rect x="57" y="102" width="7" height="6" rx="1" fill="${c2}"/>`);
    case 'plaid':
      return long(c1, `<path d="M35 96 H65 M35 104 H65 M35 111 H65 M41 90 V115 M58 90 V115" stroke="${c2}" stroke-width="1.6" opacity=".7"/>`);
    case 'camo':
      return long(c1, `<circle cx="40" cy="97" r="3" fill="${c2}"/><circle cx="58" cy="102" r="3.5" fill="${c2}"/><circle cx="44" cy="109" r="2.5" fill="${c2}"/><circle cx="61" cy="94" r="2" fill="${c2}"/>`);
    case 'pirate':
      return `${legs}<path d="M35 90 H65 V108 H52 V100 H48 V108 H35 Z" fill="${c1}"/><path d="M35 90 H65 V94 H35 Z" fill="${c2}"/>`;
    case 'rainbow':
      return long('#ff4d4d', `<path d="M35 95 H65 V99 H35Z" fill="#ffa64d"/><path d="M35 99 H65 V103 H35Z" fill="#ffe14d"/><path d="M35 103 H65 V107 H35Z" fill="#59e36b"/><path d="M35 107 H65 V111 H35Z" fill="#4db8ff"/><path d="M35 111 H65 V115 H35Z" fill="#9b6bff"/>`);
    case 'lava':
      return long(c1, `<path d="M38 94 L42 102 L39 110 M58 92 L55 100 L60 108" stroke="${c2}" stroke-width="2.4" fill="none" class="av-flicker"/>`);
    case 'stars':
      return long(c1, `<text x="41" y="102" font-size="7" fill="${c2}">★</text><text x="54" y="110" font-size="6" fill="${c2}">★</text><text x="38" y="113" font-size="5" fill="${c2}">★</text>`);
    default:
      return long(c1, `<path d="M50 90 V100" stroke="${c2}" stroke-width="1.5"/>`);
  }
}

function shoes(it) {
  const { c1, c2 } = it;
  const pair = (shape) => `${shape(36)}${shape(52)}`;
  switch (it.type) {
    case 'flip':
      return pair((x) => `<rect x="${x - 1}" y="117" width="14" height="4" rx="2" fill="${c1}"/><path d="M${x + 6} 117 L${x + 3} 114 M${x + 6} 117 L${x + 9} 114" stroke="${c2}" stroke-width="1.6"/>`);
    case 'boot':
      return pair((x) => `<path d="M${x + 1} 106 H${x + 11} V117 H${x + 14} V122 H${x - 1} V117 H${x + 1} Z" fill="${c1}"/><rect x="${x - 1}" y="120" width="15" height="2.5" fill="${c2}"/>`);
    case 'high':
      return pair((x) => `<path d="M${x} 109 H${x + 11} V117 H${x + 14} V122 H${x - 1} Z" fill="${c1}"/><rect x="${x - 1}" y="119.5" width="15" height="2.5" fill="${c2}"/><circle cx="${x + 5.5}" cy="113" r="2" fill="${c2}"/>`);
    case 'cowboy':
      return pair((x) => `<path d="M${x + 1} 105 H${x + 11} V116 L${x + 16} 119 V122 H${x - 1} V116 Z" fill="${c1}"/><path d="M${x + 3} 109 L${x + 9} 112" stroke="${c2}" stroke-width="1.6"/>`);
    case 'flippers':
      return pair((x) => `<path d="M${x} 114 H${x + 12} L${x + 17} 123 H${x - 5} Z" fill="${c1}"/>`);
    case 'skates':
      return pair((x) => `<path d="M${x} 110 H${x + 11} V118 H${x - 1} Z" fill="${c1}"/><circle cx="${x + 1}" cy="121" r="2.2" fill="${c2}"/><circle cx="${x + 9}" cy="121" r="2.2" fill="${c2}"/>`);
    case 'rocket':
      return pair((x) => `<path d="M${x} 113 H${x + 12} V120 H${x - 1} Z" fill="${c1}"/><path d="M${x + 1} 120 L${x + 5.5} 127 L${x + 10} 120 Z" fill="${c2}" class="av-flicker"/>`);
    case 'winged':
      return pair((x) => `<path d="M${x} 114 H${x + 12} V121 H${x - 1} Z" fill="${c1}"/><path d="M${x} 115 C${x - 7} 109 ${x - 9} 115 ${x - 5} 118 Z" fill="${c2}"/>`);
    default:
      return pair((x) => `<path d="M${x} 114 H${x + 11} Q${x + 15} 116 ${x + 14} 122 H${x - 1} Z" fill="${c1}"/><rect x="${x - 1}" y="120" width="15" height="2.4" fill="${c2}"/>`);
  }
}

function shirt(it, skin) {
  const { c1, c2 } = it;
  const arms = (sleeve, len) =>
    `<rect x="25" y="62" width="9" height="28" rx="4.5" fill="${skin}"/><rect x="66" y="62" width="9" height="28" rx="4.5" fill="${skin}"/>` +
    (len ? `<rect x="24" y="61" width="11" height="${len}" rx="5" fill="${sleeve}"/><rect x="65" y="61" width="11" height="${len}" rx="5" fill="${sleeve}"/>` : '');
  const body = (fill) => `<path d="M33 60 Q50 55 67 60 L67 93 Q50 96 33 93 Z" fill="${fill}"/>`;
  switch (it.type) {
    case 'stripes':
      return `${arms(c1, 12)}${body(c1)}<path d="M33 67 H67 M33 74 H67 M33 81 H67 M33 88 H67" stroke="${c2}" stroke-width="3"/>`;
    case 'hoodie':
      return `${arms(c1, 27)}${body(c1)}<path d="M40 59 Q50 70 60 59" fill="${c2}"/><rect x="40" y="80" width="20" height="9" rx="3" fill="${c2}"/><path d="M46 64 V72 M54 64 V72" stroke="#fff" stroke-width="1.4"/>`;
    case 'tank':
      return `${arms('', 0)}<path d="M37 60 Q50 66 63 60 L67 93 Q50 96 33 93 Z" fill="${c1}"/><path d="M37 60 L39 66 M63 60 L61 66" stroke="${c2}" stroke-width="2"/>`;
    case 'jersey':
      return `${arms(c1, 12)}${body(c1)}<text x="50" y="86" text-anchor="middle" font-size="15" font-weight="700" fill="${c2}" font-family="Fredoka,sans-serif">${it.text || ''}</text><path d="M44 59 L50 65 L56 59" stroke="${c2}" stroke-width="2" fill="none"/>`;
    case 'hawaii':
      return `${arms(c1, 12)}${body(c1)}<circle cx="40" cy="70" r="3.5" fill="${c2}"/><circle cx="58" cy="76" r="3.5" fill="${c2}"/><circle cx="45" cy="86" r="3" fill="${c2}"/><circle cx="61" cy="88" r="2.5" fill="#ffe14d"/><path d="M50 60 V93" stroke="${shade(c1, 0.8)}" stroke-width="1.4"/>`;
    case 'jacket':
      return `${arms(c1, 27)}${body(c1)}<path d="M50 60 V94" stroke="${c2}" stroke-width="2"/><path d="M42 59 L50 72 L58 59" fill="${c2}"/>`;
    case 'tux':
      return `${arms(c1, 27)}${body(c1)}<path d="M43 59 L50 90 L57 59 Z" fill="${c2}"/><path d="M46 62 L50 65 L54 62 L54 66 L50 64 L46 66 Z" fill="#d6283d"/>`;
    case 'space':
      return `${arms(c1, 27)}${body(c1)}<rect x="40" y="70" width="20" height="12" rx="3" fill="${shade(c1, 0.85)}"/><circle cx="45" cy="76" r="2" fill="${c2}"/><circle cx="51" cy="76" r="2" fill="#2fd0ff"/><circle cx="57" cy="76" r="2" fill="#5dff9c"/>`;
    case 'armor':
      return `${arms(c1, 27)}${body(c1)}<path d="M36 66 Q50 72 64 66 M36 76 Q50 82 64 76 M36 86 Q50 92 64 86" stroke="${c2}" stroke-width="2.4" fill="none"/><circle cx="26.5" cy="64" r="6" fill="${c2}"/><circle cx="73.5" cy="64" r="6" fill="${c2}"/>`;
    case 'flame':
      return `${arms(c1, 12)}${body(c1)}<path d="M36 93 Q38 80 42 86 Q44 72 50 82 Q54 70 58 84 Q62 78 64 93 Z" fill="${c2}" class="av-flicker"/>`;
    case 'robe':
      return `${arms(c1, 27)}<path d="M33 60 Q50 55 67 60 L70 100 Q50 104 30 100 Z" fill="${c1}"/><text x="42" y="76" font-size="7" fill="${c2}">★</text><text x="53" y="88" font-size="6" fill="${c2}">✦</text><path d="M44 59 L50 66 L56 59" stroke="${c2}" stroke-width="2" fill="none"/>`;
    default:
      return `${arms(c1, 12)}${body(c1)}<path d="M44 59 Q50 64 56 59" stroke="${c2}" stroke-width="2" fill="none"/>`;
  }
}

function face(it) {
  if (!it) return '';
  const { c1, c2, c3 } = it;
  switch (it.type) {
    case 'glasses':
      return `<circle cx="42.5" cy="38" r="5.5" fill="none" stroke="${c1}" stroke-width="2"/><circle cx="57.5" cy="38" r="5.5" fill="none" stroke="${c1}" stroke-width="2"/><path d="M48 38 H52" stroke="${c1}" stroke-width="2"/>`;
    case 'sunglasses':
      return `<path d="M35 34 H65 V37 Q64 44 57 44 Q51 44 51 37 H49 Q49 44 43 44 Q36 44 35 37 Z" fill="${c1}"/><path d="M38 36 L42 36" stroke="${c2}" stroke-width="1.5"/>`;
    case 'mustache':
      return `<path d="M41 48 Q46 44 50 47 Q54 44 59 48 Q54 50 50 49 Q46 50 41 48 Z" fill="${c1}"/>`;
    case 'patch':
      return `<path d="M32 30 L68 44" stroke="${c1}" stroke-width="1.6"/><ellipse cx="57" cy="38" rx="6" ry="5" fill="${c1}"/>`;
    case 'starglasses':
      return `<text x="42.5" y="42.5" text-anchor="middle" font-size="15" fill="${c1}">★</text><text x="57.5" y="42.5" text-anchor="middle" font-size="15" fill="${c1}">★</text><path d="M48 37 H52" stroke="${c2}" stroke-width="2"/>`;
    case 'monocle':
      return `<circle cx="57.5" cy="38" r="5.5" fill="rgba(200,230,255,.3)" stroke="${c1}" stroke-width="2"/><path d="M62 41 Q66 50 62 58" stroke="${c1}" stroke-width="1" fill="none"/>`;
    case 'beard':
      return `<path d="M33 40 Q34 60 50 62 Q66 60 67 40 Q62 50 56 49 Q50 52 44 49 Q38 50 33 40 Z" fill="${c1}"/><path d="M45 52 Q50 55 55 52" stroke="#fff" stroke-width="1.4" fill="none" opacity=".6"/>`;
    case 'mask':
      return `<path d="M34 34 Q42 30 50 35 Q58 30 66 34 Q66 43 58 42 Q52 41 50 39 Q48 41 42 42 Q34 43 34 34 Z" fill="${c1}"/><ellipse cx="42.5" cy="37.5" rx="3" ry="2.2" fill="#fff"/><ellipse cx="57.5" cy="37.5" rx="3" ry="2.2" fill="#fff"/>`;
    case '3d':
      return `<rect x="35" y="33" width="30" height="10" rx="2" fill="${c1}"/><rect x="37" y="35" width="11" height="6" fill="${c2}"/><rect x="52" y="35" width="11" height="6" fill="${c3}"/>`;
    case 'visor':
      return `<rect x="33" y="32" width="34" height="11" rx="5" fill="${c2}"/><rect x="35" y="35" width="30" height="4" rx="2" fill="${c1}" class="av-glow"/>`;
    case 'laser':
      return `<circle cx="42.5" cy="38" r="3" fill="${c1}"/><circle cx="57.5" cy="38" r="3" fill="${c1}"/><path d="M42.5 38 L20 70 M57.5 38 L80 70" stroke="${c1}" stroke-width="1.8" opacity=".75" class="av-flicker"/>`;
    case 'cosmiceyes':
      return `<circle cx="42.5" cy="38" r="4.2" fill="${c1}"/><circle cx="57.5" cy="38" r="4.2" fill="${c2}"/><circle cx="43.5" cy="37" r="1.4" fill="#fff"/><circle cx="58.5" cy="37" r="1.4" fill="#fff"/>`;
    default:
      return '';
  }
}

function hat(it) {
  if (!it) return '';
  const { c1, c2 } = it;
  switch (it.type) {
    case 'cap':
      return `<path d="M30 30 Q31 13 50 13 Q69 13 70 30 Z" fill="${c1}"/><path d="M66 28 Q80 28 84 32 Q74 33 64 31 Z" fill="${c2}"/><circle cx="50" cy="14" r="2" fill="${c2}"/>`;
    case 'beanie':
      return `<path d="M30 31 Q30 11 50 11 Q70 11 70 31 Z" fill="${c1}"/><rect x="29" y="26" width="42" height="7" rx="3" fill="${shade(c1, 0.8)}"/><circle cx="50" cy="10" r="5" fill="${c2}"/>`;
    case 'bandana':
      return `<path d="M30 27 Q31 14 50 14 Q69 14 70 27 Z" fill="${c1}"/><path d="M68 25 L78 32 L72 22 Z" fill="${c1}"/><circle cx="42" cy="20" r="1.4" fill="${c2}"/><circle cx="56" cy="19" r="1.4" fill="${c2}"/><circle cx="49" cy="24" r="1.4" fill="${c2}"/>`;
    case 'bucket':
      return `<path d="M34 27 L37 12 H63 L66 27 Z" fill="${c1}"/><path d="M26 28 Q50 22 74 28 L72 32 Q50 27 28 32 Z" fill="${c2}"/>`;
    case 'headphones':
      return `<path d="M30 38 Q30 14 50 14 Q70 14 70 38" stroke="${c1}" stroke-width="4" fill="none"/><rect x="25" y="32" width="9" height="15" rx="4" fill="${c2}"/><rect x="66" y="32" width="9" height="15" rx="4" fill="${c2}"/>`;
    case 'chef':
      return `<rect x="35" y="16" width="30" height="13" fill="${c2}"/><circle cx="38" cy="12" r="8" fill="${c1}"/><circle cx="50" cy="8" r="9" fill="${c1}"/><circle cx="62" cy="12" r="8" fill="${c1}"/>`;
    case 'party':
      return `<path d="M38 22 L50 -6 L62 22 Z" fill="${c1}"/><path d="M41 15 L59 15 M44 7 L56 7" stroke="${c2}" stroke-width="2.5"/><circle cx="50" cy="-6" r="3.5" fill="${c2}"/>`;
    case 'tophat':
      return `<rect x="37" y="-4" width="26" height="26" rx="2" fill="${c1}"/><rect x="37" y="14" width="26" height="5" fill="${c2}"/><rect x="28" y="20" width="44" height="5" rx="2.5" fill="${c1}"/>`;
    case 'cowboy':
      return `<path d="M36 22 Q36 6 50 8 Q64 6 64 22 Z" fill="${c1}"/><path d="M20 22 Q50 34 80 22 Q76 30 50 31 Q24 30 20 22 Z" fill="${c2}"/><rect x="36" y="18" width="28" height="3" fill="${c2}"/>`;
    case 'viking':
      return `<path d="M30 30 Q30 12 50 12 Q70 12 70 30 Z" fill="${c1}"/><path d="M31 24 Q20 20 18 6 Q26 14 33 18 Z M69 24 Q80 20 82 6 Q74 14 67 18 Z" fill="${c2}"/><rect x="48" y="12" width="4" height="18" fill="${shade(c1, 0.8)}"/>`;
    case 'pirate':
      return `<path d="M24 26 Q50 2 76 26 Q50 20 24 26 Z" fill="${c1}"/><circle cx="50" cy="16" r="3.5" fill="${c2}"/><path d="M47 20 L53 23 M53 20 L47 23" stroke="${c2}" stroke-width="1.4"/>`;
    case 'bunny':
      return `<ellipse cx="41" cy="2" rx="6" ry="16" fill="${c1}"/><ellipse cx="59" cy="2" rx="6" ry="16" fill="${c1}"/><ellipse cx="41" cy="3" rx="3" ry="11" fill="${c2}"/><ellipse cx="59" cy="3" rx="3" ry="11" fill="${c2}"/>`;
    case 'horns':
      return `<path d="M35 22 Q30 10 36 2 Q38 14 42 18 Z M65 22 Q70 10 64 2 Q62 14 58 18 Z" fill="${c1}"/>`;
    case 'wizard':
      return `<path d="M30 26 L54 -12 L70 26 Z" fill="${c1}"/><path d="M24 26 Q50 32 76 26 Q50 22 24 26 Z" fill="${shade(c1, 0.75)}"/><text x="46" y="14" font-size="10" fill="${c2}">★</text>`;
    case 'crown':
      return `<path d="M33 24 L34 6 L42 15 L50 2 L58 15 L66 6 L67 24 Z" fill="${c1}"/><circle cx="50" cy="17" r="3" fill="${c2}"/><circle cx="40" cy="19" r="2" fill="${c2}"/><circle cx="60" cy="19" r="2" fill="${c2}"/>`;
    case 'halo':
      return `<ellipse cx="50" cy="6" rx="16" ry="5" fill="none" stroke="${c2}" stroke-width="3.5"/>`;
    default:
      return '';
  }
}

const fxClass = (it) => (it?.fx ? ` class="av-fx-${it.fx}"` : '');

/**
 * @param {{equip:object, skinTone?:number}} who
 * @param {{size?:number, bust?:boolean}} [o] bust = solo busto (testa e spalle)
 */
export function avatarSvg({ equip = {}, skinTone = 0 } = {}, { size = 120, bust = false } = {}) {
  const skin = SKIN_TONES[skinTone] || SKIN_TONES[0];
  const get = (cat) => (equip[cat] ? ITEMS[equip[cat]] : null);
  const it = { hat: get('hat'), face: get('face'), shirt: get('shirt') || ITEMS['shirt.basic'], pants: get('pants') || ITEMS['pants.basic'], shoes: get('shoes') || ITEMS['shoes.basic'], back: get('back') };
  const hideHair = it.hat && ['cap', 'beanie', 'bandana', 'bucket', 'tophat', 'cowboy', 'viking', 'pirate', 'chef', 'wizard'].includes(it.hat.type);
  // capelli a ciocche con riflesso, ombra della frangia sulla fronte
  const hair = hideHair
    ? ''
    : `<path d="M29.5 37 Q27 13 50 13 Q73 13 70.5 37 Q68 27 62 24 Q60 30 54 27 Q50 32 44 27 Q39 31 36 26 Q32 29 29.5 37 Z" fill="#5a3418"/>` +
      `<path d="M37 18 Q44 14.5 52 15.5" fill="none" stroke="rgba(255,220,180,.55)" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M47 14 Q45 19 47.5 22 M56 15 Q56 19 58.5 21.5" fill="none" stroke="#3a1f0c" stroke-width=".9" stroke-linecap="round" opacity=".7"/>`;
  const brows = `<path d="M38.8 32.6 Q42.5 30.6 46 32.4" fill="none" stroke="#4a2a14" stroke-width="1.5" stroke-linecap="round"/><path d="M54 32.4 Q57.5 30.6 61.2 32.6" fill="none" stroke="#4a2a14" stroke-width="1.5" stroke-linecap="round"/>`;
  const faceShade = `<path d="M31 42 Q34 56 50 58 Q66 56 69 42 Q66 53 50 54.5 Q34 53 31 42 Z" fill="rgba(120,60,40,.13)"/>`;
  const id = `av${++gid}`;
  const parts = [
    it.back ? `<g${fxClass(it.back)}>${back(it.back)}</g>` : '',
    `<g${fxClass(it.pants)}>${pants(it.pants, skin)}</g>`,
    `<g${fxClass(it.shoes)}>${shoes(it.shoes)}</g>`,
    `<g${fxClass(it.shirt)}>${shirt(it.shirt, skin)}</g>`,
    `<circle cx="29.5" cy="90" r="4.5" fill="${skin}"/><circle cx="70.5" cy="90" r="4.5" fill="${skin}"/>`,
    `<rect x="45" y="52" width="10" height="9" fill="${shade(skin, 0.9)}"/>`,
    `<circle cx="30" cy="40" r="4" fill="${skin}"/><circle cx="70" cy="40" r="4" fill="${skin}"/><path d="M28.6 39.5 Q30 37.6 31.4 40" fill="none" stroke="rgba(120,60,40,.35)" stroke-width="1" stroke-linecap="round"/><path d="M71.4 39.5 Q70 37.6 68.6 40" fill="none" stroke="rgba(120,60,40,.35)" stroke-width="1" stroke-linecap="round"/><circle cx="50" cy="38" r="20" fill="${skin}"/>${faceShade}`,
    hair,
    brows,
    // occhi: bianco, iride, pupilla, due luci e palpebra (sbatte le ciglia)
    `<g class="av-eyes"><ellipse cx="42.5" cy="38.6" rx="3.3" ry="3.9" fill="#ffffff" data-flat stroke="#3a2418" stroke-width=".8"/><ellipse cx="57.5" cy="38.6" rx="3.3" ry="3.9" fill="#ffffff" data-flat stroke="#3a2418" stroke-width=".8"/>` +
      `<circle cx="42.9" cy="39" r="2.3" fill="#5a3a22" data-flat/><circle cx="57.9" cy="39" r="2.3" fill="#5a3a22" data-flat/><circle cx="42.9" cy="39.2" r="1.25" fill="#1c1210" data-flat/><circle cx="57.9" cy="39.2" r="1.25" fill="#1c1210" data-flat/>` +
      `<circle cx="43.8" cy="37.9" r=".85" fill="#fff" data-flat/><circle cx="58.8" cy="37.9" r=".85" fill="#fff" data-flat/><circle cx="42.1" cy="40.1" r=".4" fill="#fff" data-flat/><circle cx="57.1" cy="40.1" r=".4" fill="#fff" data-flat/></g>`,
    `<path d="M49.2 41.5 Q48 45 50.2 45.4" fill="none" stroke="rgba(120,60,40,.55)" stroke-width="1.1" stroke-linecap="round"/>`,
    `<path d="M44.2 47.6 Q50 52.6 55.8 47.6 Q50 50 44.2 47.6 Z" fill="#9a3a2c" data-flat stroke="#6a2418" stroke-width=".9" stroke-linejoin="round"/><path d="M47 50 Q50 51.4 53 50" fill="none" stroke="#ff8f8f" stroke-width="1.2" stroke-linecap="round"/>`,
    `<ellipse cx="37.6" cy="45.2" rx="3" ry="1.9" fill="#ff7a7a" opacity=".35" data-flat/><ellipse cx="62.4" cy="45.2" rx="3" ry="1.9" fill="#ff7a7a" opacity=".35" data-flat/>`,
    it.face ? `<g${fxClass(it.face)}>${face(it.face)}</g>` : '',
    it.hat ? `<g${fxClass(it.hat)}>${hat(it.hat)}</g>` : '',
  ];
  const vb = bust ? '14 -10 72 82' : '0 -14 100 142';
  const h = bust ? size : Math.round((size * 142) / 100);
  const ground = bust ? '' : `<ellipse cx="50" cy="123" rx="24" ry="3.6" fill="rgba(30,20,50,.22)" data-flat/>`;
  return toon(`<svg class="avatar-svg" id="${id}" viewBox="${vb}" width="${size}" height="${h}" aria-hidden="true">${ground}${parts.join('')}</svg>`, { outline: 1.1 });
}

/** Disegno di un singolo oggetto (per le caselle dell'armadio e del negozio). */
export function itemPreviewSvg(id, size = 64) {
  const it = ITEMS[id];
  if (!it) return '';
  const equip = { [it.cat]: id };
  const bust = it.cat === 'hat' || it.cat === 'face';
  return avatarSvg({ equip }, { size, bust });
}
