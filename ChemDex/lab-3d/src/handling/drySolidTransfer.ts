import type { VesselState } from '../types/chemistry';
import { refreshPrecipitateSummary } from './aliquot';
import { solidMaterialVolumeMl } from './solidOccupancy';

/** Finite transfer of an existing dry sample. No stock bottle or new reagent is
 * involved. Wet suspensions, filters, sealed and damaged vessels need other tools. */
export function transferDrySample(source: VesselState, receiver: VesselState, requested_g: number) {
  if (source.id === receiver.id || source.volume_ml > 1e-9 || source.isSealed || receiver.isSealed
    || source.isShattered || receiver.isShattered || !Number.isFinite(requested_g) || requested_g <= 0
    || !source.contents.length || source.contents.some(c => !['s', 'solid'].includes(c.phase ?? c.state ?? '')
      || (c.location && c.location !== 'bulk') || !Number.isFinite(c.mass_g) || c.mass_g < 0)) return null;
  const available = source.contents.reduce((sum, c) => sum + c.mass_g, 0);
  if (!(available > 0)) return null;
  const mass_g = Math.min(requested_g, available), fraction = mass_g / available;
  const moved = source.contents.map(c => ({ ...c, mass_g: c.mass_g * fraction, moles: c.moles * fraction,
    ...(c.volume_ml !== undefined ? { volume_ml: c.volume_ml * fraction } : {}),
    initialMass_g: undefined, initialMoles: undefined }));
  const remaining = source.contents.map(c => ({ ...c, mass_g: c.mass_g * (1-fraction), moles: c.moles * (1-fraction),
    ...(c.volume_ml !== undefined ? { volume_ml: c.volume_ml * (1-fraction) } : {}),
    initialMass_g: undefined, initialMoles: undefined })).filter(c => c.mass_g > 1e-12);
  const contents = [...receiver.contents, ...moved];
  const result = { ...receiver, contents, mass_g: receiver.mass_g + mass_g,
    substances: [...new Set(contents.filter(c => c.moles > 0).map(c => c.formula))] };
  if (solidMaterialVolumeMl(result) + result.volume_ml > receiver.capacity_ml + 1e-8) return null;
  return { mass_g, source: refreshPrecipitateSummary({ ...source, contents: remaining,
    mass_g: Math.max(0, source.mass_g - mass_g), substances: [...new Set(remaining.map(c => c.formula))] }),
    receiver: refreshPrecipitateSummary(result) };
}
