import { waterSaturationProperties } from './waterThermodynamics';
import { WATER_CP_J_G_K } from '../engine/waterProperties';

export interface CondenserCoolingSettings {
  flow_ml_s: number;
  inletTemperature_c: number;
  conductance_W_K: number;
}
/** Nominal teaching apparatus; not measured apparatus calibration. */
export const DEFAULT_CONDENSER_COOLING: Readonly<CondenserCoolingSettings> = Object.freeze({
  flow_ml_s: 10, inletTemperature_c: 20, conductance_W_K: 10,
});
export function condenserCoolingSettings(patch?: Partial<CondenserCoolingSettings>): CondenserCoolingSettings {
  return { ...DEFAULT_CONDENSER_COOLING, ...patch };
}
export function validCondenserCooling(s: CondenserCoolingSettings): boolean {
  return [s.flow_ml_s, s.inletTemperature_c, s.conductance_W_K].every(Number.isFinite)
    && s.flow_ml_s >= 0 && s.flow_ml_s <= 100 && s.inletTemperature_c >= 0 && s.inletTemperature_c <= 90
    && s.conductance_W_K >= 0 && s.conductance_W_K <= 500;
}

const exponentialMean = (x: number) => x === 0 ? 1 : -Math.expm1(-x) / x;
function oneMinusExponentialMean(x: number): number {
  return x < 1e-4 ? x * (0.5 + x * (-1 / 6 + x * (1 / 24 - x / 120))) : 1 - exponentialMean(x);
}
function oneMinusLogarithmicRatio(z: number): number {
  return z < 1e-4 ? z * (0.5 + z * (-1 / 3 + z * (1 / 4 - z / 5))) : 1 - Math.log1p(z) / z;
}

/** Well-mixed glass/collected-liquid node with finite coolant throughput.
 * K=Ccold*(1-exp(-UA/Ccold)), W/K. Accepted vapor supplies enthalpy;
 * condensation becomes heat-rejection limited when the node reaches saturation.
 * Exact constant-input segments include changing liquid heat capacity. No
 * axial transport, gas-core mixing, mixture VLE, ice or recirculation is implied.
 * https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node131.html */
