import { handler, json, readBody } from './_lib/http.js';
import { login } from './_lib/accounts.js';

export default handler({
  async POST(request) {
    const { username, password } = await readBody(request);
    return json(200, await login(username, password));
  },
});
