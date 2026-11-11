import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BETS, resolve, validateBets, rollCasino, MIN_BET } from '../src/meta/casino.js';
import { createProfile, casinoRound } from '../src/meta/profile.js';
import { createSeededRandom } from '../src/core/probability.js';

/** Tutte le 7776 combinazioni di 5 dadi. */
function* all() {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) for (let d = 1; d <= 6; d++) for (let e = 1; e <= 6; e++) yield [a, b, c, d, e];
}

test('le probabilità dichiarate sono esatte (SOTTO/SOPRA e PARI/DISPARI al 50%)', () => {
  const count = Object.fromEntries(Object.keys(BETS).map((k) => [k, 0]));
  for (const d of all()) for (const k of Object.keys(BETS)) if (BETS[k].test(d)) count[k]++;
  for (const k of Object.keys(BETS)) assert.equal(count[k] / 7776, BETS[k].chance, k);
  assert.equal(count.under, 3888);
  assert.equal(count.over, 3888);
  assert.equal(count.even, 3888);
  // nessuna scommessa paga più del giusto (il banco non perde in media)
  for (const k of Object.keys(BETS)) assert.ok(BETS[k].pays * BETS[k].chance <= 1.0001, `${k} troppo generosa`);
});

test('risoluzione delle puntate', () => {
  const r = resolve({ over: 100, even: 50, yatzy: 10 }, [6, 6, 6, 6, 6]);
  assert.equal(r.sum, 30);
  assert.deepEqual(r.wins, { over: 200, even: 100, yatzy: 10000 });
  assert.equal(r.net, 10300 - 160);
  const l = resolve({ under: 100 }, [6, 6, 6, 6, 6]);
  assert.equal(l.payout, 0);
  assert.equal(l.net, -100);
  assert.equal(validateBets({}, 100), 'Metti almeno una fiche');
  assert.match(validateBets({ over: 5 }, 100), /minima/);
  assert.match(validateBets({ over: 500 }, 100), /abbastanza/);
  assert.equal(validateBets({ over: MIN_BET }, 100), null);
});

test('giocata dal profilo: monete scalate e vincite accreditate', () => {
  const p = createProfile('x');
  p.coins = 1000;
  const r = casinoRound(p, { under: 100, odd: 100 }, { dice: [1, 2, 3, 4, 1] }); // somma 11: sotto e dispari
  assert.equal(r.payout, 400);
  assert.equal(p.coins, 1200);
  assert.equal(p.stats.casinoRounds, 1);
  assert.equal(p.stats.casinoBiggest, 400);
  assert.throws(() => casinoRound(p, { over: 5000 }), /abbastanza/);
  // a lungo andare con 50% e paga 2 il saldo resta circa uguale
  const q = createProfile('y');
  q.coins = 100000;
  const rng = createSeededRandom(3);
  for (let i = 0; i < 4000; i++) casinoRound(q, { over: 10 }, { rng });
  assert.ok(Math.abs(q.coins - 100000) < 2500, `saldo ${q.coins}`);
  assert.equal(rollCasino(() => 0.99).join(''), '66666');
});
