/**
 * Icone SVG originali del gioco (nessuna immagine esterna).
 * Tutte usano currentColor dove possibile, così il colore si gestisce in CSS.
 */

const PIP_POS = {
  tl: [14, 14], tr: [34, 14], ml: [14, 24], c: [24, 24], mr: [34, 24], bl: [14, 34], br: [34, 34],
};
export const PIPS = {
  1: ['c'],
  2: ['tr', 'bl'],
  3: ['tr', 'c', 'bl'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'c', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
};

/** Solo i punti (lo sfondo della faccia è disegnato in CSS). */
export function pipsSvg(n, r = 4.6) {
  const dots = (PIPS[n] || []).map((k) => `<circle cx="${PIP_POS[k][0]}" cy="${PIP_POS[k][1]}" r="${r}"/>`).join('');
  return `<svg viewBox="0 0 48 48" class="pips" aria-hidden="true">${dots}</svg>`;
}

/** Faccia di dado completa (usata nelle icone della tabella). */
export function dieFaceSvg(n) {
  const dots = (PIPS[n] || []).map((k) => `<circle cx="${PIP_POS[k][0]}" cy="${PIP_POS[k][1]}" r="4.4" fill="currentColor"/>`).join('');
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${dots}</svg>`;
}

/** Piccolo dado per icone composte. */
function miniDie(x, y, s, pip = true) {
  const r = s * 0.22;
  return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="#fff" stroke="currentColor" stroke-width="2.4"/>${
    pip ? `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.13}" fill="currentColor"/>` : ''
  }`;
}

export const CATEGORY_ICONS = {
  threeKind: `<svg viewBox="0 0 48 40" aria-hidden="true">${miniDie(15, 2, 18)}${miniDie(4, 19, 18)}${miniDie(26, 19, 18)}</svg>`,
  fourKind: `<svg viewBox="0 0 48 40" aria-hidden="true">${miniDie(5, 1, 17)}${miniDie(26, 1, 17)}${miniDie(5, 21, 17)}${miniDie(26, 21, 17)}</svg>`,
  fullHouse: `<svg viewBox="0 0 48 40" aria-hidden="true">${miniDie(4, 1, 12)}${miniDie(4, 14, 12)}${miniDie(4, 27, 12)}<path d="M21 20h6M24 17v6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>${miniDie(32, 8, 12)}${miniDie(32, 21, 12)}</svg>`,
  smallStraight: `<svg viewBox="0 0 48 40" aria-hidden="true"><g fill="currentColor">
    <rect x="5" y="27" width="8" height="10" rx="2"/><rect x="15" y="20" width="8" height="17" rx="2"/>
    <rect x="25" y="13" width="8" height="24" rx="2"/><rect x="35" y="6" width="8" height="31" rx="2"/></g></svg>`,
  largeStraight: `<svg viewBox="0 0 48 40" aria-hidden="true"><g fill="currentColor">
    <rect x="3" y="29" width="7" height="8" rx="2"/><rect x="11.5" y="23" width="7" height="14" rx="2"/>
    <rect x="20" y="17" width="7" height="20" rx="2"/><rect x="28.5" y="11" width="7" height="26" rx="2"/>
    <rect x="37" y="5" width="7" height="32" rx="2"/></g></svg>`,
  yatzy: `<svg viewBox="0 0 48 40" aria-hidden="true">
    <path d="M6 30 L9 10 L17.5 19 L24 5 L30.5 19 L39 10 L42 30 Z" fill="url(#gCrown)" stroke="#8a5a00" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="6" y="30" width="36" height="6" rx="2" fill="#e0a100" stroke="#8a5a00" stroke-width="2.2"/>
    <circle cx="24" cy="22" r="3" fill="#fff"/>
    <defs><linearGradient id="gCrown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffbf1f"/></linearGradient></defs></svg>`,
  chance: `<svg viewBox="0 0 48 40" aria-hidden="true"><g fill="currentColor">
    <circle cx="18" cy="13" r="7.5"/><circle cx="30" cy="13" r="7.5"/><circle cx="18" cy="25" r="7.5"/><circle cx="30" cy="25" r="7.5"/></g>
    <path d="M24 19 C28 28 31 33 36 37" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="24" cy="19" r="2.6" fill="#fff"/></svg>`,
};

export const ICONS = {
  exit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trophy: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="url(#gT)" stroke="#8a5a00" stroke-width="2.5"/>
    <path d="M18 13H9v4a10 10 0 0 0 10 10M46 13h9v4a10 10 0 0 1-10 10" fill="none" stroke="#8a5a00" stroke-width="3"/>
    <rect x="28" y="35" width="8" height="10" fill="#e0a100" stroke="#8a5a00" stroke-width="2.5"/>
    <rect x="19" y="45" width="26" height="9" rx="2.5" fill="#ffcf3a" stroke="#8a5a00" stroke-width="2.5"/>
    <path d="M27 16l3 3 7-7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    <defs><linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#ffb800"/></linearGradient></defs></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 8.8l7.1-.7z" fill="currentColor"/></svg>`,
  dieGhost: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="5 4"/><circle cx="24" cy="24" r="3.4" fill="currentColor"/></svg>`,
  rules: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M9.3 9.4a2.8 2.8 0 1 1 3.8 2.6c-.8.3-1.1.9-1.1 1.7v.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.4" fill="currentColor"/></svg>`,
};
