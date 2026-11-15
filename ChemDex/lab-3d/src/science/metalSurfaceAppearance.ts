import type { SubstanceContent, VesselState } from '../types/chemistry';
import { isSuspensionRow } from './precipitateInventory';
import { identifySpecies, sameMolecularFormula } from './speciesIdentity';

const routes: Record<string, { id: string; substrate: string; product: string; color: string }> = {
  zn_agno3: { id: 'zn_agno3', substrate: 'Zn', product: 'Ag', color: '#cbd5e1' },
  cu_agno3: { id: 'cu_agno3', substrate: 'Cu', product: 'Ag', color: '#cbd5e1' },
  fe_cuso4: { id: 'fe_cuso4', substrate: 'Fe', product: 'Cu', color: '#b87346' },
  zn_cuso4: { id: 'zn_cuso4', substrate: 'Zn', product: 'Cu', color: '#b87346' },
  mg_cuso4: { id: 'mg_cuso4', substrate: 'Mg', product: 'Cu', color: '#b87346' },
  'zn+pb(no3)2': { id: 'zn+pb(no3)2', substrate: 'Zn', product: 'Pb', color: '#676b70' },
};
const aliases: Record<string, string> = { fe_cuso4_displacement: 'fe_cuso4', zn_cuso4_displacement: 'zn_cuso4',
  cu_agno3_displacement: 'cu_agno3', zn_agno3_displacement: 'zn_agno3', mg_cuso4_displacement: 'mg_cuso4' };
export const metalDepositionRoute = (id?: string) => id ? routes[aliases[id] ?? id] ?? null : null;
export function supportedMetalDepositProducts(substrate: string): string[] {
  return [...new Set(Object.values(routes).filter(route => sameMolecularFormula(route.substrate, substrate)).map(route => route.product))];
}

export function metalDepositMetadata(reactionId: string, product: string): Pick<SubstanceContent, 'depositSubstrate' | 'depositionReactionId'> {
  const route = metalDepositionRoute(reactionId);
  return route && sameMolecularFormula(route.product, product)
    ? { depositSubstrate: route.substrate, depositionReactionId: route.id } : {};
}

const bulkSolid = (row: SubstanceContent) => (row.phase ?? row.state ?? identifySpecies(row.formula).phase) === 's'
  && (!row.location || row.location === 'bulk') && Number.isFinite(row.mass_g) && row.mass_g > 0;
const substrateMass = (contents: readonly SubstanceContent[], formula: string, legacy?: string) => contents
  .filter(row => bulkSolid(row) && sameMolecularFormula(row.formula, formula) && !row.depositSubstrate
    && !isSuspensionRow(row, contents, legacy)).reduce((sum, row) => sum + row.mass_g, 0);

/** Exact row allocation. Attachment is provenance, never inferred anew from a
 * later reaction. Existing saves retain the narrow known-route fallback. No
 * empirical adhesion or stirring-detachment coefficient is assumed. */
export function attachedMetalMassForRow(vessel: VesselState, row: SubstanceContent): number {
  if (!bulkSolid(row) || row.depositReleased) return 0;
  if (row.depositSubstrate) {
    if (!(substrateMass(vessel.contents, row.depositSubstrate, vessel.precipitateSubstance) > 1e-12)) return 0;
    if (row.depositCarrierId && !vessel.stockMotion?.grains.some(pose => pose.id === row.depositCarrierId
      && pose.mass_g > 1e-12 && sameMolecularFormula(pose.formula, row.depositSubstrate!))) return 0;
    return row.mass_g;
  }
  const route = metalDepositionRoute(vessel.lastReactionId ?? vessel.studioProgramId);
  if (!route || !sameMolecularFormula(row.formula, route.product)
    || !isSuspensionRow(row, vessel.contents, vessel.precipitateSubstance)
    || vessel.contents.some(other => other.depositSubstrate && sameMolecularFormula(other.formula, route.product))) return 0;
  return substrateMass(vessel.contents, route.substrate, vessel.precipitateSubstance) > 1e-12 ? row.mass_g : 0;
}

/** Exact carrier provenance where present; old static/legacy deposits share
 * only the unresolved remainder by surviving core mass. */
export function attachedMetalMassForCarrier(vessel: VesselState, carrierId: string, product?: string): number {
  const pose = vessel.stockMotion?.grains.find(p => p.id === carrierId && p.mass_g > 0);
  if (!pose) return 0;
  const totalCore = substrateMass(vessel.contents, pose.formula, vessel.precipitateSubstance);
  const legacy = metalDepositionRoute(vessel.lastReactionId ?? vessel.studioProgramId);
  return vessel.contents.reduce((sum, row) => {
    if (product && !sameMolecularFormula(row.formula, product)) return sum;
    const mass = attachedMetalMassForRow(vessel, row);
    if (!mass) return sum;
    if (row.depositCarrierId) return sum + (row.depositCarrierId === carrierId ? mass : 0);
    const substrate = row.depositSubstrate ?? legacy?.substrate;
    return sum + (substrate && sameMolecularFormula(substrate, pose.formula) && totalCore > 0 ? mass * pose.mass_g / totalCore : 0);
  }, 0);
}

