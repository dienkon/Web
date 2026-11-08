import { describe, expect, it } from 'vitest';
import type { SpillState } from '../src/types/chemistry';
import { stockWetContact } from '../src/physical/stockWetContact';
import { stockGroup } from '../src/physical/stockAdapter';
import { stepWorkbenchSpills } from '../src/engine/spillChemistry';
import { assignWetStock, combineWetStock, splitWetStock } from '../src/engine/spillStockContact';
import { calculateSpillRadius } from '../src/science/overflowPhysics';
import { computeMolarMass, parseChemicalFormula } from '../src/engine/ledger';
import { LAB_GEOMETRY } from '../src/core/labGeometry';
import { METERS_PER_SCENE_UNIT as U } from '../src/science/sceneUnits';
import { solveSessileDrop } from '../src/science/sessileDrop';
import { sampleHeatCapacity } from '../src/engine/thermalState';

const row = (formula: string, mass_g: number, phase: string) => ({ formula, mass_g, moles: mass_g / computeMolarMass(formula), phase });
function puddle(id = 'pool', x = 0): SpillState {
  const contents = [row('H2O', 10, 'l'), row('HCl', 0.03646, 'aq')];
  return { id, position: [x, LAB_GEOMETRY.tableTop_scene, 0], contents, substances: contents.map(c => c.formula),
    mass_g: contents.reduce((s, c) => s + c.mass_g, 0), volume_ml: 10, radius: calculateSpillRadius(10),
    color: '#fff', isHazard: true, temperature_c: 25, timestamp: 0 };
}
function grain(id = 'zinc', formula = 'Zn', grams = 0.1): SpillState {
  const group = stockGroup(formula, grams)!, scale = Math.cbrt(grams / 1000 / group.density_kg_m3);
  const position: [number, number, number] = [0, LAB_GEOMETRY.tableTop_scene + scale / U, 0];
  return { id, position, contents: [row(formula, grams, 's')], substances: [formula], volume_ml: 0, mass_g: grams,
    radius: scale / U, color: '#888', isHazard: false, temperature_c: 25, timestamp: 0,
    stockMotion: { id, vesselId: 'source', formula, powder: group.powder, mass_g: grams, scale_m: scale,
      position_m: position.map(p => p * U) as [number, number, number], rotation: [0, 0, 0, 1],
      velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true } };
}
function totals(spills: Record<string, SpillState>, gas: Record<string, number> = {}) {
  const atoms: Record<string, number> = {};
  const rows = [...Object.values(spills).flatMap(s => s.contents ?? []), ...Object.entries(gas).map(([f, g]) => row(f, g, 'g'))];
  for (const c of rows) for (const [atom, n] of Object.entries(parseChemicalFormula(c.formula))) atoms[atom] = (atoms[atom] ?? 0) + c.moles * n;
  return { mass: Object.values(spills).reduce((s, c) => s + c.mass_g, 0) + Object.values(gas).reduce((s, g) => s + g, 0), atoms };
}

