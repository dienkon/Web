import { create } from 'zustand';
import type { PhysicalBodyInput, SimulationSnapshot } from './types';
export interface PhysicsUIState {
  enabled: boolean; panelOpen: boolean; status: 'off' | 'starting' | 'running' | 'error'; error: string | null;
  snapshot: SimulationSnapshot | null; previous: SimulationSnapshot | null; receivedAt: number;
  expansions: PhysicalBodyInput[]; revision: number;
  setEnabled: (enabled: boolean) => void; setPanelOpen: (open: boolean) => void;
  addExpansion: (input: PhysicalBodyInput) => void; clearExpansions: () => void;
}
export const usePhysicsStore = create<PhysicsUIState>((set) => ({
  enabled: false, panelOpen: false, status: 'off', error: null, snapshot: null, previous: null,
  receivedAt: 0, expansions: [], revision: 0,
  setEnabled: enabled => set(s => ({ enabled, revision: s.revision + 1, status: enabled ? 'starting' : 'off', error: null, snapshot: null, previous: null })),
  setPanelOpen: panelOpen => set({ panelOpen }),
  addExpansion: input => set(s => ({ expansions: [...s.expansions, input] })),
  clearExpansions: () => set({ expansions: [] }),
}));
