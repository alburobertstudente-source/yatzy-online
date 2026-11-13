/**
 * Animazioni degli effetti delle carte, nello stile del resto del gioco:
 * carta giocata, artigli del furto, scudo, maledizione, prigione,
 * rewind, corona, mano degli dei, occhio del destino.
 */
import { h, localRect, wait } from '../ui/dom.js';
import { CARD_ICONS, MINI, CHAINS } from '../ui/cardArt.js';
import { CARDS } from '../core/cards.js';
import { play, EASE, ms, pop, shake } from './animations.js';
import { sparkle, toast } from './effects.js';

export const RARITY_HEX = { common: '#8e98ad', rare: '#22a6d8', epic: '#9a5ae0', legendary: '#ffb21e', mythic: '#ff3fa4', absurd: '#00d9ff' };
const RARITY_SPARK = {
  common: ['#ffffff', '#c9d0dd'],
  rare: ['#ffffff', '#7fd6f5', '#22a6d8'],
  epic: ['#ffffff', '#d6b8ff', '#9a5ae0'],
  legendary: ['#fff6c2', '#ffd23f', '#ffffff'],
  mythic: ['#ff3fa4', '#7a5cff', '#2fd0ff', '#fff6c2', '#ffffff'],
  absurd: ['#00d9ff', '#7dffef', '#ffffff', '#ffd23f', '#ff3fa4'],
};

export class CardFx {
  /**
   * @param {object} o
   * @param {HTMLElement} o.fx layer degli effetti (dentro il tavolo)
   * @param {HTMLElement} o.table
   * @param {() => boolean} o.isRotated
   */
  constructor({ fx, table, isRotated }) {
    this.fx = fx;
    this.table = table;
    this.isRotated = isRotated;
  }

  rect(el) {
    return localRect(el, this.table, this.isRotated());
  }

