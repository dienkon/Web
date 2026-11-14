import { kineticRuntime2D } from '../../chemistry/reactions/kineticsSolver';
import { reactionRuntime2D } from '../../vfx/ReactionRuntime2D';
import { captureUndoSnapshot, pushSnapshot } from '../labStoreHelpers';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type HistorySlice = Pick<
  LabStoreState,
  'history' | 'undoStack' | 'redoStack' | 'resetWorkbench' | 'undo' | 'redo'
>;

export const createHistorySlice: LabSliceCreator<HistorySlice> = (set, get) => ({
  history: [],
  undoStack: [],
  redoStack: [],

  resetWorkbench: () => {
    reactionRuntime2D.resetAll();
    kineticRuntime2D.resetAll();
    set(state => ({
      ...pushSnapshot(state),
      spillPuddles: [],
      pipetteBuffer: null,
      activePour: null,
      activePourVfx: null,
      activeExternalDoses: [],
      spatulaScoop: null,
      activeLitmusVesselId: null,
      workbenchEscapedGas_g: {},
      wasteMass_g: 0,
      equipment: {},
      selectedEquipmentId: null,
      history: [
        ...state.history,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'RESET',
          details_en: 'Workbench reset to clean state',
          details_vi: 'Đã dọn sạch toàn bộ bàn thí nghiệm',
        },
      ],
    }));
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const current = captureUndoSnapshot(get());

    set({
      ...previous,
      undoStack: newUndo,
      redoStack: [current, ...redoStack],
    });
  },

  redo: () => {
    const { redoStack, undoStack } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    const current = captureUndoSnapshot(get());

    set({
      ...next,
      undoStack: [...undoStack, current],
      redoStack: newRedo,
    });
  },
});
