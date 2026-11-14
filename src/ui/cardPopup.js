/**
 * Dettaglio di una carta della mano: carta grande, descrizione e pulsante USA
 * (oppure il motivo per cui ora non si può usare). Vive dentro il tavolo.
 * Usato anche per scegliere una carta dell'avversario (Prigione Temporale).
 */
import { h } from './dom.js';
import { bigCard, miniCard, CARD_BACK } from './cardArt.js';
import { play, EASE } from '../anim/animations.js';

export class CardPopup {
  constructor({ host }) {
    this.host = host;
    this.el = null;
  }

  get open() {
    return Boolean(this.el);
  }

  async close() {
    const el = this.el;
    if (!el) return;
    this.el = null;
    await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' });
    el.remove();
  }

  #mount(el) {
    this.el = el;
    this.host.append(el);
    play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
    const panel = el.querySelector('.cp-panel');
    play(panel, [{ transform: 'scale(.7) translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: EASE.back });
  }

  /** Mostra una carta della mano. */
  showCard({ entry, availability, onUse }) {
    const face = bigCard(entry.id);
    const use = h(
      'button',
      { class: `btn btn-menu primary${availability.ok ? '' : ' is-disabled'}`, type: 'button', disabled: !availability.ok, onclick: () => availability.ok && onUse() },
      'USA LA CARTA',
    );
    const why = availability.ok ? null : h('div', { class: 'cp-reason' }, availability.reason);
    const el = h(
      'div',
      { class: 'card-popup', onpointerdown: (e) => { if (e.target === el) this.close(); } },
      h('div', { class: 'cp-panel' }, face, why, h('div', { class: 'cp-actions' }, h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => this.close() }, 'CHIUDI'), use)),
    );
    this.#mount(el);
  }

  /** Scelta di una carta avversaria. */
  pickOpponentCard({ cards, isLocked, title, onPick, onCancel, hidden = false }) {
    const row = h('div', { class: 'cp-pick-row' });
    for (const c of cards) {
      const locked = isLocked(c);
      // carte dell'avversario: si vedono solo coperte
      const m = hidden
        ? h('button', { class: `card-face mini card-hidden${locked ? ' is-locked' : ''}`, type: 'button', 'aria-label': 'Carta coperta', dataset: { uid: String(c.uid) }, html: CARD_BACK, onpointerdown: (e) => (e.preventDefault(), !locked && onPick(c.uid)) })
        : miniCard(c, { locked, onTap: (uid) => !locked && onPick(uid) });
      row.append(m);
    }
    const el = h(
      'div',
      { class: 'card-popup' },
      h(
        'div',
        { class: 'cp-panel cp-pick' },
        h('div', { class: 'cp-title' }, title),
        row,
        h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => onCancel() }, 'ANNULLA'),
      ),
    );
    this.#mount(el);
  }
}
