/**
 * Profilo del giocatore: monete, oggetti, equipaggiamento, campagna,
 * statistiche, rango e cassa giornaliera. Funzioni pure sul dato JSON
 * (lo stesso che viene salvato sul telefono e sul server).
 */
import { ITEMS, BASE_ITEMS, DEFAULT_EQUIP, CATEGORIES, OPTIONAL, SKIN_TONES } from './catalog.js';
import { CHESTS, DAILY_MS, rollChest, levelFromXp, rankOf, rankDelta, ONLINE_COINS, XP, dailyOffers, dayKey } from './economy.js';

export const PROFILE_VERSION = 1;

export function createProfile(username = '') {
  return {
    v: PROFILE_VERSION,
    username,
    coins: 200,
    xp: 0,
    owned: [...BASE_ITEMS],
    equip: { ...DEFAULT_EQUIP },
    skinTone: 0,
    campaign: { best: 0, stars: {} },
    stats: { games: 0, wins: 0, onlineGames: 0, onlineWins: 0, yatzys: 0, bosses: 0, levels: 0, chests: 0, bestScore: 0, coinsEarned: 0 },
    rank: { points: 0, best: 0, streak: 0 },
    daily: { last: 0 },
    bought: {},
    rev: 0,
    updatedAt: 0,
  };
}

/** Ripara un profilo letto da disco o dalla rete (campi mancanti o sbagliati). */
export function normalizeProfile(p) {
  const base = createProfile(typeof p?.username === 'string' ? p.username : '');
  if (!p || typeof p !== 'object') return base;
  const num = (v, d = 0) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : d);
  const out = {
    ...base,
    coins: num(p.coins, base.coins),
    xp: num(p.xp),
    owned: [...new Set([...BASE_ITEMS, ...(Array.isArray(p.owned) ? p.owned.filter((id) => ITEMS[id]) : [])])],
    skinTone: Number.isInteger(p.skinTone) && p.skinTone >= 0 && p.skinTone < SKIN_TONES.length ? p.skinTone : 0,
    campaign: {
      best: Math.min(100, num(p.campaign?.best)),
      stars: Object.fromEntries(Object.entries(p.campaign?.stars || {}).filter(([k, v]) => /^\d+$/.test(k) && Number(k) >= 1 && Number(k) <= 100 && v >= 1 && v <= 3)),
    },
    stats: Object.fromEntries(Object.keys(base.stats).map((k) => [k, num(p.stats?.[k])])),
    rank: { points: num(p.rank?.points), best: num(p.rank?.best), streak: num(p.rank?.streak) },
    daily: { last: num(p.daily?.last) },
    bought: p.bought && typeof p.bought === 'object' ? { ...p.bought } : {},
    rev: num(p.rev),
    updatedAt: num(p.updatedAt),
  };
  out.equip = { ...DEFAULT_EQUIP };
  for (const c of CATEGORIES) {
    const id = p.equip?.[c.id];
    if (id === null && OPTIONAL.has(c.id)) out.equip[c.id] = null;
    else if (id && ITEMS[id]?.cat === c.id && out.owned.includes(id)) out.equip[c.id] = id;
  }
  out.rank.best = Math.max(out.rank.best, out.rank.points);
  return out;
}

const touch = (p) => {
  p.rev = (p.rev || 0) + 1;
  p.updatedAt = Date.now();
  return p;
};

export function owns(p, id) {
  return p.owned.includes(id);
}

export function addCoins(p, n, { earned = true } = {}) {
  p.coins = Math.max(0, p.coins + n);
  if (earned && n > 0) p.stats.coinsEarned += n;
  touch(p);
  return p.coins;
}

export function addXp(p, n) {
  const before = levelFromXp(p.xp).level;
  p.xp += Math.max(0, n);
  touch(p);
  const after = levelFromXp(p.xp).level;
  return { levelUp: after > before, level: after };
}

export function grant(p, id) {
  if (!ITEMS[id]) throw new Error(`Oggetto sconosciuto: ${id}`);
  if (!p.owned.includes(id)) p.owned.push(id);
  touch(p);
}

export function equip(p, cat, id) {
  if (id === null) {
    if (!OPTIONAL.has(cat)) throw new Error('Questa categoria non può restare vuota');
    p.equip[cat] = null;
  } else {
    const it = ITEMS[id];
    if (!it || it.cat !== cat) throw new Error('Oggetto non valido');
    if (!p.owned.includes(id)) throw new Error('Oggetto non posseduto');
    p.equip[cat] = id;
  }
  touch(p);
}

export function setSkinTone(p, k) {
  if (!Number.isInteger(k) || k < 0 || k >= SKIN_TONES.length) throw new Error('Carnagione non valida');
  p.skinTone = k;
  touch(p);
}

