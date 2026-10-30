import type { SubstanceContent, VesselState } from '../types/chemistry';
import { solidMaterialVolumeMl } from '../handling/solidOccupancy';

export const IDEAL_GAS_R_L_ATM = 8.31446261815324 / 101.325;
export interface SealedHeadspace {
  background_mol: number;
  referenceTemperature_c: number;
  referenceHeadspace_ml: number;
  referencePressure_atm: number;
  model: 'captured' | 'legacy-25C';
}
export function ambientGasPressure(v: VesselState): number {
  return v.effectsEnvironment?.pressure_atm ?? v.environment?.pressure_atm ?? 1;
}
export function isFreeHeadspaceGas(item: SubstanceContent): boolean {
  return ['g', 'gas'].includes(item.phase ?? item.state ?? '') && item.location !== 'foam';
}
export function freeGasMoles(v: VesselState): number {
  return v.contents.filter(isFreeHeadspaceGas).reduce((n, item) => n + Math.max(0, item.moles), 0);
}
export function headspaceVolumeMl(v: VesselState): number {
  return v.capacity_ml - v.volume_ml - solidMaterialVolumeMl(v)
    - Math.max(0, v.wallCoating_ml ?? 0) - Math.max(0, v.wallCondensation?.inner_g ?? 0);
}
/** Background carrier gas is pressure-model state, not a newly created
 * chemical species. A hot closure is captured at its actual T and free volume.
 * Legacy states lack closure history; preserve their stated 25 C assumption. */
export function captureHeadspace(v: VesselState, model: SealedHeadspace['model'] = 'captured'): SealedHeadspace {
  const volume = headspaceVolumeMl(v), temperature = model === 'captured' ? v.temperature_c : 25;
  const pressure = ambientGasPressure(v), kelvin = temperature + 273.15;
  const total = pressure * Math.max(0, volume) / 1000 / (IDEAL_GAS_R_L_ATM * kelvin);
  const background = Math.max(0, total - (model === 'captured' ? freeGasMoles(v) : 0));
  return { background_mol: Number.isFinite(background) ? background : 0,
    referenceTemperature_c: Number.isFinite(temperature) ? temperature : -273.15,
    referenceHeadspace_ml: Number.isFinite(volume) ? volume : 0,
    referencePressure_atm: Number.isFinite(pressure) ? pressure : 0, model };
}
export function ensureHeadspaceReference(v: VesselState): VesselState {
  return v.isSealed && !v.sealedHeadspace ? { ...v, sealedHeadspace: captureHeadspace(v, 'legacy-25C') } : v;
}
export function sealedGasPressure(v: VesselState): number {
  if (!v.isSealed || v.isShattered) return ambientGasPressure(v);
  const volume = headspaceVolumeMl(v), kelvin = v.temperature_c + 273.15;
  const reference = v.sealedHeadspace ?? captureHeadspace(v, 'legacy-25C');
  if (![volume, kelvin, reference.background_mol, reference.referenceHeadspace_ml,
    reference.referenceTemperature_c, reference.referencePressure_atm].every(Number.isFinite)
    || volume <= 0 || kelvin <= 0 || reference.background_mol < 0 || reference.referenceHeadspace_ml <= 0
    || reference.referenceTemperature_c <= -273.15 || reference.referencePressure_atm <= 0) return NaN;
  return (reference.background_mol + freeGasMoles(v)) * IDEAL_GAS_R_L_ATM * kelvin / (volume / 1000);
}
/** Never serialize NaN as an apparently physical pressure. A full liquid
 * vessel needs compressibility/phase equilibrium beyond this gas closure. */
export function gasPressurePatch(v: VesselState): Partial<VesselState> {
  const normalized = ensureHeadspaceReference(v), pressure = sealedGasPressure(normalized);
  const closed = normalized.isSealed && !normalized.isShattered;
  return { sealedHeadspace: closed ? normalized.sealedHeadspace : undefined,
    internalPressure_atm: Number.isFinite(pressure) ? pressure : undefined,
    internalPressureModel: Number.isFinite(pressure) ? closed ? 'ideal-gas' : 'ambient' : 'unavailable' };
}
