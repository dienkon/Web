import { describe, expect, it } from 'vitest';
import { partitionLeadIodide } from '../src/engine/leadIodidePhase';
import { transferSolidPhase } from '../src/engine/solidPhaseTransfer';
import { precipitateCohorts, precipitateComponents } from '../src/science/precipitateInventory';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { currentMixedPrecipitateTurbidity } from '../src/simulation/render/precipitateTurbidity';
import { mobileSolidInventory } from '../src/science/suspensionTransport';
import { withdrawAliquot, mergeLiquidDose } from '../src/handling/aliquot';
import { reconcileSpillSuspension, mergeSpillSuspensions, stepSpillSuspension } from '../src/science/spillSuspension';
import type { SubstanceContent, VesselState, SpillState } from '../src/types/chemistry';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { getProgramById } from '../src/vfx/programs/library';

const MW = 461.01;
const fine = (mass_g: number): SubstanceContent => ({ formula: 'PbI2', phase: 's', solidOrigin: 'precipitate',
  precipitateFormation: 'FINE_POWDER', mass_g, moles: mass_g / MW });
const plate = (mass_g: number): SubstanceContent => ({ ...fine(mass_g), precipitateFormation: 'CRYSTAL_PLATE' });
const water: SubstanceContent = { formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 };
const sample = (solids: SubstanceContent[] = [fine(0.2)]): VesselState => ({ id: 'formation-cycle', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, capacity_ml: 250, volume_ml: 100, volume: 0.4,
  temperature_c: 25, mass_g: 100 + solids.reduce((s, c) => s + c.mass_g, 0),
  contents: [{ ...water }, ...solids], substances: ['H2O', 'PbI2'], ph: 7, isLocked: false,
  hasPrecipitate: true, precipitateAmount_g: solids.reduce((s, c) => s + c.mass_g, 0),
  precipitateSubstance: 'PbI2', precipitateMorphology: 'FINE_POWDER' } as VesselState);
const solid = (v: VesselState, formation: string) => v.contents.filter(c => c.phase === 's' && c.precipitateFormation === formation)
  .reduce((s, c) => s + c.mass_g, 0);
const advance = (m: VesselSimulationManager, v: VesselState, dt = 0.1) => m.step(v, dt, { thermalStateAuthoritative: true });
const phase = (v: VesselState, dt = 0.1): VesselState => ({ ...v, ...partitionLeadIodide(v, dt) });

