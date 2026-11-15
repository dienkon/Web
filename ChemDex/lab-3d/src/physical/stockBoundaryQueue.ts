import type { StockBoundaryFrame } from './stockTypes';

/** A busy worker must still receive the pickup and final placement, including
 * when no simulation time passes. Pausing discards elapsed time, not gestures. */
export function queueStockBoundaryFrame(queue: { pending: number; path: StockBoundaryFrame[] }, frame: StockBoundaryFrame, paused: boolean) {
  if (paused) {
    queue.pending = 0;
    for (const pending of queue.path) pending.seconds = 0;
  }
  const seconds = paused ? 0 : frame.seconds;
  if (seconds > 0 || frame.containers.some(pose => pose.carryStock || pose.releaseStock)) {
    queue.path.push({ ...frame, seconds });
    queue.pending += seconds;
  }
}
