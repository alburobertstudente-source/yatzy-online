/**
 * Tabella punteggi di un singolo giocatore.
 *
 * - scores:   punteggio registrato in ogni casella (originale).
 * - debits:   punti rubati da una casella con le carte (Furto / Saccheggio).
 *             Il valore effettivo della casella è scores − debits.
 * - shields:  cariche di scudo per casella (bloccano un attacco ciascuna).
 * - cardPoints: punti ottenuti con le carte (refurtiva, Corona del Destino).
 * - yatzyBonusTurns: bonus +100 per ogni Yatzy aggiuntivo, gestito
 *             SEPARATAMENTE e idempotente per turno.
 * Il bonus +35, una volta ottenuto, non si perde anche se poi vengono rubati punti.
 */
import { RULES, CARD_RULES } from '../config.js';
import { ALL_CATEGORIES, UPPER, LOWER, isYatzy } from './scoring.js';

export class Scorecard {
  constructor() {
    /** @type {Record<string, number|null>} */
    this.scores = Object.fromEntries(ALL_CATEGORIES.map((id) => [id, null]));
    /** @type {Record<string, number>} */
    this.debits = {};
    /** @type {Record<string, number>} */
    this.shields = {};
    /** @type {{id:number, amount:number, kind:string, cat?:string}[]} */
    this.cardPoints = [];
    this.upperBonusLocked = false;
    /** @type {number[]} id dei turni in cui è stato assegnato un bonus Yatzy */
    this.yatzyBonusTurns = [];
  }

  isOpen(id) {
    if (!(id in this.scores)) throw new Error(`Categoria sconosciuta: ${id}`);
    return this.scores[id] === null;
  }

  openCategories() {
    return ALL_CATEGORIES.filter((id) => this.scores[id] === null);
  }

  filledCount() {
    return ALL_CATEGORIES.length - this.openCategories().length;
  }

  isComplete() {
    return this.openCategories().length === 0;
  }

  /** Valore attuale di una casella (dopo eventuali furti), null se vuota. */
  value(id) {
    const s = this.scores[id];
    return s === null ? null : Math.max(0, s - (this.debits[id] || 0));
  }

  /** Segna un punteggio. Ogni categoria si può usare una sola volta. */
  record(id, value) {
    if (!this.isOpen(id)) throw new Error(`Categoria già usata: ${id}`);
    if (!Number.isInteger(value) || value < 0) throw new Error(`Punteggio non valido: ${value}`);
    this.scores[id] = value;
    if (this.upperTotal() >= RULES.UPPER_BONUS_THRESHOLD) this.upperBonusLocked = true;
  }

  upperTotal() {
    return UPPER.reduce((s, id) => s + (this.value(id) ?? 0), 0);
  }

  hasUpperBonus() {
    return this.upperBonusLocked || this.upperTotal() >= RULES.UPPER_BONUS_THRESHOLD;
  }

  upperBonus() {
    return this.hasUpperBonus() ? RULES.UPPER_BONUS : 0;
  }

  lowerTotal() {
    return LOWER.reduce((s, id) => s + (this.value(id) ?? 0), 0);
  }

  /* ---------------- bonus Yatzy ---------------- */
  /** true se questi dadi darebbero diritto al bonus Yatzy aggiuntivo. */
  qualifiesForYatzyBonus(dice) {
    if (!isYatzy(dice)) return false;
    const y = this.scores.yatzy; // valore originale: un furto non toglie il diritto al bonus
    if (y === null) return false; // il primo Yatzy va nella sua casella
    return RULES.YATZY_BONUS_REQUIRES_50 ? y === RULES.YATZY : true;
  }

  /**
   * Assegna il bonus Yatzy per il turno indicato. Idempotente: restituisce
   * false (e non somma nulla) se per quel turno è già stato assegnato.
   */
  addYatzyBonus(turnId) {
    if (this.yatzyBonusTurns.includes(turnId)) return false;
    this.yatzyBonusTurns.push(turnId);
    return true;
  }

  yatzyBonusCount() {
    return this.yatzyBonusTurns.length;
  }

  yatzyBonusTotal() {
    return this.yatzyBonusCount() * RULES.YATZY_BONUS;
  }

