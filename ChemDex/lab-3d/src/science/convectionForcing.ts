import { liquidWaterDensityReference } from './liquidTransport';

export type ConvectionFluidModel = 'pure-water-reference' | 'aqueous-water-proxy' | 'unavailable';
export interface ConvectionForcingParams {
  temp_c: number;
  ambientTemp_c: number;
  heatPower_W: number;
  viscosity_mPa_s: number;
  fluidModel?: ConvectionFluidModel;
}

const referenceExpansion = liquidWaterDensityReference(25)!.thermalExpansion_per_K;

/** Direction from liquid-water density, but amplitude remains an explicitly
 * nominal, smooth presentation closure. Room T approximates the side boundary;
 * watts are not a measured bottom superheat. No Rayleigh/Nusselt/CFD claim.
 * The result never changes material mass, volume, energy or viscosity. */
export function convectionForcing(params: ConvectionForcingParams) {
  const { temp_c, ambientTemp_c, heatPower_W, viscosity_mPa_s } = params;
  const fluidModel = params.fluidModel ?? 'pure-water-reference';
  const empty = { model: 'prescribed-water-density-circulation' as const, fluidModel,
    referencePressure_Pa: 100000, strength_scene_s: 0, densityContrast: null as number | null,
    thermalExpansion_per_K: null as number | null };
  if (![temp_c, ambientTemp_c, heatPower_W, viscosity_mPa_s].every(Number.isFinite)
    || heatPower_W < 0 || !(viscosity_mPa_s > 0)) return { ...empty, status: 'invalid-input' as const };
  if (fluidModel !== 'pure-water-reference' && fluidModel !== 'aqueous-water-proxy') {
    return { ...empty, status: 'fluid-unavailable' as const };
  }
  const core = liquidWaterDensityReference(temp_c), wall = liquidWaterDensityReference(ambientTemp_c);
  if (!core || !wall) return { ...empty, status: 'temperature-out-of-range' as const };
  const densityContrast = (wall.density_kg_m3 - core.density_kg_m3) / core.density_kg_m3;
  // Signed contrast allows cooling circulation and the water density anomaly.
  // No arbitrary 10 K/2 W on/off gate. Smooth limiting retains nominal scales.
  const room = 0.25 * Math.tanh(0.0035 * densityContrast / referenceExpansion / 0.25);
  // Linearized bottom heating is buoyantly stable for negative expansion.
  // Do not invent a reversed, heater-driven overturning cell below ~4 C.
  const heater = 0.35 * Math.tanh(0.012 * heatPower_W
    * Math.max(0, core.thermalExpansion_per_K) / referenceExpansion / 0.35);
  return { ...empty, status: 'available' as const, densityContrast,
    thermalExpansion_per_K: core.thermalExpansion_per_K,
    strength_scene_s: (room + heater) / Math.max(0.3, viscosity_mPa_s) };
}
