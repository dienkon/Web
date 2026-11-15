import { Matrix4, Vector3 } from 'three';
import type { VesselState } from '../../types/chemistry';
import { vesselLocalToWorld } from '../../science/vesselScale';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { getVesselProfile } from '../../pour/physics/profiles';

type Receiver = Pick<VesselState, 'type' | 'capacity_ml' | 'position' | 'rotationY' | 'rotationZ' | 'physicalMotion' | 'volume_ml' | 'contents'>;

/** The automatic glass, local particle manager and SI stock share the same
 * capacity-derived body transform as the manual glass. Free flight uses world
 * scene units; only local optical/contact coordinates use this frame. */
export function receiverBodyMatrix(vessel: Receiver) {
  const origin = new Vector3(...vesselLocalToWorld(vessel, [0, 0, 0]));
  const axis = (point: [number, number, number]) => new Vector3(...vesselLocalToWorld(vessel, point)).sub(origin);
  return new Matrix4().makeBasis(axis([1, 0, 0]), axis([0, 1, 0]), axis([0, 0, 1])).setPosition(origin);
}
export function receiverSurfaceWorld(vessel: VesselState) {
  return vesselLocalToWorld(vessel, [0, vesselLiquidSurfaceY(vessel), 0]);
}
export function receiverLipWorld(vessel: Receiver) {
  return vesselLocalToWorld(vessel, getVesselProfile(vessel.type, vessel.capacity_ml).lipLocal);
}
