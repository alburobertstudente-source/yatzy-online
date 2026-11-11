import { test } from 'node:test';
import assert from 'node:assert/strict';
import registerApi from '../api/register.js';
import loginApi from '../api/login.js';
import profileApi from '../api/profile.js';
import boardApi from '../api/leaderboard.js';
import healthApi from '../api/health.js';

const call = async (api, method, body, token) => {
  const res = await api.fetch(
    new Request('http://x/api', {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
};

test('API account: registrazione, login, profilo, classifica', async () => {
  const r = await call(registerApi, 'POST', { username: 'Marco_7', password: 'dadi123', profile: { coins: 999, rev: 3 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.profile.username, 'Marco_7');
  assert.equal(r.body.profile.coins, 999); // i progressi da ospite passano all'account
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const token = r.body.token;

  assert.equal((await call(registerApi, 'POST', { username: 'marco_7', password: 'xxxxx' })).status, 409);
  assert.equal((await call(registerApi, 'POST', { username: 'a', password: 'xxxxx' })).status, 400);
  assert.equal((await call(registerApi, 'POST', { username: 'luca', password: '12' })).status, 400);

  assert.equal((await call(loginApi, 'POST', { username: 'MARCO_7', password: 'sbagliata' })).status, 401);
  const l = await call(loginApi, 'POST', { username: 'MARCO_7', password: 'dadi123' });
  assert.equal(l.status, 200);
  assert.equal(l.body.profile.coins, 999);

  assert.equal((await call(profileApi, 'GET', null, 'falso.token')).status, 401);
  const g = await call(profileApi, 'GET', null, token);
  assert.equal(g.body.profile.username, 'Marco_7');

  // salva solo se più recente; il nome utente non si cambia
  const newer = { ...g.body.profile, coins: 50, rev: 10, username: 'altro', rank: { points: 300 } };
  const put = await call(profileApi, 'PUT', { profile: newer }, token);
  assert.equal(put.body.saved, true);
  assert.equal(put.body.profile.username, 'Marco_7');
  const older = await call(profileApi, 'PUT', { profile: { ...newer, coins: 1, rev: 2 } }, token);
  assert.equal(older.body.saved, false);
  assert.equal(older.body.profile.coins, 50);

  await call(registerApi, 'POST', { username: 'giulia', password: 'abcd' });
  const b = await call(boardApi, 'GET');
  assert.equal(b.status, 200);
  assert.deepEqual(b.body.players.map((p) => p.username), ['Marco_7', 'giulia']);
  assert.equal(b.body.players[0].rank, 300);
  assert.ok(!('password' in b.body.players[0]) && !('salt' in b.body.players[0]));

  const h = await call(healthApi, 'GET');
  assert.equal(h.body.ok, true);
  const opt = await registerApi.fetch(new Request('http://x/api', { method: 'OPTIONS' }));
  assert.equal(opt.status, 204);
});
