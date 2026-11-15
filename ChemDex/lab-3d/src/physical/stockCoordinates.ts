import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { VesselState } from '../types/chemistry';
import type { StockContainerPose, StockGrainPose } from './stockTypes';
import { vesselBodyTransform } from '../science/vesselScale';
import { METERS_PER_SCENE_UNIT as U, siPointToScene } from '../science/sceneUnits';

export function stockLocalMatrix(v: Pick<VesselState, 'position' | 'rotationY' | 'rotationZ' | 'physicalMotion' | 'type' | 'capacity_ml'>, p: StockGrainPose, bodyMatrix?: Matrix4): Matrix4 {
  const t = vesselBodyTransform(v), q = v.physicalMotion?.rotation ? new Quaternion(...v.physicalMotion.rotation)
    : new Quaternion().setFromEuler(new Euler(0, v.rotationY ?? 0, v.rotationZ ?? 0, 'YXZ'));
  const parent = new Matrix4().compose(new Vector3(...v.position), q, new Vector3(1, 1, 1))
    .multiply(new Matrix4().makeTranslation(0, t.offsetY, 0)).scale(new Vector3(t.scale, t.scale, t.scale));
  return (bodyMatrix?.clone() ?? parent).invert().multiply(new Matrix4().compose(new Vector3(...siPointToScene(p.position_m)), new Quaternion(...p.rotation), new Vector3().setScalar(p.scale_m / U)));
}

/** Convert a snapshot grain against the container from that SAME snapshot.
 * The resulting display matrix can follow a newly positioned glass immediately
 * without rewriting the authoritative world-space contact/chemistry pose. */
export function stockFrameLocalMatrix(v: Pick<VesselState, 'type' | 'capacity_ml'>, p: StockGrainPose, frame: StockContainerPose): Matrix4 {
  const transform = vesselBodyTransform(v);
  const body = new Matrix4().compose(new Vector3(...siPointToScene(frame.position_m)),
    new Quaternion(...frame.rotation), new Vector3(1, 1, 1))
    .multiply(new Matrix4().makeTranslation(0, transform.offsetY, 0))
    .scale(new Vector3(transform.scale, transform.scale, transform.scale));
  return body.invert().multiply(new Matrix4().compose(new Vector3(...siPointToScene(p.position_m)),
    new Quaternion(...p.rotation), new Vector3().setScalar(p.scale_m / U)));
}
