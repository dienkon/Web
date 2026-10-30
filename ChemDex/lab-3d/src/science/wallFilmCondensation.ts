import { WATER_CP_J_G_K as cp } from '../engine/waterProperties';
import { waterPressureDrivenFluxG_M2_S } from './waterSurface';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from './waterSaturation';
import type { WallEvaporationBoundary } from './wallFilmEvaporation';

export interface WallCondensationBoundary extends WallEvaporationBoundary {
  regionArea_m2: number;
  dryWallTemperature_c: number;
  vaporSpecificEnthalpy_J_g: number;
  availableVapor_g?: number; // undefined = open room reservoir
}

/** Vapor deposited onto EXISTING finite water, between conductive steps.
 * (M0+m) Cp T = M0 Cp T0 + m h_in. The warming liquid reduces the
 * pressure-driven flux until dewpoint or the finite vapor supply is reached.
 * Bare-glass nucleation/heat rejection is a separate explicit boundary. */
export function condenseWallFilm(p: { mass_g: number; temperature_c: number; area_m2: number;
  dt: number; boundary: WallEvaporationBoundary; vaporSpecificEnthalpy_J_g: number; availableVapor_g?: number }) {
  const unchanged = { valid: false, condensed_g: 0, temperature_c: p.temperature_c, receivedVaporEnergy_J: 0,
    reason: 'unsupported' };
  const b = p.boundary, available = p.availableVapor_g ?? Infinity, hv = p.vaporSpecificEnthalpy_J_g;
  if (![p.mass_g, p.temperature_c, p.area_m2, p.dt, hv, b.gasTemperature_c, b.waterPressure_Pa, b.airSpeed_m_s].every(Number.isFinite)
    || p.mass_g < 0 || p.area_m2 < 0 || p.dt < 0 || p.temperature_c < 0 || p.temperature_c >= 373.946
    || b.gasTemperature_c <= -273.15 || b.waterPressure_Pa < 0 || b.airSpeed_m_s < 0
    || available < 0 || Number.isNaN(available) || p.availableVapor_g !== undefined && !Number.isFinite(available)) return unchanged;
  if (p.mass_g === 0 || p.area_m2 === 0 || p.dt === 0 || available === 0
    || b.waterPressure_Pa <= waterSaturationPressurePa(p.temperature_c)) return { ...unchanged, valid: true, reason: 'no-condensation' };
  const dew = waterSaturationTemperatureC(b.waterPressure_Pa);
  if (!Number.isFinite(dew) || dew >= 373.946 || !(hv > cp * dew)) return { ...unchanged, reason: 'unsupported-dewpoint-or-vapor-enthalpy' };
  const maximum = p.mass_g * cp * (dew - p.temperature_c) / (hv - cp * dew);
  if (!(maximum > 0) || !Number.isFinite(maximum)) return unchanged;
  const temperatureAt = (mass: number) => p.temperature_c + mass * (hv - cp * p.temperature_c) / (cp * (p.mass_g + mass));
  const fluxAt = (mass: number) => p.area_m2 * Math.max(0, -waterPressureDrivenFluxG_M2_S(
    temperatureAt(mass), b.gasTemperature_c, b.waterPressure_Pa, b.airSpeed_m_s));
  const finish = (mass: number, reason: string) => ({ valid: true, condensed_g: mass,
    temperature_c: temperatureAt(mass), receivedVaporEnergy_J: mass * hv, reason });
  // Flux decreases as the film warms. This lower bound proves a finite
  // inventory is exhausted without integrating an imaginary remaining stream.
  if (available < maximum && fluxAt(available) * p.dt >= available) return finish(available, 'vapor-inventory');
  const rate = (z: number) => z >= 1 - 2e-11 ? 0 : z < 0 || z > 1 + 1e-8 ? NaN : fluxAt(z * maximum) / maximum;
  const rk = (z: number, h: number) => {
    const a = rate(z), c = rate(z + h * a / 2), d = rate(z + h * c / 2), e = rate(z + h * d);
    return z + h * (a + 2 * c + 2 * d + e) / 6;
  };
  let z = 0, time = 0, h = p.dt;
  for (let iteration = 0; time < p.dt && iteration < 256; iteration++) {
    h = Math.min(h, p.dt - time); if (!(h > 0) || time + h === time) return unchanged;
    const full = rk(z, h), half = rk(rk(z, h / 2), h / 2);
    const error = Number.isFinite(full) && Number.isFinite(half) && half <= 1 + 1e-9 ? Math.abs(half - full) / (15 * 1e-11) : Infinity;
    if (error <= 1) { z = half + (half - full) / 15; time += h; }
    h *= error === 0 ? 5 : Math.max(0.2, Math.min(5, 0.9 * error ** -0.2));
  }
  if (time < p.dt || !Number.isFinite(z)) return unchanged;
  const mass = Math.min(available, maximum * Math.max(0, Math.min(1, z)));
  return finish(mass, mass === available ? 'vapor-inventory' : z >= 1 - 2e-11 ? 'dewpoint' : 'none');
}
