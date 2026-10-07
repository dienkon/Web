/**
 * THERMODYNAMICS AND ENERGY BALANCE ENGINE (§5.2)
 * - Antoine vapor pressure and boiling saturation temperature Tsat(P)
 * - Two-node thermal ODE: liquid temperature T and glass wall temperature Tg
 * - Latent heat sinks (evaporation and nucleate boiling)
 * - Enthalpy of reaction injection: sum(-dH * dXi/dt)
 * - Heat of dissolution: NaOH (exothermic), NH4NO3 (endothermic)
 * - Newtonian convective cooling to ambient air
 */

import { CONSTANTS, celsiusToKelvin, kelvinToCelsius, mmhgToPa, paToMmhg } from '../core/units';
import { AntoineParams } from './substances';

export interface ThermalODEState {
  liquidTemp_K: number;
  glassTemp_K: number;
  ambientTemp_K: number;
  liquidMass_kg: number;
  liquidCp_J_kgK: number;
  glassMass_kg: number;
  glassCp_J_kgK: number;
  outerArea_m2: number;
  innerArea_m2: number;
}

export interface ThermalDerivatives {
  dT_liquid_dt: number; // K/s
  dT_glass_dt: number;  // K/s
  boilingPower_W: number; // Power diverted to boiling latent heat
  heatLoss_W: number;   // Power lost to ambient air
}

/**
 * Computes vapor pressure in mmHg and Pa from Antoine equation:
 * log10(P_mmHg) = A - B / (C + T_C)
 */
export function calculateVaporPressure(
  antoine: AntoineParams,
  temp_K: number
): { p_mmHg: number; p_Pa: number } {
  const temp_C = kelvinToCelsius(temp_K);
  // Antoine valid range clamp
  const safeT = Math.max(-20, Math.min(250, temp_C));
  const logP = antoine.A - antoine.B / (antoine.C + safeT);
  const p_mmHg = Math.pow(10, logP);
  const p_Pa = mmhgToPa(p_mmHg);
  return { p_mmHg, p_Pa };
}

/**
 * Inverts Antoine equation to find saturation temperature Tsat in Kelvin at ambient pressure P
 * T_C = B / (A - log10(P_mmHg)) - C
 */
export function calculateSaturationTemp(
  antoine: AntoineParams,
  pressure_Pa: number = CONSTANTS.P_ATM
): number {
  const p_mmHg = paToMmhg(pressure_Pa);
  const logP = Math.log10(Math.max(1e-3, p_mmHg));
  const temp_C = antoine.B / (antoine.A - logP) - antoine.C;
  return celsiusToKelvin(temp_C);
}

/**
 * Evaluates the coupled two-node thermal ODE:
 * Node 1: Liquid contents
 * C_liquid * dT/dt = P_heater - U*A_in*(T - T_glass) - m_dot_evap * Lv + reactionHeat - dissolutionHeat
 *
 * Node 2: Glass vessel wall
 * C_glass * dT_glass/dt = U*A_in*(T - T_glass) - h*A_out*(T_glass - T_ambient)
 */
