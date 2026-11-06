import type { VesselState } from '../types/chemistry';

/** New contacts age in simulation time. Legacy snapshots retain their old
 * wall-clock expiry until another actual contact supplies a simulation age. */
export function pourContactRemaining(contact: VesselState['recentPourContact'], now_ms = Date.now()): number {
  if (!contact) return 0;
  const remaining = contact.remaining_s ?? (contact.expiresAt_ms - now_ms) / 1000;
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
}
