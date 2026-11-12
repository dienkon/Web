import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { readTopology, matchReference } from './lib/reference-geometry.mjs';

// Replay reviewed snapshots by default. A refresh verifies the remote bytes;
// changed pages must be reviewed before their source pins can be updated.
const selections = JSON.parse(fs.readFileSync('data/nist-geometry-selections.json', 'utf8'));
const refresh = process.argv.includes('--refresh');
const folder = 'docs/references/nist-geometries';
const compounds = JSON.parse(fs.readFileSync('shared/compounds.json', 'utf8'));
const browser = await chromium.launch();
const geometries = [];
try {
  const page = await browser.newPage();
  for (const selection of selections.entries) {
    const source = `https://cccbdb.nist.gov/expgeom2x.asp?casno=${selection.cas}&charge=0`;
    const file = path.join(folder, `${selection.cid}.html`);
    let bytes = fs.readFileSync(file);
    if (refresh) {
      const response = await fetch(source, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`NIST ${selection.cid}: HTTP ${response.status}; existing snapshots retained`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') !== selection.sourceSha256) throw new Error(`NIST ${selection.cid} changed; review the new source before updating its pin`);
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== selection.sourceSha256) throw new Error(`NIST snapshot hash mismatch ${selection.cid}`);
    const parsed = await page.evaluate(raw => {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const clean = node => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const tables = [...doc.querySelectorAll('table')].filter(t => !t.querySelector('table')).map(t => [...t.rows].map(tr => [...tr.cells].map(clean)));
      return {
        heading: clean(doc.querySelector('h1')),
        pointGroup: [...doc.querySelectorAll('h2')].map(clean).find(s => s.startsWith('Point Group '))?.replace('Point Group ', ''),
        cartesian: tables.filter(rows => rows[0]?.[0] === 'Atom' && rows[0]?.[1] === 'x (Å)'),
        internalCoordinates: tables.filter(rows => rows[0]?.[0] === 'Description' && rows[0]?.[1] === 'Value').flatMap(rows => rows.slice(2)),
        bondTypes: tables.filter(rows => rows[0]?.[0] === 'Bond Type').flatMap(rows => rows.slice(1)),
        references: tables.filter(rows => rows[0]?.[0] === 'squib').flatMap(rows => rows.slice(1)),
      };
    }, bytes.toString('utf8'));
    if (parsed.heading !== selection.heading || parsed.cartesian.length !== 1 || parsed.cartesian[0].length < 3 || !parsed.internalCoordinates.length || !parsed.bondTypes.length) throw new Error(`Incomplete or ambiguous source ${selection.cid}`);
    const atoms = parsed.cartesian[0].slice(1).map(row => {
      const match = row[0].match(/^([A-Z][a-z]?)\d+$/);
      if (!match || row.length !== 4 || row.slice(1).some(v => !v.trim() || !Number.isFinite(Number(v)))) throw new Error(`Invalid Cartesian row ${selection.cid}`);
      return { element: match[1], label: row[0], x: Number(row[1]), y: Number(row[2]), z: Number(row[3]) };
    });
    const usedReferences = new Set(parsed.internalCoordinates.map(row => row[6]));
    const references = parsed.references.filter(row => usedReferences.has(row[0]));
    if ([...usedReferences].some(id => !references.some(row => row[0] === id))) throw new Error(`Unresolved geometry reference ${selection.cid}`);
    const geometry = {
      cid: selection.cid, cas: selection.cas, formula: selection.formula,
      source, provenance: 'NIST CCCBDB SRD 101, experimental gas-phase reference geometry',
      retrievedAt: selections.retrievedAt, sourceSha256: sha256, snapshot: file,
      heading: parsed.heading, pointGroup: parsed.pointGroup, phase: 'gas',
      coordinateUnit: 'angstrom', topologySha256: selection.topologySha256,
      geometryNote: 'Tọa độ tham chiếu pha khí do NIST tổng hợp; một hình học tĩnh, có làm tròn và ràng buộc đối xứng theo nguồn. Không dùng thay cấu trúc tinh thể hay khẳng định độ chính xác tuyệt đối.',
      atoms, internalCoordinates: parsed.internalCoordinates, bondTypes: parsed.bondTypes,
      references: references.map(([id, citation, doi]) => ({ id, citation, ...(doi ? { doi } : {}) })),
    };
    const record = compounds.find(c => c.cid === selection.cid);
    if (!record || record.formula !== selection.formula) throw new Error(`Selected compound identity changed ${selection.cid}`);
    matchReference(readTopology(fs.readFileSync(`shared/structures/${selection.cid}.sdf`, 'utf8')), geometry);
    geometries.push(geometry);
  }
} finally { await browser.close(); }
fs.writeFileSync('shared/nist-geometries.json', JSON.stringify(geometries, null, 2) + '\n');
console.log(`Validated ${geometries.length} pinned NIST reference geometries (${refresh ? 'remote verified' : 'offline replay'})`);
