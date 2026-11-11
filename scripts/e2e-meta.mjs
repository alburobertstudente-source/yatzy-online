/**
 * Test delle novità: intro, account, cassa gratuita e casse a pagamento,
 * armadio e skin in partita, campagna (sfida vinta e persa), boss sconfitto,
 * classifica, profilo ritrovato da un altro telefono.
 *   node scripts/e2e-meta.mjs [cartella-screenshot]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'test-results', 'meta');
mkdirSync(OUT, { recursive: true });
const PORT = 5199;
const DATA = join(ROOT, 'test-results', 'meta-data');
rmSync(DATA, { recursive: true, force: true });
const PAGE = process.env.E2E_PAGE || 'index.html';
const BASE = `http://localhost:${PORT}/${PAGE}`;
const web = spawn(process.execPath, [join(ROOT, 'scripts/serve.mjs'), String(PORT), ROOT], { stdio: 'ignore', env: { ...process.env, YATZY_DATA_DIR: DATA } });
await new Promise((r) => setTimeout(r, 1000));

let failures = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};
// come su un telefono vero: l'audio parte solo dopo un tocco
const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
const errors = [];
async function phone() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  return { ctx, page };
}
const prof = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.yatzyApp.account.profile)));
const user = `tester${Math.floor(Math.random() * 1e5)}`;

try {
  const { page } = await phone();
  console.log('\n[1] Intro e menu principale');
  await page.goto(`${BASE}?debug=1&speed=3`);
  // se il browser blocca l'audio compare prima "tocca per iniziare"
  await page.waitForSelector('.intro-tap, .intro-dice .die', { state: 'attached' });
  if (await page.locator('.intro-tap').count()) {
    check(true, 'schermata "tocca per iniziare" (sblocca la musica)');
    await page.click('.intro-tap');
  }
  await page.waitForSelector('.intro-dice .die');
  check((await page.evaluate(() => (window.yatzyApp.music.playingKey || '').split(':')[0])) === 'intro', "durante l'intro suona la sigla");
  await page.waitForSelector('.intro-play.is-pulse', { timeout: 15000 });
  check((await page.locator('.intro-logo .logo-die').count()) === 5, 'dadi che rotolano, poi la scritta YATZY');
  await page.screenshot({ path: join(OUT, '01-intro.png') });
  await page.click('.intro-play');
  await page.waitForSelector('.hub-campaign');
  const track = () => page.evaluate(() => (window.yatzyApp.music.playingKey || '').split(':')[0]);
  check((await track()) === 'menu' && (await page.evaluate(() => window.yatzyApp.sound.ctx?.state)) === 'running', 'dopo GIOCA parte la musica rilassante del menu');
  const hubButtons = await page.locator('.hub-btn').count();
  check(hubButtons >= 7, `menu pieno: campagna + ${hubButtons} pulsanti`);
  await page.screenshot({ path: join(OUT, '02-hub.png') });

  console.log('\n[2] Account');
  await page.click('.hub-btn.shop');
  await page.waitForSelector('.auth-input');
  check(/negozio serve un account/i.test(await page.locator('.auth p').innerText()), 'il negozio chiede un account');
  await page.fill('.auth-input >> nth=0', user);
  await page.fill('.auth-input >> nth=1', 'pass1234');
  await page.fill('.auth-input >> nth=2', 'pass9999');
  await page.click('.auth-go');
  check(/non coincidono/.test(await page.locator('.auth-err').innerText()), 'controlla che le password coincidano');
  await page.fill('.auth-input >> nth=2', 'pass1234');
  await page.click('.auth-go');
  await page.waitForSelector('.shop-daily');
  check((await page.evaluate(() => window.yatzyApp.account.loggedIn)) === true, `account creato (${user}) e negozio aperto`);

  console.log('\n[3] Casse');
  let p0 = await prof(page);
  await page.click('.shop-daily .shop-buy');
  await page.waitForSelector('.chest-open');
  await page.screenshot({ path: join(OUT, '03-cassa.png') });
  await page.mouse.click(195, 420);
  await page.waitForSelector('.co-item', { timeout: 15000 });
  await page.screenshot({ path: join(OUT, '04-oggetto.png') });
  await page.mouse.click(195, 420);
  await page.waitForSelector('.co-summary .btn-menu');
  await page.click('.co-summary .btn-menu');
  let p1 = await prof(page);
  check(p1.owned.length === p0.owned.length + 1 || p1.coins > p0.coins, 'la cassa gratuita dà un oggetto (o monete se doppione)');
  check(await page.locator('.shop-daily .shop-buy').isDisabled(), 'la cassa gratuita torna tra 24 ore');
  await page.evaluate(() => window.yatzyApp.account.update((p) => (p.coins = 2000)));
  p0 = await prof(page);
  await page.click('.sc-large .shop-buy');
  await page.waitForSelector('.chest-open');
  for (let k = 0; k < 25 && !(await page.locator('.co-summary .btn-menu').count()); k++) {
    await page.mouse.click(195, 420);
    await page.waitForTimeout(500);
  }
  await page.waitForSelector('.co-summary .btn-menu', { timeout: 15000 });
  await page.screenshot({ path: join(OUT, '04b-cassa-grande.png') });
  await page.click('.co-summary .btn-menu');
  p1 = await prof(page);
  check(p1.coins <= p0.coins - 1200 + 3 * 1000 + 200 && p1.coins >= p0.coins - 1200, `cassa grande pagata 1200 monete (${p0.coins} → ${p1.coins})`);
  check(p1.owned.length + 0 >= p0.owned.length + 1, `la cassa grande dà fino a 3 oggetti nuovi (${p1.owned.length - p0.owned.length})`);

  console.log('\n[3b] Casinò');
  await page.click('.shop-casino');
  await page.waitForSelector('.cs-bubble:not(:empty)', { timeout: 10000 });
  check((await track()) === 'casino', 'nel casinò parte la musica jazz');
  await page.evaluate(() => window.yatzyApp.account.update((p) => (p.coins = Math.max(p.coins, 500))));
  await page.click('.page-back').catch(() => {});
  await page.click('.cs-head .icon-btn');
  await page.waitForSelector('.shop-casino');
  await page.click('.shop-casino');
  await page.waitForSelector('.cs-bubble:not(:empty)', { timeout: 10000 });
  const c0 = (await prof(page)).coins;
  await page.click('.cs-rackchip[data-chip="100"]');
  await page.click('.cs-bet.b-over');
  await page.click('.cs-rackchip[data-chip="50"]');
  await page.click('.cs-bet.b-odd');
  check((await page.locator('.cs-total b').innerText()) === '150', 'fiche messe sul tavolo: puntata 150');
  await page.click('.cs-btn.go');
  await page.waitForFunction(() => !window.yatzyCasino.busy, null, { timeout: 20000 });
  await page.screenshot({ path: join(OUT, '04c-casino.png') });
  const c1 = await prof(page);
  const sumShown = Number(await page.locator('.cs-sum b').innerText());
  const expect = c0 - 150 + (sumShown >= 18 ? 200 : 0) + (sumShown % 2 ? 100 : 0);
  check(c1.coins === expect, `il croupier paga giusto: somma ${sumShown}, monete ${c0} → ${c1.coins}`);
  check(c1.stats.casinoRounds === 1, 'giocata registrata nel profilo');
  await page.click('.cs-head .icon-btn');
  await page.waitForSelector('.shop-daily');

  console.log('\n[4] Armadio e skin in partita');
  await page.click('.page-back');
  await page.click('.hub-btn.wardrobe');
  await page.waitForSelector('.wd-preview');
  await page.evaluate(() => window.yatzyApp.account.update((p) => { for (const id of ['dice.lava', 'roll.lightning', 'hat.wizard', 'table.space', 'cards.holo']) if (!p.owned.includes(id)) p.owned.push(id); }));
  await page.click('.wd-tab >> text=Cappelli');
  await page.click('[data-item="hat.wizard"]');
  await page.click('[data-item="hat.crown"]');
  p1 = await prof(page);
  check(p1.equip.hat === 'hat.wizard', 'oggetto posseduto indossato; quello bloccato no');
  await page.click('.wd-tab >> text=Dadi');
  await page.click('[data-item="dice.lava"]');
  await page.click('.wd-tab >> text=Lancio');
  await page.click('[data-item="roll.lightning"]');
  await page.click('.wd-tab >> text=Tavolo');
  await page.click('[data-item="table.space"]');
  await page.click('.wd-tab >> text=Carte');
  await page.click('[data-item="cards.holo"]');
  await page.screenshot({ path: join(OUT, '05-armadio.png') });
  check(await page.evaluate(() => document.getElementById('app').dataset.theme === 'space' && document.getElementById('app').dataset.cardskin === 'holo'), 'tema del tavolo e skin delle carte applicati');
  await page.click('.page-back');
  await page.click('.hub-btn.duo');
  await page.waitForSelector('.menu .btn-menu.primary');
  await page.click('.menu .btn-menu.primary');
  await page.waitForFunction(() => window.yatzyDebug?.game && !window.yatzyDebug.busy && !window.yatzyDebug.scratching, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  if (await page.evaluate(() => window.yatzyDebug.scratching)) await page.evaluate(() => window.yatzyDebug.revealScratch());
  check(await page.evaluate(() => document.querySelector('.tray').dataset.diceSkin === 'dice.lava'), 'in partita il rosso tira con i dadi Lava');
  check((await track()) === 'game' && (await page.evaluate(() => window.yatzyApp.sound.voice)) === 'lava', 'in partita: musica tranquilla e suono dei dadi Lava');
  await page.screenshot({ path: join(OUT, '06-partita-skin.png') });
  await page.evaluate(() => window.yatzyApp.meta.hub());
  await page.waitForSelector('.hub-campaign');

  console.log('\n[5] Campagna: sfide');
  await page.click('.hub-campaign');
  await page.waitForSelector('.cm-node[data-level="1"]');
  await page.screenshot({ path: join(OUT, '07-campagna.png') });
  check((await page.locator('.cm-node').count()) === 100, 'mappa con 100 livelli');
  check((await page.evaluate(() => window.yatzyApp.music.playingKey)) === 'world:1', 'nella campagna suona la canzone del mondo 1 (stagno)');
  check((await page.locator('.cm-node.boss').count()) === 10, '10 boss');
  check((await page.locator('.cm-node.locked').count()) === 99, 'solo il primo livello è aperto');
  await page.click('.cm-node[data-level="1"]', { force: true });
  await page.waitForSelector('.lv-sheet .btn-menu');
  await page.click('.lv-sheet .btn-menu');
  await page.waitForSelector('.ch-goal');
  p0 = await prof(page);
  await page.evaluate(() => (window.yatzyChallenge.ch.rng = () => 0.99)); // tutti 6
  await page.click('.ch-roll');
  await page.waitForSelector('.ch-goal.is-ready');
  await page.screenshot({ path: join(OUT, '08-sfida.png') });
  await page.click('.ch-goal.is-ready', { force: true });
  await page.waitForSelector('.result.won', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, '09-sfida-vinta.png') });
  p1 = await prof(page);
  check(p1.campaign.best === 1 && p1.campaign.stars[1] === 3, 'livello 1 superato con 3 stelle');
  check(p1.coins > p0.coins, `monete guadagnate (+${p1.coins - p0.coins})`);
  await page.click('.rs-actions .btn-menu.primary');
  await page.waitForSelector('.ch-goal');
  await page.evaluate(() => {
    const seq = [1, 2, 3, 4, 6];
    let k = 0;
    window.yatzyChallenge.ch.rng = () => (seq[k++ % 5] - 1) / 6 + 0.01;
  });
  for (let k = 0; k < 20 && !(await page.evaluate(() => window.yatzyChallenge.ch.over)); k++) {
    await page.evaluate(() => window.yatzyChallenge.roll());
    await page.waitForFunction(() => !window.yatzyChallenge.busy);
  }
  await page.waitForSelector('.result.lost', { timeout: 10000 });
  check(true, 'livello 2 perso quando finiscono i lanci');
  check((await prof(page)).campaign.best === 1, 'il livello perso non avanza la campagna');

  console.log('\n[6] Boss');
  await page.evaluate(() => window.yatzyApp.account.update((p) => (p.campaign.best = 9)));
  await page.click('.rs-actions .btn-menu.ghost');
  await page.waitForSelector('.cm-node[data-level="10"]');
  await page.click('.cm-node[data-level="10"]', { force: true });
  await page.waitForSelector('.lv-sheet.boss .btn-menu');
  await page.click('.lv-sheet.boss .btn-menu');
  await page.waitForSelector('.boss-intro .btn-menu');
  await page.screenshot({ path: join(OUT, '10-boss.png') });
  check((await track()) === 'boss', 'contro il boss parte la musica dello scontro');
  await page.click('.boss-intro .btn-menu');
  p0 = await prof(page);
  let sawBot = false;
  for (let i = 0; i < 4000; i++) {
    const st = await page.evaluate(() => {
      const d = window.yatzyDebug;
      const g = d?.game;
      if (!g) return null;
      return { over: g.phase === 'over', cur: g.current.id, busy: d.busy, rolled: g.dice.hasRolled };
    });
    if (!st) {
      await page.waitForTimeout(50);
      continue;
    }
    if (st.over) break;
    if (st.cur === 'blue') sawBot = true;
    if (st.cur === 'red' && !st.busy) {
      // il rosso gioca col bot più bravo e dadi fortunati (per arrivare alla vittoria)
      await page.evaluate(async () => {
        const d = window.yatzyDebug;
        const g = d.game;
        const m = window.yatzyApp.botMove(g, { skill: 1 });
        if (m.type === 'roll') {
          if (!g.dice.hasRolled) d.forceNextRoll([6, 6, 6, 6, 6]);
          await d.controller.onRoll();
        } else if (m.type === 'hold') d.controller.onDieTap(m.i);
        else if (m.type === 'select') d.controller.onCellTap('red', m.cat);
        else await d.controller.onConfirm();
      });
    }
    await page.waitForTimeout(40);
  }
  await page.waitForSelector('.result', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, '11-boss-fine.png') });
  const totals = await page.evaluate(() => window.yatzyDebug.game.results().totals);
  p1 = await prof(page);
  check(sawBot, 'il boss gioca i suoi turni da solo');
  check(totals.red > totals.blue && (await page.locator('.result.won').count()) === 1, `boss sconfitto ${totals.red} – ${totals.blue}`);
  check(p1.campaign.best === 10 && p1.stats.bosses === 1 && p1.coins - p0.coins === 400, `ricompensa del boss: +${p1.coins - p0.coins} monete, mondo 2 sbloccato`);

  console.log('\n[7] Classifica e altro telefono');
  await page.evaluate(() => window.yatzyApp.account.flush());
  await page.waitForTimeout(500);
  await page.click('.rs-actions .btn-menu.ghost');
  await page.waitForSelector('.cm-node');
  await page.click('.page-back');
  await page.click('.hub-btn.mini >> text=CLASSIFICA');
  await page.waitForSelector('.board-row');
  check((await page.locator('.board-row.is-me').count()) === 1, 'il giocatore compare in classifica');
  const saved = await prof(page);
  const other = await phone();
  await other.page.goto(`${BASE}?debug=1&speed=3&skipintro`);
  await other.page.waitForSelector('.hub-guest');
  await other.page.click('.hub-guest');
  await other.page.click('.auth-tab >> text=ACCEDI');
  await other.page.fill('.auth-input >> nth=0', user.toUpperCase());
  await other.page.fill('.auth-input >> nth=1', 'pass1234');
  await other.page.click('.auth-go');
  await other.page.waitForSelector('.hub-rank');
  const there = await prof(other.page);
  check(there.coins === saved.coins && there.campaign.best === 10 && there.equip.hat === 'hat.wizard', 'dal secondo telefono ritrova monete, campagna e vestiti');
  await other.page.screenshot({ path: join(OUT, '12-altro-telefono.png') });
} catch (e) {
  console.log('ERRORE', e);
  failures++;
}
check(errors.length === 0, `nessun errore in console ${errors.slice(0, 5).join(' | ')}`);
await browser.close();
web.kill();
console.log(failures ? `\n${failures} controlli falliti` : '\nTutti i controlli superati');
process.exit(failures ? 1 : 0);
