// ES Module Helper for Scientist Biographies
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, 'scientist-biographies.json');

export const scientistBiographies = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const byId = new Map(scientistBiographies.map((s) => [s.id, s]));

export function getAllScientists() {
  return scientistBiographies;
}

export function getScientistById(id) {
  if (!id) return undefined;
  return byId.get(String(id).toLowerCase().trim());
}

export function getScientistsByElement(symbol) {
  if (!symbol) return [];
  const cleanSym = String(symbol).trim();
  return scientistBiographies.filter((s) =>
    s.discoveredOrRevolutionized?.elements?.some(
      (el) => el.toLowerCase() === cleanSym.toLowerCase() || el.startsWith(cleanSym)
    )
  );
}

export function getScientistsByCompound(formulaOrName) {
  if (!formulaOrName) return [];
  const target = String(formulaOrName).toLowerCase().trim();
  return scientistBiographies.filter((s) =>
    s.discoveredOrRevolutionized?.compounds?.some((c) =>
      c.toLowerCase().includes(target)
    )
  );
}

export function getScientistsByTag(tag) {
  if (!tag) return [];
  const target = String(tag).toLowerCase().trim();
  return scientistBiographies.filter((s) =>
    s.curriculumTags?.some((t) => t.toLowerCase().includes(target))
  );
}

export function searchScientists(query) {
  if (!query) return [];
  const q = String(query).toLowerCase().trim();
  return scientistBiographies.filter((s) => {
    return (
      s.name.toLowerCase().includes(q) ||
      s.vietnameseName.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.lifeStruggles.toLowerCase().includes(q) ||
      s.experimentalBreakthroughs.toLowerCase().includes(q) ||
      s.discoveredOrRevolutionized?.elements?.some((el) => el.toLowerCase().includes(q)) ||
      s.discoveredOrRevolutionized?.compounds?.some((cp) => cp.toLowerCase().includes(q)) ||
      s.discoveredOrRevolutionized?.concepts?.some((cp) => cp.toLowerCase().includes(q)) ||
      s.laboratoryApparatus?.some((app) => app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q))
    );
  });
}
