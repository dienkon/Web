import type { VesselState } from '../types/chemistry';
import { canReceivePour } from '../engine/decantTransfer';
import { availableLiquidVolume, liquidInventoryMass } from './solidOccupancy';
import { vesselInterior, contourRadius } from '../science/vesselDimensions';
import { vesselWorldToLocal } from '../science/vesselScale';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';
import { getVesselProfile } from '../pour/physics/profiles';
import { solveLevel } from '../pour/physics/retained';
import { liquidSurfaceVolume } from '../engine/waterPhase';
import { solveStockLiquidSurface } from '../science/stockLiquidSurface';
import { vesselVortexSurface } from '../science/vesselLiquidMotion';
import { vortexHeight } from '../science/liquidVortex';

export const BURETTE_NOZZLE_LOCAL_Y = -0.1;

type Point3 = [number, number, number];
export interface BuretteDeliveryPath {
  outlet: Point3;
  contact: Point3;
  contactKind: 'liquid' | 'wall' | 'floor';
}

/** Trace world gravity through the actual opening, then stop at the first
 * inner wall or horizontal liquid surface. Testing only the nozzle's local
 * radius can accept a vertical line that misses a tilted mouth entirely. */
export function buretteDeliveryPath(vessel: VesselState, position: readonly number[]): BuretteDeliveryPath | null {
  const outlet: Point3 = [position[0], position[1] + BURETTE_NOZZLE_LOCAL_Y, position[2]];
  const start = vesselWorldToLocal(vessel, outlet);
  const below = vesselWorldToLocal(vessel, [outlet[0], outlet[1] - 1, outlet[2]]);
  const direction = below.map((value, axis) => value - start[axis]) as Point3;
  if (![...start, ...direction].every(Number.isFinite) || direction[1] >= -1e-8) return null;
  const interior = vesselInterior(vessel.type);
  const at = (distance: number) => start.map((value, axis) => value + direction[axis] * distance) as Point3;
  const clearance = (distance: number) => {
    const point = at(distance);
    return contourRadius(interior.points, point[1]) - Math.hypot(point[0], point[2]);
  };
  const entry = Math.max(0, (interior.topY - start[1]) / direction[1]);
  if (start[1] <= interior.floorY || clearance(entry) <= 1e-5) return null;
  const normal = direction.map(value => -value / Math.hypot(...direction)) as Point3;
  const tilt = Math.atan2(Math.hypot(normal[0], normal[2]), normal[1]);
  const liquid = liquidSurfaceVolume(vessel);
  const density = vessel.volume_ml > 0 ? liquidInventoryMass(vessel) / vessel.volume_ml : 1;
  const vortex = vesselVortexSurface(vessel);
  const level = vortex ? vortexHeight(start[0], start[2], vortex)
    : solveStockLiquidSurface(vessel, normal, density)?.c
      ?? (tilt < 1e-8 ? vesselLiquidSurfaceY(vessel)
        : solveLevel(getVesselProfile(vessel.type, vessel.capacity_ml), tilt, liquid).c);
  const height = normal.reduce((sum, value, axis) => sum + value * start[axis], 0);
  const descent = normal.reduce((sum, value, axis) => sum + value * direction[axis], 0);
  const surfaceDistance = (level - height) / descent;
  if (!(surfaceDistance > 1e-8)) return null;
  const floorDistance = (interior.floorY - start[1]) / direction[1];
  const end = liquid > 0 ? Math.min(surfaceDistance, floorDistance) : floorDistance;
  if (end < entry - 1e-8) return null;
  const kind = liquid > 0 && surfaceDistance <= floorDistance ? 'liquid' : 'floor';
  // On each straight contour segment, radial distance minus wall radius is
  // convex. Its endpoints therefore prove containment of the entire interval.
  const cuts = [...interior.points.map(([, y]) => (y - start[1]) / direction[1])
    .filter(distance => distance > entry && distance < end), end].sort((a, b) => a - b);
  let previous = entry;
  for (const distance of cuts) {
    if (clearance(distance) < 0) {
      let low = previous, high = distance;
      for (let i = 0; i < 40; i++) {
        const middle = (low + high) / 2;
        if (clearance(middle) < 0) high = middle; else low = middle;
      }
      return { outlet, contact: [outlet[0], outlet[1] - (low + high) / 2, outlet[2]], contactKind: 'wall' };
    }
    previous = distance;
  }
  return { outlet, contact: [outlet[0], outlet[1] - end, outlet[2]], contactKind: kind };
}

/** The same physical opening test is used by every button and the 3D valve.
 * A selected vessel elsewhere on the bench cannot receive a burette drop. */
export function buretteTargetProblem(vessel: VesselState | undefined | null, position: readonly number[]): string | null {
  if (!vessel || !canReceivePour(vessel) || vessel.id.startsWith('lesson_vessel_')) return 'Cần bình mở, nguyên vẹn dưới đầu buret.';
  if (vessel.isLocked) return 'Bình nhận đang khóa thao tác.';
  if (![...position, ...vessel.position, vessel.capacity_ml, vessel.volume_ml].every(Number.isFinite)) return 'Vị trí bình nhận không hợp lệ.';
  if (!(availableLiquidVolume(vessel) > 1e-10)) return 'Bình nhận đã đầy.';
  if (!buretteDeliveryPath(vessel, position)) return 'Căn miệng bình ngay dưới đầu buret và đặt đầu buret trên mặt mẫu trước khi nhả.';
  return null;
}

export function findBuretteReceiver(vessels: Record<string, VesselState>, position: readonly number[]): VesselState | null {
  return Object.values(vessels).filter(vessel => !buretteTargetProblem(vessel, position))
    .sort((a, b) => Math.hypot(a.position[0] - position[0], a.position[2] - position[2])
      - Math.hypot(b.position[0] - position[0], b.position[2] - position[2]))[0] ?? null;
}
