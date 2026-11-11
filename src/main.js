/**
 * Punto di ingresso: impostazioni, salvataggi, menu e avvio delle partite.
 */
import { PLAYERS, TIMING, STORAGE_KEYS } from './config.js';
import { Game } from './core/game.js';
import { createSeededRandom } from './core/probability.js';
import { OnlineSession } from './net/session.js';
import { isValidCode } from './net/transport.js';
import { Stage } from './ui/stage.js';
import { Screens } from './ui/screens.js';
import { Controller } from './ui/controller.js';
import { setVibration } from './ui/dom.js';
import { sound } from './audio/sound.js';
import * as store from './storage.js';
import { Account } from './net/account.js';
import { MetaUI } from './ui/meta/metaUI.js';
import { CampaignUI } from './ui/meta/campaignUI.js';
import { bossIntro, bossModeFor, startBot } from './ui/meta/bossMode.js';
import { bossHooks } from './campaign/bosses.js';
import { levelInfo } from './campaign/campaign.js';
import * as P from './meta/profile.js';
import { XP } from './meta/economy.js';
import { botMove } from './ai/bot.js';

const params = new URLSearchParams(location.search);

/* ---------------- impostazioni ---------------- */
const settings = { rotate: true, sound: true, vibration: true, ...store.load(STORAGE_KEYS.settings, {}) };
sound.setEnabled(settings.sound);
setVibration(settings.vibration);

if (params.has('speed')) {
  const s = Number(params.get('speed'));
  if (Number.isFinite(s) && s > 0) TIMING.ANIM_SPEED = s;
}

/* ---------------- interfaccia ---------------- */
const app = document.getElementById('app');
const stage = new Stage(app);
const screens = new Screens(stage);
let game = null;
/** sessione online attiva (null = partita sullo stesso telefono) */
let session = null;
/** azioni arrivate mentre una partita online sta (ri)partendo */
let held = null;
/** ultimo stato completo ricevuto e ripresa in corso */
let latestState = null;
let resuming = false;
/** partita della campagna contro un boss in corso */
let mode = null;
/** carta pubblica dell'avversario online (nome, avatar, skin, rango) */
let opponent = null;
/** partita online già registrata nel profilo (niente doppioni) */
let recorded = null;
const account = new Account();

const controller = new Controller({
  stage,
  screens,
  settings,
  players: PLAYERS,
  onSave: (g) => {
    if (!session && !mode) store.save(STORAGE_KEYS.save, g.toJSON());
  },
  onGameOver: (results) => finishGame(results),
  onExit: () => askExit(),
  onToggleSound: () => updateSettings({ sound: !settings.sound }),
});
controller.hud.setSound(settings.sound);

function updateSettings(patch) {
  Object.assign(settings, patch);
  store.save(STORAGE_KEYS.settings, settings);
  sound.setEnabled(settings.sound);
  setVibration(settings.vibration);
  controller.hud.setSound(settings.sound);
  if ('rotate' in patch) controller.applyRotationSetting();
  if (patch.sound) {
    sound.unlock();
    sound.tap();
  }
}

function savedGame() {
  const data = store.load(STORAGE_KEYS.save);
  return data && data.phase === 'playing' ? data : null;
}

function tally() {
  return { red: 0, blue: 0, ...store.load(STORAGE_KEYS.tally, {}) };
}

/* ---------------- menu principale, campagna ---------------- */
const meta = new MetaUI({
  stage,
  screens,
  account,
  settings,
  actions: {
    campaign: () => campaign.map(),
    online: () => openOnline(),
    local: () => showMenu(),
    rules: () => screens.rules(),
    install: () => installApp(),
    installable: () => Boolean(installPrompt),
    updateSettings: (patch) => updateSettings(patch),
  },
});
const campaign = new CampaignUI({ stage, screens, account, onBoss: (n) => startBoss(n), onHub: () => meta.hub() });
const classic = params.has('classic');

function home() {
  return classic ? showMenu() : meta.hub();
}

