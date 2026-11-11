/** Disegni dei 10 boss (SVG originali). */

const eyes = (y = 46, gap = 12, r = 6, angry = false) =>
  `<circle cx="${50 - gap}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${50 + gap}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${50 - gap + 1.5}" cy="${y + 1}" r="${r * 0.5}" fill="#1b1b2a"/><circle cx="${50 + gap - 1.5}" cy="${y + 1}" r="${r * 0.5}" fill="#1b1b2a"/>` +
  (angry ? `<path d="M${50 - gap - 7} ${y - 9} L${50 - gap + 6} ${y - 5} M${50 + gap + 7} ${y - 9} L${50 + gap - 6} ${y - 5}" stroke="#1b1b2a" stroke-width="3" stroke-linecap="round"/>` : '');

const LOOKS = {
  frog: ([a, b, c]) =>
    `<ellipse cx="50" cy="66" rx="34" ry="26" fill="${a}"/><circle cx="35" cy="40" r="12" fill="${a}"/><circle cx="65" cy="40" r="12" fill="${a}"/>${eyes(40, 15, 7)}<path d="M30 68 Q50 82 70 68" stroke="${b}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M36 26 L38 14 L44 22 L50 10 L56 22 L62 14 L64 26 Z" fill="${c}"/>`,
  crab: ([a, b, c]) =>
    `<path d="M14 48 Q4 30 18 24 Q20 36 28 38 Z M86 48 Q96 30 82 24 Q80 36 72 38 Z" fill="${a}"/><ellipse cx="50" cy="64" rx="34" ry="22" fill="${a}"/><path d="M38 44 V30 M62 44 V30" stroke="${b}" stroke-width="3"/>${eyes(28, 12, 6, true)}<path d="M38 70 Q50 64 62 70" stroke="${b}" stroke-width="3.5" fill="none"/><path d="M22 80 L14 90 M78 80 L86 90 M30 84 L26 94 M70 84 L74 94" stroke="${b}" stroke-width="3"/>`,
  witch: ([a, b, c]) =>
    `<path d="M24 92 Q26 56 50 52 Q74 56 76 92 Z" fill="${b}"/><circle cx="50" cy="50" r="20" fill="${c}"/>${eyes(48, 8, 4.5)}<path d="M44 60 Q50 64 56 60" stroke="#1b1b2a" stroke-width="2.5" fill="none"/><path d="M50 52 L54 58 L48 57 Z" fill="${b}"/><path d="M22 36 Q50 26 78 36 L74 40 Q50 32 26 40 Z" fill="${a}"/><path d="M34 34 L58 2 L66 34 Z" fill="${a}"/>`,
  golem: ([a, b, c]) =>
    `<rect x="20" y="50" width="60" height="42" rx="6" fill="${a}"/><rect x="28" y="22" width="44" height="34" rx="5" fill="${a}"/><path d="M20 60 L8 76 L16 82 L24 70 M80 60 L92 76 L84 82 L76 70" fill="${b}"/><rect x="33" y="34" width="12" height="7" fill="${c}"/><rect x="55" y="34" width="12" height="7" fill="${c}"/><path d="M38 48 H62" stroke="${b}" stroke-width="3"/><path d="M30 22 L36 12 L42 22 M58 22 L64 10 L70 22" fill="${c}"/>`,
  pirate: ([a, b, c]) =>
    `<path d="M24 94 Q24 62 50 58 Q76 62 76 94 Z" fill="${b}"/><circle cx="50" cy="50" r="21" fill="#f2c9a0"/><circle cx="42" cy="48" r="4" fill="#1b1b2a"/><ellipse cx="59" cy="48" rx="7" ry="6" fill="#1b1b2a"/><path d="M36 42 L72 54" stroke="#1b1b2a" stroke-width="2"/><path d="M40 62 Q50 58 60 62" stroke="#1b1b2a" stroke-width="3" fill="none"/><path d="M20 34 Q50 4 80 34 Q50 26 20 34 Z" fill="#1e1f2a"/><circle cx="50" cy="22" r="4" fill="${c}"/><rect x="66" y="64" width="14" height="20" rx="4" fill="${a}" stroke="${c}" stroke-width="2"/>`,
  dragon: ([a, b, c]) =>
    `<path d="M10 40 L30 52 L18 62 Z M90 40 L70 52 L82 62 Z" fill="${b}"/><ellipse cx="50" cy="66" rx="30" ry="26" fill="${a}"/><ellipse cx="50" cy="44" rx="24" ry="20" fill="${a}"/><path d="M34 28 L30 12 L40 24 Z M66 28 L70 12 L60 24 Z" fill="${c}"/>${eyes(42, 10, 5.5, true)}<ellipse cx="50" cy="56" rx="12" ry="7" fill="${b}"/><circle cx="45" cy="55" r="1.8" fill="#1b1b2a"/><circle cx="55" cy="55" r="1.8" fill="#1b1b2a"/><path d="M38 74 L44 70 L50 76 L56 70 L62 74" stroke="${c}" stroke-width="3" fill="none"/>`,
  wizard: ([a, b, c]) =>
    `<path d="M22 94 Q24 58 50 56 Q76 58 78 94 Z" fill="${a}"/><circle cx="50" cy="50" r="18" fill="#f2c9a0"/>${eyes(48, 7, 4)}<path d="M32 54 Q50 96 68 54 Q60 62 50 60 Q40 62 32 54 Z" fill="#f4f4f8"/><path d="M28 36 L52 -2 L72 36 Z" fill="${b}"/><path d="M22 36 Q50 44 78 36 Q50 30 22 36 Z" fill="${a}"/><text x="46" y="26" font-size="12" fill="${c}">★</text><circle cx="80" cy="60" r="6" fill="${c}"/>`,
  vampire: ([a, b, c]) =>
    `<path d="M14 96 L26 56 Q50 50 74 56 L86 96 Z" fill="${b}"/><path d="M26 56 L38 70 L50 58 L62 70 L74 56 Z" fill="${a}"/><circle cx="50" cy="44" r="20" fill="${c}"/><path d="M30 38 Q32 20 50 22 Q68 20 70 38 Q62 30 56 32 L50 40 L44 32 Q38 30 30 38 Z" fill="#1b1b2a"/><circle cx="43" cy="44" r="3.5" fill="${a}"/><circle cx="57" cy="44" r="3.5" fill="${a}"/><path d="M42 54 Q50 58 58 54" stroke="#1b1b2a" stroke-width="2" fill="none"/><path d="M45 55 L46.5 60 L48 55 M52 55 L53.5 60 L55 55" fill="#fff"/>`,
  storm: ([a, b, c]) =>
    `<circle cx="34" cy="58" r="18" fill="${a}"/><circle cx="66" cy="58" r="18" fill="${a}"/><circle cx="50" cy="48" r="22" fill="${a}"/><rect x="18" y="58" width="64" height="20" rx="10" fill="${a}"/>${eyes(52, 9, 5, true)}<path d="M42 66 Q50 62 58 66" stroke="${b}" stroke-width="3" fill="none"/><path d="M36 30 L40 16 L46 26 L50 10 L54 26 L60 16 L64 30 Z" fill="${c}"/><path d="M30 80 L24 94 L32 90 L28 100 M68 80 L64 92 L72 88 L68 98" stroke="${c}" stroke-width="3" fill="none"/>`,
  lord: ([a, b, c]) =>
    `<path d="M12 96 L24 58 L76 58 L88 96 Z" fill="${c}"/><rect x="26" y="26" width="48" height="48" rx="12" fill="${a}"/><circle cx="38" cy="38" r="4" fill="${b}"/><circle cx="62" cy="62" r="4" fill="${b}"/><circle cx="62" cy="38" r="4" fill="${b}"/><circle cx="38" cy="62" r="4" fill="${b}"/><circle cx="50" cy="50" r="4" fill="${b}"/><path d="M36 48 L44 50 M64 48 L56 50" stroke="${b}" stroke-width="3"/><path d="M30 24 L32 6 L41 16 L50 2 L59 16 L68 6 L70 24 Z" fill="${a}" stroke="${b}" stroke-width="2"/><circle cx="50" cy="15" r="3" fill="${c}"/>`,
};

export function bossSvg(boss, size = 120) {
  const draw = LOOKS[boss.look] || LOOKS.frog;
  return `<svg class="boss-svg" viewBox="0 -4 100 104" width="${size}" height="${size}" aria-hidden="true">${draw(boss.colors)}</svg>`;
}
