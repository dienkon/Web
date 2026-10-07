/**
 * SOLUBILITY AND SUPERSATURATION ENGINE
 * Calculates temperature-dependent solubility limits, ion products,
 * supersaturation states, and recrystallization dynamics (e.g. PbI2 Golden Rain).
 */

export interface SolubilityCurve {
  formula: string;
  name: string;
  // Solubility in g per 100 mL of water as function of temperature (°C)
  // S(T) = s0 + s1 * T + s2 * T^2
  s0: number;
  s1: number;
  s2: number;
  // Ksp at 25°C
  ksp_25: number;
  // Enthalpy of dissolution kJ/mol (positive = endothermic, dissolves more when heated)
  deltaH_dissolution_kJ: number;
}

export const SOLUBILITY_DATABASE: Record<string, SolubilityCurve> = {
  // PbI2: Low solubility at room temp (~0.076 g/100mL), but dramatically dissolves in boiling water (~0.43 g/100mL)!
  'PbI2': {
    formula: 'PbI2',
    name: 'Lead(II) Iodide',
    s0: 0.044,
    s1: 0.0016,
    s2: 0.000022,
    ksp_25: 9.8e-9,
    deltaH_dissolution_kJ: 46.5
  },
  // BaSO4: Extremely insoluble (~0.00024 g/100mL at 25°C), stays insoluble even when heated
  'BaSO4': {
    formula: 'BaSO4',
    name: 'Barium Sulfate',
    s0: 0.00020,
    s1: 0.0000018,
    s2: 0,
    ksp_25: 1.1e-10,
    deltaH_dissolution_kJ: 26.0
  },
  // AgCl: Extremely insoluble (~0.00019 g/100mL at 25°C)
  'AgCl': {
    formula: 'AgCl',
    name: 'Silver Chloride',
    s0: 0.00015,
    s1: 0.0000018,
    s2: 0,
    ksp_25: 1.8e-10,
    deltaH_dissolution_kJ: 65.5
  },
  // Cu(OH)2: Insoluble, decomposes thermally above 60°C to CuO
  'Cu(OH)2': {
    formula: 'Cu(OH)2',
    name: 'Copper(II) Hydroxide',
    s0: 0.000001,
    s1: 0,
    s2: 0,
    ksp_25: 2.2e-20,
    deltaH_dissolution_kJ: 10.0
  },
  // NaCl: Soluble table salt (~36 g / 100mL), very flat solubility curve
  'NaCl': {
    formula: 'NaCl',
    name: 'Sodium Chloride',
    s0: 35.7,
    s1: 0.025,
    s2: 0.0001,
    ksp_25: 37.0,
    deltaH_dissolution_kJ: 3.88
  },
  // CuSO4: Soluble (~20 g / 100mL at 20°C, ~75 g / 100mL at 100°C)
  'CuSO4': {
    formula: 'CuSO4',
    name: 'Copper(II) Sulfate',
    s0: 14.3,
    s1: 0.28,
    s2: 0.0033,
    ksp_25: 1.5,
    deltaH_dissolution_kJ: 11.7
  }
};

/**
 * Returns maximum solubility in grams per 100 mL of solvent at temperature T (°C)
 */
export function getSolubilityLimit_g_100ml(formula: string, temp_c: number): number {
  const curve = SOLUBILITY_DATABASE[formula];
  if (!curve) return 999.0; // Assume freely soluble if not listed
  const t = Math.max(0, Math.min(100, temp_c));
  return Math.max(0.0000001, curve.s0 + curve.s1 * t + curve.s2 * t * t);
}

/**
 * Returns solubility product Ksp at temperature T (°C) using van 't Hoff equation
 */
export function getSolubilityProduct(formula: string, temp_c: number = 25): number {
  const curve = SOLUBILITY_DATABASE[formula];
  if (!curve) return 1.0;
  const T1 = 298.15;
  const T2 = (temp_c ?? 25) + 273.15;
  const R = 8.314;
  const dH_J = (curve.deltaH_dissolution_kJ || 0) * 1000;
  const lnRatio = -(dH_J / R) * (1 / T2 - 1 / T1);
  return curve.ksp_25 * Math.exp(lnRatio);
}

export interface SaturationCheckResult {
  isSupersaturated: boolean;
  saturationRatio: number;      // > 1.0 means precipitate will form/grow
  dissolvedMass_g: number;
  excessPrecipitate_g: number;  // mass that must crystallize out
  saturationLimit_g: number;
}

/**
 * Evaluates whether a solute has exceeded its solubility limit in a given solvent volume
 */
export function checkSaturation(
  formula: string,
  soluteMass_g: number,
  solventVolume_ml: number,
  temp_c: number
): SaturationCheckResult {
  if (solventVolume_ml <= 0.01) {
    return {
      isSupersaturated: soluteMass_g > 0,
      saturationRatio: soluteMass_g > 0 ? 999.0 : 0,
      dissolvedMass_g: 0,
      excessPrecipitate_g: soluteMass_g,
      saturationLimit_g: 0
    };
  }

  const limit_g_per_100ml = getSolubilityLimit_g_100ml(formula, temp_c);
  const maxDissolvable_g = (limit_g_per_100ml / 100.0) * solventVolume_ml;
  const saturationRatio = soluteMass_g / Math.max(0.000001, maxDissolvable_g);

  const isSupersaturated = saturationRatio > 1.0;
  const dissolvedMass_g = Math.min(soluteMass_g, maxDissolvable_g);
  const excessPrecipitate_g = Math.max(0, soluteMass_g - maxDissolvable_g);

  return {
    isSupersaturated,
    saturationRatio,
    dissolvedMass_g,
    excessPrecipitate_g,
    saturationLimit_g: maxDissolvable_g
  };
}
