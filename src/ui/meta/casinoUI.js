/**
 * Casinò Yatzy: si entra dalle porte, il croupier accoglie, si mettono le fiche
 * sul tavolo verde (SOTTO/SOPRA, PARI/DISPARI, TRIS, SCALA, YATZY), il croupier
 * agita il bicchiere, lo sbatte sul tavolo e scopre i 5 dadi. Vincite pagate
 * con le fiche che volano verso il saldo. Solo monete del gioco.
 */
import { h, wait, buzz, localRect } from '../dom.js';
import { play, EASE, ms, tumbleDie, setDieFace, countUp, shake, pop } from '../../anim/animations.js';
import { sparkle, confetti } from '../../anim/effects.js';
import { sound } from '../../audio/sound.js';
import { music } from '../../audio/music.js';
import { MI } from '../metaIcons.js';
import { dealerSvg } from '../dealerArt.js';
import { applyDiceSkin, skinPips } from '../skins.js';
import { BETS, BET_IDS, CHIPS, MIN_BET, totalBet, validateBets } from '../../meta/casino.js';
import * as P from '../../meta/profile.js';
import { coinPill, fmt } from './common.js';

const CHIP_COLORS = { 10: ['#f4f5f9', '#3d6fd8'], 50: ['#e8384f', '#ffffff'], 100: ['#262a3d', '#ffcf33'], 500: ['#a54dff', '#ffffff'], 1000: ['#ffcf33', '#c4102a'] };

const chipHtml = (v, size = 40) => {
  const [a, b] = CHIP_COLORS[v] || CHIP_COLORS[10];
  return `<span class="cs-chip" style="--c1:${a};--c2:${b};width:${size}px;height:${size}px"><i>${v >= 1000 ? '1K' : v}</i></span>`;
};

function buildDie(v) {
  const faces = [1, 2, 3, 4, 5, 6].map((n) => h('div', { class: `face f${n}`, html: skinPips(n) }));
  const die = h('div', { class: 'die' }, h('div', { class: 'die-shadow' }), h('div', { class: 'die-toss' }, h('div', { class: 'cube' }, ...faces, h('div', { class: 'core cx' }), h('div', { class: 'core cy' }), h('div', { class: 'core cz' }))));
  setDieFace(die, v);
  return die;
}

/** suoni del casinò (fiche, bicchiere, sbattuta, monete) */
const sfx = {
  chip: () => {
    sound.burst({ dur: 0.02, gain: 0.22, freq: 3800, q: 6 });
    sound.burst({ dur: 0.02, gain: 0.16, freq: 4600, q: 6, delay: 0.035 });
    sound.tone({ freq: 2400, type: 'sine', dur: 0.05, gain: 0.05, delay: 0.01 });
  },
  shake: () => sound.roll(5, 0.9, 'glass'),
  slam: () => {
    sound.tone({ freq: 120, to: 50, type: 'sine', dur: 0.2, gain: 0.45 });
    sound.burst({ dur: 0.06, gain: 0.3, freq: 900, q: 2 });
  },
  coins: (n = 6) => {
    for (let i = 0; i < n; i++) sound.tone({ freq: 1800 + Math.random() * 900, type: 'triangle', dur: 0.08, gain: 0.07, delay: i * 0.06 });
  },
};

export class CasinoUI {
  /** @param {{stage, screens, account, onBack:()=>void}} o */
  constructor({ stage, screens, account, onBack }) {
    this.stage = stage;
    this.screens = screens;
    this.account = account;
    this.onBack = onBack;
    this.lastBets = null;
  }

  get profile() {
    return this.account.profile;
  }