describe('Precipitate formation histories in one chemical species', () => {
  it.each(['program', 'native'] as const)('keeps existing plates separate from newly precipitated powder through the %s resolver', mode => {
    const v = sample([plate(0.0001 * computeMolarMass('PbI2'))]);
    for (const [formula, moles] of [['Pb(NO3)2', 0.001], ['KI', 0.002]] as const)
      v.contents.push({ formula, phase: 'aq', moles, mass_g: moles * computeMolarMass(formula) });
    v.substances = [...new Set(v.contents.map(row => row.formula))];
    v.mass_g = v.contents.reduce((sum, row) => sum + row.mass_g, 0);
    const contents = mode === 'program' ? applyProgramToLedger(getProgramById('pbno32_ki')!, v, 1, { deferThermal: true }).contents!
      : executeMultiStepReactions(v.contents, v.substances, v.volume_ml, 25, false, 'vi', { vesselContact: v }).updatedContents;
    const cohorts = precipitateCohorts(contents);
    expect(cohorts).toHaveLength(2);
    expect(cohorts.find(cohort => cohort.key === 'PbI2|CRYSTAL_PLATE')!.mass_g).toBeCloseTo(0.0001 * computeMolarMass('PbI2'), 12);
    expect(cohorts.find(cohort => cohort.key === 'PbI2')!.mass_g).toBeCloseTo(0.001 * computeMolarMass('PbI2'), 12);
    expect(contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(v.mass_g, 10);
  });

  it.each([['program', true], ['native', true], ['program', false], ['native', false]] as const)
  ('preserves the legacy plate label before fresh powder is added through %s with origin tag %s', (mode, tagged) => {
    const mass = 0.0001 * computeMolarMass('PbI2');
    const v = sample([{ ...plate(mass), precipitateFormation: undefined, solidOrigin: tagged ? 'precipitate' : undefined }]);
    v.precipitateMorphology = 'CRYSTAL_PLATE';
    for (const [formula, moles] of [['Pb(NO3)2', 0.001], ['KI', 0.002]] as const)
      v.contents.push({ formula, phase: 'aq', moles, mass_g: moles * computeMolarMass(formula) });
    v.substances = [...new Set(v.contents.map(row => row.formula))];
    v.mass_g = v.contents.reduce((sum, row) => sum + row.mass_g, 0);
    expect(precipitateCohorts(v.contents, v.precipitateSubstance, v.precipitateMorphology)[0].key).toBe('PbI2|CRYSTAL_PLATE');
    const contents = mode === 'program' ? applyProgramToLedger(getProgramById('pbno32_ki')!, v, 1, { deferThermal: true }).contents!
      : executeMultiStepReactions(v.contents, v.substances, v.volume_ml, 25, false, 'vi', { vesselContact: v }).updatedContents;
    const cohorts = precipitateCohorts(contents, v.precipitateSubstance, v.precipitateMorphology);
    expect(cohorts).toHaveLength(2);
    expect(cohorts.find(cohort => cohort.key === 'PbI2|CRYSTAL_PLATE')!.mass_g).toBeCloseTo(mass, 12);
    expect(cohorts.find(cohort => cohort.key === 'PbI2')!.mass_g).toBeCloseTo(0.001 * computeMolarMass('PbI2'), 12);
    expect(contents.find(row => row.phase === 's' && row.precipitateFormation === 'FINE_POWDER')).toBeDefined();
    expect(contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(v.mass_g, 10);
    expect(v.contents.find(row => row.formula === 'PbI2')!.precipitateFormation).toBeUndefined();
  });

  it('new native powder cannot inherit a stale crystal label after the former plates are gone', () => {
    const v = { ...sample([]), precipitateMorphology: 'CRYSTAL_PLATE' } as VesselState;
    for (const [formula, moles] of [['Pb(NO3)2', 0.001], ['KI', 0.002]] as const)
      v.contents.push({ formula, phase: 'aq', moles, mass_g: moles * computeMolarMass(formula) });
    v.substances = v.contents.map(row => row.formula);
    const contents = executeMultiStepReactions(v.contents, v.substances, v.volume_ml, 25, false, 'vi', { vesselContact: v }).updatedContents;
    const cohorts = precipitateCohorts(contents, v.precipitateSubstance, v.precipitateMorphology);
    expect(cohorts.map(cohort => cohort.key)).toEqual(['PbI2']);
    expect(cohorts[0].mass_g).toBeCloseTo(0.001 * computeMolarMass('PbI2'), 12);
  });

  it.each(['program', 'native', 'pour'] as const)
  ('keeps posed macrostock separate while migrating an explicit legacy plate through %s', mode => {
    const v = sample([{ ...plate(0.02), precipitateFormation: undefined }]);
    v.precipitateMorphology = 'CRYSTAL_PLATE';
    v.contents.push({ formula: 'PbI2', phase: 's', mass_g: 0.03, moles: 0.03 / computeMolarMass('PbI2') });
    v.stockMotion = { tick: 1, grains: [{ id: 'lead-stock', formula: 'PbI2', mass_g: 0.03, scale_m: 0.001,
      position_m: [0, 1, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0],
      sleeping: true, powder: false }] };
    for (const [formula, moles] of [['Pb(NO3)2', 0.001], ['KI', 0.002]] as const)
      v.contents.push({ formula, phase: 'aq', moles, mass_g: moles * computeMolarMass(formula) });
    v.substances = v.contents.map(row => row.formula);
    v.mass_g = v.contents.reduce((sum, row) => sum + row.mass_g, 0);
    const newMass = 0.001 * computeMolarMass('PbI2');
    const contents = mode === 'program' ? applyProgramToLedger(getProgramById('pbno32_ki')!, v, 1, { deferThermal: true }).contents!
      : mode === 'native' ? executeMultiStepReactions(v.contents, v.substances, v.volume_ml, 25, false, 'vi', { vesselContact: v }).updatedContents
      : mergeLiquidDose(v, { volume_ml: 10, mass_g: 10 + newMass, temperature_c: 25, color: '#f8fafc',
        contents: [{ ...water, mass_g: 10, moles: 10 / 18.015 }, fine(newMass)], substances: ['H2O', 'PbI2'] }, 10).contents;
    const cohorts = precipitateCohorts(contents, v.precipitateSubstance, v.precipitateMorphology);
    expect(cohorts).toHaveLength(2);
    expect(cohorts.find(cohort => cohort.key === 'PbI2|CRYSTAL_PLATE')!.mass_g).toBeCloseTo(0.02, 12);
    expect(cohorts.find(cohort => cohort.key === 'PbI2')!.mass_g).toBeCloseTo(newMass, 12);
    const stock = contents.find(row => row.formula === 'PbI2' && !row.solidOrigin)!;
    expect(stock.mass_g).toBeCloseTo(0.03, 12);
    expect(stock.precipitateFormation).toBeUndefined();
    expect(v.stockMotion.grains[0].mass_g).toBe(0.03);
  });

  it('partial dissolution preserves legacy plates and their remaining mass', () => {
    const v = { ...sample([{ ...plate(0.5), precipitateFormation: undefined }]), temperature_c: 95,
      precipitateMorphology: 'CRYSTAL_PLATE' } as VesselState;
    const next = phase(v, 0.01), cohorts = precipitateCohorts(next.contents, next.precipitateSubstance, next.precipitateMorphology);
    expect(cohorts).toHaveLength(1);
    expect(cohorts[0].key).toBe('PbI2|CRYSTAL_PLATE');
    expect(cohorts[0].mass_g).toBeGreaterThan(0);
    expect(cohorts[0].mass_g).toBeLessThan(0.5);
    expect(next.contents.filter(row => row.formula === 'PbI2').reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(0.5, 12);
  });

  it.each([['PbI2', 'CRYSTAL_PLATE'], ['PbCl2', 'CRYSTAL_NEEDLE']] as const)
  ('pouring fine %s preserves the resident legacy %s cohort', (formula, formation) => {
    const resident = { formula, phase: 's', solidOrigin: 'precipitate' as const,
      mass_g: 0.2, moles: 0.2 / computeMolarMass(formula) };
    const v = { ...sample([resident]), precipitateSubstance: formula, precipitateMorphology: formation } as VesselState;
    const incoming = { ...resident, mass_g: 0.1, moles: 0.1 / computeMolarMass(formula), precipitateFormation: 'FINE_POWDER' };
    const dose = { volume_ml: 10, mass_g: 10.1, temperature_c: 25, color: '#f8fafc',
      contents: [{ ...water, mass_g: 10, moles: 10 / 18.015 }, incoming], substances: ['H2O', formula] };
    const next = mergeLiquidDose(v, dose, 10), cohorts = precipitateCohorts(next.contents, next.precipitateSubstance, next.precipitateMorphology);
    expect(cohorts).toHaveLength(2);
    expect(cohorts.find(cohort => cohort.key === `${formula}|${formation}`)!.mass_g).toBeCloseTo(0.2, 12);
    expect(cohorts.find(cohort => cohort.key === formula)!.mass_g).toBeCloseTo(0.1, 12);
    expect(next.mass_g).toBeCloseTo(v.mass_g + dose.mass_g, 12);
    expect(resident).not.toHaveProperty('precipitateFormation');
  });

  it('keeps old fine PbI2 unchanged when a tiny new plate cohort grows after partial hot dissolution', () => {
    let v = { ...sample(), temperature_c: 95 };
    const m = new VesselSimulationManager(v.id);
    for (let i = 0; i < 10; i++) { v = phase(v); advance(m, v); }
    const powder = m.precipitationSystems.get('PbI2')!, before = solid(v, 'FINE_POWDER');
    const radius = powder.particles[0].physicalRadius_m;
    v = phase({ ...v, temperature_c: 20 }, 0.001); advance(m, v, 0.001);
    expect(solid(v, 'FINE_POWDER')).toBeCloseTo(before, 14);
    expect(solid(v, 'CRYSTAL_PLATE')).toBeCloseTo(v.precipitateAmount_g! - before, 14);
    expect(solid(v, 'CRYSTAL_PLATE')).toBeLessThan(before * 0.001);
    expect(m.precipitationSystems.get('PbI2')).toBe(powder);
    expect(powder.profile.morphology).toBe('fine_powder');
    expect(powder.profile.cloudinessFactor).toBe(0.85);
    expect(powder.particles[0].physicalRadius_m).toBe(radius);
    expect(m.precipitationSystems.get('PbI2|CRYSTAL_PLATE')!.profile.morphology).toBe('crystalline');
    expect([...m.precipitationSystems.values()].reduce((s, p) => s + p.representedMass_g, 0)).toBeCloseTo(v.precipitateAmount_g!, 13);
    expect(currentMixedPrecipitateTurbidity(v, m)).toBe(m.cloudiness);
  });

  it('makes mixed formation transport independent of inventory order and scalar UI appearance', () => {
    const states = [[fine(0.1), plate(0.1)], [plate(0.1), fine(0.1)]].map((rows, i) => {
      const v = { ...sample(rows), precipitateMorphology: i ? 'CRYSTAL_PLATE' : 'FINE_POWDER' };
      const m = new VesselSimulationManager(v.id); advance(m, v);
      expect(precipitateComponents(v.contents)).toEqual([{ formula: 'PbI2', mass_g: 0.2, formation: undefined }]);
      expect(m.precipitationSystems.size).toBe(2);
      expect(m.precipitationSystems.get('PbI2')!.particles[0].physicalRadius_m).toBeCloseTo(1e-6, 15);
      expect(m.precipitationSystems.get('PbI2|CRYSTAL_PLATE')!.particles[0].physicalRadius_m).toBeCloseTo(50e-6, 15);
      return [...m.precipitationSystems].map(([key, s]) => ({ key, particles: structuredClone(s.particles), bed: s.sedimentBed.amount_g }));
    });
    expect(states[0]).toEqual(states[1]);
  });

  it('conserves formula units over repeated hot/cold cycles and removes only the departed cohort', () => {
    let v = sample(); const m = new VesselSimulationManager(v.id);
    for (let cycle = 0; cycle < 3; cycle++) for (const temperature_c of [95, 20]) {
      v = { ...v, temperature_c };
      for (let i = 0; i < 20; i++) {
        v = phase(v); advance(m, v);
        const inventory = v.contents.filter(c => c.formula === 'PbI2');
        expect(inventory.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(0.2, 13);
        expect(inventory.reduce((s, c) => s + c.moles, 0)).toBeCloseTo(0.2 / MW, 15);
        expect([...m.precipitationSystems.values()].reduce((s, p) => s + p.representedMass_g, 0)).toBeCloseTo(v.precipitateAmount_g!, 13);
      }
    }
    const plates = m.precipitationSystems.get('PbI2|CRYSTAL_PLATE')!;
    const retained = structuredClone(plates.particles);
    m.setPrecipitateBudget(0); expect(plates.particles).toEqual(retained);
    m.setPrecipitateBudget(900); expect(plates.particles).toEqual(retained);
    v = { ...v, contents: v.contents.filter(c => c.precipitateFormation !== 'FINE_POWDER') };
    advance(m, v, 1e-9);
    expect(m.precipitationSystems.has('PbI2')).toBe(false);
    expect(m.precipitationSystems.get('PbI2|CRYSTAL_PLATE')).toBe(plates);
    v = phase({ ...v, contents: [{ ...water }], hasPrecipitate: false, precipitateAmount_g: 0, precipitateSubstance: undefined });
    advance(m, v);
    expect(m.precipitationSystems.size).toBe(0); expect(v.leadIodidePhaseHistory).toBeUndefined();
  });

  it('withdraws suspended powder without eroding a settled plate cohort, including queued withdrawals', () => {
    const v = sample([fine(0.1), plate(0.1)]), m = new VesselSimulationManager(v.id);
    advance(m, v);
    const powder = m.precipitationSystems.get('PbI2')!, plates = m.precipitationSystems.get('PbI2|CRYSTAL_PLATE')!;
    for (const p of plates.particles) p.y = -100;
    advance(m, v, 1e-9); expect(plates.sedimentBed.amount_g).toBeCloseTo(0.1, 13);
    const radii = powder.particles.map(p => p.physicalRadius_m);
    const a = withdrawAliquot(v, 25, mobileSolidInventory(v, m));
    const b = withdrawAliquot(a.vessel, 25, mobileSolidInventory(a.vessel, m));
    for (const out of [a, b]) {
      expect(out.sample.contents.some(c => c.precipitateFormation === 'CRYSTAL_PLATE')).toBe(false);
      expect(out.sample.contents.filter(c => c.phase === 's').reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(0.025, 13);
      expect(solid(out.vessel, 'CRYSTAL_PLATE')).toBeCloseTo(0.1, 13);
    }
    expect(b.vessel.precipitateOutflow_g!.PbI2).toBeCloseTo(0.05, 13);
    expect(b.vessel.precipitateCohortOutflow_g!['PbI2|CRYSTAL_PLATE']).toBe(0);
    advance(m, b.vessel, 1e-9);
    expect(powder.particles.map(p => p.physicalRadius_m)).toEqual(radii);
    expect(plates.sedimentBed.amount_g).toBeCloseTo(0.1, 13);
    expect(powder.representedMass_g).toBeCloseTo(0.05, 13);
    const rows = [...b.vessel.contents, ...a.sample.contents, ...b.sample.contents];
    expect(rows.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(v.mass_g, 12);
    const received = mergeLiquidDose(sample([plate(0.05)]), a.sample, a.sample.volume_ml);
    expect(precipitateCohorts(received.contents)).toHaveLength(2);
  });

  it('does not merge new free crystal growth into old fine or attached solid rows', () => {
    const attached = { ...plate(0.02), depositSubstrate: 'Fe', depositionReactionId: 'test' };
    const contents = [fine(0.03), attached, { ...fine(0.1), phase: 'aq', solidOrigin: undefined }];
    const out = transferSolidPhase(contents, 'PbI2', 0.05 / MW, 100, 'CRYSTAL_PLATE');
    expect(out.find(c => c.precipitateFormation === 'FINE_POWDER' && c.phase === 's')).toEqual(contents[0]);
    expect(out.find(c => c.depositSubstrate)).toEqual(attached);
    expect(out.find(c => c.phase === 's' && c.precipitateFormation === 'CRYSTAL_PLATE' && !c.depositSubstrate)!.mass_g).toBeCloseTo(0.05, 14);
    expect(out.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(0.15, 14);
  });

  it('preserves both forms and their distinct settling histories when drops merge', () => {
    const inputs = [fine(0.1), plate(0.1)].map(row => ({ contents: [{ ...water }, row], fresh: true }));
    const state = mergeSpillSuspensions(inputs)!;
    expect(state.species).toHaveLength(2);
    const before = { contents: [{ ...water }, fine(0.1), plate(0.1)], suspension: state, volume_ml: 100, temperature_c: 25 } as SpillState;
    const next = stepSpillSuspension(before, { ...before }, 0.1);
    const [powder, plates] = reconcileSpillSuspension(next)!.species;
    expect(powder.formation).toBeUndefined(); expect(plates.formation).toBe('CRYSTAL_PLATE');
    expect(plates.cohorts[0].travel).toBeGreaterThan(powder.cohorts[0].travel * 100);
    expect(next.contents).toEqual(before.contents);
  });
});
