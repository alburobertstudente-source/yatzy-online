import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, GameError } from '../src/core/game.js';
import { CARDS, CARD_IDS, RARITIES, cardsOfRarity, drawCardId } from '../src/core/cards.js';
import { createSeededRandom, FairRoller } from '../src/core/probability.js';
import { CARD_RULES } from '../src/config.js';
import { scriptedGame, playTurn, roll, drawAll } from './helpers.mjs';

/** Dà al giocatore di turno una carta specifica e restituisce il suo uid. */
function give(game, id) {
  const entry = { uid: game.nextUid++, id, lockedTurn: null, lockedBy: null };
  game.current.hand.push(entry);
  return entry.uid;
}

test('36 carte in 5 rarità (comprese le mitiche), con i nomi richiesti', () => {
  assert.equal(CARD_IDS.length, 36);
  const per = { common: 7, rare: 9, epic: 9, legendary: 6, mythic: 5 };
  for (const r of RARITIES) assert.equal(cardsOfRarity(r).length, per[r], r);
  assert.equal(Object.values(CARD_RULES.RARITY_WEIGHTS).reduce((a, b) => a + b, 0), 100);
  const names = CARD_IDS.map((id) => CARDS[id].name);
  for (const n of ['Ritira Fortuna', 'Scudo di Legno', 'Occhio del Destino', 'Mano Veloce', 'Dado Truccato', 'Furto di Fortuna', 'Scudo Arcano', 'Doppio Lancio',
    'Maledizione del Caos', 'Riscrittura del Destino', 'Saccheggio Reale', 'Prigione Temporale', 'Mano degli Dei', 'Rewind Temporale', 'Apocalisse dei Dadi', 'Corona del Destino',
    'Dado Gemello', 'Sabotaggio', 'Spicciolo Fortunato', 'Gelo Eterno', 'Mano Lesta', 'Lancio Benedetto', 'Calamita', 'Rete di Salvataggio', 'Mezza Luna', 'Lancio Rubato',
    'Scambio di Sorte', 'Tempesta di Lanci', 'Moltiplicatore', 'Re dei Ladri', 'Scudo Divino', 'Big Bang', 'Furto Cosmico', 'Tempo Infinito', 'Benedizione Eterna', 'Buco Nero']) {
    assert.ok(names.includes(n), n);
  }
});

test('pescata: rarità secondo le probabilità configurate', () => {
  const rng = createSeededRandom(42);
  const counts = Object.fromEntries(RARITIES.map((r) => [r, 0]));
  const N = 40000;
  for (let i = 0; i < N; i++) counts[CARDS[drawCardId(rng)].rarity]++;
  for (const r of RARITIES) {
    const expected = CARD_RULES.RARITY_WEIGHTS[r] / 100;
    assert.ok(Math.abs(counts[r] / N - expected) < 0.01, `${r}: ${(counts[r] / N).toFixed(3)} atteso ${expected}`);
  }
});

test('ogni turno inizia grattando una carta: prima non si lancia', () => {
  const { game } = scriptedGame([[1, 2, 3, 4, 5]], { cards: ['manoVeloce'] });
  assert.equal(game.mustDraw, true);
  assert.throws(() => game.roll(), GameError);
  const d = game.drawCard();
  assert.equal(d.card.id, 'manoVeloce');
  assert.equal(game.current.hand.length, 1);
  game.roll();
  assert.throws(() => game.drawCard(), GameError, 'una sola carta per turno');
});

test('anche il blu gratta a inizio turno', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  assert.equal(game.current.id, 'blue');
  assert.equal(game.mustDraw, true);
  drawAll(game);
  assert.equal(game.player('blue').hand.length, 1);
  assert.equal(game.player('red').hand.length, 1);
});

test('mano piena: oltre 5 carte bisogna scartarne una', () => {
  const { game } = scriptedGame();
  for (let i = 0; i < 5; i++) give(game, 'manoVeloce');
  const d = game.drawCard();
  assert.equal(d.handFull, true);
  assert.equal(game.mustDraw, true);
  assert.throws(() => game.roll(), GameError);
  game.discardCard(game.current.hand[0].uid);
  assert.equal(game.current.hand.length, 5);
  assert.equal(game.mustDraw, false);
});

test('una carta usata sparisce dalla mano e le carte si usano solo nel proprio turno', () => {
  const { game, roller } = scriptedGame([[1, 2, 3, 4, 5]]);
  drawAll(game);
  const uid = give(game, 'doppioLancio');
  game.useCard(uid);
  assert.ok(!game.current.hand.some((c) => c.uid === uid));
  assert.throws(() => game.useCard(uid), GameError);
  roller.push([1, 1, 1, 1, 1]);
});

