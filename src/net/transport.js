/**
 * Collegamento diretto tra due telefoni (WebRTC tramite PeerJS).
 *
 * - Chi crea la partita apre una "stanza" con un codice di 5 caratteri.
 * - L'altro si unisce con lo stesso codice.
 * - Il server pubblico di PeerJS serve solo a presentare i due telefoni;
 *   poi i messaggi viaggiano direttamente tra loro.
 *
 * Per un server PeerJS proprio (o per i test) si può usare l'indirizzo:
 *   ?peerHost=localhost&peerPort=9000&peerPath=/&peerSecure=0
 */
import { loadPeer } from './peerLoader.js';

export const ROOM_PREFIX = 'yatzy-duello-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export function newRoomCode() {
  const buf = new Uint32Array(CODE_LENGTH);
  globalThis.crypto?.getRandomValues ? crypto.getRandomValues(buf) : buf.forEach((_, i) => (buf[i] = Math.random() * 1e9));
  return [...buf].map((n) => ALPHABET[n % ALPHABET.length]).join('');
}

/** Normalizza un codice digitato dall'utente (maiuscole, solo caratteri validi). */
export function cleanCode(text) {
  return [...String(text || '').toUpperCase()]
    .filter((ch) => ALPHABET.includes(ch))
    .join('')
    .slice(0, CODE_LENGTH);
}

export function isValidCode(code) {
  return typeof code === 'string' && code.length === CODE_LENGTH && [...code].every((ch) => ALPHABET.includes(ch));
}

/** Opzioni di PeerJS (server pubblico di default, oppure quello indicato nell'indirizzo). */
export function peerOptions() {
  const p = new URLSearchParams(location.search);
  const opts = { debug: Number(p.get('peerDebug')) || 0 };
  if (p.has('peerHost')) {
    opts.host = p.get('peerHost');
    if (p.has('peerPort')) opts.port = Number(p.get('peerPort'));
    opts.path = p.get('peerPath') || '/';
    opts.secure = p.get('peerSecure') === '1';
  }
  return opts;
}

const ERRORS = {
  'peer-unavailable': 'Partita non trovata: controlla il codice',
  'unavailable-id': 'Codice già in uso',
  network: 'Connessione al server non riuscita',
  'server-error': 'Il server di collegamento non risponde',
  'socket-error': 'Connessione al server interrotta',
  'socket-closed': 'Connessione al server interrotta',
  'browser-incompatible': 'Questo browser non supporta il gioco online',
  'ssl-unavailable': 'Serve una pagina https per giocare online',
  webrtc: 'Collegamento diretto tra i telefoni non riuscito',
};

export function errorText(err) {
  return ERRORS[err?.type] || err?.message || 'Errore di connessione';
}

/**
 * Collegamento con l'altro telefono. Eventi:
 *  - 'open'       collegati (anche dopo una riconnessione)
 *  - 'message'    dati ricevuti
 *  - 'close'      collegamento perso
 *  - 'error'      errore (con .text leggibile)
 */
export class Link {
  constructor(role) {
    this.role = role; // 'host' | 'guest'
    this.peer = null;
    this.conn = null;
    this.code = null;
    this.handlers = new Map();
    this.closed = false;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
  }

  emit(type, payload) {
    this.handlers.get(type)?.forEach((fn) => fn(payload));
  }

  get connected() {
    return Boolean(this.conn && this.conn.open);
  }

  send(msg) {
    if (!this.connected) return false;
    try {
      this.conn.send(msg);
      return true;
    } catch {
      return false;
    }
  }

