import type { VesselState } from '../types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT } from '../science/labEnvironment';
import { waterPlumeState } from '../science/moistAirFog';

const cache = new WeakMap<VesselState, { key: string; value: {
  rate_g_s: number; isBoiling: boolean; mistRate: number; visibility: number;
  sourceTemperature_c: number; plumeStatus: string;
} }>();

/** Phase state and a finite water supply authorize visuals. Temperature alone
 * cannot prove boiling or white mist. This projection never changes physics. */
export function waterVisualState(vessel?: VesselState | null) {
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...vessel?.environment, ...vessel?.effectsEnvironment };
  const sourceTemperature_c = vessel?.waterVaporTemperature_c ?? vessel?.temperature_c ?? env.temperature_c;
  const key = [vessel?.isShattered, vessel?.isSealed, vessel?.volume_ml, vessel?.isBoiling,
    vessel?.evaporationRate_g_s, vessel?.waterVaporOutflow_g_s, sourceTemperature_c,
    vessel?.waterVaporSpecificEnthalpy_J_g, vessel?.waterVaporPartialPressure_Pa,
    env.temperature_c, env.pressure_atm, env.relativeHumidity ?? 0.5].join('|');
  const existing = vessel ? cache.get(vessel) : undefined;
  if (existing?.key === key) return existing.value;
  const openVessel = Boolean(vessel && !vessel.isShattered && !vessel.isSealed);
  const openLiquid = openVessel && vessel!.volume_ml > 0;
  const rawRate = vessel?.waterVaporOutflow_g_s ?? vessel?.evaporationRate_g_s ?? 0;
  const rate_g_s = openVessel && (openLiquid || vessel?.waterVaporOutflow_g_s !== undefined)
    && Number.isFinite(rawRate) ? Math.max(0, rawRate) : 0;
  const plume = rate_g_s > 0 ? waterPlumeState(sourceTemperature_c, env.temperature_c,
    env.relativeHumidity ?? 0.5, env.pressure_atm, vessel!.waterVaporPartialPressure_Pa, vessel!.waterVaporSpecificEnthalpy_J_g)
    : { visibility: 0, status: 'no-outflow' };
  // Condenser capture suppresses the external plume, not boiling inside the source.
  const grossRate = vessel?.evaporationRate_g_s ?? 0;
  const value = { rate_g_s, isBoiling: openLiquid && Number.isFinite(grossRate) && grossRate > 0 && vessel?.isBoiling === true,
    mistRate: Math.min(32, rate_g_s * 180) * plume.visibility, visibility: plume.visibility,
    sourceTemperature_c, plumeStatus: plume.status };
  if (vessel) cache.set(vessel, { key, value });
  return value;
}