  /* ---------------- carte: furti, scudi, punti ---------------- */
  shieldCount(id) {
    return this.shields[id] || 0;
  }

  canShield(id) {
    return id in this.scores && this.shieldCount(id) < CARD_RULES.MAX_SHIELDS;
  }

  addShield(id) {
    if (!this.canShield(id)) throw new Error(`Casella non proteggibile: ${id}`);
    this.shields[id] = this.shieldCount(id) + 1;
  }

  /** Consuma una carica di scudo; true se la casella era protetta. */
  consumeShield(id) {
    if (!this.shieldCount(id)) return false;
    this.shields[id]--;
    if (!this.shields[id]) delete this.shields[id];
    return true;
  }

  removeShields(id, n) {
    const k = Math.min(n, this.shieldCount(id));
    for (let i = 0; i < k; i++) this.consumeShield(id);
    return k;
  }

  /** Ruba fino a `amount` punti dalla casella. Restituisce i punti tolti. */
  applyDebit(id, amount) {
    const v = this.value(id);
    if (v === null) throw new Error(`Casella vuota: ${id}`);
    const taken = Math.min(amount, v);
    if (taken > 0) this.debits[id] = (this.debits[id] || 0) + taken;
    return taken;
  }

  removeDebit(id, amount) {
    const left = Math.max(0, (this.debits[id] || 0) - amount);
    if (left) this.debits[id] = left;
    else delete this.debits[id];
  }

  debitOf(id) {
    return this.debits[id] || 0;
  }

  addCardPoints(entry) {
    this.cardPoints.push({ ...entry });
  }

  removeCardPoints(effectId) {
    const before = this.cardPoints.length;
    this.cardPoints = this.cardPoints.filter((e) => e.id !== effectId);
    return before !== this.cardPoints.length;
  }

  cardPointsTotal() {
    return this.cardPoints.reduce((s, e) => s + e.amount, 0);
  }

  /** Punti extra della Corona assegnati a una casella (per il distintivo). */
  crownOn(id) {
    return this.cardPoints.filter((e) => e.kind === 'crown' && e.cat === id).reduce((s, e) => s + e.amount, 0);
  }

  stolenTotal() {
    return Object.values(this.debits).reduce((a, b) => a + b, 0);
  }

  /* ---------------- totale ---------------- */
  total() {
    return this.upperTotal() + this.upperBonus() + this.lowerTotal() + this.yatzyBonusTotal() + this.cardPointsTotal();
  }

  breakdown() {
    return {
      upper: this.upperTotal(),
      upperBonus: this.upperBonus(),
      lower: this.lowerTotal(),
      yatzyBonus: this.yatzyBonusTotal(),
      yatzyBonusCount: this.yatzyBonusCount(),
      cards: this.cardPointsTotal(),
      stolen: this.stolenTotal(),
      total: this.total(),
    };
  }

  toJSON() {
    return {
      scores: { ...this.scores },
      debits: { ...this.debits },
      shields: { ...this.shields },
      cardPoints: this.cardPoints.map((e) => ({ ...e })),
      upperBonusLocked: this.upperBonusLocked,
      yatzyBonusTurns: [...this.yatzyBonusTurns],
    };
  }

  static fromJSON(data) {
    const card = new Scorecard();
    for (const id of ALL_CATEGORIES) {
      const v = data?.scores?.[id];
      card.scores[id] = Number.isInteger(v) ? v : null;
      const d = data?.debits?.[id];
      if (Number.isInteger(d) && d > 0) card.debits[id] = d;
      const s = data?.shields?.[id];
      if (Number.isInteger(s) && s > 0) card.shields[id] = Math.min(s, CARD_RULES.MAX_SHIELDS);
    }
    card.cardPoints = Array.isArray(data?.cardPoints)
      ? data.cardPoints.filter((e) => e && Number.isInteger(e.amount)).map((e) => ({ ...e }))
      : [];
    card.upperBonusLocked = Boolean(data?.upperBonusLocked) || card.upperTotal() >= RULES.UPPER_BONUS_THRESHOLD;
    card.yatzyBonusTurns = Array.isArray(data?.yatzyBonusTurns) ? [...new Set(data.yatzyBonusTurns)] : [];
    return card;
  }
}
