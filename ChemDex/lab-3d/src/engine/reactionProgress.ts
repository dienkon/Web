import type { ActiveKineticsState } from '../store/useAppStore';

/** A withdrawal keeps the visible clock but starts material replay at zero
 * against the remaining sample. Multiple withdrawals may move this anchor. */
export function reactionReplayProgress(kinetics: Pick<ActiveKineticsState, 'replayProgressBase'>, progress: number): number {
  const base = kinetics.replayProgressBase ?? 0;
  return base < 1 ? Math.max(0, Math.min(1, (progress - base) / (1 - base))) : 1;
}
