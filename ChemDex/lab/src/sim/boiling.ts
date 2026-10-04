/**
 * boiling.ts - Nucleate pool boiling regimes, latent heat sink, and superheating bumping.
 * 
 * Physical Model:
 * 1. Boiling Regimes:
 *    - NATURAL_CONVECTION: T < 55 °C
 *    - DEGASSING: 55 °C <= T < 90 °C (dissolved air nucleation)
 *    - SUBCOOLED_SINGING: 90 °C <= T < Tsat (vapor collapse in cooler bulk)
 *    - NUCLEATE_BOILING: T ≈ Tsat (100 °C at 1 atm), latent heat sink plateau
 *    - BOIL_DRY: Volume <= 0 (dryout, thermal runaway warning)
 * 2. Latent Heat Vapor Generation:
 *    Q_boil = max(0, P_heater - Q_cooling)
 *    ṁ_boil = Q_boil / L_v, where L_v = 2.257e6 J/kg for water.
 * 3. Superheating Bumping:
 *    In clean vessels without boiling stones, temperature can exceed Tsat by 3 - 10 K
 *    before explosive nucleation triggers a sudden flash vapor burst and rapid temperature drop.
 * 
 * Units: SI internally (K, J, W, kg/s, m³)
 */

import { WATER_LATENT_HEAT_VAP } from '../core/units.js';

export const enum BoilingRegime {
  NATURAL_CONVECTION = 0,
  DEGASSING = 1,
  SUBCOOLED_SINGING = 2,
  NUCLEATE_BOILING = 3,
  SUPERHEATED_BUMP = 4,
  BOIL_DRY = 5,
}

export interface BoilingState {
  regime: BoilingRegime;
  satTempK: number;
  vaporRateKgPerS: number;  // ṁ_boil (kg/s)
  latentHeatSinkW: number;  // Q_latent (W)
  superheatK: number;       // T - Tsat (K)
  hasBoilingStones: boolean;
  isBumping: boolean;
}

export class BoilingEngine {
  public satTempK: number = 373.15; // 100.0 °C at 1 atm
  public latentHeatVap: number = WATER_LATENT_HEAT_VAP; // 2.257e6 J/kg
  public superheatLimitK: number = 4.5; // Max superheating before bump
  public hasBoilingStones: boolean = false;

  private bumpCooldown: number = 0;

  constructor(satTempK: number = 373.15, hasBoilingStones: boolean = false) {
    this.satTempK = satTempK;
    this.hasBoilingStones = hasBoilingStones;
  }

  /**
   * Update boiling state and compute mass vaporization rate and latent heat sink
   */
  public evaluate(
    dt: number,
    liquidTempK: number,
    netHeatingPowerW: number,
    liquidVolumeM3: number
  ): BoilingState {
    if (this.bumpCooldown > 0) {
      this.bumpCooldown -= dt;
    }

    if (liquidVolumeM3 <= 1e-7) { // Under 0.1 mL is considered dry
      return {
        regime: BoilingRegime.BOIL_DRY,
        satTempK: this.satTempK,
        vaporRateKgPerS: 0,
        latentHeatSinkW: 0,
        superheatK: Math.max(0, liquidTempK - this.satTempK),
        hasBoilingStones: this.hasBoilingStones,
        isBumping: false,
      };
    }

    const degC = liquidTempK - 273.15;
    const satDegC = this.satTempK - 273.15;
    const superheat = liquidTempK - this.satTempK;

    // Check for superheating bump condition
    let isBumping = false;
    let regime = BoilingRegime.NATURAL_CONVECTION;

    if (!this.hasBoilingStones && superheat > this.superheatLimitK && this.bumpCooldown <= 0) {
      isBumping = true;
      regime = BoilingRegime.SUPERHEATED_BUMP;
      this.bumpCooldown = 3.0; // 3 second recovery
    } else if (superheat >= -0.1) {
      regime = BoilingRegime.NUCLEATE_BOILING;
    } else if (degC >= satDegC - 10.0) {
      regime = BoilingRegime.SUBCOOLED_SINGING;
    } else if (degC >= 55.0) {
      regime = BoilingRegime.DEGASSING;
    } else {
      regime = BoilingRegime.NATURAL_CONVECTION;
    }

    let vaporRate = 0;
    let latentSink = 0;

    if (regime === BoilingRegime.NUCLEATE_BOILING || isBumping) {
      // In nucleate boiling, heater power above equilibrium goes directly into latent heat
      latentSink = Math.max(0, netHeatingPowerW);
      if (isBumping) {
        // Explosive flash boiling converts accumulated superheat energy
        latentSink += 1500.0;
      }
      vaporRate = latentSink / this.latentHeatVap;
    }

    return {
      regime,
      satTempK: this.satTempK,
      vaporRateKgPerS: vaporRate,
      latentHeatSinkW: latentSink,
      superheatK: Math.max(0, superheat),
      hasBoilingStones: this.hasBoilingStones,
      isBumping,
    };
  }
}
