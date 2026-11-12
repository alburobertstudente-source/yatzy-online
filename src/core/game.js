/**
 * Motore di gioco: unisce dadi, probabilità, punteggi, turni e carte.
 * Nessuna dipendenza dal DOM: l'interfaccia chiama i metodi e anima i risultati.
 *
 * Flusso di un turno:
 *   1. il giocatore gratta una carta (drawCard) — obbligatorio;
 *      se ha più di HAND_MAX carte ne scarta una (discardCard)
 *   2. lancia fino a 3 volte (roll), tiene dadi (toggleHold), può usare carte (useCard)
 *   3. sceglie una casella (select) e conferma (confirm)
 *   4. endTurn passa all'avversario
 */
import { PLAYERS, RULES, CARD_RULES } from '../config.js';
import { DiceSet, ROLL_CAP } from './dice.js';
import { Scorecard } from './scorecard.js';
import { TurnManager, TOTAL_ROUNDS } from './turns.js';
import { FairRoller, createCryptoRandom, rollDie } from './probability.js';
import { scoreCategory, contributingDice, isYatzy, notableCombo, CATEGORY_INFO } from './scoring.js';
import { CARDS, drawCardId } from './cards.js';
import { cardAvailability, applyCard, isLocked } from './powers.js';
import { GameError } from './errors.js';
import { detectMeme } from './memes.js';

export { GameError };

const newStatus = () => ({ curse: null, noHoldDie: null, sabotage: null, halve: null, lessRolls: null, blessTurns: 0 });
const newTurnState = () => ({ foresight: {}, crown: null, noHold: [], frozen: [], blocked: [], bonuses: [], blessed: false, blessAll: false, cardNotes: null });

export class Game {
  /**
   * @param {object} [opts]
   * @param {{roll: (ctx) => {values:number[]}, die?: () => number}} [opts.roller] dadi (equi)
   * @param {() => number} [opts.rng] generatore per la pescata delle carte e i dadi delle carte
   * @param {{id:string,name:string}[]} [opts.players]
   */
  constructor({ roller, rng, players = PLAYERS, cards = true, hooks = null } = {}) {
    this.rng = rng ?? roller?.rng ?? createCryptoRandom();
    this.roller = roller ?? new FairRoller({ rng: this.rng });
    this.players = players.map((p) => ({ ...p, card: new Scorecard(), hand: [], status: newStatus() }));
    this.turns = new TurnManager(this.players.length);
    this.dice = new DiceSet();
    /** @type {string|null} categoria selezionata (non ancora confermata) */
    this.selected = null;
    /** @type {'playing'|'over'} */
    this.phase = 'playing';
    /** true dopo aver segnato: il turno può solo terminare */
    this.scoredThisTurn = false;
    /** carte da grattare prima di poter giocare */
    this.pendingDraws = 1;
    /** true se la mano supera HAND_MAX e bisogna scartare */
    this.pendingDiscard = false;
    this.turnState = newTurnState();
    /** registro degli effetti delle carte (per Rewind Temporale) */
    this.effectLog = [];
    this.nextUid = 1;
    this.nextEffectId = 1;
    /** carte forzate (solo per test/debug) */
    this.forcedCards = [];
    this.listeners = new Map();
    /** false = partita senza carte (sfide della campagna) */
    this.cardsEnabled = cards;
    if (!cards) this.pendingDraws = 0;
    /**
     * Regole speciali (boss della campagna): turnStart(game), afterRoll(game, res),
     * afterScore(game, res). Possono cambiare i dadi o i punti e lasciano una nota
     * in `res.boss` / `game.turnState.boss` per l'interfaccia.
     */
    this.hooks = hooks;
    this.hooks?.turnStart?.(this);
  }

  /* ---------------- eventi ---------------- */
  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  emit(type, payload) {
    this.listeners.get(type)?.forEach((fn) => fn(payload));
  }

  /* ---------------- stato ---------------- */
  get current() {
    return this.players[this.turns.currentIndex];
  }

  get opponent() {
    return this.players[(this.turns.currentIndex + 1) % this.players.length];
  }

