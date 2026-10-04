/**
 * pH INDICATOR DYES AND COLOR EQUILIBRIA (§10.3)
 * Transitions pass continuously through real intermediate equilibrium hues:
 * HIn <=> H+ + In-
 * alpha = 1 / (1 + 10^(pKin - pH))
 * Absorptivity is a linear mixture of acid-form and base-form spectra.
 */

export interface IndicatorProfile {
  id: string;
  name: string;
  name_vi: string;
  pKin: number;
  transitionRange: [number, number];
  acidAbsorptivity_RGB: [number, number, number];
  baseAbsorptivity_RGB: [number, number, number];
}

export const INDICATOR_PROFILES: Record<string, IndicatorProfile> = {
  // Phenolphthalein: colorless (acid/neutral) -> intense vivid magenta (base)
  'Phenolphthalein': {
    id: 'Phenolphthalein',
    name: 'Phenolphthalein',
    name_vi: 'Phenolphtalein',
    pKin: 9.4,
    transitionRange: [8.2, 10.0],
    acidAbsorptivity_RGB: [0.001, 0.001, 0.001], // Clear
    baseAbsorptivity_RGB: [0.05, 1.85, 0.35]     // High green extinction -> bright magenta (#ec4899)
  },

  // Methyl orange: red (acid) -> yellow-orange (base)
  'MethylOrange': {
    id: 'MethylOrange',
    name: 'Methyl Orange',
    name_vi: 'Metyl Da Cam',
    pKin: 3.5,
    transitionRange: [3.1, 4.4],
    acidAbsorptivity_RGB: [0.05, 0.85, 1.65], // Red
    baseAbsorptivity_RGB: [0.02, 0.25, 1.45]  // Yellow-orange
  },

  // Bromothymol blue: yellow (acid) -> green (pH 7) -> deep blue (base)
  'BromothymolBlue': {
    id: 'BromothymolBlue',
    name: 'Bromothymol Blue',
    name_vi: 'Bromothymol Xanh (BTB)',
    pKin: 7.1,
    transitionRange: [6.0, 7.6],
    acidAbsorptivity_RGB: [0.02, 0.15, 1.65], // Yellow
    baseAbsorptivity_RGB: [1.45, 0.45, 0.05]  // Blue
  },

  // Litmus: red (acid) -> blue (base)
  'Litmus': {
    id: 'Litmus',
    name: 'Litmus',
    name_vi: 'Quỳ Tím',
    pKin: 6.5,
    transitionRange: [4.5, 8.3],
    acidAbsorptivity_RGB: [0.05, 0.85, 1.25], // Red
    baseAbsorptivity_RGB: [1.25, 0.35, 0.05]  // Blue
  }
};

/**
 * Computes the spectral absorptivity of an indicator at a given pH
 */
export function calculateIndicatorAbsorptivity(
  indicatorId: string,
  ph: number
): [number, number, number] {
  const ind = INDICATOR_PROFILES[indicatorId];
  if (!ind) return [0.001, 0.001, 0.001];

  // Henderson-Hasselbalch fractional dissociation:
  // alpha = [In-] / [HIn]_total = 1 / (1 + 10^(pKin - pH))
  const alpha = 1.0 / (1.0 + Math.pow(10, ind.pKin - ph));

  const ar = (1.0 - alpha) * ind.acidAbsorptivity_RGB[0] + alpha * ind.baseAbsorptivity_RGB[0];
  const ag = (1.0 - alpha) * ind.acidAbsorptivity_RGB[1] + alpha * ind.baseAbsorptivity_RGB[1];
  const ab = (1.0 - alpha) * ind.acidAbsorptivity_RGB[2] + alpha * ind.baseAbsorptivity_RGB[2];

  return [ar, ag, ab];
}

/**
 * Universal indicator color approximation across full 0-14 pH range
 */
export function calculateUniversalIndicatorAbsorptivity(ph: number): [number, number, number] {
  const p = Math.max(0, Math.min(14, ph));
  if (p < 3) {
    return [0.05, 1.25, 1.65]; // Deep red
  } else if (p < 5) {
    return [0.02, 0.65, 1.55]; // Orange
  } else if (p < 6.5) {
    return [0.02, 0.15, 1.45]; // Yellow
  } else if (p < 7.8) {
    return [0.45, 0.05, 0.85]; // Green (pH 7)
  } else if (p < 10) {
    return [1.25, 0.35, 0.05]; // Blue
  } else {
    return [0.85, 1.45, 0.05]; // Purple / Violet
  }
}
