import { handler, json, fail, readBody, userKey } from './_lib/http.js';
import { loadProfile, saveProfile } from './_lib/accounts.js';

export default handler({
  async GET(request) {
    const k = userKey(request);
    if (!k) return fail(401, 'Accesso scaduto: entra di nuovo');
    return json(200, { profile: await loadProfile(k) });
  },
  async PUT(request) {
    const k = userKey(request);
    if (!k) return fail(401, 'Accesso scaduto: entra di nuovo');
    const { profile } = await readBody(request);
    return json(200, await saveProfile(k, profile));
  },
});
