import { BoilingStage, EvaporationRegime, MatterPhase } from '../core/SimulationTypes';
import { DEFAULT_SIMULATION_CONFIG } from '../core/SimulationConfig';

/**
 * Determines current boiling stage from thermodynamic state
 */
export function determineBoilingStage(
  temp_c: number,
  boilingPoint_c: number = DEFAULT_SIMULATION_CONFIG.waterBoilingPoint_c,
  heatPower_W: number = 0
): { stage: BoilingStage; intensity: number } {
  const onset = boilingPoint_c - 5.5; // ~94.5°C
  const microbubble = boilingPoint_c - 20.0; // ~80.0°C
  const rolling = boilingPoint_c - 1.8; // ~98.2°C

  if (temp_c >= rolling || (temp_c >= onset && heatPower_W > 15)) {
    const intensity = Math.min(1.0, 0.65 + Math.min(0.35, (temp_c - rolling) / 2.0));
    return { stage: 'INTENSE_ROLLING_BOIL', intensity };
  }

  if (temp_c >= onset) {
    const intensity = Math.min(0.65, 0.25 + ((temp_c - onset) / (rolling - onset)) * 0.4);
    return { stage: 'ACTIVE_BOIL', intensity };
  }

  if (temp_c >= onset - 1.5) {
    return { stage: 'BOILING_ONSET', intensity: 0.2 };
  }

  if (temp_c >= microbubble) {
    const frac = (temp_c - microbubble) / (onset - microbubble);
    return { stage: 'MICROBUBBLE_NUCLEATION', intensity: frac * 0.15 };
  }

  if (temp_c >= DEFAULT_SIMULATION_CONFIG.convectionOnsetTemp_c || heatPower_W > 5) {
    return { stage: 'WARMING_CONVECTION', intensity: 0.0 };
  }

  return { stage: 'COLD_STABLE', intensity: 0.0 };
}

/**
 * Determines evaporation regime from temperature, exposed surface area, and airflow
 */
export function determineEvaporationRegime(
  temp_c: number,
  surfaceArea_cm2: number,
  isBoiling: boolean
): { regime: EvaporationRegime; rate_ml_s: number } {
  if (isBoiling) {
    const boilRate = 0.08 + (temp_c >= 99 ? 0.12 : 0.04) * (surfaceArea_cm2 / 25.0);
    return { regime: 'VAPOR_PLUME', rate_ml_s: boilRate };
  }

  // Dalton/Antoine surface vaporization rate
  // Vapor pressure P_v(T) = exp(A - B / (T + C))
  const T = Math.max(15, Math.min(100, temp_c));
  const normalizedTempFactor = Math.pow((T - 15) / 85.0, 2.6); // Exponential climb as T approaches 100°C
  const areaFactor = Math.max(0.2, surfaceArea_cm2 / 20.0); // Baseline 20 cm2 ~ 5 cm diameter beaker
  
  const baseRate = 0.00015 + normalizedTempFactor * 0.035 * areaFactor;

  if (T >= 85) {
    return { regime: 'HIGH_THERMAL_EVAPORATION', rate_ml_s: baseRate };
  }
  if (T >= 60) {
    return { regime: 'MODERATE_EVAPORATION', rate_ml_s: baseRate };
  }
  if (T >= 35) {
    return { regime: 'LOW_EVAPORATION', rate_ml_s: baseRate };
  }

  return { regime: 'AMBIENT_DORMANT', rate_ml_s: baseRate * 0.2 };
}

/**
 * Computes fluid viscosity as a function of temperature and solute concentration
 * Water viscosity decreases exponentially with temperature (0.0018 Pa·s at 0°C -> 0.00028 Pa·s at 100°C)
 */
export function computeFluidViscosity(temp_c: number, soluteConcentration_M: number = 0): number {
  // Andrade equation approximation for water
  const T_kelvin = temp_c + 273.15;
  const baseWaterViscosity_mPa_s = 0.02414 * Math.pow(10, 247.8 / (T_kelvin - 140)); // mPa*s
  // Viscosity increases with solute concentration (Jones-Dole equation approx)
  const concentrationMultiplier = 1.0 + 0.08 * soluteConcentration_M;
  return baseWaterViscosity_mPa_s * concentrationMultiplier;
}

/**
 * Computes fluid density (water thermal expansion + dissolved solute mass)
 */
export function computeFluidDensity(temp_c: number, soluteMass_g: number, totalVolume_ml: number): number {
  if (totalVolume_ml <= 0.001) return 1.0;
  // Water thermal density expansion: ~1.0 g/mL at 4°C, ~0.958 g/mL at 100°C
  const waterDensity = 1.0 - Math.pow(Math.max(0, temp_c - 4) / 100, 2) * 0.043;
  const totalMass_g = (totalVolume_ml * waterDensity) + soluteMass_g;
  return totalMass_g / totalVolume_ml;
}
