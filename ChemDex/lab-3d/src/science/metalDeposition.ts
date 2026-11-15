import type { SubstanceContent, VesselState } from '../types/chemistry';
import { sameMolecularFormula } from './speciesIdentity';
import { attachedMetalMassForRow, metalDepositMetadata, metalDepositionRoute } from './metalSurfaceAppearance';
import { stockGrainContacts } from '../physical/stockLiquidContact';

/** Add a finite metal product while retaining the already accepted carrier
 * allocation during cumulative baseline replay. Only the newly generated
 * difference is distributed over the presently wetted substrate area. */
export function appendMetalDeposit(contents: SubstanceContent[], generated: SubstanceContent,
  reactionId: string, current: VesselState, contactVessel = current): boolean {
  const metadata = metalDepositMetadata(reactionId, generated.formula);
  if (!metadata.depositSubstrate || generated.phase !== 's') return false;
  const legacyRoute = metalDepositionRoute(current.lastReactionId ?? current.studioProgramId);
  const migrate = (rows: SubstanceContent[]) => legacyRoute?.id === metadata.depositionReactionId
    ? rows.map(row => !row.depositSubstrate && sameMolecularFormula(row.formula, generated.formula)
      && attachedMetalMassForRow({ ...current, contents: rows }, row) > 0 ? { ...row, ...metadata } : row) : rows;
  // A recognized legacy coating becomes explicit when that route next grows;
  // introducing the first tagged row must not release its older untagged part.
  const migrated = migrate(contents), acceptedRows = migrate(current.contents);
  for (let i = 0; i < contents.length; i++) contents[i] = migrated[i];
  const matching = (row: SubstanceContent) => row.phase === 's' && (!row.location || row.location === 'bulk')
    && sameMolecularFormula(row.formula, generated.formula) && row.depositSubstrate === metadata.depositSubstrate
    && row.depositionReactionId === metadata.depositionReactionId;
  const target = contents.filter(matching).reduce((sum, row) => sum + row.moles, generated.moles);
  const accepted = acceptedRows.filter(matching), acceptedMoles = accepted.reduce((sum, row) => sum + row.moles, 0);
  const keep = acceptedMoles > 0 ? Math.min(1, target / acceptedMoles) : 0;
  const retained = accepted.map(row => ({ ...row, moles: row.moles * keep, mass_g: row.mass_g * keep }));
  for (let i = contents.length - 1; i >= 0; i--) if (matching(contents[i])) contents.splice(i, 1);
  contents.push(...retained.filter(row => row.moles > 0));
  const extra = Math.max(0, target - acceptedMoles * keep);
  if (!(extra > 0)) return true;
  const massPerMol = generated.mass_g / generated.moles;
  const contacts = stockGrainContacts(contactVessel, metadata.depositSubstrate).filter(contact => contact.wetArea > 0 && contact.mass_g > 0);
  const area = contacts.reduce((sum, contact) => sum + contact.wetArea, 0);
  const add = (moles: number, carrierId?: string, released = false) => {
    const existing = contents.find(row => matching(row) && row.depositCarrierId === carrierId && !!row.depositReleased === released);
    if (existing) { existing.moles += moles; existing.mass_g += moles * massPerMol; }
    else contents.push({ ...generated, ...metadata, moles, mass_g: moles * massPerMol,
      ...(carrierId ? { depositCarrierId: carrierId } : {}), ...(released ? { depositReleased: true } : {}) });
  };
  if (area > 0) for (const contact of contacts) add(extra * contact.wetArea / area, contact.id);
  else {
    // Unresolved static geometry retains a formula-host approximation. If
    // actual carriers exist but none is wetted, keep the product free rather
    // than attaching it to a known dry surface.
    const knownCarriers = contactVessel.stockMotion?.grains.some(pose => sameMolecularFormula(pose.formula, metadata.depositSubstrate!));
    add(extra, undefined, !!knownCarriers);
  }
  return true;
}
