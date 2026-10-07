import { VesselProfile } from './profiles';

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

const G_SCENE = 9.8; // scene units / s^2

/**
 * Calculates exit trajectory, flight time, and landing coordinates on target or table.
 * Includes deterministic Precision Pour Assist (§3.1-3.2) for guaranteed controlled transfer.
 */
export function calculateStreamBallistics(
  sourcePos: [number, number, number],
  sourceRotationZ: number,
  sourceProfile: VesselProfile,
  head_cm: number,
  targetVessel: {
    id: string;
    position: [number, number, number];
    mouthR: number;
    mouthY: number;
    liquidSurfaceY: number;
  } | null,
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
  const h_m = Math.max(0.001, head_cm / 100);
  const exitSpeed = Math.max(0.35, Math.min(2.5, Math.sqrt(2 * 9.8 * h_m) * 1.2));

  // Exit direction: outward normal from lip rotated by tilt and yaw
  const localDirX = Math.sign(localLip[0] || 1) * Math.cos(theta) * 0.8 - Math.sin(theta) * 0.4;
  const localDirY = -Math.abs(Math.sin(theta)) * 0.7 - 0.2;
  const localDirZ = 0;

  const worldDirX = localDirX * cosY + localDirZ * sinY;
  const worldDirY = localDirY;
  const worldDirZ = -localDirX * sinY + localDirZ * cosY;

  const dirLen = Math.hypot(worldDirX, worldDirY, worldDirZ) || 1;
  let vx = (worldDirX / dirLen) * exitSpeed;
  let vy = (worldDirY / dirLen) * exitSpeed;
  let vz = (worldDirZ / dirLen) * exitSpeed;

  // Determine target elevation y_T
  let targetY_intercept = tableY;
  if (targetVessel) {
    if (worldLipY > targetVessel.mouthY) {
      targetY_intercept = targetVessel.liquidSurfaceY;
    }
  }

  // Solve flight time: worldLipY + vy*t - 0.5*G*t^2 = targetY_intercept
  const dy = Math.max(0.01, worldLipY - targetY_intercept);
  const disc = vy * vy + 2 * G_SCENE * dy;
  let tFlight = Math.max(0.01, (vy + Math.sqrt(Math.max(0, disc))) / G_SCENE);

  // Natural landing coordinate
  let landX = worldLipX + vx * tFlight;
  const landY = targetY_intercept;
  let landZ = worldLipZ + vz * tFlight;

  // ========================================================
  // PRECISION POUR ASSIST (§3.1 - §3.2)
  // When pouring intentionally into an acquired target vessel,
  // guarantee that the ballistic stream lands cleanly inside
  // ========================================================
  if (targetVessel && assist !== 'off') {
    const targetCenterX = targetVessel.position[0];
    const targetCenterZ = targetVessel.position[2];
    const distToCenter = Math.hypot(landX - targetCenterX, landZ - targetCenterZ);
    const acceptRadius = targetVessel.mouthR * 0.70;

    // Check if source vessel is in reasonable pouring range
    const sourceDistToTarget = Math.hypot(worldLipX - targetCenterX, worldLipZ - targetCenterZ);
    const maxControlledRange = Math.max(2.5, targetVessel.mouthR * 6.0);

    if (sourceDistToTarget <= maxControlledRange && distToCenter > acceptRadius) {
      // Apply Bounded Trajectory Correction: adjust exit velocity vector
      // so that stream intersects the interior opening of the target
      const requiredVx = (targetCenterX - worldLipX) / tFlight;
      const requiredVz = (targetCenterZ - worldLipZ) / tFlight;

      if (assist === 'high') {
        // High assist: exact deterministic intercept at mouth center
        vx = requiredVx;
        vz = requiredVz;
        landX = targetCenterX;
        landZ = targetCenterZ;
      } else {
        // Low assist: pull landing point into acceptance circle
        const blend = Math.min(1.0, acceptRadius / distToCenter);
        landX = targetCenterX + (landX - targetCenterX) * blend;
        landZ = targetCenterZ + (landZ - targetCenterZ) * blend;
        vx = (landX - worldLipX) / tFlight;
        vz = (landZ - worldLipZ) / tFlight;
      }
    }
  }

  // Classify landing
  let landingKind: LandingKind = 'table';
  let matchedTargetId: string | null = null;
  let detailKind: 'liquid' | 'wall_inner' | 'funnel' | 'other_vessel' | 'hand/tool' | undefined;

  if (targetVessel) {
    const distToCenter = Math.hypot(landX - targetVessel.position[0], landZ - targetVessel.position[2]);
    const insideRadius = targetVessel.mouthR * 1.35;
    const rimRadius = targetVessel.mouthR * 1.75;

    if (distToCenter <= insideRadius) {
      landingKind = 'inside';
      matchedTargetId = targetVessel.id;
      detailKind = distToCenter <= targetVessel.mouthR * 0.75 ? 'liquid' : 'wall_inner';
    } else if (distToCenter <= rimRadius) {
      landingKind = 'rim';
      matchedTargetId = targetVessel.id;
      detailKind = 'wall_inner';
    } else {
      landingKind = 'table';
    }
  }

  return {
    exitPos: [worldLipX, worldLipY, worldLipZ],
    exitVel: [vx, vy, vz],
    impactPos: [landX, landY, landZ],
    timeOfFlight: tFlight,
    landingKind,
    targetVesselId: matchedTargetId,
    detailKind
  };
}
