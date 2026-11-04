import { GasPlumeSystem, type GasPlumeInput } from './GasPlumeSystem';
import { PRNG, seedForLabel } from '../../core/rng';
import type { PhysicalEvaporationParticle } from '../core/SimulationTypes';

export interface GasCloudSource {
  vesselId: string; revision: number; receipt: object; seconds: number;
  species: string; input: GasPlumeInput;
}
export interface GasCloud {
  key: string; vesselId: string; revision: number; species: string;
  system: GasPlumeSystem; lastInput: GasPlumeInput;
  receipts: { remaining: number; input: GasPlumeInput }[];
  acceptedExhaust_mol: number; sourceLive: boolean; idle_s: number;
}

/** Transient exhaust belongs to the room, independently of React renderers
 * or source lifetime. Chemistry remains the mass owner. Receipts are drawn
 * over their accepted duration after delivery, rather than extrapolating a
 * stale last-frame flux indefinitely. */
export class GasCloudRepository {
  public readonly clouds = new Map<string, GasCloud>();
  private seen = new Map<string, object>();
  private epoch?: number;
  public syncEpoch(epoch: number) {
    if (this.epoch !== undefined && this.epoch !== epoch) this.clear();
    this.epoch = epoch;
  }
  public clear() { this.clouds.clear(); this.seen.clear(); }
  public advance(dt: number, sources: readonly GasCloudSource[]) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    for (const cloud of this.clouds.values()) cloud.sourceLive = false;
    const currentKeys = new Set<string>();
    for (const source of sources) {
      const key = JSON.stringify([source.vesselId, source.revision, source.species]);
      currentKeys.add(key);
      const { input, seconds } = source;
      if (![seconds, input.mol_s, input.rate, input.temperature_c, input.ambient_c, input.molarMass,
        input.mouthY, input.mouthRadius, input.floorY, input.wind_m_s].every(Number.isFinite)
        || !(seconds > 0) || input.mol_s < 0 || input.rate < 0 || !(input.molarMass > 0)
        || input.temperature_c <= -273.15 || input.ambient_c <= -273.15 || input.mouthRadius < 0) continue;
      const existing = this.clouds.get(key);
      if (existing) { existing.sourceLive = true; existing.lastInput = { ...source.input }; }
      if (this.seen.get(key) === source.receipt) continue;
      this.seen.set(key, source.receipt);
      if (!(input.mol_s > 0) || !(input.rate > 0)) continue;
      let cloud = existing;
      if (!cloud) {
        cloud = { key, vesselId: source.vesselId, revision: source.revision, species: source.species,
          system: new GasPlumeSystem(192, new PRNG(seedForLabel(`${key}:room-gas`))), lastInput: { ...input },
          receipts: [], acceptedExhaust_mol: 0, sourceLive: true, idle_s: 0 };
        this.clouds.set(key, cloud);
      }
      cloud.lastInput = { ...input }; cloud.receipts.push({ remaining: seconds, input: { ...input } });
      cloud.acceptedExhaust_mol += seconds * input.mol_s;
      cloud.idle_s = 0;
    }
    for (const [key, cloud] of this.clouds) {
      cloud.idle_s += dt;
      let remaining = dt;
      while (remaining > 1e-12) {
        const receipt = cloud.receipts[0], h = receipt ? Math.min(remaining, receipt.remaining) : remaining;
        cloud.system.update(h, receipt ? { ...receipt.input, wind_m_s: cloud.lastInput.wind_m_s, floorY: cloud.lastInput.floorY }
          : { ...cloud.lastInput, rate: 0, mol_s: 0 }); remaining -= h;
        if (receipt) { receipt.remaining -= h; if (receipt.remaining < 1e-12) cloud.receipts.shift(); }
      }
      if ((!cloud.sourceLive || cloud.idle_s > 3) && !cloud.receipts.length
        && cloud.system.pendingGas_mol === 0 && cloud.system.particles.length === 0) this.clouds.delete(key);
    }
    // Keep a tombstone for a still-present source whose invisible cloud was
    // pruned, preventing replay of that old receipt after a render remount.
    for (const key of this.seen.keys()) if (!currentKeys.has(key) && !this.clouds.has(key)) this.seen.delete(key);
  }
}
export const roomGasClouds = new GasCloudRepository();

/** Uniform drawing samples across all sources, without flattening every cloud
 * into temporary arrays for every species on every animation frame. */
export function sampleGasCloudParticles(
  clouds: ReadonlyMap<string, Pick<GasCloud, 'species' | 'system'>>,
  species: string,
  maximum: number,
  visit: (particle: PhysicalEvaporationParticle, index: number, weight: number) => void,
): number {
  if (!Number.isFinite(maximum) || maximum < 1) return 0;
  let total = 0;
  for (const cloud of clouds.values()) if (cloud.species === species) total += cloud.system.particles.length;
  const count = Math.min(Math.floor(maximum), total);
  if (!count) return 0;
  const weight = total / count;
  let offset = 0, index = 0;
  for (const cloud of clouds.values()) {
    if (cloud.species !== species) continue;
    const particles = cloud.system.particles;
    while (index < count && Math.floor(index * weight) < offset + particles.length) {
      visit(particles[Math.floor(index * weight) - offset], index, weight);
      index++;
    }
    offset += particles.length;
    if (index === count) break;
  }
  return count;
}

/** Optical drawing weight only; not a calibrated gas concentration. */
export function representativeGasOpacity(opacity: number, weight: number) {
  if (!Number.isFinite(opacity) || !Number.isFinite(weight) || !(weight > 0)) return 0;
  return -Math.expm1(Math.log1p(-Math.max(0, Math.min(1, opacity))) * weight);
}
