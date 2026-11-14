/**
 * Continuous Henderson-Hasselbalch pH Indicator Color Modeling (lab-3d parity).
 * Replaces abrupt staircase jumps with smooth acid <-> base ionization fractions:
 *   alpha_base = 1 / (1 + 10^(pKa - pH))
 * and supports additive spectral absorbance blending when colored transition metal ions coexist.
 */

import { IndicatorType, SubstanceQuantity } from '../../types/chemistry';
import { blendHexLinear } from './liquidOptics';

export interface IndicatorColorSpec {
  id: IndicatorType;
  pKa: number;
  halfWidth: number;
  acidHex: string;
  baseHex: string;
  /** Additional base absorbance vector [R, G, B] for Beer-Lambert mixing with colored ions */
  baseAbsorbance_RGB: [number, number, number];
  acidAbsorbance_RGB: [number, number, number];
}

export const INDICATOR_SPECS: Record<Exclude<IndicatorType, 'universal'>, IndicatorColorSpec> = {
  phenolphthalein: {
    id: 'phenolphthalein',
    pKa: 9.2,
    halfWidth: 1.0,
    acidHex: '#f8fafc',
    baseHex: '#ec4899',
    acidAbsorbance_RGB: [0, 0, 0],
    // Strong green absorption (553 nm) -> magenta
    baseAbsorbance_RGB: [0.02, 1.35, 0.25],
  },
  litmus: {
    id: 'litmus',
    pKa: 6.4,
    halfWidth: 1.6,
    acidHex: '#ef4444',
    baseHex: '#3b82f6',
    acidAbsorbance_RGB: [0.04, 1.15, 1.2],
    baseAbsorbance_RGB: [1.1, 0.45, 0.02],
  },
  methyl_orange: {
    id: 'methyl_orange',
    pKa: 3.75,
    halfWidth: 0.9,
    acidHex: '#ef4444',
    baseHex: '#eab308',
    acidAbsorbance_RGB: [0.04, 1.15, 1.2],
    baseAbsorbance_RGB: [0.03, 0.14, 1.25],
  },
  thymolphthalein: {
    id: 'thymolphthalein',
    pKa: 9.9,
    halfWidth: 0.85,
    acidHex: '#f8fafc',
    baseHex: '#1d4ed8',
    acidAbsorbance_RGB: [0, 0, 0],
    baseAbsorbance_RGB: [1.45, 0.65, 0.05],
  },
  bromothymol_blue: {
    id: 'bromothymol_blue',
    pKa: 6.8,
    halfWidth: 0.95,
    acidHex: '#eab308',
    baseHex: '#2563eb',
    acidAbsorbance_RGB: [0.03, 0.14, 1.25],
    baseAbsorbance_RGB: [1.25, 0.55, 0.05],
  },
};

const UNIVERSAL_STOPS: Array<{ ph: number; hex: string }> = [
  { ph: 1.5, hex: '#dc2626' },
  { ph: 3.2, hex: '#ea580c' },
  { ph: 5.2, hex: '#eab308' },
  { ph: 7.0, hex: '#22c55e' },
  { ph: 8.6, hex: '#06b6d4' },
  { ph: 10.2, hex: '#2563eb' },
  { ph: 11.4, hex: '#7c3aed' },
];

/** Continuous Henderson-Hasselbalch deprotonation fraction clamped crisply outside ±1.5 pH edge. */
export function hendersonHasselbalchFraction(ph: number, pKa: number, snapThreshold = 0.025): number {
  const exponent = Math.max(-12, Math.min(12, pKa - ph));
  const raw = 1 / (1 + Math.pow(10, exponent));
  if (raw <= snapThreshold) return 0;
  if (raw >= 1 - snapThreshold) return 1;
  return (raw - snapThreshold) / (1 - 2 * snapThreshold);
}

/**
 * Returns physically continuous indicator color hex across pH 0..14.
 * Endpoint pH values cleanly converge to textbook indicator hex codes.
 */
