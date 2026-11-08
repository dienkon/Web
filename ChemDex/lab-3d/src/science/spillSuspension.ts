import type { SpillState, SubstanceContent } from '../types/chemistry';
import { precipitateComponents } from './precipitateInventory';
import { solveSessileDrop, type SessileDropShape } from './sessileDrop';
import { getPrecipitateProfile } from '../simulation/core/SimulationConfig';
import { sphereSettlingSpeed } from './particleSettling';
import { suspensionFluidProperties } from './suspensionFluid';
import { precipitatePackingFraction } from './precipitatePacking';

export interface SpillSuspensionSpecies {
  formula: string; formation?: string; mass_g: number;
  /** Each cohort is the remaining suspended fraction of an initially uniform
   * volume distribution. Travel is settling distance / current drop height. */
  cohorts: { mass_g: number; travel: number }[];
  initialization: 'arrival-or-reaction' | 'legacy-settled-estimate';
}
export interface SpillSuspensionState { version: 1; species: SpillSuspensionSpecies[] }
const MAX_COHORTS = 24;
const columns = new WeakMap<SessileDropShape, { segments: { height: number; end: number; radius: number; slope: number; volume: number }[]; volume: number }>();
const profiles = new Map<string, ReturnType<typeof getPrecipitateProfile>>();
function components(contents: readonly SubstanceContent[] = []) {
  // Older spill records used state="solid" without a phase field. Normalize
  // the projection only; do not rewrite the quantitative material ledger.
  const rows = contents.some(c => !c.phase && (c.state === 's' || c.state === 'solid'))
    ? contents.map(c => !c.phase && (c.state === 's' || c.state === 'solid') ? { ...c, phase: 's' } : c) : contents;
  return precipitateComponents(rows);
}
export function spillPrecipitateProfile(formula: string, formation?: string) {
  const key = `${formula}:${formation ?? ''}`;
  let profile = profiles.get(key);
  if (!profile) { profile = getPrecipitateProfile(formula, formation); if (profiles.size >= 128) profiles.delete(profiles.keys().next().value!); profiles.set(key, profile); }
  return profile;
}

/** Exact integrals of the piecewise-linear radial profile, not the number of
 * rendered grains. The CDF is the fraction of liquid below a given height. */
export function spillVolumeBelow(drop: SessileDropShape, height_m: number): number {
  if (!(height_m > 0)) return 0;
  if (height_m >= drop.height_m) return 1;
  let column = columns.get(drop);
  if (!column) {
    const segments: { height: number; end: number; radius: number; slope: number; volume: number }[] = [];
    let volume = 0;
    for (let i = drop.profile.length - 1; i > 0; i--) {
      const a = drop.profile[i], b = drop.profile[i - 1], dh = b.height_m - a.height_m;
      if (!(dh > 0)) continue;
      const slope = (b.radius_m - a.radius_m) / dh;
      segments.push({ height: a.height_m, end: b.height_m, radius: a.radius_m, slope, volume });
      volume += Math.PI * dh * (a.radius_m * a.radius_m + a.radius_m * b.radius_m + b.radius_m * b.radius_m) / 3;
    }
    column = { segments, volume }; columns.set(drop, column);
  }
  if (!(column.volume > 0)) return 0;
  let low = 0, high = column.segments.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (column.segments[mid].end < height_m) low = mid + 1; else high = mid; }
  const s = column.segments[low], t = Math.max(0, height_m - s.height);
  const below = s.volume + Math.PI * t * (s.radius * s.radius + s.radius * s.slope * t + s.slope * s.slope * t * t / 3);
  return Math.max(0, Math.min(1, below / column.volume));
}

function bounded(cohorts: SpillSuspensionSpecies['cohorts']) {
  const result = cohorts.filter(c => c.mass_g > 1e-14);
  if (result.length <= MAX_COHORTS) return result;
  result.sort((a, b) => a.travel - b.travel);
  while (result.length > MAX_COHORTS) {
    let index = 0;
    for (let i = 1; i + 1 < result.length; i++) if (result[i + 1].travel - result[i].travel < result[index + 1].travel - result[index].travel) index = i;
    const a = result[index], b = result[index + 1], mass = a.mass_g + b.mass_g;
    result.splice(index, 2, { mass_g: mass, travel: (a.travel * a.mass_g + b.travel * b.mass_g) / mass });
  }
  return result;
}

