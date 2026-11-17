import { BufferGeometry } from 'three';
import type { VesselState } from '../types/chemistry';
import { applySodiumPelletShape, sodiumPelletRadius, sodiumPelletShape } from '../vfx/geometry/sodiumPellet';
import { vesselBodyTransform } from '../science/vesselScale';
import { planSolidGeometryDose, type SolidStockDose } from './solidStockDose';

let geometry: BufferGeometry | undefined;
/** The forceps carries one complete sodium piece, using the same finite shape
 * and material scale that is drawn after contact. It cannot shrink to fit. */
export function planSodiumStockDose(vessel: VesselState, amount_g: number): SolidStockDose | null {
  if (!geometry) {
    geometry = new BufferGeometry();
    applySodiumPelletShape(geometry, sodiumPelletShape(0));
  }
  const radius = sodiumPelletRadius(vessel, amount_g) * vesselBodyTransform(vessel).scale;
  const plan = planSolidGeometryDose(vessel, geometry, radius, amount_g, 1);
  if (plan) plan.flights[0].releaseAt = .35;
  return plan;
}

export function sodiumStockDoseProblem(vessel: VesselState, amount_g: number): string | null {
  return planSodiumStockDose(vessel, amount_g) ? null
    : 'Mẩu natri không thể đi qua miệng bình ở tư thế hiện tại. Đặt bình thẳng và chọn miệng rộng hơn hoặc mẩu nhỏ hơn.';
}
