import { VesselProfile } from './profiles';
import { SCENE_GRAVITY, GRAVITY_M_S2, METERS_PER_SCENE_UNIT, descendingFlightTime } from '../../science/sceneUnits';

export type LandingKind =
  | 'inside'
  | 'liquid'
  | 'wall_inner'
  | 'rim'
  | 'funnel'
  | 'other_vessel'
  | 'hand/tool'
  | 'table';

export interface BallisticsResult {
  exitPos: [number, number, number];
  exitVel: [number, number, number];
  impactPos: [number, number, number];
  timeOfFlight: number;
  landingKind: LandingKind;
  targetVesselId: string | null;
  detailKind?: 'liquid' | 'wall_inner' | 'funnel' | 'other_vessel' | 'hand/tool';
}

export interface StreamTarget {
  id: string;
  position: [number, number, number];
  mouthR: number;
  mouthY: number;
  liquidSurfaceY: number;
  profile?: VesselProfile;
  sealed?: boolean;
}


/**
 * Calculates exit trajectory, flight time, and landing coordinates on target or table.
 * Optional explicit aiming assistance changes launch velocity; collision still gates intake.
 */
export function calculateStreamBallistics(
  sourcePos: [number, number, number],
  sourceRotationZ: number,
  sourceProfile: VesselProfile,
  head_cm: number,
  targetVessel: StreamTarget | null,
  tableY: number = -0.135,
  sourceRotationY: number = 0,
  assist: 'off' | 'low' | 'high' = 'off'
): BallisticsResult {
  const theta = sourceRotationZ; // tilt angle (radians)

  // Lip in local space rotated by tilt and yaw
  const localLip = sourceProfile.lipLocal;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosY = Math.cos(sourceRotationY);
  const sinY = Math.sin(sourceRotationY);

  const tiltedX = localLip[0] * cosT - localLip[1] * sinT;
  const tiltedY = localLip[0] * sinT + localLip[1] * cosT;
  const tiltedZ = localLip[2] || 0;

  const worldLipX = sourcePos[0] + (tiltedX * cosY + tiltedZ * sinY);
  const worldLipY = sourcePos[1] + tiltedY;
  const worldLipZ = sourcePos[2] + (-tiltedX * sinY + tiltedZ * cosY);

  // Exit velocity from Torricelli / weir head: v0 ~ sqrt(2gh)
  const h_m = Number.isFinite(head_cm) ? Math.max(0, head_cm) / 100 : 0;
  const exitSpeed = Math.sqrt(2 * GRAVITY_M_S2 * h_m) / METERS_PER_SCENE_UNIT;

  // Illustrative launch direction from the tilted lip, then yaw; not a solved nozzle flow.
  const localDirX = Math.sign(localLip[0] || 1) * Math.cos(theta) * 0.8 - Math.sin(theta) * 0.4;
  const localDirY = -Math.abs(Math.sin(theta)) * 0.7 - 0.2;
  const localDirZ = 0;

  const worldDirX = localDirX * cosY + localDirZ * sinY;
  const worldDirY = localDirY;
  const worldDirZ = -localDirX * sinY + localDirZ * cosY;

  const dirLen = Math.hypot(worldDirX, worldDirY, worldDirZ) || 1;
  return traceLaunchedStream([worldLipX, worldLipY, worldLipZ],
    [(worldDirX / dirLen) * exitSpeed, (worldDirY / dirLen) * exitSpeed, (worldDirZ / dirLen) * exitSpeed],
    targetVessel, tableY, assist);
}

