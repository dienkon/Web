import { afterEach, describe, expect, it } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { stockGrainContacts, stockLiquidContactFraction, partitionDryStock } from '../src/physical/stockLiquidContact';
import { allocateStockConsumption } from '../src/physical/stockConsumption';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { getProgramById } from '../src/vfx/programs/library';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { advanceReaction } from '../src/engine/advanceReaction';
import { planStudioProgram } from '../src/engine/studioProgram';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { applyCopperAmmoniaLedger } from '../src/engine/copperAmmoniaLedger';
import { applyAluminumMaterialProgress, type AluminumMaterialStage } from '../src/engine/aluminumMaterialProgress';
import { useAppStore } from '../src/store/useAppStore';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';

const originalStore = useAppStore.getState();
afterEach(() => useAppStore.setState(originalStore, true));

function vessel(formula = 'Zn', reagent = 'HCl'): VesselState {
  const result: VesselState = { id: 'grains', name: 'grains', type: 'beaker', capacity_ml: 100,
    position: [0, 0, 0], rotationY: 0, isLocked: false, temperature_c: 25, ph: 1,
    volume_ml: 30, volume: 0.3, mass_g: 31, hasGas: false, hasPrecipitate: false, isBoiling: false,
    contents: [{ formula, phase: 's', moles: 0.2 / computeMolarMass(formula), mass_g: 0.2, initialMass_g: 0.2 },
      { formula: reagent, phase: 'aq', moles: 0.02, mass_g: computeMolarMass(reagent) * 0.02 },
      { formula: 'H2O', phase: 'l', moles: 30 / computeMolarMass('H2O'), mass_g: 30 }], substances: [formula, reagent, 'H2O'] };
  result.mass_g = result.contents.reduce((sum, row) => sum + row.mass_g, 0);
  result.stockMotion = { tick: 3, grains: [-0.7, 0.6].map((y, index) => ({ id: index ? 'dry' : 'wet', formula,
    mass_g: 0.1, scale_m: 0.002,
    position_m: vesselLocalToWorld(result, [index ? 0.25 : -0.25, y, 0]).map(value => value * 0.035) as [number, number, number],
    rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false })) };
  return result;
}
const macroMass = (state: Pick<VesselState, 'contents'>, formula = 'Zn') => state.contents
  .filter(row => row.formula === formula && row.phase === 's' && row.solidOrigin !== 'precipitate')
  .reduce((sum, row) => sum + row.mass_g, 0);

