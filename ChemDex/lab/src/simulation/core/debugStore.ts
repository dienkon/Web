import { create } from 'zustand';

export interface SimulationDebugState {
  // Visual Toggles
  showGravity: boolean;
  showContainerTilt: boolean;
  showLiquidPlane: boolean;
  showPourTrajectory: boolean;
  showMixingZone: boolean;
  showNucleationSites: boolean;
  showSedimentBounds: boolean;
  showTelemetryOverlay: boolean;

  // Actions
  toggleDebug: (key: keyof Omit<SimulationDebugState, 'toggleDebug' | 'setDebug'>) => void;
  setDebug: (key: keyof Omit<SimulationDebugState, 'toggleDebug' | 'setDebug'>, value: boolean) => void;
}

export const useSimulationDebugStore = create<SimulationDebugState>((set) => ({
  showGravity: false,
  showContainerTilt: false,
  showLiquidPlane: false,
  showPourTrajectory: true,
  showMixingZone: true,
  showNucleationSites: false,
  showSedimentBounds: false,
  showTelemetryOverlay: true,

  toggleDebug: (key) => set((state) => ({ [key]: !state[key] })),
  setDebug: (key, value) => set({ [key]: value }),
}));
