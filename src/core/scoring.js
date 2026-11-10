/**
 * Calcolo dei punteggi: funzioni pure, senza stato e senza DOM.
 */
import { RULES } from '../config.js';

export const UPPER = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
export const LOWER = ['threeKind', 'fourKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yatzy', 'chance'];
export const ALL_CATEGORIES = [...UPPER, ...LOWER];

export const CATEGORY_INFO = {
  ones: { label: 'Uno', face: 1, section: 'upper' },
  twos: { label: 'Due', face: 2, section: 'upper' },
  threes: { label: 'Tre', face: 3, section: 'upper' },
  fours: { label: 'Quattro', face: 4, section: 'upper' },
  fives: { label: 'Cinque', face: 5, section: 'upper' },
  sixes: { label: 'Sei', face: 6, section: 'upper' },
  threeKind: { label: 'Tris', short: 'TRIS', section: 'lower' },
  fourKind: { label: 'Poker', short: 'POKER', section: 'lower' },
  fullHouse: { label: 'Full', short: 'FULL', section: 'lower' },
  smallStraight: { label: 'Scala piccola', short: 'SCALA 4', section: 'lower' },
  largeStraight: { label: 'Scala grande', short: 'SCALA 5', section: 'lower' },
  yatzy: { label: 'Yatzy', short: 'YATZY', section: 'lower' },
  chance: { label: 'Chance', short: 'CHANCE', section: 'lower' },
};

/** counts[f] = quanti dadi mostrano la faccia f (indice 1..6). */
export function countFaces(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  return counts;
}

export function sum(dice) {
  let s = 0;
  for (const d of dice) s += d;
  return s;
}

export function maxOfAKind(dice) {
  return Math.max(...countFaces(dice));
}

export function isYatzy(dice) {
  return dice.length === 5 && dice.every((d) => d === dice[0] && d >= 1);
}

/** Lunghezza della più lunga sequenza di facce consecutive presenti. */
export function longestRun(dice) {
  const c = countFaces(dice);
  let best = 0;
  let run = 0;
  for (let f = 1; f <= 6; f++) {
    run = c[f] > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function isFullHouse(dice) {
  const c = countFaces(dice).slice(1).filter((n) => n > 0).sort();
  return c.length === 2 && c[0] === 2 && c[1] === 3;
}

/**
 * Punteggio di una categoria per i dadi indicati.
 * @param {string} id categoria
 * @param {number[]} dice 5 valori 1..6
 * @param {{joker?: boolean}} [opts] joker = Yatzy aggiuntivo usato come jolly
 */
export function scoreCategory(id, dice, opts = {}) {
  const c = countFaces(dice);
  const joker = Boolean(opts.joker) && isYatzy(dice);
  switch (id) {
    case 'ones': return c[1] * 1;
    case 'twos': return c[2] * 2;
    case 'threes': return c[3] * 3;
    case 'fours': return c[4] * 4;
    case 'fives': return c[5] * 5;
    case 'sixes': return c[6] * 6;
    case 'threeKind': return Math.max(...c) >= 3 ? sum(dice) : 0;
    case 'fourKind': return Math.max(...c) >= 4 ? sum(dice) : 0;
    case 'fullHouse': return isFullHouse(dice) || joker ? RULES.FULL_HOUSE : 0;
    case 'smallStraight': return longestRun(dice) >= 4 || joker ? RULES.SMALL_STRAIGHT : 0;
    case 'largeStraight': return longestRun(dice) >= 5 || joker ? RULES.LARGE_STRAIGHT : 0;
    case 'yatzy': return isYatzy(dice) ? RULES.YATZY : 0;
    case 'chance': return sum(dice);
    default: throw new Error(`Categoria sconosciuta: ${id}`);
  }
}

/**
 * Combinazione più "notevole" presente nei dadi (per gli effetti grafici).
 * @returns {'yatzy'|'largeStraight'|'smallStraight'|'fullHouse'|'fourKind'|null}
 */
export function notableCombo(dice) {
  if (dice.some((d) => d < 1)) return null;
  if (isYatzy(dice)) return 'yatzy';
  const run = longestRun(dice);
  if (run >= 5) return 'largeStraight';
  if (isFullHouse(dice)) return 'fullHouse';
  if (maxOfAKind(dice) >= 4) return 'fourKind';
  if (run >= 4) return 'smallStraight';
  return null;
}

/** Punteggi potenziali per tutte le categorie. */
export function scoreAll(dice, opts = {}) {
  const out = {};
  for (const id of ALL_CATEGORIES) out[id] = scoreCategory(id, dice, opts);
  return out;
}

/**
 * Indici dei dadi che "contribuiscono" al punteggio (usato per l'animazione
 * dei dadi che volano nella casella).
 */
export function contributingDice(id, dice, score) {
  if (score <= 0) return [];
  const info = CATEGORY_INFO[id];
  if (info.section === 'upper') {
    return dice.map((d, i) => (d === info.face ? i : -1)).filter((i) => i >= 0);
  }
  if (id === 'smallStraight' && !isYatzy(dice)) {
    // solo i 4 dadi della scala (uno per faccia)
    const c = countFaces(dice);
    let start = 1;
    for (let f = 1; f <= 3; f++) if (c[f] && c[f + 1] && c[f + 2] && c[f + 3]) { start = f; break; }
    const used = new Set();
    const idx = [];
    for (let f = start; f < start + 4; f++) {
      const i = dice.findIndex((d, k) => d === f && !used.has(k));
      used.add(i);
      idx.push(i);
    }
    return idx.sort((a, b) => a - b);
  }
  return [0, 1, 2, 3, 4];
}
