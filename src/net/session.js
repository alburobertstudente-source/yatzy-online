/**
 * Sessione online tra due telefoni.
 *
 * Modello "lockstep": entrambi eseguono lo stesso motore con lo stesso seme.
 * Solo chi è di turno agisce; ogni azione viene inviata all'altro telefono
 * che la ripete identica. Dopo ogni azione si confronta un'impronta dello
 * stato: se diverge, l'host (rosso) invia lo stato completo e l'ospite si
 * riallinea. Il seme è la combinazione (XOR) di due numeri casuali, uno per
 * telefono, così nessuno dei due lo sceglie da solo.
 *
 * Messaggi:
 *   hello  {seed, resume}        ospite → host   (anche dopo una riconnessione)
 *   start  {seed, n}             host → ospite   nuova partita
 *   state  {state, seq, e}       host → ospite   stato completo (riconnessione / divergenza)
 *   act    {seq, a, h, n, e}     chi è di turno → altro   azione + impronta
 *
 * n = numero della partita (rivincite), e = "epoca": aumenta a ogni stato
 * completo inviato dall'host. Le azioni di una partita o di un'epoca vecchia
 * (partite prima che l'altro ricevesse lo stato corretto) vengono scartate.
 *   sync   {}                    ospite → host   richiesta di stato completo
 *   rematch {}                   rivincita
 *   bye    {}                    l'altro ha lasciato la partita
 *   profile {card, reply}        nome, avatar, skin e rango del giocatore
 *   ping / pong                  battito per accorgersi delle cadute
 */
import { Link } from './transport.js';
import { randomSeed } from '../core/probability.js';

export const PROTOCOL = 1;
const LOG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('netlog');
const log = (...a) => {
  if (LOG) console.info('[net]', ...a);
};
const HEARTBEAT = 4000;
const TIMEOUT = 13000;

export class OnlineSession {
  /** @param {Link} link */
  constructor(link) {
    this.link = link;
    this.role = link.role;
    this.color = link.role === 'host' ? 'red' : 'blue';
    this.code = link.code;
    this.seq = 0;
    this.epoch = 0;
    this.started = false;
    this.gameNo = 0;
    this.status = link.connected ? 'connected' : 'waiting';
    this.handlers = new Map();
    this.mySeed = randomSeed();
    this.lastSeen = Date.now();
    /** chiamata dall'host per ottenere lo stato completo della partita */
    this.provideState = null;

    link.on('message', (m) => this.#onMessage(m));
    link.on('open', () => this.#onOpen());
    link.on('close', () => this.#setStatus('lost'));
    link.on('error', (e) => this.emit('error', e));

    this.timer = setInterval(() => this.#heartbeat(), HEARTBEAT);
    this.onVisible = () => {
      if (document.visibilityState === 'visible' && !this.link.connected) this.reconnect();
    };
    document.addEventListener('visibilitychange', this.onVisible);
    if (link.connected) this.#onOpen();
  }

  static async host() {
    return new OnlineSession(await Link.host());
  }

  static async join(code) {
    return new OnlineSession(await Link.join(code));
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }

  emit(type, payload) {
    this.handlers.get(type)?.forEach((fn) => fn(payload));
  }

  #setStatus(s) {
    if (this.status === s) return;
    this.status = s;
    this.emit('status', s);
    if (s === 'lost' && this.role === 'guest') setTimeout(() => this.reconnect(), 1200);
  }

  #send(msg) {
    if (msg.t !== 'ping' && msg.t !== 'pong') log(this.role, 'send', msg.t, msg.seq ?? '', 'e', msg.e ?? '', msg.a?.type ?? '', msg.h ?? '');
    const ok = this.link.send({ ...msg, v: PROTOCOL });
    if (!ok && msg.t !== 'ping') log(this.role, 'SEND FAILED', msg.t);
    return ok;
  }

  #onOpen() {
    this.lastSeen = Date.now();
    this.#setStatus('connected');
    if (this.role === 'guest') this.#send({ t: 'hello', seed: this.mySeed, resume: this.started });
  }

  #heartbeat() {
    if (!this.link.connected) return;
    this.#send({ t: 'ping' });
    if (Date.now() - this.lastSeen > TIMEOUT) this.#setStatus('lost');
  }

