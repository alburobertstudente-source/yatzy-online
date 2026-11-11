import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Challenge, goalMet, goalLabel, solve } from '../src/campaign/challenge.js';
import { levelInfo, WORLDS, isBossLevel } from '../src/campaign/campaign.js';
import { BOSSES, bossHooks } from '../src/campaign/bosses.js';
import { LEVEL_DATA } from '../src/campaign/levelData.js';
import { Game } from '../src/core/game.js';
import { botMove, applyMove, playTurn } from '../src/ai/bot.js';
import { createSeededRandom } from '../src/core/probability.js';

test('campagna: 100 livelli, 10 boss, 90 sfide con lanci e stelle', () => {
  assert.equal(WORLDS.length, 10);
  assert.equal(BOSSES.length, 10);
  assert.equal(LEVEL_DATA.length, 90);
  for (let n = 1; n <= 100; n++) {
    const info = levelInfo(n);
    assert.equal(info.boss, isBossLevel(n));
    assert.ok(info.coins > 0 && info.xp > 0);
    if (!info.boss) {
      assert.ok(info.rolls >= info.goals.length);
      assert.ok(info.stars[0] >= 1 && info.stars[1] > info.stars[0]);
      assert.ok(info.title.length > 2);
    }
  }
  // i boss diventano sempre più bravi e pagano di più
  for (let k = 1; k < 10; k++) {
    assert.ok(BOSSES[k].skill > BOSSES[k - 1].skill);
    assert.ok(levelInfo((k + 1) * 10).coins > levelInfo(k * 10).coins);
  }
  // la difficoltà (vittorie del risolutore) scende dal primo all'ultimo mondo
  const avg = (w) => LEVEL_DATA.filter((l) => Math.ceil(l.n / 10) === w).reduce((s, l) => s + l.p, 0) / 9;
  assert.ok(avg(1) > avg(5) && avg(5) > avg(10));
});

test('obiettivi delle sfide', () => {
  assert.ok(goalMet({ t: 'full' }, [2, 2, 3, 3, 3]));
  assert.ok(!goalMet({ t: 'full' }, [2, 2, 3, 3, 4]));
  assert.ok(goalMet({ t: 'kindOf', n: 3, v: 6 }, [6, 6, 1, 6, 2]));
  assert.ok(goalMet({ t: 'large' }, [2, 3, 4, 5, 6]));
  assert.ok(goalMet({ t: 'even' }, [2, 4, 6, 2, 2]));
  assert.ok(goalMet({ t: 'exact', v: 17 }, [5, 5, 5, 1, 1]));
  assert.ok(goalMet({ t: 'twoPair' }, [4, 4, 2, 2, 1]));
  assert.ok(goalMet({ t: 'distinct' }, [1, 2, 3, 4, 6]));
  assert.equal(goalLabel({ t: 'kindOf', n: 3, v: 6 }), 'Tre 6');
  assert.equal(goalLabel({ t: 'kind', n: 4 }), 'Poker');
});

test('sfida: tieni, lancia, completa, i dadi ripartono; fallisce senza lanci', () => {
  const level = { goals: [{ t: 'pair' }, { t: 'sumMin', v: 5 }], rolls: 3, stars: [1, 2] };
  const ch = new Challenge(level, createSeededRandom(4));
  assert.equal(ch.canHold(), false);
  ch.roll();
  assert.ok(ch.claimable().includes(1)); // somma ≥ 5 sempre vera
  ch.toggleHold(0);
  ch.claim(1);
  assert.equal(ch.rolledOnce, false);
  assert.deepEqual(ch.held, [false, false, false, false, false]);
  const lose = new Challenge({ goals: [{ t: 'kind', n: 5 }], rolls: 1, stars: [1, 2] }, () => 0.99 * Math.random());
  lose.values = [1, 2, 3, 4, 5];
  lose.rollsLeft = 0;
  lose.rolledOnce = true;
  assert.ok(lose.failed);
});

test('il risolutore vince i livelli più spesso all\'inizio che alla fine', () => {
  const rate = (n) => {
    const lv = levelInfo(n);
    let w = 0;
    for (let s = 0; s < 300; s++) if (solve(lv, createSeededRandom(s + 999)).done) w++;
    return w / 300;
  };
  assert.ok(rate(1) > 0.85);
  assert.ok(rate(99) < rate(1));
});

function playBossGame(k, seed, humanSkill = 0.8) {
  const rng = createSeededRandom(seed);
  const g = new Game({ cards: false, rng, hooks: bossHooks(BOSSES[k - 1]) });
  while (g.phase === 'playing') playTurn(g, { skill: g.current.id === 'blue' ? BOSSES[k - 1].skill : humanSkill, rng });
  return g;
}

test('boss: ogni partita contro ogni boss arriva alla fine con gli effetti attivi', () => {
  for (let k = 1; k <= 10; k++) {
    const g = playBossGame(k, 100 + k);
    assert.equal(g.phase, 'over');
    assert.ok(g.players.every((p) => p.card.isComplete()));
  }
});

test('boss: effetti specifici', () => {
  // granchio: un dado non si può tenere
  const crab = new Game({ cards: false, rng: createSeededRandom(1), hooks: bossHooks(BOSSES[1]) });
  const pinched = crab.turnState.noHold[0];
  crab.roll();
  assert.equal(crab.canHold(pinched), false);
  assert.throws(() => crab.toggleHold(pinched), /non può essere conservato/);
  // golem: dopo il primo lancio un dado è congelato
  const golem = new Game({ cards: false, rng: createSeededRandom(2), hooks: bossHooks(BOSSES[3]) });
  const r = golem.roll();
  assert.equal(r.boss.type, 'freeze');
  const f = r.boss.dice[0];
  assert.ok(golem.dice.held[f]);
  assert.throws(() => golem.toggleHold(f), /congelato/);
  // caos: una casella maledetta
  const chaos = new Game({ cards: false, rng: createSeededRandom(3), hooks: bossHooks(BOSSES[6]) });
  const cat = chaos.turnState.blocked[0];
  chaos.roll();
  assert.equal(chaos.canSelect(cat), false);
  assert.throws(() => chaos.select(cat), /maledetta/);
  // vampiro: bonus a 73
  const vamp = new Game({ cards: false, rng: createSeededRandom(4), hooks: bossHooks(BOSSES[7]) });
  assert.equal(vamp.player('red').card.bonusThreshold, 73);
  // tempesta: 2 lanci nei round pari
  const storm = playBossGame(9, 55);
  assert.equal(storm.phase, 'over');
  // drago: ruba punti (ogni 3 round) e li dà al boss
  const dragon = playBossGame(6, 7);
  assert.ok(dragon.player('blue').card.cardPointsTotal() > 0);
  assert.equal(dragon.player('red').card.stolenTotal(), dragon.player('blue').card.cardPointsTotal());
});

test('bot: i boss più bravi fanno più punti; le mosse sono sempre valide', () => {
  const avg = (skill) => {
    let t = 0;
    for (let s = 0; s < 12; s++) {
      const rng = createSeededRandom(500 + s);
      const g = new Game({ cards: false, rng });
      while (g.phase === 'playing') playTurn(g, { skill, rng });
      t += g.results().totals.blue;
    }
    return t / 12;
  };
  assert.ok(avg(0.9) > avg(0.2) + 40);
  // con le carte attive il bot non tocca la fase delle carte: il motore lo vieta
  const g = new Game({ rng: createSeededRandom(1) });
  assert.ok(g.mustDraw);
  assert.throws(() => applyMove(g, botMove(g)), /gratta/);
});
