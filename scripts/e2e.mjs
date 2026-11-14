/**
 * Test end-to-end nel browser (Chromium via Playwright).
 *   node scripts/e2e.mjs [cartella-screenshot]
 *   E2E_PAGE=dist/index.html node scripts/e2e.mjs   (versione compilata)
 *
 * - layout su vari schermi (nessun elemento fuori schermo o sovrapposto)
 * - carta gratta e vinci grattata col dito a inizio turno
 * - partita completa giocata toccando l'interfaccia, usando le carte, con
 *   verifiche di coerenza tra motore e interfaccia (dadi, caselle, totali, rotazione)
 * - bonus +100 YATZY con spunte, bonus +35, salvataggio e ripresa
 * - fluidità delle animazioni con CPU rallentata 4x (smartphone medio)
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
/** Avvisi del WebGL software del browser di prova (non del gioco). */
const IGNORED_CONSOLE = /KHR_parallel_shader_compile|GL Driver Message|GPU stall due to ReadPixels|WebGL: INVALID_|Automatic fallback to software WebGL/;
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright non trovato: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'test-results');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.E2E_PORT) || 5199;
const BASE = `http://localhost:${PORT}/${process.env.E2E_PAGE || 'index.html'}`;

const server = spawn(process.execPath, [join(ROOT, 'scripts/serve.mjs'), String(PORT), ROOT], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
};

const idle = (page, timeout = 40000) =>
  page.waitForFunction(() => window.yatzyDebug && !window.yatzyDebug.busy && !window.yatzyDebug.scratching, null, { timeout });
const pd = (page, sel) => page.locator(sel).first().dispatchEvent('pointerdown');

async function newPage(browser, viewport, query = 'classic=1&debug=1&speed=6') {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: true, isMobile: viewport.width < 600 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !IGNORED_CONSOLE.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${BASE}?${query}`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}?${query}`);
  await page.waitForSelector('.menu .btn-menu', { state: 'attached' });
  return { ctx, page, errors };
}

/** Gratta la carta trascinando il dito sullo strato argentato. */
async function scratchWithFinger(page) {
  const box = await page.locator('.scratch-screen canvas').boundingBox();
  await page.mouse.move(box.x + 16, box.y + 20);
  await page.mouse.down();
  for (let y = box.y + 20; y < box.y + box.height; y += 26) {
    await page.mouse.move(box.x + box.width - 16, y, { steps: 6 });
    await page.mouse.move(box.x + 16, y + 13, { steps: 6 });
  }
  await page.mouse.up();
}

/** Completa la fase "gratta la carta" (col dito o scoprendola subito). */
async function handleScratch(page, { finger = false } = {}) {
  await page.waitForFunction(() => window.yatzyDebug && window.yatzyDebug.scratching, null, { timeout: 40000 });
  await page.waitForTimeout(120);
  if (finger) await scratchWithFinger(page);
  else await page.evaluate(() => window.yatzyDebug.revealScratch());
  await page.waitForSelector('.sc-take, .discard-row', { timeout: 15000 });
  await page.waitForTimeout(80);
  if (await page.locator('.discard-row').count()) await pd(page, '.discard-row .card-face.mini');
  else await page.locator('.sc-take').click();
  await page.waitForFunction(() => !window.yatzyDebug.scratching, null, { timeout: 15000 });
}

/** Aspetta che il turno sia pronto, grattando la carta se serve. */
async function turnReady(page, opts) {
  for (;;) {
    const state = await page.waitForFunction(
      () => window.yatzyDebug && (window.yatzyDebug.scratching ? 'scratch' : !window.yatzyDebug.busy ? 'idle' : false),
      null,
      { timeout: 40000 },
    );
    if ((await state.jsonValue()) === 'idle') return;
    await handleScratch(page, opts);
  }
}

async function startGame(page, opts) {
  await page.locator('.menu .btn-menu.primary').click();
  await turnReady(page, opts);
}

