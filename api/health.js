import { handler, json } from './_lib/http.js';
import { getStore } from './_lib/store.js';

export default handler({
  async GET(request) {
    const store = getStore();
    const out = { ok: true, store: store.kind, secret: Boolean(process.env.AUTH_SECRET) };
    if (new URL(request.url).searchParams.has('deep')) {
      const stamp = Date.now();
      await store.write('health/ping.json', { stamp });
      out.roundTrip = (await store.read('health/ping.json'))?.stamp === stamp;
      out.ok = out.roundTrip;
    }
    return json(out.ok ? 200 : 500, out);
  },
});
