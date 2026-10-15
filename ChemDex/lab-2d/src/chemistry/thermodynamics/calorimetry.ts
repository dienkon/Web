/**
 * Chemical Thermodynamics and Calorimetry Module
 * Calculates temperature evolution from reaction enthalpy (dH), external heating,
 * and ambient cooling using adiabatic and lumped thermal capacitance models.
 */

export const WATER_SPECIFIC_HEAT_J_G_K = 4.184; // J/(g·K)
export const GLASS_CALORIMETER_HEAT_CAP_J_K = 32.0; // J/K for standard 250mL beaker
export const AMBIENT_TEMP_C = 25.0; // °C
export const WATER_BOILING_POINT_C = 100.0; // °C

/**
 * Calculates temperature change resulting from reaction enthalpy.
 * @param extent_moles Extent of reaction xi in moles
 * @param deltaH_kJ_mol Standard molar enthalpy of reaction (negative = exothermic)
 * @param solutionMass_g Total mass of liquid solution in grams
 * @param currentTemp_c Initial vessel temperature in Celsius
 */
export function calculateReactionDeltaT(
  extent_moles: number,
  deltaH_kJ_mol: number,
  solutionMass_g: number,
  currentTemp_c: number
): { finalTemp_c: number; deltaT: number; heatReleased_J: number; isBoiling: boolean } {
  if (extent_moles <= 0 || deltaH_kJ_mol === 0) {
    return { finalTemp_c: currentTemp_c, deltaT: 0, heatReleased_J: 0, isBoiling: false };
  }

  // q_reaction = xi * dH (in Joules)
  const deltaH_J_mol = deltaH_kJ_mol * 1000.0;
  const q_reaction = extent_moles * deltaH_J_mol;
  const heatReleased_J = -q_reaction; // Positive if heat released into solution

  const effectiveMass_g = Math.max(5.0, solutionMass_g);
  const totalHeatCap_J_K = effectiveMass_g * WATER_SPECIFIC_HEAT_J_G_K + GLASS_CALORIMETER_HEAT_CAP_J_K;

  const deltaT = heatReleased_J / totalHeatCap_J_K;
  let finalTemp = currentTemp_c + deltaT;

  // Temperature physical constraints (boiling cap at atmospheric pressure)
  let isBoiling = false;
  if (finalTemp >= WATER_BOILING_POINT_C) {
    isBoiling = true;
    finalTemp = Math.min(102.5, finalTemp); // Slight boiling elevation
  }

  return {
    finalTemp_c: Math.round(finalTemp * 10) / 10,
    deltaT: Math.round(deltaT * 10) / 10,
    heatReleased_J: Math.round(heatReleased_J * 10) / 10,
    isBoiling,
  };
}

/**
 * Simulates temperature update from external heating source (Bunsen burner / hot plate) over time delta dt.
 * @param currentTemp_c Current temperature in Celsius
 * @param heatingPowerWatts Thermal power transferred into vessel in Watts (J/s)
 * @param mass_g Total liquid/solid mass in vessel
 * @param dt_seconds Time interval in seconds
 */
export function applyExternalHeating(
  currentTemp_c: number,
  heatingPowerWatts: number,
  mass_g: number,
  dt_seconds: number
): { newTemp_c: number; isBoiling: boolean } {
  const effectiveMass = Math.max(10.0, mass_g);
  const totalC = effectiveMass * WATER_SPECIFIC_HEAT_J_G_K + GLASS_CALORIMETER_HEAT_CAP_J_K;

  // Heat absorbed from source
  const heatGained_J = heatingPowerWatts * dt_seconds;
  // Natural Newton cooling to ambient
  const coolingRate = 0.005; // 1/s
  const coolingLoss_J = coolingRate * totalC * (currentTemp_c - AMBIENT_TEMP_C) * dt_seconds;

  const netDeltaT = (heatGained_J - coolingLoss_J) / totalC;
  let newTemp = Math.max(AMBIENT_TEMP_C, currentTemp_c + netDeltaT);

  let isBoiling = false;
  if (newTemp >= WATER_BOILING_POINT_C) {
    isBoiling = true;
    newTemp = 100.0;
  }

  return {
    newTemp_c: Math.round(newTemp * 10) / 10,
    isBoiling,
  };
}
