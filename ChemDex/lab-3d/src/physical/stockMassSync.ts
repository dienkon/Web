import type { VesselState } from '../types/chemistry';
import type { StockGrainPose } from './stockTypes';
import { isContactSuspensionRow } from './stockLiquidContact';

type StockMotion = VesselState['stockMotion'];
export interface StockReplyRequest {
  motion: StockMotion;
  /** Actual macrostock groups sent to the worker, excluding coatings/precipitate. */
  masses: ReadonlyMap<string, number>;
}

/** Chemistry may change a carrier's mass while the worker advances its last
 * accepted trajectory. Such a change is not a pose restore or an undo. */
export function sameStockKinematics(a: StockMotion, b: StockMotion): boolean {
  if (a === b) return true;
  if (!a || !b || a.grains.length !== b.grains.length) return false;
  // An explicit empty restore marks a new uninitialized placement. Two such
  // branches have no carrier coordinates to compare, so identity is the only
  // evidence that a reply still belongs to the current placement.
  if (!a.grains.length) return false;
  const previous = new Map(a.grains.map(pose => [pose.id, pose]));
  return b.grains.every(pose => {
    const old = previous.get(pose.id);
    return old && old.formula === pose.formula && old.powder === pose.powder
      && (['position_m', 'rotation', 'velocity_m_s', 'angularVelocity_rad_s'] as const)
        .every(key => old[key].every((value, i) => value === pose[key][i]));
  });
}

/** Keep the worker's new trajectory and the chemistry ledger's latest mass.
 * Zero-mass markers survive until the worker acknowledges their removal; a
 * stale reply must not resurrect a consumed carrier or freeze its siblings. */
export function reconcileStockReplyPose(pose: StockGrainPose, requested: StockMotion,
  current: StockMotion): StockGrainPose {
  if (requested === current) return pose;
  const before = requested?.grains.find(item => item.id === pose.id);
  const after = current?.grains.find(item => item.id === pose.id);
  if (!before || !after || before.mass_g === after.mass_g) return pose;
  const mass_g = Math.max(0, after.mass_g);
  return { ...pose, mass_g, scale_m: pose.mass_g > 0
    ? pose.scale_m * Math.cbrt(mass_g / pose.mass_g) : after.scale_m };
}

/** Reconcile the complete vessel reply before processing escape candidates.
 * A newly born worker ID may have been consumed while its first reply was in
 * flight, when chemistry could only debit the unposed inventory. Keep known
 * carrier targets, and give new IDs only the remaining finite unposed budget.
 * Later doses stay unposed until their own contact request. Zero-mass markers
 * remain in the reply so neither an escape nor the next sync can revive them. */
export function reconcileStockReplyPoses(poses: readonly StockGrainPose[], requested: StockReplyRequest,
  current: VesselState): StockGrainPose[] {
  const inventory = new Map<string, number>();
  for (const row of current.contents) if (row.phase === 's' && row.mass_g > 0
    && row.location !== 'filter' && row.location !== 'foam' && !isContactSuspensionRow(current, row)) {
    inventory.set(row.formula, (inventory.get(row.formula) ?? 0) + row.mass_g);
  }
  const old = new Map(requested.motion?.grains.map(pose => [pose.id, pose]) ?? []);
  const targets = new Map(current.stockMotion?.grains.map(pose => [pose.id, pose]) ?? []);
  const oldMass = new Map<string, number>(), targetMass = new Map<string, number>(), bornMass = new Map<string, number>();
  for (const pose of old.values()) oldMass.set(pose.formula, (oldMass.get(pose.formula) ?? 0) + Math.max(0, pose.mass_g));
  for (const pose of targets.values()) targetMass.set(pose.formula, (targetMass.get(pose.formula) ?? 0) + Math.max(0, pose.mass_g));
  for (const pose of poses) if (!old.has(pose.id)) {
    bornMass.set(pose.formula, (bornMass.get(pose.formula) ?? 0) + Math.max(0, pose.mass_g));
  }
  return poses.map(pose => {
    const total = inventory.get(pose.formula) ?? 0, known = targetMass.get(pose.formula) ?? 0;
    const target = targets.get(pose.id);
    let mass_g: number;
    if (old.has(pose.id)) {
      // Normally exactly one target per old ID; downward normalization only
      // repairs a legacy snapshot whose represented mass exceeds its ledger.
      const overrepresented = known > total + Math.max(1e-12, total * 1e-9);
      mass_g = Math.max(0, target?.mass_g ?? 0) * (overrepresented ? total / known : 1);
    } else {
      const sentLoose = Math.max(0, (requested.masses.get(pose.formula) ?? 0) - (oldMass.get(pose.formula) ?? 0));
      const available = Math.min(sentLoose, Math.max(0, total - known));
      const born = bornMass.get(pose.formula) ?? 0;
      mass_g = Math.max(0, pose.mass_g) * (born > 0 ? Math.min(1, available / born) : 0);
    }
    if (mass_g <= 1e-12) mass_g = 0;
    return mass_g === pose.mass_g ? pose : { ...pose, mass_g,
      scale_m: pose.mass_g > 0 ? pose.scale_m * Math.cbrt(mass_g / pose.mass_g) : 0 };
  });
}
