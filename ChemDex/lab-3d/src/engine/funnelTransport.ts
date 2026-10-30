import { Matrix4, Vector3 } from 'three';
import type { VesselState } from '../types/chemistry';
import type { LiquidAliquot } from '../handling/aliquot';
import type { PourParcel } from './pourTransport';
import { pourTargetPose, scalePourSample } from './pourTransport';
import { prepareAliquotContact } from './aliquotContactChemistry';
import { traceLaunchedStream } from '../pour/physics/ballistics';
import { getVesselProfile, getWorldVesselProfile } from '../pour/physics/profiles';
import { vesselLocalToWorld } from '../science/vesselScale';
import { vesselWorldLiquidSurfaceY } from '../science/vesselGeometry';
import { vesselContours } from '../science/vesselContours';
import { METERS_PER_SCENE_UNIT, metersPerModelUnit } from '../science/sceneUnits';
import { LAB_PHYSICS } from './interactionEngine';
import type { FunnelDischarge } from '../science/funnelDischarge';

let sequence = 0;
/** Own an already withdrawn finite sample. No source or target inventory is
 * touched here. Launch from the real drip stem, preserve the birth transform,
 * and use the existing arrival/collision/overflow pipeline. */
export function createFunnelParcel(source: VesselState, target: VesselState | null, sample: LiquidAliquot,
  duration_s: number, discharge?: FunnelDischarge, bodyMatrix?: Matrix4): PourParcel | null {
  if (!(sample.volume_ml > 0) || !(duration_s > 0) || !Number.isFinite(duration_s)) return null;
  const contour = vesselContours(source.type).inner, [radius, y] = contour.reduce((a, b) => b[1] < a[1] ? b : a);
  const transform = (point: [number, number, number]) => bodyMatrix ? new Vector3(...point).applyMatrix4(bodyMatrix).toArray() as [number, number, number]
    : vesselLocalToWorld(source, point);
  const exitPos = transform([0, y, 0]), below = transform([0, y - 1, 0]);
  const direction = new Vector3(...below).sub(new Vector3(...exitPos)).normalize();
  const average = discharge && discharge.total_ml_s > 0 ? (discharge.aqueous.flow_ml_s * discharge.aqueous.speed_m_s
    + discharge.organic.flow_ml_s * discharge.organic.speed_m_s) / discharge.total_ml_s : 0;
  const meters = metersPerModelUnit(getVesselProfile(source.type, source.capacity_ml));
  const speed = average > 0 ? average : sample.volume_ml / duration_s * 1e-6 / (Math.PI * (radius * meters) ** 2);
  if (!(speed > 0) || !Number.isFinite(speed) || [...exitPos].some(x => !Number.isFinite(x))) return null;
  const exitVel = direction.multiplyScalar(speed / METERS_PER_SCENE_UNIT).toArray() as [number, number, number];
  const profile = target ? getWorldVesselProfile(target.type, target.capacity_ml) : null;
  const metrics = target && profile ? { id: target.id, position: target.position, profile, mouthR: profile.mouthR,
    mouthY: target.position[1] + profile.lipLocal[1], liquidSurfaceY: target.position[1] + vesselWorldLiquidSurfaceY(target), sealed: target.isSealed } : null;
  const trajectory = traceLaunchedStream(exitPos, exitVel, metrics, LAB_PHYSICS.TABLE_SURFACE_Y);
  const id = `funnel_${source.id}_${Date.now()}_${++sequence}`;
  return { id, sessionId: id, sourceId: source.id, sourceName: source.name, targetId: target?.id ?? null,
    targetPose: pourTargetPose(target), stage: 'air', releaseBasis: 'metered', sample: prepareAliquotContact(scalePourSample(sample, 1)),
    duration_s, elapsed_s: 0, arrivedFraction: 0, releasedVolume_ml: sample.volume_ml, trajectory };
}
