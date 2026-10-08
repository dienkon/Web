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
 * Helper to check if a circle at (x, z) with radius r intersects an AABB box
 */
function testBoxCollision(x: number, z: number, radius: number, box: ColliderBox): boolean {
  return (
    x > box.minX - radius &&
    x < box.maxX + radius &&
    z > box.minZ - radius &&
    z < box.maxZ + radius
  );
}

/**
 * Checks capsule collision against walls and obstacles, sliding smoothly without any jitter/stutter.
 * Uses independent axis resolution (Separating Axis Theorem for character sliding).
 */
export function resolveCapsuleMovement(
  currentPos: [number, number, number],
  targetX: number,
  targetZ: number,
  radius: number = 0.28,
  boxColliders: ColliderBox[] = INITIAL_COLLIDER_BOXES,
  cylinderColliders: ColliderCylinder[] = INITIAL_COLLIDER_CYLINDERS
): { x: number; z: number; collided: boolean } {
  let collided = false;
  const startX = currentPos[0];
  const startZ = currentPos[2];

  // 1. Boundary clamping (Outer Room Walls)
  let testX = Math.max(LAB_BOUNDS.minX + radius, Math.min(LAB_BOUNDS.maxX - radius, targetX));
  let testZ = Math.max(LAB_BOUNDS.minZ + radius, Math.min(LAB_BOUNDS.maxZ - radius, targetZ));

  if (testX !== targetX || testZ !== targetZ) {
    collided = true;
  }

  // 2. Axis-Separated Box Sliding:
  // Step A: Test X movement alone while keeping old Z
  let canMoveX = true;
  for (const box of boxColliders) {
    if (testBoxCollision(testX, startZ, radius, box)) {
      canMoveX = false;
      collided = true;
      break;
    }
  }
  let resolvedX = canMoveX ? testX : startX;

  // Step B: Test Z movement alone while keeping newly resolved X
  let canMoveZ = true;
  for (const box of boxColliders) {
    if (testBoxCollision(resolvedX, testZ, radius, box)) {
      canMoveZ = false;
      collided = true;
      break;
    }
  }
  let resolvedZ = canMoveZ ? testZ : startZ;

  // 3. Cylinder Colliders Resolution (smooth radial push)
  for (const cyl of cylinderColliders) {
    const dx = resolvedX - cyl.x;
    const dz = resolvedZ - cyl.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radius + cyl.radius;

    if (distSq < minDist * minDist) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        resolvedX = cyl.x + (dx / dist) * minDist;
        resolvedZ = cyl.z + (dz / dist) * minDist;
      }
    }
  }

  return { x: resolvedX, z: resolvedZ, collided };
}
