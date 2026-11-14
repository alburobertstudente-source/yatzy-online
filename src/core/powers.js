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
import { ROLL_CAP } from './dice.js';

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

/**
 * Caselle scegliibili per le carte con bersaglio { kind: 'box' }.
 * Sabotaggio: caselle libere dell'avversario (ne deve restare almeno un'altra libera).
 * Scambio di Sorte: caselle segnate da entrambi in cui l'avversario ha più punti.
 */
export function boxTargets(game, me, cardId) {
  const opp = game.other(me);
  if (cardId === 'sabotaggio') {
    const open = opp.card.openCategories();
    return open.length >= 2 ? open : [];
  }
  if (cardId === 'scambioSorte') {
    return ALL_CATEGORIES.filter((c) => {
      const mine = me.card.value(c);
      const theirs = opp.card.value(c);
      return mine !== null && theirs !== null && theirs > mine;
    });
  }
  return [];
}

/** Casella migliore dell'avversario (Furto Cosmico): la prima col valore più alto. */
export function bestBox(game, me) {
  const opp = game.other(me);
  let best = null;
  for (const c of ALL_CATEGORIES) {
    const v = opp.card.value(c) ?? 0;
    if (v > 0 && (best === null || v > (opp.card.value(best) ?? 0))) best = c;
  }
  return best;
}

/**
 * Difesa di una casella attaccata: prima lo scudo, poi lo Specchio Riflesso
 * (annulla l'attacco e dà 10 punti alla vittima). Restituisce 'shield' | 'mirror' | null.
 */
export function guard(victim, cat, effectId) {
  if (cat && victim.card.consumeShield(cat)) return 'shield';
  if (victim.status.mirror) {
    victim.status.mirror = null;
    victim.card.addCardPoints({ id: effectId, amount: 10, kind: 'counter', cat: cat || null });
    return 'mirror';
  }
  return null;
}

/** Contrattacco: dopo un furto riuscito, la vittima riprende il doppio. */
export function counterSteal(victim, taken, effectId) {
  if (taken <= 0 || !victim.status.counter) return 0;
  victim.status.counter = null;
  const amount = taken * 2;
  victim.card.addCardPoints({ id: effectId, amount, kind: 'counter', cat: null });
  return amount;
}

