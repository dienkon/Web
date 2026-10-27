import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { partitionSodiumChloride } from '../src/engine/sodiumChloridePhase';
import { sodiumChlorideSolubilityRatio } from '../src/science/sodiumChlorideSolubility';
import { solidInventoryFraction } from '../src/engine/solidInventory';
import { computeMolarMass } from '../src/engine/ledger';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const amount = (formula: string, mass_g: number, phase: string): SubstanceContent => ({
  formula, mass_g, moles: mass_g / computeMolarMass(formula), phase,
});
const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'mix_inventory', name: 'Sample', type: 'beaker', position: [0, 0, 0], rotationY: 0,
  isLocked: false, capacity_ml: 250, volume_ml: 100, volume: 0.4, mass_g: 150,
  contents: [amount('H2O', 100, 'l'), amount('NaCl', 50, 's')], substances: ['H2O', 'NaCl'],
  temperature_c: 25, ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false, ...patch,
});
const mass = (v: VesselState, phase: string) => v.contents.filter(x => x.formula === 'NaCl' && x.phase === phase)
  .reduce((sum, x) => sum + x.mass_g, 0);
function relax(vessel: VesselState, stirred = false) {
  for (let i = 0; i < 1000; i++) vessel = { ...vessel, ...partitionSodiumChloride(vessel, 0.5, stirred) };
  return vessel;
}
const baseline = useAppStore.getState();
afterEach(() => { vi.useRealTimers(); useAppStore.setState(baseline); });

