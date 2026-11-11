/** Operazioni sugli account, condivise dalle funzioni API e dai test. */
import { getStore } from './store.js';
import { hashPassword, checkPassword, signToken } from './auth.js';
import { USERNAME_RE, keyOf } from './http.js';
import { createProfile, normalizeProfile, publicCard } from '../../src/meta/profile.js';

const err = (status, message) => Object.assign(new Error(message), { status });
const userPath = (k) => `users/${k}.json`;
const profilePath = (k) => `profiles/${k}.json`;

export async function register(username, password, profile) {
  username = String(username || '').trim();
  if (!USERNAME_RE.test(username)) throw err(400, 'Nome utente: da 3 a 16 caratteri tra lettere, numeri, punto, trattino e _');
  if (typeof password !== 'string' || password.length < 4 || password.length > 100) throw err(400, 'La password deve avere almeno 4 caratteri');
  const store = getStore();
  const k = keyOf(username);
  if (await store.read(userPath(k))) throw err(409, 'Questo nome utente è già preso');
  const { salt, hash } = await hashPassword(password);
  await store.write(userPath(k), { username, salt, hash, createdAt: Date.now() });
  const p = normalizeProfile({ ...(profile || createProfile(username)), username });
  await store.write(profilePath(k), p);
  return { token: signToken(k), profile: p };
}

export async function login(username, password) {
  const store = getStore();
  const k = keyOf(String(username || '').trim());
  const user = USERNAME_RE.test(k) ? await store.read(userPath(k)) : null;
  if (!user || !(await checkPassword(String(password || ''), user.salt, user.hash))) throw err(401, 'Nome utente o password sbagliati');
  const p = normalizeProfile({ ...((await store.read(profilePath(k))) || createProfile(user.username)), username: user.username });
  return { token: signToken(k), profile: p };
}

export async function loadProfile(k) {
  const store = getStore();
  const user = await store.read(userPath(k));
  if (!user) throw err(401, 'Account non trovato');
  return normalizeProfile({ ...((await store.read(profilePath(k))) || createProfile(user.username)), username: user.username });
}

/** Salva il profilo se è più recente di quello sul server (rev più alto). */
export async function saveProfile(k, incoming) {
  const current = await loadProfile(k);
  const next = normalizeProfile({ ...incoming, username: current.username });
  if (next.rev < current.rev) return { saved: false, profile: current };
  await getStore().write(profilePath(k), next);
  return { saved: true, profile: next };
}

export async function leaderboard(limit = 50) {
  const store = getStore();
  const keys = await store.keys('profiles/');
  const list = (await Promise.all(keys.map((key) => store.read(key, { fresh: false }).catch(() => null)))).filter(Boolean).map((p) => publicCard(normalizeProfile(p)));
  list.sort((a, b) => b.rank - a.rank || b.wins - a.wins || b.campaign - a.campaign);
  return list.slice(0, limit);
}
