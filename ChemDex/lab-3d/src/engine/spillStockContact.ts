import type { SpillState, SubstanceContent, VesselState } from '../types/chemistry';
import { stockWetContact, type StockWetContact } from '../physical/stockWetContact';
import { identifySpecies } from '../science/speciesIdentity';
import { sampleHeatCapacity } from './thermalState';
import { metalDepositCarrierFormula, releaseUnsupportedMetalDeposits } from '../science/metalSurfaceAppearance';
import { stockSurfacePoints } from '../science/stockSurfaceSamples';
import { withStockContactContext, type StockContactEvaluator } from '../physical/stockContactContext';
import { allocateStockConsumption } from '../physical/stockConsumption';

const identity = (formula: string) => identifySpecies(formula).formula.toLowerCase();
const stock = (c: SubstanceContent) => c.phase === 's' && c.solidOrigin !== 'precipitate'
  && !c.depositSubstrate && (!c.location || c.location === 'bulk');
const boundTo = (row: SubstanceContent, grain: SpillState) => row.phase === 's'
  && (!row.location || row.location === 'bulk') && !row.depositReleased && !!row.depositSubstrate
  && identity(metalDepositCarrierFormula(row)!) === identity(grain.stockMotion!.formula)
  && (!row.depositCarrierId || row.depositCarrierId === grain.stockMotion!.id);
const coreRows = (grain: SpillState) => grain.contents!.filter(row => stock(row)
  && identity(row.formula) === identity(grain.stockMotion!.formula));
export interface WetStock { grain: SpillState; contact: StockWetContact }

export interface WetStockContactContext {
  stockMotion: NonNullable<VesselState['stockMotion']>;
  evaluate: StockContactEvaluator;
}

/** Resolve chemistry against the measured sessile-drop surface in world SI.
 * This context is temporary; neither a synthetic beaker nor a screen-space
 * area can replace the actual wetted carrier in the material ledger. */
function wetStockContactContext(wet: WetStock[]): WetStockContactContext {
  const measured = wet.map(({ grain, contact }) => {
    const pose = grain.stockMotion!, totalArea = stockSurfacePoints(pose.formula, pose.powder).area * pose.scale_m ** 2;
    return { id: pose.id, formula: pose.formula, mass_g: pose.mass_g, wetFraction: contact.fraction,
      totalArea, wetArea: totalArea * contact.fraction };
  });
  return { stockMotion: { tick: 0, grains: wet.map(({ grain }) => grain.stockMotion!) },
    evaluate: (vessel, formula) => {
      const rows = vessel.contents.filter(row => row.phase === 's' && (!row.location || row.location === 'bulk')
        && row.mass_g > 0 && identity(row.formula) === identity(formula));
      if (!rows.length) return { fraction: 0, contacts: [] };
      const coreMass = rows.filter(stock).reduce((sum, row) => sum + row.mass_g, 0);
      const poses = vessel.stockMotion?.grains.filter(pose => pose.mass_g > 0 && identity(pose.formula) === identity(formula)) ?? [];
      const represented = poses.reduce((sum, pose) => sum + pose.mass_g, 0), ratio = Math.min(1, coreMass / Math.max(represented, 1e-30));
      const contacts = poses.flatMap(pose => {
        const contact = measured.find(item => item.id === pose.id);
        if (!contact) return [];
        const relativeScale = Math.cbrt(pose.mass_g * ratio / Math.max(contact.mass_g, 1e-30));
        return [{ ...contact, mass_g: pose.mass_g * ratio,
          totalArea: contact.totalArea * relativeScale ** 2, wetArea: contact.wetArea * relativeScale ** 2 }];
      });
      const totalArea = contacts.reduce((sum, contact) => sum + contact.totalArea, 0);
      const wetArea = contacts.reduce((sum, contact) => sum + contact.wetArea, 0);
      const posedMass = contacts.reduce((sum, contact) => sum + contact.mass_g, 0);
      // Loose solids already in the liquid pool retain its unresolved bulk
      // contact approximation. They are never made into a mechanical carrier.
      let wetMass = Math.max(0, coreMass - posedMass) + posedMass * (totalArea > 0 ? wetArea / totalArea : 0);
      for (const row of rows.filter(row => !stock(row))) {
        const host = !row.depositReleased && row.depositCarrierId
          ? measured.find(contact => contact.id === row.depositCarrierId
            && identity(contact.formula) === identity(metalDepositCarrierFormula(row) ?? '')) : undefined;
        wetMass += row.mass_g * (host?.wetFraction ?? 1);
      }
      const mass = rows.reduce((sum, row) => sum + row.mass_g, 0);
      return { fraction: Math.max(0, Math.min(1, wetMass / mass)), contacts };
    } };
}

