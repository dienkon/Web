import { afterEach, describe, expect, it } from 'vitest';
import { withdrawAliquot, dispenseAliquot } from '../src/handling/aliquot';
import { mobileSolidInventory } from '../src/science/suspensionTransport';
import { SimulationEngine, VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { occupiedLiquidVolume } from '../src/handling/solidOccupancy';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { aspiratePipette, dispensePipette } from '../src/handling/instrumentOperations';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { pourTargetPose } from '../src/engine/pourTransport';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState(), instruments = useInstrumentStore.getState();
afterEach(() => { useAppStore.setState(original, true); useInstrumentStore.setState(instruments, true); SimulationEngine.clearAll(); });
const item = (formula: string, mass_g: number, phase: string, tagged = false): SubstanceContent => ({
  formula, mass_g, moles: mass_g / computeMolarMass(formula), phase,
  ...(tagged ? { solidOrigin: 'precipitate' as const } : {}),
});
function vessel(id: string, contents: SubstanceContent[], volume_ml = 100): VesselState {
  return { id, name: id, type: 'beaker', capacity_ml: 250, position: [0, -0.135, 0], rotationY: 0,
    isLocked: false, contents, substances: [...new Set(contents.map(c => c.formula))], volume_ml, volume: volume_ml / 250,
    mass_g: contents.reduce((s, c) => s + c.mass_g, 0), temperature_c: 25, ph: 7,
    hasPrecipitate: contents.some(c => c.solidOrigin), precipitateSubstance: contents.find(c => c.solidOrigin)?.formula,
    liquidColor: '#f8fafc', hasGas: false, isBoiling: false };
}
const solidMass = (contents: SubstanceContent[], formula?: string) => contents.filter(c => c.phase === 's'
  && (!formula || c.formula === formula)).reduce((s, c) => s + c.mass_g, 0);
function setupSlurry() {
  const source = vessel('slurry-source', [item('H2O', 100, 'l'), item('AgBr', 0.1, 's', true), item('CuS', 0.05, 's', true)]);
  const manager = SimulationEngine.getManager(source.id, 'low');
  for (let i = 0; i < 10; i++) manager.step(source, 0.1, { thermalStateAuthoritative: true });
  return { source, manager, mobile: mobileSolidInventory(source, manager) };
}
function expectConservation(before: SubstanceContent[], after: SubstanceContent[]) {
  const atoms = (rows: SubstanceContent[]) => {
    const result: Record<string, number> = {};
    for (const c of rows) for (const [atom, n] of Object.entries(readComposition(c.formula).atoms)) result[atom] = (result[atom] ?? 0) + n * c.moles;
    return result;
  };
  const expected = atoms(before), actual = atoms(after);
  expect(after.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(before.reduce((s, c) => s + c.mass_g, 0), 10);
  for (const [atom, n] of Object.entries(expected)) expect(actual[atom] ?? 0).toBeCloseTo(n, 10);
}

describe('Finite suspended-solid sampling and pour transport', () => {
  it('reads a solid phase embedded in its formula instead of withdrawing it as liquid', () => {
    const source = vessel('phase-alias', [item('H2O', 100, 'l'),
      { ...item('AgBr(s)', 0.1, 's', true), phase: undefined }]);
    expect(solidMass(withdrawAliquot(source, 50).sample.contents)).toBe(0);
    const sampled = withdrawAliquot(source, 50, { AgBr: { inventoryMass_g: 0.1, suspendedMass_g: 0.04 } });
    expect(solidMass(sampled.sample.contents)).toBeCloseTo(0.02, 12);
    expect(sampled.sample.contents.find(c => c.formula === 'AgBr(s)')!.phase).toBe('s');
    expectConservation(source.contents, [...sampled.vessel.contents, ...sampled.sample.contents]);
  });
  it('withdraws only suspended mass and keeps the sender bed and physical particle sizes', () => {
    const { source, manager, mobile } = setupSlurry();
    const system = manager.precipitationSystems.get('AgBr')!;
    const bed = system.sedimentBed.amount_g;
    expect(bed).toBeGreaterThan(0);
    expect(bed).toBeLessThan(0.1);
    const radii = new Map(system.particles.map(p => [p.id, p.physicalRadius_m!]));
    const out = withdrawAliquot(source, 25, mobile);
    for (const formula of ['AgBr', 'CuS']) {
      expect(solidMass(out.sample.contents, formula)).toBeCloseTo(mobile[formula].suspendedMass_g / 4, 12);
      expect(out.vessel.precipitateOutflow_g![formula]).toBeCloseTo(mobile[formula].suspendedMass_g / 4, 12);
    }
    expectConservation(source.contents, [...out.vessel.contents, ...out.sample.contents]);
    expect(out.vessel.mass_g + out.sample.mass_g).toBeCloseTo(source.mass_g, 10);
    manager.step(out.vessel, 1e-9, { thermalStateAuthoritative: true });
    expect(system.sedimentBed.amount_g).toBeCloseTo(bed, 10);
    expect(system.representedMass_g).toBeCloseTo(solidMass(out.vessel.contents, 'AgBr'), 12);
    for (const p of system.particles) if (radii.has(p.id)) expect(p.physicalRadius_m! / radii.get(p.id)!).toBeCloseTo(1, 12);
  });

  it('deducts outstanding withdrawals when several releases precede the next physical frame', () => {
    const { source, manager, mobile } = setupSlurry();
    const a = withdrawAliquot(source, 25, mobile);
    const b = withdrawAliquot(a.vessel, 25, mobileSolidInventory(a.vessel, manager));
    for (const formula of ['AgBr', 'CuS']) {
      expect(solidMass(a.sample.contents, formula)).toBeCloseTo(solidMass(b.sample.contents, formula), 12);
      expect(b.vessel.precipitateOutflow_g![formula]).toBeCloseTo(mobile[formula].suspendedMass_g / 2, 12);
    }
    const all = withdrawAliquot(b.vessel, 50, mobileSolidInventory(b.vessel, manager));
    const initialBed = manager.sedimentBed.amount_g;
    expect(solidMass(all.vessel.contents)).toBeCloseTo(initialBed, 12);
    manager.step(all.vessel, 1e-9, { thermalStateAuthoritative: true });
    expect(manager.sedimentBed.amount_g).toBeCloseTo(initialBed, 10);
    expectConservation(source.contents, [...all.vessel.contents, ...a.sample.contents, ...b.sample.contents, ...all.sample.contents]);
  });

  it('rejects absent, stale and invalid solid snapshots while retaining ordinary chunks/filter cake/gas', () => {
    const { source, manager } = setupSlurry();
    expect(mobileSolidInventory(source)).toEqual({});
    expect(solidMass(withdrawAliquot(source, 50).sample.contents)).toBe(0);
    const changed = { ...source, contents: source.contents.map(c => c.formula === 'AgBr' ? { ...c, mass_g: c.mass_g * 2, moles: c.moles * 2 } : c) };
    expect(mobileSolidInventory(changed, manager).AgBr).toBeUndefined();
    for (const suspendedMass_g of [-1, NaN, Infinity, 0.2]) {
      expect(solidMass(withdrawAliquot(source, 50, { AgBr: { inventoryMass_g: 0.1, suspendedMass_g } }).sample.contents)).toBe(0);
    }
    const contents = [item('H2O', 100, 'l'), item('CuS', 0.05, 's', true), item('CuS', 0.2, 's'),
      { ...item('CuS', 1, 's', true), location: 'filter' as const }, item('H2', 0.01, 'g')];
    const mixed = vessel('chunks', contents);
    const sampled = withdrawAliquot(mixed, 50, { CuS: { inventoryMass_g: 0.05, suspendedMass_g: 0.05 } });
    expect(solidMass(sampled.sample.contents)).toBeCloseTo(0.025, 12);
    expect(sampled.vessel.contents.find(c => c.phase === 's' && !c.solidOrigin)!.mass_g).toBe(0.2);
    expect(sampled.vessel.contents.find(c => c.location === 'filter')!.mass_g).toBe(1);
    expect(sampled.vessel.contents.find(c => c.phase === 'g')!.mass_g).toBe(0.01);
    expectConservation(contents, [...sampled.vessel.contents, ...sampled.sample.contents]);
  });

  it('counts incoming particle volume at the rim and leaves proportional solids in the excess sample', () => {
    const source = vessel('dense-slurry', [item('H2O', 100, 'l'), item('CuS', 20, 's', true)]);
    const sample = withdrawAliquot(source, 20, { CuS: { inventoryMass_g: 20, suspendedMass_g: 20 } }).sample;
    const target = { ...vessel('near-rim', [item('H2O', 90, 'l')], 90), capacity_ml: 100 };
    const received = dispenseAliquot(target, sample, 20);
    expect(received.dispensed_ml).toBeCloseTo(10 / (1 + 0.2 / 4.6), 7);
    expect(occupiedLiquidVolume(received.vessel)).toBeLessThanOrEqual(100 + 1e-9);
    expect(received.vessel.hasPrecipitate).toBe(true);
    expect(solidMass(received.vessel.contents)).toBeCloseTo(received.dispensed_ml * 0.2, 10);
    expectConservation([...target.contents, ...sample.contents], [...received.vessel.contents, ...received.sample.contents]);
    expect(received.vessel.mass_g + received.sample.mass_g).toBeCloseTo(target.mass_g + sample.mass_g, 10);
  });

  it('carries particles through the actual in-flight store path only after arrival', () => {
    const { source, manager, mobile } = setupSlurry();
    const target = vessel('slurry-target', [], 0);
    useAppStore.setState({ vessels: { [source.id]: source, [target.id]: target }, vesselIds: [source.id, target.id],
      inFlightPours: [], spills: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, burners: {}, isSimulationPaused: false });
    const profile = getVesselProfile(target.type, target.capacity_ml);
    const trajectory = traceLaunchedStream([0, 6, 0], [0, 0, 0], { id: target.id, position: target.position, profile,
      mouthR: profile.mouthR, mouthY: target.position[1] + profile.lipLocal[1], liquidSurfaceY: target.position[1] + vesselLiquidSurfaceY(target) }, LAB_PHYSICS.TABLE_SURFACE_Y);
    const moved = useAppStore.getState().releasePourLiquid({ id: 'slurry-parcel', sessionId: 'slurry', sourceId: source.id,
      sourceName: source.name, targetId: target.id, targetPose: pourTargetPose(target), trajectory, duration_s: 0.1 }, 25);
    expect(moved).toBe(25);
    expect(solidMass(useAppStore.getState().vessels[target.id].contents)).toBe(0);
    expect(solidMass(useAppStore.getState().inFlightPours[0].sample.contents)).toBeCloseTo(
      Object.values(mobile).reduce((s, c) => s + c.suspendedMass_g / 4, 0), 12);
    for (let i = 0; i < 100; i++) useAppStore.getState().advancePourTransport(0.1);
    const state = useAppStore.getState();
    const finalTarget = state.vessels[target.id];
    expect(state.inFlightPours).toHaveLength(0);
    expect(solidMass(finalTarget.contents)).toBeGreaterThan(0);
    expect(finalTarget.hasPrecipitate).toBe(true);
    const all = [...state.vessels[source.id].contents, ...finalTarget.contents, ...Object.values(state.spills).flatMap(s => s.contents ?? [])];
    expectConservation(source.contents, all);
    manager.step(state.vessels[source.id], 1e-9, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.get('AgBr')!.representedMass_g).toBeCloseTo(solidMass(state.vessels[source.id].contents, 'AgBr'), 12);
  });

  it('pipettes a finite suspended sample and delivers it without copying the bed', () => {
    const { source, manager, mobile } = setupSlurry(), target = vessel('pipette-target', [], 0);
    useAppStore.setState({ vessels: { [source.id]: source, [target.id]: target }, selectedVesselId: source.id,
      vesselIds: [source.id, target.id], moveMode: false, burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {} });
    useInstrumentStore.getState().setSample(null);
    expect(aspiratePipette(10).ok).toBe(true);
    expect(solidMass(useInstrumentStore.getState().pipetteSample!.contents)).toBeCloseTo(
      Object.values(mobile).reduce((s, c) => s + c.suspendedMass_g * 0.1, 0), 12);
    expect(dispensePipette(10, target.id).ok).toBe(true);
    const state = useAppStore.getState();
    expectConservation(source.contents, [...state.vessels[source.id].contents, ...state.vessels[target.id].contents,
      ...(useInstrumentStore.getState().pipetteSample?.contents ?? [])]);
    manager.step(state.vessels[source.id], 1e-9, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.get('AgBr')!.representedMass_g).toBeCloseTo(solidMass(state.vessels[source.id].contents, 'AgBr'), 12);
  });

  it('restores committed counters without withdrawing the same material a second time', () => {
    const { source, mobile } = setupSlurry();
    const out = withdrawAliquot(source, 50, mobile);
    const restored = JSON.parse(JSON.stringify(out.vessel)) as VesselState;
    const fresh = new VesselSimulationManager('restored');
    fresh.step(restored, 0.01, { thermalStateAuthoritative: true });
    for (const [formula, system] of fresh.precipitationSystems) {
      expect(system.representedMass_g).toBeCloseTo(solidMass(restored.contents, formula), 12);
      expect(fresh.suspensionOutflowApplied_g.get(formula)).toBeCloseTo(restored.precipitateOutflow_g![formula], 12);
    }
  });
});
