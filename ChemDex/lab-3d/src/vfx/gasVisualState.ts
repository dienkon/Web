import type { VesselState } from '../types/chemistry';
import { GAS_FUME_TABLE } from './catalog/gasTable';
import { DEFAULT_LAB_ENVIRONMENT } from '../science/labEnvironment';

/** PV=nRT display proxy, capped packets rather than a physical bubble count. */
export function gasVolumeRateMl_s(mol_s: number, temperature_c: number, pressure_atm: number) {
  if (![mol_s, temperature_c, pressure_atm].every(Number.isFinite) || mol_s <= 0 || temperature_c <= -273.15 || pressure_atm <= 0) return 0;
  return mol_s * 82.057 * (temperature_c + 273.15) / pressure_atm;
}
export function gasPacketRate(mol_s: number, temperature_c: number, pressure_atm: number, packet_ml = 0.05, limit = 180) {
  if (![mol_s, temperature_c, pressure_atm, packet_ml, limit].every(Number.isFinite)
    || mol_s <= 0 || temperature_c <= -273.15 || pressure_atm <= 0 || packet_ml <= 0 || limit <= 0) return 0;
  return Math.min(limit, gasVolumeRateMl_s(mol_s, temperature_c, pressure_atm) / packet_ml);
}

export function gasVisualState(v: VesselState) {
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...v.environment, ...v.effectsEnvironment };
  const generated = Object.values(v.gasFlux?.generated_mol_s ?? {}).reduce((sum, rate) => sum + (Number.isFinite(rate) ? Math.max(0, rate) : 0), 0);
  const bubbleRate = !v.isShattered && v.volume_ml > 0
    ? gasPacketRate(generated, v.temperature_c, env.pressure_atm) : 0;
  const visible = Object.entries(v.gasFlux?.escaped_mol_s ?? {}).flatMap(([formula, rate]) => {
    const info = GAS_FUME_TABLE[formula];
    if (!info?.visible || formula === 'H2O') return [];
    const mol_s = !v.isShattered && !v.isSealed && Number.isFinite(rate) ? Math.max(0, rate) : 0;
    return [{ formula, mol_s, color: info.colorHex ?? '#ffffff', molarMass: info.molarMass_g_mol,
      rate: gasPacketRate(mol_s, v.temperature_c, env.pressure_atm, 1, 40) }];
  });
  const requested = visible.reduce((s, gas) => s + gas.rate, 0);
  const share = requested > 40 ? 40 / requested : 1;
  return { bubbleRate, visible: visible.map(gas => ({ ...gas, rate: gas.rate * share })) };
}
