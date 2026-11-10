import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, GameError } from '../src/core/game.js';
import { Scorecard } from '../src/core/scorecard.js';
import { ALL_CATEGORIES } from '../src/core/scoring.js';
import { scriptedGame, playTurn, roll, drawAll } from './helpers.mjs';

test('il rosso inizia, poi i turni si alternano', () => {
  const { game, roller } = scriptedGame();
  assert.equal(game.current.id, 'red');
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  assert.equal(game.current.id, 'blue');
  assert.equal(game.round, 1);
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  assert.equal(game.current.id, 'red');
  assert.equal(game.round, 2);
});

test('massimo 3 lanci per turno', () => {
  const { game, roller } = scriptedGame([[1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4, 4]]);
  roll(game);
  roll(game);
  roll(game);
  assert.equal(game.dice.rollsLeft, 0);
  assert.equal(game.canRoll(), false);
  assert.throws(() => game.roll(), GameError);
  assert.equal(roller.calls.length, 3);
});

test('non si possono tenere dadi o selezionare prima del primo lancio', () => {
  const { game } = scriptedGame();
  assert.throws(() => game.toggleHold(0));
  assert.throws(() => game.select('chance'), GameError);
  assert.throws(() => game.confirm(), GameError);
});

test('i dadi tenuti non vengono rilanciati', () => {
  const { game, roller } = scriptedGame([[6, 6, 2, 3, 4], [1, 1, 1, 1, 1]]);
  roll(game);
  game.toggleHold(0);
  game.toggleHold(1);
  const r = roll(game);
  assert.deepEqual(r.values, [6, 6, 1, 1, 1]);
  assert.deepEqual(r.rolled, [2, 3, 4], 'solo i dadi liberi sono stati rilanciati');
  assert.equal(roller.calls[1].held[0], true);
  // sbloccando un dado, torna rilanciabile
  game.toggleHold(1);
  assert.deepEqual(game.dice.freeIndexes(), [1, 2, 3, 4]);
});

test('con tutti i dadi tenuti non si può rilanciare', () => {
  const { game } = scriptedGame([[6, 6, 6, 6, 6]]);
  roll(game);
  for (let i = 0; i < 5; i++) game.toggleHold(i);
  assert.equal(game.canRoll(), false);
});

test('dopo il terzo lancio non si possono più tenere dadi', () => {
  const { game } = scriptedGame([[1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]]);
  roll(game);
  roll(game);
  roll(game);
  assert.throws(() => game.toggleHold(0), GameError);
});

test('la selezione mostra l\'anteprima e si può cambiare prima di confermare', () => {
  const { game } = scriptedGame([[2, 2, 2, 5, 5]]);
  roll(game);
  assert.equal(game.select('twos').score, 6);
  assert.equal(game.select('fullHouse').score, 25);
  const res = game.confirm();
  assert.equal(res.category, 'fullHouse');
  assert.equal(res.score, 25);
  assert.equal(game.current.card.scores.twos, null);
});

test('una categoria non si può usare due volte', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [3, 3, 3, 1, 2], 'threes');
  playTurn(game, roller, [3, 3, 3, 1, 2], 'threes'); // blu
  roller.push([3, 3, 3, 3, 1]);
  roll(game);
  assert.throws(() => game.select('threes'), GameError);
  assert.equal(game.canSelect('threes'), false);
  assert.equal(game.canSelect('fours'), true);
});

test('dopo aver segnato non si può segnare di nuovo nello stesso turno', () => {
  const { game, roller } = scriptedGame([[1, 2, 3, 4, 5]]);
  roll(game);
  game.select('chance');
  game.confirm();
  assert.throws(() => game.select('ones'), GameError);
  assert.throws(() => game.roll(), GameError);
  assert.throws(() => game.confirm(), GameError);
  game.endTurn();
  assert.equal(game.current.id, 'blue');
  roller.push([1, 1, 1, 1, 1]);
  roll(game);
});

test('non si può passare il turno senza segnare', () => {
  const { game } = scriptedGame([[1, 2, 3, 4, 5]]);
  roll(game);
  assert.throws(() => game.endTurn(), GameError);
});

test('bonus superiore +35 a 63 punti', () => {
  const { game, roller } = scriptedGame();
  const plan = [
    [[1, 1, 1, 2, 3], 'ones'], // 3
    [[2, 2, 2, 1, 3], 'twos'], // 6
    [[3, 3, 3, 1, 2], 'threes'], // 9
    [[4, 4, 4, 1, 2], 'fours'], // 12
    [[5, 5, 5, 1, 2], 'fives'], // 15
  ];
  for (const [d, c] of plan) {
    playTurn(game, roller, d, c);
    playTurn(game, roller, [1, 2, 3, 4, 6], game.current.card.openCategories().at(-1));
  }
  const red = game.player('red').card;
  assert.equal(red.upperTotal(), 45);
  assert.equal(red.upperBonus(), 0);
  const res = playTurn(game, roller, [6, 6, 6, 1, 2], 'sixes'); // 18 → 63
  assert.equal(res.upperBonusEarned, true);
  assert.equal(red.upperTotal(), 63);
  assert.equal(red.upperBonus(), 35);
  assert.equal(red.total(), 63 + 35);
});

