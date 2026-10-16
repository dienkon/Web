import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState } from '../store/useAppStore';

/** A retained product is not an ongoing source of gas, sparks or new solid. */
export function reactionIsEmitting(kinetics?: Pick<ActiveKineticsState, 'progress' | 'duration'>): boolean {
  return Boolean(kinetics && Number.isFinite(kinetics.progress) && kinetics.progress >= 0
    && kinetics.progress < 1 && Number.isFinite(kinetics.duration) && kinetics.duration > 0);
}

export function resolveReactionEmission(vessel: VesselState, kinetics?: ActiveKineticsState, paused = false) {
  const running = !paused && !vessel.isShattered && reactionIsEmitting(kinetics);
  return {
    running,
    gas: running && Boolean(kinetics?.hasGas) && vessel.hasGas,
    precipitating: running && Boolean(kinetics?.hasPrecipitate),
    // A warm solution is not automatically an opaque white steam cloud.
    steam: !paused && !vessel.isShattered && vessel.volume_ml > 0.5
      && vessel.isBoiling && vessel.temperature_c >= 90,
    retainedSolid: !vessel.isShattered && (vessel.precipitateAmount_g ?? 0) > 1e-12,
  };
}
