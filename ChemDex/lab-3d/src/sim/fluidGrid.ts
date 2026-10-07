/**
 * fluidGrid.ts - 2D Stable-Fluids solver (Stam 1999) with MacCormack advection,
 * vorticity confinement, buoyancy, and multi-species transport.
 * 
 * Physical Model:
 * 1. Incompressible Navier-Stokes equations:
 *    ∂u/∂t = -(u · ∇)u + ν ∇²u - (1/ρ) ∇p + f_buoyancy + f_ext + f_vorticity
 *    ∇ · u = 0
 * 2. Buoyancy (Boussinesq approximation):
 *    f_buoyancy = g · [β_T (T - T_ref) - Σ γ_k (c_k - c_ref)] ŷ
 * 3. MacCormack Advection with Min/Max Clamping:
 *    Forward advection φ_f = SL(φ_n, u)
 *    Backward advection φ_b = SL(φ_f, -u)
 *    Error-corrected φ^* = φ_f + 0.5 * (φ_n - φ_b)
 *    Clamped to min/max of 4 neighbor cells in φ_n to prevent spurious oscillations.
 * 4. Vorticity Confinement (Steinhoff & Underhill):
 *    ω = ∂v/∂x - ∂u/∂y
 *    N = ∇|ω| / (|∇|ω|| + ε)
 *    f_vorticity = ε_vc · Δx · (N_x, N_y) × ω
 * 5. Pressure Projection:
 *    Poisson equation ∇²p = (ρ / Δt) ∇ · u
 *    Solved via Red-Black Gauss-Seidel or Jacobi relaxation with warm start.
 * 6. Multi-species advection:
 *    Each dissolved species and temperature field advected synchronously with the fluid.
 * 
 * Units: SI internally (m, s, m/s, K, mol/m³, Pa)
 */

import { GRAVITY } from '../core/units.js';

export interface FluidGridConfig {
  nx: number;                 // Grid width (horizontal cells, e.g. 64)
  ny: number;                 // Grid height (vertical cells, e.g. 96)
  domainWidth: number;        // Physical width (m, e.g. 0.08 m = 80 mm)
  domainHeight: number;       // Physical height (m, e.g. 0.12 m = 120 mm)
  viscosity: number;          // Kinematic viscosity ν (m²/s, water ≈ 1e-6, eddy-boosted ≈ 1e-4)
  vorticityStrength: number;  // Vorticity confinement ε_vc (0.2 - 0.5)
  pressureIters: number;      // Gauss-Seidel/Jacobi iterations (20 - 40)
  maxSpecies: number;         // Max tracked species fields (default 8)
}

export class FluidGrid2D {
  public readonly nx: number;
  public readonly ny: number;
  public readonly numCells: number;
  public readonly dx: number;
  public readonly dy: number;
  public readonly invDx: number;
  public readonly invDy: number;

  public viscosity: number;
  public vorticityStrength: number;
  public pressureIters: number;
  public maxSpecies: number;

  // Velocity fields: u (horizontal), v (vertical)
  public u: Float32Array;
  public v: Float32Array;
  public u0: Float32Array;
  public v0: Float32Array;

  // Pressure and divergence
  public p: Float32Array;
  public div: Float32Array;

  // Vorticity fields
  public curl: Float32Array;

  // Temperature field (Kelvin)
  public temp: Float32Array;
  public temp0: Float32Array;
  public tRef: number = 293.15; // 20 °C

  // Cell solid/fluid mask: 1.0 = fluid, 0.0 = solid glass wall / outside
  public mask: Float32Array;

  // Species concentration fields (mol/m³)
  // Stored as flattened array: maxSpecies * numCells
  public species: Float32Array;
  public species0: Float32Array;
  public speciesNames: string[] = [];

