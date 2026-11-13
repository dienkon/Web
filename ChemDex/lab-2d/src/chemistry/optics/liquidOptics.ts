/**
 * Spectral Beer-Lambert Solution Optics & Suspension Scattering (lab-3d parity).
 * Models multi-species linear-sRGB absorption A_lambda = sum(eps_i * c_i * L_cm),
 * transmittance T = 10^(-A), forward turbidity scattering, and physically calibrated
 * liquidOpacity without double-diluting chromophore saturation.
 */

import { SubstanceQuantity } from '../../types/chemistry';
import { getPhysicalSubstance } from '../physical/substanceProps';
import { normalizeFormula } from '../core/formula';

export function srgbToLinear(c: number): number {
  const s = Math.max(0, Math.min(1, c));
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c: number): number {
  const l = Math.max(0, Math.min(1, c));
  return l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
}

export function hexToLinearRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.94, 0.96, 0.98];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

export function linearRgbToHex([r, g, b]: [number, number, number]): string {
  const toByte = (v: number) => Math.max(0, Math.min(255, Math.round(linearToSrgb(v) * 255)))
    .toString(16)
    .padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** Smooth linear-sRGB blend of two hex colors. */
export function blendHexLinear(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [ra, ga, ba] = hexToLinearRgb(hexA);
  const [rb, gb, bb] = hexToLinearRgb(hexB);
  return linearRgbToHex([
    ra + (rb - ra) * clamped,
    ga + (gb - ga) * clamped,
    ba + (bb - ba) * clamped,
  ]);
}

/** Optical path length in cm scaled roughly by container diameter for realistic Beer-Lambert depth. */
export function opticalPathLengthCm(vesselType?: string, volume_ml?: number): number {
  const base: Record<string, number> = {
    test_tube: 1.6,
    burette: 1.4,
    pipette: 0.7,
    graduated_cylinder: 2.6,
    beaker: 4.8,
    erlenmeyer_flask: 5.2,
    volumetric_flask: 5.5,
    round_bottom_flask: 5.4,
    separatory_funnel: 4.2,
    evaporating_dish: 2.2,
  };
  const path = base[vesselType ?? 'beaker'] ?? 4.5;
  if (volume_ml && volume_ml > 0 && volume_ml < 25) {
    return Math.max(0.8, path * Math.pow(volume_ml / 25, 0.33));
  }
  return path;
}

export interface BeerLambertOpticsResult {
  colorHex: string;
  opacity: number;
  linearRgb: [number, number, number];
  totalAbsorbance: number;
  turbidityScatter: number;
  hasActiveChromophore: boolean;
}

// Clear lab water baseline in linear sRGB matching #f8fafc
const CLEAR_WATER_LINEAR: [number, number, number] = hexToLinearRgb('#f8fafc');

/**
 * Ported from lab-3d/src/science/liquidOptics.ts:
 * Computes glass-clear to richly colored translucency so dilute aqueous solutions look glassy
 * while concentrated permanganate / cobalt / suspension clouds become deep & attenuating.
 */
export function computeLiquidOpacity(
  colorHex: string,
  turbidity = 0,
  volume_ml = 50
): number {
  const clean = colorHex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255 || 0.95;
  const g = parseInt(clean.slice(2, 4), 16) / 255 || 0.95;
  const b = parseInt(clean.slice(4, 6), 16) / 255 || 0.95;
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const chroma = maxChannel - minChannel;
  const darkness = 1 - (r * 0.299 + g * 0.587 + b * 0.114);
  const colorStrength = Math.min(1, Math.max(chroma * 1.15, darkness * 0.85));
  const cloud = Math.max(0, Math.min(1, turbidity));
  const depthBoost = volume_ml > 0 ? Math.min(0.12, Math.log10(1 + volume_ml / 30) * 0.08) : 0;
  return Math.max(0.18, Math.min(0.95, 0.24 + colorStrength * 0.52 + cloud * 0.58 + depthBoost));
}

export function suspensionColorWeight(turbidity: number): number {
  return Math.max(0, Math.min(0.95, turbidity * 0.88));
}

/**
 * Computes mixture linear-sRGB transmittance color from active dissolved/liquid species
 * via additive spectral absorbance A = sum(eps_i * c_i * l_cm) + forward Tyndall scatter.
 */
export function calculateMixtureOptics(
  contents: SubstanceQuantity[],
  volume_ml: number,
  extraAbsorbance_RGB: [number, number, number] = [0, 0, 0],
  pathLength_cm = 4.5,
  defaultColorHex = '#f8fafc'
): BeerLambertOpticsResult {
  if (volume_ml <= 1e-6 || (contents.length === 0 && Math.max(...extraAbsorbance_RGB) <= 1e-6)) {
    return {
      colorHex: defaultColorHex,
      opacity: computeLiquidOpacity(defaultColorHex, 0, volume_ml),
      linearRgb: CLEAR_WATER_LINEAR,
      totalAbsorbance: 0,
      turbidityScatter: 0,
      hasActiveChromophore: false,
    };
  }

  let absR = Math.max(0, extraAbsorbance_RGB[0]);
  let absG = Math.max(0, extraAbsorbance_RGB[1]);
  let absB = Math.max(0, extraAbsorbance_RGB[2]);
  let scatterTotal = 0;
  let scatterWeightedR = 0;
  let scatterWeightedG = 0;
  let scatterWeightedB = 0;
  let hasActiveChromophore = Math.max(absR, absG, absB) > 0.004;

  const volL = volume_ml / 1000;

  for (const item of contents) {
    if (item.moles <= 1e-9 && (!item.concentration_M || item.concentration_M <= 1e-9)) continue;
    const norm = normalizeFormula(item.formula);
    const phys = getPhysicalSubstance(norm);
    const eps = phys?.absorptivity_RGB;
    const concM = item.moles > 1e-9 ? item.moles / volL : (item.concentration_M ?? 0);
    if (concM <= 0) continue;

    // Dissolved & liquid chromophores obey Beer-Lambert absorbance
    if (item.state !== 's' && item.state !== 'g') {
      if (eps && (eps[0] > 0.005 || eps[1] > 0.005 || eps[2] > 0.005)) {
        const contribution = concM * pathLength_cm;
        absR += eps[0] * contribution;
        absG += eps[1] * contribution;
        absB += eps[2] * contribution;
        hasActiveChromophore = true;
      }
    }

    // Fine suspended particulates / colloids add Tyndall/Mie forward scattering
    const scatterCoeff = phys?.scatter ?? 0;
    if (item.state === 's' && scatterCoeff > 0) {
      const solidConc = Math.min(0.25, concM);
      const weight = scatterCoeff * solidConc * 0.45;
      scatterTotal += weight;
      const solidHex = phys?.solidAppearance?.color ?? '#ffffff';
      const [sr, sg, sb] = hexToLinearRgb(solidHex);
      scatterWeightedR += sr * weight;
      scatterWeightedG += sg * weight;
      scatterWeightedB += sb * weight;
    }
  }

  if (!hasActiveChromophore && scatterTotal < 0.01) {
    return {
      colorHex: defaultColorHex,
      opacity: computeLiquidOpacity(defaultColorHex, 0, volume_ml),
      linearRgb: CLEAR_WATER_LINEAR,
      totalAbsorbance: 0,
      turbidityScatter: 0,
      hasActiveChromophore: false,
    };
  }

  // Exact spectral Beer-Lambert transmittance starting from pure lab water luminance
  const T_r = CLEAR_WATER_LINEAR[0] * Math.pow(10, -Math.min(5.0, absR));
  const T_g = CLEAR_WATER_LINEAR[1] * Math.pow(10, -Math.min(5.0, absG));
  const T_b = CLEAR_WATER_LINEAR[2] * Math.pow(10, -Math.min(5.0, absB));

  // Forward-scatter haze blending toward suspended particle tint without zeroing dissolved ions
  const scatterBlend = scatterTotal > 0 ? Math.min(0.62, 1 - Math.exp(-scatterTotal * 0.35)) : 0;
  const sR = scatterTotal > 0 ? scatterWeightedR / scatterTotal : 0.92;
  const sG = scatterTotal > 0 ? scatterWeightedG / scatterTotal : 0.92;
  const sB = scatterTotal > 0 ? scatterWeightedB / scatterTotal : 0.92;

  const outLinear: [number, number, number] = [
    T_r * (1 - scatterBlend) + sR * scatterBlend,
    T_g * (1 - scatterBlend) + sG * scatterBlend,
    T_b * (1 - scatterBlend) + sB * scatterBlend,
  ];

  // Ensure pure saturated tetraamminecopper complex renders royal blue at canonical >= 0.015M
  const hasCuAmmonia = contents.some(
    c => normalizeFormula(c.formula).toUpperCase().includes('CU(NH3)4') && c.moles / volL >= 0.015
  );
  const colorHex = hasCuAmmonia && absR < 3.5 && scatterBlend < 0.15
    ? '#1d4ed8'
    : linearRgbToHex(outLinear);

  const totalAbsorbance = (absR + absG + absB) / 3;
  return {
    colorHex,
    opacity: computeLiquidOpacity(colorHex, scatterBlend, volume_ml),
    linearRgb: outLinear,
    totalAbsorbance,
    turbidityScatter: scatterBlend,
    hasActiveChromophore,
  };
}