describe('Finite mixing and dissolution inventory', () => {
  it('keeps room-temperature dissolution running after the store pH projection becomes idle', () => {
    const initial = sample();
    useAppStore.setState({ vessels: { [initial.id]: initial }, burners: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 600; i++) useAppStore.getState().tickSimulation(0.1);
    const after = useAppStore.getState().vessels[initial.id];
    const water = after.contents.filter(x => x.formula === 'H2O' && x.phase === 'l')
      .reduce((sum, x) => sum + x.mass_g, 0);
    const saturation = water * sodiumChlorideSolubilityRatio(after.temperature_c)!;
    expect(mass(after, 'aq')).toBeCloseTo(saturation, 4);
    expect(mass(after, 's')).toBeGreaterThanOrEqual(14);
    expect(mass(after, 'aq') + mass(after, 's')).toBeCloseTo(50, 10);
    expect(after.mass_g + (after.evaporated_ml ?? 0)
      - (after.wallCondensation?.returned_g ?? 0)).toBeCloseTo(150, 8);
  });
  it('partitions at the IUPAC 25 C reference limit while conserving mass and moles', () => {
    const before = sample(), after = relax(before);
    expect(mass(after, 'aq')).toBeCloseTo(35.96770716635604, 8);
    expect(mass(after, 's')).toBeCloseTo(50 - 35.96770716635604, 8);
    expect(after.contents.reduce((s, x) => s + x.mass_g, 0)).toBeCloseTo(150, 10);
    expect(after.contents.reduce((s, x) => s + x.moles, 0))
      .toBeCloseTo(before.contents.reduce((s, x) => s + x.moles, 0), 10);
    expect(partitionSodiumChloride(after, 100)).toBeNull();
  });
  it('uses solvent mass rather than total solution volume', () => {
    const after = relax(sample({ volume_ml: 200, contents: [amount('H2O', 10, 'l'), amount('NaCl', 5, 's')] }));
    expect(mass(after, 'aq')).toBeCloseTo(3.596770716635604, 8);
    expect(mass(after, 's')).toBeCloseTo(5 - 3.596770716635604, 8);
  });
  it('stirring and grinding accelerate approach without changing saturation', () => {
    const base = sample(), stirred = partitionSodiumChloride(base, 1, true)!;
    expect(mass({ ...base, ...stirred }, 'aq')).toBeGreaterThan(mass({ ...base, ...partitionSodiumChloride(base, 1) }, 'aq'));
    expect(mass(relax({ ...base, isPulverized: true }, true), 'aq')).toBeCloseTo(mass(relax(base), 'aq'), 8);
  });
  it('crystallizes an initially oversaturated inventory without adding mass', () => {
    const after = relax(sample({ contents: [amount('H2O', 100, 'l'), amount('NaCl', 50, 'aq')] }));
    expect(mass(after, 's')).toBeCloseTo(50 - 35.96770716635604, 8);
  });
  it('does not guess unknown temperatures, solvent, mixtures, or filter-cake equilibria', () => {
    for (const patch of [
      { temperature_c: -1 }, { temperature_c: 101 }, { volume_ml: 0 }, { immiscibleOrganicVolume_ml: 10 },
      { contents: [amount('H2O', 100, 'l'), amount('NaCl', 50, 's'), amount('HCl', 1, 'aq')] },
      { contents: [{ ...amount('NaCl', 50, 's'), location: 'filter' as const }, amount('H2O', 100, 'l')] },
      { contents: [amount('NaCl', 50, 's')] },
    ]) expect(partitionSodiumChloride(sample(patch), 1)).toBeNull();
  });
  it('matches independent rounded IUPAC molality table values across the supported interval', () => {
    for (const [kelvin, molality] of [[275, 6.099], [300, 6.163], [350, 6.503], [370, 6.684]]) {
      expect(sodiumChlorideSolubilityRatio(kelvin - 273.15)! * 1000 / 58.44)
        .toBeCloseTo(molality, 3);
    }
    expect(sodiumChlorideSolubilityRatio(NaN)).toBeUndefined();
    expect(sodiumChlorideSolubilityRatio(Infinity)).toBeUndefined();
    const warm = relax(sample({ temperature_c: 76.85 }));
    expect(mass(warm, 'aq')).toBeCloseTo(38.00552904859223, 8);
    const cool = relax({ ...warm, temperature_c: 25 });
    expect(mass(cool, 'aq')).toBeCloseTo(35.96770716635604, 8);
    expect(mass(cool, 's') + mass(cool, 'aq')).toBeCloseTo(50, 10);
  });
  it('renders only the solid phase and preserves hydroxide formula groups', () => {
    expect(solidInventoryFraction([amount('Cu(OH)2', 1, 'aq'), amount('Cu(OH)2', 1, 's')], 'Cu(OH)2')).toBeCloseTo(0.5);
    expect(solidInventoryFraction([amount('CuO', 1, 's')], 'Cu(OH)2')).toBe(0);
    expect(solidInventoryFraction([{ ...amount('NaCl', 1, 's'), location: 'filter' }], 'NaCl')).toBe(0);
  });
  it('stirring cannot reseed exhausted reagent labels or restart gas effects', () => {
    vi.useFakeTimers();
    const vessel = sample({ substances: ['Zn', 'HCl', 'ZnCl2'], contents: [amount('H2O', 100, 'l'), amount('ZnCl2', 1, 'aq')] });
    useAppStore.setState({ vessels: { [vessel.id]: vessel }, activeKinetics: {}, dissolvingSubstances: { [vessel.id]: { Zn: 0.2 } } });
    useAppStore.getState().stirVessel(vessel.id);
    expect(useAppStore.getState().vessels[vessel.id]).toEqual(vessel);
    expect(useAppStore.getState().activeKinetics).toEqual({});
    expect(useAppStore.getState().dissolvingSubstances[vessel.id].Zn).toBe(0.2);
    vi.advanceTimersByTime(2500);
    expect(useAppStore.getState().stirringVesselId).toBeNull();
  });
  it('inverting a stoppered flask preserves all solid and precipitate inventory', () => {
    vi.useFakeTimers();
    const vessel = sample({ type: 'volumetric_flask', isSealed: true, hasPrecipitate: true });
    useAppStore.setState({ vessels: { [vessel.id]: vessel } });
    useAppStore.getState().invertVolumetricFlask(vessel.id);
    expect(useAppStore.getState().vessels[vessel.id]).toEqual(vessel);
    expect(useAppStore.getState().stirringVesselId).toBe(vessel.id);
    vi.runAllTimers();
  });
  it('grinds only actual solid in a mortar and conserves quantities', () => {
    const vessel = sample({ type: 'mortar_pestle' });
    useAppStore.setState({ vessels: { [vessel.id]: vessel } });
    useAppStore.getState().grindMortar(vessel.id);
    expect(useAppStore.getState().vessels[vessel.id].isPulverized).toBe(true);
    expect(useAppStore.getState().vessels[vessel.id].contents).toEqual(vessel.contents);
    const beaker = sample();
    useAppStore.setState({ vessels: { [beaker.id]: beaker } });
    useAppStore.getState().grindMortar(beaker.id);
    expect(useAppStore.getState().vessels[beaker.id]).toEqual(beaker);
  });
});
