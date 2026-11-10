/**
 * Stato dei 5 dadi del turno corrente: valori, dadi tenuti, lanci usati.
 * Non genera numeri casuali: riceve i risultati dal sistema delle probabilità.
 * maxRolls parte da 3 e può aumentare con la carta "Doppio Lancio".
 */
import { RULES } from '../config.js';

const MAX_EXTRA_ROLLS = 5;

export class DiceSet {
  constructor() {
    this.reset();
  }

  reset() {
    /** @type {number[]} 0 = dado non ancora lanciato */
    this.values = new Array(RULES.DICE_COUNT).fill(0);
    /** @type {boolean[]} */
    this.held = new Array(RULES.DICE_COUNT).fill(false);
    this.rollsUsed = 0;
    this.maxRolls = RULES.MAX_ROLLS;
  }

  get hasRolled() {
    return this.rollsUsed > 0;
  }

  get rollsLeft() {
    return this.maxRolls - this.rollsUsed;
  }

  canRoll() {
    return this.rollsUsed < this.maxRolls && !this.held.every(Boolean);
  }

  addRoll() {
    if (this.maxRolls >= RULES.MAX_ROLLS + MAX_EXTRA_ROLLS) throw new Error('Troppi lanci extra');
    this.maxRolls++;
  }

  /** Indici dei dadi che verranno rilanciati. */
  freeIndexes() {
    if (!this.hasRolled) return this.values.map((_, i) => i);
    return this.held.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
  }

  toggleHold(i) {
    if (!this.hasRolled) throw new Error('Non puoi tenere i dadi prima del primo lancio');
    if (i < 0 || i >= RULES.DICE_COUNT) throw new Error(`Dado non valido: ${i}`);
    this.held[i] = !this.held[i];
    return this.held[i];
  }

  release(i) {
    this.held[i] = false;
  }

  /** Cambia il valore di un dado (effetti delle carte). Non consuma lanci. */
  setValue(i, v) {
    if (!this.hasRolled) throw new Error('Nessun dado lanciato');
    if (i < 0 || i >= RULES.DICE_COUNT) throw new Error(`Dado non valido: ${i}`);
    if (!Number.isInteger(v) || v < 1 || v > 6) throw new Error(`Valore dado non valido: ${v}`);
    this.values[i] = v;
  }

  /**
   * Applica un lancio. newValues contiene 5 valori: quelli dei dadi tenuti
   * DEVONO coincidere con i valori attuali (i dadi tenuti non si rilanciano).
   */
  applyRoll(newValues) {
    if (!this.canRoll()) throw new Error('Nessun lancio disponibile');
    if (newValues.length !== RULES.DICE_COUNT) throw new Error('Servono 5 valori');
    newValues.forEach((v, i) => {
      if (!Number.isInteger(v) || v < 1 || v > 6) throw new Error(`Valore dado non valido: ${v}`);
      if (this.hasRolled && this.held[i] && v !== this.values[i]) {
        throw new Error('Un dado tenuto non può cambiare valore');
      }
    });
    const rolled = this.freeIndexes();
    this.values = [...newValues];
    this.rollsUsed++;
    return rolled;
  }

  toJSON() {
    return { values: [...this.values], held: [...this.held], rollsUsed: this.rollsUsed, maxRolls: this.maxRolls };
  }

  static fromJSON(data) {
    const d = new DiceSet();
    if (Number.isInteger(data?.maxRolls)) d.maxRolls = Math.max(RULES.MAX_ROLLS, Math.min(RULES.MAX_ROLLS + MAX_EXTRA_ROLLS, data.maxRolls));
    if (Array.isArray(data?.values) && data.values.length === RULES.DICE_COUNT) d.values = data.values.map((v) => (v >= 1 && v <= 6 ? v : 0));
    if (Array.isArray(data?.held) && data.held.length === RULES.DICE_COUNT) d.held = data.held.map(Boolean);
    if (Number.isInteger(data?.rollsUsed)) d.rollsUsed = Math.max(0, Math.min(d.maxRolls, data.rollsUsed));
    if (!d.hasRolled) d.held.fill(false);
    return d;
  }
}
