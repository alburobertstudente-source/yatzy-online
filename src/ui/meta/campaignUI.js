/**
 * Campagna: mappa dei 10 mondi, scheda del livello, sfide "in tot lanci"
 * e schermata del risultato (stelle e monete).
 */
import { h, wait, buzz } from '../dom.js';
import { play, EASE, ms, countUp, shake, pop } from '../../anim/animations.js';
import { sparkle, confetti, toast } from '../../anim/effects.js';
import { sound } from '../../audio/sound.js';
import { MI } from '../metaIcons.js';
import { bossSvg } from '../bossArt.js';
import { TrayView } from '../trayView.js';
import { WORLDS, levelInfo } from '../../campaign/campaign.js';
import { Challenge, goalLabel } from '../../campaign/challenge.js';
import * as P from '../../meta/profile.js';
import { pageShell, sheet, fmt } from './common.js';
import { worldScene, MAP_W, MAP_H } from '../worldArt.js';
import { avatarSvg } from '../avatar.js';
import { music } from '../../audio/music.js';

const XS = [18, 50, 78, 62, 30, 14, 42, 74, 56, 50];
const NODE_Y = (k) => (k < 9 ? k * 64 : 640);
const PATH = XS.map((x, k) => `${k ? 'L' : 'M'}${x} ${NODE_Y(k) + 26 + (k === 9 ? 6 : 0)}`).join(' ');
const starsHtml = (n, total = 3) => Array.from({ length: total }, (_, i) => `<span class="st${i < n ? ' on' : ''}">${MI.star}</span>`).join('');

export class CampaignUI {
  /** @param {{stage, screens, account, onBoss:(n)=>void, onHub:()=>void}} o */
  constructor({ stage, screens, account, onBoss, onHub }) {
    this.stage = stage;
    this.screens = screens;
    this.account = account;
    this.onBoss = onBoss;
    this.onHub = onHub;
  }

  get profile() {
    return this.account.profile;
  }

