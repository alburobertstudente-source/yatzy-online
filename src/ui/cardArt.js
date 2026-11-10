/**
 * Grafica delle carte potenziamento: icone SVG (stesso stile piatto delle
 * icone della tabella) e costruzione della faccia grande e della mini carta.
 */
import { h } from './dom.js';
import { CARDS, RARITY_INFO } from '../core/cards.js';

const INK = '#262a3d';
const GOLD = '#ffc531';
const GOLD_D = '#c98600';
const WOOD = '#c9874a';
const WOOD_D = '#8a5326';
const VIOLET = '#9a5ae0';
const AZURE = '#22a6d8';
const RED = '#ee4655';

const die = (x, y, s, pips = [[0.5, 0.5]], fill = '#fff') =>
  `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.22}" fill="${fill}" stroke="${INK}" stroke-width="2.6"/>` +
  pips.map(([px, py]) => `<circle cx="${x + px * s}" cy="${y + py * s}" r="${s * 0.1}" fill="${INK}"/>`).join('');

const P2 = [[0.72, 0.28], [0.28, 0.72]];
const P3 = [[0.72, 0.28], [0.5, 0.5], [0.28, 0.72]];
const P5 = [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]];
const P6 = [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]];

const svg = (inner) => `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;

export const CARD_ICONS = {
  ritiraFortuna: svg(
    `${die(10, 22, 20, P2)}${die(34, 22, 20, P3)}
     <path d="M14 16a20 20 0 0 1 34-2" fill="none" stroke="${AZURE}" stroke-width="4" stroke-linecap="round"/>
     <path d="M50 8l-1 8-8-2" fill="none" stroke="${AZURE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M50 50a20 20 0 0 1-34 2" fill="none" stroke="${AZURE}" stroke-width="4" stroke-linecap="round"/>
     <path d="M14 58l1-8 8 2" fill="none" stroke="${AZURE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  scudoLegno: svg(
    `<path d="M32 6l20 7v16c0 14-9 23-20 29C21 52 12 43 12 29V13z" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="3" stroke-linejoin="round"/>
     <path d="M25 9v45M39 9v45" stroke="${WOOD_D}" stroke-width="2.4" opacity=".7"/>
     <path d="M12 24h40" stroke="#9aa3b5" stroke-width="5"/><circle cx="18" cy="24" r="2" fill="${INK}"/><circle cx="46" cy="24" r="2" fill="${INK}"/>`,
  ),
  occhioDestino: svg(
    `<path d="M4 32c8-13 17-19 28-19s20 6 28 19c-8 13-17 19-28 19S12 45 4 32z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
     ${die(21, 21, 22, P5, '#c9ecfa')}
     <path d="M32 4v5M14 9l3 4M50 9l-3 4" stroke="${GOLD_D}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  manoVeloce: svg(
    `<rect x="12" y="10" width="26" height="36" rx="5" fill="#fff" stroke="${INK}" stroke-width="2.6" transform="rotate(-12 25 28)"/>
     <rect x="24" y="14" width="26" height="36" rx="5" fill="${GOLD}" stroke="${INK}" stroke-width="2.6" transform="rotate(8 37 32)"/>
     <path d="M36 26l2 6 6 1-5 4 2 6-5-4-5 4 2-6-5-4 6-1z" fill="#fff" transform="rotate(8 37 32)"/>
     <path d="M4 50h12M2 56h16M8 44h8" stroke="${AZURE}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  dadoTruccato: svg(
    `${die(14, 18, 30, P3)}
     <circle cx="50" cy="16" r="10" fill="${RED}" stroke="#fff" stroke-width="2.5"/><path d="M45 16h10M50 11v10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
     <circle cx="14" cy="50" r="9" fill="${AZURE}" stroke="#fff" stroke-width="2.5"/><path d="M9.5 50h9" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  ),
  furtoFortuna: svg(
    `<path d="M20 22c-4-6 0-12 6-12h12c6 0 10 6 6 12z" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2.6"/>
     <path d="M14 34c0-10 8-14 18-14s18 4 18 14c0 12-8 20-18 20S14 46 14 34z" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2.8"/>
     <circle cx="32" cy="37" r="9" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.4"/>
     <text x="32" y="41" text-anchor="middle" font-size="10" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">10</text>
     <path d="M52 6l-8 10M58 14l-10 6" stroke="${RED}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  scudoArcano: svg(
    `<path d="M32 5l21 8v16c0 15-9 24-21 30C20 53 11 44 11 29V13z" fill="#6c3fd1" stroke="#3b1f86" stroke-width="3" stroke-linejoin="round"/>
     <path d="M32 5l21 8v16c0 15-9 24-21 30z" fill="#8a5ef0"/>
     <path d="M32 18l3.5 8 8.5 1-6.5 5.5 2 8.5L32 37l-7.5 4 2-8.5L20 27l8.5-1z" fill="#c9ecfa" stroke="#fff" stroke-width="1.5"/>
     <circle cx="12" cy="10" r="2.5" fill="#c9ecfa"/><circle cx="54" cy="44" r="2" fill="#c9ecfa"/><circle cx="8" cy="40" r="1.6" fill="#c9ecfa"/>`,
  ),
  doppioLancio: svg(
    `${die(6, 26, 24, P2)}${die(26, 14, 24, P6, '#fff')}
     <circle cx="50" cy="46" r="11" fill="${AZURE}" stroke="#fff" stroke-width="2.5"/>
     <text x="50" y="50.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">+1</text>`,
  ),
  maledizioneCaos: svg(
    `<circle cx="32" cy="32" r="25" fill="#3b1f5e"/>
     <path d="M32 32m-4 0a4 4 0 1 1 8 0a8 8 0 1 1-16 0a12 12 0 1 1 24 0a16 16 0 1 1-32 0a20 20 0 1 1 40 0" fill="none" stroke="#b98cff" stroke-width="3" stroke-linecap="round"/>
     ${die(40, 4, 16, P2)}${die(6, 44, 14, [[0.5, 0.5]])}`,
  ),
  riscritturaDestino: svg(
    `${die(8, 22, 30, P5)}
     <path d="M56 6c-10 3-20 14-24 26l4 2c6-10 14-20 20-28z" fill="#fff" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
     <path d="M32 32l-3 8 7-5" fill="${INK}"/><path d="M40 52h18" stroke="${VIOLET}" stroke-width="3.5" stroke-linecap="round"/>`,
  ),
  saccheggioReale: svg(
    `<rect x="8" y="30" width="48" height="26" rx="5" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2.8"/>
     <path d="M8 30c0-10 8-16 24-16s24 6 24 16z" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2.8"/>
     <rect x="28" y="30" width="8" height="10" rx="2" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>
     <circle cx="18" cy="12" r="6" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/><circle cx="46" cy="10" r="5" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>
     <text x="32" y="53" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">25</text>`,
  ),
  prigioneTemporale: svg(
    `<path d="M20 8h24M20 56h24" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
     <path d="M22 10c0 12 20 12 20 22S22 42 22 54h20c0-12-20-12-20-22s20-10 20-22z" fill="#c9ecfa" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
     <path d="M26 50h12l-6-8z" fill="${GOLD}"/>
     <path d="M10 6v52M54 6v52M4 6v52M60 6v52" stroke="#7b8399" stroke-width="3.5" stroke-linecap="round"/>`,
  ),
  manoDegliDei: svg(
    `<path d="M32 2v8M12 10l5 6M52 10l-5 6M4 28h8M52 28h8" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round"/>
     <path d="M20 58V34c0-3 4-3 4 0v-12c0-3 4-3 4 0v-4c0-3 4-3 4 0v4c0-3 4-3 4 0v6c0-3 4-3 4 0v14c0 8-4 12-6 16z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.6" stroke-linejoin="round"/>
     <circle cx="32" cy="42" r="4" fill="#fff"/>`,
  ),
  rewindTemporale: svg(
    `<circle cx="34" cy="34" r="22" fill="#fff" stroke="${INK}" stroke-width="3"/>
     <path d="M34 20v14l-9 6" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M12 22a24 24 0 0 1 8-10" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>
     <path d="M6 12l6 10 10-5" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  apocalisseDadi: svg(
    `<path d="M10 54c-6-10 2-20 8-24 0 6 4 8 6 8-2-10 6-22 16-26-2 8 2 12 6 16 4-4 4-8 4-12 8 8 10 26 0 38z" fill="#ff7a2f" stroke="#c4321b" stroke-width="2.6" stroke-linejoin="round"/>
     ${die(20, 30, 24, P6)}
     <path d="M26 30l6 9-4 6 6 9" fill="none" stroke="#c4321b" stroke-width="2.6" stroke-linejoin="round"/>`,
  ),
  coronaDestino: svg(
    `<path d="M8 44L12 16l12 12 8-18 8 18 12-12 4 28z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.8" stroke-linejoin="round"/>
     <rect x="8" y="44" width="48" height="9" rx="3" fill="#ffb21e" stroke="${GOLD_D}" stroke-width="2.8"/>
     <circle cx="32" cy="34" r="5" fill="${RED}"/><circle cx="18" cy="38" r="3" fill="${AZURE}"/><circle cx="46" cy="38" r="3" fill="${AZURE}"/>
     <text x="32" y="63" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">×2</text>`,
  ),
};

