import type { VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';

/** Optical sampling of NEW solid product, never a second mass source or an
 * invented gas species. Carrier air transports these subvisible particles. */
export function solidAerosolVisuals(current: VesselState, previous: VesselState, programId: string | undefined, dt: number) {
  const species = programId === 'mg_o2_burn' ? 'MgO' : programId === 'nh3_hcl' ? 'NH4Cl' : null;
  if (!species || !(dt > 0) || !Number.isFinite(dt)) return [];
  const amount = (v: VesselState) => v.contents.reduce((sum, c) => sum + (c.phase === 's'
    && c.solidOrigin === 'precipitate' && sameMolecularFormula(c.formula, species) ? c.moles : 0), 0);
  const mol_s = Math.max(0, amount(current) - amount(previous)) / dt;
  return mol_s > 0 ? [{ formula: species, mol_s, rate: Math.min(80, mol_s * 120000), molarMass: 28.96 }] : [];
}
