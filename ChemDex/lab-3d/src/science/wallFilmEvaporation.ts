import { WATER_CP_J_G_K as cp } from '../engine/waterProperties';
import { waterPressureDrivenFluxG_M2_S } from './waterSurface';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from './waterSaturation';
import { waterLatentHeatJ_G } from './waterThermodynamics';
import { wallDropCap } from './wallDropletGeometry';

export interface WallEvaporationBoundary { gasTemperature_c: number; waterPressure_Pa: number; airSpeed_m_s: number }

/** Adiabatic finite-film segment between conductive wall steps. Exposed caps
 * share a temperature with the retained film. At fixed contact angle all cap
 * cube roots shrink by the same exposure x: dx/dt=A(1g)*j(T)/3.
 * M Cp dT/dt=-L(T) dm_evap/dt. No isothermal latent source is supplied here.
 */
export function evaporateWallFilm(p: { masses_g: number[]; totalMass_g: number; temperature_c: number;
  dt: number; boundary: WallEvaporationBoundary }) {
  const unchanged = { valid: false, masses_g: [...p.masses_g], temperature_c: p.temperature_c,
    evaporated_g: 0, vaporEnergy_J: 0, vaporSensibleEnergy_J: 0, vaporTemperatureMass_c_g: 0,
    limitedBy: 'unsupported' as 'unsupported' | 'none' | 'equilibrium' | 'liquid-floor' };
  const b = p.boundary;
  if (![p.totalMass_g, p.temperature_c, p.dt, b.gasTemperature_c, b.waterPressure_Pa, b.airSpeed_m_s, ...p.masses_g].every(Number.isFinite)
    || p.totalMass_g < 0 || p.masses_g.some(m => m < 0) || p.temperature_c < 0 || p.temperature_c >= 373.946
    || p.dt < 0 || b.gasTemperature_c <= -273.15 || b.waterPressure_Pa < 0 || b.airSpeed_m_s < 0) return unchanged;
  const exposedMass = p.masses_g.reduce((s, m) => s + m, 0);
  if (exposedMass > p.totalMass_g * (1 + 64 * Number.EPSILON)) return unchanged;
  const floor = b.waterPressure_Pa <= waterSaturationPressurePa(0) ? 0
    : waterSaturationTemperatureC(b.waterPressure_Pa);
  if (p.dt === 0 || exposedMass === 0 || p.totalMass_g === 0 || p.temperature_c <= floor + 2e-9
    || b.waterPressure_Pa >= waterSaturationPressurePa(p.temperature_c)) {
    return { ...unchanged, valid: true, limitedBy: p.temperature_c <= floor + 2e-9
      ? floor === 0 && b.waterPressure_Pa < waterSaturationPressurePa(0) ? 'liquid-floor' as const : 'equilibrium' as const
      : 'none' as const };
  }
  const roots = p.masses_g.map(Math.cbrt), area1 = wallDropCap(1).surfaceArea_m2;
  const losses = (x: number) => roots.map((r, i) => {
    const d = Math.min(r, Math.max(0, x));
    return d >= r ? p.masses_g[i] : d * (3 * r * r - 3 * r * d + d * d);
  });
  // Track temperature DROP, not absolute T: a tiny exposed cap can cool a
  // much larger protected film by less than one ulp of absolute temperature.
  // The drop still has to supply the vapor's latent enthalpy.
  const maximumDrop = p.temperature_c - floor;
  // State [common cap exposure, temperature drop, integral(T_emission dm)].
  const rate = (s: number[]) => {
    const removed = losses(s[0]).reduce((a, c) => a + c, 0), mass = p.totalMass_g - removed;
    if (!(mass > 0) || !Number.isFinite(s[1]) || s[1] > maximumDrop + 1e-7) return [NaN, NaN, NaN];
    if (s[1] >= maximumDrop - 2e-9) return [0, 0, 0];
    const temperature = p.temperature_c - s[1];
    const flux = Math.max(0, waterPressureDrivenFluxG_M2_S(temperature, b.gasTemperature_c, b.waterPressure_Pa, b.airSpeed_m_s));
    const dx = area1 * flux / 3;
    const dm = 3 * roots.reduce((sum, r) => sum + Math.max(0, r - s[0]) ** 2, 0) * dx;
    return [dx, waterLatentHeatJ_G(temperature) * dm / (cp * mass), temperature * dm];
  };
  const rk = (s: number[], h: number) => {
    const add = (k: number[], f: number) => s.map((v, i) => v + h * f * k[i]);
    const a = rate(s), c = rate(add(a, 0.5)), d = rate(add(c, 0.5)), e = rate(add(d, 1));
    return s.map((v, i) => v + h * (a[i] + 2 * c[i] + 2 * d[i] + e[i]) / 6);
  };
  let s = [0, 0, 0], time = 0, h = p.dt;
  const scales = [Math.max(...roots), 1, p.totalMass_g * Math.max(1, p.temperature_c)];
  for (let iteration = 0; time < p.dt && iteration < 256; iteration++) {
    h = Math.min(h, p.dt - time); if (!(h > 0) || time + h === time) return unchanged;
    const full = rk(s, h), half = rk(rk(s, h / 2), h / 2);
    let error = Math.max(...half.map((v, i) => Math.abs(v - full[i]) / (15 * (i === 1 ? 1e-8 : scales[i] * 1e-11))));
    if (![...half, ...full].every(Number.isFinite) || half[1] > maximumDrop + 1e-8) error = Infinity;
    if (error <= 1) {
      s = half.map((v, i) => v + (v - full[i]) / 15); time += h;
    }
    h *= error === 0 ? 5 : Math.max(0.2, Math.min(5, 0.9 * error ** -0.2));
  }
  if (time < p.dt || !s.every(Number.isFinite) || s[1] > maximumDrop + 1e-7) return unchanged;
  const removed = losses(s[0]), mass = removed.reduce((a, c) => a + c, 0);
  const drop = Math.max(0, Math.min(maximumDrop, s[1]));
  const temperature = p.temperature_c - drop;
  const moment = Math.min(mass * p.temperature_c, Math.max(mass * temperature, s[2]));
  // Stable exact stored-energy difference; no latent credit from the room.
  const energy = cp * (p.totalMass_g * drop + mass * temperature);
  return { valid: true, masses_g: p.masses_g.map((m, i) => Math.max(0, m - removed[i])), temperature_c: temperature,
    evaporated_g: mass, vaporEnergy_J: energy, vaporSensibleEnergy_J: cp * moment,
    vaporTemperatureMass_c_g: moment,
    limitedBy: temperature <= floor + 2e-9 ? floor === 0 ? 'liquid-floor' as const : 'equilibrium' as const : 'none' as const };
}
