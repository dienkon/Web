/** Seeded gas-jet recoil. The seed belongs to the contact event so playback is
 * repeatable, but neither the direction nor the distance follows an orbit.
 * Scene speeds and jet intervals are illustrative, not measured kinetics. */
export interface SodiumMotion {
  x: number; z: number; vx: number; vz: number; seed: number;
  jetTime: number; jetX: number; jetZ: number;
}

export function createSodiumMotion(key: string): SodiumMotion {
  let seed = 2166136261;
  for (const c of key) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return { x: 0, z: 0, vx: 0, vz: 0, seed: seed >>> 0, jetTime: 0, jetX: 0, jetZ: 0 };
}

export function stepSodiumMotion(m: SodiumMotion, dt: number, boundary: number, activity: number): void {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  if (!(boundary > 0) || !(activity > 0)) { m.x = m.z = m.vx = m.vz = 0; return; }
  const random = () => { m.seed = (Math.imul(m.seed, 1664525) + 1013904223) >>> 0; return m.seed / 4294967296; };
  for (let remaining = Math.min(dt, 1); remaining > 1e-10;) {
    const h = Math.min(remaining, 1 / 120); remaining -= h;
    m.jetTime -= h;
    if (m.jetTime <= 0) {
      const angle = random() * Math.PI * 2, thrust = (0.9 + random() * 2.2) * Math.min(2, activity);
      m.jetX = Math.cos(angle) * thrust; m.jetZ = Math.sin(angle) * thrust;
      m.jetTime += 0.045 + random() * 0.18;
    }
    const drag = Math.exp(-h * 3);
    m.vx = (m.vx + m.jetX * h) * drag; m.vz = (m.vz + m.jetZ * h) * drag;
    m.x += m.vx * h; m.z += m.vz * h;
    const distance = Math.hypot(m.x, m.z);
    if (distance > boundary) {
      const nx = m.x / distance, nz = m.z / distance;
      m.x = nx * boundary; m.z = nz * boundary;
      const outward = m.vx * nx + m.vz * nz;
      if (outward > 0) { m.vx -= 1.65 * outward * nx; m.vz -= 1.65 * outward * nz; }
      m.jetTime = 0; // a rim collision exposes a different reaction face
    }
  }
}