/* ------------------------------------------------------------------ */
async function layoutTests(browser) {
  console.log('\n[1] Layout su diversi schermi');
  const viewports = [
    { width: 360, height: 640, name: 'android-piccolo' },
    { width: 375, height: 667, name: 'iphone-se' },
    { width: 390, height: 844, name: 'iphone-14' },
    { width: 412, height: 915, name: 'pixel-7' },
    { width: 430, height: 932, name: 'iphone-pro-max' },
    { width: 360, height: 560, name: 'browser-con-barre' },
    { width: 768, height: 1024, name: 'tablet' },
  ];
  for (const vp of viewports) {
    const { page, errors, ctx } = await newPage(browser, vp);
    await page.screenshot({ path: join(OUT, `menu-${vp.name}.png`) });
    const menuBoxes = await page.$$eval('.menu .btn-menu, .menu .logo, .menu .menu-options, .menu .menu-vs', (els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    const menuOk = menuBoxes.every((b) => b.top >= -0.5 && b.left >= -0.5 && b.bottom <= vp.height + 0.5 && b.right <= vp.width + 0.5);
    await page.locator('.menu .btn-menu.primary').click();
    await page.waitForFunction(() => window.yatzyDebug && window.yatzyDebug.scratching, null, { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `gratta-${vp.name}.png`) });
    const scratchOk = await page.evaluate(() => {
      const r = document.querySelector('.scratch-card').getBoundingClientRect();
      return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
    });
    await turnReady(page);
    await page.evaluate(() => {
      window.yatzyDebug.giveCard('scudoLegno');
      window.yatzyDebug.giveCard('coronaDestino');
      window.yatzyDebug.giveCard('apocalisseDadi');
      window.yatzyDebug.giveCard('furtoFortuna');
      window.yatzyDebug.forceNextRoll([2, 3, 4, 5, 6]);
    });
    await pd(page, '.btn-roll');
    await idle(page);
    await page.screenshot({ path: join(OUT, `game-${vp.name}.png`) });
    const r = await page.evaluate(() => {
      const box = (s) => document.querySelector(s).getBoundingClientRect().toJSON();
      const parts = { hud: box('.hud'), hand: box('.hand'), card: box('.card'), tray: box('.tray'), controls: box('.controls') };
      const inside = Object.values(parts).every((b) => b.top >= -0.5 && b.left >= -0.5 && b.bottom <= innerHeight + 0.5 && b.right <= innerWidth + 0.5);
      const order =
        parts.hud.bottom <= parts.hand.top + 0.5 &&
        parts.hand.bottom <= parts.card.top + 0.5 &&
        parts.card.bottom <= parts.tray.top + 0.5 &&
        parts.tray.bottom <= parts.controls.top + 0.5;
      const cells = [...document.querySelectorAll('.cell, .hand .card-face.mini')].map((c) => c.getBoundingClientRect());
      const minCell = Math.min(...cells.map((c) => Math.min(c.width, c.height)));
      const scroll = document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight;
      return { inside, order, minCell, scroll };
    });
    check(menuOk && scratchOk && r.inside && r.order && !r.scroll, `${vp.name} ${vp.width}x${vp.height}: tutto visibile, niente sovrapposizioni, niente scroll (elemento minimo ${r.minCell.toFixed(0)}px)`);
    check(r.minCell >= 34, `${vp.name}: caselle e carte abbastanza grandi per il tocco`);
    check(errors.length === 0, `${vp.name}: nessun errore in console ${errors.join(' | ')}`);
    await ctx.close();
  }
}

async function landscapeTest(browser) {
  const { page, ctx } = await newPage(browser, { width: 844, height: 390 });
  await page.screenshot({ path: join(OUT, 'orizzontale.png') });
  const shown = await page.evaluate(() => getComputedStyle(document.querySelector('.rotate-hint')).display !== 'none');
  check(shown, "telefono in orizzontale: compare l'invito a ruotarlo in verticale");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const hidden = await page.evaluate(() => getComputedStyle(document.querySelector('.rotate-hint')).display === 'none');
  check(hidden, 'tornando in verticale il gioco riappare');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
/** Usa dall'interfaccia, se possibile, una carta della mano. Restituisce l'id usato. */
async function tryUseCard(page) {
  const plan = await page.evaluate(() => {
    const g = window.yatzyDebug.game;
    const order = ['dominioAssoluto', 'pioggiaOro', 'tempestaPerfetta', 'fontanaDesideri', 'tesoroDraghi', 'clonazione', 'terremoto', 'jackpot', 'catene', 'contrattacco', 'ladroDiLanci', 'eco', 'tassaDelRe', 'raddoppioSuperiore', 'trappola', 'investimento', 'specchioRiflesso', 'rivincita', 'combo', 'paccaSpalla', 'rimbalzo', 'antidoto', 'seiFortunato', 'spintaGentile', 'occhioDestino', 'bigBang', 'furtoCosmico', 'bucoNero', 'tempoInfinito', 'benedizioneEterna', 'reDeiLadri', 'scudoDivino', 'coronaDestino', 'moltiplicatore', 'scambioSorte', 'sabotaggio', 'manoLesta', 'dadoGemello', 'calamita',
      'mezzaLuna', 'lancioRubato', 'geloEterno', 'tempestaLanci', 'spiccioloFortunato', 'reteSalvataggio', 'lancioBenedetto',
      'doppioLancio', 'furtoFortuna', 'saccheggioReale', 'scudoLegno', 'scudoArcano', 'maledizioneCaos', 'apocalisseDadi', 'rewindTemporale', 'dadoTruccato', 'ritiraFortuna', 'riscritturaDestino', 'prigioneTemporale'];
    for (const id of order) {
      const c = g.current.hand.find((x) => x.id === id);
      if (c && g.cardAvailability(c.uid).ok) return { id, uid: c.uid };
    }
    return null;
  });
  if (!plan) return null;
  await pd(page, `.hand .card-face.mini[data-uid="${plan.uid}"]`);
  try {
    await page.waitForSelector('.card-popup .cp-actions .primary:not([disabled])', { timeout: 10000 });
  } catch (e) {
    const st = await page.evaluate((pl) => {
      const g = window.yatzyDebug.game;
      return { plan: pl, av: g.cardAvailability(pl.uid), busy: window.yatzyDebug.busy, popup: Boolean(document.querySelector('.card-popup')), btn: document.querySelector('.card-popup .cp-actions .primary')?.outerHTML?.slice(0, 120), draws: g.pendingDraws, hand: g.current.hand.map((c) => c.id) };
    }, plan);
    console.log('DEBUG carta', JSON.stringify(st));
    throw e;
  }
  await page.locator('.card-popup .cp-actions .primary').click();
  await page.waitForTimeout(250);
  const g = (fn, arg) => page.evaluate(fn, arg);
  switch (plan.id) {
    case 'sabotaggio':
    case 'scambioSorte': {
      const cat = await g((id) => {
        const gm = window.yatzyDebug.game;
        const me = gm.current;
        const opp = gm.opponent;
        if (id === 'sabotaggio') return opp.card.openCategories()[0];
        return Object.keys(opp.card.scores).find((c) => me.card.value(c) !== null && opp.card.value(c) !== null && opp.card.value(c) > me.card.value(c));
      }, plan.id);
      const opp = await g(() => window.yatzyDebug.game.opponent.id);
      await pd(page, `.cell.${opp}[data-cat="${cat}"]`);
      await pd(page, '.tb-btn.ok');
      break;
    }
    case 'dadoGemello': {
      const [a, b] = await g(() => {
        const v = window.yatzyDebug.game.dice.values;
        const b2 = 0;
        return [v.findIndex((x) => x !== v[b2]), b2];
      });
      await pd(page, `.slot >> nth=${a}`);
      await pd(page, `.slot >> nth=${b}`);
      await pd(page, '.tb-btn.ok');
      break;
    }
    case 'calamita':
      await pd(page, '.slot >> nth=0');
      await pd(page, '.tb-btn.ok');
      break;
    case 'manoLesta':
      await page.waitForSelector('.cp-pick-row .card-face.mini');
      await pd(page, '.cp-pick-row .card-face.mini');
      break;
    case 'furtoFortuna':
    case 'saccheggioReale':
    case 'reDeiLadri': {
      const cat = await g(() => {
        const gm = window.yatzyDebug.game;
        return Object.keys(gm.opponent.card.scores).find((c) => (gm.opponent.card.value(c) ?? 0) > 0);
      });
      const opp = await g(() => window.yatzyDebug.game.opponent.id);
      await pd(page, `.cell.${opp}[data-cat="${cat}"]`);
      await pd(page, '.tb-btn.ok');
      break;
    }
    case 'scudoLegno':
    case 'scudoArcano': {
      const cats = await g(() => {
        const gm = window.yatzyDebug.game;
        return Object.keys(gm.current.card.scores).filter((c) => gm.current.card.canShield(c));
      });
      const me = await g(() => window.yatzyDebug.game.current.id);
      for (const c of cats.slice(0, plan.id === 'scudoArcano' ? 3 : 2)) await pd(page, `.cell.${me}[data-cat="${c}"]`);
      await pd(page, '.tb-btn.ok');
      break;
    }
    case 'ritiraFortuna':
      await pd(page, '.slot >> nth=0');
      await pd(page, '.slot >> nth=1');
      await pd(page, '.tb-btn.ok');
      break;
    case 'dadoTruccato':
      await pd(page, '.slot >> nth=0');
      await pd(page, '.tb-choice:not([disabled])');
      await pd(page, '.tb-btn.ok');
      break;
    case 'riscritturaDestino':
      await pd(page, '.slot >> nth=0');
      await pd(page, '.tb-choice:not([disabled])');
      await pd(page, '.tb-btn.ok');
      break;
    default:
      break;
  }
  await turnReady(page);
  return plan.id;
}

async function fullGameTest(browser) {
  console.log("\n[2] Partita completa giocata dall'interfaccia (26 turni, con carte)");
  const { page, errors, ctx } = await newPage(browser, { width: 390, height: 844 });
  await startGame(page, { finger: true });
  let mismatches = 0;
  let rotationErrors = 0;
  let rolls = 0;
  let holdsChecked = 0;
  let scratchedWithFinger = 1;
  const used = new Set();
  for (let t = 0; t < 26; t++) {
    if (t > 0) {
      const finger = t < 4;
      await turnReady(page, { finger });
      if (finger) scratchedWithFinger++;
    }
    const pid = await page.evaluate(() => window.yatzyDebug.game.current.id);
    const rotation = await page.evaluate(() => getComputedStyle(document.querySelector('.table')).transform);
    const flipped = rotation !== 'none' && rotation.startsWith('matrix(-1');
    if (flipped !== (pid === 'blue')) rotationErrors++;
    if (t % 3 === 0) {
      const id = await tryUseCard(page);
      if (id) used.add(id);
    }
    const nRolls = 1 + (t % 3);
    for (let r = 0; r < nRolls; r++) {
      if (r > 0) {
        if (!(await page.evaluate(() => window.yatzyDebug.game.canRoll()))) break;
        const before = await page.evaluate(() => [...window.yatzyDebug.game.dice.values]);
        const keep = await page.evaluate((tt) => [tt % 5, (tt + 2) % 5].filter((k) => window.yatzyDebug.game.canHold(k)), t);
        for (const k of keep) await pd(page, `.slot >> nth=${k}`);
        await pd(page, '.btn-roll');
        await idle(page);
        const after = await page.evaluate(() => ({ v: [...window.yatzyDebug.game.dice.values], held: [...window.yatzyDebug.game.dice.held] }));
        if (keep.some((k) => after.held[k] && before[k] !== after.v[k])) mismatches++;
        holdsChecked++;
        for (const k of keep) if (await page.evaluate((kk) => window.yatzyDebug.game.dice.held[kk], k)) await pd(page, `.slot >> nth=${k}`);
      } else {
        await pd(page, '.btn-roll');
        await idle(page);
      }
      rolls++;
      const ok = await page.evaluate(() => {
        const g = window.yatzyDebug.game;
        const dice = [...document.querySelectorAll('.slot .die')].map((d) => Number(d.dataset.value));
        return dice.every((v, i) => v === g.dice.values[i]);
      });
      if (!ok) mismatches++;
      if (t % 3 === 1 && r === 0) {
        const id = await tryUseCard(page);
        if (id) used.add(id);
      }
    }
    const cat = await page.evaluate(() => {
      const gm = window.yatzyDebug.game;
      const open = gm.current.card.openCategories().filter((c) => !gm.isBlocked(c));
      return open[Math.floor(Math.random() * open.length)];
    });
    await pd(page, `.cell.${pid}[data-cat="${cat}"]`);
    const preview = await page.locator(`.cell.${pid}[data-cat="${cat}"] .val`).textContent();
    const expected = await page.evaluate((c) => String(window.yatzyDebug.game.previewScore(c)), cat);
    if (preview !== expected) mismatches++;
    await pd(page, '.btn-confirm');
    await page.waitForFunction(() => window.yatzyDebug.scratching || !window.yatzyDebug.busy || window.yatzyDebug.game.phase === 'over', null, { timeout: 40000 });
    await page.waitForFunction(() => window.yatzyDebug.scratching || !window.yatzyDebug.busy, null, { timeout: 40000 });
    const sync = await page.evaluate(() => {
      const g = window.yatzyDebug.game;
      let bad = 0;
      for (const p of g.players) {
        for (const c of Object.keys(p.card.scores)) {
          const v = p.card.value(c);
          const txt = document.querySelector(`.cell.${p.id}[data-cat="${c}"] .val`).textContent;
          if ((v === null && txt !== '') || (v !== null && txt !== String(v))) bad++;
        }
        const hud = document.querySelector(`.sb-player.${p.id} .sb-total`).textContent;
        if (hud !== String(p.card.total())) bad++;
      }
      return bad;
    });
    mismatches += sync;
  }
  check(scratchedWithFinger >= 4, `carte grattate col dito: ${scratchedWithFinger} (le altre scoperte automaticamente)`);
  check(rotationErrors === 0, 'il tavolo è ruotato di 180° solo nei turni del blu');
  check(mismatches === 0, `dadi, anteprime, caselle e totali sempre coerenti con il motore (${rolls} lanci, ${holdsChecked} rilanci con dadi tenuti)`);
  check(used.size >= 3, `carte usate durante la partita: ${[...used].join(', ') || 'nessuna'}`);
  await page.waitForSelector('.gameover', { timeout: 20000 });
  // i totali contano da 0 in su: aspetta la fine del conteggio (su macchine lente dura di più)
  await page
    .waitForFunction(() => {
      const g = window.yatzyDebug.game;
      const shown = [...document.querySelectorAll('.go-total')].map((e) => Number(e.textContent));
      return shown.length === 2 && shown[0] === g.player('blue').card.total() && shown[1] === g.player('red').card.total();
    }, null, { timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'fine-partita.png') });
  const res = await page.evaluate(() => {
    const g = window.yatzyDebug.game;
    const totals = [...document.querySelectorAll('.go-total')].map((e) => Number(e.textContent));
    const final = g.results();
    return { phase: g.phase, totals, expected: [g.player('blue').card.total(), g.player('red').card.total()], final: [final.totals.blue, final.totals.red], titles: [...document.querySelectorAll('.go-title')].map((e) => e.textContent) };
  });
  check(res.phase === 'over', 'la partita termina dopo 13 round');
  check(JSON.stringify(res.totals) === JSON.stringify(res.expected) && JSON.stringify(res.final) === JSON.stringify(res.expected), `schermata finale con i totali corretti (${res.titles.join(' / ')} ${res.totals.join(' - ')})`);
  check(errors.length === 0, `nessun errore in console ${errors.join(' | ')}`);
  await ctx.close();
}

/* ------------------------------------------------------------------ */
async function yatzyBonusTest(browser) {
  console.log('\n[3] Bonus +100 per ogni Yatzy aggiuntivo');
  const { page, errors, ctx } = await newPage(browser, { width: 390, height: 844 });
  await startGame(page);
  const turn = async (pid, values, cat) => {
    await turnReady(page);
    await page.evaluate((v) => window.yatzyDebug.forceNextRoll(v), values);
    await pd(page, '.btn-roll');
    await idle(page);
    await pd(page, `.cell.${pid}[data-cat="${cat}"]`);
    await pd(page, '.btn-confirm');
    await page.waitForFunction(() => window.yatzyDebug.scratching || !window.yatzyDebug.busy, null, { timeout: 40000 });
  };
  const state = () =>
    page.evaluate(() => ({
      checks: document.querySelectorAll('.yz-checks.red .yz-check').length,
      hud: Number(document.querySelector('.sb-player.red .sb-total').textContent),
      total: window.yatzyDebug.game.player('red').card.total(),
      bonus: window.yatzyDebug.game.player('red').card.yatzyBonusTotal(),
    }));
  await turn('red', [4, 4, 4, 4, 4], 'yatzy');
  let s = await state();
  check(s.total === 50 && s.bonus === 0 && s.checks === 0, 'primo Yatzy: 50 punti, nessun bonus');
  await turn('blue', [1, 2, 3, 4, 6], 'chance');
  await turn('red', [6, 6, 6, 6, 6], 'sixes');
  await turnReady(page);
  s = await state();
  check(s.bonus === 100 && s.checks === 1 && s.hud === 50 + 30 + 100, `secondo Yatzy: +100, una spunta, totale ${s.hud}`);
  await turn('blue', [1, 2, 3, 4, 6], 'ones');
  await turnReady(page);
  await page.evaluate(() => window.yatzyDebug.forceNextRoll([3, 3, 3, 3, 3]));
  await pd(page, '.btn-roll');
  await idle(page);
  await pd(page, '.cell.red[data-cat="largeStraight"]');
  const preview = await page.locator('.cell.red[data-cat="largeStraight"] .val').textContent();
  check(preview === '40', 'Yatzy aggiuntivo come jolly nella scala grande (40)');
  await pd(page, '.btn-confirm');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'yatzy-bonus-animazione.png') });
  await page.waitForFunction(() => window.yatzyDebug.scratching || !window.yatzyDebug.busy, null, { timeout: 40000 });
  s = await state();
  check(s.bonus === 200 && s.checks === 2 && s.hud === 50 + 30 + 40 + 200, `terzo Yatzy: +100 di nuovo, due spunte, totale ${s.hud}`);
  check(errors.length === 0, `nessun errore in console ${errors.join(' | ')}`);
  await ctx.close();
}

