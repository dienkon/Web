import type { SubstanceContent, VesselState } from '../types/chemistry';
import { identifySpecies } from '../science/speciesIdentity';
import { withdrawAliquot, type LiquidAliquot } from './aliquot';

export type RinseTool = 'pipette' | 'stirring_rod' | 'spatula';
export interface RinseSession {
  id: number;
  tool: RinseTool;
  bottleId: string;
  epoch: number;
  elapsed_s: number;
  target_ml: number;
  dispensed_ml: number;
  phase: 'positioning' | 'washing' | 'draining';
  /** Center of the temporary collecting tray, in scene coordinates. */
  anchor: [number, number, number];
}

export const RINSE_VOLUME_ML = 5;
export const RINSE_POSITION_S = 0.35;
export const RINSE_FLOW_ML_S = 2;
export const RINSE_DRAIN_S = 0.4;

export function pipetteHasRinseSample(sample: LiquidAliquot | null): boolean {
  return !!sample && (!Number.isFinite(sample.volume_ml) || sample.volume_ml < 0
    || !Number.isFinite(sample.mass_g) || sample.mass_g < 0
    || sample.contents.some(row => !Number.isFinite(row.mass_g) || row.mass_g < 0
      || !Number.isFinite(row.moles) || row.moles < 0
      || row.mass_g > 1e-10 || row.moles > 1e-12)
    || sample.volume_ml > 1e-10 || sample.mass_g > 1e-10);
}

/** Labels alone do not establish a finite water supply. */
export function isRinseWater(bottle: VesselState | undefined): bottle is VesselState {
  if (!bottle || bottle.type !== 'wash_bottle' || bottle.isShattered || bottle.isSealed || bottle.isLocked
    || !Number.isFinite(bottle.volume_ml) || bottle.volume_ml <= 0
    || !Number.isFinite(bottle.mass_g) || bottle.mass_g <= 0) return false;
  if (bottle.contents.some(row => !Number.isFinite(row.mass_g) || row.mass_g < 0
    || !Number.isFinite(row.moles) || row.moles < 0)) return false;
  const liquidWater = (formula: string) => {
    const species = identifySpecies(formula);
    return species.formula.toLowerCase() === 'h2o' && species.phase !== 's' && species.phase !== 'g';
  };
  const rows = bottle.contents.filter(row => row.mass_g > 1e-12 || row.moles > 1e-12);
  return rows.length > 0 && rows.every(row => row.mass_g > 0 && row.moles > 0 && liquidWater(row.formula)
    && ['l', 'aq', undefined].includes(row.phase) && ['l', 'aq', 'liquid', 'aqueous', undefined].includes(row.state)
    && (!row.location || row.location === 'bulk'))
    && bottle.substances.every(liquidWater);
}

/** Each accepted portion goes directly from the bottle ledger to collected waste.
 * Cancelling never refunds water that has already washed over the tool. */
export function advanceInstrumentRinse(session: RinseSession, bottle: VesselState | undefined, dt: number): {
  session: RinseSession; bottle?: VesselState; sample?: LiquidAliquot; complete: boolean; failed: boolean;
} {
  const unchanged = { session, complete: false, failed: false };
  if (!Number.isFinite(dt) || dt <= 0) return unchanged;
  const flowEnd = RINSE_POSITION_S + session.target_ml / RINSE_FLOW_ML_S;
  const elapsed_s = Math.min(flowEnd + RINSE_DRAIN_S, session.elapsed_s + dt);
  const desired = Math.min(session.target_ml, Math.max(0, elapsed_s - RINSE_POSITION_S) * RINSE_FLOW_ML_S);
  const requested = Math.max(0, desired - session.dispensed_ml);
  if (session.dispensed_ml < session.target_ml - 1e-10 && !isRinseWater(bottle)) return { ...unchanged, failed: true };
  const transfer = requested > 0 && bottle ? withdrawAliquot(bottle, requested) : null;
  const dispensed_ml = Math.min(session.target_ml, session.dispensed_ml + (transfer?.sample.volume_ml ?? 0));
  const failed = !!transfer && transfer.sample.volume_ml + 1e-10 < requested;
  const phase = elapsed_s < RINSE_POSITION_S ? 'positioning' : elapsed_s < flowEnd ? 'washing' : 'draining';
  return { session: { ...session, elapsed_s, dispensed_ml, phase },
    ...(transfer ? { bottle: transfer.vessel, sample: transfer.sample } : {}), failed,
    complete: !failed && elapsed_s >= flowEnd + RINSE_DRAIN_S && dispensed_ml >= session.target_ml - 1e-10 };
}

export function collectRinseWaste(previous: SubstanceContent[], sample: LiquidAliquot): SubstanceContent[] {
  const contents = previous.map(row => ({ ...row }));
  for (const source of sample.contents) {
    const row = contents.find(item => item.formula === source.formula && item.phase === source.phase
      && item.state === source.state && !item.liquidLayer && (!item.location || item.location === 'bulk'));
    if (!row) contents.push({ ...source, location: 'bulk' });
    else {
      row.mass_g += source.mass_g;
      row.moles += source.moles;
      if (source.volume_ml !== undefined) row.volume_ml = (row.volume_ml ?? 0) + source.volume_ml;
    }
  }
  return contents;
}
