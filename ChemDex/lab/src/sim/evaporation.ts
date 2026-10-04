/**
 * evaporation.ts - Diffusion/boundary-layer mass transfer, evaporative cooling,
 * and physical steam/fog condensation with invisible vapor gap.
 * 
 * Physical Model:
 * 1. Mass Transfer Rate:
 *    ṁ = (M · D_v · A_s / (R · T_film · δ)) · (P_sat(T_s) - φ · P_sat(T_amb))
 *    D_v ≈ 2.5e-5 · (T / 298.15)^1.8  (m²/s, water in air)
 *    δ ≈ 0.005 m  (boundary layer thickness)
 * 2. Antoine Equation:
 *    log10(P_mmHg) = A - B / (C + T_C)
 * 3. Evaporative Cooling:
 *    Q_evap = ṁ · L_v
 * 4. Visible Steam / Fog Condensation:
 *    Hot vapor directly above surface (T > T_dew) is completely transparent (invisible gap!).
 *    As vapor rises and mixes with cool ambient air, temperature drops below dew point:
 *    Fog density ρ_fog = max(0, ψ - ψ_sat(T_air)) * η
 * 
 * Units: SI internally (m, kg/s, W, K, Pa)
 */

import { GAS_CONSTANT, WATER_LATENT_HEAT_VAP } from '../core/units.js';
import { ParticleSystem, ParticleType } from './particles.js';

export interface EvaporationConfig {
  boundaryLayerM: number;       // δ (m, default 5 mm = 0.005 m)
  ambientHumidity: number;       // φ (0.0 - 1.0, default 0.5 = 50% RH)
  ambientTempK: number;          // T_amb (K, default 293.15 K = 20 °C)
  waterMolarMass: number;        // M (kg/mol, 0.018015 kg/mol)
}

export class EvaporationEngine {
  public boundaryLayerM: number;
  public ambientHumidity: number;
  public ambientTempK: number;
  public waterMolarMass: number;

  constructor(config: Partial<EvaporationConfig> = {}) {
    this.boundaryLayerM = config.boundaryLayerM ?? 0.005;
    this.ambientHumidity = config.ambientHumidity ?? 0.5;
    this.ambientTempK = config.ambientTempK ?? 293.15;
    this.waterMolarMass = config.waterMolarMass ?? 0.018015;
  }

  /**
   * Water vapor saturation pressure via Antoine equation (Pa)
   */
  public satVaporPressureWater(tempK: number): number {
    const degC = tempK - 273.15;
    const clampedC = Math.max(0.1, Math.min(150.0, degC));
    // Water constants for mmHg: A=8.07131, B=1730.63, C=233.426
    const logP = 8.07131 - 1730.63 / (233.426 + clampedC);
    const pMmHg = Math.pow(10, logP);
    return pMmHg * 133.322; // Convert mmHg to Pa
  }

  /**
   * Compute mass evaporation rate (kg/s) and evaporative heat loss (W)
   */
  public computeEvaporation(surfaceAreaM2: number, surfaceTempK: number): {
    massRateKgPerS: number;
    heatLossW: number;
  } {
    if (surfaceAreaM2 <= 0) {
      return { massRateKgPerS: 0, heatLossW: 0 };
    }

    const tFilm = (surfaceTempK + this.ambientTempK) * 0.5;
    const dV = 2.5e-5 * Math.pow(tFilm / 298.15, 1.8); // Diffusion coefficient (m²/s)

    const pSatSurface = this.satVaporPressureWater(surfaceTempK);
    const pSatAmbient = this.satVaporPressureWater(this.ambientTempK);
    const pAmbientVapor = this.ambientHumidity * pSatAmbient;

    const deltaP = Math.max(0, pSatSurface - pAmbientVapor);
    // ṁ = (M · D_v · A_s / (R · T_film · δ)) · ΔP
    const massRate = (this.waterMolarMass * dV * surfaceAreaM2 / (GAS_CONSTANT * tFilm * this.boundaryLayerM)) * deltaP;
    const heatLoss = massRate * WATER_LATENT_HEAT_VAP;

    return { massRateKgPerS: massRate, heatLossW: heatLoss };
  }

  /**
   * Spawn steam/fog particles reflecting the invisible vapor gap
   * Hot vapor is transparent at the water surface; micro-droplets condense ~15-30 mm above surface.
   */
  public emitSteam(
    dt: number,
    particles: ParticleSystem,
    surfaceX: number,
    surfaceY: number,
    surfaceZ: number,
    surfaceRadius: number,
    surfaceTempK: number,
    isBoiling: boolean
  ): void {
    const degC = surfaceTempK - 273.15;
    if (degC < 50.0) return; // Below 50°C, fog concentration is sub-visual

    // Evaporation intensity factor
    const intensity = isBoiling ? 3.0 : Math.min(1.5, (degC - 50.0) / 35.0);
    const particlesToSpawn = Math.floor(intensity * 12.0 * dt * 60.0);

    const invisibleGapHeight = 0.022; // 22 mm transparent vapor gap

    for (let i = 0; i < particlesToSpawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * surfaceRadius * 0.8;
      const px = surfaceX + r * Math.cos(angle);
      const pz = surfaceZ + r * Math.sin(angle);
      // Spawn at top of invisible gap where cooling triggers fog condensation
      const py = surfaceY + invisibleGapHeight + Math.random() * 0.005;

      particles.spawn({
        type: ParticleType.STEAM,
        x: px,
        y: py,
        z: pz,
        vx: (Math.random() - 0.5) * 0.03,
        vy: 0.12 + Math.random() * 0.15, // Buoyant upward drift
        vz: (Math.random() - 0.5) * 0.03,
        radius: 0.008 + Math.random() * 0.008,
        maxAge: 1.8 + Math.random() * 0.8,
        r: 0.95,
        g: 0.96,
        b: 0.98,
        a: isBoiling ? 0.35 : 0.18,
      });
    }
  }
}