  #onMessage(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t !== 'ping' && m.t !== 'pong') log(this.role, 'recv', m.t, m.seq ?? '', 'e', m.e ?? '', m.a?.type ?? '', 'mine seq', this.seq, 'epoch', this.epoch);
    this.lastSeen = Date.now();
    if (this.status !== 'connected' && this.link.connected) this.#setStatus('connected');
    switch (m.t) {
      case 'ping':
        this.#send({ t: 'pong' });
        break;
      case 'pong':
        break;
      case 'hello':
        if (this.role !== 'host') break;
        if (!this.started) this.#startGame(m.seed);
        else this.sendState();
        break;
      case 'start':
        if (this.role !== 'guest') break;
        this.started = true;
        this.seq = 0;
        this.epoch = 0;
        this.gameNo = m.n;
        this.emit('start', { seed: m.seed, n: m.n });
        break;
      case 'state':
        if (this.role !== 'guest') break;
        this.started = true;
        this.seq = m.seq;
        this.epoch = m.e ?? 0;
        if (Number.isInteger(m.n)) this.gameNo = m.n;
        this.emit('state', { state: m.state, seq: m.seq });
        break;
      case 'act':
        if (m.n !== this.gameNo || m.e !== this.epoch) break; // partita o epoca vecchia
        if (m.seq <= this.seq) break; // già applicata
        if (m.seq !== this.seq + 1) {
          this.requestSync();
          break;
        }
        this.seq = m.seq;
        this.emit('action', { a: m.a, h: m.h, seq: m.seq });
        break;
      case 'sync':
        if (this.role === 'host') this.sendState();
        break;
      case 'rematch':
        if (this.role === 'host') this.#startGame(this.mySeed ^ Math.floor(Math.random() * 4294967296));
        this.emit('rematch', {});
        break;
      case 'bye':
        this.emit('left', {});
        break;
      case 'profile':
        if (m.card && typeof m.card === 'object') this.emit('profile', m.card);
        // risponde col proprio profilo (es. l'altro ha ricaricato la pagina)
        if (!m.reply && this.myCard) this.#send({ t: 'profile', card: this.myCard, reply: true });
        break;
      default:
        break;
    }
  }

  #startGame(guestSeed) {
    this.started = true;
    this.seq = 0;
    this.epoch = 0;
    this.gameNo++;
    const seed = (randomSeed() ^ (guestSeed >>> 0)) >>> 0;
    this.#send({ t: 'start', seed, n: this.gameNo });
    this.emit('start', { seed, n: this.gameNo });
  }

  /** Invia un'azione appena eseguita in locale, con l'impronta dello stato. */
  sendAction(a, h) {
    this.seq++;
    this.#send({ t: 'act', seq: this.seq, a, h, n: this.gameNo, e: this.epoch });
  }

  /** Profilo pubblico (nome, avatar, skin, rango) da mostrare all'avversario. */
  sendProfile(card) {
    this.myCard = card;
    this.#send({ t: 'profile', card });
  }

  /** L'host invia lo stato completo (riconnessione o divergenza). */
  sendState() {
    if (this.role !== 'host' || !this.provideState) return;
    const state = this.provideState();
    if (!state) return;
    this.epoch++;
    this.#send({ t: 'state', state, seq: this.seq, e: this.epoch, n: this.gameNo });
  }

  requestSync() {
    if (this.role === 'guest') this.#send({ t: 'sync' });
    else this.sendState();
  }

  /** Rivincita: l'host avvia subito una nuova partita, l'ospite la chiede all'host. */
  rematch() {
    if (this.role === 'host') this.#startGame(Math.floor(Math.random() * 4294967296));
    else this.#send({ t: 'rematch' });
  }

  async reconnect() {
    if (this.link.closed || this.link.connected || this.reconnecting) return;
    this.reconnecting = true;
    this.#setStatus('reconnecting');
    try {
      await this.link.reconnect();
      if (!this.link.connected && this.role === 'host') this.#setStatus('lost');
    } catch {
      this.#setStatus('lost');
    } finally {
      this.reconnecting = false;
    }
  }

  leave() {
    this.#send({ t: 'bye' });
    this.close();
  }

  close() {
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVisible);
    setTimeout(() => this.link.close(), 150);
  }
}
