import { WATER_CP_J_G_K as cp } from '../engine/waterProperties';
import { waterSaturationTemperatureC } from './waterSaturation';
import { waterSaturationProperties } from './waterThermodynamics';
import { WATER_MOLAR_MASS_G } from './aqueousWaterBoundary';

const nodes8 = [0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363];
const weights8 = [0.362683783378362, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];
const nodes4 = [0.3399810435848563, 0.8611363115940526], weights4 = [0.6521451548625461, 0.3478548451374538];

/** Boiling follows the changing ideal solvent activity within ONE packet.
 * dQ/de = L(Tb(e)) + C(e)*dTb/de; H_out=integral(Cp*Tb+L)de.
 * C includes retained solute/glass, dC/de=-Cp. Mixing enthalpy is not modeled. */
export function boilDiluteSolution(p: { water_g: number; particle_mol: number; capacity_J_K: number;
  pressure_Pa: number; availableHeat_J: number; maxEvaporated_g: number }) {
  const unchanged = { valid: false, evaporated_g: 0, temperature_c: NaN, latentEnergy_J: 0,
    vaporSensibleEnergy_J: 0, heatUsed_J: 0, remainingHeat_J: p.availableHeat_J, limited: false };
  if (![p.water_g, p.particle_mol, p.capacity_J_K, p.pressure_Pa, p.availableHeat_J, p.maxEvaporated_g].every(Number.isFinite)
    || p.water_g <= 0 || p.particle_mol <= 0 || p.capacity_J_K < cp * p.water_g
    || p.pressure_Pa <= 0 || p.availableHeat_J < 0 || p.maxEvaporated_g < 0 || p.maxEvaporated_g >= p.water_g) return unchanged;
  const a = p.particle_mol * WATER_MOLAR_MASS_G;
  const state = (e: number) => {
    const w = p.water_g - e, temperature = waterSaturationTemperatureC(p.pressure_Pa * (1 + a / w));
    const props = waterSaturationProperties(temperature);
    if (!props || !(props.latentHeat_J_g > 0)) return null;
    const derivative = p.pressure_Pa * a / (w * w * props.pressureSlope_Pa_K);
    return { temperature, latent: props.latentHeat_J_g, sensible: cp * temperature,
      cost: props.latentHeat_J_g + (p.capacity_J_K - cp * e) * derivative };
  };
  const start = state(0), end = state(p.maxEvaporated_g);
  if (!start || !end) return unchanged;
  const quadrature = (lo: number, hi: number, fine: boolean) => {
    const values = [0, 0, 0], half = (hi - lo) / 2, mid = (hi + lo) / 2;
    const nodes = fine ? nodes8 : nodes4, weights = fine ? weights8 : weights4;
    for (let i = 0; i < nodes.length; i++) for (const sign of [-1, 1]) {
      const s = state(mid + sign * half * nodes[i]);
      if (!s) return [NaN, NaN, NaN];
      for (const [j, value] of [s.cost, s.latent, s.sensible].entries()) values[j] += value * weights[i] * half;
    }
    return values;
  };
  const integral = (lo: number, hi: number, depth = 0): number[] => {
    if (hi === lo) return [0, 0, 0];
    const fine = quadrature(lo, hi, true), coarse = quadrature(lo, hi, false);
    if (!fine.every(Number.isFinite)) return [NaN, NaN, NaN];
    if (fine.every((x, i) => Math.abs(x - coarse[i]) < 1e-8 + Math.abs(x) * 2e-11)) return fine;
    if (depth >= 10) return [NaN, NaN, NaN];
    const mid = (lo + hi) / 2, left = integral(lo, mid, depth + 1), right = integral(mid, hi, depth + 1);
    return left.map((x, i) => x + right[i]);
  };
  let low = 0, high = Math.min(p.maxEvaporated_g, p.availableHeat_J / Math.min(start.latent, end.latent));
  let mass = Math.min(high, p.availableHeat_J / start.cost), values = integral(0, mass), limited = false, solved = false;
  if (high === p.maxEvaporated_g) {
    const limit = integral(0, high);
    if (!limit.every(Number.isFinite)) return unchanged;
    if (limit[0] <= p.availableHeat_J) { mass = high; values = limit; limited = true; solved = true; }
  }
  for (let i = 0; !solved && i < 40; i++) {
    values = integral(0, mass); const s = state(mass);
    if (!s || !values.every(Number.isFinite)) return unchanged;
    const error = values[0] - p.availableHeat_J;
    if (Math.abs(error) < 1e-8 + p.availableHeat_J * 2e-12) { solved = true; break; }
    if (error > 0) high = mass; else low = mass;
    const candidate = mass - error / s.cost;
    mass = candidate > low && candidate < high ? candidate : (low + high) / 2;
  }
  const final = state(mass);
  if (!solved || !final) return unchanged;
  return { valid: true, evaporated_g: mass, temperature_c: final.temperature,
    latentEnergy_J: values[1], vaporSensibleEnergy_J: values[2], heatUsed_J: values[0],
    remainingHeat_J: Math.max(0, p.availableHeat_J - values[0]), limited };
}