  /* ---------------- mappa ---------------- */
  async map({ focus = null } = {}) {
    const p = this.profile;
    const { el, body } = pageShell({ title: 'Campagna', onBack: () => this.onHub(), coins: p.coins, icon: MI.map, cls: 'campaign' });
    const stars = P.totalStars(p);
    body.append(h('div', { class: 'cm-summary' }, h('span', { html: starsHtml(1, 1) }), `${stars} stelle`, h('span', { class: 'cm-dot' }), `${p.campaign.best}/100 livelli`));
    const current = Math.min(100, p.campaign.best + 1);
    let focusEl = null;
    for (const w of WORLDS) {
      const unlockedWorld = P.levelUnlocked(p, w.first);
      const pts = XS.map((x, k) => ({ x: (x / 100) * MAP_W, y: k < 9 ? 128 + k * 68 : 770 }));
      const art = worldScene(w.n, pts);
      const nodes = [];
      for (let n = w.first; n <= w.last; n++) {
        const info = levelInfo(n);
        const open = P.levelUnlocked(p, n);
        const done = n <= p.campaign.best;
        const st = p.campaign.stars[n] || 0;
        const k = n - w.first;
        const node = h(
          'button',
          {
            class: `cm-node${info.boss ? ' boss' : ''}${open ? '' : ' locked'}${done ? ' done' : ''}${n === current ? ' current' : ''}`,
            type: 'button',
            style: { left: `${((pts[k].x / MAP_W) * 100).toFixed(2)}%`, top: `${((pts[k].y / MAP_H) * 100).toFixed(2)}%` },
            dataset: { level: String(n) },
            onclick: () => (open ? this.levelSheet(n, el) : this.#locked(node)),
          },
          info.boss ? h('span', { class: 'cm-boss-art', html: bossSvg(info.bossData, 96) }) : h('b', {}, String(n)),
          info.boss ? h('span', { class: 'cm-boss-name' }, info.title) : h('span', { class: 'cm-stars', html: starsHtml(st) }),
          open ? null : h('span', { class: 'cm-lock', html: MI.lock }),
          n === current ? h('span', { class: 'cm-me', html: avatarSvg(p, { size: 44 }) }) : null,
        );
        if (n === (focus ?? current)) focusEl = node;
        nodes.push(node);
      }
      body.append(
        h(
          'section',
          { class: `cm-world cmw t-${art.theme}${unlockedWorld ? '' : ' locked'}` },
          h('div', { class: 'cmw-art', html: art.scene + art.fx }),
          h('header', { class: 'cmw-head' }, h('small', {}, `MONDO ${w.n}`), h('b', {}, w.name), h('span', {}, `${[...Array(10)].reduce((s, _, i) => s + (p.campaign.stars[w.first + i] || 0), 0)}/27 ★`)),
          ...nodes,
          unlockedWorld ? null : h('div', { class: 'cm-wlock' }, h('span', { html: MI.lock }), `Batti il boss del mondo ${w.n - 1}`),
        ),
      );
    }
    this.stage.app.dataset.screen = 'campaign';
    const startWorld = WORLDS[Math.min(9, Math.floor(((focus ?? current) - 1) / 10))].n;
    music.play('world', { world: startWorld });
    this.stage.setRotation(0);
    this.stage.setTurnColor('red');
    await this.screens.open(el, { dim: false });
    if (focusEl) focusEl.scrollIntoView({ block: 'center' });
    // la musica segue il mondo che si sta guardando
    const worlds = [...body.querySelectorAll('.cmw')];
    let raf = 0;
    body.addEventListener(
      'scroll',
      () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const mid = body.scrollTop + body.clientHeight / 2;
          const k = worlds.findIndex((w) => mid >= w.offsetTop && mid < w.offsetTop + w.offsetHeight);
          if (k >= 0 && this.stage.app.dataset.screen === 'campaign') music.play('world', { world: k + 1 });
        });
      },
      { passive: true },
    );
  }

  #locked(node) {
    sound.denied();
    shake(node, 4);
  }

  /* ---------------- scheda del livello ---------------- */
  levelSheet(n, host) {
    const info = levelInfo(n);
    const p = this.profile;
    const done = n <= p.campaign.best;
    const reward = done ? info.replayCoins : info.coins;
    let content;
    if (info.boss) {
      const b = info.bossData;
      content = h(
        'div',
        { class: 'lv-sheet boss', style: { '--w1': b.colors[0], '--w2': b.colors[1] } },
        h('div', { class: 'lv-boss-art', html: bossSvg(b, 130) }),
        h('small', {}, `BOSS ${info.bossIndex} · LIVELLO ${n}`),
        h('h3', {}, b.name),
        h('div', { class: 'lv-effect' }, h('b', {}, `Potere: ${b.effect}`), h('p', {}, b.text)),
        h('div', { class: 'lv-meta' }, h('span', {}, 'Partita intera · 13 round · senza carte'), h('span', { class: 'lv-skulls' }, ...Array.from({ length: 5 }, (_, i) => h('i', { class: i < Math.ceil(info.bossIndex / 2) ? 'on' : '', html: MI.skull })))),
        h('div', { class: 'lv-reward' }, h('span', { html: MI.coin }), `${fmt(reward)} monete${done ? ' (rivincita)' : ''}`),
        h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => (s.close(), this.onBoss(n)) }, 'SFIDA IL BOSS'),
      );
    } else {
      const best = p.campaign.stars[n] || 0;
      content = h(
        'div',
        { class: 'lv-sheet' },
        h('small', {}, `${info.world.name.toUpperCase()} · LIVELLO ${n}`),
        h('h3', {}, 'Obiettivi'),
        h('div', { class: 'lv-goals' }, ...info.goals.map((g) => h('span', { class: 'lv-goal' }, goalLabel(g)))),
        h('div', { class: 'lv-rolls' }, h('b', {}, String(info.rolls)), ' lanci in tutto'),
        h('div', { class: 'lv-stars' }, h('span', { html: starsHtml(2) }), ` ne avanzano ${info.stars[0]}`, h('br'), h('span', { html: starsHtml(3) }), ` ne avanzano ${info.stars[1]}`),
        best ? h('div', { class: 'lv-best', html: `Il tuo record: ${starsHtml(best)}` }) : null,
        h('div', { class: 'lv-reward' }, h('span', { html: MI.coin }), done ? `${fmt(reward)} monete (rigiocato)` : `${fmt(info.coinsFor(1))}–${fmt(info.coinsFor(3))} monete`),
        h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => (s.close(), this.play(n)) }, 'GIOCA'),
      );
    }
    const s = sheet(this.stage.top, content, { cls: 'lv' });
  }

  /* ---------------- sfida in tot lanci ---------------- */
  async play(n) {
    const info = levelInfo(n);
    const ch = new Challenge(info, Math.random);
    const p = this.profile;
    const tray = new TrayView({ onDieTap: (i) => onDie(i) });
    tray.setSkin(p.equip.dice, p.equip.roll);
    tray.setEmpty();
    const rollsEl = h('b', { class: 'ch-rolls-n' }, String(ch.rollsLeft));
    const goalsEl = h('div', { class: 'ch-goals' });
    const rollBtn = h('button', { class: 'btn ch-roll', type: 'button', onclick: () => onRoll() }, h('span', { html: MI.dice }), 'LANCIA');
    const fx = h('div', { class: 'ch-fx' });
    const hint = h('div', { class: 'ch-hint' }, 'Lancia i dadi! Tocca un dado per tenerlo.');
    const el = h(
      'div',
      { class: 'screen challenge' },
      h(
        'div',
        { class: 'ch-inner anim-in' },
        h(
          'header',
          { class: 'ch-head' },
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Esci', html: MI.back, onclick: () => this.#quit(n, ch) }),
          h('div', { class: 'ch-title' }, h('small', {}, info.world.name.toUpperCase()), h('b', {}, `LIVELLO ${n}`)),
          h('div', { class: 'ch-rolls' }, rollsEl, h('small', {}, 'LANCI')),
        ),
        h('div', { class: 'ch-label' }, 'OBIETTIVI'),
        goalsEl,
        hint,
        h('div', { class: 'ch-trayzone' }, h('div', { class: 'ch-watermark' }, h('span', { html: bossSvg(info.world.boss, 96) }), h('small', {}, `${info.world.boss.name} ti guarda…`)), tray.el),
        rollBtn,
        h('div', { class: 'ch-stars-info', html: `${starsHtml(3)} con ${info.stars[1]} lanci avanzati` }),
      ),
      fx,
    );
    let busy = false;
    const renderGoals = () => {
      const can = new Set(ch.claimable());
      goalsEl.replaceChildren(
        ...info.goals.map((g, k) =>
          h(
            'button',
            { class: `ch-goal${ch.claimed[k] ? ' is-done' : ''}${can.has(k) ? ' is-ready' : ''}`, type: 'button', dataset: { goal: String(k) }, onclick: () => onClaim(k) },
            h('span', { class: 'cg-check', html: ch.claimed[k] ? MI.star : '' }),
            h('span', { class: 'cg-name' }, goalLabel(g)),
            can.has(k) ? h('span', { class: 'cg-go' }, 'COMPLETA!') : null,
          ),
        ),
      );
      rollsEl.textContent = String(ch.rollsLeft);
      rollBtn.classList.toggle('is-disabled', !ch.canRoll());
      tray.setHeld(ch.held, ch.canHold() && !busy);
      if (can.size && ch.rollsLeft === 0) hint.textContent = 'Lanci finiti: completa l\'obiettivo!';
      else if (can.size) hint.textContent = 'Tocca l\'obiettivo verde per completarlo';
      else if (ch.rolledOnce && ch.rollsLeft > 0) hint.textContent = 'Tieni i dadi giusti e rilancia';
    };
    const onDie = (i) => {
      if (busy || !ch.canHold()) return;
      sound.hold(ch.toggleHold(i));
      buzz(8);
      renderGoals();
    };
    const onRoll = async () => {
      sound.unlock();
      if (busy) return;
      if (!ch.canRoll()) {
        sound.denied();
        shake(rollBtn);
        return;
      }
      busy = true;
      const res = ch.roll();
      tray.setHeld(ch.held, false);
      buzz(10);
      await tray.roll(res.values, res.rolled, { entering: res.rolled.length === 5 && !ch.held.some(Boolean) });
      busy = false;
      renderGoals();
      pop(rollsEl.parentElement, 1.15);
      if (ch.claimable().length) sound.combo();
      if (ch.failed) await this.#result(n, ch, false);
    };
    const onClaim = async (k) => {
      if (busy || !ch.claimable().includes(k)) return;
      busy = true;
      const chip = goalsEl.querySelector(`[data-goal="${k}"]`);
      const r = chip.getBoundingClientRect();
      const hr = el.getBoundingClientRect();
      const s = hr.width / el.offsetWidth || 1;
      ch.claim(k);
      sound.scored();
      buzz([20, 30, 20]);
      sparkle(fx, (r.left + r.width / 2 - hr.left) / s, (r.top + r.height / 2 - hr.top) / s, { colors: ['#ffe27a', '#fff', '#35c46a'], count: 18, spread: 110, size: 10 });
      await tray.clearRemaining();
      tray.setEmpty();
      busy = false;
      renderGoals();
      if (ch.done) await this.#result(n, ch, true);
      else if (ch.failed) await this.#result(n, ch, false);
    };
    renderGoals();
    this.stage.app.dataset.screen = 'challenge';
    music.play('world', { world: info.world.n });
    this.stage.setRotation(0);
    this.stage.setTurnColor('red');
    if (new URLSearchParams(location.search).has('debug')) {
      window.yatzyChallenge = { ch, roll: onRoll, claim: onClaim, hold: onDie, get busy() { return busy; } };
    }
    await this.screens.open(el, { dim: false });

  }

  #quit(n, ch) {
    if (ch.over || (!ch.rolledOnce && ch.rollsLeft === ch.level.rolls)) return this.map({ focus: n });
    const s = sheet(
      this.screens.current,
      h('div', { class: 'quit-sheet' }, h('h3', {}, 'Lasciare il livello?'), h('p', {}, 'Perderai i progressi di questo tentativo.'), h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => s.close() }, 'CONTINUA A GIOCARE'), h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => (s.close(), this.map({ focus: n })) }, 'ESCI')),
    );
  }

  async #result(n, ch, won) {
    const info = levelInfo(n);
    let rewards = null;
    let stars = 0;
    if (won) {
      stars = ch.stars();
      rewards = this.account.update((p) => P.completeLevel(p, n, { stars, coins: info.coinsFor(stars), replayCoins: info.replayCoins, xp: info.xp }));
    }
    await wait(ms(won ? 300 : 500));
    await this.showResult({ n, won, stars, rewards, retry: () => this.play(n) });
  }

  /** Schermata del risultato (sfide e boss). */
  async showResult({ n, won, stars = 0, rewards = null, retry, boss = null, score = null }) {
    const next = n + 1;
    const coinsEl = h('b', {}, '0');
    const starsEl = h('div', { class: 'rs-stars', html: boss ? '' : starsHtml(0) });
    const box = h(
      'div',
      { class: `result ${won ? 'won' : 'lost'}` },
      boss ? h('div', { class: 'rs-boss', html: bossSvg(boss, 110) }) : null,
      h('h2', {}, won ? (boss ? 'BOSS SCONFITTO!' : 'LIVELLO SUPERATO!') : boss ? 'IL BOSS HA VINTO' : 'LANCI FINITI!'),
      score ? h('div', { class: 'rs-score' }, score) : null,
      starsEl,
      won
        ? h('div', { class: 'rs-coins' }, h('span', { html: MI.coin }), '+', coinsEl, rewards.first ? null : h('small', {}, ' (rigiocato)'))
        : h('p', {}, boss ? 'Ritenta: ogni partita è diversa!' : 'Non arrenderti: tieni i dadi giusti!'),
      won && rewards.levelUp ? h('div', { class: 'rs-levelup' }, `LIVELLO GIOCATORE ${rewards.level}!`) : null,
      h(
        'div',
        { class: 'rs-actions' },
        won && next <= 100 ? h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => (next % 10 === 0 ? this.map({ focus: next }) : this.play(next)) }, next % 10 === 0 ? 'VAI AL BOSS' : 'PROSSIMO LIVELLO') : null,
        h('button', { class: `btn btn-menu ${won ? 'secondary' : 'primary'}`, type: 'button', onclick: retry }, won ? 'RIGIOCA' : 'RIPROVA'),
        h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => this.map({ focus: won ? Math.min(100, next) : n }) }, 'MAPPA'),
      ),
    );
    const fx = h('div', { class: 'rs-fx' });
    const el = h('div', { class: 'screen modal-screen result-screen' }, box, fx);
    await this.screens.open(el, { dim: true });
    if (won) {
      sound.win();
      confetti(fx, { colors: ['#ffd23f', '#ffffff', '#35c46a', '#ff5a66', '#3d9bff'], count: 70 });
      if (!boss) {
        for (let k = 1; k <= stars; k++) {
          await wait(ms(260));
          starsEl.innerHTML = starsHtml(k);
          sound.star(k - 1);
          pop(starsEl.children[k - 1], 1.5, 380);
        }
      }
      await countUp(coinsEl, 0, rewards.coins, 700);
    } else sound.lose();
  }
}
