import type { VesselState } from '../types/chemistry';

export function vesselAgitation(vessel: Pick<VesselState, 'id' | 'stirringIntensity'>,
  state: { stirringVesselId: string | null; activeTool: string | null; selectedVesselId: string | null }) {
  const active = state.stirringVesselId === vessel.id
    || state.activeTool === 'stirring_rod' && state.selectedVesselId === vessel.id;
  if (!active) return 0;
  return Number.isFinite(vessel.stirringIntensity) ? Math.min(1, Math.max(0, vessel.stirringIntensity!)) : 0.65;
}
