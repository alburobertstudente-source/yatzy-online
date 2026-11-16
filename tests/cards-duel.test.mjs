import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { CARD_RULES } from '../src/config.js';
import { createSeededRandom } from '../src/core/probability.js';
import { scriptedGame, playTurn, roll, drawAll } from './helpers.mjs';

function give(game, id, player = game.current) {
  const entry = { uid: game.nextUid++, id, lockedTurn: null, lockedBy: null };
  player.hand.push(entry);
  return entry.uid;
}
const use = (game, id, params) => game.useCard(give(game, id), params);
const total = (game, pid) => game.player(pid).card.total();
/** Il rosso ha 50 (Yatzy), il blu 16; tocca al rosso. */
function midGame() {
  const s = scriptedGame();
  playTurn(s.game, s.roller, [6, 6, 6, 6, 6], 'yatzy');
  playTurn(s.game, s.roller, [1, 2, 3, 4, 6], 'chance');
  drawAll(s.game);
  return s;
}

/* ---------------- regole del duello ---------------- */
test('al massimo 2 carte per turno; il Sigillo la riduce a 1 e toglie un lancio', () => {
  const game = new Game({ rng: createSeededRandom(4) });
  drawAll(game);
  use(game, 'paccaSpalla');
  use(game, 'paccaSpalla');
  const third = give(game, 'paccaSpalla');
  assert.equal(game.cardAvailability(third).ok, false);
  assert.equal(CARD_RULES.PLAYS_PER_TURN, 2);
  game.current.hand = [];
  game.useCard; // il terzo resta in mano
  game.roll();
  game.select(game.current.card.openCategories()[0]);
  game.confirm();
  game.endTurn();
  drawAll(game);
  use(game, 'sigillo');
  game.roll();
  game.select(game.current.card.openCategories()[0]);
  game.confirm();
  game.endTurn();
  drawAll(game);
  assert.equal(game.turnState.playLimit, 1);
  assert.equal(game.dice.maxRolls, 2);
});

test('tetto di 45 punti persi per turno avversario', () => {
  const { game } = midGame();
  game.player('blue').card.scores.fullHouse = 25;
  game.player('blue').card.scores.largeStraight = 40;
  game.player('blue').card.scores.fourKind = 28;
  const r = use(game, 'ladroSupremo');
  assert.equal(r.taken, 30);
  const r2 = use(game, 'reDeiLadri', { cat: 'largeStraight' });
  assert.equal(r2.taken, 15, 'ancora sotto il tetto');
  const r3 = use(game, 'saccheggioReale', { cat: 'fourKind' });
  assert.equal(r3.taken, 0, 'tetto raggiunto');
});

test('Contromossa annulla la prossima carta avversaria; Spia e Invidia premiano chi aspetta', () => {
  const { game, roller } = midGame();
  use(game, 'contromossa');
  use(game, 'spia');
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('ones');
  game.confirm();
  game.endTurn();
  drawAll(game);
  const r = use(game, 'tesoroDraghi');
  assert.equal(r.kind, 'negated');
  assert.equal(total(game, 'blue'), 16, 'la carta non ha effetto');
  const r2 = use(game, 'paccaSpalla');
  assert.equal(r2.spied, 5);
  assert.equal(total(game, 'red'), 51 + 5);
});

test('Invidia scatta con un punteggio da 30 in su', () => {
  const { game, roller } = midGame();
  use(game, 'invidia');
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('ones');
  game.confirm();
  game.endTurn();
  drawAll(game);
  roller.push([6, 6, 6, 6, 6]);
  game.roll();
  game.select('sixes');
  assert.equal(game.confirm().envied, 15);
});

test('Allarme, Muro Invalicabile, Sfondamento', () => {
  const { game } = midGame();
  game.player('blue').status.alarm = { effectId: 1 };
  use(game, 'furtoFortuna', { cat: 'chance' });
  assert.equal(total(game, 'blue'), 16 - 6 + 10);
  game.player('blue').status.immune = { effectId: 2, turns: 2 };
  assert.equal(use(game, 'furtoFortuna', { cat: 'chance' }).blocked, true);
  game.player('blue').status.immune = null;
  game.player('blue').card.addShield('chance');
  game.player('blue').status.mirror = { effectId: 3 };
  const r = use(game, 'sfondamento');
  assert.equal(game.player('blue').card.shieldCount('chance'), 0);
  assert.equal(game.player('blue').status.mirror, null);
  assert.equal(r.taken, 9);
});

