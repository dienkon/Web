import { waterSaturationPressurePa, waterSaturationTemperatureC } from './waterSaturation';
import { waterLatentHeatJ_G } from './waterThermodynamics';
import { WATER_CP_J_G_K as cp } from '../engine/waterProperties';

const AIR_CP = 1.006, VAPOR_CP = 1.86, MASS_RATIO = 0.621945;
const waterFraction = (partial: number, pressure: number) => MASS_RATIO * partial / (pressure - (1 - MASS_RATIO) * partial);

/** Same liquid Cp*T / saturation L(T) reference as emitted water packets.
 * Constant vapor Cp extends superheated gas above the total-pressure Tb. */
export function plumeWaterEnthalpyJ_G(temperature_c: number, pressure_Pa: number): number {
  const boiling = waterSaturationTemperatureC(pressure_Pa), reference = Math.min(temperature_c, boiling);
  if (!Number.isFinite(temperature_c) || temperature_c < 0 || !Number.isFinite(boiling) || boiling > 150) return NaN;
  return cp * reference + waterLatentHeatJ_G(reference) + VAPOR_CP * Math.max(0, temperature_c - boiling);
}

/** One kg (or g) of total mixture: dry air + all water, including droplets.
 * Ideal partial pressures; finite liquid water retains Cp*T enthalpy. This
 * projection diagnoses equilibrium fog, without changing vessel inventory. */
export function equilibrateMoistAirWater(totalWaterFraction: number, enthalpy_J_g: number, pressure_Pa: number) {
  const q = totalWaterFraction, dry = 1 - q, boiling = waterSaturationTemperatureC(pressure_Pa);
  const unavailable = { status: 'outside-model', condensateFraction: 0, vaporFraction: q,
    temperature_c: undefined as number | undefined, enthalpyResidual_J_g: undefined as number | undefined };
  if (![q, enthalpy_J_g, pressure_Pa, boiling].every(Number.isFinite) || q < 0 || q > 1
    || enthalpy_J_g < 0 || pressure_Pa <= 0 || boiling < 0 || boiling > 150) return unavailable;
  if (q === 0) return { ...unavailable, status: 'clear', temperature_c: enthalpy_J_g / AIR_CP };
  if (q === 1) {
    const liquidH = cp * boiling, vaporH = plumeWaterEnthalpyJ_G(boiling, pressure_Pa);
    if (enthalpy_J_g >= vaporH) return { ...unavailable, status: 'clear',
      temperature_c: boiling + (enthalpy_J_g - vaporH) / VAPOR_CP };
    const t = Math.min(boiling, enthalpy_J_g / cp);
    const vapor = enthalpy_J_g <= liquidH ? 0 : (enthalpy_J_g - liquidH) / (vaporH - liquidH);
    return { status: 'fog', condensateFraction: 1 - vapor, vaporFraction: vapor, temperature_c: t,
      enthalpyResidual_J_g: (1 - vapor) * cp * t + vapor * vaporH - enthalpy_J_g };
  }
  const partial = pressure_Pa * q / (MASS_RATIO + (1 - MASS_RATIO) * q);
  const dew = waterSaturationTemperatureC(partial);
  if (!Number.isFinite(dew)) return enthalpy_J_g >= q * waterLatentHeatJ_G(0)
    ? { ...unavailable, status: 'clear' } : unavailable;
  const dewH = dry * AIR_CP * dew + q * plumeWaterEnthalpyJ_G(dew, pressure_Pa);
  if (enthalpy_J_g >= dewH) return { ...unavailable, status: 'clear' };
  const at = (t: number) => {
    const saturation = waterSaturationPressurePa(t);
    const vapor = saturation >= pressure_Pa ? q : Math.min(q, dry * MASS_RATIO * saturation / (pressure_Pa - saturation));
    return { vapor, h: (dry * AIR_CP + q * cp) * t + vapor * waterLatentHeatJ_G(t) };
  };
  if (enthalpy_J_g < at(0).h) return unavailable;
  if (dry < 1e-3) {
    // Near pure steam, T -> vapor mass is ill-conditioned (P-p_sat is tiny).
    // Solve the vapor quality directly; partial pressure -> T stays bounded.
    const minimumVapor = at(0).vapor;
    const atVapor = (vapor: number) => {
      const t = vapor <= minimumVapor ? 0
        : waterSaturationTemperatureC(pressure_Pa * vapor / (MASS_RATIO * dry + vapor));
      return { t, h: (dry * AIR_CP + q * cp) * t + vapor * waterLatentHeatJ_G(t) };
    };
    let low = minimumVapor, high = q;
    for (let i = 0; i < 48; i++) {
      const mid = (low + high) / 2;
      if (atVapor(mid).h < enthalpy_J_g) low = mid; else high = mid;
    }
    const vapor = (low + high) / 2, final = atVapor(vapor);
    return { status: 'fog', condensateFraction: q - vapor, vaporFraction: vapor, temperature_c: final.t,
      enthalpyResidual_J_g: final.h - enthalpy_J_g };
  }
  let low = 0, high = dew;
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (at(mid).h < enthalpy_J_g) low = mid; else high = mid;
  }
  const temperature_c = (low + high) / 2, final = at(temperature_c);
  return { status: 'fog', condensateFraction: Math.max(0, q - final.vapor), vaporFraction: final.vapor,
    temperature_c, enthalpyResidual_J_g: final.h - enthalpy_J_g };
}

