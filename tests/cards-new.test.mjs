import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, GameError } from '../src/core/game.js';
import { CARDS, CARD_IDS } from '../src/core/cards.js';
import { autoParams } from '../src/core/powers.js';
import { createSeededRandom } from '../src/core/probability.js';
import { scriptedGame, playTurn, roll, drawAll } from './helpers.mjs';

function give(game, id, player = game.current) {
  const entry = { uid: game.nextUid++, id, lockedTurn: null, lockedBy: null };
  player.hand.push(entry);
  return entry.uid;
}

test('Dado Gemello: il primo dado copia il secondo', () => {
  const { game, roller } = scriptedGame();
  roller.push([1, 2, 3, 4, 6]);
  roll(game);
  const r = game.useCard(give(game, 'dadoGemello'), { dice: [0, 4] });
  assert.deepEqual(r.values, [6, 2, 3, 4, 6]);
  assert.throws(() => game.useCard(give(game, 'dadoGemello'), { dice: [0, 4] }), GameError);
});

test('Calamita: un altro dado diventa uguale a quello scelto', () => {
  const { game, roller } = scriptedGame();
  roller.push([5, 5, 1, 2, 3]);
  roll(game);
  const r = game.useCard(give(game, 'calamita'), { dice: [0] });
  assert.equal(r.values.filter((v) => v === 5).length, 3);
});

test('Sabotaggio: la casella scelta è bloccata nel prossimo turno avversario; lo scudo lo ferma', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'sabotaggio'), { cat: 'chance' });
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  assert.ok(game.turnState.blocked.includes('chance'));
  roller.push([6, 6, 6, 6, 5]);
  roll(game);
  assert.throws(() => game.select('chance'), GameError);
  game.select('sixes');
  game.confirm();
  game.endTurn();
  // con lo scudo il sabotaggio non passa
  drawAll(game);
  game.player('blue').card.addShield('chance');
  const r = game.useCard(give(game, 'sabotaggio'), { cat: 'chance' });
  assert.equal(r.blocked, true);
  assert.equal(game.player('blue').status.sabotage, null);
});

test('Spicciolo, Moltiplicatore e Rete di Salvataggio sommano punti al turno', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'spiccioloFortunato'));
  game.useCard(give(game, 'moltiplicatore'));
  roller.push([6, 6, 6, 6, 4]);
  game.roll();
  game.select('chance'); // 28
  const r = game.confirm();
  assert.equal(r.cardExtra, 8 + 14);
  assert.equal(game.player('red').card.total(), 28 + 22);
  game.endTurn();
  drawAll(game);
  game.useCard(give(game, 'reteSalvataggio'));
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('yatzy');
  const r2 = game.confirm();
  assert.equal(r2.score, 0);
  assert.equal(r2.cardExtra, 15);
});

test('Gelo Eterno: due dadi dell avversario si congelano al suo prossimo lancio', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'geloEterno'));
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  roller.push([2, 2, 2, 5, 6]);
  const r = roll(game);
  assert.equal(r.curse.type, 'freeze');
  assert.equal(r.curse.frozen.length, 2);
  assert.deepEqual(r.values, [2, 2, 2, 5, 6], 'i valori non cambiano');
  for (const i of r.curse.frozen) assert.throws(() => game.toggleHold(i), GameError);
});

test('Mano Lesta: ruba una carta, il Rewind la restituisce', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  const target = give(game, 'coronaDestino', game.player('blue'));
  const r = game.useCard(give(game, 'manoLesta'), { uid: target });
  assert.equal(r.cardId, 'coronaDestino');
  assert.ok(game.player('red').hand.some((c) => c.uid === target));
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  drawAll(game);
  const rw = game.useCard(give(game, 'rewindTemporale'));
  assert.equal(rw.undone.kind, 'cardSteal');
  assert.ok(game.player('blue').hand.some((c) => c.uid === target));
});

test('Lancio Benedetto: gli 1 e i 2 del lancio si rilanciano da soli', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'lancioBenedetto'));
  roller.push([1, 2, 6, 6, 6]);
  roller.pushDie(5, 4);
  const r = game.roll();
  assert.deepEqual(r.blessed.dice, [0, 1]);
  assert.deepEqual(r.values, [5, 4, 6, 6, 6]);
  roller.push([1, 1, 1, 1, 1]);
  const r2 = game.roll();
  assert.equal(r2.blessed, null, 'solo un lancio benedetto');
});

test('Mezza Luna: il prossimo punteggio avversario si dimezza (Rewind lo restituisce)', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'mezzaLuna'));
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  const r = playTurn(game, roller, [6, 6, 6, 6, 6], 'yatzy');
  assert.equal(r.halved.taken, 25);
  assert.equal(game.player('blue').card.total(), 25);
  drawAll(game);
  game.player('red').hand = [];
  roller.push([1, 1, 2, 3, 4]);
  game.roll();
  game.select('twos');
  game.confirm();
  game.endTurn();
  drawAll(game);
  const rw = game.useCard(give(game, 'rewindTemporale'));
  assert.equal(rw.undone.kind, 'halve');
  assert.equal(game.player('blue').card.total(), 50);
});

test('Lancio Rubato: l avversario ha un lancio in meno nel suo turno', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'lancioRubato'));
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  assert.equal(game.dice.maxRolls, 2);
  assert.equal(game.turnState.cardNotes.lessRolls, true);
});

