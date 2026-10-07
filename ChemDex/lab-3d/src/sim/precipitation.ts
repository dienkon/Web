/**
 * precipitation.ts - Classical nucleation, crystal growth, morphology presets,
 * hindered settling (Richardson-Zaki), sediment bed with angle of repose, and resuspension.
 * 
 * Physical Model:
 * 1. Classical Nucleation Rate:
 *    J(S) = A_n · exp(-B_n / ln²(S))  (nuclei / (m³ s))
 *    S = (Q / K_sp)^(1/ν)  (supersaturation ratio)
 * 2. Particle Growth:
 *    dr̄/dt = k_g · (S - 1)^g
 * 3. Stokes & Richardson-Zaki Hindered Settling:
 *    v_s = (2/9) · (ρ_p - ρ_l) · g · r² / μ
 *    v_hindered = v_s · (1 - φ)^4.65
 * 4. Sediment Bed & Angle of Repose:
 *    Deposition height-field b(x, z) at bottom of vessel.
 *    Thermal erosion algorithm moves mass when local slope > tan(φ_repose) (~30°).
 * 5. Resuspension (Shields Criterion):
 *    Bottom fluid shear stress τ = μ · (∂u/∂y). If τ > τ_crit, bed resuspends.
 * 6. PbI2 "Golden Rain" Thermal Recrystallization:
 *    Temperature-dependent solubility Cs(T) causes dissolution when hot (>80°C)
 *    and nucleation of glittering hexagonal plates upon cooling.
 * 
 * Units: SI internally (m, kg, s, K, mol/m³, Pa s)
 */

import { GRAVITY } from '../core/units.js';
import { ParticleSystem, ParticleType } from './particles.js';

export type PrecipitateMorphology =
  | 'curdy'
  | 'fine_crystalline'
  | 'gelatinous'
  | 'flocculent'
  | 'crystalline_dense'
  | 'colloidal';

export interface MorphologyPreset {
  morphology: PrecipitateMorphology;
  particleRadiusMinM: number;
  particleRadiusMaxM: number;
  densityKgPerM3: number;
  bedPorosity: number;
  settlingRateMultiplier: number;
  colorR: number;
  colorG: number;
  colorB: number;
  alpha: number;
}

export const PRECIPITATE_PRESETS: Record<PrecipitateMorphology, MorphologyPreset> = {
  curdy: {
    morphology: 'curdy',
    particleRadiusMinM: 2e-6,
    particleRadiusMaxM: 50e-6,
    densityKgPerM3: 5560, // AgCl
    bedPorosity: 0.85,
    settlingRateMultiplier: 1.0,
    colorR: 0.96,
    colorG: 0.96,
    colorB: 0.94,
    alpha: 0.9,
  },
  fine_crystalline: {
    morphology: 'fine_crystalline',
    particleRadiusMinM: 0.2e-6,
    particleRadiusMaxM: 2e-6,
    densityKgPerM3: 4500, // BaSO4
    bedPorosity: 0.65,
    settlingRateMultiplier: 0.15,
    colorR: 0.98,
    colorG: 0.98,
    colorB: 0.98,
    alpha: 0.85,
  },
  gelatinous: {
    morphology: 'gelatinous',
    particleRadiusMinM: 0.1e-6,
    particleRadiusMaxM: 10e-6,
    densityKgPerM3: 2400, // Cu(OH)2, Al(OH)3
    bedPorosity: 0.95,
    settlingRateMultiplier: 0.3,
    colorR: 0.45,
    colorG: 0.75,
    colorB: 0.95,
    alpha: 0.7,
  },
  flocculent: {
    morphology: 'flocculent',
    particleRadiusMinM: 5e-6,
    particleRadiusMaxM: 150e-6,
    densityKgPerM3: 3400, // Fe(OH)3 rust
    bedPorosity: 0.9,
    settlingRateMultiplier: 0.8,
    colorR: 0.75,
    colorG: 0.35,
    colorB: 0.15,
    alpha: 0.92,
  },
  crystalline_dense: {
    morphology: 'crystalline_dense',
    particleRadiusMinM: 10e-6,
    particleRadiusMaxM: 120e-6,
    densityKgPerM3: 6160, // PbI2 golden rain
    bedPorosity: 0.55,
    settlingRateMultiplier: 2.2,
    colorR: 0.98,
    colorG: 0.85,
    colorB: 0.12,
    alpha: 0.95,
  },
  colloidal: {
    morphology: 'colloidal',
    particleRadiusMinM: 0.1e-6,
    particleRadiusMaxM: 0.8e-6,
    densityKgPerM3: 2070, // Colloidal Sulfur
    bedPorosity: 0.7,
    settlingRateMultiplier: 0.02,
    colorR: 0.95,
    colorG: 0.92,
    colorB: 0.65,
    alpha: 0.75,
  },
};