/** A body may feed one pool per step, regardless of record insertion order. */
export function assignWetStock(spills: Record<string, SpillState>): Map<string, WetStock[]> {
  const pools = Object.values(spills).filter(p => !p.stockMotion && p.volume_ml > 0
    && !p.contents?.some(c => c.liquidLayer === 'organic')
    && p.contents?.some(c => identity(c.formula) === 'h2o' && c.phase === 'l' && c.moles > 1e-12))
    .sort((a, b) => a.id.localeCompare(b.id));
  const result = new Map<string, WetStock[]>();
  for (const grain of Object.values(spills).sort((a, b) => a.id.localeCompare(b.id))) {
    const pose = grain.stockMotion;
    if (!pose || !(pose.mass_g > 0) || grain.volume_ml !== 0 || !(grain.mass_g > 0) || !grain.contents?.length
      || !coreRows(grain).some(row => row.mass_g > 0)
      || grain.contents.some(c => !(stock(c) && identity(c.formula) === identity(pose.formula)) && !boundTo(c, grain))) continue;
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
  // A spilled core and its coating have distinct formula inventories. Give
  // historical formula-only coating rows the already known carrier identity
  // in this temporary sample, without moving either material into the pool.
  const contents = [...(pool.contents ?? []), ...wet.flatMap(({ grain }) => grain.contents!.map(row =>
    boundTo(row, grain) && !row.depositCarrierId ? { ...row, depositCarrierId: grain.stockMotion!.id } : row))];
  const sample: SpillState = { ...pool, contents, mass_g: all.reduce((s, c) => s + c.mass_g, 0),
    substances: [...new Set(contents.filter(c => c.mass_g > 0).map(c => c.formula))],
    temperature_c: capacity > 0 ? all.reduce((s, c, i) => s + (c.temperature_c ?? 25) * capacities[i], 0) / capacity : pool.temperature_c };
  const fractions = new Map<string, number>();
  for (const formula of new Set(wet.flatMap(w => w.grain.contents!.map(row => identity(row.formula))))) {
    const loose = (pool.contents ?? []).filter(c => c.phase === 's' && identity(c.formula) === formula).reduce((s, c) => s + c.mass_g, 0);
    const masses = wet.map(w => w.grain.contents!.filter(row => identity(row.formula) === formula).reduce((sum, row) => sum + row.mass_g, 0));
    const mass = loose + masses.reduce((sum, value) => sum + value, 0);
    fractions.set(formula, mass > 0 ? (loose + wet.reduce((sum, w, i) => sum + masses[i] * w.contact.fraction, 0)) / mass : 0);
  }
  return { sample, fractions, contactContext: wetStockContactContext(wet) };
}

/** Use the same finite material allocation as the reaction depositor: loose
 * pool stock first, then wetted carriers by measured area and capacity. The
 * contact fraction affects the rate, never atom or mass creation. */
export function splitWetStock(pool: SpillState, wet: WetStock[], sample: SpillState, reacted: SpillState,
  contactContext = wetStockContactContext(wet)) {
  const changed = reacted.contents !== sample.contents;
  if (!changed) {
    const patch = { gasRate_mol_s: reacted.gasRate_mol_s, vaporRate_g_s: reacted.vaporRate_g_s,
      reactionProgramId: reacted.reactionProgramId, chemistryLimit: reacted.chemistryLimit, solidContactSites: undefined };
    return { pool: Object.entries(patch).every(([key, value]) => pool[key as keyof SpillState] === value) ? pool : { ...pool, ...patch }, grains: wet.map(w => w.grain) };
  }
  const formulas = new Set(wet.map(w => identity(w.grain.stockMotion!.formula)));
  const isOwnedCoating = (row: SubstanceContent) => !!row.depositCarrierId
    && wet.some(({ grain }) => row.depositCarrierId === grain.stockMotion!.id && boundTo(row, grain));
  const retained = (reacted.contents ?? []).filter(c => !(stock(c) && formulas.has(identity(c.formula))) && !isOwnedCoating(c));
  const remaining = new Map<string, SubstanceContent[]>();
  const consumed = new Map<string, number>();
  const before = withStockContactContext({ ...sample, stockMotion: contactContext.stockMotion } as unknown as VesselState,
    contactContext.evaluate);
  const allocated = allocateStockConsumption(before, reacted.contents ?? [])!;
  for (const formula of formulas) {
    const sources = [{ id: pool.id, carrierId: undefined, rows: (pool.contents ?? []).filter(c => stock(c) && identity(c.formula) === formula) },
      ...wet.filter(w => identity(w.grain.stockMotion!.formula) === formula)
        .map(w => ({ id: w.grain.id, carrierId: w.grain.stockMotion!.id, rows: coreRows(w.grain) }))];
    const masses = sources.map(s => s.rows.reduce((m, c) => m + c.mass_g, 0));
    const after = (reacted.contents ?? []).filter(c => stock(c) && identity(c.formula) === formula).reduce((m, c) => m + c.mass_g, 0);
    const kept = sources.map((source, i) => i === 0 ? 0 : allocated.grains.find(pose => pose.id === source.carrierId)?.mass_g ?? masses[i]);
    kept[0] = Math.min(masses[0], Math.max(0, after - kept.reduce((sum, mass) => sum + mass, 0)));
    for (let i = 0; i < sources.length; i++) {
      const keep = masses[i] > 0 ? Math.max(0, Math.min(1, kept[i] / masses[i])) : 0;
      const rows = sources[i].rows.map(c => ({ ...c, mass_g: c.mass_g * keep, moles: c.moles * keep })).filter(c => c.mass_g > 0);
      if (sources[i].id === pool.id) retained.push(...rows);
      else { remaining.set(sources[i].id, rows); consumed.set(sources[i].id, masses[i] - kept[i]); }
    }
  }
  const grains = wet.map(({ grain }) => {
    const core = remaining.get(grain.id) ?? coreRows(grain), coreMass = core.reduce((sum, row) => sum + row.mass_g, 0), pose = grain.stockMotion!;
    const coatings = (reacted.contents ?? []).filter(row => row.depositCarrierId === pose.id && isOwnedCoating(row));
    const beforeCoating = grain.contents!.filter(row => boundTo(row, grain)).reduce((sum, row) => sum + row.mass_g, 0);
    const afterCoating = (reacted.contents ?? []).filter(row => row.depositCarrierId === pose.id
      && !!row.depositSubstrate && identity(metalDepositCarrierFormula(row)!) === identity(pose.formula)).reduce((sum, row) => sum + row.mass_g, 0);
    consumed.set(grain.id, (consumed.get(grain.id) ?? 0) + Math.max(0, beforeCoating - afterCoating));
    if (!(coreMass > 1e-12)) {
      // The mechanical carrier has disappeared. Its coating now belongs to
      // the contacted puddle, and must not leave a hidden zero-core body.
      retained.push(...core, ...coatings.map(row => ({ ...row, depositReleased: true })));
      return { ...grain, contents: [], substances: [], mass_g: 0, stockMotion: undefined };
    }
    const contents = [...core, ...coatings], mass_g = contents.reduce((sum, row) => sum + row.mass_g, 0);
    const scale = Math.cbrt(coreMass / pose.mass_g);
    return { ...grain, contents, substances: [...new Set(contents.map(row => row.formula))], mass_g, temperature_c: reacted.temperature_c,
      radius: grain.radius * scale,
      stockMotion: { ...pose, mass_g: coreMass, scale_m: pose.scale_m * scale } };
  });
  const sites = wet.filter(w => (consumed.get(w.grain.id) ?? 0) > 0).map(w => ({ grainId: w.grain.stockMotion!.id,
    position: w.contact.position, weight: consumed.get(w.grain.id)! }));
  return { pool: { ...reacted, contents: releaseUnsupportedMetalDeposits(retained), mass_g: reacted.mass_g - grains.reduce((s, g) => s + g.mass_g, 0),
    substances: [...new Set(retained.filter(c => c.mass_g > 0).map(c => c.formula))], solidContactSites: sites.length ? sites : undefined }, grains };
}
