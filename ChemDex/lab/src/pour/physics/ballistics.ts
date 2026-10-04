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
  tableY: number = -0.135
): BallisticsResult {
  const theta = sourceRotationZ; // tilt angle (radians)

  // Lip in world space
  const localLip = sourceProfile.lipLocal;
  // Rotate (lipX, lipY) by theta around Z
  // In our conventions, tilt towards target (left) is positive theta or negative theta
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const worldLipX = sourcePos[0] + (localLip[0] * cosT - localLip[1] * sinT);
  const worldLipY = sourcePos[1] + (localLip[0] * sinT + localLip[1] * cosT);
  const worldLipZ = sourcePos[2] + localLip[2];

  // Exit velocity from Torricelli / weir head: v0 ~ sqrt(2gh)
  const h_m = Math.max(0.001, head_cm / 100);
  const exitSpeed = Math.max(0.35, Math.min(2.5, Math.sqrt(2 * 9.8 * h_m) * 1.2));

  // Exit direction: tangential to tilted lip, pointing outward and down
  const dirX = Math.sign(localLip[0]) * Math.cos(theta) * 0.8 - Math.sin(theta) * 0.4;
  const dirY = -Math.abs(Math.sin(theta)) * 0.7 - 0.2;
  const dirLen = Math.hypot(dirX, dirY) || 1;

  const vx = (dirX / dirLen) * exitSpeed;
  const vy = (dirY / dirLen) * exitSpeed;
  const vz = 0;

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
