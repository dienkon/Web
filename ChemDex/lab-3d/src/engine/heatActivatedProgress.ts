import type { ActiveKineticsState } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { applyProgramWithThermalSinks } from './thermalLedger';
import { reactionReplayProgress } from './reactionProgress';

/** Honor the program's declared activation domain continuously, not just at
 * startup. No Arrhenius constants are inferred from a visual duration.
 * For an endothermic step, replay the actual heat ledger to limit progress to
 * the heat currently available above the declared lower temperature bound. */
export function advanceHeatActivatedProgress(kinetics: ActiveKineticsState, current: VesselState, dt: number): number {
  const previous = Number.isFinite(kinetics.progress) ? Math.max(0, Math.min(1, kinetics.progress)) : 0;
  const program = kinetics.program, baseline = kinetics.initialVesselBaseline;
  const minimum = program?.chemistry.conditions?.minTemp_c;
  if (!program || !baseline || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(kinetics.duration)
    || kinetics.duration <= 0 || !Number.isFinite(current.temperature_c)) return previous;
  if (minimum !== undefined && (!Number.isFinite(minimum) || current.temperature_c < minimum)) return previous;
  const candidate = Math.min(1, previous + dt / kinetics.duration);
  const thermalLimit = minimum !== undefined && program.chemistry.deltaH_kJ_per_mol! > 0;
  const gasLimit = program.chemistry.species.some(s => s.role === 'reactant' && s.phase === 'g');
  if (!thermalLimit && !gasLimit) return candidate;
  const feasible = (extent: number) => {
    const next = applyProgramWithThermalSinks(program, baseline, current, reactionReplayProgress(kinetics, extent));
    return !next.gasReplayBlocked && (!thermalLimit || Number.isFinite(next.temperature_c) && next.temperature_c! >= minimum!);
  };
  if (feasible(candidate)) return candidate;
  let low = previous, high = candidate;
  // Low remains feasible; no speculative probe is committed to the store.
  for (let i = 0; i < 28; i++) {
    const middle = (low + high) / 2;
    if (feasible(middle)) low = middle; else high = middle;
  }
  return low;
}