describe('inventory assigned to individual stock carriers', () => {
  it('partitions one aggregate row into wet and dry inventories without repeated partition loss', () => {
    const sample = vessel(), contacts = stockGrainContacts(sample, 'Zn');
    expect(contacts.map(contact => contact.wetFraction)).toEqual([1, 0]);
    const split = partitionDryStock(sample);
    expect(split.inertContents[0].mass_g).toBeCloseTo(0.1, 12);
    expect(split.reactiveContents[0].mass_g).toBeCloseTo(0.1, 12);
    expect(split.inertContents[0].initialMass_g).toBe(0.2);
    expect(split.reactiveVessel.stockMotion!.grains.map(grain => grain.id)).toEqual(['wet']);
    expect(partitionDryStock(split.reactiveVessel).inertContents).toHaveLength(0);
    expect(sample.contents[0].mass_g).toBe(0.2);
  });

  it('caps both material yield and heat at the wetted carrier inventory', () => {
    const sample = vessel(), program = getProgramById('zn_hcl')!;
    const partial = applyProgramToLedger(program, sample, 0.25, { deferThermal: true });
    expect(partial.stockMotion!.grains[0].mass_g).toBeCloseTo(0.05, 12);
    expect(partial.stockMotion!.grains[1]).toEqual(sample.stockMotion!.grains[1]);
    const end = applyProgramToLedger(program, sample, 1, { deferThermal: true });
    expect(macroMass(end as VesselState)).toBeCloseTo(0.1, 12);
    expect(end.escapedGas_g!.H2).toBeCloseTo(0.1 / computeMolarMass('Zn') * computeMolarMass('H2'), 12);
    expect(end.programHeatApplied_J).toBeCloseTo(partial.programHeatApplied_J! * 2, 9);
    expect(end.stockMotion!.grains.map(grain => grain.mass_g)).toEqual([0, 0.1]);
    expect(end.stockMotion!.grains[0].id).toBe('wet');
    expect(end.stockMotion!.grains[0].scale_m).toBe(0);
    expect(end.contents!.reduce((sum, row) => sum + row.mass_g, 0) + end.escapedGas_g!.H2).toBeCloseTo(sample.mass_g, 10);
  });

  it('stops accepted progress at wet exhaustion, then resumes only after the dry grain is immersed', () => {
    const baseline = vessel(), program = getProgramById('zn_hcl')!, kinetics = planStudioProgram(program, baseline, 'vi').kinetics!;
    const progress = advanceReaction(kinetics, baseline, 1000);
    expect(progress).toBeCloseTo(0.5, 12);
    expect(kinetics.actualProgressRate_s).toBeCloseTo(0.0005, 12);
    kinetics.progress = progress;
    const accepted = { ...baseline, ...applyProgramWithThermalSinks(program, baseline, baseline, progress, 0.1) };
    expect(advanceReaction(kinetics, accepted, 100)).toBe(progress);
    expect(kinetics.actualProgressRate_s).toBe(0);
    for (const replayProgress of [progress, 1]) {
      const replay = applyProgramWithThermalSinks(program, baseline, accepted, replayProgress, 0.1);
      expect(macroMass(replay as VesselState)).toBeCloseTo(0.1, 12);
      expect(replay.escapedGas_g!.H2).toBeCloseTo(accepted.escapedGas_g!.H2, 12);
    }
    accepted.stockMotion!.grains[1].position_m = vesselLocalToWorld(accepted, [0.25, -0.7, 0]).map(value => value * 0.035) as [number, number, number];
    expect(advanceReaction(kinetics, accepted, 100)).toBeGreaterThan(progress);
  });

  it('keeps native cascades from repeatedly spending a dry remainder', () => {
    const sample = vessel('Fe', 'CuSO4');
    const result = executeMultiStepReactions(sample.contents, sample.substances, 30, 25, false, 'vi', { vesselContact: sample });
    expect(macroMass({ contents: result.updatedContents }, 'Fe')).toBeCloseTo(0.1, 12);
    expect(result.stockMotion!.grains.map(grain => grain.mass_g)).toEqual([0, 0.1]);
    expect(result.reactionsOccurred.reduce((sum, reaction) => sum + reaction.xi, 0)).toBeCloseTo(0.1 / computeMolarMass('Fe'), 12);
  });

  it('solves a mixed-carrier copper pool without recursion or dissolving the dry portion', () => {
    const sample = vessel('Cu(OH)2', 'NH3'); sample.contents[1].moles = 0.06;
    sample.contents[1].mass_g = 0.06 * computeMolarMass('NH3');
    const patch = applyCopperAmmoniaLedger(sample, 1)!;
    expect(patch).not.toBeNull();
    expect(macroMass(patch as VesselState, 'Cu(OH)2')).toBeGreaterThanOrEqual(0.1 - 1e-12);
    expect(patch.stockMotion!.grains[1].mass_g).toBe(0.1);
    expect(patch.stockMotion!.grains[0].mass_g).toBeLessThan(0.1);
  });

  it('caps native aluminum clock at the same nonlinear material conversion', () => {
    const baseline = vessel('Al(OH)3', 'NaOH'), stock = baseline.contents[0];
    const stage: AluminumMaterialStage = { reactionId: 'aloh3_naoh_dissolution', extent_mol: stock.moles,
      deltaH_kJ_mol: 0, weight_molAl: stock.moles,
      reactants: [{ formula: 'Al(OH)3', coeff: 1, phase: 's' }, { formula: 'NaOH', coeff: 1, phase: 'aq' }],
      products: [{ formula: 'Na[Al(OH)4]', coeff: 1, phase: 'aq' }] };
    const kinetics = { ...planStudioProgram(getProgramById('zn_hcl')!, vessel(), 'vi').kinetics!,
      program: undefined, materialStages: [stage], initialVesselBaseline: baseline };
    const p = advanceReaction(kinetics, baseline, 1000);
    expect(p).toBeGreaterThan(0); expect(p).toBeLessThan(0.5);
    const patch = applyAluminumMaterialProgress([stage], baseline, baseline, p);
    expect(macroMass(patch as VesselState, 'Al(OH)3')).toBeCloseTo(0.1, 12);
    expect(patch.stockMotion!.grains.map(grain => grain.mass_g)).toEqual([0, 0.1]);
  });

  it('does not enlarge older grains to represent a new, unposed dose', () => {
    const sample = vessel(); sample.contents[0].mass_g += 0.2; sample.contents[0].moles *= 2;
    expect(stockGrainContacts(sample, 'Zn').map(contact => contact.mass_g)).toEqual([0.1, 0.1]);
    expect(partitionDryStock(sample).inertContents[0].mass_g).toBeCloseTo(0.1, 12);
    const after = sample.contents.map(row => row.phase === 's' ? { ...row, mass_g: 0.3, moles: row.moles * 0.75 } : row);
    expect(allocateStockConsumption(sample, after)).toBe(sample.stockMotion);
  });

  it('allows explicitly dry chemistry to consume both carriers', () => {
    const sample = vessel();
    const after = sample.contents.filter(row => row.phase !== 's');
    expect(allocateStockConsumption(sample, after, { requireLiquidContact: false })!.grains.map(grain => grain.mass_g)).toEqual([0, 0]);
  });

  it('redistributes an exhausted small grain share across remaining wet area, preserving dry mass', () => {
    const sample = vessel(), wet = sample.stockMotion!.grains[0];
    sample.stockMotion!.grains.unshift({ ...wet, id: 'tiny', mass_g: 0.001, scale_m: wet.scale_m * Math.cbrt(0.01),
      position_m: [...wet.position_m] });
    sample.contents[0].mass_g = 0.201; sample.contents[0].moles = 0.201 / computeMolarMass('Zn');
    const after = sample.contents.map(row => row.phase === 's' ? { ...row, mass_g: 0.151, moles: 0.151 / computeMolarMass('Zn') } : row);
    const motion = allocateStockConsumption(sample, after)!;
    expect(motion.grains[0].mass_g).toBe(0);
    expect(motion.grains[1].mass_g).toBeCloseTo(0.051, 12);
    expect(motion.grains[2].mass_g).toBe(0.1);
    expect(motion.grains.reduce((sum, grain) => sum + grain.mass_g, 0)).toBeCloseTo(0.151, 12);
    for (const [index, grain] of motion.grains.entries()) expect(grain.position_m).toBe(sample.stockMotion!.grains[index].position_m);
  });

  it('retains displacement by an inert grain in the lower organic layer when repartitioning', () => {
    const sample = vessel(); sample.volume_ml = 60; sample.immiscibleOrganicVolume_ml = 30;
    sample.contents = [{ formula: 'Zn', phase: 's', mass_g: 5.000001, moles: 5.000001 / computeMolarMass('Zn') },
      { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / computeMolarMass('H2O') },
      { formula: 'CCl4', phase: 'l', mass_g: 48, moles: 48 / computeMolarMass('CCl4'), liquidLayer: 'organic' }];
    for (const [index, grain] of sample.stockMotion!.grains.entries()) {
      grain.mass_g = index ? 5 : 0.000001; grain.scale_m = Math.cbrt(grain.mass_g / 1000 / 7140);
      grain.position_m = vesselLocalToWorld(sample, [0, index ? -0.7 : 0.206, 0]).map(value => value * 0.035) as [number, number, number];
    }
    const split = partitionDryStock(sample);
    expect(split.inertContents[0].mass_g).toBeCloseTo(5, 12);
    expect(stockGrainContacts(split.reactiveVessel, 'Zn')[0].wetFraction).toBe(1);
    expect(partitionDryStock({ ...split.reactiveVessel }).inertContents).toHaveLength(0);
    expect(() => JSON.stringify(split.reactiveVessel)).not.toThrow();
    const patch = applyProgramToLedger(getProgramById('zn_hcl')!, sample, 1);
    expect(Object.getOwnPropertySymbols(patch)).toHaveLength(0);
  });

  it('manual and automatic ticks accept the same finite wet-grain yield', () => {
    const sample = vessel(), program = getProgramById('zn_hcl')!, kinetics = planStudioProgram(program, sample, 'vi').kinetics!;
    kinetics.duration = 0.0001;
    const auto = new AutoExperiment(program.id, false);
    const internal = auto as unknown as { lesson: unknown; kinetics: typeof kinetics; baseline: VesselState };
    internal.lesson = undefined; internal.kinetics = structuredClone(kinetics); internal.baseline = structuredClone(sample);
    auto.sample = structuredClone(sample); auto.phase = 'react';
    useAppStore.setState({ vessels: { [sample.id]: structuredClone(sample) }, vesselIds: [sample.id],
      burners: {}, spills: {}, activeKinetics: { [sample.id]: structuredClone(kinetics) }, pendingReactions: {},
      dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 3; i++) { auto.tick(1 / 60); useAppStore.getState().tickSimulation(1 / 60); }
    const manual = useAppStore.getState().vessels[sample.id];
    expect(auto.progress).toBeCloseTo(0.5, 12);
    expect(useAppStore.getState().activeKinetics[sample.id].progress).toBeCloseTo(0.5, 12);
    for (const after of [manual, auto.sample]) {
      expect(macroMass(after)).toBeCloseTo(0.1, 12);
      expect(after.stockMotion!.grains.map(grain => grain.mass_g)).toEqual([0, 0.1]);
      expect(after.escapedGas_g!.H2).toBeCloseTo(0.1 / computeMolarMass('Zn') * computeMolarMass('H2'), 12);
      expect(after.gasFlux?.generated_mol_s.H2 ?? 0).toBe(0);
    }
  });

  it('protects coating on a dry host while wet attached metal and free metal react', () => {
    const sample = vessel('Fe', 'HNO3'), program = getProgramById('cu_hno3_dilute')!;
    sample.contents[1].formula = 'HNO3 (dil)';
    for (const id of ['wet', 'dry']) sample.contents.push({ formula: 'Cu', phase: 's', solidOrigin: 'precipitate',
      mass_g: 0.01, moles: 0.01 / computeMolarMass('Cu'), depositSubstrate: 'Fe', depositCarrierId: id, depositionReactionId: 'fe_cuso4' });
    sample.contents.push({ formula: 'Cu', phase: 's', solidOrigin: 'precipitate', mass_g: 0.01, moles: 0.01 / computeMolarMass('Cu') });
    sample.substances = [...new Set(sample.contents.map(row => row.formula))];
    expect(stockLiquidContactFraction(sample, 'Cu')).toBeCloseTo(2 / 3, 12);
    const split = partitionDryStock(sample);
    expect(split.inertContents.find(row => row.depositCarrierId === 'dry')!.mass_g).toBe(0.01);
    expect(split.inertContents.some(row => row.depositCarrierId === 'wet')).toBe(false);
    const patch = applyProgramToLedger(program, sample, 1, { deferThermal: true });
    expect(patch.contents!.find(row => row.depositCarrierId === 'dry')!.mass_g).toBe(0.01);
    expect(patch.contents!.filter(row => row.formula === 'Cu' && row.depositCarrierId !== 'dry').reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(0, 12);
    expect(patch.stockMotion).toBe(sample.stockMotion);
    const plan = planStudioProgram(program, sample, 'vi').kinetics!;
    expect(advanceReaction(plan, sample, 1000)).toBeCloseTo(2 / 3, 12);
    const native = executeMultiStepReactions(sample.contents, sample.substances, 30, 25, false, 'vi', { vesselContact: sample });
    expect(native.updatedContents.find(row => row.depositCarrierId === 'dry')!.mass_g).toBe(0.01);
    expect(native.stockMotion).toBe(sample.stockMotion);
  });

  it('rejects timeline jumps beyond wet inventory without changing material or the accepted clock', () => {
    const sample = vessel(), program = getProgramById('zn_hcl')!, kinetics = planStudioProgram(program, sample, 'vi').kinetics!;
    useAppStore.setState({ vessels: { [sample.id]: sample }, vesselIds: [sample.id], activeKinetics: { [sample.id]: kinetics }, burners: {} });
    const seek = (progress: number) => useAppStore.getState().seekStudioProgram(sample.id, progress);
    const rejected = (progress: number) => {
      const before = useAppStore.getState(), snapshot = structuredClone(before.vessels[sample.id]);
      expect(seek(progress)).toBe(false);
      const after = useAppStore.getState();
      expect(after.vessels[sample.id]).toBe(before.vessels[sample.id]);
      expect(after.vessels[sample.id]).toEqual(snapshot);
      expect(after.activeKinetics[sample.id]).toBe(before.activeKinetics[sample.id]);
    };
    rejected(1);
    expect(seek(0.25)).toBe(true);
    expect(useAppStore.getState().activeKinetics[sample.id].progress).toBe(0.25);
    expect(macroMass(useAppStore.getState().vessels[sample.id])).toBeCloseTo(0.15, 12);
    rejected(0.75);
    expect(seek(0.5)).toBe(true);
    expect(useAppStore.getState().vessels[sample.id].stockMotion!.grains.map(grain => grain.mass_g)).toEqual([0, 0.1]);
    rejected(1);
    const rewetted = structuredClone(useAppStore.getState().vessels[sample.id]);
    rewetted.stockMotion!.grains[1].position_m = vesselLocalToWorld(rewetted, [0.25, -0.7, 0])
      .map(value => value * 0.035) as [number, number, number];
    useAppStore.setState({ vessels: { [sample.id]: rewetted } });
    expect(seek(1)).toBe(true);
    const completed = useAppStore.getState();
    expect(completed.activeKinetics[sample.id]).toBeUndefined();
    expect(macroMass(completed.vessels[sample.id])).toBeCloseTo(0, 12);
    expect(completed.vessels[sample.id].escapedGas_g!.H2).toBeCloseTo(0.2 / computeMolarMass('Zn') * computeMolarMass('H2'), 12);
  });

  it('applies the same timeline limit after a transfer has rebased material progress', () => {
    const sample = vessel(), program = getProgramById('zn_hcl')!, kinetics = planStudioProgram(program, sample, 'vi').kinetics!;
    kinetics.progress = 0.4; kinetics.replayProgressBase = 0.4;
    useAppStore.setState({ vessels: { [sample.id]: sample }, vesselIds: [sample.id], activeKinetics: { [sample.id]: kinetics }, burners: {} });
    expect(useAppStore.getState().seekStudioProgram(sample.id, 0.8)).toBe(false);
    expect(useAppStore.getState().activeKinetics[sample.id].progress).toBe(0.4);
    expect(useAppStore.getState().seekStudioProgram(sample.id, 0.7)).toBe(true);
    expect(macroMass(useAppStore.getState().vessels[sample.id])).toBeCloseTo(0.1, 12);
    expect(useAppStore.getState().activeKinetics[sample.id].progress).toBe(0.7);
  });
});