/* ---------------- comuni ---------------- */
test('Ritira Fortuna: rilancia fino a 2 dadi senza consumare lanci', () => {
  const { game, roller } = scriptedGame([[1, 2, 3, 4, 5]]);
  roll(game);
  const uid = give(game, 'ritiraFortuna');
  assert.equal(game.cardAvailability(uid).ok, true);
  assert.throws(() => game.useCard(uid, { dice: [0, 1, 2] }), GameError, 'massimo 2 dadi');
  roller.pushDie(6, 6);
  const r = game.useCard(uid, { dice: [0, 1] });
  assert.deepEqual(r.after, [6, 6]);
  assert.deepEqual(game.dice.values, [6, 6, 3, 4, 5]);
  assert.equal(game.dice.rollsUsed, 1);
});

test('Ritira Fortuna: non utilizzabile prima del primo lancio', () => {
  const { game } = scriptedGame();
  drawAll(game);
  const uid = give(game, 'ritiraFortuna');
  assert.equal(game.cardAvailability(uid).ok, false);
});

test('Scudo di Legno blocca un furto; Scudo Arcano protegge due caselle', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [6, 6, 6, 6, 2], 'chance'); // rosso 26
  // blu: scudo... no, il rosso deve proteggersi: torniamo al rosso
  playTurn(game, roller, [1, 2, 3, 4, 6], 'chance'); // blu 16
  drawAll(game);
  const shield = give(game, 'scudoLegno');
  game.useCard(shield, { cats: ['chance'] });
  assert.equal(game.player('red').card.shieldCount('chance'), 1);
  roller.push([2, 2, 2, 3, 3]);
  game.roll();
  game.select('fullHouse');
  game.confirm();
  game.endTurn();
  // blu tenta il furto sulla casella protetta
  drawAll(game);
  const theft = give(game, 'furtoFortuna');
  const r = game.useCard(theft, { cat: 'chance' });
  assert.equal(r.blocked, true);
  assert.equal(r.taken, 0);
  assert.equal(game.player('red').card.value('chance'), 26);
  assert.equal(game.player('red').card.shieldCount('chance'), 0, 'lo scudo si consuma');
  // Scudo Arcano su due caselle
  const arcane = give(game, 'scudoArcano');
  assert.throws(() => game.useCard(arcane, { cats: ['ones'] }), GameError);
  game.useCard(arcane, { cats: ['ones', 'yatzy'] });
  assert.equal(game.current.card.shieldCount('ones'), 1);
  assert.equal(game.current.card.shieldCount('yatzy'), 1);
});

test('Occhio del Destino: il dado scelto esce col valore rivelato', () => {
  const { game, roller } = scriptedGame([[1, 1, 1, 1, 1]]);
  drawAll(game);
  const uid = give(game, 'occhioDestino');
  roller.pushDie(6);
  const r = game.useCard(uid, { dice: [2] });
  assert.equal(r.value, 6);
  game.roll();
  assert.equal(game.dice.values[2], 6, 'il risultato rivelato si avvera');
  assert.deepEqual(game.dice.values, [1, 1, 6, 1, 1]);
});

test('Mano Veloce: fa grattare un\'altra carta', () => {
  const { game } = scriptedGame([], { cards: ['manoVeloce', 'coronaDestino'] });
  drawAll(game);
  const uid = game.current.hand[0].uid;
  game.useCard(uid);
  assert.equal(game.mustDraw, true);
  const d = game.drawCard();
  assert.equal(d.card.id, 'coronaDestino');
});

/* ---------------- rare ---------------- */
test('Dado Truccato: +1 o −1 restando tra 1 e 6', () => {
  const { game } = scriptedGame([[1, 3, 3, 3, 6]]);
  roll(game);
  const a = give(game, 'dadoTruccato');
  assert.throws(() => game.useCard(a, { dice: [0], delta: -1 }), GameError);
  assert.throws(() => game.useCard(a, { dice: [4], delta: 1 }), GameError);
  game.useCard(a, { dice: [0], delta: 1 });
  assert.deepEqual(game.dice.values, [2, 3, 3, 3, 6]);
});

