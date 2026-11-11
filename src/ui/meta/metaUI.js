/**
 * Menu principale e schermate del profilo: intro, hub, negozio, armadio,
 * profilo, classifica, accesso e impostazioni.
 */
import { h, wait, buzz } from '../dom.js';
import { play, EASE, ms, tumbleDie, setDieFace } from '../../anim/animations.js';
import { sparkle, confetti, toast } from '../../anim/effects.js';
import { sound } from '../../audio/sound.js';
import { MI, chestSvg, rankBadge } from '../metaIcons.js';
import { avatarSvg } from '../avatar.js';
import { bossSvg } from '../bossArt.js';
import { applyTheme, applyDiceSkin, skinPips, rollStyleOf } from '../skins.js';
import { TrayView } from '../trayView.js';
import { ITEMS, ITEM_LIST, CATEGORIES, OPTIONAL, RARITY, RARITY_ORDER, SKIN_TONES, rarityRank } from '../../meta/catalog.js';
import { CHESTS, SHOP_CHESTS, dailyOffers, dayKey, levelFromXp, rankOf, RANKS } from '../../meta/economy.js';
import * as P from '../../meta/profile.js';
import { WORLDS } from '../../campaign/campaign.js';
import { pageShell, coinPill, itemTile, itemArt, rarityChip, sheet, fmt } from './common.js';
import { openChestAnimation, catLabel } from './chestOpen.js';
import { Account } from '../../net/account.js';
import { music } from '../../audio/music.js';
import { previewSound } from '../../audio/voices.js';
import { CasinoUI } from './casinoUI.js';
import { dealerSvg } from '../dealerArt.js';

const toggle = (label, on, onChange) => {
  const input = h('input', { type: 'checkbox', checked: on, onchange: (e) => onChange(e.target.checked) });
  return h('label', { class: 'toggle' }, h('span', {}, label), input, h('span', { class: 'toggle-ui' }));
};

const hms = (t) => {
  const s = Math.max(0, Math.ceil(t / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, '0')).join(':');
};

function buildDie(v) {
  const faces = [1, 2, 3, 4, 5, 6].map((n) => h('div', { class: `face f${n}`, html: skinPips(n) }));
  const die = h('div', { class: 'die' }, h('div', { class: 'die-shadow' }), h('div', { class: 'die-toss' }, h('div', { class: 'cube' }, ...faces, h('div', { class: 'core cx' }), h('div', { class: 'core cy' }), h('div', { class: 'core cz' }))));
  setDieFace(die, v);
  return die;
}

export class MetaUI {
  /**
   * @param {{stage, screens, account: Account, settings, actions}} o
   * actions: campaign, online, local, rules, install, installable(), updateSettings(patch)
   */
  constructor({ stage, screens, account, settings, actions }) {
    this.stage = stage;
    this.screens = screens;
    this.account = account;
    this.settings = settings;
    this.actions = actions;
    this.timers = new Set();
    this.casinoUI = new CasinoUI({ stage, screens, account, onBack: () => this.shop() });
    account.onChange(() => {
      this.applySkins();
      this.refresh?.();
    });
    this.applySkins();
  }

  get profile() {
    return this.account.profile;
  }

  /** Tema del tavolo e skin delle carte del giocatore. */
  applySkins() {
    applyTheme(this.stage.app, this.profile.equip);
    sound.cardVoice = ITEMS[this.profile.equip.cards]?.skin || 'silver';
    sound.prepareCards(sound.cardVoice);
    music.setAmbient(ITEMS[this.profile.equip.table]?.theme || 'classic');
  }

