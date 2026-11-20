import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import {
  bariteIonInventory as ionInventory,
  baritePrecipitationExtent as precipitationExtent,
} from '../../../shared/chemistry/barite.mjs';

export {
  BARITE_KSP_25C, bariteKspAtTemperature, bariteDissolutionEnthalpy_J_mol,
} from '../../../shared/chemistry/barite.mjs';

function* normalizedContents(contents: readonly SubstanceContent[]) {
  for (const item of contents) {
    const identity = identifySpecies(item.formula);
    yield { formula: identity.formula, phase: item.phase ?? identity.phase, moles: item.moles, location: item.location };
  }
}

export function bariteIonInventory(contents: readonly SubstanceContent[]) {
  return ionInventory(normalizedContents(contents));
}

export function baritePrecipitationExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c = 25) {
  return precipitationExtent(normalizedContents(contents), volume_ml, temperature_c);
}
