import type { VesselState } from '../types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT } from './labEnvironment';
import { SODIUM_WATER_DH_KJ } from './thermochemistry';

export const SODIUM_MOLAR_MASS = 22.990;
export const SODIUM_MELTING_C = 97.794;
export const SODIUM_DENSITY_G_ML = 0.971;

export function sodiumMetalMass(vessel: Pick<VesselState, 'contents'>): number {
  return (vessel.contents ?? []).filter(item => item.formula === 'Na' && (item.phase ?? item.state ?? 's') === 's')
    .reduce((sum, item) => sum + Math.max(0, item.mass_g), 0);
}

export function isSodiumWaterReaction(id?: string): boolean {
  return ['na_h2o', 'sodium_water', 'sodium_water_reaction', 'alkali_metal_water_na', 'Na+H2O', 'alkali_metal_water'].includes(id ?? '');
}

export function sodiumWaterContact(vessel: VesselState): boolean {
  return vessel.volume_ml > 0 && vessel.contents.some(item => item.formula === 'Na' && item.moles > 1e-12 && (!item.phase || item.phase === 's'))
    && vessel.contents.some(item => item.formula === 'H2O' && item.moles > 1e-12 && (!item.phase || item.phase === 'l'));
}

/** Visual timescale, not a measured kinetic constant: surface/volume scaling,
 * faster contact reaction in warmer water. Chemistry still limits every mole. */
export function sodiumReactionDuration(vessel: VesselState): number {
  const mass = vessel.contents.filter(item => item.formula === 'Na' && (!item.phase || item.phase === 's'))
    .reduce((sum, item) => sum + item.mass_g, 0);
  const temperatureFactor = Math.exp((vessel.temperature_c - 25) * 0.025);
  return Math.max(1.5, Math.min(25, 7 * Math.cbrt(Math.max(0.001, mass) / 0.1) / temperatureFactor));
}

/** Approximate local pellet heat budget, distinct from the vessel thermometer.
 * Retention is an illustrative heat-transfer parameter, not a sodium ignition point. */
export function sodiumPelletThermal(reactedMetalFraction: number, waterTemperature_c: number, airSpeed_m_s = 0.1) {
  // Fraction of initial Na consumed, NOT progress through the limiting-water
  // reaction. A trace of water cannot release the heat of consuming all Na.
  const p = Math.max(0, Math.min(1, reactedMetalFraction));
  const specificHeat = 1.23; // J/(g K), rounded room-temperature sodium
  const fusion = 113; // J/g, rounded sodium heat of fusion
  const retained_J_g = -SODIUM_WATER_DH_KJ * 500 / SODIUM_MOLAR_MASS * p * 0.035 / (1 + airSpeed_m_s);
  const toMelt = Math.max(0, SODIUM_MELTING_C - waterTemperature_c) * specificHeat;
  const meltFactor = Math.max(0, Math.min(1, (retained_J_g - toMelt) / fusion));
  const temperature_c = retained_J_g < toMelt ? waterTemperature_c + retained_J_g / specificHeat
    : SODIUM_MELTING_C + Math.max(0, retained_J_g - toMelt - fusion) / specificHeat;
  return { temperature_c, meltFactor };
}

/** Buoyant sphere center from submerged spherical-cap volume. Supports shallow
 * water by contacting the inner floor instead of levitating above it. */
export function floatingPelletCenter(surfaceY: number, floorY: number, radius: number, densityRatio = SODIUM_DENSITY_G_ML): number {
  let low = -1, high = 1;
  const ratio = Math.max(0, Math.min(1, densityRatio));
  for (let i = 0; i < 24; i++) {
    const offset = (low + high) / 2;
    const submerged = (1 - offset) ** 2 * (2 + offset) / 4;
    if (submerged > ratio) low = offset; else high = offset;
  }
  return Math.max(floorY + radius, surfaceY + (low + high) / 2 * radius);
}

export function sodiumCanBurn(vessel: VesselState, externalIgnition = false): boolean {
  const environment = vessel.environment ?? DEFAULT_LAB_ENVIRONMENT;
  return environment.oxygenFraction > 0 && (externalIgnition || vessel.ignitedProgramId === 'na_h2o');
}
