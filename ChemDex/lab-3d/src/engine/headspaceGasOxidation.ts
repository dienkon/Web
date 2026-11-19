import type { VesselState } from '../types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT } from '../science/labEnvironment';
import { IDEAL_GAS_R_L_ATM } from './headspacePressure';

const MOLAR_MASS_NO = 30.0061;
const MOLAR_MASS_O2 = 31.9988;
const MOLAR_MASS_NO2 = 46.0055; // Exact stoichiometry: 2*NO + O2 = 2*NO2 (60.0122 + 31.9988 = 92.0110 = 2*46.0055)

/**
 * Gas-phase termolecular oxidation rate constant for 2 NO(g) + O2(g) -> 2 NO2(g)
 * near 298 K: k ≈ 2.0e4 L^2 mol^-2 s^-1 (NIST/IUPAC gas-phase kinetics reference).
 * Treated as constant 298 K reference; weak negative T-dependence is not modeled.
 */
export const NO_OXIDATION_K_L2_MOL2_S = 2.0e4;

export interface NoOxidationStepResult {
  noInitial_mol: number;
  noRemaining_mol: number;
  no2Formed_mol: number;
  ambientO2Consumed_mol: number;
  noRemaining_g: number;
  no2Formed_g: number;
  ambientO2Consumed_g: number;
  conversionFraction: number;
}

/**
 * Integrates 2 NO(g) + O2(g) -> 2 NO2(g) analytically over `dt_s` in an open
 * mixing plume of volume `plumeVolume_L` with constant ambient O2 concentration
 * [O2] = y_O2 * P / (R * T).
 *
 * Exact mass balance: m(NO_initial) + m(O2_ambient) === m(NO_remaining) + m(NO2_formed).
 * Exact atom balance: N_initial === N_remaining + N_NO2, O_NO + 2*O2_ambient === O_NO_rem + 2*O_NO2.
 */
export function stepOpenMouthNoOxidation(
  noMoles: number,
  dt_s: number,
  options: {
    isSealed?: boolean;
    plumeVolume_L?: number;
    temperature_c?: number;
    pressure_atm?: number;
    oxygenFraction?: number;
  } = {},
): NoOxidationStepResult {
  const no0 = Number.isFinite(noMoles) && noMoles > 0 ? noMoles : 0;
  const zero: NoOxidationStepResult = {
    noInitial_mol: no0,
    noRemaining_mol: no0,
    no2Formed_mol: 0,
    ambientO2Consumed_mol: 0,
    noRemaining_g: no0 * MOLAR_MASS_NO,
    no2Formed_g: 0,
    ambientO2Consumed_g: 0,
    conversionFraction: 0,
  };
  if (options.isSealed || !(no0 > 0) || !Number.isFinite(dt_s) || dt_s <= 0) return zero;
  const yO2 = options.oxygenFraction ?? DEFAULT_LAB_ENVIRONMENT.oxygenFraction;
  const pressure_atm = options.pressure_atm ?? DEFAULT_LAB_ENVIRONMENT.pressure_atm;
  const kelvin = (options.temperature_c ?? DEFAULT_LAB_ENVIRONMENT.temperature_c) + 273.15;
  const volume_L = options.plumeVolume_L ?? 0.05; // 50 mL characteristic neck/mouth mixing zone
  if (![yO2, pressure_atm, kelvin, volume_L].every(Number.isFinite) || yO2 <= 0 || pressure_atm <= 0 || kelvin <= 0 || volume_L <= 0) {
    return zero;
  }

  const cO2_M = (yO2 * pressure_atm) / (IDEAL_GAS_R_L_ATM * kelvin);
  const cNo0_M = no0 / volume_L;
  // Solution to d[NO]/dt = -2 * k * [O2] * [NO]^2:
  // [NO](t) = [NO]_0 / (1 + 2 * k * [O2] * [NO]_0 * t)
  const factor = 2 * NO_OXIDATION_K_L2_MOL2_S * cO2_M * cNo0_M * dt_s;
  const cNo_M = cNo0_M / (1 + factor);
  const noRemaining_mol = Math.max(0, Math.min(no0, cNo_M * volume_L));
  const no2Formed_mol = Math.max(0, no0 - noRemaining_mol);
  const ambientO2Consumed_mol = no2Formed_mol / 2;

  return {
    noInitial_mol: no0,
    noRemaining_mol,
    no2Formed_mol,
    ambientO2Consumed_mol,
    noRemaining_g: noRemaining_mol * MOLAR_MASS_NO,
    no2Formed_g: no2Formed_mol * MOLAR_MASS_NO2,
    ambientO2Consumed_g: ambientO2Consumed_mol * MOLAR_MASS_O2,
    conversionFraction: no0 > 0 ? no2Formed_mol / no0 : 0,
  };
}

/**
 * Applies open-mouth atmospheric oxidation to the finite escaped NO ledger on
 * an open vessel, turning colorless escaped NO into reddish-brown NO2 while
 * preserving exact elemental N conservation and accounting for ambient O2 intake.
 */
export function oxidizeEscapedNoGas(
  vessel: VesselState,
  dt_s: number,
): { patch: Partial<VesselState>; result: NoOxidationStepResult } | null {
  if (vessel.isSealed || vessel.isShattered) return null;
  const escapedNo_g = vessel.escapedGas_g?.NO ?? 0;
  if (!(escapedNo_g > 1e-12)) return null;
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...vessel.environment, ...vessel.effectsEnvironment };
  const result = stepOpenMouthNoOxidation(escapedNo_g / MOLAR_MASS_NO, dt_s, {
    isSealed: vessel.isSealed,
    plumeVolume_L: Math.max(0.01, (vessel.capacity_ml || 100) / 1000 * 0.5),
    temperature_c: env.temperature_c,
    pressure_atm: env.pressure_atm,
    oxygenFraction: env.oxygenFraction,
  });
  if (!(result.no2Formed_g > 1e-15)) return null;
  const nextEscaped = { ...vessel.escapedGas_g };
  nextEscaped.NO = result.noRemaining_g;
  nextEscaped.NO2 = (nextEscaped.NO2 ?? 0) + result.no2Formed_g;
  return {
    patch: {
      escapedGas_g: nextEscaped,
      gasColor: '#b45309', // Reddish-brown NO2 plume once atmospheric oxidation progresses
    },
    result,
  };
}
