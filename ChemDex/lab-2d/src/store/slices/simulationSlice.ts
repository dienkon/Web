import { isCatalogReady } from '../../chemistry/reactions/curriculumAndCatalogCompiler';
import { prepareVesselSimulation } from '../../chemistry/reactions/kineticsSolver';
import { stepLabWorld } from '../../engine/labWorldStep';
import { soundEngine } from '../../services/soundEngine';
import type { EquipmentState } from '../../types/equipment';
import type { LabLogEntry } from '../../types/experiment';
import { applySimResultToEquipment, mergeEscapedGasMaps } from '../labStoreHelpers';
import { useLabEnvironment } from '../useLabEnvironment';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type SimulationSlice = Pick<
  LabStoreState,
  | 'simulationPaused'
  | 'simTimeScale'
  | 'realtimeKinetics'
  | 'catalogReady'
  | 'setSimulationPaused'
  | 'setSimTimeScale'
  | 'setRealtimeKinetics'
  | 'setCatalogReady'
  | 'reevaluateIdleVessels'
  | 'tickSimulation'
>;

export const createSimulationSlice: LabSliceCreator<SimulationSlice> = (set, get) => ({
  simulationPaused: false,
  simTimeScale: 1,
  realtimeKinetics: false,
  catalogReady: isCatalogReady(),

  setSimulationPaused: (simulationPaused) => set({ simulationPaused }),
  setSimTimeScale: (simTimeScale) => set({ simTimeScale }),
  setRealtimeKinetics: (realtimeKinetics) => {
    if (get().realtimeKinetics !== realtimeKinetics) {
      set({ realtimeKinetics });
    }
  },
  setCatalogReady: (catalogReady) => {
    if (get().catalogReady !== catalogReady) {
      set({ catalogReady });
    }
  },

  reevaluateIdleVessels: () => {
    const state = get();
    const env = useLabEnvironment.getState().environment;
    let nextEquipment: Record<string, EquipmentState> | null = null;
    let nextEscaped = state.workbenchEscapedGas_g;
    const newLogs: LabLogEntry[] = [];
    let shouldFizz = false;
    let shouldSuccess = false;
    const now = Date.now();

    for (const eq of Object.values(state.equipment)) {
      if (!eq.isContainer || eq.isShattered || eq.contents.length === 0) continue;

      const prep = prepareVesselSimulation(
        eq,
        eq.contents,
        eq.volume_ml,
        eq.temperature_c,
        eq.isOn || false,
        !eq.isSealed,
        { oxygenFraction: env.oxygenFraction },
        state.realtimeKinetics
      );

      const sim = prep.simResult;
      const hasSynchronousChange = sim.reactionsOccurred.length > 0;
      const hasKineticStart = Boolean(
        prep.activeReactionLabel && prep.activeReactionLabel !== eq.activeReactionLabel
      );

      if (!hasSynchronousChange && !hasKineticStart) continue;

      if (!nextEquipment) {
        nextEquipment = { ...state.equipment };
      }

      const contentMass = sim.updatedContents.reduce((sum, c) => sum + c.mass_g, 0);
      nextEquipment[eq.id] = applySimResultToEquipment(eq, eq.volume_ml, (eq.tare_g || 0) + contentMass, sim, {
        activeReactionLabel: prep.activeReactionLabel,
        activeReactionProgress: prep.activeReactionProgress,
        silverMirrorProgress: prep.silverMirrorProgress,
      });

      if (hasSynchronousChange) {
        nextEscaped = mergeEscapedGasMaps(nextEscaped, sim.escapedGas_g);
        if (sim.hasGas) shouldFizz = true;
        shouldSuccess = true;
        for (const rx of sim.reactionsOccurred) {
          newLogs.push({
            id: `log_catalog_rx_${now}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            actionType: 'REACTION',
            details_en: `Completed: ${rx.name_en || rx.equation} (${rx.equation})`,
            details_vi: `Hoàn tất: ${rx.name_vi || rx.equation} (${rx.equation})`,
            vesselId: eq.id,
            measurements: {
              volume_ml: nextEquipment[eq.id].volume_ml,
              temperature_c: nextEquipment[eq.id].temperature_c,
              ph: nextEquipment[eq.id].ph,
            },
          });
        }
      }
    }

    if (!nextEquipment) return;

    if (shouldFizz) soundEngine.fizz(0.85);
    if (shouldSuccess) soundEngine.success();

    set((curr) => ({
      equipment: nextEquipment!,
      workbenchEscapedGas_g: nextEscaped,
      ...(newLogs.length > 0 ? { history: [...curr.history, ...newLogs] } : {}),
    }));
    get().checkStepProgress();
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
