export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ColliderCylinder {
  id: string;
  x: number;
  z: number;
  radius: number;
}

// Grand Modern Chemical Laboratory: 20m (X: -10.0 -> +10.0), 15m (Z: -7.5 -> +7.5), 3.8m (Y)
export const LAB_BOUNDS = {
  minX: -9.85,
  maxX: 9.85,
  minZ: -7.35,
  maxZ: 7.35,
};

// Obstacle colliders for expanded room
export const INITIAL_COLLIDER_BOXES: ColliderBox[] = [
  // Bench 1 (North-West Analytical): (-4.2, -2.2), size: 3.2 x 1.4
  { id: 'bench_1', minX: -5.8, maxX: -2.6, minZ: -2.9, maxZ: -1.5 },
  // Bench 2 (North-East Heating): (+4.2, -2.2), size: 3.2 x 1.4
  { id: 'bench_2', minX: 2.6, maxX: 5.8, minZ: -2.9, maxZ: -1.5 },
  // Bench 3 (South-West Inorganic): (-4.2, +2.2), size: 3.2 x 1.4
  { id: 'bench_3', minX: -5.8, maxX: -2.6, minZ: 1.5, maxZ: 2.9 },
  // Bench 4 (South-East Scenario): (+4.2, +2.2), size: 3.2 x 1.4
  { id: 'bench_4', minX: 2.6, maxX: 5.8, minZ: 1.5, maxZ: 2.9 },
  // Teacher Demo Bench: (0, -5.5), size: 3.0 x 1.1
  { id: 'bench_teacher', minX: -1.6, maxX: 1.6, minZ: -6.1, maxZ: -4.9 },
  // Fume Hoods at East Wall: (+8.8, -3.5), size: 2.2 x 1.1
  { id: 'fume_hood', minX: 7.7, maxX: 9.8, minZ: -4.8, maxZ: -2.2 },
  // Chemical Storage Cabinets: (+9.4, 0.5)
  { id: 'cab_chemicals', minX: 8.8, maxX: 9.9, minZ: -1.2, maxZ: 2.2 },
  // PPE Locker Station at South Wall: (-3.0, +7.1), size: 3.0 x 0.6
  { id: 'ppe_locker', minX: -4.6, maxX: -1.4, minZ: 6.8, maxZ: 7.4 },
  // Handwash Sink Station: (+3.5, +7.1), size: 2.0 x 0.6
  { id: 'sink_handwash', minX: 2.5, maxX: 4.5, minZ: 6.8, maxZ: 7.4 },
];

export const INITIAL_COLLIDER_CYLINDERS: ColliderCylinder[] = [
  // Emergency Shower & Eyewash Station (-9.2, -4.0)
  { id: 'shower_emergency', x: -9.2, z: -4.0, radius: 0.35 },
  // Chemical Spill Kit Drum / Cart (-9.3, 3.0)
  { id: 'spill_kit_cart', x: -9.3, z: 3.0, radius: 0.35 },
  // Multi-stream Waste Bins (East wall at Z ~ 5.0)
  { id: 'bin_biohazard', x: 8.8, z: 4.5, radius: 0.3 },
  { id: 'bin_chemical', x: 8.8, z: 5.2, radius: 0.3 },
  { id: 'bin_glass', x: 8.8, z: 5.9, radius: 0.3 },
];

/**
 * Checks capsule collision against walls and obstacles, sliding smoothly.
 */
export function resolveCapsuleMovement(
  currentPos: [number, number, number],
  targetX: number,
  targetZ: number,
  radius: number = 0.28,
  boxColliders: ColliderBox[] = INITIAL_COLLIDER_BOXES,
  cylinderColliders: ColliderCylinder[] = INITIAL_COLLIDER_CYLINDERS
): { x: number; z: number; collided: boolean } {
  let nextX = targetX;
  let nextZ = targetZ;
  let collided = false;

  // 1. Boundary clamping (Walls)
  if (nextX < LAB_BOUNDS.minX + radius) {
    nextX = LAB_BOUNDS.minX + radius;
    collided = true;
  } else if (nextX > LAB_BOUNDS.maxX - radius) {
    nextX = LAB_BOUNDS.maxX - radius;
    collided = true;
  }

  if (nextZ < LAB_BOUNDS.minZ + radius) {
    nextZ = LAB_BOUNDS.minZ + radius;
    collided = true;
  } else if (nextZ > LAB_BOUNDS.maxZ - radius) {
    nextZ = LAB_BOUNDS.maxZ - radius;
    collided = true;
  }

  // 2. Slide resolution against Box Colliders
  for (const box of boxColliders) {
    const minX = box.minX - radius;
    const maxX = box.maxX + radius;
    const minZ = box.minZ - radius;
    const maxZ = box.maxZ + radius;

    if (nextX > minX && nextX < maxX && nextZ > minZ && nextZ < maxZ) {
      collided = true;
      // Resolve along closest axis (smooth wall-slide)
      const distMinX = Math.abs(nextX - minX);
      const distMaxX = Math.abs(nextX - maxX);
      const distMinZ = Math.abs(nextZ - minZ);
      const distMaxZ = Math.abs(nextZ - maxZ);
      const minDist = Math.min(distMinX, distMaxX, distMinZ, distMaxZ);

      if (minDist === distMinX) nextX = minX;
      else if (minDist === distMaxX) nextX = maxX;
      else if (minDist === distMinZ) nextZ = minZ;
      else if (minDist === distMaxZ) nextZ = maxZ;
    }
  }

  // 3. Slide resolution against Cylinder Colliders
  for (const cyl of cylinderColliders) {
    const dx = nextX - cyl.x;
    const dz = nextZ - cyl.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radius + cyl.radius;

    if (distSq < minDist * minDist) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        nextX = cyl.x + (dx / dist) * minDist;
        nextZ = cyl.z + (dz / dist) * minDist;
      }
    }
  }

  return { x: nextX, z: nextZ, collided };
}
