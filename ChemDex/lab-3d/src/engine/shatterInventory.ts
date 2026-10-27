import type { VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';

/** Breaking glass cannot manufacture 10 mL of water from a dry sample. Gas is
 * vented separately; condensed material remains available for collection. */
export function releaseShatteredInventory(vessel: VesselState) {
  const escapedGas_g = { ...vessel.escapedGas_g };
  let releasedGasMass = 0;
  let waterVaporVented_g = 0;
  const contents = vessel.contents.filter(item => {
    const gas = item.phase === 'g' || item.state === 'g' || item.state === 'gas';
    if (gas && Number.isFinite(item.mass_g) && item.mass_g > 0) {
      releasedGasMass += item.mass_g;
      if (sameMolecularFormula(item.formula, 'H2O')) waterVaporVented_g += item.mass_g;
      escapedGas_g[item.formula] = (escapedGas_g[item.formula] ?? 0) + item.mass_g;
    }
    return !gas;
  }).map(item => ({ ...item, location: 'bulk' as const }));
  // Wall beads are a separate liquid inventory, excluded from vessel.mass_g.
  // They must leave the broken glass once, rather than survive on a new body.
  const wall = vessel.wallCondensation;
  const innerWater_g = Math.max(0, wall?.inner_g ?? 0), outerWater_g = Math.max(0, wall?.outer_g ?? 0);
  const wallWater_g = innerWater_g + outerWater_g;
  if (wallWater_g > 0) {
    const water = contents.find(item => item.formula === 'H2O' && item.phase === 'l');
    if (water) {
      water.mass_g += wallWater_g; water.moles += wallWater_g / 18.015;
      if (water.volume_ml !== undefined) water.volume_ml += wallWater_g;
    } else contents.push({ formula: 'H2O', phase: 'l', mass_g: wallWater_g, moles: wallWater_g / 18.015,
      volume_ml: wallWater_g, location: 'bulk' });
  }
  return {
    escapedGas_g,
    waterVaporVented_g,
    wallAfterBreak: wall ? { ...wall, inner_g: 0, outer_g: 0, innerBeads: [], outerBeads: [],
      innerReleasedOnBreak_g: (wall.innerReleasedOnBreak_g ?? 0) + innerWater_g,
      outerReleasedOnBreak_g: (wall.outerReleasedOnBreak_g ?? 0) + outerWater_g } : undefined,
    spill: { volume_ml: Math.max(0, vessel.volume_ml) + wallWater_g,
      mass_g: Math.max(0, vessel.mass_g - releasedGasMass) + wallWater_g, contents,
      substances: [...new Set(contents.filter(item => item.mass_g > 0 || item.moles > 0).map(item => item.formula))] },
  };
}
