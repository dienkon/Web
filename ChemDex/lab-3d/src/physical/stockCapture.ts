import type { SpillState, VesselState } from '../types/chemistry';
import type { StockGrainPose } from './stockTypes';
import { drainVesselOverflow } from '../handling/pourReceiver';
import { refreshFlowInventory } from '../engine/funnelFlow';
import { sameMolecularFormula } from '../science/speciesIdentity';

/** Capture the actual finite core and its coating. Treating the sample's total
 * mass as a fresh dose of the core formula would transmute deposited metal. */
export function captureStockCarrier(receiver: VesselState, sample: SpillState, captured: StockGrainPose) {
  if (receiver.isSealed || receiver.isShattered || !(receiver.capacity_ml > 0)
    || !sample.stockMotion || !sample.contents?.length || sample.contents.some(row =>
      !['s', 'solid'].includes(row.phase ?? row.state ?? '') || !(row.mass_g >= 0)
      || row.location && row.location !== 'bulk')) return null;
  const rows = sample.contents.map(row => ({ ...row }));
  const mass = rows.reduce((sum, row) => sum + row.mass_g, 0);
  const core = rows.filter(row => sameMolecularFormula(row.formula, captured.formula) && !row.solidOrigin && !row.depositSubstrate)
    .reduce((sum, row) => sum + row.mass_g, 0);
  if (!(core > 1e-12) || !Number.isFinite(mass) || Math.abs(mass - sample.mass_g) > Math.max(1e-9, mass * 1e-8)) return null;
  const pose = { ...captured, mass_g: core, scale_m: captured.mass_g > 0
    ? captured.scale_m * Math.cbrt(core / captured.mass_g) : sample.stockMotion.scale_m };
  const stockMotion = { tick: receiver.stockMotion?.tick ?? 0,
    grains: [...(receiver.stockMotion?.grains ?? []).filter(p => p.id !== pose.id), pose] };
  const contents = [...receiver.contents, ...rows];
  const withSolid = { ...receiver, contents, stockMotion, mass_g: receiver.mass_g + mass };
  const drained = drainVesselOverflow(withSolid);
  return { vessel: refreshFlowInventory(drained.vessel), spill: drained.spill.volume_ml > 1e-12 ? drained.spill : undefined };
}