test('Furto di Fortuna ruba 10 punti da una casella; Saccheggio Reale 25', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [6, 6, 6, 6, 6], 'yatzy'); // rosso 50
  drawAll(game);
  const t = give(game, 'furtoFortuna');
  const r = game.useCard(t, { cat: 'yatzy' });
  assert.equal(r.taken, 10);
  assert.equal(game.player('red').card.value('yatzy'), 40);
  assert.equal(game.player('red').card.total(), 40);
  assert.equal(game.player('blue').card.total(), 10);
  const s = give(game, 'saccheggioReale');
  game.useCard(s, { cat: 'yatzy' });
  assert.equal(game.player('red').card.total(), 15);
  assert.equal(game.player('blue').card.total(), 35);
  // il furto non toglie il diritto al bonus +100 dei prossimi Yatzy
  assert.equal(game.player('red').card.qualifiesForYatzyBonus([2, 2, 2, 2, 2]), true);
});

test('il furto non può superare il valore della casella e richiede punti', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [1, 1, 2, 3, 4], 'ones'); // 2 punti
  drawAll(game);
  const t = give(game, 'saccheggioReale');
  assert.throws(() => game.useCard(t, { cat: 'twos' }), GameError, 'casella vuota');
  const r = game.useCard(t, { cat: 'ones' });
  assert.equal(r.taken, 2);
  assert.equal(game.player('red').card.value('ones'), 0);
});

test('il bonus +35 non si perde se poi vengono rubati punti', () => {
  const { game, roller } = scriptedGame();
  for (const [d, c] of [[[6, 6, 6, 6, 1], 'sixes'], [[5, 5, 5, 5, 1], 'fives'], [[4, 4, 4, 1, 2], 'fours']]) {
    playTurn(game, roller, d, c);
    playTurn(game, roller, [1, 2, 3, 4, 6], game.current.card.openCategories().at(-1));
  }
  const red = game.player('red').card;
  assert.equal(red.upperTotal(), 56);
  playTurn(game, roller, [3, 3, 3, 1, 2], 'threes'); // 65
  assert.equal(red.upperBonus(), 35);
  drawAll(game);
  game.useCard(give(game, 'saccheggioReale'), { cat: 'sixes' });
  assert.equal(red.value('sixes'), 0, 'la casella da 24 perde tutti i suoi 24 punti');
  assert.equal(red.upperTotal(), 41);
  assert.equal(red.upperBonus(), 35, 'bonus mantenuto');
});

test('Doppio Lancio: un lancio in più nel turno', () => {
  const { game } = scriptedGame([[1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4, 4]]);
  drawAll(game);
  game.useCard(give(game, 'doppioLancio'));
  game.roll();
  game.roll();
  game.roll();
  assert.equal(game.canRoll(), true);
  game.roll();
  assert.equal(game.canRoll(), false);
  assert.deepEqual(game.dice.values, [4, 4, 4, 4, 4]);
});

/* ---------------- epiche ---------------- */
test('Maledizione del Caos: al prossimo lancio l\'avversario rilancia 2 dadi non conservati', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'maledizioneCaos'));
  assert.equal(game.player('blue').status.curse.type, 'chaos');
  assert.equal(game.cardAvailability(give(game, 'apocalisseDadi')).ok, false, 'una maledizione alla volta');
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  // turno del blu
  roller.push([5, 5, 5, 5, 5]);
  roller.pushDie(1, 2);
  const r = roll(game);
  assert.ok(r.curse);
  assert.equal(r.curse.type, 'chaos');
  assert.equal(r.curse.dice.length, 2);
  assert.deepEqual(r.rolledValues, [5, 5, 5, 5, 5]);
  assert.equal(r.values.filter((v) => v === 5).length, 3);
  assert.equal(game.player('blue').status.curse, null, 'la maledizione scatta una volta');
});

test('Maledizione: non tocca i dadi conservati', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  roller.push([4, 4, 1, 2, 3]);
  game.roll();
  game.select('chance');
  game.confirm();
  game.endTurn();
  // il blu lancia senza maledizione, poi il rosso lo maledice al turno dopo
  playTurn(game, roller, [1, 2, 3, 4, 6], 'chance');
  drawAll(game);
  game.useCard(give(game, 'maledizioneCaos'));
  roller.push([6, 6, 6, 1, 2]);
  game.roll();
  game.select('sixes');
  game.confirm();
  game.endTurn();
  roller.push([3, 3, 3, 1, 2]);
  drawAll(game);
  // primo lancio del blu: maledizione su 2 dei 5 dadi (nessuno conservato)
  const r = game.roll();
  assert.equal(r.curse.dice.length, 2);
});

