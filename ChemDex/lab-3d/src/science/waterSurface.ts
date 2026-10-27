import type { VesselState } from '../types/chemistry';
import { aqueousWaterBoundary } from './aqueousWaterBoundary';
import { contourRadius, liquidLevelForVolume, vesselInterior } from './vesselDimensions';
import { METERS_PER_SCENE_UNIT } from './sceneUnits';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from './waterSaturation';
import { waterPlumeState } from './moistAirFog';
export { waterSaturationPressurePa } from './waterSaturation';

/** Invert the same saturation curve. Below 0 °C is outside this liquid-water model. */
export function waterDewPointC(temperature_c: number, relativeHumidity: number): number {
  if (![temperature_c, relativeHumidity].every(Number.isFinite) || temperature_c < 0 || temperature_c > 373.946
    || relativeHumidity < 0 || relativeHumidity > 1) return NaN;
  const p = waterSaturationPressurePa(temperature_c) * relativeHumidity;
  if (p < waterSaturationPressurePa(0)) return -Infinity;
  return Math.min(temperature_c, waterSaturationTemperatureC(p));
}

export function exposedWaterAreaM2(vessel: VesselState): number {
  if (vessel.isSealed || vessel.isShattered || !(vessel.volume_ml > 0)) return 0;
  const interior = vesselInterior(vessel.type);
  const y = liquidLevelForVolume(vessel.type, vessel.volume_ml, vessel.capacity_ml);
  // Narrow mouths constrain exchange even when the liquid surface is wider.
  const radius = Math.min(contourRadius(interior.points, y), contourRadius(interior.points, interior.topY));
  return Math.PI * (radius * METERS_PER_SCENE_UNIT) ** 2;
}

/** Deliberately restricted to water / dilute, nonvolatile aqueous solutes.
 * No water-activity model for concentrated acids or mixed volatile solvents. */
export function supportsWaterSurface(vessel: VesselState): boolean {
  const boundary = aqueousWaterBoundary(vessel);
  return boundary.water_g > 0 && boundary.activity !== undefined;
}

/** Pressure-driven film closure: hm * Δp/(Rv*Tfilm). Both pressures are
 * converted at one mean film temperature, preserving zero flux at equal
 * partial pressures even when wall/gas temperatures differ. Positive means
 * evaporation. hm is illustrative; no Stefan flow/thermal diffusion/CFD. */
export function waterPressureDrivenFluxG_M2_S(surface_c: number, gas_c: number, gasWaterPressure_Pa: number, speed: number, activity = 1): number {
  if (![surface_c, gas_c, gasWaterPressure_Pa, speed, activity].every(Number.isFinite) || activity < 0 || activity > 1 || surface_c < 0 || surface_c > 373.946
    || gas_c <= -273.15 || gasWaterPressure_Pa < 0 || speed < 0) return 0;
  const filmKelvin = (surface_c + gas_c) / 2 + 273.15;
  return 1000 * (0.002 + 0.006 * Math.sqrt(speed))
    * (activity * waterSaturationPressurePa(surface_c) - gasWaterPressure_Pa) / (461.5 * filmKelvin);
}

/** Water/ambient-air wrapper. Below-zero air requires an ice/supercooled
 * humidity reference, which is outside the liquid-water model. */
export function waterMassFluxG_M2_S(surface_c: number, air_c: number, rh: number, speed: number, activity = 1): number {
  if (![air_c, rh].every(Number.isFinite) || air_c < 0 || air_c > 373.946 || rh < 0 || rh > 1) return 0;
  return waterPressureDrivenFluxG_M2_S(surface_c, air_c, rh * waterSaturationPressurePa(air_c), speed, activity);
}

/** A plume represents condensed droplets, never transparent water vapor.
 * Test a continuum of mixing fractions at equal pressure, using moist-air
 * humidity ratio and enthalpy. Supersaturation authorizes visible mist. */
export function waterPlumeVisibility(surface_c: number, ambient_c: number, rh: number, pressure_atm = 1,
  sourceWaterPressure_Pa?: number, sourceWaterEnthalpy_J_g?: number): number {
  return waterPlumeState(surface_c, ambient_c, rh, pressure_atm, sourceWaterPressure_Pa, sourceWaterEnthalpy_J_g).visibility;
}
