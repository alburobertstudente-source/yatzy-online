/**
 * Tradizioni della casa (i "meme" degli amici), decise in base al punteggio:
 *  - doctorSigned:  Full segnato nella casella Full → si firma il contratto col Dottore
 *  - doctorRefused: Full fatto ma segnato altrove (casella Full ancora libera)
 *                   → rifiuti il Dottore, niente visita
 *  - satan:         0 nella casella Yatzy → rinuncia a Satana
 */
import { isFullHouse } from './scoring.js';

/**
 * @param {object} o
 * @param {string} o.category casella segnata
 * @param {number} o.score punteggio segnato
 * @param {number[]} o.dice dadi del turno
 * @param {boolean} o.fullHouseOpen la casella Full del giocatore è ancora libera dopo aver segnato
 * @returns {'doctorSigned'|'doctorRefused'|'satan'|null}
 */
export function detectMeme({ category, score, dice, fullHouseOpen }) {
  if (category === 'fullHouse' && score > 0) return 'doctorSigned';
  if (category === 'yatzy' && score === 0) return 'satan';
  if (category !== 'fullHouse' && fullHouseOpen && isFullHouse(dice)) return 'doctorRefused';
  return null;
}
