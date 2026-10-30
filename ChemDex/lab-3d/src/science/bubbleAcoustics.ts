export interface BubbleAcousticMedium {
  pressure_Pa?: number;
  density_kg_m3?: number;
  surfaceTension_N_m?: number;
  polytropicExponent?: number;
}

/** Linear, undamped spherical gas-bubble breathing mode. No vapor mass
 * transfer, nearby free surface, shell, acoustic radiation or thermal damping.
 * kappa=1.4 is an explicit air-like assumption, not gas identification. */
export function bubbleNaturalFrequencyHz(radius_m: number, medium: BubbleAcousticMedium = {}): number {
  const { pressure_Pa: p = 101325, density_kg_m3: rho = 1000,
    surfaceTension_N_m: sigma = 0, polytropicExponent: kappa = 1.4 } = medium;
  if (![radius_m, p, rho, sigma, kappa].every(Number.isFinite)
    || radius_m <= 0 || p <= 0 || rho <= 0 || sigma < 0 || kappa < 1 || kappa > 5 / 3) return NaN;
  return Math.sqrt((3 * kappa * p + (3 * kappa - 1) * 2 * sigma / radius_m) / rho) / (2 * Math.PI * radius_m);
}

/** Playback limitation only: never transpose an inaudible mode into a fake
 * audible bubble. Nyquist applies separately to each synthesized component. */
export function canRenderBubbleFrequency(frequency_Hz: number, sampleRate_Hz: number): boolean {
  return Number.isFinite(frequency_Hz) && Number.isFinite(sampleRate_Hz)
    && sampleRate_Hz > 0 && frequency_Hz >= 20 && frequency_Hz < Math.min(20000, sampleRate_Hz / 2);
}
