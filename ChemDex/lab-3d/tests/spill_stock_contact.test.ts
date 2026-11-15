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
import { attachedMetalForCarrier, metalDepositCarrierFormula } from '../src/science/metalSurfaceAppearance';
import type { VesselState } from '../src/types/chemistry';

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
function metalPuddle(salt: string): SpillState {
  const contents = [row('H2O', 10, 'l'), row(salt, 0.1, 'aq')];
  return { ...puddle(), contents, substances: contents.map(c => c.formula), mass_g: 10.1 };
}
function surfaceGrain(formula: string, grams = 0.1, id = 'carrier'): SpillState {
  const g = grain(id, formula, grams);
  g.stockMotion!.position_m[1] = LAB_GEOMETRY.tableTop_scene * U + 0.001;
  g.position = g.stockMotion!.position_m.map(value => value / U) as [number, number, number];
  if (formula === 'Fe (nail)') g.stockMotion!.rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
  return g;
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
    // The shared material allocator spends unresolved pool stock first; its
    // products cannot be assigned to unrelated mechanical carrier IDs.
    expect(out.spills.a.mass_g).toBe(a.mass_g); expect(out.spills.b.mass_g).toBe(b.mass_g);
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

  it('reacts a coated core at a puddle while keeping its coating mass separate from mechanical core mass', () => {
    const p = puddle(), g = grain();
    g.contents!.push({ ...row('Cu', 0.01, 's'), solidOrigin: 'precipitate', depositSubstrate: 'Zn',
      depositCarrierId: g.stockMotion!.id, depositionReactionId: 'zn_cuso4' });
    g.mass_g += 0.01; g.substances.push('Cu');
    const before = { pool: p, zinc: g }, initial = totals(before);
    expect(assignWetStock(before).get('pool')).toHaveLength(1);
    const out = stepWorkbenchSpills(before, 0.1), core = out.spills.zinc.contents!.find(c => c.formula === 'Zn')!;
    const coating = out.spills.zinc.contents!.find(c => c.formula === 'Cu')!;
    expect(core.mass_g).toBeLessThan(0.1);
    expect(coating.mass_g).toBe(0.01);
    expect(coating.depositCarrierId).toBe(g.stockMotion!.id);
    expect(coating.depositReleased).not.toBe(true);
    expect(out.spills.zinc.stockMotion!.mass_g).toBe(core.mass_g);
    expect(out.spills.zinc.mass_g).toBeCloseTo(core.mass_g + coating.mass_g, 12);
    expect(out.spills.zinc.stockMotion!.scale_m / g.stockMotion!.scale_m).toBeCloseTo(Math.cbrt(core.mass_g / 0.1), 12);
    expect(out.spills.pool.contents!.some(c => c.formula === 'Cu')).toBe(false);
    expect(out.escapedGas_g.H2).toBeGreaterThan(0);
    const after = totals(out.spills, out.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
  });

  it('releases the coating into the puddle and removes the physical carrier after its core is consumed', () => {
    const p = puddle(), g = grain('tiny-zinc', 'Zn', 0.001);
    g.contents!.push({ ...row('Cu', 0.0002, 's'), solidOrigin: 'precipitate', depositSubstrate: 'Zn',
      depositCarrierId: g.stockMotion!.id, depositionReactionId: 'zn_cuso4' });
    g.mass_g += 0.0002; g.substances.push('Cu');
    const before = { pool: p, [g.id]: g }, initial = totals(before), out = stepWorkbenchSpills(before, 1000);
    expect(out.spills[g.id]).toBeUndefined();
    const coating = out.spills.pool.contents!.find(c => c.formula === 'Cu')!;
    expect(coating.mass_g).toBe(0.0002);
    expect(coating.depositReleased).toBe(true);
    expect(out.spills.pool.stockMotion).toBeUndefined();
    expect(out.spills.pool.solidContactSites![0].grainId).toBe(g.id);
    expect(out.escapedGas_g.H2).toBeCloseTo(0.001 / computeMolarMass('Zn') * computeMolarMass('H2'), 12);
    const after = totals(out.spills, out.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
  });

  it('keeps a second coated carrier when only the first substrate is exhausted', () => {
    const p = { ...puddle(), reactionProgramId: 'zn_hcl' }, zinc = grain('small-zinc', 'Zn', 0.001), iron = grain('iron', 'Fe', 0.1);
    for (const g of [zinc, iron]) {
      g.contents!.push({ ...row('Cu', 0.0002, 's'), solidOrigin: 'precipitate', depositSubstrate: g.stockMotion!.formula,
        depositCarrierId: g.id, depositionReactionId: `${g.stockMotion!.formula.toLowerCase()}_cuso4` });
      g.mass_g += 0.0002; g.substances.push('Cu');
    }
    const before = { pool: p, [zinc.id]: zinc, [iron.id]: iron }, initial = totals(before), out = stepWorkbenchSpills(before, 1000);
    expect(out.spills[zinc.id]).toBeUndefined();
    expect(out.spills[iron.id].stockMotion!.mass_g).toBe(0.1);
    expect(out.spills[iron.id].contents!.find(c => c.depositCarrierId === iron.id)!.depositReleased).not.toBe(true);
    expect(out.spills.pool.contents!.find(c => c.depositCarrierId === zinc.id)!.depositReleased).toBe(true);
    const after = totals(out.spills, out.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
  });

  it.each([
    ['Zn', 'CuSO4', 'Cu', 'zn_cuso4'], ['Zn', 'AgNO3', 'Ag', 'zn_agno3'],
    ['Fe (nail)', 'CuSO4', 'Cu', 'fe_cuso4'], ['Cu', 'AgNO3', 'Ag', 'cu_agno3'],
  ])('grows finite %s/%s product on the actually wetted carrier', (metal, salt, product, program) => {
    const g = surfaceGrain(metal), p = metalPuddle(salt), before = { pool: p, [g.id]: g }, initial = totals(before);
    expect(stockWetContact(g, p)!.fraction).toBeGreaterThan(0);
    const first = stepWorkbenchSpills(before, 0.1), out = stepWorkbenchSpills(first.spills, 0.1), carrier = out.spills[g.id];
    expect(out.spills.pool.reactionProgramId).toBe(program);
    const deposits = carrier.contents!.filter(c => c.formula === product && c.solidOrigin === 'precipitate');
    expect(deposits.reduce((sum, c) => sum + c.mass_g, 0)).toBeGreaterThan(0);
    expect(deposits.every(c => c.depositCarrierId === g.stockMotion!.id && !c.depositReleased)).toBe(true);
    expect(deposits.every(c => metalDepositCarrierFormula(c) === metal.replace(' (nail)', ''))).toBe(true);
    const core = carrier.contents!.filter(c => !c.solidOrigin).reduce((sum, c) => sum + c.mass_g, 0);
    expect(core).toBeLessThan(0.1); expect(carrier.stockMotion!.mass_g).toBe(core);
    const view = { contents: carrier.contents!, stockMotion: { tick: 0, grains: [carrier.stockMotion!] } } as unknown as VesselState;
    expect(attachedMetalForCarrier(view, g.stockMotion!.id).mass_g).toBeCloseTo(carrier.mass_g - core, 12);
    expect(out.spills.pool.contents!.filter(c => c.formula === product).reduce((sum, c) => sum + c.mass_g, 0)).toBeLessThan(1e-12);
    expect(Object.getOwnPropertySymbols(out.spills.pool)).toHaveLength(0);
    const after = totals(out.spills, out.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
    const lifted = { ...carrier, stockMotion: { ...carrier.stockMotion!, position_m: [0, 1, 0] as [number, number, number] } };
    const stopped = stepWorkbenchSpills({ ...out.spills, [g.id]: lifted }, 0.1);
    expect(stopped.spills[g.id]).toBe(lifted);
  });

  it('uses the same measured contact on the table and the floor instead of a fictitious beaker', () => {
    const p = metalPuddle('AgNO3'), g = surfaceGrain('Cu');
    const table = stepWorkbenchSpills({ pool: p, carrier: g }, 0.1);
    const displacement = LAB_GEOMETRY.floor_scene - LAB_GEOMETRY.tableTop_scene;
    const floorPool = { ...p, position: [p.position[0], p.position[1] + displacement, p.position[2]] as [number, number, number] };
    const floorGrain = { ...g, position: [g.position[0], g.position[1] + displacement, g.position[2]] as [number, number, number],
      stockMotion: { ...g.stockMotion!, position_m: [g.stockMotion!.position_m[0], g.stockMotion!.position_m[1] + displacement * U,
        g.stockMotion!.position_m[2]] as [number, number, number] } };
    const floor = stepWorkbenchSpills({ pool: floorPool, carrier: floorGrain }, 0.1);
    expect(floor.spills.carrier.stockMotion!.mass_g).toBeCloseTo(table.spills.carrier.stockMotion!.mass_g, 12);
    expect(floor.spills.carrier.contents!.find(c => c.formula === 'Ag')!.mass_g)
      .toBeCloseTo(table.spills.carrier.contents!.find(c => c.formula === 'Ag')!.mass_g, 12);
  });

  it('shares finite consumption and deposition by wetted surface area across differently sized carriers', () => {
    const p = metalPuddle('CuSO4'), small = surfaceGrain('Fe', 0.00001, 'small'), large = surfaceGrain('Fe', 0.00008, 'large');
    const dry = { ...surfaceGrain('Fe', 0.00008, 'dry'), stockMotion: { ...large.stockMotion!, id: 'dry',
      position_m: [0.5, 0.5, 0] as [number, number, number] } };
    expect(stockWetContact(small, p)!.fraction).toBe(1);
    expect(stockWetContact(large, p)!.fraction).toBe(1);
    const before = { pool: p, small, large, dry }, initial = totals(before), out = stepWorkbenchSpills(before, 0.001);
    const lostSmall = small.stockMotion!.mass_g - out.spills.small.stockMotion!.mass_g;
    const lostLarge = large.stockMotion!.mass_g - out.spills.large.stockMotion!.mass_g;
    // Eight times the volume has twice the length and four times the surface.
    expect(lostSmall).toBeGreaterThan(0); expect(lostLarge / lostSmall).toBeCloseTo(4, 8);
    const product = (id: string) => out.spills[id].contents!.filter(c => c.formula === 'Cu').reduce((sum, c) => sum + c.mass_g, 0);
    expect(product('large') / product('small')).toBeCloseTo(4, 8);
    expect(out.spills.dry).toBe(dry);
    const after = totals(out.spills, out.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
  });

  it('keeps products from loose pool substrate free, then attaches only products from consumed carrier substrate', () => {
    const p = metalPuddle('CuSO4'), g = surfaceGrain('Zn');
    p.contents!.push(row('Zn', 0.01, 's')); p.mass_g += 0.01;
    const before = { pool: p, carrier: g }, initial = totals(before), first = stepWorkbenchSpills(before, 0.1);
    expect(first.spills.carrier.stockMotion!.mass_g).toBe(0.1);
    expect(first.spills.carrier.contents!.some(c => c.formula === 'Cu')).toBe(false);
    const looseCopper = first.spills.pool.contents!.filter(c => c.formula === 'Cu');
    expect(looseCopper.reduce((sum, c) => sum + c.mass_g, 0)).toBeGreaterThan(0);
    expect(looseCopper.every(c => c.depositReleased && !c.depositCarrierId)).toBe(true);
    const last = stepWorkbenchSpills(first.spills, 1000), coated = last.spills.carrier.contents!.filter(c => c.formula === 'Cu');
    expect(coated.reduce((sum, c) => sum + c.mass_g, 0)).toBeGreaterThan(0);
    expect(coated.every(c => c.depositCarrierId === g.id && !c.depositReleased)).toBe(true);
    expect(last.spills.pool.contents!.filter(c => c.formula === 'Cu').reduce((sum, c) => sum + c.mass_g, 0))
      .toBeCloseTo(0.01 / computeMolarMass('Zn') * computeMolarMass('Cu'), 11);
    const after = totals(last.spills, last.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
  });

  it('releases newly formed metal exactly once when the wetted core is exhausted', () => {
    const p = metalPuddle('CuSO4'), g = surfaceGrain('Zn', 0.001), before = { pool: p, carrier: g }, initial = totals(before);
    const out = stepWorkbenchSpills(before, 1000);
    expect(out.spills.carrier).toBeUndefined();
    const metal = out.spills.pool.contents!.filter(c => c.formula === 'Cu');
    expect(metal.reduce((sum, c) => sum + c.mass_g, 0)).toBeCloseTo(0.001 / computeMolarMass('Zn') * computeMolarMass('Cu'), 12);
    expect(metal.every(c => c.depositReleased)).toBe(true);
    const after = totals(out.spills, out.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
  });

  it('keeps silver grown by consuming a copper coating on the original iron carrier in the puddle', () => {
    const iron = surfaceGrain('Fe (nail)'), copper = stepWorkbenchSpills({ pool: metalPuddle('CuSO4'), carrier: iron }, 0.5).spills.carrier;
    const initialCopper = copper.contents!.find(c => c.formula === 'Cu')!.mass_g;
    const pool = { ...metalPuddle('AgNO3'), reactionProgramId: 'cu_agno3' }, before = { pool, carrier: copper }, initial = totals(before);
    const out = stepWorkbenchSpills(before, 0.1), carrier = out.spills.carrier;
    expect(carrier.stockMotion!.mass_g).toBe(copper.stockMotion!.mass_g);
    expect(carrier.contents!.find(c => c.formula === 'Cu')!.mass_g).toBeLessThan(initialCopper);
    const silver = carrier.contents!.filter(c => c.formula === 'Ag');
    expect(silver.reduce((sum, c) => sum + c.mass_g, 0)).toBeGreaterThan(0);
    expect(silver.every(c => c.depositSubstrate === 'Cu' && c.depositCarrierFormula === 'Fe' && c.depositCarrierId === iron.id && !c.depositReleased)).toBe(true);
    const after = totals(out.spills, out.escapedGas_g);
    expect(after.mass).toBeCloseTo(initial.mass, 11);
    for (const [atom, n] of Object.entries(initial.atoms)) expect(after.atoms[atom], atom).toBeCloseTo(n, 11);
  });
});
