/**
 * Genera src/campaign/levelData.js: i 90 livelli normali della campagna.
 * Gli obiettivi sono scelti a caso (con seme fisso) da tre fasce di difficoltà;
 * i lanci di ogni livello sono tarati con il risolutore automatico perché la
 * probabilità di vittoria scenda piano piano dal 95% al 42% circa.
 *   node scripts/gen-levels.mjs
 */
import { writeFileSync } from 'node:fs';
import { solve } from '../src/campaign/challenge.js';
import { createSeededRandom } from '../src/core/probability.js';

const rnd = createSeededRandom(20261111);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const TIER = {
  1: [() => ({ t: 'pair' }), () => ({ t: 'kind', n: 3 }), () => ({ t: 'sumMin', v: between(18, 22) }), () => ({ t: 'twoPair' }), () => ({ t: 'sumMax', v: between(11, 14) })],
  2: [() => ({ t: 'full' }), () => ({ t: 'small' }), () => ({ t: 'even' }), () => ({ t: 'odd' }), () => ({ t: 'kindOf', n: 3, v: between(1, 6) }), () => ({ t: 'sumMin', v: between(23, 25) }), () => ({ t: 'kind', n: 4 }), () => ({ t: 'distinct' })],
  3: [() => ({ t: 'large' }), () => ({ t: 'kind', n: 5 }), () => ({ t: 'kindOf', n: 4, v: between(1, 6) }), () => ({ t: 'exact', v: between(13, 22) }), () => ({ t: 'sumMin', v: between(26, 27) }), () => ({ t: 'sumMax', v: between(8, 9) })],
};
const PLAN = [
  (k) => [k <= 5 ? 1 : 2],
  (k) => (k <= 6 ? [2] : [1, 2]),
  (k) => (k <= 6 ? [1, 2] : [3]),
  (k) => (k % 2 ? [2, 2] : [3]),
  () => [2, 3],
  () => [1, 2, 2],
  () => [2, 2, 3],
  () => [2, 3, 3],
  () => [1, 2, 2, 3],
  () => [2, 2, 3, 3],
];
const key = (g) => `${g.t}${g.n ?? ''}${g.t === 'kindOf' ? g.v : ''}`;

function goalsFor(w, k) {
  for (;;) {
    const goals = PLAN[w](k).map((t) => pick(TIER[t])());
    const keys = goals.map(key);
    const types = goals.map((g) => g.t);
    if (new Set(keys).size !== keys.length) continue;
    if (types.includes('even') && types.includes('odd')) continue;
    if (types.filter((t) => t === 'sumMin' || t === 'sumMax' || t === 'exact').length > 1) continue;
    return goals;
  }
}

function winRate(level, trials) {
  let wins = 0;
  const left = [];
  for (let s = 0; s < trials; s++) {
    const ch = solve(level, createSeededRandom(7919 * s + level.rolls * 31 + 1));
    if (ch.done) {
      wins++;
      left.push(ch.rollsLeft);
    }
  }
  return { p: wins / trials, left: left.sort((a, b) => a - b) };
}

const levels = [];
for (let w = 0; w < 10; w++) {
  for (let k = 1; k <= 9; k++) {
    const n = w * 10 + k;
    const goals = goalsFor(w, k);
    const target = 0.95 - (0.53 * (n - 1)) / 98;
    let rolls = goals.length;
    let res;
    for (;;) {
      res = winRate({ goals, rolls, stars: [1, 2] }, 1500);
      if (res.p >= target || rolls >= 40) break;
      rolls++;
    }
    const q = (f) => res.left[Math.min(res.left.length - 1, Math.floor(res.left.length * f))] ?? 0;
    const two = Math.max(1, q(0.3));
    const three = Math.max(two + 1, q(0.68));
    levels.push({ n, goals, rolls, stars: [two, three], p: Math.round(res.p * 100) });
    console.log(n, goals.map(key).join('+'), 'lanci', rolls, 'vittoria', Math.round(res.p * 100) + '%', 'stelle', two, three);
  }
}

const out = `/* File generato da scripts/gen-levels.mjs: non modificare a mano. */
/** I 90 livelli normali: obiettivi, lanci disponibili, lanci rimasti per 2 e 3 stelle, % di vittoria del risolutore. */
export const LEVEL_DATA = ${JSON.stringify(levels)};
`;
writeFileSync(new URL('../src/campaign/levelData.js', import.meta.url), out);
