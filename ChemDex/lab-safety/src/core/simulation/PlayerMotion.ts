import { resolveCapsuleMovement } from './CollisionSystem';

export interface PlayerVelocity {
  x: number;
  z: number;
}

/** Integrate acceleration in seconds, preserving a joystick's analog magnitude. */
export function advancePlayerMotion(
  position: [number, number, number],
  velocity: PlayerVelocity,
  input: { x: number; y: number },
  yaw: number,
  speed: number,
  delta: number,
) {
  // Do not catch up a suspended tab. Short substeps also keep stool/wall contact
  // stable when a mobile frame takes longer than the usual 16–33 ms.
  const elapsed = Math.max(0, Math.min(delta, .1));
  if (!elapsed) return 0;
  const magnitude = Math.hypot(input.x, input.y);
  const scale = speed / Math.max(1, magnitude);
  const targetX = (-Math.sin(yaw) * input.y + Math.cos(yaw) * input.x) * scale;
  const targetZ = (-Math.cos(yaw) * input.y - Math.sin(yaw) * input.x) * scale;
  if (magnitude === 0 && velocity.x === 0 && velocity.z === 0) return 0;
  const damping = magnitude > .001 ? 18 : 22;
  const steps = Math.ceil(elapsed / (1 / 60));
  const dt = elapsed / steps;
  const decay = Math.exp(-damping * dt);
  const integral = (1 - decay) / damping;
  let distance = 0;

  for (let step = 0; step < steps; step++) {
    // Exact integral of the damped velocity: acceleration travels the same
    // distance at 30, 60 and 120 FPS instead of using end-of-frame velocity.
    const dx = targetX * dt + (velocity.x - targetX) * integral;
    const dz = targetZ * dt + (velocity.z - targetZ) * integral;
    velocity.x = targetX + (velocity.x - targetX) * decay;
    velocity.z = targetZ + (velocity.z - targetZ) * decay;
    const targetPositionX = position[0] + dx;
    const targetPositionZ = position[2] + dz;
    const resolved = resolveCapsuleMovement(position, targetPositionX, targetPositionZ);
    const correctionX = resolved.x - targetPositionX;
    const correctionZ = resolved.z - targetPositionZ;
    const correctionLength = Math.hypot(correctionX, correctionZ);
    if (correctionLength > 1e-8) {
      const normalX = correctionX / correctionLength;
      const normalZ = correctionZ / correctionLength;
      const inwardSpeed = velocity.x * normalX + velocity.z * normalZ;
      if (inwardSpeed < 0) {
        // Keep tangential momentum when sliding around a round stool. Clearing
        // both axes on every contact made the player repeatedly stop and start.
        velocity.x -= normalX * inwardSpeed;
        velocity.z -= normalZ * inwardSpeed;
      }
    }
    distance += Math.hypot(resolved.x - position[0], resolved.z - position[2]);
    position[0] = resolved.x;
    position[2] = resolved.z;
  }
  if (magnitude === 0 && Math.hypot(velocity.x, velocity.z) < .001) {
    velocity.x = 0;
    velocity.z = 0;
  }
  return distance;
}
