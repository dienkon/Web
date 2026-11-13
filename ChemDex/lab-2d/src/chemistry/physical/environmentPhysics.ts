/**
 * Atmospheric & Thermodynamic Lab Environment Physics (lab-3d parity).
 * Implements IAPWS SR1-86(1992) saturation vapor pressure curve, bisection saturation
 * temperature T_sat(P), Magnus/IAPWS dew point, Reynolds-Sherwood airspeed-coupled
 * convective evaporation & cooling, and oxygen-gated combustion support.
 */

export interface LabEnvironment {
  temperature_c: number;
  pressure_atm: number;
  oxygenFraction: number;
  airSpeed_m_s: number;
  relativeHumidity: number;
}

export const DEFAULT_LAB_ENVIRONMENT: LabEnvironment = {
  temperature_c: 25,
  pressure_atm: 1.0,
  oxygenFraction: 0.2095,
  airSpeed_m_s: 0.1,
  relativeHumidity: 0.5,
};

const T_CRIT_K = 647.096;
const P_CRIT_PA = 22.064e6;
const cachedSatTemps = new Map<number, number>();

/** IAPWS SR1-86(1992) liquid-water saturation vapor pressure in Pascals. */
export function waterSaturationPressurePa(temperature_c: number): number {
  const safeT = Number.isFinite(temperature_c) ? temperature_c : 25;
  const k = Math.max(273.16, Math.min(T_CRIT_K, safeT + 273.15));
  const tau = 1 - k / T_CRIT_K;
  const sum =
    -7.85951783 * tau +
    1.84408259 * tau ** 1.5 -
    11.7866497 * tau ** 3 +
    22.6807411 * tau ** 3.5 -
    15.9618719 * tau ** 4 +
    1.80122502 * tau ** 7.5;
  return P_CRIT_PA * Math.exp((T_CRIT_K / k) * sum);
}

/** Exact inverse of IAPWS saturation curve in °C. */
export function waterSaturationTemperatureC(pressure_Pa: number): number {
  if (
    !Number.isFinite(pressure_Pa) ||
    pressure_Pa < waterSaturationPressurePa(0.01) ||
    pressure_Pa > P_CRIT_PA
  ) {
    return NaN;
  }
  if (pressure_Pa === P_CRIT_PA) return 373.946;
  const key = Math.round(pressure_Pa * 10);
  const cached = cachedSatTemps.get(key);
  if (cached !== undefined) return cached;

  let low = 0.01;
  let high = 373.946;
  for (let i = 0; i < 44; i++) {
    const mid = (low + high) / 2;
    if (waterSaturationPressurePa(mid) > pressure_Pa) high = mid;
    else low = mid;
  }
  const root = (low + high) / 2;
  if (cachedSatTemps.size >= 64) {
    const first = cachedSatTemps.keys().next().value;
    if (first !== undefined) cachedSatTemps.delete(first);
  }
  cachedSatTemps.set(key, root);
  return root;
}

/** Pure-water boiling point in °C at given atmospheric pressure in atm. */
export function waterBoilingPointAtPressure(pressure_atm = 1.0): number {
  const clampedP = Math.max(0.25, Math.min(3.0, Number.isFinite(pressure_atm) ? pressure_atm : 1.0));
  const root = waterSaturationTemperatureC(clampedP * 101325);
  return Number.isFinite(root) ? root : 100.0;
}

/** Ambient dew point temperature in °C from IAPWS saturation pressure & relative humidity (0..1). */
export function waterDewPointC(temperature_c: number, relativeHumidity: number): number {
  const rh = Math.max(0.01, Math.min(1.0, relativeHumidity));
  const p = waterSaturationPressurePa(temperature_c) * rh;
  if (p <= waterSaturationPressurePa(0.01)) return 0.01;
  return Math.min(temperature_c, waterSaturationTemperatureC(p));
}

/**
 * Pressure-driven evaporative water flux (g / m²·s) scaled by fume-hood airflow speed.
 * Mirrors lab-3d's `waterPressureDrivenFluxG_M2_S` without humidifying above 100% RH.
 */
export function waterMassFluxG_M2_S(
  surface_c: number,
  ambient_c: number,
  relativeHumidity: number,
  airSpeed_m_s: number,
  waterActivity = 1.0
): number {
  const rh = Math.max(0, Math.min(1, relativeHumidity));
  const speed = Math.max(0, airSpeed_m_s);
  const pAmbient = rh * waterSaturationPressurePa(ambient_c);
  const pSurf = Math.max(0, Math.min(1, waterActivity)) * waterSaturationPressurePa(surface_c);
  const filmKelvin = (surface_c + ambient_c) / 2 + 273.15;
  const hm = 0.002 + 0.006 * Math.sqrt(speed);
  return Math.max(0, (1000 * hm * (pSurf - pAmbient)) / (461.5 * filmKelvin));
}

/** Convective Newton cooling coefficient (W/K) accounting for forced airspeed in fume hood. */
export function convectiveCoolingCoefW_K(volume_ml: number, airSpeed_m_s = 0.1): number {
  const baseCoef = volume_ml > 1 ? 0.35 : 0.18;
  const airFactor = 1 + Math.max(0, airSpeed_m_s) * 0.9;
  return baseCoef * airFactor;
}

/** Visible steam mist density (0..1) when warm moist air mixes into colder or more humid lab air. */
export function computeVaporPlumeVisibility(liquidTemp_c: number, env: LabEnvironment): number {
  if (liquidTemp_c <= env.temperature_c + 12) return 0;
  const excess = liquidTemp_c - env.temperature_c;
  const humidityBoost = 0.55 + 0.75 * Math.max(0, Math.min(1, env.relativeHumidity));
  const coldRoomBoost = env.temperature_c < 18 ? 1.25 : 1.0;
  return Math.min(1, Math.max(0, (excess - 12) / 55) * humidityBoost * coldRoomBoost);
}

/** Returns true if the surrounding gas contains enough oxygen to sustain flame/combustion. */
export function isOxygenSupportingAtmosphere(env: LabEnvironment): boolean {
  return env.oxygenFraction >= 0.12;
}
