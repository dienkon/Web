export interface VfxEventMap {
  'reaction:start': { vesselId: string; reactionId?: string; mixResult?: any };
  'reaction:end': { vesselId: string; reactionId?: string };
  'pour:start': { sourceId: string; targetId: string | null; mode: string };
  'pour:end': { sourceId: string; targetId: string | null; transferred_ml?: number };
  'pour:impact': {
    sourceId?: string;
    targetId?: string;
    position: [number, number, number];
    color: string;
    volume_ml?: number;
    flowRate?: number;
  };
  'burner:ignite': {
    burnerId: string;
    position: [number, number, number];
    intensity: number;
  };
  'explosion': {
    vesselId: string;
    position: [number, number, number];
    intensity: number;
    color?: string;
    isDangerous?: boolean;
  };
  'acid:splatter': {
    vesselId?: string;
    position: [number, number, number];
    count?: number;
    speed?: number;
    color?: string;
    substances?: string[];
    isAcid?: boolean;
    spread?: number;
  };
  'boil': {
    vesselId: string;
    position: [number, number, number];
    intensity: number;
  };
  'particle:burst': {
    position: [number, number, number];
    count: number;
    color?: string;
    speed?: number;
  };
  'sparks': {
    position: [number, number, number];
    count: number;
    color?: string;
    speed?: number;
  };
  'flame:test': {
    element: string;
    color: string;
    cobaltFilter: boolean;
  };
  'surface:ripple': {
    x: number;
    z: number;
    intensity: number;
    vesselId?: string;
  };
}

export type VfxEventType = keyof VfxEventMap;
export type VfxEventListener<T extends VfxEventType> = (data: VfxEventMap[T]) => void;

class VfxEventBus {
  private listeners: { [K in VfxEventType]?: Set<VfxEventListener<K>> } = {};

  public on<T extends VfxEventType>(event: T, listener: VfxEventListener<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as Set<VfxEventListener<T>>).add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  public off<T extends VfxEventType>(event: T, listener: VfxEventListener<T>): void {
    const set = this.listeners[event];
    if (set) {
      (set as Set<VfxEventListener<T>>).delete(listener);
    }
  }

  public emit<T extends VfxEventType>(event: T, data: VfxEventMap[T]): void {
    const set = this.listeners[event];
    if (set && set.size > 0) {
      set.forEach((fn) => {
        try {
          (fn as VfxEventListener<T>)(data);
        } catch (err) {
          console.error(`Error in VFX event listener for ${event}:`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners = {};
  }
}

export const vfxBus = new VfxEventBus();
