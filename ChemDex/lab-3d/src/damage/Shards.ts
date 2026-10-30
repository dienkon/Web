import { LAB_PHYSICS } from '../engine/interactionEngine';
import { advanceSplatterFlight } from '../science/splatterFlight';

/**
 * CHEMDEX LAB - Procedural Glass Shards & Fracture Pool (K4.2 & K4.4)
 * Manages illustrative glass glyphs, max 600 cap, settle physics,
 * hazardous sharp edges, and cleanup tool tracking.
 */

export interface ShardInstance {
  id: string;
  sourceVesselId: string;
  /** Ballistic lower-support anchor in scene units, not a rigid-body centroid. */
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: [number, number, number];
  angularVelocity: [number, number, number];
  size: number;
  color: string;
  isSettled: boolean;
  isCleaned: boolean;
}

export const MAX_ACTIVE_SHARDS = 600;
export interface ShardSnapshot { shards: ShardInstance[]; nextBurstSerial: number }

export class ShardManager {
  private shards: ShardInstance[] = [];
  private burstSerial = 0;

  public getShards(): ShardInstance[] {
    return this.shards.filter(s => !s.isCleaned);
  }

  /** Detached action-time snapshot; renderer updates must not mutate history. */
  public snapshot(): ShardSnapshot {
    return { shards: this.getShards().map(s => ({ ...s, position: [...s.position], velocity: [...s.velocity],
      rotation: [...s.rotation], angularVelocity: [...s.angularVelocity] })), nextBurstSerial: this.burstSerial };
  }

  public restoreSnapshot(snapshot?: unknown): void {
    const saved = snapshot as Partial<ShardSnapshot> | undefined;
    const vector = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
    const ids = new Set<string>();
    this.shards = (Array.isArray(saved?.shards) ? saved.shards : []).filter(s => {
      if (!s || typeof s.id !== 'string' || !s.id || ids.has(s.id) || typeof s.sourceVesselId !== 'string'
        || !s.sourceVesselId || !vector(s.position) || !vector(s.velocity) || !vector(s.rotation)
        || !vector(s.angularVelocity) || !Number.isFinite(s.size) || s.size <= 0 || typeof s.color !== 'string'
        || typeof s.isSettled !== 'boolean' || s.isCleaned !== false) return false;
      ids.add(s.id); return true;
    }).slice(-MAX_ACTIVE_SHARDS).map(s => ({ ...s, position: [...s.position], velocity: [...s.velocity],
      rotation: [...s.rotation], angularVelocity: [...s.angularVelocity] }));
    const serial = saved?.nextBurstSerial;
    if (typeof serial === 'number' && Number.isSafeInteger(serial) && serial >= 0 && serial < Number.MAX_SAFE_INTEGER - MAX_ACTIVE_SHARDS)
      this.burstSerial = Math.max(this.burstSerial, serial);
    // Never reuse an ID even when restoring a record with a stale serial.
    while (this.shards.some(s => s.id.startsWith(`shard_${s.sourceVesselId}_${this.burstSerial}_`))) this.burstSerial++;
  }

  /** Old saves had only broken-vessel flags. Reconstruct their illustrative
   * settled glyphs once; an explicitly saved empty pool must stay empty. */
  public restoreLabSnapshot(snapshot: unknown, vessels: Record<string, {
    isShattered?: boolean; position: [number, number, number]; liquidColor?: string;
  }>): void {
    this.restoreSnapshot(snapshot);
    if (snapshot !== undefined) return;
    for (const [id, v] of Object.entries(vessels)) {
      if (v.isShattered) this.spawnShatterShards(id, v.position, v.liquidColor);
    }
    this.update(1);
  }

  /** A bench sweep collects landed debris only; liquid wiping is independent. */
  public collectSettledShards(sourceVesselId?: string): number {
    let count = 0;
    this.shards = this.shards.filter(s => {
      if (!s.isCleaned && s.isSettled && (sourceVesselId === undefined || s.sourceVesselId === sourceVesselId)) {
        s.isCleaned = true; count++; return false;
      }
      return true;
    });
    return count;
  }

