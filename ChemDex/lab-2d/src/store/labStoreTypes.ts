import type { StateCreator } from 'zustand';
import type {
  ActiveExternalPour2D,
  ActivePour,
  EquipmentState,
  EquipmentType,
  SpatulaScoopState,
  SpillPuddle,
} from '../types/equipment';
import type { SubstanceQuantity } from '../types/chemistry';
import type { GuidedExperiment, LabLogEntry } from '../types/experiment';
import type { PPEState2D, SafetyViolationAlert } from '../engine/safetyEngine2D';

export type WorkbenchTool = 'select' | 'stir_rod' | 'pipette' | 'spatula' | 'litmus' | 'probe' | 'sponge';
export type SimTimeScale = 0.5 | 1 | 2 | 5;

export interface PipetteBuffer {
  volume_ml: number;
  colorHex: string;
  formula: string;
  contents: SubstanceQuantity[];
  sourceName?: string;
}

export interface ActivePourVfxState {
  sourceId: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  liquidColorHex: string;
}

export type LabSnapshot = Pick<
  LabStoreState,
  | 'equipment'
  | 'selectedEquipmentId'
  | 'activeMode'
  | 'activeExperiment'
  | 'currentStepIndex'
  | 'stepCompleted'
  | 'history'
  | 'spillPuddles'
  | 'studentNotes'
>;

export interface LabStoreState {
  simulationPaused: boolean;
  simTimeScale: SimTimeScale;
  realtimeKinetics: boolean;
  activeTool: WorkbenchTool;
  pipetteBuffer: PipetteBuffer | null;
  activePour: ActivePour | null;
  activeExternalDoses: ActiveExternalPour2D[];
  spatulaScoop: SpatulaScoopState | null;
  activeLitmusVesselId: string | null;
  workbenchEscapedGas_g: Record<string, number>;
  wasteMass_g: number;
  studentNotes: string;
  setStudentNotes: (notes: string) => void;
  completedExperiments: Record<string, string>;
  completeExperiment: () => boolean;
  setSimulationPaused: (paused: boolean) => void;
  setSimTimeScale: (scale: SimTimeScale) => void;
  setRealtimeKinetics: (enabled: boolean) => void;
  setActiveTool: (tool: WorkbenchTool) => void;
  setSpatulaScoop: (scoop: SpatulaScoopState | null) => void;
  setActiveLitmusVesselId: (id: string | null) => void;
  drawWithPipette: (vesselId: string, amount_ml?: number) => void;
  dispenseFromPipette: (targetId: string, amount_ml?: number, contactX?: number) => void;
  clearPipette: () => void;
  equipment: Record<string, EquipmentState>;
  selectedEquipmentId: string | null;
  language: 'vi' | 'en';
  activeMode: 'free' | 'guided';
  isPresentationMode: boolean;
  isShowcaseActive: boolean;
  mobilePanel: 'inventory' | 'inspector' | null;
  workbenchZoom: number;
  fitTriggerCount: number;
  setPresentationMode: (on?: boolean) => void;
  setShowcaseActive: (active: boolean) => void;
  setMobilePanel: (panel: 'inventory' | 'inspector' | null) => void;
  setWorkbenchZoom: (zoom: number) => void;
  requestFitWorkbench: () => void;
  activeExperiment: GuidedExperiment | null;
  currentStepIndex: number;
  stepCompleted: boolean;
  history: LabLogEntry[];
  undoStack: LabSnapshot[];
  redoStack: LabSnapshot[];

  // UI Dialog & VFX States
  isTransferModalOpen: boolean;
  transferSourceId: string | null;
  transferTargetId: string | null;
  isNotebookOpen: boolean;
  isAIAssistantOpen: boolean;
  isApiKeyModalOpen: boolean;
  isPeriodicTableOpen: boolean;
  isReactionLibraryOpen: boolean;
  isTitrationCurveOpen: boolean;
  isMuted: boolean;
  activeSidebarTab: 'chemicals' | 'equipment' | 'experiments' | 'safety';
  draggedChemicalId: string | null;
  activePourVfx: ActivePourVfxState | null;
  spillPuddles: SpillPuddle[];
  isQuizModalOpen: boolean;
  ppe: PPEState2D;
  safetyAlerts: SafetyViolationAlert[];

  // Actions
  togglePpe: (item: keyof PPEState2D) => void;
  dismissSafetyAlert: (id: string) => void;
  neutralizeSpill: (id: string) => void;
  setLanguage: (lang: 'vi' | 'en') => void;
  setActiveMode: (mode: 'free' | 'guided') => void;
  setActiveSidebarTab: (tab: 'chemicals' | 'equipment' | 'experiments' | 'safety') => void;
  selectEquipment: (id: string | null) => void;
  openTransferModal: (sourceId: string, targetId?: string) => void;
  closeTransferModal: () => void;
  toggleNotebook: (open?: boolean) => void;
  toggleAIAssistant: (open?: boolean) => void;
  toggleApiKeyModal: (open?: boolean) => void;
  togglePeriodicTable: (open?: boolean) => void;
  toggleReactionLibrary: (open?: boolean) => void;
  injectCustomSubstance: (
    equipmentId: string,
    formula: string,
    state: 'aq' | 's' | 'l' | 'g',
    amount_ml: number,
    amount_g: number,
    colorHex?: string
  ) => void;
  toggleTitrationCurve: (open?: boolean) => void;
  toggleQuizModal: (open?: boolean) => void;
  cleanSpill: (id: string) => void;
  cleanAllSpills: () => void;
  addSpillPuddle: (x: number, y: number, volume_ml: number, colorHex: string, formula: string, ph?: number) => void;
  toggleMute: () => void;
  setDraggedChemicalId: (id: string | null) => void;
  triggerDirectPour: (sourceId: string, targetId: string) => void;
  triggerGeminiReactionCheck: (vesselId: string) => Promise<boolean>;
  tickSimulation: (dt: number) => void;

  addEquipment: (type: EquipmentType, x?: number, y?: number) => string;
  removeEquipment: (id: string) => void;

  updatePosition: (id: string, x: number, y: number) => void;

  addChemicalToEquipment: (
    equipmentId: string,
    chemicalId: string,
    amount_ml?: number,
    amount_g?: number
  ) => void;
  triggerExternalChemicalPour: (
    equipmentId: string,
    chemicalId: string,
    amount_ml?: number,
    amount_g?: number,
    contactXNorm?: number
  ) => void;
  squirtWashBottle: (washBottleId: string, targetId: string, amount_ml?: number) => void;
  setCondenserCooling: (
    condenserId: string,
    patch: Partial<NonNullable<EquipmentState['condenserCooling']>>
  ) => void;
  dispenseSpatulaToVessel: (vesselId: string, amount_g?: number, contactXNorm?: number) => void;

  transferMaterial: (
    sourceId: string,
    targetId: string,
    amount_ml?: number,
    amount_g?: number,
    transferAll?: boolean
  ) => void;

  toggleHeat: (id: string) => void;
  tareEquipment: (id: string) => void;
  toggleBuretteStopcock: (id: string) => void;
  emptyEquipment: (id: string) => void;
  toggleStir: (id: string) => void;
  addDistilledWater: (id: string, amount_ml?: number) => void;
  toggleSeal: (id: string) => void;

  selectExperiment: (experimentId: string | null) => void;
  nextStep: () => void;
  prevStep: () => void;
  checkStepProgress: () => boolean;

  resetWorkbench: () => void;
  undo: () => void;
  redo: () => void;
}

export type LabSliceCreator<T> = StateCreator<LabStoreState, [], [], T>;
