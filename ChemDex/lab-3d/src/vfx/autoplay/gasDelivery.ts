import type { AutoExperiment } from './AutoExperiment';
import { getVesselProfile } from '../../pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';

const syringeSizes = new Map<number, { radius: number; length: number }>();
export function gasSyringeSize(moles: number) {
  let size = syringeSizes.get(moles);
  if (!size) {
    const cmPerUnit = getVesselProfile('beaker', 100).sceneScale;
    const radius = Math.cbrt(gasVolumeMl(moles) / (5 * Math.PI * cmPerUnit ** 3));
    size = { radius, length: radius * 5 }; syringeSizes.set(moles, size);
  }
  return size;
}
export const gasSourceHome = (ordinal: number, moles = 0.001): [number, number, number] => [-3.6,
  Math.max(0.68, gasSyringeSize(moles).radius + 0.14), -1.6 - ordinal * 1.65];
export function gasPort(ordinal: number): [number, number, number] { return [ordinal % 2 ? -0.4 : 0.4, 2.2, 0.08 + Math.floor(ordinal / 2) * 0.2]; }
export function gasInlet(e: AutoExperiment, ordinal: number): [number, number, number] {
  const p = gasPort(ordinal), profile = getVesselProfile('beaker', 100), surface = vesselLiquidSurfaceY(e.sample);
  return [p[0], e.sample.volume_ml > 0.2 ? 1.04 + Math.max(profile.baseY + 0.015, Math.min(profile.baseY + 0.12, surface - 0.08)) : 1.48, p[2]];
}
export const gasVolumeMl = (moles: number, temperature_c = 25, pressure_atm = 1) => Math.max(0, moles) * 82.057366 * (temperature_c + 273.15) / pressure_atm;
export function inverseDoseFraction(fraction: number) {
  let low = 0, high = 1;
  for (let i = 0; i < 18; i++) { const x = (low + high) / 2; if (x * x * (3 - 2 * x) < fraction) low = x; else high = x; }
  return (low + high) / 2;
}
