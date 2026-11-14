/**
 * Central State Store for ChemDex 2D Virtual Laboratory
 * Composed from focused Zustand slices; simulation physics run via pure stepLabWorld.
 */

import { create } from 'zustand';
import { onCatalogReady } from '../chemistry/reactions/curriculumAndCatalogCompiler';
import type { LabStoreState } from './labStoreTypes';
import { createEquipmentSlice } from './slices/equipmentSlice';
import { createTransferSlice } from './slices/transferSlice';
import { createSimulationSlice } from './slices/simulationSlice';
import { createExperimentSlice } from './slices/experimentSlice';
import { createHistorySlice } from './slices/historySlice';
import { createSafetySlice } from './slices/safetySlice';
import { createAiSlice } from './slices/aiSlice';
import { createUiSlice } from './slices/uiSlice';

export type {
  WorkbenchTool,
  SimTimeScale,
  PipetteBuffer,
  ActivePourVfxState,
  LabSnapshot,
  LabStoreState,
} from './labStoreTypes';
export { captureSnapshot, captureUndoSnapshot } from './labStoreHelpers';

export const useLabStore = create<LabStoreState>()((...a) => ({
  ...createEquipmentSlice(...a),
  ...createTransferSlice(...a),
  ...createSimulationSlice(...a),
  ...createExperimentSlice(...a),
  ...createHistorySlice(...a),
  ...createSafetySlice(...a),
  ...createAiSlice(...a),
  ...createUiSlice(...a),
}));

onCatalogReady(() => {
  const store = useLabStore.getState();
  store.setCatalogReady(true);
  store.reevaluateIdleVessels();
});