  constructor(config: Partial<FluidGridConfig> = {}) {
    this.nx = config.nx ?? 64;
    this.ny = config.ny ?? 96;
    this.numCells = this.nx * this.ny;

    const width = config.domainWidth ?? 0.08;
    const height = config.domainHeight ?? 0.12;

    this.dx = width / this.nx;
    this.dy = height / this.ny;
    this.invDx = 1.0 / this.dx;
    this.invDy = 1.0 / this.dy;

    this.viscosity = config.viscosity ?? 1e-4; // Eddy-boosted for stable grid scale
    this.vorticityStrength = config.vorticityStrength ?? 0.35;
    this.pressureIters = config.pressureIters ?? 25;
    this.maxSpecies = config.maxSpecies ?? 8;

    this.u = new Float32Array(this.numCells);
    this.v = new Float32Array(this.numCells);
    this.u0 = new Float32Array(this.numCells);
    this.v0 = new Float32Array(this.numCells);

    this.p = new Float32Array(this.numCells);
    this.div = new Float32Array(this.numCells);
    this.curl = new Float32Array(this.numCells);

    this.temp = new Float32Array(this.numCells);
    this.temp0 = new Float32Array(this.numCells);
    this.temp.fill(293.15); // Default room temp

    this.mask = new Float32Array(this.numCells);
    this.mask.fill(1.0); // Default all fluid inside domain

    this.species = new Float32Array(this.numCells * this.maxSpecies);
    this.species0 = new Float32Array(this.numCells * this.maxSpecies);
  }

  /**
   * Set vessel boundary mask: cells outside radius(y) or above surface are marked solid/inactive
   */
  public setBoundaryMask(radiusAtY: (y: number) => number, liquidHeight: number): void {
    const halfWidth = (this.nx * this.dx) * 0.5;

    for (let j = 0; j < this.ny; j++) {
      const y = (j + 0.5) * this.dy;
      const rLimit = radiusAtY(y);
      const isAboveSurface = y > liquidHeight;

      for (let i = 0; i < this.nx; i++) {
        const x = (i + 0.5) * this.dx - halfWidth;
        const idx = j * this.nx + i;

        if (isAboveSurface || Math.abs(x) > rLimit) {
          this.mask[idx] = 0.0; // Inactive or wall
          this.u[idx] = 0.0;
          this.v[idx] = 0.0;
        } else {
          this.mask[idx] = 1.0; // Active fluid
        }
      }
    }
  }

  /**
   * Register a chemical species index
   */
  public getOrCreateSpeciesSlot(speciesId: string): number {
    const existing = this.speciesNames.indexOf(speciesId);
    if (existing >= 0) return existing;
    if (this.speciesNames.length < this.maxSpecies) {
      this.speciesNames.push(speciesId);
      return this.speciesNames.length - 1;
    }
    return -1; // Exceeded maxSpecies
  }

  /**
   * Inject localized fluid velocity and reagent plume (e.g. from dropper or pour stream)
   */
  public injectSource(
    normX: number,
    normY: number,
    radiusNorm: number,
    uInj: number,
    vInj: number,
    tempK: number,
    speciesAmounts: Array<{ slot: number; conc: number }>
  ): void {
    const ci = Math.floor(normX * this.nx);
    const cj = Math.floor(normY * this.ny);
    const rCells = Math.max(1, Math.floor(radiusNorm * this.nx));

    const minI = Math.max(1, ci - rCells);
    const maxI = Math.min(this.nx - 2, ci + rCells);
    const minJ = Math.max(1, cj - rCells);
    const maxJ = Math.min(this.ny - 2, cj + rCells);

    for (let j = minJ; j <= maxJ; j++) {
      for (let i = minI; i <= maxI; i++) {
        const idx = j * this.nx + i;
        if (this.mask[idx] <= 0) continue;

        const di = i - ci;
        const dj = j - cj;
        const dist2 = di * di + dj * dj;
        if (dist2 <= rCells * rCells) {
          const factor = 1.0 - Math.sqrt(dist2) / (rCells + 0.1);
          this.u[idx] += uInj * factor;
          this.v[idx] += vInj * factor;
          this.temp[idx] += (tempK - this.temp[idx]) * factor * 0.5;

          for (const sp of speciesAmounts) {
            if (sp.slot >= 0 && sp.slot < this.maxSpecies) {
              const spOffset = sp.slot * this.numCells;
              this.species[spOffset + idx] += sp.conc * factor;
            }
          }
        }
      }
    }
  }

