import { CONSTANTS } from '../core/units';
import { MATERIALS } from './materials';

export interface ThermalNode { mass_kg: number; cp_J_kgK: number; temperature_K: number }
const validNode = (n: ThermalNode) => n.mass_kg > 0 && n.cp_J_kgK > 0 && n.temperature_K >= 0
  && [n.mass_kg, n.cp_J_kgK, n.temperature_K].every(Number.isFinite);
/** Analytic two-node conduction conserves energy and cannot overshoot at high UA. */
export function exchangeThermalEnergy(a: ThermalNode, b: ThermalNode, conductance_W_K: number, dt: number) {
  if (!validNode(a) || !validNode(b) || !(conductance_W_K >= 0) || !(dt >= 0) || !Number.isFinite(conductance_W_K + dt)) throw new Error('Invalid thermal exchange');
  const ca = a.mass_kg * a.cp_J_kgK, cb = b.mass_kg * b.cp_J_kgK;
  const q = (a.temperature_K - b.temperature_K) * ca * cb / (ca + cb)
    * -Math.expm1(-conductance_W_K * (1 / ca + 1 / cb) * dt);
  return { a: { ...a, temperature_K: a.temperature_K - q / ca }, b: { ...b, temperature_K: b.temperature_K + q / cb }, transferred_J: q };
}
export function iceWaterEnthalpy(mass_kg: number, enthalpy_J: number) {
  if (!(mass_kg > 0) || !Number.isFinite(mass_kg + enthalpy_J)) throw new Error('Invalid phase enthalpy');
  const fusion = MATERIALS.ice.latentFusion_J_kg!, melting = 273.15;
  const minimum = -mass_kg * MATERIALS.ice.heatCapacity_J_kgK * melting;
  if (enthalpy_J < minimum) throw new Error('Energy below absolute zero');
  if (enthalpy_J < 0) return { temperature_K: melting + enthalpy_J / (mass_kg * MATERIALS.ice.heatCapacity_J_kgK), solid_kg: mass_kg, liquid_kg: 0 };
  if (enthalpy_J <= mass_kg * fusion) return { temperature_K: melting, solid_kg: mass_kg - enthalpy_J / fusion, liquid_kg: enthalpy_J / fusion };
  return { temperature_K: melting + (enthalpy_J - mass_kg * fusion) / (mass_kg * MATERIALS.water.heatCapacity_J_kgK), solid_kg: 0, liquid_kg: mass_kg };
}
export interface GasNode { amount_mol: number; volume_m3: number; temperature_K: number }
export function gasPressurePa(gas: GasNode): number {
  if (!(gas.amount_mol >= 0) || !(gas.volume_m3 > 0) || !(gas.temperature_K > 0) || !Object.values(gas).every(Number.isFinite)) throw new Error('Invalid gas state');
  return gas.amount_mol * CONSTANTS.R * gas.temperature_K / gas.volume_m3;
}
/** Isothermal finite pneumatic link, linear molar conductance approximation.
 * Analytic pressure relaxation prevents reverse flow from an oversized step. */
export function exchangeGas(a: GasNode, b: GasNode, molarConductance_mol_sPa: number, dt: number) {
  const pa = gasPressurePa(a), pb = gasPressurePa(b);
  if (!(molarConductance_mol_sPa >= 0) || !(dt >= 0) || !Number.isFinite(molarConductance_mol_sPa + dt)) throw new Error('Invalid gas link');
  const compliance = CONSTANTS.R * (a.temperature_K / a.volume_m3 + b.temperature_K / b.volume_m3);
  const dn = (pa - pb) / compliance * -Math.expm1(-molarConductance_mol_sPa * compliance * dt);
  return { a: { ...a, amount_mol: Math.max(0, a.amount_mol - dn) }, b: { ...b, amount_mol: Math.max(0, b.amount_mol + dn) }, transferred_mol: dn };
}
export interface BathState extends ThermalNode { setpoint_K: number; maxPower_W: number; ambientConductance_W_K: number; electrical_J: number; loss_J: number; sampleHeat_J: number }
export function stepWaterBath(bath: BathState, sample: ThermalNode, ambient_K: number, contact_W_K: number, dt: number) {
  if (!validNode(bath) || !validNode(sample) || !(dt >= 0) || !(bath.maxPower_W >= 0) || !(bath.ambientConductance_W_K >= 0)
    || !(bath.setpoint_K > 0) || !(ambient_K > 0) || ![dt, bath.maxPower_W, bath.ambientConductance_W_K, bath.setpoint_K, ambient_K].every(Number.isFinite)) throw new Error('Invalid water bath');
  const capacity = bath.mass_kg * bath.cp_J_kgK;
  const heater = Math.min(bath.maxPower_W * dt, Math.max(0, (bath.setpoint_K - bath.temperature_K) * capacity));
  const heated = bath.temperature_K + heater / capacity;
  const loss = (heated - ambient_K) * capacity * -Math.expm1(-bath.ambientConductance_W_K * dt / capacity);
  const exchanged = exchangeThermalEnergy({ ...bath, temperature_K: heated - loss / capacity }, sample, contact_W_K, dt);
  return { bath: { ...bath, temperature_K: exchanged.a.temperature_K, electrical_J: bath.electrical_J + heater,
    loss_J: bath.loss_J + loss, sampleHeat_J: bath.sampleHeat_J + exchanged.transferred_J }, sample: exchanged.b, sampleHeat_J: exchanged.transferred_J };
}
