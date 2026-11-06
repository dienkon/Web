import type { SpillState } from '../../types/chemistry';
import type { SessileDropShape } from '../../science/sessileDrop';
import { sodiumMetalMass, sodiumPelletThermal, SODIUM_DENSITY_G_ML } from '../../science/sodiumWater';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { sodiumPelletShape, sodiumPelletWaterline } from './sodiumPellet';

/** Height of the rendered puddle profile, in world scene units. */
export function spillSurfaceY(drop: SessileDropShape | null, x: number, z: number): number {
  if (!drop) return 0;
  const distance = Math.hypot(x, z) * METERS_PER_SCENE_UNIT;
  const index = drop.profile.findIndex(p => p.radius_m >= distance);
  if (index < 0) return 0;
  if (index === 0) return drop.profile[0].height_m / METERS_PER_SCENE_UNIT;
  const a = drop.profile[index - 1], b = drop.profile[index];
  const t = b.radius_m > a.radius_m ? (distance - a.radius_m) / (b.radius_m - a.radius_m) : 0;
  return (a.height_m + t * (b.height_m - a.height_m)) / METERS_PER_SCENE_UNIT;
}

/** Single aggregate pellet, matching the existing vessel representation.
 * No minimum decorative metal volume; the tabletop supports shallow contacts. */
export function spillSodiumBody(spill: SpillState, drop: SessileDropShape | null, x = 0, z = 0, airSpeed_m_s = 0.1) {
  const contents = spill.contents ?? [], mass_g = sodiumMetalMass({ contents });
  const wet = spill.volume_ml > 0 && contents.some(c => c.formula === 'H2O' && c.phase === 'l' && c.moles > 1e-12);
  const active = wet && mass_g > 1e-10 && spill.reactionProgramId === 'na_h2o' && (spill.gasRate_mol_s ?? 0) > 0
    && !spill.chemistryLimit;
  const initial = spill.sodiumContact?.initialMetal_g ?? mass_g;
  const fraction = initial > 0 ? Math.max(0, Math.min(1, 1 - mass_g / initial)) : 0;
  const melt = active ? sodiumPelletThermal(fraction, spill.temperature_c ?? 25, airSpeed_m_s).meltFactor : 0;
  const shape = sodiumPelletShape(melt);
  const radius = Math.cbrt(Math.max(0, mass_g) / SODIUM_DENSITY_G_ML * 1e-6 / (4 * Math.PI / 3)) / METERS_PER_SCENE_UNIT;
  const horizontalRadius = radius * shape.horizontalRadius;
  const boundary = Math.max(0, (drop?.radius_m ?? 0) / METERS_PER_SCENE_UNIT - horizontalRadius);
  const distance = Math.hypot(x, z);
  if (distance > boundary) { const scale = distance > 0 ? boundary / distance : 0; x *= scale; z *= scale; }
  const surface = spillSurfaceY(drop, x, z);
  const liquidMass = contents.filter(c => ['l', 'aq'].includes(c.phase ?? c.state ?? '')).reduce((s, c) => s + c.mass_g, 0);
  const density = liquidMass / Math.max(1e-12, spill.volume_ml);
  const centerY = Math.max(-shape.bottom * radius,
    wet ? surface - sodiumPelletWaterline(shape, SODIUM_DENSITY_G_ML / Math.max(1e-9, density)) * radius : 0);
  return { mass_g, active, wet, melt, shape, radius, horizontalRadius, boundary, x, z, surface, centerY };
}