test('YATZY: primo = 50, ogni successivo +100 (bonus separato, con spunte)', () => {
  const { game, roller } = scriptedGame();
  const red = game.player('red').card;
  const blueTurn = () => playTurn(game, roller, [1, 2, 3, 4, 6], game.current.card.openCategories()[0]);

  const r1 = playTurn(game, roller, [4, 4, 4, 4, 4], 'yatzy');
  assert.equal(r1.score, 50);
  assert.equal(r1.yatzyBonus, false, 'il primo Yatzy non dà bonus');
  assert.equal(red.total(), 50);
  blueTurn();

  const r2 = playTurn(game, roller, [6, 6, 6, 6, 6], 'sixes');
  assert.equal(r2.yatzyBonus, true);
  assert.equal(r2.yatzyBonusCount, 1);
  assert.equal(r2.score, 30);
  assert.equal(r2.total, 50 + 30 + 100, 'bonus sommato subito al totale');
  blueTurn();

  // terzo Yatzy usato come jolly nella scala grande
  const r3 = playTurn(game, roller, [2, 2, 2, 2, 2], 'largeStraight');
  assert.equal(r3.score, 40, 'regola jolly');
  assert.equal(r3.yatzyBonus, true);
  assert.equal(r3.yatzyBonusCount, 2);
  assert.equal(red.yatzyBonusTotal(), 200);
  assert.equal(red.total(), 50 + 30 + 40 + 200);
  blueTurn();

  // un turno normale non aggiunge bonus
  const r4 = playTurn(game, roller, [1, 2, 3, 5, 5], 'chance');
  assert.equal(r4.yatzyBonus, false);
  assert.equal(red.yatzyBonusCount(), 2);
  // il blu non riceve bonus del rosso
  assert.equal(game.player('blue').card.yatzyBonusCount(), 0);
});

test('YATZY aggiuntivo segnato con 0 nello Yatzy: nessun bonus (regola classica)', () => {
  const { game, roller } = scriptedGame();
  const red = game.player('red').card;
  playTurn(game, roller, [1, 2, 3, 4, 6], 'yatzy'); // 0
  playTurn(game, roller, [1, 2, 3, 4, 6], 'chance');
  const r = playTurn(game, roller, [5, 5, 5, 5, 5], 'fives');
  assert.equal(r.yatzyBonus, false);
  assert.equal(red.yatzyBonusTotal(), 0);
});

test('il bonus Yatzy non può essere duplicato nello stesso turno', () => {
  const card = new Scorecard();
  card.record('yatzy', 50);
  assert.equal(card.addYatzyBonus(5), true);
  assert.equal(card.addYatzyBonus(5), false);
  assert.equal(card.yatzyBonusTotal(), 100);
  assert.equal(card.total(), 150);
});

test('Yatzy nella sua casella mentre è libera non dà bonus anche se rilanciato', () => {
  const { game, roller } = scriptedGame([[3, 3, 3, 3, 3], [3, 3, 3, 3, 3]]);
  roll(game);
  roll(game);
  game.select('yatzy');
  const r = game.confirm();
  assert.equal(r.score, 50);
  assert.equal(r.yatzyBonus, false);
  assert.equal(roller.calls.length, 2);
});

test('partita completa: 13 round, fine partita e vincitore', () => {
  const { game, roller } = scriptedGame();
  let events = 0;
  game.on('gameover', () => events++);
  let last;
  for (let t = 0; t < 26; t++) {
    const cat = game.current.card.openCategories()[0];
    const dice = game.current.id === 'red' ? [6, 6, 6, 6, 5] : [1, 1, 2, 3, 5];
    roller.push(dice);
    roll(game);
    game.select(cat);
    game.confirm();
    last = game.endTurn();
  }
  assert.equal(last.over, true);
  assert.equal(game.phase, 'over');
  assert.equal(events, 1);
  assert.equal(last.winner, 'red');
  for (const p of game.players) assert.equal(p.card.isComplete(), true);
  assert.throws(() => game.roll(), GameError);
  const b = last.breakdown.red;
  assert.equal(b.total, b.upper + b.upperBonus + b.lower + b.yatzyBonus);
});

test('pareggio', () => {
  const { game, roller } = scriptedGame();
  let last;
  for (let t = 0; t < 26; t++) {
    const cat = game.current.card.openCategories()[0];
    roller.push([2, 3, 4, 4, 1]);
    roll(game);
    game.select(cat);
    game.confirm();
    last = game.endTurn();
  }
  assert.equal(last.winner, null);
});

test('salvataggio e ripristino della partita', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [5, 5, 5, 5, 5], 'yatzy');
  playTurn(game, roller, [1, 2, 3, 4, 5], 'largeStraight');
  playTurn(game, roller, [5, 5, 5, 5, 5], 'fives');
  roller.push([1, 1, 2, 2, 3]);
  roll(game);
  game.toggleHold(0);
  game.select('ones');
  const json = JSON.parse(JSON.stringify(game.toJSON()));
  const copy = Game.fromJSON(json, { roller: roller });
  assert.equal(copy.current.id, 'blue');
  assert.equal(copy.turnId, game.turnId);
  assert.deepEqual(copy.dice.values, [1, 1, 2, 2, 3]);
  assert.equal(copy.dice.held[0], true);
  assert.equal(copy.selected, 'ones');
  assert.equal(copy.player('red').card.total(), game.player('red').card.total());
  assert.equal(copy.player('red').card.yatzyBonusCount(), 1);
  assert.equal(copy.player('blue').card.scores.largeStraight, 40);
  for (const id of ALL_CATEGORIES) assert.equal(copy.player('red').card.scores[id], game.player('red').card.scores[id]);
});
