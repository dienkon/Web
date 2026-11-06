import { afterEach, describe, expect, it } from 'vitest';
import type { SpillState, VesselState } from '../src/types/chemistry';
import { applyThermalEnergy, sampleHeatCapacity, aqueousBoilingPoint } from '../src/engine/thermalState';
import { waterLatentHeatJ_G, WATER_CP_J_G_K, WATER_FUSION_J_G } from '../src/engine/waterProperties';
import { stepSpillChemistry, stepWorkbenchSpills } from '../src/engine/spillChemistry';
import { mergeWorkbenchSpill, mergeWorkbenchSpillBatch } from '../src/engine/spillInventory';
import { createStudioSample } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { applyProgramToLedger, computeMolarMass, parseChemicalFormula } from '../src/engine/ledger';
import { useAppStore } from '../src/store/useAppStore';
import { runContactScenario } from '../src/vfx/dev/contactScenarios';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';

const beforeStore = useAppStore.getState();
afterEach(() => useAppStore.setState(beforeStore, true));
const shell: VesselState = { id: 'hot-pool', name: 'Hot sample', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  mass_g: 0, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
const row = (formula: string, moles: number, phase = 'aq') => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
const pureWater = (grams: number, temperature_c: number): VesselState => ({ ...shell,
  mass_g: grams, volume_ml: grams, temperature_c, contents: [row('H2O', grams / 18.015, 'l')], substances: ['H2O'] });
const copper = (): VesselState => ({ ...createStudioSample(getProgramById('cuso4_naoh')!, shell), temperature_c: 99.9 });
const puddle = (v = copper()): SpillState => ({ id: v.id, position: [0, -1.175, 0], volume_ml: v.volume_ml,
  mass_g: v.mass_g, temperature_c: v.temperature_c, contents: v.contents, substances: v.substances,
  radius: 1, color: v.liquidColor ?? '#fff', isHazard: true, timestamp: 0 });
const mass = (gases: Record<string, number> | undefined) => Object.values(gases ?? {}).reduce((s, g) => s + g, 0);
function elements(spill: SpillState, gases = spill.escapedGas_g) {
  const totals: Record<string, number> = {};
  const rows = [...(spill.contents ?? []), ...Object.entries(gases ?? {}).map(([formula, grams]) => row(formula, grams / computeMolarMass(formula), 'g'))];
  for (const c of rows) for (const [atom, n] of Object.entries(parseChemicalFormula(c.formula)))
    totals[atom] = (totals[atom] ?? 0) + n * c.moles;
  return totals;
}

describe('Uncontained water shares the finite phase solver without phantom glass', () => {
  it('spends exactly sensible heat plus latent heat on a known vapor parcel', () => {
    const v = pureWater(10, 99), tb = aqueousBoilingPoint(v), latent = waterLatentHeatJ_G(tb);
    const energy = 10 * WATER_CP_J_G_K * (tb - 99) + 0.5 * latent;
    const out = applyThermalEnergy(v, energy, 1, 0, { containerHeatCapacity_J_K: 0 });
    expect(out.evaporatedStep_g).toBeCloseTo(0.5, 11);
    expect(out.temperature_c).toBeCloseTo(tb, 10);
    expect(out.mass_g).toBeCloseTo(9.5, 11);
    expect(out.thermalVaporEnthalpy_J).toBeCloseTo(0.5 * (latent + WATER_CP_J_G_K * tb), 8);
    expect(out.storedSensibleEnergyChange_J + out.thermalVaporEnthalpy_J!).toBeCloseTo(energy, 8);
    expect(applyThermalEnergy(v, energy).evaporatedStep_g).toBeLessThan(0.5);
  });
  it('meters excess energy after complete dryout without heating a nonexistent beaker or dividing by zero', () => {
    const v = pureWater(1, 100); v.temperature_c = aqueousBoilingPoint(v);
    const out = applyThermalEnergy(v, waterLatentHeatJ_G(v.temperature_c) + 123, 1, 0, { containerHeatCapacity_J_K: 0 });
    expect(out.mass_g).toBe(0); expect(out.volume_ml).toBe(0);
    expect(out.temperature_c).toBe(v.temperature_c);
    expect(out.thermalEnergyOutsideModel_J).toBeCloseTo(123, 9);
    const empty = { ...v, ...out };
    const more = applyThermalEnergy(empty, 10, 1, 0, { containerHeatCapacity_J_K: 0 });
    expect(more.temperature_c).toBe(v.temperature_c);
    expect(more.thermalEnergyOutsideModel_J).toBeCloseTo(133, 9);
  });
  it('uses the same zero-container reference during pure-water freezing', () => {
    const v = pureWater(10, 20), heat = -10 * WATER_CP_J_G_K * 20 - WATER_FUSION_J_G;
    const out = applyThermalEnergy(v, heat, 1, 0, { containerHeatCapacity_J_K: 0 });
    expect(out.temperature_c).toBe(0);
    expect(out.contents!.find(c => c.phase === 's')!.mass_g).toBeCloseTo(1, 11);
    expect(out.volume_ml).toBeCloseTo(9, 11);
  });
});

describe('Reaction heat, boiling and atmosphere ownership on the workbench', () => {
  it('advances a hot precipitation across boiling, conserves atoms and records both sensible and latent heat', () => {
    const v = copper(), initial = puddle(v), out = stepSpillChemistry(initial, 0.1);
    expect(out.contents!.some(c => c.formula === 'Cu(OH)2' && c.mass_g > 0)).toBe(true);
    expect(out.escapedGas_g!.H2O).toBeGreaterThan(0);
    expect(out.vaporRate_g_s).toBeCloseTo(out.escapedGas_g!.H2O / 0.1, 10);
    expect(out.gasRate_mol_s).toBe(0);
    expect(out.mass_g + mass(out.escapedGas_g)).toBeCloseTo(initial.mass_g, 9);
    expect(out.volume_ml).toBeCloseTo(initial.volume_ml - out.escapedGas_g!.H2O, 10);
    expect(out.temperature_c).toBeCloseTo(aqueousBoilingPoint({ ...v, contents: out.contents! }), 8);
    expect(out.chemistryLimit).toBeUndefined();
    const program = getProgramById('cuso4_naoh')!, progress = -Math.expm1(-Math.LN2 * 0.1 / program.chemistry.kinetics.halfTime_s);
    const reacted = { ...v, ...applyProgramToLedger(program, v, progress, { deferThermal: true }) };
    const stored = sampleHeatCapacity({ ...v, contents: out.contents!, mass_g: out.mass_g }, 0) * out.temperature_c!
      - sampleHeatCapacity(reacted, 0) * initial.temperature_c!;
    expect(stored + out.thermalVaporEnthalpy_J!).toBeCloseTo(out.reactionHeat_J!, 7);
    for (const [atom, value] of Object.entries(elements(initial))) expect(elements(out)[atom], atom).toBeCloseTo(value, 10);
  });
  it('moves water vapor into the persistent atmosphere ledger exactly once over repeated steps', () => {
    const initial = puddle(); let pools = { [initial.id]: initial }, gases: Record<string, number> = {};
    for (let i = 0; i < 35; i++) {
      const step = stepWorkbenchSpills(pools, 0.1); pools = step.spills;
      for (const [formula, grams] of Object.entries(step.escapedGas_g)) gases[formula] = (gases[formula] ?? 0) + grams;
      expect(pools[initial.id].escapedGas_g).toBeUndefined();
      expect(pools[initial.id].mass_g + mass(gases)).toBeCloseTo(initial.mass_g, 9);
      for (const [atom, value] of Object.entries(elements(initial))) expect(elements(pools[initial.id], gases)[atom], atom).toBeCloseTo(value, 9);
    }
    expect(gases.H2O).toBeGreaterThan(0);
  });
  it('does not let unknown solution VLE or a salt freezing crossing evade a NaN boundary', () => {
    for (const v of [{ ...shell, volume_ml: 1, mass_g: 2, temperature_c: 99.9,
      contents: [row('HCl', 0.01), row('NaOH', 0.001), row('H2O', 1 / 18.015, 'l')], substances: ['HCl', 'NaOH', 'H2O'] },
    { ...shell, volume_ml: 1, mass_g: 1, temperature_c: 0.001,
      contents: [row('MgCl2', 0.001), row('NaOH', 0.002), row('H2O', 0.5 / 18.015, 'l')], substances: ['MgCl2', 'NaOH', 'H2O'] }]) {
      const initial = puddle(v), out = stepSpillChemistry(initial, 1);
      expect(out.chemistryLimit).toBe('phase_boundary');
      expect(out.contents).toBe(initial.contents); expect(out.temperature_c).toBe(initial.temperature_c);
      expect(out.vaporRate_g_s).toBe(0);
    }
  });
  it('uses room pressure for the same puddle boiling boundary', () => {
    const initial = puddle(), low = { ...DEFAULT_LAB_ENVIRONMENT, pressure_atm: 0.7 };
    const normal = stepSpillChemistry(initial, 0.1), reduced = stepSpillChemistry(initial, 0.1, low);
    expect(reduced.temperature_c).toBeLessThan(normal.temperature_c!);
    expect(reduced.escapedGas_g!.H2O).toBeGreaterThan(normal.escapedGas_g!.H2O);
    expect(reduced.mass_g + mass(reduced.escapedGas_g)).toBeCloseTo(initial.mass_g, 9);
  });
  it('retains cumulative heat receipts on both single and batch merging without replaying emission rates', () => {
    const hot = stepSpillChemistry(puddle(), 0.1), cool = pureWater(1, 25);
    const single = mergeWorkbenchSpill({ [hot.id]: hot }, hot.position, 1, cool.substances, '#fff', '', 1, cool.contents);
    const batch = mergeWorkbenchSpillBatch({ [hot.id]: hot }, [hot.position], {
      volume_ml: 1, mass_g: 1, temperature_c: 25, color: '#fff', contents: cool.contents, substances: cool.substances });
    for (const pools of [single, batch]) {
      expect(Object.values(pools)).toHaveLength(1);
      const result = Object.values(pools)[0];
      expect(result.reactionHeat_J).toBe(hot.reactionHeat_J);
      expect(result.thermalVaporEnthalpy_J).toBe(hot.thermalVaporEnthalpy_J);
      expect(result.vaporRate_g_s).toBe(0);
      const oldCapacity = sampleHeatCapacity({ ...shell, mass_g: hot.mass_g, volume_ml: hot.volume_ml, contents: hot.contents }, 0);
      expect((oldCapacity + WATER_CP_J_G_K) * result.temperature_c!)
        .toBeCloseTo(oldCapacity * hot.temperature_c! + WATER_CP_J_G_K * 25, 8);
    }
  });
  it('stops water and reaction gas emission when the source is exhausted', () => {
    const v = pureWater(1, 25), initial = puddle(v);
    const out = stepSpillChemistry({ ...initial, gasRate_mol_s: 1, vaporRate_g_s: 1 }, 0.1);
    expect(out.gasRate_mol_s).toBe(0); expect(out.vaporRate_g_s).toBe(0);
  });
  it('runs the Studio shortcut through the real store, freezes at Pause and preserves vapor after cleanup', async () => {
    useAppStore.setState({ vessels: { [shell.id]: shell }, vesselIds: [shell.id], spills: {}, workbenchEscapedGas_g: {},
      burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, inFlightPours: [],
      isSimulationPaused: false, timeScale: 1, wasteMass_g: 0, wasteContents: [] });
    await runContactScenario(shell.id, 'spill_boiling');
    const totalMass = Object.values(useAppStore.getState().spills).reduce((s, p) => s + p.mass_g, 0);
    for (let i = 0; i < 6; i++) useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), escaped = state.workbenchEscapedGas_g.H2O;
    expect(escaped).toBeGreaterThan(0);
    state.setSimulationPaused(true);
    const paused = useAppStore.getState().spills;
    useAppStore.getState().tickSimulation(0.5);
    expect(useAppStore.getState().spills).toBe(paused);
    state.cleanSpills();
    expect(useAppStore.getState().workbenchEscapedGas_g.H2O).toBe(escaped);
    expect(useAppStore.getState().wasteMass_g + escaped).toBeCloseTo(totalMass, 9);
  });
});