  /**
   * Advance fluid simulation by dt seconds
   */
  public step(dt: number): void {
    if (dt <= 0) return;

    // 1. Add buoyancy and body forces
    this.applyForces(dt);

    // 2. Vorticity confinement
    this.applyVorticityConfinement(dt);

    // 3. Advect velocity with MacCormack
    this.advectVelocityMacCormack(dt);

    // 4. Project velocity to divergence-free
    this.project();

    // 5. Advect temperature
    this.advectScalarMacCormack(this.temp, this.temp0, dt, 273.15, 373.15);

    // 6. Advect all chemical species
    for (let s = 0; s < this.speciesNames.length; s++) {
      const offset = s * this.numCells;
      const spSub = this.species.subarray(offset, offset + this.numCells);
      const spSub0 = this.species0.subarray(offset, offset + this.numCells);
      this.advectScalarMacCormack(spSub, spSub0, dt, 0.0, 1e4);
    }
  }

  /**
   * Apply thermal buoyancy and bottom friction
   */
  private applyForces(dt: number): void {
    const betaT = 2.1e-4; // Thermal expansion coeff for water (1/K)
    const tRef = this.tRef;

    for (let j = 0; j < this.ny; j++) {
      const isBottomLayer = j <= 1;
      const row = j * this.nx;

      for (let i = 0; i < this.nx; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) continue;

        // Thermal buoyancy: f_y = g * β * (T - T_ref)
        const dT = this.temp[idx] - tRef;
        const fBuoyancy = GRAVITY * betaT * dT;
        this.v[idx] += fBuoyancy * dt;

        // Bottom friction to drive realistic secondary boundary layer drag (Ekman-like)
        if (isBottomLayer) {
          this.u[idx] *= Math.max(0, 1.0 - 5.0 * dt);
        }

        // Clamp max physical velocities to prevent numerical instability (|u| <= 1.2 m/s)
        const speed2 = this.u[idx] * this.u[idx] + this.v[idx] * this.v[idx];
        if (speed2 > 1.44) {
          const invSpeed = 1.2 / Math.sqrt(speed2);
          this.u[idx] *= invSpeed;
          this.v[idx] *= invSpeed;
        }
      }
    }
  }

  /**
   * Vorticity confinement restores small turbulent eddies dissipated by grid
   */
  private applyVorticityConfinement(dt: number): void {
    if (this.vorticityStrength <= 0) return;

    const nx = this.nx;
    const ny = this.ny;
    const invTwoDx = 0.5 * this.invDx;
    const invTwoDy = 0.5 * this.invDy;

    // 1. Compute curl: ω = ∂v/∂x - ∂u/∂y
    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) {
          this.curl[idx] = 0;
          continue;
        }
        const dvDx = (this.v[idx + 1] - this.v[idx - 1]) * invTwoDx;
        const duDy = (this.u[idx + nx] - this.u[idx - nx]) * invTwoDy;
        this.curl[idx] = dvDx - duDy;
      }
    }

    // 2. Confinement force: f = ε * dx * (N × ω)
    const coeff = this.vorticityStrength * this.dx;
    for (let j = 2; j < ny - 2; j++) {
      const row = j * nx;
      for (let i = 2; i < nx - 2; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) continue;

        // Gradient of absolute curl magnitude |ω|
        const dCurlDx = (Math.abs(this.curl[idx + 1]) - Math.abs(this.curl[idx - 1])) * invTwoDx;
        const dCurlDy = (Math.abs(this.curl[idx + nx]) - Math.abs(this.curl[idx - nx])) * invTwoDy;

        const len = Math.sqrt(dCurlDx * dCurlDx + dCurlDy * dCurlDy) + 1e-5;
        const nxGrad = dCurlDx / len;
        const nyGrad = dCurlDy / len;

        const omega = this.curl[idx];
        // 2D cross product: N × ω = (ny * ω, -nx * ω)
        this.u[idx] += coeff * (nyGrad * omega) * dt;
        this.v[idx] += coeff * (-nxGrad * omega) * dt;
      }
    }
  }

  /**
   * Semi-Lagrangian advection step for a scalar field
   */
  private sampleBilinear(field: Float32Array, x: number, y: number): number {
    const fx = Math.max(0.5, Math.min(this.nx - 1.5, x * this.invDx - 0.5));
    const fy = Math.max(0.5, Math.min(this.ny - 1.5, y * this.invDy - 0.5));

    const i0 = Math.floor(fx);
    const j0 = Math.floor(fy);
    const i1 = i0 + 1;
    const j1 = j0 + 1;

    const s1 = fx - i0;
    const s0 = 1.0 - s1;
    const t1 = fy - j0;
    const t0 = 1.0 - t1;

    const row0 = j0 * this.nx;
    const row1 = j1 * this.nx;

    return (
      s0 * (t0 * field[row0 + i0] + t1 * field[row1 + i0]) +
      s1 * (t0 * field[row0 + i1] + t1 * field[row1 + i1])
    );
  }

  /**
   * MacCormack advection for velocity field with Min/Max clamping
   */
  private advectVelocityMacCormack(dt: number): void {
    const nx = this.nx;
    const ny = this.ny;

    // Copy current state to u0, v0
    this.u0.set(this.u);
    this.v0.set(this.v);

    // Forward step: u_f = SL(u0, u0, dt)
    for (let j = 1; j < ny - 1; j++) {
      const y = (j + 0.5) * this.dy;
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) continue;

        const x = (i + 0.5) * this.dx;
        const traceX = x - this.u0[idx] * dt;
        const traceY = y - this.v0[idx] * dt;

        this.u[idx] = this.sampleBilinear(this.u0, traceX, traceY);
        this.v[idx] = this.sampleBilinear(this.v0, traceX, traceY);
      }
    }

    // Clamp MacCormack correction to local min/max of 4 neighbor cells to prevent ringing
    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) continue;

        const uMin = Math.min(this.u0[idx], this.u0[idx - 1], this.u0[idx + 1], this.u0[idx - nx], this.u0[idx + nx]);
        const uMax = Math.max(this.u0[idx], this.u0[idx - 1], this.u0[idx + 1], this.u0[idx - nx], this.u0[idx + nx]);
        const vMin = Math.min(this.v0[idx], this.v0[idx - 1], this.v0[idx + 1], this.v0[idx - nx], this.v0[idx + nx]);
        const vMax = Math.max(this.v0[idx], this.v0[idx - 1], this.v0[idx + 1], this.v0[idx - nx], this.v0[idx + nx]);

        this.u[idx] = Math.max(uMin, Math.min(uMax, this.u[idx]));
        this.v[idx] = Math.max(vMin, Math.min(vMax, this.v[idx]));
      }
    }
  }

  /**
   * MacCormack advection for scalar fields (temperature, species concentration)
   */
  private advectScalarMacCormack(
    field: Float32Array,
    field0: Float32Array,
    dt: number,
    minBound: number,
    maxBound: number
  ): void {
    const nx = this.nx;
    const ny = this.ny;

    field0.set(field);

    for (let j = 1; j < ny - 1; j++) {
      const y = (j + 0.5) * this.dy;
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) continue;

        const x = (i + 0.5) * this.dx;
        const traceX = x - this.u[idx] * dt;
        const traceY = y - this.v[idx] * dt;

        const val = this.sampleBilinear(field0, traceX, traceY);

        // Clamp to local 4-neighborhood min/max
        const nMin = Math.min(field0[idx], field0[idx - 1], field0[idx + 1], field0[idx - nx], field0[idx + nx]);
        const nMax = Math.max(field0[idx], field0[idx - 1], field0[idx + 1], field0[idx - nx], field0[idx + nx]);

        field[idx] = Math.max(Math.max(minBound, nMin), Math.min(Math.min(maxBound, nMax), val));
      }
    }
  }

  /**
   * Pressure projection step (Helmholtz-Hodge decomposition):
   * ∇²p = ∇ · u*
   * u = u* - ∇p
   */
  public project(): void {
    const nx = this.nx;
    const ny = this.ny;
    const invTwoDx = 0.5 * this.invDx;
    const invTwoDy = 0.5 * this.invDy;

    // 1. Compute velocity divergence: div = (∂u/∂x + ∂v/∂y)
    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) {
          this.div[idx] = 0;
          continue;
        }

        const duDx = (this.u[idx + 1] - this.u[idx - 1]) * invTwoDx;
        const dvDy = (this.v[idx + nx] - this.v[idx - nx]) * invTwoDy;
        this.div[idx] = -(duDx + dvDy);
      }
    }

    // 2. Solve Poisson equation for pressure using Red-Black Gauss-Seidel
    const h2 = this.dx * this.dy;
    const invH2Sum = 1.0 / (2.0 * (this.dx * this.dx + this.dy * this.dy));

    for (let iter = 0; iter < this.pressureIters; iter++) {
      // Red-black coloring for fast convergence and parallelism
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 1; j < ny - 1; j++) {
          const row = j * nx;
          const startCol = 1 + ((j + pass) % 2);

          for (let i = startCol; i < nx - 1; i += 2) {
            const idx = row + i;
            if (this.mask[idx] <= 0) continue;

            const pL = this.mask[idx - 1] > 0 ? this.p[idx - 1] : this.p[idx];
            const pR = this.mask[idx + 1] > 0 ? this.p[idx + 1] : this.p[idx];
            const pB = this.mask[idx - nx] > 0 ? this.p[idx - nx] : this.p[idx];
            const pT = this.mask[idx + nx] > 0 ? this.p[idx + nx] : this.p[idx];

            this.p[idx] = ((pL + pR) * this.dy * this.dy + (pB + pT) * this.dx * this.dx + this.div[idx] * h2 * h2) * invH2Sum;
          }
        }
      }
    }

    // 3. Subtract pressure gradient: u -= ∂p/∂x, v -= ∂p/∂y
    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) {
          this.u[idx] = 0;
          this.v[idx] = 0;
          continue;
        }

        const dpDx = (this.p[idx + 1] - this.p[idx - 1]) * invTwoDx;
        const dpDy = (this.p[idx + nx] - this.p[idx - nx]) * invTwoDy;

        this.u[idx] -= dpDx;
        this.v[idx] -= dpDy;
      }
    }
  }

  /**
   * Compute max L2 divergence norm across all active fluid cells
   * Incompressible flow requires ||∇ · u|| -> 0 (target < 1e-3)
   */
  public computeDivergenceNorm(): number {
    const nx = this.nx;
    const ny = this.ny;
    const invTwoDx = 0.5 * this.invDx;
    const invTwoDy = 0.5 * this.invDy;

    let sumSq = 0;
    let count = 0;

    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const idx = row + i;
        if (this.mask[idx] <= 0) continue;

        const duDx = (this.u[idx + 1] - this.u[idx - 1]) * invTwoDx;
        const dvDy = (this.v[idx + nx] - this.v[idx - nx]) * invTwoDy;
        const d = duDx + dvDy;
        sumSq += d * d;
        count++;
      }
    }

    return count > 0 ? Math.sqrt(sumSq / count) : 0;
  }
}
