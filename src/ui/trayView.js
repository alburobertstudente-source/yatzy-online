/**
 * Vassoio dei 5 dadi 3D. Tocca un dado per tenerlo / rilasciarlo.
 */
import { h } from './dom.js';
import { pipsSvg, ICONS } from './icons.js';
import { MINI } from './cardArt.js';
import { setDieFace, tumbleDie, play, EASE } from '../anim/animations.js';
import { TIMING } from '../config.js';
import { applyDiceSkin, rollStyleOf, landFx } from './skins.js';
import { ITEMS } from '../meta/catalog.js';
import { sound } from '../audio/sound.js';
import { rollStyleSound } from '../audio/voices.js';
import { DiceLayer3D } from '../three/diceTray.js';

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
    this.voice = 'classic';
    this.landFx = null;
    this.skinId = 'dice.classic';
  }

  /**
   * Dadi 3D (WebGL) sopra il vassoio, creati appena il vassoio è visibile.
   * null = si usano i dadi CSS (niente WebGL, ?no3d o contesto perso).
   */
  get d3() {
    if (this._d3 && !this._d3.alive) {
      if (this._d3.lost) this.no3d = true;
      this._d3 = null;
    }
    if (!this._d3 && !this.no3d && this.el.isConnected && this.el.offsetWidth) {
      this._d3 = DiceLayer3D.attach(
        this.el,
        this.slots.map((s) => ({ el: s.el, die: s.die })),
      );
      if (this._d3) this._d3.setSkin(this.skinId, this.rollStyle);
    }
    return this._d3;
  }

  /** Skin dei dadi e stile di lancio (del giocatore di turno). */
  setSkin(diceId, rollId) {
    applyDiceSkin(this.el, diceId);
    this.rollStyle = rollStyleOf(rollId);
    const it = ITEMS[diceId];
    this.voice = it?.voice || 'classic';
    this.landFx = it?.landFx || null;
    this.skinId = diceId;
    sound.voice = this.voice;
    sound.prepareVoice(this.voice);
    this.d3?.setSkin(diceId, this.rollStyle);
  }

  /** Vassoio vuoto (inizio turno). */
  setEmpty() {
    for (const s of this.slots) {
      s.el.classList.add('is-empty');
      s.el.classList.remove('is-held', 'is-out');
      s.die.style.opacity = '';
    }
    this.d3?.syncFromDom();
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
    this.d3?.syncFromDom();
  }

  /** Stato "tenuto" + interattività. */
  setHeld(held, interactive) {
    held.forEach((on, i) => this.slots[i].el.classList.toggle('is-held', on));
    this.el.classList.toggle('is-interactive', interactive);
    this.d3?.syncFromDom();
  }

  /**
   * Anima un lancio. Solo gli indici in `rolled` si muovono.
   * @returns {Promise<void>} risolta quando tutti i dadi sono fermi
   */
  async roll(values, rolled, { entering = false, onLand, silent = false } = {}) {
    const order = [...rolled].sort(() => Math.random() - 0.5);
    let landed = 0;
    if (!silent) {
      sound.voice = this.voice;
      sound.roll(rolled.length, 0.9, this.voice);
      if (this.rollStyle !== 'classic') rollStyleSound(sound, this.rollStyle);
    }
    const layer = this.d3;
    const land = (i) => {
      const k = landed++;
      if (!silent) sound.land(0, values[i], k, this.voice);
      // nel vassoio 3D gli effetti dell'atterraggio li disegna la scena 3D
      if (this.landFx && !layer) landFx(this.landFx, this.slots[i].el, k);
      onLand?.(i);
    };
    if (layer) {
      const timing = {};
      for (const i of rolled) {
        const s = this.slots[i];
        s.el.classList.remove('is-empty', 'is-out');
        setDieFace(s.die, values[i]);
        timing[i] = { delay: order.indexOf(i) * TIMING.ROLL_STAGGER, duration: TIMING.ROLL_MIN + Math.random() * (TIMING.ROLL_MAX - TIMING.ROLL_MIN) };
      }
      await layer.roll(values, rolled, { entering, timing, onLand: land });
      return;
    }
    const jobs = rolled.map((i) => {
      const s = this.slots[i];
      s.el.classList.remove('is-empty', 'is-out');
      const delay = order.indexOf(i) * TIMING.ROLL_STAGGER;
      const duration = TIMING.ROLL_MIN + Math.random() * (TIMING.ROLL_MAX - TIMING.ROLL_MIN);
      return tumbleDie(s.die, values[i], { delay, duration, entering, style: this.rollStyle, onLand: () => land(i) });
    });
    await Promise.all(jobs);
  }

  /** Nasconde un dado (è "volato" nella tabella). */
  hideDie(i) {
    this._d3?.hide(i);
    this.slots[i].el.classList.add('is-out');
  }

  /** I dadi rimasti scivolano via a fine turno. */
  async clearRemaining() {
    const layer = this.d3;
    if (layer) {
      const idx = this.slots.map((s, i) => (!s.el.classList.contains('is-out') && !s.el.classList.contains('is-empty') ? i : -1)).filter((i) => i >= 0);
      await layer.clear(idx);
      idx.forEach((i) => this.slots[i].el.classList.add('is-out'));
      this.slots.forEach((s) => s.el.classList.remove('is-held'));
      layer.syncFromDom();
      return;
    }
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
    this.d3?.flipTo(i, v);
  }
}
