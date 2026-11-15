import { describe, expect, it } from 'vitest';
import { partitionSodiumChloride } from '../src/engine/sodiumChloridePhase';
import { partitionCalcite } from '../src/engine/calcitePhase';
import { computeMolarMass } from '../src/engine/ledger';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { stockLiquidContactFraction } from '../src/physical/stockLiquidContact';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const amount = (formula: string, mass_g: number, phase: string): SubstanceContent =>
  ({ formula, phase, mass_g, moles: mass_g / computeMolarMass(formula) });
const phaseCases = [
  { formula: 'NaCl', partition: partitionSodiumChloride, supersaturated_g: 15 },
  { formula: 'CaCO3', partition: partitionCalcite, supersaturated_g: 0.01 },
];
function sample(formula: string, height: number): VesselState {
  const stock = { ...amount(formula, 0.1, 's'), initialMass_g: 0.1, initialMoles: 0.1 / computeMolarMass(formula) };
  const vessel: VesselState = { id: `phase-contact-${formula}`, name: formula, type: 'beaker',
    capacity_ml: 100, position: [1.3, 0.1, -0.8], rotationY: 0.4, isLocked: false,
    volume_ml: 30, volume: 0.3, temperature_c: 25, ph: 7, mass_g: 30.1,
    contents: [amount('H2O', 30, 'l'), stock], substances: ['H2O', formula],
    hasGas: false, hasPrecipitate: false, isBoiling: false };
  vessel.stockMotion = { tick: 1, grains: [{ id: 'stock', formula, mass_g: 0.1, scale_m: 0.001,
    position_m: [0, 0, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0],
    angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false }] };
  return place(vessel, height);
}
function place(vessel: VesselState, height: number): VesselState {
  return { ...vessel, stockMotion: { tick: (vessel.stockMotion?.tick ?? 0) + 1,
    grains: vessel.stockMotion!.grains.map(pose => ({ ...pose,
      position_m: vesselLocalToWorld(vessel, [0, height, 0]).map(x => x * 0.035) as [number, number, number] })) } };
}
const total = (vessel: VesselState, formula: string, field: 'mass_g' | 'moles', phase?: string) => vessel.contents
  .filter(row => row.formula === formula && (!phase || row.phase === phase)).reduce((sum, row) => sum + row[field], 0);
function conserved(before: VesselState, after: VesselState, formula: string) {
  expect(total(after, formula, 'mass_g')).toBeCloseTo(total(before, formula, 'mass_g'), 13);
  expect(total(after, formula, 'moles')).toBeCloseTo(total(before, formula, 'moles'), 13);
  expect(total(after, 'H2O', 'mass_g')).toBe(total(before, 'H2O', 'mass_g'));
}