test('Muro Invalicabile dura due turni avversari', () => {
  const { game, roller } = midGame();
  use(game, 'muroInvalicabile');
  for (let k = 0; k < 2; k++) {
    playTurn(game, roller, [1, 2, 3, 4, 6], game.current.card.openCategories()[0]);
    drawAll(game);
    assert.ok(game.player('red').status.immune === null || game.player('red').status.immune.turns >= 1);
    assert.equal(use(game, 'furtoFortuna', { cat: 'yatzy' }).blocked, true, `turno avversario ${k + 1}: immune`);
    game.current.hand = [];
    playTurn(game, roller, [1, 2, 3, 4, 6], game.current.card.openCategories()[0]);
  }
  playTurn(game, roller, [1, 2, 3, 4, 6], game.current.card.openCategories()[0]);
  drawAll(game);
  assert.equal(game.player('red').status.immune, null);
  assert.equal(use(game, 'furtoFortuna', { cat: 'yatzy' }).blocked, false, 'dopo due turni il Muro cade');
});

test('scommesse: si vince o si perde', () => {
  const { game, roller } = midGame();
  use(game, 'piccolaScommessa');
  roller.push([1, 1, 2, 2, 3]);
  game.roll();
  game.select('ones');
  assert.equal(game.confirm().cardExtra, -3);
  game.endTurn();
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  drawAll(game);
  use(game, 'scommessaYatzy');
  use(game, 'grandeScommessa');
  roller.push([4, 4, 4, 4, 4]);
  game.roll();
  game.select('fourKind');
  assert.equal(game.confirm().cardExtra, 50 - 6, 'Poker/Yatzy vinto, 20 punti non bastano per la grande');
});

test('Jackpot Cosmico, Turno Perfetto, Ultimo Atto', () => {
  const { game, roller } = midGame();
  use(game, 'jackpotCosmico');
  use(game, 'turnoPerfetto');
  assert.equal(game.dice.maxRolls, 5);
  roller.push([6, 6, 6, 5, 5]);
  game.roll();
  game.select('fullHouse');
  assert.equal(game.confirm().cardExtra, 20 + 12);
  game.endTurn();
  playTurn(game, roller, [1, 2, 3, 4, 6], 'ones');
  drawAll(game);
  use(game, 'ultimoAtto');
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('twos');
  assert.equal(game.confirm().cardExtra, 6, 'prima del round 10: +6');
});

test('carte di punti: Salvadanaio, Elemosina, Rimonta Furiosa, Gran Finale, Fenice, Patto col Diavolo, Slancio', () => {
  const { game, roller } = midGame();
  assert.equal(use(game, 'salvadanaio').amount, 3);
  assert.equal(use(game, 'elemosina').amount, 3);
  game.current.hand = [];
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('yatzy' in {} ? 'ones' : 'smallStraight');
  game.confirm();
  game.endTurn();
  drawAll(game);
  assert.equal(use(game, 'rimontaFuriosa').amount, 30, 'il blu è indietro di 30+');
  assert.equal(use(game, 'granFinale').amount, 3, 'una casella segnata × 3');
  game.current.hand = [];
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('yatzy');
  game.confirm();
  game.endTurn();
  assert.equal(game.turnState.cardNotes.invest, 6);
  drawAll(game);
  assert.equal(use(game, 'fenice').amount, 35, 'nessuno 0 per il rosso');
  const p = use(game, 'pattoDiavolo');
  assert.equal(p.amount, 33);
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('ones');
  game.confirm();
  game.endTurn();
  drawAll(game);
  assert.equal(game.player('blue').status.bonusDraw, 0);
  assert.equal(use(game, 'fenice').amount, 20, 'il blu ha uno 0 nello Yatzy');
});

test('pesca: Pesca Doppia, Biblioteca, Tempesta di Carte, Mano del Re', () => {
  const { game } = midGame();
  const before = game.pendingDraws;
  use(game, 'pescaDoppia');
  assert.equal(game.pendingDraws, before + 2);
  drawAll(game);
  assert.equal(use(game, 'biblioteca').amount, 6);
  drawAll(game);
  use(game, 'tempestaCarte');
  assert.equal(game.pendingDraws, 3);
  drawAll(game);
  use(game, 'manoDelRe');
  assert.equal(game.player('red').status.extraNext, 2);
});

