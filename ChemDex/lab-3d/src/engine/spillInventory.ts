import type { SpillState, SubstanceContent, VesselState } from '../types/chemistry';
import { calculateSpillRadius } from '../science/overflowPhysics';
import { vesselWorldDimensions } from '../science/vesselScale';
import { LAB_PHYSICS } from './interactionEngine';
import { sameMolecularFormula } from '../science/speciesIdentity';
import type { LiquidAliquot } from '../handling/aliquot';

/** Snapshot a local-spout overflow landing location into world coordinates.
 * Store it at deposition; later glassware motion must not move the spill. */
export function overflowLandingPosition(vessel: Pick<VesselState, 'type' | 'capacity_ml' | 'position' | 'rotationY'>): [number, number, number] {
  const radius = vesselWorldDimensions(vessel).baseRadius * 1.02, angle = vessel.rotationY ?? 0;
  return [vessel.position[0] + radius * Math.cos(angle), LAB_PHYSICS.TABLE_SURFACE_Y, vessel.position[2] + radius * Math.sin(angle)];
}

let spillSequence = 0;
const hazardous = (substances: string[]) => substances.some(sub => ['H2SO4', 'HCl', 'HNO3', 'NaOH', 'BaCl2'].some(h => sub.includes(h)));
const footprintCache = new WeakMap<SpillState, { volume_ml: number; radius: number }>();
function currentRadius(spill: SpillState): number {
  const cached = footprintCache.get(spill);
  if (cached?.volume_ml === spill.volume_ml) return cached.radius;
  const radius = calculateSpillRadius(spill.volume_ml);
  footprintCache.set(spill, { volume_ml: spill.volume_ml, radius });
  return radius;
}

/** Radius is derived display/interaction data, never an inventory quantity.
 * Upgrade old saves/history without changing position, mass or composition. */
export function normalizeSpillFootprints(spills: Record<string, SpillState>): Record<string, SpillState> {
  let normalized = spills;
  for (const [key, spill] of Object.entries(spills)) {
    const radius = currentRadius(spill);
    if (radius === spill.radius) continue;
    if (normalized === spills) normalized = { ...spills };
    normalized[key] = { ...spill, radius };
    footprintCache.set(normalized[key], { volume_ml: spill.volume_ml, radius });
  }
  return normalized;
}

type Footprint = { position: [number, number, number]; volume_ml: number; radius: number; contents?: SubstanceContent[]; substances: string[] };

function liquidFamily(spill: Footprint): string | undefined {
  const layers = new Set(spill.contents?.filter(c => c.mass_g > 0).map(c => c.liquidLayer).filter(Boolean));
  if (spill.contents?.some(c => c.mass_g > 0 && (c.phase === 'aq' || sameMolecularFormula(c.formula, 'H2O')))
    || !spill.contents?.length && spill.substances.some(s => sameMolecularFormula(s, 'H2O'))) layers.add('aqueous');
  return layers.size ? [...layers].sort().join('+') : undefined;
}

/** Contact eligibility, not a microscopic bridge-growth or miscibility model. */
function footprintsTouch(a: Footprint, b: Footprint): boolean {
  const distance = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
  if ((a.volume_ml > 0) !== (b.volume_ml > 0)) return false;
  if (a.volume_ml === 0) return distance <= 1e-10; // dry point inventory: no invented wet capture radius
  if (!(a.radius > 0 && b.radius > 0)) return false;
  return distance <= a.radius + b.radius + 1e-10;
}

function aggregateContents(groups: (SubstanceContent[] | undefined)[], totalVolume_ml: number) {
  const merged: SubstanceContent[] = [];
  for (const group of groups) for (const item of group ?? []) {
    const found = merged.find(target => target.formula === item.formula && target.phase === item.phase && target.state === item.state
      && target.liquidLayer === item.liquidLayer && target.location === item.location
      && target.solidOrigin === item.solidOrigin && target.precipitateFormation === item.precipitateFormation);
    if (found) {
      found.mass_g += item.mass_g; found.moles += item.moles;
      for (const key of ['volume_ml', 'initialMass_g', 'initialMoles'] as const) {
        if (item[key] !== undefined) found[key] = (found[key] ?? 0) + item[key]!;
      }
    } else merged.push({ ...item });
  }
  const organic = merged.some(c => c.mass_g > 0 && c.liquidLayer === 'organic');
  for (const item of merged) {
    if (item.phase === 'aq' && totalVolume_ml > 0 && !organic) item.concentration_M = item.moles / (totalVolume_ml / 1000);
    else if (item.concentration_M !== undefined) delete item.concentration_M;
  }
  return merged;
}

