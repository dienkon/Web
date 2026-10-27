import type { VesselState } from '../types/chemistry';
import type { LiquidAliquot } from '../handling/aliquot';
import type { PourParcel } from './pourTransport';
import { scalePourSample } from './pourTransport';
import { getVesselProfile } from '../pour/physics/profiles';
import { GRAVITY_M_S2, METERS_PER_SCENE_UNIT, SCENE_GRAVITY, streamRadiusForFlow } from '../science/sceneUnits';
import { liquidWaterViscosity_Pa_s, nusseltFilm } from '../science/liquidTransport';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';
import { traceLaunchedStream } from '../pour/physics/ballistics';
import { LAB_PHYSICS } from './interactionEngine';

export interface WallFilmPoint {
  time_s: number;
  y: number;
  radius: number;
  speed_m_s: number;
  width_m: number;
  thickness_m: number;
}
export interface WallFilmPlan {
  type: string;
  angle_rad: number;
  capacity_ml: number;
  bodyRevision: number;
  lastPosition: [number, number, number];
  lastRotationY: number;
  viscosity_Pa_s: number | null;
  viscosityBasis: 'pure_water_iapws' | 'aqueous_water_proxy' | 'unavailable';
  model: 'local_nusselt_with_energy_bound' | 'inviscid_travel_lower_bound';
  reynolds4: number | null;
  points: WallFilmPoint[];
}

/** Finite wall-guided transit, not a wetting/CFD prediction. Impact diameter is
 * used as the assumed wetted width. Pure-water viscosity is only a proxy for aq. */
export function createWallFilm(air: PourParcel, sample: LiquidAliquot, target: VesselState): PourParcel | null {
  if (air.trajectory.detailKind !== 'wall_inner' || !(sample.volume_ml > 0)
    || Math.abs(target.rotationZ ?? 0) > 1e-6) return null;
  const profile = getVesselProfile(target.type, target.capacity_ml);
  const hitY = Math.max(profile.baseY, Math.min(profile.baseY + profile.H, air.trajectory.impactPos[1] - target.position[1]));
  const flow_ml_s = air.releasedVolume_ml / air.duration_s;
  if (!(flow_ml_s > 0)) return null;
  const [vx, vy0, vz] = air.trajectory.exitVel, vy = vy0 - SCENE_GRAVITY * air.trajectory.timeOfFlight;
  const speed = Math.hypot(vx, vy, vz);
  const width_m = 2 * streamRadiusForFlow(flow_ml_s, speed) * METERS_PER_SCENE_UNIT;
  const waterMass = sample.contents.filter(c => c.formula === 'H2O' && (c.phase ?? c.state) !== 's')
    .reduce((sum, c) => sum + c.mass_g, 0);
  const waterLike = waterMass > 0 && sample.contents.every(c => c.formula === 'H2O' || c.phase === 'aq');
  const viscosity = waterLike ? liquidWaterViscosity_Pa_s(sample.temperature_c) : null;
  const density = sample.mass_g / sample.volume_ml * 1000;
  const angle_rad = Math.atan2(air.trajectory.impactPos[2] - target.position[2], air.trajectory.impactPos[0] - target.position[0])
    + target.rotationY;
  const angleWorld = angle_rad - target.rotationY;
  const keys = [...new Set([hitY, ...(profile.contour ?? []).map(([, y]) => y)
    .filter(y => y < hitY && y >= profile.baseY), profile.baseY])].sort((a, b) => b - a);
  const points: WallFilmPoint[] = [{ time_s: 0, y: hitY, radius: profile.r(hitY), speed_m_s: 0,
    width_m, thickness_m: 0 }];
  let velocity: number | null = null, reynolds4: number | null = null;
  for (let k = 1; k < keys.length; k++) {
    const count = Math.max(1, Math.ceil((keys[k - 1] - keys[k]) / 0.04));
    for (let j = 1; j <= count; j++) {
      const previous = points[points.length - 1];
      const y = keys[k - 1] + (keys[k] - keys[k - 1]) * j / count, radius = profile.r(y);
      const dy = previous.y - y, dr = radius - previous.radius, ds = Math.hypot(dy, dr) * METERS_PER_SCENE_UNIT;
      if (!(dy > 0) || !(ds > 0)) continue;
      const tangentR = dr * METERS_PER_SCENE_UNIT / ds, tangentY = -dy * METERS_PER_SCENE_UNIT / ds;
      if (velocity === null) velocity = Math.max(0,
        (vx * Math.cos(angleWorld) * tangentR + vz * Math.sin(angleWorld) * tangentR + vy * tangentY) * METERS_PER_SCENE_UNIT);
      const gravity = GRAVITY_M_S2 * -tangentY;
      const vEnd = Math.sqrt(velocity * velocity + 2 * gravity * ds);
      const energyTime = 2 * ds / Math.max(1e-12, velocity + vEnd);
      const localWidth = Math.max(1e-9, Math.min(width_m, 2 * Math.PI * Math.max(previous.radius, radius) * METERS_PER_SCENE_UNIT));
      const film = viscosity !== null ? nusseltFilm(flow_ml_s * 1e-6, localWidth, density, viscosity, gravity) : null;
      const duration = Math.max(energyTime, film ? ds / film.meanVelocity_m_s : 0);
      velocity = Math.min(vEnd, film?.meanVelocity_m_s ?? vEnd);
      reynolds4 = film ? Math.max(reynolds4 ?? 0, film.reynolds4) : reynolds4;
      points.push({ time_s: previous.time_s + duration, y, radius, speed_m_s: ds / duration,
        width_m: localWidth, thickness_m: flow_ml_s * 1e-6 * duration / (localWidth * ds) });
    }
  }
  if (points.length > 1) Object.assign(points[0], { speed_m_s: points[1].speed_m_s, thickness_m: points[1].thickness_m });
  const plan: WallFilmPlan = { type: target.type, capacity_ml: target.capacity_ml, bodyRevision: target.bodyRevision ?? 0, angle_rad,
    lastPosition: [...target.position], lastRotationY: target.rotationY, viscosity_Pa_s: viscosity,
    viscosityBasis: viscosity === null ? 'unavailable' : Math.abs(waterMass - sample.mass_g) < 1e-9
      ? 'pure_water_iapws' : 'aqueous_water_proxy',
    model: viscosity === null ? 'inviscid_travel_lower_bound' : 'local_nusselt_with_energy_bound', reynolds4, points };
  return { ...air, id: `${air.id}_wall_${air.arrivedFraction}`, stage: 'wall', wallFilm: plan,
    sample, elapsed_s: 0, arrivedFraction: 0, releasedVolume_ml: sample.volume_ml,
    duration_s: sample.volume_ml / flow_ml_s };
}

