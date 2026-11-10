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

const controller = new Controller({
  stage,
  screens,
  settings,
  players: PLAYERS,
  onSave: (g) => {
    if (!session) store.save(STORAGE_KEYS.save, g.toJSON());
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
  });
}

async function startGame() {
  sound.unlock();
  sound.tap();
  leaveOnline({ notify: true });
  store.remove(STORAGE_KEYS.save);
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
  exposeDebug();
  await screens.close();
  app.dataset.screen = 'game';
  await controller.start(game, { fresh: false });
}

function askExit() {
  if (session) {
    screens.confirmExit({
      rotated: false,
      title: 'Lasciare la partita online?',
      text: "L'avversario verrà avvisato e la partita finirà.",
      onStay: () => screens.close(),
      onExit: async () => {
        leaveOnline({ notify: true });
        await screens.close();
        showMenu();
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
  if (session) return finishOnlineGame(results);
  store.remove(STORAGE_KEYS.save);
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
      showMenu();
    },
  });
}

function attachSession(s) {
  leaveOnline({ notify: false });
  session = s;
  s.provideState = () => (game && controller.game === game ? game.toJSON() : null);
  s.on('start', ({ seed }) => startOnlineGame(s, seed));
  s.on('state', ({ state }) => resumeOnlineGame(s, state));
  s.on('action', (msg) => {
    if (session !== s) return;
    if (held) held.push(msg);
    else controller.receiveRemote(msg);
  });
  s.on('status', (st) => {
    if (session !== s || !s.started) return;
    if (st === 'connected') screens.hideConnection();
    else screens.showConnection(st, { onLeave: () => { leaveOnline({ notify: true }); screens.close().then(showMenu); } });
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
        showMenu();
      },
    });
  });
  s.on('error', (e) => {
    if (session === s && !s.started) screens.current && console.info(e.text);
  });
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
  controller.setOnline({
    viewer: s.color,
    onAction: (a, h) => s.sendAction(a, h),
    onDesync: () => s.requestSync(),
  });
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
  screens.gameOver({
    results,
    players: PLAYERS,
    scorecards: game ? Object.fromEntries(game.players.map((p) => [p.id, p.card])) : null,
    rotate: false,
    viewer: session.color,
    onRematch: () => {
      sound.tap();
      if (!session) return showMenu();
      session.rematch();
      if (screens.rematchBtn) screens.rematchBtn.textContent = 'IN ATTESA…';
    },
    onMenu: async () => {
      leaveOnline({ notify: true });
      await screens.close();
      showMenu();
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
    hash: () => game?.stateHash(),
  };
}

/* ---------------- avvio ---------------- */
document.addEventListener('pointerdown', () => sound.unlock(), { once: true, capture: true });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
window.addEventListener('hashchange', () => {
  const c = location.hash.replace('#', '').toUpperCase();
  if (isValidCode(c) && !session && app.dataset.screen === 'menu') openOnline(c);
});
const hashCode = location.hash.replace('#', '').toUpperCase();
if (isValidCode(hashCode)) openOnline(hashCode);
else showMenu();
if (params.has('debug')) {
  window.yatzyApp = {
    get game() {
      return game;
    },
    controller,
    get session() {
      return session;
    },
  };
}
