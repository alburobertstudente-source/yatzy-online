/**
 * Configurazione centrale del gioco.
 *
 * Tutti i parametri modificabili senza toccare il resto del codice sono qui.
 */

export const PLAYERS = [
  { id: 'red', name: 'Rosso', short: 'ROSSO' },
  { id: 'blue', name: 'Blu', short: 'BLU' },
];

/** Regole di punteggio (valori della tabella originale). */
export const RULES = {
  MAX_ROLLS: 3,
  DICE_COUNT: 5,
  UPPER_BONUS_THRESHOLD: 63,
  UPPER_BONUS: 35,
  FULL_HOUSE: 25,
  SMALL_STRAIGHT: 30,
  LARGE_STRAIGHT: 40,
  YATZY: 50,
  /** Bonus per ogni Yatzy successivo al primo. */
  YATZY_BONUS: 100,
  /**
   * true  = il bonus +100 spetta solo se la casella Yatzy contiene già 50 punti
   *         (regola classica: se lo Yatzy è stato cancellato con 0, niente bonus).
   * false = il bonus spetta per ogni Yatzy successivo al primo, comunque segnato.
   */
  YATZY_BONUS_REQUIRES_50: true,
  /**
   * Regola "jolly": uno Yatzy aggiuntivo vale come Full / Scala piccola / Scala grande
   * a punteggio pieno se il giocatore sceglie di segnarlo lì.
   */
  JOKER_RULE: true,
};

/**
 * CARTE POTENZIAMENTO (gratta e vinci)
 * ------------------------------------------------------------
 * All'inizio di ogni turno il giocatore gratta una carta con un
 * potenziamento casuale. Le probabilità sono uguali per entrambi.
 */
export const CARD_RULES = {
  /** Probabilità di ogni rarità (in percentuale, somma 100). */
  RARITY_WEIGHTS: { common: 45, rare: 28, epic: 16, legendary: 9, mythic: 2 },
  /** Carte massime in mano: oltre, se ne scarta una. */
  HAND_MAX: 5,
  /** Cariche di scudo massime su una casella. */
  MAX_SHIELDS: 2,
  /** Punti extra massimi della Corona del Destino. */
  CROWN_CAP: 100,
};

/** Tempi delle animazioni (ms). ANIM_SPEED > 1 accelera tutto (usato nei test). */
export const TIMING = {
  ANIM_SPEED: 1,
  ROLL_MIN: 820,
  ROLL_MAX: 1080,
  ROLL_STAGGER: 55,
  FLY_DURATION: 560,
  FLY_STAGGER: 110,
  TURN_ROTATION: 1100,
  BANNER_HOLD: 650,
  BONUS_HOLD: 1500,
};

export const STORAGE_KEYS = {
  settings: 'yatzy-duel.settings.v1',
  save: 'yatzy-duel.save.v2',
  tally: 'yatzy-duel.tally.v1',
};
