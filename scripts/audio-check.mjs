/**
 * Controllo dei suoni registrati nel browser: ogni effetto si decodifica,
 * ogni brano e ogni ambiente suonano (livello misurato), niente errori.
 *   node scripts/audio-check.mjs   (dopo npm run build)
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5196;
const web = spawn(process.execPath, [join(ROOT, 'scripts/serve.mjs'), String(PORT), join(ROOT, 'dist')], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch();
let failures = 0;
const check = (ok, msg) => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
};
try {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html?debug=1&skipintro`);
  await page.waitForFunction(() => window.yatzyApp);
  await page.mouse.click(5, 5);
  await page.evaluate(() => window.yatzyApp.sound.unlock());
  const ok = await page.evaluate(() => window.yatzyApp.audioLib.ready());
  check(ok, 'elenco dei suoni registrati caricato');

  // effetti, voci e carte: tutti decodificabili
  const res = await page.evaluate(async () => {
    const lib = window.yatzyApp.audioLib;
    const m = lib.manifest;
    const files = new Set();
    (function walk(v) {
      if (typeof v === 'string' && v.endsWith('.mp3')) files.add(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    })({ sfx: m.sfx, voices: m.voices });
    const bad = [];
    let total = 0;
    for (const f of files) {
      const b = await lib.load(f);
      if (!b) bad.push(f);
      else {
        total += b.duration;
        let peak = 0;
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i += 4) peak = Math.max(peak, Math.abs(d[i]));
        if (peak < 0.02) bad.push(`${f} (muto)`);
      }
    }
    return { n: files.size, bad, total: Math.round(total) };
  });
  check(res.bad.length === 0, `${res.n} effetti e voci decodificati (${res.total} s in tutto)${res.bad.length ? `: ${res.bad.slice(0, 8).join(', ')}` : ''}`);

  // musica e ambienti: livello misurato dopo il volume generale
  const levels = await page.evaluate(async () => {
    const { music, audioLib: lib } = window.yatzyApp;
    const an = music.ctx.createAnalyser();
    an.fftSize = 2048;
    music.master.connect(an);
    const buf = new Float32Array(2048);
    const rms = async (ms) => {
      let s = 0;
      let n = 0;
      const end = performance.now() + ms;
      while (performance.now() < end) {
        await new Promise((r) => setTimeout(r, 100));
        an.getFloatTimeDomainData(buf);
        let x = 0;
        for (const v of buf) x += v * v;
        s += Math.sqrt(x / buf.length);
        n++;
      }
      return +(s / n).toFixed(4);
    };
    const out = {};
    const mk = Object.keys(lib.manifest.music || {});
    for (const k of mk) {
      const [name, opts] = /^w\d+$/.test(k) ? ['world', { world: Number(k.slice(1)) }] : k === 'bossFinal' ? ['boss', { intensity: 1 }] : [k, {}];
      music.play(name, opts);
      await new Promise((r) => setTimeout(r, 2600));
      out[`music:${k}`] = await rms(1500);
    }
    music.play(null);
    await new Promise((r) => setTimeout(r, 1800));
    for (const k of Object.keys(lib.manifest.amb || {})) {
      const ambOnly = music.streams[2].key ? music.streams[2] : music.streams[3];
      const st = music.streams[2].key ? music.streams[3] : music.streams[2];
      ambOnly.stop?.(0.1);
      st.start(lib.url(lib.manifest.amb[k].file), k, lib.manifest.amb[k].gain ?? 1, 0.3);
      await new Promise((r) => setTimeout(r, 1500));
      out[`amb:${k}`] = await rms(1200);
      st.stop(0.1);
      await new Promise((r) => setTimeout(r, 300));
    }
    return out;
  });
  for (const [k, v] of Object.entries(levels)) check(v > 0.002, `${k} suona (livello ${v})`);
  check(errors.length === 0, `nessun errore${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  console.log('ERRORE', e.message);
  failures++;
} finally {
  await browser.close();
  web.kill();
}
console.log(failures ? `\n${failures} controlli falliti` : '\nTutti i controlli superati');
process.exit(failures ? 1 : 0);
