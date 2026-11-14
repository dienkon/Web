import type { SubstanceContent } from '../types/chemistry';
import { availableReagent } from './reagentAvailability';
import { identifySpecies } from './speciesIdentity';

// Conservative phase domain of the native teaching rules, rather than a claim
// that no other physical pathway exists. Dissolving a dry salt is a separate
// operation; two dry ionic salts do not instantly precipitate in this solver.
const PHASES: Record<string, readonly string[]> = {
  HCl: ['aq'], H2SO4: ['aq'], HNO3: ['aq'], H2O: ['l'],
  NaOH: ['aq'], KOH: ['aq'], 'Ca(OH)2': ['aq'],
  BaCl2: ['aq'], Na2SO4: ['aq'], AgNO3: ['aq'], NaCl: ['aq'],
  KI: ['aq'], 'Pb(NO3)2': ['aq'], CuSO4: ['aq'], FeCl3: ['aq'],
  AlCl3: ['aq'], 'Al2(SO4)3': ['aq'], NH3: ['aq'], KSCN: ['aq'],
  KMnO4: ['aq'], H2C2O4: ['aq'], Na2S2O3: ['aq'], KIO3: ['aq'], NaHSO3: ['aq'],
  'Cu(OH)2': ['s'], 'Fe(OH)3': ['s'], 'Al(OH)3': ['s'], AgCl: ['s'],
  Fe: ['s'], Zn: ['s'], Mg: ['s'], Na: ['s'], Cu: ['s'], MnO2: ['s'],
  H2O2: ['aq'], CO2: ['g', 'aq'], CaCO3: ['s', 'aq'], Na2CO3: ['s', 'aq'],
};

export function nativeReagentPhases(formula: string): readonly string[] {
  const identity = identifySpecies(formula);
  if (identity.phase) return [identity.phase];
  if (identity.concentration === 'concentrated' && ['HNO3', 'H2SO4'].includes(identity.formula)) return ['aq', 'l'];
  return PHASES[identity.formula] ?? [];
}

export function availableNativeReagent(item: SubstanceContent, formula: string, threshold: number): boolean {
  return nativeReagentPhases(formula).some(phase => availableReagent(item, formula, phase, threshold));
}
