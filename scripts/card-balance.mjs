/**
 * Bilanciamento delle carte: valore atteso di ogni carta misurato col bot.
 * Da una posizione di metà partita (stesso seme), si giocano 2 turni a testa
 * con la carta usata dal giocatore di turno dopo il primo lancio, e senza.
 * Valore = differenza media di (miei punti − punti avversario).
 *   node scripts/card-balance.mjs [partite per carta]
 */
import { Game } from '../src/core/game.js';
import { CARDS, CARD_IDS } from '../src/core/cards.js';
import { autoParams } from '../src/core/powers.js';
import { createSeededRandom } from '../src/core/probability.js';
import { botMove, applyMove } from '../src/ai/bot.js';

const N = Number(process.argv[2]) || 40;
const SKILL = 0.6;

function drawAll(g) {
  while (g.mustDraw) {
    if (g.pendingDiscard) g.discardCard(g.current.hand[0].uid);
    else g.drawCard();
  }
}

/** Turno del bot; se `card` è dato lo usa dopo il primo lancio (o prima, se serve). */
function turn(g, rng, card = null) {
  drawAll(g);
  g.current.hand = []; // il bot non gioca altre carte: si misura solo quella in prova
  let used = false;
  const tryUse = () => {
    if (!card || used) return;
    const entry = { uid: g.nextUid++, id: card, lockedTurn: null, lockedBy: null };
    g.current.hand.push(entry);
    if (g.cardAvailability(entry.uid).ok) {
      g.useCard(entry.uid, autoParams(g, entry));
      used = true;
      drawAll(g);
    } else g.current.hand = g.current.hand.filter((c) => c.uid !== entry.uid);
  };
  for (let k = 0; k < 80; k++) {
    if (g.dice.hasRolled) tryUse();
    const m = botMove(g, { skill: SKILL, rng });
    applyMove(g, m);
    if (m.type === 'confirm') break;
  }
  if (!used && card) tryUse(); // carte senza dadi (es. punti) se non usate prima
  g.endTurn();
  return used;
}

function margin(g, pid) {
  const me = g.player(pid);
  return me.card.total() - g.other(me).card.total();
}

const start = [];
for (let i = 0; i < N; i++) {
  const g = new Game({ rng: createSeededRandom(1000 + i) });
  const rng = createSeededRandom(5000 + i);
  for (let t = 0; t < 10; t++) turn(g, rng); // 5 round giocati
  start.push(g.toJSON());
}

const rows = [];
for (const id of CARD_IDS) {
  let sum = 0;
  let usedN = 0;
  for (let i = 0; i < N; i++) {
    const res = [];
    for (const withCard of [true, false]) {
      const g = Game.fromJSON(JSON.parse(JSON.stringify(start[i])), { rng: createSeededRandom(1) });
      const rng = createSeededRandom(9000 + i);
      const pid = g.current.id;
      const u = turn(g, rng, withCard ? id : null);
      if (withCard && u) usedN++;
      for (let t = 0; t < 3 && g.phase === 'playing'; t++) turn(g, rng);
      res.push(margin(g, pid));
    }
    sum += res[0] - res[1];
  }
  rows.push({ id, rarity: CARDS[id].rarity, ev: sum / N, used: usedN / N });
}
const order = ['common', 'rare', 'epic', 'legendary', 'mythic', 'absurd'];
rows.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity) || a.ev - b.ev);
for (const r of rows) console.log(`${r.rarity.padEnd(10)} ${r.id.padEnd(20)} ${r.ev.toFixed(1).padStart(7)}  (usata ${(r.used * 100).toFixed(0)}%)`);
for (const rar of order) {
  const l = rows.filter((r) => r.rarity === rar);
  if (l.length) console.log(`media ${rar}: ${(l.reduce((s, r) => s + r.ev, 0) / l.length).toFixed(1)}`);
}
