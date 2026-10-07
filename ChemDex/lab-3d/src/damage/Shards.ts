/**
 * CHEMDEX LAB - Procedural Glass Shards & Fracture Pool (K4.2 & K4.4)
 * Manages Voronoi glass shard instances, max 600 cap, settle physics,
 * hazardous sharp edges, and cleanup tool tracking.
 */

export interface ShardInstance {
  id: string;
  sourceVesselId: string;
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

export class ShardManager {
  private shards: ShardInstance[] = [];

  public getShards(): ShardInstance[] {
    return this.shards.filter(s => !s.isCleaned);
  }

  /**
   * Spawns 16-24 procedural shards on vessel shatter burst.
   */
  public spawnShatterShards(
    sourceVesselId: string,
    centerPos: [number, number, number],
    color: string = '#e2e8f0',
    count: number = 20,
    seed: number = 101
  ): ShardInstance[] {
    const newShards: ShardInstance[] = [];

    for (let i = 0; i < count; i++) {
      // Deterministic angle & speed spread from seed
      const angle = (i / count) * 2 * Math.PI + Math.sin(seed + i) * 0.2;
      const speed = 0.8 + (Math.sin(seed * 3 + i * 7) * 0.5 + 0.5) * 1.6; // m/s
      const upVel = 0.5 + (Math.cos(seed * 2 + i * 5) * 0.5 + 0.5) * 1.8;

      const shard: ShardInstance = {
        id: `shard_${sourceVesselId}_${i}`,
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
  public update(dt: number, tableY: number = -0.135): void {
    const gravity = -9.8;

    for (const s of this.shards) {
      if (s.isSettled || s.isCleaned) continue;

      s.velocity[1] += gravity * dt;
      s.position[0] += s.velocity[0] * dt;
      s.position[1] += s.velocity[1] * dt;
      s.position[2] += s.velocity[2] * dt;

      s.rotation[0] += s.angularVelocity[0] * dt;
      s.rotation[1] += s.angularVelocity[1] * dt;
      s.rotation[2] += s.angularVelocity[2] * dt;

      // Table contact bounce
      if (s.position[1] <= tableY) {
        s.position[1] = tableY;
        s.velocity[1] = -s.velocity[1] * 0.25; // low restitution for glass
        s.velocity[0] *= 0.6; // friction
        s.velocity[2] *= 0.6;

        if (Math.abs(s.velocity[1]) < 0.2 && Math.hypot(s.velocity[0], s.velocity[2]) < 0.15) {
          s.velocity = [0, 0, 0];
          s.angularVelocity = [0, 0, 0];
          s.isSettled = true;
        }
      }
    }
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
