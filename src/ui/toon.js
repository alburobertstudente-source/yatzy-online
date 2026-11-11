/**
 * Rifinitura "cartoon" per i disegni SVG del gioco: ogni colore pieno diventa
 * una sfumatura (più chiaro in alto a sinistra, più scuro in basso a destra),
 * ogni forma riceve un contorno scuro dello stesso colore e una piccola luce.
 * Così avatar, boss, casse e personaggi sembrano disegnati e colorati a mano,
 * con un po' di volume, tutti nello stesso stile.
 */
let uid = 0;

function parse(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb) => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** k > 0 schiarisce verso il bianco, k < 0 scurisce verso il nero (con un filo di saturazione). */
export function shadeHex(hex, k) {
  const c = parse(hex);
  if (k >= 0) return toHex(c.map((v) => v + (255 - v) * k));
  return toHex(c.map((v) => v * (1 + k)));
}

/** Colore del contorno: molto più scuro e un po' caldo (inchiostro, non nero puro). */
const ink = (hex) => {
  const [r, g, b] = parse(hex);
  return toHex([r * 0.38 + 18, g * 0.34 + 10, b * 0.36 + 22]);
};

const SHAPES = /<(path|circle|ellipse|rect|polygon)\b([^>]*?)(\/?)>/g;

/**
 * @param {string} svg markup SVG
 * @param {{outline?:number, light?:number, skipSmall?:number}} [o]
 *   outline = spessore del contorno (unità del viewBox), 0 per nessuno
 */
export function toon(svg, { outline = 1.3, light = 0.22, dark = -0.2, skipSmall = 2.2 } = {}) {
  const id = `tn${++uid}`;
  const grads = new Map();
  const grad = (hex) => {
    const key = hex.toLowerCase();
    if (!grads.has(key)) grads.set(key, `${id}${grads.size}`);
    return grads.get(key);
  };
  const out = svg.replace(SHAPES, (all, tag, attrs, selfClose) => {
    if (/data-flat/.test(attrs)) return all;
    const m = attrs.match(/\sfill="(#[0-9a-fA-F]{3,6})"/);
    if (!m) return all;
    const hex = m[1];
    let a = attrs.replace(m[0], ` fill="url(#${grad(hex)})"`);
    const small = (tag === 'circle' && Number(attrs.match(/\sr="([\d.]+)"/)?.[1]) < skipSmall) || (tag === 'ellipse' && Number(attrs.match(/\srx="([\d.]+)"/)?.[1]) < skipSmall);
    if (outline && !small && !/\sstroke=/.test(attrs)) a += ` stroke="${ink(hex)}" stroke-width="${outline}" stroke-linejoin="round" stroke-linecap="round"`;
    return `<${tag}${a}${selfClose}>`;
  });
  if (!grads.size) return svg;
  const defs = [...grads.entries()]
    .map(([hex, gid]) => `<linearGradient id="${gid}" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="${shadeHex(hex, light)}"/><stop offset="0.55" stop-color="${hex}"/><stop offset="1" stop-color="${shadeHex(hex, dark)}"/></linearGradient>`)
    .join('');
  return out.replace(/(<svg\b[^>]*>)/, `$1<defs>${defs}</defs>`);
}

/** Piccola luce bianca curva (riflesso) da aggiungere sopra una forma tonda. */
export function gloss(cx, cy, r, opacity = 0.55) {
  return `<path d="M${cx - r * 0.55} ${cy - r * 0.15}a${r * 0.62} ${r * 0.62} 0 0 1 ${r * 0.5} -${r * 0.45}" fill="none" stroke="rgba(255,255,255,${opacity})" stroke-width="${Math.max(1, r * 0.16).toFixed(1)}" stroke-linecap="round"/>`;
}
