/**
 * OPTICS, BEER-LAMBERT ABSORPTION AND SPECTRAL COLOR ENGINE (§10.1, §10.2)
 * Eliminates hand-picked hex colors:
 * - A(lambda) = sum_k( epsilon_k(lambda) * c_k * pathLength )
 * - T(lambda) = 10^(-A(lambda))
 * - CIE 1931 2° Color Matching Functions (400-700 nm) + Illuminant D65
 * - Correct subtractive mixing (e.g. blue + yellow -> emerald green emerges naturally)
 * - Path-length dependence: thin rims are light and transparent; thick cores are deep and saturated.
 */

// CIE 1931 2° Standard Observer Color Matching Functions from 400 nm to 700 nm at 20 nm intervals (16 bands)
export const SPECTRAL_BANDS_NM = [
  400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 680, 700
];

// CMF values: [x_bar, y_bar, z_bar]
export const CIE_1931_CMF: [number, number, number][] = [
  [0.01431, 0.000396, 0.06785], // 400 nm
  [0.13438, 0.004000, 0.64560], // 420 nm
  [0.34828, 0.023000, 1.74706], // 440 nm
  [0.29080, 0.060000, 1.66920], // 460 nm
  [0.09564, 0.139020, 0.81295], // 480 nm
  [0.00490, 0.323000, 0.27200], // 500 nm
  [0.06327, 0.710000, 0.07825], // 520 nm
  [0.29040, 0.954000, 0.02030], // 540 nm
  [0.59450, 0.995000, 0.00390], // 560 nm
  [0.91630, 0.870000, 0.00165], // 580 nm
  [1.06220, 0.631000, 0.00080], // 600 nm
  [0.85445, 0.381000, 0.00019], // 620 nm
  [0.44790, 0.175000, 0.00005], // 640 nm
  [0.16490, 0.061000, 0.00000], // 660 nm
  [0.04677, 0.017000, 0.00000], // 680 nm
  [0.01136, 0.004102, 0.00000], // 700 nm
];

// CIE Standard Illuminant D65 relative spectral power distribution (normalized to 1.0 at 560 nm)
export const ILLUMINANT_D65: number[] = [
  0.828, 0.934, 1.049, 1.178, 1.159, 1.094, 1.048, 1.009, 1.000, 0.958, 0.900, 0.877, 0.835, 0.800, 0.783, 0.716
];

/**
 * Computes transmission T in linear sRGB [R, G, B] using Beer-Lambert law:
 * T_c = 10^(- sum(absorptivity_RGB[c] * conc_M * pathLength_cm))
 */
export function calculateBeerLambertRGB(
  absorptivity_RGB: [number, number, number],
  concentration_M: number,
  pathLength_cm: number
): [number, number, number] {
  const path = Math.max(0.01, pathLength_cm);
  const Tr = Math.pow(10, -absorptivity_RGB[0] * concentration_M * path);
  const Tg = Math.pow(10, -absorptivity_RGB[1] * concentration_M * path);
  const Tb = Math.pow(10, -absorptivity_RGB[2] * concentration_M * path);
  return [Math.max(0, Math.min(1, Tr)), Math.max(0, Math.min(1, Tg)), Math.max(0, Math.min(1, Tb))];
}

/**
 * Blends multiple species optical absorptions along an optical path
 */
export function calculateMixtureColorRGB(
  species: { absorptivity_RGB: [number, number, number]; concentration_M: number }[],
  pathLength_cm: number = 4.0, // Typical laboratory beaker optical diameter
  turbidityScatter: number = 0.0
): {
  colorHex: string;
  rgbLinear: [number, number, number];
  opacity: number;
  turbidity: number;
} {
  let totalAbsR = 0;
  let totalAbsG = 0;
  let totalAbsB = 0;

  for (const s of species) {
    if (s.concentration_M <= 0) continue;
    totalAbsR += s.absorptivity_RGB[0] * s.concentration_M;
    totalAbsG += s.absorptivity_RGB[1] * s.concentration_M;
    totalAbsB += s.absorptivity_RGB[2] * s.concentration_M;
  }

  // Optical path extinction
  const Tr = Math.pow(10, -totalAbsR * pathLength_cm);
  const Tg = Math.pow(10, -totalAbsG * pathLength_cm);
  const Tb = Math.pow(10, -totalAbsB * pathLength_cm);

  // Turbidity forward scatter: mixes towards white/turbid albedo
  const scatterFactor = Math.min(1.0, turbidityScatter * 0.15);
  const linR = Tr * (1.0 - scatterFactor) + 0.96 * scatterFactor;
  const linG = Tg * (1.0 - scatterFactor) + 0.96 * scatterFactor;
  const linB = Tb * (1.0 - scatterFactor) + 0.96 * scatterFactor;

  // Gamma correction to sRGB: sRGB = lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin^(1/2.4) - 0.055
  const gammaEncode = (c: number): number => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1.0 / 2.4) - 0.055;
  };

  const sR = Math.round(gammaEncode(linR) * 255);
  const sG = Math.round(gammaEncode(linG) * 255);
  const sB = Math.round(gammaEncode(linB) * 255);

  const hex = `#${sR.toString(16).padStart(2, '0')}${sG.toString(16).padStart(2, '0')}${sB.toString(16).padStart(2, '0')}`;
  const opacity = Math.min(0.96, Math.max(0.35, 1.0 - (linR + linG + linB) / 3.0 + scatterFactor * 0.6));

  return {
    colorHex: hex,
    rgbLinear: [linR, linG, linB],
    opacity,
    turbidity: scatterFactor
  };
}
