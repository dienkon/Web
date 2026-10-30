import { afterEach, describe, expect, it } from 'vitest';
import { planMetalAcid, metalAcidProgressRate, advanceMetalAcidProgress } from '../src/engine/metalAcidPlan';
import { stockLiquidAliquot } from '../src/engine/stockAddition';
import { findChemical } from '../src/data/chemicals';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { computeMolarMass } from '../src/engine/ledger';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { useAppStore } from '../src/store/useAppStore';
import { getProgramById } from '../src/vfx/programs/library';
import { getReactionVfxRecipe } from '../src/vfx/recipes/reactionVfx';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
function specimen(metal = 'Zn', mass_g = 0.1, acidMoles = 0.05): VesselState {
  const acid = stockLiquidAliquot(findChemical('HCl'), 'HCl', 50, 25);
  acid.contents[0].moles = acidMoles;
  acid.contents[0].mass_g = acidMoles * computeMolarMass('HCl');
  acid.contents[1].mass_g = acid.mass_g - acid.contents[0].mass_g;
  acid.contents[1].moles = acid.contents[1].mass_g / 18.015;
  return { id: 'metal_acid', name: 'Metal and acid', type: 'beaker', capacity_ml: 100,
    position: [0, -0.135, 0], rotationY: 0, isLocked: false, volume_ml: 50, volume: 0.5,
    contents: [...acid.contents, { formula: metal, phase: 's', mass_g, moles: mass_g / computeMolarMass(metal) }],
    substances: [metal, 'HCl', 'H2O'], mass_g: acid.mass_g + mass_g, temperature_c: 25, ph: 1,
    hasGas: false, hasPrecipitate: false, isBoiling: false };
}
const moles = (vessel: VesselState, formula: string) => vessel.contents.filter(item => item.formula === formula).reduce((sum, item) => sum + item.moles, 0);

