import type { VesselState } from '../types/chemistry';
import { cachedAqueousEquilibrium } from '../science/aqueousEquilibrium';
import { solutionIndicatorColor } from '../science/indicatorAppearance';

/** Derived state only; never consume or fabricate inventory to display pH. */
export function projectAqueousSolution(vessel: VesselState): Partial<VesselState> | null {
  if (vessel.id.startsWith('lesson_vessel_')) return null;
  const equilibrium = cachedAqueousEquilibrium(vessel.contents, vessel.volume_ml);
  if (!equilibrium) return vessel.phModel ? { phModel: undefined } : null;
  const color = solutionIndicatorColor(vessel.contents, equilibrium.ph);
  if (Math.abs(vessel.ph - equilibrium.ph) < 1e-9 && vessel.phModel === 'ideal_aqueous_25c'
    && (!color || color === vessel.liquidColor)) return null;
  return { ph: equilibrium.ph, phModel: 'ideal_aqueous_25c', ...(color ? { liquidColor: color } : {}) };
}
