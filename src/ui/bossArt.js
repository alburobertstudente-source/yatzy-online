import { bossArtHtml } from '../three/boss3d.js';
/**
 * I 10 boss disegnati come personaggi cartoon (SVG originali): corpo con
 * volume, dettagli, espressione; la rifinitura toon aggiunge contorni e ombre.
 */
import { toon, shadeHex } from './toon.js';

const eye = (x, y, r = 6, { look = 0.4, lid = 0, angry = false, iris = '#3a2a1a' } = {}) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.08}" fill="#ffffff" data-flat stroke="#2a1a14" stroke-width="1.1"/>` +
  `<circle cx="${x + look * r * 0.35}" cy="${y + r * 0.12}" r="${r * 0.52}" fill="${iris}" data-flat/>` +
  `<circle cx="${x + look * r * 0.35}" cy="${y + r * 0.12}" r="${r * 0.28}" fill="#120a08" data-flat/>` +
  `<circle cx="${x + look * r * 0.35 + r * 0.22}" cy="${y - r * 0.12}" r="${r * 0.17}" fill="#ffffff" data-flat/>` +
  (lid ? `<path d="M${x - r} ${y - r * 0.2} Q${x} ${y - r * (1.3 - lid)} ${x + r} ${y - r * 0.2} L${x + r} ${y - r * 1.2} L${x - r} ${y - r * 1.2} Z" fill="currentColor" data-flat/>` : '') +
  (angry ? `<path d="M${x - r * 1.2} ${y - r * 1.25} L${x + r * 0.9} ${y - r * 0.55}" stroke="#2a1a14" stroke-width="${r * 0.42}" stroke-linecap="round"/>` : '');
const mirrorAngry = (x, y, r) => `<path d="M${x + r * 1.2} ${y - r * 1.25} L${x - r * 0.9} ${y - r * 0.55}" stroke="#2a1a14" stroke-width="${r * 0.42}" stroke-linecap="round"/>`;
const shadow = (cx = 60, cy = 112, rx = 36) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="5" fill="rgba(20,10,40,.28)" data-flat/>`;

const LOOKS = {
  frog: ([a, b, c]) => `${shadow()}
<ellipse cx="60" cy="78" rx="40" ry="31" fill="${a}"/>
<ellipse cx="60" cy="86" rx="26" ry="20" fill="${shadeHex(a, 0.55)}"/>
<path d="M44 78 q4 3 8 0 M56 84 q4 3 8 0 M48 92 q4 3 8 0" fill="none" stroke="${shadeHex(a, 0.2)}" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="34" cy="68" r="4" fill="${b}"/><circle cx="86" cy="72" r="5" fill="${b}"/><circle cx="80" cy="96" r="3" fill="${b}"/><circle cx="38" cy="95" r="3.5" fill="${b}"/>
<ellipse cx="26" cy="104" rx="11" ry="5" fill="${a}"/><ellipse cx="94" cy="104" rx="11" ry="5" fill="${a}"/>
<path d="M18 104 l-4 3 M22 106 l-2 4 M98 106 l2 4 M102 104 l4 3" stroke="${b}" stroke-width="2" stroke-linecap="round"/>
<circle cx="42" cy="48" r="15" fill="${a}"/><circle cx="78" cy="48" r="15" fill="${a}"/>
${eye(42, 47, 9.5, { look: 0.3 })}${eye(78, 47, 9.5, { look: -0.2 })}
<path d="M36 76 Q60 94 84 76 Q60 86 36 76 Z" fill="#a8243a" stroke="#4a1220" stroke-width="1.2"/>
<path d="M50 83 Q60 88 70 83" fill="none" stroke="#ff8fa0" stroke-width="2" stroke-linecap="round"/>
<circle cx="52" cy="64" r="1.6" fill="${b}" data-flat/><circle cx="68" cy="64" r="1.6" fill="${b}" data-flat/>
<path d="M45 30 L46 12 L54 22 L60 6 L66 22 L74 12 L75 30 Z" fill="${c}"/>
<rect x="44" y="27" width="32" height="6" rx="2" fill="${shadeHex(c, -0.15)}"/>
<circle cx="60" cy="18" r="3.4" fill="#e8384f"/><circle cx="50.5" cy="22" r="2.2" fill="#3d9bff"/><circle cx="69.5" cy="22" r="2.2" fill="#35c46a"/>`,

  crab: ([a, b, c]) => `${shadow(60, 112, 44)}