describe('Metal/HCl inventory advances with reaction extent', () => {
  for (const metal of ['Mg', 'Zn', 'Fe']) it(`keeps ${metal} and acid present until time advances, then produces the stoichiometric H2 amount`, () => {
    const input = specimen(metal), plan = planMetalAcid(input, 'vi')!;
    expect(plan.kinetics.rateModel).toBe('metal_hcl');
    expect(moles(plan.vessel, metal)).toBe(moles(input, metal));
    expect(plan.vessel.escapedGas_g).toBeUndefined();
    expect(plan.vessel.temperature_c).toBe(25);
    const p = advanceMetalAcidProgress(plan.kinetics, input, 0.1);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.5);
    const step = { ...input, ...applyProgramWithThermalSinks(plan.kinetics.program!, input, input, p, 0.1) };
    const consumedMetal = moles(input, metal) - moles(step, metal);
    expect(moles(input, 'HCl') - moles(step, 'HCl')).toBeCloseTo(2 * consumedMetal, 12);
    expect(step.escapedGas_g!.H2 / 2.016).toBeCloseTo(consumedMetal, 12);
    expect(step.mass_g + step.escapedGas_g!.H2).toBeCloseTo(input.mass_g, 10);
    expect(step.temperature_c).toBeGreaterThan(25);
  });
  it('uses the same progressive chemistry after an aliquot reaches the metal', () => {
    const input = specimen();
    const result = reactAliquotMixture(input, 'vi', false);
    expect(result.kinetics?.rateModel).toBe('metal_hcl');
    expect(moles(result.vessel, 'Zn')).toBe(moles(input, 'Zn'));
    expect(moles(result.vessel, 'ZnCl2')).toBe(0);
  });
  it('responds to concentration, actual temperature, grinding and stirring while slowing as acid is used', () => {
    const input = specimen(), plan = planMetalAcid(input, 'vi')!, k = plan.kinetics;
    const reference = metalAcidProgressRate(k, input);
    expect(metalAcidProgressRate(k, { ...input, temperature_c: 35 })).toBeGreaterThan(reference);
    expect(metalAcidProgressRate(k, { ...input, isPulverized: true })).toBeGreaterThan(reference);
    expect(metalAcidProgressRate(k, input, true)).toBeGreaterThan(reference);
    const dilute = specimen('Zn', 0.1, 0.025), dilutePlan = planMetalAcid(dilute, 'vi')!;
    expect(metalAcidProgressRate(dilutePlan.kinetics, dilute)).toBeLessThan(reference);
    const limitingAcid = specimen('Zn', 1, 0.001), limited = planMetalAcid(limitingAcid, 'vi')!;
    expect(metalAcidProgressRate(limited.kinetics, limitingAcid, false, 0.99))
      .toBeLessThan(metalAcidProgressRate(limited.kinetics, limitingAcid, false, 0.1));
  });
  it('retains metal excess and never produces more H2 than the finite acid permits', () => {
    const input = specimen('Zn', 1, 0.001), k = planMetalAcid(input, 'vi')!.kinetics;
    const end = { ...input, ...applyProgramWithThermalSinks(k.program!, input, input, 1) };
    expect(moles(end, 'Zn')).toBeCloseTo(moles(input, 'Zn') - 0.0005, 12);
    expect(moles(end, 'HCl')).toBeCloseTo(0, 12);
    expect(end.escapedGas_g!.H2).toBeCloseTo(0.0005 * 2.016, 12);
    const replay = { ...end, ...applyProgramWithThermalSinks(k.program!, input, end, 1) };
    expect(replay.escapedGas_g!.H2).toBe(end.escapedGas_g!.H2);
    expect(replay.programHeatApplied_J).toBe(end.programHeatApplied_J);
  });
  it('does not infer the simple H2 path for oxidizing acids, competing salts or dissolved metal', () => {
    const input = specimen();
    const extra = (formula: string) => ({ ...input, contents: [...input.contents, { formula, phase: 'aq', moles: 0.01, mass_g: 1 }] });
    expect(planMetalAcid(extra('HNO3'), 'vi')).toBeNull();
    expect(planMetalAcid(extra('CuSO4'), 'vi')).toBeNull();
    expect(planMetalAcid({ ...input, contents: input.contents.map(item => item.formula === 'Zn' ? { ...item, phase: 'aq' } : item) }, 'vi')).toBeNull();
    expect(planMetalAcid({ ...input, volume_ml: 0 }, 'vi')).toBeNull();
  });
  it('integrates consistently across frame subdivision and remains paused for zero time', () => {
    const input = specimen(), k = planMetalAcid(input, 'vi')!.kinetics;
    const one = advanceMetalAcidProgress(k, input, 1);
    let many = 0;
    for (let i = 0; i < 100; i++) many = advanceMetalAcidProgress({ ...k, progress: many }, input, 0.01);
    expect(one).toBeCloseTo(many, 8);
    expect(advanceMetalAcidProgress({ ...k, progress: 0.4 }, input, 0)).toBe(0.4);
  });
  it('does not declare steam, foam or white H2 smoke as an automatic Mg/Zn reaction effect', () => {
    for (const id of ['mg_hcl', 'zn_hcl']) {
      expect(getProgramById(id)!.visual.timeline.some(atom => ['thermalSteam', 'buoyantGasPlume'].includes(atom.atom))).toBe(false);
      const recipe = getReactionVfxRecipe(id + '_gas')!;
      expect(recipe.steam).toBeUndefined();
      expect(recipe.foam).toBeUndefined();
      expect(recipe.gasPlume).toBeUndefined();
    }
  });
  it('runs the complete direct-stock path progressively, respects pause, and keeps emitted gas finite', async () => {
    const input = specimen();
    const empty = { ...input, contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0 };
    useAppStore.setState({ vessels: { [input.id]: empty }, vesselIds: [input.id], burners: {}, spills: {},
      activeKinetics: {}, pendingReactions: {}, isSimulationPaused: false, timeScale: 1 });
    await useAppStore.getState().mixSubstances(input.id, 'Zn', 0.1);
    await useAppStore.getState().mixSubstances(input.id, 'HCl', 50);
    const started = useAppStore.getState().vessels[input.id];
    expect(moles(started, 'ZnCl2')).toBe(0);
    expect(moles(started, 'Zn')).toBeCloseTo(0.1 / 65.38, 12);
    useAppStore.setState({ isSimulationPaused: true });
    useAppStore.getState().tickSimulation(1);
    expect(useAppStore.getState().vessels[input.id]).toBe(started);
    useAppStore.setState({ isSimulationPaused: false });
    for (let i = 0; i < 5; i++) useAppStore.getState().tickSimulation(0.1);
    expect(moles(useAppStore.getState().vessels[input.id], 'Zn')).toBeGreaterThan(0);
    expect(moles(useAppStore.getState().vessels[input.id], 'ZnCl2')).toBeGreaterThan(0);
    for (let i = 0; i < 600; i++) useAppStore.getState().tickSimulation(0.1);
    const end = useAppStore.getState().vessels[input.id];
    expect(useAppStore.getState().activeKinetics[input.id]).toBeUndefined();
    expect(moles(end, 'Zn')).toBeCloseTo(0, 10);
    expect(end.escapedGas_g!.H2).toBeCloseTo(0.1 / 65.38 * 2.016, 10);
    expect(end.mass_g + end.escapedGas_g!.H2).toBeCloseTo(51.1, 8);
    expect(end.hasGas).toBe(false);
  });
});
