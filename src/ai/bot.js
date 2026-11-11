/**
 * Avversario automatico (boss della campagna).
 *
 * Valuta quali dadi tenere simulando i lanci successivi (Monte Carlo) e
 * sceglie la casella con il miglior guadagno rispetto alla media attesa.
 * `skill` (0..1) regola la precisione: pochi campioni ed errori casuali
 * per i boss facili, ricerca a due passi per quelli difficili.
 */
import { ALL_CATEGORIES, UPPER, scoreCategory, isYatzy } from '../core/scoring.js';
import { RULES } from '../config.js';

/** Punteggio medio di ogni casella giocando bene: guadagno = punti − media. */
const BASELINE = {
  ones: 2.1, twos: 5.3, threes: 8.5, fours: 12.2, fives: 15.4, sixes: 19.2,
  threeKind: 21.7, fourKind: 13.1, fullHouse: 22.6, smallStraight: 29.5, largeStraight: 32.7, yatzy: 16.9, chance: 22,
};
const FACE = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };

const rawCache = new Map();
/** Punteggi grezzi delle 13 caselle per un gruppo di dadi (in cache: sono solo 252 combinazioni). */
function rawScores(dice) {
  const key = [...dice].sort().join('');
  let s = rawCache.get(key);
  if (!s) {
    s = {};
    for (const c of ALL_CATEGORIES) s[c] = scoreCategory(c, dice);
    s.joker = {};
    if (isYatzy(dice)) for (const c of ALL_CATEGORIES) s.joker[c] = scoreCategory(c, dice, { joker: true });
    rawCache.set(key, s);
  }
  return s;
}

/**
 * Contesto di valutazione per il giocatore di turno.
 * @param {import('../core/game.js').Game} game
 */
function context(game, skill) {
  const card = game.current.card;
  const open = card.openCategories().filter((c) => !game.isBlocked(c));
  const threshold = card.bonusThreshold || RULES.UPPER_BONUS_THRESHOLD;
  const upper = card.upperTotal();
  const upperLeft = UPPER.filter((c) => card.isOpen(c));
  const bonusOpen = !card.hasUpperBonus() && upperLeft.length > 0;
  return { card, open, threshold, upper, bonusOpen, yatzyFilled: card.scores.yatzy !== null, yatzy50: card.scores.yatzy === RULES.YATZY, skill };
}

/** Guadagno di segnare `cat` con questi dadi. */
function gain(ctx, cat, dice, raw) {
  const joker = RULES.JOKER_RULE && ctx.yatzyFilled && isYatzy(dice);
  const pts = joker ? raw.joker[cat] : raw[cat];
  let v = pts - BASELINE[cat];
  if (FACE[cat] && ctx.bonusOpen && ctx.skill > 0.3) {
    const par = FACE[cat] * 3;
    v += (pts - par) * 0.9; // sopra o sotto la "quota" per il bonus
    if (ctx.upper + pts >= ctx.threshold) v += RULES.UPPER_BONUS * 0.8;
  }
  if (cat === 'yatzy' && pts === 0) v -= 4; // tenere lo Yatzy aperto ha valore
  if (cat === 'chance') v -= 2; // la Chance è una riserva preziosa
  return v;
}

function bestScore(ctx, dice) {
  const raw = rawScores(dice);
  let best = -Infinity;
  let cat = ctx.open[0];
  for (const c of ctx.open) {
    const v = gain(ctx, c, dice, raw);
    if (v > best) {
      best = v;
      cat = c;
    }
  }
  if (ctx.yatzy50 && isYatzy(dice)) best += RULES.YATZY_BONUS;
  return { value: best, cat };
}

/** Maschere di dadi da tenere, senza doppioni (stessi valori tenuti). */
function masks(dice) {
  const seen = new Set();
  const out = [];
  for (let m = 0; m < 32; m++) {
    const kept = dice.filter((_, i) => m & (1 << i)).sort();
    const key = kept.join('');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ mask: m, kept });
  }
  return out;
}

const d6 = (rng) => 1 + Math.floor(rng() * 6);

