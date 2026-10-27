import { afterEach, describe, expect, it } from 'vitest';
import { prepareStockAddition, stockLiquidAliquot } from '../src/engine/stockAddition';
import { findChemical } from '../src/data/chemicals';
import { occupiedLiquidVolume, availableLiquidVolume } from '../src/handling/solidOccupancy';
import { dispenseAliquot } from '../src/handling/aliquot';
import { useAppStore } from '../src/store/useAppStore';
import { readComposition } from '../src/science/balance';
import { resolveReactionProgram } from '../src/vfx/programs/resolver';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const item = (formula: string, mass_g: number, molarMass: number, phase: string): SubstanceContent =>
  ({ formula, mass_g, moles: mass_g / molarMass, phase });
function vessel(volume = 100, contents = [item('H2O', volume, 18.015, 'l')]): VesselState {
  return { id: 'overflow', name: 'Overflow test', type: 'beaker', capacity_ml: 100,
    position: [0, -0.135, 0], rotationY: 0, isLocked: false, volume_ml: volume, volume: volume / 100,
    contents, substances: contents.map(entry => entry.formula), mass_g: contents.reduce((sum, entry) => sum + entry.mass_g, 0),
    temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
}
function atoms(contents: SubstanceContent[]) {
  const result: Record<string, number> = {};
  for (const entry of contents) for (const [symbol, coefficient] of Object.entries(readComposition(entry.formula).atoms)) {
    result[symbol] = (result[symbol] ?? 0) + coefficient * entry.moles;
  }
  return result;
}
function conserved(before: SubstanceContent[], after: SubstanceContent[]) {
  const a = atoms(before), b = atoms(after);
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) expect(b[key] ?? 0).toBeCloseTo(a[key] ?? 0, 10);
  expect(after.reduce((sum, entry) => sum + entry.mass_g, 0)).toBeCloseTo(before.reduce((sum, entry) => sum + entry.mass_g, 0), 10);
}

