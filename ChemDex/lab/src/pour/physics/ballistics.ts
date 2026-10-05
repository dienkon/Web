import { VesselProfile } from './profiles';

export interface BallisticsResult {
  exitPos: [number, number, number];
  exitVel: [number, number, number];
  impactPos: [number, number, number];
  timeOfFlight: number;
  landingKind: 'inside' | 'rim' | 'table';
  targetVesselId: string | null;
}

const G_SCENE = 9.8; // scene units / s^2

/**
 * Calculates exit trajectory, flight time, and landing coordinates on target or table.
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
  sourceRotationY: number = 0
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
  const tiltedZ = localLip[2];

  const worldLipX = sourcePos[0] + (tiltedX * cosY + tiltedZ * sinY);
  const worldLipY = sourcePos[1] + tiltedY;
  const worldLipZ = sourcePos[2] + (-tiltedX * sinY + tiltedZ * cosY);

  // Exit velocity from Torricelli / weir head: v0 ~ sqrt(2gh)
  const h_m = Math.max(0.001, head_cm / 100);
  const exitSpeed = Math.max(0.35, Math.min(2.5, Math.sqrt(2 * 9.8 * h_m) * 1.2));

  // Exit direction: outward normal from lip rotated by tilt and yaw
  const localDirX = Math.sign(localLip[0]) * Math.cos(theta) * 0.8 - Math.sin(theta) * 0.4;
  const localDirY = -Math.abs(Math.sin(theta)) * 0.7 - 0.2;
  const localDirZ = 0;

  const worldDirX = localDirX * cosY + localDirZ * sinY;
  const worldDirY = localDirY;
  const worldDirZ = -localDirX * sinY + localDirZ * cosY;

  const dirLen = Math.hypot(worldDirX, worldDirY, worldDirZ) || 1;
  const vx = (worldDirX / dirLen) * exitSpeed;
  const vy = (worldDirY / dirLen) * exitSpeed;
  const vz = (worldDirZ / dirLen) * exitSpeed;

  // Determine target elevation y_T
  let targetY_intercept = tableY;
  if (targetVessel) {
    // If stream is above vessel mouth, aim for liquid surface inside beaker; else table
    if (worldLipY > targetVessel.mouthY) {
      targetY_intercept = targetVessel.liquidSurfaceY;
    }
  }

  // Solve flight time: worldLipY + vy*t - 0.5*G*t^2 = targetY_intercept
  const dy = worldLipY - targetY_intercept;
  let tFlight = 0.1;
  if (dy > 0) {
    const disc = vy * vy + 2 * G_SCENE * dy;
    tFlight = Math.max(0.01, (vy + Math.sqrt(Math.max(0, disc))) / G_SCENE);
  }

  // Landing coordinate
  const landX = worldLipX + vx * tFlight;
  const landY = targetY_intercept;
  const landZ = worldLipZ + vz * tFlight;

  // Classify landing
  let landingKind: 'inside' | 'rim' | 'table' = 'table';
  let matchedTargetId: string | null = null;

  if (targetVessel) {
    const distToCenter = Math.hypot(landX - targetVessel.position[0], landZ - targetVessel.position[2]);
    const insideRadius = targetVessel.mouthR * 0.85;
    const rimRadius = targetVessel.mouthR * 1.15;

    if (distToCenter <= insideRadius) {
      landingKind = 'inside';
      matchedTargetId = targetVessel.id;
    } else if (distToCenter <= rimRadius) {
      landingKind = 'rim';
      matchedTargetId = targetVessel.id;
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
    targetVesselId: matchedTargetId
  };
}
