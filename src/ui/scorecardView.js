/**
 * Tabella dei punteggi: due metà (superiore / inferiore), per ogni categoria
 * l'icona e una casella per giocatore (rosso, blu). Include l'anello del bonus
 * +35 con barra di avanzamento e le spunte dei bonus Yatzy.
 */
import { h } from './dom.js';
import { UPPER, LOWER, CATEGORY_INFO } from '../core/scoring.js';
import { RULES } from '../config.js';
import { dieFaceSvg, CATEGORY_ICONS, ICONS } from './icons.js';
import { MINI } from './cardArt.js';
import { DOCTOR_BADGE, HALO_BADGE } from './memeArt.js';
import { CARD_RULES } from '../config.js';

const LOWER_LABELS = {
  threeKind: 'TRIS',
  fourKind: 'POKER',
  fullHouse: 'FULL',
  smallStraight: 'PICCOLA',
  largeStraight: 'GRANDE',
  yatzy: 'YATZY',
  chance: 'CHANCE',
};

const RING_R = 19;
const RING_C = 2 * Math.PI * RING_R;

export class ScorecardView {
  /**
   * @param {object} o
   * @param {string[]} o.playerIds es. ['red','blue']
   * @param {(pid:string, cat:string)=>void} o.onCellTap
   */
  constructor({ playerIds, onCellTap }) {
    this.playerIds = playerIds;
    this.cells = new Map();
    this.rings = new Map();
    this.rails = new Map();
    this.checks = new Map();
    this.locked = new Set(); // celle controllate da un'animazione
    this.memeHold = new Set(); // distintivi delle tradizioni mostrati dopo la scena

    const grid = h('div', { class: 'sc-grid' });
    // fasce alternate delle righe
    for (let r = 1; r <= 7; r++) grid.append(h('div', { class: `sc-stripe ${r % 2 ? 'odd' : 'even'}`, style: { gridRow: String(r) } }));
    grid.append(h('div', { class: 'sc-divider' }));

    // binari di avanzamento verso il bonus (metà superiore)
    playerIds.forEach((pid, k) => {
      const fill = h('div', { class: 'rail-fill' });
      const rail = h('div', { class: `sc-rail ${pid}`, style: { gridColumn: String(2 + k) } }, fill);
      grid.append(rail);
      this.rails.set(pid, fill);
    });

    // metà superiore
    UPPER.forEach((cat, i) => {
      const row = i + 1;
      grid.append(this.#chip(cat, row, 1, h('div', { class: 'chip-die', html: dieFaceSvg(CATEGORY_INFO[cat].face) })));
      playerIds.forEach((pid, k) => grid.append(this.#cell(pid, cat, row, 2 + k)));
    });
    // riga bonus
    grid.append(
      h('div', { class: 'sc-bonus-label', style: { gridRow: '7', gridColumn: '1' } }, h('small', {}, 'BONUS'), h('b', {}, `+${RULES.UPPER_BONUS}`)),
    );
    playerIds.forEach((pid, k) => grid.append(this.#ring(pid, 7, 2 + k)));

    // metà inferiore
    LOWER.forEach((cat, i) => {
      const row = i + 1;
      const chip = this.#chip(
        cat,
        row,
        5,
        h('div', { class: 'chip-icon', html: CATEGORY_ICONS[cat] }),
        h('div', { class: 'chip-label' }, LOWER_LABELS[cat]),
      );
      grid.append(chip);
      playerIds.forEach((pid, k) => {
        const cell = this.#cell(pid, cat, row, 6 + k);
        if (cat === 'yatzy') {
          const checks = h('div', { class: `yz-checks ${pid}` });
          cell.append(checks);
          this.checks.set(pid, checks);
        }
        grid.append(cell);
      });
    });

    this.el = h('section', { class: 'card', 'aria-label': 'Tabella punteggi' }, grid);
    this.grid = grid;
    this.onCellTap = onCellTap;
  }

  #chip(cat, row, col, ...content) {
    return h(
      'div',
      { class: `sc-chip chip-${cat}`, style: { gridRow: String(row), gridColumn: String(col) }, title: CATEGORY_INFO[cat].label },
      ...content,
    );
  }

  #cell(pid, cat, row, col) {
    const val = h('span', { class: 'val' });
    const badges = h('span', { class: 'cell-badges' });
    const el = h(
      'button',
      {
        class: `cell ${pid}`,
        type: 'button',
        style: { gridRow: String(row), gridColumn: String(col) },
        'aria-label': `${CATEGORY_INFO[cat].label} ${pid === 'red' ? 'rosso' : 'blu'}`,
        dataset: { pid, cat },
        onpointerdown: (e) => {
          e.preventDefault();
          this.onCellTap?.(pid, cat);
        },
      },
      val,
      badges,
    );
    this.cells.set(`${pid}:${cat}`, { el, val, badges, badgeKey: '' });
    return el;
  }

  #ring(pid, row, col) {
    const prog = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const svg = h('div', {
      class: 'ring-svg',
      html: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="ring-track" cx="24" cy="24" r="${RING_R}"/></svg>`,
    });
    prog.setAttribute('class', 'ring-prog');
    prog.setAttribute('cx', '24');
    prog.setAttribute('cy', '24');
    prog.setAttribute('r', String(RING_R));
    prog.setAttribute('stroke-dasharray', `${RING_C} ${RING_C}`);
    prog.setAttribute('stroke-dashoffset', String(RING_C));
    svg.firstChild.append(prog);
    const text = h('span', { class: 'ring-text' }, `0/${RULES.UPPER_BONUS_THRESHOLD}`);
    const done = h('span', { class: 'ring-done' }, `+${RULES.UPPER_BONUS}`);
    const check = h('span', { class: 'ring-check', html: ICONS.check });
    const el = h('div', { class: `sc-ring ${pid}`, style: { gridRow: String(row), gridColumn: String(col) } }, svg, text, done, check);
    this.rings.set(pid, { el, prog, text });
    return el;
  }

  cell(pid, cat) {
    return this.cells.get(`${pid}:${cat}`);
  }

  ring(pid) {
    return this.rings.get(pid);
  }

  lock(pid, cat) {
    this.locked.add(`${pid}:${cat}`);
  }

  unlock(pid, cat) {
    this.locked.delete(`${pid}:${cat}`);
  }

  /**
   * Sincronizza la tabella con lo stato del gioco.
   * @param {import('../core/game.js').Game} game
   * @param {{interactive?: boolean, holdRingFor?: string|null, holdChecksFor?: string|null}} [opts]
   *   holdRingFor / holdChecksFor: non aggiornare anello o spunte di quel giocatore
   *   (li aggiorna l'animazione al momento giusto).
   */
  render(game, { interactive = true, holdRingFor = null, holdChecksFor = null } = {}) {
    const current = game.phase === 'playing' ? game.current.id : null;
    const rolled = game.dice.hasRolled && !game.scoredThisTurn && !game.mustDraw;
    const crown = Boolean(game.turnState?.crown);
    for (const p of game.players) {
      for (const cat of [...UPPER, ...LOWER]) {
        const key = `${p.id}:${cat}`;
        const c = this.cells.get(key);
        this.#badges(c, p.card, cat, p.id === current && game.selected === cat && crown ? game.previewScore(cat) : 0, !this.memeHold.has(key));
        if (this.locked.has(key)) continue;
        const { el, val } = c;
        const v = p.card.value(cat);
        const filled = v !== null;
        const mine = p.id === current && !filled && !game.scoredThisTurn;
        const selectable = mine && rolled && interactive;
        const selected = selectable && game.selected === cat;
        el.classList.toggle('is-filled', filled);
        el.classList.toggle('is-zero', filled && v === 0);
        el.classList.toggle('is-waiting', mine && !selectable);
        el.classList.toggle('is-selectable', selectable && !selected);
        el.classList.toggle('is-selected', selected);
        el.setAttribute('aria-disabled', String(!selectable));
        if (filled) val.textContent = String(v);
        else if (selected) val.textContent = String(game.previewScore(cat));
        else val.textContent = '';
      }
      if (holdRingFor !== p.id) this.setRing(p.id, p.card.upperTotal(), p.card.hasUpperBonus());
      if (holdChecksFor !== p.id) this.setChecks(p.id, p.card.yatzyBonusCount());
    }
  }

  /** Distintivi delle carte su una casella: scudi, punti rubati, corona. */
  #badges(c, card, cat, crownPreview, showMeme = true) {
    const shields = card.shieldCount(cat);
    const debit = card.debitOf(cat);
    const crown = card.crownOn(cat) || (crownPreview ? Math.min(crownPreview, CARD_RULES.CROWN_CAP) : 0);
    // tradizioni: contratto col Dottore (Full segnato) e aureola (0 sullo Yatzy)
    const meme = !showMeme ? '' : cat === 'fullHouse' && card.scores.fullHouse > 0 ? 'doctor' : cat === 'yatzy' && card.scores.yatzy === 0 ? 'halo' : '';
    const key = `${shields}|${debit}|${crown}|${crownPreview ? 1 : 0}|${meme}`;
    if (key === c.badgeKey) return;
    c.badgeKey = key;
    c.badges.replaceChildren();
    if (shields) c.badges.append(h('span', { class: 'cb-shield', html: MINI.shield }, shields > 1 ? h('b', {}, String(shields)) : null));
    if (debit) c.badges.append(h('span', { class: 'cb-debit' }, h('span', { class: 'cb-claw', html: MINI.claw }), `−${debit}`));
    if (crown || crownPreview) c.badges.append(h('span', { class: `cb-crown${crownPreview ? ' is-preview' : ''}` }, h('span', { class: 'cb-crown-ico', html: MINI.crown }), crown ? `+${crown}` : ''));
    if (meme === 'doctor') c.badges.append(h('span', { class: 'cb-meme doctor', title: 'Contratto col Dottore', html: DOCTOR_BADGE }));
    if (meme === 'halo') c.badges.append(h('span', { class: 'cb-meme halo', title: 'Ha rinunciato a Satana', html: HALO_BADGE }));
  }

  /**
   * Evidenzia le caselle bersaglio durante l'uso di una carta.
   * @param {Set<string>} targets chiavi "pid:cat" selezionabili
   * @param {Set<string>} picked chiavi già scelte
   */
  setTargets(targets, picked) {
    for (const [key, c] of this.cells) {
      c.el.classList.toggle('is-target', targets.has(key));
      c.el.classList.toggle('is-picked', picked.has(key));
    }
  }

  /** Anello e binario del bonus superiore. */
  setRing(pid, upperTotal, done = upperTotal >= RULES.UPPER_BONUS_THRESHOLD) {
    const r = this.rings.get(pid);
    const goal = RULES.UPPER_BONUS_THRESHOLD;
    const k = done ? 1 : Math.min(1, upperTotal / goal);
    r.prog.setAttribute('stroke-dashoffset', String(RING_C * (1 - k)));
    r.text.textContent = `${Math.min(upperTotal, 999)}/${goal}`;
    r.el.classList.toggle('is-done', done);
    this.rails.get(pid).style.transform = `scaleY(${k})`;
  }

  /** Spunte dei bonus Yatzy (una per ogni Yatzy aggiuntivo). */
  setChecks(pid, count) {
    const box = this.checks.get(pid);
    if (!box) return;
    const shown = box.childElementCount;
    if (shown === count) return;
    box.replaceChildren();
    const visible = Math.min(count, 4);
    for (let i = 0; i < visible; i++) box.append(h('span', { class: 'yz-check', html: ICONS.check }));
    if (count > 4) box.append(h('span', { class: 'yz-more' }, `×${count}`));
  }

  /** Ultima spunta (per animarla). */
  lastCheck(pid) {
    return this.checks.get(pid)?.querySelector('.yz-check:last-of-type');
  }
}