/** Pure quasistatic inventory merge. Only the connected contact component of
 * the arriving footprint can join; unknown liquids still assume compatibility.
 * Explicitly distinct liquid layers and dry/wet deposits stay separate. */
export function mergeWorkbenchSpill(
  spills: Record<string, SpillState>, pos: [number, number, number], volume_ml: number,
  substances: string[], color: string, sourceName?: string, actualMass_g?: number, contents?: SubstanceContent[],
): Record<string, SpillState> {
  if (!Number.isFinite(volume_ml) || volume_ml < 0 || pos.some(n => !Number.isFinite(n))
    || (volume_ml === 0 && !(actualMass_g !== undefined && actualMass_g > 0))
    || (actualMass_g !== undefined && (!Number.isFinite(actualMass_g) || actualMass_g < 0))) return spills;
  const addedMass = actualMass_g ?? volume_ml;
  const incoming: Footprint = { position: [...pos], volume_ml, radius: calculateSpillRadius(volume_ml), contents, substances };
  // Recompute legacy footprints from volume rather than trusting an old radius.
  const candidates = Object.entries(spills).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, spill]) => ({ key, spill, footprint: { ...spill, radius: currentRadius(spill) }, family: liquidFamily(spill) }));
  const selected = new Set<string>(), frontier: Footprint[] = [incoming];
  let mergedFamily = liquidFamily(incoming);
  for (let i = 0; i < frontier.length; i++) for (const candidate of candidates) {
    if (selected.has(candidate.key)) continue;
    const family = candidate.family;
    if (family && mergedFamily && mergedFamily !== family) continue;
    if (!footprintsTouch(frontier[i], candidate.footprint)) continue;
    selected.add(candidate.key); frontier.push(candidate.footprint); mergedFamily ??= family;
  }
  const members = candidates.filter(candidate => selected.has(candidate.key));
  if (members.length) {
    const totalVol = volume_ml + members.reduce((sum, c) => sum + c.spill.volume_ml, 0);
    const totalMass = addedMass + members.reduce((sum, c) => sum + c.spill.mass_g, 0);
    // Instant relaxation assumes no resolved horizontal substrate impulse.
    // Preserve the mass first moment; volume weighting would shift dense samples.
    const weight = totalMass > 0 ? totalMass : totalVol;
    const incomingWeight = totalMass > 0 ? addedMass : volume_ml;
    const coordinate = (axis: 0 | 2) => (pos[axis] * incomingWeight + members.reduce((sum, c) => sum
      + c.spill.position[axis] * (totalMass > 0 ? c.spill.mass_g : c.spill.volume_ml), 0)) / weight;
    const primary = members[0], result = { ...spills };
    for (const member of members) delete result[member.key];
    result[primary.key] = { ...primary.spill, contents: aggregateContents([...members.map(c => c.spill.contents), contents], totalVol),
      position: [coordinate(0), primary.spill.position[1], coordinate(2)], volume_ml: totalVol, mass_g: totalMass,
      radius: calculateSpillRadius(totalVol), substances: [...new Set([...members.flatMap(c => c.spill.substances), ...substances])].sort(),
      isHazard: hazardous(substances) || members.some(c => c.spill.isHazard), timestamp: Date.now() };
    footprintCache.set(result[primary.key], { volume_ml: totalVol, radius: result[primary.key].radius });
    return result;
  }
  const id = `spill_${Date.now()}_${++spillSequence}`;
  const created: SpillState = { id, position: [pos[0], pos[1] < -0.5 ? pos[1] : -1.155, pos[2]],
    substances: [...substances], color: color || '#38bdf8', volume_ml, mass_g: addedMass,
    radius: incoming.radius, isHazard: hazardous(substances),
    contents: contents?.map(item => ({ ...item })), sourceVesselName: sourceName, timestamp: Date.now() };
  footprintCache.set(created, { volume_ml, radius: incoming.radius });
  return { ...spills, [id]: created };
}

