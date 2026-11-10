/**
 * Carte potenziamento: definizioni e pescata casuale per rarità.
 * Solo dati e funzioni pure: gli effetti sono applicati dal motore (game.js).
 */
import { CARD_RULES } from '../config.js';

export const RARITIES = ['common', 'rare', 'epic', 'legendary'];

export const RARITY_INFO = {
  common: { label: 'Comune' },
  rare: { label: 'Rara' },
  epic: { label: 'Epica' },
  legendary: { label: 'Leggendaria' },
};

/**
 * target:
 *  null                      nessun bersaglio
 *  { kind: 'dice', min, max } dadi del vassoio
 *  { kind: 'ownBoxes', count } caselle proprie
 *  { kind: 'oppBox' }        una casella dell'avversario con punti
 *  { kind: 'oppCard' }       una carta in mano all'avversario
 *  { kind: 'allDice' }       valori dei 5 dadi
 * choice: 'plusMinus' | 'face'  (scelta aggiuntiva dopo il bersaglio)
 */
export const CARDS = {
  // ---------------- comuni ----------------
  ritiraFortuna: {
    name: 'Ritira Fortuna',
    rarity: 'common',
    text: 'Rilancia fino a 2 dadi.',
    target: { kind: 'dice', min: 1, max: 2 },
    prompt: 'Scegli fino a 2 dadi da rilanciare',
  },
  scudoLegno: {
    name: 'Scudo di Legno',
    rarity: 'common',
    text: 'Protegge una casella da un attacco.',
    target: { kind: 'ownBoxes', count: 1 },
    prompt: 'Scegli una tua casella da proteggere',
  },
  occhioDestino: {
    name: 'Occhio del Destino',
    rarity: 'common',
    text: 'Rivela il risultato di un dado prima di decidere.',
    target: { kind: 'dice', min: 1, max: 1, foresight: true },
    prompt: 'Scegli il dado di cui vedere il prossimo risultato',
  },
  manoVeloce: {
    name: 'Mano Veloce',
    rarity: 'common',
    text: 'Pesca una carta aggiuntiva.',
    target: null,
  },
  // ---------------- rare ----------------
  dadoTruccato: {
    name: 'Dado Truccato',
    rarity: 'rare',
    text: 'Modifica il risultato di un dado di +1 o -1.',
    target: { kind: 'dice', min: 1, max: 1 },
    choice: 'plusMinus',
    prompt: 'Scegli un dado, poi +1 o −1',
  },
  furtoFortuna: {
    name: 'Furto di Fortuna',
    rarity: 'rare',
    text: "Ruba 10 punti all'avversario.",
    target: { kind: 'oppBox' },
    amount: 10,
    prompt: 'Scegli una casella avversaria da cui rubare',
  },
  scudoArcano: {
    name: 'Scudo Arcano',
    rarity: 'rare',
    text: 'Protegge due caselle dagli effetti nemici.',
    target: { kind: 'ownBoxes', count: 2 },
    prompt: 'Scegli due tue caselle da proteggere',
  },
  doppioLancio: {
    name: 'Doppio Lancio',
    rarity: 'rare',
    text: 'Permette un rilancio aggiuntivo in questo turno.',
    target: null,
  },
  // ---------------- epiche ----------------
  maledizioneCaos: {
    name: 'Maledizione del Caos',
    rarity: 'epic',
    text: "L'avversario deve rilanciare due dadi non conservati.",
    target: null,
    curse: 'chaos',
  },
  riscritturaDestino: {
    name: 'Riscrittura del Destino',
    rarity: 'epic',
    text: 'Trasforma un risultato di un dado in un altro numero.',
    target: { kind: 'dice', min: 1, max: 1 },
    choice: 'face',
    prompt: 'Scegli un dado, poi il nuovo numero',
  },
  saccheggioReale: {
    name: 'Saccheggio Reale',
    rarity: 'epic',
    text: "Ruba 25 punti all'avversario.",
    target: { kind: 'oppBox' },
    amount: 25,
    prompt: 'Scegli una casella avversaria da saccheggiare',
  },
  prigioneTemporale: {
    name: 'Prigione Temporale',
    rarity: 'epic',
    text: 'Blocca una carta avversaria per un turno.',
    target: { kind: 'oppCard' },
    prompt: "Scegli la carta dell'avversario da bloccare",
  },
  // ---------------- leggendarie ----------------
  manoDegliDei: {
    name: 'Mano degli Dei',
    rarity: 'legendary',
    text: 'Imposta il risultato di tutti e cinque i dadi una sola volta.',
    target: { kind: 'allDice' },
    prompt: 'Tocca i dadi per scegliere i valori',
  },
  rewindTemporale: {
    name: 'Rewind Temporale',
    rarity: 'legendary',
    text: "Annulla l'ultimo effetto di una carta avversaria.",
    target: null,
  },
  apocalisseDadi: {
    name: 'Apocalisse dei Dadi',
    rarity: 'legendary',
    text: "L'avversario deve rilanciare tutti i dadi non conservati e perde la possibilità di conservarne uno nel prossimo lancio.",
    target: null,
    curse: 'apocalypse',
  },
  coronaDestino: {
    name: 'Corona del Destino',
    rarity: 'legendary',
    text: `Raddoppia il punteggio del turno, fino a un massimo di ${CARD_RULES.CROWN_CAP} punti extra.`,
    target: null,
  },
};

export const CARD_IDS = Object.keys(CARDS);

export function cardsOfRarity(rarity) {
  return CARD_IDS.filter((id) => CARDS[id].rarity === rarity);
}

/** Pesca una carta: prima la rarità (pesata), poi una carta di quella rarità. */
export function drawCardId(rng, weights = CARD_RULES.RARITY_WEIGHTS) {
  const total = RARITIES.reduce((s, r) => s + (weights[r] || 0), 0);
  let x = rng() * total;
  let rarity = RARITIES[RARITIES.length - 1];
  for (const r of RARITIES) {
    x -= weights[r] || 0;
    if (x < 0) {
      rarity = r;
      break;
    }
  }
  const pool = cardsOfRarity(rarity);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
