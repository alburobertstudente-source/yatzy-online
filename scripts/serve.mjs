/**
 * Server minimale per lo sviluppo:  node scripts/serve.mjs [porta] [cartella]
 * Serve i file statici e le funzioni dell'API (cartella api/, come su Vercel).
 * I dati degli account finiscono in YATZY_DATA_DIR (predefinito: .data/).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const port = Number(process.argv[2]) || 5173;
const root = resolve(process.argv[3] || '.');
const apiDir = resolve('api');
process.env.YATZY_DATA_DIR ??= resolve('.data');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

async function api(req, res, path) {
  const name = path.slice(5).replace(/[^a-z]/g, '');
  let mod;
  try {
    mod = await import(pathToFileURL(join(apiDir, `${name}.js`)).href);
  } catch {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end('{"error":"API non trovata"}');
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks);
  const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body });
  const response = await mod.default.fetch(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.startsWith('/api/')) return await api(req, res, path);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) throw new Error('forbidden');
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
}).listen(port, () => console.log(`Yatzy su http://localhost:${port}/`));
