import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCategory, scoreAll, contributingDice, notableCombo, longestRun, isFullHouse, isYatzy } from '../src/core/scoring.js';

test('sezione superiore: somma solo i dadi della faccia', () => {
  const d = [1, 1, 3, 3, 6];
  assert.equal(scoreCategory('ones', d), 2);
  assert.equal(scoreCategory('twos', d), 0);
  assert.equal(scoreCategory('threes', d), 6);
  assert.equal(scoreCategory('fours', d), 0);
  assert.equal(scoreCategory('fives', d), 0);
  assert.equal(scoreCategory('sixes', d), 6);
  assert.equal(scoreCategory('sixes', [6, 6, 6, 6, 6]), 30);
});

test('tris e poker: somma di tutti i dadi', () => {
  assert.equal(scoreCategory('threeKind', [4, 4, 4, 2, 1]), 15);
  assert.equal(scoreCategory('threeKind', [4, 4, 3, 2, 1]), 0);
  assert.equal(scoreCategory('threeKind', [5, 5, 5, 5, 2]), 22);
  assert.equal(scoreCategory('fourKind', [5, 5, 5, 5, 2]), 22);
  assert.equal(scoreCategory('fourKind', [5, 5, 5, 2, 2]), 0);
  assert.equal(scoreCategory('fourKind', [6, 6, 6, 6, 6]), 30);
});

test('full: 25 solo con tris + coppia', () => {
  assert.equal(scoreCategory('fullHouse', [2, 2, 3, 3, 3]), 25);
  assert.equal(scoreCategory('fullHouse', [2, 2, 3, 3, 4]), 0);
  assert.equal(scoreCategory('fullHouse', [3, 3, 3, 3, 2]), 0);
  assert.equal(scoreCategory('fullHouse', [4, 4, 4, 4, 4]), 0, 'senza jolly lo Yatzy non è un full');
  assert.equal(scoreCategory('fullHouse', [4, 4, 4, 4, 4], { joker: true }), 25, 'con jolly sì');
  assert.equal(isFullHouse([1, 6, 1, 6, 6]), true);
});

test('scale: piccola 30 (4 consecutivi), grande 40 (5 consecutivi)', () => {
  assert.equal(scoreCategory('smallStraight', [1, 2, 3, 4, 6]), 30);
  assert.equal(scoreCategory('smallStraight', [3, 4, 5, 6, 6]), 30);
  assert.equal(scoreCategory('smallStraight', [2, 3, 4, 5, 2]), 30);
  assert.equal(scoreCategory('smallStraight', [1, 2, 3, 5, 6]), 0);
  assert.equal(scoreCategory('smallStraight', [1, 2, 3, 4, 5]), 30);
  assert.equal(scoreCategory('largeStraight', [1, 2, 3, 4, 5]), 40);
  assert.equal(scoreCategory('largeStraight', [6, 5, 4, 3, 2]), 40);
  assert.equal(scoreCategory('largeStraight', [1, 2, 3, 4, 6]), 0);
  assert.equal(scoreCategory('largeStraight', [3, 3, 3, 3, 3], { joker: true }), 40);
  assert.equal(longestRun([1, 3, 4, 5, 5]), 3);
});

test('yatzy 50 e chance = somma', () => {
  assert.equal(scoreCategory('yatzy', [3, 3, 3, 3, 3]), 50);
  assert.equal(scoreCategory('yatzy', [3, 3, 3, 3, 2]), 0);
  assert.equal(scoreCategory('chance', [1, 2, 3, 4, 6]), 16);
  assert.equal(isYatzy([1, 1, 1, 1, 1]), true);
});

test('scoreAll copre tutte le 13 categorie', () => {
  const all = scoreAll([2, 3, 4, 5, 6]);
  assert.equal(Object.keys(all).length, 13);
  assert.equal(all.largeStraight, 40);
  assert.equal(all.smallStraight, 30);
  assert.equal(all.chance, 20);
});

test('dadi che contribuiscono (per l\'animazione)', () => {
  assert.deepEqual(contributingDice('twos', [2, 1, 2, 5, 2], 6), [0, 2, 4]);
  assert.deepEqual(contributingDice('chance', [2, 1, 2, 5, 2], 12), [0, 1, 2, 3, 4]);
  assert.deepEqual(contributingDice('threeKind', [2, 1, 2, 5, 2], 0), []);
  const ss = contributingDice('smallStraight', [1, 2, 3, 4, 4], 30);
  assert.equal(ss.length, 4);
  assert.deepEqual(ss.map((i) => [1, 2, 3, 4, 4][i]).sort(), [1, 2, 3, 4]);
});

test('combinazioni notevoli', () => {
  assert.equal(notableCombo([5, 5, 5, 5, 5]), 'yatzy');
  assert.equal(notableCombo([1, 2, 3, 4, 5]), 'largeStraight');
  assert.equal(notableCombo([1, 2, 3, 4, 6]), 'smallStraight');
  assert.equal(notableCombo([1, 1, 4, 4, 4]), 'fullHouse');
  assert.equal(notableCombo([1, 4, 4, 4, 4]), 'fourKind');
  assert.equal(notableCombo([1, 2, 4, 4, 6]), null);
});
