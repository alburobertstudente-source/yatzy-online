/**
 * Effetti delle carte potenziamento.
 * Funzioni pure sul motore di gioco: controllano se una carta si può usare,
 * applicano l'effetto e sanno annullarlo (Rewind Temporale).
 * Nessuna dipendenza dal DOM.
 */
import { CARDS } from './cards.js';
import { GameError } from './errors.js';
import { ALL_CATEGORIES } from './scoring.js';
import { RULES } from '../config.js';

const DICE = RULES.DICE_COUNT;
const no = (reason) => ({ ok: false, reason });
const yes = { ok: true, reason: '' };

/** Una carta in mano è bloccata dalla Prigione Temporale? */
export function isLocked(game, entry) {
  return entry.lockedTurn !== null && entry.lockedTurn !== undefined && entry.lockedTurn >= game.turnId;
}

/** Caselle avversarie da cui si possono rubare punti. */
export function stealableBoxes(game, attacker) {
  const victim = game.other(attacker);
  return ALL_CATEGORIES.filter((c) => (victim.card.value(c) ?? 0) > 0);
}

/** Caselle proprie su cui si può mettere uno scudo. */
export function shieldableBoxes(player) {
  return ALL_CATEGORIES.filter((c) => player.card.canShield(c));
}

/**
 * Si può usare questa carta adesso? Restituisce { ok, reason }.
 * @param {import('./game.js').Game} game
 */
export function cardAvailability(game, entry) {
  const def = CARDS[entry.id];
  if (game.phase !== 'playing') return no('La partita è finita');
  if (game.scoredThisTurn) return no('Hai già segnato in questo turno');
  if (game.pendingDraws > 0 || game.pendingDiscard) return no('Prima gratta la carta');
  if (isLocked(game, entry)) return no('Carta bloccata dalla Prigione Temporale');
  const me = game.current;
  const opp = game.opponent;
  const dice = game.dice;
  switch (entry.id) {
    case 'ritiraFortuna':
    case 'dadoTruccato':
    case 'riscritturaDestino':
    case 'manoDegliDei':
      return dice.hasRolled ? yes : no('Prima lancia i dadi');
    case 'occhioDestino':
      if (dice.rollsLeft <= 0) return no('Non hai più lanci in questo turno');
      return Object.keys(game.turnState.foresight).length >= DICE ? no('Conosci già tutti i dadi') : yes;
    case 'scudoLegno':
      return shieldableBoxes(me).length >= 1 ? yes : no('Nessuna casella da proteggere');
    case 'scudoArcano':
      return shieldableBoxes(me).length >= 2 ? yes : no('Servono due caselle da proteggere');
    case 'furtoFortuna':
    case 'saccheggioReale':
      return stealableBoxes(game, me).length ? yes : no("L'avversario non ha ancora punti da rubare");
    case 'maledizioneCaos':
    case 'apocalisseDadi':
      return opp.status.curse ? no("L'avversario è già maledetto") : yes;
    case 'prigioneTemporale':
      return opp.hand.some((c) => !isLocked(game, c)) ? yes : no("L'avversario non ha carte da bloccare");
    case 'doppioLancio':
      return dice.maxRolls < RULES.MAX_ROLLS + 5 ? yes : no('Troppi lanci extra');
    case 'manoVeloce':
      return yes;
    case 'rewindTemporale':
      return findRewindTarget(game, me) ? yes : no("Nessun effetto avversario da annullare");
    case 'coronaDestino':
      return game.turnState.crown ? no('Corona già attiva in questo turno') : yes;
    default:
      return def ? yes : no('Carta sconosciuta');
  }
}

/* ------------------------------------------------------------------ */
/* Applicazione                                                        */
/* ------------------------------------------------------------------ */

function checkDice(list, min, max) {
  if (!Array.isArray(list)) throw new GameError('Scegli i dadi');
  const set = new Set(list);
  if (set.size !== list.length) throw new GameError('Dadi ripetuti');
  if (list.length < min || list.length > max) throw new GameError(`Scegli da ${min} a ${max} dadi`);
  for (const i of list) if (!Number.isInteger(i) || i < 0 || i >= DICE) throw new GameError('Dado non valido');
  return list;
}

