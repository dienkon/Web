/**
 * bubbles.ts - Physically-based bubble nucleation, rise dynamics, subcooled collapse, and surface bursts.
 * 
 * Physical Models:
 * 1. Fritz Departure Diameter:
 *    D_d = 0.0208 · θ · sqrt(σ / (g (ρ_l - ρ_v)))
 *    θ: contact angle (~45° - 60° on borosilicate glass)
 * 2. Bubble Rise Velocity (Mendelson equation for R > 0.5 mm, Stokes for R < 0.5 mm):
 *    U = sqrt(2 σ / (ρ_l d) + g d / 2)  (clamped 0.15 - 0.35 m/s)
 * 3. Path Wobble:
 *    Lateral oscillation for d > 1.5 mm: A_wobble ≈ 0.3 d, f_wobble ≈ U / (4 d)
 * 4. Subcooled Bubble Collapse ("Singing" Stage, 90°C - 99°C):
 *    Condensation rate: dR/dt ∝ (T_local - T_sat)
 *    If R < R_crit (≈ 0.1 mm) → bubble collapses completely with tick audio impulse.
 * 5. Surface Arrival & Film Burst:
 *    Cap thins → exponential burst → ring ripple impulse, 0-3 Worthington jet droplets,
 *    and Minnaert acoustic frequency: f = 3.26 / R (Hz).
 * 
 * Units: SI internally (m, m/s, s, N/m, kg/m³, Hz)
 */

import { GRAVITY } from '../core/units.js';
import { ParticleSystem, ParticleType } from './particles.js';
import { FreeSurfaceSimulator } from './surface.js';
import { PRNG } from '../core/rng.js';

export interface NucleationSite {
  x: number;          // Position relative to vessel center (m)
  y: number;          // Height from vessel base (m)
  z: number;          // Position relative to vessel center (m)
  baseFreq: number;   // Emission frequency (Hz, 5 - 40 Hz)
  phase: number;      // Phase offset
  timer: number;      // Accumulator (s)
  active: boolean;
}

export interface BubbleSimConfig {
  contactAngleDeg: number;  // θ in degrees (~50° for clean water on glass)
  surfaceTension: number;   // σ (N/m, ~0.0728 N/m)
  liquidDensity: number;    // ρ_l (kg/m³, ~1000 kg/m³)
  vaporDensity: number;     // ρ_v (kg/m³, ~0.598 kg/m³ at 100°C)
  vesselRadius: number;     // Bottom radius of vessel (m)
  numSites: number;         // Number of nucleation sites (default 24)
}

export class BubbleManager {
  public contactAngleDeg: number;
  public surfaceTension: number;
  public liquidDensity: number;
  public vaporDensity: number;
  public vesselRadius: number;

  public sites: NucleationSite[] = [];
  public onBubbleBurst?: (x: number, z: number, radius: number, minnaertFreq: number) => void;
  public onBubbleCollapse?: (x: number, y: number, z: number, freq: number) => void;

  constructor(config: Partial<BubbleSimConfig> = {}, rng?: PRNG) {
    this.contactAngleDeg = config.contactAngleDeg ?? 50.0;
    this.surfaceTension = config.surfaceTension ?? 0.0728;
    this.liquidDensity = config.liquidDensity ?? 1000.0;
    this.vaporDensity = config.vaporDensity ?? 0.598;
    this.vesselRadius = config.vesselRadius ?? 0.04;

    const numSites = config.numSites ?? 24;
    this.initNucleationSites(numSites, rng);
  }

  /**
   * Calculate Fritz bubble departure diameter (m)
   */
  public calculateDepartureDiameter(temperatureK: number): number {
    const deltaRho = Math.max(1.0, this.liquidDensity - this.vaporDensity);
    const laplaceLength = Math.sqrt(this.surfaceTension / (GRAVITY * deltaRho));
    // D_d = 0.0208 * θ * sqrt(σ / (g Δρ))
    const baseDd = 0.0208 * this.contactAngleDeg * laplaceLength;
    return Math.max(0.0008, Math.min(0.006, baseDd)); // Clamp between 0.8 mm and 6 mm
  }

  /**
   * Distribute Poisson-disc-like nucleation sites on bottom plate and lower rim
   */
  private initNucleationSites(count: number, rng?: PRNG): void {
    this.sites = [];
    const R = this.vesselRadius * 0.85;

    for (let i = 0; i < count; i++) {
      // Golden spiral distribution on bottom disc
      const phi = (i + 0.5) * 2.3999632; // Golden ratio angle
      const r = R * Math.sqrt((i + 0.5) / count);
      const x = r * Math.cos(phi);
      const z = r * Math.sin(phi);
      const y = 0.001; // 1 mm above bottom glass

      const freq = 6.0 + (rng ? rng.nextFloat() : Math.random()) * 18.0; // 6 - 24 Hz

      this.sites.push({
        x,
        y,
        z,
        baseFreq: freq,
        phase: (rng ? rng.nextFloat() : Math.random()) * Math.PI * 2,
        timer: 0,
        active: false,
      });
    }
  }