export function computeContinuousIndicatorColor(indicator: IndicatorType, ph: number): string {
  const safePh = Number.isFinite(ph) ? Math.max(0, Math.min(14, ph)) : 7.0;

  if (indicator === 'universal') {
    if (safePh <= UNIVERSAL_STOPS[0].ph) return UNIVERSAL_STOPS[0].hex;
    const last = UNIVERSAL_STOPS[UNIVERSAL_STOPS.length - 1];
    if (safePh >= last.ph) return last.hex;
    for (let i = 0; i < UNIVERSAL_STOPS.length - 1; i++) {
      const a = UNIVERSAL_STOPS[i];
      const b = UNIVERSAL_STOPS[i + 1];
      if (safePh >= a.ph && safePh <= b.ph) {
        const t = (safePh - a.ph) / Math.max(0.01, b.ph - a.ph);
        return blendHexLinear(a.hex, b.hex, t);
      }
    }
    return '#22c55e';
  }

  const spec = INDICATOR_SPECS[indicator];

  // Phenolphthalein special photochemistry: colorless < 8.2, smooth blush 8.2..9.45 -> vivid #ec4899,
  // fades back toward carbinol only in extreme caustic soda (pH > 12.6).
  if (indicator === 'phenolphthalein') {
    if (safePh < 8.2) return '#f8fafc';
    if (safePh > 12.6) {
      const fade = Math.min(1, (safePh - 12.6) / 1.2);
      return blendHexLinear('#ec4899', '#fdf2f8', fade);
    }
    if (safePh >= 9.4) return '#ec4899';
    const raw = (safePh - 8.2) / 1.2;
    const smoothT = Math.min(1, Math.max(0, raw * 0.85 + 0.15));
    return blendHexLinear(spec.acidHex, spec.baseHex, smoothT);
  }

  // Litmus continuous red (<=4.5) -> neutral purple (7.0) -> blue (>=8.3)
  if (indicator === 'litmus') {
    if (safePh <= 4.5) return '#ef4444';
    if (safePh >= 8.3) return '#3b82f6';
    if (safePh <= 7.0) {
      return blendHexLinear('#ef4444', '#a855f7', (safePh - 4.5) / 2.5);
    }
    return blendHexLinear('#a855f7', '#3b82f6', (safePh - 7.0) / 1.3);
  }

  // Methyl orange continuous red (<=3.1) -> midpoint orange (3.8) -> yellow (>=4.4)
  if (indicator === 'methyl_orange') {
    if (safePh <= 3.1) return '#ef4444';
    if (safePh >= 4.4) return '#eab308';
    if (safePh <= 3.8) {
      return blendHexLinear('#ef4444', '#f97316', (safePh - 3.1) / 0.7);
    }
    return blendHexLinear('#f97316', '#eab308', (safePh - 3.8) / 0.6);
  }

  // Thymolphthalein continuous colorless (<9.3) -> light blue midpoint (9.8) -> royal blue (>=10.5)
  if (indicator === 'thymolphthalein') {
    if (safePh < 9.3) return '#f8fafc';
    if (safePh >= 10.5) return '#1d4ed8';
    if (safePh <= 9.8) {
      return blendHexLinear('#f8fafc', '#60a5fa', (safePh - 9.3) / 0.5);
    }
    return blendHexLinear('#60a5fa', '#1d4ed8', (safePh - 9.8) / 0.7);
  }

  // Bromothymol blue yellow -> green (pH 6.8) -> blue
  if (indicator === 'bromothymol_blue') {
    if (safePh <= 5.8) return '#eab308';
    if (safePh >= 7.8) return '#2563eb';
    if (safePh < 6.8) {
      return blendHexLinear('#eab308', '#22c55e', safePh - 5.8);
    }
    return blendHexLinear('#22c55e', '#2563eb', safePh - 6.8);
  }

  const alpha = hendersonHasselbalchFraction(safePh, spec.pKa, 0.03);
  if (alpha <= 0) return spec.acidHex;
  if (alpha >= 1) return spec.baseHex;
  return blendHexLinear(spec.acidHex, spec.baseHex, alpha);
}

const INDICATOR_FORMULA_RULES: ReadonlyArray<readonly [IndicatorType, (f: string) => boolean]> = [
  ['phenolphthalein', (f) => f.includes('phenolphthalein')],
  ['litmus', (f) => f.includes('litmus')],
  ['methyl_orange', (f) => f.includes('methyl_orange') || f.includes('methyl')],
  ['thymolphthalein', (f) => f.includes('thymolphthalein')],
  ['bromothymol_blue', (f) => f.includes('bromothymol')],
  ['universal', (f) => f.includes('universal')],
];

/** Identifies an acid-base indicator family from a chemical formula/name token. */
export function detectIndicatorType(formula: string): IndicatorType | null {
  const f = (formula || '').toLowerCase();
  for (const [ind, matcher] of INDICATOR_FORMULA_RULES) {
    if (matcher(f)) return ind;
  }
  return null;
}

/**
 * Computes additive spectral absorbance [R, G, B] contributed by indicators in solution
 * so indicators naturally blend optically with colored salts (e.g. Cu2+, Fe3+)!
 */
export function computeIndicatorAbsorbanceRGB(
  contents: SubstanceQuantity[],
  ph: number
): { indicator: IndicatorType | null; absorbance_RGB: [number, number, number] } {
  const safePh = Number.isFinite(ph) ? Math.max(0, Math.min(14, ph)) : 7.0;
  let activeIndicator: IndicatorType | null = null;
  const abs: [number, number, number] = [0, 0, 0];

  const detect = (matcher: (f: string) => boolean, ind: IndicatorType) => {
    if (contents.some(c => (c.moles > 1e-8 || (c.concentration_M ?? 0) > 0) && matcher(c.formula.toLowerCase()))) {
      if (!activeIndicator) activeIndicator = ind;
      if (ind === 'universal') {
        const hex = computeContinuousIndicatorColor('universal', safePh);
        // Convert target hex into approximate optical absorption from white
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        abs[0] += Math.max(0, -Math.log10(Math.max(0.05, r)));
        abs[1] += Math.max(0, -Math.log10(Math.max(0.05, g)));
        abs[2] += Math.max(0, -Math.log10(Math.max(0.05, b)));
      } else {
        const spec = INDICATOR_SPECS[ind];
        const alpha = ind === 'phenolphthalein'
          ? (safePh < 8.2 ? 0 : safePh > 12.6 ? Math.max(0.1, 1 - (safePh - 12.6)) : hendersonHasselbalchFraction(safePh, 9.0, 0.04))
          : hendersonHasselbalchFraction(safePh, spec.pKa, 0.03);
        abs[0] += spec.acidAbsorbance_RGB[0] * (1 - alpha) + spec.baseAbsorbance_RGB[0] * alpha;
        abs[1] += spec.acidAbsorbance_RGB[1] * (1 - alpha) + spec.baseAbsorbance_RGB[1] * alpha;
        abs[2] += spec.acidAbsorbance_RGB[2] * (1 - alpha) + spec.baseAbsorbance_RGB[2] * alpha;
      }
    }
  };

  for (const [ind, matcher] of INDICATOR_FORMULA_RULES) {
    detect(matcher, ind);
  }

  return { indicator: activeIndicator, absorbance_RGB: abs };
}
