import { createStore } from 'zustand/vanilla';
import { useAppStore, type AppState } from '../../store/useAppStore';
import type { AutoExperiment } from './AutoExperiment';
import type { VesselVisualRuntime } from '../../simulation/render/VesselVisualContext';

/** Read-only visual projection. Auto owns the sample/manager/clock; the shared
 * bench renderers subscribe here without publishing to the user's workbench. */
export function createAutoVisualRuntime(experiment: AutoExperiment) {
  const read = (): Partial<AppState> => {
    const sample = experiment.sample;
    const kinetics = experiment.renderKinetics;
    return { vessels: { [sample.id]: sample }, vesselIds: [sample.id],
      selectedVesselId: null, draggingVesselId: null, moveMode: false, activeTool: 'none',
      activeKinetics: kinetics ? { [sample.id]: kinetics } : {},
      dissolvingSubstances: {}, stirringVesselId: experiment.stirringDrive > 0 ? sample.id : null,
      isSimulationPaused: experiment.paused, timeScale: experiment.speed,
      pendingReactions: {}, pouringChemical: null, spills: {}, inFlightPours: [], burners: {}, burnerIds: [] };
  };
  const store = createStore<AppState>(() => ({ ...useAppStore.getState(), ...read() }));
  const runtime: VesselVisualRuntime = { store, manager: experiment.physics, appearance: experiment.appearance,
    externallyStepped: true, benchY: 0.003, elapsed: () => experiment.elapsed };
  let sample = experiment.sample, elapsed = experiment.elapsed, paused = experiment.paused, speed = experiment.speed;
  return { runtime, publish: () => {
    if (sample === experiment.sample && elapsed === experiment.elapsed && paused === experiment.paused && speed === experiment.speed) return;
    sample = experiment.sample; elapsed = experiment.elapsed; paused = experiment.paused; speed = experiment.speed;
    store.setState(read());
  } };
}
