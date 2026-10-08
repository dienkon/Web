import { create } from 'zustand';

export type InteractableData = {
  id: string;
  position: [number, number, number];
  isActive: boolean; // if false, don't consider it
  label: string;
};

interface InteractionState {
  interactables: Record<string, InteractableData>;
  nearestId: string | null;
  register: (item: InteractableData) => void;
  unregister: (id: string) => void;
  setNearest: (id: string | null) => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  interactables: {},
  nearestId: null,
  register: (item) => set((s) => ({ interactables: { ...s.interactables, [item.id]: item } })),
  unregister: (id) => set((s) => {
    const next = { ...s.interactables };
    delete next[id];
    return { interactables: next, nearestId: s.nearestId === id ? null : s.nearestId };
  }),
  setNearest: (id) => set({ nearestId: id }),
}));