/** Reconcile only against real solid inventory. Missing historical state is a
 * documented settled estimate, never permission to respawn an old cloud. */
export function reconcileSpillSuspension(spill: Pick<SpillState, 'contents' | 'suspension'>, fresh = false): SpillSuspensionState | undefined {
  const inventory = components(spill.contents);
  if (!inventory.length) return undefined;
  const species = inventory.map(c => {
    const old = spill.suspension?.version === 1 ? spill.suspension.species.find(s => s.formula === c.formula) : undefined;
    const valid = old && Number.isFinite(old.mass_g) && old.mass_g > 0 && old.cohorts.every(k => Number.isFinite(k.mass_g + k.travel)
      && k.mass_g >= 0 && k.travel >= 0 && k.travel <= 1);
    if (!valid) return { ...c, cohorts: fresh ? [{ mass_g: c.mass_g, travel: 0 }] : [],
      initialization: fresh ? 'arrival-or-reaction' as const : 'legacy-settled-estimate' as const };
    if (old.mass_g === c.mass_g && old.formation === c.formation && old.cohorts.length <= MAX_COHORTS
      && old.cohorts.reduce((s, k) => s + k.mass_g, 0) <= c.mass_g) return old;
    const factor = Math.min(1, c.mass_g / old.mass_g);
    let cohorts = old.cohorts.map(k => ({ ...k, mass_g: k.mass_g * factor }));
    const sum = cohorts.reduce((s, k) => s + k.mass_g, 0);
    if (sum > Math.min(c.mass_g, old.mass_g)) cohorts = cohorts.map(k => ({ ...k, mass_g: k.mass_g * Math.min(c.mass_g, old.mass_g) / sum }));
    if (c.mass_g > old.mass_g) cohorts.push({ mass_g: c.mass_g - old.mass_g, travel: 0 });
    return { formula: c.formula, formation: c.formation, mass_g: c.mass_g, cohorts: bounded(cohorts), initialization: old.initialization };
  });
  const state: SpillSuspensionState = { version: 1, species };
  return spill.suspension?.version === 1 && species.length === spill.suspension.species.length
    && species.every((s, i) => s === spill.suspension!.species[i]) ? spill.suspension : state;
}

/** The ideal merger preserves suspended and deposited masses separately.
 * Fresh incoming aliquots are assumed mixed on deposition; old beds stay beds. */
export function mergeSpillSuspensions(samples: { contents?: SubstanceContent[]; suspension?: SpillSuspensionState; fresh?: boolean }[]): SpillSuspensionState | undefined {
  const species = new Map<string, SpillSuspensionSpecies>();
  for (const sample of samples) for (const s of reconcileSpillSuspension(sample, sample.fresh)?.species ?? []) {
    const old = species.get(s.formula);
    species.set(s.formula, old ? { ...old, mass_g: old.mass_g + s.mass_g, cohorts: bounded([...old.cohorts, ...s.cohorts]),
      initialization: old.initialization === 'arrival-or-reaction' || s.initialization === 'arrival-or-reaction' ? 'arrival-or-reaction' : 'legacy-settled-estimate' } : s);
  }
  return species.size ? { version: 1, species: [...species.values()].sort((a, b) => a.formula.localeCompare(b.formula)) } : undefined;
}

export function scaleSpillSuspension(state: SpillSuspensionState | undefined, fraction: number): SpillSuspensionState | undefined {
  return state && { version: 1, species: state.species.map(s => ({ ...s, mass_g: s.mass_g * fraction,
    cohorts: s.cohorts.map(k => ({ ...k, mass_g: k.mass_g * fraction })) })) };
}

/** Analytic vertical, isolated-equivalent-sphere settling in a quiescent drop.
 * No renderer callback owns this state. Shape changes remap normalized height;
 * convection, capillary entrainment and cohesive/yield stress are unresolved. */
