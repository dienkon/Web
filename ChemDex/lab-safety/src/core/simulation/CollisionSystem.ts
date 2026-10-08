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

// Room dimensions: X: -6.0 -> +6.0 (12m), Z: -4.5 -> +4.5 (9m)
export const LAB_BOUNDS = {
  minX: -5.85,
  maxX: 5.85,
  minZ: -4.35,
  maxZ: 4.35,
};

// Initial obstacles based on 4 bench islands and perimeter furniture
export const INITIAL_COLLIDER_BOXES: ColliderBox[] = [
  // Bench 1: (-2.1, -1.0), size: 2.4 x 1.3
  { id: 'bench_1', minX: -3.3, maxX: -0.9, minZ: -1.65, maxZ: -0.35 },
  // Bench 2: (+2.1, -1.0), size: 2.4 x 1.3
  { id: 'bench_2', minX: 0.9, maxX: 3.3, minZ: -1.65, maxZ: -0.35 },
  // Bench 3: (-2.1, +1.8), size: 2.4 x 1.3
  { id: 'bench_3', minX: -3.3, maxX: -0.9, minZ: 1.15, maxZ: 2.45 },
  // Bench 4: (+2.1, +1.8), size: 2.4 x 1.3
  { id: 'bench_4', minX: 0.9, maxX: 3.3, minZ: 1.15, maxZ: 2.45 },
  // Teacher Bench: (0, -3.2), size: 2.4 x 0.9
  { id: 'bench_teacher', minX: -1.2, maxX: 1.2, minZ: -3.65, maxZ: -2.75 },
  // Fume hood: (+4.3, -3.7), size: 1.8 x 0.9
  { id: 'fume_hood', minX: 3.4, maxX: 5.2, minZ: -4.15, maxZ: -3.25 },
  // East Cabinets: x ~ 5.45
  { id: 'cab_flammable', minX: 5.0, maxX: 5.9, minZ: -2.4, maxZ: -1.6 },
  { id: 'cab_acid', minX: 5.0, maxX: 5.9, minZ: -1.3, maxZ: -0.5 },
  { id: 'cab_base', minX: 5.0, maxX: 5.9, minZ: -0.2, maxZ: 0.6 },
  { id: 'shelf_general', minX: 5.1, maxX: 5.9, minZ: 1.0, maxZ: 1.8 },
  // PPE locker bank: (-1.0, +4.25), size: 2.4 x 0.5
  { id: 'ppe_locker', minX: -2.2, maxX: 0.2, minZ: 4.0, maxZ: 4.5 },
  // Handwash sink: (+3.2, +4.2), size: 1.4 x 0.6
  { id: 'sink_handwash', minX: 2.5, maxX: 3.9, minZ: 3.9, maxZ: 4.5 },
];

export const INITIAL_COLLIDER_CYLINDERS: ColliderCylinder[] = [
  // Emergency shower column (-5.2, -3.3)
  { id: 'shower_emergency', x: -5.2, z: -3.3, radius: 0.25 },
  // Waste bins cluster
  { id: 'bin_general', x: 5.3, z: 3.0, radius: 0.25 },
  { id: 'bin_chemical', x: 5.3, z: 3.55, radius: 0.25 },
  { id: 'bin_glass', x: 5.3, z: 4.1, radius: 0.25 },
];

/**
 * Checks capsule collision against walls and obstacles, sliding smoothly.
 * Player is approximated as a vertical capsule with radius r.
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

  // 2. Slide resolution against Box Colliders (Axis-aligned with expanded minkowski radius)
  for (const box of boxColliders) {
    const minX = box.minX - radius;
    const maxX = box.maxX + radius;
    const minZ = box.minZ - radius;
    const maxZ = box.maxZ + radius;

    if (nextX > minX && nextX < maxX && nextZ > minZ && nextZ < maxZ) {
      collided = true;
      // Resolve along X first if player was outside in X
      const curX = currentPos[0];
      const curZ = currentPos[2];

      const wasOutsideX = curX <= minX || curX >= maxX;
      const wasOutsideZ = curZ <= minZ || curZ >= maxZ;

      if (wasOutsideX && !wasOutsideZ) {
        nextX = curX; // cancel X move, keep Z slide
      } else if (wasOutsideZ && !wasOutsideX) {
        nextZ = curZ; // cancel Z move, keep X slide
      } else {
        // Both collided - find shortest separation distance
        const dxMin = Math.abs(nextX - minX);
        const dxMax = Math.abs(nextX - maxX);
        const dzMin = Math.abs(nextZ - minZ);
        const dzMax = Math.abs(nextZ - maxZ);
        const minOverlap = Math.min(dxMin, dxMax, dzMin, dzMax);

        if (minOverlap === dxMin) nextX = minX;
        else if (minOverlap === dxMax) nextX = maxX;
        else if (minOverlap === dzMin) nextZ = minZ;
        else nextZ = maxZ;
      }
    }
  }

  // 3. Slide resolution against Cylinder Colliders
  for (const cyl of cylinderColliders) {
    const minDist = cyl.radius + radius;
    const dx = nextX - cyl.x;
    const dz = nextZ - cyl.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < minDist * minDist && distSq > 0.0001) {
      collided = true;
      const dist = Math.sqrt(distSq);
      const normalX = dx / dist;
      const normalZ = dz / dist;
      nextX = cyl.x + normalX * minDist;
      nextZ = cyl.z + normalZ * minDist;
    }
  }

  return { x: nextX, z: nextZ, collided };
}
