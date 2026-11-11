/**
 * Livelli normali della campagna: "realizza qualcosa in tot lanci".
 *
 * Hai un numero di lanci in totale e uno o più obiettivi. Tieni i dadi come
 * nel gioco normale; quando i dadi soddisfano un obiettivo lo tocchi per
 * completarlo e i dadi ripartono da zero. Vinci quando completi tutti gli
 * obiettivi prima di finire i lanci.
 */
import { countFaces, sum, maxOfAKind, isFullHouse, longestRun } from '../core/scoring.js';

const counts = (d) => countFaces(d).slice(1); // conteggi dei valori 1..6
const distinct = (d) => new Set(d).size;

/** Tipi di obiettivo: etichetta, verifica e difficoltà (per l'ordine dei completamenti). */
export const GOAL_TYPES = {
  pair: { label: () => 'Coppia', test: (d) => maxOfAKind(d) >= 2, w: 1 },
  twoPair: { label: () => 'Doppia coppia', test: (d) => counts(d).filter((c) => c >= 2).length >= 2 || maxOfAKind(d) >= 4, w: 3 },
  kind: { label: (g) => ({ 3: 'Tris', 4: 'Poker', 5: 'Yatzy' })[g.n], test: (d, g) => maxOfAKind(d) >= g.n, w: (g) => ({ 3: 3, 4: 6, 5: 10 })[g.n] },
  kindOf: { label: (g) => `${['', '', 'Due', 'Tre', 'Quattro', 'Cinque'][g.n]} ${g.v}`, test: (d, g) => d.filter((x) => x === g.v).length >= g.n, w: (g) => g.n * 2 },
  full: { label: () => 'Full', test: (d) => isFullHouse(d), w: 5 },
  small: { label: () => 'Scala piccola', test: (d) => longestRun(d) >= 4, w: 5 },
  large: { label: () => 'Scala grande', test: (d) => longestRun(d) >= 5, w: 8 },
  sumMin: { label: (g) => `Somma ≥ ${g.v}`, test: (d, g) => sum(d) >= g.v, w: (g) => Math.max(1, (g.v - 15) / 2) },
  sumMax: { label: (g) => `Somma ≤ ${g.v}`, test: (d, g) => sum(d) <= g.v, w: (g) => Math.max(1, (20 - g.v) / 2) },
  even: { label: () => 'Tutti pari', test: (d) => d.every((x) => x % 2 === 0), w: 4 },
  odd: { label: () => 'Tutti dispari', test: (d) => d.every((x) => x % 2 === 1), w: 4 },
  distinct: { label: () => 'Tutti diversi', test: (d) => distinct(d) === 5, w: 5 },
  exact: { label: (g) => `Somma = ${g.v}`, test: (d, g) => sum(d) === g.v, w: 6 },
};

const weight = (g) => {
  const w = GOAL_TYPES[g.t].w;
  return typeof w === 'function' ? w(g) : w;
};

export function goalLabel(g) {
  return GOAL_TYPES[g.t].label(g);
}

export function goalMet(g, dice) {
  return dice.every((v) => v >= 1) && GOAL_TYPES[g.t].test(dice, g);
}

export class Challenge {
  /**
   * @param {{goals:object[], rolls:number, stars:[number,number]}} level
   * @param {() => number} rng
   */
  constructor(level, rng = Math.random) {
    this.level = level;
    this.rng = rng;
    this.rollsLeft = level.rolls;
    this.values = [0, 0, 0, 0, 0];
    this.held = [false, false, false, false, false];
    this.claimed = level.goals.map(() => false);
    this.rolledOnce = false;
  }

  get done() {
    return this.claimed.every(Boolean);
  }

  /** Nessun lancio rimasto e nessun obiettivo completabile con i dadi attuali. */
  get failed() {
    return !this.done && this.rollsLeft <= 0 && this.claimable().length === 0;
  }

  get over() {
    return this.done || this.failed;
  }

  canRoll() {
    return !this.over && this.rollsLeft > 0 && !this.held.every(Boolean);
  }

  roll() {
    if (!this.canRoll()) throw new Error('Nessun lancio disponibile');
    const rolled = [];
    for (let i = 0; i < 5; i++) {
      if (this.rolledOnce && this.held[i]) continue;
      this.values[i] = 1 + Math.floor(this.rng() * 6);
      rolled.push(i);
    }
    this.rolledOnce = true;
    this.rollsLeft--;
    return { values: [...this.values], rolled };
  }

  canHold() {
    return this.rolledOnce && !this.over && this.rollsLeft > 0;
  }

  toggleHold(i) {
    if (!this.canHold()) throw new Error('Non puoi tenere i dadi adesso');
    this.held[i] = !this.held[i];
    return this.held[i];
  }

  /** Obiettivi non ancora completati soddisfatti dai dadi attuali. */
  claimable() {
    if (!this.rolledOnce) return [];
    return this.level.goals.map((g, k) => k).filter((k) => !this.claimed[k] && goalMet(this.level.goals[k], this.values));
  }

  /** Completa un obiettivo: i dadi ripartono da zero (il prossimo lancio è pieno). */
  claim(k) {
    if (!this.claimable().includes(k)) throw new Error('Obiettivo non completabile');
    this.claimed[k] = true;
    this.held.fill(false);
    this.rolledOnce = false;
    return { done: this.done };
  }

