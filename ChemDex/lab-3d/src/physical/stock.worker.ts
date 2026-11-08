import { StockWorld } from './StockWorld';
import type { StockBoundaryFrame, StockWorldInput } from './stockTypes';

const scope = self as unknown as { onmessage: ((e: MessageEvent<{ id: number; input: StockWorldInput; path: StockBoundaryFrame[]; paused: boolean; escaped: string[] }>) => void) | null; postMessage(data: unknown): void };
let runtime: StockWorld | undefined, queue = Promise.resolve();
scope.onmessage = event => {
  queue = queue.then(async () => {
    const { id, input, path, paused, escaped } = event.data;
    try {
      if (!runtime) runtime = await StockWorld.create();
      else {
        runtime.markEscaped(escaped);
        // Existing grains follow the recorded boundary history first. Fresh
        // chemical contact births belong at this request's latest time; they
        // must not be integrated over time that preceded their actual arrival.
        runtime.advanceBoundaryPath(path, paused);
      }
      runtime.sync(input);
      scope.postMessage({ id, snapshot: runtime.snapshot() });
    } catch (error) { scope.postMessage({ id, error: String(error) }); }
  });
};