<path d="M14 58 Q2 40 12 26 Q20 18 30 24 Q24 30 26 38 Q32 34 36 40 Q30 50 24 54 Z" fill="${a}"/>
<path d="M106 58 Q118 40 108 26 Q100 18 90 24 Q96 30 94 38 Q88 34 84 40 Q90 50 96 54 Z" fill="${a}"/>
<path d="M26 38 Q22 32 28 26" fill="none" stroke="${shadeHex(a, 0.4)}" stroke-width="2" stroke-linecap="round"/>
<path d="M30 88 L14 100 M34 94 L22 108 M90 88 L106 100 M86 94 L98 108" stroke="${b}" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="60" cy="74" rx="40" ry="27" fill="${a}"/>
<ellipse cx="60" cy="80" rx="28" ry="15" fill="${shadeHex(a, 0.35)}"/>
<path d="M30 66 Q60 54 90 66" fill="none" stroke="${shadeHex(a, 0.35)}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M46 52 L44 34 M74 52 L76 34" stroke="${b}" stroke-width="4" stroke-linecap="round"/>
${eye(44, 30, 7.5, { look: 0.5, angry: true })}${eye(76, 30, 7.5, { look: -0.5 })}${mirrorAngry(76, 30, 7.5)}
<path d="M44 82 Q60 72 76 82" fill="none" stroke="#5a1a10" stroke-width="3" stroke-linecap="round"/>
<path d="M50 80 l2 4 l3 -3.5 l3 4 l3 -4 l3 3.5 l2 -4" fill="#ffffff" stroke="#5a1a10" stroke-width=".8"/>`,

  witch: ([a, b, c]) => `${shadow()}
<path d="M24 110 Q28 64 60 60 Q92 64 96 110 Z" fill="${b}"/>
<path d="M44 66 L60 108 L76 66" fill="none" stroke="${shadeHex(b, 0.25)}" stroke-width="2"/>
<path d="M30 92 Q36 104 44 110 M90 92 Q84 104 76 110" fill="none" stroke="${shadeHex(b, -0.25)}" stroke-width="2"/>
<circle cx="60" cy="56" r="21" fill="${c}"/>
<path d="M36 52 Q30 70 38 84 Q34 66 42 58 Z M84 52 Q90 70 82 84 Q86 66 78 58 Z" fill="#6a4a2a"/>
${eye(51, 53, 5.5, { look: 0.3, iris: '#7a2a9a' })}${eye(69, 53, 5.5, { look: 0.3, iris: '#7a2a9a' })}
<path d="M60 56 Q66 64 62 68 Q58 66 59 62" fill="${shadeHex(c, -0.12)}"/><circle cx="64" cy="65" r="1.6" fill="#5a3a1a" data-flat/>
<path d="M50 70 Q60 76 70 69" fill="none" stroke="#3a1a2a" stroke-width="2.2" stroke-linecap="round"/>
<path d="M66 71 l1.5 3.5 l1.6 -3.8" fill="#ffffff" stroke="#3a1a2a" stroke-width=".7"/>
<path d="M22 40 Q60 28 98 40 Q94 46 60 40 Q26 46 22 40 Z" fill="${a}"/>
<path d="M38 38 Q46 20 54 10 Q60 4 70 2 Q64 12 66 24 Q70 32 80 37 Z" fill="${a}"/>
<path d="M40 37 Q60 31 80 37" fill="none" stroke="#c6f06a" stroke-width="4"/>
<rect x="55" y="31" width="9" height="8" rx="1.5" fill="#ffd23f"/>
<path d="M98 92 L108 50" stroke="#7a4a22" stroke-width="3.5" stroke-linecap="round"/><circle cx="108" cy="48" r="5" fill="#c6f06a"/>`,

  golem: ([a, b, c]) => `${shadow(60, 112, 42)}
