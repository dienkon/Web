// ES Module Helper for GDPT 2018 Curriculum Concepts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, 'curriculum-concepts.json');

export const curriculumConcepts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const byId = new Map(curriculumConcepts.map((c) => [c.id, c]));

export function getAllConcepts() {
  return curriculumConcepts;
}

export function getConceptById(id) {
  if (!id) return undefined;
  return byId.get(String(id).toLowerCase().trim());
}

export function getConceptsByGrade(grade) {
  if (!grade) return [];
  const gStr = String(grade).toLowerCase().trim();
  return curriculumConcepts.filter((c) =>
    c.grade.toLowerCase().includes(gStr) ||
    c.curriculumUnits?.some((u) => u.toLowerCase().includes(gStr))
  );
}

export function getConceptsByTopic(topic) {
  if (!topic) return [];
  const tStr = String(topic).toLowerCase().trim();
  return curriculumConcepts.filter((c) =>
    c.topic.toLowerCase().includes(tStr) ||
    c.title.toLowerCase().includes(tStr)
  );
}

export function getConceptsForSubstance(symbolOrFormula) {
  if (!symbolOrFormula) return [];
  const target = String(symbolOrFormula).trim().toLowerCase();
  return curriculumConcepts.filter((c) => {
    return (
      c.relatedElements?.some((el) => el.toLowerCase() === target) ||
      c.relatedCompounds?.some((cp) => cp.toLowerCase() === target || cp.toLowerCase().includes(target)) ||
      c.keyEquationsAndPhenomena?.some((eq) => eq.equation.toLowerCase().includes(target))
    );
  });
}

export function searchConcepts(query) {
  if (!query) return [];
  const q = String(query).toLowerCase().trim();
  return curriculumConcepts.filter((c) => {
    return (
      c.title.toLowerCase().includes(q) ||
      c.topic.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.detailedExplanation.toLowerCase().includes(q) ||
      c.fundamentalPrinciples?.some((p) => p.name.toLowerCase().includes(q) || p.formulation.toLowerCase().includes(q)) ||
      c.keyEquationsAndPhenomena?.some((eq) => eq.equation.toLowerCase().includes(q) || eq.observation.toLowerCase().includes(q)) ||
      c.commonMisconceptions?.some((m) => m.toLowerCase().includes(q))
    );
  });
}
