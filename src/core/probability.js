/**
 * Sistema delle probabilità: dadi EQUI per entrambi i giocatori.
 * Ogni faccia ha sempre probabilità 1/6 (generatore crittografico).
 *
 * Il modulo è indipendente dalla grafica: il motore chiede i valori e
 * l'interfaccia si limita ad animare il risultato già deciso.
 */

/** Generatore crittografico (fallback Math.random). Restituisce [0,1). */
export function createCryptoRandom() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(64);
    let idx = buf.length;
    return () => {
      if (idx >= buf.length) {
        c.getRandomValues(buf);
        idx = 0;
      }
      return buf[idx++] / 4294967296;
    };
  }
  return Math.random;
}

/**
 * Generatore deterministico (mulberry32). Usato nei test e nelle partite
 * online: con lo stesso seme e le stesse azioni i due telefoni ottengono
 * esattamente gli stessi dadi e le stesse carte. Lo stato si può salvare
 * e ripristinare (getState / setState) per risincronizzare una partita.
 */
export function createSeededRandom(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.getState = () => a;
  next.setState = (s) => {
    a = Number(s) >>> 0;
  };
  return next;
}

/** Seme casuale a 32 bit (crittografico quando disponibile). */
export function randomSeed() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

export function rollDie(rng) {
  return Math.min(6, Math.floor(rng() * 6) + 1);
}

/** Lancio equo: i dadi tenuti restano invariati. */
export function fairRoll(values, held, hasRolled, rng) {
  return values.map((v, i) => (hasRolled && held[i] ? v : rollDie(rng)));
}

/** Lanciatore di dadi equo, uguale per tutti i giocatori. */
export class FairRoller {
  constructor({ rng = createCryptoRandom() } = {}) {
    this.rng = rng;
  }

  /** @returns {{values: number[]}} */
  roll(ctx) {
    return { values: fairRoll(ctx.values, ctx.held, ctx.hasRolled, this.rng) };
  }

  /** Un singolo dado equo (usato dalle carte). */
  die() {
    return rollDie(this.rng);
  }
}
