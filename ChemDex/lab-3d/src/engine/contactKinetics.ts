import type { ActiveKineticsState } from '../store/useAppStore';

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
