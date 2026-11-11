/**
 * Archivio dei dati degli account.
 * - Su Vercel: Vercel Blob privato (BLOB_READ_WRITE_TOKEN creato collegando lo store al progetto)
 * - In locale / nei test: file JSON in YATZY_DATA_DIR, altrimenti memoria.
 */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

function blobStore() {
  let sdk;
  const load = async () => (sdk ??= await import('@vercel/blob'));
  return {
    kind: 'blob',
    async read(key, { fresh = true } = {}) {
      const { get } = await load();
      let res;
      try {
        res = await get(key, { access: 'private', useCache: !fresh });
      } catch (e) {
        if (e?.name === 'BlobNotFoundError') return null;
        throw e;
      }
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      return JSON.parse(await new Response(res.stream).text());
    },
    async write(key, value) {
      const { put } = await load();
      await put(key, JSON.stringify(value), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
    },
    async keys(prefix) {
      const { list } = await load();
      const out = [];
      let cursor;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        out.push(...page.blobs.map((b) => b.pathname));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
  };
}

function fileStore(dir) {
  const path = (key) => join(dir, key);
  return {
    kind: 'file',
    async read(key) {
      try {
        return JSON.parse(await readFile(path(key), 'utf8'));
      } catch {
        return null;
      }
    },
    async write(key, value) {
      await mkdir(dirname(path(key)), { recursive: true });
      await writeFile(path(key), JSON.stringify(value));
    },
    async keys(prefix) {
      const sub = dirname(prefix + 'x');
      try {
        return (await readdir(join(dir, sub))).map((f) => `${sub}/${f}`).filter((k) => k.startsWith(prefix));
      } catch {
        return [];
      }
    },
  };
}

function memoryStore() {
  const m = new Map();
  return {
    kind: 'memory',
    async read(key) {
      return m.has(key) ? JSON.parse(m.get(key)) : null;
    },
    async write(key, value) {
      m.set(key, JSON.stringify(value));
    },
    async keys(prefix) {
      return [...m.keys()].filter((k) => k.startsWith(prefix));
    },
  };
}

let store = null;
export function getStore() {
  if (store) return store;
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) store = blobStore();
  else if (process.env.YATZY_DATA_DIR) store = fileStore(process.env.YATZY_DATA_DIR);
  else store = memoryStore();
  return store;
}
