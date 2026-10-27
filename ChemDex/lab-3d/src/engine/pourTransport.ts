import type { VesselState } from '../types/chemistry';
import type { LiquidAliquot } from '../handling/aliquot';
import { traceLaunchedStream, type BallisticsResult } from '../pour/physics/ballistics';
import { getVesselProfile } from '../pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';
import { SCENE_GRAVITY } from '../science/sceneUnits';
import { LAB_PHYSICS } from './interactionEngine';

/** A finite release interval, in air or on glass. sample is all undelivered matter. */
export interface PourParcel {
  stage?: 'air' | 'wall';
  wallFilm?: import('./wallFilm').WallFilmPlan;
  id: string;
  sessionId: string;
  sourceId: string;
  sourceName: string;
  targetId: string | null;
  targetPose: string;
  sample: LiquidAliquot;
  releasedVolume_ml: number;
  duration_s: number;
  elapsed_s: number;
  arrivedFraction: number;
  trajectory: BallisticsResult;
}

export interface PourArrival {
  parcel: PourParcel;
  sample: LiquidAliquot;
  accepted_ml: number;
  spilled_ml: number;
}

/** Local contact anchor, recorded only after accepted bulk delivery. */
export function pourContactLocal(parcel: PourParcel, vessel: VesselState): [number, number, number] {
  const film = parcel.stage === 'wall' ? parcel.wallFilm : undefined;
  const end = film?.points[film.points.length - 1];
  if (film && end) return [Math.cos(film.angle_rad) * end.radius, end.y, Math.sin(film.angle_rad) * end.radius];
  const [x, y, z] = parcel.trajectory.impactPos;
  const dx = x - vessel.position[0], dz = z - vessel.position[2];
  const a = vessel.rotationY ?? 0;
  return [Math.cos(a) * dx - Math.sin(a) * dz, y - vessel.position[1],
    Math.sin(a) * dx + Math.cos(a) * dz];
}

export function pourTargetPose(vessel?: VesselState | null): string {
  return vessel ? JSON.stringify([vessel.id, vessel.position, vessel.rotationY, vessel.rotationZ ?? 0,
    vessel.type, vessel.capacity_ml, !!vessel.isSealed, !!vessel.isShattered]) : '';
}

export function scalePourSample(sample: LiquidAliquot, fraction: number): LiquidAliquot {
  return { ...sample, volume_ml: sample.volume_ml * fraction, mass_g: sample.mass_g * fraction,
    ...(sample.organicVolume_ml !== undefined ? { organicVolume_ml: sample.organicVolume_ml * fraction } : {}),
    contents: sample.contents.map(item => ({ ...item, mass_g: item.mass_g * fraction, moles: item.moles * fraction,
      ...(item.volume_ml !== undefined ? { volume_ml: item.volume_ml * fraction } : {}) })) };
}

export function pourPositionAt(trajectory: BallisticsResult, time: number): [number, number, number] {
  return [trajectory.exitPos[0] + trajectory.exitVel[0] * time,
    trajectory.exitPos[1] + trajectory.exitVel[1] * time - SCENE_GRAVITY * time * time / 2,
    trajectory.exitPos[2] + trajectory.exitVel[2] * time];
}

/** Visible ages of remaining liquid, including the moving front and trailing end. */
export function pourFlightInterval(parcel: PourParcel): [number, number] {
  return [Math.max(0, parcel.elapsed_s - parcel.duration_s),
    Math.max(0, Math.min(parcel.trajectory.timeOfFlight,
      parcel.elapsed_s - parcel.arrivedFraction * parcel.duration_s))];
}

export function advancePourParcel(parcel: PourParcel, dt: number, target?: VesselState | null) {
  if (!Number.isFinite(dt) || dt <= 0) return { parcel, contact: null as LiquidAliquot | null };
  let trajectory = parcel.trajectory;
  const pose = pourTargetPose(target);
  if (pose !== parcel.targetPose) {
    const profile = target && !target.isShattered && Math.abs(target.rotationZ ?? 0) < 1e-6
      ? getVesselProfile(target.type, target.capacity_ml) : null;
    const metrics = target && profile ? { id: target.id, position: target.position, profile,
      mouthR: profile.mouthR, mouthY: target.position[1] + profile.lipLocal[1],
      liquidSurfaceY: target.position[1] + vesselLiquidSurfaceY(target), sealed: target.isSealed } : null;
    trajectory = traceLaunchedStream(trajectory.exitPos, trajectory.exitVel, metrics, LAB_PHYSICS.TABLE_SURFACE_Y);
    // A vessel moved behind the fluid front cannot retroactively catch it.
    const frontAge = parcel.elapsed_s - parcel.arrivedFraction * parcel.duration_s;
    if (trajectory.timeOfFlight < frontAge - 1e-9) {
      trajectory = traceLaunchedStream(trajectory.exitPos, trajectory.exitVel, null, LAB_PHYSICS.TABLE_SURFACE_Y);
    }
  }
  const elapsed_s = parcel.elapsed_s + dt;
  const fraction = Math.max(parcel.arrivedFraction, Math.min(1,
    Math.max(0, (elapsed_s - trajectory.timeOfFlight) / parcel.duration_s)));
  const relative = (fraction - parcel.arrivedFraction) / Math.max(1e-15, 1 - parcel.arrivedFraction);
  const contact = relative > 0 ? scalePourSample(parcel.sample, relative) : null;
  return { parcel: { ...parcel, trajectory, targetPose: pose, elapsed_s, arrivedFraction: fraction,
    sample: relative > 0 ? scalePourSample(parcel.sample, 1 - relative) : parcel.sample }, contact };
}
