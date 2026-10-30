import type { VesselState } from '../types/chemistry';
import type { LiquidAliquot } from '../handling/aliquot';
import { advancePourParcel, scalePourSample, type PourParcel } from './pourTransport';
import { createFilmPlan, detachWallFilm, wallWorldPoint } from './wallFilm';
import { vesselWorldDimensions } from '../science/vesselScale';
import { traceLaunchedStream } from '../pour/physics/ballistics';
import { GRAVITY_M_S2, METERS_PER_SCENE_UNIT } from '../science/sceneUnits';
import { LAB_PHYSICS } from './interactionEngine';

let sequence = 0;
export interface OverflowRelease {
  /** Internal stock handoff, committed with its displaced-fluid receipt.
   * This object is not serialized into the transport plan. */
  retainedReceiver?: VesselState;
  duration_s?: number;
  temperature_c?: number;
  sourceId?: string;
  sessionId?: string;
  sourceName?: string;
}
export function overflowWallTime(parcel: PourParcel): number {
  return parcel.stage === 'overflow' ? parcel.wallFilm?.points.at(-1)?.time_s ?? 0 : 0;
}

function exitTrajectory(parcel: PourParcel, vessel: VesselState) {
  const plan = parcel.wallFilm!, point = plan.points.at(-1)!;
  const position = wallWorldPoint(plan, point.time_s, vessel);
  // Detached flow starts vertically downward. Tangential launch/air drag and
  // edge breakup require a separate calibrated detachment closure.
  return traceLaunchedStream(position, [0, -point.speed_m_s / METERS_PER_SCENE_UNIT, 0], null, LAB_PHYSICS.TABLE_SURFACE_Y);
}

function exitSheet(parcel: PourParcel, vessel: VesselState): PourParcel['circularSheet'] {
  const point = parcel.wallFilm!.points.at(-1)!;
  return { center: [vessel.position[0], vessel.position[2]], radius: point.radius + point.thickness_m / (2 * METERS_PER_SCENE_UNIT) };
}

/** Equal angular quadrature of a circular sheet. Samples/receipts stay owned
 * once; only ground deposition is partitioned across actual contact positions. */
export function overflowImpactSites(parcel: PourParcel): [number, number, number][] {
  const sheet = parcel.circularSheet;
  if (!sheet) return [parcel.trajectory.impactPos];
  const radius = Math.abs(sheet.radius + (sheet.radialVelocity_scene_s ?? 0) * parcel.trajectory.timeOfFlight);
  return Array.from({ length: 24 }, (_, i) => {
    const angle = 2 * Math.PI * i / 24;
    return [sheet.center[0] + radius * Math.cos(angle), parcel.trajectory.impactPos[1],
      sheet.center[1] + radius * Math.sin(angle)];
  });
}

/** sample is already debited from the receiver/source. This function creates
 * an owner for that exact matter; it never withdraws or duplicates inventory. */
export function createOverflowParcel(vessel: VesselState, sample: LiquidAliquot, release: OverflowRelease = {}): PourParcel | null {
  if (![sample.volume_ml, sample.mass_g, sample.temperature_c, ...vessel.position, vessel.rotationY ?? 0, vessel.rotationZ ?? 0]
    .every(Number.isFinite) || sample.volume_ml <= 0 || sample.mass_g < 0
    || sample.contents.some(c => !Number.isFinite(c.mass_g) || c.mass_g < 0 || !Number.isFinite(c.moles) || c.moles < 0)) return null;
  const duration = release.duration_s ?? 0.12;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const dimensions = vesselWorldDimensions(vessel);
  const id = `overflow_${Date.now()}_${++sequence}`;
  // These meshes have level circular rims, with no lowered spout/notch. The
  // well-mixed, level-surface model therefore exposes the complete rim.
  const width_m = 2 * Math.PI * (dimensions.rimRadius + 0.0002) * METERS_PER_SCENE_UNIT;
  // Fr=1 rectangular-sheet entry reference, q=u*h and u²=g*h. It is an
  // assumed edge condition, NOT a calibrated glass-rim discharge relation.
  const entrySpeed_m_s = Math.cbrt(GRAVITY_M_S2 * sample.volume_ml * 1e-6 / (duration * width_m));
  const plan = createFilmPlan(vessel, sample, sample.volume_ml / duration,
    width_m, dimensions.topY, 0, [0, -entrySpeed_m_s / METERS_PER_SCENE_UNIT, 0], 'outer', 2 * Math.PI);
  plan.entrySpeed_m_s = entrySpeed_m_s; plan.widthBasis = 'level_circular_rim';
  let parcel: PourParcel = { id, stage: 'overflow', overflowOrigin: true,
    releaseBasis: release.duration_s === undefined ? 'assumed-dose-interval' : 'metered',
    sourceId: release.sourceId ?? vessel.id, sourceName: release.sourceName ?? vessel.name ?? vessel.id, sessionId: release.sessionId ?? id,
    targetId: vessel.id, targetPose: '', sample: scalePourSample(sample, 1), wallFilm: plan,
    releasedVolume_ml: sample.volume_ml, duration_s: duration, elapsed_s: 0, arrivedFraction: 0,
    trajectory: { exitPos: [0, 0, 0], exitVel: [0, 0, 0], impactPos: [0, 0, 0], timeOfFlight: 0, landingKind: 'table', targetVesselId: null } };
  parcel.trajectory = exitTrajectory(parcel, vessel);
  parcel.circularSheet = exitSheet(parcel, vessel);
  if (vessel.isShattered || Math.abs(vessel.rotationZ ?? 0) > 1e-6) {
    const angle = vessel.rotationZ ?? 0, yaw = vessel.rotationY ?? 0;
    const x = dimensions.rimRadius * Math.cos(angle) - dimensions.topY * Math.sin(angle);
    const y = dimensions.rimRadius * Math.sin(angle) + dimensions.topY * Math.cos(angle);
    parcel = { ...parcel, circularSheet: undefined, stage: 'air', wallFilm: undefined, targetId: null,
      trajectory: traceLaunchedStream([vessel.position[0] + x * Math.cos(yaw), vessel.position[1] + y,
        vessel.position[2] - x * Math.sin(yaw)], [0, 0, 0], null, LAB_PHYSICS.TABLE_SURFACE_Y) };
  }
  return parcel;
}