/* ---------------- casse ---------------- */
export function dailyReadyAt(p) {
  return (p.daily?.last || 0) + DAILY_MS;
}

export function canClaimDaily(p, now = Date.now()) {
  return now >= dailyReadyAt(p);
}

/**
 * Apre una cassa: paga, estrae, aggiunge oggetti e monete dei doppioni.
 * @returns {ReturnType<typeof rollChest>}
 */
export function openChest(p, chestId, rng, now = Date.now()) {
  const chest = CHESTS[chestId];
  if (!chest) throw new Error('Cassa sconosciuta');
  if (chestId === 'daily') {
    if (!canClaimDaily(p, now)) throw new Error('La cassa gratuita non è ancora pronta');
    p.daily.last = now;
  } else if (p.coins < chest.cost) throw new Error('Monete insufficienti');
  else p.coins -= chest.cost;
  const res = rollChest(chestId, p.owned, rng);
  for (const it of res.items) if (!it.dup) p.owned.push(it.id);
  p.coins += res.coins;
  p.stats.chests++;
  p.xp += XP.chest;
  touch(p);
  return res;
}

/** Compra un oggetto delle offerte del giorno. */
export function buyOffer(p, itemId, now = Date.now()) {
  const key = dayKey(now);
  const offer = dailyOffers(key).find((o) => o.id === itemId);
  if (!offer) throw new Error("Offerta non disponibile oggi");
  if (p.owned.includes(itemId)) throw new Error('Lo possiedi già');
  if (p.coins < offer.price) throw new Error('Monete insufficienti');
  p.coins -= offer.price;
  p.owned.push(itemId);
  p.bought = { [key]: [...(p.bought?.[key] || []), itemId] };
  touch(p);
  return offer;
}

/* ---------------- campagna ---------------- */
/** Il livello n (1..100) si può giocare? */
export function levelUnlocked(p, n) {
  return n >= 1 && n <= 100 && n <= p.campaign.best + 1;
}

/**
 * Registra un livello superato. Monete piene al primo completamento,
 * ridotte nelle ripetizioni; le stelle migliori restano.
 */
export function completeLevel(p, n, { stars = 1, coins, replayCoins, xp, boss = false }) {
  const first = n > p.campaign.best;
  const prevStars = p.campaign.stars[n] || 0;
  const gain = first ? coins : replayCoins;
  if (first) p.campaign.best = n;
  if (stars > prevStars) p.campaign.stars[n] = Math.min(3, stars);
  p.coins += gain;
  p.stats.coinsEarned += gain;
  if (first) {
    p.stats.levels++;
    if (boss) p.stats.bosses++;
  }
  const lv = addXp(p, first ? xp : Math.round(xp / 3));
  return { first, coins: gain, newStars: Math.max(0, stars - prevStars), ...lv };
}

export function totalStars(p) {
  return Object.values(p.campaign.stars).reduce((s, v) => s + v, 0);
}

/* ---------------- partite ---------------- */
export function recordGame(p, { score = 0, yatzys = 0, won = false } = {}) {
  p.stats.games++;
  if (won) p.stats.wins++;
  p.stats.yatzys += yatzys;
  p.stats.bestScore = Math.max(p.stats.bestScore, score);
  touch(p);
}

/**
 * Risultato di una partita online: monete, rango, statistiche.
 * @param {'win'|'loss'|'draw'} outcome
 */
export function recordOnline(p, { outcome, opponentPoints = 0, score = 0, yatzys = 0 }) {
  const delta = rankDelta(p.rank.points, opponentPoints, outcome, p.rank.streak);
  const before = rankOf(p.rank.points);
  p.rank.points = Math.max(0, p.rank.points + delta);
  p.rank.best = Math.max(p.rank.best, p.rank.points);
  p.rank.streak = outcome === 'win' ? p.rank.streak + 1 : 0;
  const coins = ONLINE_COINS[outcome] ?? 0;
  p.coins += coins;
  p.stats.coinsEarned += coins;
  p.stats.onlineGames++;
  if (outcome === 'win') p.stats.onlineWins++;
  recordGame(p, { score, yatzys, won: outcome === 'win' });
  const lv = addXp(p, outcome === 'win' ? XP.onlineWin : XP.onlineLoss);
  const after = rankOf(p.rank.points);
  return { delta, coins, rank: after, promoted: after.index > before.index, demoted: after.index < before.index, ...lv };
}

/** Riassunto pubblico (mostrato all'avversario online e in classifica). */
export function publicCard(p) {
  return {
    username: p.username,
    level: levelFromXp(p.xp).level,
    rank: p.rank.points,
    equip: { ...p.equip },
    skinTone: p.skinTone,
    wins: p.stats.onlineWins,
    campaign: p.campaign.best,
  };
}
