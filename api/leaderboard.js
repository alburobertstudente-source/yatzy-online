import { handler, json } from './_lib/http.js';
import { leaderboard } from './_lib/accounts.js';

export default handler({
  async GET() {
    return json(200, { players: await leaderboard(50) }, { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' });
  },
});