export class PrecipitationPipeline {
  public preset: MorphologyPreset;
  public suspendedMoles: number = 0;
  public sedimentMoles: number = 0;

  // Bed height field on vessel floor (grid 32x32)
  public readonly bedRes: number = 32;
  public bedHeight: Float32Array;
  public vesselRadius: number;

  constructor(morphology: PrecipitateMorphology = 'curdy', vesselRadius: number = 0.04) {
    this.preset = PRECIPITATE_PRESETS[morphology] ?? PRECIPITATE_PRESETS.curdy;
    this.vesselRadius = vesselRadius;
    this.bedHeight = new Float32Array(this.bedRes * this.bedRes);
  }

  /**
   * Set active morphology preset
   */
  public setMorphology(morphology: PrecipitateMorphology): void {
    if (PRECIPITATE_PRESETS[morphology]) {
      this.preset = PRECIPITATE_PRESETS[morphology];
    }
  }

  /**
   * Nucleate precipitate when supersaturation S > 1.0
   * @param supersaturation S = (Q / Ksp)^(1/ν)
   * @param molesExcess Total moles available above saturation
   * @param dt Time step (s)
   */
  public nucleate(supersaturation: number, molesExcess: number, dt: number): number {
    if (supersaturation <= 1.0001 || molesExcess <= 0) return 0;

    // Classical nucleation rate J = An * exp(-Bn / ln²(S))
    const lnS = Math.log(supersaturation);
    const bn = 1.8; // Tuned for realistic laboratory onset
    const jRate = Math.min(1.0, Math.exp(-bn / (lnS * lnS)));

    // Approach equilibrium with kinetic rate
    const molesToPrecip = Math.min(molesExcess, molesExcess * (1.0 - Math.exp(-jRate * 8.0 * dt)));
    this.suspendedMoles += molesToPrecip;
    return molesToPrecip;
  }

