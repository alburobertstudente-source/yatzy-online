/**
 * Intestazione: pulsante esci, punteggi totali dei due giocatori (con numero
 * di carte in mano e segno della maledizione), round, audio.
 */
import { h } from './dom.js';
import { ICONS } from './icons.js';
import { MINI } from './cardArt.js';
import { countUp, pop } from '../anim/animations.js';
import { TOTAL_ROUNDS } from '../core/turns.js';

export class HudView {
  constructor({ players, onExit, onSound }) {
    this.totals = new Map();
    this.values = new Map();
    this.boxes = new Map();
    this.counts = new Map();
    this.names = new Map(players.map((p) => [p.id, p.short]));
    this.defaults = new Map(this.names);
    this.hidden = null;
    const side = (p) => {
      const total = h('span', { class: 'sb-total' }, '0');
      const count = h('span', { class: 'sb-cards', title: 'Carte in mano' }, h('span', { class: 'sb-cards-ico', html: MINI.cards }), h('b', {}, '0'));
      const box = h('div', { class: `sb-player ${p.id}` }, h('span', { class: 'sb-name' }, p.short), count, total, h('span', { class: 'sb-curse', html: MINI.curse }));
      this.totals.set(p.id, total);
      this.values.set(p.id, 0);
      this.boxes.set(p.id, box);
      this.counts.set(p.id, count);
      return box;
    };
    this.round = h('span', { class: 'sb-round' }, `1/${TOTAL_ROUNDS}`);
    const board = h('div', { class: 'scoreboard' }, side(players[0]), h('div', { class: 'sb-mid' }, h('small', {}, 'ROUND'), this.round), side(players[1]));
    this.soundBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Audio', onclick: () => onSound?.() });
    this.el = h(
      'header',
      { class: 'hud' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Esci', onclick: () => onExit?.(), html: ICONS.exit }),
      board,
      this.soundBtn,
    );
  }

  setSound(on) {
    this.soundBtn.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
    this.soundBtn.classList.toggle('is-off', !on);
  }

  /** Nomi personalizzati (avversario online, boss). */
  setNames(names) {
    for (const [id, box] of this.boxes) {
      const name = names?.[id] ?? this.defaults.get(id);
      this.names.set(id, name);
      box.querySelector('.sb-name').textContent = name;
      box.classList.toggle('has-name', Boolean(names?.[id]));
    }
  }

  /** Online: segna con "TU" il giocatore di questo telefono. */
  setViewer(pid) {
    for (const [id, box] of this.boxes) {
      box.classList.toggle('is-you', id === pid);
      box.querySelector('.sb-name').textContent = id === pid ? 'TU' : this.names.get(id);
    }
  }

  setActive(pid) {
    for (const [id, box] of this.boxes) box.classList.toggle('is-active', id === pid);
  }

  setRound(n) {
    this.round.textContent = `${Math.min(n, TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`;
  }

  /** Carte in mano e maledizione in arrivo di ogni giocatore. */
  setCardInfo(players) {
    for (const p of players) {
      this.counts.get(p.id).lastChild.textContent = String(p.hand.length);
      this.boxes.get(p.id).classList.toggle('is-cursed', Boolean(p.status.curse));
    }
  }

  async setTotal(pid, value, animate = false) {
    const el = this.totals.get(pid);
    const from = this.values.get(pid) ?? 0;
    this.values.set(pid, value);
    if (this.hidden === pid) {
      el.textContent = '?';
      return;
    }
    if (!animate || from === value) {
      el.textContent = String(value);
      return;
    }
    pop(this.boxes.get(pid), 1.08, 400);
    await countUp(el, from, value, Math.min(1200, 300 + Math.abs(value - from) * 6));
  }

  totalEl(pid) {
    return this.boxes.get(pid);
  }
}