const mySkin = () => ({ dice: account.profile.equip.dice, roll: account.profile.equip.roll });
const PLAIN = { dice: 'dice.classic', roll: 'roll.classic' };
const BOSS_DICE = { frog: 'dice.mint', crab: 'dice.tomato', witch: 'dice.lavender', golem: 'dice.ice', mirror: 'dice.ocean', dragon: 'dice.dragon', chaos: 'dice.galaxy', vampire: 'dice.ruby', storm: 'dice.sapphire', lord: 'dice.gold' };
const namedPlayers = (names) => PLAYERS.map((p) => ({ ...p, short: names?.[p.id] ?? p.short }));

/** Partita sullo stesso telefono: il rosso usa le skin del profilo. */
function setupLocal() {
  stopBoss();
  controller.setOffline();
  controller.setMode(null);
  controller.setPlayerNames(null);
  controller.setSkins({ red: mySkin(), blue: PLAIN });
}

/* ---------------- boss della campagna ---------------- */
function stopBoss() {
  if (!mode) return;
  mode.bot?.stop();
  mode = null;
  controller.setMode(null);
  controller.setOffline();
  controller.setPlayerNames(null);
}

async function startBoss(n) {
  sound.unlock();
  leaveOnline({ notify: true });
  stopBoss();
  const info = levelInfo(n);
  await bossIntro(screens, info);
  game = new Game({ cards: false, hooks: bossHooks(info.bossData) });
  const names = { red: account.profile.username ? account.profile.username.toUpperCase() : 'TU', blue: info.bossData.name.toUpperCase() };
  controller.setOnline({ viewer: 'red', onAction: () => {}, onDesync: () => {} });
  controller.setPlayerNames(names);
  controller.setSkins({ red: mySkin(), blue: { dice: BOSS_DICE[info.bossData.id] || 'dice.coal', roll: 'roll.classic' } });
  controller.setMode(bossModeFor(info));
  mode = { type: 'boss', n, info, names, bot: startBot(controller, game, info.bossData.skill) };
  exposeDebug();
  await screens.close();
  app.dataset.screen = 'game';
  await controller.start(game, { fresh: true });
}

async function finishBoss(results) {
  const { n, info } = mode;
  const g = game;
  // il bot si ferma; nomi e tavolo restano visibili dietro al risultato
  mode.bot?.stop();
  mode = null;
  const won = results.winner === 'red';
  const red = g.player('red').card;
  let rewards = null;
  account.update((p) => {
    P.recordGame(p, { score: results.totals.red, yatzys: red.yatzyBonusCount() + (red.scores.yatzy === 50 ? 1 : 0), won });
    if (won) rewards = P.completeLevel(p, n, { stars: 0, coins: info.coins, replayCoins: info.replayCoins, xp: info.xp, boss: true });
  });
  app.dataset.screen = 'gameover';
  await campaign.showResult({ n, won, boss: info.bossData, rewards, score: `${results.totals.red} – ${results.totals.blue}`, retry: () => startBoss(n) });
}

/* ---------------- flusso ---------------- */
function showMenu() {
  app.dataset.screen = 'menu';
  stage.setRotation(0);
  stage.setTurnColor('red');
  return screens.menu({
    hasSave: Boolean(savedGame()),
    tally: tally(),
    settings,
    onNew: () => startGame(),
    onContinue: () => continueGame(),
    onSettings: (patch) => updateSettings(patch),
    onOnline: () => openOnline(),
    onInstall: () => installApp(),
    installable: Boolean(installPrompt),
    onBack: classic ? null : () => meta.hub(),
  });
}

/* ---------------- installazione come app (Chrome / Android) ---------------- */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  screens.setInstallable(true);
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  screens.setInstallable(false);
});

