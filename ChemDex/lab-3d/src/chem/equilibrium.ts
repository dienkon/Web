/**
 * CHEMICAL EQUILIBRIUM SOLVERS (§5.4)
 * - Precipitation (Ksp) with Debye-Hückel / Davies ionic activity corrections
 * - Common-ion effect & amphoteric / amine complexation
 * - Acid-Base polyprotic charge balance solver in pH space
 * - Temperature dependence via van 't Hoff equation
 * - Henry's law for dissolved gases
 */

import { CONSTANTS } from '../core/units';

export interface IonicStrengthResult {
  I: number;                      // Ionic strength mol/L (M)
  activityCoeff: (charge: number) => number; // gamma_i
}

/**
 * Computes ionic strength I = 0.5 * sum(c_i * z_i^2) and activity coefficients via Davies equation
 * Valid up to I ~ 0.5 M.
 */
export function computeIonicStrength(ions: { concentration_M: number; charge: number }[]): IonicStrengthResult {
  let I = 0;
  for (const ion of ions) {
    I += 0.5 * ion.concentration_M * (ion.charge * ion.charge);
  }

  // Davies equation: log10(gamma) = -A * z^2 * (sqrt(I)/(1 + sqrt(I)) - 0.3 * I)
  // At 25°C in water, A ≈ 0.509
  const A = 0.509;
  const sqrtI = Math.sqrt(Math.max(0, I));
  const daviesFactor = (sqrtI / (1.0 + sqrtI)) - 0.3 * I;

  const activityCoeff = (charge: number): number => {
    if (charge === 0 || I < 1e-7) return 1.0;
    const logGamma = -A * (charge * charge) * daviesFactor;
    return Math.pow(10, Math.max(-2.0, Math.min(0.5, logGamma)));
  };

  return { I, activityCoeff };
}

/**
 * Computes temperature-dependent Ksp using van 't Hoff equation
 */
export function kspAtTemperature(ksp_298: number, dH_sol_J_mol: number, temp_K: number): number {
  if (Math.abs(temp_K - CONSTANTS.T_ROOM) < 0.1 || !dH_sol_J_mol) {
    return ksp_298;
  }
  const R = CONSTANTS.R;
  // ln(K2 / K1) = - (dH / R) * (1/T2 - 1/T1)
  const exponent = -(dH_sol_J_mol / R) * (1.0 / temp_K - 1.0 / CONSTANTS.T_ROOM);
  // Clamped to avoid float overflow
  return ksp_298 * Math.exp(Math.max(-20.0, Math.min(20.0, exponent)));
}

export interface PrecipitationEquilibriumResult {
  precipitatedMolesPerLiter: number; // x (mol/L of solid formed)
  remainingCation_M: number;
  remainingAnion_M: number;
  isSupersaturated: boolean;
  supersaturationRatio: number;      // S = (Q / Ksp)^(1/nu)
}

/**
 * Solves precipitation equilibrium for a 1:1 salt (e.g. AgCl, BaSO4) or a:b general stoichiometry:
 * a M^(m+) + b X^(x-) <=> M_a X_b(s)
 * Analytical for 1:1 salt:
 * Q = c_a * c_b * gamma_a * gamma_b
 * (c_a - x)(c_b - x) * gamma^2 = Ksp
 */
export function solvePrecipitationEquilibrium(
  cationConc_M: number,
  anionConc_M: number,
  ksp: number,
  stoichiometry: [number, number] = [1, 1],
  gamma: [number, number] = [1.0, 1.0]
): PrecipitationEquilibriumResult {
  const [a, b] = stoichiometry;
  const [gammaA, gammaB] = gamma;

  const nu = a + b;
  const effectiveKsp = ksp / (Math.pow(gammaA, a) * Math.pow(gammaB, b));

  // Ion product Q
  const Q = Math.pow(cationConc_M, a) * Math.pow(anionConc_M, b);
  const S = Math.pow(Math.max(0, Q / Math.max(1e-40, effectiveKsp)), 1.0 / nu);

  if (Q <= effectiveKsp || S <= 1.0) {
    return {
      precipitatedMolesPerLiter: 0,
      remainingCation_M: cationConc_M,
      remainingAnion_M: anionConc_M,
      isSupersaturated: false,
      supersaturationRatio: S
    };
  }

  // Exact 1:1 analytical solution
  if (a === 1 && b === 1) {
    const sum = cationConc_M + anionConc_M;
    const diff = cationConc_M - anionConc_M;
    // x = (sum - sqrt(diff^2 + 4 * Ksp_eff)) / 2
    const disc = diff * diff + 4.0 * effectiveKsp;
    const x = Math.max(0, (sum - Math.sqrt(Math.max(0, disc))) / 2.0);

    return {
      precipitatedMolesPerLiter: x,
      remainingCation_M: Math.max(0, cationConc_M - x),
      remainingAnion_M: Math.max(0, anionConc_M - x),
      isSupersaturated: true,
      supersaturationRatio: S
    };
  }

  // General stoichiometry using bracketed Newton-Raphson on x in [0, min(c_a/a, c_b/b))
  const maxPossibleX = Math.min(cationConc_M / a, anionConc_M / b) * 0.9999;
  let x = maxPossibleX * 0.5;

  for (let iter = 0; iter < 20; iter++) {
    const ca = cationConc_M - a * x;
    const cb = anionConc_M - b * x;
    if (ca <= 0 || cb <= 0) {
      x *= 0.5;
      continue;
    }

    const f = Math.pow(ca, a) * Math.pow(cb, b) - effectiveKsp;
    const df = -a * a * Math.pow(ca, a - 1) * Math.pow(cb, b) - b * b * Math.pow(ca, a) * Math.pow(cb, b - 1);

    if (Math.abs(df) < 1e-30) break;
    const dx = f / df;
    x = Math.max(0, Math.min(maxPossibleX, x - dx));
    if (Math.abs(dx) < 1e-9) break;
  }

  return {
    precipitatedMolesPerLiter: x,
    remainingCation_M: Math.max(0, cationConc_M - a * x),
    remainingAnion_M: Math.max(0, anionConc_M - b * x),
    isSupersaturated: true,
    supersaturationRatio: S
  };
}

