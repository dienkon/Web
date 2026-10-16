import type { VesselState } from '../types/chemistry';

/** Breaking glass cannot manufacture 10 mL of water from a dry sample. Gas is
 * vented separately; condensed material remains available for collection. */
export function releaseShatteredInventory(vessel: VesselState) {
  const escapedGas_g = { ...vessel.escapedGas_g };
  let releasedGasMass = 0;
  const contents = vessel.contents.filter(item => {
    const gas = item.phase === 'g' || item.state === 'g' || item.state === 'gas';
    if (gas && Number.isFinite(item.mass_g) && item.mass_g > 0) {
      releasedGasMass += item.mass_g;
      escapedGas_g[item.formula] = (escapedGas_g[item.formula] ?? 0) + item.mass_g;
    }
    return !gas;
  }).map(item => ({ ...item, location: 'bulk' as const }));
  return {
    escapedGas_g,
    spill: { volume_ml: Math.max(0, vessel.volume_ml),
      mass_g: Math.max(0, vessel.mass_g - releasedGasMass), contents,
      substances: [...new Set(contents.filter(item => item.mass_g > 0 || item.moles > 0).map(item => item.formula))] },
  };
}