/* ------------------------------------------------------------------ */
async function cardsTest(browser) {
  console.log('\n[4] Carte dall\'interfaccia: furto, scudo, maledizione, prigione, Rewind');
  const { page, errors, ctx } = await newPage(browser, { width: 390, height: 844 });
  await startGame(page);
  const use = async (id) => {
    await pd(page, `.hand .card-face.mini[data-card="${id}"]`);
    await page.waitForSelector('.card-popup .cp-actions .primary:not([disabled])');
    await page.locator('.card-popup .cp-actions .primary').click();
    await page.waitForTimeout(250);
  };
  const score = async (pid, values, cat) => {
    await page.evaluate((v) => window.yatzyDebug.forceNextRoll(v), values);
    await pd(page, '.btn-roll');
    await idle(page);
    await pd(page, `.cell.${pid}[data-cat="${cat}"]`);
    await pd(page, '.btn-confirm');
    await turnReady(page);
  };
  // rosso: Yatzy, scudo sulla casella Yatzy, maledizione al blu
  await page.evaluate(() => ['scudoLegno', 'maledizioneCaos'].forEach((id) => window.yatzyDebug.giveCard(id)));
  await use('maledizioneCaos');
  await idle(page);
  const cursed = await page.evaluate(() => document.querySelector('.sb-player.blue').classList.contains('is-cursed'));
  check(cursed, 'Maledizione del Caos: il blu mostra la maledizione in arrivo');
  await use('scudoLegno');
  await pd(page, '.cell.red[data-cat="yatzy"]');
  await pd(page, '.cell.red[data-cat="chance"]');
  await pd(page, '.tb-btn.ok');
  await idle(page);
  check((await page.locator('.cell.red[data-cat="yatzy"] .cb-shield').count()) === 1, 'Scudo di Legno: scudo visibile sulla casella');
  await score('red', [5, 5, 5, 5, 5], 'yatzy');
  // blu: la maledizione scatta al primo lancio
  await page.evaluate(() => window.yatzyDebug.forceNextRoll([2, 2, 2, 2, 2]));
  await pd(page, '.btn-roll');
  await page.waitForSelector('.curse-banner', { timeout: 15000 });
  await page.screenshot({ path: join(OUT, 'maledizione.png') });
  await idle(page);
  const blueDice = await page.evaluate(() => window.yatzyDebug.game.dice.values.filter((v) => v === 2).length);
  check(blueDice <= 5 && (await page.evaluate(() => window.yatzyDebug.game.player('blue').status.curse === null)), `la maledizione è scattata (dadi rilanciati: ${5 - blueDice} hanno cambiato valore)`);
  // furto bloccato dallo scudo, poi saccheggio sulla Yatzy dopo che lo scudo è consumato
  await page.evaluate(() => ['furtoFortuna', 'saccheggioReale', 'prigioneTemporale'].forEach((id) => window.yatzyDebug.giveCard(id)));
  await page.evaluate(() => window.yatzyDebug.giveCard('rewindTemporale', 'red'));
  await use('furtoFortuna');
  await pd(page, '.cell.red[data-cat="yatzy"]');
  await pd(page, '.tb-btn.ok');
  await idle(page);
  let t = await page.evaluate(() => [window.yatzyDebug.game.player('red').card.total(), window.yatzyDebug.game.player('blue').card.total()]);
  check(t[0] === 50 && t[1] === 0, 'Furto di Fortuna bloccato dallo scudo');
  await use('saccheggioReale');
  await pd(page, '.cell.red[data-cat="yatzy"]');
  await pd(page, '.tb-btn.ok');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, 'saccheggio.png') });
  await idle(page);
  t = await page.evaluate(() => [window.yatzyDebug.game.player('red').card.total(), window.yatzyDebug.game.player('blue').card.total(), document.querySelector('.cell.red[data-cat="yatzy"] .val').textContent]);
  check(t[0] === 30 && t[1] === 20 && t[2] === '30', `Saccheggio Reale: 20 punti passano dal rosso al blu (${t[0]} - ${t[1]})`);
  // prigione: blocca tutte le carte del rosso (compreso il Rewind)
  await use('prigioneTemporale');
  await idle(page);
  await score('blue', [1, 2, 3, 4, 6], 'chance');
  const locked = await page.evaluate(() => {
    const g = window.yatzyDebug.game;
    const c = g.current.hand.find((x) => x.id === 'rewindTemporale');
    return g.isCardLocked(c) && document.querySelector('.hand .card-face.mini[data-card="rewindTemporale"]').classList.contains('is-locked');
  });
  check(locked, 'Prigione Temporale: la carta del rosso è incatenata nel suo turno');
  await page.screenshot({ path: join(OUT, 'prigione.png') });
  check(errors.length === 0, `nessun errore in console ${errors.join(' | ')}`);
  await ctx.close();
}