/** Maledizione con lo Specchio: torna indietro a chi l'ha lanciata. */
function placeCurse(me, opp, curse) {
  if (opp.status.mirror) {
    opp.status.mirror = null;
    if (!me.status.curse) me.status.curse = curse;
    return { target: me, reflected: true };
  }
  opp.status.curse = curse;
  return { target: opp, reflected: false };
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
    case 'bigBang':
      return dice.hasRolled ? yes : no('Prima lancia i dadi');
    case 'dadoGemello':
      if (!dice.hasRolled) return no('Prima lancia i dadi');
      return new Set(dice.values).size > 1 ? yes : no('I dadi sono già tutti uguali');
    case 'calamita':
      if (!dice.hasRolled) return no('Prima lancia i dadi');
      return new Set(dice.values).size > 1 ? yes : no('I dadi sono già tutti uguali');
    case 'sabotaggio':
      if (opp.status.sabotage) return no("L'avversario è già sabotato");
      return boxTargets(game, me, 'sabotaggio').length ? yes : no("L'avversario ha troppe poche caselle libere");
    case 'scambioSorte':
      return boxTargets(game, me, 'scambioSorte').length ? yes : no("Nessuna casella in cui l'avversario è davanti a te");
    case 'spiccioloFortunato':
    case 'reteSalvataggio':
    case 'moltiplicatore': {
      const kind = def.bonus.kind;
      return game.turnState.bonuses?.some((b) => b.kind === kind) ? no('Già attiva in questo turno') : yes;
    }
    case 'geloEterno':
      return opp.status.curse ? no("L'avversario è già maledetto") : yes;
    case 'manoLesta':
      return opp.hand.length ? yes : no("L'avversario non ha carte");
    case 'lancioBenedetto':
      if (!dice.canRoll()) return no('Non hai più lanci in questo turno');
      return game.turnState.blessed ? no('Il prossimo lancio è già benedetto') : yes;
    case 'mezzaLuna':
      return opp.status.halve ? no("L'avversario ha già la Mezza Luna") : yes;
    case 'lancioRubato':
      return opp.status.lessRolls ? no("L'avversario ha già un lancio in meno") : yes;
    case 'tempestaLanci':
    case 'tempoInfinito':
      return dice.maxRolls + def.extraRolls <= ROLL_CAP ? yes : no('Troppi lanci extra');
    case 'reDeiLadri':
    case 'furtoCosmico':
      return stealableBoxes(game, me).length ? yes : no("L'avversario non ha ancora punti da rubare");
    case 'scudoDivino':
      return shieldableBoxes(me).length >= 1 ? yes : no('Nessuna casella da proteggere');
    case 'benedizioneEterna':
      return me.status.blessTurns ? no('Sei già benedetto') : yes;
    case 'bucoNero':
      return opp.hand.length || !opp.status.curse ? yes : no("Il Buco Nero non ha niente da inghiottire");
    case 'occhioDestino':
      if (dice.rollsLeft <= 0) return no('Non hai più lanci in questo turno');
      return dice.freeIndexes().some((i) => game.turnState.foresight[i] === undefined) ? yes : no('Conosci già tutti i dadi');
    case 'seiFortunato':
      if (!dice.hasRolled) return no('Prima lancia i dadi');
      return dice.values.some((v) => v < 6) ? yes : no('Sono già tutti 6');
    case 'spintaGentile':
      if (!dice.hasRolled) return no('Prima lancia i dadi');
      return dice.values.some((v) => v <= 2) ? yes : no('Nessun 1 o 2 da spingere');
    case 'tassaDelRe':
      return stealableBoxes(game, me).length ? yes : no("L'avversario non ha ancora punti");
    case 'raddoppioSuperiore':
      return game.turnState.bonuses?.some((b) => b.kind === 'upper2') ? no('Già attiva in questo turno') : yes;
    case 'ladroDiLanci':
      if (dice.maxRolls >= ROLL_CAP) return no('Troppi lanci extra');
      return opp.status.lessRolls ? no("L'avversario ha già un lancio in meno") : yes;
    case 'eco':
      return me.card.lastScored && (me.card.value(me.card.lastScored) ?? 0) > 0 ? yes : no('Nessun punteggio da ripetere');
    case 'tesoroDraghi':
      return yes;
    case 'clonazione':
      return opp.hand.length && me.hand.length - 1 < 5 ? yes : no('Niente da clonare');
    case 'paccaSpalla':
    case 'investimento':
    case 'rivincita':
    case 'fontanaDesideri':
    case 'pioggiaOro':
      return entry.id === 'investimento' && me.status.invest ? no('Hai già un investimento') : yes;
    case 'rimbalzo':
      return dice.hasRolled && dice.freeIndexes().length ? yes : no(dice.hasRolled ? 'Tutti i dadi sono conservati' : 'Prima lancia i dadi');
    case 'antidoto':
      return yes;
    case 'trappola':
      return opp.status.trap ? no("L'avversario ha già una trappola") : yes;
    case 'specchioRiflesso':
      return me.status.mirror ? no('Hai già uno Specchio') : yes;
    case 'combo':
      return game.turnState.cardsPlayed > 0 ? yes : no('Prima gioca un\'altra carta in questo turno');
    case 'terremoto':
      return stealableBoxes(game, me).length ? yes : no("L'avversario non ha punti");
    case 'jackpot':
      return game.turnState.bonuses?.some((b) => b.kind === 'jackpot') ? no('Già attiva in questo turno') : yes;
    case 'catene':
      return opp.status.chains ? no("L'avversario è già incatenato") : yes;
    case 'contrattacco':
      return me.status.counter ? no('Contrattacco già pronto') : yes;
    case 'tempestaPerfetta':
      return opp.status.curse && opp.status.lessRolls && opp.status.halve ? no("L'avversario è già nella tempesta") : yes;
    case 'dominioAssoluto':
      return me.status.yatzyTurns || game.turnState.yatzyAll ? no('Il Dominio è già attivo') : yes;
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
      return dice.maxRolls < ROLL_CAP ? yes : no('Troppi lanci extra');
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
      const list = checkDice(params.dice, 1, 3);
      const before = list.map((i) => dice.values[i]);
      for (const i of list) dice.setValue(i, game.freshDie(i));
      result = { kind: 'reroll', dice: list, before, after: list.map((i) => dice.values[i]) };
      break;
    }
    case 'occhioDestino': {
      const list = dice.freeIndexes().filter((i) => game.turnState.foresight[i] === undefined).slice(0, 3);
      if (!list.length) throw new GameError('Conosci già tutti i dadi');
      const values = list.map((i) => (game.turnState.foresight[i] = game.randomDie()));
      result = { kind: 'foresight', die: list[0], value: values[0], dice: list, values };
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
      game.pendingDraws++;
      result = { kind: 'setDie', die: i, from, to, draw: true };
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
    case 'bigBang': {
      const counts = [0, 0, 0, 0, 0, 0, 0];
      dice.values.forEach((v) => counts[v]++);
      let best = 6;
      for (let v = 6; v >= 1; v--) if (counts[v] > counts[best]) best = v;
      const from = [...dice.values];
      const keep = dice.values.findIndex((v) => v !== best); // un dado resta com'è (se ce n'è uno diverso)
      const to = dice.values.map((v, i) => (i === keep && counts[best] < 5 ? v : best));
      if (counts[best] >= 4) to.fill(best); // già Poker: diventa Yatzy
      to.forEach((v, i) => dice.setValue(i, v));
      result = { kind: 'setAll', from, to, extraRoll: false };
      break;
    }
    case 'manoDegliDei': {
      const vals = params.values;
      if (!Array.isArray(vals) || vals.length !== DICE || vals.some((v) => !Number.isInteger(v) || v < 1 || v > 6)) {
        throw new GameError('Scegli il valore di tutti e cinque i dadi');
      }
      const from = [...dice.values];
      vals.forEach((v, i) => dice.setValue(i, v));
      // in più, un lancio extra (se c'è ancora spazio)
      const extraRoll = dice.maxRolls < ROLL_CAP;
      if (extraRoll) dice.addRoll();
      result = { kind: 'setAll', from, to: [...vals], extraRoll };
      break;
    }
    case 'dadoGemello': {
      const [a, b] = checkDice(params.dice, 2, 2);
      const from = dice.values[a];
      const to = dice.values[b];
      if (from === to) throw new GameError('Scegli due dadi con numeri diversi');
      dice.setValue(a, to);
      result = { kind: 'setDie', die: a, from, to, source: b };
      break;
    }
    case 'calamita': {
      const [i] = checkDice(params.dice, 1, 1);
      const to = dice.values[i];
      const others = [0, 1, 2, 3, 4].filter((j) => j !== i && dice.values[j] !== to);
      if (!others.length) throw new GameError('Gli altri dadi sono già uguali');
      const free = others.filter((j) => !dice.held[j]);
      const pool = free.length ? free : others;
      const j = pool[Math.min(pool.length - 1, Math.floor(game.rng() * pool.length))];
      const from = dice.values[j];
      dice.setValue(j, to);
      result = { kind: 'setDie', die: j, from, to, source: i };
      break;
    }
    case 'sabotaggio': {
      const cat = params.cat;
      if (opp.status.sabotage) throw new GameError("L'avversario è già sabotato");
      if (!boxTargets(game, me, 'sabotaggio').includes(cat)) throw new GameError('Scegli una casella libera avversaria');
      const blocked = Boolean(guard(opp, cat, effectId));
      if (!blocked) opp.status.sabotage = { cat, effectId };
      me.card.addCardPoints({ id: effectId, amount: 5, kind: 'bonus', cat: null });
      Object.assign(log, { kind: 'sabotage', victim: opp.id, cat, blocked });
      result = { kind: 'sabotage', victim: opp.id, cat, blocked };
      break;
    }
    case 'scambioSorte': {
      const cat = params.cat;
      if (!boxTargets(game, me, 'scambioSorte').includes(cat)) throw new GameError("Scegli una casella in cui l'avversario è davanti");
      const amount = opp.card.value(cat) - me.card.value(cat);
      const g = guard(opp, cat, effectId);
      const blocked = Boolean(g);
      const taken = blocked ? 0 : opp.card.applyDebit(cat, amount);
      if (taken > 0) me.card.addCardPoints({ id: effectId, amount: taken, kind: 'steal', cat });
      const countered = counterSteal(opp, taken, effectId);
      Object.assign(log, { kind: 'steal', victim: opp.id, cat, taken, blocked: g === 'shield' });
      result = { kind: 'steal', victim: opp.id, cat, amount, taken, blocked, mirrored: g === 'mirror', countered };
      break;
    }
    case 'spiccioloFortunato':
    case 'reteSalvataggio':
    case 'moltiplicatore': {
      const b = CARDS[entry.id].bonus;
      if (!game.turnState.bonuses) game.turnState.bonuses = [];
      if (game.turnState.bonuses.some((x) => x.kind === b.kind)) throw new GameError('Già attiva in questo turno');
      game.turnState.bonuses.push({ kind: b.kind, effectId, cardId: entry.id });
      const now = entry.id === 'reteSalvataggio' ? 5 : 0;
      if (now) me.card.addCardPoints({ id: effectId, amount: now, kind: 'bonus', cat: null });
      Object.assign(log, { kind: 'bonus', amount: now, cat: null });
      result = { kind: 'bonusSet', bonus: b.kind };
      break;
    }
    case 'geloEterno': {
      if (opp.status.curse) throw new GameError("L'avversario è già maledetto");
      const pc = placeCurse(me, opp, { type: 'freeze', effectId, cardId: entry.id });
      Object.assign(log, { kind: 'curse', victim: pc.target.id, curse: 'freeze' });
      result = { kind: 'curse', curse: 'freeze', victim: pc.target.id, reflected: pc.reflected };
      break;
    }
    case 'manoLesta': {
      const k = opp.hand.findIndex((c) => c.uid === params.uid);
      if (k < 0) throw new GameError("Scegli una carta dell'avversario");
      const [card] = opp.hand.splice(k, 1);
      card.lockedTurn = null;
      card.lockedBy = null;
      me.hand.push(card);
      Object.assign(log, { kind: 'cardSteal', victim: opp.id, uid: card.uid, stolenCard: card.id });
      result = { kind: 'cardSteal', victim: opp.id, uid: card.uid, cardId: card.id };
      break;
    }
    case 'lancioBenedetto':
      game.turnState.blessed = 2;
      result = { kind: 'bless' };
      break;
    case 'mezzaLuna':
      if (opp.status.halve) throw new GameError("L'avversario ha già la Mezza Luna");
      opp.status.halve = { effectId };
      me.card.addCardPoints({ id: effectId, amount: 5, kind: 'bonus', cat: null });
      Object.assign(log, { kind: 'halve', victim: opp.id, cat: null, taken: 0, blocked: false, fired: false });
      result = { kind: 'halveSet', victim: opp.id };
      break;
    case 'lancioRubato':
      if (opp.status.lessRolls) throw new GameError("L'avversario ha già un lancio in meno");
      opp.status.lessRolls = { effectId };
      Object.assign(log, { kind: 'lessRolls', victim: opp.id });
      result = { kind: 'lessRolls', victim: opp.id };
      break;
    case 'tempestaLanci':
    case 'tempoInfinito': {
      const n = CARDS[entry.id].extraRolls;
      if (dice.maxRolls + n > ROLL_CAP) throw new GameError('Troppi lanci extra');
      for (let k = 0; k < n; k++) dice.addRoll();
      game.turnState.blessAll = true; // lanci "benedetti": 1 e 2 si rilanciano da soli
      if (entry.id === 'tempoInfinito') me.status.tempoTurns = 2;
      result = { kind: 'extraRoll', added: n, maxRolls: dice.maxRolls };
      break;
    }
    case 'scudoDivino': {
      const cats = shieldableBoxes(me);
      if (!cats.length) throw new GameError('Nessuna casella da proteggere');
      cats.forEach((c) => me.card.addShield(c));
      Object.assign(log, { kind: 'shield', owner: me.id, cats: [...cats] });
      result = { kind: 'shield', cats: [...cats] };
      break;
    }
    case 'furtoCosmico': {
      const cat = bestBox(game, me);
      if (!cat) throw new GameError("L'avversario non ha punti da rubare");
      const amount = Math.min(30, opp.card.value(cat));
      const taken = opp.card.applyDebit(cat, amount); // ignora scudi e specchi
      if (taken > 0) me.card.addCardPoints({ id: effectId, amount: taken, kind: 'steal', cat });
      counterSteal(opp, taken, effectId);
      Object.assign(log, { kind: 'steal', victim: opp.id, cat, taken, blocked: false });
      result = { kind: 'steal', victim: opp.id, cat, amount, taken, blocked: false, cosmic: true };
      break;
    }
    case 'benedizioneEterna': {
      if (me.status.blessTurns) throw new GameError('Sei già benedetto');
      me.status.blessTurns = 4;
      game.turnState.blessAll = true;
      const extraRoll = dice.maxRolls < ROLL_CAP;
      if (extraRoll) dice.addRoll();
      if (dice.maxRolls < ROLL_CAP) dice.addRoll();
      result = { kind: 'bless', eternal: true, extraRoll };
      break;
    }
    case 'bucoNero': {
      const swallowed = opp.hand.map((c) => ({ ...c }));
      opp.hand = [];
      let curse = false;
      if (!opp.status.curse) {
        opp.status.curse = { type: 'apocalypse', effectId, cardId: entry.id };
        curse = true;
      }
      Object.assign(log, { kind: 'blackhole', victim: opp.id, swallowed, curse });
      result = { kind: 'blackhole', victim: opp.id, swallowed: swallowed.map((c) => c.id), curse };
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
    case 'saccheggioReale':
    case 'reDeiLadri': {
      const cat = params.cat;
      if (!stealableBoxes(game, me).includes(cat)) throw new GameError('Scegli una casella avversaria con punti');
      const amount = CARDS[entry.id].amount;
      const g = guard(opp, cat, effectId);
      const blocked = Boolean(g);
      const taken = blocked ? 0 : opp.card.applyDebit(cat, amount);
      if (taken > 0) me.card.addCardPoints({ id: effectId, amount: taken, kind: 'steal', cat });
      const countered = counterSteal(opp, taken, effectId);
      Object.assign(log, { kind: 'steal', victim: opp.id, cat, taken, blocked: g === 'shield' });
      result = { kind: 'steal', victim: opp.id, cat, amount, taken, blocked, mirrored: g === 'mirror', countered };
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
      const pc = placeCurse(me, opp, { type: curse, effectId, cardId: entry.id });
      Object.assign(log, { kind: 'curse', victim: pc.target.id, curse });
      result = { kind: 'curse', curse, victim: pc.target.id, reflected: pc.reflected };
      break;
    }
    case 'prigioneTemporale': {
      const targets = opp.hand.filter((c) => !isLocked(game, c));
      if (!targets.length) throw new GameError("L'avversario non ha carte da bloccare");
      for (const t of targets) {
        t.lockedTurn = game.turnId + 1; // il prossimo turno è dell'avversario
        t.lockedBy = effectId;
      }
      Object.assign(log, { kind: 'prison', victim: opp.id, uid: targets[0].uid, uids: targets.map((c) => c.uid), lockedCard: targets[0].id });
      result = { kind: 'prison', victim: opp.id, uid: targets[0].uid, cardId: targets[0].id, count: targets.length };
      break;
    }
    case 'seiFortunato': {
      const i = dice.values.reduce((b, v, k) => (v < dice.values[b] ? k : b), 0);
      const from = dice.values[i];
      const to = Math.min(6, from + 2);
      dice.setValue(i, to);
      result = { kind: 'setDie', die: i, from, to };
      break;
    }
    case 'spintaGentile': {
      const idx = [0, 1, 2, 3, 4].filter((i) => dice.values[i] <= 2);
      const from = [...dice.values];
      idx.forEach((i) => dice.setValue(i, dice.values[i] + 1));
      result = { kind: 'reroll', dice: idx, before: idx.map((i) => from[i]), after: idx.map((i) => dice.values[i]) };
      break;
    }
    case 'tassaDelRe': {
      const cats = stealableBoxes(game, me)
        .sort((a, b) => opp.card.value(b) - opp.card.value(a))
        .slice(0, 3);
      let taken = 0;
      const parts = [];
      for (const cat of cats) {
        const blocked = Boolean(guard(opp, cat, effectId));
        const t = blocked ? 0 : opp.card.applyDebit(cat, 3);
        taken += t;
        parts.push({ cat, taken: t, blocked });
      }
      if (taken > 0) me.card.addCardPoints({ id: effectId, amount: taken, kind: 'steal', cat: cats[0] });
      counterSteal(opp, taken, effectId);
      Object.assign(log, { kind: 'tax', victim: opp.id, parts, taken });
      result = { kind: 'steal', victim: opp.id, cat: cats[0], amount: 9, taken, blocked: taken === 0 && parts.some((p) => p.blocked), parts };
      break;
    }
    case 'raddoppioSuperiore': {
      if (!game.turnState.bonuses) game.turnState.bonuses = [];
      game.turnState.bonuses.push({ kind: 'upper2', effectId, cardId: entry.id });
      me.card.addCardPoints({ id: effectId, amount: 6, kind: 'bonus', cat: null });
      Object.assign(log, { kind: 'bonus', amount: 6, cat: null });
      result = { kind: 'bonusSet', bonus: 'upper2' };
      break;
    }
    case 'ladroDiLanci': {
      if (opp.status.lessRolls) throw new GameError("L'avversario ha già un lancio in meno");
      dice.addRoll();
      if (dice.maxRolls < ROLL_CAP) dice.addRoll();
      game.pendingDraws++;
      opp.status.lessRolls = { effectId };
      Object.assign(log, { kind: 'lessRolls', victim: opp.id });
      result = { kind: 'extraRoll', added: 2, maxRolls: dice.maxRolls, stolen: true, draw: true };
      break;
    }
    case 'eco': {
      const cat = me.card.lastScored;
      const base = Math.min(40, me.card.value(cat) ?? 0);
      if (base <= 0) throw new GameError('Nessun punteggio da ripetere');
      const amount = base + 5;
      me.card.addCardPoints({ id: effectId, amount, kind: 'bonus', cat });
      Object.assign(log, { kind: 'bonus', amount, cat });
      result = { kind: 'points', amount, cat };
      break;
    }
    case 'tesoroDraghi':
      me.card.addCardPoints({ id: effectId, amount: 30, kind: 'bonus', cat: null });
      Object.assign(log, { kind: 'bonus', amount: 30, cat: null });
      result = { kind: 'points', amount: 30, cat: null };
      break;
    case 'clonazione': {
      const room = Math.max(0, 5 - (me.hand.length - 1));
      const copies = opp.hand.slice(0, room).map((c) => ({ uid: game.nextUid++, id: c.id, lockedTurn: null, lockedBy: null }));
      me.hand.push(...copies);
      game.pendingDraws++;
      result = { kind: 'clone', cards: copies.map((c) => c.id), draw: true };
      break;
    }
    case 'paccaSpalla':
    case 'pioggiaOro':
    case 'rivincita':
    case 'fontanaDesideri': {
      let amount;
      if (entry.id === 'paccaSpalla') amount = 6;
      else if (entry.id === 'pioggiaOro') amount = 45;
      else if (entry.id === 'fontanaDesideri') amount = Math.min(60, 5 * me.card.filledCount());
      else {
        const gap = opp.card.total() - me.card.total();
        amount = gap > 0 ? Math.min(40, Math.ceil(gap / 2)) : 5;
      }
      if (amount > 0) me.card.addCardPoints({ id: effectId, amount, kind: 'bonus', cat: null });
      Object.assign(log, { kind: 'bonus', amount, cat: null });
      result = { kind: 'points', amount, cat: null };
      break;
    }
    case 'rimbalzo': {
      const idx = dice.freeIndexes();
      const before = idx.map((i) => dice.values[i]);
      idx.forEach((i) => dice.setValue(i, game.freshDie(i)));
      result = { kind: 'reroll', dice: idx, before, after: idx.map((i) => dice.values[i]) };
      break;
    }
    case 'antidoto': {
      const cleared = [];
      for (const k of ['curse', 'sabotage', 'halve', 'trap', 'chains', 'lessRolls']) {
        if (me.status[k]) {
          me.status[k] = null;
          cleared.push(k);
        }
      }
      if (game.turnState.chaos) {
        game.turnState.chaos = false;
        cleared.push('chaos');
      }
      if (game.turnState.blocked?.length) game.turnState.blocked = [];
      me.card.addCardPoints({ id: effectId, amount: 5, kind: 'bonus', cat: null });
      Object.assign(log, { kind: 'bonus', amount: 5, cat: null });
      result = { kind: 'status', label: cleared.length ? 'ANTIDOTO: EFFETTI CANCELLATI +5' : 'ANTIDOTO: +5 PUNTI', points: 5 };
      break;
    }
    case 'trappola':
      opp.status.trap = { effectId };
      Object.assign(log, { kind: 'trap', victim: opp.id, fired: false, taken: 0, cat: null });
      result = { kind: 'status', label: `TRAPPOLA PIAZZATA: −12 AL PROSSIMO PUNTEGGIO`, attack: true };
      break;
    case 'investimento':
      me.status.invest = { effectId, amount: 12 };
      result = { kind: 'status', label: 'INVESTIMENTO: +12 AL TUO PROSSIMO TURNO' };
      break;
    case 'specchioRiflesso':
      me.status.mirror = { effectId };
      Object.assign(log, { kind: 'mirror', owner: me.id });
      result = { kind: 'status', label: 'SPECCHIO RIFLESSO PRONTO' };
      break;
    case 'combo':
      me.card.addCardPoints({ id: effectId, amount: 8, kind: 'bonus', cat: null });
      game.pendingDraws++;
      Object.assign(log, { kind: 'bonus', amount: 8, cat: null });
      result = { kind: 'points', amount: 8, cat: null, draw: true };
      break;
    case 'terremoto': {
      const parts = [];
      let taken = 0;
      let mirrored = false;
      if (opp.status.mirror) {
        guard(opp, null, effectId);
        mirrored = true;
      } else {
        for (const cat of stealableBoxes(game, me)) {
          const blocked = opp.card.consumeShield(cat);
          const t = blocked ? 0 : opp.card.applyDebit(cat, 4);
          taken += t;
          parts.push({ cat, taken: t, blocked });
        }
      }
      Object.assign(log, { kind: 'tax', victim: opp.id, parts, taken });
      result = { kind: 'quake', victim: opp.id, taken, mirrored };
      break;
    }
    case 'jackpot': {
      if (!game.turnState.bonuses) game.turnState.bonuses = [];
      game.turnState.bonuses.push({ kind: 'jackpot', effectId, cardId: entry.id });
      Object.assign(log, { kind: 'bonus', amount: 0, cat: null });
      result = { kind: 'bonusSet', bonus: 'jackpot' };
      break;
    }
    case 'catene':
      if (opp.status.mirror) {
        guard(opp, null, effectId);
        result = { kind: 'status', label: 'RIFLESSO DALLO SPECCHIO!', attack: true };
        break;
      }
      opp.status.chains = { effectId };
      Object.assign(log, { kind: 'chains', victim: opp.id });
      result = { kind: 'status', label: "CATENE: L'AVVERSARIO NON POTRÀ CONSERVARE DADI", attack: true };
      break;
    case 'contrattacco':
      me.status.counter = { effectId };
      result = { kind: 'status', label: 'CONTRATTACCO PRONTO' };
      break;
    case 'tempestaPerfetta': {
      const pc = opp.status.curse ? null : placeCurse(me, opp, { type: 'chaos', effectId, cardId: entry.id });
      if (!pc?.reflected) {
        if (!opp.status.lessRolls) opp.status.lessRolls = { effectId };
        if (!opp.status.halve) opp.status.halve = { effectId };
        if (!opp.status.chains) opp.status.chains = { effectId };
      }
      Object.assign(log, { kind: 'storm', victim: opp.id, fired: false, taken: 0, cat: null });
      result = { kind: 'status', label: pc?.reflected ? 'LA TEMPESTA RIMBALZA SULLO SPECCHIO!' : "TEMPESTA PERFETTA SULL'AVVERSARIO!", attack: true };
      break;
    }
    case 'dominioAssoluto': {
      me.status.yatzyTurns = 4; // questo turno + i prossimi 4
      game.turnState.yatzyAll = true;
      if (dice.hasRolled) game.makeYatzy();
      result = { kind: 'dominion', turns: 5 };
      break;
    }
    case 'rewindTemporale': {
      const t = findRewindTarget(game, me);
      if (!t) throw new GameError('Nessun effetto da annullare');
      const undone = undoEffect(game, t);
      game.pendingDraws++; // e in più una carta nuova
      result = { kind: 'rewind', undone, draw: true };
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
    case 'prison':
      return victim.hand.some((c) => (e.uids || [e.uid]).includes(c.uid) && c.lockedBy === e.id && isLocked(game, c));
    case 'tax':
      return e.taken > 0 || e.parts.some((p) => p.blocked);
    case 'crown':
    case 'bonus':
      return e.amount > 0 && owner.card.cardPoints.some((p) => p.id === e.id);
    case 'sabotage':
      return !e.blocked && victim.status.sabotage?.effectId === e.id;
    case 'cardSteal':
      return owner.hand.some((c) => c.uid === e.uid);
    case 'halve':
      return e.fired ? e.taken > 0 || e.blocked : victim.status.halve?.effectId === e.id;
    case 'lessRolls':
      return victim.status.lessRolls?.effectId === e.id;
    case 'trap':
      return e.fired ? e.taken > 0 : victim.status.trap?.effectId === e.id;
    case 'chains':
      return victim.status.chains?.effectId === e.id;
    case 'storm':
      return ['curse', 'lessRolls', 'halve'].some((k) => victim.status[k]?.effectId === e.id);
    case 'blackhole':
      return e.swallowed.length > 0 || (e.curse && victim.status.curse?.effectId === e.id);
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
      for (const c of victim.hand) {
        if ((e.uids || [e.uid]).includes(c.uid) && c.lockedBy === e.id) {
          c.lockedTurn = null;
          c.lockedBy = null;
        }
      }
      info.uid = e.uid;
      break;
    }
    case 'tax':
      for (const p of e.parts) {
        if (p.blocked) {
          if (victim.card.canShield(p.cat)) victim.card.addShield(p.cat);
        } else if (p.taken) victim.card.removeDebit(p.cat, p.taken);
      }
      owner.card.removeCardPoints(e.id);
      Object.assign(info, { kind: 'steal', cat: e.parts[0]?.cat, amount: e.taken, victim: victim.id });
      break;
    case 'crown':
    case 'bonus':
      owner.card.removeCardPoints(e.id);
      Object.assign(info, { amount: e.amount, cat: e.cat });
      break;
    case 'sabotage':
      victim.status.sabotage = null;
      info.cat = e.cat;
      break;
    case 'cardSteal': {
      const k = owner.hand.findIndex((c) => c.uid === e.uid);
      if (k >= 0) victim.hand.push(...owner.hand.splice(k, 1));
      info.uid = e.uid;
      break;
    }
    case 'halve':
      if (!e.fired) victim.status.halve = null;
      else if (e.blocked) {
        if (victim.card.canShield(e.cat)) victim.card.addShield(e.cat);
      } else victim.card.removeDebit(e.cat, e.taken);
      Object.assign(info, { cat: e.cat, amount: e.taken });
      break;
    case 'lessRolls':
      victim.status.lessRolls = null;
      break;
    case 'trap':
      if (!e.fired) victim.status.trap = null;
      else victim.card.removeDebit(e.cat, e.taken);
      Object.assign(info, { cat: e.cat, amount: e.taken });
      break;
    case 'chains':
      victim.status.chains = null;
      break;
    case 'storm':
      for (const k of ['curse', 'lessRolls', 'halve']) if (victim.status[k]?.effectId === e.id) victim.status[k] = null;
      break;
    case 'blackhole':
      victim.hand.push(...e.swallowed.map((c) => ({ ...c, lockedTurn: null, lockedBy: null })));
      if (e.curse && victim.status.curse?.effectId === e.id) victim.status.curse = null;
      info.cards = e.swallowed.length;
      e.swallowed = [];
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

/**
 * Parametri validi "automatici" per una carta (bot, test, giocate di prova):
 * stessa scelta su tutti i telefoni perché dipende solo dallo stato.
 */
export function autoParams(game, entry) {
  const def = CARDS[entry.id];
  const t = def.target;
  const me = game.current;
  const dice = game.dice;
  const params = {};
  if (!t) return params;
  if (t.kind === 'dice') {
    if (entry.id === 'dadoGemello') {
      // il dado col valore più frequente viene copiato sul primo dado diverso
      const counts = [0, 0, 0, 0, 0, 0, 0];
      dice.values.forEach((v) => counts[v]++);
      const best = dice.values.reduce((b, v, i) => (counts[v] > counts[dice.values[b]] || (counts[v] === counts[dice.values[b]] && v > dice.values[b]) ? i : b), 0);
      const target = dice.values.findIndex((v) => v !== dice.values[best]);
      params.dice = [target, best];
    } else if (entry.id === 'riscritturaDestino') {
      // il dado che non segue il numero più presente diventa quel numero
      const counts = [0, 0, 0, 0, 0, 0, 0];
      dice.values.forEach((v) => counts[v]++);
      let best = 6;
      for (let v = 6; v >= 1; v--) if (counts[v] > counts[best]) best = v;
      const i = dice.values.findIndex((v) => v !== best);
      params.dice = [i < 0 ? 0 : i];
      params.value = i < 0 ? (best % 6) + 1 : best;
      return params;
    } else if (entry.id === 'calamita') {
      const counts = [0, 0, 0, 0, 0, 0, 0];
      dice.values.forEach((v) => counts[v]++);
      params.dice = [dice.values.reduce((b, v, i) => (counts[v] > counts[dice.values[b]] ? i : b), 0)];
    } else {
      params.dice = [0, 1, 2, 3, 4].filter((i) => !t.foresight || game.turnState.foresight[i] === undefined).slice(0, t.max === 2 ? 2 : 1);
    }
    if (def.choice === 'plusMinus') params.delta = dice.values[params.dice[0]] > 1 ? -1 : 1;
    if (def.choice === 'face') params.value = (dice.values[params.dice[0]] % 6) + 1;
  } else if (t.kind === 'allDice') params.values = [6, 6, 6, 6, 6];
  else if (t.kind === 'ownBoxes') params.cats = shieldableBoxes(me).slice(0, t.count);
  else if (t.kind === 'oppBox') params.cat = [...stealableBoxes(game, me)].sort((a, b) => game.other(me).card.value(b) - game.other(me).card.value(a))[0];
  else if (t.kind === 'oppCard') params.uid = game.opponent.hand.find((x) => t.any || !isLocked(game, x))?.uid;
  else if (t.kind === 'box') {
    const opp = game.other(me);
    const list = boxTargets(game, me, entry.id);
    params.cat = entry.id === 'scambioSorte' ? [...list].sort((a, b) => opp.card.value(b) - me.card.value(b) - (opp.card.value(a) - me.card.value(a)))[0] : list[0];
  }
  return params;
}
