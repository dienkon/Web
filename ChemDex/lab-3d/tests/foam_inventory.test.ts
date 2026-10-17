import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { stepFoamInventory, FOAM_SURFACTANT } from '../src/engine/foamInventory';
import { projectEscapedGas } from '../src/engine/gasInventory';
import { createStudioSample } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import type { VesselState } from '../src/types/chemistry';

const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));
function setup(stabilized = true) {
  useAppStore.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, spills: {}, isSimulationPaused: false, timeScale: 1 });
  const id = useAppStore.getState().prepareStudioProgram('h2o2_mno2', stabilized ? 'oxygen_foam' : undefined)!;
  const initial = useAppStore.getState().vessels[id];
  useAppStore.getState().runStudioProgram(id);
  return { id, initial };
}
function closedMass(initial: VesselState, current: VesselState) {
  expect(current.contents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(current.mass_g, 8);
  expect(current.mass_g + Object.values(current.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0)).toBeCloseTo(initial.mass_g, 8);
}
function heldMass(vessel: VesselState) {
  return vessel.contents.filter(item => item.location === 'foam').reduce((sum, item) => sum + item.mass_g, 0);
}

describe('Finite oxygen foam inventory', () => {
  it('keeps retained plus escaped oxygen bounded throughout real simulation ticks', () => {
    const { id, initial } = setup();
    let lastTotal = 0;
    let observedFoam = false;
    for (let frame = 0; frame < 100; frame++) {
      useAppStore.getState().tickSimulation(0.1);
      const sample = useAppStore.getState().vessels[id];
      const total = heldMass(sample) + (sample.escapedGas_g?.O2 ?? 0);
      expect(total).toBeGreaterThanOrEqual(lastTotal - 1e-12);
      expect(total).toBeLessThanOrEqual(0.001 * 31.998 + 1e-10);
      expect(sample.contents.find(item => item.formula === FOAM_SURFACTANT)!.mass_g).toBe(0.2);
      closedMass(initial, sample);
      observedFoam ||= (sample.foam_ml ?? 0) > 0;
      lastTotal = total;
    }
    expect(observedFoam).toBe(true);
    expect(useAppStore.getState().activeKinetics[id]).toBeUndefined();
    expect(lastTotal).toBeCloseTo(0.001 * 31.998, 10);
  });
  it('does not grow persistent foam from the reaction name without surfactant', () => {
    const { id, initial } = setup(false);
    for (let frame = 0; frame < 100; frame++) useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), end = state.vessels[id];
    expect(end.foam_ml).toBe(0);
    expect(heldMass(end)).toBe(0);
    expect(end.escapedGas_g!.O2).toBeCloseTo(0.001 * 31.998, 10);
    expect(state.activeKinetics[id]).toBeUndefined();
    expect(Object.keys(state.spills)).toHaveLength(0);
    closedMass(initial, end);
  });
  it('prepares explicit surfactant and retains only a finite part of real oxygen during forward seeks', () => {
    const { id, initial } = setup();
    expect(initial.contents.find(item => item.formula === FOAM_SURFACTANT)!.mass_g).toBe(0.2);
    expect(initial.foam_ml).toBe(0);
    for (const progress of [0.2, 0.5, 1]) {
      useAppStore.getState().seekStudioProgram(id, progress);
      const sample = useAppStore.getState().vessels[id];
      expect(sample.foam_ml).toBeGreaterThan(0);
      expect(heldMass(sample)).toBeGreaterThan(0);
      expect(heldMass(sample) + sample.escapedGas_g!.O2).toBeCloseTo(progress * 0.001 * 31.998, 10);
      expect(projectEscapedGas(sample)).toBeNull();
      closedMass(initial, sample);
    }
    const end = useAppStore.getState().vessels[id];
    expect(end.hasGas).toBe(false);
    expect(useAppStore.getState().activeKinetics[id]).toBeUndefined();
  });
  it('releases retained gas as foam drains after chemistry stops and never refills exhausted peroxide', () => {
    const { id, initial } = setup();
    useAppStore.getState().seekStudioProgram(id, 1);
    const foamy = useAppStore.getState().vessels[id];
    useAppStore.setState({ timeScale: 8 });
    for (let frame = 0; frame < 160; frame++) useAppStore.getState().tickSimulation(0.1);
    const end = useAppStore.getState().vessels[id];
    expect(end.foam_ml).toBe(0);
    expect(heldMass(end)).toBe(0);
    expect(end.escapedGas_g!.O2).toBeCloseTo(0.001 * 31.998, 10);
    expect(end.mass_g).toBeLessThan(foamy.mass_g);
    expect(useAppStore.getState().runStudioProgram(id)).toBe(false);
    closedMass(initial, end);
  });
  it('does not capture the same gas twice when seeking to the current progress', () => {
    const { id } = setup();
    useAppStore.getState().seekStudioProgram(id, 0.5);
    const previous = useAppStore.getState().vessels[id];
    useAppStore.getState().seekStudioProgram(id, 0.5);
    const current = useAppStore.getState().vessels[id];
    expect(heldMass(current)).toBeCloseTo(heldMass(previous), 12);
    expect(current.escapedGas_g!.O2).toBeCloseTo(previous.escapedGas_g!.O2, 12);
    expect(current.mass_g).toBeCloseTo(previous.mass_g, 12);
  });
  it('vents excess gas at capacity without inventing liquid spills', () => {
    const { id, initial } = setup();
    // Capacity is a boundary of this virtual vessel, not added source liquid.
    useAppStore.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], capacity_ml: 31 } },
      activeKinetics: { ...s.activeKinetics, [id]: { ...s.activeKinetics[id],
        initialVesselBaseline: { ...s.activeKinetics[id].initialVesselBaseline!, capacity_ml: 31 } } } }));
    useAppStore.getState().seekStudioProgram(id, 1);
    const end = useAppStore.getState().vessels[id];
    expect(end.foam_ml).toBeLessThanOrEqual(1.00000001);
    expect(end.volume_ml).toBe(30);
    expect(Object.keys(useAppStore.getState().spills)).toHaveLength(0);
    closedMass(initial, end);
  });
  it('collapses unsupported foam into the escape budget if water or stabilizer is absent', () => {
    const { id } = setup();
    useAppStore.getState().seekStudioProgram(id, 1);
    const sample = useAppStore.getState().vessels[id];
    for (const formula of ['H2O', FOAM_SURFACTANT]) {
      const contents = sample.contents.filter(item => item.formula !== formula);
      const changed = { ...sample, contents, mass_g: contents.reduce((sum, item) => sum + item.mass_g, 0) };
      const patch = stepFoamInventory(changed, changed, 0.1)!;
      expect(patch.foam_ml).toBe(0);
      expect(patch.escapedGas_g!.O2).toBeCloseTo(sample.escapedGas_g!.O2 + heldMass(sample), 10);
      expect(patch.mass_g).toBeCloseTo(changed.mass_g - heldMass(sample), 10);
    }
  });
  it('converts foam gas to sealed headspace without losing its mass', () => {
    const { id } = setup();
    useAppStore.getState().seekStudioProgram(id, 1);
    const sample = { ...useAppStore.getState().vessels[id], isSealed: true };
    const patch = stepFoamInventory(sample, sample, 0.1)!;
    expect(patch.foam_ml).toBe(0);
    expect(patch.contents!.some(item => item.phase === 'g' && item.location === 'bulk')).toBe(true);
    expect(patch.contents!.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(sample.mass_g, 10);
    expect(patch.escapedGas_g).toBeUndefined();
  });
  it('rejects applying the authored foam variant to unrelated reactions', () => {
    const { initial } = setup();
    expect(() => createStudioSample(getProgramById('zn_hcl')!, initial, 'oxygen_foam')).toThrow();
  });
});
