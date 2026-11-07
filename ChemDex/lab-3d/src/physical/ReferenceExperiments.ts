import { CONSTANTS } from '../core/units';
import { MATERIALS } from './materials';
import { apparentWeight_N } from './fluids';
import { gasPressurePa, iceWaterEnthalpy, stepWaterBath, type BathState, type ThermalNode } from './thermodynamics';

export type ExperimentKind = 'force_meter' | 'pressure_sensor' | 'pipette_bulb' | 'water_bath' | 'gas_collector' | 'viscosity' | 'ice';
export interface ReferenceExperiment {
  id: string; kind: ExperimentKind; time_s: number; parameters: Record<string, number | string>;
  values: Record<string, number>; initial: Record<string, number>; limitations: string[];
}
export function isReferenceExperiment(value: unknown): value is ReferenceExperiment {
  if (!value || typeof value !== 'object') return false;
  const e = value as ReferenceExperiment;
  if (typeof e.id !== 'string' || !Number.isFinite(e.time_s) || e.time_s < 0 || !e.parameters || !e.values || !e.initial
    || !Object.values(e.values).every(Number.isFinite) || !Object.values(e.initial).every(Number.isFinite)) return false;
  try {
    const reference = createReferenceExperiment(e.id, e.kind, e.parameters);
    return Object.keys(reference.values).every(key => Number.isFinite(e.values[key]));
  } catch { return false; }
}
export function createReferenceExperiment(id: string, kind: ExperimentKind, options: Record<string, number | string> = {}): ReferenceExperiment {
  const parameters = { material: 'aluminum', liquid: 'water', mass_kg: 0.005, volume_m3: 1e-6, temperature_K: 293.15, ...options };
  const state: ReferenceExperiment = { id, kind, parameters, time_s: 0, values: {}, initial: {},
    limitations: ['Controlled reference fixture; instrument tolerance, friction and heat-transfer coefficients are not experimentally calibrated.'] };
  const temperature = Number(parameters.temperature_K);
  if (!(temperature > 0) || !Number.isFinite(temperature)) throw new Error('Invalid experiment temperature');
  if (kind === 'force_meter') {
    const m = MATERIALS[String(parameters.material)], liquid = MATERIALS[String(parameters.liquid)], volume = Number(parameters.volume_m3);
    if (!m || !liquid?.viscosity_Pas || !(volume > 0) || !Number.isFinite(volume)) throw new Error('Invalid force fixture');
    state.values = { mass_kg: m.density_kg_m3 * volume, displaced_m3: volume,
      weight_N: m.density_kg_m3 * volume * CONSTANTS.g, reading_N: apparentWeight_N(m.density_kg_m3 * volume, volume, liquid.density_kg_m3) };
    state.limitations.push('Sample is held fully submerged at rest; a negative force means a downward restraint is required.');
  } else if (kind === 'pressure_sensor') {
    const amount = 0.001, volume = 25e-6;
    state.values = { amount_mol: amount, volume_m3: volume, temperature_K: temperature,
      pressure_Pa: gasPressurePa({ amount_mol: amount, volume_m3: volume, temperature_K: temperature }) };
    state.limitations.push('Ideal gas in a fixed sealed volume; sensor displays absolute pressure.');
  } else if (kind === 'pipette_bulb') {
    state.values = { bulb_m3: 10e-6, stroke_m3: 3e-6, sample_m3: 0, source_m3: 20e-6,
      area_m2: Math.PI * 0.005 ** 2, resistance_Pas_m3: 8 * 0.001002 * 0.1 / (Math.PI * 0.0005 ** 4),
      air_mol: CONSTANTS.P_ATM * 7e-6 / (CONSTANTS.R * temperature), pressure_Pa: CONSTANTS.P_ATM * 0.7 };
    state.initial = { water_m3: 20e-6, air_mol: state.values.air_mol };
    state.limitations.push('Isothermal sealed air pocket, laminar circular tip and a uniform 1 cm diameter liquid column; no capillary correction.');
  } else if (kind === 'water_bath') {
    state.values = { bath_K: 293.15, sample_K: 293.15, bath_mass_kg: 0.5, sample_mass_kg: 0.1,
      setpoint_K: 333.15, power_W: 100, electrical_J: 0, loss_J: 0, sampleHeat_J: 0 };
    state.initial = { bath_K: 293.15, sample_K: 293.15 };
  } else if (kind === 'gas_collector') {
    state.values = { source_mol: 0.002, collected_mol: 0, sourceVolume_m3: 10e-6, capacity_m3: 100e-6,
      gasVolume_m3: 0, jarWater_m3: 100e-6, tankWater_m3: 500e-6,
      pressure_Pa: CONSTANTS.P_ATM + 998.2 * CONSTANTS.g * 0.02 };
    state.initial = { totalGas_mol: 0.002, water_m3: 600e-6 };
    state.limitations.push('Fixed interface depth 2 cm, ideal insoluble gas, isothermal source and collector; no gas dissolution.');
  } else if (kind === 'viscosity') {
    if (!MATERIALS[String(parameters.liquid)]?.viscosity_Pas) throw new Error('Unknown reference fluid');
    state.values = { velocity_m_s: 0, displacement_m: 0, radius_m: 5e-6, particleDensity_kg_m3: 2700 };
    state.limitations.push('Equivalent spherical particle in an unbounded Newtonian fluid at the tabulated reference temperature.');
  } else if (kind === 'ice') {
    const mass = Number(parameters.mass_kg);
    if (!(mass > 0) || !Number.isFinite(mass)) throw new Error('Invalid ice mass');
    state.values = { mass_kg: mass, enthalpy_J: -mass * MATERIALS.ice.heatCapacity_J_kgK * 10,
      supplied_J: 0, power_W: 20, temperature_K: 263.15, solid_kg: mass, liquid_kg: 0 };
    state.initial = { enthalpy_J: state.values.enthalpy_J };
    state.limitations.push('Pure water near 1 atm; constant phase heat capacities, no supercooling or heat loss.');
  } else throw new Error('Unknown reference experiment');
  return state;
}

