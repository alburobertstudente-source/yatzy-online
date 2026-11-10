import { Game } from '../src/core/game.js';
import { createSeededRandom } from '../src/core/probability.js';

/** Dadi "a copione": restituisce i valori indicati (rispettando i dadi tenuti). */
export class ScriptedRoller {
  constructor(script = [], seed = 3) {
    this.script = [...script];
    this.calls = [];
    this.rng = createSeededRandom(seed);
    this.dieScript = [];
  }
  push(...rolls) {
    this.script.push(...rolls);
  }
  /** valori per i singoli dadi usati dalle carte (rilanci, maledizioni, Occhio) */
  pushDie(...vals) {
    this.dieScript.push(...vals);
  }
  roll(ctx) {
    this.calls.push(ctx);
    const next = this.script.shift();
    if (!next) throw new Error('Copione dei lanci terminato');
    const values = next.map((v, i) => (ctx.hasRolled && ctx.held[i] ? ctx.values[i] : v));
    return { values };
  }
  die() {
    return this.dieScript.length ? this.dieScript.shift() : 1 + Math.floor(this.rng() * 6);
  }
}

export function scriptedGame(script, { cards = [] } = {}) {
  const roller = new ScriptedRoller(script);
  const game = new Game({ roller, rng: createSeededRandom(9) });
  game.forcedCards.push(...cards);
  return { game, roller };
}

/** Gratta le carte in sospeso (scartando la più vecchia se la mano è piena). */
export function drawAll(game) {
  while (game.mustDraw) {
    if (game.pendingDiscard) game.discardCard(game.current.hand[0].uid);
    else game.drawCard();
  }
}

/** Lancia dopo aver grattato le carte in sospeso. */
export function roll(game) {
  drawAll(game);
  return game.roll();
}

/** Gioca un turno: lancia i valori dati e segna la categoria. */
export function playTurn(game, roller, values, category) {
  roller.push(values);
  roll(game);
  game.select(category);
  const res = game.confirm();
  game.endTurn();
  return res;
}
