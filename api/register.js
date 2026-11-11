import { handler, json, readBody } from './_lib/http.js';
import { register } from './_lib/accounts.js';

export default handler({
  async POST(request) {
    const { username, password, profile } = await readBody(request);
    return json(201, await register(username, password, profile));
  },
});
