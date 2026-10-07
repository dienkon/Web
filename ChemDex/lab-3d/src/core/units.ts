/**
 * PHYSICAL UNITS AND CONVERSIONS
 * Rule 10: Units are strictly SI internally:
 * - Length: meters (m)
 * - Mass: kilograms (kg)
 * - Time: seconds (s)
 * - Temperature: Kelvin (K)
 * - Amount of substance: moles (mol)
 * - Energy: Joules (J)
 * - Pressure: Pascals (Pa)
 * - Viscosity: Pascal-seconds (Pa·s)
 * - Surface tension: Newtons per meter (N/m)
 * - Density: kilograms per cubic meter (kg/m^3)
 *
 * Convert to UI units (°C, mL, g, mol/L, mmHg, atm) only in presentation layers.
 */

// Universal Physical Constants (CODATA 2018)
export const CONSTANTS = {
  R: 8.314462618,       // Molar gas constant, J/(mol·K)
  k_B: 1.380649e-23,    // Boltzmann constant, J/K
  N_A: 6.02214076e23,   // Avogadro constant, mol^-1
  g: 9.80665,           // Standard acceleration of gravity, m/s^2
  P_ATM: 101325.0,      // Standard atmospheric pressure, Pa (1 atm)
  T_STP: 273.15,        // Standard temperature, K (0 °C)
  T_ROOM: 298.15,       // Standard ambient temperature, K (25 °C)
  SIGMA_SB: 5.670374419e-8, // Stefan-Boltzmann constant, W/(m^2·K^4)
  WATER_MOLAR_MASS: 0.01801528, // kg/mol (18.015 g/mol)
  WATER_CP: 4184.0,     // Specific heat of liquid water at 298 K, J/(kg·K)
  WATER_LV: 2.257e6,    // Latent heat of vaporization of water at 373 K, J/kg
  WATER_RHO_20C: 998.2, // Density of water at 20 °C, kg/m^3
  WATER_SURFACE_TENSION: 0.0728, // Surface tension of water at 20 °C, N/m
  WATER_VISCOSITY_20C: 1.002e-3, // Dynamic viscosity of water at 20 °C, Pa·s
  BOROSILICATE_CP: 830.0, // Specific heat of borosilicate glass, J/(kg·K)
  AIR_MOLAR_MASS: 0.02897, // Dry air molar mass, kg/mol
  AIR_RHO_STP: 1.204,   // Density of air at 20 °C, 1 atm, kg/m^3
};

// Conversions
export function celsiusToKelvin(c: number): number {
  return c + 273.15;
}

export function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

export function mlToM3(ml: number): number {
  return ml * 1e-6; // 1 mL = 1 cm^3 = 1e-6 m^3
}

export function m3ToMl(m3: number): number {
  return m3 * 1e6;
}

export function lToM3(l: number): number {
  return l * 1e-3; // 1 L = 1e-3 m^3
}

export function m3ToL(m3: number): number {
  return m3 * 1e3;
}

export function gramsToKg(g: number): number {
  return g * 1e-3;
}

export function kgToGrams(kg: number): number {
  return kg * 1e3;
}

export function molarityToMolM3(molarity: number): number {
  // mol/L -> mol/m^3 (1 mol/L = 1000 mol/m^3)
  return molarity * 1000.0;
}

export function molM3ToMolarity(molM3: number): number {
  return molM3 * 0.001;
}

export function mmhgToPa(mmHg: number): number {
  return mmHg * 133.322387415;
}

export function paToMmhg(pa: number): number {
  return pa / 133.322387415;
}

export function atmToPa(atm: number): number {
  return atm * 101325.0;
}

export function paToAtm(pa: number): number {
  return pa / 101325.0;
}

export function barToPa(bar: number): number {
  return bar * 1e5;
}

export function paToBar(pa: number): number {
  return pa / 1e5;
}

export function cmToM(cm: number): number {
  return cm * 0.01;
}

export function mToCm(m: number): number {
  return m * 100.0;
}

export function mmToM(mm: number): number {
  return mm * 0.001;
}

export function mToMm(m: number): number {
  return m * 1000.0;
}

export function umToM(um: number): number {
  return um * 1e-6;
}

export function mToUm(m: number): number {
  return m * 1e6;
}

export function kjToJ(kj: number): number {
  return kj * 1000.0;
}

export function jToKj(j: number): number {
  return j * 0.001;
}

// Named Aliases for Physical Constants
export const GRAVITY = CONSTANTS.g;
export const GAS_CONSTANT = CONSTANTS.R;
export const WATER_LATENT_HEAT_VAP = CONSTANTS.WATER_LV;
export const WATER_DENSITY_20C = CONSTANTS.WATER_RHO_20C;
export const WATER_SURFACE_TENSION = CONSTANTS.WATER_SURFACE_TENSION;
export const WATER_VISCOSITY_20C = CONSTANTS.WATER_VISCOSITY_20C;
export const WATER_CP = CONSTANTS.WATER_CP;
export const ATMOSPHERIC_PRESSURE = CONSTANTS.P_ATM;
