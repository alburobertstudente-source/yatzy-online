/**
 * Mano del giocatore di turno: fino a 5 mini carte sopra la tabella,
 * più un indicatore se l'avversario gli ha lanciato una maledizione.
 */
import { h } from './dom.js';
import { miniCard, MINI } from './cardArt.js';
import { CARD_RULES } from '../config.js';

export class HandView {
  constructor({ onCardTap, onStatusTap }) {
    this.onCardTap = onCardTap;
    this.row = h('div', { class: 'hand-row' });
    this.status = h('button', { class: 'hand-status', type: 'button', 'aria-label': 'Maledizione in arrivo', onclick: () => onStatusTap?.() });
    this.el = h('section', { class: 'hand', 'aria-label': 'Le tue carte' }, this.row, this.status);
    this.key = '';
  }

  /**
   * @param {import('../core/game.js').Game} game
   * @param {{interactive?: boolean}} [o]
   */
  render(game, { interactive = true, player = null } = {}) {
    const me = player || game.current;
    const locked = (c) => game.isCardLocked(c);
    const key = JSON.stringify([me.id, me.hand.map((c) => [c.uid, locked(c)]), interactive, me.status.curse?.type ?? null]);
    this.el.dataset.color = me.id;
    this.el.classList.toggle('is-interactive', interactive);
    this.status.classList.toggle('is-on', Boolean(me.status.curse));
    this.status.innerHTML = me.status.curse ? MINI.curse : '';
    if (key === this.key) return;
    this.key = key;
    this.row.replaceChildren();
    for (let i = 0; i < CARD_RULES.HAND_MAX; i++) {
      const c = me.hand[i];
      if (c) this.row.append(miniCard(c, { locked: locked(c), onTap: (uid) => this.onCardTap?.(uid) }));
      else this.row.append(h('div', { class: 'hand-slot' }));
    }
  }

  cardEl(uid) {
    return this.row.querySelector(`[data-uid="${uid}"]`);
  }

  /** Prima casella libera (dove arriva la carta appena grattata). */
  nextSlotEl() {
    return this.row.querySelector('.hand-slot') || this.row.lastElementChild;
  }
}
