/**
 * Economia: casse (piccola, media, grande, gratuita giornaliera), offerte del
 * giorno, ricompense in monete, livello del giocatore e rango online.
 * Logica pura: niente DOM, niente salvataggi.
 */
import { RARITY, RARITY_ORDER, ITEMS, droppable, rarityRank } from './catalog.js';

/* ---------------- CASSE ---------------- */
/** odds in percentuale per rarità; guarantee = rarità minima di almeno un oggetto */
export const CHESTS = {
  daily: {
    id: 'daily',
    name: 'Cassa gratuita',
    cost: 0,
    items: 1,
    coins: [20, 60],
    odds: { common: 62, uncommon: 26, rare: 9, epic: 2.6, legendary: 0.4, mythic: 0 },
  },
  small: {
    id: 'small',
    name: 'Cassa piccola',
    cost: 150,
    items: 1,
    coins: [0, 0],
    odds: { common: 58, uncommon: 28, rare: 10, epic: 3.4, legendary: 0.6, mythic: 0 },
  },
  medium: {
    id: 'medium',
    name: 'Cassa media',
    cost: 450,
    items: 2,
    coins: [20, 80],
    guarantee: 'uncommon',
    odds: { common: 30, uncommon: 34, rare: 22, epic: 10, legendary: 3.2, mythic: 0.6, absurd: 0.2 },
  },
  large: {
    id: 'large',
    name: 'Cassa grande',
    cost: 1200,
    items: 3,
    coins: [60, 200],
    guarantee: 'rare',
    odds: { common: 8, uncommon: 22, rare: 34, epic: 22, legendary: 10.2, mythic: 3, absurd: 0.8 },
  },
};

export const SHOP_CHESTS = ['small', 'medium', 'large'];
export const DAILY_MS = 24 * 60 * 60 * 1000;

export function pickRarity(odds, rng) {
  const total = RARITY_ORDER.reduce((s, r) => s + (odds[r] || 0), 0);
  let x = rng() * total;
  for (const r of RARITY_ORDER) {
    x -= odds[r] || 0;
    if (x < 0) return r;
  }
  return RARITY_ORDER.findLast((r) => odds[r] > 0);
}

/**
 * Estrae il contenuto di una cassa. Gli oggetti già posseduti diventano monete.
 * @param {string} chestId
 * @param {Set<string>|string[]} owned oggetti già posseduti
 * @param {() => number} rng
 * @returns {{items:{id:string,rarity:string,dup:boolean,coins:number}[], coins:number}}
 */
export function rollChest(chestId, owned, rng) {
  const chest = CHESTS[chestId];
  if (!chest) throw new Error(`Cassa sconosciuta: ${chestId}`);
  const have = new Set(owned);
  const rarities = [];
  for (let i = 0; i < chest.items; i++) rarities.push(pickRarity(chest.odds, rng));
  if (chest.guarantee && !rarities.some((r) => rarityRank(r) >= rarityRank(chest.guarantee))) {
    rarities[rarities.length - 1] = chest.guarantee;
  }
  rarities.sort((a, b) => rarityRank(a) - rarityRank(b)); // la più rara si rivela per ultima
  const got = [];
  for (const r of rarities) {
    const pool = droppable(r);
    // prima gli oggetti nuovi: i doppioni solo se la rarità è completa
    const fresh = pool.filter((it) => !have.has(it.id) && !got.some((g) => g.id === it.id));
    const list = fresh.length ? fresh : pool;
    const it = list[Math.floor(rng() * list.length)];
    const dup = have.has(it.id) || got.some((g) => g.id === it.id);
    got.push({ id: it.id, rarity: r, dup, coins: dup ? RARITY[r].dup : 0 });
    have.add(it.id);
  }
  const [lo, hi] = chest.coins;
  const bonus = hi > 0 ? lo + Math.floor(rng() * (hi - lo + 1)) : 0;
  return { items: got, coins: bonus + got.reduce((s, g) => s + g.coins, 0), bonus };
}