export function stepReferenceExperiment(state: ReferenceExperiment, dt: number): ReferenceExperiment {
  if (!Number.isFinite(dt) || dt < 0) throw new Error('Invalid experiment timestep');
  const v = { ...state.values }, t = Number(state.parameters.temperature_K);
  if (state.kind === 'pipette_bulb') {
    const pressureDifference = (sample: number) => CONSTANTS.P_ATM - v.air_mol * CONSTANTS.R * t / (v.bulb_m3 - sample)
      - MATERIALS.water.density_kg_m3 * CONSTANTS.g * sample / v.area_m2;
    let low = v.sample_m3, high = Math.min(v.bulb_m3 * (1 - 1e-9), v.sample_m3 + v.source_m3, 10e-6);
    if (pressureDifference(low) > 0 && high > low) {
      const old = low;
      // Backward Euler with a bounded monotonic solve keeps finite air and water.
      for (let i = 0; i < 48; i++) {
        const mid = (low + high) / 2;
        if (mid - old - dt * pressureDifference(mid) / v.resistance_Pas_m3 > 0) high = mid; else low = mid;
      }
      v.sample_m3 = (low + high) / 2; v.source_m3 -= v.sample_m3 - old;
    }
    v.pressure_Pa = v.air_mol * CONSTANTS.R * t / (v.bulb_m3 - v.sample_m3);
  } else if (state.kind === 'water_bath') {
    const bath: BathState = { mass_kg: v.bath_mass_kg, cp_J_kgK: MATERIALS.water.heatCapacity_J_kgK, temperature_K: v.bath_K,
      setpoint_K: v.setpoint_K, maxPower_W: v.power_W, ambientConductance_W_K: 2,
      electrical_J: v.electrical_J, loss_J: v.loss_J, sampleHeat_J: v.sampleHeat_J };
    const sample: ThermalNode = { mass_kg: v.sample_mass_kg, cp_J_kgK: MATERIALS.water.heatCapacity_J_kgK, temperature_K: v.sample_K };
    const next = stepWaterBath(bath, sample, 293.15, 3, dt);
    v.bath_K = next.bath.temperature_K; v.sample_K = next.sample.temperature_K;
    v.electrical_J = next.bath.electrical_J; v.loss_J = next.bath.loss_J; v.sampleHeat_J = next.bath.sampleHeat_J;
  } else if (state.kind === 'gas_collector') {
    const sourceEq = v.pressure_Pa * v.sourceVolume_m3 / (CONSTANTS.R * t);
    const release = Math.max(0, v.source_mol - sourceEq) * -Math.expm1(-1e-10 * CONSTANTS.R * t / v.sourceVolume_m3 * dt);
    const capacity_mol = v.capacity_m3 * v.pressure_Pa / (CONSTANTS.R * t);
    const accepted = Math.min(release, Math.max(0, capacity_mol - v.collected_mol));
    v.source_mol -= accepted; v.collected_mol += accepted;
    v.gasVolume_m3 = v.collected_mol * CONSTANTS.R * t / v.pressure_Pa;
    v.jarWater_m3 = v.capacity_m3 - v.gasVolume_m3; v.tankWater_m3 = state.initial.water_m3 - v.jarWater_m3;
  } else if (state.kind === 'viscosity') {
    const fluid = MATERIALS[String(state.parameters.liquid)], volume = 4 / 3 * Math.PI * v.radius_m ** 3;
    const mass = v.particleDensity_kg_m3 * volume;
    const acceleration = (v.particleDensity_kg_m3 - fluid.density_kg_m3) / v.particleDensity_kg_m3 * CONSTANTS.g;
    // Terminal-relaxation implicit step in Stokes regime. Re is exposed for checking the domain.
    const k = 6 * Math.PI * fluid.viscosity_Pas! * v.radius_m, terminal = acceleration * mass / k;
    const decay = Math.exp(-k * dt / mass), old = v.velocity_m_s;
    v.velocity_m_s = terminal + (old - terminal) * decay;
    v.displacement_m += terminal * dt + (old - terminal) * mass / k * (1 - decay);
    v.reynolds = fluid.density_kg_m3 * Math.abs(v.velocity_m_s) * 2 * v.radius_m / fluid.viscosity_Pas!;
  } else if (state.kind === 'ice') {
    const energy = v.power_W * dt;
    v.enthalpy_J += energy; v.supplied_J += energy;
    Object.assign(v, iceWaterEnthalpy(v.mass_kg, v.enthalpy_J));
  }
  return { ...state, time_s: state.time_s + dt, values: v };
}