test('Scambio di Sorte: ruba la differenza nella stessa casella', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [1, 1, 2, 3, 4], 'chance'); // rosso 11
  playTurn(game, roller, [6, 6, 6, 5, 5], 'chance'); // blu 28
  drawAll(game);
  const r = game.useCard(give(game, 'scambioSorte'), { cat: 'chance' });
  assert.equal(r.taken, 17);
  assert.equal(game.player('red').card.total(), 28);
  assert.equal(game.player('blue').card.total(), 11);
});

test('Tempesta di Lanci e Tempo Infinito aggiungono lanci', () => {
  const { game } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'tempestaLanci'));
  assert.equal(game.dice.maxRolls, 5);
  game.useCard(give(game, 'tempoInfinito'));
  assert.equal(game.dice.maxRolls, 13);
});

test('Mano degli Dei (potenziata): sceglie i dadi e dà un lancio in più', () => {
  const { game, roller } = scriptedGame();
  roller.push([1, 2, 3, 4, 6]);
  roll(game);
  const r = game.useCard(give(game, 'manoDegliDei'), { values: [5, 5, 5, 5, 5] });
  assert.equal(r.extraRoll, true);
  assert.equal(game.dice.rollsLeft, 3);
});

test('Re dei Ladri ruba 50, Scudo Divino protegge tutte le caselle', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [6, 6, 6, 6, 6], 'yatzy');
  drawAll(game);
  game.useCard(give(game, 'reDeiLadri'), { cat: 'yatzy' });
  assert.equal(game.player('blue').card.total(), 50);
  assert.equal(game.player('red').card.total(), 0);
  const r = game.useCard(give(game, 'scudoDivino'));
  assert.equal(r.cats.length, 13);
});

test('Big Bang: Yatzy di sei e un lancio in più', () => {
  const { game, roller } = scriptedGame();
  roller.push([1, 2, 3, 4, 6]);
  roll(game);
  const r = game.useCard(give(game, 'bigBang'));
  assert.deepEqual(r.values, [6, 6, 6, 6, 6]);
  game.select('yatzy');
  assert.equal(game.confirm().score, 50);
});

test('Furto Cosmico: ruba tutta la casella migliore, anche con lo scudo', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [6, 6, 6, 6, 6], 'yatzy');
  drawAll(game);
  game.player('red').card.addShield('yatzy');
  const r = game.useCard(give(game, 'furtoCosmico'));
  assert.equal(r.cat, 'yatzy');
  assert.equal(r.taken, 50);
  assert.equal(game.player('red').card.total(), 0);
  assert.equal(game.player('blue').card.total(), 50);
});

test('Benedizione Eterna: lancio extra e 1-2 rilanciati per questo turno e i 3 successivi', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'benedizioneEterna'));
  assert.equal(game.dice.maxRolls, 4);
  roller.push([1, 6, 6, 6, 6]);
  roller.pushDie(3);
  assert.equal(game.roll().values[0], 3);
  game.select('chance');
  game.confirm();
  game.endTurn();
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  assert.equal(game.turnState.blessAll, true);
  assert.equal(game.dice.maxRolls, 4);
  assert.equal(game.player('red').status.blessTurns, 2);
});

test('Buco Nero: inghiotte le carte avversarie e lancia l Apocalisse; il Rewind le restituisce', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  give(game, 'coronaDestino', game.player('blue'));
  give(game, 'doppioLancio', game.player('blue'));
  const r = game.useCard(give(game, 'bucoNero'));
  assert.equal(r.swallowed.length, 2);
  assert.equal(game.player('blue').hand.length, 0);
  assert.equal(game.player('blue').status.curse.type, 'apocalypse');
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  drawAll(game);
  const rw = game.useCard(give(game, 'rewindTemporale'));
  assert.equal(rw.undone.kind, 'blackhole');
  assert.equal(game.player('blue').status.curse, null);
  assert.ok(game.player('blue').hand.some((c) => c.id === 'coronaDestino'));
});

test('ogni carta ha parametri automatici validi in una partita (bot, test, online)', () => {
  // partita lunga con tutte le carte forzate a turno: nessuna eccezione e salvataggio coerente
  const rng = createSeededRandom(77);
  const game = new Game({ rng });
  let k = 0;
  let used = 0;
  while (game.phase === 'playing' && k < 2000) {
    k++;
    if (game.pendingDiscard) game.discardCard(game.current.hand[0].uid);
    else if (game.pendingDraws > 0) {
      game.forcedCards.push(CARD_IDS[k % CARD_IDS.length]);
      game.drawCard();
    } else if (game.scoredThisTurn) game.endTurn();
    else {
      if (!game.dice.hasRolled && game.canRoll()) game.roll();
      for (const c of [...game.current.hand]) {
        if (game.cardAvailability(c.uid).ok) {
          game.useCard(c.uid, autoParams(game, c));
          used++;
        }
      }
      if (game.pendingDraws > 0 || game.pendingDiscard) continue;
      const open = game.current.card.openCategories().filter((c) => !game.isBlocked(c));
      game.select(open[0]);
      game.confirm();
    }
    const copy = Game.fromJSON(JSON.parse(JSON.stringify(game.toJSON())), { rng: createSeededRandom(1) });
    assert.equal(copy.stateHash(), game.stateHash());
  }
  assert.equal(game.phase, 'over');
  assert.ok(used > 15, `carte usate: ${used}`);
  for (const id of CARD_IDS) assert.ok(CARDS[id].name && CARDS[id].text, id);
});