async function installApp() {
  sound.unlock();
  sound.tap();
  if (!installPrompt) return;
  const p = installPrompt;
  installPrompt = null;
  screens.setInstallable(false);
  try {
    await p.prompt();
    await p.userChoice;
  } catch {
    /* installazione annullata */
  }
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

async function startGame() {
  sound.unlock();
  sound.tap();
  leaveOnline({ notify: true });
  store.remove(STORAGE_KEYS.save);
  setupLocal();
  game = new Game();
  exposeDebug();
  await screens.close();
  app.dataset.screen = 'game';
  await controller.start(game, { fresh: true });
}

async function continueGame() {
  sound.unlock();
  sound.tap();
  leaveOnline({ notify: true });
  const data = savedGame();
  if (!data) return startGame();
  try {
    game = Game.fromJSON(data);
  } catch {
    return startGame();
  }
  setupLocal();
  exposeDebug();
  await screens.close();
  app.dataset.screen = 'game';
  await controller.start(game, { fresh: false });
}

function askExit() {
  if (mode) {
    const n = mode.n;
    screens.confirmExit({
      rotated: false,
      title: 'Abbandonare la sfida?',
      text: 'La partita contro il boss finirà e non riceverai la ricompensa.',
      onStay: () => screens.close(),
      onExit: async () => {
        stopBoss();
        await screens.close();
        campaign.map({ focus: n });
      },
    });
    return;
  }
  if (session) {
    screens.confirmExit({
      rotated: false,
      title: 'Lasciare la partita online?',
      text: "L'avversario verrà avvisato e la partita finirà.",
      onStay: () => screens.close(),
      onExit: async () => {
        leaveOnline({ notify: true });
        await screens.close();
        home();
      },
    });
    return;
  }
  screens.confirmExit({
    rotated: stage.rotated,
    onStay: () => screens.close(),
    onExit: async () => {
      if (game?.phase === 'playing') store.save(STORAGE_KEYS.save, game.toJSON());
      await screens.close();
      showMenu();
    },
  });
}

function finishGame(results) {
  if (mode) return finishBoss(results);
  if (session) return finishOnlineGame(results);
  store.remove(STORAGE_KEYS.save);
  account.update((p) => {
    P.recordGame(p, { score: results.totals.red });
    P.addXp(p, XP.local);
  });
  const t = tally();
  if (results.winner) t[results.winner]++;
  store.save(STORAGE_KEYS.tally, t);
  app.dataset.screen = 'gameover';
  if (results.winner) sound.win();
  else sound.combo();
  screens.gameOver({
    results,
    players: PLAYERS,
    scorecards: game ? Object.fromEntries(game.players.map((p) => [p.id, p.card])) : null,
    rotate: settings.rotate,
    onRematch: () => startGame(),
    onMenu: async () => {
      await screens.close();
      showMenu();
    },
  });
}

/* ---------------- modalità online ---------------- */
function shareUrl(code) {
  const url = new URL(location.href);
  url.hash = code;
  return url.href;
}

function openOnline(initialCode = '') {
  sound.unlock();
  sound.tap();
  if (!account.loggedIn) {
    // per giocare online serve un account
    const ask = () => meta.auth({ reason: 'Per giocare online serve un account.', onDone: () => openOnline(initialCode) });
    if (!screens.current) meta.hub().then(ask);
    else ask();
    return;
  }
  stopBoss();
  app.dataset.screen = 'menu';
  const lobby = screens.onlineLobby({
    initialCode,
    onCreate: async () => {
      sound.tap();
      lobby.busy('Creo la partita…');
      try {
        const s = await OnlineSession.host();
        if (!screens.current) return s.close();
        attachSession(s);
        lobby.waiting(s.code, shareUrl(s.code));
      } catch (e) {
        lobby.choose(e.message || 'Errore di connessione');
      }
    },
    onJoin: async (code) => {
      sound.tap();
      lobby.busy('Mi collego alla partita…');
      try {
        const s = await OnlineSession.join(code);
        attachSession(s);
        lobby.busy('Collegato! La partita sta per iniziare…');
      } catch (e) {
        lobby.choose(e.message || 'Partita non trovata');
      }
    },
    onBack: () => {
      leaveOnline({ notify: true });
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      home();
    },
  });
}

function attachSession(s) {
  leaveOnline({ notify: false });
  session = s;
  s.provideState = () => (game && controller.game === game ? game.toJSON() : null);
  s.on('start', ({ seed }) => {
    s.sendProfile(P.publicCard(account.profile));
    startOnlineGame(s, seed);
  });
  s.on('state', ({ state }) => {
    s.sendProfile(P.publicCard(account.profile));
    resumeOnlineGame(s, state);
  });
  s.on('profile', (card) => {
    if (session !== s) return;
    opponent = card;
    applyOnlineLook(s);
  });
  s.on('action', (msg) => {
    if (session !== s) return;
    if (held) held.push(msg);
    else controller.receiveRemote(msg);
  });
  s.on('status', (st) => {
    if (session !== s || !s.started) return;
    if (st === 'connected') screens.hideConnection();
    else screens.showConnection(st, { onLeave: () => { leaveOnline({ notify: true }); screens.close().then(home); } });
  });
  s.on('left', async () => {
    if (session !== s) return;
    leaveOnline({ notify: false });
    await screens.notice({
      title: "L'avversario è uscito",
      text: 'La partita online è terminata.',
      button: 'MENU',
      onClose: async () => {
        await screens.close();
        home();
      },
    });
  });
  s.on('error', (e) => {
    if (session === s && !s.started) screens.current && console.info(e.text);
  });
}

/** Nome e skin dell'avversario online (arrivano col suo profilo). */
function applyOnlineLook(s) {
  const other = s.color === 'red' ? 'blue' : 'red';
  const name = opponent?.username ? String(opponent.username).slice(0, 16).toUpperCase() : null;
  controller.setPlayerNames(name ? { [other]: name } : null);
  controller.setSkins({ [s.color]: mySkin(), [other]: opponent?.equip ? { dice: opponent.equip.dice, roll: opponent.equip.roll } : PLAIN });
}

async function waitControllerIdle(limit = 4000) {
  const t0 = Date.now();
  while (controller.busy && Date.now() - t0 < limit) await new Promise((r) => setTimeout(r, 50));
}

/** Avvia il controller trattenendo le azioni arrivate nel frattempo, poi le consegna in ordine. */
async function launch(fresh) {
  const started = controller.start(game, { fresh });
  const buffered = held || [];
  held = null;
  buffered.forEach((m) => controller.receiveRemote(m));
  await started;
}

async function startOnlineGame(s, seed) {
  if (session !== s) return;
  controller.freeze();
  latestState = null;
  held = [];
  screens.hideConnection();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  await waitControllerIdle();
  game = new Game({ rng: createSeededRandom(seed) });
  controller.setMode(null);
  controller.setOnline({
    viewer: s.color,
    onAction: (a, h) => s.sendAction(a, h),
    onDesync: () => s.requestSync(),
  });
  applyOnlineLook(s);
  exposeDebug();
  await screens.close();
  app.dataset.screen = 'game';
  await launch(true);
}

async function resumeOnlineGame(s, state) {
  if (session !== s) return;
  controller.freeze(); // da qui le mosse sulla partita vecchia non valgono più
  latestState = state;
  if (!held) held = [];
  if (resuming) return; // la ripresa in corso userà l'ultimo stato
  resuming = true;
  screens.hideConnection();
  await waitControllerIdle(1500);
  const st = latestState;
  latestState = null;
  resuming = false;
  if (session !== s) return;
  try {
    game = Game.fromJSON(st, { rng: createSeededRandom(1) });
  } catch {
    held = null;
    return;
  }
  controller.setOnline({
    viewer: s.color,
    onAction: (a, h) => s.sendAction(a, h),
    onDesync: () => s.requestSync(),
  });
  applyOnlineLook(s);
  exposeDebug();
  if (screens.current) await screens.close();
  app.dataset.screen = 'game';
  await launch(false);
}

function finishOnlineGame(results) {
  app.dataset.screen = 'gameover';
  if (results.winner === session.color) sound.win();
  else if (results.winner) sound.lose();
  else sound.combo();
  // monete e rango: una volta sola per partita
  let extra = null;
  if (recorded !== game) {
    recorded = game;
    const me = game.player(session.color).card;
    const outcome = results.winner === session.color ? 'win' : results.winner ? 'loss' : 'draw';
    const res = account.update((p) => P.recordOnline(p, { outcome, opponentPoints: Number(opponent?.rank) || 0, score: results.totals[session.color], yatzys: me.yatzyBonusCount() + (me.scores.yatzy === 50 ? 1 : 0) }));
    extra = `+${res.coins} monete · rango ${res.delta >= 0 ? '+' : ''}${res.delta} (${res.rank.name}${res.promoted ? ' ▲' : res.demoted ? ' ▼' : ''})`;
  }
  const other = session.color === 'red' ? 'blue' : 'red';
  screens.gameOver({
    results,
    extra,
    players: namedPlayers(opponent?.username ? { [other]: String(opponent.username).slice(0, 16).toUpperCase() } : null),
    scorecards: game ? Object.fromEntries(game.players.map((p) => [p.id, p.card])) : null,
    rotate: false,
    viewer: session.color,
    onRematch: () => {
      sound.tap();
      if (!session) return home();
      session.rematch();
      if (screens.rematchBtn) screens.rematchBtn.textContent = 'IN ATTESA…';
    },
    onMenu: async () => {
      leaveOnline({ notify: true });
      await screens.close();
      home();
    },
  });
}

/** Chiude la sessione online (avvisando l'avversario se richiesto). */
function leaveOnline({ notify }) {
  if (!session) return;
  const s = session;
  session = null;
  if (notify) s.leave();
  else s.close();
  controller.setOffline();
  controller.setPlayerNames(null);
  opponent = null;
  screens.hideConnection();
}

/* ---------------- strumenti di test (solo con ?debug=1) ---------------- */
function exposeDebug() {
  if (!params.has('debug')) return;
  const forced = [];
  const roller = game.roller;
  const originalRoll = roller.roll.bind(roller);
  roller.roll = (ctx) => {
    const next = forced.shift();
    if (!next) return originalRoll(ctx);
    return { values: next.map((v, i) => (ctx.hasRolled && ctx.held[i] ? ctx.values[i] : v)) };
  };
  window.yatzyDebug = {
    game,
    controller,
    forceNextRoll: (values) => forced.push(values),
    forceNextCard: (id) => game.forcedCards.push(id),
    giveCard: (id, pid) => {
      const p = pid ? game.player(pid) : game.current;
      p.hand.push({ uid: game.nextUid++, id, lockedTurn: null, lockedBy: null });
      controller.renderAll();
    },
    revealScratch: () => controller.scratch.revealNow(),
    skipMeme: () => controller.memeFx.skip(),
    get meme() {
      return Boolean(controller.memeFx.active);
    },
    get scratching() {
      return Boolean(controller.scratch.active);
    },
    get busy() {
      return controller.busy || controller.frozen || controller.game !== game;
    },
    get session() {
      return session;
    },
    get online() {
      return session ? { color: session.color, code: session.code, status: session.status, seq: session.seq, started: session.started } : null;
    },
    get myTurn() {
      return controller.isMyTurn;
    },
    get boss() {
      return mode;
    },
    hash: () => game?.stateHash(),
  };
}

/* ---------------- avvio ---------------- */
document.addEventListener('pointerdown', () => sound.unlock(), { once: true, capture: true });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
window.addEventListener('hashchange', () => {
  const c = location.hash.replace('#', '').toUpperCase();
  if (isValidCode(c) && !session && ['menu', 'hub'].includes(app.dataset.screen)) openOnline(c);
});
account.refresh();
const hashCode = location.hash.replace('#', '').toUpperCase();
if (isValidCode(hashCode)) {
  if (classic) openOnline(hashCode);
  else meta.hub().then(() => openOnline(hashCode));
} else if (classic) showMenu();
else if (params.has('skipintro')) meta.hub();
else meta.intro().then(() => meta.hub());
if (params.has('debug')) {
  window.yatzyApp = {
    get game() {
      return game;
    },
    controller,
    account,
    meta,
    campaign,
    startBoss,
    botMove,
    get session() {
      return session;
    },
  };
}
