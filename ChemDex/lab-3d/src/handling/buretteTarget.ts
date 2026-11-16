import type { VesselState } from '../types/chemistry';
import { canReceivePour } from '../engine/decantTransfer';
import { availableLiquidVolume } from './solidOccupancy';
import { vesselInterior, contourRadius } from '../science/vesselDimensions';
import { vesselWorldToLocal, vesselLocalToWorld } from '../science/vesselScale';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';

export const BURETTE_NOZZLE_LOCAL_Y = -0.1;

/** The same physical opening test is used by every button and the 3D valve.
 * A selected vessel elsewhere on the bench cannot receive a burette drop. */
export function buretteTargetProblem(vessel: VesselState | undefined | null, position: readonly number[]): string | null {
  if (!vessel || !canReceivePour(vessel) || vessel.id.startsWith('lesson_vessel_')) return 'Cần bình mở, nguyên vẹn dưới đầu buret.';
  if (vessel.isLocked) return 'Bình nhận đang khóa thao tác.';
  if (![...position, ...vessel.position, vessel.capacity_ml, vessel.volume_ml].every(Number.isFinite)) return 'Vị trí bình nhận không hợp lệ.';
  if (!(availableLiquidVolume(vessel) > 1e-10)) return 'Bình nhận đã đầy.';
  const nozzle: [number, number, number] = [position[0], position[1] + BURETTE_NOZZLE_LOCAL_Y, position[2]];
  const local = vesselWorldToLocal(vessel, nozzle), inside = vesselInterior(vessel.type);
  const surface = vesselLocalToWorld(vessel, [0, vesselLiquidSurfaceY(vessel), 0]);
  if (nozzle[1] <= surface[1] || local[1] <= inside.floorY) return 'Đầu buret phải nằm trên mặt mẫu.';
  const radius = contourRadius(inside.points, Math.min(inside.topY, local[1]));
  if (Math.hypot(local[0], local[2]) + 1e-5 >= radius) return 'Căn miệng bình ngay dưới đầu buret trước khi nhả.';
  return null;
}

export function findBuretteReceiver(vessels: Record<string, VesselState>, position: readonly number[]): VesselState | null {
  return Object.values(vessels).filter(vessel => !buretteTargetProblem(vessel, position))
    .sort((a, b) => Math.hypot(a.position[0] - position[0], a.position[2] - position[2])
      - Math.hypot(b.position[0] - position[0], b.position[2] - position[2]))[0] ?? null;
}
