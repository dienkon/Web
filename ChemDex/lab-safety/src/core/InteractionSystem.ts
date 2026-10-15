import { create } from 'zustand';
import type { Object3D } from 'three';

export type InteractableData = {
  id: string;
  position: [number, number, number];
  priority?: number;
  isActive: boolean; // if false, don't consider it
  label: string;
  aimPosition?: [number, number, number];
  reach?: number;
  radius?: number;
  object?: Object3D;
  requireSurfaceHit?: boolean;
};

interface InteractionState {
  interactables: Record<string, InteractableData>;
  nearestId: string | null;
  focusPoint: [number, number, number] | null;
  focusRadius: number;
  setFocus: (id: string | null, point?: [number, number, number], radius?: number) => void;
  register: (item: InteractableData) => void;
  unregister: (id: string) => void;
  setNearest: (id: string | null) => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  interactables: {},
  nearestId: null,
  focusPoint: null,
  focusRadius: .25,
  setFocus: (nearestId, point, radius = .25) => set(s => {
    if (s.nearestId === nearestId) return s;
    return { nearestId, focusPoint: point ?? null, focusRadius: radius };
  }),
  register: (item) => set((s) => ({ interactables: { ...s.interactables, [item.id]: item } })),
  unregister: (id) => set((s) => {
    const next = { ...s.interactables };
    delete next[id];
    return { interactables: next, nearestId: s.nearestId === id ? null : s.nearestId };
  }),
  setNearest: (id) => set({ nearestId: id }),
}));
