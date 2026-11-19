import type { VesselState } from '../types/chemistry';
import { precipitateComponents, precipitateCohorts, precipitateCohortOutflow } from './precipitateInventory';
import { freePrecipitateCohorts } from './freePrecipitateCohorts';
import { PRECIPITATE_PROFILES } from '../simulation/core/SimulationConfig';

export interface MobileSolidInventory {
  [formula: string]: { inventoryMass_g: number; suspendedMass_g: number;
    cohorts?: Record<string, { inventoryMass_g: number; suspendedMass_g: number }> };
}

/**
 * Estimates uniform shear-resuspended precipitate mass when a vessel is actively
 * stirred without a live PrecipitationSystem renderer snapshot (e.g., headless or
 * direct manual decant immediately following stirring).
 *
 * Strictly returns an empty inventory when stirringIntensity <= 0 so an unstirred
 * settled bed is never artificially eroded. Entrainment factors are estimated
 * qualitative bounds keyed to morphology settling characteristics.
 */
export function stirredMobileSolids(vessel: VesselState, stirringIntensity: number): MobileSolidInventory {
  if (!Number.isFinite(stirringIntensity) || stirringIntensity <= 0 || !(vessel.volume_ml > 0)) return {};
  const intensity = Math.max(0, Math.min(1, stirringIntensity));
  const raw = precipitateCohorts(vessel.contents, vessel.precipitateSubstance, vessel.precipitateMorphology);
  const free = new Map(freePrecipitateCohorts(vessel).map(c => [c.key, c.mass_g]));
  const result: MobileSolidInventory = {};
  for (const comp of precipitateComponents(vessel.contents, vessel.precipitateSubstance)) {
    const cohorts: NonNullable<MobileSolidInventory[string]['cohorts']> = {};
    let suspendedMass_g = 0;
    const profile = PRECIPITATE_PROFILES[comp.formula];
    // Lower settling speed morphologies (gel_like/flocculent/fine_powder) suspend more completely.
    const morphologyMobility = profile?.morphology === 'gel_like' ? 0.85
      : profile?.morphology === 'flocculent' ? 0.78
      : profile?.morphology === 'fine_powder' ? 0.68
      : profile?.morphology === 'granular' ? 0.55
      : 0.50;
    const fraction = Math.min(0.95, intensity * morphologyMobility);
    for (const cohort of raw.filter(k => k.formula === comp.formula)) {
      const freeMass = free.get(cohort.key) ?? 0;
      const suspended = freeMass > 1e-12 ? Math.min(freeMass, freeMass * fraction) : 0;
      cohorts[cohort.key] = { inventoryMass_g: cohort.mass_g, suspendedMass_g: suspended };
      suspendedMass_g += suspended;
    }
    if (suspendedMass_g > 1e-12) {
      result[comp.formula] = { inventoryMass_g: comp.mass_g, suspendedMass_g, cohorts };
    }
  }
  return result;
}
interface SuspensionTransportSnapshot {
  hasPrecipitationSnapshot: boolean;
  precipitationSystems: ReadonlyMap<string, {
    lastInputMass_g: number | null; sedimentBed: { amount_g: number };
  }>;
  suspensionOutflowApplied_g: ReadonlyMap<string, number>;
}

/** Uniform-suspension sampling, not erosion of a tilted sediment bed. Pending
 * glyph mass is suspended too. A stale or missing snapshot authorizes no solid
 * withdrawal. Outstanding committed withdrawals are deducted before reuse. */
export function mobileSolidInventory(vessel: VesselState, snapshot?: SuspensionTransportSnapshot): MobileSolidInventory {
  const result: MobileSolidInventory = {};
  if (!snapshot?.hasPrecipitationSnapshot) return result;
  const raw = precipitateCohorts(vessel.contents, vessel.precipitateSubstance, vessel.precipitateMorphology);
  const free = new Map(freePrecipitateCohorts(vessel).map(c => [c.key, c.mass_g]));
  for (const c of precipitateComponents(vessel.contents, vessel.precipitateSubstance)) {
    const cohorts: NonNullable<MobileSolidInventory[string]['cohorts']> = {};
    let suspendedMass_g = 0, valid = true;
    for (const cohort of raw.filter(k => k.formula === c.formula)) {
      const freeMass = free.get(cohort.key) ?? 0;
      if (!(freeMass > 0)) { cohorts[cohort.key] = { inventoryMass_g: cohort.mass_g, suspendedMass_g: 0 }; continue; }
      const system = snapshot.precipitationSystems.get(cohort.key);
      const currentOutflow = precipitateCohortOutflow(vessel, cohort.key, cohort.formula);
      const appliedOutflow = snapshot.suspensionOutflowApplied_g.get(cohort.key);
      if (!system || system.lastInputMass_g === null || appliedOutflow === undefined
        || ![currentOutflow, appliedOutflow, system.lastInputMass_g, system.sedimentBed.amount_g].every(Number.isFinite)
        || system.lastInputMass_g < 0 || system.sedimentBed.amount_g < 0
        || system.sedimentBed.amount_g > system.lastInputMass_g + 1e-10
        || currentOutflow < appliedOutflow || currentOutflow < 0) { valid = false; break; }
      const outstanding = currentOutflow - appliedOutflow;
      if (Math.abs(freeMass + outstanding - system.lastInputMass_g) > Math.max(1e-10, freeMass * 1e-8)) { valid = false; break; }
      const remainder = Math.max(0, Math.min(freeMass, system.lastInputMass_g - system.sedimentBed.amount_g - outstanding));
      // Summing parcels into a bed can leave roundoff at ~1e-16 g. The
      // transport solver already clears inventories <=1e-12 g; this cannot
      // authorize a new outgoing crystal row after every parcel has settled.
      const suspended = remainder > 1e-12 ? remainder : 0;
      cohorts[cohort.key] = { inventoryMass_g: cohort.mass_g, suspendedMass_g: suspended };
      suspendedMass_g += suspended;
    }
    if (valid) result[c.formula] = { inventoryMass_g: c.mass_g, suspendedMass_g, cohorts };
  }
  return result;
}
