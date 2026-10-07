/**
 * CORE EVENT BUS
 * Decoupled event transmission between Simulation Core, Renderer, Audio, and UI.
 * Lightweight, zero-allocation handler indexing.
 */

export type SimEventMap = {
  'reaction:start': { vesselId: string; reactionId: string; equation: string };
  'reaction:progress': { vesselId: string; reactionId: string; extentRate: number; progress: number };
  'reaction:complete': { vesselId: string; reactionId: string };
  'phase:boiling_onset': { vesselId: string; temp_c: number };
  'phase:boiling_rolling': { vesselId: string; temp_c: number; heatPower_W: number };
  'phase:boil_dry': { vesselId: string; glassTemp_c: number };
  'precipitate:nucleated': { vesselId: string; substance: string; mass_g: number; morphology: string };
  'gas:evolution': { vesselId: string; gasFormula: string; molarRate_mol_s: number };
  'pour:stream_start': { fromId: string; toId?: string };
  'pour:impact': { toId: string; flowRate_ml_s: number; position: [number, number, number] };
  'pour:stream_end': { fromId: string };
  'audio:event': { type: 'bubble' | 'fizz' | 'boil' | 'pour' | 'clink' | 'flame' | 'spark' | 'hiss'; intensity: number; pitch?: number; position?: [number, number, number] };
  'conservation:telemetry': { vesselId: string; massError_rel: number; chargeError: number; energyError_rel: number };
  'safety:warning': { level: 'info' | 'warning' | 'critical'; title: string; message: string };
};

type EventHandler<T> = (data: T) => void;

export class SimEventBus {
  private listeners: { [K in keyof SimEventMap]?: EventHandler<SimEventMap[K]>[] } = {};

  public on<K extends keyof SimEventMap>(event: K, handler: EventHandler<SimEventMap[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(handler);
    return () => this.off(event, handler);
  }

  public off<K extends keyof SimEventMap>(event: K, handler: EventHandler<SimEventMap[K]>): void {
    const list = this.listeners[event];
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  public emit<K extends keyof SimEventMap>(event: K, data: SimEventMap[K]): void {
    const list = this.listeners[event];
    if (!list || list.length === 0) return;
    // Iterate over slice to tolerate unsubscriptions during dispatch
    const len = list.length;
    for (let i = 0; i < len; i++) {
      list[i](data);
    }
  }

  public clear(): void {
    this.listeners = {};
  }
}

export const defaultEventBus = new SimEventBus();