  other(player) {
    return this.players.find((p) => p.id !== player.id);
  }

  get round() {
    return Math.min(this.turns.round, TOTAL_ROUNDS);
  }

  get turnId() {
    return this.turns.turnId;
  }

  player(id) {
    return this.players.find((p) => p.id === id);
  }

  /** Lo Yatzy attuale è "aggiuntivo" (jolly)? */
  jokerActive() {
    return RULES.JOKER_RULE && this.dice.hasRolled && isYatzy(this.dice.values) && this.current.card.scores.yatzy !== null;
  }

  get mustDraw() {
    return this.phase === 'playing' && !this.scoredThisTurn && (this.pendingDraws > 0 || this.pendingDiscard);
  }

  canRoll() {
    return this.phase === 'playing' && !this.scoredThisTurn && !this.mustDraw && this.dice.canRoll();
  }

  canSelect(categoryId) {
    return this.phase === 'playing' && !this.scoredThisTurn && !this.mustDraw && this.dice.hasRolled && this.current.card.isOpen(categoryId) && !this.isBlocked(categoryId);
  }

  /** Casella maledetta per questo turno (boss): non si può usare, a meno che sia l'ultima libera. */
  isBlocked(categoryId) {
    const b = this.turnState.blocked;
    if (!b?.length || !b.includes(categoryId)) return false;
    return this.current.card.openCategories().some((c) => !b.includes(c));
  }

  /** Il dado i si può tenere adesso? */
  canHold(i) {
    return this.dice.hasRolled && this.dice.rollsLeft > 0 && this.current.status.noHoldDie !== i && !this.turnState.noHold?.includes(i) && !this.turnState.frozen?.includes(i);
  }

  previewScore(categoryId) {
    if (!this.dice.hasRolled) return null;
    return scoreCategory(categoryId, this.dice.values, { joker: this.jokerActive() });
  }

  /** Dado equo usato dalle carte. */
  randomDie() {
    return this.roller.die ? this.roller.die() : rollDie(this.rng);
  }

  /** Nuovo valore per il dado i: usa la visione dell'Occhio del Destino se presente. */
  freshDie(i) {
    const f = this.turnState.foresight[i];
    if (f !== undefined) {
      delete this.turnState.foresight[i];
      return f;
    }
    return this.randomDie();
  }

  /* ---------------- carte ---------------- */
  /** Gratta la carta del turno (o una extra di Mano Veloce). */
  drawCard() {
    this.#assertTurnOpen();
    if (this.pendingDraws <= 0) throw new GameError('Nessuna carta da grattare');
    if (this.pendingDiscard) throw new GameError('Prima scarta una carta');
    const me = this.current;
    const forced = this.forcedCards.shift();
    const id = forced && CARDS[forced] ? forced : drawCardId(this.rng);
    const entry = { uid: this.nextUid++, id, lockedTurn: null, lockedBy: null };
    me.hand.push(entry);
    this.pendingDraws--;
    if (me.hand.length > CARD_RULES.HAND_MAX) this.pendingDiscard = true;
    const result = { playerId: me.id, card: { ...entry }, handFull: this.pendingDiscard };
    this.emit('draw', result);
    return result;
  }

  /** Scarta una carta quando la mano è troppo piena. */
  discardCard(uid) {
    this.#assertTurnOpen();
    if (!this.pendingDiscard) throw new GameError('Non devi scartare');
    const me = this.current;
    const k = me.hand.findIndex((c) => c.uid === uid);
    if (k < 0) throw new GameError('Carta non trovata');
    const [removed] = me.hand.splice(k, 1);
    this.pendingDiscard = me.hand.length > CARD_RULES.HAND_MAX;
    return removed;
  }

  isCardLocked(entry) {
    return isLocked(this, entry);
  }

  /** Si può usare questa carta della mano del giocatore di turno? */
  cardAvailability(uid) {
    const entry = this.current.hand.find((c) => c.uid === uid);
    if (!entry) return { ok: false, reason: 'Carta non trovata' };
    return cardAvailability(this, entry);
  }

