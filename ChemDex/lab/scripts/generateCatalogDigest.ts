/**
 * generateCatalogDigest.ts — Emits server/generated/catalog.digest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCatalogDigest } from '../src/vfx/catalog/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../server/generated');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetFile = path.join(targetDir, 'catalog.digest.json');
const digest = buildCatalogDigest();

fs.writeFileSync(targetFile, JSON.stringify(digest, null, 2), 'utf-8');
console.log(`[Catalog Digest] Generated ${digest.length} Effect Atoms at ${targetFile}`);
