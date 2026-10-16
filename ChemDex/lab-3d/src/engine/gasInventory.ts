import type { VesselState } from '../types/chemistry';

/** Finite open-vessel gas sink. A second projection cannot remove it twice. */
export function projectEscapedGas(vessel: VesselState): Partial<VesselState> | null {
  if (vessel.isSealed || vessel.id.startsWith('lesson_vessel_')) return null;
  const gas = vessel.contents.filter(item => item.phase === 'g' && item.moles > 1e-12);
  if (!gas.length) return null;
  const escaped = { ...vessel.escapedGas_g };
  let mass = 0;
  for (const item of gas) {
    mass += item.mass_g;
    escaped[item.formula] = (escaped[item.formula] ?? 0) + item.mass_g;
  }
  const contents = vessel.contents.filter(item => item.phase !== 'g');
  return {
    contents,
    substances: [...new Set(contents.filter(item => item.moles > 1e-12).map(item => item.formula))],
    mass_g: Math.max(0, vessel.mass_g - mass),
    escapedGas_g: escaped,
  };
}
