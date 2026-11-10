/**
 * Crea dist/index.html: un UNICO file con JS, CSS e font incorporati.
 * Si può copiare sul telefono e aprire anche senza connessione.
 *   node scripts/build.mjs
 */
import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_FILES = ['base.css', 'game.css', 'effects.css', 'screens.css', 'cards.css', 'memes.css'].map((f) => join(ROOT, 'src/styles', f));

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

await mkdir(join(ROOT, 'dist'), { recursive: true });
await writeFile(join(ROOT, 'dist/index.html'), html);
console.log(`dist/index.html creato (${(html.length / 1024).toFixed(0)} KB)`);
