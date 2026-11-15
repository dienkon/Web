import type { AutoExperiment } from './AutoExperiment';
import { getVesselProfile } from '../../pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { vesselLocalToWorld } from '../../science/vesselScale';
import { CENTIMETERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import type { VesselState } from '../../types/chemistry';

const syringeSizes = new Map<number, { radius: number; length: number }>();
export function gasSyringeSize(moles: number) {
  let size = syringeSizes.get(moles);
  if (!size) {
    const cmPerUnit = CENTIMETERS_PER_SCENE_UNIT;
    const radius = Math.cbrt(gasVolumeMl(moles) / (5 * Math.PI * cmPerUnit ** 3));
    size = { radius, length: radius * 5 }; syringeSizes.set(moles, size);
  }
  return size;
}
export const gasSourceHome = (ordinal: number, moles = 0.001): [number, number, number] => [-3.6,
  Math.max(0.68, gasSyringeSize(moles).radius + 0.14), -1.6 - ordinal * 1.65];
export function gasPort(ordinal: number, vessel?: VesselState): [number, number, number] {
  const point: [number, number, number] = [ordinal % 2 ? -0.4 : 0.4, 1.16, 0.08 + Math.floor(ordinal / 2) * 0.2];
  return vessel ? vesselLocalToWorld(vessel, point) : [point[0], point[1] + 1.04, point[2]];
}
export function gasInlet(e: AutoExperiment, ordinal: number): [number, number, number] {
  const profile = getVesselProfile(e.sample.type, e.sample.capacity_ml), surface = vesselLiquidSurfaceY(e.sample);
  return vesselLocalToWorld(e.sample, [ordinal % 2 ? -0.4 : 0.4,
    e.sample.volume_ml > 0.2 ? Math.max(profile.baseY + 0.015, Math.min(profile.baseY + 0.12, surface - 0.08)) : 0.44,
    0.08 + Math.floor(ordinal / 2) * 0.2]);
}
export const gasVolumeMl = (moles: number, temperature_c = 25, pressure_atm = 1) => Math.max(0, moles) * 82.057366 * (temperature_c + 273.15) / pressure_atm;
export function inverseDoseFraction(fraction: number) {
  let low = 0, high = 1;
  for (let i = 0; i < 18; i++) { const x = (low + high) / 2; if (x * x * (3 - 2 * x) < fraction) low = x; else high = x; }
  return (low + high) / 2;
}