/* ------------------------------------------------------------------ */
async function memesTest(browser) {
  console.log('\n[5] Tradizioni della casa: Dottore e Satana');
  const { page, errors, ctx } = await newPage(browser, { width: 390, height: 844 }, 'classic=1&debug=1&speed=2');
  await startGame(page);
  const score = async (pid, values, cat, { skip = false, shot = null } = {}) => {
    await turnReady(page);
    await page.evaluate((v) => window.yatzyDebug.forceNextRoll(v), values);
    await pd(page, '.btn-roll');
    await idle(page);
    await pd(page, `.cell.${pid}[data-cat="${cat}"]`);
    await pd(page, '.btn-confirm');
    const scene = await page.waitForSelector('.meme-scene', { timeout: 15000 }).then(() => true, () => false);
    let text = '';
    if (scene) {
      await page.waitForTimeout(skip ? 200 : 1500);
      text = await page.locator('.meme-scene').innerText();
      if (shot) await page.screenshot({ path: join(OUT, shot) });
      if (skip) await pd(page, '.meme-scene');
      await page.waitForFunction(() => !window.yatzyDebug.meme, null, { timeout: 15000 });
    }
    await page.waitForFunction(() => window.yatzyDebug.scratching || !window.yatzyDebug.busy, null, { timeout: 40000 });
    return { scene, text };
  };
  let r = await score('red', [3, 3, 5, 5, 5], 'fullHouse', { shot: 'dottore-contratto.png' });
  check(r.scene && /CONTRATTO/i.test(r.text) && /Dottore/.test(r.text), 'Full segnato nel Full: scena del Contratto col Dottore');
  await turnReady(page);
  check((await page.locator('.cell.red[data-cat="fullHouse"] .cb-meme.doctor').count()) === 1, 'la casella Full mostra il distintivo del Dottore');
  r = await score('blue', [2, 2, 2, 6, 6], 'twos', { shot: 'dottore-rifiutato.png' });
  check(r.scene && /RIFIUTI IL DOTTORE/i.test(r.text), 'Full segnato altrove: scena "Rifiuti il Dottore"');
  r = await score('red', [1, 2, 3, 4, 6], 'yatzy', { shot: 'rinuncia-satana.png' });
  check(r.scene && /SATANA/i.test(r.text), '0 sullo Yatzy: scena "Rinuncia a Satana"');
  await turnReady(page);
  check((await page.locator('.cell.red[data-cat="yatzy"] .cb-meme.halo').count()) === 1, 'la casella Yatzy a 0 mostra l\'aureola');
  r = await score('blue', [4, 4, 1, 4, 1], 'chance', { skip: true });
  check(r.scene, 'un altro Full non giocato dal blu: di nuovo "Rifiuti il Dottore" (saltata con un tocco)');
  r = await score('red', [4, 4, 1, 4, 1], 'fours');
  check(!r.scene, 'il rosso ha già firmato col Dottore: nessuna scena');
  check(errors.length === 0, `nessun errore in console ${errors.join(' | ')}`);
  await ctx.close();
}

