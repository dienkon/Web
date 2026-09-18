import { create } from 'zustand';
import { ExperimentGuide } from '../types/curriculum';
import { EXPERIMENTS_CURRICULUM } from '../data/experiments';

export type LeftTabType = 'chemicals' | 'apparatus' | 'curriculum' | 'safety';
export type MeasurementToolType = 'none' | 'thermometer' | 'ph_meter' | 'balance';

interface UiStore {
  // Navigation & Sidebars
  activeLeftTab: LeftTabType;
  leftSidebarOpen: boolean;
  rightInspectorOpen: boolean;
  isPresentationMode: boolean;
  isDevMode: boolean;
  isMuted: boolean;
  isMoveVesselMode: boolean;
  isCameraLocked: boolean;
  isReacting: boolean;

  // Selected tool
  activeMeasurementTool: MeasurementToolType;

  // Pending Pour Animation trigger
  pendingPour: { sourceId: string; targetId: string; amount?: number } | null;
  triggerPour: (sourceId: string, targetId: string, amount?: number) => void;
  clearPendingPour: () => void;

  // Chemical Addition Modal
  dispenseModal: {
    isOpen: boolean;
    chemicalId: string | null;
    targetVesselId: string | null;
  };

  // Guided Curriculum State
  activeExperiment: ExperimentGuide | null;
  currentStepIndex: number;
  quizModalOpen: boolean;

  // Setters & Actions
  setActiveLeftTab: (tab: LeftTabType) => void;
  toggleLeftSidebar: () => void;
  toggleRightInspector: () => void;
  togglePresentationMode: () => void;
  toggleDevMode: () => void;
  toggleMute: () => void;
  toggleMoveVesselMode: () => void;
  toggleCameraLock: () => void;
  setIsReacting: (val: boolean) => void;
  setActiveMeasurementTool: (tool: MeasurementToolType) => void;

  openDispenseModal: (chemicalId: string, targetVesselId?: string) => void;
  closeDispenseModal: () => void;

  startExperiment: (experimentId: string) => void;
  nextExperimentStep: () => void;
  prevExperimentStep: () => void;
  exitExperiment: () => void;
  openQuizModal: () => void;
  closeQuizModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeLeftTab: 'chemicals',
  leftSidebarOpen: true,
  rightInspectorOpen: true,
  isPresentationMode: false,
  isDevMode: false,
  isMuted: false,
  isMoveVesselMode: false,
  isCameraLocked: false,
  isReacting: false,

  activeMeasurementTool: 'none',

  pendingPour: null,
  triggerPour: (sourceId, targetId, amount) => set({ pendingPour: { sourceId, targetId, amount } }),
  clearPendingPour: () => set({ pendingPour: null }),

  dispenseModal: {
    isOpen: false,
    chemicalId: null,
    targetVesselId: null
  },

  activeExperiment: null,
  currentStepIndex: 0,
  quizModalOpen: false,

  setActiveLeftTab: (tab) => set({ activeLeftTab: tab, leftSidebarOpen: true }),
  toggleLeftSidebar: () => set(s => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightInspector: () => set(s => ({ rightInspectorOpen: !s.rightInspectorOpen })),
  togglePresentationMode: () => set(s => ({ isPresentationMode: !s.isPresentationMode })),
  toggleDevMode: () => set(s => ({ isDevMode: !s.isDevMode })),
  toggleMute: () => set(s => ({ isMuted: !s.isMuted })),
  toggleMoveVesselMode: () => set(s => ({ isMoveVesselMode: !s.isMoveVesselMode })),
  toggleCameraLock: () => set(s => ({ isCameraLocked: !s.isCameraLocked })),
  setIsReacting: (val) => set({ isReacting: val }),
  setActiveMeasurementTool: (tool) => set({ activeMeasurementTool: tool }),

  openDispenseModal: (chemicalId, targetVesselId) => set({
    dispenseModal: {
      isOpen: true,
      chemicalId,
      targetVesselId: targetVesselId || null
    }
  }),
  closeDispenseModal: () => set({
    dispenseModal: { isOpen: false, chemicalId: null, targetVesselId: null }
  }),

  startExperiment: (experimentId) => {
    const exp = EXPERIMENTS_CURRICULUM.find(e => e.id === experimentId) || null;
    set({
      activeExperiment: exp,
      currentStepIndex: 0,
      activeLeftTab: 'curriculum'
    });
  },
  nextExperimentStep: () => set(s => ({
    currentStepIndex: Math.min((s.activeExperiment?.steps.length ?? 1) - 1, s.currentStepIndex + 1)
  })),
  prevExperimentStep: () => set(s => ({
    currentStepIndex: Math.max(0, s.currentStepIndex - 1)
  })),
  exitExperiment: () => set({ activeExperiment: null, currentStepIndex: 0 }),
  openQuizModal: () => set({ quizModalOpen: true }),
  closeQuizModal: () => set({ quizModalOpen: false })
}));