describe('Mechanical stock contacts actual wet surfaces', () => {
  it('rejects air, another support, a lateral gap and an organic pool', () => {
    const p = puddle(), g = grain();
    expect(stockWetContact(g, p)?.fraction).toBeGreaterThan(0);
    for (const position_m of [[0, 0.5, 0], [0.5, g.stockMotion!.position_m[1], 0], [0, LAB_GEOMETRY.floor_scene * U, 0]])
      expect(stockWetContact({ ...g, stockMotion: { ...g.stockMotion!, position_m: position_m as [number, number, number] } }, p)).toBeNull();
    const oil = { ...p, contents: p.contents!.map(c => ({ ...c, liquidLayer: 'organic' as const })) };
    expect(assignWetStock({ oil, g }).size).toBe(0);
  });
  it('gives a half-immersed powder carrier half of its numerical surface, then none/all at the limits', () => {
    const p = puddle(), g = grain('iron', 'Fe', 0.00001), h = solveSessileDrop(p.volume_ml)!.height_m;
    const at = (y: number) => ({ ...g, stockMotion: { ...g.stockMotion!, position_m: [0, LAB_GEOMETRY.tableTop_scene * U + y, 0] as [number, number, number] } });
    expect(stockWetContact(at(h), p)!.fraction).toBeCloseTo(0.5, 1);
    expect(stockWetContact(at(h / 2), p)!.fraction).toBe(1);
    expect(stockWetContact(at(h + 0.001), p)).toBeNull();
  });
  it('allocates a grain to one pool with a stable tie break, independent of record order', () => {
    const a = puddle('a'), b = puddle('b'), g = grain();
    expect([...assignWetStock({ b, g, a }).keys()]).toEqual(['a']);
    expect([...assignWetStock({ a, b, g }).keys()]).toEqual(['a']);
  });
  it('closes the sensible-heat budget for the ideal contact mixture without adding glass heat capacity', () => {
    const p = puddle(), g = { ...grain(), temperature_c: 90 };
    const wet = [{ grain: g, contact: { fraction: 1, position: g.position } }], { sample } = combineWetStock(p, wet);
    const energy = (s: SpillState) => sampleHeatCapacity(s, 0) * s.temperature_c!;
    expect(energy(sample)).toBeCloseTo(energy(p) + energy(g), 9);
    expect(sample.mass_g).toBeCloseTo(p.mass_g + g.mass_g, 12);
  });
  it('keeps inert contact inventories and paused state referentially stable', () => {
    const p = { ...puddle(), contents: [row('H2O', 10, 'l')], mass_g: 10, substances: ['H2O'] }, g = grain('copper', 'Cu');
    const original = { p, g };
    expect(stepWorkbenchSpills(original, 0).spills).toBe(original);
    expect(stepWorkbenchSpills(original, 0.1).spills).toBe(original);
  });
  it('consumes finite Zn at contact, shrinks its body and moves H2 into the atmosphere exactly once', () => {
    const p = puddle(), g = grain(), before = { pool: p, zinc: g }, original = structuredClone(before), initial = totals(before);
    const out = stepWorkbenchSpills(before, 0.1), after = totals(out.spills, out.escapedGas_g);
    expect(before).toEqual(original);
    expect(out.escapedGas_g.H2).toBeGreaterThan(0);
    expect(out.spills.zinc.mass_g).toBeLessThan(g.mass_g);
    expect(out.spills.zinc.stockMotion!.scale_m / g.stockMotion!.scale_m).toBeCloseTo(Math.cbrt(out.spills.zinc.mass_g / g.mass_g), 12);
    expect(out.spills.zinc.stockMotion!.position_m).toBe(g.stockMotion!.position_m);
    expect(out.spills.pool.contents!.some(c => c.formula === 'Zn' && c.mass_g > 0)).toBe(false);
    expect(out.spills.pool.solidContactSites![0].grainId).toBe(g.id);
    expect(out.spills.pool.escapedGas_g).toBeUndefined();
    expect(after.mass).toBeCloseTo(initial.mass, 10);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 10);
  });
  it('conserves atoms across repeated acid depletion and never generates gas again from an exhausted pool', () => {
    let spills = { pool: puddle(), zinc: grain() }; const before = totals(spills), gas: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      const out = stepWorkbenchSpills(spills, 0.5); spills = out.spills as typeof spills;
      for (const [f, g] of Object.entries(out.escapedGas_g)) gas[f] = (gas[f] ?? 0) + g;
    }
    const after = totals(spills, gas);
    expect(after.mass).toBeCloseTo(before.mass, 9);
    for (const [atom, n] of Object.entries(before.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 9);
    expect(gas.H2).toBeLessThanOrEqual(0.001 / 2 * computeMolarMass('H2') + 1e-8);
    expect(spills.zinc.mass_g).toBeGreaterThan(0.067);
    const dry = { ...spills, pool: { ...spills.pool, contents: spills.pool.contents!.filter(c => c.formula !== 'HCl') } };
    const stopped = stepWorkbenchSpills(dry, 1);
    expect(stopped.escapedGas_g.H2 ?? 0).toBe(0); expect(stopped.spills.pool.solidContactSites).toBeUndefined();
  });
  it('stops contact chemistry immediately when the physical grain leaves the pool', () => {
    const first = stepWorkbenchSpills({ pool: puddle(), zinc: grain() }, 0.1);
    const g = first.spills.zinc;
    const spills = { ...first.spills, zinc: { ...g, stockMotion: { ...g.stockMotion!, position_m: [0, 1, 0] as [number, number, number] } } };
    const next = stepWorkbenchSpills(spills, 0.1);
    expect(next.spills.zinc).toBe(spills.zinc); expect(next.escapedGas_g.H2 ?? 0).toBe(0);
    expect(next.spills.pool.gasRate_mol_s).toBe(0); expect(next.spills.pool.solidContactSites).toBeUndefined();
  });
  it('splits chemically identical stock aliases and loose stock without giving the pool duplicate solids', () => {
    const p = puddle(), a = grain('a', 'Fe'), b = grain('b', 'Fe (Filings)');
    p.contents!.push(row('Fe', 0.1, 's')); p.mass_g += 0.1;
    const before = { pool: p, a, b }, initial = totals(before), out = stepWorkbenchSpills(before, 0.1), after = totals(out.spills, out.escapedGas_g);
    expect(out.spills.a.mass_g).toBeLessThan(a.mass_g); expect(out.spills.b.mass_g).toBeLessThan(b.mass_g);
    expect(out.spills.a.contents![0].formula).toBe('Fe'); expect(out.spills.b.contents![0].formula).toBe('Fe (Filings)');
    expect(out.spills.pool.contents!.filter(c => c.phase === 's').reduce((s, c) => s + c.mass_g, 0)).toBeLessThan(0.1);
    expect(after.mass).toBeCloseTo(initial.mass, 10);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 10);
  });
  it('keeps newly precipitated solids in the pool when a stock reactant forms a solid product', () => {
    const p = puddle(), g = grain(), wet = [{ grain: g, contact: { fraction: 1, position: g.position } }];
    const { sample } = combineWetStock(p, wet), reacted = { ...sample, contents: sample.contents!.map(c => c.formula === 'Zn' ? { ...c, mass_g: c.mass_g / 2, moles: c.moles / 2 } : c) };
    reacted.contents.push({ ...row('Cu', 0.01, 's'), solidOrigin: 'precipitate' }); reacted.mass_g -= 0.04;
    const split = splitWetStock(p, wet, sample, reacted);
    expect(split.grains[0].mass_g).toBeCloseTo(0.05, 12);
    expect(split.pool.contents!.some(c => c.formula === 'Cu' && c.solidOrigin === 'precipitate')).toBe(true);
    expect(split.pool.mass_g + split.grains[0].mass_g).toBeCloseTo(reacted.mass_g, 12);
  });
});