export function stepSpillSuspension(before: SpillState, after: SpillState, dt: number): SpillState {
  if (after.stockMotion || !(dt > 0) || !Number.isFinite(dt)) return after;
  if (before === after && before.suspension?.species.every(s => !s.cohorts.length)) return after;
  const base = reconcileSpillSuspension(before);
  let state = base;
  if (!state && !components(after.contents).length) return after.suspension ? { ...after, suspension: undefined } : after;
  state ??= { version: 1, species: [] };
  const active = state.species.some(s => s.cohorts.length);
  if (active) {
    const fluid = suspensionFluidProperties(after.contents ?? [], after.volume_ml, after.temperature_c ?? 25);
    const drop = after.volume_ml > 0 ? solveSessileDrop(after.volume_ml) : null;
    const advanced = state.species.map(s => {
      if (!s.cohorts.length || fluid.carrierMode === 'frozen-matrix') return s;
      if (!drop || fluid.carrierMode === 'dry-residue') return { ...s, cohorts: [] };
      const profile = spillPrecipitateProfile(s.formula, s.formation);
      const speed = sphereSettlingSpeed(profile.baseParticleRadius_mm * 1e-3, profile.particleDensity_g_cm3 * 1000,
        fluid.density_g_ml * 1000, fluid.viscosity_mPa_s * 0.001);
      if (!(speed > 0)) return s;
      const cohorts = s.cohorts.map(k => {
        const travel = Math.min(1, k.travel + speed * dt / drop.height_m);
        const previous = spillVolumeBelow(drop, k.travel * drop.height_m), next = spillVolumeBelow(drop, travel * drop.height_m);
        return { travel, mass_g: previous < 1 ? k.mass_g * Math.max(0, 1 - next) / (1 - previous) : 0 };
      });
      return { ...s, cohorts: bounded(cohorts) };
    });
    if (advanced.some((s, i) => s !== state!.species[i])) state = { ...state, species: advanced };
  }
  // Chemistry's newly committed product arrives at the END of this interval;
  // do not integrate it over time before the material existed.
  state = reconcileSpillSuspension({ contents: after.contents, suspension: state });
  if (state) {
    const births = state.species.map(s => base?.species.some(p => p.formula === s.formula) ? s
      : { ...s, initialization: 'arrival-or-reaction' as const, cohorts: [{ mass_g: s.mass_g, travel: 0 }] });
    if (births.some((s, i) => s !== state!.species[i])) state = { ...state, species: births };
  }
  if (!state) return after.suspension ? { ...after, suspension: undefined } : after;
  return state === after.suspension ? after : { ...after, suspension: state };
}

/** Color and bed volume are a projection of the mass partition, not more
 * inventory. Suspended extinction uses the existing qualitative 1 g/L scale. */
export function spillSuspensionAppearance(spill: Pick<SpillState, 'contents' | 'suspension' | 'volume_ml'>) {
  const state = reconcileSpillSuspension(spill);
  let suspended_g = 0, settled_g = 0, bedVolume_m3 = 0, solidVolume_m3 = 0, scattering_per_m = 0, bedOpticalMass = 0;
  const cloud: { color: string; weight: number }[] = [], bed: { color: string; weight: number }[] = [];
  for (const s of state?.species ?? []) {
    const profile = spillPrecipitateProfile(s.formula, s.formation), suspended = Math.min(s.mass_g, s.cohorts.reduce((m, k) => m + k.mass_g, 0));
    const settled = Math.max(0, s.mass_g - suspended), rho = profile.particleDensity_g_cm3 * 1000;
    suspended_g += suspended; settled_g += settled;
    solidVolume_m3 += s.mass_g / 1000 / rho;
    bedVolume_m3 += settled / 1000 / rho / precipitatePackingFraction(profile);
    bedOpticalMass += settled * profile.cloudinessFactor;
    // At 1 g/L, 1 cm optical path has O(1) extinction. This is illustrative,
    // not an NTU model or a measured scattering cross-section.
    const extinction = spill.volume_ml > 0 ? suspended * 1000 / spill.volume_ml * profile.cloudinessFactor * 100 : 0;
    scattering_per_m += extinction; cloud.push({ color: profile.color, weight: extinction }); bed.push({ color: profile.color, weight: settled });
  }
  return { suspended_g, settled_g, bedVolume_m3, scattering_per_m,
    bedExtinction_per_m: bedVolume_m3 > 0 ? bedOpticalMass / (10 * bedVolume_m3) : 0, cloud, bed,
    modelLimit: spill.volume_ml > 0 && solidVolume_m3 > spill.volume_ml * 1e-6 * 0.01 ? 'solid-displacement-unresolved' as const : undefined };
}