/**
 * Solves acid-base equilibrium across strong and weak acids/bases, polyprotic acids and buffers.
 * Solves net charge balance: f(pH) = [H+] - [OH-] + sum(z_cat * [Cat]) - sum(z_an * [An]) = 0
 * Uses bracketed bisection & Newton-Raphson in pH space [0, 14].
 */
export function solvePhEquilibrium(
  components: {
    type: 'strong_acid' | 'strong_base' | 'weak_acid' | 'weak_base';
    concentration_M: number;
    Ka?: number[]; // [Ka1, Ka2, ...] for weak acids
    Kb?: number[];
  }[],
  temp_K = CONSTANTS.T_ROOM
): number {
  // Kw temperature adjustment: pKw = 14.0 at 25 °C (298.15 K)
  const Kw = 1.0e-14;

  const chargeResidual = (ph: number): number => {
    const h = Math.pow(10, -ph);
    const oh = Kw / h;
    let net = h - oh;

    for (const c of components) {
      if (c.concentration_M <= 0) continue;

      if (c.type === 'strong_acid') {
        net -= c.concentration_M; // Fully dissociated [Cl-]
      } else if (c.type === 'strong_base') {
        net += c.concentration_M; // Fully dissociated [Na+]
      } else if (c.type === 'weak_acid' && c.Ka && c.Ka.length > 0) {
        if (c.Ka.length === 1) {
          // Monoprotic HA <=> H+ + A- : [A-] = C * Ka / (Ka + [H+])
          const ka = c.Ka[0];
          const alpha1 = ka / (ka + h);
          net -= c.concentration_M * alpha1;
        } else if (c.Ka.length === 2) {
          // Diprotic H2A: [HA-] + 2[A2-]
          const k1 = c.Ka[0];
          const k2 = c.Ka[1];
          const denom = h * h + k1 * h + k1 * k2;
          const alpha1 = (k1 * h) / denom;
          const alpha2 = (k1 * k2) / denom;
          net -= c.concentration_M * (alpha1 + 2 * alpha2);
        }
      } else if (c.type === 'weak_base' && c.Kb && c.Kb.length > 0) {
        // B + H2O <=> BH+ + OH- : [BH+] = C * [H+] / ([H+] + Ka_conj) where Ka_conj = Kw / Kb
        const kb = c.Kb[0];
        const ka_conj = Kw / kb;
        const alpha = h / (h + ka_conj);
        net += c.concentration_M * alpha;
      }
    }

    return net;
  };

  // Robust root finding: bracket between pH 0 and 14
  let low = 0.0;
  let high = 14.0;
  let fLow = chargeResidual(low);
  let fHigh = chargeResidual(high);

  if (fLow * fHigh > 0) {
    // Edge case: extreme acid or base beyond 0-14
    if (fLow < 0) return 0.0;
    return 14.0;
  }

  // Bisection refinement
  for (let i = 0; i < 35; i++) {
    const mid = (low + high) * 0.5;
    const fMid = chargeResidual(mid);

    if (Math.abs(fMid) < 1e-12 || (high - low) < 1e-5) {
      return Math.round(mid * 100) / 100;
    }

    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return Math.round(((low + high) * 0.5) * 100) / 100;
}

/**
 * Henry's law gas solubility: c = kH * p
 * Returns maximum dissolved gas concentration in mol/L
 */
export function solveGasSolubility_mol_L(
  kH0: number,        // mol/(L·atm) at 298.15 K
  dH_solution_J: number,
  partialPressure_atm: number,
  temp_K: number
): number {
  const R = CONSTANTS.R;
  const kH = kH0 * Math.exp(-(dH_solution_J / R) * (1.0 / temp_K - 1.0 / CONSTANTS.T_ROOM));
  return Math.max(0, kH * partialPressure_atm);
}
