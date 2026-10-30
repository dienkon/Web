import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState } from '../store/useAppStore';
import { waterVisualState } from './waterVisualState';

/** A retained product is not an ongoing source of gas, sparks or new solid. */
export function reactionIsEmitting(kinetics?: Pick<ActiveKineticsState, 'progress' | 'duration' | 'actualProgressRate_s'>): boolean {
  return Boolean(kinetics && Number.isFinite(kinetics.progress) && kinetics.progress >= 0
    && kinetics.progress < 1 && Number.isFinite(kinetics.duration) && kinetics.duration > 0
    && (kinetics.actualProgressRate_s === undefined || (Number.isFinite(kinetics.actualProgressRate_s) && kinetics.actualProgressRate_s > 0)));
}

export function resolveReactionEmission(vessel: VesselState, kinetics?: ActiveKineticsState, paused = false) {
  const running = !paused && !vessel.isShattered && reactionIsEmitting(kinetics);
  return {
    running,
    gas: running && Boolean(kinetics?.hasGas) && vessel.hasGas,
    precipitating: running && Boolean(kinetics?.hasPrecipitate),
    // A warm solution is not automatically an opaque white steam cloud.
    steam: !paused && !vessel.isShattered
      && waterVisualState(vessel).mistRate > 0,
    retainedSolid: !vessel.isShattered && (vessel.precipitateAmount_g ?? 0) > 1e-12,
  };
}