/* ------------------------------------------------------------------ */
async function upperBonusAndResumeTest(browser) {
  console.log('\n[6] Bonus +35, salvataggio e ripresa');
  const { page, errors, ctx } = await newPage(browser, { width: 390, height: 844 });
  await startGame(page);
  const plan = [
    [[1, 1, 1, 2, 3], 'ones'],
    [[2, 2, 2, 2, 3], 'twos'],
    [[3, 3, 3, 1, 2], 'threes'],
    [[4, 4, 4, 1, 2], 'fours'],
    [[5, 5, 5, 1, 2], 'fives'],
    [[6, 6, 6, 1, 2], 'sixes'],
  ];
  for (const [values, cat] of plan) {
    for (const pid of ['red', 'blue']) {
      await turnReady(page);
      await page.evaluate((v) => window.yatzyDebug.forceNextRoll(v), values);
      await pd(page, '.btn-roll');
      await idle(page);
      await pd(page, `.cell.${pid}[data-cat="${cat}"]`);
      await pd(page, '.btn-confirm');
      if (pid === 'red' && cat === 'sixes') {
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(OUT, 'bonus-35.png') });
      }
      await page.waitForFunction(() => window.yatzyDebug.scratching || !window.yatzyDebug.busy, null, { timeout: 40000 });
    }
  }
  await turnReady(page);
  const r = await page.evaluate(() => ({
    done: document.querySelector('.sc-ring.red').classList.contains('is-done'),
    upper: window.yatzyDebug.game.player('red').card.upperTotal(),
    total: window.yatzyDebug.game.player('red').card.total(),
    hud: document.querySelector('.sb-player.red .sb-total').textContent,
    hand: window.yatzyDebug.game.player('red').hand.length,
  }));
  check(r.done && r.upper === 65 && r.total === 100 && r.hud === '100', `bonus +35 a ${r.upper}/63: totale ${r.hud}`);
  await page.evaluate(() => window.yatzyDebug.forceNextRoll([2, 2, 5, 5, 5]));
  await pd(page, '.btn-roll');
  await idle(page);
  await pd(page, '.slot >> nth=2');
  await page.reload();
  await page.waitForSelector('.menu .btn-menu');
  check((await page.locator('text=CONTINUA').count()) === 1, 'dopo la ricarica il menu propone CONTINUA');
  await page.locator('text=CONTINUA').click();
  await turnReady(page);
  const resumed = await page.evaluate(() => ({
    turnId: window.yatzyDebug.game.turnId,
    dice: [...document.querySelectorAll('.slot .die')].map((d) => Number(d.dataset.value)),
    held: [...document.querySelectorAll('.slot')].map((s) => s.classList.contains('is-held')),
    hud: document.querySelector('.sb-player.red .sb-total').textContent,
    hand: document.querySelectorAll('.hand .card-face.mini').length,
  }));
  check(
    resumed.turnId === 13 && resumed.dice.join() === '2,2,5,5,5' && resumed.held[2] && resumed.hud === '100' && resumed.hand === r.hand,
    `partita ripresa con dadi, dado tenuto, punteggi e ${resumed.hand} carte in mano`,
  );
  check(errors.length === 0, `nessun errore in console ${errors.join(' | ')}`);
  await ctx.close();
}

