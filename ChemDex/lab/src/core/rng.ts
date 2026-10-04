/**
 * Core Seedable PRNG for Physically-Based Chemistry Simulation
 * Determinism guarantee: Same seed + same inputs -> same result.
 * Supports URL param `?seed=12345` or default seed.
 */

export class PRNG {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  public readonly seed: number;

  constructor(seed?: number) {
    if (seed === undefined) {
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        const urlSeed = params.get('seed');
        if (urlSeed !== null) {
          const parsed = parseInt(urlSeed, 10);
          this.seed = isNaN(parsed) ? 1337 : parsed;
        } else {
          this.seed = 1337;
        }
      } else {
        this.seed = 1337;
      }
    } else {
      this.seed = seed;
    }

    // Initialize sfc32 state with seed
    let s = this.seed | 0;
    this.a = s ^= 0x6a09e667;
    this.b = s ^= 0xbb67ae85;
    this.c = s ^= 0x3c6ef372;
    this.d = s ^= 0xa54ff53a;
    for (let i = 0; i < 15; i++) {
      this.next();
    }
  }

  /**
   * Generates a pseudo-random float in [0, 1) using sfc32.
   */
  public next(): number {
    this.a |= 0; this.b |= 0; this.c |= 0; this.d |= 0;
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /**
   * Alias for next() returning float in [0, 1)
   */
  public nextFloat(): number {
    return this.next();
  }

  /**
   * Random float in [min, max)
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Random integer in [min, max] inclusive
   */
  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Box-Muller Gaussian normal distribution sample
   */
  public gaussian(mean = 0, stdDev = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Pick random item from array
   */
  public choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Reset PRNG to initial seed
   */
  public reset(): void {
    let s = this.seed | 0;
    this.a = s ^= 0x6a09e667;
    this.b = s ^= 0xbb67ae85;
    this.c = s ^= 0x3c6ef372;
    this.d = s ^= 0xa54ff53a;
    for (let i = 0; i < 15; i++) {
      this.next();
    }
  }
}

// Global default instance for the simulation
export const defaultRNG = new PRNG();
