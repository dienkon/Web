import { waterSaturationTemperatureC } from './waterSaturation';

/** Room conditions used by the virtual lab. No moisture/air oxidation solver is implied. */
export interface LabEnvironment {
  temperature_c: number;
  pressure_atm: number;
  oxygenFraction: number;
  airSpeed_m_s: number;
  relativeHumidity?: number; // 0–1; legacy snapshots default to 0.5
}

export const DEFAULT_LAB_ENVIRONMENT: LabEnvironment = {
  temperature_c: 25, pressure_atm: 1, oxygenFraction: 0.2095, airSpeed_m_s: 0.1, relativeHumidity: 0.5,
};

/** Pure-water equilibrium from the same IAPWS curve as vapor pressure and
 * dew point. Saturation-curve validity does not validate high-pressure heat
 * capacity/latent-heat/transport approximations elsewhere in the lab. */
export function waterBoilingPointAtPressure(pressure_atm = 1): number {
  return waterSaturationTemperatureC(pressure_atm * 101325);
}
