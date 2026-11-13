import type { VesselState } from '../types/chemistry';
const rodInputs = new Map<string, { intensity: number; at: number }>();
export function setRodInput(id: string, intensity?: number) {
  if (intensity === undefined) rodInputs.delete(id);
  else rodInputs.set(id, { intensity: Math.max(0, Math.min(1, intensity)), at: performance.now() });
}

export function vesselAgitation(vessel: Pick<VesselState, 'id' | 'stirringIntensity'>,
  state: { stirringVesselId: string | null; activeTool: string | null; selectedVesselId: string | null }) {
  const active = state.stirringVesselId === vessel.id
    || state.activeTool === 'stirring_rod' && state.selectedVesselId === vessel.id;
  if (!active) return 0;
  const configured = Number.isFinite(vessel.stirringIntensity) ? Math.min(1, Math.max(0, vessel.stirringIntensity!)) : 0.65;
  const input = rodInputs.get(vessel.id);
  return input && performance.now() - input.at < 400 ? Math.max(configured, input.intensity) : configured;
}
