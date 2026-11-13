/**
 * Central State Store for ChemDex 2D Virtual Laboratory
 * Pure Zustand store with complete history snapshots, multi-step simulation triggers,
 * and guided experiment progress tracking.
 */

import { create } from 'zustand';
import { ActivePour, EquipmentState, EquipmentType, SpillPuddle } from '../types/equipment';
import { SimulationResult, SubstanceQuantity } from '../types/chemistry';
import { GuidedExperiment, LabLogEntry } from '../types/experiment';
import { findChemicalById } from '../data/chemicals';
import { EXPERIMENTS_CATALOG } from '../data/experiments';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { computeMolarMass } from '../chemistry/core/formula';
import { soundEngine } from '../services/soundEngine';
import { generateReactionFromGemini } from '../services/geminiService';
import { REACTION_DATABASE } from '../chemistry/reactions/reactionDatabase';
import {
  stepVesselThermal,
  burnerHeatToVessel,
  hotPlateHeatToVessel,
  probeDipCoupling,
  separatoryFunnelDrain,
  aqueousBoilingPoint,
  stepPour,
  stepTemperatureSolubility,
  stepMixing,
} from '../engine/simulationTick';
import { useLabEnvironment } from './useLabEnvironment';
import { isOxygenSupportingAtmosphere } from '../chemistry/physical/environmentPhysics';
import { calculateMixturePhysicalProperties } from '../chemistry/physical/substanceProps';
import { isElementBalancedReaction } from '../chemistry/core/ledger';
import { getIndicatorColor } from '../chemistry/equilibrium/acidBase';
import { reactionRuntime2D } from '../vfx/ReactionRuntime2D';
import { stepVesselPressureAndDamage } from '../engine/headspacePressure2D';
import { stepSpillPuddles, neutralizeSpillWithNaHCO3 } from '../engine/spillChemistry2D';
import { PPEState2D, DEFAULT_PPE_STATE, SafetyViolationAlert, checkAcidDilutionHazard, evaluateWorkbenchSafety } from '../engine/safetyEngine2D';

export type WorkbenchTool = 'select' | 'stir_rod' | 'pipette' | 'probe' | 'sponge';
export type SimTimeScale = 0.5 | 1 | 2 | 5;

export interface PipetteBuffer {
  volume_ml: number;
  colorHex: string;
  formula: string;
  contents: SubstanceQuantity[];
  sourceName?: string;
}

export type LabSnapshot = Pick<LabStoreState, 'equipment' | 'selectedEquipmentId' | 'activeMode' | 'activeExperiment' | 'currentStepIndex' | 'stepCompleted' | 'history' | 'spillPuddles' | 'studentNotes'>;