/** Retro della carta (gratta e vinci / carta coperta). */
export const CARD_BACK = svg(
  `<rect x="8" y="8" width="48" height="48" rx="10" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-dasharray="6 5"/>
   <path d="M32 16l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z" fill="#fff"/>`,
);

const GEMS = { common: 1, rare: 2, epic: 3, legendary: 4 };

/** Faccia grande della carta (gratta e vinci, dettaglio). */
export function bigCard(id, { extraClass = '' } = {}) {
  const c = CARDS[id];
  const gems = h('div', { class: 'cf-gems' });
  for (let i = 0; i < 4; i++) gems.append(h('span', { class: i < GEMS[c.rarity] ? 'on' : '' }));
  return h(
    'div',
    { class: `card-face big r-${c.rarity} ${extraClass}`, dataset: { card: id } },
    h('div', { class: 'cf-ribbon' }, RARITY_INFO[c.rarity].label.toUpperCase()),
    h('div', { class: 'cf-medal', html: CARD_ICONS[id] }),
    h('div', { class: 'cf-name' }, c.name),
    h('div', { class: 'cf-text' }, c.text),
    gems,
  );
}

/** Mini carta per la mano del giocatore. */
export function miniCard(entry, { locked = false, onTap } = {}) {
  const c = CARDS[entry.id];
  const el = h(
    'button',
    {
      class: `card-face mini r-${c.rarity}${locked ? ' is-locked' : ''}`,
      type: 'button',
      'aria-label': `${c.name}${locked ? ' (bloccata)' : ''}`,
      dataset: { uid: String(entry.uid), card: entry.id },
      onpointerdown: (e) => {
        e.preventDefault();
        onTap?.(entry.uid);
      },
    },
    h('div', { class: 'cf-medal', html: CARD_ICONS[entry.id] }),
    h('div', { class: 'cf-name' }, c.name),
    locked ? h('div', { class: 'cf-chains', html: CHAINS }) : null,
  );
  return el;
}

