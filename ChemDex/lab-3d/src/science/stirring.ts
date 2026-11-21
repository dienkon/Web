import type { VesselState } from '../types/chemistry';
const rodInputs = new Map<string, { intensity: number; at: number }>();
const rodContacts = new Map<string, boolean>();
type StirringState = { stirringVesselId: string | null; activeTool: string | null; selectedVesselId: string | null;
  moveMode?: boolean; isSimulationPaused?: boolean; draggingVesselId?: string | null };
type StirringVessel = Pick<VesselState, 'id' | 'stirringIntensity'> & Partial<Pick<VesselState,
  'volume_ml' | 'isSealed' | 'isShattered' | 'rotationZ' | 'physicalMotion' | 'type' | 'inversionRemaining_s'>>;

export const FLASK_INVERSION_DURATION_S = 1.4;
export function inversionAgitation(vessel: StirringVessel) {
  return vessel.type === 'volumetric_flask' && vessel.isSealed && !vessel.isShattered
    && (vessel.volume_ml ?? 0) > 0 && (vessel.inversionRemaining_s ?? 0) > 0 ? 0.65 : 0;
}

/** One physical rod can only stir one open, upright vessel at a time. */
export function stirringTarget(state: StirringState) {
  const target = state.stirringVesselId ?? (state.activeTool === 'stirring_rod' ? state.selectedVesselId : null);
  return state.moveMode || state.isSimulationPaused || state.draggingVesselId === target ? null : target;
}

export function canStirVessel(vessel: StirringVessel) {
  if (vessel.isSealed || vessel.isShattered || (vessel.volume_ml !== undefined && !(vessel.volume_ml > 0.05))) return false;
  const q = vessel.physicalMotion?.rotation;
  const up = q ? 1 - 2 * (q[0] ** 2 + q[2] ** 2) : Math.cos(vessel.rotationZ ?? 0);
  // The current rod path and vortex both assume a vertical vessel axis.
  // Even a 0.04-rad lean lets a vertical rod strike a narrow flask neck.
  // Retain tolerance for ordinary quaternion/settling roundoff only.
  return Number.isFinite(up) && up >= 1 - 1e-8;
}

/** The renderer gates forcing while the rod is lifted or being inserted. */
export function setRodContact(id: string, immersed?: boolean) {
  if (immersed === undefined) rodContacts.delete(id);
  else rodContacts.set(id, immersed);
}

export function rodIsImmersed(id: string): boolean {
  return rodContacts.get(id) === true;
}

export function setRodInput(id: string, intensity?: number) {
  if (intensity === undefined) rodInputs.delete(id);
  else rodInputs.set(id, { intensity: Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0, at: performance.now() });
}

export function vesselAgitation(vessel: StirringVessel, state: StirringState) {
  if (state.isSimulationPaused || state.moveMode || state.draggingVesselId === vessel.id) return 0;
  const inversion = inversionAgitation(vessel);
  if (inversion > 0) return inversion;
  if (stirringTarget(state) !== vessel.id || !canStirVessel(vessel) || rodContacts.get(vessel.id) === false) return 0;
  const configured = Number.isFinite(vessel.stirringIntensity) ? Math.min(1, Math.max(0, vessel.stirringIntensity!)) : 0.65;
  const input = rodInputs.get(vessel.id);
  return input && performance.now() - input.at < 400 ? Math.max(configured, input.intensity) : configured;
}