/* ------------------------------------------------------------------ */
async function performanceTest(browser) {
  console.log('\n[7] Fluidità animazioni con CPU rallentata 4x');
  const { page, ctx } = await newPage(browser, { width: 390, height: 844 }, 'classic=1&debug=1&speed=1');
  await page.locator('.menu .btn-menu.primary').click();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const measure = async (action) => {
    await page.evaluate(() => {
      window.__frames = [];
      let last = performance.now();
      const loop = (now) => {
        window.__frames.push(now - last);
        last = now;
        if (window.__frames.length < 3000) window.__raf = requestAnimationFrame(loop);
      };
      window.__raf = requestAnimationFrame(loop);
    });
    await action();
    return page.evaluate(() => {
      cancelAnimationFrame(window.__raf);
      const f = window.__frames.slice(2);
      const avg = f.reduce((a, b) => a + b, 0) / f.length;
      const long = f.filter((x) => x > 50).length;
      return { fps: 1000 / avg, long, frames: f.length };
    });
  };
  const scratch = await measure(async () => {
    await page.waitForFunction(() => window.yatzyDebug && window.yatzyDebug.scratching, null, { timeout: 20000 });
    await page.waitForTimeout(400);
    await scratchWithFinger(page);
    await page.waitForSelector('.sc-take', { timeout: 15000 });
    await page.locator('.sc-take').click();
    await idle(page);
  });
  const roll = await measure(async () => {
    await pd(page, '.btn-roll');
    await idle(page);
  });
  await pd(page, '.cell.red[data-cat="chance"]');
  const score = await measure(async () => {
    await pd(page, '.btn-confirm');
    await page.waitForFunction(() => window.yatzyDebug.scratching, null, { timeout: 40000 });
  });
  check(scratch.fps > 40 && scratch.long <= 6, `grattata e rivelazione della carta: ${scratch.fps.toFixed(0)} fps medi, ${scratch.long} frame lenti (>50ms)`);
  check(roll.fps > 40 && roll.long <= 3, `lancio dei dadi: ${roll.fps.toFixed(0)} fps medi, ${roll.long} frame lenti`);
  check(score.fps > 40 && score.long <= 5, `punteggio + cambio turno: ${score.fps.toFixed(0)} fps medi, ${score.long} frame lenti`);
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await layoutTests(browser);
  await landscapeTest(browser);
  await fullGameTest(browser);
  await yatzyBonusTest(browser);
  await cardsTest(browser);
  await memesTest(browser);
  await upperBonusAndResumeTest(browser);
  await performanceTest(browser);
} catch (e) {
  failures++;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} controlli falliti` : '\nTutti i controlli superati');
process.exit(failures ? 1 : 0);