/** Re-check collisions without steering liquid that has already left the lip. */
export function traceLaunchedStream(
  exitPos: [number, number, number], exitVel: [number, number, number],
  targetVessel: StreamTarget | null, tableY: number, assist: 'off' | 'low' | 'high' = 'off',
): BallisticsResult {
  const [worldLipX, worldLipY, worldLipZ] = exitPos;
  let [vx, vy, vz] = exitVel;

  const positionAt = (time: number): [number, number, number] => [worldLipX + vx * time,
    worldLipY + vy * time - 0.5 * SCENE_GRAVITY * time * time, worldLipZ + vz * time];
  const resultAt = (time: number, landingKind: LandingKind, targetVesselId: string | null,
    detailKind?: BallisticsResult['detailKind']): BallisticsResult => ({
    exitPos: [worldLipX, worldLipY, worldLipZ], exitVel: [vx, vy, vz],
    impactPos: positionAt(time), timeOfFlight: time, landingKind, targetVesselId, detailKind,
  });

  const startsInside = !!targetVessel && worldLipY < targetVessel.mouthY && worldLipY > targetVessel.liquidSurfaceY
    && Math.hypot(worldLipX - targetVessel.position[0], worldLipZ - targetVessel.position[2])
      <= (targetVessel.profile?.r(worldLipY - targetVessel.position[1]) ?? targetVessel.mouthR);
  const mouthTime = startsInside ? 0 : targetVessel && worldLipY >= targetVessel.mouthY - 1e-9
    ? descendingFlightTime(worldLipY, vy, targetVessel.mouthY) : null;
  if (targetVessel && mouthTime !== null) {
    const centerX = targetVessel.position[0], centerZ = targetVessel.position[2];
    const radius = Math.max(0, startsInside ? targetVessel.profile?.r(worldLipY - targetVessel.position[1]) ?? targetVessel.mouthR
      : targetVessel.mouthR);
    const distance = () => Math.hypot(worldLipX + vx * mouthTime - centerX, worldLipZ + vz * mouthTime - centerZ);
    if (assist !== 'off' && mouthTime > 1e-9
      && Math.hypot(worldLipX - centerX, worldLipZ - centerZ) <= Math.max(2.5, radius * 6)) {
      const d = distance(), acceptedRadius = radius * 0.7;
      if (d > acceptedRadius) {
        const blend = assist === 'high' ? 0 : acceptedRadius / d;
        const x = centerX + (worldLipX + vx * mouthTime - centerX) * blend;
        const z = centerZ + (worldLipZ + vz * mouthTime - centerZ) * blend;
        vx = (x - worldLipX) / mouthTime; vz = (z - worldLipZ) / mouthTime;
      }
    }
    const atMouth = distance();
    if (targetVessel.sealed && atMouth <= radius + 1e-9) return resultAt(mouthTime, 'rim', targetVessel.id);
    if (atMouth <= radius + 1e-9) {
      const surfaceTime = descendingFlightTime(worldLipY, vy, targetVessel.liquidSurfaceY);
      if (surfaceTime !== null && surfaceTime >= mouthTime) {
        // First wall intersection after entering the true opening. An entered
        // stream may run down the inside wall, but never pass through the glass.
        const clearance = (time: number) => {
          const [x, y, z] = positionAt(time);
          const r = targetVessel.profile?.r(y - targetVessel.position[1]) ?? radius;
          return r - Math.hypot(x - centerX, z - centerZ);
        };
        let previous = mouthTime;
        for (let i = 1; i <= 32; i++) {
          const time = mouthTime + (surfaceTime - mouthTime) * i / 32;
          if (clearance(time) < 0) {
            let low = previous, high = time;
            for (let j = 0; j < 22; j++) {
              const middle = (low + high) / 2;
              if (clearance(middle) < 0) high = middle; else low = middle;
            }
            return resultAt((low + high) / 2, 'inside', targetVessel.id, 'wall_inner');
          }
          previous = time;
        }
        return resultAt(surfaceTime, 'inside', targetVessel.id, 'liquid');
      }
    }
    const rimRadius = Math.max(radius, targetVessel.profile?.rimR ?? Math.abs(targetVessel.profile?.lipLocal[0] ?? radius * 1.04));
    if (atMouth <= rimRadius) return resultAt(mouthTime, 'rim', targetVessel.id);
  }
  // A missed opening lands on the bench plane, not an imaginary liquid plane.
  const tableTime = descendingFlightTime(worldLipY, vy, tableY);
  return resultAt(tableTime ?? 0, 'table', null);
}
