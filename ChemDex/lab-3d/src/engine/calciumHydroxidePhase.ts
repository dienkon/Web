import type { VesselState } from '../types/chemistry';
import { sameMolecularFormula, identifySpecies } from '../science/speciesIdentity';
import { solveAqueousEquilibrium, aqueousModelFields } from '../science/aqueousEquilibrium';
import { aqueousConstantsAtTemperature, waterDissociationEnthalpy_J_mol } from '../science/aqueousTemperature';
import { applyThermalEnergy } from './thermalState';

/** WATEQ4F portlandite acid dissolution log K=22.8, dH=-31 kcal/mol.
 * Water/Ca(OH)2 with supported strong-base/common-ion salts; ideal activities.
 * Rate is illustrative; no thermal or gas-transfer calibration is claimed. */
export const PORTLANDITE_KSP_25C = 10 ** -5.2;
export function portlanditeDissolutionEnthalpy_J_mol(temperature_c: number): number | null {
  const waterEnthalpy = waterDissociationEnthalpy_J_mol(temperature_c);
  return waterEnthalpy === null ? null : -31 * 4184 + 2 * waterEnthalpy;
}
export function portlanditeKspAtTemperature(temperature_c: number): number | null {
  const constants = aqueousConstantsAtTemperature(temperature_c);
  if (!constants) return null;
  const acidDissolution = 10 ** 22.8 * Math.exp(-31 * 4184 / 8.314462618
    * (1 / 298.15 - 1 / (temperature_c + 273.15)));
  return acidDissolution * constants.waterKw ** 2;
}
export function partitionCalciumHydroxide(v: VesselState, dt: number): Partial<VesselState> | null {
  const ksp = portlanditeKspAtTemperature(v.temperature_c);
  const kw = aqueousConstantsAtTemperature(v.temperature_c)?.waterKw;
  if (ksp === null || kw === undefined || !(dt > 0) || !Number.isFinite(dt)
    || !Number.isFinite(v.temperature_c) || !(v.volume_ml > 0) || !Number.isFinite(v.volume_ml)
    || v.isShattered || (v.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  const pool = v.contents.filter(c => sameMolecularFormula(c.formula, 'Ca(OH)2'));
  if (!pool.length || v.contents.some(c => !Number.isFinite(c.moles) || !Number.isFinite(c.mass_g)
    || c.moles < 0 || c.mass_g < 0 || (c.location && c.location !== 'bulk')
    || (c.moles > 0 && !(sameMolecularFormula(c.formula, 'H2O') && c.phase === 'l'
      || sameMolecularFormula(c.formula, 'Ca(OH)2') && ['s', 'aq'].includes(c.phase ?? '')
      || c.phase === 'aq' && ['NaOH', 'KOH', 'CaCl2', 'Ca(NO3)2', 'NaCl', 'KCl', 'NaNO3', 'KNO3']
        .includes(identifySpecies(c.formula).formula))))) return null;
  if (!v.contents.some(c => sameMolecularFormula(c.formula, 'H2O') && c.phase === 'l' && c.moles > 0)) return null;
  const total = pool.reduce((s, c) => s + c.moles, 0), mass = pool.reduce((s, c) => s + c.mass_g, 0);
  if (!(total > 0) || !(mass > 0)) return null;
  let calciumBackground = 0, baseBackground = 0;
  for (const c of v.contents) {
    const formula = identifySpecies(c.formula).formula;
    if (['CaCl2', 'Ca(NO3)2'].includes(formula)) calciumBackground += c.moles;
    if (['NaOH', 'KOH'].includes(formula)) baseBackground += c.moles;
  }
  // OH includes background alkalinity and water autoionization.
  let low = 0, high = total;
  const product = (n: number) => {
    const liters = v.volume_ml / 1000, alkalinity = (baseBackground + 2 * n) / liters;
    const oh = (alkalinity + Math.sqrt(alkalinity * alkalinity + 4 * kw)) / 2;
    return (calciumBackground + n) / liters * oh * oh;
  };
  // This phase transaction can consume only its own formula-unit pool.
  // Supersaturated background salts need a separate counterion ledger.
  if (product(0) > ksp * (1 + 1e-10)) return null;
  if (product(total) > ksp) {
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (product(mid) < ksp) low = mid; else high = mid;
    }
  } else low = high;
  const target = (low + high) / 2;
  const dissolved = pool.filter(c => c.phase === 'aq').reduce((s, c) => s + c.moles, 0);
  const difference = target - dissolved;
  if (difference === 0 || (target < total && Math.abs(difference) < Math.max(1e-15, total * 1e-10))) return null;
  const next = Math.abs(difference) <= Math.max(1e-15, total * 1e-8) ? target
    : dissolved + difference * -Math.expm1(-0.3 * dt);
  const dissolvedMass = mass * next / total, solidMass = mass - dissolvedMass;
  const contents = v.contents.filter(c => !sameMolecularFormula(c.formula, 'Ca(OH)2'));
  if (next > 0) contents.push({ formula: 'Ca(OH)2', phase: 'aq', moles: next, mass_g: dissolvedMass });
  if (next < total) contents.push({ formula: 'Ca(OH)2', phase: 's', moles: total - next, mass_g: solidMass, solidOrigin: 'precipitate' });
  const heat_J = -(next - dissolved) * portlanditeDissolutionEnthalpy_J_mol(v.temperature_c)!;
  const thermal = applyThermalEnergy({ ...v, contents }, heat_J);
  const finalContents = thermal.contents ?? contents;
  // Project only dissolved inventory at its post-thermal temperature.
  const equilibrium = solveAqueousEquilibrium(finalContents.filter(c => c.phase !== 's'),
    thermal.volume_ml, thermal.temperature_c);
  return { contents: finalContents, ...thermal, substances: [...new Set(finalContents.map(c => c.formula))],
    ...(equilibrium ? { ph: equilibrium.ph } : {}),
    ...aqueousModelFields(equilibrium), hasPrecipitate: solidMass > 1e-9,
    precipitateAmount_g: solidMass, precipitateSubstance: 'Ca(OH)2', precipitateColor: '#f8fafc',
    precipitateMorphology: 'FINE_POWDER', ...(solidMass <= 1e-9 ? { turbidity: 0 } : {}) };
}
