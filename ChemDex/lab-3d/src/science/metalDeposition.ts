import type { SubstanceContent, VesselState } from '../types/chemistry';
import { sameMolecularFormula } from './speciesIdentity';
import { attachedMetalMassForRow, metalDepositCarrierFormula, metalDepositMetadata, metalDepositionRoute } from './metalSurfaceAppearance';
import { isContactSuspensionRow, stockGrainContacts } from '../physical/stockLiquidContact';
import { allocateStockConsumption } from '../physical/stockConsumption';

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
  const add = (moles: number, carrierFormula: string, carrierId?: string, released = false) => {
    if (!(moles > 0)) return;
    const existing = contents.find(row => matching(row) && row.depositCarrierId === carrierId
      && metalDepositCarrierFormula(row) === carrierFormula && !!row.depositReleased === released);
    if (existing) { existing.moles += moles; existing.mass_g += moles * massPerMol; }
    else contents.push({ ...generated, ...metadata, moles, mass_g: moles * massPerMol,
      depositCarrierFormula: carrierFormula,
      ...(carrierId ? { depositCarrierId: carrierId } : {}), ...(released ? { depositReleased: true } : {}) });
  };

  const substrate = metadata.depositSubstrate;
  const relevant = (row: SubstanceContent) => (row.phase ?? row.state) === 's' && (!row.location || row.location === 'bulk')
    && sameMolecularFormula(row.formula, substrate);
  // The product belongs to the material actually consumed. An independently
  // added Cu powder dose must not decorate a Cu-coated iron nail merely because
  // both rows have the same molecular formula. These provenance keys also work
  // when cumulative baseline replay contains only the newly accepted loss.
  const sourceKey = (row: SubstanceContent) => JSON.stringify([row.depositSubstrate ?? '',
    metalDepositCarrierFormula(row) ?? '', row.depositCarrierId ?? '', row.depositionReactionId ?? '',
    !!row.depositReleased, isContactSuspensionRow(contactVessel, row)]);
  const sources = new Map<string, { row: SubstanceContent; moles: number; mass_g: number; spent: number }>();
  for (const row of contactVessel.contents.filter(row => relevant(row) && row.moles > 0)) {
    const key = sourceKey(row), previous = sources.get(key);
    if (previous) { previous.moles += row.moles; previous.mass_g += row.mass_g; }
    else sources.set(key, { row, moles: row.moles, mass_g: row.mass_g, spent: 0 });
  }
  for (const [key, source] of sources) source.spent = Math.max(0, source.moles - contents
    .filter(row => relevant(row) && sourceKey(row) === key).reduce((sum, row) => sum + row.moles, 0));
  const spent = [...sources.values()].reduce((sum, source) => sum + source.spent, 0);
  const actualConsumption = spent > 1e-14;
  const total = actualConsumption ? spent : [...sources.values()].reduce((sum, source) => sum + source.moles, 0);
  let allocatedMotion: VesselState['stockMotion'];
  let hasAllocation = false;
  for (const source of sources.values()) {
    const weight = actualConsumption ? source.spent : source.moles;
    if (!(weight > 0) || !(total > 0)) continue;
    const amount = extra * (weight / total);
    const attached = attachedMetalMassForRow(contactVessel, source.row) > 0;
    const carrierFormula = attached ? metalDepositCarrierFormula(source.row) ?? legacyRoute?.substrate ?? substrate : substrate;
    const contacts = stockGrainContacts(contactVessel, carrierFormula).filter(contact => contact.wetArea > 0 && contact.mass_g > 0);
    if (attached && source.row.depositCarrierId) {
      const contact = contacts.find(item => item.id === source.row.depositCarrierId);
      add(amount, carrierFormula, source.row.depositCarrierId, !contact);
      continue;
    }
    if (!attached && isContactSuspensionRow(contactVessel, source.row)) {
      add(amount, carrierFormula, undefined, true);
      continue;
    }
    if (!attached && actualConsumption && contactVessel.stockMotion) {
      if (!hasAllocation) { allocatedMotion = allocateStockConsumption(contactVessel, contents); hasAllocation = true; }
      const molarMass = source.mass_g / source.moles;
      const losses = contacts.map(contact => ({ contact, moles: Math.max(0, contact.mass_g
        - (allocatedMotion?.grains.find(pose => pose.id === contact.id)?.mass_g ?? 0)) / molarMass }));
      const resolved = losses.reduce((sum, loss) => sum + loss.moles, 0);
      // Subtracting masses and moles follows different floating-point paths.
      // A rounding residual cannot manufacture a new free-metal population.
      const fullyResolved = Math.abs(resolved - weight) <= 64 * Number.EPSILON * source.moles;
      const resolvedAmount = fullyResolved ? amount : amount * Math.min(1, resolved / weight);
      for (const loss of losses) if (resolved > 0) add(resolvedAmount * (loss.moles / resolved), carrierFormula, loss.contact.id);
      // A fresh unposed dose can be spent before the older carriers. Its yield
      // remains free; it cannot attach to one of those unrelated older IDs.
      add(Math.max(0, amount - resolvedAmount), carrierFormula, undefined, true);
      continue;
    }
    const area = contacts.reduce((sum, contact) => sum + contact.wetArea, 0);
    if (area > 0) for (const contact of contacts) add(amount * (contact.wetArea / area), carrierFormula, contact.id);
    else {
      // Static old specimens have no carrier-resolved history. Keep their
      // formula-host approximation, while never attaching to a known dry ID.
      const known = contactVessel.stockMotion?.grains.some(pose => sameMolecularFormula(pose.formula, carrierFormula));
      add(amount, carrierFormula, undefined, !!known);
    }
  }
  if (!(total > 0)) add(extra, substrate, undefined, true);
  return true;
}
