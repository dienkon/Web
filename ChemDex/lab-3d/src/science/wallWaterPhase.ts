import { WATER_CP_J_G_K as cp } from '../engine/waterProperties';
import { waterLatentHeatJ_G } from './waterThermodynamics';

/** Finite pure-water wall patch, constant conductances per segment. Heat first
 * warms the retained mass; at saturation it spends L(Tb) per gram removed.
 * Once dry, the original series resistance conducts directly to air. */
export function stepWallWaterPhase(p: {
  dt: number; mass_g: number; temperature_c: number; boiling_c: number;
  sample_c: number; air_c: number; sample_W_K: number; air_W_K: number; allowBoiling: boolean;
}) {
  const latent = waterLatentHeatJ_G(p.boiling_c), g = p.sample_W_K + p.air_W_K;
  const empty = { valid: false, reason: 'invalid', mass_g: p.mass_g, temperature_c: p.temperature_c,
    evaporated_g: 0, vaporEnergy_J: 0, fromSample_J: 0, fromAir_J: 0, storedChange_J: 0,
    vaporTemperatureMass_c_g: 0,
    fromSampleSlope_J_K: NaN, dryDuration_s: 0 };
  if (![p.dt, p.mass_g, p.temperature_c, p.boiling_c, p.sample_c, p.air_c, p.sample_W_K, p.air_W_K, latent, g].every(Number.isFinite)
    || p.dt <= 0 || p.mass_g < 0 || p.temperature_c < 0 || p.sample_c < 0 || p.air_c < 0
    || p.sample_W_K < 0 || p.air_W_K < 0 || !(latent > 0)) return empty;
  let mass = p.mass_g, temperature = p.temperature_c, remaining = p.dt;
  let evaporated = 0, outgoing = 0, qs = 0, qa = 0, slope = 0, dryDuration = 0;
  let superheatTemperatureMass = 0;
  const initialStored = mass * cp * temperature, vaporH = cp * p.boiling_c + latent;
  if (temperature > p.boiling_c && mass > 0) {
    if (!p.allowBoiling) return { ...empty, reason: 'unsupported-sealed-boiling' };
    const surplus = mass * cp * (temperature - p.boiling_c), flashed = Math.min(mass, surplus / latent);
    evaporated += flashed; outgoing += flashed * vaporH + Math.max(0, surplus - flashed * latent);
    superheatTemperatureMass += Math.max(0, surplus - flashed * latent) / 1.86;
    mass -= flashed; temperature = p.boiling_c; slope = NaN;
  }
  const target = g > 0 ? (p.sample_W_K * p.sample_c + p.air_W_K * p.air_c) / g : temperature;
  const sensible = (duration: number) => {
    const c = mass * cp, x = g * duration / c;
    const riseMean = x < 1e-4 ? x * (0.5 + x * (-1 / 6 + x * (1 / 24 - x / 120))) : 1 + Math.expm1(-x) / x;
    const mean = temperature + (target - temperature) * riseMean;
    qs += p.sample_W_K * duration * (p.sample_c - mean);
    qa += p.air_W_K * duration * (p.air_c - mean);
    slope += p.sample_W_K * duration * (1 - (g > 0 ? p.sample_W_K / g : 0) * riseMean);
    temperature += (target - temperature) * -Math.expm1(-x);
  };
  if (mass > 0) {
    let hit = Infinity;
    if (target > p.boiling_c && temperature <= p.boiling_c && g > 0) {
      hit = mass * cp / g * Math.log1p((p.boiling_c - temperature) / (target - p.boiling_c));
    }
    const duration = Math.min(remaining, hit);
    if (duration > 0) sensible(duration);
    remaining -= duration;
    if (duration === hit) temperature = p.boiling_c;
    if (remaining > 0 && temperature === p.boiling_c) {
      if (!p.allowBoiling) return { ...empty, reason: 'unsupported-sealed-boiling' };
      const sampleRate = p.sample_W_K * (p.sample_c - p.boiling_c), airRate = p.air_W_K * (p.air_c - p.boiling_c);
      const rate = sampleRate + airRate;
      if (!(rate > 0)) return empty;
      const added = Math.min(mass, rate * remaining / latent), boilingTime = added * latent / rate;
      qs += sampleRate * boilingTime; qa += airRate * boilingTime;
      mass -= added; evaporated += added; outgoing += added * vaporH;
      remaining -= boilingTime; slope = NaN;
    }
  }
  if (mass === 0 && remaining > 0) {
    dryDuration = remaining;
    const dryHeat = g > 0 ? p.sample_W_K * p.air_W_K / g * (p.sample_c - p.air_c) * remaining : 0;
    qs += dryHeat; qa -= dryHeat; remaining = 0;
    // No liquid remains at this temperature; the next step uses its dry wall.
    temperature = p.boiling_c;
  }
  const storedChange = mass * cp * temperature - initialStored;
  if (![mass, temperature, qs, qa, outgoing, storedChange].every(Number.isFinite)) return empty;
  return { valid: true, reason: evaporated > 0 ? mass > 0 ? 'boiling' : 'dryout' : 'sensible',
    mass_g: mass, temperature_c: temperature, evaporated_g: evaporated, vaporEnergy_J: outgoing,
    vaporTemperatureMass_c_g: evaporated * p.boiling_c + superheatTemperatureMass,
    fromSample_J: qs, fromAir_J: qa, storedChange_J: storedChange, fromSampleSlope_J_K: slope, dryDuration_s: dryDuration };
}