/** Deposit simultaneous quadrature sites as one material transaction. Union
 * contact components before relaxation: processing a circular sheet from its
 * first azimuth onward would introduce a preferred direction into the pool.
 * Repeat after relaxation because merged footprints can contact another pool.
 * Untouched old components retain their original identity/state. */
export function mergeWorkbenchSpillBatch(spills: Record<string, SpillState>, positions: readonly [number, number, number][],
  sample: LiquidAliquot, sourceName?: string): Record<string, SpillState> {
  if (!positions.length || !(sample.volume_ml > 0) || !Number.isFinite(sample.mass_g) || sample.mass_g < 0
    || positions.some(p => p.some(v => !Number.isFinite(v)))) return spills;
  const volume_ml = sample.volume_ml / positions.length, mass_g = sample.mass_g / positions.length;
  let nodes = Object.entries(spills).sort(([a], [b]) => a.localeCompare(b)).map(([key, spill]) => ({ key, spill, active: false }));
  for (const position of positions) {
    const id = `spill_${Date.now()}_${++spillSequence}`;
    const spill: SpillState = { id, position: [...position], volume_ml, mass_g, radius: calculateSpillRadius(volume_ml),
      substances: [...sample.substances], color: sample.color, sourceVesselName: sourceName, timestamp: Date.now(),
      isHazard: hazardous(sample.substances), contents: sample.contents.map(c => ({ ...c,
        moles: c.moles / positions.length, mass_g: c.mass_g / positions.length,
        ...(c.volume_ml !== undefined ? { volume_ml: c.volume_ml / positions.length } : {}),
        ...(c.initialMass_g !== undefined ? { initialMass_g: c.initialMass_g / positions.length } : {}),
        ...(c.initialMoles !== undefined ? { initialMoles: c.initialMoles / positions.length } : {}) })) };
    nodes.push({ key: id, spill, active: true });
  }
  for (;;) {
    const parents = nodes.map((_, i) => i);
    const root = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
    const footprints = nodes.map(n => ({ ...n.spill, radius: currentRadius(n.spill) }));
    const families = footprints.map(liquidFamily);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      if (!footprintsTouch(footprints[i], footprints[j])) continue;
      const a = root(i), b = root(j);
      if (a === b || families[a] && families[b] && families[a] !== families[b]) continue;
      parents[b] = a; families[a] ??= families[b];
    }
    const groups = new Map<number, typeof nodes>();
    nodes.forEach((n, i) => { const r = root(i), members = groups.get(r) ?? []; members.push(n); groups.set(r, members); });
    const next: typeof nodes = [];
    let merged = false;
    for (const members of groups.values()) {
      if (members.length === 1 || !members.some(n => n.active)) { next.push(...members); continue; }
      merged = true;
      const totalVolume = members.reduce((sum, n) => sum + n.spill.volume_ml, 0), totalMass = members.reduce((sum, n) => sum + n.spill.mass_g, 0);
      const primary = members.find(n => !n.active) ?? members[0], weight = totalMass || totalVolume;
      const coordinate = (axis: 0 | 2) => members.reduce((sum, n) => sum + n.spill.position[axis]
        * (totalMass > 0 ? n.spill.mass_g : n.spill.volume_ml), 0) / weight;
      const spill: SpillState = { ...primary.spill, volume_ml: totalVolume, mass_g: totalMass, radius: calculateSpillRadius(totalVolume),
        position: [coordinate(0), primary.spill.position[1], coordinate(2)], timestamp: Date.now(),
        contents: aggregateContents(members.map(n => n.spill.contents), totalVolume),
        substances: [...new Set(members.flatMap(n => n.spill.substances))].sort(), isHazard: members.some(n => n.spill.isHazard) };
      next.push({ key: primary.key, spill, active: true });
    }
    nodes = next;
    if (!merged) break;
  }
  return Object.fromEntries(nodes.map(n => [n.key, n.spill]));
}
