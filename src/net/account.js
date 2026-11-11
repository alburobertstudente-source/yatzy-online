/**
 * Account del giocatore (nome utente + password) e salvataggio del profilo.
 *
 * Il profilo vive sul telefono (localStorage) e viene copiato sul server dopo
 * ogni cambiamento: così si gioca anche senza rete e, entrando da un altro
 * telefono, si ritrovano monete, skin e campagna. Senza account si gioca come
 * "ospite": campagna e partite sullo stesso telefono sì, negozio e online no.
 */
import * as store from '../storage.js';
import { createProfile, normalizeProfile } from '../meta/profile.js';

const KEYS = { session: 'yatzy-duel.account.v1', guest: 'yatzy-duel.guest.v1', profile: (u) => `yatzy-duel.profile.${u.toLowerCase()}` };
const PUSH_DELAY = 6000;
const PUSH_MIN_GAP = 15000;

/** Indirizzo dell'API: stesso sito su Vercel e in locale, altrimenti il server su Vercel. */
export function apiBase() {
  const q = new URLSearchParams(location.search).get('api');
  if (q) return q.replace(/\/$/, '');
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) return '';
  return 'https://yatzy-duello.vercel.app';
}

async function request(path, { method = 'GET', body, token, keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(`${apiBase()}/api/${path}`, {
      method,
      keepalive,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Server non raggiungibile: controlla la connessione'), { offline: true });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Errore ${res.status}`), { status: res.status });
  return data;
}

export class Account {
  constructor() {
    this.session = store.load(KEYS.session); // { username, token }
    this.listeners = new Set();
    this.timer = null;
    this.lastPush = 0;
    this.pushing = null;
    this.status = 'idle'; // idle | saving | saved | offline | error
    this.profile = this.#loadLocal();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush({ keepalive: true });
    });
  }

  get loggedIn() {
    return Boolean(this.session?.token);
  }

  get username() {
    return this.session?.username ?? null;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  #emit() {
    this.listeners.forEach((fn) => fn(this.profile));
  }

  #loadLocal() {
    if (this.loggedIn) return normalizeProfile(store.load(KEYS.profile(this.session.username)) || createProfile(this.session.username));
    return normalizeProfile(store.load(KEYS.guest) || createProfile(''));
  }

  #saveLocal() {
    if (this.loggedIn) store.save(KEYS.profile(this.session.username), this.profile);
    else store.save(KEYS.guest, this.profile);
  }

  /**
   * Applica una modifica al profilo (fn riceve il profilo), salva e sincronizza.
   * @template T @param {(p:object)=>T} fn @returns {T}
   */
  update(fn) {
    const out = fn(this.profile);
    this.#saveLocal();
    this.#emit();
    this.schedulePush();
    return out;
  }

  /* ---------------- accesso ---------------- */
  async register(username, password) {
    // i progressi fatti da ospite passano al nuovo account
    const guest = { ...this.profile, username };
    const res = await request('register', { method: 'POST', body: { username, password, profile: guest } });
    this.#enter(res);
    store.save(KEYS.guest, createProfile(''));
    return this.profile;
  }

  async login(username, password) {
    const res = await request('login', { method: 'POST', body: { username, password } });
    this.#enter(res);
    return this.profile;
  }

  #enter({ token, profile }) {
    this.session = { username: profile.username, token };
    store.save(KEYS.session, this.session);
    // se su questo telefono c'è una copia più recente dello stesso account, vince quella
    const local = store.load(KEYS.profile(profile.username));
    const remote = normalizeProfile(profile);
    this.profile = local && normalizeProfile(local).rev > remote.rev ? normalizeProfile(local) : remote;
    this.#saveLocal();
    this.#emit();
    if (this.profile !== remote) this.schedulePush(0);
  }

  logout() {
    this.flush({ keepalive: true });
    this.session = null;
    store.remove(KEYS.session);
    this.profile = this.#loadLocal();
    this.#emit();
  }

  /** Riprende il profilo dal server (all'avvio): tiene la copia con rev più alto. */
  async refresh() {
    if (!this.loggedIn) return;
    try {
      const { profile } = await request('profile', { token: this.session.token });
      const remote = normalizeProfile(profile);
      if (remote.rev > this.profile.rev) {
        this.profile = remote;
        this.#saveLocal();
        this.#emit();
      } else if (remote.rev < this.profile.rev) this.schedulePush(0);
      this.#setStatus('saved');
    } catch (e) {
      if (e.status === 401) this.logout();
      else this.#setStatus('offline');
    }
  }

  /* ---------------- sincronizzazione ---------------- */
  schedulePush(delay = PUSH_DELAY) {
    if (!this.loggedIn) return;
    clearTimeout(this.timer);
    const gap = Math.max(delay, this.lastPush + PUSH_MIN_GAP - Date.now());
    this.timer = setTimeout(() => this.flush(), gap);
  }

  async flush({ keepalive = false } = {}) {
    if (!this.loggedIn || !this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.lastPush = Date.now();
    this.#setStatus('saving');
    try {
      const res = await request('profile', { method: 'PUT', token: this.session.token, body: { profile: this.profile }, keepalive });
      if (!res.saved) {
        // sul server c'è una versione più recente (altro telefono): si usa quella
        this.profile = normalizeProfile(res.profile);
        this.#saveLocal();
        this.#emit();
      }
      this.#setStatus('saved');
    } catch (e) {
      if (e.status === 401) return this.logout();
      this.#setStatus(e.offline ? 'offline' : 'error');
      this.schedulePush(PUSH_MIN_GAP * 2);
    }
  }

  #setStatus(s) {
    this.status = s;
    this.#emit();
  }

  static leaderboard() {
    return request('leaderboard').then((r) => r.players || []);
  }
}
