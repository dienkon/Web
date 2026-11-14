import { stepLabWorld } from '../../engine/labWorldStep';
import { useLabEnvironment } from '../useLabEnvironment';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type SimulationSlice = Pick<
  LabStoreState,
  | 'simulationPaused'
  | 'simTimeScale'
  | 'realtimeKinetics'
  | 'setSimulationPaused'
  | 'setSimTimeScale'
  | 'setRealtimeKinetics'
  | 'tickSimulation'
>;

export const createSimulationSlice: LabSliceCreator<SimulationSlice> = (set, get) => ({
  simulationPaused: false,
  simTimeScale: 1,
  realtimeKinetics: false,

  setSimulationPaused: (simulationPaused) => set({ simulationPaused }),
  setSimTimeScale: (simTimeScale) => set({ simTimeScale }),
  setRealtimeKinetics: (realtimeKinetics) => {
    if (get().realtimeKinetics !== realtimeKinetics) {
      set({ realtimeKinetics });
    }
  },

  tickSimulation: (rawDt) => {
    const state = get();
    if (state.simulationPaused) return;
    if (Object.keys(state.equipment).length === 0) return;

    const env = useLabEnvironment.getState().environment;
    const result = stepLabWorld(state, rawDt, env);

    if (result.shouldApplyPatch) {
      set(curr => ({
        ...result.patch,
        ...(result.newLogs.length > 0 ? { history: [...curr.history, ...result.newLogs] } : {}),
      }));
      get().checkStepProgress();
      for (const vid of result.geminiCheckVesselIds) {
        get().triggerGeminiReactionCheck(vid);
      }
    } else if (result.newLogs.length > 0 || result.spillsOnlyChanged) {
      set(curr => ({
        ...(result.spillsOnlyChanged ? { spillPuddles: result.patch.spillPuddles } : {}),
        ...(result.newLogs.length > 0 ? { history: [...curr.history, ...result.newLogs] } : {}),
      }));
      if (result.newLogs.length > 0) {
        get().checkStepProgress();
      }
    }
  },
});