  center(el) {
    const r = this.rect(el);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, r };
  }

  /** La carta giocata vola dalla mano al centro, brilla e si dissolve. */
  async cast(cardId, fromEl) {
    const def = CARDS[cardId];
    const tw = this.table.offsetWidth;
    const th = this.table.offsetHeight;
    const from = fromEl ? this.rect(fromEl) : { x: tw / 2 - 31, y: th / 2 - 30, w: 62, h: 60 };
    const el = h(
      'div',
      { class: `fx-cast r-${def.rarity}` },
      h('div', { class: 'fx-cast-icon', html: CARD_ICONS[cardId] }),
      h('div', { class: 'fx-cast-name' }, def.name),
    );
    el.style.left = `${tw / 2 - 90}px`;
    el.style.top = `${th * 0.36 - 60}px`;
    this.fx.append(el);
    const dx = from.x + from.w / 2 - tw / 2;
    const dy = from.y + from.h / 2 - th * 0.36;
    await play(
      el,
      [
        { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(-8deg)`, opacity: 0.6 },
        { transform: 'translate(0,0) scale(1.08) rotate(2deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      ],
      { duration: 480, easing: EASE.out },
    );
    sparkle(this.fx, tw / 2, th * 0.36, { colors: RARITY_SPARK[def.rarity], count: 16, spread: 120, size: 10 });
    await wait(ms(380));
    await play(el, [{ transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(1.35)', opacity: 0, filter: 'brightness(1.8)' }], {
      duration: 300,
      easing: EASE.inOut,
    });
    el.remove();
  }

  /** Bagliore su un dado modificato. */
  glowDie(slotEl, rarity = 'rare') {
    const c = this.center(slotEl);
    sparkle(this.fx, c.x, c.y, { colors: RARITY_SPARK[rarity], count: 12, spread: 44, size: 8 });
    pop(slotEl, 1.15, 320);
  }

  /** Occhio del Destino: l'occhio appare sopra il dado. */
  foresight(slotEl) {
    const c = this.center(slotEl);
    const eye = h('div', { class: 'fx-eye', html: MINI.eye });
    eye.style.left = `${c.x}px`;
    eye.style.top = `${c.y}px`;
    this.fx.append(eye);
    return play(eye, [
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
      { transform: 'translate(-50%,-120%) scale(1.6)', opacity: 1, offset: 0.4 },
      { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
    ], { duration: 900, easing: EASE.out }).then(() => eye.remove());
  }

  /** Uno scudo vola sulla casella. */
  async shield(cellEls) {
    await Promise.all(
      cellEls.map((cell, k) => {
        const c = this.center(cell);
        const s = h('div', { class: 'fx-shield', html: MINI.shield });
        s.style.left = `${c.x}px`;
        s.style.top = `${c.y}px`;
        this.fx.append(s);
        return play(s, [
          { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(.9)', opacity: 1, offset: 0.55 },
          { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.75 },
          { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
        ], { duration: 760, delay: k * 140, easing: EASE.out }).then(() => {
          sparkle(this.fx, c.x, c.y, { colors: ['#ffffff', '#9fb5ff', '#5b7bd5'], count: 10, spread: 34, size: 7 });
          pop(cell, 1.12, 260);
          s.remove();
        });
      }),
    );
  }

  /** Artigli sulla casella derubata e punti che volano al ladro. */
  async steal(cellEl, toEl, amount) {
    const c = this.center(cellEl);
    const slash = h('div', { class: 'fx-slash' }, h('span'), h('span'), h('span'));
    slash.style.left = `${c.x}px`;
    slash.style.top = `${c.y}px`;
    this.fx.append(slash);
    shake(cellEl, 5, 360);
    await play(slash, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.4)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.25 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1)' }], {
      duration: 520,
      easing: EASE.out,
    });
    slash.remove();
    const minus = h('div', { class: 'fx-points minus' }, `−${amount}`);
    minus.style.left = `${c.x}px`;
    minus.style.top = `${c.y}px`;
    this.fx.append(minus);
    play(minus, [{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-110%) scale(1.15)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }], {
      duration: 1100,
      easing: EASE.out,
    }).then(() => minus.remove());
    await this.flyPoints(c, toEl, `+${amount}`);
  }

  /** Gettone di punti che vola verso un elemento (es. totale nell'intestazione). */
  async flyPoints(from, toEl, text, kind = 'gold') {
    const t = this.center(toEl);
    const chip = h('div', { class: `fx-points ${kind}` }, text);
    chip.style.left = `${from.x}px`;
    chip.style.top = `${from.y}px`;
    this.fx.append(chip);
    await play(chip, [
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.2)', opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${t.x - from.x}px), calc(-50% + ${t.y - from.y}px)) scale(.7)`, opacity: 0.9 },
    ], { duration: 820, easing: EASE.inOut });
    chip.remove();
    pop(toEl, 1.12, 300);
  }

  /** Scudo che para il colpo. */
  async blocked(cellEl) {
    const c = this.center(cellEl);
    const s = h('div', { class: 'fx-shield big', html: MINI.shield });
    s.style.left = `${c.x}px`;
    s.style.top = `${c.y}px`;
    this.fx.append(s);
    sparkle(this.fx, c.x, c.y, { colors: ['#ffffff', '#9fb5ff', '#5b7bd5'], count: 18, spread: 60, size: 9 });
    toast(this.fx, 'BLOCCATO DALLO SCUDO!', { x: c.x, y: c.r.y - 10, kind: 'hint' });
    await play(s, [{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%) scale(2) rotate(12deg)', opacity: 0 }], {
      duration: 800,
      easing: EASE.out,
    });
    s.remove();
  }

  /** Sfera maledetta che vola verso l'avversario (il suo riquadro punteggio). */
  async curseCast(toEl, type) {
    const tw = this.table.offsetWidth;
    const th = this.table.offsetHeight;
    const from = { x: tw / 2, y: th * 0.36 };
    const t = this.center(toEl);
    const orb = h('div', { class: `fx-orb ${type}`, html: MINI.curse });
    orb.style.left = `${from.x}px`;
    orb.style.top = `${from.y}px`;
    this.fx.append(orb);
    await play(orb, [
      { transform: 'translate(-50%,-50%) scale(.2) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.6) rotate(-180deg)', opacity: 1, offset: 0.35 },
      { transform: `translate(calc(-50% + ${t.x - from.x}px), calc(-50% + ${t.y - from.y}px)) scale(.6) rotate(-540deg)`, opacity: 0.9 },
    ], { duration: 1000, easing: EASE.inOut });
    orb.remove();
    sparkle(this.fx, t.x, t.y, { colors: ['#b98cff', '#3b1f5e', '#ffffff'], count: 14, spread: 40, size: 8 });
    pop(toEl, 1.12, 300);
  }

  /** Banner della maledizione quando scatta sul lancio del giocatore. */
  async curseBanner(type) {
    const name = type === 'apocalypse' ? 'APOCALISSE DEI DADI!' : type === 'freeze' ? 'GELO ETERNO!' : 'MALEDIZIONE DEL CAOS!';
    const sub = type === 'apocalypse' ? 'Tutti i dadi vengono rilanciati, anche quelli conservati' : type === 'freeze' ? 'Due dadi si congelano' : 'Due dadi liberi vengono rilanciati';
    const el = h('div', { class: `curse-banner ${type}` }, h('div', { class: 'cb-icon', html: MINI.curse }), h('div', {}, h('b', {}, name), h('small', {}, sub)));
    this.fx.append(el);
    shake(this.table.querySelector('.play-area'), 7, 500);
    await play(el, [{ transform: 'translate(-50%,-50%) scale(.3) rotate(-8deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.08) rotate(2deg)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], {
      duration: 420,
      easing: EASE.back,
    });
    await wait(ms(700));
    await play(el, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.9)' }], { duration: 260, easing: 'linear' });
    el.remove();
  }

  /** Catene sulla carta avversaria imprigionata (mostrata al centro). */
  async prison(cardId) {
    const tw = this.table.offsetWidth;
    const th = this.table.offsetHeight;
    const def = CARDS[cardId];
    const el = h(
      'div',
      { class: `fx-cast r-${def.rarity} is-jailed` },
      h('div', { class: 'fx-cast-icon', html: CARD_ICONS[cardId] }),
      h('div', { class: 'fx-cast-name' }, def.name),
      h('div', { class: 'fx-chains', html: CHAINS }),
    );
    el.style.left = `${tw / 2 - 90}px`;
    el.style.top = `${th * 0.36 - 60}px`;
    this.fx.append(el);
    const chains = el.querySelector('.fx-chains');
    await play(el, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: EASE.back });
    await play(chains, [{ transform: 'scale(2.4) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }], { duration: 360, easing: EASE.out });
    shake(el, 6, 300);
    await wait(ms(700));
    await play(el, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.8)' }], { duration: 260, easing: 'linear' });
    el.remove();
  }

  /** Orologio che gira all'indietro. */
  async rewind() {
    const tw = this.table.offsetWidth;
    const th = this.table.offsetHeight;
    const el = h('div', { class: 'fx-clock', html: CARD_ICONS.rewindTemporale });
    el.style.left = `${tw / 2}px`;
    el.style.top = `${th * 0.36}px`;
    this.fx.append(el);
    await play(el, [
      { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.2) rotate(-200deg)', opacity: 1, offset: 0.5 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(-720deg)', opacity: 0 },
    ], { duration: 1100, easing: EASE.inOut });
    el.remove();
  }

  /** Raggi dorati sul vassoio (Mano degli Dei). */
  godRays(trayEl) {
    const c = this.center(trayEl);
    const el = h('div', { class: 'fx-rays' });
    el.style.left = `${c.x}px`;
    el.style.top = `${c.y}px`;
    this.fx.append(el);
    return play(el, [
      { transform: 'translate(-50%,-50%) scale(.2) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(30deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%,-50%) scale(1.2) rotate(90deg)', opacity: 0 },
    ], { duration: 1400, easing: 'linear' }).then(() => el.remove());
  }

  /** Corona che scende sul pulsante SEGNA. */
  async crownOn(targetEl) {
    const c = this.center(targetEl);
    const el = h('div', { class: 'fx-crown', html: MINI.crown });
    el.style.left = `${c.x}px`;
    el.style.top = `${c.y}px`;
    this.fx.append(el);
    await play(el, [
      { transform: 'translate(-50%,-260%) scale(2.2) rotate(-20deg)', opacity: 0 },
      { transform: 'translate(-50%,-60%) scale(1.2) rotate(6deg)', opacity: 1, offset: 0.6 },
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    ], { duration: 800, easing: EASE.out });
    el.remove();
    sparkle(this.fx, c.x, c.y, { colors: RARITY_SPARK.legendary, count: 14, spread: 60, size: 9 });
  }
}
