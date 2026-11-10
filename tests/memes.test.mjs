import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectMeme } from '../src/core/memes.js';
import { scriptedGame, playTurn } from './helpers.mjs';

test('Full segnato nel Full: contratto col Dottore', () => {
  assert.equal(detectMeme({ category: 'fullHouse', score: 25, dice: [2, 2, 3, 3, 3], fullHouseOpen: false }), 'doctorSigned');
});

test('Full fatto ma segnato altrove: rifiuti il Dottore', () => {
  assert.equal(detectMeme({ category: 'threes', score: 9, dice: [2, 2, 3, 3, 3], fullHouseOpen: true }), 'doctorRefused');
  assert.equal(detectMeme({ category: 'chance', score: 13, dice: [3, 2, 3, 2, 3], fullHouseOpen: true }), 'doctorRefused');
});

test('Full già firmato in passato: nessun rifiuto', () => {
  assert.equal(detectMeme({ category: 'threes', score: 9, dice: [2, 2, 3, 3, 3], fullHouseOpen: false }), null);
});

test('0 nel Yatzy: rinuncia a Satana', () => {
  assert.equal(detectMeme({ category: 'yatzy', score: 0, dice: [1, 2, 3, 4, 6], fullHouseOpen: true }), 'satan');
  assert.equal(detectMeme({ category: 'yatzy', score: 0, dice: [2, 2, 3, 3, 3], fullHouseOpen: true }), 'satan', 'Satana ha la precedenza');
});

test('nessun meme negli altri casi', () => {
  assert.equal(detectMeme({ category: 'yatzy', score: 50, dice: [4, 4, 4, 4, 4], fullHouseOpen: true }), null);
  assert.equal(detectMeme({ category: 'fullHouse', score: 0, dice: [1, 2, 3, 4, 6], fullHouseOpen: false }), null);
  assert.equal(detectMeme({ category: 'chance', score: 22, dice: [4, 4, 4, 4, 6], fullHouseOpen: true }), null);
  assert.equal(detectMeme({ category: 'chance', score: 25, dice: [5, 5, 5, 5, 5], fullHouseOpen: true }), null, 'lo Yatzy non è un Full');
});

test('il motore indica il meme nel risultato del punteggio', () => {
  const { game, roller } = scriptedGame();
  assert.equal(playTurn(game, roller, [6, 6, 1, 1, 1], 'fullHouse').meme, 'doctorSigned');
  assert.equal(playTurn(game, roller, [6, 6, 1, 1, 1], 'sixes').meme, 'doctorRefused');
  assert.equal(playTurn(game, roller, [1, 2, 3, 4, 6], 'yatzy').meme, 'satan');
  assert.equal(playTurn(game, roller, [2, 2, 5, 5, 5], 'fives').meme, 'doctorRefused');
  // il rosso ha già firmato col Dottore: un altro Full segnato altrove non è un rifiuto
  assert.equal(playTurn(game, roller, [2, 2, 5, 5, 5], 'fives').meme, null);
});