test('Riscrittura del Destino: un dado diventa un altro numero', () => {
  const { game } = scriptedGame([[2, 2, 2, 2, 5]]);
  roll(game);
  const uid = give(game, 'riscritturaDestino');
  assert.throws(() => game.useCard(uid, { dice: [4], value: 5 }), GameError, 'numero diverso');
  game.useCard(uid, { dice: [4], value: 2 });
  assert.deepEqual(game.dice.values, [2, 2, 2, 2, 2]);
});

test('Prigione Temporale: blocca una carta avversaria per il suo prossimo turno', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  // dai una carta al blu
  const blue = game.player('blue');
  blue.hand.push({ uid: 900, id: 'doppioLancio', lockedTurn: null, lockedBy: null });
  const p = give(game, 'prigioneTemporale');
  game.useCard(p, { uid: 900 });
  assert.equal(game.isCardLocked(blue.hand.find((c) => c.uid === 900)), true);
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  drawAll(game);
  assert.equal(game.cardAvailability(900).ok, false, 'bloccata nel turno del blu');
  assert.throws(() => game.useCard(900), GameError);
  playTurn(game, roller, [1, 2, 3, 4, 6], 'chance');
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  drawAll(game);
  assert.equal(game.cardAvailability(900).ok, true, 'libera al turno successivo');
});

/* ---------------- leggendarie ---------------- */
test('Mano degli Dei: imposta tutti e cinque i dadi (anche uno Yatzy con bonus)', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [5, 5, 5, 5, 5], 'yatzy');
  playTurn(game, roller, [1, 2, 3, 4, 6], 'chance');
  roller.push([1, 2, 3, 4, 6]);
  roll(game);
  game.useCard(give(game, 'manoDegliDei'), { values: [6, 6, 6, 6, 6] });
  game.select('sixes');
  const r = game.confirm();
  assert.equal(r.score, 30);
  assert.equal(r.yatzyBonus, true);
  assert.equal(game.player('red').card.total(), 50 + 30 + 100);
});

test('Corona del Destino: raddoppia il punteggio del turno, fino a +100', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'coronaDestino'));
  roller.push([4, 4, 4, 4, 4]);
  game.roll();
  game.select('yatzy');
  const r = game.confirm();
  assert.equal(r.crownExtra, 50);
  assert.equal(game.player('red').card.total(), 100);
  game.endTurn();
  playTurn(game, roller, [1, 2, 3, 4, 6], 'chance');
  drawAll(game);
  game.useCard(give(game, 'coronaDestino'));
  roller.push([6, 6, 6, 6, 5]);
  game.roll();
  game.select('fourKind');
  const r2 = game.confirm();
  assert.equal(r2.score, 29);
  assert.equal(r2.crownExtra, 29);
  assert.equal(CARD_RULES.CROWN_CAP, 100);
});

test('Corona: due Corone nello stesso turno non si sommano', () => {
  const { game } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'coronaDestino'));
  const second = give(game, 'coronaDestino');
  assert.equal(game.cardAvailability(second).ok, false);
});

test('Apocalisse dei Dadi: rilancia tutti i non conservati e un dado non si può conservare', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'apocalisseDadi'));
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  roller.push([6, 6, 6, 6, 6]);
  roller.pushDie(1, 2, 3, 4, 5);
  const r = roll(game);
  assert.equal(r.curse.type, 'apocalypse');
  assert.equal(r.curse.dice.length, 5);
  assert.deepEqual(r.values, [1, 2, 3, 4, 5]);
  const nh = r.curse.noHoldDie;
  assert.ok(nh >= 0 && nh < 5);
  assert.equal(game.canHold(nh), false);
  assert.throws(() => game.toggleHold(nh), GameError);
  const other = (nh + 1) % 5;
  game.toggleHold(other);
  roller.push([2, 2, 2, 2, 2]);
  game.roll();
  assert.equal(game.player('blue').status.noHoldDie, null, 'il divieto vale per un solo lancio');
});

test('Rewind Temporale: annulla un furto subito', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [6, 6, 6, 6, 6], 'yatzy');
  drawAll(game);
  game.useCard(give(game, 'saccheggioReale'), { cat: 'yatzy' });
  assert.equal(game.player('red').card.total(), 25);
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('chance');
  game.confirm();
  game.endTurn();
  drawAll(game);
  const rw = give(game, 'rewindTemporale');
  const r = game.useCard(rw);
  assert.equal(r.undone.kind, 'steal');
  assert.equal(r.undone.amount, 25);
  assert.equal(game.player('red').card.total(), 50);
  assert.equal(game.player('blue').card.total(), 16);
});

