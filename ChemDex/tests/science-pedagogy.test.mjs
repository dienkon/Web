import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getAllScientists,
  getScientistById,
  getScientistsByElement,
  getScientistsByCompound,
  getScientistsByTag,
  searchScientists,
} from '../shared/chemistry/scientist-biographies.mjs';
import {
  getAllConcepts,
  getConceptById,
  getConceptsByGrade,
  getConceptsByTopic,
  getConceptsForSubstance,
  searchConcepts,
} from '../shared/chemistry/curriculum-concepts.mjs';

test('scientist-biographies.json is valid and covers all major chemical pioneers', () => {
  const data = JSON.parse(fs.readFileSync('shared/chemistry/scientist-biographies.json', 'utf8'));
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 20, `Expected at least 20 scientists, got ${data.length}`);

  const requiredScientists = [
    'henry-cavendish',
    'antoine-lavoisier',
    'joseph-priestley',
    'carl-wilhelm-scheele',
    'humphry-davy',
    'dmitri-mendeleev',
    'marie-curie',
    'pierre-curie',
    'william-ramsay',
    'john-dalton',
    'amedeo-avogadro',
    'jons-jacob-berzelius',
    'robert-bunsen',
    'gustav-kirchhoff',
    'fritz-haber',
    'carl-bosch',
    'gilbert-lewis',
    'linus-pauling',
  ];

  const foundIds = new Set(data.map((s) => s.id));
  for (const id of requiredScientists) {
    assert.ok(foundIds.has(id), `Missing required pioneer: ${id}`);
  }

  for (const s of data) {
    assert.ok(s.id, 'scientist must have id');
    assert.ok(s.name, `scientist ${s.id} must have name`);
    assert.ok(s.vietnameseName, `scientist ${s.id} must have vietnameseName`);
    assert.ok(s.lifeSpan, `scientist ${s.id} must have lifeSpan`);
    assert.ok(typeof s.birthYear === 'number');
    assert.ok(typeof s.deathYear === 'number');
    assert.ok(s.nationality);
    assert.ok(s.title);
    assert.ok(s.quote);
    assert.ok(s.lifeStruggles && s.lifeStruggles.length >= 100, `${s.id} lifeStruggles must be extensive`);
    assert.ok(s.personalLore && s.personalLore.length >= 100, `${s.id} personalLore must be rich`);
    assert.ok(s.experimentalBreakthroughs && s.experimentalBreakthroughs.length >= 200, `${s.id} breakthroughs must be detailed`);
    assert.ok(Array.isArray(s.laboratoryApparatus) && s.laboratoryApparatus.length >= 1, `${s.id} must have apparatus`);
    for (const app of s.laboratoryApparatus) {
      assert.ok(app.name && app.description);
    }
    assert.ok(s.discoveredOrRevolutionized);
    assert.ok(Array.isArray(s.discoveredOrRevolutionized.elements));
    assert.ok(Array.isArray(s.discoveredOrRevolutionized.compounds));
    assert.ok(Array.isArray(s.discoveredOrRevolutionized.concepts));
    assert.ok(Array.isArray(s.keyEquations) && s.keyEquations.length >= 1);
    for (const eq of s.keyEquations) {
      assert.ok(eq.equation);
      assert.ok(eq.observation);
      assert.ok(eq.historicalNote);
    }
    assert.ok(s.pedagogicalInsight);
    assert.ok(Array.isArray(s.curriculumTags) && s.curriculumTags.length >= 1);
  }
});

test('scientist-biographies.mjs helper functions work reliably', () => {
  const all = getAllScientists();
  assert.equal(all.length, 25);

  const lavoisier = getScientistById('antoine-lavoisier');
  assert.ok(lavoisier);
  assert.equal(lavoisier.name, 'Antoine-Laurent de Lavoisier');

  const hDiscoverers = getScientistsByElement('H');
  assert.ok(hDiscoverers.some((s) => s.id === 'henry-cavendish'));

  const nh3Scientists = getScientistsByCompound('NH3');
  assert.ok(nh3Scientists.some((s) => s.id === 'fritz-haber'));
  assert.ok(nh3Scientists.some((s) => s.id === 'joseph-priestley'));

  const periodicTableScientists = getScientistsByTag('Bảng tuần hoàn');
  assert.ok(periodicTableScientists.some((s) => s.id === 'dmitri-mendeleev'));

  const apparatusSearch = searchScientists('eudiometer');
  assert.ok(apparatusSearch.some((s) => s.id === 'henry-cavendish'));

  const nameSearch = searchScientists('Curie');
  assert.ok(nameSearch.some((s) => s.id === 'marie-curie'));
  assert.ok(nameSearch.some((s) => s.id === 'pierre-curie'));
});

