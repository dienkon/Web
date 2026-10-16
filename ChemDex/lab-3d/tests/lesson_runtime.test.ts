import { describe, expect, it } from 'vitest';
import { LESSON_DEFINITIONS, requireLessonDefinition } from '../src/lesson/catalog';
import { getLessonSpecies } from '../src/lesson/catalog/species';
import { advanceLessonSession, applyLessonAction, createLessonSession, LessonRuntime } from '../src/lesson/runtime';
import type { LessonDefinition, LessonSession } from '../src/lesson/types';
import { auditLessonMass } from '../src/lesson/chemistry/inventory';
import { parseLessonFormula } from '../src/lesson/chemistry/formula';
import { conditionControlValue } from '../src/lesson/chemistry/conditions';
import { diagnoseLesson, idealLessonGasVolume } from '../src/lesson/diagnostics';
import { createLessonReport } from '../src/lesson/report';
import { LessonHistory } from '../src/lesson/history';
import { lessonParticleBudget } from '../src/lesson/chemistry/optics';

function prepare(definition: LessonDefinition, excess: Record<string, number> = {}) {
  const session = createLessonSession(definition, 'test_session', 'lesson_vessel_test', 0.001, excess);
  for (const condition of definition.conditions) {
    const value = conditionControlValue(condition);
    switch (condition.kind) {
      case 'pressure': applyLessonAction(session, definition, { type: 'pressure', value: Number(value) }); break;
      case 'mixed': applyLessonAction(session, definition, { type: 'mix' }); break;
      case 'temperature':
        applyLessonAction(session, definition, { type: 'temperature', value: Number(value) });
        session.environment.temperature_c = Number(value);
        break;
      case 'acidic':
      case 'alkaline': applyLessonAction(session, definition, { type: 'pH', value: Number(value) }); break;
      case 'catalyst': applyLessonAction(session, definition, { type: 'catalyst', id: String(value), active: true }); break;
      case 'enzyme': applyLessonAction(session, definition, { type: 'enzyme', id: String(value), active: true }); break;
      case 'industrial': applyLessonAction(session, definition, { type: 'industrial', active: true }); break;
      case 'ignition': applyLessonAction(session, definition, { type: 'ignition', active: true }); break;
      case 'oxygen': applyLessonAction(session, definition, { type: 'oxygen', active: true }); break;
    }
  }
  return session;
}

function finish(definition: LessonDefinition, session: LessonSession) {
  for (let step = 0; step < 12000 && !['complete', 'stopped'].includes(session.status); step++) {
    advanceLessonSession(definition, session, 1 / 60);
  }
}