<path d="M22 60 L12 86 L20 92 L30 72 Z M98 60 L108 86 L100 92 L90 72 Z" fill="${b}"/>
<rect x="16" y="86" width="14" height="12" rx="4" fill="${a}"/><rect x="90" y="86" width="14" height="12" rx="4" fill="${a}"/>
<path d="M26 56 L94 56 L100 106 L20 106 Z" fill="${a}"/>
<path d="M34 64 L50 72 L44 90 M78 66 L70 82 L86 94" fill="none" stroke="${shadeHex(a, 0.5)}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M30 30 L90 30 L94 62 L26 62 Z" fill="${a}"/>
<path d="M30 30 L40 18 L48 30 M56 30 L64 14 L72 30 M80 30 L88 20 L92 32" fill="${c}"/>
<rect x="38" y="40" width="15" height="9" rx="2" fill="#0b2a4a"/><rect x="67" y="40" width="15" height="9" rx="2" fill="#0b2a4a"/>
<rect x="41" y="42" width="8" height="4" rx="1" fill="#7ff0ff" data-flat/><rect x="70" y="42" width="8" height="4" rx="1" fill="#7ff0ff" data-flat/>
<path d="M44 56 L52 52 L60 56 L68 52 L76 56" fill="none" stroke="#0b2a4a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M30 30 Q60 26 90 30" fill="none" stroke="#ffffff" stroke-width="2" opacity=".7"/>`,

  pirate: ([a, b, c]) => `${shadow()}
<path d="M22 112 Q22 70 60 64 Q98 70 98 112 Z" fill="${b}"/>
<path d="M60 64 L60 112" stroke="${shadeHex(b, -0.3)}" stroke-width="2"/><circle cx="56" cy="80" r="2.2" fill="${c}"/><circle cx="56" cy="92" r="2.2" fill="${c}"/><circle cx="56" cy="104" r="2.2" fill="${c}"/>
<path d="M30 78 Q40 82 48 74 M90 78 Q80 82 72 74" fill="none" stroke="${shadeHex(b, 0.3)}" stroke-width="2" stroke-linecap="round"/>
<circle cx="60" cy="54" r="22" fill="#f2c39a"/>
<path d="M40 60 Q42 80 60 82 Q78 80 80 60 Q72 70 60 68 Q48 70 40 60 Z" fill="#3a2414"/>
<path d="M48 64 Q60 60 72 64 Q60 72 48 64 Z" fill="#3a2414"/>
${eye(50, 50, 5.6, { look: 0.4, angry: true })}
<ellipse cx="70" cy="50" rx="7.5" ry="6.5" fill="#15161f"/><path d="M38 40 L82 56" stroke="#15161f" stroke-width="2"/>
<path d="M58 54 Q62 60 58 62" fill="none" stroke="#a8724a" stroke-width="1.6" stroke-linecap="round"/>
<path d="M20 38 Q60 2 100 38 Q60 30 20 38 Z" fill="#1e1f2a"/>
<path d="M24 37 Q60 27 96 37" fill="none" stroke="${c}" stroke-width="2.2"/>
<circle cx="60" cy="22" r="5" fill="#ffffff"/><path d="M57 25 l6 4 M63 25 l-6 4" stroke="#1e1f2a" stroke-width="1.4"/><circle cx="58.3" cy="21.5" r="1" fill="#1e1f2a" data-flat/><circle cx="61.7" cy="21.5" r="1" fill="#1e1f2a" data-flat/>
<rect x="84" y="66" width="18" height="26" rx="6" fill="${a}" stroke="${c}" stroke-width="2.5"/>
<path d="M88 72 Q93 70 96 78" fill="none" stroke="#ffffff" stroke-width="2" opacity=".7" stroke-linecap="round"/>`,

  dragon: ([a, b, c]) => `${shadow(60, 112, 40)}
