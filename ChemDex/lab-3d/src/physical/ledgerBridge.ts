import type { SubstanceContent, VesselState } from '../types/chemistry';
import { readComposition } from '../science/balance';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { ICE_CP_J_G_K, WATER_CP_J_G_K } from '../engine/waterProperties';
import { decantLiquid } from '../engine/decantTransfer';
import type { MobileSolidInventory } from '../science/suspensionTransport';
import { MatterLedger, conservedTotals, type ConservedTotals } from './MatterLedger';
import type { Dispersion, MatterLocation, MatterParcel, MatterPhase } from './types';

const REFERENCE_TEMP_C = 25;

function inferMatterPhase(item: SubstanceContent): MatterPhase {
  const raw = item.phase ?? item.state ?? identifySpecies(item.formula).phase ?? 'l';
  if (raw === 's' || raw === 'solid') return 'solid';
  if (raw === 'g' || raw === 'gas') return 'gas';
  return 'liquid';
}

function inferDispersion(item: SubstanceContent, phase: MatterPhase): Dispersion {
  if (item.location === 'foam') return 'foam';
  if (phase === 'solid') {
    if (item.solidOrigin === 'precipitate') {
      return item.precipitateFormation === 'gelatinous' ? 'gel' : 'suspension';
    }
    return 'bulk';
  }
  const raw = item.phase ?? item.state ?? identifySpecies(item.formula).phase;
  return raw === 'aq' ? 'solution' : 'bulk';
}

function parcelKey(ownerId: string, location: MatterLocation, species: string, phase: MatterPhase, dispersion: Dispersion): string {
  return `${ownerId}:${location}:${species}:${phase}:${dispersion}`;
}

function estimatedSensibleEnthalpyJ(item: SubstanceContent, phase: MatterPhase, temperature_c: number): number {
  const dT = Number.isFinite(temperature_c) ? temperature_c - REFERENCE_TEMP_C : 0;
  const mass_g = Math.max(0, item.mass_g);
  if (phase === 'solid' && sameMolecularFormula(item.formula, 'H2O')) {
    return mass_g * ICE_CP_J_G_K * dT;
  }
  if (phase === 'liquid') {
    return mass_g * WATER_CP_J_G_K * dT;
  }
  // Estimated sensible heat capacity for general solids/gases (~0.85 J/(g·K) reference).
  return mass_g * 0.85 * dT;
}

/**
 * Projects a VesselState's quantitative substance inventory into SI MatterParcels
 * compatible with the verified physics MatterLedger. Aggregates duplicate
 * (species, phase, dispersion, location) keys so every parcel ID is unique.
 */
export function vesselToMatterParcels(vessel: VesselState, location: MatterLocation = 'vessel'): MatterParcel[] {
  const aggregated = new Map<string, MatterParcel>();
  for (const item of vessel.contents) {
    if (!Number.isFinite(item.mass_g) || item.mass_g <= 0 || !Number.isFinite(item.moles) || item.moles < 0) continue;
    const species = identifySpecies(item.formula).formula || item.formula;
    const phase = inferMatterPhase(item);
    const dispersion = inferDispersion(item, phase);
    const id = parcelKey(vessel.id, location, species, phase, dispersion);
    const comp = readComposition(species);
    const elements_mol: Record<string, number> = {};
    for (const [el, count] of Object.entries(comp.atoms)) {
      elements_mol[el] = count * item.moles;
    }
    const enthalpy_J = estimatedSensibleEnthalpyJ(item, phase, vessel.temperature_c);
    const charge_mol = comp.charge * item.moles;
    const mass_kg = item.mass_g / 1000;
    const existing = aggregated.get(id);
    if (existing) {
      existing.mass_kg += mass_kg;
      existing.amount_mol += item.moles;
      existing.enthalpy_J += enthalpy_J;
      existing.charge_mol += charge_mol;
      for (const [el, n] of Object.entries(elements_mol)) {
        existing.elements_mol[el] = (existing.elements_mol[el] ?? 0) + n;
      }
    } else {
      aggregated.set(id, {
        id,
        ownerId: vessel.id,
        species,
        phase,
        dispersion,
        location,
        mass_kg,
        amount_mol: item.moles,
        enthalpy_J,
        charge_mol,
        elements_mol,
      });
    }
  }
  return [...aggregated.values()];
}

/**
 * Builds an atomic SI MatterLedger covering all vessels currently on the bench.
 */
