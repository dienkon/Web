/** Two-moment, equal-size Smoluchowski closure. Counts describe physical
 * aggregates, never rendering glyphs. A closed compartment keeps its solid
 * mass when aggregates join or break; entrained fluid is not chemical mass.
 * Model derivation, sources and assumed coefficients: docs/research/flocculation.vi.md.
 */
export interface FlocculationModel {
  basis: 'illustrative-mean-population';
  collisionEfficiency: number;
  fractalDimension: number;
  maxPrimaryCount: number;
  criticalShear_s_1: number;
  breakageRate_s_1: number;
}

export interface FlocculationMoments {
  solidMass_g: number;
  primaryCount: number;
  clusterCount: number;
}

const empty = (): FlocculationMoments => ({ solidMass_g: 0, primaryCount: 0, clusterCount: 0 });
const BOLTZMANN_J_K = 1.380649e-23;

export function brownianCollisionKernel(temperature_c: number, viscosity_Pa_s: number) {
  return temperature_c > -273.15 && Number.isFinite(temperature_c) && viscosity_Pa_s > 0
    && Number.isFinite(viscosity_Pa_s) ? 8 * BOLTZMANN_J_K * (temperature_c + 273.15) / (3 * viscosity_Pa_s) : 0;
}

export function shearCollisionKernel(radius_m: number, shear_s_1: number) {
  return radius_m > 0 && shear_s_1 >= 0 && Number.isFinite(radius_m + shear_s_1)
    ? 32 / 3 * shear_s_1 * radius_m ** 3 : 0;
}

/** Mapping a stirring control to a vessel-mean gradient is an explicit display
 * assumption. Callers with a resolved/measured G may supply it directly. */
export function stirringShear(agitation: number): number {
  return Number.isFinite(agitation) ? 80 * Math.min(1, Math.max(0, agitation)) ** 2 : 0;
}

export class FlocculationPopulation {
  private moments = empty();
  constructor(public readonly materialDensity_kg_m3: number) {
    if (!(materialDensity_kg_m3 > 0) || !Number.isFinite(materialDensity_kg_m3)) throw new Error('Positive material density required');
  }

  get snapshot(): Readonly<FlocculationMoments> { return { ...this.moments }; }
  get meanPrimaryCount() {
    return this.moments.clusterCount > 0 ? Math.max(1, this.moments.primaryCount / this.moments.clusterCount) : 1;
  }
  get primaryRadius_m() {
    const { solidMass_g, primaryCount } = this.moments;
    return primaryCount > 0 ? Math.cbrt(3 * solidMass_g * 1e-3 / (4 * Math.PI * this.materialDensity_kg_m3 * primaryCount)) : 0;
  }
  reset() { this.moments = empty(); }

  addPrimarySolid(mass_g: number, radius_m: number) {
    if (!(mass_g > 0) || !(radius_m > 0) || !Number.isFinite(mass_g + radius_m)) return;
    const count = mass_g * 1e-3 / (this.materialDensity_kg_m3 * 4 * Math.PI / 3 * radius_m ** 3);
    this.moments.solidMass_g += mass_g;
    this.moments.primaryCount += count;
    this.moments.clusterCount += count;
  }

  /** Dissolution shrinks the primary material without inventing fewer objects.
   * A withdrawn sample instead removes the same fraction of all moments. */
  dissolve(fractionRemaining: number) {
    if (!Number.isFinite(fractionRemaining)) return;
    const f = Math.min(1, Math.max(0, fractionRemaining));
    if (f === 0) this.reset(); else this.moments.solidMass_g *= f;
  }
  withdraw(mass_g: number): FlocculationMoments {
    if (!Number.isFinite(mass_g) || mass_g <= 0) return empty();
    const f = this.moments.solidMass_g > 0 ? Math.min(1, Math.max(0, mass_g) / this.moments.solidMass_g) : 0;
    const removed = { solidMass_g: this.moments.solidMass_g * f,
      primaryCount: this.moments.primaryCount * f, clusterCount: this.moments.clusterCount * f };
    if (f === 1) this.reset(); else {
      this.moments.solidMass_g -= removed.solidMass_g;
      this.moments.primaryCount -= removed.primaryCount;
      this.moments.clusterCount -= removed.clusterCount;
    }
    return removed;
  }
  receive(packet: FlocculationMoments) {
    if (![packet.solidMass_g, packet.primaryCount, packet.clusterCount].every(x => Number.isFinite(x) && x >= 0)
      || packet.clusterCount > packet.primaryCount || packet.solidMass_g > 0 && !(packet.clusterCount > 0)) return;
    this.moments.solidMass_g += packet.solidMass_g;
    this.moments.primaryCount += packet.primaryCount;
    this.moments.clusterCount += packet.clusterCount;
  }

  properties(model: FlocculationModel, fluidDensity_kg_m3: number) {
    const n = this.meanPrimaryCount;
    const radius_m = this.primaryRadius_m * n ** (1 / model.fractalDimension);
    const solidFraction = n ** (1 - 3 / model.fractalDimension);
    return { meanPrimaryCount: n, radius_m, solidFraction,
      effectiveDensity_kg_m3: fluidDensity_kg_m3 + (this.materialDensity_kg_m3 - fluidDensity_kg_m3) * solidFraction };
  }

  step(dt_s: number, volume_ml: number, temperature_c: number, viscosity_Pa_s: number,
    shear_s_1: number, model: FlocculationModel) {
    if (!(dt_s > 0) || !(volume_ml > 0) || !(viscosity_Pa_s > 0) || temperature_c <= -273.15 || shear_s_1 < 0
      || ![dt_s, volume_ml, temperature_c, viscosity_Pa_s, shear_s_1].every(Number.isFinite)
      || !(this.moments.primaryCount > 0)) return;
    const n0 = this.moments.primaryCount / (volume_ml * 1e-6);
    const brownian = brownianCollisionKernel(temperature_c, viscosity_Pa_s);
    const r0 = this.primaryRadius_m;
    const growth = (n: number) => 0.5 * model.collisionEfficiency * n0
      * (brownian + shearCollisionKernel(r0 * n ** (1 / model.fractalDimension), shear_s_1));
    // Midpoint integration on the simulation's fixed substep. Radius/cluster
    // caps bound the one-bin closure rather than a finite-time gel singularity.
    const before = this.meanPrimaryCount;
    const middle = Math.min(model.maxPrimaryCount, before + growth(before) * dt_s / 2);
    let after = Math.min(model.maxPrimaryCount, before + growth(middle) * dt_s);
    const breakage = model.breakageRate_s_1 * Math.max(0, shear_s_1 / model.criticalShear_s_1 - 1) ** 2;
    after = 1 + (after - 1) * Math.exp(-breakage * dt_s);
    this.moments.clusterCount = this.moments.primaryCount / Math.max(1, after);
  }
}
