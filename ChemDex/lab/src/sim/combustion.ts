/**
 * combustion.ts - Flame physics, blackbody radiation spectra, flame tests,
 * and burning metal pyrotechnics.
 * 
 * Physical Model:
 * 1. Blackbody Radiation (Planck's Law):
 *    Color temperature mapping from Kelvin:
 *    1000 K (cherry red) -> 1500 K (orange) -> 2000 K (yellow-white) -> 3000 K+ (blinding white, Mg).
 * 2. Flame Structure:
 *    - Premixed Cone (Bunsen air hole open): inner cold cone + outer hot chemiluminescent blue cone.
 *    - Diffusion Flame (Bunsen air hole closed / candle): soot luminescence yellow-orange.
 * 3. Flame Tests (Atomic Emission Spectra):
 *    - Li⁺: crimson (670 nm)
 *    - Na⁺: intense yellow-orange doublet (589 nm) - strong masking of other elements
 *    - K⁺: lilac / pale violet (766 nm)
 *    - Ca²⁺: brick orange-red (622 nm)
 *    - Sr²⁺: intense crimson (650 nm)
 *    - Ba²⁺: pale apple-green (524 nm)
 *    - Cu²⁺: vibrant emerald / azure blue-green (510 nm)
 *    - Borates: vivid green (546 nm)
 * 4. Cobalt-Glass Filter:
 *    Optical absorption band selectively suppresses 589 nm Na emission, unmasking K lilac.
 * 5. Burning Magnesium:
 *    T ≈ 3100 K, blinding white emission, heavy white MgO aerosol.
 * 
 * Units: SI internally (K, nm, W, s)
 */

export interface FlameEmissionColor {
  r: number;
  g: number;
  b: number;
  intensity: number;
}

export const FLAME_TEST_LINES: Record<string, { r: number; g: number; b: number; dominance: number }> = {
  Li: { r: 1.0, g: 0.1, b: 0.2, dominance: 2.0 },      // Crimson
  Na: { r: 1.0, g: 0.72, b: 0.05, dominance: 8.0 },    // Intense yellow-orange (high masking)
  K:  { r: 0.75, g: 0.45, b: 0.95, dominance: 1.0 },   // Lilac / pale violet
  Ca: { r: 1.0, g: 0.35, b: 0.1, dominance: 2.2 },     // Brick orange-red
  Sr: { r: 1.0, g: 0.05, b: 0.15, dominance: 3.5 },    // Crimson red
  Ba: { r: 0.65, g: 0.95, b: 0.25, dominance: 1.8 },   // Apple green
  Cu: { r: 0.1, g: 0.85, b: 0.8, dominance: 3.0 },     // Blue-green
  B:  { r: 0.15, g: 0.95, b: 0.2, dominance: 2.5 },    // Bright green
};

export class CombustionEngine {
  /**
   * Approximate blackbody RGB color from temperature (K)
   */
  public blackbodyColor(tempK: number): { r: number; g: number; b: number } {
    const t = tempK / 100.0;
    let r = 0;
    let g = 0;
    let b = 0;

    // Red
    if (t <= 66) {
      r = 1.0;
    } else {
      r = Math.min(1.0, Math.max(0.0, 1.292936 * Math.pow(t - 60, -0.1332047592)));
    }

    // Green
    if (t <= 66) {
      g = Math.min(1.0, Math.max(0.0, 0.3900815 * Math.log(t) - 0.63184144));
    } else {
      g = Math.min(1.0, Math.max(0.0, 1.12989 * Math.pow(t - 60, -0.0755148492)));
    }

    // Blue
    if (t >= 66) {
      b = 1.0;
    } else if (t <= 19) {
      b = 0.0;
    } else {
      b = Math.min(1.0, Math.max(0.0, 0.543206789 * Math.log(t - 10) - 1.196254));
    }

    return { r, g, b };
  }

  /**
   * Calculate effective flame color with optional atomic species emissions and cobalt glass filter
   */
  public evaluateFlameColor(
    isAirHoleOpen: boolean,
    activeElements: Record<string, number>, // species -> concentration/sample weight
    useCobaltGlass: boolean = false
  ): FlameEmissionColor {
    // 1. Base burner flame
    let r = isAirHoleOpen ? 0.2 : 1.0;
    let g = isAirHoleOpen ? 0.45 : 0.65;
    let b = isAirHoleOpen ? 0.95 : 0.1;
    let totalWeight = 1.0;

    // 2. Add spectral atomic emission lines
    for (const [elem, amount] of Object.entries(activeElements)) {
      if (amount <= 0) continue;
      const test = FLAME_TEST_LINES[elem];
      if (!test) continue;

      let elemWeight = amount * test.dominance;

      // Cobalt glass blocks Na 589nm line by 98%
      if (elem === 'Na' && useCobaltGlass) {
        elemWeight *= 0.02;
      }

      r += test.r * elemWeight;
      g += test.g * elemWeight;
      b += test.b * elemWeight;
      totalWeight += elemWeight;
    }

    // Normalize and scale intensity
    r /= totalWeight;
    g /= totalWeight;
    b /= totalWeight;

    // Cobalt glass filter imparts deep blue-violet tint to the overall scene
    if (useCobaltGlass) {
      r *= 0.35;
      g *= 0.2;
      b *= 1.4;
    }

    return {
      r: Math.min(1.0, r),
      g: Math.min(1.0, g),
      b: Math.min(1.0, b),
      intensity: 1.0 + Math.min(3.0, totalWeight * 0.5),
    };
  }
}