/** Rendering/inspection partitions a single undelivered inventory. These
 * fractions are not additional matter and must never be summed as owners. */
export function overflowLocationFractions(parcel: PourParcel) {
  const remaining = Math.max(0, 1 - parcel.arrivedFraction);
  if (parcel.stage !== 'overflow') return { wall: 0, air: remaining > 0 ? 1 : 0, queued: 0 };
  const emitted = Math.min(1, Math.max(parcel.arrivedFraction, parcel.elapsed_s / parcel.duration_s));
  const offWall = Math.min(1, Math.max(parcel.arrivedFraction,
    (parcel.elapsed_s - overflowWallTime(parcel)) / parcel.duration_s));
  const air = remaining > 0 ? Math.max(0, offWall - parcel.arrivedFraction) / remaining : 0;
  const queued = remaining > 0 ? Math.max(0, 1 - emitted) / remaining : 0;
  return { wall: Math.max(0, 1 - air - queued), air, queued };
}

/** On support movement, fluid already in air keeps its old world trajectory.
 * The still-wetted interval follows the new support. Missing/tilted/broken
 * support detaches that remainder at a representative wall position. */
export function reconcileOverflowSupport(parcel: PourParcel, vessel?: VesselState | null): PourParcel[] {
  const plan = parcel.wallFilm!;
  const intact = vessel && !vessel.isShattered && Math.abs(vessel.rotationZ ?? 0) < 1e-6
    && vessel.type === plan.type && vessel.capacity_ml === plan.capacity_ml && (vessel.bodyRevision ?? 0) === plan.bodyRevision;
  const moved = !intact || vessel!.position.some((value, i) => value !== plan.lastPosition[i]) || (vessel!.rotationY ?? 0) !== plan.lastRotationY;
  if (!moved) return [parcel];
  const cutoff = Math.min(parcel.duration_s, Math.max(parcel.arrivedFraction * parcel.duration_s, parcel.elapsed_s - overflowWallTime(parcel)));
  const originalRemaining = (1 - parcel.arrivedFraction) * parcel.duration_s;
  const airDuration = cutoff - parcel.arrivedFraction * parcel.duration_s;
  const wallDuration = parcel.duration_s - cutoff;
  const parts: PourParcel[] = [];
  if (airDuration > 0) parts.push({ ...parcel, id: `${parcel.id}_air`, stage: 'air', wallFilm: undefined,
    targetId: null, duration_s: cutoff, releasedVolume_ml: parcel.releasedVolume_ml * cutoff / parcel.duration_s,
    elapsed_s: parcel.elapsed_s - overflowWallTime(parcel), arrivedFraction: parcel.arrivedFraction * parcel.duration_s / cutoff,
    sample: scalePourSample(parcel.sample, airDuration / originalRemaining) });
  if (wallDuration > 0) {
    let bound: PourParcel = { ...parcel, id: `${parcel.id}_bound`, duration_s: wallDuration,
      releasedVolume_ml: parcel.releasedVolume_ml * wallDuration / parcel.duration_s,
      elapsed_s: parcel.elapsed_s - cutoff, arrivedFraction: 0,
      sample: scalePourSample(parcel.sample, wallDuration / originalRemaining) };
    if (intact) {
      bound = { ...bound, wallFilm: { ...plan, lastPosition: [...vessel!.position], lastRotationY: vessel!.rotationY ?? 0 } };
      bound.trajectory = exitTrajectory(bound, vessel!);
      bound.circularSheet = exitSheet(bound, vessel!);
    } else {
      // Detach at the last valid pose; a removed body cannot teleport film.
      bound = detachWallFilm(bound, null);
    }
    parts.push(bound);
  }
  return parts;
}

export function advanceOverflowParcel(parcel: PourParcel, dt: number) {
  const wallTime = overflowWallTime(parcel);
  const flight = { ...parcel, stage: 'air' as const, elapsed_s: parcel.elapsed_s - wallTime };
  const next = advancePourParcel(flight, dt);
  return { parcel: { ...next.parcel, stage: 'overflow' as const, elapsed_s: next.parcel.elapsed_s + wallTime }, contact: next.contact };
}