export interface LabStoreState {
  simulationPaused: boolean;
  simTimeScale: SimTimeScale;
  activeTool: WorkbenchTool;
  pipetteBuffer: PipetteBuffer | null;
  activePour: ActivePour | null;
  studentNotes: string;
  setStudentNotes: (notes: string) => void;
  completedExperiments: Record<string, string>;
  completeExperiment: () => boolean;
  setSimulationPaused: (paused: boolean) => void;
  setSimTimeScale: (scale: SimTimeScale) => void;
  setActiveTool: (tool: WorkbenchTool) => void;
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
  isTitrationCurveOpen: boolean;
  isMuted: boolean;
  activeSidebarTab: 'chemicals' | 'equipment' | 'experiments' | 'safety';
  draggedChemicalId: string | null;
  activePourVfx: {
    sourceId: string;
    targetId: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    liquidColorHex: string;
  } | null;
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

const EQUIPMENT_SPECS: Record<
  EquipmentType,
  { name: string; name_vi: string; capacity_ml: number; width: number; height: number; tare_g: number; isContainer: boolean }
> = {
  beaker: { name: '250 mL Beaker', name_vi: 'Cốc thủy tinh 250 mL', capacity_ml: 250, width: 140, height: 160, tare_g: 95.0, isContainer: true },
  erlenmeyer_flask: { name: '250 mL Erlenmeyer Flask', name_vi: 'Bình tam giác 250 mL', capacity_ml: 250, width: 150, height: 180, tare_g: 110.0, isContainer: true },
  test_tube: { name: 'Test Tube', name_vi: 'Ống nghiệm', capacity_ml: 50, width: 50, height: 180, tare_g: 22.0, isContainer: true },
  graduated_cylinder: { name: '100 mL Graduated Cylinder', name_vi: 'Ống đong 100 mL', capacity_ml: 100, width: 70, height: 220, tare_g: 75.0, isContainer: true },
  burette: { name: '50 mL Burette & Stand', name_vi: 'Buret 50 mL và Giá đỡ', capacity_ml: 50, width: 110, height: 320, tare_g: 160.0, isContainer: true },
  analytical_balance: { name: 'Analytical Balance', name_vi: 'Cân điện tử phân tích', capacity_ml: 0, width: 220, height: 140, tare_g: 0, isContainer: false },
  bunsen_burner: { name: 'Bunsen Burner', name_vi: 'Đèn Bunsen', capacity_ml: 0, width: 100, height: 140, tare_g: 250.0, isContainer: false },
  hot_plate: { name: 'Hot Plate & Stirrer', name_vi: 'Bếp điện gia nhiệt', capacity_ml: 0, width: 180, height: 100, tare_g: 500.0, isContainer: false },
  funnel: { name: 'Filter Funnel with Paper', name_vi: 'Phễu lọc có giấy lọc', capacity_ml: 60, width: 90, height: 130, tare_g: 40.0, isContainer: true },
  pipette: { name: '10 mL Graduated Pipette', name_vi: 'Pipet chia vạch 10 mL', capacity_ml: 10, width: 30, height: 260, tare_g: 15.0, isContainer: true },
  dropper: { name: 'Dropper (Pasteur)', name_vi: 'Ống nhỏ giọt', capacity_ml: 3, width: 30, height: 140, tare_g: 8.0, isContainer: true },
  watch_glass: { name: 'Watch Glass', name_vi: 'Mặt kính đồng hồ', capacity_ml: 20, width: 100, height: 40, tare_g: 30.0, isContainer: true },
  evaporating_dish: { name: 'Evaporating Dish', name_vi: 'Bát sứ nung', capacity_ml: 80, width: 120, height: 70, tare_g: 85.0, isContainer: true },
  ph_meter: { name: 'Digital pH Meter Probe', name_vi: 'Bút đo pH điện tử', capacity_ml: 0, width: 40, height: 220, tare_g: 50.0, isContainer: false },
  thermometer: { name: 'Laboratory Thermometer', name_vi: 'Nhiệt kế phòng thí nghiệm', capacity_ml: 0, width: 30, height: 240, tare_g: 25.0, isContainer: false },
  stirring_rod: { name: 'Glass Stirring Rod', name_vi: 'Đũa thủy tinh', capacity_ml: 0, width: 20, height: 200, tare_g: 18.0, isContainer: false },
  spatula: { name: 'Chemical Spatula', name_vi: 'Muỗng xúc hóa chất', capacity_ml: 0, width: 30, height: 160, tare_g: 20.0, isContainer: false },
  reagent_bottle: { name: 'Reagent Bottle', name_vi: 'Lọ đựng hóa chất', capacity_ml: 150, width: 90, height: 150, tare_g: 90.0, isContainer: true },
  wash_bottle: { name: 'Wash Bottle (Distilled H2O)', name_vi: 'Bình tia nước cất', capacity_ml: 250, width: 90, height: 190, tare_g: 60.0, isContainer: true },
  test_tube_rack: { name: 'Test Tube Rack', name_vi: 'Giá để ống nghiệm', capacity_ml: 0, width: 200, height: 110, tare_g: 120.0, isContainer: false },
  separatory_funnel: { name: '250 mL Separatory Funnel', name_vi: 'Phễu chiết quả lê 250 mL', capacity_ml: 250, width: 130, height: 260, tare_g: 140.0, isContainer: true },
  ph_paper: { name: 'Universal pH Indicator Paper Strip', name_vi: 'Giấy quỳ tím & chỉ thị pH', capacity_ml: 0, width: 24, height: 120, tare_g: 2.0, isContainer: false },
  sponge: { name: 'Lab Cleaning Sponge', name_vi: 'Bọt biển lau hóa chất tràn', capacity_ml: 0, width: 56, height: 38, tare_g: 12.0, isContainer: false },
};

export function captureSnapshot(state: LabStoreState): LabSnapshot {
  const {equipment, selectedEquipmentId, activeMode, activeExperiment, currentStepIndex, stepCompleted, history, spillPuddles, studentNotes} = state;
  return structuredClone({equipment, selectedEquipmentId, activeMode, activeExperiment, currentStepIndex, stepCompleted, history, spillPuddles, studentNotes});
}
function pushSnapshot(state: LabStoreState): {undoStack: LabSnapshot[]; redoStack: LabSnapshot[]} {
  return {undoStack: [...state.undoStack.slice(-49), captureSnapshot(state)], redoStack: []};
}

/**
 * Shared projection mapping simulation output (Beer-Lambert optics, physical properties,
 * precipitate morphology/layers, metal chunks, flames, fumes) uniformly onto EquipmentState.
 */
function applySimResultToEquipment(
  base: EquipmentState,
  volume_ml: number,
  mass_g: number,
  sim: SimulationResult,
  extras?: Partial<EquipmentState>
): EquipmentState {
  return {
    ...base,
    volume_ml: Math.round(volume_ml * 10) / 10,
    mass_g: Math.round(mass_g * 100) / 100,
    contents: sim.updatedContents,
    temperature_c: sim.finalTemperature_c,
    ph: sim.finalPh,
    liquidColorHex: sim.finalLiquidColorHex,
    liquidOpacity: sim.liquidOpacity,
    viscosity_mPa_s: sim.mixtureViscosity_mPa_s,
    surfaceTension_N_m: sim.surfaceTension_N_m,
    mixtureCp_J_kgK: sim.mixtureCp_J_kgK,
    density_g_ml: sim.density_g_ml,
    hasPrecipitate: sim.hasPrecipitate,
    precipitateColorHex: sim.precipitateInfo?.colorHex,
    precipitateSubstance: sim.precipitateInfo?.formula,
    precipitateMass_g: sim.precipitateInfo?.mass_g,
    precipitateMorphology: sim.precipitateInfo?.morphology,
    precipitateLayers: sim.precipitateLayers,
    solidChunks: sim.solidChunks,
    hasGas: sim.hasGas,
    gasColorHex: sim.gasInfo?.colorHex || '#ffffff',
    effervescenceSpeed: sim.gasInfo?.effervescenceSpeed,
    isBoiling: sim.isBoiling,
    hasPhaseSeparation: sim.hasPhaseSeparation,
    organicLayerVolume_ml: sim.organicLayerVolume_ml,
    organicLayerColorHex: sim.organicLayerColorHex,
    hasFumes: sim.hasFumes,
    fumeType: sim.fumeType,
    fumeColorHex: sim.fumeColorHex,
    turbidity: sim.turbidity,
    foamHead_mm: sim.foamHead_mm,
    flameTestColorHex: sim.flameTestColorHex,
    hasSilverMirror: sim.hasSilverMirror || base.hasSilverMirror,
    hasSublimation: sim.hasSublimation || base.hasSublimation,
    sublimationColorHex: sim.sublimationColorHex || base.sublimationColorHex,
    activeControllerIds: sim.activeControllerIds,
    ...extras,
  };
}

export const useLabStore = create<LabStoreState>((set, get) => ({
  simulationPaused: false,
  simTimeScale: 1,
  activeTool: 'select',
  pipetteBuffer: null,
  activePour: null,
  studentNotes: '',
  completedExperiments: (()=>{try{return typeof window==='undefined'?{}:JSON.parse(localStorage.getItem('chemdex:completed-experiments')??'{}');}catch{return {};}})(),
  completeExperiment: () => {const state=get();if(!state.activeExperiment||state.currentStepIndex!==state.activeExperiment.steps.length-1||!state.checkStepProgress())return false;const completedExperiments={...state.completedExperiments,[state.activeExperiment.id]:new Date().toISOString()};try{localStorage.setItem('chemdex:completed-experiments',JSON.stringify(completedExperiments));}catch{}set({completedExperiments,isQuizModalOpen:true});return true;},
  setStudentNotes: (studentNotes) => set({studentNotes}),
  setSimulationPaused: (simulationPaused) => set({simulationPaused}),
  setSimTimeScale: (simTimeScale) => set({ simTimeScale }),
  setActiveTool: (activeTool) => set({ activeTool }),
  clearPipette: () => set({ pipetteBuffer: null }),
  drawWithPipette: (vesselId, amount_ml = 10) => {
    const src = get().equipment[vesselId];
    if (!src || !src.isContainer || src.volume_ml <= 0.1) return;
    const drawVol = Math.min(amount_ml, src.volume_ml, 10);
    const frac = drawVol / src.volume_ml;
    const drawn: SubstanceQuantity[] = [];
    const remaining: SubstanceQuantity[] = [];
    for (const item of src.contents) {
      if (item.state === 's' || item.state === 'g') {
        remaining.push({ ...item });
        continue;
      }
      const mMove = item.moles * frac;
      const gMove = item.mass_g * frac;
      if (mMove > 1e-9) drawn.push({ ...item, moles: mMove, mass_g: gMove });
      const remM = item.moles - mMove;
      if (remM > 1e-8 || item.formula === 'H2O') {
        remaining.push({ ...item, moles: remM, mass_g: item.mass_g - gMove });
      }
    }
    const newSrcVol = Math.max(0, src.volume_ml - drawVol);
    const env = useLabEnvironment.getState().environment;
    const srcSim = runSimulationCycle(remaining, newSrcVol, src.temperature_c, src.isOn || false, !src.isSealed, { oxygenFraction: env.oxygenFraction });
    const srcMass = (src.tare_g || 0) + srcSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
    const primaryFormula = drawn.find(d => d.formula !== 'H2O')?.formula || 'H2O';
    soundEngine.drip();
    set(s => ({
      ...pushSnapshot(s),
      pipetteBuffer: {
        volume_ml: Math.round(drawVol * 10) / 10,
        colorHex: src.liquidColorHex || '#38bdf8',
        formula: primaryFormula,
        contents: drawn,
        sourceName: src.name_vi || src.name,
      },
      equipment: {
        ...s.equipment,
        [vesselId]: applySimResultToEquipment(src, newSrcVol, srcMass, srcSim),
      },
    }));
  },
  dispenseFromPipette: (targetId, amount_ml, contactX = 0) => {
    const buf = get().pipetteBuffer;
    const tgt = get().equipment[targetId];
    if (!buf || buf.volume_ml <= 0 || !tgt || !tgt.isContainer) return;
    const dispenseVol = Math.min(buf.volume_ml, amount_ml ?? buf.volume_ml, Math.max(0, tgt.capacity_ml - tgt.volume_ml));
    if (dispenseVol <= 0.01) return;
    const frac = dispenseVol / buf.volume_ml;
    const mergedTgt = structuredClone(tgt.contents);
    const remBuf: SubstanceQuantity[] = [];
    for (const item of buf.contents) {
      const mAdd = item.moles * frac;
      const gAdd = item.mass_g * frac;
      const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
      if (ex) {
        ex.moles += mAdd;
        ex.mass_g += gAdd;
      } else {
        mergedTgt.push({ ...item, moles: mAdd, mass_g: gAdd });
      }
      if (item.moles - mAdd > 1e-8) {
        remBuf.push({ ...item, moles: item.moles - mAdd, mass_g: item.mass_g - gAdd });
      }
    }
    const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + dispenseVol);
    const env = useLabEnvironment.getState().environment;
    const tgtSim = runSimulationCycle(mergedTgt, newTgtVol, tgt.temperature_c, tgt.isOn || false, !tgt.isSealed, { oxygenFraction: env.oxygenFraction });
    const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
    const prevColor = tgt.liquidColorHex || '#f8fafc';
    const nextColor = tgtSim.finalLiquidColorHex;
    const updatedTarget = applySimResultToEquipment(tgt, newTgtVol, tgtMass, tgtSim, {
      pourContactX: Math.max(-0.85, Math.min(0.85, contactX)),
      mixedness: Math.min(tgt.mixedness ?? 0.65, 0.35),
    });
    reactionRuntime2D.triggerColorMixing(updatedTarget, prevColor, nextColor, contactX, buf.colorHex);
    if (tgtSim.activeControllerIds?.length) {
      const hasPhenol = mergedTgt.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
      for (const cid of tgtSim.activeControllerIds) {
        reactionRuntime2D.triggerController(updatedTarget, cid, { hasPhenolphthalein: hasPhenol, targetColorHex: nextColor });
      }
    }
    soundEngine.drip();
    const remVol = Math.max(0, buf.volume_ml - dispenseVol);
    set(s => ({
      ...pushSnapshot(s),
      pipetteBuffer: remVol > 0.05 ? { ...buf, volume_ml: Math.round(remVol * 10) / 10, contents: remBuf } : null,
      equipment: {
        ...s.equipment,
        [targetId]: updatedTarget,
      },
    }));
    get().checkStepProgress();
  },
  equipment: {},
  selectedEquipmentId: null,
  language: 'vi',
  activeMode: 'free',
  isPresentationMode: false,
  isShowcaseActive: false,
  mobilePanel: null,
  workbenchZoom: 1,
  fitTriggerCount: 0,
  activeExperiment: null,
  currentStepIndex: 0,
  stepCompleted: false,
  history: [],
  undoStack: [],
  redoStack: [],
  
  isTransferModalOpen: false,
  transferSourceId: null,
  transferTargetId: null,
  isNotebookOpen: false,
  isAIAssistantOpen: false,
  isApiKeyModalOpen: false,
  isPeriodicTableOpen: false,
  isTitrationCurveOpen: false,
  isQuizModalOpen: false,
  isMuted: false,
  activeSidebarTab: 'chemicals',
  draggedChemicalId: null,
  activePourVfx: null,
  spillPuddles: [],
  ppe: { ...DEFAULT_PPE_STATE },
  safetyAlerts: [],

  togglePpe: (item) => {
    soundEngine.click();
    set(s => ({
      ppe: { ...s.ppe, [item]: !s.ppe[item] },
    }));
  },
  dismissSafetyAlert: (id) => set(s => ({
    safetyAlerts: s.safetyAlerts.filter(a => a.id !== id),
  })),
  neutralizeSpill: (id) => {
    soundEngine.fizz(1.0);
    set(s => ({
      spillPuddles: s.spillPuddles.map(p => (p.id === id ? neutralizeSpillWithNaHCO3(p, 2.5) : p)),
    }));
  },
  setLanguage: (lang) => set({ language: lang }),
  setActiveMode: (mode) => set({ activeMode: mode, isShowcaseActive: false }),
  setPresentationMode: (on) => set(s => ({ isPresentationMode: on !== undefined ? on : !s.isPresentationMode })),
  setShowcaseActive: (active) => set({ isShowcaseActive: active }),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setWorkbenchZoom: (zoom) => set({ workbenchZoom: Math.max(0.32, Math.min(2.2, Math.round(zoom * 100) / 100)) }),
  requestFitWorkbench: () => set(s => ({ fitTriggerCount: s.fitTriggerCount + 1 })),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  selectEquipment: (id) => set({ selectedEquipmentId: id }),
  
  openTransferModal: (sourceId, targetId) => set({
    isTransferModalOpen: true,
    transferSourceId: sourceId,
    transferTargetId: targetId || null,
  }),
  closeTransferModal: () => set({
    isTransferModalOpen: false,
    transferSourceId: null,
    transferTargetId: null,
  }),
  toggleNotebook: (open) => set(s => ({ isNotebookOpen: open !== undefined ? open : !s.isNotebookOpen })),
  toggleAIAssistant: (open) => set(s => ({ isAIAssistantOpen: open !== undefined ? open : !s.isAIAssistantOpen })),
  toggleApiKeyModal: (open) => set(s => ({ isApiKeyModalOpen: open !== undefined ? open : !s.isApiKeyModalOpen })),
  togglePeriodicTable: (open) => set(s => ({ isPeriodicTableOpen: open !== undefined ? open : !s.isPeriodicTableOpen })),
  toggleTitrationCurve: (open) => set(s => ({ isTitrationCurveOpen: open !== undefined ? open : !s.isTitrationCurveOpen })),
  toggleQuizModal: (open) => set(s => ({ isQuizModalOpen: open !== undefined ? open : !s.isQuizModalOpen })),
  cleanSpill: (id) => set(s => ({
    spillPuddles: s.spillPuddles.filter(p => p.id !== id),
  })),
  cleanAllSpills: () => set({ spillPuddles: [] }),
  addSpillPuddle: (x, y, volume_ml, colorHex, formula, ph = 7.0) => {
    const id = `puddle_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newPuddle: SpillPuddle = {
      id,
      x,
      y,
      volume_ml,
      colorHex,
      formula,
      ph,
      radius_px: Math.min(65, Math.max(18, 12 + Math.sqrt(volume_ml) * 5)),
      timestamp: Date.now(),
    };
    set(s => ({
      spillPuddles: [...s.spillPuddles.slice(-12), newPuddle],
    }));
  },
  toggleMute: () => {
    const nextMuted = !get().isMuted;
    soundEngine.setMuted(nextMuted);
    set({ isMuted: nextMuted });
  },
  setDraggedChemicalId: (id) => set({ draggedChemicalId: id }),


  triggerDirectPour: (sourceId: string, targetId: string) => {
    const src = get().equipment[sourceId];
    const tgt = get().equipment[targetId];
    if (!src || !tgt || !tgt.isContainer || src.volume_ml <= 0) return;

    const pourAmount = Math.min(src.volume_ml, 25);
    const contactX = Math.max(-0.75, Math.min(0.75, (src.x + src.width / 2 - (tgt.x + tgt.width / 2)) / Math.max(40, tgt.width * 0.5)));
    set({
      activePour: {
        sourceId,
        targetId,
        rate_ml_s: 36,
        remaining_ml: pourAmount,
        startedAt: Date.now(),
        tilt_deg: 56,
      },
      activePourVfx: {
        sourceId,
        targetId,
        startX: src.x + src.width / 2,
        startY: src.y + 15,
        endX: tgt.x + tgt.width / 2 + contactX * tgt.width * 0.28,
        endY: tgt.y + Math.max(24, tgt.height * 0.35),
        liquidColorHex: src.liquidColorHex || '#38bdf8',
      },
    });
    soundEngine.pour(0.7);
  },

  triggerGeminiReactionCheck: async (vesselId: string) => {
    const eq = get().equipment[vesselId];
    if (!eq || eq.contents.length < 2) return false;
    const formulas = eq.contents.map(c => c.formula);

    try {
      const aiRes = await generateReactionFromGemini(
        formulas,
        eq.temperature_c,
        eq.isOn || false,
        eq.volume_ml
      );

      if (get().equipment[vesselId] !== eq || get().simulationPaused) return false;
      if (aiRes && aiRes.isReaction && aiRes.reactionDefinition) {
        const rx = aiRes.reactionDefinition;
        if (!isElementBalancedReaction(rx)) return false;
        const exists = REACTION_DATABASE.some(r => r.id === rx.id);
        if (!exists) {
          REACTION_DATABASE.push(rx);
        }

        const sim = runSimulationCycle(eq.contents, eq.volume_ml, eq.temperature_c, eq.isOn || false);
        const totalContentMass = sim.updatedContents.reduce((sum, c) => sum + c.mass_g, 0);
        const newTotalMass = (eq.tare_g || 0) + totalContentMass;

        if (sim.hasGas) soundEngine.fizz(1.5);
        soundEngine.success();

        set(state => ({
          ...pushSnapshot(state),
          equipment: {
            ...state.equipment,
            [vesselId]: {
              ...eq,
              contents: sim.updatedContents,
              mass_g: Math.round(newTotalMass * 100) / 100,
              temperature_c: sim.finalTemperature_c,
              ph: sim.finalPh,
              liquidColorHex: sim.finalLiquidColorHex,
              hasPrecipitate: sim.hasPrecipitate,
              precipitateColorHex: sim.precipitateInfo?.colorHex,
              precipitateSubstance: sim.precipitateInfo?.formula,
              precipitateMass_g: sim.precipitateInfo?.mass_g,
              precipitateMorphology: sim.precipitateInfo?.morphology,
              hasGas: sim.hasGas,
              effervescenceSpeed: sim.gasInfo?.effervescenceSpeed,
              isBoiling: sim.isBoiling,
            },
          },
          history: [
            ...state.history,
            {
              id: `log_${Date.now()}`,
              timestamp: Date.now(),
              actionType: 'REACTION',
              details_en: `[AI proposal] Predicted Reaction: ${rx.name_en} (${rx.equation})`,
              details_vi: `[Đề xuất AI] Phản ứng dự đoán: ${rx.name_vi} (${rx.equation})`,
              vesselId,
              measurements: {
                volume_ml: eq.volume_ml,
                temperature_c: sim.finalTemperature_c,
                ph: sim.finalPh,
              },
            },
          ],
        }));

        get().checkStepProgress();
        return true;
      }
    } catch (err) {
      console.warn('[Gemini reaction check failed]:', err);
    }
    return false;
  },

  addEquipment: (type, customX, customY) => {
    const id = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const spec = EQUIPMENT_SPECS[type];
    const existingCount = Object.keys(get().equipment).length;
    const isHeater = type === 'bunsen_burner' || type === 'hot_plate';
    const slotsX = [290, 145, 435, 215];
    const x =
      customX !== undefined
        ? customX
        : isHeater
          ? 305 + (existingCount % 3 === 0 ? 0 : existingCount % 3 === 1 ? -145 : 145)
          : slotsX[existingCount % 4] + (Math.floor(existingCount / 4) % 2) * 35;
    const y =
      customY !== undefined
        ? customY
        : isHeater
          ? 295
          : 165 + Math.floor(existingCount / 4) * 40;

    const newEquipment: EquipmentState = {
      id,
      name: spec.name,
      name_vi: spec.name_vi,
      type,
      x,
      y,
      width: spec.width,
      height: spec.height,
      capacity_ml: spec.capacity_ml,
      isContainer: spec.isContainer,
      temperature_c: 25.0,
      contents: type === 'wash_bottle' ? [{ formula: 'H2O', moles: 250 / 18.015, mass_g: 250, state: 'l' }] : [],
      volume_ml: type === 'wash_bottle' ? 250 : 0,
      mass_g: type === 'wash_bottle' ? spec.tare_g + 250 : spec.tare_g,
      tare_g: spec.tare_g,
      ph: 7.0,
      isOn: false,
      paperColorHex: type === 'ph_paper' ? '#fbbf24' : undefined,
    };

    set(state => ({
      ...pushSnapshot(state),
      equipment: { ...state.equipment, [id]: newEquipment },
      selectedEquipmentId: id,
      history: [
        ...state.history,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'ADD_EQUIPMENT',
          details_en: `Added ${spec.name} to workbench`,
          details_vi: `Đã thêm ${spec.name_vi} vào bàn thí nghiệm`,
          vesselId: id,
        },
      ],
    }));

    get().checkStepProgress();
    return id;
  },

  removeEquipment: (id) => {
    const eq = get().equipment[id];
    if (!eq) return;

    set(state => {
      const next = { ...state.equipment };
      delete next[id];
      return {
        ...pushSnapshot(state),
        equipment: next,
        selectedEquipmentId: state.selectedEquipmentId === id ? null : state.selectedEquipmentId,
        history: [
          ...state.history,
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            actionType: 'ADD_EQUIPMENT',
            details_en: `Removed ${eq.name}`,
            details_vi: `Đã dọn dẹp ${eq.name_vi}`,
            vesselId: id,
          },
        ],
      };
    });
  },

  updatePosition: (id, x, y) => {
    set(state => {
      if (!state.equipment[id]) return state;
      return {
        equipment: {
          ...state.equipment,
          [id]: { ...state.equipment[id], x, y },
        },
      };
    });
  },

  addChemicalToEquipment: (equipmentId, chemicalId, amount_ml = 20, amount_g = 1.0) => {
    const eq = get().equipment[equipmentId];
    const chem = findChemicalById(chemicalId);
    if (!eq || !chem || !eq.isContainer) return;

    const isLiquid = chem.phase_STP === 'aqueous' || chem.phase_STP === 'liquid';
    if (!Number.isFinite(amount_ml) || !Number.isFinite(amount_g) || amount_ml < 0 || amount_g < 0) return;
    const volumeAdded = isLiquid ? Math.min(amount_ml, Math.max(0, eq.capacity_ml - eq.volume_ml)) : 0;
    const density = chem.density_g_ml || 1.0;
    const massAdded = isLiquid ? volumeAdded * density : amount_g;
    
    // For aqueous solutions with stated molar concentration, moles = C * V_L
    const molesAdded = (chem.phase_STP === 'aqueous' && chem.defaultConcentration_M !== undefined)
      ? chem.defaultConcentration_M * (volumeAdded / 1000.0)
      : massAdded / chem.molarMass_g_mol;

    // Keep solute and solvent inventories separate: C*V describes dissolved
    // solute moles, while density*V is the mass of the whole stock solution.
    const soluteMass = chem.phase_STP === 'aqueous' ? molesAdded * chem.molarMass_g_mol : massAdded;
    const solventMass = chem.phase_STP === 'aqueous' ? Math.max(0, massAdded - soluteMass) : 0;
    // Calculate new total volume
    const newVolume = Math.min(eq.capacity_ml, eq.volume_ml + volumeAdded);

    // Prepare updated contents list
    const newContents: SubstanceQuantity[] = structuredClone(eq.contents);
    const existing = newContents.find(c => c.formula.toUpperCase() === chem.formula.toUpperCase());

    if (existing) {
      existing.moles += molesAdded;
      existing.mass_g += soluteMass;
      if (isLiquid && newVolume > 0) {
        existing.concentration_M = existing.moles / (newVolume / 1000.0);
      }
    } else {
      newContents.push({
        formula: chem.formula,
        moles: molesAdded,
        mass_g: soluteMass,
        volume_ml: chem.phase_STP === 'liquid' ? volumeAdded : undefined,
        concentration_M: isLiquid && newVolume > 0 ? molesAdded / (newVolume / 1000.0) : undefined,
        state: chem.phase_STP === 'gas' ? 'g' : chem.phase_STP === 'aqueous' ? 'aq' : chem.phase_STP === 'liquid' ? 'l' : 's',
      });
    }

    if (solventMass > 0) {
      const solvent = newContents.find(item => item.formula === 'H2O');
      const waterMoles = solventMass / computeMolarMass('H2O');
      if (solvent) { solvent.mass_g += solventMass; solvent.moles += waterMoles; }
      else newContents.push({formula:'H2O',moles:waterMoles,mass_g:solventMass,state:'l'});
    }
    // Check acid dilution safety hazard (pouring water into concentrated H2SO4)
    const acidDilutionAlert = checkAcidDilutionHazard(chem.formula, eq);
    if (acidDilutionAlert) {
      soundEngine.playWarningAlarm();
      reactionRuntime2D.triggerController(eq, 'water_into_conc_h2so4_explosion');
      set(s => ({ safetyAlerts: [...s.safetyAlerts.slice(-4), acidDilutionAlert] }));
    }

    // Run deterministic chemistry calculation engine
    const env = useLabEnvironment.getState().environment;
    const prevColor = eq.liquidColorHex || '#f8fafc';
    const simResult = runSimulationCycle(newContents, newVolume, eq.temperature_c, eq.isOn || false, !eq.isSealed, {
      oxygenFraction: env.oxygenFraction,
    });

    // Compute updated total mass = vessel tare + liquid/solids
    const totalContentMass = simResult.updatedContents.reduce((sum, c) => sum + c.mass_g, 0);
    const newTotalMass = (eq.tare_g || 0) + totalContentMass;

    // Trigger instant procedural audio feedback & dedicated 2D visual controllers + spatial color spreading
    const hasPhenol = newContents.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
    const isTransientBasicPlume =
      hasPhenol &&
      ['NAOH', 'KOH', 'NH3', 'BA(OH)2', 'CA(OH)2'].includes(chem.formula.toUpperCase()) &&
      simResult.finalLiquidColorHex === '#f8fafc';
    const dropColor = isTransientBasicPlume ? '#ec4899' : chem.colorHex || '#38bdf8';
    const contactX = 0.0;
    const updatedVessel = applySimResultToEquipment(eq, newVolume, newTotalMass, simResult, {
      pourContactX: contactX,
      mixedness: Math.min(eq.mixedness ?? 0.6, 0.35),
    });
    reactionRuntime2D.triggerColorMixing(updatedVessel, prevColor, simResult.finalLiquidColorHex, contactX, dropColor);

    if (simResult.activeControllerIds?.length) {
      for (const cid of simResult.activeControllerIds) {
        reactionRuntime2D.triggerController(updatedVessel, cid, {
          hasPhenolphthalein: hasPhenol,
          targetColorHex: simResult.finalLiquidColorHex,
        });
      }
    }

    if (simResult.reactionsOccurred.length > 0) {
      if (simResult.isExplosion) {
        soundEngine.playExplosion(1.0);
      } else if (simResult.hasGas) {
        soundEngine.fizz(1.3);
      } else {
        soundEngine.success();
      }
    } else if (!isLiquid) {
      soundEngine.playSolidDrop();
    } else {
      soundEngine.pour(0.4);
    }

    const rxLogs: LabLogEntry[] = simResult.reactionsOccurred.map(rx => ({
      id: `log_rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      actionType: 'REACTION' as const,
      reactionId: rx.reactionId,
      details_en: `Reaction: ${rx.name_en || rx.observable_en || rx.equation} (${rx.equation})`,
      details_vi: `Phản ứng: ${rx.name_vi || rx.observable_vi || rx.equation} (${rx.equation})`,
      vesselId: equipmentId,
      measurements: {
        volume_ml: newVolume,
        temperature_c: simResult.finalTemperature_c,
        ph: simResult.finalPh,
      },
    }));

