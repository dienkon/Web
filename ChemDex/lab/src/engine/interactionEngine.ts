import * as THREE from 'three';
import { VesselState, ChemicalDefinition } from '../types/chemistry';

/**
 * Reusable physical constraint parameters and laboratory geometry dimensions
 */
export const LAB_PHYSICS = {
  TABLE_SURFACE_Y: -0.135,
  BURNER_SURFACE_Y: -0.975,
  BALANCE_PAN_Y: 0.15,
  BALANCE_POSITION: [7.5, -0.3, -2.5] as [number, number, number],
  BALANCE_PAN_RADIUS: 0.85,
  BURETTE_STAND_POSITION: [5.0, 0.0, 1.5] as [number, number, number],
  BURETTE_NOZZLE_Y: 0.1,
  TRIPOD_GAUZE_Y: 0.22,
  TABLE_BOUNDS: {
    minX: -14.5,
    maxX: 14.5,
    minZ: -5.5,
    maxZ: 5.5,
  },
  CONTAINER_TARE_MASS: {
    beaker: 85.0,
    flask: 120.0,
    test_tube: 25.0,
    cylinder: 110.0,
    burette: 150.0,
  } as Record<string, number>,
};

/**
 * Calculate the exact mass of a container on the balance (Tare + Liquids + Dissolved Solids)
 */
export function calculateVesselMass(vessel: VesselState): number {
  const tare = LAB_PHYSICS.CONTAINER_TARE_MASS[vessel.type] || 80.0;
  // Liquid density approx 1.0 g/mL, plus solids
  const liquidMass = vessel.volume_ml * 1.02; // Average aqueous solution density
  let solidMass = 0;
  if (vessel.contents && vessel.contents.length > 0) {
    solidMass = vessel.contents.reduce((sum, c) => sum + (c.mass_g || 0), 0);
  }
  return tare + liquidMass + solidMass;
}

/**
 * Check if a 3D position is placed on the Analytical Balance Pan
 */
export function isPositionOnBalancePan(x: number, z: number): boolean {
  const [bx, , bz] = LAB_PHYSICS.BALANCE_POSITION;
  const dist = Math.hypot(x - bx, z - bz);
  return dist <= LAB_PHYSICS.BALANCE_PAN_RADIUS;
}

/**
 * Check if a vessel is placed on a Bunsen/Alcohol burner tripod gauze
 */
export function getNearestBurnerHeating(
  vesselPos: [number, number, number],
  burners: Record<string, { isOn: boolean; intensity: number; position: [number, number, number] }>
): { isHeating: boolean; intensity: number; distance: number } | null {
  for (const burner of Object.values(burners)) {
    if (!burner.isOn) continue;
    const dx = vesselPos[0] - burner.position[0];
    const dz = vesselPos[2] - burner.position[2];
    const horizontalDist = Math.hypot(dx, dz);
    
    // Within the tripod heating column
    if (horizontalDist < 1.4) {
      return {
        isHeating: true,
        intensity: burner.intensity || 3,
        distance: horizontalDist,
      };
    }
  }
  return null;
}

/**
 * Physics-based Pouring Threshold and Flow Rate Calculation
 * Returns flow rate in mL/s and dynamic stream origin in vessel local space
 */
export interface PourCalculation {
  isPouring: boolean;
  flowRate_ml_s: number; // 0 to 45 mL/s
  streamThickness: number; // 0.02 to 0.08
  dropletFrequency: number;
  rimWorldPosition: THREE.Vector3;
}

const _vesselQuat = new THREE.Quaternion();
const _rimLocal = new THREE.Vector3();
const _rimWorld = new THREE.Vector3();

export function calculatePourPhysics(
  tiltAngleRad: number, // 0 is upright, Math.PI is upside down
  currentVolume_ml: number,
  capacity_ml: number,
  vesselHeight: number = 2.0,
  vesselRadius: number = 0.9
): {
  isPouring: boolean;
  flowRate_ml_s: number;
  streamThickness: number;
  dropletFrequency: number;
} {
  if (currentVolume_ml <= 0.05) {
    return { isPouring: false, flowRate_ml_s: 0, streamThickness: 0, dropletFrequency: 0 };
  }

  const fillRatio = Math.min(1.0, currentVolume_ml / capacity_ml);
  // Pouring threshold angle decreases as fill ratio increases
  // Full vessel starts pouring around ~25° (0.43 rad), nearly empty vessel starts pouring around ~70° (1.22 rad)
  const thresholdAngle = THREE.MathUtils.lerp(1.22, 0.42, fillRatio);

  if (tiltAngleRad < thresholdAngle) {
    return { isPouring: false, flowRate_ml_s: 0, streamThickness: 0, dropletFrequency: 0 };
  }

  // Excess angle beyond threshold governs fluid dynamics
  const excessAngle = tiltAngleRad - thresholdAngle;
  // Normalized tilt power from 0 to 1
  const tiltPower = Math.min(1.0, excessAngle / (Math.PI / 2 - thresholdAngle + 0.2));

  // Max flow rate is ~35 mL/s
  const flowRate_ml_s = THREE.MathUtils.lerp(1.5, 35.0, Math.pow(tiltPower, 1.4));
  const streamThickness = THREE.MathUtils.lerp(0.025, 0.075, tiltPower);
  const dropletFrequency = tiltPower < 0.25 ? 12 : 3;

  return {
    isPouring: true,
    flowRate_ml_s,
    streamThickness,
    dropletFrequency,
  };
}

/**
 * Newton's Law of Cooling / Heating for Thermal Probes
 */
export function updateThermalResponse(
  currentProbeTemp: number,
  targetFluidTemp: number,
  dt: number,
  timeConstant: number = 2.2 // seconds to reach ~63%
): number {
  const alpha = 1 - Math.exp(-dt / timeConstant);
  return currentProbeTemp + (targetFluidTemp - currentProbeTemp) * alpha;
}

/**
 * Analytical Balance Noise Fluctuations
 * Generates realistic microscopic weight jitter before stabilizing
 */
export function getBalanceDisplayValue(
  targetMass: number,
  timeSec: number,
  isSettled: boolean
): string {
  if (targetMass <= 0.01) return '0.00 g';
  if (isSettled) return `${targetMass.toFixed(2)} g`;
  
  // Subtle fluctuating noise in the last decimal digit
  const microJitter = (Math.sin(timeSec * 16) * 0.03 + Math.cos(timeSec * 23) * 0.02);
  const displayVal = Math.max(0, targetMass + microJitter);
  return `${displayVal.toFixed(2)} g`;
}
