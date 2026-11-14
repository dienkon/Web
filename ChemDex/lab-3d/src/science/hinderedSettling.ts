import type { PrecipitateProfile } from '../simulation/core/SimulationTypes';

export interface SettlingHindrance {
  model: 'low-re-equivalent-spheres' | 'isolated-particle';
  factor: number;
  volumeFraction: number;
  reynolds: number;
  peclet: number;
  exponent: number | null;
  limit: 'unsupported-morphology' | 'outside-low-re' | 'dense-extrapolation' | 'invalid-input' | null;
}

/** Explicit equivalent-sphere closure, not a measured property of a chemical.
 * A porous floc/gel or a crystal plate cannot use solid volume as excluded volume. */
export function supportsCompactHindrance(profile: PrecipitateProfile) {
  return profile.modelBasis !== 'generic_fallback'
    && (profile.morphology === 'fine_powder' || profile.morphology === 'granular');
}

/** Brzinski & Durian, Phys. Rev. Fluids 3, 124303 (2018), eqs. 1–4 and
 * experimental fit H(phi)=(1-phi)^n. Re and Pe use particle RADIUS and Stokes
 * speed as in that paper, not glyph dimensions or the hindered slip itself.
 * https://doi.org/10.1103/PhysRevFluids.3.124303
 * The paper's hard, equal-size, low-Re spheres are an explicitly declared
 * approximation for compact precipitates; these are not floc measurements. */
export function settlingHindrance(radius_m: number, solidDensity_kg_m3: number,
  fluidDensity_kg_m3: number, viscosity_Pa_s: number, temperature_c: number,
  solidVolume_ml: number, liquidVolume_ml: number, compact = true): SettlingHindrance {
  const result: SettlingHindrance = { model: 'isolated-particle', factor: 1, volumeFraction: 0,
    reynolds: 0, peclet: 0, exponent: null, limit: null };
  if (![radius_m, solidDensity_kg_m3, fluidDensity_kg_m3, viscosity_Pa_s, temperature_c,
    solidVolume_ml, liquidVolume_ml].every(Number.isFinite) || !(radius_m > 0)
    || !(solidDensity_kg_m3 > 0) || !(fluidDensity_kg_m3 > 0) || !(viscosity_Pa_s > 0)
    || temperature_c <= -273.15 || solidVolume_ml < 0 || !(liquidVolume_ml > 0)) {
    return { ...result, limit: 'invalid-input' };
  }
  // App volume_ml is carrier-liquid volume, so the suspension volume includes
  // the compact grains. Packed bed/pore volume must never enter this fraction.
  result.volumeFraction = solidVolume_ml / (liquidVolume_ml + solidVolume_ml);
  const delta = Math.abs(solidDensity_kg_m3 - fluidDensity_kg_m3);
  const stokes = 2 * delta * 9.80665 * radius_m ** 2 / (9 * viscosity_Pa_s);
  result.reynolds = fluidDensity_kg_m3 * stokes * radius_m / viscosity_Pa_s;
  result.peclet = 4 * Math.PI * delta * 9.80665 * radius_m ** 4
    / (3 * 1.380649e-23 * (temperature_c + 273.15));
  if (!compact) return { ...result, limit: 'unsupported-morphology' };
  // Re<=0.1 (radius basis) is the declared creeping-flow domain. Finite-Re
  // isolated drag remains available outside it; no unchecked RZ extrapolation.
  if (result.reynolds > 0.1) return { ...result, limit: 'outside-low-re' };
  result.model = 'low-re-equivalent-spheres';
  result.exponent = result.peclet < 1e8 ? 5.6 : 4.48;
  result.factor = Math.exp(result.exponent * Math.log1p(-result.volumeFraction));
  // Continue monotonically for dense input without claiming a consolidation
  // model near packing. Caller diagnostics expose this out-of-domain estimate.
  if (result.volumeFraction > 0.4) result.limit = 'dense-extrapolation';
  return result;
}
