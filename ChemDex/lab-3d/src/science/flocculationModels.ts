import type { PrecipitateProfile } from '../simulation/core/SimulationTypes';
import type { FlocculationModel } from './flocculation';

// Assumed mean-population coefficients; not inferred from reagent names, RGB,
// or the old dimensionless aggregationRate. Other solids keep their transport.
const hydroxides = new Set(['Cu(OH)2', 'Fe(OH)3', 'Al(OH)3', 'Zn(OH)2', 'Fe(OH)2',
  'Ni(OH)2', 'Co(OH)2', 'Mn(OH)2']);
const curds = new Set(['AgCl', 'AgBr', 'AgI', 'CuI']);
const hydroxide: FlocculationModel = Object.freeze({ basis: 'illustrative-mean-population',
  collisionEfficiency: 0.45, fractalDimension: 2.2, maxPrimaryCount: 32,
  criticalShear_s_1: 35, breakageRate_s_1: 0.25 });
const curd: FlocculationModel = Object.freeze({ basis: 'illustrative-mean-population',
  collisionEfficiency: 0.3, fractalDimension: 2.4, maxPrimaryCount: 24,
  criticalShear_s_1: 50, breakageRate_s_1: 0.2 });
export function getFlocculationModel(profile: PrecipitateProfile): FlocculationModel | null {
  if (profile.modelBasis === 'generic_fallback' || !['flocculent', 'gel_like'].includes(profile.morphology)) return null;
  return hydroxides.has(profile.id) ? hydroxide : curds.has(profile.id) ? curd : null;
}
