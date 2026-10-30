import { waterSaturationPressurePa } from './waterSaturation';
export { waterSaturationTemperatureC as saturationTemperatureC } from './waterSaturation';
import { waterSaturationTemperatureC as saturationTemperatureC } from './waterSaturation';
import { waterLatentHeatJ_G } from './waterThermodynamics';

/** A component stores K=P_component*R^3 in Pa m^3. K/T is proportional
 * to moles; the common 4pi/3 factor is restored when converting to mass. */
export interface BubbleGasInventory {
  vapor_Pa_m3: number;
  noncondensable_Pa_m3: number;
  temperature_c: number;
}

/** Single gas/liquid interface: P_inside=P_external+2sigma/R.
 * This is not the two-interface 4sigma/R soap-bubble equation. */
export function bubbleMechanicalRadius(gas_Pa_m3: number, externalPressure_Pa: number, surfaceTension_N_m: number): number {
  if (![gas_Pa_m3, externalPressure_Pa, surfaceTension_N_m].every(Number.isFinite)
    || gas_Pa_m3 <= 0 || externalPressure_Pa <= 0 || surfaceTension_N_m < 0) return 0;
  const upper = Math.cbrt(gas_Pa_m3 / externalPressure_Pa);
  if (surfaceTension_N_m === 0) return upper;
  let low = 0, high = upper;
  for (let i = 0; i < 40; i++) {
    const r = (low + high) / 2;
    if (externalPressure_Pa * r ** 3 + 2 * surfaceTension_N_m * r ** 2 > gas_Pa_m3) high = r; else low = r;
  }
  return (low + high) / 2;
}

/** Quasi-steady liquid conduction, Nu=2. No random deletion of a whole bubble.
 * The R² update freezes the driving subcooling over this small substep and
 * stops at the mixed-gas partial-pressure equilibrium. This is a reduced
 * thermal limit, not a solution of the transient heat/diffusion boundary layer. */
export function condenseBubbleVapor(gas: BubbleGasInventory, externalPressure_Pa: number,
  surfaceTension_N_m: number, liquidTemperature_c: number, dt: number,
  conductivity_W_m_K = 0.6, latentHeat_J_kg?: number) {
  const unchanged = { ...gas, condensedMass_kg: 0, latentHeat_J: 0 };
  if (![gas.vapor_Pa_m3, gas.noncondensable_Pa_m3, gas.temperature_c, externalPressure_Pa,
    surfaceTension_N_m, liquidTemperature_c, dt, conductivity_W_m_K].every(Number.isFinite)
    || gas.vapor_Pa_m3 <= 0 || gas.noncondensable_Pa_m3 < 0 || gas.temperature_c <= -273.15
    || externalPressure_Pa <= 0 || surfaceTension_N_m < 0 || liquidTemperature_c < 0 || liquidTemperature_c > 200
    || dt <= 0 || conductivity_W_m_K <= 0) return unchanged;
  const radius = bubbleMechanicalRadius(gas.vapor_Pa_m3 + gas.noncondensable_Pa_m3, externalPressure_Pa, surfaceTension_N_m);
  const partialPressure = gas.vapor_Pa_m3 / radius ** 3;
  const saturation = waterSaturationPressurePa(liquidTemperature_c);
  if (partialPressure <= saturation) return unchanged;
  const interface_c = saturationTemperatureC(partialPressure);
  if (!Number.isFinite(interface_c) || interface_c <= liquidTemperature_c) return unchanged;
  latentHeat_J_kg ??= waterLatentHeatJ_G(interface_c) * 1000;
  if (!Number.isFinite(latentHeat_J_kg) || latentHeat_J_kg <= 0) return unchanged;
  let equilibriumRadius = 0;
  if (gas.noncondensable_Pa_m3 > 0) {
    // f(0)<0 and f(R_initial)=K_v-p_sat*R_initial^3>0 in this
    // condensing state. This brackets the reachable smaller capillary root
    // even when P_external<=p_sat; no negative exterior-pressure shortcut.
    let low = 0, high = radius;
    for (let i = 0; i < 48; i++) {
      const r = (low + high) / 2;
      const excess = (externalPressure_Pa - saturation) * r ** 3
        + 2 * surfaceTension_N_m * r ** 2 - gas.noncondensable_Pa_m3;
      if (excess > 0) high = r; else low = r;
    }
    equilibriumRadius = (low + high) / 2;
  }
  const minimumVapor = saturation * equilibriumRadius ** 3;
  const kelvin = gas.temperature_c + 273.15;
  const effectiveDensity = (externalPressure_Pa + 4 * surfaceTension_N_m / (3 * radius)) / (461.5 * kelvin);
  const shrinkRate_m2_s = 2 * conductivity_W_m_K * (interface_c - liquidTemperature_c) / (effectiveDensity * latentHeat_J_kg);
  const newRadius = Math.sqrt(Math.max(equilibriumRadius ** 2, radius ** 2 - shrinkRate_m2_s * dt));
  const newTotal = externalPressure_Pa * newRadius ** 3 + 2 * surfaceTension_N_m * newRadius ** 2;
  const vapor = Math.min(gas.vapor_Pa_m3, Math.max(minimumVapor, newTotal - gas.noncondensable_Pa_m3));
  const condensedMass_kg = (gas.vapor_Pa_m3 - vapor) * (4 * Math.PI / 3) / (461.5 * kelvin);
  return { ...gas, vapor_Pa_m3: vapor, condensedMass_kg, latentHeat_J: condensedMass_kg * latentHeat_J_kg };
}