  /** Stelle guadagnate (1..3) in base ai lanci rimasti. */
  stars() {
    if (!this.done) return 0;
    const [two, three] = this.level.stars;
    return this.rollsLeft >= three ? 3 : this.rollsLeft >= two ? 2 : 1;
  }
}

/* ------------------------------------------------------------------ */
/* Risolutore automatico: un buon giocatore. Serve a tarare i livelli  */
/* (scripts/gen-levels.mjs) e nei test.                                */
/* ------------------------------------------------------------------ */
function bestWindowKeep(dice, len) {
  const windows = len === 5 ? [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]] : [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
  let best = null;
  for (const w of windows) {
    const keep = [];
    const used = new Set();
    dice.forEach((v, i) => {
      if (w.includes(v) && !used.has(v)) {
        used.add(v);
        keep.push(i);
      }
    });
    if (!best || keep.length > best.length) best = keep;
  }
  return best;
}

function keepFor(g, dice) {
  const c = countFaces(dice);
  const idx = (pred) => dice.map((v, i) => (pred(v, i) ? i : -1)).filter((i) => i >= 0);
  const top = [1, 2, 3, 4, 5, 6].sort((a, b) => c[b] - c[a] || b - a);
  switch (g.t) {
    case 'pair':
    case 'kind':
      return idx((v) => v === top[0]);
    case 'kindOf':
      return idx((v) => v === g.v);
    case 'twoPair': {
      const pairs = top.filter((v) => c[v] >= 2).slice(0, 2);
      const keep = [];
      for (const v of pairs) keep.push(...idx((x) => x === v).slice(0, 2));
      return keep.length ? keep : idx((v) => v === top[0]).slice(0, 2);
    }
    case 'full': {
      const keep = idx((v) => v === top[0]).slice(0, 3);
      if (c[top[1]] >= 2) keep.push(...idx((v) => v === top[1]).slice(0, 2));
      return keep;
    }
    case 'small':
      return bestWindowKeep(dice, 4);
    case 'large':
    case 'distinct':
      return g.t === 'large' ? bestWindowKeep(dice, 5) : [...new Map(dice.map((v, i) => [v, i])).values()];
    case 'sumMin':
      return idx((v) => v >= (g.v >= 24 ? 5 : 4));
    case 'sumMax':
      return idx((v) => v <= (g.v <= 10 ? 2 : 3));
    case 'even':
      return idx((v) => v % 2 === 0);
    case 'odd':
      return idx((v) => v % 2 === 1);
    case 'exact': {
      let best = { d: Infinity, keep: [] };
      for (let m = 0; m < 32; m++) {
        const keep = idx((_, i) => m & (1 << i));
        const s = keep.reduce((a, i) => a + dice[i], 0) + 3.5 * (5 - keep.length);
        const d = Math.abs(s - g.v) - (5 - keep.length) * 0.01;
        if (d < best.d) best = { d, keep };
      }
      return best.keep;
    }
    default:
      return [];
  }
}

/** Quanto manca a un obiettivo (più basso = più vicino). */
function distance(g, dice) {
  const c = countFaces(dice);
  switch (g.t) {
    case 'pair':
      return 2 - Math.min(2, maxOfAKind(dice));
    case 'kind':
      return g.n - Math.min(g.n, maxOfAKind(dice));
    case 'kindOf':
      return g.n - Math.min(g.n, c[g.v]);
    case 'twoPair':
      return 4 - keepFor(g, dice).length;
    case 'full':
      return 5 - keepFor(g, dice).length;
    case 'small':
      return 4 - bestWindowKeep(dice, 4).length;
    case 'large':
      return 5 - bestWindowKeep(dice, 5).length;
    case 'distinct':
      return 5 - distinct(dice);
    case 'sumMin':
      return Math.max(0, g.v - sum(dice)) / 3;
    case 'sumMax':
      return Math.max(0, sum(dice) - g.v) / 3;
    case 'even':
      return dice.filter((v) => v % 2).length;
    case 'odd':
      return dice.filter((v) => v % 2 === 0).length;
    case 'exact':
      return Math.abs(sum(dice) - g.v) / 3;
    default:
      return 5;
  }
}

/** Una mossa del risolutore: completa, tieni + lancia. Restituisce false a partita finita. */
export function solverStep(ch) {
  if (ch.over) return false;
  const can = ch.claimable();
  if (can.length) {
    // completa per primo l'obiettivo più difficile tra quelli pronti
    const k = can.sort((a, b) => weight(ch.level.goals[b]) - weight(ch.level.goals[a]))[0];
    ch.claim(k);
    return true;
  }
  if (!ch.rolledOnce) {
    ch.roll();
    return true;
  }
  const open = ch.level.goals.map((g, k) => k).filter((k) => !ch.claimed[k]);
  const target = open.sort((a, b) => distance(ch.level.goals[a], ch.values) - distance(ch.level.goals[b], ch.values) || weight(ch.level.goals[b]) - weight(ch.level.goals[a]))[0];
  const keep = new Set(keepFor(ch.level.goals[target], ch.values));
  if (keep.size >= 5) keep.clear();
  for (let i = 0; i < 5; i++) ch.held[i] = keep.has(i);
  ch.roll();
  return true;
}

export function solve(level, rng) {
  const ch = new Challenge(level, rng);
  while (solverStep(ch));
  return ch;
}
