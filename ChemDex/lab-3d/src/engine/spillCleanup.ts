import type { SpillState, SubstanceContent } from '../types/chemistry';
import { solveSessileDrop } from '../science/sessileDrop';
import { puddleOverlapFraction } from '../science/puddleOverlap';
import { METERS_PER_SCENE_UNIT } from '../science/sceneUnits';
import { calculateSpillRadius } from '../science/overflowPhysics';

function splitContent(source: SubstanceContent, fraction: number) {
  const removed = { ...source }, remaining = { ...source };
  for (const key of ['mass_g', 'moles', 'volume_ml', 'initialMass_g', 'initialMoles'] as const) {
    if (source[key] === undefined) continue;
    removed[key] = source[key]! * fraction;
    remaining[key] = source[key]! - removed[key]!;
  }
  return { removed, remaining };
}

/** Uniform-composition sample under an ideal full-depth collector. A dry
 * deposit remains a point inventory until a solid spatial model is supplied. */
export function collectSpillPatch(spill: SpillState, pos: readonly number[], radius_scene: number) {
  if (!Number.isFinite(radius_scene) || radius_scene <= 0 || pos.length !== 3 || !pos.every(Number.isFinite)) return null;
  if (![spill.volume_ml, spill.mass_g, ...spill.position].every(Number.isFinite)
    || spill.volume_ml < 0 || spill.mass_g < 0 || !(spill.volume_ml > 0 || spill.mass_g > 0)) return null;
  const distance = Math.hypot(pos[0] - spill.position[0], pos[2] - spill.position[2]);
  const shape = spill.volume_ml > 0 ? solveSessileDrop(spill.volume_ml) : null;
  const fraction = spill.volume_ml > 0 ? shape ? puddleOverlapFraction(shape,
    distance * METERS_PER_SCENE_UNIT, radius_scene * METERS_PER_SCENE_UNIT) : 0 : distance <= radius_scene ? 1 : 0;
  if (!(fraction > 0)) return null;
  if (fraction >= 1) return { collected: spill, remaining: null, fraction: 1 };
  const pieces = spill.contents?.map(item => splitContent(item, fraction));
  const volume_ml = spill.volume_ml * fraction, mass_g = spill.mass_g * fraction;
  const retainedVolume = spill.volume_ml - volume_ml;
  return { fraction,
    collected: { ...spill, volume_ml, mass_g, radius: calculateSpillRadius(volume_ml), contents: pieces?.map(p => p.removed) },
    remaining: { ...spill, volume_ml: retainedVolume, mass_g: spill.mass_g - mass_g,
      radius: calculateSpillRadius(retainedVolume), contents: pieces?.map(p => p.remaining) },
  };
}