  /**
   * Update sedimentation, bed accumulation, and shear resuspension
   */
  public update(
    dt: number,
    particles: ParticleSystem,
    liquidHeightM: number,
    bottomShearStressPa: number,
    stirrerSpeedRadS: number
  ): void {
    if (dt <= 0) return;

    const rhoP = this.preset.densityKgPerM3;
    const rhoL = 1000.0;
    const mu = 1.0e-3; // Water dynamic viscosity (Pa s)
    const rMean = (this.preset.particleRadiusMinM + this.preset.particleRadiusMaxM) * 0.5;

    // 1. Single-particle Stokes velocity: v_s = (2/9) * (ρ_p - ρ_l) * g * r² / μ
    const vStokes = (2.0 / 9.0) * (rhoP - rhoL) * GRAVITY * (rMean * rMean) / mu;

    // Volume fraction φ of suspended solids
    const solidVolume = this.suspendedMoles * 0.00003; // Approx 30 mL/mol
    const liquidVolume = Math.PI * this.vesselRadius * this.vesselRadius * liquidHeightM;
    const phi = Math.min(0.5, solidVolume / Math.max(1e-6, liquidVolume));

    // Richardson-Zaki hindered settling: v = v_s * (1 - φ)^4.65
    const vHindered = vStokes * Math.pow(Math.max(0, 1.0 - phi), 4.65) * this.preset.settlingRateMultiplier;

    // 2. Settle suspended moles into sediment bed
    if (this.suspendedMoles > 0 && liquidHeightM > 0) {
      const settleFraction = Math.min(1.0, (vHindered * dt) / Math.max(0.01, liquidHeightM));
      const molesSettled = this.suspendedMoles * settleFraction;
      this.suspendedMoles -= molesSettled;
      this.sedimentMoles += molesSettled;

      // Deposit into center of bed height-field
      this.depositToBed(molesSettled);
    }

    // 3. Angle of repose relaxation on sediment bed (thermal erosion)
    this.relaxBedAngleOfRepose();

    // 4. Resuspension from bottom shear stress (Shields criterion)
    const tauCrit = 0.04 * (rhoP - rhoL) * GRAVITY * (2.0 * rMean); // Critical Shields shear (Pa)
    const activeShear = bottomShearStressPa + stirrerSpeedRadS * 0.02;

    if (activeShear > tauCrit && this.sedimentMoles > 0) {
      const resuspendRate = Math.min(0.5, (activeShear - tauCrit) / (tauCrit + 1e-4) * 2.0 * dt);
      const molesResuspended = this.sedimentMoles * resuspendRate;
      this.sedimentMoles -= molesResuspended;
      this.suspendedMoles += molesResuspended;
      this.erodeBed(resuspendRate);
    }

    // 5. Update render particles for visible glittering flocs / curds
    for (let i = 0; i < particles.capacity; i++) {
      if (particles.age[i] >= particles.maxAge[i] || particles.type[i] !== ParticleType.PRECIPITATE) {
        continue;
      }

      // Settling motion
      particles.vy[i] = -vHindered;

      // Bottom impact
      if (particles.y[i] <= 0.002) {
        particles.kill(i);
      }
    }
  }

  /**
   * Deposit sediment moles onto the bottom height-field grid
   */
  private depositToBed(moles: number): void {
    const molarVolumeM3 = 0.00003; // ~30 cm³/mol
    const totalVolumeM3 = moles * molarVolumeM3 / (1.0 - this.preset.bedPorosity);
    const cellArea = (2.0 * this.vesselRadius / this.bedRes) ** 2;
    const heightIncrement = totalVolumeM3 / (Math.PI * this.vesselRadius * this.vesselRadius);

    const mid = Math.floor(this.bedRes / 2);
    for (let j = 0; j < this.bedRes; j++) {
      for (let i = 0; i < this.bedRes; i++) {
        const di = i - mid;
        const dj = j - mid;
        const rNorm2 = (di * di + dj * dj) / (mid * mid);
        if (rNorm2 <= 1.0) {
          const factor = Math.exp(-rNorm2 * 2.0);
          this.bedHeight[j * this.bedRes + i] += heightIncrement * factor;
        }
      }
    }
  }

  /**
   * Erode sediment bed proportionally during resuspension
   */
  private erodeBed(fraction: number): void {
    for (let i = 0; i < this.bedHeight.length; i++) {
      this.bedHeight[i] = Math.max(0, this.bedHeight[i] * (1.0 - fraction));
    }
  }

  /**
   * Angle of repose relaxation: move material downhill when slope exceeds tan(30°) ≈ 0.577
   */
  private relaxBedAngleOfRepose(): void {
    const N = this.bedRes;
    const dx = (2.0 * this.vesselRadius) / (N - 1);
    const maxSlope = Math.tan(30.0 * Math.PI / 180.0); // 30° angle of repose

    for (let j = 1; j < N - 1; j++) {
      const row = j * N;
      for (let i = 1; i < N - 1; i++) {
        const idx = row + i;
        const hCenter = this.bedHeight[idx];

        // Check 4 neighbors
        const neighbors = [idx - 1, idx + 1, idx - N, idx + N];
        for (const nIdx of neighbors) {
          const diff = hCenter - this.bedHeight[nIdx];
          const slope = diff / dx;
          if (slope > maxSlope) {
            const shift = (slope - maxSlope) * dx * 0.25;
            this.bedHeight[idx] -= shift;
            this.bedHeight[nIdx] += shift;
          }
        }
      }
    }
  }
}
