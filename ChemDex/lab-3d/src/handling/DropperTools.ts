/**
 * CHEMDEX LAB - Precision Liquid Handling Tools & Tate's Law (K7.1 & K7.5)
 * Droppers, Pasteur pipettes, Tate's law droplet physics, and balance drift.
 */

export interface DropletPhysicsParams {
  surfaceTension_N_m: number; // Water ≈ 0.0728 N/m, Ethanol ≈ 0.0223 N/m
  density_g_ml: number;       // Water ≈ 1.0, Ethanol ≈ 0.789
  tipRadius_mm: number;       // Standard Pasteur pipette tip radius ≈ 0.8 mm
  temperature_c: number;
}

/**
 * Calculates single droplet volume using Tate's Law with Harkins-Brown correction:
 * V_drop = (2 * π * r * γ) / (ρ * g) * Ψ
 */
export function calculateTatesDropVolume(params: DropletPhysicsParams): {
  dropVolume_ml: number;
  dropsPerMl: number;
} {
  const g = 9.81; // m/s^2
  const r_m = (params.tipRadius_mm / 1000);
  const gamma = params.surfaceTension_N_m;
  const rho_kg_m3 = params.density_g_ml * 1000;

  // Harkins-Brown correction factor Ψ ≈ 0.62 - 0.68 for standard laboratory capillary tips
  const psi = 0.65;

  const m_kg = ((2 * Math.PI * r_m * gamma) / g) * psi;
  const vol_m3 = m_kg / rho_kg_m3;
  const dropVolume_ml = vol_m3 * 1e6; // m^3 to mL

  return {
    dropVolume_ml: Math.max(0.01, Math.min(0.1, dropVolume_ml)),
    dropsPerMl: Math.round(1 / dropVolume_ml)
  };
}

/**
 * Checks spontaneous dripping from dropper when tilted or heated:
 * Warm vapor pressure expands air in bulb and pushes fluid out.
 */
export function willDropperDripSpontaneously(
  tiltRad: number,
  temperature_c: number,
  bulbHeld: boolean
): boolean {
  if (bulbHeld) return true;
  // Heated headspace (T > 38°C) expands air in bulb
  if (temperature_c > 38) return true;
  // Over-tilted past horizontal (> 90 degrees) drips by gravity
  if (Math.abs(tiltRad) > Math.PI * 0.5) return true;
  return false;
}

/**
 * K7.5 Analytical Balance Stability:
 * Draft shield open introduces air drift noise; warm vessels create thermal convection uplift.
 */
export function calculateBalanceReading(
  actualMass_g: number,
  draftShieldClosed: boolean,
  vesselTemp_c: number = 25,
  seed: number = 1
): { displayedMass_g: number; isStabilized: boolean; drift_mg: number } {
  let draftNoise_mg = 0;
  if (!draftShieldClosed) {
    // Air drafts create fluctuating noise ±3 mg
    const noise = Math.sin(seed * 7.1) * 3.2;
    draftNoise_mg += noise;
  }

  // Thermal convection: hot vessels heat air, creating buoyant convection uplift
  let thermalConvection_mg = 0;
  if (vesselTemp_c > 30) {
    thermalConvection_mg = -(vesselTemp_c - 25) * 0.45; // apparent mass loss
  }

  const netError_g = (draftNoise_mg + thermalConvection_mg) / 1000;
  const displayedMass_g = Math.max(0, actualMass_g + netError_g);

  return {
    displayedMass_g: parseFloat(displayedMass_g.toFixed(4)),
    isStabilized: draftShieldClosed && Math.abs(vesselTemp_c - 25) < 3,
    drift_mg: parseFloat((draftNoise_mg + thermalConvection_mg).toFixed(2))
  };
}