  #watchPeer() {
    this.peer.on('disconnected', () => {
      // persa la connessione al server di presentazione: si riprova con lo stesso codice
      if (!this.closed && this.peer && !this.peer.destroyed) {
        setTimeout(() => {
          try {
            if (!this.closed && this.peer?.disconnected) this.peer.reconnect();
          } catch {
            /* riproverà al prossimo evento */
          }
        }, 1000);
      }
    });
  }

  #attach(conn) {
    if (this.conn && this.conn !== conn) {
      try {
        this.conn.close();
      } catch {
        /* già chiusa */
      }
    }
    this.conn = conn;
    conn.on('data', (data) => {
      if (this.conn === conn) this.emit('message', data);
    });
    conn.on('close', () => {
      if (this.conn === conn && !this.closed) this.emit('close');
    });
    conn.on('error', () => {
      if (this.conn === conn && !this.closed) this.emit('close');
    });
    const opened = () => this.emit('open');
    if (conn.open) opened();
    else conn.on('open', opened);
  }

  /** Crea una stanza. Si risolve con il codice appena il server l'ha registrata. */
  static async host() {
    const Peer = await loadPeer();
    const link = new Link('host');
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newRoomCode();
      try {
        await new Promise((resolve, reject) => {
          const peer = new Peer(ROOM_PREFIX + code, peerOptions());
          const onError = (err) => {
            peer.destroy();
            reject(err);
          };
          peer.once('error', onError);
          peer.once('open', () => {
            peer.off('error', onError);
            link.peer = peer;
            link.code = code;
            resolve();
          });
        });
        break;
      } catch (err) {
        if (err?.type !== 'unavailable-id' || attempt === 4) {
          const e = new Error(errorText(err));
          e.type = err?.type;
          throw e;
        }
      }
    }
    link.#watchPeer();
    link.peer.on('connection', (conn) => {
      if (link.closed) return;
      link.#attach(conn);
    });
    link.peer.on('error', (err) => {
      if (err?.type === 'peer-unavailable') return;
      link.emit('error', { type: err?.type, text: errorText(err) });
    });
    return link;
  }

  /** Si unisce alla stanza con quel codice. Si risolve quando il collegamento è aperto. */
  static async join(code) {
    const Peer = await loadPeer();
    const link = new Link('guest');
    link.code = code;
    await link.#connectGuest(Peer);
    return link;
  }

  async #connectGuest(Peer = globalThis.Peer) {
    if (!this.peer || this.peer.destroyed) {
      this.peer = await new Promise((resolve, reject) => {
        const peer = new Peer(peerOptions());
        const onError = (err) => {
          peer.destroy();
          const e = new Error(errorText(err));
          e.type = err?.type;
          reject(e);
        };
        peer.once('error', onError);
        peer.once('open', () => {
          peer.off('error', onError);
          resolve(peer);
        });
      });
      this.#watchPeer();
      this.peer.on('error', (err) => {
        if (!this.connected) this.emit('error', { type: err?.type, text: errorText(err) });
      });
    }
    await new Promise((resolve, reject) => {
      const conn = this.peer.connect(ROOM_PREFIX + this.code, { reliable: true, serialization: 'json' });
      const timer = setTimeout(() => {
        cleanup();
        reject(Object.assign(new Error('Partita non trovata: controlla il codice'), { type: 'peer-unavailable' }));
      }, 15000);
      const onErr = (err) => {
        if (err?.type !== 'peer-unavailable') return;
        cleanup();
        reject(Object.assign(new Error(errorText(err)), { type: err.type }));
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.peer.off('error', onErr);
      };
      this.peer.on('error', onErr);
      conn.once('open', () => {
        cleanup();
        resolve();
      });
      this.#attach(conn);
    });
  }

  /** Riapre il collegamento dopo una caduta (solo l'ospite richiama l'host). */
  async reconnect() {
    if (this.closed) throw new Error('Collegamento chiuso');
    if (this.role === 'guest') return this.#connectGuest();
    // l'host resta in attesa: l'ospite si ricollegherà alla stessa stanza
    if (this.peer?.disconnected) this.peer.reconnect();
    return undefined;
  }

  close() {
    this.closed = true;
    try {
      this.conn?.close();
    } catch {
      /* già chiusa */
    }
    try {
      this.peer?.destroy();
    } catch {
      /* già distrutto */
    }
  }
}
