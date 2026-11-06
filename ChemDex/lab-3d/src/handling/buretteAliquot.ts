import type { ChemicalDefinition } from '../types/chemistry';
import type { LiquidAliquot } from './aliquot';
import { sameMolecularFormula } from '../science/speciesIdentity';

/** Burette concentrations are user-set dilute aqueous stocks. The device has
 * a declared water-like density of 1 g/mL, not the density of an unrelated
 * catalog stock concentration. Every metered gram includes its solvent. */
export function buretteAliquot(chemical: ChemicalDefinition, formula: string, concentration_M: number,
  volume_ml: number, temperature_c: number): LiquidAliquot | null {
  if (![concentration_M, volume_ml, temperature_c, chemical.molarMass].every(Number.isFinite)
    || concentration_M < 0 || volume_ml <= 0 || chemical.molarMass <= 0 || temperature_c <= -273.15
    || chemical.type === 'gas' || ['Na', 'K', 'Li', 'Mg', 'Al', 'Fe', 'Cu', 'Zn', 'Ca'].some(metal => sameMolecularFormula(formula, metal))) return null;
  const mass_g = volume_ml, water = sameMolecularFormula(formula, 'H2O');
  const moles = water ? mass_g / 18.015 : concentration_M * volume_ml / 1000;
  const soluteMass = water ? mass_g : moles * chemical.molarMass;
  if (soluteMass > mass_g || !Number.isFinite(soluteMass)) return null;
  const contents = [{ formula, phase: water ? 'l' : 'aq', moles, mass_g: soluteMass }];
  if (!water && mass_g > soluteMass) contents.push({ formula: 'H2O', phase: 'l', mass_g: mass_g - soluteMass,
    moles: (mass_g - soluteMass) / 18.015 });
  return { volume_ml, mass_g, temperature_c, color: chemical.color, contents,
    substances: [...new Set(contents.filter(c => c.moles > 0).map(c => c.formula))] };
}
