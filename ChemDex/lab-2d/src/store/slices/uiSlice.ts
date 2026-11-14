import { soundEngine } from '../../services/soundEngine';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type UiSlice = Pick<
  LabStoreState,
  | 'language'
  | 'isPresentationMode'
  | 'isShowcaseActive'
  | 'mobilePanel'
  | 'workbenchZoom'
  | 'fitTriggerCount'
  | 'isTransferModalOpen'
  | 'transferSourceId'
  | 'transferTargetId'
  | 'isNotebookOpen'
  | 'isAIAssistantOpen'
  | 'isApiKeyModalOpen'
  | 'isPeriodicTableOpen'
  | 'isReactionLibraryOpen'
  | 'isTitrationCurveOpen'
  | 'isQuizModalOpen'
  | 'isMuted'
  | 'activeSidebarTab'
  | 'draggedChemicalId'
  | 'setLanguage'
  | 'setPresentationMode'
  | 'setShowcaseActive'
  | 'setMobilePanel'
  | 'setWorkbenchZoom'
  | 'requestFitWorkbench'
  | 'setActiveSidebarTab'
  | 'openTransferModal'
  | 'closeTransferModal'
  | 'toggleNotebook'
  | 'toggleAIAssistant'
  | 'toggleApiKeyModal'
  | 'togglePeriodicTable'
  | 'toggleReactionLibrary'
  | 'toggleTitrationCurve'
  | 'toggleQuizModal'
  | 'toggleMute'
  | 'setDraggedChemicalId'
>;

export const createUiSlice: LabSliceCreator<UiSlice> = (set, get) => ({
  language: 'vi',
  isPresentationMode: false,
  isShowcaseActive: false,
  mobilePanel: null,
  workbenchZoom: 1,
  fitTriggerCount: 0,
  isTransferModalOpen: false,
  transferSourceId: null,
  transferTargetId: null,
  isNotebookOpen: false,
  isAIAssistantOpen: false,
  isApiKeyModalOpen: false,
  isPeriodicTableOpen: false,
  isReactionLibraryOpen: false,
  isTitrationCurveOpen: false,
  isQuizModalOpen: false,
  isMuted: false,
  activeSidebarTab: 'chemicals',
  draggedChemicalId: null,

  setLanguage: (lang) => set({ language: lang }),
  setPresentationMode: (on) => set(s => ({ isPresentationMode: on !== undefined ? on : !s.isPresentationMode })),
  setShowcaseActive: (active) => set({ isShowcaseActive: active }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setWorkbenchZoom: (zoom) => set({ workbenchZoom: Math.max(0.32, Math.min(2.2, Math.round(zoom * 100) / 100)) }),
  requestFitWorkbench: () => set(s => ({ fitTriggerCount: s.fitTriggerCount + 1 })),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),

  openTransferModal: (sourceId, targetId) =>
    set({
      isTransferModalOpen: true,
      transferSourceId: sourceId,
      transferTargetId: targetId || null,
    }),
  closeTransferModal: () =>
    set({
      isTransferModalOpen: false,
      transferSourceId: null,
      transferTargetId: null,
    }),
  toggleNotebook: (open) => set(s => ({ isNotebookOpen: open !== undefined ? open : !s.isNotebookOpen })),
  toggleAIAssistant: (open) => set(s => ({ isAIAssistantOpen: open !== undefined ? open : !s.isAIAssistantOpen })),
  toggleApiKeyModal: (open) => set(s => ({ isApiKeyModalOpen: open !== undefined ? open : !s.isApiKeyModalOpen })),
  togglePeriodicTable: (open) => set(s => ({ isPeriodicTableOpen: open !== undefined ? open : !s.isPeriodicTableOpen })),
  toggleReactionLibrary: (open) => set(s => ({ isReactionLibraryOpen: open !== undefined ? open : !s.isReactionLibraryOpen })),
  toggleTitrationCurve: (open) => set(s => ({ isTitrationCurveOpen: open !== undefined ? open : !s.isTitrationCurveOpen })),
  toggleQuizModal: (open) => set(s => ({ isQuizModalOpen: open !== undefined ? open : !s.isQuizModalOpen })),
  toggleMute: () => {
    const nextMuted = !get().isMuted;
    soundEngine.setMuted(nextMuted);
    set({ isMuted: nextMuted });
  },
  setDraggedChemicalId: (id) => set({ draggedChemicalId: id }),
});
