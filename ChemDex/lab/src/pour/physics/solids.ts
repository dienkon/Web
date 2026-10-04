/**
 * SOLID REAGENT PHYSICS (Crystals, Granules, Metal Strips, Powder Piles)
 * Models mass (g), displaced volume (mL), sinking vs floating, and bouncing kinetics.
 */

export interface SolidChemicalProperty {
  formula: string;
  name: string;
  density_g_cm3: number; // Density in g/cm3
  isPowder: boolean;
  color: string;
  particleSize_cm: number;
  restitution: number; // Bounciness factor 0..1
}

export const SOLID_PROPERTIES: Record<string, SolidChemicalProperty> = {
  'Na': {
    formula: 'Na',
    name: 'Sodium metal',
    density_g_cm3: 0.968, // Floats on water! (rho < 1.0)
    isPowder: false,
    color: '#e2e8f0',
    particleSize_cm: 0.35,
    restitution: 0.2
  },
  'Fe': {
    formula: 'Fe',
    name: 'Iron filings',
    density_g_cm3: 7.874, // Sinks rapidly
    isPowder: true,
    color: '#475569',
    particleSize_cm: 0.08,
    restitution: 0.15
  },
  'Cu': {
    formula: 'Cu',
    name: 'Copper turnings',
    density_g_cm3: 8.96, // Sinks rapidly
    isPowder: false,
    color: '#b45309',
    particleSize_cm: 0.25,
    restitution: 0.25
  },
  'Zn': {
    formula: 'Zn',
    name: 'Zinc granules',
    density_g_cm3: 7.14,
    isPowder: false,
    color: '#94a3b8',
    particleSize_cm: 0.2,
    restitution: 0.3
  },
  'Mg': {
    formula: 'Mg',
    name: 'Magnesium ribbon',
    density_g_cm3: 1.738,
    isPowder: false,
    color: '#cbd5e1',
    particleSize_cm: 0.4,
    restitution: 0.1
  },
  'CaCO3': {
    formula: 'CaCO3',
    name: 'Calcium carbonate chips',
    density_g_cm3: 2.71,
    isPowder: true,
    color: '#f8fafc',
    particleSize_cm: 0.12,
    restitution: 0.18
  },
  'NaCl': {
    formula: 'NaCl',
    name: 'Sodium chloride table salt',
    density_g_cm3: 2.16,
    isPowder: true,
    color: '#ffffff',
    particleSize_cm: 0.06,
    restitution: 0.12
  },
  'MnO2': {
    formula: 'MnO2',
    name: 'Manganese dioxide powder',
    density_g_cm3: 5.026,
    isPowder: true,
    color: '#1e293b',
    particleSize_cm: 0.05,
    restitution: 0.05
  },
  'I2': {
    formula: 'I2',
    name: 'Iodine crystals',
    density_g_cm3: 4.933,
    isPowder: true,
    color: '#3b0764',
    particleSize_cm: 0.1,
    restitution: 0.1
  }
};

export function getSolidProperty(formula: string): SolidChemicalProperty {
  if (SOLID_PROPERTIES[formula]) {
    return SOLID_PROPERTIES[formula];
  }
  return {
    formula,
    name: formula,
    density_g_cm3: 2.5,
    isPowder: true,
    color: '#94a3b8',
    particleSize_cm: 0.08,
    restitution: 0.15
  };
}

/**
 * Calculates displaced liquid volume (mL) when adding a solid of given mass (g).
 * Archimedes principle: V_displaced = mass / density
 */
export function calculateSolidDisplacement(formula: string, mass_g: number): number {
  const prop = getSolidProperty(formula);
  if (prop.density_g_cm3 <= 0.01) return mass_g;
  return mass_g / prop.density_g_cm3;
}

/**
 * Evaluates whether solid will sink or float in a liquid of given density.
 */
export function willSolidFloat(formula: string, liquidDensity_g_cm3: number = 1.0): boolean {
  const prop = getSolidProperty(formula);
  return prop.density_g_cm3 < liquidDensity_g_cm3;
}
