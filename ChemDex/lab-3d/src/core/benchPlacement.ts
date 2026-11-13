import type { BurnerState, VesselState } from '../types/chemistry';
import { LAB_GEOMETRY } from './labGeometry';
import { restingVesselHeight } from '../handling/vesselRest';
import { vesselWorldContours, vesselBodyTransform } from '../science/vesselScale';

export interface BenchFootprint { x: number; z: number; radius: number }
export const BENCH_CLEARANCE = 0.16;
// Bounding circles include handles, feet and support stands, not just the fluid.
const APPARATUS_RADIUS: Record<string, number> = {
  tool: 1, burner: 1.15, hot_plate: 1.15, retort_stand: 1.1, retort_clamp: 0.65,
  pneumatic_trough: 1.7, test_tube_rack: 1.6, tongs: 0.9,
  stopper: 0.52,
};
const SCALED_SUPPORT_RADIUS: Record<string, number> = {
  test_tube: 0.66, cylinder: 0.75, separatory_funnel: 1.61,
  filter_funnel: 1.17, wash_bottle: 1.15,
  crucible: 0.85, petri_dish: 1.5, mortar_pestle: 1.1, condenser: 1.05,
};
export function benchRadius(type: string, capacity_ml = 100): number {
  if (SCALED_SUPPORT_RADIUS[type]) return Math.max(0.35, SCALED_SUPPORT_RADIUS[type] * vesselBodyTransform({ type, capacity_ml }).scale);
  if (APPARATUS_RADIUS[type]) return APPARATUS_RADIUS[type];
  return Math.max(0.35, ...vesselWorldContours({ type, capacity_ml }).outer.map(([r]) => r));
}

export function benchObstacles(vessels: Record<string, VesselState>, burners: Record<string, BurnerState>,
  stations: BenchFootprint[] = [{ x: 7.5, z: -2.5, radius: 1.4 }, { x: 5, z: 1.5, radius: 1.15 }]): BenchFootprint[] {
  return [...stations, ...Object.values(vessels).map(v => ({ x: v.position[0], z: v.position[2], radius: benchRadius(v.type, v.capacity_ml) })),
    ...Object.values(burners).map(b => ({ x: b.position[0], z: b.position[2], radius: benchRadius('burner') }))];
}

/** Deterministic bounded search. A full bench never falls back to an occupied
 * position or to a point outside the tabletop. Deletion/moving is reflected
 * immediately because occupancy is read for each insertion. */
export function findBenchPosition(type: string, capacity_ml: number, obstacles: BenchFootprint[],
  preferred: readonly number[] = [0, 0, 0]): [number, number, number] | null {
  const radius = benchRadius(type, capacity_ml);
  const maxX = LAB_GEOMETRY.tableHalfWidth_scene - radius - BENCH_CLEARANCE;
  const maxZ = LAB_GEOMETRY.tableHalfDepth_scene - radius - BENCH_CLEARANCE;
  if (![radius, ...preferred].every(Number.isFinite) || maxX < 0 || maxZ < 0) return null;
  const free = (x: number, z: number) => Math.abs(x) <= maxX && Math.abs(z) <= maxZ
    && obstacles.every(o => Math.hypot(x - o.x, z - o.z) >= radius + o.radius + BENCH_CLEARANCE);
  const height = type === 'burner' ? LAB_GEOMETRY.tableTop_scene + 0.105 : restingVesselHeight(type, capacity_ml);
  if (free(preferred[0], preferred[2])) return [preferred[0], height, preferred[2]];
  const candidates: { x: number; z: number; d: number }[] = [];
  for (let z = -maxZ; z <= maxZ; z += 0.4) for (let x = -maxX; x <= maxX; x += 0.4)
    candidates.push({ x, z, d: (x - preferred[0]) ** 2 + (z - preferred[2]) ** 2 });
  candidates.sort((a, b) => a.d - b.d || a.z - b.z || a.x - b.x);
  const point = candidates.find(p => free(p.x, p.z));
  return point ? [point.x, height, point.z] : null;
}