describe.each(phaseCases)('$formula phase partition obeys stock contact', ({ formula, partition, supersaturated_g }) => {
  it('shrinks only the wet carrier when wet and dry chunks share one inventory row', () => {
    const before = sample(formula, -0.75), wet = before.stockMotion!.grains[0];
    before.contents[1] = { ...before.contents[1], mass_g: 0.2, moles: 0.2 / computeMolarMass(formula), initialMass_g: 0.2 };
    before.mass_g += 0.1;
    const dry = { ...wet, id: 'dry-stock', position_m: vesselLocalToWorld(before, [0.25, 0.7, 0])
      .map(x => x * 0.035) as [number, number, number] };
    before.stockMotion = { tick: 1, grains: [wet, dry] };
    const after = { ...before, ...partition(before, 30) };
    expect(after.stockMotion!.grains.find(p => p.id === dry.id)).toEqual(dry);
    expect(after.stockMotion!.grains.find(p => p.id === wet.id)!.mass_g).toBeLessThan(0.1);
    expect(after.stockMotion!.grains.reduce((sum, p) => sum + p.mass_g, 0)).toBeCloseTo(total(after, formula, 'mass_g', 's'), 12);
    conserved(before, after, formula);
    const later = { ...after, ...partition(after, 30) };
    expect(later.stockMotion!.grains.find(p => p.id === dry.id)).toEqual(dry);
    expect(total(later, formula, 'mass_g', 's')).toBeGreaterThanOrEqual(0.1 - 1e-12);
    conserved(before, later, formula);
  });

  it('leaves airborne stock unchanged even with a stale precipitate display label', () => {
    const dry = { ...sample(formula, 0.7), hasPrecipitate: true,
      precipitateSubstance: formula, precipitateAmount_g: 0.1 };
    expect(stockLiquidContactFraction(dry, formula)).toBe(0);
    expect(partition(dry, 30)).toBeNull();
    expect(total(dry, formula, 'mass_g', 's')).toBe(0.1);
  });

  it('preserves the remaining stock and stops dissolution immediately after lifting it out', () => {
    const wet = sample(formula, -0.75), patch = partition(wet, 0.5);
    expect(patch).not.toBeNull();
    const after = { ...wet, ...patch };
    expect(total(after, formula, 'moles', 'aq')).toBeGreaterThan(0);
    const stock = after.contents.find(row => row.formula === formula && row.phase === 's')!;
    expect(stock.mass_g).toBeGreaterThan(0);
    expect(stock.solidOrigin).toBeUndefined();
    expect(stock.initialMass_g).toBe(0.1);
    expect(after.hasPrecipitate).toBe(false);
    expect(partition(place(after, 0.7), 30)).toBeNull();
    conserved(wet, after, formula);
  });

  it('dissolves a wet precipitate pool without consuming dry stock of the same formula', () => {
    const dry = sample(formula, 0.7), stock = dry.contents[1];
    dry.contents.push({ ...amount(formula, 0.002, 's'), solidOrigin: 'precipitate' });
    const after = { ...dry, ...partition(dry, 1) };
    expect(after.contents.find(row => row.formula === formula && row.phase === 's' && !row.solidOrigin)).toEqual(stock);
    expect(total(after, formula, 'moles', 'aq')).toBeGreaterThan(0);
    expect(after.contents.filter(row => row.formula === formula && row.solidOrigin === 'precipitate')
      .reduce((sum, row) => sum + row.mass_g, 0)).toBeLessThan(0.002);
    conserved(dry, after, formula);
  });

  it('precipitates dissolved excess separately from a dry stock chunk', () => {
    const dry = sample(formula, 0.7), stock = dry.contents[1];
    dry.contents.push(amount(formula, supersaturated_g, 'aq'));
    const after = { ...dry, ...partition(dry, 1) };
    expect(after.contents.find(row => row.formula === formula && row.phase === 's' && !row.solidOrigin)).toEqual(stock);
    expect(after.contents.filter(row => row.formula === formula && row.solidOrigin === 'precipitate')
      .reduce((sum, row) => sum + row.mass_g, 0)).toBeGreaterThan(0);
    expect(total(after, formula, 'moles', 'aq')).toBeLessThan(total(dry, formula, 'moles', 'aq'));
    conserved(dry, after, formula);
  });

  it('reduces dissolution as the exposed surface is withdrawn, with a current pose and unchanged composition', () => {
    const wet = sample(formula, -0.75), partial = place(wet, vesselLiquidSurfaceY(wet));
    const fraction = stockLiquidContactFraction(partial, formula);
    expect(fraction).toBeGreaterThan(0); expect(fraction).toBeLessThan(1);
    const wetAfter = { ...wet, ...partition(wet, 0.1) }, partialAfter = { ...partial, ...partition(partial, 0.1) };
    expect(total(partialAfter, formula, 'moles', 'aq')).toBeGreaterThan(0);
    expect(total(partialAfter, formula, 'moles', 'aq')).toBeLessThan(total(wetAfter, formula, 'moles', 'aq'));
    expect(partition(place(wet, 0.7), 0.1)).toBeNull();
    conserved(partial, partialAfter, formula);
  });
});
