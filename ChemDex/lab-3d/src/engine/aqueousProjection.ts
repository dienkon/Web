import type { VesselState } from '../types/chemistry';
import { cachedAqueousEquilibrium, aqueousModelFields } from '../science/aqueousEquilibrium';
import { solutionIndicatorColor } from '../science/indicatorAppearance';
import { magnesiumMixturePh } from '../science/magnesiumHydroxidePrecipitation';
import { copperSulfateAqueousState } from '../science/copperHydroxidePrecipitation';
import { ferricChlorideAqueousState } from '../science/ferricHydroxidePrecipitation';
import { aluminumAqueousState } from '../science/aluminumHydroxideEquilibrium';
import { identifySpecies } from '../science/speciesIdentity';

/** Derived state only; never consume or fabricate inventory to display pH. */
export function projectAqueousSolution(vessel: VesselState): Partial<VesselState> | null {
  if (vessel.id.startsWith('lesson_vessel_')) return null;
  const equilibrium = cachedAqueousEquilibrium(vessel.contents, vessel.volume_ml, vessel.temperature_c);
  if (!equilibrium) {
    const copper = vessel.contents.some(c => c.moles > 0 && c.formula === 'CuSO4')
      ? copperSulfateAqueousState(vessel.contents, vessel.volume_ml, vessel.temperature_c) : null;
    const iron = vessel.contents.some(c => c.moles > 0 && c.formula === 'FeCl3')
      ? ferricChlorideAqueousState(vessel.contents, vessel.volume_ml, vessel.temperature_c) : null;
    const aluminum = vessel.contents.some(c => c.moles > 0 && ['AlCl3', 'Al2(SO4)3', 'Al(OH)3', 'Na[Al(OH)4]'].includes(identifySpecies(c.formula).formula))
      ? aluminumAqueousState(vessel.contents, vessel.volume_ml, vessel.temperature_c) : null;
    const ph = copper?.ph ?? iron?.ph ?? aluminum?.ph ?? magnesiumMixturePh(vessel.contents, vessel.volume_ml, vessel.temperature_c);
    if (ph !== null) {
      const phModel = vessel.temperature_c === 25 ? 'ideal_aqueous_25c' as const : 'ideal_aqueous_temperature' as const;
      if (Math.abs(vessel.ph - ph) < 1e-9 && vessel.phModel === phModel
        && vessel.phReferenceTemperature_c === vessel.temperature_c) return null;
      return { ph, phModel, phReferenceTemperature_c: vessel.temperature_c };
    }
    return vessel.phModel || vessel.phReferenceTemperature_c !== undefined ? aqueousModelFields(null) : null;
  }
  const model = aqueousModelFields(equilibrium);
  const color = solutionIndicatorColor(vessel.contents, equilibrium.ph);
  if (Math.abs(vessel.ph - equilibrium.ph) < 1e-9 && vessel.phModel === model.phModel
    && vessel.phReferenceTemperature_c === model.phReferenceTemperature_c
    && (!color || color === vessel.liquidColor)) return null;
  return { ph: equilibrium.ph, ...model, ...(color ? { liquidColor: color } : {}) };
}
