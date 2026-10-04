/**
 * surface.ts - Free-surface height-field wave simulation, meniscus, and vortex dynamics
 * 
 * Physical Model:
 * 1. Linearized shallow-water wave equation with capillary damping:
 *    ∂²h/∂t² = c² ∇²h − γ ∂h/∂t + F_ext(x, y, t)
 *    Discretized using Verlet/leapfrog integration on an N×N regular grid:
 *    h_new = 2h − h_old + (c² dt² / dx²) · (Σ_neighbors − 4h) − γ dt (h − h_old)
 * 2. Static wetting meniscus:
 *    h_m(d) = h_c · exp(-d / ℓ_c), where capillary length ℓ_c = sqrt(σ / (ρ g)) ≈ 2.7 mm
 * 3. Stirring vortex profile (Rankine combined vortex):
 *    Inside core (r <= R_core):  Δh(r) = -ω² (2 R_core² - r²) / (2 g)
 *    Outside core (r > R_core):   Δh(r) = -ω² R_core⁴ / (2 g r²)
 * 4. Sloshing modes in cylindrical/conical vessels:
 *    Natural frequency ω₁² = g · k · tanh(k · H), k = 1.841 / R
 * 
 * Units: SI internally (m, s, rad/s, N/m, kg/m³)
 */

import { GRAVITY } from '../core/units.js';

export interface SurfaceConfig {
  resolution: number;     // Grid size N x N (e.g. 64 or 128)
  radius: number;         // Physical radius of the vessel at surface height (m)
  damping: number;        // Damping factor γ (1/s, e.g. 1.5 - 3.0)
  waveSpeed: number;      // Phase speed c (m/s, ~0.5 - 1.2 m/s)
  surfaceTension: number; // σ (N/m, ~0.0728 N/m for water at 20°C)
  density: number;        // ρ (kg/m³, ~1000 kg/m³)
}

export class FreeSurfaceSimulator {
  public readonly N: number;
  public radius: number;
  public damping: number;
  public waveSpeed: number;
  public surfaceTension: number;
  public density: number;

  // State buffers (ping-pong height fields)
  public h: Float32Array;      // Current height field (m)
  public hOld: Float32Array;   // Previous height field (m)
  public hNew: Float32Array;   // Next height field (m)
  public normals: Float32Array; // Flattened 3D normals [nx, ny, nz] per cell (3 * N * N)

  // Capillary length ℓ_c = sqrt(σ / (ρ g))
  public capillaryLength: number;
  public meniscusHeight: number; // Contact rise (m, ~0.0015 m)

  // Stirring / vortex parameters
  public stirrerOmega: number = 0; // rad/s
  public vortexCoreRadius: number = 0.005; // 5 mm core

  // Non-inertial sloshing acceleration
  public accelX: number = 0; // m/s²
  public accelZ: number = 0; // m/s²

  constructor(config: Partial<SurfaceConfig> = {}) {
    this.N = config.resolution ?? 64;
    this.radius = config.radius ?? 0.04; // 40 mm (80 mm diameter beaker)
    this.damping = config.damping ?? 2.0;
    this.waveSpeed = config.waveSpeed ?? 0.8;
    this.surfaceTension = config.surfaceTension ?? 0.0728;
    this.density = config.density ?? 1000.0;

    const count = this.N * this.N;
    this.h = new Float32Array(count);
    this.hOld = new Float32Array(count);
    this.hNew = new Float32Array(count);
    this.normals = new Float32Array(count * 3);

    this.capillaryLength = Math.sqrt(this.surfaceTension / (this.density * GRAVITY));
    this.meniscusHeight = 0.0015; // 1.5 mm rise at glass contact line

    // Initialize flat surface with upward normals
    for (let i = 0; i < count; i++) {
      this.normals[i * 3 + 0] = 0;
      this.normals[i * 3 + 1] = 1;
      this.normals[i * 3 + 2] = 0;
    }
  }

  /**
   * Inject a Gaussian displacement impulse (e.g. from bubble burst, droplet impact, or pour stream)
   * @param normX Normalized x coordinate [-1, 1] relative to vessel radius
   * @param normZ Normalized z coordinate [-1, 1] relative to vessel radius
   * @param amplitude Height impulse amplitude (m)
   * @param radiusSigma Spread of impulse in normalized units
   */
  public addImpulse(normX: number, normZ: number, amplitude: number, radiusSigma: number = 0.08): void {
    const N = this.N;
    const centerI = ((normX + 1) * 0.5) * (N - 1);
    const centerJ = ((normZ + 1) * 0.5) * (N - 1);
    const sigmaGrid = radiusSigma * N * 0.5;
    const invTwoSigma2 = 1.0 / (2.0 * sigmaGrid * sigmaGrid);

    const minI = Math.max(1, Math.floor(centerI - 3 * sigmaGrid));
    const maxI = Math.min(N - 2, Math.ceil(centerI + 3 * sigmaGrid));
    const minJ = Math.max(1, Math.floor(centerJ - 3 * sigmaGrid));
    const maxJ = Math.min(N - 2, Math.ceil(centerJ + 3 * sigmaGrid));

    for (let j = minJ; j <= maxJ; j++) {
      const dj = j - centerJ;
      for (let i = minI; i <= maxI; i++) {
        const di = i - centerI;
        const dist2 = di * di + dj * dj;
        const factor = Math.exp(-dist2 * invTwoSigma2);
        const idx = j * N + i;
        const delta = amplitude * factor;
        this.h[idx] += delta;
        this.hOld[idx] += delta;
      }
    }
  }