/** Reference bulk metal densities in g/mL; the deposited porosity and its
 * hydrodynamic envelope are not resolved by this material-volume budget. */
export const DEPOSIT_DENSITY_G_ML: Readonly<Record<string, number>> = { Cu: 8.96, Ag: 10.5, Pb: 11.34 };
export function attachedMetalForCarrier(vessel: VesselState, carrierId: string): { mass_g: number; volume_ml: number } {
  let mass_g = 0, volume_ml = 0;
  for (const [product, density] of Object.entries(DEPOSIT_DENSITY_G_ML)) {
    const mass = attachedMetalMassForCarrier(vessel, carrierId, product);
    mass_g += mass; volume_ml += mass / density;
  }
  return { mass_g, volume_ml };
}

export interface MetalSurfaceAppearance {
  substrate: string; product: string; color: string; substrateMass_g: number; attachedMass_g: number; colorFraction: number;
}
export function metalSurfaceAppearances(vessel: VesselState): MetalSurfaceAppearance[] {
  const groups = new Map<string, MetalSurfaceAppearance>();
  const legacy = metalDepositionRoute(vessel.lastReactionId ?? vessel.studioProgramId);
  for (const row of vessel.contents) {
    const attached = attachedMetalMassForRow(vessel, row);
    if (!(attached > 0)) continue;
    const substrate = row.depositSubstrate ?? legacy!.substrate, product = identifySpecies(row.formula).formula;
    const key = `${substrate}|${product}`, old = groups.get(key);
    if (old) old.attachedMass_g += attached;
    else groups.set(key, { substrate, product, color: product === 'Ag' ? '#cbd5e1' : product === 'Pb' ? '#676b70' : '#b87346',
      substrateMass_g: substrateMass(vessel.contents, substrate, vessel.precipitateSubstance), attachedMass_g: attached, colorFraction: 0 });
  }
  return [...groups.values()].map(group => ({ ...group,
    colorFraction: group.attachedMass_g / (group.attachedMass_g + group.substrateMass_g) }));
}

/** Compatibility for single-coating clients; mass-sensitive callers use the
 * row allocator or complete list, supporting several hosts/products. */
export const metalSurfaceAppearance = (vessel: VesselState) => metalSurfaceAppearances(vessel)[0] ?? null;

/** Keep release history so a newly added substrate cannot reclaim metal
 * already liberated by complete consumption of the original support. */
export function releaseUnsupportedMetalDeposits(contents: readonly SubstanceContent[],
  stockMotion?: VesselState['stockMotion']): SubstanceContent[] {
  return contents.map(row => row.depositSubstrate && !row.depositReleased
    && (!(substrateMass(contents, row.depositSubstrate) > 1e-12)
      // Omitted motion is an unresolved/static inventory, not evidence of a
      // lost host. An accepted snapshot (including zero-mass tombstones) is
      // authoritative for explicit carrier IDs, even if siblings survive.
      || row.depositCarrierId && stockMotion !== undefined && !stockMotion.grains.some(pose =>
        pose.id === row.depositCarrierId && pose.mass_g > 1e-12 && sameMolecularFormula(pose.formula, row.depositSubstrate!)))
    ? { ...row, depositReleased: true } : row);
}

/** Coating follows its own withdrawn carrier. Unresolved old deposits share
 * by core mass, explicitly without an independent adhesion history. */
export function splitAttachedMetal(vessel: VesselState, substrateFormula: string, transferredSubstrate_g: number, carrierId?: string) {
  const total = substrateMass(vessel.contents, substrateFormula, vessel.precipitateSubstance);
  const core = carrierId ? vessel.stockMotion?.grains.find(p => p.id === carrierId)?.mass_g ?? 0 : total;
  const fraction = core > 0 ? Math.max(0, Math.min(1, transferredSubstrate_g / core)) : 0;
  const sharedFraction = total > 0 ? Math.max(0, Math.min(1, transferredSubstrate_g / total)) : 0;
  const transferredContents: SubstanceContent[] = [];
  const legacy = metalDepositionRoute(vessel.lastReactionId ?? vessel.studioProgramId);
  const remainingContents = vessel.contents.flatMap(row => {
    const attached = attachedMetalMassForRow(vessel, row), substrate = row.depositSubstrate ?? legacy?.substrate;
    if (!(attached > 0) || !substrate || !sameMolecularFormula(substrate, substrateFormula)) return [row];
    const share = attached / row.mass_g * (row.depositCarrierId ? row.depositCarrierId === carrierId ? fraction : 0 : sharedFraction);
    if (!(share > 0)) return [row];
    const metadata = row.depositSubstrate ? {} : metalDepositMetadata(legacy!.id, row.formula);
    transferredContents.push({ ...row, ...metadata, mass_g: row.mass_g * share, moles: row.moles * share });
    return share < 1 ? [{ ...row, ...metadata, mass_g: row.mass_g * (1 - share), moles: row.moles * (1 - share) }] : [];
  });
  return { remainingContents, transferredContents };
}
