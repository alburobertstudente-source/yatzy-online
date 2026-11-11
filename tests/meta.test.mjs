import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_LIST, CATEGORIES, RARITY_ORDER, BASE_ITEMS, DEFAULT_EQUIP, droppable } from '../src/meta/catalog.js';
import { CHESTS, rollChest, dailyOffers, rankOf, rankDelta, levelFromXp, RANKS, dayKey } from '../src/meta/economy.js';
import * as P from '../src/meta/profile.js';
import { createSeededRandom } from '../src/core/probability.js';

test('catalogo: id unici, ogni categoria ha un oggetto di base e ogni rarità ha oggetti', () => {
  assert.equal(new Set(ITEM_LIST.map((i) => i.id)).size, ITEM_LIST.length);
  assert.ok(ITEM_LIST.length >= 150, `solo ${ITEM_LIST.length} oggetti`);
  for (const c of CATEGORIES) {
    const list = ITEM_LIST.filter((i) => i.cat === c.id);
    assert.ok(list.length >= 9, `${c.id}: pochi oggetti`);
  }
  for (const r of RARITY_ORDER) assert.ok(droppable(r).length >= 10, `rarità ${r} con pochi oggetti`);
  for (const id of BASE_ITEMS) assert.ok(ITEMS[id].base);
  assert.equal(DEFAULT_EQUIP.hat, null);
  assert.equal(DEFAULT_EQUIP.dice, 'dice.classic');
});

test('casse: numero di oggetti, garanzie, doppioni convertiti in monete', () => {
  const rng = createSeededRandom(5);
  for (let k = 0; k < 300; k++) {
    const res = rollChest('large', [], rng);
    assert.equal(res.items.length, 3);
    assert.ok(res.items.some((i) => RARITY_ORDER.indexOf(i.rarity) >= RARITY_ORDER.indexOf('rare')));
    const med = rollChest('medium', [], rng);
    assert.equal(med.items.length, 2);
    assert.ok(med.items.some((i) => i.rarity !== 'common'));
  }
  // con tutto già posseduto ogni oggetto diventa monete
  const all = ITEM_LIST.map((i) => i.id);
  const res = rollChest('small', all, createSeededRandom(9));
  assert.ok(res.items[0].dup && res.items[0].coins > 0);
  assert.equal(res.coins, res.items[0].coins);
});

test('casse: le probabilità rispettano le percentuali', () => {
  const rng = createSeededRandom(77);
  const n = 20000;
  const seen = Object.fromEntries(RARITY_ORDER.map((r) => [r, 0]));
  for (let k = 0; k < n; k++) seen[rollChest('small', [], rng).items[0].rarity]++;
  for (const r of RARITY_ORDER) {
    const want = (CHESTS.small.odds[r] || 0) / 100;
    assert.ok(Math.abs(seen[r] / n - want) < 0.012, `${r}: ${seen[r] / n} invece di ${want}`);
  }
});

test('profilo: apertura casse, monete, cassa giornaliera ogni 24 ore', () => {
  const p = P.createProfile('anna');
  const rng = createSeededRandom(3);
  assert.throws(() => P.openChest(p, 'large', rng), /Monete insufficienti/);
  const t0 = 1_000_000_000_000;
  assert.ok(P.canClaimDaily(p, t0));
  const r = P.openChest(p, 'daily', rng, t0);
  assert.equal(r.items.length, 1);
  assert.ok(P.owns(p, r.items[0].id));
  assert.equal(P.canClaimDaily(p, t0 + 3600_000), false);
  assert.throws(() => P.openChest(p, 'daily', rng, t0 + 3600_000), /non è ancora pronta/);
  assert.ok(P.canClaimDaily(p, t0 + 24 * 3600_000));
  p.coins = 2000;
  const before = p.coins;
  const big = P.openChest(p, 'large', rng, t0);
  assert.equal(p.coins, before - CHESTS.large.cost + big.coins);
  assert.equal(p.stats.chests, 2);
});

test('profilo: equipaggiamento solo di oggetti posseduti, normalizzazione', () => {
  const p = P.createProfile('bob');
  assert.throws(() => P.equip(p, 'hat', 'hat.crown'), /non posseduto/);
  P.grant(p, 'hat.crown');
  P.equip(p, 'hat', 'hat.crown');
  P.equip(p, 'hat', null);
  assert.throws(() => P.equip(p, 'dice', null));
  assert.throws(() => P.equip(p, 'dice', 'hat.crown'));
  const n = P.normalizeProfile({ username: 'x', coins: -5, owned: ['nope', 'dice.gold'], equip: { dice: 'dice.gold', hat: 'hat.crown' }, campaign: { best: 500, stars: { 3: 2, 900: 3 } } });
  assert.equal(n.coins, 0);
  assert.ok(n.owned.includes('dice.gold') && !n.owned.includes('nope'));
  assert.equal(n.equip.dice, 'dice.gold');
  assert.equal(n.equip.hat, null);
  assert.equal(n.campaign.best, 100);
  assert.deepEqual(n.campaign.stars, { 3: 2 });
});