describe('Stock overflow preserves actual phases and inventory', () => {
  it('keeps a dry solid dry and displaces existing solvent when submerged', () => {
    const copper = findChemical('Cu');
    const dry = prepareStockAddition(vessel(0, []), copper, 'Cu', 8.96, 25)!;
    expect(dry.vessel.volume_ml).toBe(0);
    expect(dry.vessel.mass_g).toBe(8.96);
    const wet = prepareStockAddition(vessel(), copper, 'Cu', 8.96, 25)!;
    expect(wet.vessel.volume_ml).toBeCloseTo(99, 10);
    expect(occupiedLiquidVolume(wet.vessel)).toBeCloseTo(100, 10);
    expect(wet.spill!.volume_ml).toBeCloseTo(1, 10);
    expect(wet.spill!.substances).toEqual(['H2O']);
    expect(wet.vessel.contents.find(entry => entry.formula === 'Cu')!.mass_g).toBe(8.96);
    conserved([...vessel().contents, item('Cu', 8.96, copper.molarMass, 's')], [...wet.vessel.contents, ...wet.spill!.contents]);
  });
  it('uses displaced weight for floating sodium instead of its entire volume', () => {
    const result = prepareStockAddition(vessel(), findChemical('Na'), 'Na', 0.97, 25)!;
    expect(result.spill!.volume_ml).toBeCloseTo(0.97, 10);
    expect(result.vessel.volume_ml).toBeCloseTo(99.03, 10);
    expect(occupiedLiquidVolume(result.vessel)).toBeCloseTo(100, 10);
    expect(result.spill!.contents.every(entry => entry.formula === 'H2O')).toBe(true);
  });
  it('spills dissolved solute along with displaced solvent but retains all solid', () => {
    const salt = item('NaCl', 1, 58.44, 'aq'), water = item('H2O', 99, 18.015, 'l');
    const input = vessel(100, [water, salt]);
    const result = prepareStockAddition(input, findChemical('Cu'), 'Cu', 8.96, 25)!;
    expect(result.spill!.contents.find(entry => entry.formula === 'NaCl')!.mass_g).toBeCloseTo(0.01, 12);
    conserved([...input.contents, item('Cu', 8.96, findChemical('Cu').molarMass, 's')], [...result.vessel.contents, ...result.spill!.contents]);
  });
  it('splits solution overflow with the stock density, solute and solvent', () => {
    const input = vessel(99), chemical = findChemical('HCl');
    const result = prepareStockAddition(input, chemical, 'HCl', 10, 25)!;
    expect(result.acceptedAmount).toBe(1);
    expect(result.spill!.volume_ml).toBe(9);
    expect(result.spill!.mass_g).toBeCloseTo(9 * 1.02, 12);
    expect(result.spill!.contents.find(entry => entry.formula === 'HCl')!.moles).toBeCloseTo(0.009, 12);
    conserved([...input.contents, ...result.incoming!.contents], [...result.vessel.contents, ...result.spill!.contents]);
  });
  it('allows later pouring only into space left by the solid, including through shared aliquot transfers', () => {
    const copper = prepareStockAddition(vessel(0, []), findChemical('Cu'), 'Cu', 8.96, 25)!.vessel;
    expect(availableLiquidVolume(copper)).toBeCloseTo(99, 8);
    const water = stockLiquidAliquot(findChemical('H2O'), 'H2O', 100, 25);
    const result = dispenseAliquot(copper, water, 100);
    expect(result.vessel.volume_ml).toBeCloseTo(99, 8);
    expect(result.sample.volume_ml).toBeCloseTo(1, 8);
    conserved([...copper.contents, ...water.contents], [...result.vessel.contents, ...result.sample.contents]);
  });
  it('distinguishes ice from liquid water and solid salt from aqueous salt', () => {
    const iceWater = vessel(20, [item('H2O', 20, 18.015, 'l'), item('H2O', 5, 18.015, 's')]);
    const result = prepareStockAddition(iceWater, findChemical('H2O'), 'H2O', 10, 25)!;
    expect(result.vessel.contents.find(entry => entry.phase === 's')!.mass_g).toBe(5);
    expect(result.vessel.contents.find(entry => entry.phase === 'l')!.mass_g).toBe(30);
    const saltWater = vessel(20, [item('H2O', 20, 18.015, 'l'), item('NaCl', 1, 58.44, 'aq')]);
    const salt = prepareStockAddition(saltWater, findChemical('NaCl'), 'NaCl', 2, 25)!;
    expect(salt.vessel.contents.find(entry => entry.phase === 'aq')!.mass_g).toBe(1);
    expect(salt.vessel.contents.find(entry => entry.phase === 's')!.mass_g).toBe(2);
  });
  it('does not make unknown solid density up or submerge a large object in a film of water', () => {
    const input = vessel(0.1, [item('H2O', 0.1, 18.015, 'l'), item('Cu', 8.96, 63.546, 's')]);
    expect(occupiedLiquidVolume(input)).toBeGreaterThan(0.1);
    expect(occupiedLiquidVolume(input)).toBeLessThan(1.1);
    const unknown = vessel(99, [item('H2O', 99, 18.015, 'l'), item('Unknown', 10, 100, 's')]);
    expect(availableLiquidVolume(unknown)).toBe(1);
  });
  it('rejects invalid/closed deliveries and inconsistent stock data', () => {
    for (const amount of [NaN, Infinity, 0, -1]) expect(prepareStockAddition(vessel(), findChemical('H2O'), 'H2O', amount, 25)).toBeNull();
    expect(prepareStockAddition({ ...vessel(), isSealed: true }, findChemical('Cu'), 'Cu', 1, 25)).toBeNull();
    expect(() => stockLiquidAliquot({ ...findChemical('NaOH'), defaultConcentration: 1000 }, 'NaOH', 1, 25)).toThrow();
  });
  it('records only actual overflow and does not start a reaction with rejected stock', async () => {
    const input = vessel();
    useAppStore.setState({ vessels: { [input.id]: input }, burners: {}, spills: {}, activeKinetics: {}, pendingReactions: {} });
    await useAppStore.getState().mixSubstances(input.id, 'HCl', 10);
    const state = useAppStore.getState(), spill = Object.values(state.spills)[0];
    expect(state.vessels[input.id]).toBe(input);
    expect(state.activeKinetics[input.id]).toBeUndefined();
    expect(spill.mass_g).toBeCloseTo(10.2, 10);
    expect(spill.contents!.find(entry => entry.formula === 'HCl')!.moles).toBeCloseTo(0.01, 10);
  });
  it('keeps tracked stock solvent while resolving a precipitation reagent pair', async () => {
    const ca = stockLiquidAliquot(findChemical('CaCl2'), 'CaCl2', 50, 25);
    const carbonate = stockLiquidAliquot(findChemical('Na2CO3'), 'Na2CO3', 20, 25);
    const contents = [...ca.contents, ...carbonate.contents];
    const result = await resolveReactionProgram(['CaCl2', 'Na2CO3', 'H2O'], contents, { temperature_c: 25, volume_ml: 70 });
    expect(result.program.id).toBe('cacl2_na2co3');
    expect(result.provenance).toBe('handcrafted');
  });
  it('preserves an arriving liquid dose if the empty hot receiver breaks', async () => {
    const input = { ...vessel(0, []), temperature_c: 200 };
    useAppStore.setState({ vessels: { [input.id]: input }, burners: {}, spills: {}, activeKinetics: {}, pendingReactions: {} });
    await useAppStore.getState().mixSubstances(input.id, 'HCl', 5);
    const state = useAppStore.getState();
    expect(state.vessels[input.id].isShattered).toBe(true);
    expect(Object.values(state.spills).reduce((sum, spill) => sum + spill.mass_g, 0)).toBeCloseTo(5.1, 10);
  });
});