export const CHAINS = `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="#c9ced9" stroke-width="5"><rect x="-4" y="22" width="24" height="12" rx="6" transform="rotate(-30 8 28)"/><rect x="14" y="26" width="24" height="12" rx="6" transform="rotate(-30 26 32)"/><rect x="32" y="30" width="24" height="12" rx="6" transform="rotate(-30 44 36)"/><rect x="50" y="34" width="24" height="12" rx="6" transform="rotate(-30 62 40)"/></g><circle cx="32" cy="34" r="11" fill="#5f6a82" stroke="#fff" stroke-width="3"/><rect x="27" y="32" width="10" height="8" rx="2" fill="#fff"/><path d="M29 32v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#fff" stroke-width="2"/></svg>`;

/** Piccole icone di stato (scudo, maledizione, occhio, corona, artigli). */
export const MINI = {
  shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 6-4 9.5-8 11-4-1.5-8-5-8-11V5z" fill="currentColor" stroke="#fff" stroke-width="1.6"/></svg>`,
  curse: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#3b1f5e"/><path d="M12 12m-1.5 0a1.5 1.5 0 1 1 3 0a3 3 0 1 1-6 0a4.5 4.5 0 1 1 9 0a6 6 0 1 1-12 0" fill="none" stroke="#b98cff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12C4.5 7 8 5 12 5s7.5 2 10.5 7c-3 5-6.5 7-10.5 7S4.5 17 1.5 12z" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="${AZURE}"/><circle cx="12" cy="12" r="1.6" fill="${INK}"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18L4 7l5 4 3-6 3 6 5-4 1 11z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  claw: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l4 16M12 3l3 17M18 4l1 15" stroke="${RED}" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  cards: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="11" height="15" rx="2.5" fill="#fff" stroke="currentColor" stroke-width="1.6" transform="rotate(-10 8 12)"/><rect x="9" y="4" width="11" height="15" rx="2.5" fill="currentColor" stroke="#fff" stroke-width="1.6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>`,
};