  /**
   * Usa una carta della mano del giocatore di turno.
   * @param {number} uid
   * @param {object} [params] bersagli/scelte (dipendono dalla carta)
   */
  useCard(uid, params = {}) {
    this.#assertTurnOpen();
    const me = this.current;
    const entry = me.hand.find((c) => c.uid === uid);
    if (!entry) throw new GameError('Carta non trovata');
    const av = cardAvailability(this, entry);
    if (!av.ok) throw new GameError(av.reason);
    const effectId = this.nextEffectId++;
    const { result, log } = applyCard(this, me, entry, params, effectId);
    me.hand = me.hand.filter((c) => c.uid !== uid);
    this.effectLog.push(log);
    if (this.effectLog.length > 60) this.effectLog.splice(0, this.effectLog.length - 60);
    const out = {
      playerId: me.id,
      cardId: entry.id,
      uid,
      effectId,
      ...result,
      values: [...this.dice.values],
      totals: Object.fromEntries(this.players.map((p) => [p.id, p.card.total()])),
    };
    this.emit('card', out);
    return out;
  }

  /* ---------------- azioni ---------------- */
  roll() {
    this.#assertTurnOpen();
    if (this.mustDraw) throw new GameError('Prima gratta la carta');
    if (!this.dice.canRoll()) throw new GameError('Nessun lancio disponibile');
    const me = this.current;
    me.status.noHoldDie = null; // il divieto vale solo fino a questo lancio
    const rollIndex = this.dice.rollsUsed;
    const outcome = this.roller.roll({
      playerId: me.id,
      values: this.dice.values,
      held: this.dice.held,
      hasRolled: this.dice.hasRolled,
      rollIndex,
      round: this.round,
      turnId: this.turnId,
    });
    const values = [...outcome.values];
    const free = this.dice.freeIndexes();
    for (const i of free) {
      const f = this.turnState.foresight[i];
      if (f !== undefined) {
        values[i] = f;
        delete this.turnState.foresight[i];
      }
    }
    const rolled = this.dice.applyRoll(values);
    // Lancio Benedetto / Benedizione Eterna: gli 1 e i 2 appena lanciati si rilanciano da soli
    let blessed = null;
    if (this.turnState.blessed || this.turnState.blessAll) {
      this.turnState.blessed = false;
      const idx = rolled.filter((i) => this.dice.values[i] <= 2);
      const before = idx.map((i) => this.dice.values[i]);
      for (const i of idx) this.dice.setValue(i, this.randomDie());
      blessed = { dice: idx, before, after: idx.map((i) => this.dice.values[i]) };
    }
    const rolledValues = [...this.dice.values];

    // maledizioni dell'avversario: scattano a questo lancio
    let curse = null;
    if (me.status.curse) {
      const c = me.status.curse;
      me.status.curse = null;
      let idx = rolled.filter((i) => !this.dice.held[i]);
      let frozen = null;
      if (c.type === 'chaos') {
        idx = shuffle(idx, this.rng).slice(0, 2).sort((a, b) => a - b);
      } else if (c.type === 'apocalypse') {
        // l'Apocalisse travolge anche i dadi conservati
        idx = [0, 1, 2, 3, 4];
        idx.forEach((i) => this.dice.release(i));
      } else if (c.type === 'freeze') {
        frozen = shuffle(idx.length ? idx : [0, 1, 2, 3, 4], this.rng).slice(0, 2).sort((a, b) => a - b);
        frozen.forEach((i) => this.dice.release(i));
        this.turnState.frozen = [...(this.turnState.frozen || []), ...frozen];
        idx = [];
      }
      const before = idx.map((i) => this.dice.values[i]);
      for (const i of idx) this.dice.setValue(i, this.randomDie());
      let noHold = null;
      if (c.type === 'apocalypse' && this.dice.rollsLeft > 0) {
        noHold = Math.floor(this.rng() * RULES.DICE_COUNT);
        me.status.noHoldDie = noHold;
        this.dice.release(noHold);
      }
      curse = { type: c.type, cardId: c.cardId, dice: idx, before, after: idx.map((i) => this.dice.values[i]), noHoldDie: noHold, frozen };
    }

    this.selected = null;
    const boss = this.hooks?.afterRoll?.(this, { rolled, rollIndex, rolledValues }) || null;
    const result = {
      boss,
      playerId: me.id,
      rolledValues,
      values: [...this.dice.values],
      rolled,
      rollIndex,
      rollsLeft: this.dice.rollsLeft,
      combo: notableCombo(this.dice.values),
      yatzyBonusReady: me.card.qualifiesForYatzyBonus(this.dice.values),
      curse,
      blessed,
    };
    this.emit('roll', result);
    return result;
  }

