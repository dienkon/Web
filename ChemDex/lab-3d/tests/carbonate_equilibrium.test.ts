import { afterEach, describe, expect, it } from 'vitest';
import { solveAqueousEquilibrium } from '../src/science/aqueousEquilibrium';
import { CARBONATE_CONSTANTS_25C, carbonateFractions } from '../src/science/carbonateEquilibrium';
import { calciteEquilibriumTarget, partitionCalcite } from '../src/engine/calcitePhase';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { stockLiquidAliquot } from '../src/engine/stockAddition';
import { findChemical } from '../src/data/chemicals';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { useAppStore } from '../src/store/useAppStore';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const item = (formula: string, moles: number, phase = 'aq'): SubstanceContent =>
  ({ formula, phase, moles, mass_g: moles * computeMolarMass(formula) });
function specimen(solid_g = 1, dissolvedCO2_mol = 0): VesselState {
  const contents = [item('H2O', 100 / 18.015, 'l'), item('CaCO3', solid_g / computeMolarMass('CaCO3'), 's'),
    item('CO2', dissolvedCO2_mol)];
  return { id: 'calcite', name: 'Calcite', type: 'beaker', capacity_ml: 250, position: [0, -0.135, 0],
    rotationY: 0, isLocked: false, contents, substances: ['H2O', 'CaCO3', 'CO2'], volume_ml: 100, volume: 0.4,
    mass_g: contents.reduce((sum, entry) => sum + entry.mass_g, 0), temperature_c: 25, ph: 7,
    hasPrecipitate: true, precipitateSubstance: 'CaCO3', precipitateMorphology: 'fine_powder',
    precipitateAmount_g: solid_g, turbidity: 0.8, hasGas: false, isBoiling: false };
}
const amount = (contents: SubstanceContent[], phase: string) => contents.filter(entry => entry.formula === 'CaCO3' && entry.phase === phase)
  .reduce((sum, entry) => sum + entry.moles, 0);
function conserved(before: SubstanceContent[], after: SubstanceContent[]) {
  const atoms = (contents: SubstanceContent[]) => {
    const result: Record<string, number> = {};
    for (const entry of contents) for (const [symbol, count] of Object.entries(readComposition(entry.formula).atoms)) {
      result[symbol] = (result[symbol] ?? 0) + count * entry.moles;
    }
    return result;
  };
  const a = atoms(before), b = atoms(after);
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) expect(b[key] ?? 0).toBeCloseTo(a[key] ?? 0, 10);
  expect(after.reduce((sum, entry) => sum + entry.mass_g, 0)).toBeCloseTo(before.reduce((sum, entry) => sum + entry.mass_g, 0), 8);
}

describe('Carbonate aqueous speciation at the 25 C reference', () => {
  it('predicts bicarbonate amphiprotic pH and carbonate hydrolysis instead of fixed neutral pH', () => {
    const bicarbonate = solveAqueousEquilibrium([item('NaHCO3', 0.001)], 100)!;
    expect(bicarbonate.ph).toBeGreaterThan(8.30);
    expect(bicarbonate.ph).toBeLessThan(8.38);
    const carbonate = solveAqueousEquilibrium([item('Na2CO3', 0.001)], 100)!;
    expect(carbonate.ph).toBeGreaterThan(11.0);
    expect(carbonate.ph).toBeLessThan(11.3);
    expect(carbonate.chargeResidual_M).toBeCloseTo(0, 12);
  });
  it('acidifies dissolved CO2 water, retains carbon totals, and ignores gas-phase CO2', () => {
    const result = solveAqueousEquilibrium([item('CO2', 0.001)], 100)!;
    expect(result.ph).toBeCloseTo(4.18, 2);
    expect(result.carbonDioxide_M + result.bicarbonate_M + result.carbonate_M).toBeCloseTo(0.01, 12);
    expect(solveAqueousEquilibrium([item('H2O', 1, 'l'), item('CO2', 0.001, 'g')], 100)!.ph).toBeCloseTo(7, 10);
  });
  it('matches the two acid dissociation ratios and charge balance across carbonate buffer titration', () => {
    for (const acid of [0, 0.0005, 0.001, 0.0015, 0.002, 0.003]) {
      const equilibrium = solveAqueousEquilibrium([item('Na2CO3', 0.001), item('HCl', acid)], 100)!;
      expect(equilibrium.chargeResidual_M).toBeCloseTo(0, 12);
      expect(equilibrium.hydrogen_M * equilibrium.bicarbonate_M / equilibrium.carbonDioxide_M)
        .toBeCloseTo(CARBONATE_CONSTANTS_25C.ka1, 14);
      expect(equilibrium.hydrogen_M * equilibrium.carbonate_M / equilibrium.bicarbonate_M)
        .toBeCloseTo(CARBONATE_CONSTANTS_25C.ka2, 16);
      const fractions = carbonateFractions(equilibrium.hydrogen_M);
      expect(fractions.carbonDioxide + fractions.bicarbonate + fractions.carbonate).toBeCloseTo(1, 12);
    }
  });
  it('exposes a prepared CO2(aq) shelf stock with solvent and finite carbon inventory', () => {
    const stock = stockLiquidAliquot(findChemical('CO2(aq)'), 'CO2(aq)', 50, 25);
    expect(stock.contents[0].phase).toBe('aq');
    expect(stock.contents[0].moles).toBeCloseTo(0.0005, 12);
    expect(stock.contents.reduce((sum, entry) => sum + entry.mass_g, 0)).toBeCloseTo(stock.mass_g, 12);
  });
  it('does not let the pH solver suppress a known precipitation after an aliquot arrives', () => {
    const contents = [item('H2O', 100 / 18.015, 'l'), item('CaCl2', 0.001), item('Na2CO3', 0.001)];
    const input = { ...specimen(0), contents, substances: ['H2O', 'CaCl2', 'Na2CO3'], hasPrecipitate: false,
      precipitateAmount_g: 0, mass_g: contents.reduce((sum, entry) => sum + entry.mass_g, 0) };
    expect(solveAqueousEquilibrium(contents, 100)).not.toBeNull();
    const mixture = reactAliquotMixture(input, 'vi', false);
    expect(mixture.kinetics?.reactionId).toBe('cacl2_na2co3');
    expect(mixture.kinetics?.initialVesselBaseline).toBeDefined();
    expect(mixture.vessel.contents.some(entry => entry.formula === 'CaCO3')).toBe(false);
  });
});

