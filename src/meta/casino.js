/**
 * Casinò Yatzy: il croupier lancia 5 dadi e si scommettono le monete del gioco.
 * Logica pura (niente DOM). Le scommesse pari sono esattamente al 50%:
 * con 5 dadi la somma va da 5 a 30 ed è simmetrica attorno a 17,5, quindi
 * SOTTO (5-17) e SOPRA (18-30) hanno la stessa probabilità, come PARI e DISPARI.
 */
import { sum, maxOfAKind, longestRun } from '../core/scoring.js';

export const MIN_BET = 10;
export const CHIPS = [10, 50, 100, 500, 1000];

/** pays = quanto torna per ogni moneta puntata (posta compresa). */
export const BETS = {
  under: { label: 'SOTTO', sub: 'somma 5-17', pays: 2, chance: 0.5, test: (d) => sum(d) <= 17 },
  over: { label: 'SOPRA', sub: 'somma 18-30', pays: 2, chance: 0.5, test: (d) => sum(d) >= 18 },
  even: { label: 'PARI', sub: 'somma pari', pays: 2, chance: 0.5, test: (d) => sum(d) % 2 === 0 },
  odd: { label: 'DISPARI', sub: 'somma dispari', pays: 2, chance: 0.5, test: (d) => sum(d) % 2 === 1 },
  tris: { label: 'TRIS', sub: '3 uguali o più', pays: 4, chance: 1656 / 7776, test: (d) => maxOfAKind(d) >= 3 },
  straight: { label: 'SCALA', sub: 'scala grande', pays: 30, chance: 240 / 7776, test: (d) => longestRun(d) >= 5 },
  yatzy: { label: 'YATZY', sub: '5 uguali', pays: 1000, chance: 6 / 7776, test: (d) => maxOfAKind(d) === 5 },
};

export const BET_IDS = Object.keys(BETS);

export function rollCasino(rng = Math.random) {
  return Array.from({ length: 5 }, () => 1 + Math.floor(rng() * 6));
}

/** Totale puntato. */
export const totalBet = (bets) => Object.values(bets).reduce((s, v) => s + (v || 0), 0);

export function validateBets(bets, coins) {
  const total = totalBet(bets);
  if (total <= 0) return 'Metti almeno una fiche';
  for (const [id, v] of Object.entries(bets)) {
    if (!BETS[id]) return 'Puntata non valida';
    if (v && (v < MIN_BET || !Number.isInteger(v))) return `La puntata minima è ${MIN_BET} monete`;
  }
  if (total > coins) return 'Non hai abbastanza monete';
  return null;
}

/**
 * Risultato di una giocata.
 * @returns {{dice:number[], sum:number, wins:Record<string,number>, payout:number, net:number}}
 */
export function resolve(bets, dice) {
  const wins = {};
  let payout = 0;
  for (const [id, v] of Object.entries(bets)) {
    if (v > 0 && BETS[id].test(dice)) {
      wins[id] = v * BETS[id].pays;
      payout += wins[id];
    }
  }
  return { dice, sum: sum(dice), wins, payout, net: payout - totalBet(bets) };
}
