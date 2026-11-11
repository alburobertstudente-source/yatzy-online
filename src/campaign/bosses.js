/**
 * I 10 boss della campagna: partite intere contro il bot, ognuno con un
 * effetto strano che colpisce il giocatore (rosso). Più si va avanti, più
 * il boss è bravo e l'effetto è cattivo.
 */
import { ALL_CATEGORIES } from '../core/scoring.js';
import { CATEGORY_INFO } from '../core/scoring.js';

export const BOSSES = [
  { id: 'frog', name: 'Re Ranocchio', world: 'Prato dei Dadi', skill: 0.3, effect: 'Salto', text: 'Dopo il tuo primo lancio un dado salta e cambia faccia.', colors: ['#5ccf4f', '#2f8f2a', '#ffd23f'], look: 'frog' },
  { id: 'crab', name: 'Granchio Pinzetta', world: 'Spiaggia Fortunata', skill: 0.4, effect: 'Pinza', text: 'A ogni turno un dado è pinzato: non lo puoi tenere.', colors: ['#ff7a59', '#c8432a', '#fff3e6'], look: 'crab' },
  { id: 'witch', name: 'Strega Nebbiolina', world: 'Bosco Nebbioso', skill: 0.5, effect: 'Nebbia', text: 'Non vedi i punti in anteprima e il punteggio della strega è nascosto.', colors: ['#9b7bd8', '#4a2f80', '#c6f06a'], look: 'witch' },
  { id: 'golem', name: 'Golem di Ghiaccio', world: 'Montagne di Ghiaccio', skill: 0.57, effect: 'Gelo', text: 'Dopo il tuo primo lancio un dado si congela: resta fermo per tutto il turno.', colors: ['#9fdcff', '#3b8fd0', '#ffffff'], look: 'golem' },
  { id: 'mirror', name: 'Capitan Specchio', world: 'Mari del Pirata', skill: 0.63, effect: 'Ribalta', text: "All'ultimo lancio un dado si capovolge (il 6 diventa 1, il 5 diventa 2…).", colors: ['#4bc6d9', '#1d5f8a', '#ffd23f'], look: 'pirate' },
  { id: 'dragon', name: 'Drago Avaro', world: 'Deserto del Drago', skill: 0.7, effect: 'Tesoro', text: 'Ogni 3 round il drago ti ruba 8 punti dalla casella migliore.', colors: ['#ff9f1a', '#b8460b', '#ffe14d'], look: 'dragon' },
  { id: 'chaos', name: 'Mago del Caos', world: 'Torre del Caos', skill: 0.76, effect: 'Caos', text: 'A ogni turno una delle tue caselle libere è maledetta: non la puoi usare.', colors: ['#c04dff', '#5a1c99', '#2fd0ff'], look: 'wizard' },
  { id: 'vampire', name: 'Conte Vampiro', world: 'Castello Oscuro', skill: 0.82, effect: 'Morso', text: 'Il tuo bonus richiede 73 punti e ogni volta che segni 0 il vampiro guadagna 10 punti.', colors: ['#e0283d', '#3a0b18', '#f2f2f2'], look: 'vampire' },
  { id: 'storm', name: 'Regina Tempesta', world: 'Cieli in Tempesta', skill: 0.88, effect: 'Fulmine', text: 'Nei round pari hai solo 2 lanci; un dado è colpito dal fulmine e non si può tenere.', colors: ['#5aa8ff', '#1b3f8f', '#ffe14d'], look: 'storm' },
  { id: 'lord', name: 'Signore dei Dadi', world: 'Trono dei Dadi', skill: 0.92, effect: 'Dominio', text: 'Nei round pari hai 2 lanci, un dado non si può tenere e ogni 4 round ti ruba 10 punti.', colors: ['#ffcf33', '#2a1a4a', '#ff3d7f'], look: 'lord' },
];

const HUMAN = 'red';
const BOSS = 'blue';
const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const note = (g, n) => {
  g.turnState.boss = [...(g.turnState.boss || []), n];
};

/** Ruba punti dalla casella del giocatore che vale di più. */
function steal(g, amount) {
  const card = g.player(HUMAN).card;
  const filled = ALL_CATEGORIES.filter((c) => card.scores[c] !== null && card.value(c) > 0);
  if (!filled.length) return;
  const cat = filled.sort((a, b) => card.value(b) - card.value(a))[0];
  const taken = card.applyDebit(cat, amount);
  if (taken > 0) {
    g.player(BOSS).card.addCardPoints({ id: `boss-${g.turnId}`, amount: taken, kind: 'boss' });
    note(g, { type: 'steal', cat, amount: taken, label: CATEGORY_INFO[cat]?.label ?? cat });
  }
}

function noHoldDie(g) {
  const i = Math.floor(g.rng() * 5);
  g.turnState.noHold = [i];
  note(g, { type: 'pinch', die: i });
}

/** Regole speciali (hook del motore) per il boss k (1..10). */
export function bossHooks(boss) {
  const id = boss.id;
  return {
    turnStart(g) {
      if (id === 'vampire') g.player(HUMAN).card.bonusThreshold = 73;
      if (g.current.id !== HUMAN) return;
      const even = g.round % 2 === 0;
      if (id === 'crab') noHoldDie(g);
      if (id === 'chaos') {
        const open = g.current.card.openCategories();
        if (open.length > 1) {
          const cat = pick(open, g.rng);
          g.turnState.blocked = [cat];
          note(g, { type: 'block', cat, label: CATEGORY_INFO[cat]?.label ?? cat });
        }
      }
      if (id === 'dragon' && g.round % 3 === 0) steal(g, 8);
      if ((id === 'storm' || id === 'lord') && even) {
        g.dice.maxRolls = 2;
        note(g, { type: 'rolls', n: 2 });
        if (id === 'storm') noHoldDie(g);
      }
      if (id === 'lord') {
        noHoldDie(g);
        if (g.round % 4 === 0) steal(g, 10);
      }
    },
    afterRoll(g, { rolled, rollIndex }) {
      if (g.current.id !== HUMAN) return null;
      if (id === 'frog' && rollIndex === 0) {
        const i = pick(rolled, g.rng);
        const before = g.dice.values[i];
        let v = before;
        while (v === before) v = 1 + Math.floor(g.rng() * 6);
        g.dice.setValue(i, v);
        return { type: 'jump', dice: [i], before: [before], after: [v] };
      }
      if (id === 'golem' && rollIndex === 0 && g.dice.rollsLeft > 0) {
        const i = Math.floor(g.rng() * 5);
        g.dice.held[i] = true;
        g.turnState.frozen = [i];
        return { type: 'freeze', dice: [i] };
      }
      if (id === 'mirror' && g.dice.rollsLeft === 0) {
        const i = Math.floor(g.rng() * 5);
        const before = g.dice.values[i];
        g.dice.setValue(i, 7 - before);
        return { type: 'flip', dice: [i], before: [before], after: [7 - before] };
      }
      return null;
    },
    afterScore(g, res) {
      if (id === 'vampire' && res.playerId === HUMAN && res.score === 0) {
        g.player(BOSS).card.addCardPoints({ id: `boss-${g.turnId}`, amount: 10, kind: 'boss' });
        return { type: 'drain', amount: 10 };
      }
      return null;
    },
  };
}

export function bossByNumber(k) {
  return BOSSES[k - 1];
}
