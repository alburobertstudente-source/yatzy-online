/**
 * Unisce gli elenchi dei suoni registrati (audio/<gruppo>/index.json) in
 * audio/manifest.json e i crediti in audio/CREDITS.json + audio/CREDITS.md.
 * Controlla che ogni file citato esista.
 *   node scripts/audio-manifest.mjs
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(ROOT, 'audio');
const GROUPS = ['sfx', 'voices', 'music', 'amb'];

const readJson = async (p, fallback) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
};

const manifest = {};
const credits = [];
for (const g of GROUPS) {
  manifest[g] = await readJson(join(AUDIO, g, 'index.json'), {});
  for (const c of await readJson(join(AUDIO, g, 'CREDITS.json'), [])) credits.push({ group: g, ...c });
}

// tutti i percorsi citati (stringhe che finiscono in .mp3)
const files = new Set();
(function walk(v) {
  if (typeof v === 'string' && v.endsWith('.mp3')) files.add(v);
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
})(manifest);
const missing = [];
for (const f of files) {
  try {
    await access(join(AUDIO, f));
  } catch {
    missing.push(f);
  }
}
if (missing.length) console.warn(`Attenzione, file audio mancanti (verranno ignorati dal gioco):\n  ${missing.join('\n  ')}`);

await writeFile(join(AUDIO, 'manifest.json'), JSON.stringify(manifest));
await writeFile(join(AUDIO, 'CREDITS.json'), `${JSON.stringify(credits, null, 2)}\n`);

const label = { sfx: 'Effetti', voices: 'Dadi e carte', music: 'Musica', amb: 'Ambienti' };
let md = '# Crediti audio\n\nTutti i suoni del gioco sono registrazioni o brani con licenza libera (CC0, pubblico dominio o Creative Commons Attribuzione). Grazie agli autori!\n';
for (const g of GROUPS) {
  const list = credits.filter((c) => c.group === g);
  if (!list.length) continue;
  md += `\n## ${label[g]}\n\n| File | Titolo | Autore | Licenza | Fonte |\n|---|---|---|---|---|\n`;
  for (const c of list) {
    const lic = c.licenseUrl ? `[${c.license}](${c.licenseUrl})` : c.license || '';
    const src = [c.source, c.via].filter(Boolean).map((u) => `<${u}>`).join(' via ');
    md += `| ${c.file || ''} | ${c.title || ''} | ${c.author || ''} | ${lic} | ${src} |\n`;
  }
}
await writeFile(join(AUDIO, 'CREDITS.md'), md);
console.log(`audio/manifest.json: ${files.size} file (${GROUPS.map((g) => `${g} ${Object.keys(manifest[g]).length}`).join(', ')}), ${credits.length} crediti`);