/**
 * Applica l'effetto della carta. Restituisce i dettagli per l'interfaccia
 * e i dati per un eventuale annullamento.
 */
export function applyCard(game, me, entry, params = {}, effectId) {
  const opp = game.other(me);
  const dice = game.dice;
  const log = { id: effectId, cardId: entry.id, by: me.id, target: opp.id, turnId: game.turnId, kind: 'none', undone: false };
  let result;

  switch (entry.id) {
    case 'ritiraFortuna': {
      const list = checkDice(params.dice, 1, 2);
      const before = list.map((i) => dice.values[i]);
      for (const i of list) dice.setValue(i, game.freshDie(i));
      result = { kind: 'reroll', dice: list, before, after: list.map((i) => dice.values[i]) };
      break;
    }
    case 'occhioDestino': {
      const [i] = checkDice(params.dice, 1, 1);
      if (game.turnState.foresight[i] !== undefined) throw new GameError('Conosci già questo dado');
      const value = game.randomDie();
      game.turnState.foresight[i] = value;
      result = { kind: 'foresight', die: i, value };
      break;
    }
    case 'manoVeloce':
      game.pendingDraws++;
      result = { kind: 'draw' };
      break;
    case 'dadoTruccato': {
      const [i] = checkDice(params.dice, 1, 1);
      const delta = params.delta;
      if (delta !== 1 && delta !== -1) throw new GameError('Scegli +1 o −1');
      const from = dice.values[i];
      const to = from + delta;
      if (to < 1 || to > 6) throw new GameError('Il dado deve restare tra 1 e 6');
      dice.setValue(i, to);
      result = { kind: 'setDie', die: i, from, to };
      break;
    }
    case 'riscritturaDestino': {
      const [i] = checkDice(params.dice, 1, 1);
      const to = params.value;
      const from = dice.values[i];
      if (!Number.isInteger(to) || to < 1 || to > 6) throw new GameError('Scegli un numero da 1 a 6');
      if (to === from) throw new GameError('Scegli un numero diverso');
      dice.setValue(i, to);
      result = { kind: 'setDie', die: i, from, to };
      break;
    }
    case 'manoDegliDei': {
      const vals = params.values;
      if (!Array.isArray(vals) || vals.length !== DICE || vals.some((v) => !Number.isInteger(v) || v < 1 || v > 6)) {
        throw new GameError('Scegli il valore di tutti e cinque i dadi');
      }
      const from = [...dice.values];
      vals.forEach((v, i) => dice.setValue(i, v));
      result = { kind: 'setAll', from, to: [...vals] };
      break;
    }
    case 'scudoLegno':
    case 'scudoArcano': {
      const count = CARDS[entry.id].target.count;
      const cats = params.cats;
      if (!Array.isArray(cats) || cats.length !== count || new Set(cats).size !== count) throw new GameError(`Scegli ${count} caselle`);
      for (const c of cats) if (!me.card.canShield(c)) throw new GameError('Casella non proteggibile');
      cats.forEach((c) => me.card.addShield(c));
      Object.assign(log, { kind: 'shield', owner: me.id, cats: [...cats] });
      result = { kind: 'shield', cats: [...cats] };
      break;
    }
    case 'furtoFortuna':
    case 'saccheggioReale': {
      const cat = params.cat;
      if (!stealableBoxes(game, me).includes(cat)) throw new GameError('Scegli una casella avversaria con punti');
      const amount = CARDS[entry.id].amount;
      const blocked = opp.card.consumeShield(cat);
      const taken = blocked ? 0 : opp.card.applyDebit(cat, amount);
      if (taken > 0) me.card.addCardPoints({ id: effectId, amount: taken, kind: 'steal', cat });
      Object.assign(log, { kind: 'steal', victim: opp.id, cat, taken, blocked });
      result = { kind: 'steal', victim: opp.id, cat, amount, taken, blocked };
      break;
    }
    case 'doppioLancio':
      dice.addRoll();
      result = { kind: 'extraRoll', maxRolls: dice.maxRolls };
      break;
    case 'maledizioneCaos':
    case 'apocalisseDadi': {
      if (opp.status.curse) throw new GameError("L'avversario è già maledetto");
      const curse = CARDS[entry.id].curse;
      opp.status.curse = { type: curse, effectId, cardId: entry.id };
      Object.assign(log, { kind: 'curse', victim: opp.id, curse });
      result = { kind: 'curse', curse, victim: opp.id };
      break;
    }
    case 'prigioneTemporale': {
      const target = opp.hand.find((c) => c.uid === params.uid);
      if (!target || isLocked(game, target)) throw new GameError('Scegli una carta avversaria libera');
      target.lockedTurn = game.turnId + 1; // il prossimo turno è dell'avversario
      target.lockedBy = effectId;
      Object.assign(log, { kind: 'prison', victim: opp.id, uid: target.uid, lockedCard: target.id });
      result = { kind: 'prison', victim: opp.id, uid: target.uid, cardId: target.id };
      break;
    }
    case 'rewindTemporale': {
      const t = findRewindTarget(game, me);
      if (!t) throw new GameError('Nessun effetto da annullare');
      const undone = undoEffect(game, t);
      result = { kind: 'rewind', undone };
      break;
    }
    case 'coronaDestino':
      if (game.turnState.crown) throw new GameError('Corona già attiva');
      game.turnState.crown = effectId;
      Object.assign(log, { kind: 'crown', amount: 0, cat: null });
      result = { kind: 'crown' };
      break;
    default:
      throw new GameError('Carta sconosciuta');
  }
  return { result, log };
}