  /**
   * Update bubble nucleation, rise dynamics, subcooling collapse, and surface bursts
   */
  public update(
    dt: number,
    particles: ParticleSystem,
    surface: FreeSurfaceSimulator,
    bulkTempK: number,
    satTempK: number,
    liquidHeight: number,
    heatPowerW: number
  ): void {
    if (dt <= 0) return;

    const departureD = this.calculateDepartureDiameter(bulkTempK);
    const baseDepartureRadius = departureD * 0.5;

    // Activate nucleation sites based on thermal superheating and heat input
    const superheat = bulkTempK - (satTempK - 10.0); // Degassing starts ~10K below sat
    const isBoiling = bulkTempK >= satTempK - 0.5;
    const activeFraction = Math.max(0, Math.min(1.0, superheat / 10.0 + (heatPowerW > 50 ? 0.3 : 0.0)));
    const activeCount = Math.floor(this.sites.length * activeFraction);

    // 1. Nucleation and emission
    for (let s = 0; s < this.sites.length; s++) {
      const site = this.sites[s];
      site.active = s < activeCount;
      if (!site.active) continue;

      site.timer += dt;
      const period = 1.0 / site.baseFreq;

      if (site.timer >= period) {
        site.timer -= period;

        // Fritz departure with ±20% jitter
        const rJitter = baseDepartureRadius * (0.8 + Math.random() * 0.4);
        particles.spawn({
          type: ParticleType.BUBBLE,
          x: site.x + (Math.random() - 0.5) * 0.002,
          y: site.y,
          z: site.z + (Math.random() - 0.5) * 0.002,
          vx: (Math.random() - 0.5) * 0.02,
          vy: 0.18, // Initial detachment velocity
          vz: (Math.random() - 0.5) * 0.02,
          radius: rJitter,
          maxAge: 4.0, // Max travel time
          weight: 1.0,
          r: 0.95,
          g: 0.98,
          b: 1.0,
          a: 0.6,
        });
      }
    }

    // 2. Bubble rise kinematics, subcooled collapse, and surface burst
    for (let i = 0; i < particles.capacity; i++) {
      if (particles.age[i] >= particles.maxAge[i] || particles.type[i] !== ParticleType.BUBBLE) {
        continue;
      }

      const r = particles.radius[i];
      const d = 2.0 * r;

      // Mendelson rise velocity: U = sqrt(2σ / (ρ d) + g d / 2)
      const uRise = Math.max(0.12, Math.min(0.35, Math.sqrt((2.0 * this.surfaceTension) / (this.liquidDensity * d) + (GRAVITY * d) * 0.5)));
      particles.vy[i] = uRise;

      // Path wobble for bubbles larger than 1.5 mm
      if (d > 0.0015) {
        particles.phase[i] += (uRise / (4.0 * d)) * dt * Math.PI * 2;
        const wobbleAmp = 0.25 * d;
        particles.vx[i] = Math.cos(particles.phase[i]) * wobbleAmp * 10.0;
        particles.vz[i] = Math.sin(particles.phase[i]) * wobbleAmp * 10.0;
      }

      // Subcooled bubble condensation collapse (when bulkTemp < satTemp)
      if (bulkTempK < satTempK - 1.0) {
        const subcoolDelta = (satTempK - bulkTempK);
        // Bubble shrinks via condensation: dr/dt = -k * ΔT_sub
        particles.radius[i] -= 0.0003 * subcoolDelta * dt;

        if (particles.radius[i] <= 0.0002) { // Collapsed (200 µm threshold)
          const minnaertCollapse = 3.26 / Math.max(0.0002, particles.radius[i]);
          if (this.onBubbleCollapse) {
            this.onBubbleCollapse(particles.x[i], particles.y[i], particles.z[i], minnaertCollapse);
          }
          particles.kill(i);
          continue;
        }
      } else if (isBoiling) {
        // Growth while rising through saturated liquid
        particles.radius[i] += 0.00015 * dt;
      }

      // 3. Surface arrival check
      if (particles.y[i] >= liquidHeight - 0.002) {
        // Bubble reaches free surface: burst event
        const burstX = particles.x[i];
        const burstZ = particles.z[i];
        const normX = burstX / this.vesselRadius;
        const normZ = burstZ / this.vesselRadius;

        // Surface ripple impulse
        surface.addImpulse(normX, normZ, r * 1.2, 0.06);

        // Minnaert burst frequency: f ≈ 3.26 / R (Hz)
        const minnaertFreq = 3.26 / Math.max(0.0005, r);
        if (this.onBubbleBurst) {
          this.onBubbleBurst(burstX, burstZ, r, minnaertFreq);
        }

        // Worthington jet droplets (0 - 2 droplets)
        if (Math.random() < 0.6) {
          const dropRadius = r * 0.18;
          particles.spawn({
            type: ParticleType.DROPLET,
            x: burstX,
            y: liquidHeight + 0.002,
            z: burstZ,
            vx: (Math.random() - 0.5) * 0.1,
            vy: 0.35 + Math.random() * 0.45, // Ejection upward
            vz: (Math.random() - 0.5) * 0.1,
            radius: dropRadius,
            maxAge: 0.8,
            r: 0.9,
            g: 0.95,
            b: 1.0,
            a: 0.8,
          });
        }

        particles.kill(i);
      }
    }
  }
}