function sampleValue(ctx, kept, rollsLeft, rng, samples, inner) {
  let total = 0;
  const free = 5 - kept.length;
  for (let s = 0; s < samples; s++) {
    const dice = kept.slice();
    for (let k = 0; k < free; k++) dice.push(d6(rng));
    if (rollsLeft <= 1 || !inner) total += bestScore(ctx, dice).value;
    else total += Math.max(bestScore(ctx, dice).value, bestHold(ctx, dice, rollsLeft - 1, rng, inner, 0).value);
  }
  return total / samples;
}

/** Miglior gruppo di dadi da tenere prima del prossimo lancio. */
function bestHold(ctx, dice, rollsLeft, rng, samples, inner) {
  let best = { value: -Infinity, mask: 0 };
  for (const { mask, kept } of masks(dice)) {
    if (kept.length === 5) continue;
    const v = sampleValue(ctx, kept, rollsLeft, rng, samples, inner);
    if (v > best.value) best = { value: v, mask };
  }
  return best;
}

/**
 * Prossima mossa del bot per il turno in corso.
 * @param {import('../core/game.js').Game} game
 * @param {{skill?:number, rng?:()=>number}} [o]
 * @returns {{type:'roll'}|{type:'hold',i:number}|{type:'select',cat:string}|{type:'confirm'}}
 */
export function botMove(game, { skill = 0.7, rng = Math.random } = {}) {
  const d = game.dice;
  if (!d.hasRolled) return { type: 'roll' };
  const ctx = context(game, skill);
  if (game.selected && game.canSelect(game.selected)) return { type: 'confirm' };

  if (d.rollsLeft > 0 && game.canRoll()) {
    const plan = game._botPlan;
    let target = plan && plan.turnId === game.turnId && plan.rollsUsed === d.rollsUsed ? plan : null;
    if (!target) {
      const samples = Math.round(18 + skill * 50);
      const inner = skill >= 0.6 && d.rollsLeft >= 2 ? Math.round(6 + skill * 8) : 0;
      const now = bestScore(ctx, d.values);
      const hold = bestHold(ctx, d.values, d.rollsLeft, rng, inner ? Math.round(samples / 3) : samples, inner);
      let mask = hold.mask;
      // errori dei boss meno bravi: tiene qualcosa a caso o si ferma troppo presto
      if (rng() > skill * 0.9 + 0.1) mask = Math.floor(rng() * 32);
      const stop = now.value >= hold.value || (rng() > skill + 0.25 && now.value > 0);
      target = { turnId: game.turnId, rollsUsed: d.rollsUsed, stop, mask };
      game._botPlan = target;
    }
    if (!target.stop) {
      for (let i = 0; i < 5; i++) {
        const want = Boolean(target.mask & (1 << i));
        if (d.held[i] !== want && (want ? game.canHold(i) : !game.turnState.frozen?.includes(i))) return { type: 'hold', i };
      }
      if (game.canRoll()) return { type: 'roll' };
    }
  }
  let { cat } = bestScore(ctx, d.values);
  if (rng() > skill * 0.8 + 0.2 && ctx.open.length > 1) {
    // sceglie una casella un po' peggiore
    const raw = rawScores(d.values);
    const ranked = [...ctx.open].sort((a, b) => gain(ctx, b, d.values, raw) - gain(ctx, a, d.values, raw));
    cat = ranked[Math.min(ranked.length - 1, 1 + Math.floor(rng() * 2))];
  }
  if (!game.canSelect(cat)) cat = ctx.open.find((c) => game.canSelect(c)) ?? game.current.card.openCategories()[0];
  return { type: 'select', cat };
}

/** Applica una mossa al motore (usato dai test e dalle simulazioni). */
export function applyMove(game, move) {
  switch (move.type) {
    case 'roll':
      return game.roll();
    case 'hold':
      return game.toggleHold(move.i);
    case 'select':
      return game.select(move.cat);
    case 'confirm':
      return game.confirm();
    default:
      throw new Error(`mossa sconosciuta ${move.type}`);
  }
}

/** Gioca un intero turno del giocatore corrente (simulazioni). */
export function playTurn(game, o) {
  for (let guard = 0; guard < 60; guard++) {
    const m = botMove(game, o);
    applyMove(game, m);
    if (m.type === 'confirm') return game.endTurn();
  }
  throw new Error('il bot non ha finito il turno');
}
