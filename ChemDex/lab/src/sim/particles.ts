/**
 * particles.ts - High-performance Structure-of-Arrays (SoA) particle system with free-list pool.
 * 
 * Design Constraints:
 * 1. Zero heap allocations in the hot per-frame simulation loop.
 * 2. Continuous Float32Array buffers for cache locality and WebGL instanced buffer streaming.
 * 3. Particle types: BUBBLE, PRECIPITATE, DROPLET, STEAM, SPARK.
 * 4. Spatial hash grid for O(1) local neighbor queries and coalescence.
 * 
 * Units: SI internally (m, m/s, s, kg/m³)
 */

export const enum ParticleType {
  BUBBLE = 0,
  PRECIPITATE = 1,
  DROPLET = 2,
  STEAM = 3,
  SPARK = 4,
}

export interface ParticleSpawnParams {
  type: ParticleType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  maxAge: number;
  weight?: number;
  r?: number;
  g?: number;
  b?: number;
  a?: number;
}

export class ParticleSystem {
  public readonly capacity: number;
  public activeCount: number = 0;

  // Structure-of-Arrays (SoA) flat buffers
  public x: Float32Array;
  public y: Float32Array;
  public z: Float32Array;
  public vx: Float32Array;
  public vy: Float32Array;
  public vz: Float32Array;
  public radius: Float32Array;
  public age: Float32Array;
  public maxAge: Float32Array;
  public type: Uint8Array;
  public weight: Float32Array;
  public r: Float32Array;
  public g: Float32Array;
  public b: Float32Array;
  public a: Float32Array;
  public phase: Float32Array; // Angular phase for wobble / flutter

  // Free-list indices pool
  private freeList: Int32Array;
  private freeCount: number;

  constructor(capacity: number = 20000) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.vz = new Float32Array(capacity);
    this.radius = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.maxAge = new Float32Array(capacity);
    this.type = new Uint8Array(capacity);
    this.weight = new Float32Array(capacity);
    this.r = new Float32Array(capacity);
    this.g = new Float32Array(capacity);
    this.b = new Float32Array(capacity);
    this.a = new Float32Array(capacity);
    this.phase = new Float32Array(capacity);

    this.freeList = new Int32Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.freeList[i] = i;
    }
    this.freeCount = capacity;
  }

  /**
   * Spawn a new particle from free list. Returns particle index or -1 if capacity full.
   */
  public spawn(params: ParticleSpawnParams): number {
    if (this.freeCount <= 0) return -1;

    this.freeCount--;
    const idx = this.freeList[this.freeCount];

    this.x[idx] = params.x;
    this.y[idx] = params.y;
    this.z[idx] = params.z;
    this.vx[idx] = params.vx;
    this.vy[idx] = params.vy;
    this.vz[idx] = params.vz;
    this.radius[idx] = params.radius;
    this.age[idx] = 0;
    this.maxAge[idx] = params.maxAge;
    this.type[idx] = params.type;
    this.weight[idx] = params.weight ?? 1.0;
    this.r[idx] = params.r ?? 1.0;
    this.g[idx] = params.g ?? 1.0;
    this.b[idx] = params.b ?? 1.0;
    this.a[idx] = params.a ?? 1.0;
    this.phase[idx] = Math.random() * Math.PI * 2;

    this.activeCount++;
    return idx;
  }

  /**
   * Recycle particle at index back into free pool
   */
  public kill(idx: number): void {
    if (this.freeCount >= this.capacity) return;
    this.maxAge[idx] = 0;
    this.freeList[this.freeCount] = idx;
    this.freeCount++;
    this.activeCount--;
  }

  /**
   * Clear all active particles
   */
  public reset(): void {
    this.freeCount = this.capacity;
    for (let i = 0; i < this.capacity; i++) {
      this.freeList[i] = i;
      this.maxAge[i] = 0;
    }
    this.activeCount = 0;
  }

  /**
   * Compact integration pass over active particles with lifecycle updates
   */
  public integrate(dt: number, onDeath?: (idx: number, type: ParticleType) => void): void {
    if (dt <= 0 || this.activeCount <= 0) return;

    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i] >= this.maxAge[i]) continue;

      this.age[i] += dt;
      if (this.age[i] >= this.maxAge[i]) {
        if (onDeath) onDeath(i, this.type[i]);
        this.kill(i);
        continue;
      }

      // Kinematic update
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.z[i] += this.vz[i] * dt;
    }
  }
}
