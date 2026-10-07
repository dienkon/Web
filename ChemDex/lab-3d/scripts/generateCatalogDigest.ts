/**
 * generateCatalogDigest.ts — Emits server/generated/catalog.digest.json (§2.5, §7.3)
 * 
 * Validates that catalog contains >= 110 distinct atoms and that every atom
 * implements summary_en, useWhen, avoidWhen, >= 2 gallery presets, and >= 1 test.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCatalogDigest, ALL_EFFECT_ATOMS } from '../src/vfx/catalog/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../server/generated');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetFile = path.join(targetDir, 'catalog.digest.json');

// Acceptance Check (§4 count check)
const count = ALL_EFFECT_ATOMS.length;
console.log(`[Catalog Validation] Checking ${count} Effect Atoms...`);

if (count < 110) {
  console.error(`[ERROR] Catalog contains only ${count} atoms. Minimum required is 110 atoms!`);
  process.exit(1);
}

// Validate each atom's contract
const seenNames = new Set<string>();
for (const atom of ALL_EFFECT_ATOMS) {
  if (seenNames.has(atom.name)) {
    console.error(`[ERROR] Duplicate atom name found: "${atom.name}"`);
    process.exit(1);
  }
  seenNames.add(atom.name);

  if (!atom.summary_en || atom.summary_en.length < 5) {
    console.error(`[ERROR] Atom "${atom.name}" missing summary_en`);
    process.exit(1);
  }
  if (!atom.useWhen || atom.useWhen.length === 0) {
    console.error(`[ERROR] Atom "${atom.name}" missing useWhen triggers`);
    process.exit(1);
  }
  if (!atom.avoidWhen || atom.avoidWhen.length === 0) {
    console.error(`[ERROR] Atom "${atom.name}" missing avoidWhen triggers`);
    process.exit(1);
  }
  if (!atom.gallery || atom.gallery.length < 2) {
    console.error(`[ERROR] Atom "${atom.name}" must have at least 2 gallery presets (found ${atom.gallery?.length || 0})`);
    process.exit(1);
  }
  if (!atom.tests || atom.tests.length < 1) {
    console.error(`[ERROR] Atom "${atom.name}" must reference at least 1 unit test`);
    process.exit(1);
  }
}

const digest = buildCatalogDigest();
fs.writeFileSync(targetFile, JSON.stringify(digest, null, 2), 'utf-8');
console.log(`[Catalog Digest] SUCCESS: Generated ${digest.length} Effect Atoms at ${targetFile}`);
