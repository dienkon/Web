import type { MatterInventory, MatterLocation, MatterParcel } from './types';
export interface ConservedTotals { mass_kg: number; enthalpy_J: number; charge_mol: number; elements_mol: Record<string, number> }
export interface MatterTransfer { receipt: string; sourceId: string; destinationId: string; ownerId: string; location: MatterLocation; mass_kg: number }
export interface MatterSave extends MatterInventory { receipts: string[] }
export function conservedTotals(parcels: readonly MatterParcel[]): ConservedTotals {
  const total: ConservedTotals = { mass_kg: 0, enthalpy_J: 0, charge_mol: 0, elements_mol: {} };
  for (const p of parcels) {
    total.mass_kg += p.mass_kg; total.enthalpy_J += p.enthalpy_J; total.charge_mol += p.charge_mol;
    for (const [e, n] of Object.entries(p.elements_mol)) total.elements_mol[e] = (total.elements_mol[e] ?? 0) + n;
  }
  return total;
}
function validParcel(p: MatterParcel) {
  if (!p.id || !p.ownerId || !p.species || ![p.mass_kg, p.amount_mol, p.enthalpy_J, p.charge_mol, ...Object.values(p.elements_mol)].every(Number.isFinite)
    || p.mass_kg < 0 || p.amount_mol < 0 || Object.values(p.elements_mol).some(v => v < 0)) throw new Error('Invalid matter parcel');
}
/** Transactions are atomic and idempotent across save/reload. Escaped gas and
 * waste remain in the ledger, so an open boundary is never an invisible sink. */
export class MatterLedger {
  private state: MatterSave;
  private receipts: Set<string>;
  constructor(input: MatterInventory & { receipts?: string[] }) {
    input.parcels.forEach(validParcel);
    if (new Set(input.parcels.map(p => p.id)).size !== input.parcels.length) throw new Error('Duplicate matter parcel');
    this.state = structuredClone({ ...input, receipts: input.receipts ?? [] });
    this.receipts = new Set(this.state.receipts);
  }
  snapshot(): MatterSave { return structuredClone(this.state); }
  transfer(t: MatterTransfer): { transferred_kg: number; duplicate: boolean } {
    if (!t.receipt || !t.destinationId || t.sourceId === t.destinationId || !Number.isFinite(t.mass_kg) || t.mass_kg < 0) throw new Error('Invalid matter transfer');
    if (this.receipts.has(t.receipt)) return { transferred_kg: 0, duplicate: true };
    const source = this.state.parcels.find(p => p.id === t.sourceId);
    if (!source) throw new Error('Unknown transfer source');
    const destination = this.state.parcels.find(p => p.id === t.destinationId);
    if (destination && (destination.species !== source.species || destination.phase !== source.phase
      || destination.dispersion !== source.dispersion || destination.ownerId !== t.ownerId || destination.location !== t.location)) throw new Error('Incompatible destination');
    const mass = Math.min(source.mass_kg, t.mass_kg), ratio = source.mass_kg > 0 ? mass / source.mass_kg : 0;
    const taken: MatterParcel = { ...structuredClone(source), id: t.destinationId, ownerId: t.ownerId, location: t.location,
      mass_kg: mass, amount_mol: source.amount_mol * ratio, enthalpy_J: source.enthalpy_J * ratio,
      charge_mol: source.charge_mol * ratio, elements_mol: Object.fromEntries(Object.entries(source.elements_mol).map(([e, n]) => [e, n * ratio])) };
    const next = this.state.parcels.map(p => {
      if (p === source) return { ...p, mass_kg: Math.max(0, p.mass_kg - mass), amount_mol: p.amount_mol - taken.amount_mol,
        enthalpy_J: p.enthalpy_J - taken.enthalpy_J, charge_mol: p.charge_mol - taken.charge_mol,
        elements_mol: Object.fromEntries(Object.entries(p.elements_mol).map(([e, n]) => [e, n - (taken.elements_mol[e] ?? 0)])) };
      if (p === destination) return { ...p, mass_kg: p.mass_kg + mass, amount_mol: p.amount_mol + taken.amount_mol,
        enthalpy_J: p.enthalpy_J + taken.enthalpy_J, charge_mol: p.charge_mol + taken.charge_mol,
        elements_mol: Object.fromEntries([...new Set([...Object.keys(p.elements_mol), ...Object.keys(taken.elements_mol)])].map(e => [e, (p.elements_mol[e] ?? 0) + (taken.elements_mol[e] ?? 0)])) };
      return p;
    });
    if (!destination && mass > 0) next.push(taken);
    next.forEach(validParcel);
    this.receipts.add(t.receipt);
    this.state = { revision: this.state.revision + 1, parcels: next, receipts: [...this.receipts] };
    return { transferred_kg: mass, duplicate: false };
  }
}
