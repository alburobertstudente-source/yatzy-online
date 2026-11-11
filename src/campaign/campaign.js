/**
 * Campagna: 10 mondi da 10 livelli. I livelli 10, 20, … 100 sono boss
 * (partite intere), gli altri sono sfide "realizza qualcosa in tot lanci".
 */
import { LEVEL_DATA } from './levelData.js';
import { BOSSES } from './bosses.js';
import { levelCoins, bossCoins, REPLAY_FACTOR, XP } from '../meta/economy.js';
import { goalLabel } from './challenge.js';

export const LEVEL_COUNT = 100;

export const WORLDS = BOSSES.map((b, i) => ({
  n: i + 1,
  name: b.world,
  boss: b,
  colors: b.colors,
  first: i * 10 + 1,
  last: i * 10 + 10,
}));

const byNumber = new Map(LEVEL_DATA.map((l) => [l.n, l]));

export function isBossLevel(n) {
  return n % 10 === 0;
}

/**
 * Tutto quello che serve per mostrare e giocare il livello n (1..100).
 */
export function levelInfo(n) {
  if (!Number.isInteger(n) || n < 1 || n > LEVEL_COUNT) throw new Error(`Livello non valido: ${n}`);
  const world = WORLDS[Math.floor((n - 1) / 10)];
  if (isBossLevel(n)) {
    const k = n / 10;
    const coins = bossCoins(k);
    return {
      n,
      boss: true,
      bossIndex: k,
      bossData: BOSSES[k - 1],
      world,
      title: BOSSES[k - 1].name,
      coins,
      replayCoins: Math.round(coins * REPLAY_FACTOR),
      xp: XP.boss + k * 20,
    };
  }
  const data = byNumber.get(n);
  const coins = levelCoins(n, 1);
  return {
    n,
    boss: false,
    world,
    title: data.goals.map(goalLabel).join(' + '),
    goals: data.goals,
    rolls: data.rolls,
    stars: data.stars,
    coins,
    coinsFor: (stars) => levelCoins(n, stars),
    replayCoins: Math.round(coins * REPLAY_FACTOR),
    xp: XP.level + Math.round(n / 2),
    difficulty: data.p,
  };
}