/* ---------------- OFFERTE DEL GIORNO ---------------- */
export const PRICE = { common: 90, uncommon: 220, rare: 480, epic: 1100, legendary: 2600, mythic: 6000, absurd: 15000 };

/** Chiave del giorno (ora locale): le offerte cambiano a mezzanotte. */
export function dayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 4 oggetti in vetrina, uguali per tutti nello stesso giorno. */
export function dailyOffers(key = dayKey()) {
  const rng = seeded(`offerte-${key}`);
  const slots = [
    ['uncommon', 'rare'],
    ['rare', 'epic'],
    ['epic', 'legendary'],
    ['common', 'uncommon'],
  ];
  const out = [];
  for (const options of slots) {
    const r = options[Math.floor(rng() * options.length)];
    const pool = droppable(r).filter((it) => !out.some((o) => o.id === it.id));
    const it = pool[Math.floor(rng() * pool.length)];
    out.push({ id: it.id, rarity: r, price: PRICE[r] });
  }
  return out;
}

/* ---------------- RICOMPENSE ---------------- */
/** Monete di un livello normale (1..100) al primo completamento. */
export function levelCoins(n, stars = 1) {
  const base = Math.round(30 + n * 3.6);
  return base + Math.round(base * 0.15 * (stars - 1));
}

/** Monete di un boss (1..10) al primo completamento. */
export function bossCoins(k) {
  return 250 + k * 150;
}

/** Le partite rigiocate valgono solo una parte. */
export const REPLAY_FACTOR = 0.25;

export const ONLINE_COINS = { win: 140, loss: 30, draw: 60 };

/* ---------------- LIVELLO DEL GIOCATORE ---------------- */
export function xpForLevel(level) {
  return 100 + (level - 1) * 45;
}

export function levelFromXp(xp) {
  let level = 1;
  let left = Math.max(0, xp | 0);
  while (left >= xpForLevel(level)) {
    left -= xpForLevel(level);
    level++;
  }
  return { level, into: left, need: xpForLevel(level) };
}

export const XP = { level: 25, boss: 160, onlineWin: 90, onlineLoss: 35, local: 30, chest: 5 };

/* ---------------- RANGO ONLINE ---------------- */
export const RANKS = [
  { id: 'bronze', name: 'Bronzo', min: 0, color: '#c47a3a' },
  { id: 'silver', name: 'Argento', min: 150, color: '#aab4c4' },
  { id: 'gold', name: 'Oro', min: 350, color: '#ffc531' },
  { id: 'platinum', name: 'Platino', min: 600, color: '#5fe0d0' },
  { id: 'diamond', name: 'Diamante', min: 900, color: '#6fb6ff' },
  { id: 'master', name: 'Maestro', min: 1250, color: '#b06bff' },
  { id: 'champion', name: 'Campione', min: 1700, color: '#ff4d6d' },
  { id: 'legend', name: 'Leggenda', min: 2200, color: '#ffe14d' },
];

export function rankOf(points = 0) {
  let k = 0;
  for (let i = 0; i < RANKS.length; i++) if (points >= RANKS[i].min) k = i;
  const r = RANKS[k];
  const next = RANKS[k + 1] || null;
  return { ...r, index: k, next, progress: next ? (points - r.min) / (next.min - r.min) : 1 };
}

/**
 * Punti rango dopo una partita online.
 * @param {number} mine punti miei · @param {number} theirs punti avversario
 * @param {'win'|'loss'|'draw'} outcome
 */
export function rankDelta(mine, theirs, outcome, streak = 0) {
  const diff = (theirs || 0) - (mine || 0);
  if (outcome === 'win') return clamp(Math.round(28 + diff / 40 + Math.min(streak, 3) * 4), 12, 55);
  if (outcome === 'loss') return -clamp(Math.round(18 - diff / 60), 6, 30);
  return clamp(Math.round(diff / 50), -8, 8);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function itemName(id) {
  return ITEMS[id]?.name ?? id;
}
