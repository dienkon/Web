import type { ActiveKineticsState } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { assessProgramConditions } from '../science/conditions';

/** Authored aqueous-contact relaxation, separate from the visual timeline.
 * halfTime_s is illustrative metadata, not a measured rate constant. Gas,
 * solid-surface and heat-activated reactions retain their own rate models. */
export function aqueousContactHalfTime(kinetics: Pick<ActiveKineticsState, 'program'>): number | null {
  const chemistry = kinetics.program?.chemistry;
  const rate = chemistry?.kinetics;
  const reactants = chemistry?.species.filter(s => s.role === 'reactant') ?? [];
  if (rate?.model !== 'instant' || !Number.isFinite(rate.halfTime_s) || rate.halfTime_s <= 0
    || !reactants.length || reactants.some(s => s.phase !== 'aq' && s.phase !== 'l')) return null;
  return rate.halfTime_s;
}

export function advanceAqueousContactProgress(kinetics: Pick<ActiveKineticsState, 'program' | 'progress' | 'duration'>, dt: number): number {
  const previous = Number.isFinite(kinetics.progress) ? Math.max(0, Math.min(1, kinetics.progress)) : 0;
  if (!Number.isFinite(dt) || dt <= 0) return previous;
  const halfTime = aqueousContactHalfTime(kinetics);
  if (halfTime === null) return Number.isFinite(kinetics.duration) && kinetics.duration > 0
    ? Math.min(1, previous + dt / kinetics.duration) : 1;
  const remaining = (1 - previous) * Math.exp(-Math.LN2 * dt / halfTime);
  // Complete the remaining <0.01% through the same finite ledger. Never
  // remove residual material or add a second heat/precipitate source.
  return remaining <= 1e-4 ? 1 : 1 - remaining;
}

/** Catalytic peroxide has one consumed reagent. Honor its authored first-order
 * half-time rather than the seven-second effect clip. This remains an
 * illustrative rate: no measured temperature/surface law is available. */
export function advanceCatalyticProgress(kinetics: ActiveKineticsState, current: VesselState, dt: number): number {
  const program = kinetics.program;
  if (!program || !['first_order', 'induction_then_fast'].includes(program.chemistry.kinetics.model))
    return advanceAqueousContactProgress(kinetics, dt);
  const previous = Math.max(0, Math.min(1, kinetics.progress));
  const halfTime = program.chemistry.kinetics.halfTime_s;
  if (!Number.isFinite(dt) || dt <= 0 || !(halfTime > 0) || !Number.isFinite(halfTime)
    || !assessProgramConditions(program, current.contents, {
      temperature_c: current.temperature_c, volume_ml: current.volume_ml, pH: current.ph,
      isSealed: current.isSealed ?? false, ignitedProgramId: kinetics.initialVesselBaseline?.ignitedProgramId,
    }).ready) return previous;
  let reactingDt = dt;
  if (program.chemistry.kinetics.model === 'induction_then_fast') {
    const delay = program.chemistry.kinetics.induction_s ?? 0;
    if (!Number.isFinite(delay) || delay < 0) return previous;
    const elapsed = kinetics.inductionElapsed_s ?? 0;
    kinetics.inductionElapsed_s = elapsed + dt;
    reactingDt = Math.max(0, elapsed + dt - delay) - Math.max(0, elapsed - delay);
  }
  const remaining = (1 - previous) * Math.exp(-Math.LN2 * reactingDt / halfTime);
  return remaining <= 1e-4 ? 1 : 1 - remaining;
}
