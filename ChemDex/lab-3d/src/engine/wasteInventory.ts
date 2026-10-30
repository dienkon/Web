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
        for (const key of ['volume_ml', 'initialMass_g', 'initialMoles'] as const) {
          if (source[key] !== undefined) target[key] = (target[key] ?? 0) + source[key]!;
        }
      } else contents.push({ ...source, location: 'bulk' });
    }
  }
  return { contents, addedMass_g };
}
