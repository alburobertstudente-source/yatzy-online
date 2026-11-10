/**
 * Disegni originali per le tradizioni della casa: il Dottore (felice e triste),
 * il diavoletto, l'aureola, la penna, la firma e le fiamme.
 */

const INK = '#262a3d';
const SKIN = '#ffd3ad';
const SKIN_D = '#e9a97c';

/** Il Dottore: specchio frontale, stetoscopio, camice. mood: 'happy' | 'sad'. */
export function doctorSvg(mood = 'happy') {
  const mouth =
    mood === 'sad'
      ? `<path d="M50 84c4-5 16-5 20 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
         <path d="M41 63c3 2 7 2 10 0M69 63c3 2 7 2 10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
         <path d="M84 70c2 4 2 7-1 8-3-1-3-4 1-8z" fill="#7fd0ff"/>`
      : `<path d="M47 79c6 8 20 8 26 0" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
         <circle cx="46" cy="65" r="3.6" fill="${INK}"/><circle cx="74" cy="65" r="3.6" fill="${INK}"/>
         <circle cx="38" cy="75" r="4" fill="#ff9d9d" opacity=".7"/><circle cx="82" cy="75" r="4" fill="#ff9d9d" opacity=".7"/>`;
  const brows = mood === 'sad'
    ? `<path d="M39 55l12-4M81 55l-12-4" stroke="#6b4a2f" stroke-width="3.5" stroke-linecap="round"/>`
    : `<path d="M39 54c4-3 9-3 12-1M69 53c3-2 8-2 12 1" fill="none" stroke="#6b4a2f" stroke-width="3.5" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 120 140" aria-hidden="true">
    <path d="M14 140c2-26 18-38 46-38s44 12 46 38z" fill="#fff" stroke="#c9d3e0" stroke-width="3"/>
    <path d="M48 104l12 22 12-22" fill="#bfe3ff" stroke="#c9d3e0" stroke-width="2"/>
    <path d="M36 108c0 18 8 26 24 26s24-8 24-26" fill="none" stroke="#3d5a80" stroke-width="4" stroke-linecap="round"/>
    <circle cx="60" cy="134" r="6" fill="#9fb2c8" stroke="#3d5a80" stroke-width="3"/>
    <rect x="52" y="90" width="16" height="16" rx="5" fill="${SKIN}"/>
    <ellipse cx="60" cy="64" rx="31" ry="33" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
    <ellipse cx="29" cy="66" rx="5" ry="8" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
    <ellipse cx="91" cy="66" rx="5" ry="8" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
    <path d="M29 58c-2-24 14-34 31-34s33 10 31 34c-6-10-14-14-31-14S35 48 29 58z" fill="#6b4a2f"/>
    <path d="M29 46c12-6 50-6 62 0" fill="none" stroke="#3d5a80" stroke-width="4"/>
    <circle cx="60" cy="40" r="11" fill="#e6edf5" stroke="#8fa3b8" stroke-width="3"/>
    <circle cx="60" cy="40" r="4" fill="#fff"/>
    <path d="M55 36l3-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    ${brows}
    <path d="M57 70c1 3 5 3 6 0" fill="none" stroke="${SKIN_D}" stroke-width="2.5" stroke-linecap="round"/>
    ${mouth}
  </svg>`;
}

/** Mini icona del Dottore (distintivo sulla casella Full). */
export const DOCTOR_BADGE = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="11" fill="#fff" stroke="#3d5a80" stroke-width="1.6"/>
  <path d="M9.5 5.5h5v4h4v5h-4v4h-5v-4h-4v-5h4z" fill="#ee4655"/></svg>`;

/** Aureola (distintivo sulla casella Yatzy a 0). */
export const HALO_BADGE = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <ellipse cx="12" cy="12" rx="10" ry="5" fill="none" stroke="#ffd23f" stroke-width="3.2"/>
  <ellipse cx="12" cy="12" rx="10" ry="5" fill="none" stroke="#fff6c2" stroke-width="1"/></svg>`;

/** Il diavoletto. */
export function devilSvg() {
  return `<svg viewBox="0 0 140 150" aria-hidden="true">
    <path d="M30 40C18 26 20 8 30 2c-2 14 4 22 16 30z" fill="#5a0b10" stroke="#2a0306" stroke-width="2"/>
    <path d="M110 40c12-14 10-32 0-38 2 14-4 22-16 30z" fill="#5a0b10" stroke="#2a0306" stroke-width="2"/>
    <path d="M22 70c-12-4-18-14-16-24 8 6 16 8 24 6z" fill="#d42a35"/>
    <path d="M118 70c12-4 18-14 16-24-8 6-16 8-24 6z" fill="#d42a35"/>
    <ellipse cx="70" cy="74" rx="48" ry="50" fill="#e8323c" stroke="#8e0e17" stroke-width="3"/>
    <path d="M38 58l22 8M102 58l-22 8" stroke="#2a0306" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="54" cy="74" rx="9" ry="7" fill="#ffe14d"/><ellipse cx="86" cy="74" rx="9" ry="7" fill="#ffe14d"/>
    <ellipse cx="55" cy="75" rx="3" ry="5" fill="#2a0306"/><ellipse cx="85" cy="75" rx="3" ry="5" fill="#2a0306"/>
    <path d="M40 92c10 18 50 18 60 0-10 6-50 6-60 0z" fill="#2a0306"/>
    <path d="M50 96l4 8 4-7M82 97l4 7 4-8" fill="#fff"/>
    <path d="M62 116l8 26 8-26z" fill="#8e0e17"/>
  </svg>`;
}

/** Penna d'oca per la firma. */
export const QUILL = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <path d="M60 4C38 8 20 24 12 46l6 2C26 30 40 16 60 4z" fill="#fff" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M60 4C46 16 32 28 18 48" fill="none" stroke="#c9d3e0" stroke-width="2"/>
  <path d="M12 46l-6 14 10-10z" fill="${INK}"/></svg>`;

/** Firma corsiva (tracciato disegnato progressivamente). */
export const SIGNATURE_PATH =
  'M6 34c8-22 14-26 16-18s-10 22-6 22 12-26 18-24-6 20 0 20 10-16 14-14-4 12 2 12 8-10 12-10 0 8 6 8 10-12 16-10 0 10 8 9c6-1 10-8 14-12';

/** Lingue di fuoco (per la scena di Satana). */
export function flamesSvg() {
  const flame = (x, h, d) =>
    `<g transform="translate(0 ${100 - h}) scale(1 ${h / 100})"><path class="flame" style="animation-delay:${d}s" d="M${x} 100c-14 0-20-12-16-26 3-10 10-14 8-26 10 8 12 16 12 22 4-6 4-12 2-18 10 10 14 20 12 30-2 12-8 18-18 18z"/></g>`;
  let paths = '';
  for (let i = 0; i < 11; i++) paths += flame(i * 38 + 6, 70 + ((i * 37) % 40), (i % 4) * 0.12);
  return `<svg viewBox="0 0 420 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="gFlame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffdd55"/><stop offset=".45" stop-color="#ff7a1a"/><stop offset="1" stop-color="#c4161c"/></linearGradient></defs>
    <g fill="url(#gFlame)">${paths}</g></svg>`;
}