    set(state => ({
      ...pushSnapshot(state),
      equipment: {
        ...state.equipment,
        [equipmentId]: updatedVessel,
      },
      history: [
        ...state.history,
        ...rxLogs,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'ADD_CHEMICAL',
          details_en: `Added ${isLiquid ? `${amount_ml} mL` : `${amount_g} g`} of ${chem.name_en} to ${eq.name}`,
          details_vi: `Đã thêm ${isLiquid ? `${amount_ml} mL` : `${amount_g} g`} ${chem.name_vi} vào ${eq.name_vi}`,
          vesselId: equipmentId,
          measurements: {
            volume_ml: newVolume,
            temperature_c: simResult.finalTemperature_c,
            ph: simResult.finalPh,
          },
        },
      ],
    }));

    get().checkStepProgress();

    // Trigger Gemini 3.5 AI reaction synthesis if 2+ substances exist and no local reaction occurred
    if (simResult.reactionsOccurred.length === 0 && simResult.updatedContents.length >= 2) {
      get().triggerGeminiReactionCheck(equipmentId);
    }
  },

  transferMaterial: (sourceId, targetId, amount_ml, amount_g, transferAll = false) => {
    const src = get().equipment[sourceId];
    const tgt = get().equipment[targetId];
    if (!src || !tgt || !tgt.isContainer || src.contents.length === 0) return;

    const transferVol = transferAll
      ? src.volume_ml
      : Math.min(src.volume_ml, amount_ml !== undefined ? amount_ml : src.volume_ml);

    if (transferVol <= 0 && src.contents.every(c => c.state === 'aq')) return;

    // Fractional transfer for homogeneous liquid mixtures
    const fraction = src.volume_ml > 0 ? Math.min(1.0, transferVol / src.volume_ml) : 1.0;

    const transferredItems: SubstanceQuantity[] = [];
    const remainingSrcItems: SubstanceQuantity[] = [];

    for (const item of src.contents) {
      const molesToMove = item.moles * fraction;
      const massToMove = item.mass_g * fraction;

      if (molesToMove > 0) {
        transferredItems.push({
          ...item,
          moles: molesToMove,
          mass_g: massToMove,
        });
      }

      const remainingMoles = item.moles - molesToMove;
      if (remainingMoles > 1e-6) {
        remainingSrcItems.push({
          ...item,
          moles: remainingMoles,
          mass_g: item.mass_g - massToMove,
        });
      }
    }

    // Update source vessel
    const newSrcVol = Math.max(0, src.volume_ml - transferVol);
    const srcMass = (src.tare_g || 0) + remainingSrcItems.reduce((s, c) => s + c.mass_g, 0);

    // Merge transferred items into target vessel
    const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + transferVol);
    const mergedTgtContents: SubstanceQuantity[] = [...tgt.contents];

    for (const item of transferredItems) {
      const existing = mergedTgtContents.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
      if (existing) {
        existing.moles += item.moles;
        existing.mass_g += item.mass_g;
      } else {
        mergedTgtContents.push({ ...item });
      }
    }

    // Check if pouring water into concentrated H2SO4
    const primarySourceFormula = src.contents[0]?.formula || 'H2O';
    const acidDilutionAlert = checkAcidDilutionHazard(primarySourceFormula, tgt);
    if (acidDilutionAlert) {
      soundEngine.playWarningAlarm();
      reactionRuntime2D.triggerController(tgt, 'water_into_conc_h2so4_explosion');
      set(s => ({ safetyAlerts: [...s.safetyAlerts.slice(-4), acidDilutionAlert] }));
    }

    // Overflow spill check when pouring more than target capacity
    const overflow_ml = Math.max(0, tgt.volume_ml + transferVol - tgt.capacity_ml);
    if (overflow_ml > 0.2) {
      get().addSpillPuddle(
        tgt.x + tgt.width / 2,
        tgt.y + tgt.height - 4,
        overflow_ml,
        src.liquidColorHex || '#38bdf8',
        primarySourceFormula,
        src.ph
      );
    }

    // Run reaction engine on target vessel
    const env = useLabEnvironment.getState().environment;
    const prevTgtColor = tgt.liquidColorHex || '#f8fafc';
    const tgtSim = runSimulationCycle(mergedTgtContents, newTgtVol, tgt.temperature_c, tgt.isOn || false, !tgt.isSealed, {
      oxygenFraction: env.oxygenFraction,
    });
    const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
    const contactX = Math.max(-0.85, Math.min(0.85, ((src.x + src.width / 2) - (tgt.x + tgt.width / 2)) / Math.max(40, tgt.width * 0.5)));
    const updatedTargetEq = applySimResultToEquipment(tgt, newTgtVol, tgtMass, tgtSim, {
      pourContactX: contactX,
      mixedness: Math.min(tgt.mixedness ?? 0.65, 0.35),
    });

    reactionRuntime2D.triggerColorMixing(updatedTargetEq, prevTgtColor, tgtSim.finalLiquidColorHex, contactX, src.liquidColorHex || '#38bdf8');

    // Trigger dedicated 2D visual controllers
    if (tgtSim.activeControllerIds?.length) {
      const hasPhenol = mergedTgtContents.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
      for (const cid of tgtSim.activeControllerIds) {
        reactionRuntime2D.triggerController(updatedTargetEq, cid, {
          hasPhenolphthalein: hasPhenol,
          targetColorHex: tgtSim.finalLiquidColorHex,
        });
      }
    }

    // Audio feedback
    if (tgtSim.reactionsOccurred.length > 0) {
      if (tgtSim.isExplosion) {
        soundEngine.playExplosion(1.0);
      } else if (tgtSim.hasGas) {
        soundEngine.fizz(1.3);
      } else {
        soundEngine.success();
      }
    } else {
      soundEngine.pour(0.5);
    }

    const rxLogs: LabLogEntry[] = tgtSim.reactionsOccurred.map(rx => ({
      id: `log_rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      actionType: 'REACTION' as const,
      reactionId: rx.reactionId,
      details_en: `Reaction: ${rx.name_en || rx.observable_en || rx.equation} (${rx.equation})`,
      details_vi: `Phản ứng: ${rx.name_vi || rx.observable_vi || rx.equation} (${rx.equation})`,
      vesselId: targetId,
      measurements: {
        volume_ml: newTgtVol,
        temperature_c: tgtSim.finalTemperature_c,
        ph: tgtSim.finalPh,
      },
    }));

    set(state => ({
      ...pushSnapshot(state),
      equipment: {
        ...state.equipment,
        [sourceId]: {
          ...src,
          volume_ml: Math.round(newSrcVol * 10) / 10,
          mass_g: Math.round(srcMass * 100) / 100,
          contents: remainingSrcItems,
          hasPrecipitate: remainingSrcItems.some(c => c.state === 's'),
        },
        [targetId]: updatedTargetEq,
      },
      isTransferModalOpen: false,
      history: [
        ...state.history,
        ...rxLogs,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'TRANSFER',
          details_en: `Poured ${transferVol.toFixed(1)} mL from ${src.name} to ${tgt.name}`,
          details_vi: `Đã rót ${transferVol.toFixed(1)} mL từ ${src.name_vi} sang ${tgt.name_vi}`,
          vesselId: targetId,
          measurements: {
            volume_ml: newTgtVol,
            temperature_c: tgtSim.finalTemperature_c,
            ph: tgtSim.finalPh,
          },
        },
      ],
    }));

    get().checkStepProgress();

    // Trigger Gemini 3.5 AI reaction synthesis if 2+ substances exist and no local reaction occurred
    if (tgtSim.reactionsOccurred.length === 0 && tgtSim.updatedContents.length >= 2) {
      get().triggerGeminiReactionCheck(targetId);
    }
  },

  toggleHeat: (id) => {
    const eq = get().equipment[id];
    if (!eq) return;
    const nextIsOn = !eq.isOn;

    if (eq.type === 'bunsen_burner') {
      if (nextIsOn) soundEngine.ignite();
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: { ...eq, isOn: nextIsOn },
        },
        history: [
          ...state.history,
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            actionType: 'HEAT',
            details_en: nextIsOn ? `Lit Bunsen Burner flame` : `Turned off Bunsen Burner`,
            details_vi: nextIsOn ? `Châm lửa đèn Bunsen` : `Tắt đèn Bunsen`,
            vesselId: id,
          },
        ],
      }));
      return;
    }

    if (eq.type === 'hot_plate') {
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: { ...eq, isOn: nextIsOn, setPoint_c: 120.0 },
        },
        history: [
          ...state.history,
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            actionType: 'HEAT',
            details_en: nextIsOn ? `Switched on Hot Plate heater` : `Switched off Hot Plate`,
            details_vi: nextIsOn ? `Bật bếp gia nhiệt` : `Tắt bếp gia nhiệt`,
            vesselId: id,
          },
        ],
      }));
      return;
    }

    // Direct heating toggle on container vessel
    const newTemp = nextIsOn ? Math.max(eq.temperature_c, 85.0) : 25.0;
    const sim = runSimulationCycle(eq.contents, eq.volume_ml, newTemp, nextIsOn);

    set(state => ({
      ...pushSnapshot(state),
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          isOn: nextIsOn,
          temperature_c: sim.finalTemperature_c,
          liquidColorHex: sim.finalLiquidColorHex,
          ph: sim.finalPh,
          contents: sim.updatedContents,
          hasPrecipitate: sim.hasPrecipitate,
          precipitateColorHex: sim.precipitateInfo?.colorHex,
          precipitateSubstance: sim.precipitateInfo?.formula,
          precipitateMass_g: sim.precipitateInfo?.mass_g,
          precipitateMorphology: sim.precipitateInfo?.morphology,
          hasPhaseSeparation: sim.hasPhaseSeparation,
          organicLayerVolume_ml: sim.organicLayerVolume_ml,
          organicLayerColorHex: sim.organicLayerColorHex,
          hasFumes: sim.hasFumes,
          fumeType: sim.fumeType,
          fumeColorHex: sim.fumeColorHex,
          turbidity: sim.turbidity,
          foamHead_mm: sim.foamHead_mm,
          hasSilverMirror: sim.hasSilverMirror || eq.hasSilverMirror,
        },
      },
      history: [
        ...state.history,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'HEAT',
          details_en: nextIsOn ? `Turned on heating for ${eq.name}` : `Turned off heating for ${eq.name}`,
          details_vi: nextIsOn ? `Bật gia nhiệt cho ${eq.name_vi}` : `Tắt gia nhiệt cho ${eq.name_vi}`,
          vesselId: id,
          measurements: { temperature_c: sim.finalTemperature_c },
        },
      ],
    }));

    get().checkStepProgress();
  },

  tareEquipment: (id) => {
    const eq = get().equipment[id];
    if (!eq) return;

    if (eq.type === 'analytical_balance') {
      const allEq = Object.values(get().equipment);
      const panVessel = allEq.find(
        v => v.id !== id && v.isContainer && Math.abs((v.x + v.width / 2) - (eq.x + eq.width / 2)) < eq.width * 0.45 && Math.abs((v.y + v.height) - (eq.y + 40)) < 45
      );
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: {
            ...eq,
            tare_g: panVessel ? panVessel.mass_g : 0,
          },
        },
      }));
    } else {
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: {
            ...eq,
            tare_g: eq.mass_g,
          },
        },
      }));
    }
  },

  toggleBuretteStopcock: (id) => {
    const item = get().equipment[id];
    if (!item || (item.type !== 'burette' && item.type !== 'separatory_funnel')) return;

    const nextOpen = !item.stopcockOpen;
    if (nextOpen) soundEngine.drip();

    // Find receiving vessel placed underneath
    const allEq = Object.values(get().equipment);
    const target = allEq.find(
      e => e.id !== id && e.isContainer && Math.abs((e.x + e.width / 2) - (item.x + item.width / 2)) < 80 && e.y > item.y
    );

    if (target && item.volume_ml > 0 && item.type === 'burette') {
      // Dispense standard initial aliquot (1.0 mL)
      get().transferMaterial(id, target.id, 1.0, undefined, false);
    }

    set(state => ({
      equipment: {
        ...state.equipment,
        [id]: {
          ...state.equipment[id],
          stopcockOpen: nextOpen,
        },
      },
    }));
  },

  emptyEquipment: (id) => {
    const eq = get().equipment[id];
    if (!eq || !eq.isContainer) return;

    soundEngine.pour(0.3);
    set(state => ({
      ...pushSnapshot(state),
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          contents: [],
          volume_ml: 0,
          mass_g: eq.tare_g || 0,
          ph: 7.0,
          liquidColorHex: '#f8fafc',
          hasPrecipitate: false,
          precipitateSubstance: undefined,
          precipitateMass_g: 0,
          precipitateColorHex: undefined,
          precipitateMorphology: undefined,
          hasGas: false,
          isBoiling: false,
          hasPhaseSeparation: false,
          organicLayerVolume_ml: undefined,
          hasFumes: false,
          turbidity: 0,
          foamHead_mm: 0,
          hasSilverMirror: false,
          isStirred: false,
        },
      },
      history: [
        ...state.history,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'TRANSFER',
          details_en: `Rinsed and emptied ${eq.name}`,
          details_vi: `Đã đổ bỏ và tráng rửa ${eq.name_vi}`,
          vesselId: id,
        },
      ],
    }));
    get().checkStepProgress();
  },

  toggleStir: (id) => {
    const eq = get().equipment[id];
    if (!eq || !eq.isContainer) return;

    const nextStirred = !eq.isStirred;
    soundEngine.drip();
    set(state => ({
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          isStirred: nextStirred,
          stirringSpeed: nextStirred ? 0.85 : 0,
          stirIntensity: nextStirred ? 1.0 : 0,
        },
      },
    }));
  },

  addDistilledWater: (id, amount_ml = 25) => {
    get().addChemicalToEquipment(id, 'chem-h2o', amount_ml);
  },

  toggleSeal: (id) => {
    const eq = get().equipment[id];
    if (!eq || !eq.isContainer) return;

    soundEngine.click();
    set(state => ({
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          isSealed: !eq.isSealed,
        },
      },
    }));
  },

  tickSimulation: (rawDt: number) => {
    if (get().simulationPaused) return;
    const currentEquipment = get().equipment;
    if (Object.keys(currentEquipment).length === 0) return;

    const dt = Math.max(0.001, rawDt * (get().simTimeScale || 1));
    const env = useLabEnvironment.getState().environment;

    let hasChanged = false;
    const nextEquipment: Record<string, EquipmentState> = { ...currentEquipment };
    let nextActivePour = get().activePour;
    let nextActivePourVfx = get().activePourVfx;

    const allEqList = Object.values(currentEquipment);
    const activeBurners = allEqList.filter(e => e.type === 'bunsen_burner' && e.isOn);
    const activeHotPlates = allEqList.filter(e => e.type === 'hot_plate' && e.isOn);
    const openBurettes = allEqList.filter(e => e.type === 'burette' && e.stopcockOpen && e.volume_ml > 0);
    const newlyCreatedSpills: SpillPuddle[] = [];

    // Extinguish flames automatically under Inert (0% O2) atmosphere
    if (!isOxygenSupportingAtmosphere(env)) {
      for (const burner of activeBurners) {
        nextEquipment[burner.id] = { ...burner, isOn: false, gasColorHex: undefined };
        hasChanged = true;
      }
    }

    // 0. Process Continuous Drag/Button Pour Stream
    if (nextActivePour) {
      const srcEq = nextEquipment[nextActivePour.sourceId];
      const tgtEq = nextEquipment[nextActivePour.targetId];
      if (!srcEq || !tgtEq || !tgtEq.isContainer || srcEq.volume_ml <= 0.05 || (nextActivePour.remaining_ml !== undefined && nextActivePour.remaining_ml <= 0.05)) {
        nextActivePour = null;
        nextActivePourVfx = null;
        hasChanged = true;
      } else {
        const capRemaining = nextActivePour.remaining_ml ?? srcEq.volume_ml;
        const maxStepRate = Math.min(nextActivePour.rate_ml_s, capRemaining / Math.max(0.005, dt));
        const { moved_ml, spill_ml, done } = stepPour(srcEq, tgtEq, dt, maxStepRate);
        const totalRemoved = moved_ml + spill_ml;
        if (totalRemoved > 1e-4 && srcEq.volume_ml > 0) {
          hasChanged = true;
          const frac = Math.min(1, totalRemoved / srcEq.volume_ml);
          const movedFrac = totalRemoved > 0 ? moved_ml / totalRemoved : 1;
          const newSrcVol = Math.max(0, srcEq.volume_ml - totalRemoved);
          const remSrcContents: SubstanceQuantity[] = [];
          const transferred: SubstanceQuantity[] = [];

          for (const item of srcEq.contents) {
            if (item.state === 's') {
              remSrcContents.push({ ...item });
              continue;
            }
            const totalItemMove = item.moles * frac;
            const totalMassMove = item.mass_g * frac;
            const tgtMoles = totalItemMove * movedFrac;
            const tgtMass = totalMassMove * movedFrac;
            if (tgtMoles > 1e-9) transferred.push({ ...item, moles: tgtMoles, mass_g: tgtMass });
            const remM = item.moles - totalItemMove;
            if (remM > 1e-8 || item.formula === 'H2O') {
              remSrcContents.push({ ...item, moles: remM, mass_g: item.mass_g - totalMassMove });
            }
          }

          const srcProps = calculateMixturePhysicalProperties(remSrcContents, newSrcVol, srcEq.temperature_c);
          const srcMass = (srcEq.tare_g || 0) + remSrcContents.reduce((s, c) => s + c.mass_g, 0);
          nextEquipment[srcEq.id] = {
            ...srcEq,
            volume_ml: Math.round(newSrcVol * 10) / 10,
            mass_g: Math.round(srcMass * 100) / 100,
            contents: remSrcContents,
            viscosity_mPa_s: srcProps.viscosity_mPa_s,
            surfaceTension_N_m: srcProps.surfaceTension_N_m,
            density_g_ml: srcProps.density_g_ml,
          };

          if (spill_ml > 0.15) {
            newlyCreatedSpills.push({
              id: `spill_pour_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              x: srcEq.x + srcEq.width * 0.78,
              y: tgtEq.y + tgtEq.height - 4,
              volume_ml: spill_ml,
              colorHex: srcEq.liquidColorHex || '#38bdf8',
              formula: srcEq.contents[0]?.formula || 'H2O',
              ph: srcEq.ph,
              radius_px: Math.min(60, 14 + Math.sqrt(spill_ml) * 5),
              timestamp: Date.now(),
            });
          }

          if (moved_ml > 1e-4) {
            const newTgtVol = Math.min(tgtEq.capacity_ml, tgtEq.volume_ml + moved_ml);
            const mergedTgt = tgtEq.contents.map(c => ({ ...c }));
            for (const item of transferred) {
              const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
              if (ex) { ex.moles += item.moles; ex.mass_g += item.mass_g; }
              else mergedTgt.push({ ...item });
            }
            const prevTgtColor = tgtEq.liquidColorHex || '#f8fafc';
            const tgtSim = runSimulationCycle(mergedTgt, newTgtVol, tgtEq.temperature_c, tgtEq.isOn || false, !tgtEq.isSealed, {
              oxygenFraction: env.oxygenFraction,
            });
            const tgtMass = (tgtEq.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
            const contactX = Math.max(-0.85, Math.min(0.85, ((srcEq.x + srcEq.width / 2) - (tgtEq.x + tgtEq.width / 2)) / Math.max(40, tgtEq.width * 0.5)));
            const updatedTgt = applySimResultToEquipment(tgtEq, newTgtVol, tgtMass, tgtSim, {
              pourContactX: contactX,
              mixedness: Math.min(tgtEq.mixedness ?? 0.65, 0.3),
            });
            nextEquipment[tgtEq.id] = updatedTgt;
            reactionRuntime2D.triggerColorMixing(updatedTgt, prevTgtColor, tgtSim.finalLiquidColorHex, contactX, srcEq.liquidColorHex || '#38bdf8');
            if (tgtSim.activeControllerIds?.length) {
              const hasPhenol = mergedTgt.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
              for (const cid of tgtSim.activeControllerIds) {
                reactionRuntime2D.triggerController(updatedTgt, cid, { hasPhenolphthalein: hasPhenol, targetColorHex: tgtSim.finalLiquidColorHex });
              }
            }
          }

          const remTarget = nextActivePour.remaining_ml !== undefined ? Math.max(0, nextActivePour.remaining_ml - totalRemoved) : undefined;
          if (done || (remTarget !== undefined && remTarget <= 0.05) || newSrcVol <= 0.05) {
            nextActivePour = null;
            nextActivePourVfx = null;
          } else {
            nextActivePour = { ...nextActivePour, remaining_ml: remTarget };
            nextActivePourVfx = {
              sourceId: srcEq.id,
              targetId: tgtEq.id,
              startX: srcEq.x + srcEq.width / 2,
              startY: srcEq.y + 15,
              endX: tgtEq.x + tgtEq.width / 2,
              endY: tgtEq.y + Math.max(24, tgtEq.height * 0.35),
              liquidColorHex: srcEq.liquidColorHex || '#38bdf8',
            };
          }
        }
      }
    }

    // 1. Process continuous Burette dropwise titration
    for (const burette of openBurettes) {
      const dropRate = burette.dispenseRate_ml_s || 0.35; // mL per second
      const dropAmount = Math.min(burette.volume_ml, dropRate * dt);
      if (dropAmount > 1e-4) {
        hasChanged = true;
        const newBurVol = Math.max(0, burette.volume_ml - dropAmount);
        const frac = dropAmount / burette.volume_ml;
        const transferred: SubstanceQuantity[] = [];
        const remBurContents: SubstanceQuantity[] = [];

        for (const item of burette.contents) {
          const mMove = item.moles * frac;
          const gMove = item.mass_g * frac;
          if (mMove > 0) transferred.push({ ...item, moles: mMove, mass_g: gMove });
          const remMoles = item.moles - mMove;
          if (remMoles > 1e-7) {
            remBurContents.push({ ...item, moles: remMoles, mass_g: item.mass_g - gMove });
          }
        }

        const burMass = (burette.tare_g || 0) + remBurContents.reduce((s, c) => s + c.mass_g, 0);
        nextEquipment[burette.id] = {
          ...burette,
          volume_ml: Math.round(newBurVol * 10) / 10,
          mass_g: Math.round(burMass * 100) / 100,
          contents: remBurContents,
        };

        // Find receiving vessel placed underneath burette
        const target = allEqList.find(
          e => e.id !== burette.id && e.isContainer && Math.abs((e.x + e.width / 2) - (burette.x + burette.width / 2)) < 70 && e.y > burette.y
        );

        if (target) {
          const tgtEq = nextEquipment[target.id] || target;
          const newTgtVol = Math.min(tgtEq.capacity_ml, tgtEq.volume_ml + dropAmount);
          const mergedTgt = [...tgtEq.contents];

          for (const item of transferred) {
            const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
            if (ex) {
              ex.moles += item.moles;
              ex.mass_g += item.mass_g;
            } else {
              mergedTgt.push({ ...item });
            }
          }

          const prevTgtColor = tgtEq.liquidColorHex || '#f8fafc';
          const tgtSim = runSimulationCycle(mergedTgt, newTgtVol, tgtEq.temperature_c, tgtEq.isOn || false, !tgtEq.isSealed, {
            oxygenFraction: env.oxygenFraction,
          });
          const tgtMass = (tgtEq.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
          const updatedTgt = applySimResultToEquipment(tgtEq, newTgtVol, tgtMass, tgtSim, {
            pourContactX: 0,
            mixedness: Math.min(tgtEq.mixedness ?? 0.65, 0.45),
          });
          nextEquipment[target.id] = updatedTgt;
          const isBasicDrop =
            mergedTgt.some(c => c.formula.toLowerCase().includes('phenolphthalein')) &&
            burette.contents.some(c => ['NAOH', 'KOH', 'NH3'].includes(c.formula.toUpperCase())) &&
            tgtSim.finalLiquidColorHex === '#f8fafc';
          if (tgtSim.finalLiquidColorHex !== prevTgtColor || isBasicDrop) {
            reactionRuntime2D.triggerColorMixing(
              updatedTgt,
              prevTgtColor,
              tgtSim.finalLiquidColorHex,
              0,
              isBasicDrop ? '#ec4899' : burette.liquidColorHex || '#38bdf8'
            );
          }
        }
      }
    }

    // 2. Process thermal physics: continuous Heating & Cooling by position
    const newLogs: LabLogEntry[] = [];
    const activeBurnerFlameColors: Record<string, string | undefined> = {};

    for (const eq of allEqList) {
      if (!eq.isContainer) continue;
      const currentEq = nextEquipment[eq.id] || eq;

      let heatPower_W = 0;
      let heatingBurnerId: string | null = null;

      for (const burner of activeBurners) {
        const power = burnerHeatToVessel(burner, currentEq, env);
        if (power > 5) {
          heatPower_W += power;
          heatingBurnerId = burner.id;
        }
      }
      for (const plate of activeHotPlates) {
        heatPower_W += hotPlateHeatToVessel(plate, currentEq);
      }

      const isBeingHeated = heatPower_W > 5;
      const heatingStateChanged = Boolean(currentEq.isBeingHeated) !== isBeingHeated;
      const mixState = (currentEq.mixedness ?? 1) < 0.995 || (currentEq.stirIntensity ?? 0) > 0.02
        ? stepMixing(currentEq, dt)
        : null;
      const nextStirIntensity = currentEq.isStirred
        ? Math.min(1, Math.max(0.7, currentEq.stirIntensity ?? 0.85))
        : Math.max(0, (currentEq.stirIntensity ?? 0) - dt * 0.45);

      const tempAwayFromAmbient = Math.abs(currentEq.temperature_c - env.temperature_c) > 0.2;
      const hasTempSensitiveSalt = currentEq.contents.some(c => c.formula.toUpperCase() === 'PBI2');

      if (heatPower_W > 0 || tempAwayFromAmbient || heatingStateChanged || hasTempSensitiveSalt || mixState) {
        const therm = stepVesselThermal(currentEq, dt, heatPower_W, env.temperature_c, env);
        const solStep = hasTempSensitiveSalt
          ? stepTemperatureSolubility(therm.contents, therm.volume_ml, therm.temperature_c, dt)
          : { contents: therm.contents };
        const tempDiff = Math.abs(therm.temperature_c - currentEq.temperature_c);
        const boilChanged = therm.isBoiling !== currentEq.isBoiling;
        const evap = therm.evaporatedStep_g > 0;
        const solChanged = solStep.contents !== therm.contents;

        if (tempDiff > 0.05 || boilChanged || evap || heatingStateChanged || solChanged) {
          hasChanged = true;
          const sim = runSimulationCycle(
            solStep.contents,
            therm.volume_ml,
            therm.temperature_c,
            currentEq.isOn || heatPower_W > 10,
            !currentEq.isSealed,
            { oxygenFraction: env.oxygenFraction }
          );

          // Check if any thermal reactions occurred during this tick
          if (sim.reactionsOccurred.length > 0) {
            for (const rx of sim.reactionsOccurred) {
              newLogs.push({
                id: `log_thermal_rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                timestamp: Date.now(),
                actionType: 'REACTION',
                details_en: `Thermal Reaction: ${rx.name_en || rx.equation} (${rx.equation})`,
                details_vi: `Phản ứng nhiệt: ${rx.name_vi || rx.equation} (${rx.equation})`,
                vesselId: eq.id,
                measurements: {
                  volume_ml: therm.volume_ml,
                  temperature_c: therm.temperature_c,
                  ph: sim.finalPh,
                },
              });
            }
            if (sim.hasGas) soundEngine.fizz(1.2);
            else soundEngine.success();
          }

          // If vessel is over burner and contains characteristic flame test elements, register flame color
          if (heatingBurnerId && sim.flameTestColorHex) {
            activeBurnerFlameColors[heatingBurnerId] = sim.flameTestColorHex;
          }

          const heatingRate = Math.round(((therm.temperature_c - currentEq.temperature_c) / Math.max(0.01, dt)) * 10) / 10;
          const showTripod = isBeingHeated && (eq.type === 'beaker' || eq.type === 'erlenmeyer_flask' || eq.type === 'evaporating_dish');

          let corkPopped = false;
          if (currentEq.isSealed && (therm.temperature_c >= aqueousBoilingPoint(solStep.contents, therm.volume_ml, env.pressure_atm) - 0.5 || therm.isBoiling || sim.gasInfo?.effervescenceSpeed === 'instant')) {
            corkPopped = true;
            soundEngine.ignite();
            newLogs.push({
              id: `log_${Date.now()}`,
              timestamp: Date.now(),
              actionType: 'HEAT',
              details_en: `⚠️ Cork popped from ${currentEq.name} due to internal vapor pressure!`,
              details_vi: `⚠️ Nút đậy bật tung khỏi ${currentEq.name_vi} do áp suất hơi tăng cao!`,
              vesselId: eq.id,
            });
          }

          const updatedThermalEq = applySimResultToEquipment(currentEq, therm.volume_ml, therm.mass_g, sim, {
            isBoiling: therm.isBoiling,
            boilingIntensity: therm.boilingIntensity,
            hasFumes: sim.hasFumes || therm.isBoiling || therm.temperature_c > env.temperature_c + 28,
            fumeType: sim.fumeType || (therm.isBoiling || therm.temperature_c > env.temperature_c + 28 ? 'steam' : undefined),
            fumeColorHex: sim.fumeColorHex || '#ffffff',
            isBeingHeated,
            absorbedPower_W: isBeingHeated ? Math.round(heatPower_W) : 0,
            heatingRate_c_s: heatingRate,
            hasTripod: showTripod,
            isSealed: corkPopped ? false : currentEq.isSealed,
            totalEvaporated_ml: (currentEq.totalEvaporated_ml ?? 0) + therm.evaporatedStep_g,
            mixedness: mixState?.mixedness ?? currentEq.mixedness,
            dissolvingRate: mixState?.dissolvingRate ?? currentEq.dissolvingRate,
            stirIntensity: nextStirIntensity,
          });
          if (solStep.recrystallizedFormula === 'PbI2') {
            reactionRuntime2D.triggerController(updatedThermalEq, 'pbi2_golden_rain', { targetColorHex: sim.finalLiquidColorHex });
          }
          nextEquipment[eq.id] = updatedThermalEq;
        } else if (mixState || Math.abs(nextStirIntensity - (currentEq.stirIntensity ?? 0)) > 0.02) {
          hasChanged = true;
          nextEquipment[eq.id] = {
            ...currentEq,
            mixedness: mixState?.mixedness ?? currentEq.mixedness,
            dissolvingRate: mixState?.dissolvingRate ?? currentEq.dissolvingRate,
            stirIntensity: nextStirIntensity,
          };
        }
      }
    }

    // Update flame test colors on active burners
    for (const burner of activeBurners) {
      const targetFlameColor = activeBurnerFlameColors[burner.id] || undefined;
      if (burner.gasColorHex !== targetFlameColor) {
        hasChanged = true;
        nextEquipment[burner.id] = {
          ...burner,
          gasColorHex: targetFlameColor,
        };
      }
    }

    if (newLogs.length > 0) {
      set(state => ({ history: [...state.history, ...newLogs] }));
      get().checkStepProgress();
    }

    // 3. Process hot plate magnetic stirring & acceleration
    for (const eq of allEqList) {
      if (!eq.isContainer) continue;
      const currentEq = nextEquipment[eq.id] || eq;
      let onHotPlate = false;
      for (const plate of activeHotPlates) {
        const dx = Math.abs((currentEq.x + currentEq.width / 2) - (plate.x + plate.width / 2));
        const dy = Math.abs((currentEq.y + currentEq.height) - plate.y);
        if (dx <= plate.width * 0.55 && dy <= 30) {
          onHotPlate = true;
          break;
        }
      }

      if (currentEq.isStirred !== onHotPlate) {
        hasChanged = true;
        nextEquipment[eq.id] = {
          ...currentEq,
          isStirred: onHotPlate,
          stirringSpeed: onHotPlate ? 0.85 : 0,
        };
      }
    }

    // 4. Process Funnel Filtration (retains precipitate, passes filtrate)
    const activeFunnels = allEqList.filter(e => e.type === 'funnel' && e.volume_ml > 0);
    for (const funnel of activeFunnels) {
      const currentFunnel = nextEquipment[funnel.id] || funnel;
      const filterRate = 0.35; // mL per second
      const dripAmount = Math.min(currentFunnel.volume_ml, filterRate * dt);
      if (dripAmount > 1e-4) {
        hasChanged = true;
        const newFunnelVol = Math.max(0, currentFunnel.volume_ml - dripAmount);

        // Find container placed underneath funnel
        const receiver = allEqList.find(
          e => e.id !== funnel.id && e.isContainer && Math.abs((e.x + e.width / 2) - (funnel.x + funnel.width / 2)) < 60 && e.y > funnel.y
        );

        const solids = currentFunnel.contents.filter(c => c.state === 's');
        const aqueous = currentFunnel.contents.filter(c => c.state !== 's');
        const frac = currentFunnel.volume_ml > 0 ? dripAmount / currentFunnel.volume_ml : 1.0;

        const filtratePassed: SubstanceQuantity[] = [];
        const remAqueous: SubstanceQuantity[] = [];
        for (const item of aqueous) {
          const mPass = item.moles * frac;
          const gPass = item.mass_g * frac;
          if (mPass > 0) filtratePassed.push({ ...item, moles: mPass, mass_g: gPass });
          const remM = item.moles - mPass;
          if (remM > 1e-6) remAqueous.push({ ...item, moles: remM, mass_g: item.mass_g - gPass });
        }

        const primarySolid = solids[0];
        nextEquipment[funnel.id] = {
          ...currentFunnel,
          volume_ml: Math.round(newFunnelVol * 10) / 10,
          contents: [...solids, ...remAqueous],
          filterResidueFormula: primarySolid ? primarySolid.formula : currentFunnel.filterResidueFormula,
          filterResidue_g: solids.reduce((sum, s) => sum + s.mass_g, 0),
          filtrate_ml: (currentFunnel.filtrate_ml || 0) + dripAmount,
        };

        if (receiver) {
          const tgt = nextEquipment[receiver.id] || receiver;
          const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + dripAmount);
          const mergedTgt = [...tgt.contents];
          for (const item of filtratePassed) {
            const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
            if (ex) {
              ex.moles += item.moles;
              ex.mass_g += item.mass_g;
            } else {
              mergedTgt.push({ ...item });
            }
          }
          const tgtSim = runSimulationCycle(mergedTgt, newTgtVol, tgt.temperature_c, tgt.isOn || false);
          const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);

          nextEquipment[receiver.id] = {
            ...tgt,
            volume_ml: Math.round(newTgtVol * 10) / 10,
            mass_g: Math.round(tgtMass * 100) / 100,
            contents: tgtSim.updatedContents,
            ph: tgtSim.finalPh,
            liquidColorHex: tgtSim.finalLiquidColorHex,
          };
        }
      }
    }

    // 5. Process Separatory Funnel Drainage (Liquid-liquid phase extraction)
    const activeSepFunnels = allEqList.filter(e => e.type === 'separatory_funnel' && e.stopcockOpen && e.volume_ml > 0);
    for (const sep of activeSepFunnels) {
      const currentSep = nextEquipment[sep.id] || sep;
      const { drainedAqueous_ml, closedAfterDrain } = separatoryFunnelDrain(currentSep, dt);
      if (drainedAqueous_ml > 1e-4) {
        hasChanged = true;
        const newSepVol = Math.max(0, currentSep.volume_ml - drainedAqueous_ml);
        const receiver = allEqList.find(
          e => e.id !== sep.id && e.isContainer && Math.abs((e.x + e.width / 2) - (sep.x + sep.width / 2)) < 70 && e.y > sep.y
        );

        // Deduct aqueous contents proportionally from separatory funnel
        const frac = currentSep.volume_ml > 0 ? drainedAqueous_ml / currentSep.volume_ml : 1.0;
        const drainedContents: SubstanceQuantity[] = [];
        const remContents: SubstanceQuantity[] = [];

        for (const item of currentSep.contents) {
          const mPass = item.moles * frac;
          const gPass = item.mass_g * frac;
          if (mPass > 0) drainedContents.push({ ...item, moles: mPass, mass_g: gPass });
          const remM = item.moles - mPass;
          if (remM > 1e-6) remContents.push({ ...item, moles: remM, mass_g: item.mass_g - gPass });
        }

        nextEquipment[sep.id] = {
          ...currentSep,
          volume_ml: Math.round(newSepVol * 10) / 10,
          contents: remContents,
          stopcockOpen: closedAfterDrain ? false : currentSep.stopcockOpen,
          hasPhaseSeparation: newSepVol > (currentSep.organicLayerVolume_ml || 0),
        };

        if (closedAfterDrain) {
          soundEngine.click();
        }

        if (receiver) {
          const tgt = nextEquipment[receiver.id] || receiver;
          const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + drainedAqueous_ml);
          const mergedTgt = [...tgt.contents];
          for (const item of drainedContents) {
            const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
            if (ex) {
              ex.moles += item.moles;
              ex.mass_g += item.mass_g;
            } else {
              mergedTgt.push({ ...item });
            }
          }
          const tgtSim = runSimulationCycle(mergedTgt, newTgtVol, tgt.temperature_c, tgt.isOn || false);
          const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);

          nextEquipment[receiver.id] = {
            ...tgt,
            volume_ml: Math.round(newTgtVol * 10) / 10,
            mass_g: Math.round(tgtMass * 100) / 100,
            contents: tgtSim.updatedContents,
            ph: tgtSim.finalPh,
            liquidColorHex: tgtSim.finalLiquidColorHex,
          };
        }
      }
    }

    // 6. Process Measurement Probes Dip Coupling (pH meter, thermometer, stirring rod, pH paper)
    const probeTypes: EquipmentType[] = ['ph_meter', 'thermometer', 'stirring_rod', 'ph_paper'];
    const activeProbes = allEqList.filter(e => probeTypes.includes(e.type));
    const allContainersList = Object.values(nextEquipment).filter(e => e.isContainer);

    for (const probe of activeProbes) {
      const currentProbe = nextEquipment[probe.id] || probe;
      const dip = probeDipCoupling(currentProbe, allContainersList, dt);

      let probeChanged = false;
      const updatedProbe: EquipmentState = { ...currentProbe };

      if (currentProbe.isSubmerged !== dip.isSubmerged) {
        updatedProbe.isSubmerged = dip.isSubmerged;
        updatedProbe.submergedInVesselId = dip.submergedInVesselId;
        probeChanged = true;
      }

      if (currentProbe.type === 'ph_meter' && dip.measuredPh !== undefined) {
        if (Math.abs((currentProbe.ph ?? 7.0) - dip.measuredPh) > 0.02) {
          updatedProbe.ph = dip.measuredPh;
          probeChanged = true;
        }
      } else if (currentProbe.type === 'thermometer' && dip.measuredTemp_c !== undefined) {
        if (Math.abs((currentProbe.temperature_c ?? 25.0) - dip.measuredTemp_c) > 0.1) {
          updatedProbe.temperature_c = dip.measuredTemp_c;
          probeChanged = true;
        }
      } else if (currentProbe.type === 'ph_paper' && dip.isSubmerged && dip.measuredPh !== undefined) {
        const paperColor = getIndicatorColor('universal', dip.measuredPh);
        if (currentProbe.paperColorHex !== paperColor || currentProbe.ph !== dip.measuredPh) {
          updatedProbe.ph = dip.measuredPh;
          updatedProbe.paperColorHex = paperColor;
          probeChanged = true;
        }
      } else if (dip.triggerStir && dip.submergedInVesselId) {
        const targetVessel = nextEquipment[dip.submergedInVesselId];
        if (targetVessel && !targetVessel.isStirred) {
          nextEquipment[dip.submergedInVesselId] = {
            ...targetVessel,
            isStirred: true,
            stirringSpeed: 1.0,
          };
          hasChanged = true;
        }
      }

      if (probeChanged) {
        nextEquipment[probe.id] = updatedProbe;
        hasChanged = true;
      }
    }

    // 7. Process Headspace Pressure (PV=nRT), Cork Pop, Thermal Shock Glass Shatter, Condensation & Bumping
    for (const eq of Object.values(nextEquipment)) {
      if (!eq.isContainer) continue;
      const prevEq = currentEquipment[eq.id] || eq;
      const bp = aqueousBoilingPoint(eq.contents, eq.volume_ml, env.pressure_atm);
      const phys = stepVesselPressureAndDamage(eq, dt, prevEq.temperature_c, bp, env);

      if (phys.corkPopped) {
        soundEngine.playCorkPop();
        hasChanged = true;
      }
      if (phys.isShattered && !prevEq.isShattered) {
        reactionRuntime2D.triggerGlassShatter(eq);
        hasChanged = true;
        if (phys.spillCreated) newlyCreatedSpills.push(phys.spillCreated);
      }
      if (phys.bumpingIntensity > 0.3) {
        soundEngine.playBumpingSurge();
      }

      if (
        Math.abs((eq.internalPressure_atm ?? env.pressure_atm) - phys.internalPressure_atm) > 0.01 ||
        eq.isSealed !== phys.isSealed ||
        eq.isShattered !== phys.isShattered ||
        Math.abs((eq.wallCondensation ?? 0) - phys.wallCondensation) > 0.02
      ) {
        hasChanged = true;
        nextEquipment[eq.id] = {
          ...eq,
          internalPressure_atm: phys.internalPressure_atm,
          freeGasMoles: phys.freeGasMoles,
          isSealed: phys.isSealed,
          isShattered: phys.isShattered,
          wallCondensation: phys.wallCondensation,
          bumpingIntensity: phys.bumpingIntensity,
          superheat_c: phys.superheat_c,
          evaporativeStain: phys.evaporativeStain ?? eq.evaporativeStain,
          volume_ml: phys.isShattered ? 0 : eq.volume_ml,
          contents: phys.isShattered ? [] : eq.contents,
        };
      }
    }

    // 8. Step 60Hz Particle, 2D Color Spreading Field & Reaction Visual Controllers Runtime
    reactionRuntime2D.stepAll(Object.values(nextEquipment), dt, env);

    // 9. Process Sponge Wiping & Active Spill Puddle Chemistry on Workbench
    let currentSpills = [...get().spillPuddles, ...newlyCreatedSpills];
    const sponges = Object.values(nextEquipment).filter(e => e.type === 'sponge');
    if (sponges.length > 0 && currentSpills.length > 0) {
      const beforeCount = currentSpills.length;
      currentSpills = currentSpills.filter(sp => {
        const wiped = sponges.some(
          s => Math.hypot(s.x + s.width / 2 - sp.x, s.y + s.height / 2 - sp.y) < (sp.radius_px ?? 35) + 28
        );
        return !wiped;
      });
      if (currentSpills.length < beforeCount) {
        soundEngine.playSpongeWipe();
      }
    }
    const steppedSpills = stepSpillPuddles(currentSpills, dt);

    // 10. Evaluate Workbench PPE & Safety Rules
    const activeSafetyAlerts = evaluateWorkbenchSafety(Object.values(nextEquipment), get().ppe);

    const pourChanged = nextActivePour !== get().activePour || nextActivePourVfx !== get().activePourVfx;
    if (hasChanged || pourChanged || newlyCreatedSpills.length > 0 || steppedSpills.length !== get().spillPuddles.length) {
      set({
        equipment: nextEquipment,
        activePour: nextActivePour,
        activePourVfx: nextActivePourVfx,
        spillPuddles: steppedSpills,
        safetyAlerts: activeSafetyAlerts.length > 0 ? activeSafetyAlerts : get().safetyAlerts,
      });
      get().checkStepProgress();
    } else if (steppedSpills !== get().spillPuddles) {
      set({ spillPuddles: steppedSpills });
    }
  },

  selectExperiment: (experimentId) => {
    if (!experimentId) {
      set({ activeExperiment: null, activeMode: 'free', currentStepIndex: 0, stepCompleted: false });
      return;
    }
    const exp = EXPERIMENTS_CATALOG.find(e => e.id === experimentId);
    if (!exp) return;

    set({
      ...pushSnapshot(get()),
      spillPuddles: [],
      studentNotes: '',
      activeExperiment: exp,
      activeMode: 'guided',
      currentStepIndex: 0,
      stepCompleted: false,
      equipment: {},
      selectedEquipmentId: null,
      history: [
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'RESET',
          details_en: `Started Guided Experiment: ${exp.title_en}`,
          details_vi: `Bắt đầu bài thực hành có hướng dẫn: ${exp.title_vi}`,
        },
      ],
    });
  },

  nextStep: () => {
    const { activeExperiment, currentStepIndex } = get();
    if (!activeExperiment) return;
    if (currentStepIndex < activeExperiment.steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1, stepCompleted: false });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1, stepCompleted: false });
    }
  },

  checkStepProgress: () => {
    const { activeExperiment, currentStepIndex, equipment } = get();
    if (!activeExperiment) return false;

    const step = activeExperiment.steps[currentStepIndex];
    if (!step) return false;

    const criteria = step.validationCriteria;
    const vessels = Object.values(equipment);

    // Look for any vessel on workbench matching the criteria
    const matches = vessels.some(v => {
      if (criteria.targetEquipment && v.type !== criteria.targetEquipment) return false;

      if (criteria.requiredFormulas && criteria.requiredFormulas.length > 0) {
        const hasAll = criteria.requiredFormulas.every(req =>
          v.contents.some(c => c.formula.toUpperCase() === req.toUpperCase() && c.moles > 1e-6)
        );
        if (!hasAll) return false;
      }

      if (criteria.requiredReactionId && !get().history.some(h => h.vesselId === v.id && h.reactionId === criteria.requiredReactionId)) return false;
      if (criteria.absentFormulas?.some(formula => v.contents.some(c => c.formula === formula && c.moles > 1e-6))) return false;
      if (criteria.minMass_g !== undefined && v.mass_g < criteria.minMass_g) return false;
      if (criteria.minVolume_ml !== undefined && v.volume_ml < criteria.minVolume_ml) return false;
      if (criteria.maxVolume_ml !== undefined && v.volume_ml > criteria.maxVolume_ml) return false;
      if (criteria.targetPhMin !== undefined && v.ph < criteria.targetPhMin) return false;
      if (criteria.targetPhMax !== undefined && v.ph > criteria.targetPhMax) return false;
      if (criteria.minTemp_c !== undefined && v.temperature_c < criteria.minTemp_c) return false;
      if (criteria.mustHavePrecipitate && !v.hasPrecipitate) return false;
      if (criteria.precipitateFormula && v.precipitateSubstance?.toUpperCase() !== criteria.precipitateFormula.toUpperCase()) return false;
      if (criteria.mustHaveGas && !v.hasGas) return false;

      return true;
    });

    if (matches) {
      if (!get().stepCompleted) set({ stepCompleted: true });
      return true;
    }
    if (get().stepCompleted) set({stepCompleted: false});
    return false;
  },

  resetWorkbench: () => {
    set(state => ({
      ...pushSnapshot(state),
      spillPuddles: [],
      pipetteBuffer: null,
      activePour: null,
      activePourVfx: null,
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
    const current = captureSnapshot(get());

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
    const current = captureSnapshot(get());

    set({
      ...next,
      undoStack: [...undoStack, current],
      redoStack: newRedo,
    });
  },
}));