  async open() {
    const p = this.profile;
    let chip = CHIPS.find((c) => c <= Math.max(MIN_BET, p.coins)) ?? 10;
    let bets = {};
    let busy = false;
    let shown = p.coins; // saldo mostrato (scende mentre si punta)
    const history = [];

    const pill = coinPill(p.coins, { big: true });
    const dealer = h('div', { class: 'cs-dealer', html: dealerSvg(176) });
    const bubble = h('div', { class: 'cs-bubble' });
    const say = (text, mood = 'neutral') => {
      bubble.textContent = text;
      dealer.dataset.mood = mood;
      play(bubble, [{ transform: 'scale(.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: EASE.back });
    };
    const diceRow = h('div', { class: 'cs-dice' });
    const dice = [6, 5, 4, 3, 2].map((v) => {
      const slot = h('div', { class: 'cs-dslot is-empty' }, buildDie(v));
      diceRow.append(slot);
      return slot;
    });
    // dadi del banco: marmo rosa con punti d'oro
    diceRow.classList.add('skinned', 'cs-marble');
    diceRow.style.setProperty('--die-face', 'linear-gradient(125deg,rgba(255,255,255,.35) 0 8%,transparent 9% 30%,rgba(190,120,110,.28) 31% 33%,transparent 34% 62%,rgba(255,255,255,.3) 63% 65%,transparent 66%),radial-gradient(circle at 30% 25%,#fbe6e0,#efc4bc 55%,#dca29a)');
    diceRow.style.setProperty('--die-pip', '#c9922e');
    diceRow.style.setProperty('--die-edge', '#d8a098');
    const sumEl = h('div', { class: 'cs-sum' }, h('small', {}, 'SOMMA'), h('b', {}, '–'));
    const hist = h('div', { class: 'cs-history' });
    const boxes = {};
    const betGrid = h('div', { class: 'cs-bets' });
    for (const id of BET_IDS) {
      const b = BETS[id];
      const stack = h('div', { class: 'cs-stack' });
      const box = h(
        'button',
        { class: `cs-bet b-${id}`, type: 'button', dataset: { bet: id }, onclick: () => place(id) },
        h('b', {}, b.label),
        h('small', {}, b.sub),
        h('span', { class: 'cs-pays' }, `paga ${b.pays}×`),
        stack,
      );
      boxes[id] = { box, stack };
      betGrid.append(box);
    }
    const rack = h('div', { class: 'cs-rack' });
    const renderRack = () => {
      rack.replaceChildren(
        ...CHIPS.map((v) =>
          h('button', { class: `cs-rackchip${v === chip ? ' is-on' : ''}${v > shown ? ' is-off' : ''}`, type: 'button', dataset: { chip: String(v) }, html: chipHtml(v, 44), onclick: () => ((chip = v), sound.tap(), renderRack()) }),
        ),
      );
    };
    const clearBtn = h('button', { class: 'btn cs-btn ghost', type: 'button', onclick: () => clearBets() }, 'ANNULLA');
    const repeatBtn = h('button', { class: 'btn cs-btn ghost', type: 'button', onclick: () => repeat() }, 'RIPETI');
    const rollBtn = h('button', { class: 'btn cs-btn go', type: 'button', onclick: () => roll() }, h('span', { html: MI.dice }), 'LANCIA');
    const totalEl = h('div', { class: 'cs-total' }, 'Puntata: ', h('b', {}, '0'));

    const renderStacks = () => {
      for (const id of BET_IDS) {
        const v = bets[id] || 0;
        const { stack, box } = boxes[id];
        box.classList.toggle('has-bet', v > 0);
        if (!v) {
          stack.replaceChildren();
          continue;
        }
        // pila di fiche: dalle più grandi alle più piccole, max 6 visibili
        const parts = [];
        let left = v;
        for (const c of [...CHIPS].reverse()) while (left >= c && parts.length < 6) (parts.push(c), (left -= c));
        stack.replaceChildren(...parts.map((c, i) => h('span', { class: 'cs-stackchip', style: { bottom: `${i * 4}px` }, html: chipHtml(c, 30) })), h('em', {}, fmt(v)));
      }
      totalEl.lastChild.textContent = fmt(totalBet(bets));
      rollBtn.classList.toggle('is-disabled', totalBet(bets) <= 0);
      pill.set(shown);
      renderRack();
    };

    const flyChip = (from, to, value) => {
      const host = el;
      const hr = host.getBoundingClientRect();
      const s = hr.width / host.offsetWidth || 1;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const c = h('div', { class: 'cs-flychip', html: chipHtml(value, 34) });
      c.style.left = `${(a.left + a.width / 2 - hr.left) / s - 17}px`;
      c.style.top = `${(a.top + a.height / 2 - hr.top) / s - 17}px`;
      host.append(c);
      const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / s;
      const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / s;
      return play(c, [{ transform: 'translate(0,0) scale(1) rotate(0)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(1.15) rotate(180deg)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px) scale(.85) rotate(360deg)` }], { duration: 420, easing: EASE.inOut }).then(() => c.remove());
    };

    const place = async (id) => {
      sound.unlock();
      if (busy) return;
      if (shown < chip) {
        sound.denied();
        shake(pill);
        say(shown < MIN_BET ? 'Hai finito le monete: torna a giocare la campagna!' : 'Non hai abbastanza monete per questa fiche.', 'sad');
        return;
      }
      bets[id] = (bets[id] || 0) + chip;
      shown -= chip;
      sfx.chip();
      buzz(8);
      const from = rack.querySelector(`[data-chip="${chip}"]`) || rack;
      flyChip(from, boxes[id].stack, chip).then(() => sfx.chip());
      renderStacks();
      pop(boxes[id].box, 1.04, 200);
    };

    const clearBets = () => {
      if (busy || !totalBet(bets)) return;
      shown += totalBet(bets);
      bets = {};
      sound.tap();
      renderStacks();
    };

    const repeat = () => {
      if (busy || !this.lastBets) return;
      clearBets();
      const need = totalBet(this.lastBets);
      if (need > shown) {
        sound.denied();
        say('Non hai abbastanza monete per ripetere.', 'sad');
        return;
      }
      bets = { ...this.lastBets };
      shown -= need;
      sfx.chip();
      renderStacks();
    };

    const roll = async () => {
      sound.unlock();
      if (busy) return;
      const err = validateBets(bets, this.profile.coins);
      if (err) {
        sound.denied();
        shake(rollBtn);
        say(err, 'sad');
        return;
      }
      busy = true;
      el.classList.add('is-rolling');
      const placed = { ...bets };
      this.lastBets = placed;
      const res = this.account.update((pp) => P.casinoRound(pp, placed));
      say('Niente più puntate!', 'neutral');
      // il croupier agita il bicchiere
      const arm = dealer.querySelector('.dl-arm');
      sfx.shake();
      await play(arm, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-14deg) translateY(-6px)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-12deg) translateY(-4px)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(0deg)' }], { duration: 900, easing: 'ease-in-out' });
      // il bicchiere vola sul tavolo e sbatte
      const cup = h('div', { class: 'cs-cup', html: '<i></i>' });
      diceRow.append(cup);
      dice.forEach((d) => d.classList.add('is-empty'));
      await play(cup, [{ transform: 'translate(90px,-150px) scale(.6) rotate(-30deg)', opacity: 0 }, { transform: 'translate(0,-20px) scale(1.05) rotate(0)', opacity: 1, offset: 0.7 }, { transform: 'translate(0,0) scale(1,.92)' }], { duration: 420, easing: EASE.in });
      sfx.slam();
      buzz([30, 20, 40]);
      shake(table, 5);
      await wait(ms(260));
      // si alza il bicchiere: i dadi rotolano fuori
      play(cup, [{ transform: 'translate(0,0)' }, { transform: 'translate(0,-160px) rotate(18deg)', opacity: 0 }], { duration: 380, easing: EASE.out, fill: 'forwards' }).then(() => cup.remove());
      dice.forEach((d) => d.classList.remove('is-empty'));
      await Promise.all(dice.map((d, i) => tumbleDie(d.firstChild, res.dice[i], { delay: i * 70, duration: 820, entering: true, onLand: () => sound.land(0, res.dice[i], i, 'glass') })));
      // conteggio della somma
      let total = 0;
      for (let i = 0; i < 5; i++) {
        dice[i].classList.add('is-count');
        total += res.dice[i];
        sumEl.lastChild.textContent = String(total);
        sound.plink(i);
        pop(sumEl, 1.12, 160);
        await wait(ms(150));
      }
      dice.forEach((d) => d.classList.remove('is-count'));
      history.unshift(res.sum);
      hist.replaceChildren(...history.slice(0, 9).map((v, i) => h('span', { class: `${v >= 18 ? 'hi' : 'lo'}${i === 0 ? ' new' : ''}` }, String(v))));
      // vincite
      const won = Object.keys(res.wins);
      for (const id of BET_IDS) {
        const isWin = Boolean(res.wins[id]);
        boxes[id].box.classList.toggle('is-win', isWin && placed[id] > 0);
        boxes[id].box.classList.toggle('is-lose', !isWin && placed[id] > 0);
        boxes[id].box.classList.toggle('is-hit', BETS[id].test(res.dice));
      }
      await wait(ms(350));
      // le fiche perse vanno al banco
      for (const id of BET_IDS) if (placed[id] && !res.wins[id]) flyChip(boxes[id].stack, dealer, 100);
      if (won.length) {
        const big = res.payout >= 1000 || won.includes('yatzy') || won.includes('straight');
        say(`${res.sum}! ${won.map((id) => BETS[id].label).join(' e ')}: vinci ${fmt(res.payout)} monete!`, big ? 'wow' : 'happy');
        sound.casinoWin(big);
        for (const id of won) for (let k = 0; k < 3; k++) setTimeout(() => flyChip(boxes[id].stack, pill, 500), ms(k * 90));
        sfx.coins(8);
        const r = localRect(pill, el, false);
        sparkle(fxLayer, r.x + r.w / 2, r.y + r.h / 2, { colors: ['#ffe27a', '#fff', '#ffcf33'], count: 18, spread: 90, size: 9 });
        if (big) confetti(fxLayer, { colors: ['#ffd23f', '#ffffff', '#ff3d7f', '#2fd0ff'], count: 90 });
        await countUp(pill.lastChild, shown, shown + res.payout, 900);
      } else {
        say(`${res.sum}. Il banco vince… ritenta!`, 'sad');
        sound.casinoLose();
        shake(dealer, 3);
      }
      shown = this.profile.coins;
      bets = {};
      await wait(ms(700));
      for (const id of BET_IDS) boxes[id].box.classList.remove('is-win', 'is-lose');
      renderStacks();
      el.classList.remove('is-rolling');
      busy = false;
      setTimeout(() => {
        if (!busy) dealer.dataset.mood = 'neutral';
      }, 2500);
    };

    const table = h(
      'div',
      { class: 'cs-table' },
      h('div', { class: 'cs-felt-top' }, diceRow, sumEl),
      betGrid,
    );
    const fxLayer = h('div', { class: 'cs-fx' });
    const doorL = h('div', { class: 'cs-door l' }, h('i'));
    const doorR = h('div', { class: 'cs-door r' }, h('i'));
    const el = h(
      'div',
      { class: 'screen casino' },
      h('div', { class: 'cs-room' }, h('div', { class: 'cs-neon' }, ...'CASINÒ YATZY'.split('').map((ch, i) => h('span', { style: { animationDelay: `${i * 0.08}s` } }, ch === ' ' ? '\u00a0' : ch))), h('div', { class: 'cs-lamp l' }), h('div', { class: 'cs-lamp r' })),
      h(
        'div',
        { class: 'cs-inner' },
        h('header', { class: 'cs-head' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Esci dal casinò', html: MI.back, onclick: () => !busy && this.onBack() }), hist, pill),
        h('div', { class: 'cs-dealer-zone' }, dealer, bubble),
        table,
        h('div', { class: 'cs-bottom' }, rack, h('div', { class: 'cs-actions' }, clearBtn, repeatBtn, totalEl, rollBtn), h('p', { class: 'cs-note' }, `Solo monete del gioco, niente soldi veri. SOTTO/SOPRA e PARI/DISPARI: 50%. Puntata minima ${MIN_BET}.`)),
      ),
      fxLayer,
      doorL,
      doorR,
    );
    dealer.dataset.mood = 'neutral';
    renderStacks();
    this.stage.app.dataset.screen = 'casino';
    music.play('casino');
    await this.screens.open(el, { dim: false });
    // ingresso: le porte si aprono
    sound.burst({ dur: 0.6, gain: 0.1, freq: 300, sweepTo: 1200, q: 0.7 });
    await Promise.all([
      play(doorL, [{ transform: 'translateX(0)' }, { transform: 'translateX(-102%)' }], { duration: 700, easing: EASE.inOut, fill: 'forwards' }),
      play(doorR, [{ transform: 'translateX(0)' }, { transform: 'translateX(102%)' }], { duration: 700, easing: EASE.inOut, fill: 'forwards' }),
    ]);
    doorL.remove();
    doorR.remove();
    say(this.profile.coins >= MIN_BET ? 'Benvenuto al Casinò Yatzy! Scegli una fiche e punta.' : 'Benvenuto! Ti servono almeno 10 monete per giocare.', 'happy');
    if (new URLSearchParams(location.search).has('debug')) window.yatzyCasino = { place, roll, get busy() { return busy; }, get bets() { return bets; } };
  }
}
