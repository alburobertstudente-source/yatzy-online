/**
 * Carte potenziamento: definizioni e pescata casuale per rarità.
 * Solo dati e funzioni pure: gli effetti sono applicati dal motore (game.js).
 */
import { CARD_RULES } from '../config.js';

export const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic', 'absurd'];

export const RARITY_INFO = {
  common: { label: 'Comune' },
  rare: { label: 'Rara' },
  epic: { label: 'Epica' },
  legendary: { label: 'Leggendaria' },
  mythic: { label: 'Mitica' },
  absurd: { label: 'Assurda' },
};

/**
 * target:
 *  null                      nessun bersaglio
 *  { kind: 'dice', min, max } dadi del vassoio
 *  { kind: 'ownBoxes', count } caselle proprie
 *  { kind: 'oppBox' }        una casella dell'avversario con punti
 *  { kind: 'oppCard' }       una carta in mano all'avversario
 *  { kind: 'allDice' }       valori dei 5 dadi
 *  { kind: 'box', side }     una casella (propria o avversaria) scelta da boxTargets() in powers.js
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
    text: 'Protegge due caselle da un attacco.',
    target: { kind: 'ownBoxes', count: 2 },
    prompt: 'Scegli due tue caselle da proteggere',
  },
  occhioDestino: {
    name: 'Occhio del Destino',
    rarity: 'common',
    text: 'Rivela il prossimo risultato di due dadi prima di decidere.',
    target: { kind: 'dice', min: 1, max: 2, foresight: true },
    prompt: 'Scegli fino a 2 dadi di cui vedere il prossimo risultato',
  },
  manoVeloce: {
    name: 'Mano Veloce',
    rarity: 'common',
    text: 'Pesca una carta aggiuntiva.',
    target: null,
  },
  dadoGemello: {
    name: 'Dado Gemello',
    rarity: 'common',
    text: 'Scegli due dadi: il primo diventa uguale al secondo.',
    target: { kind: 'dice', min: 2, max: 2 },
    prompt: 'Tocca il dado da cambiare, poi il dado da copiare',
  },
  sabotaggio: {
    name: 'Sabotaggio',
    rarity: 'common',
    text: "Blocca una casella libera dell'avversario per tutto il suo prossimo turno.",
    target: { kind: 'box', side: 'opp' },
    prompt: "Scegli la casella libera dell'avversario da bloccare",
  },
  spiccioloFortunato: {
    name: 'Spicciolo Fortunato',
    rarity: 'common',
    text: 'Il punteggio di questo turno vale 8 punti in più (se non è zero).',
    target: null,
    bonus: { kind: 'plus', amount: 8 },
  },
  seiFortunato: {
    name: 'Sei Fortunato',
    rarity: 'common',
    text: 'Il dado più basso diventa un 6.',
    target: null,
  },
  spintaGentile: {
    name: 'Spinta Gentile',
    rarity: 'common',
    text: 'Tutti gli 1 diventano 2 e tutti i 2 diventano 3.',
    target: null,
  },
  // ---------------- rare ----------------
  dadoTruccato: {
    name: 'Dado Truccato',
    rarity: 'rare',
    text: 'Modifica il risultato di un dado di +1 o −1 e pesca una carta.',
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
    text: 'Protegge tre caselle dagli effetti nemici.',
    target: { kind: 'ownBoxes', count: 3 },
    prompt: 'Scegli tre tue caselle da proteggere',
  },
  doppioLancio: {
    name: 'Doppio Lancio',
    rarity: 'rare',
    text: 'Permette un rilancio aggiuntivo in questo turno.',
    target: null,
  },
  geloEterno: {
    name: 'Gelo Eterno',
    rarity: 'rare',
    text: "Al prossimo lancio dell'avversario due dadi si congelano: non potrà conservarli in quel turno.",
    target: null,
    curse: 'freeze',
  },
  manoLesta: {
    name: 'Mano Lesta',
    rarity: 'rare',
    text: "Ruba una carta dalla mano dell'avversario.",
    target: { kind: 'oppCard', any: true },
    prompt: "Scegli la carta dell'avversario da rubare",
  },
  lancioBenedetto: {
    name: 'Lancio Benedetto',
    rarity: 'rare',
    text: 'Al prossimo lancio i dadi che fanno 1 o 2 vengono rilanciati da soli.',
    target: null,
  },
  calamita: {
    name: 'Calamita',
    rarity: 'rare',
    text: 'Scegli un dado: un altro dado a caso diventa uguale.',
    target: { kind: 'dice', min: 1, max: 1 },
    prompt: 'Scegli il dado che attira gli altri',
  },
  reteSalvataggio: {
    name: 'Rete di Salvataggio',
    rarity: 'rare',
    text: 'Se in questo turno segni 0, ricevi comunque 20 punti.',
    target: null,
    bonus: { kind: 'net', amount: 20 },
  },
  tassaDelRe: {
    name: 'Tassa del Re',
    rarity: 'rare',
    text: "Ruba 6 punti da ognuna delle tre caselle migliori dell'avversario (gli scudi le proteggono).",
    target: null,
  },
  raddoppioSuperiore: {
    name: 'Raddoppio Superiore',
    rarity: 'rare',
    text: 'Se in questo turno segni nella parte sinistra (Uno…Sei), il punteggio vale doppio.',
    target: null,
    bonus: { kind: 'upper2', cap: 30 },
  },
  // ---------------- epiche ----------------
  maledizioneCaos: {
    name: 'Maledizione del Caos',
    rarity: 'epic',
    text: "Per tutto il prossimo turno dell'avversario, dopo OGNI suo lancio due dadi a caso (anche conservati) vengono rilanciati.",
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
    text: "Blocca TUTTE le carte dell'avversario per il suo prossimo turno.",
    target: null,
  },
  mezzaLuna: {
    name: 'Mezza Luna',
    rarity: 'epic',
    text: "Il prossimo punteggio segnato dall'avversario viene dimezzato.",
    target: null,
  },
  lancioRubato: {
    name: 'Lancio Rubato',
    rarity: 'epic',
    text: "Nel suo prossimo turno l'avversario ha un lancio in meno.",
    target: null,
  },
  scambioSorte: {
    name: 'Scambio di Sorte',
    rarity: 'epic',
    text: "Scegli una casella in cui l'avversario ha più punti di te: gli rubi la differenza.",
    target: { kind: 'box', side: 'opp' },
    prompt: 'Scegli una casella avversaria più alta della tua',
  },
  tempestaLanci: {
    name: 'Tempesta di Lanci',
    rarity: 'epic',
    text: 'Due lanci in più in questo turno.',
    target: null,
    extraRolls: 2,
  },
  moltiplicatore: {
    name: 'Moltiplicatore',
    rarity: 'epic',
    text: 'Il punteggio di questo turno vale una volta e mezza (fino a 40 punti extra).',
    target: null,
    bonus: { kind: 'mult', cap: 40 },
  },
  ladroDiLanci: {
    name: 'Ladro di Lanci',
    rarity: 'epic',
    text: "Un lancio in più per te adesso e uno in meno per l'avversario nel suo prossimo turno.",
    target: null,
  },
  eco: {
    name: 'Eco',
    rarity: 'epic',
    text: 'Guadagni di nuovo i punti della tua ultima casella segnata (fino a 30).',
    target: null,
  },
  // ---------------- leggendarie ----------------
  manoDegliDei: {
    name: 'Mano degli Dei',
    rarity: 'legendary',
    text: 'Scegli il valore di tutti e cinque i dadi e guadagna un lancio in più.',
    target: { kind: 'allDice' },
    prompt: 'Tocca i dadi per scegliere i valori',
  },
  rewindTemporale: {
    name: 'Rewind Temporale',
    rarity: 'legendary',
    text: "Annulla l'ultimo effetto di una carta avversaria e pesca una carta.",
    target: null,
  },
  apocalisseDadi: {
    name: 'Apocalisse dei Dadi',
    rarity: 'legendary',
    text: "Al prossimo lancio l'avversario rilancia tutti i dadi, anche quelli conservati, e un dado non si può più conservare.",
    target: null,
    curse: 'apocalypse',
  },
  coronaDestino: {
    name: 'Corona del Destino',
    rarity: 'legendary',
    text: `Raddoppia il punteggio del turno, fino a un massimo di ${CARD_RULES.CROWN_CAP} punti extra.`,
    target: null,
  },
  reDeiLadri: {
    name: 'Re dei Ladri',
    rarity: 'legendary',
    text: "Ruba 50 punti all'avversario.",
    target: { kind: 'oppBox' },
    amount: 50,
    prompt: 'Scegli una casella avversaria da svuotare',
  },
  scudoDivino: {
    name: 'Scudo Divino',
    rarity: 'legendary',
    text: 'Protegge tutte le tue caselle con uno scudo.',
    target: null,
  },
  tesoroDraghi: {
    name: 'Tesoro dei Draghi',
    rarity: 'legendary',
    text: 'Guadagni subito 40 punti.',
    target: null,
  },
  // ---------------- mitiche ----------------
  bigBang: {
    name: 'Big Bang',
    rarity: 'mythic',
    text: 'Tutti i dadi diventano 6: YATZY! E hai un lancio in più.',
    target: null,
  },
  furtoCosmico: {
    name: 'Furto Cosmico',
    rarity: 'mythic',
    text: "Ruba TUTTI i punti della casella migliore dell'avversario, ignorando gli scudi.",
    target: null,
  },
  tempoInfinito: {
    name: 'Tempo Infinito',
    rarity: 'mythic',
    text: 'Otto lanci in più in questo turno.',
    target: null,
    extraRolls: 8,
  },
  benedizioneEterna: {
    name: 'Benedizione Eterna',
    rarity: 'mythic',
    text: 'Per questo turno e i tuoi prossimi 3: un lancio in più e i dadi che fanno 1 o 2 si rilanciano da soli a ogni lancio.',
    target: null,
  },
  bucoNero: {
    name: 'Buco Nero',
    rarity: 'mythic',
    text: "Inghiotte tutte le carte dell'avversario e lo maledice con l'Apocalisse dei Dadi.",
    target: null,
  },
  clonazione: {
    name: 'Clonazione',
    rarity: 'mythic',
    text: "Copia nella tua mano tutte le carte dell'avversario (finché c'è posto, fino a 5).",
    target: null,
  },
  // ---------------- assurda ----------------
  dominioAssoluto: {
    name: 'Dominio Assoluto',
    rarity: 'absurd',
    text: 'Per questo turno e i tuoi prossimi 4 turni, ogni lancio è uno YATZY.',
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
