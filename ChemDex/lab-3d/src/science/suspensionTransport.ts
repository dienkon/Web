import type { VesselState } from '../types/chemistry';
import { precipitateComponents, precipitateCohorts, precipitateCohortOutflow } from './precipitateInventory';
import { freePrecipitateCohorts } from './freePrecipitateCohorts';

export interface MobileSolidInventory {
  [formula: string]: { inventoryMass_g: number; suspendedMass_g: number;
    cohorts?: Record<string, { inventoryMass_g: number; suspendedMass_g: number }> };
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