/* ------------------------------------------------------------------ */
/* Rewind Temporale                                                     */
/* ------------------------------------------------------------------ */

/** L'effetto è ancora annullabile? */
export function isReversible(game, e) {
  if (e.undone) return false;
  const owner = game.player(e.by);
  const victim = e.victim ? game.player(e.victim) : null;
  switch (e.kind) {
    case 'steal':
      return true;
    case 'curse':
      return victim.status.curse?.effectId === e.id;
    case 'prison': {
      const c = victim.hand.find((x) => x.uid === e.uid);
      return Boolean(c && c.lockedBy === e.id && isLocked(game, c));
    }
    case 'crown':
      return e.amount > 0 && owner.card.cardPoints.some((p) => p.id === e.id);
    case 'shield':
      return e.cats.some((c) => owner.card.shieldCount(c) > 0);
    default:
      return false;
  }
}

/** Ultimo effetto annullabile giocato dall'avversario di `me`. */
export function findRewindTarget(game, me) {
  for (let k = game.effectLog.length - 1; k >= 0; k--) {
    const e = game.effectLog[k];
    if (e.by !== me.id && isReversible(game, e)) return e;
  }
  return null;
}

/** Annulla un effetto e restituisce cosa è stato annullato. */
export function undoEffect(game, e) {
  const owner = game.player(e.by);
  const victim = e.victim ? game.player(e.victim) : null;
  const info = { effectId: e.id, cardId: e.cardId, kind: e.kind, by: e.by };
  switch (e.kind) {
    case 'steal':
      if (e.blocked) {
        if (victim.card.canShield(e.cat)) victim.card.addShield(e.cat);
        Object.assign(info, { cat: e.cat, restoredShield: true, amount: 0 });
      } else {
        victim.card.removeDebit(e.cat, e.taken);
        owner.card.removeCardPoints(e.id);
        Object.assign(info, { cat: e.cat, amount: e.taken, victim: victim.id });
      }
      break;
    case 'curse':
      victim.status.curse = null;
      info.curse = e.curse;
      break;
    case 'prison': {
      const c = victim.hand.find((x) => x.uid === e.uid);
      if (c) {
        c.lockedTurn = null;
        c.lockedBy = null;
      }
      info.uid = e.uid;
      break;
    }
    case 'crown':
      owner.card.removeCardPoints(e.id);
      Object.assign(info, { amount: e.amount, cat: e.cat });
      break;
    case 'shield':
      info.cats = e.cats.filter((c) => owner.card.removeShields(c, 1) > 0);
      break;
    default:
      throw new GameError('Effetto non annullabile');
  }
  e.undone = true;
  return info;
}
