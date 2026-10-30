import { waterLatentHeatJ_G } from './waterThermodynamics';
import { WATER_CP_J_G_K } from '../engine/waterProperties';

const CP = WATER_CP_J_G_K; // Same liquid-water Cp as the bulk model, J/g/K.
const NODES = [0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363];
const WEIGHTS = [0.362683783378362, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];
const NODES4 = [0.3399810435848563, 0.8611363115940526];
const WEIGHTS4 = [0.6521451548625461, 0.3478548451374538];

function gauss(fn: (x: number) => number, low: number, high: number, order8 = true): number {
  if (high === low) return 0;
  const half = (high - low) / 2, mid = low + half;
  const nodes = order8 ? NODES : NODES4, weights = order8 ? WEIGHTS : WEIGHTS4;
  let sum = 0;
  for (let i = 0; i < nodes.length; i++) {
    sum += weights[i] * (fn(mid - half * nodes[i]) + fn(mid + half * nodes[i]));
  }
  return half * sum;
}

/** Small adaptive quadrature, never evaluating a temperature outside the
 * bracket. Failure returns NaN; no partially integrated mass is committed. */
function integral(fn: (x: number) => number, low: number, high: number, tolerance = 2e-15, depth = 0): number {
  const fine = gauss(fn, low, high), coarse = gauss(fn, low, high, false);
  if (!Number.isFinite(fine) || !Number.isFinite(coarse)) return NaN;
  if (Math.abs(fine - coarse) <= tolerance + Math.abs(fine) * 2e-12) return fine;
  if (depth >= 12) return NaN;
  const mid = (low + high) / 2;
  return integral(fn, low, mid, tolerance / 2, depth + 1) + integral(fn, mid, high, tolerance / 2, depth + 1);
}

/** Adiabatic evaporation after the sensible-heat packet, with finite water.
 * C(e)=C0-Cp*e; dT/de=-L(T)/C(e). Separating variables gives
 * integral(Tfinal,Tinitial,1/L)=-log1p(-Cp*e/C0)/Cp.
 * Stops at liquid-water floor 0 C; freezing/sublimation are separate models.
 * Cp is constant; L(T) is IAPWS. No source flux/rate is inferred here. */
export function evaporativeCooling(temperature_c: number, capacity_J_K: number, water_g: number, requested_g: number) {
  const unchanged = { temperature_c, evaporated_g: 0, latentEnergy_J: 0, vaporSensibleEnergy_J: 0,
    capacity_J_K, limitedBy: 'unsupported' as 'unsupported' | 'none' | 'inventory' | 'liquid-floor' };
  const waterCapacity = CP * water_g;
  if (![temperature_c, capacity_J_K, water_g, requested_g].every(Number.isFinite) || temperature_c < 0
    || capacity_J_K <= 0 || water_g < 0 || !Number.isFinite(waterCapacity)
    || capacity_J_K < waterCapacity - 64 * Number.EPSILON * Math.max(capacity_J_K, waterCapacity)
    || requested_g < 0) return unchanged;
  if (temperature_c === 0 || water_g === 0 || requested_g === 0) return { ...unchanged,
    limitedBy: temperature_c === 0 ? 'liquid-floor' as const : 'none' as const };
  const latentStart = waterLatentHeatJ_G(temperature_c), latentFloor = waterLatentHeatJ_G(0);
  if (!(latentStart > 0)) return unchanged;
  // The inherited 0-to-0.01 C boundary is constant L, with a derivative kink
  // at the triple point. Split it explicitly instead of exhausting adaptive
  // quadrature around that known corner and stranding cold water above 0 C.
  const tripleDrop = Math.max(0, temperature_c - 0.01);
  const inverseIntegral = (drop: number) => integral(u => 1 / waterLatentHeatJ_G(temperature_c - u), 0,
    Math.min(drop, tripleDrop)) + Math.max(0, drop - tripleDrop) / latentFloor;
  let mass = Math.min(requested_g, water_g);
  let limitedBy: typeof unchanged.limitedBy = requested_g > water_g ? 'inventory' : 'none';
  const ratio = CP * mass / capacity_J_K;
  let target = ratio < 1 ? -Math.log1p(-ratio) / CP : Infinity;
  let high = Math.min(temperature_c, latentFloor * target), low = 0, drop = latentStart * target;
  // Most renderer steps are microscopic: the upper bound proves they cannot
  // reach the floor without integrating the entire 0-to-T range each frame.
  if (high === temperature_c) {
    const floorIntegral = inverseIntegral(temperature_c);
    if (!Number.isFinite(floorIntegral)) return unchanged;
    if (target >= floorIntegral) {
      target = floorIntegral;
      mass = Math.min(mass, capacity_J_K / CP * -Math.expm1(-CP * floorIntegral));
      drop = temperature_c; limitedBy = 'liquid-floor';
    }
  }
  if (limitedBy !== 'liquid-floor') {
    drop = Math.min(high, drop);
    let solved = false;
    for (let i = 0; i < 48; i++) {
      const value = inverseIntegral(drop), latent = waterLatentHeatJ_G(temperature_c - drop);
      if (!Number.isFinite(value) || !(latent > 0)) return unchanged;
      const error = value - target;
      if (Math.abs(error * latent) <= 2e-13 + drop * 2e-12) { solved = true; break; }
      if (error > 0) high = drop; else low = drop;
      const proposal = drop - error * latent;
      drop = proposal > low && proposal < high ? proposal : (low + high) / 2;
    }
    if (!solved) return unchanged;
  }
  // integral C(T) dT is the local latent work. The difference between lost
  // stored sensible energy and this integral is Cp*integral T(e) de carried
  // out with the vapor, referenced to 0 C in this constant-Cp bulk model.
  const latentWork = (u: number) => capacity_J_K * Math.exp(-CP * inverseIntegral(u));
  const split = Math.min(drop, tripleDrop);
  const latentEnergy_J = integral(latentWork, 0, split, 1e-10)
    + integral(latentWork, split, drop, 1e-10);
  if (!Number.isFinite(latentEnergy_J)) return unchanged;
  const finalTemperature = Math.max(0, temperature_c - drop), capacity = capacity_J_K - CP * mass;
  const storedLoss = capacity_J_K * drop + CP * mass * finalTemperature;
  return { temperature_c: finalTemperature, evaporated_g: mass, capacity_J_K: capacity,
    latentEnergy_J, vaporSensibleEnergy_J: Math.max(0, storedLoss - latentEnergy_J), limitedBy };
}
