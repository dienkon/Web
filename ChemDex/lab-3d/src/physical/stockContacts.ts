import type { StockContactBirth, StockContactReceipt } from './stockTypes';

let sequence = 0;
const pending = new Map<number, StockContactReceipt>();
export function stageStockContact(vesselId: string, formula: string, pieces?: StockContactBirth[]) {
  if (!pieces?.length) return null;
  const id = ++sequence;
  pending.set(id, { id, vesselId, formula, resolved: false, pieces: structuredClone(pieces) });
  return id;
}
export function resolveStockContact(id: number | null) { if (id !== null && pending.has(id)) pending.get(id)!.resolved = true; }
export function pendingStockContacts() { return [...pending.values()]; }
export function acknowledgeStockContacts(ids: number[]) { ids.forEach(id => pending.delete(id)); }