  /**
   * Seeded illustrative burst. Launch speeds are scene units/s; they are not
   * inferred fracture energy or measured fragment velocities.
   */
  public spawnShatterShards(
    sourceVesselId: string,
    centerPos: [number, number, number],
    color: string = '#e2e8f0',
    count: number = 20,
    seed: number = 101
  ): ShardInstance[] {
    if (!sourceVesselId || !centerPos.every(Number.isFinite) || !Number.isFinite(seed)
      || !Number.isFinite(count) || count < 1) return [];
    count = Math.min(MAX_ACTIVE_SHARDS, Math.floor(count));
    seed %= 1_000_000; // Keep deterministic arithmetic finite for large finite seeds.
    while (this.shards.some(s => s.id.startsWith(`shard_${sourceVesselId}_${this.burstSerial}_`))) this.burstSerial++;
    const burst = this.burstSerial++;
    const newShards: ShardInstance[] = [];

    for (let i = 0; i < count; i++) {
      // Deterministic angle & speed spread from seed
      const angle = (i / count) * 2 * Math.PI + Math.sin(seed + i) * 0.2;
      const speed = 0.8 + (Math.sin(seed * 3 + i * 7) * 0.5 + 0.5) * 1.6;
      const upVel = 0.5 + (Math.cos(seed * 2 + i * 5) * 0.5 + 0.5) * 1.8;

      const shard: ShardInstance = {
        id: `shard_${sourceVesselId}_${burst}_${i}`,
        sourceVesselId,
        position: [
          centerPos[0] + Math.cos(angle) * 0.08,
          centerPos[1] + 0.1,
          centerPos[2] + Math.sin(angle) * 0.08
        ],
        velocity: [
          Math.cos(angle) * speed,
          upVel,
          Math.sin(angle) * speed
        ],
        rotation: [i * 0.3, i * 0.5, i * 0.2],
        angularVelocity: [speed * 3, speed * 2, speed * 4],
        size: 0.04 + (i % 4) * 0.02,
        color,
        isSettled: false,
        isCleaned: false
      };

      newShards.push(shard);
    }

    // Enforce strict memory budget (<= 600 shards)
    this.shards.push(...newShards);
    if (this.shards.length > MAX_ACTIVE_SHARDS) {
      this.shards = this.shards.slice(this.shards.length - MAX_ACTIVE_SHARDS);
    }

    return newShards;
  }

  /**
   * Physics tick for flying shards (gravity, bounce, settle).
   */
  public update(dt: number, tableY: number = LAB_PHYSICS.TABLE_SURFACE_Y): boolean {
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(tableY)) return false;
    let newlySettled = false;
    for (const s of this.shards) {
      if (s.isSettled || s.isCleaned) continue;
      let remaining = dt;
      // Exact ballistic segments and impact times, with bounded microscopic
      // chatter. Restitution/friction are explicit visual assumptions.
      for (let impact = 0; impact < 24 && remaining > 1e-12; impact++) {
        const p = advanceSplatterFlight({ x: s.position[0], y: s.position[1], z: s.position[2],
          vx: s.velocity[0], vy: s.velocity[1], vz: s.velocity[2] }, remaining, tableY);
        s.position = [p.x, p.y, p.z];
        s.velocity = [p.vx, p.vy, p.vz];
        for (let axis = 0; axis < 3; axis++) s.rotation[axis] += s.angularVelocity[axis] * p.elapsed_s;
        remaining -= p.elapsed_s;
        if (!p.hit) break;
        s.velocity = [p.vx * 0.6, Math.abs(p.vy) * 0.25, p.vz * 0.6];
        s.angularVelocity = s.angularVelocity.map(v => v * 0.6) as [number, number, number];
        if (s.velocity[1] < 1e-5 || impact === 23) {
          s.velocity = [0, 0, 0]; s.angularVelocity = [0, 0, 0]; s.isSettled = true;
          newlySettled = true;
          break;
        }
      }
    }
    return newlySettled;
  }

  /**
   * Clean shards using dustpan / tweezers.
   */
  public cleanShards(tool: 'brush_dustpan' | 'tweezers' | 'bare_hands'): {
    cleanedCount: number;
    cutInjury: boolean;
  } {
    const uncleaned = this.shards.filter(s => !s.isCleaned);
    const count = uncleaned.length;

    // Bare hands on broken glass causes injury!
    const cutInjury = tool === 'bare_hands' && count > 0;

    for (const s of this.shards) {
      s.isCleaned = true;
    }
    this.shards = [];

    return { cleanedCount: count, cutInjury };
  }
}

export const shardManager = new ShardManager();
