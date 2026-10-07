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

/**
 * Returns angle of repose (in radians) for a solid reagent (§8.5.2).
 * Dry powders: ~32°, coarse granules: ~28°, wet powders: ~48°.
 */
export function calculateAngleOfRepose(formula: string, isWet: boolean = false): number {
  if (isWet) return (48.0 * Math.PI) / 180;
  const prop = getSolidProperty(formula);
  if (prop.isPowder) return (32.0 * Math.PI) / 180;
  return (28.0 * Math.PI) / 180;
}

/**
 * Calculates Beverloo granular mass discharge rate through an opening (§8.5.1).
 * Q = C * rho_b * sqrt(g) * (D - k * d)^(5/2) [in g/s]
 * Returns 0 if tilt is below angle of repose or opening is too narrow (arching/jamming).
 */
export function calculateGranularFlowRate(
  formula: string,
  openingDiameter_cm: number,
  tilt_rad: number,
  isWet: boolean = false
): number {
  const thetaRepose = calculateAngleOfRepose(formula, isWet);
  if (tilt_rad < thetaRepose) return 0;

  const prop = getSolidProperty(formula);
  const C = 0.58;
  const k = 1.4;
  const d_cm = prop.particleSize_cm;
  const D_eff = openingDiameter_cm - k * d_cm;

  if (D_eff <= 0) return 0; // Jamming / arching condition

  const g_cgs = 980.665; // cm/s^2
  const rho_b = prop.density_g_cm3 * 0.6; // bulk packed density estimate
  const tiltFactor = Math.sin(tilt_rad);

  const Q_mass_gps = C * rho_b * Math.sqrt(g_cgs) * Math.pow(D_eff, 2.5) * tiltFactor;
  return Math.max(0, Q_mass_gps);
}

/**
 * Determines whether solids will slump / avalanche inside vessel at given tilt (§8.5.3).
 */
export function shouldSolidsSlump(formula: string, tilt_rad: number, isWet: boolean = false): boolean {
  const thetaRepose = calculateAngleOfRepose(formula, isWet);
  return tilt_rad >= thetaRepose;
}

/**
 * Evaluates whether solid is currently pouring / decanting out of vessel (§8.5.3).
 * Floating solids leave with liquid at lower tilt (~25°).
 * Heavy sinking solids stay on bottom until steep tilt (~55°).
 */
export function isSolidDecanting(
  formula: string,
  tilt_rad: number,
  liquidPresent: boolean = true
): boolean {
  const tiltDeg = (tilt_rad * 180) / Math.PI;
  if (liquidPresent && willSolidFloat(formula)) {
    return tiltDeg > 25.0; // Floats out with liquid
  }
  return tiltDeg > 55.0; // Overcomes static friction and decants over rim
}

/**
 * Noyes-Whitney solid dissolution rate dm/dt (§8.5.4):
 * dm/dt = k * A * (c_s - c)
 * Stirring increases mass transfer coefficient k.
 */
export function calculateNoyesWhitneyDissolution(
  formula: string,
  remainingMass_g: number,
  conc_M: number,
  satConc_M: number,
  stirred: boolean = false
): number {
  if (remainingMass_g <= 0 || conc_M >= satConc_M) return 0;
  const prop = getSolidProperty(formula);

  // Surface area A proportional to mass^(2/3)
  const areaFactor = Math.pow(remainingMass_g / prop.density_g_cm3, 2 / 3);
  const kRate = stirred ? 0.08 : 0.02; // Mass transfer coeff
  const drivingForce = Math.max(0, satConc_M - conc_M);

  return kRate * areaFactor * drivingForce;
}
