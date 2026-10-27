import type { SubstanceContent, VesselState } from '../types/chemistry';
import { CHEMICAL_DATABASE } from '../data/chemicals';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { liquidGeometry, liquidLevelForVolume, solidSceneVolume, solidBlockDimensions } from '../science/vesselDimensions';
import { ICE_DENSITY_G_ML } from '../engine/waterProperties';
import { getPrecipitateProfile } from '../simulation/core/SimulationConfig';

type OccupancyVessel = Pick<VesselState, 'type' | 'capacity_ml' | 'volume_ml' | 'contents'>
  & Partial<Pick<VesselState, 'wallCoating_ml'>>;
const solid = (item: SubstanceContent) => ['s', 'solid'].includes(item.phase ?? item.state ?? '');
const gas = (item: SubstanceContent) => ['g', 'gas'].includes(item.phase ?? item.state ?? '');
const solidDensities = CHEMICAL_DATABASE.filter(chemical => chemical.type === 'solid' && chemical.density! > 0);
const bodyCache = new WeakMap<SubstanceContent[], { mass_g: number; volume_ml: number; ice: boolean }[]>();

export function liquidInventoryMass(vessel: Pick<VesselState, 'contents'>): number {
  return (vessel.contents ?? []).filter(item => !solid(item) && !gas(item))
    .reduce((sum, item) => sum + Math.max(0, item.mass_g), 0);
}

function bodies(vessel: OccupancyVessel) {
  if (!vessel.contents) return [];
  const cached = bodyCache.get(vessel.contents);
  if (cached) return cached;
  const result = vessel.contents.filter(item => solid(item) && item.mass_g > 0
    && item.location !== 'filter' && item.location !== 'foam').flatMap(item => {
    const ice = sameMolecularFormula(item.formula, 'H2O');
    // Never use the density of an aqueous stock for its crystalline solid.
    const profile = item.solidOrigin === 'precipitate' ? getPrecipitateProfile(item.formula) : null;
    const density = ice ? ICE_DENSITY_G_ML : profile && profile.modelBasis !== 'generic_fallback'
      ? profile.particleDensity_g_cm3 : solidDensities.find(chemical => sameMolecularFormula(chemical.formula, item.formula))?.density;
    if (!(density! > 0) || !Number.isFinite(density)) return [];
    return [{ mass_g: item.mass_g, volume_ml: item.mass_g / density!, ice }];
  });
  bodyCache.set(vessel.contents, result);
  return result;
}

/** Archimedes: floating material displaces m/rho_liquid, submerged material V_solid.
 * Immersion uses compact equivalent spheres resting on the floor (the existing
 * beaker ice mesh uses a slab). Powder packing, trapped air and wetting are not
 * resolved. Unknown solid densities are left unestimated.
 * https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy
 */
export function solidDisplacementAtSurface(vessel: OccupancyVessel, surfaceVolume_ml: number,
  liquidDensity = vessel.volume_ml > 0 ? liquidInventoryMass(vessel) / vessel.volume_ml : 1): number {
  if (!(vessel.capacity_ml > 0) || !(surfaceVolume_ml > 0)) return 0;
  const { floorY } = liquidGeometry(vessel.type);
  const worldPerMl = solidSceneVolume(vessel, 1);
  const depth = liquidLevelForVolume(vessel.type, surfaceVolume_ml, vessel.capacity_ml) - floorY;
  return bodies(vessel).reduce((sum, body) => {
    const worldVolume = body.volume_ml * worldPerMl;
    let immersed: number;
    if (body.ice) {
      const chunk = solidBlockDimensions(vessel, body.volume_ml);
      const immersedDepth = Math.max(0, depth + floorY - chunk.floorY);
      immersed = Math.min(worldVolume, chunk.width * chunk.width * immersedDepth) / worldPerMl;
    } else {
      const r = Math.cbrt(3 * worldVolume / (4 * Math.PI));
      const d = Math.min(2 * r, depth);
      immersed = Math.PI * d * d * (r - d / 3) / worldPerMl;
    }
    // The ice-water specimen retains its pure-water reference density.
    const density = body.ice ? 1 : liquidDensity;
    const afloat = density > 0 ? body.mass_g / density : body.volume_ml;
    return sum + Math.min(immersed, body.volume_ml, afloat);
  }, 0);
}

/** Entire solid material occupies interior space, including its dry portion.
 * Unknown densities remain unestimated, as in the displacement model. */
export function solidMaterialVolumeMl(vessel: OccupancyVessel): number {
  return bodies(vessel).reduce((sum, body) => sum + body.volume_ml, 0);
}

/** Display/contact level; never changes the actual liquid inventory. */
export function occupiedLiquidVolume(vessel: OccupancyVessel): number {
  const liquid = Math.max(0, vessel.volume_ml);
  if (liquid === 0) return 0;
  const solidBodies = bodies(vessel);
  if (!solidBodies.length) return liquid;
  let low = liquid, high = liquid + solidBodies.reduce((sum, body) => sum + body.volume_ml, 0);
  const displacement = solidDisplacementAtSurface(vessel, high);
  if (Math.abs(solidDisplacementAtSurface(vessel, low) - displacement) < 1e-10) return liquid + displacement;
  for (let i = 0; i < 48; i++) {
    const middle = (low + high) / 2;
    if (middle - solidDisplacementAtSurface(vessel, middle) < liquid) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/** Incoming liquid also changes mixture density and hence floating displacement.
 * Volumes are additive here; solution contraction requires measured density data. */
export function availableLiquidVolume(vessel: OccupancyVessel, incomingDensity = 1): number {
  const held = Math.max(0, vessel.wallCoating_ml ?? 0);
  const nominal = Math.max(0, vessel.capacity_ml - vessel.volume_ml - held);
  if (!bodies(vessel).length || nominal === 0) return nominal;
  const mass = liquidInventoryMass(vessel);
  let low = 0, high = nominal;
  const fits = (added: number) => {
    const volume = vessel.volume_ml + added;
    const density = volume > 0 ? (mass + added * incomingDensity) / volume : incomingDensity;
    return volume + solidDisplacementAtSurface(vessel, vessel.capacity_ml, density) + held <= vessel.capacity_ml;
  };
  if (!fits(0)) return 0;
  if (fits(high)) return high;
  for (let i = 0; i < 40; i++) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return low;
}
