/**
 * Test della modalità online: due "telefoni" (due browser separati) collegati
 * tramite un server PeerJS locale giocano una partita intera toccando
 * l'interfaccia. Verifica che i due stati restino identici, la riconnessione
 * dopo una caduta, la ripresa dopo il ricaricamento della pagina, la
 * correzione di una divergenza e la rivincita.
 *   node scripts/e2e-online.mjs [cartella-screenshot]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'test-results', 'online');
mkdirSync(OUT, { recursive: true });

const WEB_PORT = 5198;
const PEER_PORT = 9010;
const PAGE = process.env.E2E_PAGE || 'index.html';
const URL = `http://localhost:${WEB_PORT}/${PAGE}?debug=1&netlog=1&speed=6&peerHost=127.0.0.1&peerPort=${PEER_PORT}&peerPath=/`;

const web = spawn(process.execPath, [join(ROOT, 'scripts/serve.mjs'), String(WEB_PORT), ROOT], { stdio: 'ignore' });
const peer = spawn(join(ROOT, 'node_modules/.bin/peerjs'), ['--host', '127.0.0.1', '--port', String(PEER_PORT), '--path', '/'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

let failures = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};
const pd = (page, sel) => page.locator(sel).first().dispatchEvent('pointerdown');

async function phone(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.errors = [];
  page.netlog = [];
  page.on('console', (m) => {
    if (m.type() === 'error') page.errors.push(`${name}: ${m.text()}`);
    if (m.text().startsWith('[net]')) page.netlog.push(`${name} ${m.text()}`);
  });
  pages.push(page);
  page.on('pageerror', (e) => page.errors.push(`${name} pageerror: ${e.message}`));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL);
  await page.waitForSelector('.menu .btn-menu');
  return page;
}

const state = (page) =>
  page.evaluate(() => {
    const d = window.yatzyDebug;
    if (!d || !d.game) return null;
    return {
      hash: d.hash(),
      busy: d.busy,
      scratching: d.scratching,
      myTurn: d.myTurn,
      phase: d.game.phase,
      turn: d.game.turnId,
      current: d.game.current.id,
      status: d.online?.status,
      queue: d.controller.remoteQueue.length,
    };
  });

/** Aspetta che entrambi i telefoni siano fermi e allineati sullo stesso turno. */
async function settle(a, b, timeout = 40000) {
  const t0 = Date.now();
  for (;;) {
    const [sa, sb] = await Promise.all([state(a), state(b)]);
    if (sa && sb && !sa.busy && !sb.busy && sa.queue === 0 && sb.queue === 0 && sa.turn === sb.turn) return [sa, sb];
    if (sa?.scratching && sa.myTurn) await handleScratch(a);
    if (sb?.scratching && sb.myTurn) await handleScratch(b);
    if (Date.now() - t0 > timeout) throw new Error(`timeout settle ${JSON.stringify([sa, sb])}`);
    await a.waitForTimeout(80);
  }
}

async function handleScratch(page) {
  await page.evaluate(() => window.yatzyDebug.revealScratch());
  await page.waitForSelector('.sc-take, .discard-row', { timeout: 15000 });
  await page.waitForTimeout(60);
  if (await page.locator('.discard-row').count()) await pd(page, '.discard-row .card-face.mini');
  else await page.locator('.sc-take').click();
  await page.waitForFunction(() => !window.yatzyDebug.scratching, null, { timeout: 15000 });
}

/** Il telefono di turno gioca un turno toccando l'interfaccia. */
async function playTurn(page, t) {
  const pid = await page.evaluate(() => window.yatzyDebug.game.current.id);
  const idle = () => page.waitForFunction(() => !window.yatzyDebug.busy, null, { timeout: 30000 });
  // a volte usa una carta senza bersaglio
  const card = await page.evaluate(() => {
    const g = window.yatzyDebug.game;
    const ok = ['coronaDestino', 'doppioLancio', 'maledizioneCaos', 'apocalisseDadi', 'manoVeloce'];
    const c = g.current.hand.find((x) => ok.includes(x.id) && g.cardAvailability(x.uid).ok);
    return c ? c.uid : null;
  });
  if (card && t % 2 === 0) {
    await pd(page, `.hand .card-face.mini[data-uid="${card}"]`);
    await page.waitForSelector('.card-popup .cp-actions .primary:not([disabled])', { timeout: 10000 });
    await page.locator('.card-popup .cp-actions .primary').click();
    await page.waitForTimeout(200);
    for (;;) {
      const s = await state(page);
      if (s.scratching) await handleScratch(page);
      else if (!s.busy) break;
      await page.waitForTimeout(60);
    }
  }
  const rolls = 1 + (t % 3);
  for (let r = 0; r < rolls; r++) {
    if (!(await page.evaluate(() => window.yatzyDebug.game.canRoll()))) break;
    if (r > 0) {
      const k = t % 5;
      if (await page.evaluate((i) => window.yatzyDebug.game.canHold(i), k)) await pd(page, `.slot >> nth=${k}`);
    }
    await pd(page, '.btn-roll');
    await idle();
  }
  const cat = await page.evaluate(() => {
    const open = window.yatzyDebug.game.current.card.openCategories();
    return open[Math.floor(Math.random() * open.length)];
  });
  await pd(page, `.cell.${pid}[data-cat="${cat}"]`);
  await pd(page, '.btn-confirm');
}