describe('Calcite solubility is finite and CO2 phase dependent', () => {
  it('keeps nearly all excess calcite in pure water and reaches the sourced solubility product', () => {
    const input = specimen(), target = calciteEquilibriumTarget(input.contents, 100)!;
    expect(target.dissolvedMoles / 0.1).toBeGreaterThan(0.00008);
    expect(target.dissolvedMoles / 0.1).toBeLessThan(0.0002);
    expect(target.equilibrium.ph).toBeGreaterThan(9.7);
    expect(target.equilibrium.ph).toBeLessThan(10.1);
    expect(target.equilibrium.calcium_M * target.equilibrium.carbonate_M)
      .toBeCloseTo(CARBONATE_CONSTANTS_25C.calciteKsp, 16);
  });
  it('dissolves more with dissolved CO2, allows complete clearing only for a sufficiently small solid amount', () => {
    const water = specimen(), carbonated = specimen(1, 0.001), trace = specimen(0.01, 0.001);
    const plain = calciteEquilibriumTarget(water.contents, 100)!;
    const partial = calciteEquilibriumTarget(carbonated.contents, 100)!;
    const full = calciteEquilibriumTarget(trace.contents, 100)!;
    expect(partial.dissolvedMoles).toBeGreaterThan(plain.dissolvedMoles);
    expect(partial.dissolvedMoles).toBeLessThan(partial.totalMoles);
    expect(full.dissolvedMoles).toBe(full.totalMoles);
    expect(full.equilibrium.bicarbonate_M).toBeGreaterThan(full.equilibrium.carbonate_M);
  });
  it('does not use freshly evolved or headspace CO2 as an unlimited dissolved reagent', () => {
    const input = specimen(), gaseous = { ...input, contents: [...input.contents, item('CO2', 1, 'g')] };
    expect(calciteEquilibriumTarget(gaseous.contents, 100)!.dissolvedMoles)
      .toBeCloseTo(calciteEquilibriumTarget(input.contents, 100)!.dissolvedMoles, 12);
    const reaction = executeMultiStepReactions([item('CaCO3', 0.02, 's'), item('HCl', 0.01), item('H2O', 1, 'l')],
      ['CaCO3', 'HCl', 'H2O'], 50, 25, false, 'vi', { preserveQuantities: true });
    expect(reaction.reactionsOccurred.map(entry => entry.reactionId)).toEqual(['caco3_hcl_gas']);
    expect(amount(reaction.updatedContents, 's')).toBeCloseTo(0.015, 12);
    expect(reaction.updatedContents.find(entry => entry.formula === 'CO2')!.phase).toBe('g');
    expect(reaction.updatedContents.some(entry => entry.formula === 'Ca(HCO3)2')).toBe(false);
  });
  it('neutralizes existing dissolved carbonate before consuming additional solid with an acid dose', () => {
    const contents = [item('CaCO3', 0.02, 's'), item('CaCO3', 0.001), item('HCl', 0.001), item('H2O', 1, 'l')];
    const result = executeMultiStepReactions(contents, ['CaCO3', 'HCl', 'H2O'], 100, 25, false, 'vi', { preserveQuantities: true });
    expect(amount(result.updatedContents, 's')).toBeCloseTo(0.02, 12);
    expect(amount(result.updatedContents, 'aq')).toBeCloseTo(0.0005, 12);
    conserved(contents, result.updatedContents);
  });
  it('accounts for the common calcium ion rather than assuming one fixed water solubility', () => {
    const plain = specimen();
    const commonIon = [...plain.contents, item('CaCl2', 0.001)];
    expect(calciteEquilibriumTarget(commonIon, 100)!.dissolvedMoles)
      .toBeLessThan(calciteEquilibriumTarget(plain.contents, 100)!.dissolvedMoles);
  });
  it('approaches saturation gradually, conserves each element and mass, and stirring only changes approach speed', () => {
    const initial = specimen(0.01, 0.001);
    const slow = { ...initial, ...partitionCalcite(initial, 0.1) };
    const stirred = { ...initial, ...partitionCalcite(initial, 0.1, true) };
    expect(amount(slow.contents, 'aq')).toBeGreaterThan(0);
    expect(amount(slow.contents, 's')).toBeGreaterThan(0);
    expect(amount(stirred.contents, 'aq')).toBeGreaterThan(amount(slow.contents, 'aq'));
    conserved(initial.contents, slow.contents);
    let current = initial;
    for (let i = 0; i < 500; i++) current = { ...current, ...partitionCalcite(current, 0.2) };
    expect(amount(current.contents, 's')).toBeCloseTo(0, 12);
    expect(current.hasPrecipitate).toBe(false);
    expect(current.turbidity).toBeCloseTo(0, 10);
    conserved(initial.contents, current.contents);
    expect(current.mass_g).toBe(initial.mass_g);
  });
  it('keeps explicit dissolved excess available to precipitate again when the solution is supersaturated', () => {
    const initial = specimen(1);
    initial.contents = initial.contents.map(entry => entry.formula === 'CaCO3' ? { ...entry, phase: 'aq' } : entry);
    const next = { ...initial, ...partitionCalcite(initial, 0.1) };
    expect(amount(next.contents, 's')).toBeGreaterThan(0);
    conserved(initial.contents, next.contents);
  });
  it('does not erase filter cake, react a dry sample, or extrapolate unsupported competing species', () => {
    const input = specimen();
    expect(partitionCalcite(input, 0)).toBeNull();
    expect(partitionCalcite({ ...input, volume_ml: 0 }, 1)).toBeNull();
    expect(partitionCalcite({ ...input, isShattered: true }, 1)).toBeNull();
    expect(calciteEquilibriumTarget(input.contents.map(entry => entry.formula === 'CaCO3' ? { ...entry, location: 'filter' } : entry), 100)).toBeNull();
    expect(calciteEquilibriumTarget([...input.contents, item('FeCl3', 0.01)], 100)).toBeNull();
    expect(calciteEquilibriumTarget([...input.contents, item('HCl', 0.01)], 100)).toBeNull();
  });
  it('updates the actual vessel in simulation ticks while pause leaves the inventory unchanged', () => {
    const input = specimen(0.01, 0.001);
    useAppStore.setState({ vessels: { [input.id]: input }, vesselIds: [input.id], burners: {}, activeKinetics: {},
      pendingReactions: {}, isSimulationPaused: true, timeScale: 1 });
    useAppStore.getState().tickSimulation(1);
    expect(useAppStore.getState().vessels[input.id]).toBe(input);
    useAppStore.setState({ isSimulationPaused: false });
    useAppStore.getState().tickSimulation(0.1);
    const next = useAppStore.getState().vessels[input.id];
    expect(amount(next.contents, 'aq')).toBeGreaterThan(0);
    expect(next.phReferenceTemperature_c).toBeCloseTo(next.temperature_c, 10);
    expect(next.phModel).toBe(next.temperature_c === 25 ? 'ideal_aqueous_25c' : 'ideal_aqueous_temperature');
    const removed = (next.evaporated_ml ?? 0) - (next.wallCondensation?.returned_g ?? 0);
    conserved(input.contents, [...next.contents, { formula: 'H2O', phase: 'l', mass_g: removed, moles: removed / 18.015 }]);
  });
});