test('dadi: Colpo di Fortuna, Primo Passo, Ritmo, Onnipotenza', () => {
  const { game, roller } = scriptedGame();
  drawAll(game);
  use(game, 'primoPasso');
  assert.equal(game.dice.maxRolls, 4);
  roller.push([1, 5, 5, 5, 6]);
  game.roll();
  roller.pushDie(5);
  const r = use(game, 'colpoDiFortuna');
  assert.deepEqual(r.dice, [0]);
  assert.equal(game.dice.values[0], 5);
  use(game, 'ritmo');
  assert.equal(game.dice.maxRolls, 5);
  assert.equal(use(game, 'slancio').amount, 16, '4 carte giocate in questo turno × 4');
  use(game, 'onnipotenza');
  assert.equal(new Set(game.dice.values).size, 1);
  roller.push([1, 2, 3, 4, 6]);
  assert.equal(new Set(game.roll().values).size, 1, 'anche i lanci dopo');
});

test('attacchi: Spintone, Rapina, Valanga, Tiro Mancino, Rogo, Bancarotta', () => {
  const { game, roller } = midGame();
  game.player('blue').card.scores.sixes = 18;
  game.player('blue').card.addShield('sixes');
  assert.equal(use(game, 'rapina').taken, 9, 'ignora lo scudo');
  assert.equal(use(game, 'valanga').taken, 0, 'lo scudo protegge la casella');
  game.current.hand = [];
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('ones');
  game.confirm();
  game.endTurn();
  drawAll(game);
  assert.equal(use(game, 'spintone').taken, 5);
  give(game, 'coronaDestino', game.player('red'));
  use(game, 'rogo');
  assert.equal(game.player('red').hand.some((c) => c.id === 'coronaDestino'), false);
  game.current.hand = [];
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('twos');
  game.confirm();
  game.endTurn();
  drawAll(game);
  use(game, 'tiroMancino');
  game.player('blue').card.addCardPoints({ id: 777, amount: 20, kind: 'bonus' });
  use(game, 'bancarotta');
  assert.equal(game.player('blue').card.cardPointsTotal() >= 0, true);
  game.current.hand = [];
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('threes');
  game.confirm();
  game.endTurn();
  drawAll(game);
  roller.push([5, 5, 5, 5, 5]);
  const rr = game.roll();
  assert.equal(rr.curse.type, 'nudge');
  assert.equal(rr.values.filter((v) => v === 1).length, 1);
});

test('difesa e controllo: Amuleto, Fortezza, Esorcismo, Allarme', () => {
  const { game, roller } = midGame();
  use(game, 'amuleto', { cats: ['yatzy'] });
  assert.equal(game.player('red').card.shieldCount('yatzy'), 1);
  use(game, 'fortezza');
  assert.equal(game.player('red').status.mirror !== null, true);
  game.current.hand = [];
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('ones');
  game.confirm();
  game.endTurn();
  drawAll(game);
  use(game, 'maledizioneCaos');
  assert.equal(game.player('red').status.curse, null);
  assert.equal(game.player('blue').status.curse.type, 'chaos', 'lo Specchio della Fortezza rimanda la maledizione');
  game.player('blue').status.curse = null;
  game.current.hand = [];
  roller.push([1, 2, 3, 4, 6]);
  game.roll();
  game.select('ones');
  game.confirm();
  game.endTurn();
  drawAll(game);
  game.player('red').status.curse = { type: 'chaos', effectId: 5, cardId: 'maledizioneCaos' };
  const ex = use(game, 'esorcismo');
  assert.match(ex.label, /TORNA INDIETRO/);
  assert.equal(game.player('blue').status.curse.type, 'chaos');
  use(game, 'allarme');
  assert.ok(game.player('red').status.alarm);
});

test('Scambio di Carte e Mano del Re: le carte cambiano mano', () => {
  const { game } = midGame();
  game.player('red').hand = [];
  game.player('blue').hand = [];
  give(game, 'tesoroDraghi', game.player('red'));
  give(game, 'coronaDestino', game.player('blue'));
  use(game, 'scambioCarte');
  assert.ok(game.player('red').hand.some((c) => c.id === 'coronaDestino'));
  assert.ok(game.player('blue').hand.some((c) => c.id === 'tesoroDraghi'));
});
