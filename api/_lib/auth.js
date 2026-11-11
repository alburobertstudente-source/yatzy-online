/** Password (scrypt con sale) e gettoni di accesso firmati (HMAC). */
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

const TOKEN_DAYS = 365;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.VERCEL) throw new Error('AUTH_SECRET mancante');
  return 'solo-per-sviluppo-locale';
}

const derive = (password, salt) =>
  new Promise((resolve, reject) => scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))));

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64');
  const hash = (await derive(password, salt)).toString('base64');
  return { salt, hash };
}

export async function checkPassword(password, salt, hash) {
  const got = await derive(password, salt);
  const want = Buffer.from(hash, 'base64');
  return got.length === want.length && timingSafeEqual(got, want);
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const mac = (data) => createHmac('sha256', secret()).update(data).digest('base64url');

export function signToken(key) {
  const body = b64(JSON.stringify({ k: key, t: Date.now() }));
  return `${body}.${mac(body)}`;
}

/** Restituisce la chiave dell'utente o null. */
export function readToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const want = mac(body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const { k, t } = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof k !== 'string' || Date.now() - t > TOKEN_DAYS * 86400000) return null;
    return k;
  } catch {
    return null;
  }
}