  /**
   * Advance the free-surface wave equation by dt seconds
   */
  public step(dt: number): void {
    if (dt <= 0) return;

    const N = this.N;
    const dx = (2.0 * this.radius) / (N - 1);
    const c = this.waveSpeed;
    
    // CFL stability condition: c * dt / dx < 0.5
    // Clamped Courant factor
    const courant = (c * dt) / dx;
    const alpha = Math.min(0.24, courant * courant);
    const dampCoeff = Math.min(1.0, this.damping * dt);

    const R = this.radius;
    const R2 = R * R;
    const invR = 1.0 / R;

    // Rankine vortex constants
    const omega = this.stirrerOmega;
    const hasVortex = Math.abs(omega) > 0.05;
    const Rcore = this.vortexCoreRadius;
    const Rcore2 = Rcore * Rcore;
    const Rcore4 = Rcore2 * Rcore2;
    const invTwoG = 1.0 / (2.0 * GRAVITY);

    // Wave equation integration
    for (let j = 1; j < N - 1; j++) {
      const z = ((j / (N - 1)) * 2.0 - 1.0) * R;
      const row = j * N;

      for (let i = 1; i < N - 1; i++) {
        const x = ((i / (N - 1)) * 2.0 - 1.0) * R;
        const r2 = x * x + z * z;
        const idx = row + i;

        // Circular boundary condition: mask out cells outside radius
        if (r2 > R2) {
          this.hNew[idx] = 0;
          continue;
        }

        const r = Math.sqrt(r2);
        const distToWall = R - r;

        // 1. Shallow-water wave propagation with Laplacian
        const currentH = this.h[idx];
        const laplacian = this.h[idx - 1] + this.h[idx + 1] + this.h[idx - N] + this.h[idx + N] - 4.0 * currentH;
        
        // Verlet update: h_new = 2h - h_old + alpha * laplacian - damp * (h - h_old)
        let nextH = 2.0 * currentH - this.hOld[idx] + alpha * laplacian - dampCoeff * (currentH - this.hOld[idx]);

        // 2. Non-inertial sloshing forcing: -a · ∇r
        if (this.accelX !== 0 || this.accelZ !== 0) {
          const sloshForcing = -(this.accelX * x + this.accelZ * z) / GRAVITY * 0.1 * dt;
          nextH += sloshForcing;
        }

        // 3. Meniscus elevation near wall: h_m(d) = h_c * exp(-d / ℓ_c)
        if (distToWall < 4.0 * this.capillaryLength) {
          const meniscus = this.meniscusHeight * Math.exp(-distToWall / this.capillaryLength);
          nextH += meniscus * 0.05; // Gently bias toward static wetting profile
        }

        // 4. Rankine vortex depression
        if (hasVortex) {
          let deltaH = 0;
          if (r <= Rcore) {
            deltaH = -omega * omega * (2.0 * Rcore2 - r2) * invTwoG;
          } else {
            deltaH = -omega * omega * Rcore4 / (2.0 * GRAVITY * Math.max(1e-6, r2));
          }
          // Blend vortex depression into wave height
          nextH += (deltaH - nextH) * Math.min(1.0, 5.0 * dt);
        }

        this.hNew[idx] = nextH;
      }
    }

    // Ping-pong buffers
    const temp = this.hOld;
    this.hOld = this.h;
    this.h = this.hNew;
    this.hNew = temp;

    // Compute surface normals via central differences
    this.computeNormals(dx);
  }

  /**
   * Compute normalized surface normals for lighting and screen-space refraction
   */
  private computeNormals(dx: number): void {
    const N = this.N;
    const invTwoDx = 1.0 / (2.0 * dx);

    for (let j = 0; j < N; j++) {
      const row = j * N;
      const prevRow = Math.max(0, j - 1) * N;
      const nextRow = Math.min(N - 1, j + 1) * N;

      for (let i = 0; i < N; i++) {
        const prevCol = Math.max(0, i - 1);
        const nextCol = Math.min(N - 1, i + 1);

        const dhDx = (this.h[row + nextCol] - this.h[row + prevCol]) * invTwoDx;
        const dhDz = (this.h[nextRow + i] - this.h[prevRow + i]) * invTwoDx;

        // Normal vector = normalize(-dh/dx, 1, -dh/dz)
        const nx = -dhDx;
        const ny = 1.0;
        const nz = -dhDz;
        const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

        const normIdx = (row + i) * 3;
        this.normals[normIdx + 0] = nx * invLen;
        this.normals[normIdx + 1] = ny * invLen;
        this.normals[normIdx + 2] = nz * invLen;
      }
    }
  }

  /**
   * Sample the interpolated height at physical (x, z) coordinates (meters)
   */
  public sampleHeight(x: number, z: number): number {
    const R = this.radius;
    const u = (x / R + 1.0) * 0.5 * (this.N - 1);
    const v = (z / R + 1.0) * 0.5 * (this.N - 1);

    if (u < 0 || u >= this.N - 1 || v < 0 || v >= this.N - 1) {
      return 0;
    }

    const i = Math.floor(u);
    const j = Math.floor(v);
    const fx = u - i;
    const fz = v - j;

    const row0 = j * this.N;
    const row1 = (j + 1) * this.N;

    const h00 = this.h[row0 + i];
    const h10 = this.h[row0 + i + 1];
    const h01 = this.h[row1 + i];
    const h11 = this.h[row1 + i + 1];

    return (1.0 - fx) * (1.0 - fz) * h00 +
           fx * (1.0 - fz) * h10 +
           (1.0 - fx) * fz * h01 +
           fx * fz * h11;
  }
}
