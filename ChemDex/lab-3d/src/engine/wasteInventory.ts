import type { SpillState, SubstanceContent } from '../types/chemistry';

/** Keep collected material as well as its mass; cleaning is a transfer, not deletion. */
export function collectSpillWaste(previous: SubstanceContent[], spills: SpillState[]) {
  const contents = previous.map(item => ({ ...item }));
  let addedMass_g = 0;
  for (const spill of spills) {
    addedMass_g += spill.mass_g;
    for (const source of spill.contents ?? []) {
      const target = contents.find(item => item.formula === source.formula && item.phase === source.phase
        && item.state === source.state && item.liquidLayer === source.liquidLayer);
      if (target) {
        target.mass_g += source.mass_g;
        target.moles += source.moles;
        if (source.volume_ml !== undefined) target.volume_ml = (target.volume_ml ?? 0) + source.volume_ml;
      } else contents.push({ ...source, location: 'bulk' });
    }
  }
  return { contents, addedMass_g };
}
