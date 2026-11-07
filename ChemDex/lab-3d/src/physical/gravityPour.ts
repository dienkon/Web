import { Quaternion, Vector3 } from 'three';
import type { VesselState } from '../types/chemistry';
import { getWorldVesselProfile } from '../pour/physics/profiles';
import { solveLevel, retainedVolume } from '../pour/physics/retained';
import { vesselBodyTransform } from '../science/vesselScale';
import { stockImmersion } from '../science/stockImmersion';
import { solveStockLiquidSurface } from '../science/stockLiquidSurface';
import { liquidInventoryMass } from '../handling/solidOccupancy';
import { rectangularWeirDischarge, circularOrificeDischarge } from '../science/discharge';
import { METERS_PER_SCENE_UNIT as U, metersToScene } from '../science/sceneUnits';
import { CONSTANTS } from '../core/units';
import { LAB_GEOMETRY } from '../core/labGeometry';
import { traceLaunchedStream } from '../pour/physics/ballistics';
import { canReceivePour } from '../engine/decantTransfer';
import { pourTargetPose, type PourParcel } from '../engine/pourTransport';
import { vesselWorldLiquidSurfaceY } from '../science/vesselGeometry';

/** Passive outflow after a body tips, without starting a user pour session.
 * Sharp-edge Cd=0.62 and vented drainage are explicitly uncalibrated closures. */
export function gravityPour(vessel: VesselState, others: readonly VesselState[], dt: number, tick: number) {
  if (!vessel.physicalMotion || vessel.isSealed || vessel.isShattered || !(vessel.volume_ml > 0) || !(dt > 0)) return null;
  const q = new Quaternion(...vessel.physicalMotion.rotation).normalize(), inverse = q.clone().invert();
  const up = new Vector3(0, 1, 0).applyQuaternion(inverse), h = Math.hypot(up.x, up.z);
  const tilt = Math.atan2(h, up.y);
  if (tilt < 1e-5) return null;
  const profile = getWorldVesselProfile(vessel.type, vessel.capacity_ml), body = vesselBodyTransform(vessel);
  const lipY = profile.lipLocal[1], radius = profile.mouthR;
  const localLip = new Vector3(h > 1e-8 ? -up.x / h * radius : radius, lipY, h > 1e-8 ? -up.z / h * radius : 0);
  const lipPlane = localLip.dot(up), modelLipPlane = (lipPlane - up.y * body.offsetY) / body.scale;
  const density = vessel.volume_ml > 0 ? liquidInventoryMass(vessel) / vessel.volume_ml : 1;
  const stock = stockImmersion(vessel, density);
  const displacedAtLip = stock?.displacementMl(up.toArray() as [number, number, number], modelLipPlane) ?? 0;
  const retainedGross = retainedVolume({ ...profile, lipLocal: [radius, lipY, 0] }, tilt);
  const retainedLiquid = Math.max(0, retainedGross - displacedAtLip);
  const excess = Math.max(0, vessel.volume_ml - retainedLiquid);
  if (!(excess > 1e-9)) return null;
  const actualSurface = solveStockLiquidSurface(vessel, up.toArray() as [number, number, number], density);
  const surfacePlane = actualSurface ? actualSurface.c * body.scale + up.y * body.offsetY
    : solveLevel(profile, tilt, vessel.volume_ml).c;
  const head_m = Math.max(0, surfacePlane - lipPlane) * U;
  const q_m3_s = tilt > 117 * Math.PI / 180
    ? circularOrificeDischarge(radius * U, head_m) : rectangularWeirDischarge(profile.spoutWidth * U, head_m);
  const released_ml = Math.min(excess, vessel.volume_ml, q_m3_s * 1e6 * dt);
  if (!(released_ml > 1e-10)) return null;
  const lipWorld = localLip.clone().applyQuaternion(q).add(new Vector3(...vessel.position));
  const radial = new Vector3(localLip.x, 0, localLip.z).normalize().applyQuaternion(q);
  const velocity = radial.multiplyScalar(metersToScene(Math.sqrt(2 * CONSTANTS.g * head_m)))
    .add(new Vector3(...vessel.physicalMotion.velocity_m_s).multiplyScalar(1 / U))
    .add(new Vector3(...vessel.physicalMotion.angularVelocity_rad_s).cross(localLip.clone().applyQuaternion(q)));
  const overTable = Math.abs(lipWorld.x) <= LAB_GEOMETRY.tableHalfWidth_scene && Math.abs(lipWorld.z) <= LAB_GEOMETRY.tableHalfDepth_scene;
  const plane = overTable && lipWorld.y >= LAB_GEOMETRY.tableTop_scene ? LAB_GEOMETRY.tableTop_scene : LAB_GEOMETRY.floor_scene;
  const start = lipWorld.toArray() as [number, number, number], speed = velocity.toArray() as [number, number, number];
  let trajectory = traceLaunchedStream(start, speed, null, plane);
  for (const target of others) {
    if (target.id === vessel.id || !canReceivePour(target) || Math.abs(target.rotationZ ?? 0) > 1e-4) continue;
    const p = getWorldVesselProfile(target.type, target.capacity_ml);
    const candidate = traceLaunchedStream(start, speed, { id: target.id, position: target.position,
      mouthR: p.mouthR, mouthY: target.position[1] + p.lipLocal[1],
      liquidSurfaceY: target.position[1] + vesselWorldLiquidSurfaceY(target), profile: p }, plane);
    if (candidate.targetVesselId && candidate.timeOfFlight <= trajectory.timeOfFlight) trajectory = candidate;
  }
  const target = others.find(v => v.id === trajectory.targetVesselId);
  const draft: Omit<PourParcel, 'sample' | 'releasedVolume_ml' | 'elapsed_s' | 'arrivedFraction'> = {
    id: `gravity:${vessel.id}:${tick}`, sessionId: `gravity:${vessel.id}`, sourceId: vessel.id, sourceName: vessel.name,
    targetId: trajectory.targetVesselId, targetPose: pourTargetPose(target), duration_s: dt, trajectory, stage: 'air', releaseBasis: 'metered' };
  return { draft, released_ml, retainedLiquid_ml: retainedLiquid, head_m };
}
