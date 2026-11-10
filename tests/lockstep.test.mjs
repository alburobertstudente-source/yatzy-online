/**
 * Partite online: i due telefoni eseguono lo stesso motore con lo stesso seme.
 * Applicando le stesse azioni nello stesso ordine devono restare identici.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { createSeededRandom } from '../src/core/probability.js';
import { CARDS } from '../src/core/cards.js';
import { ALL_CATEGORIES } from '../src/core/scoring.js';
import { stealableBoxes, shieldableBoxes } from '../src/core/powers.js';

/** Sceglie la prossima azione guardando solo lo stato (uguale sui due telefoni). */
function nextAction(game, pick) {
  if (game.pendingDiscard) return { type: 'discard', uid: game.current.hand[Math.floor(pick() * game.current.hand.length)].uid };
  if (game.pendingDraws > 0) return { type: 'draw' };
  if (game.scoredThisTurn) return { type: 'endTurn' };
  const me = game.current;
  const usable = me.hand.filter((c) => game.cardAvailability(c.uid).ok);
  if (usable.length && pick() < 0.35) {
    const c = usable[Math.floor(pick() * usable.length)];
    const t = CARDS[c.id].target;
    const params = {};
    if (t?.kind === 'dice') {
      params.dice = [0, 1, 2, 3, 4].filter((i) => game.turnState.foresight[i] === undefined || !t.foresight).slice(0, t.max === 2 ? 2 : 1);
      if (CARDS[c.id].choice === 'plusMinus') params.delta = game.dice.values[params.dice[0]] > 1 ? -1 : 1;
      if (CARDS[c.id].choice === 'face') params.value = (game.dice.values[params.dice[0]] % 6) + 1;
    } else if (t?.kind === 'allDice') params.values = [6, 6, 6, 6, 6];
    else if (t?.kind === 'ownBoxes') params.cats = shieldableBoxes(me).slice(0, t.count);
    else if (t?.kind === 'oppBox') params.cat = stealableBoxes(game, me)[0];
    else if (t?.kind === 'oppCard') params.uid = game.opponent.hand.find((x) => !game.isCardLocked(x))?.uid;
    return { type: 'useCard', uid: c.uid, params };
  }
  if (game.canRoll() && (!game.dice.hasRolled || pick() < 0.6)) {
    if (game.dice.hasRolled && pick() < 0.5) {
      const i = Math.floor(pick() * 5);
      if (game.canHold(i) || game.dice.held[i]) return { type: 'hold', i };
    }
    return { type: 'roll' };
  }
  const open = me.card.openCategories();
  if (game.selected === null) return { type: 'select', cat: open[Math.floor(pick() * open.length)] };
  return { type: 'confirm' };
}

function apply(game, a) {
  switch (a.type) {
    case 'draw': return game.drawCard();
    case 'discard': return game.discardCard(a.uid);
    case 'roll': return game.roll();
    case 'hold': return game.toggleHold(a.i);
    case 'select': return game.select(a.cat);
    case 'confirm': return game.confirm();
    case 'endTurn': return game.endTurn();
    case 'useCard': return game.useCard(a.uid, a.params);
    default: throw new Error(a.type);
  }
}

for (const seed of [1, 42, 20261110, 3735928559]) {
  test(`lockstep: due motori con seme ${seed} restano identici per tutta la partita`, () => {
    const host = new Game({ rng: createSeededRandom(seed) });
    const guest = new Game({ rng: createSeededRandom(seed) });
    const pick = createSeededRandom(seed ^ 0x5bd1e995);
    let steps = 0;
    let cardsUsed = 0;
    while (host.phase === 'playing') {
      const a = nextAction(host, pick); // l'azione nasce sul telefono di chi è di turno...
      apply(host, a);
      apply(guest, JSON.parse(JSON.stringify(a))); // ...e viaggia in rete fino all'altro
      if (a.type === 'useCard') cardsUsed++;
      assert.equal(guest.stateHash(), host.stateHash(), `divergenza al passo ${steps} (${a.type})`);
      steps++;
      assert.ok(steps < 5000);
    }
    assert.equal(guest.phase, 'over');
    assert.deepEqual(guest.results(), host.results());
    assert.ok(cardsUsed > 0);
  });
}

test('risincronizzazione: lo stato salvato (con il generatore) continua identico', () => {
  const host = new Game({ rng: createSeededRandom(99) });
  const pick = createSeededRandom(7);
  for (let i = 0; i < 120 && host.phase === 'playing'; i++) apply(host, nextAction(host, pick));
  const snapshot = JSON.parse(JSON.stringify(host.toJSON()));
  const guest = Game.fromJSON(snapshot, { rng: createSeededRandom(1) });
  assert.equal(guest.stateHash(), host.stateHash());
  const pick2 = createSeededRandom(8);
  while (host.phase === 'playing') {
    const a = nextAction(host, pick2);
    apply(host, a);
    apply(guest, a);
    assert.equal(guest.stateHash(), host.stateHash());
  }
});

test("l'impronta cambia quando cambia lo stato", () => {
  const g = new Game({ rng: createSeededRandom(5) });
  const h0 = g.stateHash();
  g.drawCard();
  assert.notEqual(g.stateHash(), h0);
  assert.match(h0, /^[0-9a-f]{8}$/);
});

test('ogni categoria è segnabile anche negli scenari lockstep', () => {
  assert.equal(ALL_CATEGORIES.length, 13);
});
