import { PhysicsRuntime, type RuntimeSave } from './PhysicsRuntime';
import type { SimulationCommand } from './types';

type Request = { requestId: number } & (
  | { kind: 'initialize'; seed: number; initialTick: number }
  | { kind: 'commands'; commands: SimulationCommand[] }
  | { kind: 'save' }
  | { kind: 'restore'; save: RuntimeSave }
);
const scope = self as unknown as { onmessage: ((event: MessageEvent<Request>) => void) | null; postMessage(value: unknown): void };
let runtime: PhysicsRuntime | undefined;
let queue = Promise.resolve();
scope.onmessage = event => {
  queue = queue.then(async () => {
    const r = event.data;
    try {
      if (r.kind === 'initialize') { runtime?.free(); runtime = await PhysicsRuntime.create(r.seed, true, r.initialTick); }
      if (!runtime) throw new Error('Physics worker has not initialized');
      if (r.kind === 'save') { scope.postMessage({ requestId: r.requestId, kind: 'save', save: runtime.save() }); return; }
      if (r.kind === 'restore') runtime.restore(r.save);
      let snapshot;
      if (r.kind === 'commands') for (const c of r.commands) {
        const next = runtime.dispatch(c);
        snapshot = { ...next, impacts: [...(snapshot?.impacts ?? []), ...next.impacts] };
      }
      scope.postMessage({ requestId: r.requestId, kind: 'snapshot', snapshot: snapshot ?? runtime.snapshot() });
    } catch (error) { scope.postMessage({ requestId: r.requestId, kind: 'error', message: error instanceof Error ? error.message : String(error) }); }
  });
};