export function createLabMatterLedger(
  vessels: Record<string, VesselState>,
  existingReceipts: string[] = [],
): MatterLedger {
  const parcels: MatterParcel[] = [];
  for (const vessel of Object.values(vessels)) {
    parcels.push(...vesselToMatterParcels(vessel, 'vessel'));
  }
  return new MatterLedger({ revision: 0, parcels, receipts: existingReceipts });
}

export interface AtomicTransferOutcome {
  duplicate: boolean;
  transferred_kg: number;
  accepted_ml: number;
  spilled_ml: number;
  source: VesselState;
  receiver?: VesselState;
  totalsBefore: ConservedTotals;
  totalsAfter: ConservedTotals;
}

/**
 * Executes a decant/pour transfer coupled with an idempotent SI MatterLedger
 * transaction. Replaying the same receipt across save/reload is a guaranteed no-op
 * and strictly preserves total mass and elemental budgets.
 */
export function applyAtomicVesselTransfer(
  ledger: MatterLedger,
  receipt: string,
  source: VesselState,
  receiver: VesselState | null,
  requested_ml: number,
  mobileSolids: MobileSolidInventory = {},
  options?: { stirringIntensity?: number },
): AtomicTransferOutcome | null {
  if (!receipt) throw new Error('Atomic vessel transfer requires a non-empty receipt');
  const totalsBefore = conservedTotals(ledger.snapshot().parcels);
  const existingReceipts = ledger.snapshot().receipts;
  const receiptPrefix = `${receipt}:`;
  if (existingReceipts.some(r => r === receipt || r.startsWith(receiptPrefix))) {
    return {
      duplicate: true,
      transferred_kg: 0,
      accepted_ml: 0,
      spilled_ml: 0,
      source,
      receiver: receiver ?? undefined,
      totalsBefore,
      totalsAfter: totalsBefore,
    };
  }

  const decanted = decantLiquid(source, receiver, requested_ml, mobileSolids, options);
  if (!decanted) return null;

  const destinationOwnerId = receiver ? receiver.id : `spill:${source.id}`;
  const spillOwnerId = `spill:${source.id}`;
  let transferred_kg = 0;

  // Compute exact moved amounts by comparing source before and after per parcel key.
  const beforeMap = new Map(vesselToMatterParcels(source, 'vessel').map(p => [p.id, p]));
  const afterMap = new Map(vesselToMatterParcels(decanted.source, 'vessel').map(p => [p.id, p]));
  const acceptedFraction = decanted.moved_ml > 0
    ? Math.max(0, Math.min(1, (decanted.moved_ml - (decanted.spill?.volume_ml ?? 0)) / decanted.moved_ml))
    : 0;

  let subIndex = 0;
  for (const [sourceParcelId, beforeParcel] of beforeMap) {
    const afterMass = afterMap.get(sourceParcelId)?.mass_kg ?? 0;
    const delta_kg = Math.max(0, beforeParcel.mass_kg - afterMass);
    if (!(delta_kg > 1e-15)) continue;

    const accepted_kg = receiver ? delta_kg * acceptedFraction : 0;
    const spilled_kg = Math.max(0, delta_kg - accepted_kg);

    if (accepted_kg > 1e-15 && receiver) {
      const destId = parcelKey(destinationOwnerId, 'vessel', beforeParcel.species, beforeParcel.phase, beforeParcel.dispersion);
      const res = ledger.transfer({
        receipt: `${receipt}:recv:${subIndex++}`,
        sourceId: sourceParcelId,
        destinationId: destId,
        ownerId: destinationOwnerId,
        location: 'vessel',
        mass_kg: accepted_kg,
      });
      transferred_kg += res.transferred_kg;
    }

    if (spilled_kg > 1e-15) {
      const spillId = parcelKey(spillOwnerId, 'spill', beforeParcel.species, beforeParcel.phase, beforeParcel.dispersion);
      const res = ledger.transfer({
        receipt: `${receipt}:spill:${subIndex++}`,
        sourceId: sourceParcelId,
        destinationId: spillId,
        ownerId: spillOwnerId,
        location: 'spill',
        mass_kg: spilled_kg,
      });
      transferred_kg += res.transferred_kg;
    }
  }

  const totalsAfter = conservedTotals(ledger.snapshot().parcels);
  return {
    duplicate: false,
    transferred_kg,
    accepted_ml: decanted.accepted_ml,
    spilled_ml: decanted.spill?.volume_ml ?? 0,
    source: decanted.source,
    receiver: decanted.receiver,
    totalsBefore,
    totalsAfter,
  };
}
