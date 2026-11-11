/** Risposte JSON con CORS (il gioco può girare su un altro dominio, es. Render). */
import { readToken } from './auth.js';

export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-max-age': '86400',
};

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS, ...headers },
  });
}

export const fail = (status, error) => json(status, { error });

export async function readBody(request, limit = 64 * 1024) {
  const text = await request.text();
  if (text.length > limit) throw Object.assign(new Error('Richiesta troppo grande'), { status: 413 });
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw Object.assign(new Error('JSON non valido'), { status: 400 });
  }
}

export function userKey(request) {
  const h = request.headers.get('authorization') || '';
  return readToken(h.startsWith('Bearer ') ? h.slice(7) : '');
}

/** Avvolge un gestore: OPTIONS per il CORS, errori in JSON. */
export function handler(methods) {
  return {
    async fetch(request) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      const fn = methods[request.method];
      if (!fn) return fail(405, 'Metodo non permesso');
      try {
        return await fn(request);
      } catch (e) {
        if (e?.status) return fail(e.status, e.message);
        console.error(e);
        return fail(500, 'Errore del server');
      }
    },
  };
}

export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,16}$/;
export const keyOf = (username) => username.toLowerCase();
