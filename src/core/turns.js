/**
 * Gestione dei turni: ordine dei giocatori, round, fine partita.
 * 13 round; in ogni round giocano entrambi (inizia il rosso).
 */
import { ALL_CATEGORIES } from './scoring.js';

export const TOTAL_ROUNDS = ALL_CATEGORIES.length;

export class TurnManager {
  constructor(playerCount = 2) {
    this.playerCount = playerCount;
    this.currentIndex = 0;
    /** Numero progressivo del turno (univoco nella partita, parte da 1). */
    this.turnId = 1;
  }

  get round() {
    return Math.floor((this.turnId - 1) / this.playerCount) + 1;
  }

  get totalTurns() {
    return TOTAL_ROUNDS * this.playerCount;
  }

  isLastTurn() {
    return this.turnId >= this.totalTurns;
  }

  isOver() {
    return this.turnId > this.totalTurns;
  }

  advance() {
    this.turnId++;
    this.currentIndex = (this.currentIndex + 1) % this.playerCount;
    return { index: this.currentIndex, turnId: this.turnId, round: this.round, over: this.isOver() };
  }

  toJSON() {
    return { currentIndex: this.currentIndex, turnId: this.turnId };
  }

  static fromJSON(data, playerCount = 2) {
    const t = new TurnManager(playerCount);
    if (Number.isInteger(data?.turnId) && data.turnId >= 1) t.turnId = data.turnId;
    t.currentIndex = (t.turnId - 1) % playerCount;
    return t;
  }
}