test('Rewind Temporale: annulla una maledizione prima che scatti', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'apocalisseDadi'));
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  drawAll(game);
  const r = game.useCard(give(game, 'rewindTemporale'));
  assert.equal(r.draw, true, 'il Rewind fa pescare una carta');
  drawAll(game);
  assert.equal(r.undone.kind, 'curse');
  assert.equal(game.player('blue').status.curse, null);
  roller.push([6, 6, 6, 6, 6]);
  const rr = game.roll();
  assert.equal(rr.curse, null);
});

test('Rewind Temporale: libera una carta imprigionata e toglie i punti della Corona', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.player('blue').hand.push({ uid: 777, id: 'doppioLancio', lockedTurn: null, lockedBy: null });
  game.useCard(give(game, 'prigioneTemporale'), { uid: 777 });
  game.useCard(give(game, 'coronaDestino'));
  roller.push([3, 3, 3, 3, 3]);
  game.roll();
  game.select('yatzy');
  game.confirm();
  game.endTurn();
  assert.equal(game.player('red').card.total(), 100);
  drawAll(game);
  // l'effetto più recente annullabile è la Corona
  let r = game.useCard(give(game, 'rewindTemporale'));
  assert.equal(r.undone.kind, 'crown');
  assert.equal(game.player('red').card.total(), 50);
  drawAll(game);
  r = game.useCard(give(game, 'rewindTemporale'));
  drawAll(game);
  assert.equal(r.undone.kind, 'prison');
  assert.equal(game.cardAvailability(777).ok, true);
  assert.equal(game.cardAvailability(give(game, 'rewindTemporale')).ok, false, 'niente altro da annullare');
});

test('Rewind non annulla le proprie carte né effetti già scattati', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  game.useCard(give(game, 'maledizioneCaos'));
  assert.equal(game.cardAvailability(give(game, 'rewindTemporale')).ok, false);
  playTurn(game, roller, [1, 2, 3, 4, 5], 'chance');
  roller.push([1, 1, 1, 1, 1]);
  roll(game); // la maledizione scatta
  assert.equal(game.cardAvailability(give(game, 'rewindTemporale')).ok, false);
});

test('salvataggio e ripresa con carte, scudi, maledizioni e furti', () => {
  const { game, roller } = scriptedGame();
  playTurn(game, roller, [6, 6, 6, 6, 6], 'yatzy');
  drawAll(game);
  game.useCard(give(game, 'furtoFortuna'), { cat: 'yatzy' });
  game.useCard(give(game, 'scudoArcano'), { cats: ['ones', 'twos'] });
  game.useCard(give(game, 'maledizioneCaos'));
  give(game, 'coronaDestino');
  game.useCard(give(game, 'occhioDestino'), { dice: [1] });
  const json = JSON.parse(JSON.stringify(game.toJSON()));
  const copy = Game.fromJSON(json, { roller });
  assert.equal(copy.player('red').card.total(), 40);
  assert.equal(copy.player('blue').card.total(), 10);
  assert.equal(copy.player('blue').card.shieldCount('ones'), 1);
  assert.equal(copy.player('red').status.curse.type, 'chaos');
  assert.equal(copy.current.hand.some((c) => c.id === 'coronaDestino'), true);
  assert.equal(copy.turnState.foresight[1], game.turnState.foresight[1]);
  const r = copy.useCard(copy.current.hand.find((c) => c.id === 'coronaDestino').uid);
  assert.equal(r.kind, 'crown');
  assert.ok(copy.nextUid > Math.max(...copy.current.hand.map((c) => c.uid), 0));
});

test('dadi equi per entrambi i giocatori (nessun vantaggio)', () => {
  const roller = new FairRoller({ rng: createSeededRandom(77) });
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6000; i++) {
    roller.roll({ values: [0, 0, 0, 0, 0], held: [], hasRolled: false }).values.forEach((v) => counts[v]++);
  }
  const n = 30000;
  const chi = counts.slice(1).reduce((a, o) => a + ((o - n / 6) ** 2) / (n / 6), 0);
  assert.ok(chi < 20.5, `chi2 ${chi.toFixed(2)}`);
  // il motore non distingue più i giocatori: stessa sorgente di dadi per tutti
  const g = new Game();
  assert.equal(typeof g.roller.roll, 'function');
  assert.equal(g.luck, undefined);
});
