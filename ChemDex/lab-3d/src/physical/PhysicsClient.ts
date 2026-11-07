import type { SimulationCommand, SimulationSnapshot } from './types';
import type { RuntimeSave } from './PhysicsRuntime';
type CommandData = SimulationCommand extends infer C ? C extends SimulationCommand ? Omit<C, 'sequence' | 'tick'> : never : never;
type Response = { requestId: number; kind: 'snapshot'; snapshot: SimulationSnapshot }
  | { requestId: number; kind: 'save'; save: RuntimeSave } | { requestId: number; kind: 'error'; message: string };

export class PhysicsClient {
  private worker: Worker;
  private sequence = 0;
  private requestId = 0;
  private tick = 0;
  private requests = new Map<number, { resolve: (r: Response) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private disposed = false;
  constructor(private onSnapshot: (snapshot: SimulationSnapshot) => void, private onError: (error: string) => void) {
    this.worker = new Worker(new URL('./physics.worker.ts', import.meta.url), { type: 'module', name: 'chemdex-physics' });
    this.worker.onmessage = (event: MessageEvent<Response>) => {
      const response = event.data, pending = this.requests.get(response.requestId);
      if (!pending) return;
      clearTimeout(pending.timer); this.requests.delete(response.requestId);
      if (response.kind === 'error') { const error = new Error(response.message); pending.reject(error); this.onError(error.message); }
      else {
        if (response.kind === 'snapshot') { this.tick = response.snapshot.tick; this.onSnapshot(response.snapshot); }
        pending.resolve(response);
      }
    };
    this.worker.onerror = event => { this.fail(event.message || 'Physics worker failed'); };
    this.worker.onmessageerror = () => this.fail('Physics snapshot could not be decoded');
  }
  private fail(message: string) {
    for (const p of this.requests.values()) { clearTimeout(p.timer); p.reject(new Error(message)); }
    this.requests.clear(); this.onError(message);
  }
  private send(data: object): Promise<Response> {
    if (this.disposed) return Promise.reject(new Error('Physics worker disposed'));
    const requestId = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.requests.delete(requestId); reject(new Error('Physics worker timed out')); this.onError('Physics worker timed out');
      }, 30000);
      this.requests.set(requestId, { resolve, reject, timer });
      this.worker.postMessage({ ...data, requestId });
    });
  }
  initialize(seed: number, initialTick = 0) { return this.send({ kind: 'initialize', seed, initialTick }); }
  command(data: CommandData): SimulationCommand { return { ...data, sequence: ++this.sequence, tick: this.tick } as SimulationCommand; }
  batch(commands: SimulationCommand[]) { return this.send({ kind: 'commands', commands }); }
  async save(): Promise<RuntimeSave> {
    const response = await this.send({ kind: 'save' });
    if (response.kind !== 'save') throw new Error('Invalid save response');
    return response.save;
  }
  async restore(save: RuntimeSave) {
    const response = await this.send({ kind: 'restore', save });
    this.sequence = save.sequence; this.tick = save.tick; return response;
  }
  dispose() {
    this.disposed = true; this.worker.terminate();
    for (const p of this.requests.values()) { clearTimeout(p.timer); p.reject(new Error('Physics worker disposed')); }
    this.requests.clear();
  }
}
