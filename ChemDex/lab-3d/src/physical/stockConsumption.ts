import type { SubstanceContent, VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { isContactSuspensionRow, stockGrainContacts, stockLiquidContactFraction } from './stockLiquidContact';

/** Project an already accepted, contact-capped ledger change onto carrier IDs.
 * Returns undefined without poses, the same snapshot on no change, or a new
 * snapshot with unchanged positions/velocities/tick. Zero-mass ID tombstones
 * survive until the next worker snapshot so a consumed grain cannot be
 * mistaken for a uniformly shrinking group. Unposed new doses remain unposed;
 * their consumed portion is spent first. Legacy overrepresented snapshots are
 * normalized downward once, never enlarged to represent a newly added dose. */
export function allocateStockConsumption(before: VesselState, afterContents: readonly SubstanceContent[],
  options: { requireLiquidContact?: boolean } = {}): VesselState['stockMotion'] {
  if (!before.stockMotion) return undefined;
  const stock = (row: SubstanceContent, contents: readonly SubstanceContent[]) => ['s', 'solid'].includes(row.phase ?? row.state ?? '')
    && (!row.location || row.location === 'bulk') && row.mass_g > 0
    && !isContactSuspensionRow({ ...before, contents: contents as SubstanceContent[] }, row);
  const previousRows = before.contents.filter(row => stock(row, before.contents));
  const nextRows = afterContents.filter(row => stock(row, afterContents));
  const targets = new Map<string, number>();
  for (const formula of new Set(previousRows.map(row => row.formula))) {
    const mass = previousRows.filter(row => sameMolecularFormula(row.formula, formula)).reduce((sum, row) => sum + row.mass_g, 0);
    const nextMass = nextRows.filter(row => sameMolecularFormula(row.formula, formula)).reduce((sum, row) => sum + row.mass_g, 0);
    const poses = before.stockMotion.grains.filter(pose => pose.mass_g > 0 && sameMolecularFormula(pose.formula, formula));
    const represented = poses.reduce((sum, pose) => sum + pose.mass_g, 0);
    if (!(represented > 0)) continue;
    const ratio = Math.min(1, mass / represented), loose = Math.max(0, mass - represented);
    const wetLoose = options.requireLiquidContact === false || !(loose > 0)
      || stockLiquidContactFraction({ ...before, stockMotion: undefined }, formula) > 0 ? loose : 0;
    let remaining = Math.max(0, mass - nextMass - wetLoose);
    const contacts = options.requireLiquidContact === false ? [] : stockGrainContacts(before, formula);
    const participants = poses.map(pose => {
      const contact = contacts.find(contact => contact.id === pose.id), available = pose.mass_g * ratio;
      targets.set(pose.id, available);
      return { id: pose.id, available, weight: options.requireLiquidContact === false
        ? available : contact?.wetArea ?? 0 };
    }).filter(item => item.weight > 0);
    // Water-filling allocation: exhausted grains leave the next weighted pass.
    for (let pass = 0; pass < participants.length && remaining > 1e-14; pass++) {
      const active = participants.filter(item => (targets.get(item.id) ?? 0) > 1e-14);
      const weight = active.reduce((sum, item) => sum + item.weight, 0);
      if (!(weight > 0)) break;
      let consumed = 0;
      for (const item of active) {
        const current = targets.get(item.id)!, amount = Math.min(current, remaining * item.weight / weight);
        targets.set(item.id, current - amount); consumed += amount;
      }
      remaining = Math.max(0, remaining - consumed);
    }
  }
  let changed = false;
  const grains = before.stockMotion.grains.map(pose => {
    let mass_g = targets.get(pose.id) ?? pose.mass_g;
    if (mass_g <= 1e-12) mass_g = 0;
    if (Math.abs(mass_g - pose.mass_g) <= 1e-14) return pose;
    changed = true;
    return { ...pose, mass_g, scale_m: pose.mass_g > 0 ? pose.scale_m * Math.cbrt(mass_g / pose.mass_g) : 0 };
  });
  return changed ? { ...before.stockMotion, grains } : before.stockMotion;
}
