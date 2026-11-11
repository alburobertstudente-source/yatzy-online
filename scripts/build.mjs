/**
 * Crea dist/index.html: un UNICO file con JS, CSS e font incorporati.
 * Si può copiare sul telefono e aprire anche senza connessione.
 *   node scripts/build.mjs
 */
import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, cp, rm, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_FILES = ['base.css', 'game.css', 'effects.css', 'screens.css', 'cards.css', 'memes.css', 'skins.css', 'meta.css'].map((f) => join(ROOT, 'src/styles', f));

const js = await build({
  entryPoints: [join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari15', 'chrome90'],
  minify: true,
  write: false,
  legalComments: 'none',
});
const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// libreria WebRTC per la modalità online, incorporata così il file unico funziona ovunque
const peerjs = (await readFile(join(ROOT, 'vendor/peerjs.min.js'), 'utf8')).replace(/<\/script/gi, '<\\/script');

const font = await readFile(join(ROOT, 'assets/fonts/fredoka-latin.woff2'));
const fontUrl = `data:font/woff2;base64,${font.toString('base64')}`;
let css = (await Promise.all(CSS_FILES.map((f) => readFile(f, 'utf8')))).join('\n');
css = css.replace(/url\(['"]?\.\.\/\.\.\/assets\/fonts\/fredoka-latin\.woff2['"]?\)/g, `url(${fontUrl})`);
css = (await transform(css, { loader: 'css', minify: true, target: ['safari15', 'chrome90'] })).code;

let html = await readFile(join(ROOT, 'index.html'), 'utf8');
html = html
  .replace(/\s*<link rel="preload"[^>]*>/, '')
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, '')
  .replace('</head>', `    <style>${css}</style>\n  </head>`)
  .replace(/<script type="module" src="src\/main\.js"><\/script>/, () => `<script>${peerjs}</script>\n    <script>${script}</script>`);

await mkdir(join(ROOT, 'dist/icons'), { recursive: true });
await writeFile(join(ROOT, 'dist/index.html'), html);
// file per installare il gioco come app (dist/ si può pubblicare così com'è)
for (const f of ['manifest.webmanifest', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png']) {
  await copyFile(join(ROOT, f), join(ROOT, 'dist', f));
}
// suoni registrati (musica, ambienti, effetti): si caricano dalla cartella audio/ accanto alla pagina
const hasAudio = await access(join(ROOT, 'audio')).then(() => true, () => false);
if (hasAudio) {
  execFileSync(process.execPath, [join(ROOT, 'scripts/audio-manifest.mjs')], { stdio: 'inherit' });
  await rm(join(ROOT, 'dist/audio'), { recursive: true, force: true });
  await cp(join(ROOT, 'audio'), join(ROOT, 'dist/audio'), { recursive: true, filter: (src) => !/index\.json$|CREDITS\.json$/.test(src) || /audio[\\/]CREDITS\.json$/.test(src) });
}
console.log(`dist/index.html creato (${(html.length / 1024).toFixed(0)} KB)`);