export function stepThermalODE(
  state: ThermalODEState,
  inputs: {
    heaterPower_W: number;      // Absorbed power from burner/hotplate
    reactionHeat_W: number;    // sum(-dH * dXi/dt) in Watts (J/s)
    dissolutionHeat_W: number; // Endothermic (+), exothermic (-)
    evaporationMassRate_kg_s: number;
    latentHeatVap_J_kg: number;
    tsat_K: number;
    convective_h_W_m2K?: number;
    internal_U_W_m2K?: number;
  },
  dt: number
): {
  newLiquidTemp_K: number;
  newGlassTemp_K: number;
  evaporatedMass_kg: number;
  boilingMass_kg: number;
  derivatives: ThermalDerivatives;
} {
  const {
    heaterPower_W,
    reactionHeat_W,
    dissolutionHeat_W,
    evaporationMassRate_kg_s,
    latentHeatVap_J_kg,
    tsat_K,
    convective_h_W_m2K = 12.0, // Natural convection still air: ~10-15 W/(m^2·K)
    internal_U_W_m2K = 450.0   // Liquid-to-glass heat transfer: ~400-600 W/(m^2·K)
  } = inputs;

  const C_liquid = Math.max(1.0, state.liquidMass_kg * state.liquidCp_J_kgK);
  const C_glass = Math.max(0.5, state.glassMass_kg * state.glassCp_J_kgK);

  const T_l = state.liquidTemp_K;
  const T_g = state.glassTemp_K;
  const T_amb = state.ambientTemp_K;

  // 1. Heat transfer rates
  const Q_liquid_to_glass = internal_U_W_m2K * state.innerArea_m2 * (T_l - T_g);
  const Q_glass_to_air = convective_h_W_m2K * state.outerArea_m2 * (T_g - T_amb);
  const Q_evap_cooling = evaporationMassRate_kg_s * latentHeatVap_J_kg;

  // 2. Net liquid thermal power
  let Q_net_liquid = heaterPower_W + reactionHeat_W - dissolutionHeat_W - Q_liquid_to_glass - Q_evap_cooling;

  let boilingPower_W = 0;
  let boilingMass_kg = 0;

  // 3. Nucleate Boiling Plateau check
  // Once liquid reaches Tsat (e.g. 373.15 K), extra net power is absorbed into latent heat!
  if (T_l >= tsat_K - 0.05 && Q_net_liquid > 0) {
    boilingPower_W = Q_net_liquid;
    boilingMass_kg = (boilingPower_W * dt) / latentHeatVap_J_kg;
    Q_net_liquid = 0; // Temperature is clamped at Tsat
  }

  // 4. Derivatives
  const dT_l_dt = Q_net_liquid / C_liquid;
  const dT_g_dt = (Q_liquid_to_glass - Q_glass_to_air) / C_glass;

  // 5. Semi-implicit Euler integration
  let newT_l = T_l + dT_l_dt * dt;
  const newT_g = T_g + dT_g_dt * dt;

  // Clamp boiling plateau
  if (newT_l > tsat_K) {
    const excessEnergy = (newT_l - tsat_K) * C_liquid;
    boilingMass_kg += excessEnergy / latentHeatVap_J_kg;
    newT_l = tsat_K;
  }

  return {
    newLiquidTemp_K: Math.max(state.ambientTemp_K - 5.0, newT_l),
    newGlassTemp_K: Math.max(state.ambientTemp_K - 5.0, newT_g),
    evaporatedMass_kg: evaporationMassRate_kg_s * dt,
    boilingMass_kg,
    derivatives: {
      dT_liquid_dt: dT_l_dt,
      dT_glass_dt: dT_g_dt,
      boilingPower_W,
      heatLoss_W: Q_glass_to_air
    }
  };
}

/**
 * Computes water density as a function of temperature T in Kelvin (0 to 100 °C)
 * Standard polynomial fit
 */
export function calculateWaterDensity(temp_K: number): number {
  const t = Math.max(0, Math.min(100, kelvinToCelsius(temp_K)));
  // Density of water in kg/m^3
  return 999.83952 + 16.945176 * t / (1 + 0.01687985 * t) - 7.9870401e-3 * t * t;
}

/**
 * Computes dynamic viscosity of water in Pa·s using Vogel-Fulcher-Tammann equation
 */
export function calculateWaterViscosity(temp_K: number): number {
  const t = Math.max(0.1, Math.min(100, kelvinToCelsius(temp_K)));
  // mu in Pa·s (milliPascal·s * 1e-3)
  const mu_mPa_s = 2.414e-2 * Math.pow(10, 247.8 / (t + 133.15));
  return mu_mPa_s * 1e-3;
}
