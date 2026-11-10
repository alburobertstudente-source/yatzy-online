/**
 * Controller: collega il motore di gioco alle viste, alle animazioni e ai suoni.
 * Il motore decide i risultati; il controller li fa vedere.
 *
 * Turno: banner → (rotazione) → carta da grattare → lanci / carte → punteggio.
 */
import { h, localRect, wait, buzz } from './dom.js';
import { HudView } from './hudView.js';
import { ScorecardView } from './scorecardView.js';
import { TrayView } from './trayView.js';
import { ControlsView } from './controlsView.js';
import { HandView } from './handView.js';
import { ScratchView } from './scratchView.js';
import { CardPopup } from './cardPopup.js';
import { TargetBar } from './targetBar.js';
import { bigCard } from './cardArt.js';
import { flyDie, rotateTable, pop, shake, ms, play, EASE } from '../anim/animations.js';
import { sparkle, toast, turnBanner, yatzyBonusBurst, upperBonusLabel, yatzyFlash } from '../anim/effects.js';
import { CardFx, RARITY_HEX } from '../anim/cardEffects.js';
import { MemeFx } from '../anim/memes.js';
import { sound } from '../audio/sound.js';
import { TIMING, RULES } from '../config.js';
import { TOTAL_ROUNDS } from '../core/turns.js';
import { ALL_CATEGORIES, notableCombo } from '../core/scoring.js';
import { CARDS } from '../core/cards.js';
import { stealableBoxes } from '../core/powers.js';

const COMBO_TEXT = {
  largeStraight: 'SCALA GRANDE!',
  smallStraight: 'SCALA PICCOLA!',
  fullHouse: 'FULL!',
  fourKind: 'POKER!',
};

const PLAYER_COLORS = {
  red: ['#ff5a66', '#ffd23f', '#ffffff'],
  blue: ['#3d9bff', '#7ce0ff', '#ffffff'],
};

export class Controller {
  /**
   * @param {object} o
   * @param {import('./stage.js').Stage} o.stage
   * @param {import('./screens.js').Screens} o.screens
   * @param {{rotate:boolean}} o.settings
   * @param {(game)=>void} o.onSave
   * @param {(results)=>void} o.onGameOver
   * @param {()=>void} o.onExit
   * @param {()=>void} o.onToggleSound
   */
  constructor({ stage, screens, settings, players, onSave, onGameOver, onExit, onToggleSound }) {
    this.stage = stage;
    this.screens = screens;
    this.settings = settings;
    this.players = players;
    this.onSave = onSave;
    this.onGameOver = onGameOver;
    this.game = null;
    this.busy = false;
    this.targeting = null;
    /* modalità online: giocatore di questo telefono e coda delle azioni dell'avversario */
    this.viewer = null;
    this.onAction = null;
    this.onDesync = null;
    this.remoteQueue = [];
    this.remoteRunning = false;
    this.scratchWaiter = null;
    this.expectHash = null;
    /** true mentre arriva uno stato completo da riprendere: niente input né invii */
    this.frozen = false;

    const isRotated = () => this.stage.rotated;
    this.hud = new HudView({
      players,
      onExit: () => {
        if (this.targeting) this.#cancelTargeting();
        this.#guard(() => onExit?.());
      },
      onSound: () => onToggleSound?.(),
    });
    this.hand = new HandView({ onCardTap: (uid) => this.onHandCardTap(uid), onStatusTap: () => this.#explainCurse() });
    this.card = new ScorecardView({ playerIds: players.map((p) => p.id), onCellTap: (pid, cat) => this.onCellTap(pid, cat) });
    this.tray = new TrayView({ onDieTap: (i) => this.onDieTap(i) });
    this.controls = new ControlsView({ onRoll: () => this.onRoll(), onConfirm: () => this.onConfirm() });
    this.fx = h('div', { class: 'fx' });
    const playArea = h('div', { class: 'play-area' }, this.hand.el, this.card.el, this.tray.el, this.controls.el);
    stage.table.append(this.hud.el, playArea, this.fx);
    this.scratch = new ScratchView({ host: stage.table, isRotated });
    this.popup = new CardPopup({ host: stage.table });
    this.targetBar = new TargetBar({ host: stage.table });
    this.cardFx = new CardFx({ fx: this.fx, table: stage.table, isRotated });
    this.memeFx = new MemeFx({ table: stage.table, fx: this.fx, isRotated });
  }

  #guard(fn) {
    if (!this.busy) fn();
  }

  /* ------------------------------------------------------------ */
  /* modalità online                                               */
  /* ------------------------------------------------------------ */
  /**
   * @param {{viewer:string, onAction:(a:object, hash:string)=>void, onDesync:()=>void}} o
   */
  setOnline({ viewer, onAction, onDesync }) {
    this.viewer = viewer;
    this.onAction = onAction;
    this.onDesync = onDesync;
    this.hud.setViewer(viewer);
  }

  setOffline() {
    this.viewer = null;
    this.onAction = null;
    this.onDesync = null;
    this.remoteQueue = [];
    this.scratchWaiter = null;
    this.hud.setViewer(null);
  }

  /** Blocca input e invii finché non riparte la partita (ripresa online in arrivo). */
  freeze() {
    this.frozen = true;
  }

  /** Su questo telefono tocca al giocatore locale? (sempre vero in locale) */
  get isMyTurn() {
    return !this.viewer || this.game?.current.id === this.viewer;
  }

  /** Giocatore di cui si mostra la mano. */
  #handOwner() {
    return this.viewer ? this.game.player(this.viewer) : this.game.current;
  }

