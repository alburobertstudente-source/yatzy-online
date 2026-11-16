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
/** Bollino con un testo corto (per le icone delle carte più nuove). */
const badge = (t, fill = RED, x = 48, y = 48, r = 11) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="${t.length > 2 ? 9 : 11}" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">${t}</text>`;
const coin = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="none" stroke="${GOLD_D}" stroke-width="1.4" opacity=".6"/>`;
const cardShape = (x, y, fill = '#fff', rot = 0) => `<rect x="${x}" y="${y}" width="20" height="28" rx="4" fill="${fill}" stroke="${INK}" stroke-width="2.4" transform="rotate(${rot} ${x + 10} ${y + 14})"/>`;
const shieldShape = (fill = '#5b7bd5') => `<path d="M32 6l20 7v16c0 14-9 23-20 29C21 52 12 43 12 29V13z" fill="${fill}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
const orb = (fill = '#3b1f5e') => `<circle cx="32" cy="30" r="20" fill="${fill}"/><path d="M32 30m-3 0a3 3 0 1 1 6 0a7 7 0 1 1-14 0a11 11 0 1 1 22 0" fill="none" stroke="#b98cff" stroke-width="3" stroke-linecap="round"/>`;


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
  dadoGemello: svg(
    `${die(6, 20, 24, P5)}${die(34, 20, 24, P5)}
     <path d="M20 50c4 6 20 6 24 0" fill="none" stroke="${AZURE}" stroke-width="3.5" stroke-linecap="round"/>
     <path d="M40 46l4 4-5 3" fill="none" stroke="${AZURE}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="32" cy="10" r="5" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>`,
  ),
  sabotaggio: svg(
    `<rect x="10" y="14" width="40" height="40" rx="8" fill="#fff" stroke="${INK}" stroke-width="3"/>
     <path d="M16 20l28 28M44 20L16 48" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>
     <path d="M48 4c4 2 8 6 8 10" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
     <circle cx="52" cy="16" r="7" fill="${INK}"/><path d="M55 9l4-4" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  spiccioloFortunato: svg(
    `<circle cx="32" cy="34" r="22" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="3"/>
     <circle cx="32" cy="34" r="15" fill="none" stroke="${GOLD_D}" stroke-width="2" opacity=".6"/>
     <text x="32" y="41" text-anchor="middle" font-size="18" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">+8</text>
     <path d="M10 8l3 6M54 8l-3 6M32 2v6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  geloEterno: svg(
    `${die(14, 18, 36, P2, '#c9ecfa')}
     <path d="M32 4v14M24 8l8 6 8-6M10 56l10-8M54 56l-10-8" stroke="#5bb8e8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M14 40h36" stroke="#fff" stroke-width="2" opacity=".8"/><circle cx="20" cy="24" r="2" fill="#fff"/>`,
  ),
  manoLesta: svg(
    `<rect x="26" y="8" width="24" height="34" rx="5" fill="${GOLD}" stroke="${INK}" stroke-width="2.6" transform="rotate(12 38 25)"/>
     <path d="M8 52c2-10 8-16 14-18l10-2c4 0 4 5 0 6l-6 2 10-2c4 0 4 5 0 6l-12 4c-6 2-10 6-12 8z" fill="#f0bf98" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
     <path d="M4 26h10M2 32h10" stroke="${AZURE}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  lancioBenedetto: svg(
    `<ellipse cx="32" cy="12" rx="16" ry="5" fill="none" stroke="${GOLD}" stroke-width="3.5"/>
     ${die(16, 22, 32, P5)}
     <path d="M6 30l4 2M58 30l-4 2M8 50l4-2M56 50l-4-2" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  calamita: svg(
    `<path d="M12 10v18a20 20 0 0 0 40 0V10H40v18a8 8 0 0 1-16 0V10z" fill="${RED}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
     <rect x="12" y="10" width="12" height="8" fill="#e3e7ef" stroke="${INK}" stroke-width="2.4"/><rect x="40" y="10" width="12" height="8" fill="#e3e7ef" stroke="${INK}" stroke-width="2.4"/>
     ${die(24, 44, 16, P3)}
     <path d="M14 52h6M44 52h6" stroke="${AZURE}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  reteSalvataggio: svg(
    `<path d="M6 22c8 10 44 10 52 0v20c-8 12-44 12-52 0z" fill="#fff" stroke="${INK}" stroke-width="2.6"/>
     <path d="M14 26v20M24 29v20M34 30v20M44 29v20M54 26v18M6 32c10 8 42 8 52 0M6 42c10 8 42 8 52 0" stroke="#7b8399" stroke-width="2"/>
     <circle cx="32" cy="12" r="8" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.4"/>
     <text x="32" y="16" text-anchor="middle" font-size="9" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">15</text>`,
  ),
  mezzaLuna: svg(
    `<circle cx="32" cy="32" r="26" fill="#3b1f5e"/>
     <path d="M40 10a22 22 0 1 0 0 44 18 18 0 1 1 0-44z" fill="#ffe59a" stroke="#c9a23a" stroke-width="2"/>
     <text x="44" y="40" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">½</text>`,
  ),
  lancioRubato: svg(
    `${die(10, 18, 28, P3)}
     <circle cx="48" cy="44" r="12" fill="${RED}" stroke="#fff" stroke-width="2.5"/>
     <text x="48" y="49" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">−1</text>
     <path d="M44 6l-6 10M54 10l-10 6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  scambioSorte: svg(
    `<rect x="6" y="26" width="20" height="28" rx="4" fill="#ff8a8f" stroke="${INK}" stroke-width="2.6"/>
     <rect x="38" y="14" width="20" height="40" rx="4" fill="#7fd6f5" stroke="${INK}" stroke-width="2.6"/>
     <path d="M14 18c4-10 26-12 32-6" fill="none" stroke="${VIOLET}" stroke-width="3.5" stroke-linecap="round"/>
     <path d="M12 12l2 7 7-2" fill="none" stroke="${VIOLET}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  tempestaLanci: svg(
    `<path d="M14 24a12 12 0 0 1 22-8 10 10 0 0 1 18 6 8 8 0 0 1-2 16H16a8 8 0 0 1-2-14z" fill="#7b8399" stroke="${INK}" stroke-width="2.6"/>
     ${die(10, 40, 16, P2)}${die(36, 42, 16, P3)}
     <path d="M30 38l-4 10h6l-4 10" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
     <text x="54" y="16" text-anchor="middle" font-size="12" font-weight="700" fill="${VIOLET}" font-family="Fredoka, sans-serif">+2</text>`,
  ),
  moltiplicatore: svg(
    `<circle cx="32" cy="32" r="24" fill="${VIOLET}" stroke="#4a1f86" stroke-width="3"/>
     <text x="32" y="40" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">×1,5</text>
     <path d="M8 8l6 6M56 8l-6 6M8 56l6-6M56 56l-6-6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  reDeiLadri: svg(
    `<path d="M14 22L16 8l8 7 8-10 8 10 8-7 2 14z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.4" stroke-linejoin="round"/>
     <path d="M12 34c0-8 9-12 20-12s20 4 20 12c0 14-9 24-20 24S12 48 12 34z" fill="#3b2a24" stroke="#1d1410" stroke-width="2.6"/>
     <circle cx="32" cy="40" r="9" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.4"/>
     <text x="32" y="44" text-anchor="middle" font-size="10" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">50</text>`,
  ),
  scudoDivino: svg(
    `<path d="M32 4l22 8v17c0 15-10 25-22 31C20 54 10 44 10 29V12z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="3" stroke-linejoin="round"/>
     <path d="M32 4l22 8v17c0 15-10 25-22 31z" fill="#ffe08a"/>
     <path d="M32 16v26M22 26h20" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
     <ellipse cx="32" cy="6" rx="12" ry="3" fill="none" stroke="#fff6c2" stroke-width="2.5"/>`,
  ),
  bigBang: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>
     <path d="M32 6l5 16 16-6-10 14 16 6-17 3 6 16-14-10-8 15-1-17-17 4 12-12-12-12 17 4z" fill="#ffd23f" stroke="#ff3fa4" stroke-width="2" stroke-linejoin="round"/>
     ${die(22, 22, 20, P6)}`,
  ),
  furtoCosmico: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>
     <circle cx="14" cy="14" r="1.6" fill="#fff"/><circle cx="50" cy="12" r="1.2" fill="#fff"/><circle cx="54" cy="46" r="1.6" fill="#fff"/>
     <ellipse cx="32" cy="36" rx="24" ry="7" fill="none" stroke="#2fd0ff" stroke-width="3" transform="rotate(-18 32 36)"/>
     <path d="M20 30c0-8 6-12 12-12s12 4 12 12c0 10-6 16-12 16S20 40 20 30z" fill="#7a5cff" stroke="#fff" stroke-width="2"/>
     <path d="M26 22l-4-10M38 22l4-10" stroke="#ff3fa4" stroke-width="3" stroke-linecap="round"/>
     <circle cx="32" cy="32" r="6" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>`,
  ),
  tempoInfinito: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>
     <path d="M12 32c0-8 8-12 14-6l12 12c6 6 14 2 14-6s-8-12-14-6L26 38c-6 6-14 2-14-6z" fill="none" stroke="#2fd0ff" stroke-width="5" stroke-linecap="round"/>
     <path d="M12 32c0-8 8-12 14-6l12 12c6 6 14 2 14-6s-8-12-14-6L26 38c-6 6-14 2-14-6z" fill="none" stroke="#ff3fa4" stroke-width="2" stroke-dasharray="4 5"/>
     <text x="32" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="#ffd23f" font-family="Fredoka, sans-serif">+8</text>`,
  ),
  benedizioneEterna: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>
     <path d="M32 6v10M10 18l7 6M54 18l-7 6M6 38h9M58 38h-9" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
     <ellipse cx="32" cy="20" rx="12" ry="3.5" fill="none" stroke="#fff6c2" stroke-width="2.6"/>
     ${die(20, 26, 24, P5, '#fff6c2')}
     <text x="54" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="#2fd0ff" font-family="Fredoka, sans-serif">×4</text>`,
  ),
  bucoNero: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>
     <ellipse cx="32" cy="32" rx="26" ry="9" fill="none" stroke="#ff7a2f" stroke-width="4" transform="rotate(-20 32 32)"/>
     <ellipse cx="32" cy="32" rx="20" ry="6" fill="none" stroke="#ffd23f" stroke-width="2" transform="rotate(-20 32 32)"/>
     <circle cx="32" cy="32" r="11" fill="#000" stroke="#ff3fa4" stroke-width="2"/>
     <rect x="44" y="8" width="10" height="14" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.6" transform="rotate(30 49 15)"/>
     <rect x="8" y="42" width="10" height="14" rx="2" fill="${GOLD}" stroke="${INK}" stroke-width="1.6" transform="rotate(-40 13 49)"/>`,
  ),
  ladroDiLanci: svg(
    `${die(6, 24, 22, P2)}<path d="M30 30h10" stroke="#35c46a" stroke-width="4" stroke-linecap="round"/><path d="M36 25l5 5-5 5" fill="none" stroke="#35c46a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="50" cy="20" r="9" fill="${AZURE}" stroke="#fff" stroke-width="2"/><text x="50" y="24" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">+1</text>
     <circle cx="50" cy="46" r="9" fill="${RED}" stroke="#fff" stroke-width="2"/><text x="50" y="50" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">−1</text>`,
  ),
  eco: svg(
    `<path d="M14 32a18 18 0 0 1 18-18" fill="none" stroke="${VIOLET}" stroke-width="4" stroke-linecap="round"/>
     <path d="M8 32a24 24 0 0 1 24-24" fill="none" stroke="${VIOLET}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
     <rect x="24" y="24" width="32" height="32" rx="6" fill="#fff" stroke="${INK}" stroke-width="2.6"/>
     <text x="40" y="45" text-anchor="middle" font-size="14" font-weight="700" fill="${VIOLET}" font-family="Fredoka, sans-serif">×2</text>`,
  ),
  tesoroDraghi: svg(
    `<path d="M8 30h48v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2.6"/>
     <path d="M12 30c0-10 8-16 20-16s20 6 20 16" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.4"/>
     <circle cx="22" cy="22" r="4" fill="${RED}"/><circle cx="42" cy="22" r="4" fill="#35c46a"/>
     <text x="32" y="50" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">+40</text>`,
  ),
  clonazione: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>
     <rect x="10" y="16" width="20" height="28" rx="4" fill="${GOLD}" stroke="#fff" stroke-width="2"/>
     <rect x="34" y="16" width="20" height="28" rx="4" fill="${GOLD}" stroke="#fff" stroke-width="2" opacity=".75"/>
     <path d="M20 50c4 6 20 6 24 0" fill="none" stroke="#2fd0ff" stroke-width="3" stroke-dasharray="3 3"/>`,
  ),
  seiFortunato: svg(
    `${die(14, 16, 34, P6)}<path d="M6 10l4 4M58 10l-4 4M32 2v6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="50" r="9" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/><text x="50" y="54" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">6</text>`,
  ),
  spintaGentile: svg(
    `${die(6, 22, 22, [[0.5, 0.5]])}${die(36, 22, 22, P2)}<path d="M30 33h4" stroke="${AZURE}" stroke-width="4" stroke-linecap="round"/><path d="M31 28l5 5-5 5" fill="none" stroke="${AZURE}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 54c6-6 34-6 40 0" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  paccaSpalla: svg(
    `<path d="M14 50c0-12 8-20 18-20s18 8 18 20z" fill="#f0bf98" stroke="${INK}" stroke-width="2.6"/><path d="M22 30c-2-8 2-14 8-14h4c6 0 10 6 8 14" fill="#f0bf98" stroke="${INK}" stroke-width="2.6"/><circle cx="48" cy="14" r="10" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/><text x="48" y="18" text-anchor="middle" font-size="10" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">+6</text>`,
  ),
  rimbalzo: svg(
    `${die(20, 30, 24, P3)}<path d="M6 54c6-30 14-40 20-24M58 54c-6-30-14-40-20-24" fill="none" stroke="${AZURE}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="4 4"/><path d="M32 4v14M26 12l6 6 6-6" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  antidoto: svg(
    `<path d="M26 6h12v10l10 18v20a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V34l10-18z" fill="#c9f5d6" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M17 38h30v16a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z" fill="#35c46a"/><path d="M32 40v12M26 46h12" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  ),
  tassaDelRe: svg(
    `<path d="M12 22L14 8l9 7 9-10 9 10 9-7 2 14z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2.4" stroke-linejoin="round"/><rect x="10" y="28" width="44" height="28" rx="4" fill="#fff" stroke="${INK}" stroke-width="2.6"/><path d="M16 36h32M16 44h20" stroke="#7b8399" stroke-width="2.5"/><text x="32" y="54" text-anchor="middle" font-size="10" font-weight="700" fill="${RED}" font-family="Fredoka, sans-serif">−6×3</text>`,
  ),
  raddoppioSuperiore: svg(
    `${die(8, 18, 24, [[0.28, 0.28], [0.72, 0.72]])}<path d="M36 30h8M36 36h8" stroke="${INK}" stroke-width="3"/><circle cx="52" cy="33" r="10" fill="${AZURE}" stroke="#fff" stroke-width="2.5"/><text x="52" y="37" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">×2</text>`,
  ),
  trappola: svg(
    `<path d="M6 46h52" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M10 46c0-14 10-22 22-22s22 8 22 22" fill="none" stroke="#7b8399" stroke-width="4"/><path d="M12 46l4-10 4 10 4-10 4 10 4-10 4 10 4-10 4 10 4-10 4 10" fill="none" stroke="#c9ced9" stroke-width="2.5" stroke-linejoin="round"/><text x="32" y="20" text-anchor="middle" font-size="12" font-weight="700" fill="${RED}" font-family="Fredoka, sans-serif">−12</text>`,
  ),
  investimento: svg(
    `<rect x="10" y="40" width="8" height="16" fill="${AZURE}"/><rect x="24" y="30" width="8" height="26" fill="${AZURE}"/><rect x="38" y="20" width="8" height="36" fill="${AZURE}"/><path d="M8 34L22 22l10 6 20-18" fill="none" stroke="#35c46a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 8h10v10" fill="none" stroke="#35c46a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  specchioRiflesso: svg(
    `<ellipse cx="32" cy="28" rx="18" ry="22" fill="#c9ecfa" stroke="${GOLD_D}" stroke-width="4"/><path d="M22 18l8-6M20 28l16-14" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M32 50v10M24 60h16" stroke="${GOLD_D}" stroke-width="4" stroke-linecap="round"/><path d="M4 40l10-6-2 8" fill="none" stroke="${RED}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  rivincita: svg(
    `<path d="M8 50l14-14 10 8 22-26" fill="none" stroke="#35c46a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 16h12v12" fill="none" stroke="#35c46a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 14l10 10M18 14L8 24" stroke="${RED}" stroke-width="3.5" stroke-linecap="round"/>`,
  ),
  combo: svg(
    `<rect x="6" y="14" width="22" height="30" rx="4" fill="#fff" stroke="${INK}" stroke-width="2.4" transform="rotate(-10 17 29)"/><rect x="22" y="12" width="22" height="30" rx="4" fill="${AZURE}" stroke="${INK}" stroke-width="2.4"/><rect x="38" y="16" width="22" height="30" rx="4" fill="${GOLD}" stroke="${INK}" stroke-width="2.4" transform="rotate(10 49 31)"/><text x="32" y="60" text-anchor="middle" font-size="12" font-weight="700" fill="${VIOLET}" font-family="Fredoka, sans-serif">+15</text>`,
  ),
  terremoto: svg(
    `<path d="M4 40h12l4-10 6 20 6-28 6 24 4-8h18" fill="none" stroke="${RED}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 54h48" stroke="${WOOD_D}" stroke-width="4" stroke-linecap="round"/><path d="M20 54l4 6M36 54l-3 6M46 54l4 5" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/><text x="32" y="14" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">−3</text>`,
  ),
  jackpot: svg(
    `<rect x="8" y="12" width="48" height="40" rx="8" fill="${RED}" stroke="${INK}" stroke-width="2.6"/><rect x="14" y="20" width="10" height="16" rx="2" fill="#fff"/><rect x="27" y="20" width="10" height="16" rx="2" fill="#fff"/><rect x="40" y="20" width="10" height="16" rx="2" fill="#fff"/><text x="19" y="33" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">7</text><text x="32" y="33" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">7</text><text x="45" y="33" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">7</text><circle cx="32" cy="46" r="4" fill="${GOLD}"/>`,
  ),
  catene: svg(
    `<g fill="none" stroke="#7b8399" stroke-width="5"><rect x="4" y="22" width="20" height="12" rx="6"/><rect x="20" y="26" width="20" height="12" rx="6"/><rect x="36" y="22" width="20" height="12" rx="6"/></g>${die(20, 38, 22, P2)}<path d="M48 40l8 8M56 40l-8 8" stroke="${RED}" stroke-width="3.5" stroke-linecap="round"/>`,
  ),
  contrattacco: svg(
    `<path d="M10 54L42 14" stroke="#c9ced9" stroke-width="6" stroke-linecap="round"/><path d="M54 54L22 14" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/><path d="M12 46l8 4M44 50l8-4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="6" fill="${RED}" stroke="#fff" stroke-width="2"/>`,
  ),
  tempestaPerfetta: svg(
    `<path d="M12 26a12 12 0 0 1 22-8 10 10 0 0 1 18 6 8 8 0 0 1-2 16H14a8 8 0 0 1-2-14z" fill="#3b1f5e" stroke="${INK}" stroke-width="2.6"/><path d="M28 40l-6 10h8l-6 12" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 44l-2 8M50 44l-2 8M38 44l-2 8" stroke="#7fd6f5" stroke-width="3" stroke-linecap="round"/>`,
  ),
  fontanaDesideri: svg(
    `<path d="M10 44h44l-4 14H14z" fill="#9aa3b5" stroke="${INK}" stroke-width="2.6"/><path d="M32 44V20M32 20c-6-8-16-8-20 4M32 20c6-8 16-8 20 4" fill="none" stroke="${AZURE}" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="50" r="3" fill="${GOLD}"/><circle cx="34" cy="51" r="3" fill="${GOLD}"/><circle cx="42" cy="49" r="3" fill="${GOLD}"/>`,
  ),
  pioggiaOro: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/><circle cx="18" cy="16" r="6" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/><circle cx="40" cy="12" r="5" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/><circle cx="50" cy="28" r="6" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/><circle cx="14" cy="34" r="5" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/><text x="32" y="52" text-anchor="middle" font-size="14" font-weight="700" fill="${GOLD}" font-family="Fredoka, sans-serif">+100</text>`,
  ),
  colpoDiFortuna: svg(
    `${die(14, 18, 30, [[0.5, 0.5]])}<path d="M50 10a12 12 0 1 1-6 22" fill="none" stroke="${AZURE}" stroke-width="4" stroke-linecap="round"/><path d="M40 30l4 4 5-4" fill="none" stroke="${AZURE}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  piccolaScommessa: svg(
    `${coin(22, 28, 12)}${coin(38, 36, 10)}${badge('+12', '#35c46a', 50, 14, 10)}${badge('−4', RED, 14, 52, 9)}`,
  ),
  salvadanaio: svg(
    `<ellipse cx="30" cy="36" rx="22" ry="16" fill="#ff9fb4" stroke="${INK}" stroke-width="2.6"/><rect x="24" y="20" width="12" height="4" rx="2" fill="${INK}"/><circle cx="42" cy="32" r="2.4" fill="${INK}"/><path d="M18 50v8M40 50v8" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${coin(30, 10, 7)}`,
  ),
  spintone: svg(
    `<path d="M8 34h22l-6-8M30 34l-6 8" fill="none" stroke="${RED}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="34" y="18" width="24" height="30" rx="5" fill="#fff" stroke="${INK}" stroke-width="2.6" transform="rotate(12 46 33)"/>${badge('−5', RED, 48, 54, 9)}`,
  ),
  allarme: svg(
    `<path d="M18 46V30a14 14 0 0 1 28 0v16z" fill="${RED}" stroke="${INK}" stroke-width="2.6"/><rect x="12" y="46" width="40" height="8" rx="3" fill="#7b8399" stroke="${INK}" stroke-width="2.4"/><path d="M6 18l6 4M58 18l-6 4M32 6v8" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round"/>`,
  ),
  primoPasso: svg(
    `<path d="M16 52c-4-10 2-18 8-18s8 8 4 18z" fill="#f0bf98" stroke="${INK}" stroke-width="2.4"/><path d="M34 30c-4-10 2-18 8-18s8 8 4 18z" fill="#f0bf98" stroke="${INK}" stroke-width="2.4"/>${badge('+1', AZURE, 50, 48, 10)}`,
  ),
  elemosina: svg(
    `<path d="M10 40c8 0 14 4 22 4s14-6 22-6v14H10z" fill="#f0bf98" stroke="${INK}" stroke-width="2.4"/>${coin(26, 22, 8)}${coin(40, 16, 7)}`,
  ),
  tiroMancino: svg(
    `${die(16, 18, 32, [[0.5, 0.5]])}<path d="M6 10c6-4 12-2 14 4" fill="none" stroke="${VIOLET}" stroke-width="3.5" stroke-linecap="round"/>${badge('1', VIOLET, 50, 50, 10)}`,
  ),
  amuleto: svg(
    `<path d="M20 6c0 10 24 10 24 0" fill="none" stroke="${GOLD_D}" stroke-width="3"/><path d="M32 16l14 10-6 24H24l-6-24z" fill="#7fd6f5" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="32" cy="32" r="5" fill="#fff"/>`,
  ),
  pescaDoppia: svg(
    `${cardShape(10, 16, '#fff', -10)}${cardShape(34, 16, GOLD, 10)}${badge('+2', AZURE, 32, 52, 10)}`,
  ),
  contromossa: svg(
    `${cardShape(20, 12, GOLD)}<path d="M10 10l44 44" stroke="${RED}" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="32" r="26" fill="none" stroke="${RED}" stroke-width="5"/>`,
  ),
  scommessaYatzy: svg(
    `${die(4, 26, 14, [[0.5, 0.5]])}${die(17, 26, 14, [[0.5, 0.5]])}${die(30, 26, 14, [[0.5, 0.5]])}${die(43, 26, 14, [[0.5, 0.5]])}${badge('+50', '#35c46a', 32, 12, 10)}`,
  ),
  invidia: svg(
    `<circle cx="32" cy="32" r="22" fill="#35c46a" stroke="${INK}" stroke-width="2.6"/><path d="M20 28l8 2M44 28l-8 2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="25" cy="34" r="3" fill="${INK}"/><circle cx="39" cy="34" r="3" fill="${INK}"/><path d="M24 46c6-4 10-4 16 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  spia: svg(
    `<path d="M10 30c6-10 14-14 22-14s16 4 22 14" fill="#3b2a24" stroke="${INK}" stroke-width="2.6"/><rect x="8" y="28" width="48" height="6" rx="3" fill="#3b2a24"/><circle cx="22" cy="44" r="7" fill="#c9ecfa" stroke="${INK}" stroke-width="2.6"/><circle cx="42" cy="44" r="7" fill="#c9ecfa" stroke="${INK}" stroke-width="2.6"/><path d="M29 44h6" stroke="${INK}" stroke-width="2.6"/>`,
  ),
  esorcismo: svg(
    `${orb()}<path d="M32 52V40M26 46h12" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/><path d="M50 12l-8 6" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  slancio: svg(
    `<path d="M8 50L28 30l8 8 20-24" fill="none" stroke="${AZURE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${cardShape(10, 8, '#fff', -8)}${badge('+5', GOLD_D, 50, 50, 10)}`,
  ),
  rogo: svg(
    `${cardShape(22, 18, '#fff')}<path d="M18 58c-6-10 2-16 6-20 0 6 4 8 6 8-2-10 6-18 14-22-2 8 2 12 6 16 4-4 4-6 4-10 6 8 8 20 0 28z" fill="#ff7a2f" stroke="#c4321b" stroke-width="2.4" stroke-linejoin="round" opacity=".92"/>`,
  ),
  ritmo: svg(
    `<path d="M14 48V16l26-6v32" fill="none" stroke="${INK}" stroke-width="3.5"/><ellipse cx="10" cy="48" rx="6" ry="5" fill="${INK}"/><ellipse cx="36" cy="42" rx="6" ry="5" fill="${INK}"/>${badge('+1', AZURE, 50, 50, 10)}`,
  ),
  ultimoAtto: svg(
    `<path d="M6 10h52v8H6z" fill="${RED}"/><path d="M6 18c6 14 6 30 0 40M58 18c-6 14-6 30 0 40" fill="${RED}" stroke="#a0262f" stroke-width="2"/>${badge('×2', VIOLET, 32, 40, 12)}`,
  ),
  scambioCarte: svg(
    `${cardShape(8, 14, '#fff', -12)}${cardShape(36, 14, GOLD, 12)}<path d="M22 50c6 6 14 6 20 0M42 50l0-6M22 50l6 0" fill="none" stroke="${AZURE}" stroke-width="3.5" stroke-linecap="round"/>`,
  ),
  sfondamento: svg(
    `${shieldShape('#9aa3b5')}<path d="M22 14l10 16-8 6 12 18" fill="none" stroke="${RED}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  rapina: svg(
    `<rect x="10" y="22" width="44" height="14" rx="7" fill="#262a3d"/><circle cx="22" cy="29" r="4" fill="#fff"/><circle cx="42" cy="29" r="4" fill="#fff"/>${coin(32, 48, 9)}${badge('12', RED, 52, 12, 9)}`,
  ),
  grandeScommessa: svg(
    `${coin(16, 40, 10)}${coin(32, 32, 12)}${coin(48, 40, 10)}${badge('+35', '#35c46a', 32, 12, 10)}`,
  ),
  sigillo: svg(
    `<circle cx="32" cy="30" r="20" fill="${RED}" stroke="#a0262f" stroke-width="3"/><path d="M24 30l6 6 10-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 48l-4 12 8-4M42 48l4 12-8-4" fill="${RED}"/>`,
  ),
  valanga: svg(
    `<path d="M4 52L24 16l10 14 8-10 18 32z" fill="#e3f4ff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="18" cy="46" r="4" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="30" cy="48" r="3" fill="#fff" stroke="${INK}" stroke-width="1.6"/>${badge('−3', RED, 52, 14, 9)}`,
  ),
  biblioteca: svg(
    `<rect x="8" y="14" width="10" height="40" fill="${RED}" stroke="${INK}" stroke-width="2"/><rect x="20" y="10" width="10" height="44" fill="${AZURE}" stroke="${INK}" stroke-width="2"/><rect x="32" y="16" width="10" height="38" fill="#35c46a" stroke="${INK}" stroke-width="2"/>${badge('+2', VIOLET, 50, 48, 10)}`,
  ),
  fortezza: svg(
    `<path d="M8 56V22h8v8h8v-8h16v8h8v-8h8v34z" fill="#9aa3b5" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M26 56V42a6 6 0 0 1 12 0v14" fill="#5f6a82"/><ellipse cx="32" cy="14" rx="8" ry="6" fill="#c9ecfa" stroke="${GOLD_D}" stroke-width="2"/>`,
  ),
  turnoPerfetto: svg(
    `<circle cx="32" cy="32" r="24" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="32" r="15" fill="${RED}"/><circle cx="32" cy="32" r="6" fill="#fff"/><path d="M52 8L34 30" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  rimontaFuriosa: svg(
    `<path d="M6 54l14-12 10 6 22-30" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 14h12v12" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20l6-8M18 24l8-4" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  granFinale: svg(
    `<path d="M32 6l4 12h12l-10 8 4 12-10-8-10 8 4-12-10-8h12z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2" stroke-linejoin="round"/><path d="M8 48l8-6M56 48l-8-6M32 46v12" stroke="${VIOLET}" stroke-width="3.5" stroke-linecap="round"/><circle cx="14" cy="56" r="3" fill="${RED}"/><circle cx="50" cy="56" r="3" fill="${AZURE}"/>`,
  ),
  bancarotta: svg(
    `<path d="M14 26h36l-4 28H18z" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="2.6"/><path d="M22 26c0-8 4-14 10-14s10 6 10 14" fill="none" stroke="${WOOD_D}" stroke-width="3"/><path d="M24 34l16 14M40 34L24 48" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>`,
  ),
  tempestaCarte: svg(
    `${cardShape(6, 22, '#fff', -20)}${cardShape(22, 12, GOLD, 0)}${cardShape(38, 22, '#7fd6f5', 20)}<path d="M30 52l-4 8h8l-4 6" fill="none" stroke="${VIOLET}" stroke-width="3" stroke-linecap="round"/>`,
  ),
  muroInvalicabile: svg(
    `<rect x="6" y="14" width="52" height="40" fill="#c97a4a" stroke="${INK}" stroke-width="2.6"/><path d="M6 27h52M6 40h52M20 14v13M40 14v13M30 27v13M14 40v14M48 40v14" stroke="${WOOD_D}" stroke-width="2"/>${badge('×2', AZURE, 52, 12, 9)}`,
  ),
  pattoDiavolo: svg(
    `<path d="M12 52c4-20 10-30 20-30s16 10 20 30z" fill="#c4321b" stroke="${INK}" stroke-width="2.6"/><path d="M20 22l-6-14 12 8M44 22l6-14-12 8" fill="#c4321b" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M24 38h16" stroke="${GOLD}" stroke-width="3"/>${badge('+40', GOLD_D, 32, 50, 10)}`,
  ),
  ladroSupremo: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/><rect x="14" y="22" width="36" height="10" rx="5" fill="#ff3fa4"/><circle cx="24" cy="27" r="3" fill="#fff"/><circle cx="40" cy="27" r="3" fill="#fff"/>${coin(18, 46, 6)}${coin(32, 48, 6)}${coin(46, 46, 6)}`,
  ),
  fenice: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/><path d="M32 50c-10-6-20-14-22-28 8 6 14 6 18 2-2-8 2-14 4-18 2 4 6 10 4 18 4 4 10 4 18-2-2 14-12 22-22 28z" fill="#ff7a2f" stroke="#ffd23f" stroke-width="2" stroke-linejoin="round"/>`,
  ),
  onnipotenza: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>${die(8, 24, 14, [[0.5, 0.5]], '#fff6c2')}${die(25, 24, 14, [[0.5, 0.5]], '#fff6c2')}${die(42, 24, 14, [[0.5, 0.5]], '#fff6c2')}<path d="M14 16l6 4M50 16l-6 4M32 8v8" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>`,
  ),
  jackpotCosmico: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/>${coin(32, 30, 14)}<circle cx="12" cy="14" r="1.6" fill="#fff"/><circle cx="52" cy="50" r="1.6" fill="#fff"/>${badge('+60', '#ff3fa4', 46, 50, 10)}`,
  ),
  manoDelRe: svg(
    `<circle cx="32" cy="32" r="28" fill="#1a0b3a"/><path d="M16 22L18 10l7 6 7-9 7 9 7-6 2 12z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2" stroke-linejoin="round"/>${cardShape(10, 28, '#fff', -12)}${cardShape(22, 26, GOLD, 0)}${cardShape(34, 28, '#7fd6f5', 12)}`,
  ),
  dominioAssoluto: svg(
    `<circle cx="32" cy="32" r="30" fill="#001a26"/><circle cx="32" cy="32" r="26" fill="none" stroke="#00d9ff" stroke-width="2.5" stroke-dasharray="3 4"/><path d="M14 22L18 8l7 7 7-10 7 10 7-7 4 14z" fill="#00d9ff" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>${die(10, 28, 14, [[0.5, 0.5]], "#e6fbff")}${die(25, 28, 14, [[0.5, 0.5]], "#e6fbff")}${die(40, 28, 14, [[0.5, 0.5]], "#e6fbff")}<text x="32" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="#00d9ff" font-family="Fredoka, sans-serif">×5</text>`,
  ),
};

/** Retro della carta (gratta e vinci / carta coperta). */
export const CARD_BACK = svg(
  `<rect x="8" y="8" width="48" height="48" rx="10" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-dasharray="6 5"/>
   <path d="M32 16l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z" fill="#fff"/>`,
);

const GEMS = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5, absurd: 6 };

/** Faccia grande della carta (gratta e vinci, dettaglio). */
export function bigCard(id, { extraClass = '' } = {}) {
  const c = CARDS[id];
  const gems = h('div', { class: 'cf-gems' });
  for (let i = 0; i < Math.max(4, GEMS[c.rarity]); i++) gems.append(h('span', { class: i < GEMS[c.rarity] ? 'on' : '' }));
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
