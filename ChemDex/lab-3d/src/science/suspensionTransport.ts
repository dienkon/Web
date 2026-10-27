import type { VesselState } from '../types/chemistry';
import { precipitateComponents } from './precipitateInventory';
import { metalSurfaceAppearance } from './metalSurfaceAppearance';
import { sameMolecularFormula } from './speciesIdentity';

export interface MobileSolidInventory {
  [formula: string]: { inventoryMass_g: number; suspendedMass_g: number };
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
  const coating = metalSurfaceAppearance(vessel);
  for (const c of precipitateComponents(vessel.contents, vessel.precipitateSubstance)) {
    const system = snapshot.precipitationSystems.get(c.formula);
    const currentOutflow = vessel.precipitateOutflow_g?.[c.formula] ?? 0;
    const appliedOutflow = snapshot.suspensionOutflowApplied_g.get(c.formula);
    if (!system || system.lastInputMass_g === null || appliedOutflow === undefined
      || ![currentOutflow, appliedOutflow, system.lastInputMass_g, system.sedimentBed.amount_g].every(Number.isFinite)
      || system.lastInputMass_g < 0 || system.sedimentBed.amount_g < 0
      || system.sedimentBed.amount_g > system.lastInputMass_g + 1e-10
      || currentOutflow < appliedOutflow || currentOutflow < 0) continue;
    const outstanding = currentOutflow - appliedOutflow;
    const attached = coating && sameMolecularFormula(coating.product, c.formula) ? coating.attachedMass_g : 0;
    const freeMass = Math.max(0, c.mass_g - attached);
    if (Math.abs(freeMass + outstanding - system.lastInputMass_g) > Math.max(1e-10, freeMass * 1e-8)) continue;
    result[c.formula] = { inventoryMass_g: c.mass_g,
      suspendedMass_g: Math.max(0, Math.min(freeMass, system.lastInputMass_g - system.sedimentBed.amount_g - outstanding)) };
  }
  return result;
}