export function stepCondenserHeatExchange(p: {
  dt: number; vapor_g: number; maxCondensate_g: number; sourceTemperature_c: number;
  interfaceTemperature_c: number; initialTemperature_c: number; initialCapacity_J_K: number;
  cooling: CondenserCoolingSettings;
  /** Actual emitted packet enthalpy; avoids inferring vapor energy from hot glass. */
  vaporSpecificEnthalpy_J_g?: number;
}) {
  const cp = WATER_CP_J_G_K, initial = p.initialTemperature_c;
  const empty = { recovered_g: 0, heatRemoved_J: 0, coolingPower_W: 0, temperature_c: initial,
    coolantVolume_ml: 0, coolantMass_g: 0, coolantOutletTemperature_c: p.cooling.inletTemperature_c,
    effectiveConductance_W_K: 0, receivedVaporEnergy_J: 0, storedEnergyChange_J: 0, status: 'invalid' };
  if (!Number.isFinite(p.dt) || p.dt <= 0 || !Number.isFinite(initial) || !Number.isFinite(p.initialCapacity_J_K)
    || p.initialCapacity_J_K <= 0 || !validCondenserCooling(p.cooling)) return empty;
  const inlet = waterSaturationProperties(p.cooling.inletTemperature_c)!;
  const coolantVolume_ml = p.cooling.flow_ml_s * p.dt;
  const coolantMass_g = coolantVolume_ml * inlet.liquidDensity_kg_m3 / 1000;
  if (![coolantVolume_ml, coolantMass_g].every(Number.isFinite)) return empty;
  const cold = p.cooling.inletTemperature_c;
  const coldRate = p.cooling.flow_ml_s * inlet.liquidDensity_kg_m3 / 1000 * cp;
  const k = coldRate > 0 ? coldRate * -Math.expm1(-p.cooling.conductance_W_K / coldRate) : 0;
  const baseline = { ...empty, coolantVolume_ml, coolantMass_g, effectiveConductance_W_K: k };
  let temperature = initial, capacity = p.initialCapacity_J_K, mass = 0, remaining = p.dt, coolantEnergy = 0;
  let status = 'cooling-only';
  const cool = (seconds: number) => {
    coolantEnergy += k * seconds * (temperature - cold) * exponentialMean(k * seconds / capacity);
    temperature += (cold - temperature) * -Math.expm1(-k * seconds / capacity);
  };
  const vapor = waterSaturationProperties(p.interfaceTemperature_c);
  const phaseOK = vapor && vapor.latentHeat_J_g > 0 && initial >= 0
    && (p.vaporSpecificEnthalpy_J_g !== undefined
      ? Number.isFinite(p.vaporSpecificEnthalpy_J_g) && p.vaporSpecificEnthalpy_J_g > cp * p.interfaceTemperature_c
      : Number.isFinite(p.sourceTemperature_c) && p.sourceTemperature_c >= p.interfaceTemperature_c);
  const vaporEnthalpy = p.vaporSpecificEnthalpy_J_g ?? (phaseOK ? cp * p.interfaceTemperature_c + vapor!.latentHeat_J_g
    + 1.86 * (p.sourceTemperature_c - p.interfaceTemperature_c) : 0);
  const rate = p.vapor_g / p.dt;
  const inputsOK = [p.vapor_g, p.maxCondensate_g, rate, vaporEnthalpy].every(Number.isFinite)
    && p.vapor_g >= 0 && p.maxCondensate_g >= 0;
  const maximum = inputsOK ? Math.min(p.vapor_g, p.maxCondensate_g) : 0;
  if (!phaseOK || !inputsOK || rate <= 0 || maximum === 0) {
    cool(remaining); remaining = 0;
    status = !inputsOK ? 'invalid-source' : !phaseOK && p.vapor_g > 0 ? 'unsupported-phase'
      : p.vapor_g > 0 && maximum === 0 ? 'no-capacity' : 'cooling-only';
  }
  for (let segment = 0; segment < 8 && remaining > 0; segment++) {
    const room = Math.max(0, maximum - mass), saturation = p.interfaceTemperature_c;
    if (room === 0) { cool(remaining); remaining = 0; status = 'capacity-or-supply'; break; }
    if (temperature > saturation || (temperature === saturation && cold >= saturation)) {
      if (!(k > 0) || cold >= saturation) { cool(remaining); remaining = 0; status = 'too-warm'; break; }
      const hit = capacity / k * Math.log1p((temperature - saturation) / (saturation - cold));
      const duration = Math.min(remaining, hit);
      cool(duration); remaining -= duration;
      if (duration === hit) temperature = saturation;
      else { remaining = 0; status = 'cooling-down'; }
      continue;
    }
    const rejectionRate = k * (saturation - cold), phaseCost = vaporEnthalpy - cp * saturation;
    if (temperature === saturation && rejectionRate < rate * phaseCost) {
      const acceptedRate = Math.max(0, rejectionRate / phaseCost);
      if (acceptedRate === 0) { remaining = 0; status = 'thermal-limit'; break; }
      const duration = Math.min(remaining, room / acceptedRate), added = Math.min(room, acceptedRate * duration);
      coolantEnergy += rejectionRate * duration;
      mass += added; capacity += cp * added; remaining -= duration; status = 'cooling-limited';
      continue;
    }
    // Below saturation, all incoming vapor can condense until a phase/capacity event.
    const b = cp * rate, a = b + k, steady = (rate * vaporEnthalpy + k * cold) / a;
    let hit = Infinity;
    if (steady > saturation && temperature < saturation) {
      const logRatio = Math.log1p((saturation - temperature) / (steady - saturation));
      const exponent = b / a * logRatio;
      hit = capacity / a * logRatio * (exponent === 0 ? 1 : Math.expm1(exponent) / exponent);
    }
    const duration = Math.min(remaining, room / rate, hit), z = b * duration / capacity;
    const logRatio = z === 0 ? 1 : Math.log1p(z) / z;
    const coldExponent = k * duration / capacity * logRatio;
    const meanRise = oneMinusLogarithmicRatio(z) + logRatio * oneMinusExponentialMean(coldExponent);
    coolantEnergy += k * duration * ((temperature - cold) + (steady - temperature) * meanRise);
    const exponent = a * duration / capacity * logRatio;
    temperature += (steady - temperature) * -Math.expm1(-exponent);
    const added = Math.min(room, rate * duration);
    mass += added; capacity += cp * added; remaining -= duration; status = 'condensing';
    if (duration === hit) temperature = saturation;
  }
  if (remaining > p.dt * 1e-12 || ![temperature, mass, capacity, coolantEnergy].every(Number.isFinite)) {
    // Roll back the unsupported vapor packet, but still advance the separately
    // known coolant flow and passive cooling over its actual elapsed time.
    temperature = initial; capacity = p.initialCapacity_J_K; coolantEnergy = 0;
    cool(p.dt);
    if (![temperature, coolantEnergy].every(Number.isFinite)) return { ...baseline, status: 'numerical-limit' };
    return { ...baseline, temperature_c: temperature, heatRemoved_J: coolantEnergy,
      coolingPower_W: coolantEnergy / p.dt, storedEnergyChange_J: capacity * (temperature - initial),
      coolantOutletTemperature_c: coolantMass_g > 0 ? cold + coolantEnergy / (coolantMass_g * cp) : cold,
      status: 'numerical-limit' };
  }
  const receivedVaporEnergy_J = mass > 0 ? mass * vaporEnthalpy : 0;
  const storedEnergyChange_J = capacity * temperature - p.initialCapacity_J_K * initial;
  const heatRemoved_J = coolantEnergy;
  return { ...baseline, recovered_g: mass, temperature_c: temperature, heatRemoved_J,
    coolingPower_W: heatRemoved_J / p.dt, receivedVaporEnergy_J, storedEnergyChange_J,
    coolantOutletTemperature_c: coolantMass_g > 0 ? cold + heatRemoved_J / (coolantMass_g * cp) : cold, status };
}
