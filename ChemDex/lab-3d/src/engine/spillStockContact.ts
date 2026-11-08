import type { SpillState, SubstanceContent } from '../types/chemistry';
import { stockWetContact, type StockWetContact } from '../physical/stockWetContact';
import { identifySpecies } from '../science/speciesIdentity';
import { sampleHeatCapacity } from './thermalState';

const identity = (formula: string) => identifySpecies(formula).formula.toLowerCase();
const stock = (c: SubstanceContent) => c.phase === 's' && c.solidOrigin !== 'precipitate'
  && (!c.location || c.location === 'bulk');
export interface WetStock { grain: SpillState; contact: StockWetContact }

/** A body may feed one pool per step, regardless of record insertion order. */
export function assignWetStock(spills: Record<string, SpillState>): Map<string, WetStock[]> {
  const pools = Object.values(spills).filter(p => !p.stockMotion && p.volume_ml > 0
    && !p.contents?.some(c => c.liquidLayer === 'organic')
    && p.contents?.some(c => identity(c.formula) === 'h2o' && c.phase === 'l' && c.moles > 1e-12))
    .sort((a, b) => a.id.localeCompare(b.id));
  const result = new Map<string, WetStock[]>();
  for (const grain of Object.values(spills).sort((a, b) => a.id.localeCompare(b.id))) {
    const pose = grain.stockMotion;
    if (!pose || grain.volume_ml !== 0 || !(grain.mass_g > 0) || !grain.contents?.length
      || grain.contents.some(c => !stock(c) || identity(c.formula) !== identity(pose.formula))) continue;
    let chosen: { pool: SpillState; contact: StockWetContact } | undefined;
    for (const pool of pools) {
      const contact = stockWetContact(grain, pool);
      if (contact && (!chosen || contact.fraction > chosen.contact.fraction)) chosen = { pool, contact };
    }
    if (chosen) { const list = result.get(chosen.pool.id) ?? []; list.push({ grain, contact: chosen.contact }); result.set(chosen.pool.id, list); }
  }
  return result;
}

/** Temporary reaction sample only. Final inventories keep each mechanical
 * identity; the pool never also owns the surviving stock mass. Ideal thermal
 * equilibration on reacting contact is an explicit reduced-model assumption. */
export function combineWetStock(pool: SpillState, wet: WetStock[]) {
  const all = [pool, ...wet.map(w => w.grain)];
  const capacities = all.map(s => sampleHeatCapacity({ ...s, contents: s.contents ?? [] }, 0));
  const capacity = capacities.reduce((s, c) => s + c, 0);
  const contents = all.flatMap(s => s.contents ?? []);
  const sample: SpillState = { ...pool, contents, mass_g: all.reduce((s, c) => s + c.mass_g, 0),
    substances: [...new Set(contents.filter(c => c.mass_g > 0).map(c => c.formula))],
    temperature_c: capacity > 0 ? all.reduce((s, c, i) => s + (c.temperature_c ?? 25) * capacities[i], 0) / capacity : pool.temperature_c };
  const fractions = new Map<string, number>();
  for (const formula of new Set(wet.map(w => identity(w.grain.stockMotion!.formula)))) {
    const loose = (pool.contents ?? []).filter(c => stock(c) && identity(c.formula) === formula).reduce((s, c) => s + c.mass_g, 0);
    const grains = wet.filter(w => identity(w.grain.stockMotion!.formula) === formula);
    const mass = loose + grains.reduce((s, w) => s + w.grain.mass_g, 0);
    fractions.set(formula, (loose + grains.reduce((s, w) => s + w.grain.mass_g * w.contact.fraction, 0)) / mass);
  }
  return { sample, fractions };
}

/** Allocate the actual consumed solid among wetted sources with capacity
 * limits. Weight affects kinetics/ownership, never atom or mass creation. */
export function splitWetStock(pool: SpillState, wet: WetStock[], sample: SpillState, reacted: SpillState) {
  const changed = reacted.contents !== sample.contents;
  if (!changed) {
    const patch = { gasRate_mol_s: reacted.gasRate_mol_s, vaporRate_g_s: reacted.vaporRate_g_s,
      reactionProgramId: reacted.reactionProgramId, chemistryLimit: reacted.chemistryLimit, solidContactSites: undefined };
    return { pool: Object.entries(patch).every(([key, value]) => pool[key as keyof SpillState] === value) ? pool : { ...pool, ...patch }, grains: wet.map(w => w.grain) };
  }
  const formulas = new Set(wet.map(w => identity(w.grain.stockMotion!.formula)));
  const retained = (reacted.contents ?? []).filter(c => !(stock(c) && formulas.has(identity(c.formula))));
  const remaining = new Map<string, SubstanceContent[]>();
  const consumed = new Map<string, number>();
  for (const formula of formulas) {
    const sources = [{ id: pool.id, rows: (pool.contents ?? []).filter(c => stock(c) && identity(c.formula) === formula), fraction: 1 },
      ...wet.filter(w => identity(w.grain.stockMotion!.formula) === formula).map(w => ({ id: w.grain.id, rows: w.grain.contents!, fraction: w.contact.fraction }))];
    const masses = sources.map(s => s.rows.reduce((m, c) => m + c.mass_g, 0)), taken = masses.map(() => 0);
    const total = masses.reduce((m, c) => m + c, 0);
    const after = (reacted.contents ?? []).filter(c => stock(c) && identity(c.formula) === formula).reduce((m, c) => m + c.mass_g, 0);
    let demand = Math.max(0, total - after);
    // At most one source saturates per pass; no unbounded convergence loop.
    for (let pass = 0; demand > 1e-14 && pass <= sources.length; pass++) {
      const weights = masses.map((m, i) => Math.max(0, m - taken[i]) * sources[i].fraction), sum = weights.reduce((s, w) => s + w, 0);
      if (!(sum > 0)) break;
      const step = demand;
      for (let i = 0; i < sources.length; i++) { const take = Math.min(masses[i] - taken[i], step * weights[i] / sum); taken[i] += take; demand -= take; }
    }
    for (let i = 0; i < sources.length; i++) {
      const keep = masses[i] > 0 ? Math.max(0, 1 - taken[i] / masses[i]) : 0;
      const rows = sources[i].rows.map(c => ({ ...c, mass_g: c.mass_g * keep, moles: c.moles * keep })).filter(c => c.mass_g > 0);
      if (sources[i].id === pool.id) retained.push(...rows);
      else { remaining.set(sources[i].id, rows); consumed.set(sources[i].id, taken[i]); }
    }
  }
  const grains = wet.map(({ grain }) => {
    const contents = remaining.get(grain.id) ?? grain.contents!, mass_g = contents.reduce((s, c) => s + c.mass_g, 0), pose = grain.stockMotion!;
    return { ...grain, contents, mass_g, temperature_c: reacted.temperature_c,
      radius: grain.radius * Math.cbrt(mass_g / grain.mass_g),
      stockMotion: { ...pose, mass_g, scale_m: pose.scale_m * Math.cbrt(mass_g / grain.mass_g) } };
  });
  const sites = wet.filter(w => (consumed.get(w.grain.id) ?? 0) > 0).map(w => ({ grainId: w.grain.stockMotion!.id,
    position: w.contact.position, weight: consumed.get(w.grain.id)! }));
  return { pool: { ...reacted, contents: retained, mass_g: reacted.mass_g - grains.reduce((s, g) => s + g.mass_g, 0),
    substances: [...new Set(retained.filter(c => c.mass_g > 0).map(c => c.formula))], solidContactSites: sites.length ? sites : undefined }, grains };
}
