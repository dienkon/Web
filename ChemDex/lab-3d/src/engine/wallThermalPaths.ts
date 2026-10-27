import type { VesselState } from '../types/chemistry';
import { vesselContours } from '../science/vesselContours';
import { vesselInterior } from '../science/vesselDimensions';
import { contourWallArea, wallDropCap } from '../science/wallDropletGeometry';
import { METERS_PER_SCENE_UNIT } from '../science/sceneUnits';
import { waterBoilingPointAtPressure } from '../science/labEnvironment';

export const dryVesselConductance = (v: VesselState) => (v.volume_ml > 1 ? 0.35 : 0.18)
  * (1 + Math.max(0, (v.effectsEnvironment?.airSpeed_m_s ?? v.environment?.airSpeed_m_s ?? 0.1) - 0.1));

/** Nominal resistance split inherited from the wall-temperature approximation.
 * Wet patches REPLACE their share of the dry wall-to-air conductance. */
export function wallThermalPaths(v: VesselState, air_c: number) {
  const baseline = dryVesselConductance(v), wall = v.wallCondensation;
  const empty = { baseline_W_K: baseline, dry_W_K: baseline, patches: [] as {
    side: 'inner' | 'outer'; mass_g: number; temperature_c: number;
    sample_W_K: number; air_W_K: number; replacedDry_W_K: number;
  }[], status: 'dry' };
  if (!wall || !(wall.inner_g > 0 || wall.outer_g > 0)) return empty;
  const ceiling = waterBoilingPointAtPressure(v.effectsEnvironment?.pressure_atm ?? v.environment?.pressure_atm);
  if (v.isShattered || ![v.temperature_c, air_c, ceiling, baseline].every(Number.isFinite)
    || baseline < 0 || Math.min(v.temperature_c, air_c) < 0 || !(ceiling >= 0)) {
    return { ...empty, status: 'unsupported-liquid-state' };
  }
  const entries = (['inner', 'outer'] as const).filter(side => wall[`${side}_g`] > 0);
  if (entries.some(side => !Number.isFinite(wall[`${side}_g`]) || !Number.isFinite(wall[`${side}Wall_c`])
    || wall[`${side}Wall_c`] < 0 || wall[`${side}Wall_c`] >= 373.946)) return { ...empty, status: 'unsupported-liquid-state' };
  const interior = vesselInterior(v.type);
  const area = contourWallArea(vesselContours(v.type).outer, interior.floorY, interior.topY) * METERS_PER_SCENE_UNIT ** 2;
  const footprints = entries.map(side => {
    const beads = wall[`${side}Beads`];
    return beads?.length ? beads.reduce((sum, bead) => sum + Math.PI * wallDropCap(bead.mass_g).contactRadius_m ** 2, 0)
      : Math.PI * wallDropCap(wall[`${side}_g`]).contactRadius_m ** 2;
  });
  const denominator = Math.max(area, footprints.reduce((sum, a) => sum + a, 0));
  if (!(denominator > 0) || !Number.isFinite(denominator)) return { ...empty, status: 'unsupported-liquid-state' };
  const patches = entries.map((side, i) => {
    const weight = side === 'inner' ? 0.35 : 0.9, replacedDry_W_K = baseline * footprints[i] / denominator;
    return { side, mass_g: wall[`${side}_g`], temperature_c: wall[`${side}Wall_c`],
      sample_W_K: replacedDry_W_K / (1 - weight), air_W_K: replacedDry_W_K / weight, replacedDry_W_K };
  }).filter(p => p.replacedDry_W_K > 0);
  return { baseline_W_K: baseline, dry_W_K: Math.max(0, baseline - patches.reduce((s, p) => s + p.replacedDry_W_K, 0)),
    patches, status: 'finite-liquid' };
}