test('offerte del giorno: 4 oggetti diversi, stabili nello stesso giorno, compra', () => {
  const a = dailyOffers('2026-11-11');
  assert.equal(a.length, 4);
  assert.equal(new Set(a.map((o) => o.id)).size, 4);
  assert.deepEqual(a, dailyOffers('2026-11-11'));
  const p = P.createProfile('c');
  p.coins = 100000;
  const now = Date.now();
  const offer = dailyOffers(dayKey(now))[0];
  P.buyOffer(p, offer.id, now);
  assert.ok(P.owns(p, offer.id));
  assert.throws(() => P.buyOffer(p, offer.id, now), /possiedi già/);
});

test('campagna: monete piene la prima volta, ridotte dopo; livelli sbloccati in ordine', () => {
  const p = P.createProfile('d');
  assert.ok(P.levelUnlocked(p, 1));
  assert.ok(!P.levelUnlocked(p, 2));
  const c0 = p.coins;
  const r1 = P.completeLevel(p, 1, { stars: 2, coins: 50, replayCoins: 12, xp: 25 });
  assert.ok(r1.first);
  assert.equal(p.coins, c0 + 50);
  assert.ok(P.levelUnlocked(p, 2));
  const r2 = P.completeLevel(p, 1, { stars: 3, coins: 50, replayCoins: 12, xp: 25 });
  assert.ok(!r2.first);
  assert.equal(r2.coins, 12);
  assert.equal(p.campaign.stars[1], 3);
  assert.equal(P.totalStars(p), 3);
});

test('rango: vittorie fanno salire, sconfitte scendere, mai sotto zero', () => {
  assert.equal(rankOf(0).id, 'bronze');
  assert.equal(rankOf(RANKS[3].min).id, RANKS[3].id);
  assert.ok(rankDelta(100, 100, 'win') > 0);
  assert.ok(rankDelta(100, 100, 'loss') < 0);
  assert.ok(rankDelta(100, 600, 'win') > rankDelta(100, 100, 'win'));
  const p = P.createProfile('e');
  const c0 = p.coins;
  const res = P.recordOnline(p, { outcome: 'loss', opponentPoints: 0 });
  assert.equal(p.rank.points, 0);
  assert.ok(res.coins > 0 && p.coins === c0 + res.coins);
  const w = P.recordOnline(p, { outcome: 'win', opponentPoints: 0, score: 230 });
  assert.ok(w.delta > 0 && p.rank.points === w.delta);
  assert.equal(p.stats.onlineWins, 1);
  assert.equal(p.stats.bestScore, 230);
});

test('livello del giocatore dall\'esperienza', () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(99).level, 1);
});

test('rarità Assurda: solo dadi con effetti e suoni speciali, solo nelle casse media e grande', () => {
  const absurd = ITEM_LIST.filter((i) => i.rarity === 'absurd');
  assert.ok(absurd.length >= 10);
  for (const it of absurd) {
    assert.equal(it.cat, 'dice');
    assert.ok(it.voice && it.landFx && it.fx, `${it.id} senza effetti`);
  }
  assert.ok(!CHESTS.small.odds.absurd && !CHESTS.daily.odds.absurd);
  assert.ok(CHESTS.large.odds.absurd > CHESTS.medium.odds.absurd);
  // ogni dado ha una voce
  for (const it of ITEM_LIST.filter((i) => i.cat === 'dice')) assert.ok(it.voice, `${it.id} senza suono`);
});

test('account robertalbuss: tutto sbloccato (oggetti e livelli), anche con maiuscole diverse', async () => {
  const { ITEM_LIST: all } = await import('../src/meta/catalog.js');
  const vip = P.normalizeProfile({ username: 'RobertAlbuss', owned: [] });
  assert.equal(vip.owned.length, all.length);
  assert.ok(P.levelUnlocked(vip, 100));
  P.equip(vip, 'dice', 'dice.dj');
  P.equip(vip, 'hat', 'hat.cosmic');
  assert.equal(vip.equip.dice, 'dice.dj');
  const normal = P.normalizeProfile({ username: 'robertalbus', owned: [] });
  assert.ok(normal.owned.length < 20);
  assert.ok(!P.levelUnlocked(normal, 2));
});