export function wallTimeAtHeight(plan: WallFilmPlan, y: number): number {
  if (y >= plan.points[0].y) return 0;
  for (let i = 1; i < plan.points.length; i++) {
    const a = plan.points[i - 1], b = plan.points[i];
    if (y >= b.y) return a.time_s + (a.y - y) / (a.y - b.y) * (b.time_s - a.time_s);
  }
  return plan.points.at(-1)!.time_s;
}

export function wallPointAtTime(plan: WallFilmPlan, time: number): WallFilmPoint {
  if (time <= 0) return plan.points[0];
  for (let i = 1; i < plan.points.length; i++) {
    const a = plan.points[i - 1], b = plan.points[i];
    if (time <= b.time_s) {
      const fraction = (time - a.time_s) / (b.time_s - a.time_s);
      return { time_s: time, y: a.y + (b.y - a.y) * fraction, radius: a.radius + (b.radius - a.radius) * fraction,
        speed_m_s: b.speed_m_s, width_m: b.width_m, thickness_m: b.thickness_m };
    }
  }
  return plan.points.at(-1)!;
}

export function wallWorldPoint(plan: WallFilmPlan, time: number, vessel?: VesselState | null): [number, number, number] {
  const point = wallPointAtTime(plan, time), position = vessel?.position ?? plan.lastPosition;
  const angle = plan.angle_rad - (vessel?.rotationY ?? plan.lastRotationY);
  return [position[0] + point.radius * Math.cos(angle), position[1] + point.y, position[2] + point.radius * Math.sin(angle)];
}

export function advanceWallFilm(parcel: PourParcel, dt: number, target: VesselState) {
  const plan = parcel.wallFilm!;
  const current = { ...plan, lastPosition: [...target.position] as [number, number, number], lastRotationY: target.rotationY };
  const contactTime = wallTimeAtHeight(plan, vesselLiquidSurfaceY(target));
  const elapsed_s = parcel.elapsed_s + dt;
  const fraction = Math.max(parcel.arrivedFraction, Math.min(1, Math.max(0, (elapsed_s - contactTime) / parcel.duration_s)));
  const relative = (fraction - parcel.arrivedFraction) / Math.max(1e-15, 1 - parcel.arrivedFraction);
  const contact = relative > 0 ? scalePourSample(parcel.sample, relative) : null;
  const impactPos = wallWorldPoint(current, contactTime, target);
  return { parcel: { ...parcel, wallFilm: current, elapsed_s, arrivedFraction: fraction,
    trajectory: { ...parcel.trajectory, impactPos, detailKind: 'liquid' as const },
    sample: relative > 0 ? scalePourSample(parcel.sample, 1 - relative) : parcel.sample }, contact };
}

/** A broken/removed support releases its remaining film back into free flight.
 * Position/velocity use a representative point of this sub-frame interval. */
export function detachWallFilm(parcel: PourParcel, target?: VesselState | null): PourParcel {
  const plan = parcel.wallFilm!;
  const age = Math.max(0, parcel.elapsed_s - parcel.duration_s * (1 + parcel.arrivedFraction) / 2);
  const point = wallPointAtTime(plan, age), next = wallPointAtTime(plan, age + 1e-5);
  const ds = Math.hypot(next.radius - point.radius, next.y - point.y);
  const r = ds > 0 ? (next.radius - point.radius) / ds : 0;
  const y = ds > 0 ? (next.y - point.y) / ds : -1;
  const angle = plan.angle_rad - (target?.rotationY ?? plan.lastRotationY);
  const speed = point.speed_m_s / METERS_PER_SCENE_UNIT;
  const position = wallWorldPoint(plan, age, target);
  const trajectory = traceLaunchedStream(position, [r * Math.cos(angle) * speed, y * speed, r * Math.sin(angle) * speed],
    null, LAB_PHYSICS.TABLE_SURFACE_Y);
  return { ...parcel, id: `${parcel.id}_detached`, stage: 'air', wallFilm: undefined,
    targetId: null, targetPose: '', trajectory, elapsed_s: 0, arrivedFraction: 0,
    duration_s: parcel.duration_s * (1 - parcel.arrivedFraction), releasedVolume_ml: parcel.sample.volume_ml };
}