const pages = [];
const browser = await chromium.launch();
try {
  console.log('\n[1] Collegamento con il codice');
  const host = await phone(browser, 'rosso');
  const guest = await phone(browser, 'blu');
  await host.click('text=GIOCA ONLINE');
  await host.click('text=CREA PARTITA');
  await host.waitForSelector('.ol-code span', { timeout: 15000 });
  const code = (await host.locator('.ol-code').innerText()).replace(/\s/g, '');
  check(/^[A-Z2-9]{5}$/.test(code), `codice partita creato: ${code}`);
  await host.screenshot({ path: join(OUT, 'lobby-codice.png') });
  // l'ospite entra con il link (#CODICE): si unisce da solo
  await guest.goto('about:blank');
  await guest.goto(`${URL}#${code}`);
  await host.waitForFunction(() => window.yatzyDebug?.online?.started, null, { timeout: 20000 });
  await guest.waitForFunction(() => window.yatzyDebug?.online?.started, null, { timeout: 20000 });
  const colors = [await host.evaluate(() => window.yatzyDebug.online.color), await guest.evaluate(() => window.yatzyDebug.online.color)];
  check(colors[0] === 'red' && colors[1] === 'blue', 'chi crea gioca col ROSSO, chi entra col BLU (anche aprendo il link)');

  console.log('\n[2] Partita intera fra due telefoni');
  let diverged = 0;
  let turns = 0;
  let spectatorChecks = 0;
  let reconnectDone = false;
  let reloadDone = false;
  let desyncDone = false;
  // si gioca finché la partita finisce: una correzione di divergenza può far ripetere un turno
  for (let t = 0; t < 40; t++) {
    const [sh, sg] = await settle(host, guest);
    if (sh.hash !== sg.hash && !(desyncDone && t === 19)) {
      diverged++;
      console.log(`    divergenza al turno ${t}: ${JSON.stringify([sh, sg])}`);
    }
    if (sh.phase !== 'playing') break;
    const active = sh.myTurn ? host : guest;
    const passive = sh.myTurn ? guest : host;
    // chi non è di turno non può giocare
    const blocked = await passive.evaluate(() => {
      const g = window.yatzyDebug.game;
      const before = window.yatzyDebug.hash();
      document.querySelector('.btn-roll').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return before === window.yatzyDebug.hash() && !g.dice.hasRolled;
    });
    if (blocked) spectatorChecks++;
    if (t === 5) await passive.screenshot({ path: join(OUT, 'spettatore.png') });
    await playTurn(active, t);
    turns++;

    if (t === 8 && !reconnectDone) {
      // caduta della connessione: si chiude il canale dati
      await settle(host, guest);
      await guest.evaluate(() => window.yatzyApp.session.link.conn.close());
      await guest.waitForSelector('.conn-overlay', { timeout: 10000 }).catch(() => {});
      await guest.screenshot({ path: join(OUT, 'connessione-persa.png') });
      await host.waitForFunction(() => window.yatzyDebug.online.status === 'connected', null, { timeout: 30000 });
      await guest.waitForFunction(() => window.yatzyDebug.online.status === 'connected', null, { timeout: 30000 });
      await guest.waitForFunction(() => !document.querySelector('.conn-overlay'), null, { timeout: 15000 });
      const [a, b] = await settle(host, guest);
      check(a.hash === b.hash, 'dopo una caduta della connessione i telefoni si ricollegano e restano allineati');
      reconnectDone = true;
    }
    if (t === 13 && !reloadDone) {
      // l'ospite ricarica la pagina e rientra con il link della partita
      await settle(host, guest);
      await guest.goto('about:blank');
      await guest.goto(`${URL}#${code}`);
      await guest.waitForFunction(() => window.yatzyDebug?.online?.started && window.yatzyDebug.game, null, { timeout: 30000 });
      const [a, b] = await settle(host, guest);
      check(a.hash === b.hash && a.turn === b.turn, `ricaricando la pagina l'ospite riprende la stessa partita (turno ${b.turn})`);
      reloadDone = true;
    }
    if (t === 18 && !desyncDone) {
      // divergenza forzata sul telefono dell'ospite: deve essere corretta dall'host
      await settle(host, guest);
      await guest.evaluate(() => {
        window.yatzyDebug.game.player('blue').card.cardPoints.push({ id: 999, amount: 7, kind: 'test' });
      });
      desyncDone = true;
    }
  }
  const [fh, fg] = await settle(host, guest);
  check(diverged === 0 && fh.phase === 'over', `stati identici dopo ogni turno, partita finita (${turns} turni giocati)`);
  check(fh.hash === fg.hash, 'la divergenza forzata è stata corretta dall\'host');
  check(spectatorChecks >= 20, `chi non è di turno non può lanciare (${spectatorChecks} prove)`);
  await host.waitForSelector('.gameover', { timeout: 30000 });
  await guest.waitForSelector('.gameover', { timeout: 30000 });
  await host.waitForTimeout(1500);
  await host.screenshot({ path: join(OUT, 'fine-rosso.png') });
  await guest.screenshot({ path: join(OUT, 'fine-blu.png') });
  const titles = [await host.locator('.go-title').allInnerTexts(), await guest.locator('.go-title').allInnerTexts()];
  const totals = [await host.evaluate(() => window.yatzyDebug.game.results().totals), await guest.evaluate(() => window.yatzyDebug.game.results().totals)];
  check(JSON.stringify(totals[0]) === JSON.stringify(totals[1]), `stesso risultato sui due telefoni (${totals[0].red} - ${totals[0].blue})`);
  check(titles[0].some((x) => /HAI|PAREGGIO/.test(x)) && titles[1].some((x) => /HAI|PAREGGIO/.test(x)), `ognuno vede il proprio risultato (${titles[0].join(' / ')} | ${titles[1].join(' / ')})`);

  console.log('\n[3] Rivincita e uscita');
  await guest.locator('.go-center .btn-menu.primary').click();
  await host.waitForFunction(() => window.yatzyDebug?.game?.phase === 'playing' && window.yatzyDebug.game.turnId === 1, null, { timeout: 20000 });
  await guest.waitForFunction(() => window.yatzyDebug?.game?.phase === 'playing' && window.yatzyDebug.game.turnId === 1, null, { timeout: 20000 });
  const [rh, rg] = await settle(host, guest);
  check(rh.hash === rg.hash && rh.turn === 1, 'la rivincita chiesta dal BLU fa ripartire la partita per entrambi');
  await host.locator('.hud .icon-btn').first().click();
  await host.locator('text=ESCI').click();
  await guest.waitForSelector('text=L\'avversario è uscito', { timeout: 15000 });
  check(true, "se il ROSSO esce, il BLU viene avvisato");
  await guest.screenshot({ path: join(OUT, 'avversario-uscito.png') });

  console.log('\n[4] Codice sbagliato');
  const third = await phone(browser, 'terzo');
  await third.click('text=GIOCA ONLINE');
  await third.fill('.ol-input', 'ZZZZZ');
  await third.click('text=ENTRA');
  await third.waitForSelector('.ol-status.error', { timeout: 25000 });
  check(/non trovata/i.test(await third.locator('.ol-status').innerText()), 'codice inesistente: messaggio "Partita non trovata"');

  const errors = [...host.errors, ...guest.errors, ...third.errors].filter((e) => !/Could not connect to peer|peer-unavailable|Lost connection|Connection is not open/i.test(e));
  check(errors.length === 0, `nessun errore in console ${errors.join(' | ')}`);
} catch (e) {
  failures++;
  console.error(e);
} finally {
  if (failures) for (const p of pages) console.log(p.netlog.slice(-45).join('\n'));
  await browser.close();
  web.kill();
  peer.kill();
}
console.log(failures ? `\n${failures} controlli falliti` : '\nTutti i controlli superati');
process.exit(failures ? 1 : 0);