describe('Condition-controlled curriculum simulations', () => {
  it.each(LESSON_DEFINITIONS.map(definition => [definition.id, definition] as const))('%s completes with conserved mass and elements', (_, definition) => {
    const session = prepare(definition);
    finish(definition, session);
    expect(session.status, JSON.stringify(session.conditionResults)).toBe('complete');
    expect(auditLessonMass(session.inventory, session.initialMass_g, getLessonSpecies).conserved).toBe(true);
    expect(diagnoseLesson(definition, session).allElementsConserved).toBe(true);
    expect(session.physicalProgress).toBeCloseTo(definition.reversible?.targetConversion ?? 1, 6);
    expect(session.reachedCheckpoints.length).toBe(4);
    expect(session.inventory.every(item => item.amount_mol >= 0)).toBe(true);
    expect(session.visuals.flame).toBe(0);
    expect(session.visuals.gasRate_mol_s).toBe(0);
  });

  it.each(LESSON_DEFINITIONS.map(definition => [definition.id, definition] as const))('%s stays unchanged before contact', (_, definition) => {
    const session = createLessonSession(definition, 'untouched', 'lesson_vessel_untouched');
    const original = JSON.stringify(session.inventory);
    for (let index = 0; index < 60; index++) advanceLessonSession(definition, session, 1 / 60);
    expect(JSON.stringify(session.inventory)).toBe(original);
    expect(session.extent_mol).toBe(0);
    expect(session.visuals.gasRate_mol_s).toBe(0);
  });

  it('requires ignition and stops generating flame when paused', () => {
    const definition = requireLessonDefinition('methane_combustion');
    const session = prepare(definition);
    applyLessonAction(session, definition, { type: 'ignition', active: false });
    advanceLessonSession(definition, session, 0.1);
    expect(session.extent_mol).toBe(0);
    applyLessonAction(session, definition, { type: 'ignition', active: true });
    advanceLessonSession(definition, session, 0.1);
    expect(session.visuals.flame).toBeGreaterThan(0);
    applyLessonAction(session, definition, { type: 'pause' });
    const extent = session.extent_mol;
    advanceLessonSession(definition, session, 0.1);
    expect(session.extent_mol).toBe(extent);
    expect(session.visuals.flame).toBe(0);
  });

  it('preserves excess bromine color after ethene is depleted', () => {
    const definition = requireLessonDefinition('ethene_bromine');
    const session = prepare(definition, { ethene: 0.5 });
    finish(definition, session);
    const bromine = session.inventory.find(item => item.species === 'bromine_water');
    expect(bromine?.amount_mol).toBeCloseTo(0.0005, 9);
    expect(session.visuals.color).not.toBe(definition.finalColor);
    expect(session.physicalProgress).toBeCloseTo(1);
  });

  it('keeps glucose and fructose separate despite identical molecular formulas', () => {
    const definition = requireLessonDefinition('sucrose_hydrolysis');
    const session = prepare(definition);
    finish(definition, session);
    const glucose = session.inventory.find(item => item.species === 'glucose');
    const fructose = session.inventory.find(item => item.species === 'fructose');
    expect(glucose?.amount_mol).toBeCloseTo(0.001, 8);
    expect(fructose?.amount_mol).toBeCloseTo(0.001, 8);
    expect(getLessonSpecies('glucose').formula).toBe(getLessonSpecies('fructose').formula);
  });

  it('models starch by repeat unit and rejects symbolic formulas', () => {
    expect(getLessonSpecies('starch_unit').amountBasis).toBe('repeat_unit');
    expect(parseLessonFormula('C6H10O5')).toEqual({ C: 6, H: 10, O: 5 });
    expect(() => parseLessonFormula('(C6H10O5)n')).toThrow();
  });

  it('stops a missing-reagent sample with a useful warning', () => {
    const definition = requireLessonDefinition('ethene_bromine');
    const session = createLessonSession(definition, 'missing', 'lesson_vessel_missing', 0.001, { ethene: 0 });
    applyLessonAction(session, definition, { type: 'mix' });
    expect(session.status).toBe('stopped');
    expect(session.extent_mol).toBe(0);
    expect(diagnoseLesson(definition, session).messages.some(message => message.includes('Chưa có đủ'))).toBe(true);
  });

  it('keeps reports immutable while the source session advances', () => {
    const definition = requireLessonDefinition('acetic_carbonate');
    const session = prepare(definition);
    const report = createLessonReport(session);
    const snapshot = JSON.stringify(report);
    advanceLessonSession(definition, session, 0.1);
    expect(JSON.stringify(report)).toBe(snapshot);
  });

  it('bounds concurrent sessions and catch-up work after a long frame', () => {
    const runtime = new LessonRuntime();
    for (let index = 0; index < 4; index++) runtime.create('acetic_carbonate', `lesson_vessel_${index}`);
    expect(() => runtime.create('acetic_carbonate', 'lesson_vessel_5')).toThrow();
    runtime.update(600, false, 5);
    expect(runtime.list().every(session => session.elapsed_s <= 8 / 60 + 1e-9)).toBe(true);
    const before = runtime.list()[0].elapsed_s;
    runtime.update(1, true);
    expect(runtime.list()[0].elapsed_s).toBe(before);
  });

  it('uses the ideal-gas unit conversion correctly', () => {
    expect(idealLessonGasVolume(0.001)).toBeCloseTo(24.4654, 3);
    expect(idealLessonGasVolume(0.001, 25, 2)).toBeCloseTo(12.2327, 3);
    expect(idealLessonGasVolume(1, -273.15)).toBeNull();
    expect(idealLessonGasVolume(-1)).toBeNull();
  });

  it('bounds plot history and particle count for prolonged sessions', () => {
    const history = new LessonHistory(3);
    for (let time = 0; time < 10; time++) history.push({ time, progress: time, temperature: 25, rate: 1, massError: 0, escapedMass: 0 });
    expect(history.list().map(sample => sample.time)).toEqual([7, 8, 9]);
    expect(history.csv().split('\n').length).toBe(5);
    expect(lessonParticleBudget(100, 100, 64)).toBe(64);
    expect(lessonParticleBudget(0, 1, 64)).toBe(0);
  });
});
