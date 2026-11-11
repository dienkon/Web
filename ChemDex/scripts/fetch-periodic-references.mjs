import fs from 'node:fs/promises';
import path from 'node:path';

// Reference HTML stays in the ignored cache. Only facts, provenance and hashes
// are published; illustrations from the RSC website are not republished.
const root = path.resolve(import.meta.dirname, '..');
const cache = path.join(root, '.cache/periodic-table-review/rsc');
await fs.mkdir(cache, { recursive: true });
const elements = JSON.parse(await fs.readFile(path.join(root, 'shared/elements.json'), 'utf8'));
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < elements.length) {
    const el = elements[next++];
    const name = ({ Cs: 'caesium', Al: 'aluminium' })[el.symbol] ?? el.name_en.toLowerCase();
    const url = `https://periodic-table.rsc.org/element/${el.z}/${name}`;
    const file = path.join(cache, `${String(el.z).padStart(3, '0')}.html`);
    try {
      let html;
      try { html = await fs.readFile(file, 'utf8'); }
      catch {
        const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
        await fs.writeFile(file, html);
      }
      if (!html.includes('Electron configuration')) throw new Error('Not an element fact page');
      results.push({ symbol: el.symbol, z: el.z, url, status: 'retrieved', bytes: Buffer.byteLength(html) });
    } catch (error) { results.push({ symbol: el.symbol, z: el.z, url, status: 'failed', error: error.message }); }
  }
}));
results.sort((a, b) => a.z - b.z);
await fs.writeFile(path.join(cache, 'retrieval.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ retrieved: results.filter(r => r.status === 'retrieved').length, failed: results.filter(r => r.status === 'failed') }));