/** Adiabatic mass/enthalpy mixing at representative source-gas fractions.
 * q avoids the singular humidity-ratio denominator of pure steam: no invented
 * 1% carrier-air cap. Fog includes latent warming and retained liquid enthalpy.
 * ASHRAE Fundamentals Ch.1: adiabatic mixing and two-phase fog region. */
export function waterPlumeState(source_c: number, air_c: number, rh: number, pressure_atm = 1,
  sourceWaterPressure_Pa?: number, sourceWaterEnthalpy_J_g?: number) {
  const empty = { visibility: 0, peakCondensateFraction: 0, status: 'outside-model' };
  const pressure = pressure_atm * 101325, boiling = waterSaturationTemperatureC(pressure);
  if (![source_c, air_c, rh, pressure, boiling].every(Number.isFinite) || source_c < 0 || air_c < 0
    || air_c > boiling || boiling > 150 || rh < 0 || rh > 1 || pressure <= 0) return empty;
  const sourcePartial = sourceWaterPressure_Pa ?? (source_c >= boiling ? pressure : waterSaturationPressurePa(source_c));
  const airPartial = waterSaturationPressurePa(air_c) * rh;
  const sourceH = sourceWaterEnthalpy_J_g ?? plumeWaterEnthalpyJ_G(source_c, pressure);
  if (![sourcePartial, airPartial, sourceH].every(Number.isFinite) || sourcePartial < 0 || sourcePartial > pressure
    || airPartial < 0 || airPartial > pressure || sourceH < 0) return empty;
  const qSource = waterFraction(sourcePartial, pressure), qAir = waterFraction(airPartial, pressure);
  const hAir = (1 - qAir) * AIR_CP * air_c + qAir * plumeWaterEnthalpyJ_G(air_c, pressure);
  const hSource = (1 - qSource) * AIR_CP * source_c + qSource * sourceH;
  let peak = 0;
  for (let i = 1; i < 20; i++) {
    const f = i / 20, q = qAir + f * (qSource - qAir), h = hAir + f * (hSource - hAir);
    const state = equilibrateMoistAirWater(q, h, pressure);
    if (state.status === 'outside-model') continue;
    peak = Math.max(peak, state.condensateFraction);
  }
  return { visibility: Math.min(1, peak / 0.01), peakCondensateFraction: peak, status: 'liquid-equilibrium' };
}