  toggleHold(i) {
    this.#assertTurnOpen();
    if (!this.dice.hasRolled) throw new GameError('Lancia prima i dadi');
    if (this.dice.rollsLeft <= 0) throw new GameError('Nessun rilancio disponibile');
    if (!this.dice.held[i] && (this.current.status.noHoldDie === i || this.turnState.noHold?.includes(i))) throw new GameError('Questo dado non può essere conservato');
    if (this.turnState.frozen?.includes(i)) throw new GameError('Questo dado è congelato');
    const held = this.dice.toggleHold(i);
    this.emit('hold', { index: i, held });
    return held;
  }

  select(categoryId) {
    this.#assertTurnOpen();
    if (!this.dice.hasRolled) throw new GameError('Lancia prima i dadi');
    if (!this.current.card.isOpen(categoryId)) throw new GameError('Categoria già usata');
    if (this.isBlocked(categoryId)) throw new GameError('Casella maledetta in questo turno');
    this.selected = categoryId;
    const score = this.previewScore(categoryId);
    this.emit('select', { categoryId, score });
    return { categoryId, score };
  }

  clearSelection() {
    this.selected = null;
    this.emit('select', { categoryId: null, score: null });
  }

  /** Conferma la categoria selezionata e chiude il turno del giocatore. */
  confirm() {
    this.#assertTurnOpen();
    const id = this.selected;
    if (!id) throw new GameError('Nessuna categoria selezionata');
    const me = this.current;
    const card = me.card;
    const dice = [...this.dice.values];
    const prevTotal = card.total();
    const hadUpperBonus = card.hasUpperBonus();

    // bonus Yatzy: va calcolato PRIMA di segnare (la casella Yatzy è già piena)
    const qualifiesBonus = card.qualifiesForYatzyBonus(dice);
    const score = scoreCategory(id, dice, { joker: this.jokerActive() });
    card.record(id, score);
    const yatzyBonus = qualifiesBonus ? card.addYatzyBonus(this.turnId) : false;

    // Corona del Destino: punteggio raddoppiato (max CROWN_CAP extra)
    let crownExtra = 0;
    if (this.turnState.crown) {
      crownExtra = Math.min(score, CARD_RULES.CROWN_CAP);
      const log = this.effectLog.find((e) => e.id === this.turnState.crown);
      if (crownExtra > 0) card.addCardPoints({ id: this.turnState.crown, amount: crownExtra, kind: 'crown', cat: id });
      if (log) Object.assign(log, { amount: crownExtra, cat: id });
    }

    // carte bonus del turno (Spicciolo Fortunato, Moltiplicatore, Rete di Salvataggio)
    let cardExtra = 0;
    const extras = [];
    for (const b of this.turnState.bonuses || []) {
      const def = CARDS[b.cardId]?.bonus;
      if (!def) continue;
      let amount = 0;
      if (def.kind === 'plus') amount = score > 0 ? def.amount : 0;
      else if (def.kind === 'mult') amount = Math.min(Math.floor(score / 2), def.cap);
      else if (def.kind === 'net') amount = score === 0 ? def.amount : 0;
      if (amount > 0) {
        card.addCardPoints({ id: b.effectId, amount, kind: 'bonus', cat: id });
        cardExtra += amount;
        extras.push({ cardId: b.cardId, amount });
      }
      const log = this.effectLog.find((e) => e.id === b.effectId);
      if (log) Object.assign(log, { amount, cat: id });
    }

    // Mezza Luna dell'avversario: il punteggio segnato si dimezza (lo scudo la ferma)
    let halved = null;
    if (me.status.halve) {
      const hv = me.status.halve;
      me.status.halve = null;
      const blocked = card.consumeShield(id);
      const taken = blocked ? 0 : card.applyDebit(id, Math.floor((card.value(id) ?? 0) / 2));
      halved = { cat: id, taken, blocked };
      const log = this.effectLog.find((e) => e.id === hv.effectId);
      if (log) Object.assign(log, { fired: true, cat: id, taken, blocked });
    }

    const result = {
      playerId: me.id,
      turnId: this.turnId,
      category: id,
      section: CATEGORY_INFO[id].section,
      score,
      dice,
      contributing: contributingDice(id, dice, score),
      upperTotal: card.upperTotal(),
      upperBonusEarned: !hadUpperBonus && card.hasUpperBonus(),
      yatzyBonus,
      yatzyBonusCount: card.yatzyBonusCount(),
      crownExtra,
      cardExtra,
      extras,
      halved,
      meme: detectMeme({ category: id, score, dice, fullHouseOpen: card.scores.fullHouse === null }),
      prevTotal,
      total: card.total(),
    };
    result.boss = this.hooks?.afterScore?.(this, result) || null;
    if (result.boss) result.total = card.total();
    this.selected = null;
    this.scoredThisTurn = true;
    this.emit('score', result);
    return result;
  }