  /** Dopo ogni azione sul motore: in locale la invia, da remoto verifica l'impronta. */
  #after(a, remote, game = this.game) {
    if (!this.viewer || game !== this.game) return; // flusso di una partita già sostituita
    if (this.frozen && !remote) return; // stato in sostituzione: questa mossa non vale
    const h = this.game.stateHash();
    if (remote) {
      const expected = this.expectHash;
      this.expectHash = null;
      if (expected && expected !== h) {
        if (new URLSearchParams(location.search).has('netlog')) console.info('[net] DESYNC', a.type, expected, h);
        this.onDesync?.();
      }
    } else this.onAction?.(a, h);
  }

  #notYourTurn() {
    sound.denied();
    const tr = this.#rect(this.tray.el);
    toast(this.fx, `ASPETTA: TOCCA AL ${this.#short(this.game.current.id)}`, { x: tr.x + tr.w / 2, y: tr.y - 8, kind: 'hint' });
  }

  #turnText(pid, fresh) {
    if (this.viewer) return pid === this.viewer ? (fresh ? 'INIZI TU!' : 'TOCCA A TE') : `${fresh ? 'INIZIA' : 'TOCCA AL'} ${this.#short(pid)}`;
    return fresh ? `INIZIA IL ${this.#short(pid)}` : `TOCCA AL ${this.#short(pid)}`;
  }

  /** Azione dell'avversario arrivata dalla rete (applicata in ordine). */
  receiveRemote(msg) {
    if (msg?.a?.type === 'scratch' && this.scratchWaiter) {
      const w = this.scratchWaiter;
      this.scratchWaiter = null;
      w(msg);
      return;
    }
    this.remoteQueue.push(msg);
    this.#pumpRemote();
  }

  #nextRemoteScratch() {
    if (this.remoteQueue[0]?.a?.type === 'scratch') return Promise.resolve(this.remoteQueue.shift());
    return new Promise((resolve) => {
      this.scratchWaiter = resolve;
    });
  }

  async #pumpRemote() {
    if (this.remoteRunning) return;
    this.remoteRunning = true;
    try {
      while (this.remoteQueue.length) {
        while (this.busy || this.frozen || !this.game) await wait(40);
        const msg = this.remoteQueue.shift();
        if (!msg) break;
        if (msg.a.type === 'scratch') {
          // carta grattata arrivata fuori fase (es. dopo una ripresa): basta applicare l'eventuale scarto
          if (msg.a.uid != null && this.game.current.hand.some((c) => c.uid === msg.a.uid)) {
            try {
              this.game.discardCard(msg.a.uid);
            } catch {
              /* stato già allineato */
            }
          }
          this.expectHash = msg.h;
          this.#after(msg.a, true);
          this.renderAll();
          continue;
        }
        try {
          await this.#applyRemote(msg);
        } catch {
          this.busy = false;
          this.onDesync?.();
        }
      }
    } finally {
      this.remoteRunning = false;
    }
  }

  async #applyRemote({ a, h }) {
    const g = this.game;
    if (!g || g.phase !== 'playing') return;
    if (this.popup.open) await this.popup.close();
    this.expectHash = h;
    switch (a.type) {
      case 'roll':
        await this.#doRoll(true);
        break;
      case 'hold':
        this.#doHold(a.i, true);
        break;
      case 'select':
        this.#doSelect(a.cat ?? null, true);
        break;
      case 'confirm':
        await this.#doConfirm(true);
        break;
      case 'useCard': {
        const entry = g.current.hand.find((c) => c.uid === a.uid);
        if (!entry) throw new Error('carta non trovata');
        await this.#playCard(entry, a.params || {}, true);
        break;
      }
      default:
        throw new Error(`azione sconosciuta ${a.type}`);
    }
  }

  #save() {
    this.onSave?.(this.game);
  }

  #short(pid) {
    return this.players.find((x) => x.id === pid).short;
  }

  #rect(el) {
    return localRect(el, this.stage.table, this.stage.rotated);
  }

  /* ------------------------------------------------------------ */
  /* avvio / ripresa                                               */
  /* ------------------------------------------------------------ */
  async start(game, { fresh = true } = {}) {
    this.game = game;
    this.busy = true;
    this.frozen = false;
    this.targeting = null;
    this.remoteQueue = [];
    this.scratchWaiter = null;
    // ferma i flussi della partita precedente (ripresa online o nuova partita)
    this.scratch.cancel();
    this.memeFx.skip();
    this.fx.replaceChildren();
    this.stage.table.classList.remove('is-targeting');
    this.tray.setTargets();
    this.card.setTargets(new Set(), new Set());
    this.card.locked.clear();
    this.card.memeHold.clear();
    this.targetBar.hide();
    this.popup.close();
    const pid = game.current.id;
    this.stage.setTurnColor(pid);
    this.stage.setRotation(this.#rotationFor(pid));
    for (const p of game.players) await this.hud.setTotal(p.id, p.card.total(), false);
    this.hud.setActive(pid);
    this.hud.setRound(game.round);
    if (game.dice.hasRolled) {
      this.tray.showValues(game.dice.values);
      this.tray.setHeld(game.dice.held, true);
    } else this.tray.setEmpty();
    this.renderAll({ interactive: false });

    if (game.phase === 'over') {
      this.busy = false;
      this.onGameOver?.(game.results());
      return;
    }
    if (game.scoredThisTurn) {
      // ripresa dopo il punteggio ma prima del cambio turno
      await this.#advanceTurn();
      return;
    }
    this.controls.setHidden(true);
    if (fresh || !game.dice.hasRolled) {
      const banner = await turnBanner(this.stage.overlay, {
        text: this.#turnText(pid, fresh),
        sub: `ROUND ${game.round}/${TOTAL_ROUNDS}`,
        color: pid,
        rotated: this.stage.rotated,
      });
      await wait(ms(TIMING.BANNER_HOLD));
      await banner.hide();
    }
    await this.#drawPhase();
    if (game !== this.game) return;
    this.controls.setHidden(false);
    this.busy = false;
    this.renderAll();
  }

  #rotationFor(pid) {
    if (this.viewer) return 0; // online ognuno ha il suo telefono: niente rotazione
    return this.settings.rotate && pid === 'blue' ? 180 : 0;
  }

  /** Applica subito l'impostazione di rotazione (cambiata dal menu). */
  applyRotationSetting() {
    if (this.game) this.stage.setRotation(this.#rotationFor(this.game.current.id));
  }

  renderAll({ interactive = true } = {}) {
    const g = this.game;
    if (!g) return;
    const live = interactive && !this.busy && !this.targeting;
    this.card.render(g, { interactive: live });
    this.hand.render(g, { interactive: live && this.isMyTurn, player: this.#handOwner() });
    this.hud.setCardInfo(g.players);
    this.tray.setDecor({ foresight: g.turnState.foresight, noHold: g.current.status.noHoldDie });
    this.tray.setHeld(g.dice.held, live && this.isMyTurn && g.dice.hasRolled && g.dice.rollsLeft > 0 && !g.scoredThisTurn);
    this.updateControls();
    if (this.targeting) this.#refreshTargeting();
  }

  updateControls({ locked = false } = {}) {
    const g = this.game;
    const off = locked || Boolean(this.targeting) || !this.isMyTurn;
    this.controls.update({
      color: g.current.id,
      rollsUsed: g.dice.rollsUsed,
      maxRolls: g.dice.maxRolls,
      canRoll: !off && g.canRoll(),
      canConfirm: !off && g.selected !== null && !g.scoredThisTurn,
      crown: Boolean(g.turnState.crown) && !g.scoredThisTurn,
    });
  }

  /* ------------------------------------------------------------ */
  /* carta da grattare                                             */
  /* ------------------------------------------------------------ */
  async #drawPhase({ extra = false } = {}) {
    const g = this.game;
    while (g === this.game && g.phase === 'playing' && g.mustDraw) {
      if (g.pendingDiscard) {
        if (this.isMyTurn) await this.#forcedDiscard();
        else {
          const msg = await this.#nextRemoteScratch();
          if (msg.a.uid != null) g.discardCard(msg.a.uid);
          this.expectHash = msg.h;
          this.#after(msg.a, true);
        }
        continue;
      }
      const d = g.drawCard();
      this.#save();
      const me = g.current;
      if (!this.isMyTurn) {
        await this.#spectateScratch(d, me, extra);
        extra = true;
        continue;
      }
      const res = await this.scratch.show({
        entry: d.card,
        playerName: this.#short(me.id),
        color: me.id,
        round: g.round,
        totalRounds: TOTAL_ROUNDS,
        handFull: d.handFull,
        hand: [...me.hand],
        onDiscard: (uid) => g.discardCard(uid),
        extra,
      });
      this.#save();
      if (g !== this.game || res.action === 'cancelled') return;
      this.#after({ type: 'scratch', action: res.action, uid: res.discardUid ?? null }, false, g);
      extra = true;
      this.hand.render(g, { interactive: false, player: this.#handOwner() });
      this.hud.setCardInfo(g.players);
      if (res.action !== 'discardNew') await this.#flyCardToHand(d.card, res.rect);
    }
  }

  /** Online: l'avversario sta grattando la sua carta. */
  async #spectateScratch(d, me, extra) {
    const g = this.game;
    const view = this.scratch.spectate({ playerName: this.#short(me.id), color: me.id, round: g.round, totalRounds: TOTAL_ROUNDS, extra });
    const msg = await this.#nextRemoteScratch();
    const a = msg.a;
    let discarded = null;
    if (a.action === 'discard' || a.action === 'discardNew') {
      discarded = me.hand.find((c) => c.uid === a.uid)?.id ?? null;
      try {
        g.discardCard(a.uid);
      } catch {
        /* divergenza: verrà corretta dalla risincronizzazione */
      }
    }
    this.expectHash = msg.h;
    this.#after(a, true);
    this.#save();
    await view.reveal(d.card, discarded);
    this.hud.setCardInfo(g.players);
    pop(this.hud.totalEl(me.id), 1.1, 300);
  }

  /** La carta grattata vola nella mano. */
  async #flyCardToHand(entry, fromRect) {
    const target = this.hand.cardEl(entry.uid);
    if (!target || !fromRect) return;
    const to = this.#rect(target);
    const el = bigCard(entry.id, { extraClass: 'fx-flycard' });
    el.style.left = `${fromRect.x}px`;
    el.style.top = `${fromRect.y}px`;
    this.fx.append(el);
    target.style.visibility = 'hidden';
    const sx = to.w / fromRect.w;
    const dx = to.x - fromRect.x;
    const dy = to.y - fromRect.y;
    await play(
      el,
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 30}px) scale(${(1 + sx) / 2}) rotate(-6deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}) rotate(0deg)`, opacity: 0.9 },
      ],
      { duration: 560, easing: EASE.inOut },
    );
    el.remove();
    target.style.visibility = '';
    pop(target, 1.2, 300);
    sound.tap();
  }

  /** Ripresa di una partita salvata con la mano troppo piena. */
  #forcedDiscard() {
    const g = this.game;
    return new Promise((resolve) => {
      this.popup.pickOpponentCard({
        cards: g.current.hand,
        isLocked: () => false,
        title: 'Hai troppe carte: tocca quella da scartare',
        onPick: async (uid) => {
          g.discardCard(uid);
          this.#after({ type: 'scratch', action: 'discard', uid }, false);
          this.#save();
          await this.popup.close();
          resolve();
        },
        onCancel: () => {},
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* lancio                                                        */
  /* ------------------------------------------------------------ */
  async onRoll() {
    const g = this.game;
    sound.unlock();
    if (!g || this.busy || this.frozen || this.targeting) return;
    if (!this.isMyTurn) {
      this.#notYourTurn();
      return;
    }
    if (!g.canRoll()) {
      sound.denied();
      shake(this.controls.roll);
      return;
    }
    await this.#doRoll(false);
  }

  async #doRoll(remote) {
    const g = this.game;
    this.busy = true;
    try {
      const res = g.roll();
      this.#after({ type: 'roll' }, remote, g);
      this.#save();
      this.card.render(g, { interactive: false });
      this.hand.render(g, { interactive: false, player: this.#handOwner() });
      this.tray.setHeld(g.dice.held, false);
      this.tray.setDecor({ foresight: g.turnState.foresight, noHold: null });
      this.updateControls({ locked: true });
      sound.roll(res.rolled.length);
      buzz(10);
      await this.tray.roll(res.rolledValues, res.rolled, {
        entering: res.rollIndex === 0,
        onLand: () => sound.land(),
      });
      if (res.curse) await this.#curseStrikes(res);
      if (g !== this.game) return;
      this.busy = false;
      this.renderAll();
      this.#comboEffects(res);
    } finally {
      if (g === this.game) this.busy = false;
    }
  }

  /** La maledizione dell'avversario scatta su questo lancio. */
  async #curseStrikes(res) {
    const c = res.curse;
    sound.curseHit();
    buzz([40, 30, 60]);
    this.hud.setCardInfo(this.game.players);
    await this.cardFx.curseBanner(c.type);
    if (c.dice.length) {
      sound.roll(c.dice.length);
      await this.tray.roll(res.values, c.dice, { onLand: () => sound.land() });
    }
    if (c.noHoldDie !== null) {
      this.tray.setHeld(this.game.dice.held, false);
      this.tray.setDecor({ foresight: this.game.turnState.foresight, noHold: c.noHoldDie });
      const slot = this.tray.slotEl(c.noHoldDie);
      shake(slot, 5);
      const r = this.#rect(slot);
      toast(this.fx, 'QUESTO DADO NON SI PUÒ CONSERVARE', { x: this.#rect(this.tray.el).x + this.#rect(this.tray.el).w / 2, y: r.y - 8, kind: 'hint' });
    }
  }

  /** Effetti di combinazione dopo che una carta ha cambiato i dadi. */
  #diceChangedCombo() {
    const g = this.game;
    this.#comboEffects({ combo: notableCombo(g.dice.values), yatzyBonusReady: g.current.card.qualifiesForYatzyBonus(g.dice.values) });
  }

  #comboEffects(res) {
    const tr = this.#rect(this.tray.el);
    const cx = tr.x + tr.w / 2;
    if (res.combo === 'yatzy') {
      sound.yatzy();
      buzz([30, 50, 30]);
      yatzyFlash(this.fx, { x: cx, y: tr.y - 40 });
      sparkle(this.fx, cx, tr.y + tr.h / 2, { colors: ['#fff6c2', '#ffd23f', '#ffffff'], count: 20, spread: 150, size: 11 });
      const chip = this.card.grid.querySelector('.chip-yatzy');
      chip?.classList.add('is-glow');
      setTimeout(() => chip?.classList.remove('is-glow'), ms(1600));
      if (res.yatzyBonusReady) {
        const turnId = this.game.turnId;
        setTimeout(() => {
          if (this.game.turnId === turnId && !this.game.scoredThisTurn) {
            toast(this.fx, `+${RULES.YATZY_BONUS} YATZY BONUS!`, { x: cx, y: tr.y - 8, kind: 'gold' });
          }
        }, ms(650));
      }
    } else if (res.combo === 'fullHouse' && this.game.current.card.scores.fullHouse === null) {
      sound.combo();
      toast(this.fx, 'FULL! IL DOTTORE TI ASPETTA', { x: cx, y: tr.y - 8, kind: 'doctor' });
    } else if (res.combo && COMBO_TEXT[res.combo]) {
      sound.combo();
      toast(this.fx, COMBO_TEXT[res.combo], { x: cx, y: tr.y - 8 });
    }
  }

  /* ------------------------------------------------------------ */
  /* dadi tenuti                                                   */
  /* ------------------------------------------------------------ */
  onDieTap(i) {
    const g = this.game;
    sound.unlock();
    if (!g || this.busy || this.frozen) return;
    if (this.targeting) {
      this.#targetDie(i);
      return;
    }
    if (g.scoredThisTurn || g.mustDraw) return;
    if (!this.isMyTurn) {
      this.#notYourTurn();
      return;
    }
    if (!g.dice.hasRolled) {
      sound.denied();
      shake(this.controls.roll);
      return;
    }
    if (g.dice.rollsLeft <= 0) {
      sound.denied();
      shake(this.tray.slotEl(i), 4);
      return;
    }
    if (!g.dice.held[i] && !g.canHold(i)) {
      sound.denied();
      shake(this.tray.slotEl(i), 4);
      const tr = this.#rect(this.tray.el);
      toast(this.fx, 'QUESTO DADO NON SI PUÒ CONSERVARE', { x: tr.x + tr.w / 2, y: tr.y - 8, kind: 'hint' });
      return;
    }
    this.#doHold(i, false);
  }

  #doHold(i, remote) {
    const g = this.game;
    const held = g.toggleHold(i);
    this.#after({ type: 'hold', i }, remote, g);
    sound.hold(held);
    if (!remote) buzz(8);
    this.tray.setHeld(g.dice.held, this.isMyTurn);
    this.updateControls();
    this.#save();
  }

  /* ------------------------------------------------------------ */
  /* selezione della casella                                       */
  /* ------------------------------------------------------------ */
  onCellTap(pid, cat) {
    const g = this.game;
    sound.unlock();
    if (!g || this.busy || this.frozen || g.phase !== 'playing') return;
    if (this.targeting) {
      this.#targetCell(pid, cat);
      return;
    }
    if (g.mustDraw) return;
    const cell = this.card.cell(pid, cat);
    if (!this.isMyTurn) {
      this.#notYourTurn();
      return;
    }
    if (pid !== g.current.id) {
      if (g.player(pid).card.scores[cat] === null) {
        sound.denied();
        shake(cell.el, 4);
      }
      return;
    }
    if (!g.dice.hasRolled) {
      if (g.current.card.scores[cat] === null) {
        sound.denied();
        shake(this.controls.roll);
        const tr = this.#rect(this.tray.el);
        toast(this.fx, 'PRIMA LANCIA I DADI', { x: tr.x + tr.w / 2, y: tr.y - 8, kind: 'hint' });
      }
      return;
    }
    if (!g.canSelect(cat)) return;
    this.#doSelect(g.selected === cat ? null : cat, false);
  }

  #doSelect(cat, remote) {
    const g = this.game;
    if (cat === null) {
      g.clearSelection();
      sound.tap();
    } else {
      g.select(cat);
      sound.select();
      if (!remote) buzz(8);
    }
    this.#after({ type: 'select', cat }, remote, g);
    this.renderAll();
    if (cat !== null) pop(this.card.cell(g.current.id, cat).el, 1.12, 260);
    this.#save();
  }

  /* ------------------------------------------------------------ */
  /* carte: dettaglio, bersagli, effetti                           */
  /* ------------------------------------------------------------ */
  onHandCardTap(uid) {
    const g = this.game;
    sound.unlock();
    if (!g || this.busy || this.frozen || this.targeting || this.popup.open || g.phase !== 'playing') return;
    const entry = this.#handOwner().hand.find((c) => c.uid === uid);
    if (!entry) return;
    sound.tap();
    this.popup.showCard({
      entry,
      availability: this.isMyTurn ? g.cardAvailability(uid) : { ok: false, reason: `Aspetta il tuo turno: ora tocca al ${this.#short(g.current.id)}` },
      onUse: async () => {
        this.busy = true; // niente tocchi mentre la finestra si chiude
        await this.popup.close();
        this.busy = false;
        this.#beginCard(entry);
      },
    });
  }

  #explainCurse() {
    const c = this.game ? this.#handOwner().status.curse : null;
    if (!c) return;
    const r = this.#rect(this.hand.el);
    const text = c.type === 'apocalypse' ? 'APOCALISSE IN ARRIVO AL PROSSIMO LANCIO' : 'MALEDIZIONE IN ARRIVO AL PROSSIMO LANCIO';
    toast(this.fx, text, { x: r.x + r.w / 2, y: r.y + r.h + 26, kind: 'hint' });
  }

  #beginCard(entry) {
    const g = this.game;
    const def = CARDS[entry.id];
    if (!g.cardAvailability(entry.uid).ok) return;
    if (!def.target) {
      this.#playCard(entry, {});
      return;
    }
    if (def.target.kind === 'oppCard') {
      this.popup.pickOpponentCard({
        cards: g.opponent.hand,
        isLocked: (c) => g.isCardLocked(c),
        title: def.prompt,
        onPick: async (uid) => {
          this.busy = true;
          await this.popup.close();
          this.busy = false;
          this.#playCard(entry, { uid });
        },
        onCancel: () => this.popup.close(),
      });
      return;
    }
    this.targeting = { entry, def, picks: [], choice: null, values: def.target.kind === 'allDice' ? [...g.dice.values] : null };
    this.stage.table.classList.add('is-targeting');
    this.stage.table.style.setProperty('--tc', RARITY_HEX[def.rarity]);
    sound.tap();
    this.renderAll();
  }

  /** Bersagli validi per la carta in uso. */
  #targets() {
    const g = this.game;
    const t = this.targeting;
    const me = g.current;
    const kind = t.def.target.kind;
    if (kind === 'dice') {
      const all = [0, 1, 2, 3, 4];
      return new Set(t.def.target.foresight ? all.filter((i) => g.turnState.foresight[i] === undefined) : all);
    }
    if (kind === 'allDice') return new Set([0, 1, 2, 3, 4]);
    if (kind === 'ownBoxes') return new Set(ALL_CATEGORIES.filter((c) => me.card.canShield(c)).map((c) => `${me.id}:${c}`));
    if (kind === 'oppBox') return new Set(stealableBoxes(g, me).map((c) => `${g.opponent.id}:${c}`));
    return new Set();
  }

  #refreshTargeting() {
    const g = this.game;
    const t = this.targeting;
    const kind = t.def.target.kind;
    const targets = this.#targets();
    const picked = new Set(t.picks);
    const diceKind = kind === 'dice' || kind === 'allDice';
    this.tray.setTargets(diceKind ? targets : new Set(), diceKind ? picked : new Set());
    this.card.setTargets(diceKind ? new Set() : targets, diceKind ? new Set() : picked);
    let canConfirm = false;
    let choice = null;
    if (kind === 'dice') {
      canConfirm = t.picks.length >= t.def.target.min && (!t.def.choice || t.choice !== null);
      if (t.def.choice && t.picks.length === 1) {
        const cur = g.dice.values[t.picks[0]];
        choice = {
          type: t.def.choice,
          value: t.choice,
          disabled: (v) => (t.def.choice === 'plusMinus' ? cur + v < 1 || cur + v > 6 : v === cur),
          onChoose: (v) => {
            t.choice = v;
            sound.tap();
            this.#refreshTargeting();
          },
        };
      }
    } else if (kind === 'allDice') canConfirm = true;
    else if (kind === 'ownBoxes') canConfirm = t.picks.length === t.def.target.count;
    else if (kind === 'oppBox') canConfirm = t.picks.length === 1;
    this.targetBar.render({
      cardId: t.entry.id,
      prompt: t.def.prompt,
      canConfirm,
      choice,
      onCancel: () => this.#cancelTargeting(),
      onConfirm: () => this.#confirmTargeting(),
    });
  }

  #targetDie(i) {
    const g = this.game;
    const t = this.targeting;
    const kind = t.def.target.kind;
    if (kind === 'allDice') {
      t.values[i] = (t.values[i] % 6) + 1;
      this.tray.previewFace(i, t.values[i]);
      pop(this.tray.slotEl(i), 1.12, 200);
      sound.tap();
      return;
    }
    if (kind !== 'dice' || !this.#targets().has(i) || (!g.dice.hasRolled && !t.def.target.foresight)) {
      sound.denied();
      shake(this.tray.slotEl(i), 4);
      return;
    }
    const k = t.picks.indexOf(i);
    if (k >= 0) t.picks.splice(k, 1);
    else if (t.picks.length < t.def.target.max) t.picks.push(i);
    else t.picks = [...t.picks.slice(1), i];
    t.choice = null;
    sound.tap();
    this.#refreshTargeting();
  }

  #targetCell(pid, cat) {
    const t = this.targeting;
    const kind = t.def.target.kind;
    const key = `${pid}:${cat}`;
    if ((kind !== 'ownBoxes' && kind !== 'oppBox') || !this.#targets().has(key)) {
      sound.denied();
      shake(this.card.cell(pid, cat).el, 4);
      return;
    }
    const max = kind === 'ownBoxes' ? t.def.target.count : 1;
    const k = t.picks.indexOf(key);
    if (k >= 0) t.picks.splice(k, 1);
    else if (t.picks.length < max) t.picks.push(key);
    else t.picks = [...t.picks.slice(1), key];
    sound.tap();
    this.#refreshTargeting();
  }

  #endTargeting() {
    this.targeting = null;
    this.targetBar.hide();
    this.stage.table.classList.remove('is-targeting');
    this.tray.setTargets();
    this.card.setTargets(new Set(), new Set());
  }

  #cancelTargeting() {
    const t = this.targeting;
    if (!t) return;
    if (t.def.target.kind === 'allDice') this.tray.showValues(this.game.dice.values);
    this.#endTargeting();
    sound.tap();
    this.renderAll();
  }

  #confirmTargeting() {
    const t = this.targeting;
    const kind = t.def.target.kind;
    let params = {};
    if (kind === 'dice') {
      params = { dice: [...t.picks] };
      if (t.def.choice === 'plusMinus') params.delta = t.choice;
      if (t.def.choice === 'face') params.value = t.choice;
    } else if (kind === 'allDice') params = { values: [...t.values] };
    else if (kind === 'ownBoxes') params = { cats: t.picks.map((k) => k.split(':')[1]) };
    else if (kind === 'oppBox') params = { cat: t.picks[0].split(':')[1] };
    const entry = t.entry;
    this.#endTargeting();
    this.#playCard(entry, params);
  }

  /** Usa la carta e anima il suo effetto. */
  async #playCard(entry, params, remote = false) {
    const g = this.game;
    if (this.busy) return;
    const def = CARDS[entry.id];
    const fromEl = remote ? null : this.hand.cardEl(entry.uid);
    const fromRect = fromEl ? this.#rect(fromEl) : null;
    let res;
    try {
      res = g.useCard(entry.uid, params);
      this.#after({ type: 'useCard', uid: entry.uid, params }, remote, g);
    } catch (e) {
      if (remote) throw e;
      sound.denied();
      const r = this.#rect(this.tray.el);
      toast(this.fx, String(e.message || e).toUpperCase(), { x: r.x + r.w / 2, y: r.y - 8, kind: 'hint' });
      this.renderAll();
      return;
    }
    this.busy = true;
    try {
      this.#save();
      buzz(15);
      sound.cast(def.rarity);
      this.hand.render(g, { interactive: false, player: this.#handOwner() });
      this.hud.setCardInfo(g.players);
      const ghost = h('div', { class: 'cast-from' });
      if (fromRect) Object.assign(ghost.style, { left: `${fromRect.x}px`, top: `${fromRect.y}px`, width: `${fromRect.w}px`, height: `${fromRect.h}px` });
      this.fx.append(ghost);
      await this.cardFx.cast(entry.id, fromRect ? ghost : this.hud.totalEl(g.current.id));
      ghost.remove();
      if (g !== this.game) return;
      await this.#cardEffect(res, def);
      if (g !== this.game) return;
      for (const p of g.players) await this.hud.setTotal(p.id, p.card.total(), true);
    } finally {
      if (g === this.game) {
        this.busy = false;
        this.renderAll();
      }
    }
  }

  async #cardEffect(res, def) {
    const g = this.game;
    const me = g.player(res.playerId);
    const opp = g.other(me);
    const tr = this.#rect(this.tray.el);
    switch (res.kind) {
      case 'reroll':
        sound.roll(res.dice.length);
        await this.tray.roll(res.values, res.dice, { onLand: () => sound.land() });
        res.dice.forEach((i) => this.cardFx.glowDie(this.tray.slotEl(i), def.rarity));
        this.#diceChangedCombo();
        break;
      case 'foresight':
        this.tray.setDecor({ foresight: g.turnState.foresight, noHold: me.status.noHoldDie });
        sound.reveal('common');
        await this.cardFx.foresight(this.tray.slotEl(res.die));
        toast(this.fx, `IL PROSSIMO LANCIO DI QUESTO DADO SARÀ ${res.value}`, { x: tr.x + tr.w / 2, y: tr.y + tr.h + 30, kind: 'hint' });
        break;
      case 'draw':
        await this.#drawPhase({ extra: true });
        break;
      case 'setDie':
        sound.roll(1);
        await this.tray.roll(res.values, [res.die], { onLand: () => sound.land() });
        this.cardFx.glowDie(this.tray.slotEl(res.die), def.rarity);
        this.#diceChangedCombo();
        break;
      case 'setAll':
        sound.godHand();
        this.cardFx.godRays(this.tray.el);
        await this.tray.roll(res.values, [0, 1, 2, 3, 4], { onLand: () => sound.land() });
        [0, 1, 2, 3, 4].forEach((i) => this.cardFx.glowDie(this.tray.slotEl(i), 'legendary'));
        this.#diceChangedCombo();
        break;
      case 'shield':
        sound.shieldUp();
        await this.cardFx.shield(res.cats.map((c) => this.card.cell(me.id, c).el));
        this.card.render(g, { interactive: false });
        break;
      case 'steal': {
        const cell = this.card.cell(opp.id, res.cat).el;
        if (res.blocked) {
          sound.blocked();
          this.card.render(g, { interactive: false });
          await this.cardFx.blocked(cell);
        } else {
          sound.steal();
          buzz([20, 30, 20]);
          this.card.render(g, { interactive: false });
          await this.cardFx.steal(cell, this.hud.totalEl(me.id), res.taken);
        }
        break;
      }
      case 'extraRoll':
        sound.combo();
        this.updateControls({ locked: true });
        toast(this.fx, 'UN LANCIO IN PIÙ!', { x: tr.x + tr.w / 2, y: tr.y - 8 });
        await wait(ms(500));
        break;
      case 'curse':
        sound.curse();
        await this.cardFx.curseCast(this.hud.totalEl(opp.id), res.curse);
        this.hud.setCardInfo(g.players);
        toast(this.fx, `${this.#short(opp.id)} MALEDETTO AL PROSSIMO LANCIO!`, { x: tr.x + tr.w / 2, y: tr.y - 8, kind: 'hint' });
        break;
      case 'prison':
        sound.prison();
        await this.cardFx.prison(res.cardId);
        toast(this.fx, `${CARDS[res.cardId].name.toUpperCase()} BLOCCATA`, { x: tr.x + tr.w / 2, y: tr.y - 8, kind: 'hint' });
        break;
      case 'rewind': {
        sound.rewind();
        await this.cardFx.rewind();
        const u = res.undone;
        const name = CARDS[u.cardId]?.name.toUpperCase() ?? '';
        this.card.render(g, { interactive: false });
        if (u.kind === 'steal' && u.amount > 0) {
          const cell = this.card.cell(me.id, u.cat).el;
          const from = this.#rect(this.hud.totalEl(opp.id));
          const c = this.#rect(cell);
          await this.cardFx.flyPoints({ x: from.x + from.w / 2, y: from.y + from.h / 2 }, cell, `+${u.amount}`);
          sparkle(this.fx, c.x + c.w / 2, c.y + c.h / 2, { colors: ['#ffd23f', '#ffffff'], count: 10, spread: 40 });
        }
        this.hud.setCardInfo(g.players);
        toast(this.fx, `ANNULLATO: ${name}`, { x: tr.x + tr.w / 2, y: tr.y - 8, kind: 'gold' });
        await wait(ms(400));
        break;
      }
      case 'crown':
        sound.crown();
        await this.cardFx.crownOn(this.controls.confirm);
        toast(this.fx, 'CORONA ATTIVA: PUNTEGGIO ×2', { x: tr.x + tr.w / 2, y: tr.y - 8, kind: 'gold' });
        break;
      default:
        break;
    }
  }

  /* ------------------------------------------------------------ */
  /* conferma del punteggio                                        */
  /* ------------------------------------------------------------ */
  async onConfirm() {
    const g = this.game;
    sound.unlock();
    if (!g || this.busy || this.frozen || this.targeting) return;
    if (!this.isMyTurn) {
      this.#notYourTurn();
      return;
    }
    if (!g.selected || g.scoredThisTurn) {
      sound.denied();
      shake(this.controls.confirm);
      return;
    }
    await this.#doConfirm(false);
  }

  async #doConfirm(remote) {
    const g = this.game;
    this.busy = true;
    try {
      const res = g.confirm();
      this.#after({ type: 'confirm' }, remote, g);
      this.#save();
      await this.#animateScore(res);
      if (g !== this.game) return;
      await this.#advanceTurn();
    } finally {
      if (g === this.game) this.busy = false;
    }
  }

  async #animateScore(res) {
    const g = this.game;
    const { playerId: pid, category: cat } = res;
    const cell = this.card.cell(pid, cat);
    this.card.lock(pid, cat);
    const memeKey = res.meme === 'doctorSigned' ? `${pid}:fullHouse` : res.meme === 'satan' ? `${pid}:yatzy` : null;
    if (memeKey) this.card.memeHold.add(memeKey);
    this.card.render(g, { interactive: false, holdRingFor: pid, holdChecksFor: res.yatzyBonus ? pid : null });
    this.hand.render(g, { interactive: false, player: this.#handOwner() });
    this.updateControls({ locked: true });
    this.tray.setHeld(g.dice.held.map(() => false), false);
    this.tray.setDecor({});

    cell.el.classList.remove('is-selected', 'is-selectable', 'is-waiting');
    cell.el.classList.add('is-filled', 'is-landing');
    cell.val.textContent = '0';
    const target = this.#rect(cell.el);

    if (res.score > 0 && res.contributing.length) {
      const n = res.contributing.length;
      const upper = res.section === 'upper';
      let running = 0;
      const flights = res.contributing.map((di, k) => {
        const slot = this.tray.slotEl(di);
        const from = this.#rect(slot.querySelector('.die') || slot);
        const delay = k * TIMING.FLY_STAGGER;
        setTimeout(() => this.tray.hideDie(di), ms(delay));
        return flyDie(this.fx, res.dice[di], from, target, { delay, duration: TIMING.FLY_DURATION, rotate: k % 2 ? -360 : 360 }).then(() => {
          running = upper ? running + res.dice[di] : Math.round((res.score * (k + 1)) / n);
          cell.val.textContent = String(running);
          pop(cell.el, 1.14, 220);
          sound.plink(k);
        });
      });
      await Promise.all(flights);
      cell.val.textContent = String(res.score);
      sparkle(this.fx, target.x + target.w / 2, target.y + target.h / 2, { colors: PLAYER_COLORS[pid], count: 14, spread: 46, size: 8 });
      sound.scored();
    } else if (res.meme !== 'satan') {
      sound.zero();
      shake(cell.el, 5);
      await wait(ms(250));
    }

    // tradizioni della casa
    const name = this.#short(pid);
    if (res.meme === 'doctorSigned') {
      await this.memeFx.doctorContract({ name, color: pid, targetEl: cell.el });
    } else if (res.meme === 'doctorRefused') {
      await this.memeFx.doctorRefused({ name, color: pid });
    } else if (res.meme === 'satan') {
      await this.memeFx.renounceSatan({ name, color: pid, targetEl: cell.el });
    }
    if (memeKey) {
      this.card.memeHold.delete(memeKey);
      this.card.render(g, { interactive: false, holdRingFor: pid, holdChecksFor: res.yatzyBonus ? pid : null });
    }
    cell.el.classList.remove('is-landing');
    this.card.unlock(pid, cat);
    const clearing = this.tray.clearRemaining();

    // anello del bonus superiore
    if (res.section === 'upper') {
      this.card.setRing(pid, res.upperTotal, g.player(pid).card.hasUpperBonus());
      if (res.upperBonusEarned) {
        await wait(ms(450));
        const ring = this.card.ring(pid).el;
        const rr = this.#rect(ring);
        pop(ring, 1.3, 500);
        sound.upperBonus();
        buzz([20, 40, 20]);
        sparkle(this.fx, rr.x + rr.w / 2, rr.y + rr.h / 2, { colors: ['#ffd23f', '#fff', PLAYER_COLORS[pid][0]], count: 18, spread: 70 });
        upperBonusLabel(this.fx, { x: rr.x + rr.w / 2, y: rr.y, color: pid });
      }
    }
    const yb = res.yatzyBonus ? RULES.YATZY_BONUS : 0;
    await Promise.all([this.hud.setTotal(pid, res.total - yb - res.crownExtra, true), clearing]);

    // Corona del Destino: punteggio raddoppiato
    if (res.crownExtra > 0) {
      sound.crown();
      const c = this.#rect(cell.el);
      this.card.render(g, { interactive: false, holdRingFor: pid, holdChecksFor: res.yatzyBonus ? pid : null });
      toast(this.fx, 'CORONA DEL DESTINO ×2', { x: c.x + c.w / 2, y: c.y - 6, kind: 'gold' });
      await this.cardFx.flyPoints({ x: c.x + c.w / 2, y: c.y + c.h / 2 }, this.hud.totalEl(pid), `+${res.crownExtra}`);
      await this.hud.setTotal(pid, res.total - yb, true);
    }

    // +100 YATZY BONUS (gestito a parte rispetto al punteggio della casella)
    if (res.yatzyBonus) {
      const cr = this.#rect(this.card.el);
      const yc = this.card.cell(pid, 'yatzy').el;
      const yr = this.#rect(yc);
      sound.yatzyBonus();
      buzz([40, 60, 40, 60, 80]);
      const burst = await yatzyBonusBurst(this.fx, { x: cr.x + cr.w / 2, y: cr.y + cr.h * 0.45, color: pid });
      await burst.flyTo(yr.x + yr.w / 2, yr.y + 4);
      this.card.setChecks(pid, res.yatzyBonusCount);
      const check = this.card.lastCheck(pid);
      if (check) pop(check, 1.8, 420);
      sparkle(this.fx, yr.x + yr.w / 2, yr.y + 4, { colors: ['#ffd23f', '#fff', PLAYER_COLORS[pid][0]], count: 12, spread: 40, size: 7 });
      await this.hud.setTotal(pid, res.total, true);
      await wait(ms(250));
    }
  }

  /* ------------------------------------------------------------ */
  /* cambio turno                                                  */
  /* ------------------------------------------------------------ */
  async #advanceTurn() {
    const g = this.game;
    this.busy = true;
    const next = g.endTurn();
    this.#save();
    if (next.over) {
      this.controls.setHidden(true);
      this.renderAll({ interactive: false });
      await wait(ms(500));
      this.busy = false;
      this.onGameOver?.(next);
      return;
    }
    this.controls.setHidden(true);
    await wait(ms(220));
    this.tray.setEmpty();
    const pid = next.playerId;
    const toDeg = this.#rotationFor(pid);
    const fromDeg = this.stage.rotation;
    sound.turn();
    const banner = await turnBanner(this.stage.overlay, {
      text: this.#turnText(pid, false),
      sub: `ROUND ${next.round}/${TOTAL_ROUNDS}`,
      color: pid,
      rotated: toDeg === 180,
    });
    this.stage.setTurnColor(pid);
    this.hud.setActive(pid);
    this.hud.setRound(next.round);
    this.renderAll({ interactive: false });
    if (toDeg !== fromDeg) {
      this.stage.setRotation(toDeg);
      await rotateTable(this.stage.table, fromDeg, toDeg, TIMING.TURN_ROTATION);
    } else {
      await wait(ms(TIMING.BANNER_HOLD + 200));
    }
    await banner.hide();
    if (g !== this.game) return;
    await this.#drawPhase();
    if (g !== this.game) return;
    this.controls.setHidden(false);
    this.busy = false;
    this.renderAll();
  }
}