<path d="M30 60 L4 36 L10 58 L0 66 L14 70 L8 84 L32 76 Z M90 60 L116 36 L110 58 L120 66 L106 70 L112 84 L88 76 Z" fill="${b}"/>
<path d="M30 60 L10 58 M30 66 L14 70 M90 60 L110 58 M90 66 L106 70" stroke="${shadeHex(b, -0.3)}" stroke-width="1.4"/>
<ellipse cx="60" cy="82" rx="32" ry="27" fill="${a}"/>
<ellipse cx="60" cy="90" rx="20" ry="17" fill="#ffe08a"/>
<path d="M46 82 h28 M44 90 h32 M46 98 h28" stroke="#e8b44a" stroke-width="1.6" stroke-linecap="round"/>
<ellipse cx="60" cy="50" rx="27" ry="23" fill="${a}"/>
<path d="M40 32 L32 10 L46 26 Z M80 32 L88 10 L74 26 Z" fill="${c}"/>
<path d="M50 28 L54 20 L58 28 L62 20 L66 28 L70 22" fill="none" stroke="${b}" stroke-width="2.4" stroke-linejoin="round"/>
${eye(48, 46, 6.5, { look: 0.3, angry: true, iris: '#ffb000' })}${eye(72, 46, 6.5, { look: -0.3, iris: '#ffb000' })}${mirrorAngry(72, 46, 6.5)}
<ellipse cx="60" cy="62" rx="15" ry="9" fill="${shadeHex(a, 0.25)}"/>
<ellipse cx="54" cy="61" rx="2.2" ry="1.6" fill="#5a1a08" data-flat/><ellipse cx="66" cy="61" rx="2.2" ry="1.6" fill="#5a1a08" data-flat/>
<path d="M46 68 L50 74 L54 69 L58 75 L62 69 L66 75 L70 69 L74 74" fill="#ffffff" stroke="#5a1a08" stroke-width="1" stroke-linejoin="round"/>
<path d="M88 100 Q112 104 110 86 Q108 96 96 94" fill="${a}"/>
<circle cx="24" cy="100" r="5" fill="#ffd23f"/><circle cx="32" cy="104" r="4" fill="#ffd23f"/><circle cx="18" cy="106" r="3.5" fill="#ffd23f"/>`,

  wizard: ([a, b, c]) => `${shadow()}
<path d="M20 112 Q24 64 60 60 Q96 64 100 112 Z" fill="${a}"/>
<text x="34" y="96" font-size="11" fill="${c}">★</text><text x="74" y="88" font-size="9" fill="${c}">✦</text><text x="58" y="106" font-size="8" fill="${c}">☾</text>
<circle cx="60" cy="54" r="19" fill="#f2c39a"/>
${eye(52, 51, 5, { look: 0.5, iris: '#2a6fd0' })}${eye(68, 51, 5, { look: 0.5, iris: '#2a6fd0' })}
<path d="M45 44 L56 47 M75 44 L64 47" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
<path d="M38 58 Q40 96 60 106 Q80 96 82 58 Q74 70 60 66 Q46 70 38 58 Z" fill="#f4f4f8"/>
<path d="M50 72 Q54 88 60 96 M70 72 Q66 88 60 96" fill="none" stroke="#c9ccd9" stroke-width="1.4"/>
<path d="M52 64 Q60 70 68 64" fill="none" stroke="#a8724a" stroke-width="1.8" stroke-linecap="round"/>
<path d="M26 40 L60 -6 L86 40 Z" fill="${b}"/>
<path d="M18 40 Q60 50 102 40 Q60 32 18 40 Z" fill="${a}"/>
<text x="52" y="28" font-size="13" fill="${c}">★</text><circle cx="62" cy="8" r="2" fill="${c}" data-flat/>
<path d="M100 104 L110 54" stroke="#7a4a22" stroke-width="3.5" stroke-linecap="round"/><circle cx="110" cy="50" r="7" fill="${c}"/><circle cx="108" cy="48" r="2.5" fill="#ffffff" data-flat/>`,

  vampire: ([a, b, c]) => `${shadow()}
<path d="M8 112 L24 58 Q60 46 96 58 L112 112 Z" fill="${b}"/>
<path d="M24 58 L40 74 L60 58 L80 74 L96 58 Z" fill="${a}"/>
<path d="M50 62 L60 100 L70 62" fill="#f2f2f2"/><path d="M56 64 L60 72 L64 64" fill="${a}"/>
<circle cx="60" cy="44" r="21" fill="${c}"/>
<path d="M38 40 Q40 18 60 20 Q80 18 82 40 Q74 30 66 32 L60 42 L54 32 Q46 30 38 40 Z" fill="#1b1b2a"/>
<path d="M44 26 Q52 22 58 24" fill="none" stroke="#4a4a6a" stroke-width="1.6" stroke-linecap="round"/>
${eye(51, 45, 5.2, { look: 0.3, angry: true, iris: '#e0283d' })}${eye(69, 45, 5.2, { look: -0.3, iris: '#e0283d' })}${mirrorAngry(69, 45, 5.2)}
<path d="M58 49 Q60 54 62 49" fill="none" stroke="#b9b9c8" stroke-width="1.2"/>
<path d="M50 56 Q60 62 70 56" fill="#5a0a1a" stroke="#2a0a10" stroke-width="1.2"/>
<path d="M53 57 L55 63 L57 57.6 M63 57.6 L65 63 L67 57" fill="#ffffff" stroke="#2a0a10" stroke-width=".7"/>
<circle cx="30" cy="96" r="5" fill="${c}"/><circle cx="90" cy="96" r="5" fill="${c}"/>`,

  storm: ([a, b, c]) => `${shadow(60, 112, 44)}
