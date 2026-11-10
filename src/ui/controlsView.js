/**
 * Pulsanti LANCIA (con un indicatore per ogni lancio del turno) e SEGNA.
 * I lanci sono 3, di più con la carta "Doppio Lancio".
 */
import { h } from './dom.js';
import { pipsSvg } from './icons.js';
import { MINI } from './cardArt.js';
import { RULES } from '../config.js';
import { pop } from '../anim/animations.js';

const MAX_PIPS = 8;

export class ControlsView {
  constructor({ onRoll, onConfirm }) {
    this.pips = [];
    this.pipsBox = h('span', { class: 'roll-pips' });
    for (let i = 1; i <= MAX_PIPS; i++) {
      const p = h('span', { class: 'roll-pip', html: pipsSvg(Math.min(i, 6), 5.6) });
      this.pipsBox.append(p);
      this.pips.push(p);
    }
    this.roll = h(
      'button',
      { class: 'btn btn-roll', type: 'button', onpointerdown: (e) => { e.preventDefault(); onRoll?.(); } },
      h('span', { class: 'btn-label' }, 'LANCIA'),
      this.pipsBox,
    );
    this.crown = h('span', { class: 'confirm-crown', html: MINI.crown });
    this.confirm = h(
      'button',
      { class: 'btn btn-confirm', type: 'button', onpointerdown: (e) => { e.preventDefault(); onConfirm?.(); } },
      this.crown,
      h('span', { class: 'btn-label' }, 'SEGNA'),
    );
    this.el = h('section', { class: 'controls' }, this.roll, this.confirm);
    this.shown = RULES.MAX_ROLLS;
  }

  /**
   * @param {{color:string, rollsUsed:number, maxRolls?:number, canRoll:boolean, canConfirm:boolean, crown?:boolean}} s
   */
  update({ color, rollsUsed, maxRolls = RULES.MAX_ROLLS, canRoll, canConfirm, crown = false }) {
    this.el.dataset.color = color;
    this.roll.classList.toggle('is-disabled', !canRoll);
    this.roll.setAttribute('aria-disabled', String(!canRoll));
    const wasConfirm = this.confirm.classList.contains('is-ready');
    this.confirm.classList.toggle('is-ready', canConfirm);
    this.confirm.classList.toggle('has-crown', crown);
    this.confirm.setAttribute('aria-disabled', String(!canConfirm));
    if (canConfirm && !wasConfirm) pop(this.confirm, 1.08, 260);
    const count = Math.min(MAX_PIPS, maxRolls);
    this.roll.classList.toggle('many', count > 4);
    this.pips.forEach((p, i) => {
      const visible = i < count;
      const appearing = visible && i >= this.shown;
      p.hidden = !visible;
      const used = i < rollsUsed;
      if (used && !p.classList.contains('is-used') && i === rollsUsed - 1) pop(p, 1.4, 300);
      p.classList.toggle('is-used', used);
      if (appearing) pop(p, 1.6, 420);
    });
    this.shown = count;
  }

  setHidden(hidden) {
    this.el.classList.toggle('is-hidden', hidden);
  }

  pipEl(i) {
    return this.pips[i];
  }
}
