/**
 * Central State Store for ChemDex 2D Virtual Laboratory
 * Pure Zustand store with complete history snapshots, multi-step simulation triggers,
 * and guided experiment progress tracking.
 */

import { create } from 'zustand';
import { EquipmentState, EquipmentType } from '../types/equipment';
import { SubstanceQuantity } from '../types/chemistry';
import { GuidedExperiment, LabLogEntry } from '../types/experiment';
import { findChemicalById } from '../data/chemicals';
import { EXPERIMENTS_CATALOG } from '../data/experiments';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { computeMolarMass } from '../chemistry/core/formula';
import { soundEngine } from '../services/soundEngine';
import { generateReactionFromGemini } from '../services/geminiService';
import { REACTION_DATABASE } from '../chemistry/reactions/reactionDatabase';
import { stepVesselThermal, burnerHeatToVessel, hotPlateHeatToVessel } from '../engine/simulationTick';

interface LabStoreState {
  equipment: Record<string, EquipmentState>;
  selectedEquipmentId: string | null;
  language: 'vi' | 'en';
  activeMode: 'free' | 'guided';
  activeExperiment: GuidedExperiment | null;
  currentStepIndex: number;
  stepCompleted: boolean;
  history: LabLogEntry[];
  undoStack: Record<string, EquipmentState>[];
  redoStack: Record<string, EquipmentState>[];
  
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

  // Actions
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
};

function pushSnapshot(state: LabStoreState): { undoStack: Record<string, EquipmentState>[]; redoStack: Record<string, EquipmentState>[] } {
  const currentSnapshot = JSON.parse(JSON.stringify(state.equipment));
  return {
    undoStack: [...state.undoStack.slice(-20), currentSnapshot],
    redoStack: [],
  };
}