<path d="M30 92 L22 110 L32 104 L28 118 M86 92 L80 106 L90 102 L86 116" fill="none" stroke="${c}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="34" cy="70" r="20" fill="${a}"/><circle cx="86" cy="70" r="20" fill="${a}"/><circle cx="60" cy="56" r="26" fill="${a}"/>
<rect x="18" y="68" width="84" height="26" rx="13" fill="${a}"/>
<path d="M24 82 Q40 90 60 88 Q80 90 96 82" fill="none" stroke="${shadeHex(a, -0.25)}" stroke-width="2" stroke-linecap="round"/>
<path d="M40 44 Q50 34 62 36" fill="none" stroke="#ffffff" stroke-width="3" opacity=".6" stroke-linecap="round"/>
${eye(50, 62, 6, { look: 0.3, angry: true, iris: '#1b3f8f' })}${eye(70, 62, 6, { look: -0.3, iris: '#1b3f8f' })}${mirrorAngry(70, 62, 6)}
<path d="M50 78 Q60 72 70 78" fill="none" stroke="${b}" stroke-width="3" stroke-linecap="round"/>
<path d="M42 32 L46 14 L52 26 L60 6 L68 26 L74 14 L78 32 Z" fill="${c}"/>
<circle cx="60" cy="22" r="3" fill="#ffffff" data-flat/>`,

  lord: ([a, b, c]) => `${shadow(60, 112, 44)}
<path d="M10 112 L24 62 L96 62 L110 112 Z" fill="${c}"/>
<path d="M24 62 L60 112 L96 62" fill="none" stroke="#ffffff" stroke-width="4" opacity=".6"/>
<circle cx="18" cy="100" r="4" fill="#ffffff"/><circle cx="102" cy="100" r="4" fill="#ffffff"/>
<rect x="28" y="26" width="64" height="62" rx="16" fill="${a}"/>
<path d="M34 34 Q46 28 60 30" fill="none" stroke="#ffffff" stroke-width="3" opacity=".65" stroke-linecap="round"/>
<circle cx="42" cy="40" r="4.5" fill="${b}"/><circle cx="78" cy="74" r="4.5" fill="${b}"/><circle cx="78" cy="40" r="4.5" fill="${b}"/><circle cx="42" cy="74" r="4.5" fill="${b}"/>
${eye(50, 56, 5.5, { look: 0.2, angry: true, iris: '#ff3d7f' })}${eye(70, 56, 5.5, { look: -0.2, iris: '#ff3d7f' })}${mirrorAngry(70, 56, 5.5)}
<path d="M48 70 Q60 64 72 70" fill="none" stroke="${b}" stroke-width="3" stroke-linecap="round"/>
<path d="M30 26 L32 4 L42 16 L50 0 L60 14 L70 0 L78 16 L88 4 L90 26 Z" fill="${a}" stroke="${b}" stroke-width="1.6"/>
<circle cx="60" cy="16" r="3.4" fill="${c}"/><circle cx="44" cy="20" r="2.3" fill="#3d9bff"/><circle cx="76" cy="20" r="2.3" fill="#35c46a"/>`,
};

export function bossSvg(boss, size = 120) {
  return bossArtHtml(boss, size, bossSvgFlat(boss, size));
}

/** Disegno piatto (riserva senza WebGL). */
export function bossSvgFlat(boss, size = 120) {
  const draw = LOOKS[boss.look] || LOOKS.frog;
  return toon(`<svg class="boss-svg boss-${boss.look}" viewBox="0 -6 120 126" width="${size}" height="${size}" aria-hidden="true">${draw(boss.colors)}</svg>`, { outline: 1.5 });
}