test('curriculum-concepts.json adheres to Vietnam GDPT 2018 standards and is comprehensive', () => {
  const data = JSON.parse(fs.readFileSync('shared/chemistry/curriculum-concepts.json', 'utf8'));
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 7, `Expected at least 7 core curriculum concepts, got ${data.length}`);

  const requiredConceptIds = [
    'atomic-structure-and-orbitals',
    'periodic-law-and-trends',
    'chemical-bonding-and-intermolecular-forces',
    'thermochemistry-enthalpy',
    'chemical-kinetics-reaction-rate',
    'chemical-equilibrium-le-chatelier',
    'solutions-and-acid-base-hydrolysis',
    'organic-chemistry-mechanisms-and-reactions',
  ];

  const foundIds = new Set(data.map((c) => c.id));
  for (const id of requiredConceptIds) {
    assert.ok(foundIds.has(id), `Missing required curriculum concept: ${id}`);
  }

  for (const c of data) {
    assert.ok(c.id);
    assert.ok(c.topic);
    assert.ok(c.grade);
    assert.ok(c.title);
    assert.ok(Array.isArray(c.curriculumUnits) && c.curriculumUnits.length >= 1);
    assert.ok(c.summary && c.summary.length >= 50);
    assert.ok(c.detailedExplanation && c.detailedExplanation.length >= 500);
    assert.ok(Array.isArray(c.fundamentalPrinciples) && c.fundamentalPrinciples.length >= 1);
    assert.ok(Array.isArray(c.keyEquationsAndPhenomena) && c.keyEquationsAndPhenomena.length >= 2);
    for (const eq of c.keyEquationsAndPhenomena) {
      assert.ok(eq.equation);
      assert.ok(eq.observation);
      assert.ok(eq.phases && Object.keys(eq.phases).length > 0);
    }
    assert.ok(Array.isArray(c.commonMisconceptions) && c.commonMisconceptions.length >= 1);
    assert.ok(Array.isArray(c.relatedElements) && c.relatedElements.length >= 1);
    assert.ok(Array.isArray(c.relatedCompounds) && c.relatedCompounds.length >= 1);
    assert.ok(Array.isArray(c.selfTestQuestions) && c.selfTestQuestions.length >= 2);
    for (const q of c.selfTestQuestions) {
      assert.ok(q.question);
      assert.ok(Array.isArray(q.options) && q.options.length === 4);
      assert.ok(typeof q.answer === 'number' && q.answer >= 0 && q.answer <= 3);
      assert.ok(q.explanation && q.explanation.length >= 20);
    }
  }
});

test('curriculum-concepts.mjs helper functions work reliably', () => {
  const all = getAllConcepts();
  assert.equal(all.length, 8);

  const atomic = getConceptById('atomic-structure-and-orbitals');
  assert.ok(atomic);
  assert.ok(atomic.detailedExplanation.includes('Aufbau'));
  assert.ok(atomic.detailedExplanation.includes('Pauli'));
  assert.ok(atomic.detailedExplanation.includes('Hund'));

  const grade10Concepts = getConceptsByGrade('10');
  assert.ok(grade10Concepts.length >= 4);

  const equilibriumConcepts = getConceptsByTopic('Cân bằng');
  assert.ok(equilibriumConcepts.some((c) => c.id === 'chemical-equilibrium-le-chatelier'));

  const waterConcepts = getConceptsForSubstance('H2O');
  assert.ok(waterConcepts.length >= 3);

  const markovnikovSearch = searchConcepts('Markovnikov');
  assert.ok(markovnikovSearch.some((c) => c.id === 'organic-chemistry-mechanisms-and-reactions'));

  const leChatelierSearch = searchConcepts('Le Chatelier');
  assert.ok(leChatelierSearch.some((c) => c.id === 'chemical-equilibrium-le-chatelier'));
});
