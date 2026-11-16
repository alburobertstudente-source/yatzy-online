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
    text: 'Rilancia fino a 3 dadi senza consumare un lancio.',
    target: { kind: 'dice', min: 1, max: 3 },
    prompt: 'Scegli fino a 3 dadi da rilanciare',
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
    rarity: 'common', points: 2,
    text: 'Rivela il prossimo risultato di 3 dadi non conservati e ti dà 2 punti.',
    target: null,
  },
  manoVeloce: {
    name: 'Mano Veloce',
    rarity: 'common',
    text: 'Pesca una carta aggiuntiva.',
    target: null,
  },
  dadoGemello: {
    name: 'Dado Gemello',
    rarity: 'rare',
    text: 'Scegli due dadi: il primo diventa uguale al secondo.',
    target: { kind: 'dice', min: 2, max: 2 },
    prompt: 'Tocca il dado da cambiare, poi il dado da copiare',
  },
  sabotaggio: {
    name: 'Sabotaggio',
    rarity: 'common',
    text: "Blocca una casella libera dell'avversario per tutto il suo prossimo turno e ti dà 5 punti.",
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
    rarity: 'rare', points: 5,
    text: 'Il dado più basso sale di 2 (fino a 6) e guadagni 5 punti.',
    target: null,
  },
  spintaGentile: {
    name: 'Spinta Gentile',
    rarity: 'common', points: 3,
    text: 'Tutti gli 1 diventano 2, tutti i 2 diventano 3, e guadagni 3 punti.',
    target: null,
  },
  paccaSpalla: { name: 'Pacca sulla Spalla', rarity: 'common', text: 'Guadagni subito 6 punti.', target: null },
  rimbalzo: { name: 'Rimbalzo', rarity: 'rare', points: 5, text: 'Rilancia tutti i dadi non conservati senza consumare un lancio e ti dà 5 punti.', target: null },
  antidoto: { name: 'Antidoto', rarity: 'common', text: 'Cancella maledizioni, sabotaggi, Mezza Luna, Trappole e Catene che ti colpiscono; in più 5 punti.', target: null },
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
    text: "Ruba 6 punti all'avversario.",
    target: { kind: 'oppBox' },
    amount: 6,
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
    rarity: 'common',
    text: 'Permette un rilancio aggiuntivo in questo turno.',
    target: null,
  },
  geloEterno: {
    name: 'Gelo Eterno',
    rarity: 'rare', points: 7,
    text: "Guadagni 7 punti e al prossimo lancio dell'avversario tre dadi si congelano: non potrà conservarli in quel turno.",
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
    rarity: 'rare', points: 5,
    text: 'Guadagni 5 punti e ai prossimi due lanci i dadi che fanno 1 o 2 vengono rilanciati da soli.',
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
    text: 'Guadagni 7 punti; e se in questo turno segni 0, ne ricevi altri 20.',
    target: null,
    bonus: { kind: 'net', amount: 20 },
  },
  tassaDelRe: {
    name: 'Tassa del Re',
    rarity: 'epic',
    text: "Ruba 3 punti da ognuna delle tre caselle migliori dell'avversario (gli scudi le proteggono).",
    target: null,
  },
  raddoppioSuperiore: {
    name: 'Raddoppio Superiore',
    rarity: 'rare',
    text: 'Guadagni 6 punti; e se in questo turno segni nella parte sinistra (Uno…Sei), il punteggio vale doppio.',
    target: null,
    bonus: { kind: 'upper2', cap: 30 },
  },
  trappola: { name: 'Trappola', rarity: 'rare', points: 3, text: "Il prossimo punteggio segnato dall'avversario perde 15 punti; tu ne guadagni 3.", target: null },
  investimento: { name: 'Investimento', rarity: 'rare', text: 'All\'inizio del tuo prossimo turno ricevi 12 punti.', target: null },
  specchioRiflesso: { name: 'Specchio Riflesso', rarity: 'rare', text: "Il prossimo attacco dell'avversario contro di te rimbalza: viene annullato e tu guadagni 10 punti (le maledizioni tornano a lui).", target: null },
  rivincita: { name: 'Rivincita', rarity: 'rare', text: 'Se sei in svantaggio guadagni metà della differenza (fino a 40 punti), altrimenti 5.', target: null },
  combo: { name: 'Combo', rarity: 'rare', text: "Se in questo turno hai già giocato un'altra carta, guadagni 6 punti e peschi una carta.", target: null },
  // ---------------- epiche ----------------
  maledizioneCaos: {
    name: 'Maledizione del Caos',
    rarity: 'epic', points: 8,
    text: "Guadagni 8 punti e per i prossimi DUE turni dell'avversario, dopo ogni suo lancio tre dadi a caso (anche conservati) vengono rilanciati.",
    target: null,
    curse: 'chaos',
  },
  riscritturaDestino: {
    name: 'Riscrittura del Destino',
    rarity: 'epic', bonusRoll: true,
    text: 'Trasforma un dado in un altro numero e hai un lancio in più.',
    target: { kind: 'dice', min: 1, max: 1 },
    choice: 'face',
    prompt: 'Scegli un dado, poi il nuovo numero',
  },
  saccheggioReale: {
    name: 'Saccheggio Reale',
    rarity: 'epic',
    text: "Ruba 8 punti all'avversario.",
    target: { kind: 'oppBox' },
    amount: 8,
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
    rarity: 'rare',
    text: "Il prossimo punteggio segnato dall'avversario viene dimezzato; tu guadagni 5 punti.",
    target: null,
  },
  lancioRubato: {
    name: 'Lancio Rubato',
    rarity: 'common', points: 3,
    text: "Nel suo prossimo turno l'avversario ha un lancio in meno; tu guadagni 3 punti.",
    target: null,
  },
  scambioSorte: {
    name: 'Scambio di Sorte',
    rarity: 'rare',
    text: "Scegli una casella in cui l'avversario ha più punti di te: gli rubi la differenza.",
    target: { kind: 'box', side: 'opp' },
    prompt: 'Scegli una casella avversaria più alta della tua',
  },
  tempestaLanci: {
    name: 'Tempesta di Lanci',
    rarity: 'epic', points: 4,
    text: 'Due lanci in più e 4 punti; a ogni lancio di questo turno gli 1 e i 2 si rilanciano da soli.',
    target: null,
    extraRolls: 2,
  },
  moltiplicatore: {
    name: 'Moltiplicatore',
    rarity: 'epic',
    text: 'Il punteggio di questo turno vale doppio (fino a 40 punti extra).',
    target: null,
    bonus: { kind: 'mult', cap: 40 },
  },
  ladroDiLanci: {
    name: 'Ladro di Lanci',
    rarity: 'epic',
    text: "Due lanci in più per te adesso, uno in meno per l'avversario nel suo prossimo turno, e peschi una carta.",
    target: null,
  },
  eco: {
    name: 'Eco',
    rarity: 'epic',
    text: 'Guadagni di nuovo i punti della tua ultima casella segnata (fino a 40) più 5.',
    target: null,
  },
  terremoto: { name: 'Terremoto', rarity: 'epic', text: "Ogni casella dell'avversario perde 4 punti (gli scudi la proteggono).", target: null },
  jackpot: { name: 'Jackpot', rarity: 'rare', text: 'Se in questo turno segni Full, Scala, Poker o Yatzy con punti, +25.', target: null, bonus: { kind: 'jackpot', amount: 25 } },
  catene: { name: 'Catene', rarity: 'epic', points: 10, text: "Nel suo prossimo turno l'avversario non può conservare nessun dado; tu guadagni 10 punti.", target: null },
  contrattacco: { name: 'Contrattacco', rarity: 'epic', text: "Carta di reazione: la prossima volta che l'avversario ti ruba punti, ne riprendi il doppio.", target: null },
  // ---------------- leggendarie ----------------
  manoDegliDei: {
    name: 'Mano degli Dei',
    rarity: 'mythic',
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
    rarity: 'legendary', points: 20,
    text: "Guadagni 20 punti e al prossimo lancio l'avversario rilancia tutti i dadi, anche quelli conservati, perde un lancio e per tutto il turno non può conservare dadi.",
    target: null,
    curse: 'apocalypse',
  },
  coronaDestino: {
    name: 'Corona del Destino',
    rarity: 'legendary',
    text: `Triplica il punteggio del turno, fino a un massimo di ${CARD_RULES.CROWN_CAP} punti extra.`,
    target: null,
  },
  reDeiLadri: {
    name: 'Re dei Ladri',
    rarity: 'legendary',
    text: "Ruba 15 punti all'avversario.",
    target: { kind: 'oppBox' },
    amount: 15,
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
    text: 'Guadagni subito 30 punti.',
    target: null,
  },
  tempestaPerfetta: { name: 'Tempesta Perfetta', rarity: 'legendary', points: 20, text: "Guadagni 20 punti e l'avversario subisce insieme Maledizione del Caos, un lancio in meno, Mezza Luna e Catene.", target: null },
  fontanaDesideri: { name: 'Fontana dei Desideri', rarity: 'legendary', text: 'Guadagni 5 punti per ogni casella che hai già segnato (fino a 60).', target: null },
  // ---------------- mitiche ----------------
  bigBang: {
    name: 'Big Bang',
    rarity: 'legendary', points: 10, bonusRoll: true,
    text: 'Guadagni 10 punti e quattro dadi diventano uguali al numero più presente (Poker garantito) e hai un lancio in più per cercare lo Yatzy.',
    target: null,
  },
  furtoCosmico: {
    name: 'Furto Cosmico',
    rarity: 'mythic',
    text: "Ruba i punti della casella migliore dell'avversario (fino a 30), ignorando scudi e specchi.",
    target: null,
  },
  tempoInfinito: {
    name: 'Tempo Infinito',
    rarity: 'mythic',
    text: 'Per questo turno e i tuoi prossimi 2: tre lanci in più, e a ogni lancio gli 1 e i 2 si rilanciano da soli.',
    target: null,
    extraRolls: 3,
  },
  benedizioneEterna: {
    name: 'Benedizione Eterna',
    rarity: 'mythic',
    text: 'Per questo turno e i tuoi prossimi 4: due lanci in più e i dadi che fanno 1 o 2 si rilanciano da soli a ogni lancio.',
    target: null,
  },
  bucoNero: {
    name: 'Buco Nero',
    rarity: 'mythic', points: 15,
    text: "Guadagni 15 punti, inghiotti tutte le carte dell'avversario e lo maledici con l'Apocalisse dei Dadi.",
    target: null,
  },
  clonazione: {
    name: 'Clonazione',
    rarity: 'mythic',
    text: "Copia nella tua mano tutte le carte dell'avversario (finché c'è posto, fino a 5), peschi una carta e guadagni 10 punti.",
    target: null,
  },
  pioggiaOro: { name: "Pioggia d'Oro", rarity: 'mythic', text: 'Guadagni subito 45 punti.', target: null },
  // ---------------- nuove carte: duello competitivo (vedi docs/CARDS_DESIGN.md) ----------------
  colpoDiFortuna: { name: 'Colpo di Fortuna', rarity: 'common', points: 3, text: 'Rilancia il dado più basso non conservato senza consumare un lancio e ti dà 3 punti.', target: null },
  piccolaScommessa: { name: 'Piccola Scommessa', rarity: 'common', text: 'Scommessa (prima del primo lancio): se in questo turno segni almeno 20 punti +18, altrimenti −3.', target: null, bonus: { kind: 'bet', min: 20, win: 18, lose: 3 } },
  salvadanaio: { name: 'Salvadanaio', rarity: 'common', text: "Guadagni 3 punti adesso e 6 all'inizio del tuo prossimo turno.", target: null },
  spintone: { name: 'Spintone', rarity: 'common', text: "La casella migliore dell'avversario perde 5 punti.", target: null },
  allarme: { name: 'Allarme', rarity: 'common', text: "Reazione: la prossima volta che l'avversario ti attacca guadagni 10 punti.", target: null },
  primoPasso: { name: 'Primo Passo', rarity: 'common', text: 'Prima del primo lancio: un lancio in più e 3 punti.', target: null },
  elemosina: { name: 'Elemosina', rarity: 'common', text: 'Se sei in svantaggio guadagni 9 punti, altrimenti 3.', target: null },
  tiroMancino: { name: 'Tiro Mancino', rarity: 'common', points: 4, text: "Guadagni 4 punti e al prossimo lancio dell'avversario un suo dado diventa 1.", target: null, curse: 'nudge' },
  amuleto: { name: 'Amuleto', rarity: 'common', text: 'Protegge una tua casella con uno scudo e ti dà 5 punti.', target: { kind: 'ownBoxes', count: 1 }, prompt: 'Scegli la casella da proteggere' },
  pescaDoppia: { name: 'Pesca Doppia', rarity: 'rare', text: 'Peschi due carte.', target: null },
  contromossa: { name: 'Contromossa', rarity: 'rare', text: "Reazione: la prossima carta giocata dall'avversario non ha effetto.", target: null },
  scommessaYatzy: { name: 'Scommessa sullo Yatzy', rarity: 'rare', text: 'Scommessa (prima del primo lancio): se in questo turno segni con quattro o cinque dadi uguali +50, altrimenti −4.', target: null, bonus: { kind: 'betYatzy', win: 50, lose: 4 } },
  invidia: { name: 'Invidia', rarity: 'rare', text: "Reazione: la prossima volta che l'avversario segna 25 punti o più in una casella, tu ne guadagni 20.", target: null },
  spia: { name: 'Spia', rarity: 'rare', text: "Nel prossimo turno dell'avversario guadagni 5 punti per ogni carta che gioca.", target: null },
  esorcismo: { name: 'Esorcismo', rarity: 'rare', text: "Cancella tutti gli effetti negativi su di te; la maledizione torna a chi l'ha lanciata. In più 4 punti.", target: null },
  slancio: { name: 'Slancio', rarity: 'rare', text: 'Un lancio in più e 4 punti per ogni carta giocata in questo turno (compresa questa).', target: null },
  rogo: { name: 'Rogo', rarity: 'rare', text: "Brucia una carta a caso dalla mano dell'avversario e ti dà 3 punti.", target: null },
  ritmo: { name: 'Ritmo', rarity: 'rare', text: 'Un lancio in più adesso e uno in più nel tuo prossimo turno.', target: null },
  ultimoAtto: { name: 'Ultimo Atto', rarity: 'rare', text: 'Dal round 10: il punteggio di questo turno vale doppio (fino a +40). Prima: +6.', target: null, bonus: { kind: 'final', cap: 40, early: 6 } },
  scambioCarte: { name: 'Scambio di Carte', rarity: 'rare', text: "Scambi una tua carta a caso con una a caso dell'avversario.", target: null },
  sfondamento: { name: 'Sfondamento', rarity: 'epic', text: "Distrugge scudi, Specchio, Contrattacco, Contromossa e Allarme dell'avversario e gli ruba 9 punti.", target: null },
  rapina: { name: 'Rapina', rarity: 'epic', text: "Ruba 9 punti dalla casella migliore dell'avversario, ignorando gli scudi.", target: null },
  grandeScommessa: { name: 'Grande Scommessa', rarity: 'epic', text: 'Scommessa (prima del primo lancio): se in questo turno segni almeno 30 punti +60, altrimenti −6.', target: null, bonus: { kind: 'bet', min: 30, win: 60, lose: 6 } },
  sigillo: { name: 'Sigillo', rarity: 'epic', points: 10, text: "Nel suo prossimo turno l'avversario può giocare una sola carta e ha un lancio in meno; tu guadagni 10 punti.", target: null },
  valanga: { name: 'Valanga', rarity: 'epic', text: "Ruba 5 punti da ogni casella della parte sinistra dell'avversario (gli scudi la proteggono).", target: null },
  biblioteca: { name: 'Biblioteca', rarity: 'epic', text: 'Peschi due carte e guadagni 6 punti.', target: null },
  fortezza: { name: 'Fortezza', rarity: 'epic', text: 'Uno scudo su ogni tua casella con punti, più uno Specchio Riflesso.', target: null },
  turnoPerfetto: { name: 'Turno Perfetto', rarity: 'epic', text: 'Due lanci in più; se in questo turno segni almeno 25 punti, +12.', target: null, bonus: { kind: 'perfect', min: 25, win: 12 } },
  rimontaFuriosa: { name: 'Rimonta Furiosa', rarity: 'epic', text: 'Se sei indietro di 30 punti o più guadagni 30 punti, altrimenti 10.', target: null },
  granFinale: { name: 'Gran Finale', rarity: 'legendary', text: '3 punti per ogni casella che hai segnato; dal round 10 valgono doppio.', target: null },
  bancarotta: { name: 'Bancarotta', rarity: 'legendary', text: "L'avversario perde fino a 25 dei punti guadagnati con le carte; tu ne prendi metà.", target: null },
  tempestaCarte: { name: 'Tempesta di Carte', rarity: 'legendary', text: 'Peschi tre carte e guadagni 6 punti.', target: null },
  muroInvalicabile: { name: 'Muro Invalicabile', rarity: 'legendary', text: "Per i prossimi due turni dell'avversario nessun suo attacco ti colpisce.", target: null },
  pattoDiavolo: { name: 'Patto col Diavolo', rarity: 'legendary', text: "Guadagni subito 33 punti, ma nel tuo prossimo turno hai un lancio in meno e l'avversario pesca una carta.", target: null },
  ladroSupremo: { name: 'Ladro Supremo', rarity: 'mythic', text: "Ruba 10 punti da ognuna delle tre caselle migliori dell'avversario, ignorando gli scudi.", target: null },
  fenice: { name: 'Fenice', rarity: 'mythic', text: '20 punti per ogni tua casella segnata con 0 (fino a 80); se non ne hai, 35.', target: null },
  onnipotenza: { name: 'Onnipotenza', rarity: 'mythic', text: 'In questo turno ogni lancio è uno YATZY.', target: null },
  jackpotCosmico: { name: 'Jackpot Cosmico', rarity: 'mythic', text: 'Scommessa senza rischio (prima del primo lancio): se in questo turno segni almeno 30 punti +100, altrimenti +20.', target: null, bonus: { kind: 'cosmicBet', min: 30, win: 100, lose: -20 } },
  manoDelRe: { name: 'Mano del Re', rarity: 'mythic', text: 'Peschi quattro carte, guadagni 10 punti e nel tuo prossimo turno hai due lanci in più.', target: null },
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
