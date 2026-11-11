/**
 * Libreria dei suoni registrati (cartella audio/ accanto alla pagina).
 *
 * audio/manifest.json (creato da scripts/audio-manifest.mjs) elenca:
 *   sfx     effetti del gioco          { chiave: { files: [...], gain } }
 *   voices  voci dei dadi e delle carte { families, absurd, styles, cards }
 *   music   brani                      { chiave: { file, gain } }
 *   amb     ambienti in loop           { chiave: { file, gain } }
 *
 * Gli effetti brevi vengono decodificati in memoria (AudioBuffer); musica e
 * ambienti invece si ascoltano in streaming (vedi music.js). Se la cartella
 * non c'è (file aperto dal telefono senza rete, ?synth), il gioco usa i suoni
 * sintetizzati di riserva.
 */
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

class Library {
  constructor() {
    /** 'idle' | 'loading' | 'ready' | 'off' */
    this.state = 'idle';
    this.manifest = { sfx: {}, voices: {}, music: {}, amb: {} };
    this.buffers = new Map();
    this.pending = new Map();
    this.ctx = null;
    this.waiters = [];
    this.base = '';
  }

  get usable() {
    return this.state === 'ready';
  }

  /** Carica l'elenco dei suoni (una volta sola). */
  init(ctx) {
    if (this.state !== 'idle') return this.ready();
    this.ctx = ctx;
    const off = typeof location === 'undefined' || location.protocol === 'file:' || params.has('synth') || typeof fetch !== 'function';
    if (off) {
      this.state = 'off';
      this.#flush();
      return Promise.resolve(false);
    }
    this.state = 'loading';
    this.base = new URL('audio/', location.href).href;
    return fetch(`${this.base}manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((m) => {
        this.manifest = { sfx: {}, voices: {}, music: {}, amb: {}, ...m };
        this.state = 'ready';
        this.#flush();
        this.#warmUp();
        return true;
      })
      .catch(() => {
        this.state = 'off';
        this.#flush();
        return false;
      });
  }

  /** Promessa risolta quando si sa se i suoni registrati ci sono. */
  ready() {
    if (this.state === 'ready' || this.state === 'off') return Promise.resolve(this.state === 'ready');
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  #flush() {
    const ok = this.state === 'ready';
    this.waiters.splice(0).forEach((fn) => fn(ok));
  }

  url(path) {
    return this.base + path;
  }

  /** AudioBuffer già pronto (oppure null, e intanto lo carica). */
  buffer(path) {
    if (!path || !this.usable) return null;
    const b = this.buffers.get(path);
    if (b) return b;
    this.load(path);
    return null;
  }

  load(path) {
    if (!path || !this.usable || !this.ctx) return Promise.resolve(null);
    if (this.buffers.has(path)) return Promise.resolve(this.buffers.get(path));
    if (this.pending.has(path)) return this.pending.get(path);
    const p = fetch(this.url(path))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(
        (data) =>
          new Promise((resolve, reject) => {
            // la forma con callback funziona anche sui Safari più vecchi
            const res = this.ctx.decodeAudioData(data, resolve, reject);
            if (res && typeof res.then === 'function') res.then(resolve, reject);
          }),
      )
      .then((buf) => {
        this.buffers.set(path, buf);
        this.pending.delete(path);
        return buf;
      })
      .catch(() => {
        this.pending.delete(path);
        return null;
      });
    this.pending.set(path, p);
    return p;
  }

  /** Carica una lista di file uno alla volta (per non intasare la rete). */
  async preload(paths) {
    for (const p of paths) {
      if (!this.usable) return;
      if (!this.buffers.has(p)) await this.load(p);
    }
  }

  /** Aspetta che dei file siano pronti, al massimo `ms` millisecondi. */
  ensure(paths, ms = 1500) {
    const list = paths.filter(Boolean);
    if (!this.usable || !list.length) return Promise.resolve(false);
    if (list.every((p) => this.buffers.has(p))) return Promise.resolve(true);
    return Promise.race([Promise.all(list.map((p) => this.load(p))).then((b) => b.every(Boolean)), new Promise((r) => setTimeout(() => r(false), ms))]);
  }

  /* ---------------- elenchi ---------------- */
  sfx(key) {
    return this.manifest.sfx?.[key] || null;
  }

  /** Voce dei dadi: famiglia, voce assurda (con la famiglia vicina come base). */
  voice(id, baseOf = {}) {
    const v = this.manifest.voices || {};
    const own = v.absurd?.[id] || v.families?.[id] || null;
    const base = v.families?.[baseOf[id]] || null;
    if (!own && !base) return v.families?.classic || null;
    return { ...(base || {}), ...(own || {}), extra: own?.extra || null };
  }

  voiceFiles(id, baseOf = {}) {
    const d = this.voice(id, baseOf);
    if (!d) return [];
    return [...(d.shake || []), ...(d.land || []), ...(d.notes || []), ...(d.hold || []), ...(d.extra || [])];
  }

  style(id) {
    return this.manifest.voices?.styles?.[id] || null;
  }

  cards() {
    return this.manifest.voices?.cards || {};
  }

  music(key) {
    return this.manifest.music?.[key] || null;
  }

  amb(key) {
    return this.manifest.amb?.[key] || null;
  }

  /** Dopo l'avvio carica in sottofondo tutti gli effetti del gioco (prima i più usati). */
  #warmUp() {
    const sfx = this.manifest.sfx || {};
    const first = ['tap', 'select', 'scored', 'plink', 'introHit', 'whoosh', 'coin', 'yatzy', 'turn', 'denied'];
    const all = [...first, ...Object.keys(sfx).filter((k) => !first.includes(k))].flatMap((k) => sfx[k]?.files || []);
    const cards = this.cards();
    const cardFiles = [...(cards.scratch || []), ...Object.values(cards.reveal || {}).flat()];
    setTimeout(() => this.preload([...new Set([...all, ...cardFiles])]), 300);
  }
}

export const lib = new Library();

export function pick(list) {
  return list && list.length ? list[Math.floor(Math.random() * list.length)] : null;
}
