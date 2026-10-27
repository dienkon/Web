import { vesselInterior, contourRadius } from '../../science/vesselDimensions';
import { vesselContours, type ContourPoint } from '../../science/vesselContours';

export interface VesselProfile {
  type: string;
  H: number;
  baseY: number;
  r: (y: number) => number;
  lipLocal: [number, number, number];
  mouthR: number;
  rimR?: number;
  spoutWidth: number;
  capacity_ml: number;
  /** Centimeters per scene unit, inferred from model capacity / scene volume. */
  sceneScale: number;
  contour?: readonly ContourPoint[];
  referenceSceneVolume?: number;
}
const CAPACITIES: Record<string, number> = {
  beaker: 250, flask: 250, cylinder: 100, test_tube: 50, reagent_bottle: 150,
  watch_glass: 40, evaporating_dish: 100, crucible: 50, petri_dish: 60,
  volumetric_flask: 100, separatory_funnel: 150, filter_funnel: 75,
  mortar_pestle: 80, condenser: 120, wash_bottle: 250, burette: 50,
};
const LIPS: Record<string, [number, number, number]> = {
  beaker: [0.98, 1, 0], flask: [0.38, 1.48, 0], cylinder: [0.34, 1.68, 0],
  test_tube: [0.21, 1.18, 0], reagent_bottle: [0.15, 0.95, 0],
};
export const VESSEL_PROFILES: Record<string, VesselProfile> = Object.fromEntries(
  Object.entries(CAPACITIES).map(([type, capacity_ml]) => {
    const interior = vesselInterior(type);
    const lastOuter = vesselContours(type).outer.at(-1)!;
    const lipLocal: [number, number, number] = LIPS[type] ?? [lastOuter[0], lastOuter[1], 0];
    const mouthR = interior.points.at(-1)![0];
    return [type, { type, H: interior.height, baseY: interior.floorY,
      r: (y: number) => contourRadius(interior.points, y), lipLocal, mouthR,
      rimR: type === 'reagent_bottle' ? Math.max(mouthR, lipLocal[0]) : Math.max(mouthR, lastOuter[0], lipLocal[0]),
      spoutWidth: type === 'beaker' ? 0.28 : Math.min(0.2, mouthR * 0.5),
      capacity_ml, sceneScale: Math.cbrt(capacity_ml / interior.volume),
      contour: interior.points, referenceSceneVolume: interior.volume }];
  })
);

const scaledProfiles = new Map<string, VesselProfile>();
export function getVesselProfile(type: string, capacity_ml?: number): VesselProfile {
  const base = VESSEL_PROFILES[type] ?? VESSEL_PROFILES.beaker;
  if (!(capacity_ml! > 0) || !Number.isFinite(capacity_ml) || capacity_ml === base.capacity_ml) return base;
  const key = base.type + ':' + capacity_ml;
  const cached = scaledProfiles.get(key);
  if (cached) return cached;
  const result = { ...base, capacity_ml: capacity_ml!,
    sceneScale: base.sceneScale * Math.cbrt(capacity_ml! / base.capacity_ml) };
  if (scaledProfiles.size >= 128) scaledProfiles.delete(scaledProfiles.keys().next().value!);
  scaledProfiles.set(key, result);
  return result;
}