  /** Passa al turno successivo (o termina la partita). */
  endTurn() {
    this.#assertPlaying();
    if (!this.scoredThisTurn) throw new GameError('Segna un punteggio prima di passare il turno');
    this.current.status.noHoldDie = null;
    this.dice.reset();
    this.selected = null;
    this.scoredThisTurn = false;
    this.turnState = newTurnState();
    const step = this.turns.advance();
    if (step.over || this.players.every((p) => p.card.isComplete())) {
      this.phase = 'over';
      this.pendingDraws = 0;
      this.pendingDiscard = false;
      const res = this.results();
      this.emit('gameover', res);
      return { over: true, ...res };
    }
    this.pendingDraws = this.cardsEnabled ? 1 : 0;
    this.pendingDiscard = false;
    this.hooks?.turnStart?.(this);
    this.#turnStartCards();
    const info = { over: false, playerId: this.current.id, round: this.round, turnId: this.turnId };
    this.emit('turn', info);
    return info;
  }

  /** Effetti delle carte che scattano all'inizio del turno del giocatore. */
  #turnStartCards() {
    const me = this.current;
    const notes = {};
    if (me.status.sabotage) {
      const { cat } = me.status.sabotage;
      me.status.sabotage = null;
      this.turnState.blocked = [...(this.turnState.blocked || []), cat];
      notes.sabotage = cat;
    }
    if (me.status.lessRolls) {
      me.status.lessRolls = null;
      notes.lessRolls = this.dice.removeRoll();
    }
    if (me.status.blessTurns > 0) {
      me.status.blessTurns--;
      this.turnState.blessAll = true;
      if (this.dice.maxRolls < ROLL_CAP) this.dice.addRoll();
      notes.bless = me.status.blessTurns + 1;
    }
    this.turnState.cardNotes = Object.keys(notes).length ? notes : null;
  }

  results() {
    const totals = Object.fromEntries(this.players.map((p) => [p.id, p.card.total()]));
    const [a, b] = this.players;
    let winner = null;
    if (totals[a.id] > totals[b.id]) winner = a.id;
    else if (totals[b.id] > totals[a.id]) winner = b.id;
    return {
      winner,
      totals,
      breakdown: Object.fromEntries(this.players.map((p) => [p.id, p.card.breakdown()])),
    };
  }

  #assertPlaying() {
    if (this.phase !== 'playing') throw new GameError('La partita è terminata');
  }

  #assertTurnOpen() {
    this.#assertPlaying();
    if (this.scoredThisTurn) throw new GameError('Hai già segnato in questo turno');
  }

  /* ---------------- salvataggio ---------------- */
  toJSON() {
    return {
      v: 2,
      players: this.players.map((p) => ({ id: p.id, card: p.card.toJSON(), hand: p.hand.map((c) => ({ ...c })), status: JSON.parse(JSON.stringify(p.status)) })),
      turns: this.turns.toJSON(),
      dice: this.dice.toJSON(),
      selected: this.selected,
      scoredThisTurn: this.scoredThisTurn,
      phase: this.phase,
      pendingDraws: this.pendingDraws,
      pendingDiscard: this.pendingDiscard,
      turnState: {
        foresight: { ...this.turnState.foresight },
        crown: this.turnState.crown,
        bonuses: (this.turnState.bonuses || []).map((b) => ({ ...b })),
        blessed: Boolean(this.turnState.blessed),
        blessAll: Boolean(this.turnState.blessAll),
        frozen: [...(this.turnState.frozen || [])],
        blocked: [...(this.turnState.blocked || [])],
      },
      effectLog: this.effectLog.map((e) => ({ ...e, cats: e.cats ? [...e.cats] : undefined, swallowed: e.swallowed ? e.swallowed.map((c) => ({ ...c })) : undefined })),
      nextUid: this.nextUid,
      nextEffectId: this.nextEffectId,
      rngState: typeof this.rng.getState === 'function' ? this.rng.getState() : undefined,
    };
  }

  /** Impronta dello stato (per verificare che due telefoni siano allineati). */
  stateHash() {
    const str = stableStringify(this.toJSON());
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  static fromJSON(data, { roller, rng, players = PLAYERS } = {}) {
    if (!data || data.v !== 2) throw new GameError('Salvataggio non valido');
    const g = new Game({ roller, rng, players });
    for (const p of g.players) {
      const saved = data.players?.find((x) => x.id === p.id);
      if (!saved) continue;
      p.card = Scorecard.fromJSON(saved.card);
      p.hand = Array.isArray(saved.hand) ? saved.hand.filter((c) => c && CARDS[c.id]).map((c) => ({ lockedTurn: null, lockedBy: null, ...c })) : [];
      p.status = { ...newStatus(), ...(saved.status || {}) };
    }
    g.turns = TurnManager.fromJSON(data.turns, g.players.length);
    g.dice = DiceSet.fromJSON(data.dice);
    g.selected = data.selected && g.current.card.scores[data.selected] === null && g.dice.hasRolled ? data.selected : null;
    g.phase = data.phase === 'over' ? 'over' : 'playing';
    g.scoredThisTurn = Boolean(data.scoredThisTurn);
    g.pendingDraws = Number.isInteger(data.pendingDraws) ? Math.max(0, data.pendingDraws) : 0;
    g.pendingDiscard = Boolean(data.pendingDiscard);
    const ts = data.turnState || {};
    g.turnState = {
      ...newTurnState(),
      foresight: { ...(ts.foresight || {}) },
      crown: ts.crown ?? null,
      bonuses: Array.isArray(ts.bonuses) ? ts.bonuses.map((b) => ({ ...b })) : [],
      blessed: Boolean(ts.blessed),
      blessAll: Boolean(ts.blessAll),
      frozen: Array.isArray(ts.frozen) ? [...ts.frozen] : [],
      blocked: Array.isArray(ts.blocked) ? [...ts.blocked] : [],
    };
    g.effectLog = Array.isArray(data.effectLog) ? data.effectLog.map((e) => ({ ...e })) : [];
    const maxUid = Math.max(0, ...g.players.flatMap((p) => p.hand.map((c) => c.uid)));
    g.nextUid = Math.max(Number(data.nextUid) || 1, maxUid + 1);
    const maxEff = Math.max(0, ...g.effectLog.map((e) => e.id));
    g.nextEffectId = Math.max(Number(data.nextEffectId) || 1, maxEff + 1);
    if (data.rngState !== undefined && typeof g.rng.setState === 'function') g.rng.setState(data.rngState);
    return g;
  }
}

/** JSON con le chiavi ordinate: stessa stringa per lo stesso stato. */
function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
