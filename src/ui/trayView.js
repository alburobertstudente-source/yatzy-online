/**
 * Vassoio dei 5 dadi 3D. Tocca un dado per tenerlo / rilasciarlo.
 */
import { h } from './dom.js';
import { pipsSvg, ICONS } from './icons.js';
import { MINI } from './cardArt.js';
import { setDieFace, tumbleDie, play, EASE } from '../anim/animations.js';
import { TIMING } from '../config.js';
import { applyDiceSkin, rollStyleOf } from './skins.js';

function buildDie() {
  const faces = [1, 2, 3, 4, 5, 6].map((n) => h('div', { class: `face f${n}`, html: pipsSvg(n) }));
  const cube = h('div', { class: 'cube' }, ...faces, h('div', { class: 'core cx' }), h('div', { class: 'core cy' }), h('div', { class: 'core cz' }));
  return h('div', { class: 'die' }, h('div', { class: 'die-shadow' }), h('div', { class: 'die-toss' }, cube));
}

export class TrayView {
  constructor({ onDieTap, count = 5 }) {
    this.slots = [];
    const row = h('div', { class: 'tray-row' });
    for (let i = 0; i < count; i++) {
      const die = buildDie();
      const ghost = h('div', { class: 'slot-ghost', html: ICONS.dieGhost });
      const lock = h('div', { class: 'hold-tag', html: ICONS.lock });
      const eye = h('div', { class: 'fs-badge' }, h('span', { class: 'fs-eye', html: MINI.eye }), h('b', {}, ''));
      const nohold = h('div', { class: 'nohold-tag', html: MINI.lock });
      const el = h(
        'button',
        {
          class: 'slot is-empty',
          type: 'button',
          'aria-label': `Dado ${i + 1}`,
          onpointerdown: (e) => {
            e.preventDefault();
            onDieTap?.(i);
          },
        },
        ghost,
        die,
        lock,
        eye,
        nohold,
      );
      row.append(el);
      this.slots.push({ el, die, eye });
      setDieFace(die, (i % 6) + 1);
    }
    this.el = h('section', { class: 'tray' }, row);
    this.rollStyle = 'classic';
  }

  /** Skin dei dadi e stile di lancio (del giocatore di turno). */
  setSkin(diceId, rollId) {
    applyDiceSkin(this.el, diceId);
    this.rollStyle = rollStyleOf(rollId);
  }

  /** Vassoio vuoto (inizio turno). */
  setEmpty() {
    for (const s of this.slots) {
      s.el.classList.add('is-empty');
      s.el.classList.remove('is-held', 'is-out');
      s.die.style.opacity = '';
    }
  }

  /** Mostra subito i valori (es. ripresa di una partita salvata). */
  showValues(values) {
    values.forEach((v, i) => {
      const s = this.slots[i];
      if (v >= 1) {
        setDieFace(s.die, v);
        s.el.classList.remove('is-empty', 'is-out');
      } else s.el.classList.add('is-empty');
    });
  }

  /** Stato "tenuto" + interattività. */
  setHeld(held, interactive) {
    held.forEach((on, i) => this.slots[i].el.classList.toggle('is-held', on));
    this.el.classList.toggle('is-interactive', interactive);
  }

  /**
   * Anima un lancio. Solo gli indici in `rolled` si muovono.
   * @returns {Promise<void>} risolta quando tutti i dadi sono fermi
   */
  async roll(values, rolled, { entering = false, onLand } = {}) {
    const order = [...rolled].sort(() => Math.random() - 0.5);
    const jobs = rolled.map((i) => {
      const s = this.slots[i];
      s.el.classList.remove('is-empty', 'is-out');
      const delay = order.indexOf(i) * TIMING.ROLL_STAGGER;
      const duration = TIMING.ROLL_MIN + Math.random() * (TIMING.ROLL_MAX - TIMING.ROLL_MIN);
      return tumbleDie(s.die, values[i], { delay, duration, entering, style: this.rollStyle, onLand: () => onLand?.(i) });
    });
    await Promise.all(jobs);
  }

  /** Nasconde un dado (è "volato" nella tabella). */
  hideDie(i) {
    this.slots[i].el.classList.add('is-out');
  }

  /** I dadi rimasti scivolano via a fine turno. */
  async clearRemaining() {
    const jobs = this.slots
      .filter((s) => !s.el.classList.contains('is-out') && !s.el.classList.contains('is-empty'))
      .map((s, k) =>
        play(s.die, [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(16px) scale(.6)', opacity: 0 }], {
          duration: 300,
          delay: k * 40,
          easing: EASE.inOut,
          fill: 'forwards',
        }).then((a) => {
          s.el.classList.add('is-out');
          a?.cancel?.();
        }),
      );
    await Promise.all(jobs);
    this.slots.forEach((s) => {
      s.el.classList.remove('is-held');
    });
  }

  slotEl(i) {
    return this.slots[i].el;
  }

  /**
   * Decorazioni delle carte: valori rivelati dall'Occhio del Destino e
   * dado che non si può conservare (Apocalisse dei Dadi).
   */
  setDecor({ foresight = {}, noHold = null, frozen = null } = {}) {
    this.slots.forEach((s, i) => {
      s.el.classList.toggle('is-frozen', frozen === i);
      const f = foresight[i];
      s.el.classList.toggle('has-foresight', f !== undefined);
      s.eye.lastChild.textContent = f !== undefined ? String(f) : '';
      s.el.classList.toggle('is-nohold', noHold === i);
    });
  }

  /** Evidenzia i dadi bersaglio durante l'uso di una carta. */
  setTargets(targets = new Set(), picked = new Set()) {
    this.slots.forEach((s, i) => {
      s.el.classList.toggle('is-target', targets.has(i));
      s.el.classList.toggle('is-picked', picked.has(i));
    });
  }

  /** Cambia subito la faccia mostrata di un dado (anteprima Mano degli Dei). */
  previewFace(i, v) {
    const s = this.slots[i];
    s.el.classList.remove('is-empty', 'is-out');
    setDieFace(s.die, v);
  }
}
