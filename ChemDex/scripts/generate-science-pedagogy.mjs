import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allScientists } from './data/scientists-data.mjs';
import { allCurriculumConcepts } from './data/concepts-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

console.log('Generating scientist biographies & GDPT curriculum concepts...');

// Validation
const scientistIds = new Set();
for (const s of allScientists) {
  if (!s.id || !s.name || !s.lifeStruggles || !s.experimentalBreakthroughs) {
    throw new Error(`Scientist record ${s.id || s.name} is missing required fields`);
  }
  if (scientistIds.has(s.id)) {
    throw new Error(`Duplicate scientist ID: ${s.id}`);
  }
  scientistIds.add(s.id);
  if (!Array.isArray(s.laboratoryApparatus) || s.laboratoryApparatus.length === 0) {
    throw new Error(`Scientist ${s.id} must have laboratoryApparatus`);
  }
  if (!s.discoveredOrRevolutionized || !Array.isArray(s.discoveredOrRevolutionized.elements)) {
    throw new Error(`Scientist ${s.id} must have discoveredOrRevolutionized with elements`);
  }
}

const conceptIds = new Set();
for (const c of allCurriculumConcepts) {
  if (!c.id || !c.topic || !c.detailedExplanation) {
    throw new Error(`Concept record ${c.id || c.title} is missing required fields`);
  }
  if (conceptIds.has(c.id)) {
    throw new Error(`Duplicate concept ID: ${c.id}`);
  }
  conceptIds.add(c.id);
  if (!Array.isArray(c.keyEquationsAndPhenomena) || c.keyEquationsAndPhenomena.length === 0) {
    throw new Error(`Concept ${c.id} must have keyEquationsAndPhenomena`);
  }
}

console.log(`Validated ${allScientists.length} scientists and ${allCurriculumConcepts.length} curriculum concepts.`);

// 1. Write JSON files
const scientistsJsonPath = path.join(rootDir, 'shared', 'chemistry', 'scientist-biographies.json');
const conceptsJsonPath = path.join(rootDir, 'shared', 'chemistry', 'curriculum-concepts.json');

fs.writeFileSync(scientistsJsonPath, JSON.stringify(allScientists, null, 2), 'utf8');
console.log(`Wrote ${scientistsJsonPath} (${(fs.statSync(scientistsJsonPath).size / 1024).toFixed(1)} KB)`);

fs.writeFileSync(conceptsJsonPath, JSON.stringify(allCurriculumConcepts, null, 2), 'utf8');
console.log(`Wrote ${conceptsJsonPath} (${(fs.statSync(conceptsJsonPath).size / 1024).toFixed(1)} KB)`);

// 2. Write helper JS modules
const scientistMjsContent = `// ES Module Helper for Scientist Biographies
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
`;

const scientistDtsContent = `export interface LaboratoryApparatus {
  name: string;
  description: string;
}

export interface DiscoveredOrRevolutionized {
  elements: string[];
  compounds: string[];
  concepts: string[];
}

export interface KeyEquation {
  equation: string;
  phases: Record<string, string>;
  conditions: string;
  observation: string;
  historicalNote: string;
}

export interface ScientistBiography {
  id: string;
  name: string;
  vietnameseName: string;
  lifeSpan: string;
  birthYear: number;
  deathYear: number;
  nationality: string;
  avatar: string;
  title: string;
  quote: string;
  lifeStruggles: string;
  personalLore: string;
  experimentalBreakthroughs: string;
  laboratoryApparatus: LaboratoryApparatus[];
  discoveredOrRevolutionized: DiscoveredOrRevolutionized;
  keyEquations: KeyEquation[];
  pedagogicalInsight: string;
  curriculumTags: string[];
}

export declare const scientistBiographies: ScientistBiography[];
export declare function getAllScientists(): ScientistBiography[];
export declare function getScientistById(id: string): ScientistBiography | undefined;
export declare function getScientistsByElement(symbol: string): ScientistBiography[];
export declare function getScientistsByCompound(formulaOrName: string): ScientistBiography[];
export declare function getScientistsByTag(tag: string): ScientistBiography[];
export declare function searchScientists(query: string): ScientistBiography[];
`;

fs.writeFileSync(path.join(rootDir, 'shared', 'chemistry', 'scientist-biographies.mjs'), scientistMjsContent, 'utf8');
fs.writeFileSync(path.join(rootDir, 'shared', 'chemistry', 'scientist-biographies.d.mts'), scientistDtsContent, 'utf8');
console.log('Wrote scientist-biographies.mjs and .d.mts');

// 3. Write curriculum concepts helper modules
const conceptsMjsContent = `// ES Module Helper for GDPT 2018 Curriculum Concepts
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
`;

const conceptsDtsContent = `export interface FundamentalPrinciple {
  name: string;
  formulation: string;
}

export interface ConceptEquation {
  equation: string;
  phases: Record<string, string>;
  conditions: string;
  observation: string;
  historicalNote: string;
}

export interface SelfTestQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface CurriculumConcept {
  id: string;
  topic: string;
  grade: string;
  title: string;
  curriculumUnits: string[];
  summary: string;
  detailedExplanation: string;
  fundamentalPrinciples: FundamentalPrinciple[];
  keyEquationsAndPhenomena: ConceptEquation[];
  commonMisconceptions: string[];
  relatedElements: string[];
  relatedCompounds: string[];
  selfTestQuestions: SelfTestQuestion[];
}

export declare const curriculumConcepts: CurriculumConcept[];
export declare function getAllConcepts(): CurriculumConcept[];
export declare function getConceptById(id: string): CurriculumConcept | undefined;
export declare function getConceptsByGrade(grade: string | number): CurriculumConcept[];
export declare function getConceptsByTopic(topic: string): CurriculumConcept[];
export declare function getConceptsForSubstance(symbolOrFormula: string): CurriculumConcept[];
export declare function searchConcepts(query: string): CurriculumConcept[];
`;

fs.writeFileSync(path.join(rootDir, 'shared', 'chemistry', 'curriculum-concepts.mjs'), conceptsMjsContent, 'utf8');
fs.writeFileSync(path.join(rootDir, 'shared', 'chemistry', 'curriculum-concepts.d.mts'), conceptsDtsContent, 'utf8');
console.log('Wrote curriculum-concepts.mjs and .d.mts');

console.log('Done generating science pedagogy modules!');