  #clearTimers() {
    this.timers.forEach((t) => clearInterval(t));
    this.timers.clear();
    this.refresh = null;
  }

  #every(fn, ms_) {
    const t = setInterval(fn, ms_);
    this.timers.add(t);
    return t;
  }

  async #open(el) {
    this.#clearTimers();
    music.play('menu');
    this.stage.app.dataset.screen = 'hub';
    this.stage.setRotation(0);
    this.stage.setTurnColor('red');
    await this.screens.open(el, { dim: false });
  }

  #needAccount(reason, then) {
    if (this.account.loggedIn) return then();
    this.auth({ reason, onDone: then });
  }

  /* ------------------------------------------------------------ */
  /* INTRO: dadi che rotolano, YATZY che scoppia, pulsante GIOCA    */
  /* ------------------------------------------------------------ */
  async intro() {
    const dice = [0, 1, 2, 3, 4].map((i) => buildDie(((i * 2) % 6) + 1));
    const tray = h('div', { class: 'intro-dice' }, ...dice.map((d) => h('div', { class: 'intro-slot' }, d)));
    applyDiceSkin(tray, this.profile.equip.dice);
    const letters = ['Y', 'A', 'T', 'Z', 'Y'].map((l, i) => h('span', { class: `logo-die d${i}` }, l));
    const logo = h('div', { class: 'logo intro-logo' }, ...letters);
    const boom = h('div', { class: 'intro-boom' });
    const go = h('button', { class: 'btn intro-play', type: 'button' }, 'GIOCA');
    const fx = h('div', { class: 'intro-fx' });
    const el = h('div', { class: 'screen intro' }, h('div', { class: 'intro-inner' }, tray, boom, logo, h('div', { class: 'intro-sub' }, 'DUELLO DI DADI'), go), fx);
    logo.style.opacity = '0';
    go.style.opacity = '0';
    el.querySelector('.intro-sub').style.opacity = '0';
    // i browser fanno partire l'audio solo dopo un tocco: se è bloccato, prima "tocca per iniziare"
    sound.unlock();
    // il contesto audio può impiegare un attimo a partire anche quando è permesso
    for (let k = 0; k < 6 && sound.ctx && sound.ctx.state !== 'running'; k++) await wait(40);
    if (sound.ctx && sound.ctx.state !== 'running') {
      const tap = h(
        'div',
        { class: 'screen intro-tap' },
        h('div', { class: 'it-die', html: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="10" fill="#fff"/><circle cx="15" cy="15" r="4.4" fill="#ee4655"/><circle cx="33" cy="15" r="4.4" fill="#2f8ae8"/><circle cx="24" cy="24" r="4.4" fill="#262a3d"/><circle cx="15" cy="33" r="4.4" fill="#2f8ae8"/><circle cx="33" cy="33" r="4.4" fill="#ee4655"/></svg>' }),
        h('b', {}, 'TOCCA PER INIZIARE'),
        h('small', {}, 'Alza il volume: dadi, musica e sorprese ti aspettano'),
      );
      this.stage.app.dataset.screen = 'intro';
      const tapped = new Promise((resolve) => tap.addEventListener('pointerdown', resolve, { once: true }));
      await this.screens.open(tap, { dim: false });
      await tapped;
      sound.unlock();
      sound.tap();
      await play(tap, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'linear', fill: 'forwards' });
    }
    music.play('intro');
    this.stage.app.dataset.screen = 'intro';
    await this.screens.open(el, { dim: false });

    let skip = false;
    const skipper = () => (skip = true);
    el.addEventListener('pointerdown', skipper);
    // 1. i dadi entrano rotolando
    const voice = ITEMS[this.profile.equip.dice]?.voice || 'classic';
    sound.roll(5, 1.1, voice);
    await Promise.all(dice.map((d, i) => tumbleDie(d, [6, 1, 5, 2, 6][i], { delay: i * 90, duration: 1100, entering: true, onLand: () => sound.land(0, [6, 1, 5, 2, 6][i], i, voice) })));
    if (!skip) await wait(ms(250));
    // 2. i dadi si stringono e scoppiano nella scritta
    await Promise.all(dice.map((d, i) => play(d.parentElement, [{ transform: 'none' }, { transform: `translateX(${(2 - i) * 46}px) scale(.6)`, opacity: 0.9 }], { duration: 260, easing: EASE.in, fill: 'forwards' })));
    tray.style.visibility = 'hidden';
    sound.yatzy();
    music.hit();
    buzz([30, 40, 30]);
    boom.classList.add('is-on');
    const r = boom.getBoundingClientRect();
    const hr = el.getBoundingClientRect();
    const s = hr.width / el.offsetWidth || 1;
    sparkle(fx, (r.left + r.width / 2 - hr.left) / s, (r.top + r.height / 2 - hr.top) / s, { colors: ['#fff6c2', '#ffd23f', '#ffffff', '#ff6f78', '#5aaeff'], count: 34, spread: 220, size: 14 });
    logo.style.opacity = '';
    await Promise.all(
      letters.map((l, i) =>
        play(l, [{ transform: `translateX(${(2 - i) * 40}px) scale(0) rotate(${(i - 2) * 40}deg)`, opacity: 0 }, { transform: 'scale(1.35)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 620, delay: i * 50, easing: EASE.out }),
      ),
    );
    confetti(fx, { colors: ['#ff5a66', '#3d9bff', '#ffd23f', '#ffffff', '#35c46a'], count: 50, duration: 2200 });
    const sub = el.querySelector('.intro-sub');
    sub.style.opacity = '';
    play(sub, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE.out });
    // 3. pulsante GIOCA
    await wait(ms(skip ? 50 : 250));
    go.style.opacity = '';
    await play(go, [{ transform: 'scale(0)' }, { transform: 'scale(1.15)', offset: 0.7 }, { transform: 'none' }], { duration: 420, easing: EASE.out });
    go.classList.add('is-pulse');
    el.removeEventListener('pointerdown', skipper);
    await new Promise((resolve) => go.addEventListener('click', resolve, { once: true }));
    sound.unlock();
    sound.tap();
    music.play('menu');
    buzz(15);
  }

  /* ------------------------------------------------------------ */
  /* HUB                                                           */
  /* ------------------------------------------------------------ */
  async hub() {
    const el = h('div', { class: 'screen hub' });
    const render = () => {
      const p = this.profile;
      const lv = levelFromXp(p.xp);
      const rank = rankOf(p.rank.points);
      const logged = this.account.loggedIn;
      const best = p.campaign.best;
      const world = WORLDS[Math.min(9, Math.floor(best / 10))];
      const next = Math.min(100, best + 1);
      const daily = P.canClaimDaily(p);
      const title = ITEMS[p.equip.title]?.name ?? '';
      const btn = (cls, icon, label, sub, onclick, badge = null) =>
        h('button', { class: `hub-btn ${cls}`, type: 'button', onclick }, h('span', { class: 'hb-ico', html: icon }), h('span', { class: 'hb-label' }, label), sub ? h('span', { class: 'hb-sub' }, sub) : null, badge);
      el.replaceChildren(
        h(
          'div',
          { class: 'hub-inner anim-in' },
          h(
            'header',
            { class: 'hub-top' },
            h(
              'button',
              { class: 'hub-me', type: 'button', onclick: () => this.profilePage() },
              h('span', { class: `av-frame f-${ITEMS[p.equip.frame]?.frame ?? 'basic'}`, html: avatarSvg(p, { size: 50, bust: true }) }),
              h('span', { class: 'hm-text' }, h('b', {}, logged ? p.username : 'Ospite'), h('small', {}, title), h('span', { class: 'hm-xp' }, h('i', { style: { width: `${Math.round((lv.into / lv.need) * 100)}%` } }), h('em', {}, `LV ${lv.level}`))),
            ),
            h('div', { class: 'hub-top-right' }, coinPill(p.coins), h('button', { class: 'icon-btn hub-gear', type: 'button', 'aria-label': 'Impostazioni', html: MI.gear, onclick: () => this.settingsSheet() })),
          ),
          logged
            ? h('div', { class: 'hub-rank', style: { '--rc': rank.color } }, h('span', { html: rankBadge(rank, 30) }), h('b', {}, rank.name.toUpperCase()), h('span', {}, `${p.rank.points} punti`), h('span', { class: 'hr-bar' }, h('i', { style: { width: `${Math.round(rank.progress * 100)}%` } })))
            : h('button', { class: 'hub-guest', type: 'button', onclick: () => this.auth({}) }, h('span', { html: MI.user }), h('span', {}, h('b', {}, 'CREA IL TUO ACCOUNT'), h('small', {}, 'per negozio, casse e partite online'))),
          h(
            'button',
            { class: 'hub-campaign', type: 'button', style: { '--w1': world.colors[0], '--w2': world.colors[1] }, onclick: () => this.actions.campaign() },
            h('span', { class: 'hc-boss', html: bossSvg(world.boss, 104) }),
            h('span', { class: 'hc-text' }, h('small', {}, 'CAMPAGNA'), h('b', {}, world.name), h('span', {}, best >= 100 ? 'Campagna completata!' : `Livello ${next} di 100`), h('span', { class: 'hc-bar' }, h('i', { style: { width: `${best}%` } }))),
            h('span', { class: 'hc-play' }, 'GIOCA'),
          ),
          h(
            'div',
            { class: 'hub-grid' },
            btn('online', MI.globe, 'ONLINE', logged ? `Rango ${rank.name}` : 'Serve un account', () => this.#needAccount('Per giocare online serve un account.', () => this.actions.online())),
            btn('duo', MI.duo, '2 GIOCATORI', 'Stesso telefono', () => this.actions.local()),
            btn('shop', MI.shop, 'NEGOZIO', 'Casse e offerte', () => this.#needAccount('Per il negozio serve un account.', () => this.shop()), daily ? h('span', { class: 'hb-badge' }, 'CASSA GRATIS!') : null),
            btn('wardrobe', MI.shirt, 'PERSONALIZZA', `${p.owned.length}/${ITEM_LIST.length} oggetti`, () => this.wardrobe()),
          ),
          h(
            'div',
            { class: 'hub-row' },
            btn('mini', MI.user, 'PROFILO', null, () => this.profilePage()),
            btn('mini', MI.podium, 'CLASSIFICA', null, () => this.leaderboard()),
            btn('mini', MI.rules, 'REGOLE', null, () => this.actions.rules()),
            this.actions.installable() ? btn('mini install', MI.install, 'INSTALLA', null, () => this.actions.install()) : null,
          ),
          h(
            'button',
            { class: 'hub-today', type: 'button', onclick: () => this.#needAccount('Per il negozio serve un account.', () => this.shop()) },
            h('span', { class: 'ht-label' }, 'OGGI NEL', h('br'), 'NEGOZIO', h('small', {}, 'offerte del giorno')),
            h('span', { class: 'ht-items' }, ...dailyOffers(dayKey()).map((o) => h('span', { class: 'ht-item', style: { '--rc': RARITY[o.rarity].color }, html: itemArt(o.id, 44) }))),
          ),
          h(
            'div',
            { class: 'hub-stats' },
            h('div', { class: 'hub-stat' }, h('b', {}, `${P.totalStars(p)}★`), h('small', {}, 'stelle campagna')),
            h('div', { class: 'hub-stat' }, h('b', {}, `${p.stats.bosses}/10`), h('small', {}, 'boss battuti')),
            h('div', { class: 'hub-stat' }, h('b', {}, fmt(p.stats.onlineWins)), h('small', {}, 'vittorie online')),
          ),
          h('div', { class: 'hub-foot' }, logged ? (this.account.status === 'offline' ? 'Offline: i progressi si salvano appena torna la rete' : 'Progressi salvati nel tuo account') : 'Gioca come ospite: crea un account per salvare tutto'),
        ),
      );
    };
    render();
    await this.#open(el);
    this.refresh = render;
    this.#every(() => {
      const badge = el.querySelector('.hub-btn.shop .hb-badge');
      if (!badge && P.canClaimDaily(this.profile)) render();
    }, 30000);
  }

  /* ------------------------------------------------------------ */
  /* NEGOZIO                                                       */
  /* ------------------------------------------------------------ */
  async shop() {
    const { el, body, pill } = pageShell({ title: 'Negozio', onBack: () => this.hub(), coins: this.profile.coins, icon: MI.shop, cls: 'shop' });
    const render = () => {
      const p = this.profile;
      pill.set(p.coins);
      const ready = P.canClaimDaily(p);
      const timer = h('span', { class: 'daily-timer' }, ready ? 'PRONTA!' : `Tra ${hms(P.dailyReadyAt(p) - Date.now())}`);
      const daily = h(
        'div',
        { class: `shop-daily${ready ? ' is-ready' : ''}` },
        h('span', { class: 'sd-chest', html: chestSvg('daily', 92) }),
        h('div', { class: 'sd-text' }, h('b', {}, 'CASSA GRATUITA'), h('small', {}, 'Ogni 24 ore: un oggetto e qualche moneta'), timer),
        h('button', { class: 'btn shop-buy', type: 'button', disabled: !ready, onclick: () => this.#buyChest('daily') }, ready ? 'APRI' : h('span', { html: MI.lock })),
      );
      if (!ready)
        this.#every(() => {
          const left = P.dailyReadyAt(this.profile) - Date.now();
          if (left <= 0) render();
          else timer.textContent = `Tra ${hms(left)}`;
        }, 1000);
      const chests = SHOP_CHESTS.map((id) => {
        const c = CHESTS[id];
        const top = RARITY_ORDER.filter((r) => c.odds[r] > 0).at(-1);
        const can = p.coins >= c.cost;
        return h(
          'div',
          { class: `shop-chest sc-${id}` },
          h('span', { class: 'sc-art', html: chestSvg(id, 96) }),
          h('b', {}, c.name.replace('Cassa ', '').toUpperCase()),
          h('small', {}, `${c.items} ${c.items > 1 ? 'oggetti' : 'oggetto'}${c.guarantee ? ` · min. ${RARITY[c.guarantee].label}` : ''}`),
          h('small', { class: 'sc-top', style: { color: RARITY[top].color } }, `fino a ${RARITY[top].label}`),
          h('button', { class: `btn shop-buy${can ? '' : ' is-poor'}`, type: 'button', onclick: () => this.#buyChest(id) }, h('span', { class: 'cp-ico', html: MI.coin }), fmt(c.cost)),
        );
      });
      const offers = dailyOffers(dayKey()).map((o) => {
        const owned = P.owns(p, o.id);
        return itemTile(o.id, {
          owned: true,
          size: 58,
          onTap: owned ? null : () => this.#buyOffer(o),
          extra: owned ? h('span', { class: 'it-price owned' }, 'POSSEDUTO') : h('span', { class: `it-price${p.coins >= o.price ? '' : ' is-poor'}` }, h('span', { html: MI.coin }), fmt(o.price)),
        });
      });
      const casino = h(
        'button',
        { class: 'shop-casino', type: 'button', onclick: () => this.casino() },
        h('span', { class: 'sc-dealer', html: dealerSvg(96) }),
        h('span', { class: 'sc-text' }, h('b', {}, 'CASINÒ YATZY'), h('small', {}, 'Il croupier lancia i dadi: punta su SOTTO o SOPRA, PARI o DISPARI… e raddoppia le monete!'), h('span', { class: 'sc-go' }, 'ENTRA')),
      );
      body.replaceChildren(
        daily,
        casino,
        h('h3', { class: 'sec-title' }, 'CASSE'),
        h('div', { class: 'shop-chests' }, ...chests),
        h('button', { class: 'link-btn', type: 'button', onclick: () => this.#oddsSheet(this.stage.top) }, 'Probabilità delle casse'),
        h('h3', { class: 'sec-title' }, 'OFFERTE DEL GIORNO', h('small', {}, 'cambiano a mezzanotte')),
        h('div', { class: 'item-grid offers' }, ...offers),
        h('p', { class: 'shop-note' }, 'Le monete si guadagnano con i livelli della campagna, i boss e le vittorie online. Gli oggetti doppi diventano monete.'),
      );
    };
    render();
    await this.#open(el);
    this.refresh = () => {
      this.#clearTimersOnly();
      render();
    };
  }

  /** Casinò (solo con account, come il negozio). */
  async casino() {
    this.#clearTimers();
    sound.tap();
    await this.casinoUI.open();
  }

  #clearTimersOnly() {
    this.timers.forEach((t) => clearInterval(t));
    this.timers.clear();
  }

  #oddsSheet(host) {
    const rows = ['daily', ...SHOP_CHESTS].map((id) =>
      h('div', { class: 'odds-row' }, h('b', {}, CHESTS[id].name), h('div', { class: 'odds-bars' }, ...RARITY_ORDER.filter((r) => CHESTS[id].odds[r] > 0).map((r) => h('span', { style: { '--rc': RARITY[r].color } }, `${RARITY[r].label} ${CHESTS[id].odds[r]}%`)))),
    );
    const s = sheet(host, h('div', {}, h('h3', {}, 'Probabilità per oggetto'), ...rows, h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => s.close() }, 'OK')), { cls: 'odds' });
  }

  async #buyChest(id) {
    sound.unlock();
    const p = this.profile;
    if (id !== 'daily' && p.coins < CHESTS[id].cost) {
      sound.denied();
      toast(this.stage.top, 'MONETE INSUFFICIENTI', { x: 195, y: 120, kind: 'hint' });
      return;
    }
    let res;
    try {
      res = this.account.update((pp) => P.openChest(pp, id, Math.random));
    } catch (e) {
      sound.denied();
      toast(this.stage.top, e.message.toUpperCase(), { x: 195, y: 120, kind: 'hint' });
      return;
    }
    await openChestAnimation(this.stage.top, id, res);
    this.refresh?.();
  }

  #buyOffer(o) {
    const p = this.profile;
    if (p.coins < o.price) {
      sound.denied();
      toast(this.stage.top, 'MONETE INSUFFICIENTI', { x: 195, y: 120, kind: 'hint' });
      return;
    }
    const it = ITEMS[o.id];
    const s = sheet(
      this.screens.current,
      h(
        'div',
        { class: 'buy-sheet' },
        h('div', { class: 'bs-art', html: itemArt(o.id, 120) }),
        rarityChip(it.rarity),
        h('h3', {}, it.name),
        h('p', {}, catLabel(it.cat)),
        h(
          'button',
          {
            class: 'btn btn-menu primary',
            type: 'button',
            onclick: () => {
              try {
                this.account.update((pp) => P.buyOffer(pp, o.id));
                sound.buy();
                sound.reveal(it.rarity === 'mythic' ? 'legendary' : it.rarity);
                s.close();
                this.refresh?.();
              } catch (e) {
                sound.denied();
                toast(this.stage.top, e.message.toUpperCase(), { x: 195, y: 120, kind: 'hint' });
              }
            },
          },
          h('span', { class: 'cp-ico', html: MI.coin }),
          `COMPRA ${fmt(o.price)}`,
        ),
        h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => s.close() }, 'NO, GRAZIE'),
      ),
    );
  }

  /* ------------------------------------------------------------ */
  /* PERSONALIZZA (armadio)                                        */
  /* ------------------------------------------------------------ */
  async wardrobe(startCat = 'hat') {
    let cat = startCat;
    const { el, body } = pageShell({ title: 'Personalizza', onBack: () => this.hub(), icon: MI.shirt, cls: 'wardrobe' });
    const preview = h('div', { class: 'wd-preview' });
    const tabs = h('div', { class: 'wd-tabs' });
    const grid = h('div', { class: 'item-grid' });
    const info = h('div', { class: 'wd-info' });
    const trayBox = h('div', { class: 'wd-tray' });
    const tray = new TrayView({ count: 3, onDieTap: () => {} });
    trayBox.append(tray.el, h('button', { class: 'btn wd-try', type: 'button', onclick: () => tryRoll() }, h('span', { html: MI.dice }), 'PROVA'));
    const tryRoll = () => {
      tray.roll([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)], [0, 1, 2]);
    };
    tray.showValues([6, 3, 5]);
    const render = () => {
      const p = this.profile;
      tray.setSkin(p.equip.dice, p.equip.roll);
      const gameCat = ['dice', 'roll', 'cards', 'table'].includes(cat);
      preview.replaceChildren(
        h('div', { class: `wd-avatar av-frame f-${ITEMS[p.equip.frame]?.frame ?? 'basic'}`, html: avatarSvg(p, { size: 120 }) }),
        h('div', { class: 'wd-side' }, h('b', {}, p.username || 'Ospite'), h('small', {}, ITEMS[p.equip.title]?.name ?? ''), gameCat ? trayBox : h('div', { class: 'wd-owned' }, `${p.owned.length}/${ITEM_LIST.length}`, h('small', {}, 'oggetti trovati'))),
      );
      tabs.replaceChildren(
        ...[...CATEGORIES, { id: 'tone', label: 'Carnagione' }].map((c) => h('button', { class: `wd-tab${c.id === cat ? ' is-on' : ''}`, type: 'button', onclick: () => ((cat = c.id), render()) }, c.label)),
      );
      if (cat === 'tone') {
        grid.replaceChildren(
          ...SKIN_TONES.map((tone, k) =>
            h('button', { class: `tone-tile${p.skinTone === k ? ' is-equipped' : ''}`, type: 'button', style: { background: tone }, onclick: () => (this.account.update((pp) => P.setSkinTone(pp, k)), sound.tap()) }),
          ),
        );
        info.textContent = 'La carnagione è sempre libera.';
        return;
      }
      const list = ITEM_LIST.filter((it) => it.cat === cat).sort((a, b) => Number(P.owns(p, b.id)) - Number(P.owns(p, a.id)) || rarityRank(a.rarity) - rarityRank(b.rarity));
      const ownedN = list.filter((it) => P.owns(p, it.id)).length;
      info.textContent = `${ownedN}/${list.length} ${CATEGORIES.find((c) => c.id === cat).label.toLowerCase()} · ${OPTIONAL.has(cat) ? 'tocca di nuovo per togliere' : 'tocca per usare'}`;
      grid.replaceChildren(...list.map((it) => itemTile(it.id, { owned: P.owns(p, it.id), equipped: p.equip[cat] === it.id, onTap: (id) => this.#equip(cat, id, grid) })));
    };
    body.replaceChildren(preview, tabs, info, grid);
    render();
    await this.#open(el);
    this.refresh = render;
    this.#wardrobeRoll = () => {
      if (['dice', 'roll'].includes(cat)) tryRoll();
    };
  }

  #wardrobeRoll = null;

  #equip(cat, id, grid) {
    const p = this.profile;
    const it = ITEMS[id];
    if (!P.owns(p, id)) {
      sound.denied();
      const tile = grid.querySelector(`[data-item="${id}"]`);
      const r = tile?.getBoundingClientRect();
      const hr = this.stage.top.getBoundingClientRect();
      const s = hr.width / this.stage.top.offsetWidth || 1;
      toast(this.stage.top, `${RARITY[it.rarity].label.toUpperCase()}: SI TROVA NELLE CASSE`, { x: 195, y: r ? (r.top - hr.top) / s : 300, kind: 'hint' });
      return;
    }
    const next = OPTIONAL.has(cat) && p.equip[cat] === id ? null : id;
    this.account.update((pp) => P.equip(pp, cat, next));
    sound.select();
    buzz(10);
    if (cat === 'dice' || cat === 'roll') setTimeout(() => this.#wardrobeRoll?.(), 60);
    else if (next) previewSound(sound, it);
  }

  /* ------------------------------------------------------------ */
  /* PROFILO                                                       */
  /* ------------------------------------------------------------ */
  async profilePage() {
    const { el, body } = pageShell({ title: 'Profilo', onBack: () => this.hub(), icon: MI.user, cls: 'profile' });
    const render = () => {
      const p = this.profile;
      const lv = levelFromXp(p.xp);
      const rank = rankOf(p.rank.points);
      const logged = this.account.loggedIn;
      const stat = (label, value) => h('div', { class: 'pf-stat' }, h('b', {}, fmt(value)), h('small', {}, label));
      body.replaceChildren(
        h(
          'div',
          { class: 'pf-card' },
          h('div', { class: `pf-avatar av-frame f-${ITEMS[p.equip.frame]?.frame ?? 'basic'}`, html: avatarSvg(p, { size: 132 }) }),
          h('h3', {}, logged ? p.username : 'Ospite'),
          h('div', { class: 'pf-title' }, ITEMS[p.equip.title]?.name ?? ''),
          h('div', { class: 'pf-level' }, h('b', {}, `LIVELLO ${lv.level}`), h('span', { class: 'pf-xp' }, h('i', { style: { width: `${Math.round((lv.into / lv.need) * 100)}%` } })), h('small', {}, `${lv.into}/${lv.need} XP`)),
          h('div', { class: 'pf-rank', style: { '--rc': rank.color } }, h('span', { html: rankBadge(rank, 44) }), h('div', {}, h('b', {}, rank.name.toUpperCase()), h('small', {}, rank.next ? `${p.rank.points} punti · ${rank.next.min - p.rank.points} per ${rank.next.name}` : `${p.rank.points} punti · rango massimo`))),
        ),
        h(
          'div',
          { class: 'pf-stats' },
          stat('Partite', p.stats.games),
          stat('Vittorie', p.stats.wins),
          stat('Online vinte', p.stats.onlineWins),
          stat('Yatzy', p.stats.yatzys),
          stat('Livelli', p.campaign.best),
          stat('Stelle', P.totalStars(p)),
          stat('Boss battuti', p.stats.bosses),
          stat('Casse aperte', p.stats.chests),
          stat('Record punti', p.stats.bestScore),
          stat('Monete vinte', p.stats.coinsEarned),
          stat('Collezione', p.owned.length),
          stat('Miglior rango', p.rank.best),
        ),
        h('button', { class: 'btn btn-menu secondary', type: 'button', onclick: () => this.wardrobe() }, h('span', { class: 'btn-ico', html: MI.shirt }), 'PERSONALIZZA'),
        logged
          ? h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => this.#logout() }, h('span', { class: 'btn-ico', html: MI.logout }), "ESCI DALL'ACCOUNT")
          : h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => this.auth({ onDone: () => this.profilePage() }) }, 'CREA ACCOUNT O ACCEDI'),
      );
    };
    render();
    await this.#open(el);
    this.refresh = render;
  }

  #logout() {
    this.account.logout();
    sound.tap();
    this.hub();
  }

  /* ------------------------------------------------------------ */
  /* CLASSIFICA                                                    */
  /* ------------------------------------------------------------ */
  async leaderboard() {
    const { el, body } = pageShell({ title: 'Classifica', onBack: () => this.hub(), icon: MI.podium, cls: 'board' });
    body.replaceChildren(h('div', { class: 'board-wait' }, h('span', { class: 'ol-spinner' }), 'Carico la classifica…'));
    await this.#open(el);
    let players;
    try {
      players = await Account.leaderboard();
    } catch (e) {
      body.replaceChildren(h('div', { class: 'board-wait' }, e.message), h('button', { class: 'btn btn-menu secondary', type: 'button', onclick: () => this.leaderboard() }, 'RIPROVA'));
      return;
    }
    const me = this.account.username?.toLowerCase();
    body.replaceChildren(
      h('p', { class: 'board-note' }, 'Rango delle partite online. Vinci online per salire!'),
      ...(players.length ? players : []).map((pl, i) => {
        const rank = rankOf(pl.rank);
        return h(
          'div',
          { class: `board-row${pl.username.toLowerCase() === me ? ' is-me' : ''}${i < 3 ? ` top${i + 1}` : ''}` },
          h('b', { class: 'br-pos' }, String(i + 1)),
          h('span', { class: `av-frame f-${ITEMS[pl.equip?.frame]?.frame ?? 'basic'}`, html: avatarSvg(pl, { size: 40, bust: true }) }),
          h('span', { class: 'br-name' }, h('b', {}, pl.username), h('small', {}, `LV ${pl.level} · ${pl.wins} vittorie online`)),
          h('span', { class: 'br-rank', style: { '--rc': rank.color } }, h('span', { html: rankBadge(rank, 24) }), h('small', {}, String(pl.rank))),
        );
      }),
      players.length ? null : h('div', { class: 'board-wait' }, 'Ancora nessun giocatore: sii il primo!'),
    );
  }

  /* ------------------------------------------------------------ */
  /* ACCESSO / REGISTRAZIONE                                       */
  /* ------------------------------------------------------------ */
  auth({ reason = '', onDone } = {}) {
    let mode = this.account.username ? 'login' : 'register';
    const user = h('input', { class: 'auth-input', type: 'text', placeholder: 'Nome utente', autocomplete: 'username', maxlength: '16', autocapitalize: 'off', spellcheck: 'false' });
    const pass = h('input', { class: 'auth-input', type: 'password', placeholder: 'Password', autocomplete: 'current-password', maxlength: '100' });
    const pass2 = h('input', { class: 'auth-input', type: 'password', placeholder: 'Ripeti la password', autocomplete: 'new-password', maxlength: '100' });
    const err = h('div', { class: 'auth-err' });
    const submit = h('button', { class: 'btn btn-menu primary auth-go', type: 'button' });
    const tabs = h('div', { class: 'auth-tabs' });
    const box = h('div', { class: 'auth' });
    const render = () => {
      tabs.replaceChildren(
        h('button', { class: `auth-tab${mode === 'register' ? ' is-on' : ''}`, type: 'button', onclick: () => ((mode = 'register'), render()) }, 'REGISTRATI'),
        h('button', { class: `auth-tab${mode === 'login' ? ' is-on' : ''}`, type: 'button', onclick: () => ((mode = 'login'), render()) }, 'ACCEDI'),
      );
      submit.textContent = mode === 'register' ? 'CREA ACCOUNT' : 'ENTRA';
      pass2.hidden = mode !== 'register';
      pass.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      err.textContent = '';
    };
    const go = async () => {
      const u = user.value.trim();
      const pw = pass.value;
      if (u.length < 3) return (err.textContent = 'Il nome utente deve avere almeno 3 caratteri');
      if (pw.length < 4) return (err.textContent = 'La password deve avere almeno 4 caratteri');
      if (mode === 'register' && pw !== pass2.value) return (err.textContent = 'Le due password non coincidono');
      submit.disabled = true;
      err.textContent = '';
      submit.textContent = '…';
      try {
        if (mode === 'register') await this.account.register(u, pw);
        else await this.account.login(u, pw);
        sound.win();
        await s.close();
        toast(this.stage.top, mode === 'register' ? `BENVENUTO, ${u.toUpperCase()}!` : `BENTORNATO, ${u.toUpperCase()}!`, { x: 195, y: 140, kind: 'gold' });
        if (onDone) onDone();
        else this.refresh?.();
      } catch (e) {
        sound.denied();
        err.textContent = e.message;
        submit.disabled = false;
        render();
        err.textContent = e.message;
      }
    };
    submit.addEventListener('click', go);
    [user, pass, pass2].forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && go()));
    box.append(
      h('div', { class: 'auth-ico', html: MI.user }),
      h('h3', {}, 'Il tuo account'),
      h('p', {}, reason || 'Con un account salvi monete, skin e campagna, apri le casse e giochi online.'),
      tabs,
      user,
      pass,
      pass2,
      err,
      submit,
      h('small', { class: 'auth-note' }, 'I progressi fatti da ospite passano al nuovo account. Non usare la stessa password di altri siti.'),
    );
    render();
    const s = sheet(this.stage.top, box, { cls: 'auth-sheet' });
    setTimeout(() => user.focus(), 300);
    return s;
  }

  /* ------------------------------------------------------------ */
  /* IMPOSTAZIONI                                                  */
  /* ------------------------------------------------------------ */
  /** Autori della musica e dei suoni registrati (le licenze CC-BY chiedono di citarli). */
  async creditsPage() {
    const { el, body } = pageShell({ title: 'CREDITI AUDIO', onBack: () => this.hub(), cls: 'credits-page', icon: MI.rules });
    this.stage.app.dataset.screen = 'hub';
    await this.screens.open(el, { dim: false });
    body.append(h('p', { class: 'cr-intro' }, 'Musica, ambienti ed effetti sono registrazioni con licenza libera. Grazie a tutti gli autori!'));
    let list = [];
    try {
      list = await (await fetch(new URL('audio/CREDITS.json', location.href), { cache: 'no-cache' })).json();
    } catch {
      body.append(h('p', { class: 'cr-intro' }, 'Elenco non disponibile senza connessione.'));
      return;
    }
    const groups = { music: 'MUSICA', amb: 'AMBIENTI', sfx: 'EFFETTI', voices: 'DADI E CARTE' };
    for (const [g, label] of Object.entries(groups)) {
      const items = list.filter((c) => c.group === g);
      if (!items.length) continue;
      // un autore e una fonte compaiono una volta sola per gruppo
      const seen = new Map();
      for (const c of items) {
        const k = `${c.title || ''}|${c.author || ''}|${c.license || ''}`;
        if (!seen.has(k)) seen.set(k, c);
      }
      body.append(
        h('h4', { class: 'cr-head' }, label),
        h(
          'ul',
          { class: 'cr-list' },
          ...[...seen.values()].map((c) =>
            h(
              'li',
              {},
              h('b', {}, c.title || c.file || ''),
              c.author ? h('span', {}, ` di ${c.author}`) : null,
              h('small', {}, ' · ', c.licenseUrl ? h('a', { href: c.licenseUrl, target: '_blank', rel: 'noopener' }, c.license) : c.license || '', c.source ? h('span', {}, ' · ', h('a', { href: c.source, target: '_blank', rel: 'noopener' }, 'fonte')) : null),
            ),
          ),
        ),
      );
    }
  }

  settingsSheet() {
    const set = this.settings;
    const up = (patch) => this.actions.updateSettings(patch);
    const s = sheet(
      this.stage.top,
      h(
        'div',
        { class: 'settings' },
        h('h3', {}, 'Impostazioni'),
        toggle('Musica', set.music !== false, (v) => up({ music: v })),
        toggle('Suoni', set.sound, (v) => up({ sound: v })),
        toggle('Vibrazione', set.vibration, (v) => up({ vibration: v })),
        toggle('Ruota lo schermo (2 giocatori)', set.rotate, (v) => up({ rotate: v })),
        this.account.loggedIn
          ? h('div', { class: 'set-account' }, h('span', {}, 'Account: ', h('b', {}, this.account.username)), h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => (s.close(), this.#logout()) }, 'ESCI'))
          : h('button', { class: 'btn btn-menu secondary', type: 'button', onclick: () => (s.close(), this.auth({})) }, 'CREA ACCOUNT O ACCEDI'),
        h('button', { class: 'btn btn-menu ghost set-credits', type: 'button', onclick: () => (s.close(), this.creditsPage()) }, 'CREDITI AUDIO'),
        h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => s.close() }, 'FATTO'),
      ),
      { cls: 'settings-sheet' },
    );
  }
}
