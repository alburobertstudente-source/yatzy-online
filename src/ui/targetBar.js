/**
 * Barra in alto durante l'uso di una carta: istruzioni, eventuali scelte
 * (+1/−1, numero 1–6) e i pulsanti ANNULLA / OK. Copre l'intestazione.
 */
import { h } from './dom.js';
import { CARD_ICONS } from './cardArt.js';
import { CARDS } from '../core/cards.js';
import { pipsSvg } from './icons.js';
import { play, EASE } from '../anim/animations.js';

export class TargetBar {
  constructor({ host }) {
    this.host = host;
    this.el = null;
  }

  get open() {
    return Boolean(this.el);
  }

  /**
   * @param {object} o
   * @param {string} o.cardId
   * @param {string} o.prompt
   * @param {boolean} o.canConfirm
   * @param {{type:'plusMinus'|'face', value:any, disabled:(v)=>boolean, onChoose:(v)=>void}|null} [o.choice]
   * @param {() => void} o.onCancel
   * @param {() => void} o.onConfirm
   */
  render(o) {
    const def = CARDS[o.cardId];
    const fresh = !this.el;
    const icon = h('div', { class: `tb-icon r-${def.rarity}`, html: CARD_ICONS[o.cardId] });
    let middle;
    if (o.choice) {
      const opts = o.choice.type === 'plusMinus' ? [-1, 1] : [1, 2, 3, 4, 5, 6];
      middle = h(
        'div',
        { class: 'tb-choices' },
        ...opts.map((v) =>
          h(
            'button',
            {
              class: `tb-choice${o.choice.value === v ? ' is-on' : ''}${o.choice.type === 'face' ? ' face' : ''}`,
              type: 'button',
              disabled: o.choice.disabled(v),
              onpointerdown: (e) => {
                e.preventDefault();
                if (!o.choice.disabled(v)) o.choice.onChoose(v);
              },
              html: o.choice.type === 'face' ? pipsSvg(v, 5.4) : '',
            },
            o.choice.type === 'plusMinus' ? (v > 0 ? '+1' : '−1') : null,
          ),
        ),
      );
    } else {
      middle = h('div', { class: 'tb-prompt' }, h('b', {}, def.name), h('span', {}, o.prompt));
    }
    const el = h(
      'div',
      { class: `target-bar r-${def.rarity}` },
      o.choice ? null : icon,
      middle,
      h('button', { class: 'tb-btn ghost', type: 'button', onpointerdown: (e) => { e.preventDefault(); o.onCancel(); } }, 'ANNULLA'),
      h(
        'button',
        { class: `tb-btn ok${o.canConfirm ? '' : ' is-off'}`, type: 'button', onpointerdown: (e) => { e.preventDefault(); if (o.canConfirm) o.onConfirm(); } },
        'OK',
      ),
    );
    if (this.el) this.el.replaceWith(el);
    else this.host.append(el);
    this.el = el;
    if (fresh) play(el, [{ transform: 'translateY(-20px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: EASE.back });
  }

  hide() {
    const el = this.el;
    if (!el) return;
    this.el = null;
    play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' }).then(() => el.remove());
  }
}