export const useLabStore = create<LabStoreState>((set, get) => ({
  equipment: {},
  selectedEquipmentId: null,
  language: 'vi',
  activeMode: 'free',
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
  isMuted: false,
  activeSidebarTab: 'chemicals',
  draggedChemicalId: null,
  activePourVfx: null,

  setLanguage: (lang) => set({ language: lang }),
  setActiveMode: (mode) => set({ activeMode: mode }),
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
  toggleMute: () => {
    const nextMuted = !get().isMuted;
    soundEngine.setMuted(nextMuted);
    set({ isMuted: nextMuted });
  },
  setDraggedChemicalId: (id) => set({ draggedChemicalId: id }),


  triggerDirectPour: (sourceId: string, targetId: string) => {
    const src = get().equipment[sourceId];
    const tgt = get().equipment[targetId];
    if (!src || !tgt || src.volume_ml <= 0) return;

    const pourAmount = Math.min(src.volume_ml, 25);
    set({
      activePourVfx: {
        sourceId,
        targetId,
        startX: src.x + src.width / 2,
        startY: src.y + 15,
        endX: tgt.x + tgt.width / 2,
        endY: tgt.y + 35,
        liquidColorHex: src.liquidColorHex || '#38bdf8',
      },
    });
    soundEngine.pour(0.7);

    setTimeout(() => {
      get().transferMaterial(sourceId, targetId, pourAmount);
      set({ activePourVfx: null });
    }, 450);
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

      if (aiRes && aiRes.isReaction && aiRes.reactionDefinition) {
        const rx = aiRes.reactionDefinition;
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
              details_en: `[Gemini 3.5 Flash Lite] Predicted Reaction: ${rx.name_en} (${rx.equation})`,
              details_vi: `[Gemini 3.5 Flash Lite] Sinh phản ứng AI: ${rx.name_vi} (${rx.equation})`,
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
    const x = customX !== undefined ? customX : 100 + (existingCount % 5) * 160;
    const y = customY !== undefined ? customY : 220 + Math.floor(existingCount / 5) * 40;

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
      contents: [],
      volume_ml: 0,
      mass_g: spec.tare_g,
      tare_g: spec.tare_g,
      ph: 7.0,
      isOn: false,
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
    const volumeAdded = isLiquid ? amount_ml : 0;
    const density = chem.density_g_ml || 1.0;
    const massAdded = isLiquid ? volumeAdded * density : amount_g;
    
    // For aqueous solutions with stated molar concentration, moles = C * V_L
    const molesAdded = (chem.phase_STP === 'aqueous' && chem.defaultConcentration_M !== undefined)
      ? chem.defaultConcentration_M * (volumeAdded / 1000.0)
      : massAdded / chem.molarMass_g_mol;

    // Calculate new total volume
    const newVolume = Math.min(eq.capacity_ml, eq.volume_ml + volumeAdded);

    // Prepare updated contents list
    const newContents: SubstanceQuantity[] = [...eq.contents];
    const existing = newContents.find(c => c.formula.toUpperCase() === chem.formula.toUpperCase());

    if (existing) {
      existing.moles += molesAdded;
      existing.mass_g += massAdded;
      if (isLiquid && newVolume > 0) {
        existing.concentration_M = existing.moles / (newVolume / 1000.0);
      }
    } else {
      newContents.push({
        formula: chem.formula,
        moles: molesAdded,
        mass_g: massAdded,
        volume_ml: isLiquid ? volumeAdded : undefined,
        concentration_M: isLiquid && newVolume > 0 ? molesAdded / (newVolume / 1000.0) : undefined,
        state: isLiquid ? 'aq' : 's',
      });
    }

    // Run deterministic chemistry calculation engine
    const simResult = runSimulationCycle(newContents, newVolume, eq.temperature_c, eq.isOn || false);

    // Compute updated total mass = vessel tare + liquid/solids
    const totalContentMass = simResult.updatedContents.reduce((sum, c) => sum + c.mass_g, 0);
    const newTotalMass = (eq.tare_g || 0) + totalContentMass;

    // Trigger instant procedural audio feedback
    if (simResult.reactionsOccurred.length > 0) {
      if (simResult.hasGas) {
        soundEngine.fizz(1.3);
      } else {
        soundEngine.success();
      }
    } else {
      soundEngine.pour(0.4);
    }

    const rxLogs: LabLogEntry[] = simResult.reactionsOccurred.map(rx => ({
      id: `log_rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      actionType: 'REACTION' as const,
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
        [equipmentId]: {
          ...eq,
          volume_ml: Math.round(newVolume * 10) / 10,
          mass_g: Math.round(newTotalMass * 100) / 100,
          contents: simResult.updatedContents,
          temperature_c: simResult.finalTemperature_c,
          ph: simResult.finalPh,
          liquidColorHex: simResult.finalLiquidColorHex,
          hasPrecipitate: simResult.hasPrecipitate,
          precipitateColorHex: simResult.precipitateInfo?.colorHex,
          precipitateSubstance: simResult.precipitateInfo?.formula,
          precipitateMass_g: simResult.precipitateInfo?.mass_g,
          precipitateMorphology: simResult.precipitateInfo?.morphology,
          hasGas: simResult.hasGas,
          gasColorHex: '#ffffff',
          effervescenceSpeed: simResult.gasInfo?.effervescenceSpeed,
          isBoiling: simResult.isBoiling,
          hasPhaseSeparation: simResult.hasPhaseSeparation,
          organicLayerVolume_ml: simResult.organicLayerVolume_ml,
          organicLayerColorHex: simResult.organicLayerColorHex,
          hasFumes: simResult.hasFumes,
          fumeType: simResult.fumeType,
          fumeColorHex: simResult.fumeColorHex,
        },
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

    // Run reaction engine on target vessel
    const tgtSim = runSimulationCycle(mergedTgtContents, newTgtVol, tgt.temperature_c, tgt.isOn || false);
    const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);

    // Audio feedback
    if (tgtSim.reactionsOccurred.length > 0) {
      if (tgtSim.hasGas) {
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
        [targetId]: {
          ...tgt,
          volume_ml: Math.round(newTgtVol * 10) / 10,
          mass_g: Math.round(tgtMass * 100) / 100,
          contents: tgtSim.updatedContents,
          temperature_c: tgtSim.finalTemperature_c,
          ph: tgtSim.finalPh,
          liquidColorHex: tgtSim.finalLiquidColorHex,
          hasPrecipitate: tgtSim.hasPrecipitate,
          precipitateColorHex: tgtSim.precipitateInfo?.colorHex,
          precipitateSubstance: tgtSim.precipitateInfo?.formula,
          precipitateMass_g: tgtSim.precipitateInfo?.mass_g,
          precipitateMorphology: tgtSim.precipitateInfo?.morphology,
          hasGas: tgtSim.hasGas,
          effervescenceSpeed: tgtSim.gasInfo?.effervescenceSpeed,
          isBoiling: tgtSim.isBoiling,
          hasPhaseSeparation: tgtSim.hasPhaseSeparation,
          organicLayerVolume_ml: tgtSim.organicLayerVolume_ml,
          organicLayerColorHex: tgtSim.organicLayerColorHex,
          hasFumes: tgtSim.hasFumes,
          fumeType: tgtSim.fumeType,
          fumeColorHex: tgtSim.fumeColorHex,
        },
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
    const burette = get().equipment[id];
    if (!burette || burette.type !== 'burette') return;

    const nextOpen = !burette.stopcockOpen;
    if (nextOpen) soundEngine.drip();

    // Find receiving vessel placed underneath burette
    const allEq = Object.values(get().equipment);
    const target = allEq.find(
      e => e.id !== id && e.isContainer && Math.abs(e.x - burette.x) < 80 && e.y > burette.y
    );

    if (target && burette.volume_ml > 0) {
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

  tickSimulation: (dt: number) => {
    const currentEquipment = get().equipment;
    if (Object.keys(currentEquipment).length === 0) return;

    let hasChanged = false;
    const nextEquipment: Record<string, EquipmentState> = { ...currentEquipment };

    const allEqList = Object.values(currentEquipment);
    const activeBurners = allEqList.filter(e => e.type === 'bunsen_burner' && e.isOn);
    const activeHotPlates = allEqList.filter(e => e.type === 'hot_plate' && e.isOn);
    const openBurettes = allEqList.filter(e => e.type === 'burette' && e.stopcockOpen && e.volume_ml > 0);

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
          if (remMoles > 1e-6) {
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

          const tgtSim = runSimulationCycle(mergedTgt, newTgtVol, tgtEq.temperature_c, tgtEq.isOn || false);
          const tgtMass = (tgtEq.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);

          nextEquipment[target.id] = {
            ...tgtEq,
            volume_ml: Math.round(newTgtVol * 10) / 10,
            mass_g: Math.round(tgtMass * 100) / 100,
            contents: tgtSim.updatedContents,
            temperature_c: tgtSim.finalTemperature_c,
            ph: tgtSim.finalPh,
            liquidColorHex: tgtSim.finalLiquidColorHex,
            hasPrecipitate: tgtSim.hasPrecipitate,
            precipitateColorHex: tgtSim.precipitateInfo?.colorHex,
            precipitateSubstance: tgtSim.precipitateInfo?.formula,
            precipitateMass_g: tgtSim.precipitateInfo?.mass_g,
            precipitateMorphology: tgtSim.precipitateInfo?.morphology,
            hasGas: tgtSim.hasGas,
            effervescenceSpeed: tgtSim.gasInfo?.effervescenceSpeed,
            isBoiling: tgtSim.isBoiling,
            hasPhaseSeparation: tgtSim.hasPhaseSeparation,
            organicLayerVolume_ml: tgtSim.organicLayerVolume_ml,
            organicLayerColorHex: tgtSim.organicLayerColorHex,
            hasFumes: tgtSim.hasFumes,
            fumeType: tgtSim.fumeType,
            fumeColorHex: tgtSim.fumeColorHex,
          };
        }
      }
    }

    // 2. Process thermal physics: continuous Heating & Cooling
    for (const eq of allEqList) {
      if (!eq.isContainer) continue;
      const currentEq = nextEquipment[eq.id] || eq;

      let heatPower_W = 0;
      for (const burner of activeBurners) {
        heatPower_W += burnerHeatToVessel(burner, currentEq);
      }
      for (const plate of activeHotPlates) {
        heatPower_W += hotPlateHeatToVessel(plate, currentEq);
      }

      if (heatPower_W > 0 || Math.abs(currentEq.temperature_c - 25.0) > 0.3) {
        const therm = stepVesselThermal(currentEq, dt, heatPower_W);
        const tempDiff = Math.abs(therm.temperature_c - currentEq.temperature_c);
        const boilChanged = therm.isBoiling !== currentEq.isBoiling;
        const evap = therm.evaporatedStep_g > 0;

        if (tempDiff > 0.1 || boilChanged || evap) {
          hasChanged = true;
          const sim = runSimulationCycle(therm.contents, therm.volume_ml, therm.temperature_c, currentEq.isOn || heatPower_W > 10);
          nextEquipment[eq.id] = {
            ...currentEq,
            temperature_c: Math.round(therm.temperature_c * 10) / 10,
            volume_ml: Math.round(therm.volume_ml * 10) / 10,
            mass_g: Math.round(therm.mass_g * 100) / 100,
            contents: sim.updatedContents,
            ph: sim.finalPh,
            liquidColorHex: sim.finalLiquidColorHex,
            isBoiling: therm.isBoiling,
            boilingIntensity: therm.boilingIntensity,
            hasPrecipitate: sim.hasPrecipitate,
            precipitateColorHex: sim.precipitateInfo?.colorHex,
            precipitateSubstance: sim.precipitateInfo?.formula,
            precipitateMass_g: sim.precipitateInfo?.mass_g,
            precipitateMorphology: sim.precipitateInfo?.morphology,
            hasGas: sim.hasGas,
            effervescenceSpeed: sim.gasInfo?.effervescenceSpeed,
            hasPhaseSeparation: sim.hasPhaseSeparation,
            organicLayerVolume_ml: sim.organicLayerVolume_ml,
            organicLayerColorHex: sim.organicLayerColorHex,
            hasFumes: sim.hasFumes || (therm.isBoiling ? true : false),
            fumeType: sim.fumeType || (therm.isBoiling ? 'steam' : undefined),
            fumeColorHex: sim.fumeColorHex || '#ffffff',
          };
        }
      }
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

    if (hasChanged) {
      set({ equipment: nextEquipment });
      get().checkStepProgress();
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
      set({ stepCompleted: true });
      return true;
    }
    return false;
  },

  resetWorkbench: () => {
    set(state => ({
      ...pushSnapshot(state),
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
    const { undoStack, equipment, redoStack } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const current = JSON.parse(JSON.stringify(equipment));

    set({
      equipment: previous,
      undoStack: newUndo,
      redoStack: [current, ...redoStack],
      selectedEquipmentId: null,
    });
  },

  redo: () => {
    const { redoStack, equipment, undoStack } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    const current = JSON.parse(JSON.stringify(equipment));

    set({
      equipment: next,
      undoStack: [...undoStack, current],
      redoStack: newRedo,
      selectedEquipmentId: null,
    });
  },
}));
