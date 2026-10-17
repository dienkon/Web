import { create } from 'zustand';
import { MixResult } from '../shared/schemas';
import { CHEMICAL_DATABASE, findChemical, isImmiscibleOrganic, getSolidMorphology } from '../data/chemicals';
import { VesselState, BurnerState, BuretteState, TitrationPoint, VesselType, SpillState, BurnerFlameState, SolidMorphology } from '../types/chemistry';
import { evaluateLocalChemistry, findPendingReaction, initReactionCache, executeMultiStepReactions, chemicalFormulaMatches } from '../engine/chemistryEngine';
import { checkSafetyViolations } from '../engine/safetyEngine';
import { 
  loadPersistedLabState, 
  debounceSaveLocalState, 
  pushHistorySnapshot, 
  stepUndo, 
  stepRedo,
  canUndo as checkCanUndo,
  canRedo as checkCanRedo
} from './persistence';
import { vfxBus } from '../vfx/bus';
import { getReactionVfxRecipe } from '../vfx/recipes/reactionVfx';
import { ExperimentDifficultyMode, ExamReportCard, experimentEngine } from '../engine/experimentEngine';
import { labSound } from '../utils/audio';
import { ppeService } from '../safety/Ppe';
import { shardManager } from '../damage/Shards';
import { applyProgramToLedger } from '../engine/ledger';
import { resolveReactionProgram } from '../vfx/programs/resolver';
import { ReactionProgram } from '../shared/programSchema';
import { decantLiquid } from '../engine/decantTransfer';
import { releaseShatteredInventory } from '../engine/shatterInventory';
import { stepAlcoholBurner, allocateBurnerHeat, burnerIntensity } from '../engine/burnerEnergy';
import { createFlameEmission, flameEmissionExpired } from '../engine/flameEmission';
import { createStudioSample, planStudioProgram } from '../engine/studioProgram';
import { createStudioMorphologySample, PRECIPITATE_MORPHOLOGIES } from '../engine/studioMorphology';
import { getProgramById } from '../vfx/programs/library';
import { LESSON_PROGRAM_IDS } from '../lesson/programCompiler';
import { collectSpillWaste } from '../engine/wasteInventory';
import { resolveMixture } from '../engine/resolveMixture';
import { dispenseAliquot } from '../handling/aliquot';
import { reactAliquotMixture } from '../engine/aliquotReaction';
import { projectEscapedGas } from '../engine/gasInventory';
import { stepFoamInventory } from '../engine/foamInventory';
import { createIceWaterSample } from '../engine/waterPhase';
import { partitionLeadIodide } from '../engine/leadIodidePhase';
import { partitionSodiumChloride } from '../engine/sodiumChloridePhase';
import { projectAqueousSolution } from '../engine/aqueousProjection';
import { stepVesselThermal, sealedGasPressure } from '../engine/thermalState';
import { stepHotPlate, hotPlateSetpoint, PLATE_TOP_Y, HOT_PLATE_RECEIVERS } from '../engine/hotPlateEnergy';
import { transferWaterCondensate } from '../engine/condensationTransfer';
import { applyProgramWithThermalSinks } from '../engine/thermalLedger';
import { materializePresetInventory } from '../engine/presetInventory';
import { stepFunnelFlow, selectFunnelReceiver, recoverFilterCake, solidContent } from '../engine/funnelFlow';

export type Language = 'en' | 'vi';
export type SubstanceType = 'liquid' | 'solid' | 'gas';
export type LabMode = 'free' | 'guided' | 'strict';
export type CameraPreset = 'perspective' | 'top' | 'front' | 'side';
export type { SolidMorphology };

export const CHEMICALS = CHEMICAL_DATABASE;
export const getChemical = (formula: string) => findChemical(formula);
export { getSolidMorphology };

export function interpolateColorHex(hexA?: string, hexB?: string, t = 0): string {
  if (!hexA && !hexB) return '#38bdf8';
  if (!hexA) return hexB || '#38bdf8';
  if (!hexB) return hexA || '#38bdf8';
  const clampedT = Math.max(0, Math.min(1, t));
  const parseHex = (h: string) => {
    const clean = h.replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };
  try {
    const [r1, g1, b1] = parseHex(hexA);
    const [r2, g2, b2] = parseHex(hexB);
    const r = Math.round(r1 + (r2 - r1) * clampedT);
    const g = Math.round(g1 + (g2 - g1) * clampedT);
    const b = Math.round(b1 + (b2 - b1) * clampedT);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hexB || hexA || '#38bdf8';
  }
}

// Default initial state
const defaultVessels: Record<string, VesselState> = {
  'beaker_1': { 
    id: 'beaker_1', 
    name: 'Beaker 1 (100mL)', 
    type: 'beaker', 
    capacity_ml: 100,
    position: [-2, -0.135, 0], 
    rotationY: 0,
    isLocked: false,
    substances: [], 
    contents: [],
    volume: 0, 
    volume_ml: 0,
    mass_g: 0,
    density_g_ml: 1.0,
    temperature_c: 25,
    ph: 7.0,
    hasPrecipitate: false, 
    isBoiling: false, 
    hasGas: false,
    foam_ml: 0
  },
  'flask_1': { 
    id: 'flask_1', 
    name: 'Flask 1 (250mL)', 
    type: 'flask', 
    capacity_ml: 250,
    position: [2, -0.135, 0], 
    rotationY: 0,
    isLocked: false,
    substances: [], 
    contents: [],
    volume: 0, 
    volume_ml: 0,
    mass_g: 0,
    density_g_ml: 1.0,
    temperature_c: 25,
    ph: 7.0,
    hasPrecipitate: false, 
    isBoiling: false, 
    hasGas: false,
    foam_ml: 0
  },
  'test_tube_1': {
    id: 'test_tube_1',
    name: 'Test Tube 1 (50mL)',
    type: 'test_tube',
    capacity_ml: 50,
    position: [0, -0.135, 0.3],
    rotationY: 0,
    isLocked: false,
    substances: [],
    contents: [],
    volume: 0,
    volume_ml: 0,
    mass_g: 0,
    density_g_ml: 1.0,
    temperature_c: 25,
    ph: 7.0,
    hasPrecipitate: false,
    isBoiling: false,
    hasGas: false,
    foam_ml: 0
  },
};

export interface ActiveKineticsState {
  vesselId: string;
  reactionId?: string;
  startTime: number;
  duration: number;
  progress: number; // 0 to 1
  reactionName: string;
  equation: string;
  initialLiquidColor: string;
  targetLiquidColor: string;
  hasGas: boolean;
  gasColor?: string;
  hasPrecipitate: boolean;
  precipitateColor?: string;
  precipitateSubstance?: string;
  precipitateMorphology?: string;
  dissolvingReactants: string[];
  targetTemp: number;
  timeWarp?: {
    physical_s: number;
    note_vi?: string;
    note_en?: string;
  };
  program?: ReactionProgram;
  initialVesselBaseline?: VesselState;
  targetPrecipitateMass_g?: number;
}

export function extractDissolvingReactants(substances: string[], activeReactants?: string[]): string[] {
  if (!activeReactants || activeReactants.length === 0) {
    return [];
  }
  return substances.filter(s => {
    const chem = getChemical(s);
    if (!chem || chem.type !== 'solid') return false;
    return activeReactants.some(r => chemicalFormulaMatches(s, r));
  });
}

export interface PendingReactionState {
  vesselId: string;
  equation: string;
  requiredCondition: string;
  minTemp_c: number;
  reactants: string[];
}

export interface ToastInfo {
  id: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
}

export type GameRunState = 'RUNNING' | 'PAUSED';

export interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;

  gameRunState: GameRunState;
  setGameRunState: (state: GameRunState) => void;

  globalWarning: string | null;
  setGlobalWarning: (warning: string | null) => void;

  toast: ToastInfo | null;
  showToast: (message: string, type?: 'info' | 'warning' | 'success') => void;
  hideToast: () => void;

  isPourTiltLocked: boolean;
  setPourTiltLocked: (locked: boolean) => void;

  // Lab Mode & Curriculum
  labMode: LabMode;
  setLabMode: (mode: LabMode) => void;
  activeExperimentId: string | null;
  setActiveExperimentId: (id: string | null) => void;
  activeStepIndex: number;
  setActiveStepIndex: (idx: number) => void;
  setupExperimentPreset: (experimentId: string) => void;
  experimentDifficulty: ExperimentDifficultyMode;
  setExperimentDifficulty: (mode: ExperimentDifficultyMode) => void;
  toolContamination: Record<string, string | null>;
  touchToolChemical: (tool: 'pipette' | 'stirring_rod' | 'spatula', chemical: string) => { isCrossContaminated: boolean };
  cleanTool: (tool: 'pipette' | 'stirring_rod' | 'spatula') => void;
  examReport: ExamReportCard | null;
  setExamReport: (report: ExamReportCard | null) => void;

  // Presentation & Camera & Educational Lab Report
  isLabReportOpen: boolean;
  setLabReportOpen: (open: boolean) => void;
  isPresentationMode: boolean;
  setPresentationMode: (val: boolean) => void;
  isSimulationPaused: boolean;
  setSimulationPaused: (val: boolean) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;
  cameraFocusPosition: [number, number, number] | null;
  setCameraFocusPosition: (pos: [number, number, number] | null) => void;

  cameraPanMode: boolean;
  setCameraPanMode: (active: boolean) => void;

  isScreenLocked: boolean;
  toggleScreenLock: () => void;
  setScreenLocked: (locked: boolean) => void;

  isPouring: boolean;
  setIsPouring: (isPouring: boolean) => void;

  stirringVesselId: string | null;
  setStirringVesselId: (id: string | null) => void;

  activeKinetics: Record<string, ActiveKineticsState>;
  pendingReactions: Record<string, PendingReactionState>;
  dissolvingSubstances: Record<string, Record<string, number>>; // vesselId -> substance -> fraction (0..1)
  tickSimulation: (dt: number) => void;
  tick: (dt: number) => void;

  // Workbench Grid & Tools
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  activeTool: 'none' | 'thermometer' | 'ph_meter' | 'balance' | 'pipette' | 'stirring_rod' | 'spatula' | 'sponge';
  setActiveTool: (tool: 'none' | 'thermometer' | 'ph_meter' | 'balance' | 'pipette' | 'stirring_rod' | 'spatula' | 'sponge') => void;
  spatulaState: {
    chemical: string | null;
    mass_g: number;
    color: string;
  };
  setSpatulaScoop: (chemical: string | null, mass_g?: number, color?: string) => void;
  settleVesselMixture: (id: string) => Promise<void>;
  transferLiquidContinuous: (fromId: string, toId: string | null, delta_ml: number, dropPos?: [number, number, number]) => void;

  // Environmental Mass Conservation & Workbench Spills
  spills: Record<string, SpillState>;
  wasteMass_g: number;
  wasteContents: VesselState['contents'];
  addSpill: (pos: [number, number, number], volume_ml: number, substances: string[], color: string, sourceName?: string, actualMass_g?: number, contents?: VesselState['contents']) => void;
  cleanSpills: () => void;
  wipeSpillAt: (pos: [number, number, number], radius?: number) => void;

  // Vessels
  vessels: Record<string, VesselState>;
  vesselIds: string[];
  setVesselState: (id: string, state: Partial<VesselState>) => void;
  addVessel: (type: VesselType, name?: string) => void;
  duplicateVessel: (id: string) => void;
  removeVessel: (id: string) => void;
  toggleLockVessel: (id: string) => void;
  rotateVessel: (id: string, angleDeltaRad?: number) => void;
  focusVessel: (id: string) => void;
  shatterVessel: (id: string, reason?: string) => void;
  replaceShatteredVessel: (id: string) => void;
  grindMortar: (id: string) => void;
  toggleStopcock: (id: string) => void;
  cleanVesselStain: (id: string) => void;
  squirtWashBottle: (washBottleId: string, targetVesselId?: string) => void;
  invertVolumetricFlask: (id: string) => void;
  placeTestTubeInRack: (rackId: string, tubeId: string) => void;
  removeTestTubeFromRack: (rackId: string, tubeId: string) => void;
  toggleGripWithTongs: (tongsId: string, targetVesselId?: string) => void;
  toggleCondenserWater: (id: string) => void;
  recoverFilterResidue: (sourceId: string, receiverId: string) => void;
  sealVessel: (id: string) => void;

  // Burners
  burners: Record<string, BurnerState>;
  burnerIds: string[];
  addBurner: () => void;
  removeBurner: (id: string) => void;
  updateBurnerPosition: (id: string, pos: [number, number, number]) => void;
  toggleBurner: (id: string) => void;
  setBurnerIntensity: (id: string, intensity: number) => void;
  startFlameTest: (burnerId: string, element: string, duration_s?: number) => boolean;
  prepareStudioProgram: (programId: string, variant?: 'oxygen_foam') => string | null;
  prepareStudioIceSample: () => string | null;
  prepareStudioMorphology: (type: string) => string | null;
  setHotPlate: (id: string, options: { isOn?: boolean; setPoint_c?: number }) => boolean;
  placeOnHotPlate: (vesselId: string, plateId: string) => boolean;
  runStudioProgram: (vesselId: string) => boolean;
  igniteStudioSample: (vesselId: string) => boolean;
  seekStudioProgram: (vesselId: string, progress: number) => boolean;

  // Burette & Titration
  burette: BuretteState;
  updateBurette: (updates: Partial<BuretteState>) => void;
  toggleBuretteStopcock: () => void;
  dispenseBuretteDrop: (targetVesselId: string) => void;
  titrationHistory: TitrationPoint[];
  clearTitrationHistory: () => void;

  // Sidebars
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
  openVesselInfo: (id: string) => void;

  // Sound
  soundEnabled: boolean;
  toggleSound: () => void;

  // Dispenser / Dosage Modal
  pendingDispense: { chemical: string; targetVesselId: string } | null;
  setPendingDispense: (val: { chemical: string; targetVesselId: string } | null) => void;

  // Litmus & Stirring Tools
  activeLitmusVesselId: string | null;
  setActiveLitmusVesselId: (id: string | null) => void;
  stirVessel: (id: string) => void;

  // Interactive Drag & Pour
  isDraggingChemical: string | null;
  setIsDraggingChemical: (chem: string | null) => void;
  pouringChemical: { chemical: string; targetId: string; type: SubstanceType; amount?: number } | null;
  triggerPour: (chemical: string, targetId: string, amount?: number) => void;
  clearPour: () => void;

  vesselPourAnimation: { 
    fromId: string; 
    toId: string; 
    amount_ml: number;
    initialFromVolume_ml: number;
    initialToVolume_ml: number;
  } | null;
  startVesselPourAnimation: (fromId: string, toId: string) => void;
  updatePourVolumeProgress: (fromId: string, toId: string, progress: number) => void;
  finishVesselPourAnimation: () => Promise<void>;

  selectedVesselId: string | null;
  setSelectedVesselId: (id: string | null) => void;

  hoveredVesselId: string | null;
  setHoveredVesselId: (id: string | null) => void;

  nearestPourTargetId: string | null;
  setNearestPourTargetId: (id: string | null) => void;

  draggingVesselId: string | null;
  setDraggingVesselId: (id: string | null) => void;
  updateVesselPosition: (id: string, pos: [number, number, number]) => void;

  moveMode: boolean;
  setMoveMode: (active: boolean) => void;

  // History / Undo / Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Mix Result & Simulation
  lastMixResult: MixResult | null;
  isMixing: boolean;
  mixError: string | null;

  timeScale: number;
  setTimeScale: (scale: number) => void;

  mixSubstances: (targetId: string, newChemical: string, addedVolume_ml?: number) => Promise<void>;
  pourVessel: (fromId: string, toId: string, customAmount_ml?: number) => Promise<void>;
  resetWorkbench: () => void;
}

// Initialize cache and try loading local saved state
initReactionCache();
const persisted = loadPersistedLabState();

// Preserve saved assembly heights so funnels remain aligned with their receivers.
const sanitizedVessels: Record<string, VesselState> = {};
const rawVessels = persisted?.vessels || defaultVessels;
for (const [k, v] of Object.entries(rawVessels)) {
  const density = v.density_g_ml || 1.0;
  sanitizedVessels[k] = {
    ...v,
    density_g_ml: density,
    mass_g: v.mass_g !== undefined ? v.mass_g : Math.round((v.volume_ml || 0) * density * 100) / 100,
    foam_ml: v.foam_ml || 0,
    boilingIntensity: v.boilingIntensity || 0,
    position: Array.isArray(v.position) && v.position.length === 3 && v.position.every(Number.isFinite)
      ? [...v.position] : [0, -0.135, 0]
  };
}

const defaultBurners: Record<string, BurnerState> = {
  'burner_1': {
    id: 'burner_1',
    position: [0, -0.975, 1.2],
    isOn: false,
    intensity: 3,
    flameState: 'UNLIT',
    fuelLevel_ml: 120,
    maxFuel_ml: 150,
    heatRadius: 1.8,
    tempOutput_c: 25
  }
};

const sanitizedBurners: Record<string, BurnerState> = {};
const rawBurners = persisted?.burners && Object.keys(persisted.burners).length > 0 ? persisted.burners : defaultBurners;
for (const [k, b] of Object.entries(rawBurners)) {
  const intensity = b.intensity || 3;
  sanitizedBurners[k] = {
    ...b,
    flameEmission: undefined, // Monotonic timestamps are local to the current page session.
    intensity,
    flameState: b.flameState || (b.isOn ? (intensity === 1 ? 'LOW_FLAME' : (intensity >= 4 ? 'HIGH_FLAME' : 'MEDIUM_FLAME')) : 'UNLIT'),
    fuelLevel_ml: b.fuelLevel_ml !== undefined ? b.fuelLevel_ml : 120,
    maxFuel_ml: 150,
    heatRadius: 1.8,
    tempOutput_c: b.tempOutput_c || (b.isOn ? 320 + intensity * 45 : 25),
    position: [b.position[0], -0.975, b.position[2]]
  };
}

let _lastSimulationCommitTime = 0;
let _pendingSimulationDt = 0;

export const useAppStore = create<AppState>((set, get) => {
  // Push initial snapshot into history
  setTimeout(() => {
    const s = get();
    pushHistorySnapshot('RESET', s.vessels, s.burners, 'Initial laboratory setup', 'Khởi tạo phòng thí nghiệm ban đầu');
    set({ canUndo: checkCanUndo(), canRedo: checkCanRedo() });
  }, 100);

  return {
    language: 'vi',
    setLanguage: (lang) => set({ language: lang }),

    gameRunState: 'RUNNING',
    setGameRunState: (state) => set({ gameRunState: state }),

    globalWarning: null,
    setGlobalWarning: (warning) => {
      if (warning) {
        get().showToast(warning, 'warning');
      } else {
        set({ globalWarning: null });
      }
    },

    toast: null,
    showToast: (message, type = 'info') => {
      const id = `${Date.now()}_${Math.random()}`;
      set({ toast: { id, message, type }, globalWarning: null });
      setTimeout(() => {
        const cur = get().toast;
        if (cur && cur.id === id) {
          set({ toast: null });
        }
      }, 3500);
    },
    hideToast: () => set({ toast: null }),

    isPourTiltLocked: false,
    setPourTiltLocked: (locked) => set({ isPourTiltLocked: locked }),

    labMode: 'free',
    setLabMode: (mode) => set({ labMode: mode }),
    activeExperimentId: null,
    setActiveExperimentId: (id) => set({ activeExperimentId: id, activeStepIndex: 0 }),
    activeStepIndex: 0,
    setActiveStepIndex: (idx) => set({ activeStepIndex: idx }),
    experimentDifficulty: 'guided',
    setExperimentDifficulty: (mode) => set({ experimentDifficulty: mode }),
    toolContamination: { pipette: null, stirring_rod: null, spatula: null },
    touchToolChemical: (tool, chemical) => {
      const res = experimentEngine.touchChemical(tool, chemical);
      set({ toolContamination: experimentEngine.getContaminatedTools() });
      return { isCrossContaminated: res.isCrossContaminated };
    },
    cleanTool: (tool) => {
      experimentEngine.cleanTool(tool);
      set({ toolContamination: experimentEngine.getContaminatedTools() });
    },
    examReport: null,
    setExamReport: (report) => set({ examReport: report }),
    setupExperimentPreset: (experimentId: string) => {
      const vessels: Record<string, VesselState> = {};
      if (experimentId === 'acid_base_titration') {
        vessels['flask_1'] = {
          id: 'flask_1',
          name: 'Flask 1 (HCl)',
          type: 'flask',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['HCl (dil)'],
          contents: [{ formula: 'HCl', moles: 0.02, mass_g: 0.73 }],
          volume_ml: 20,
          volume: 20 / 250,
          mass_g: 20,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 1.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (NaOH)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['NaOH'],
          contents: [{ formula: 'NaOH', moles: 0.05, mass_g: 2.0 }],
          volume_ml: 50,
          volume: 50 / 250,
          mass_g: 50,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 13.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'golden_rain_synthesis') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (Pb(NO3)2)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['Pb(NO3)2'],
          contents: [{ formula: 'Pb(NO3)2', moles: 0.00302, mass_g: 1.0 }],
          volume_ml: 40,
          volume: 40 / 250,
          mass_g: 40,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f1f5f9',
          temperature_c: 25,
          ph: 5.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (KI)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['KI'],
          contents: [{ formula: 'KI', moles: 0.00602, mass_g: 1.0 }],
          volume_ml: 40,
          volume: 40 / 250,
          mass_g: 40,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#fef08a',
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'co2_gas_evolution' || experimentId === 'co2_gas_production') {
        vessels['flask_1'] = {
          id: 'flask_1',
          name: 'Flask 1 (CaCO3)',
          type: 'flask',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['CaCO3'],
          contents: [{ formula: 'CaCO3', moles: 0.0999, mass_g: 10.0 }],
          volume_ml: 0,
          volume: 0,
          mass_g: 10,
          density_g_ml: 2.71,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: true,
          precipitateColor: '#ffffff',
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (HCl)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['HCl (dil)'],
          contents: [{ formula: 'HCl', moles: 0.0494, mass_g: 1.8 }],
          volume_ml: 40,
          volume: 40 / 250,
          mass_g: 40,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 1.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'iron_copper_redox' || experimentId === 'single_displacement_copper') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (CuSO4)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['CuSO4'],
          contents: [{ formula: 'CuSO4', moles: 0.04, mass_g: 6.4 }],
          volume_ml: 50,
          volume: 50 / 250,
          mass_g: 50,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#0284c7',
          temperature_c: 25,
          ph: 4.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (Fe metal)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['Fe'],
          contents: [{ formula: 'Fe', moles: 0.1, mass_g: 5.6 }],
          volume_ml: 0,
          volume: 0,
          mass_g: 5.6,
          density_g_ml: 7.87,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: true,
          precipitateColor: '#475569',
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'mass_conservation_bacl2_na2so4') {
        // Preset: Beaker 1 on the analytical balance pan, Beaker 2 next to it
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (BaCl2 on Balance)',
          type: 'beaker',
          capacity_ml: 100,
          position: [7.5, -0.02, -2.5],
          rotationY: 0,
          isLocked: false,
          substances: ['BaCl2'],
          contents: [{ formula: 'BaCl2', moles: 0.005, mass_g: 1.04 }],
          volume_ml: 25,
          volume: 25 / 100,
          mass_g: 25.8,
          density_g_ml: 1.03,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 6.8,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (Na2SO4)',
          type: 'beaker',
          capacity_ml: 100,
          position: [5.2, -0.135, -2.5],
          rotationY: 0,
          isLocked: false,
          substances: ['Na2SO4'],
          contents: [{ formula: 'Na2SO4', moles: 0.005, mass_g: 0.71 }],
          volume_ml: 25,
          volume: 25 / 100,
          mass_g: 25.8,
          density_g_ml: 1.03,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'catalytic_oxygen_prep') {
        vessels['flask_1'] = {
          id: 'flask_1',
          name: 'Flask 1 (H2O2)',
          type: 'flask',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['H2O2'],
          contents: [{ formula: 'H2O2', moles: 0.08, mass_g: 2.7 }],
          volume_ml: 30,
          volume: 30 / 250,
          mass_g: 30,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#e2f1fc',
          temperature_c: 25,
          ph: 6.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (MnO2 Catalyst)',
          type: 'beaker',
          capacity_ml: 100,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['MnO2'],
          contents: [{ formula: 'MnO2', moles: 0.02, mass_g: 1.74 }],
          volume_ml: 0,
          volume: 0,
          mass_g: 1.74,
          density_g_ml: 5.0,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: true,
          precipitateColor: '#1e293b',
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'thermal_decomp_cuoh2') {
        // Pre-formed Cu(OH)2 in beaker placed on the burner gauze
        const bPos = get().burners['burner_1']?.position || [-3.0, -0.975, 0];
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker (Cu(OH)2 on Burner)',
          type: 'beaker',
          capacity_ml: 100,
          position: [bPos[0], bPos[1] + 2.49, bPos[2]],
          rotationY: 0,
          isLocked: false,
          substances: ['CuSO4', 'NaOH'],
          contents: [{ formula: 'Cu(OH)2', moles: 0.03, mass_g: 2.9 }],
          volume_ml: 35,
          volume: 35 / 100,
          mass_g: 35,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#bae6fd',
          temperature_c: 25,
          ph: 8.5,
          hasPrecipitate: true,
          precipitateColor: '#38bdf8',
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'redox_gas_cu_hno3') {
        vessels['flask_1'] = {
          id: 'flask_1',
          name: 'Flask 1 (Copper turnings)',
          type: 'flask',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['Cu'],
          contents: [{ formula: 'Cu', moles: 0.05, mass_g: 3.2 }],
          volume_ml: 0,
          volume: 0,
          mass_g: 3.2,
          density_g_ml: 8.96,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: true,
          precipitateColor: '#b45309',
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (HNO3 conc)',
          type: 'beaker',
          capacity_ml: 100,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['HNO3 (conc)'],
          contents: [{ formula: 'HNO3 (conc)', moles: 0.3804, mass_g: 25 * 1.41 * 0.68 }],
          volume_ml: 25,
          volume: 25 / 100,
          mass_g: 25 * 1.41,
          density_g_ml: 1.4,
          foam_ml: 0,
          liquidColor: '#fecaca',
          temperature_c: 25,
          ph: 0.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'alkali_metal_water_na') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (H2O + Indicator)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['H2O', 'Phenolphthalein'],
          contents: [{ formula: 'H2O', moles: 2.775, mass_g: 50 - 0.00031832 }, { formula: 'Phenolphthalein', phase: 'aq', moles: 0.000001, mass_g: 0.00031832 }],
          volume_ml: 50,
          volume: 50 / 250,
          mass_g: 50,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#e2f1fc',
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (Sodium Na)',
          type: 'beaker',
          capacity_ml: 100,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['Na'],
          contents: [{ formula: 'Na', moles: 0.0435, mass_g: 1.0 }],
          volume_ml: 0,
          volume: 0,
          mass_g: 1.0,
          density_g_ml: 0.97,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: true,
          precipitateColor: '#cbd5e1',
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'acid_safety_dilution') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (Distilled Water)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['H2O'],
          contents: [{ formula: 'H2O', moles: 2.775, mass_g: 50.0 }],
          volume_ml: 50,
          volume: 50 / 250,
          mass_g: 50,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#e2f1fc',
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (H2SO4 conc)',
          type: 'beaker',
          capacity_ml: 100,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['H2SO4 (conc)'],
          contents: [{ formula: 'H2SO4 (conc)', moles: 0.3677, mass_g: 36.8 * 0.98 }],
          volume_ml: 20,
          volume: 20 / 100,
          mass_g: 36.8,
          density_g_ml: 1.84,
          foam_ml: 0,
          liquidColor: '#ef4444',
          temperature_c: 25,
          ph: 0.1,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'agcl_curdy_precipitation') {
        vessels['cylinder_1'] = {
          id: 'cylinder_1',
          name: 'Graduated Cylinder (AgNO3)',
          type: 'cylinder',
          capacity_ml: 100,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['AgNO3'],
          contents: [{ formula: 'AgNO3', moles: 0.025, mass_g: 4.25 }],
          volume_ml: 25,
          volume: 25 / 100,
          mass_g: 25,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 6.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (NaCl)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['NaCl'],
          contents: [{ formula: 'NaCl', moles: 0.025, mass_g: 1.46 }],
          volume_ml: 25,
          volume: 25 / 250,
          mass_g: 25,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f1f5f9',
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'exothermic_neutralization') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (HCl 2M)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['HCl (dil)'],
          contents: [{ formula: 'HCl', moles: 0.08, mass_g: 2.92 }],
          volume_ml: 40,
          volume: 40 / 250,
          mass_g: 40,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 1.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (NaOH 2M)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['NaOH'],
          contents: [{ formula: 'NaOH', moles: 0.08, mass_g: 3.2 }],
          volume_ml: 40,
          volume: 40 / 250,
          mass_g: 40,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 13.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'zn_hcl_hydrogen_production') {
        vessels['test_tube_1'] = {
          id: 'test_tube_1',
          name: 'Test Tube 1 (Zinc Granules)',
          type: 'test_tube',
          capacity_ml: 50,
          position: [-1.2, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['Zn'],
          contents: [{ formula: 'Zn', moles: 0.0306, mass_g: 2.0 }],
          volume_ml: 0,
          volume: 0,
          mass_g: 2.0,
          density_g_ml: 7.14,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: true,
          precipitateColor: '#94a3b8',
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (HCl dil)',
          type: 'beaker',
          capacity_ml: 100,
          position: [1.2, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['HCl (dil)'],
          contents: [{ formula: 'HCl', moles: 0.0302, mass_g: 1.1 }],
          volume_ml: 30,
          volume: 30 / 100,
          mass_g: 30,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 1.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'landolt_iodine_clock') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (KIO3 + Starch)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['KIO3', 'Starch'],
          contents: [
            { formula: 'KIO3', moles: 0.002, mass_g: 0.43 },
            { formula: 'Starch', moles: 0.000617, mass_g: 0.1 }
          ],
          volume_ml: 35,
          volume: 35 / 250,
          mass_g: 35,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 6.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (NaHSO3)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['NaHSO3'],
          contents: [{ formula: 'NaHSO3', moles: 0.00202, mass_g: 0.21 }],
          volume_ml: 30,
          volume: 30 / 250,
          mass_g: 30,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 4.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'fe_kscn_chemical_equilibrium') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (FeCl3)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['FeCl3'],
          contents: [{ formula: 'FeCl3', moles: 0.003, mass_g: 0.49 }],
          volume_ml: 25,
          volume: 25 / 250,
          mass_g: 25,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f59e0b', // Amber/Yellow
          temperature_c: 25,
          ph: 2.2,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (KSCN)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['KSCN'],
          contents: [{ formula: 'KSCN', moles: 0.003, mass_g: 0.29 }],
          volume_ml: 25,
          volume: 25 / 250,
          mass_g: 25,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 7.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'copper_ammonia_deep_blue') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (CuSO4)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['CuSO4'],
          contents: [{ formula: 'CuSO4', moles: 0.015, mass_g: 2.4 }],
          volume_ml: 30,
          volume: 30 / 250,
          mass_g: 30,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#2563eb', // Vivid Royal Blue
          temperature_c: 25,
          ph: 4.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (NH3 2M)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['NH3'],
          contents: [{ formula: 'NH3', moles: 0.06, mass_g: 1.02 }],
          volume_ml: 30,
          volume: 30 / 250,
          mass_g: 30,
          density_g_ml: 0.98,
          foam_ml: 0,
          liquidColor: '#f0fdf4',
          temperature_c: 25,
          ph: 11.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'al_amphoteric_hydroxide') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (Al2(SO4)3)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['Al2(SO4)3'],
          contents: [{ formula: 'Al2(SO4)3', moles: 0.00292, mass_g: 1.0 }],
          volume_ml: 25,
          volume: 25 / 250,
          mass_g: 25,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 3.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (NaOH 1M)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['NaOH'],
          contents: [{ formula: 'NaOH', moles: 0.04, mass_g: 1.6 }],
          volume_ml: 40,
          volume: 40 / 250,
          mass_g: 40,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 13.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'thiosulfate_acid_clock') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (Na2S2O3)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['Na2S2O3'],
          contents: [{ formula: 'Na2S2O3', moles: 0.00297, mass_g: 0.47 }],
          volume_ml: 30,
          volume: 30 / 250,
          mass_g: 30,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 7.5,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (HCl dil)',
          type: 'beaker',
          capacity_ml: 100,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['HCl (dil)'],
          contents: [{ formula: 'HCl', moles: 0.02, mass_g: 0.73 }],
          volume_ml: 20,
          volume: 20 / 100,
          mass_g: 20,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 1.0,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      } else if (experimentId === 'permanganate_oxalate_redox') {
        vessels['beaker_1'] = {
          id: 'beaker_1',
          name: 'Beaker 1 (KMnO4 + H2SO4)',
          type: 'beaker',
          capacity_ml: 250,
          position: [-1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['KMnO4', 'H2SO4 (dil)'],
          contents: [
            { formula: 'KMnO4', moles: 0.00152, mass_g: 0.24 },
            { formula: 'H2SO4', moles: 0.005, mass_g: 0.49 }
          ],
          volume_ml: 30,
          volume: 30 / 250,
          mass_g: 30,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#86198f', // Vivid Royal Purple
          temperature_c: 25,
          ph: 1.2,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        vessels['beaker_2'] = {
          id: 'beaker_2',
          name: 'Beaker 2 (H2C2O4)',
          type: 'beaker',
          capacity_ml: 250,
          position: [1.4, -0.135, 0],
          rotationY: 0,
          isLocked: false,
          substances: ['H2C2O4'],
          contents: [{ formula: 'H2C2O4', moles: 0.003, mass_g: 0.27 }],
          volume_ml: 30,
          volume: 30 / 250,
          mass_g: 30,
          density_g_ml: 1.0,
          foam_ml: 0,
          liquidColor: '#f8fafc',
          temperature_c: 25,
          ph: 1.3,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
      }
      for (const id of Object.keys(vessels)) vessels[id] = materializePresetInventory(vessels[id]);
      set({
        activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, lastMixResult: null,
        vessels,
        vesselIds: Object.keys(vessels),
        selectedVesselId: Object.keys(vessels)[0] || null,
        activeExperimentId: experimentId,
        activeStepIndex: 0,
        spills: {}
      });
    },

    isLabReportOpen: false,
    setLabReportOpen: (open) => set({ isLabReportOpen: open }),
    isPresentationMode: false,
    setPresentationMode: (val) => set({ isPresentationMode: val, leftSidebarOpen: !val, rightSidebarOpen: !val }),
    isSimulationPaused: false,
    setSimulationPaused: (val) => set({ isSimulationPaused: val }),
    cameraPreset: 'perspective',
    setCameraPreset: (preset) => set({ cameraPreset: preset }),
    cameraFocusPosition: null,
    setCameraFocusPosition: (pos) => set({ cameraFocusPosition: pos }),

    cameraPanMode: false,
    setCameraPanMode: (active) => set({ cameraPanMode: active }),

    isScreenLocked: false,
    toggleScreenLock: () => set(s => ({ isScreenLocked: !s.isScreenLocked })),
    setScreenLocked: (locked) => set({ isScreenLocked: locked }),

    isPouring: false,
    setIsPouring: (isPouring: boolean) => set(s => s.isPouring === isPouring ? s : ({ isPouring })),

    stirringVesselId: null,
    setStirringVesselId: (id) => set({ stirringVesselId: id }),

    activeKinetics: {},
    pendingReactions: {},
    dissolvingSubstances: {},

    tickSimulation: (dt: number) => {
      const state = get();
      if (state.isSimulationPaused || !Number.isFinite(dt) || dt <= 0) return;
      const testFrame = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || !!process.env?.VITEST);
      if (!testFrame) {
        const frameNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
        _pendingSimulationDt += Math.min(dt, 0.1);
        if (frameNow - _lastSimulationCommitTime < 50) return;
        dt = _pendingSimulationDt;
        _pendingSimulationDt = 0;
      }

      const burners = Object.values(state.burners);
      const hasActiveKinetics = Object.keys(state.activeKinetics).length > 0;
      const hasPendingReactions = Object.keys(state.pendingReactions).length > 0;
      const anyBurnerOn = burners.some(b => b.isOn);
      const anyHotPlateOn = Object.values(state.vessels).some(v => v.type === 'hot_plate' && v.hotPlate?.isOn);
      const anyFlameEmission = burners.some(b => b.flameEmission !== undefined);
      const anyVesselHot = Object.values(state.vessels).some(v => Math.abs(v.temperature_c - 25) > 1e-5 || v.isBoiling || (v.evaporationRate_g_s ?? 0) > 0 || v.contents.some(item => item.phase === 'g' && item.moles > 1e-12));
      const anyFoam = Object.values(state.vessels).some(v => (v.foam_ml || 0) > 0);
      const anyStopcockDraining = Object.values(state.vessels).some(
        v => v.type === 'separatory_funnel' && v.stopcockOpen && (v.volume_ml > 0 || (v.immiscibleOrganicVolume_ml || 0) > 0)
      );
      const anyFunnelFlow = Object.values(state.vessels).some(v => v.type === 'filter_funnel'
        && (v.volume_ml > 0 || v.isFiltrating || v.contents.some(item => solidContent(item) && item.location !== 'filter' && item.mass_g > 0)));
      const anyFuming = Object.values(state.vessels).some(v => (v.fumingIntensity || 0) > 0);
      const anyMist = Object.values(state.vessels).some(v => (v.condensationMist || 0) > 0);
      const anyPhaseChange = Object.values(state.vessels).some(v => !state.activeKinetics[v.id]
        && !v.id.startsWith('lesson_vessel_') && (partitionLeadIodide(v, 1 / 60) !== null
          || partitionSodiumChloride(v, 1 / 60, state.stirringVesselId === v.id) !== null));
      const anyAqueousChange = Object.values(state.vessels).some(v => projectAqueousSolution(v) !== null);

      // Fast exit if simulation state has no ongoing physical or chemical dynamics
      if (
        !hasActiveKinetics && 
        !hasPendingReactions && 
        !anyBurnerOn && !anyHotPlateOn && !anyFlameEmission &&
        !anyVesselHot && 
        !anyFoam && 
        !anyStopcockDraining && 
        !anyFuming && 
        !anyMist
        && !anyPhaseChange
        && !anyAqueousChange
        && !anyFunnelFlow
      ) {
        return;
      }

      const scale = state.timeScale || 1;
      // Frame input is capped before accumulation; do not discard accepted time again here.
      const effectiveDt = dt * scale;
      let vesselsUpdated = false;
      let burnersUpdated = false;
      const newVessels = { ...state.vessels };
      const newBurners = { ...state.burners };
      const newKinetics = { ...state.activeKinetics };
      const newPending = { ...state.pendingReactions };
      const newDissolving = { ...state.dissolvingSubstances };
      const vaporBudgets = new Map<string, number>();

      // Consume once, then distribute one finite heat budget across all receivers.
      const heatByVessel_J = new Map<string, number>();
      for (const [bId, burner] of Object.entries(newBurners)) {
        if (!burner.isOn) {
          if (burner.flameEmission) {
            newBurners[bId] = { ...burner, flameEmission: undefined };
            burnersUpdated = true;
          }
          continue;
        }
        const step = stepAlcoholBurner(burner, effectiveDt);
        const allocation = allocateBurnerHeat(burner, step.capturableHeat_J, Object.values(newVessels));
        for (const [id, energy] of allocation.energyByVessel_J) heatByVessel_J.set(id, (heatByVessel_J.get(id) ?? 0) + energy);
        newBurners[bId] = { ...step.burner,
          flameEmission: step.burner.isOn && burner.flameEmission
            && !flameEmissionExpired(burner.flameEmission, performance.now()) ? burner.flameEmission : undefined,
          deliveredHeat_J: (burner.deliveredHeat_J ?? 0) + allocation.deliveredHeat_J,
          heatLost_J: (burner.heatLost_J ?? 0) + step.energy_J - allocation.deliveredHeat_J };
        burnersUpdated = true;
      }

      for (const plate of Object.values(newVessels).filter(v => v.type === 'hot_plate')) {
        const step = stepHotPlate(plate, Object.values(newVessels), effectiveDt);
        newVessels[plate.id] = step.plate;
        if (step.plate !== plate) vesselsUpdated = true;
        for (const [id, energy] of step.energyByVessel_J) heatByVessel_J.set(id, (heatByVessel_J.get(id) ?? 0) + energy);
      }

      // One sample heat budget; the final partial flame still transfers its finite energy.
      for (const vId of Object.keys(newVessels)) {
        if (vId.startsWith('lesson_vessel_') || newVessels[vId].type === 'hot_plate') continue;
        const v = newVessels[vId];
        const totalHeatingPower = (heatByVessel_J.get(vId) ?? 0) / effectiveDt;

        const thermal = stepVesselThermal(v, effectiveDt, totalHeatingPower);
        if (thermal.evaporatedStep_g > 0) vaporBudgets.set(vId, thermal.evaporatedStep_g);
        let currentVol = thermal.volume_ml;
        let currentMass = thermal.mass_g;
        const evap_ml = thermal.evaporatedStep_g;
        const curTemp = thermal.temperature_c;
        const roundedTemp = curTemp; // Keep numerical precision; round only readouts.
        const isBoilingNow = thermal.isBoiling ?? false;
        const boilingIntensity = thermal.boilingIntensity ?? 0;

        // Real-World Mechanism: Headspace Condensation Fogging (T > 55°C)
        let currentMist = v.condensationMist || 0;
        if (roundedTemp > 55.0 && currentVol > 0.5) {
          currentMist = Math.min(1.0, (roundedTemp - 55.0) / 32.0);
        } else if (currentMist > 0) {
          currentMist = Math.max(0, currentMist - 0.08 * effectiveDt);
        }

        // Real-World Mechanism: Evaporative Wall Staining & Residue Ring
        let currentStain = v.stainIntensity || 0;
        let stainColor = v.stainColor;
        let stainHeight = v.stainHeight;
        const nonvolatileSolute = v.contents.find(item => item.phase === 'aq' && item.mass_g > 0
          && !['H2O', 'HCl', 'HNO3', 'NH3', 'CH3COOH', 'C2H5OH'].some(formula => chemicalFormulaMatches(item.formula, formula)));
        if (evap_ml > 0.001 && nonvolatileSolute) {
          currentStain = Math.min(1.0, currentStain + 0.06 * (evap_ml / (currentVol + 0.5)));
          stainColor = getChemical(nonvolatileSolute.formula).color || v.liquidColor || '#f8fafc';
          stainHeight = Math.max(0.15, Math.min(0.85, v.volume_ml / v.capacity_ml));
        }

        // The equilibrium boiling solver has no metastable nucleation model.
        // Do not invent random surges or create spill inventory from a temperature flag.
        const isSuperheated = false;
        const bumpingSurge = false;

        // Acid/ammonia in water are not automatically visible aerosol clouds.
        // Dedicated finite gas-reaction effects own NH4Cl smoke/NO2 plumes.
        const fumingIntensity = 0;
        const fumingColor = '#f8fafc';

        const currentOrganicVol = v.immiscibleOrganicVolume_ml || 0;
        const currentFilterResidue = v.filterPaperResidue_g || 0;
        const currentFilterSubstance = v.filterPaperResidueSubstance;
        const isFiltrating = v.isFiltrating || false;

        // A nearby condenser cannot manufacture distilled water without a
        // connected vapor-transfer inventory. That coupling is not yet modeled.
        const currentPressure = sealedGasPressure({ ...v, temperature_c: curTemp, volume_ml: currentVol });
        const isExploded = v.isExplosion || false;
        const isShattered = v.isShattered || false;
        const shatterReason = v.shatterReason;
        // Failure pressure depends on vessel rating/geometry. A generic 2.5-atm
        // threshold is not evidence of mechanical rupture or combustion.

        const currentFoam = v.foam_ml ?? 0;

        if (
          roundedTemp !== v.temperature_c || 
          v.isBoiling !== isBoilingNow || 
          Math.abs(currentVol - v.volume_ml) > 1e-12 ||
          Math.abs(currentOrganicVol - (v.immiscibleOrganicVolume_ml || 0)) > 0.01 ||
          Math.abs(currentFoam - (v.foam_ml || 0)) > 0.01 ||
          currentMist !== v.condensationMist ||
          currentStain !== v.stainIntensity ||
          isSuperheated !== v.isSuperheated ||
          bumpingSurge !== v.bumpingSurge ||
          fumingIntensity !== v.fumingIntensity ||
          isFiltrating !== v.isFiltrating ||
          Math.abs(currentPressure - (v.internalPressure_atm || 1.0)) > 0.0001 ||
          Math.abs(currentFilterResidue - (v.filterPaperResidue_g || 0)) > 0.0001 ||
          isExploded !== v.isExplosion ||
          isShattered !== v.isShattered
        ) {
          newVessels[vId] = {
            ...newVessels[vId],
            temperature_c: roundedTemp,
            isBoiling: isBoilingNow,
            boilingIntensity,
            volume_ml: currentVol,
            immiscibleOrganicVolume_ml: currentOrganicVol,
            immiscibleOrganicColor: v.immiscibleOrganicColor,
            mass_g: currentMass,
            contents: thermal.contents ?? v.contents,
            evaporationRate_g_s: thermal.evaporationRate_g_s ?? 0,
            iceVolume_ml: thermal.iceVolume_ml,
            thermalEnergyOutsideModel_J: thermal.thermalEnergyOutsideModel_J,
            thermalModelLimit: thermal.thermalModelLimit,
            volume: Math.min(1.0, currentVol / v.capacity_ml),
            foam_ml: currentFoam,
            evaporated_ml: (v.evaporated_ml || 0) + evap_ml,
            condensationMist: currentMist,
            stainIntensity: currentStain,
            stainColor,
            stainHeight,
            isSuperheated,
            bumpingSurge,
            fumingIntensity,
            fumingColor,
            isFiltrating,
            filterPaperResidue_g: currentFilterResidue,
            filterPaperResidueSubstance: currentFilterSubstance,
            internalPressure_atm: currentPressure,
            isExplosion: isExploded,
            isShattered,
            shatterReason
          };
          vesselsUpdated = true;
        }

        // Check if a pending reaction condition has now been reached by heating
        if (newPending[vId]) {
          const pending = newPending[vId];
          if (curTemp >= pending.minTemp_c) {
            delete newPending[vId];
            vesselsUpdated = true;
            const heated = newVessels[vId];
            const reacted = executeMultiStepReactions(heated.contents, heated.substances, currentVol, curTemp, true, state.language, { preserveQuantities: true });
            const primary = reacted.reactionsOccurred[0];
            if (primary && reacted.combinedMixResult) {
              const recipe = getReactionVfxRecipe(primary.reactionId);
              newVessels[vId] = {
                ...newVessels[vId],
                contents: reacted.updatedContents,
                volume_ml: reacted.finalVolume_ml,
                volume: reacted.finalVolume_ml / newVessels[vId].capacity_ml,
                substances: reacted.updatedSubstances,
                ph: reacted.finalPh,
                temperature_c: reacted.finalTemperature_c,
                hasGas: reacted.hasGas,
                hasPrecipitate: reacted.hasPrecipitate,
                precipitateSubstance: reacted.precipitateSubstance,
                precipitateAmount_g: reacted.precipitateAmount_g,
                precipitateColor: reacted.precipitateColor,
              };
              vesselsUpdated = true;
              newKinetics[vId] = {
                vesselId: vId, reactionId: primary.reactionId,
                startTime: Date.now(), duration: recipe?.duration || 5,
                progress: 0, reactionName: reacted.combinedMixResult.summary,
                equation: primary.equation,
                initialLiquidColor: v.liquidColor || '#f8fafc',
                targetLiquidColor: reacted.finalLiquidColor,
                hasGas: reacted.hasGas, gasColor: reacted.gasColor,
                hasPrecipitate: reacted.hasPrecipitate,
                precipitateColor: reacted.precipitateColor,
                precipitateSubstance: reacted.precipitateSubstance,
                targetPrecipitateMass_g: reacted.precipitateAmount_g,
                dissolvingReactants: [], targetTemp: reacted.finalTemperature_c,
              };
            }
          }
        }
      }

      // Transfer the finite current inventories after every vessel's thermal
      // step, so iteration order cannot overwrite an already received sample.
      const condensed = transferWaterCondensate(newVessels, vaporBudgets);
      if (condensed !== newVessels) { Object.assign(newVessels, condensed); vesselsUpdated = true; }

      for (const id of Object.keys(newVessels)) {
        const source = newVessels[id];
        if (id.startsWith('lesson_vessel_') || !['filter_funnel', 'separatory_funnel'].includes(source.type)) continue;
        const receiver = selectFunnelReceiver(source, newVessels);
        const flow = stepFunnelFlow(source, receiver, effectiveDt);
        if (flow.moved_ml > 0 || source.contents.some(item => solidContent(item) && item.location !== 'filter' && item.mass_g > 0)
          || flow.source.isFiltrating !== source.isFiltrating || flow.source.flowStatus !== source.flowStatus) {
          newVessels[id] = flow.source;
          vesselsUpdated = true;
        }
        if (flow.moved_ml > 0) {
          delete newKinetics[id]; delete newDissolving[id]; delete newPending[id];
          if (flow.receiver) {
            delete newKinetics[flow.receiver.id]; delete newDissolving[flow.receiver.id]; delete newPending[flow.receiver.id];
            const mixed = reactAliquotMixture(flow.receiver, state.language, false);
            newVessels[flow.receiver.id] = mixed.vessel;
            if (mixed.kinetics) newKinetics[flow.receiver.id] = mixed.kinetics;
            const pending = findPendingReaction(mixed.vessel.substances, mixed.vessel.temperature_c, false, state.language);
            if (pending) newPending[flow.receiver.id] = { ...pending, vesselId: flow.receiver.id };
          }
          if (flow.spill) get().addSpill(source.position, flow.spill.volume_ml, flow.spill.substances,
            flow.spill.color, source.name, flow.spill.mass_g, flow.spill.contents);
        }
      }

      // 3. Advance active reaction kinetics, gas production, foam overflow
      for (const [vId, kinetics] of Object.entries(newKinetics)) {
        const v = newVessels[vId];
        if (!v) {
          delete newKinetics[vId];
          continue;
        }

        const validDuration = Number.isFinite(kinetics.duration) && kinetics.duration > 0;
        const newProgress = validDuration ? Math.min(1, Math.max(0, kinetics.progress || 0) + effectiveDt / kinetics.duration) : 1;
        kinetics.progress = newProgress;

        const rxId = (kinetics.reactionId || '').toLowerCase();

        const updatedFoam = v.foam_ml ?? 0;
        let programLedgerStep: Partial<VesselState> | undefined;

        // Dissolve solid reactants progressively (5x boost if finely pulverized in mortar)
        if (kinetics.dissolvingReactants.length > 0) {
          if (!newDissolving[vId]) newDissolving[vId] = {};
          const dissolveRateMult = (v.isPulverized || v.precipitateMorphology === 'POWDER') ? 5.0 : 1.0;
          for (const sub of kinetics.dissolvingReactants) {
            newDissolving[vId][sub] = Math.min(1.0, (newDissolving[vId][sub] || 0) + (effectiveDt / kinetics.duration) * dissolveRateMult);
          }
        }

        // Continuous real-time precipitate mass accumulation & multi-stage redissolution
        let curPrecipAmount_g = v.precipitateAmount_g || 0;
        let activeHasPrecip = kinetics.hasPrecipitate;
        let activePrecipColor = kinetics.precipitateColor;
        let activePrecipSubstance = kinetics.precipitateSubstance || v.precipitateSubstance;
        let activePrecipMorphology = kinetics.precipitateMorphology || v.precipitateMorphology;

        // The chemistry ledger determines how much solid exists. A timeline
        // cannot invent a fixed 0.85 g or dissolve all hydroxide without excess reagent.
        if (kinetics.targetPrecipitateMass_g === undefined) {
          const solidMass = activePrecipSubstance
            ? v.contents.filter(item => item.formula === activePrecipSubstance && item.phase === 's')
              .reduce((sum, item) => sum + item.mass_g, 0)
            : 0;
          kinetics.targetPrecipitateMass_g = Math.max(0, solidMass || v.precipitateAmount_g || 0);
        }
        if (!kinetics.program) {
          curPrecipAmount_g = kinetics.targetPrecipitateMass_g;
          activeHasPrecip = curPrecipAmount_g > 1e-12;
        }

        // Continuous or multi-stage liquid color progression
        let blendedColor = interpolateColorHex(kinetics.initialLiquidColor, kinetics.targetLiquidColor, newProgress);
        if (rxId.includes('iodine_clock') || rxId.includes('kio3+nahso3')) {
          // Landolt Iodine Clock: clear induction period until p = 0.70, then sudden flash to midnight blue-black
          if (newProgress < 0.70) {
            blendedColor = kinetics.initialLiquidColor || '#f8fafc';
          } else {
            const flashT = Math.min(1.0, (newProgress - 0.70) / 0.06);
            blendedColor = interpolateColorHex(kinetics.initialLiquidColor || '#f8fafc', kinetics.targetLiquidColor || '#0f172a', flashT);
          }
        } else if (rxId.includes('kmno4_oxalic') || rxId.includes('kmno4+h2c2o4')) {
          // Autocatalytic Mn2+ sigmoid curve: slow start then rapid decolorization through rose to clear
          const sigmoidT = 1.0 / (1.0 + Math.exp(-12.0 * (newProgress - 0.52)));
          if (sigmoidT < 0.55) {
            blendedColor = interpolateColorHex(kinetics.initialLiquidColor || '#7e22ce', '#f472b6', sigmoidT / 0.55);
          } else {
            blendedColor = interpolateColorHex('#f472b6', kinetics.targetLiquidColor || '#f8fafc', (sigmoidT - 0.55) / 0.45);
          }
        } else if (rxId.includes('cuso4_nh3') || rxId === 'cuso4+nh3') {
          if (newProgress < 0.40) {
            blendedColor = interpolateColorHex(kinetics.initialLiquidColor || '#38bdf8', '#0284c7', newProgress / 0.40);
          } else {
            blendedColor = interpolateColorHex('#0284c7', kinetics.targetLiquidColor || '#1d4ed8', (newProgress - 0.40) / 0.60);
          }
        }

        if (kinetics.program && kinetics.initialVesselBaseline) {
          const xi = newProgress;
          const ledgerStep = applyProgramWithThermalSinks(kinetics.program, kinetics.initialVesselBaseline, newVessels[vId], xi, effectiveDt);
          programLedgerStep = ledgerStep;
          const reactionVapor = Math.max(0, (ledgerStep.evaporated_ml ?? 0) - (newVessels[vId].evaporated_ml ?? 0));
          if (reactionVapor > 0) vaporBudgets.set(vId, (vaporBudgets.get(vId) ?? 0) + reactionVapor);
          const currentStepContents = ledgerStep.contents || kinetics.initialVesselBaseline.contents || [];
          const currentStepSubstances = Array.from(new Set(
            currentStepContents
              .filter(c => (c.moles || 0) > 1e-6)
              .map(c => c.formula)
              .concat((ledgerStep.hasPrecipitate && ledgerStep.precipitateSubstance) ? [ledgerStep.precipitateSubstance] : [])
          ));

          curPrecipAmount_g = ledgerStep.precipitateAmount_g || 0;
          activeHasPrecip = ledgerStep.hasPrecipitate ?? false;
          if (ledgerStep.precipitateSubstance) activePrecipSubstance = ledgerStep.precipitateSubstance;
          if (ledgerStep.precipitateColor) activePrecipColor = ledgerStep.precipitateColor;

          const targetTurbidity = kinetics.program.visual?.after?.turbidity ?? 0;
          const currentTurbidity = targetTurbidity * Math.min(1.0, newProgress / 0.4);

          newVessels[vId] = {
            ...newVessels[vId],
            contents: currentStepContents,
            substances: currentStepSubstances.length > 0 ? currentStepSubstances : newVessels[vId].substances,
            mass_g: ledgerStep.mass_g ?? newVessels[vId].mass_g,
            programHeatApplied_J: ledgerStep.programHeatApplied_J,
            iceVolume_ml: ledgerStep.iceVolume_ml,
            thermalEnergyOutsideModel_J: ledgerStep.thermalEnergyOutsideModel_J,
            thermalModelLimit: ledgerStep.thermalModelLimit,
            volume_ml: ledgerStep.volume_ml ?? newVessels[vId].volume_ml,
            volume: ledgerStep.volume ?? newVessels[vId].volume,
            evaporated_ml: ledgerStep.evaporated_ml ?? newVessels[vId].evaporated_ml,
            evaporationRate_g_s: Math.max(newVessels[vId].evaporationRate_g_s ?? 0, ledgerStep.evaporationRate_g_s ?? 0),
            isBoiling: ledgerStep.isBoiling ?? newVessels[vId].isBoiling,
            boilingIntensity: ledgerStep.boilingIntensity ?? newVessels[vId].boilingIntensity,
            escapedGas_g: ledgerStep.escapedGas_g,
            ph: ledgerStep.ph ?? newVessels[vId].ph,
            phModel: ledgerStep.phModel,
            temperature_c: ledgerStep.temperature_c ?? newVessels[vId].temperature_c,
            internalPressure_atm: ledgerStep.internalPressure_atm ?? newVessels[vId].internalPressure_atm,
            liquidColor: blendedColor,
            turbidity: currentTurbidity,
            hasGas: (ledgerStep.hasGas ?? false) && newProgress < 0.95,
            gasColor: ledgerStep.gasColor || kinetics.gasColor,
            hasPrecipitate: activeHasPrecip && curPrecipAmount_g > 0.001,
            precipitateColor: activePrecipColor,
            precipitateSubstance: activePrecipSubstance,
            precipitateMorphology: (ledgerStep.precipitateMorphology as any) || activePrecipMorphology,
            precipitateAmount_g: curPrecipAmount_g,
            foam_ml: updatedFoam
          };
          vesselsUpdated = true;
        } else {
          newVessels[vId] = {
            ...newVessels[vId],
            liquidColor: blendedColor,
            hasGas: kinetics.hasGas && newProgress < 0.95,
            gasColor: kinetics.gasColor,
            hasPrecipitate: activeHasPrecip && curPrecipAmount_g > 0.01,
            precipitateColor: activePrecipColor,
            precipitateSubstance: activePrecipSubstance,
            precipitateMorphology: activePrecipMorphology,
            precipitateAmount_g: curPrecipAmount_g,
            foam_ml: updatedFoam
          };
          vesselsUpdated = true;
        }

        if (newProgress >= 1.0) {
          if (kinetics.program && kinetics.initialVesselBaseline) {
            const finalLedger = programLedgerStep!;
            const finalContents = finalLedger.contents || [];
            const finalSubstances = Array.from(new Set(
              finalContents
                .filter(c => (c.moles || 0) > 1e-6)
                .map(c => c.formula)
                .concat((finalLedger.hasPrecipitate && finalLedger.precipitateSubstance) ? [finalLedger.precipitateSubstance] : [])
            ));
            newVessels[vId] = {
              ...newVessels[vId],
              contents: finalContents,
              substances: finalSubstances.length > 0 ? finalSubstances : newVessels[vId].substances,
              mass_g: finalLedger.mass_g ?? newVessels[vId].mass_g,
              escapedGas_g: finalLedger.escapedGas_g,
              ph: finalLedger.ph ?? newVessels[vId].ph,
              phModel: finalLedger.phModel,
              liquidColor: finalLedger.liquidColor || kinetics.targetLiquidColor,
              hasPrecipitate: finalLedger.hasPrecipitate ?? false,
              precipitateColor: finalLedger.precipitateColor || activePrecipColor,
              precipitateSubstance: finalLedger.precipitateSubstance || activePrecipSubstance,
              precipitateMorphology: (finalLedger.precipitateMorphology as any) || activePrecipMorphology,
              precipitateAmount_g: finalLedger.precipitateAmount_g,
              turbidity: kinetics.program.visual?.after?.turbidity ?? 0,
              hasGas: false,
              foam_ml: 0
            };
          } else {
            const remainingSubstances = [...new Set(newVessels[vId].contents
              .filter(item => item.moles > 1e-12 && item.mass_g > 0).map(item => item.formula))];
            const finalHasPrecip = curPrecipAmount_g > 1e-12;
            newVessels[vId] = {
              ...newVessels[vId],
              substances: remainingSubstances,
              liquidColor: kinetics.targetLiquidColor,
              hasPrecipitate: finalHasPrecip,
              precipitateColor: activePrecipColor,
              precipitateSubstance: activePrecipSubstance,
              precipitateMorphology: activePrecipMorphology,
              precipitateAmount_g: finalHasPrecip ? curPrecipAmount_g : 0,
              hasGas: false
            };
          }
          delete newKinetics[vId];
          delete newDissolving[vId];
        }
      }

      for (const id of Object.keys(newVessels)) {
        let vessel = newVessels[id];
        const escaped = projectEscapedGas(vessel);
        if (escaped) {
          vessel = newVessels[id] = { ...vessel, ...escaped };
          vesselsUpdated = true;
        }
        const foam = stepFoamInventory(vessel, state.vessels[id] ?? vessel, effectiveDt);
        if (foam) {
          vessel = newVessels[id] = { ...vessel, ...foam };
          vesselsUpdated = true;
        }
        const phase = !newKinetics[id] && !id.startsWith('lesson_vessel_') ? partitionLeadIodide(vessel, effectiveDt) : null;
        if (phase) {
          vessel = newVessels[id] = { ...vessel, ...phase };
          vesselsUpdated = true;
        }
        const saltPhase = !newKinetics[id] && !id.startsWith('lesson_vessel_')
          ? partitionSodiumChloride(vessel, effectiveDt, state.stirringVesselId === id) : null;
        if (saltPhase) {
          vessel = newVessels[id] = { ...vessel, ...saltPhase };
          vesselsUpdated = true;
        }
        const aqueous = projectAqueousSolution(vessel);
        if (aqueous) {
          newVessels[id] = { ...vessel, ...aqueous };
          vesselsUpdated = true;
        }
      }
      const kineticsCountChanged = Object.keys(newKinetics).length !== Object.keys(state.activeKinetics).length;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      // Cadence is gated before integration; never drop an integrated step.
      if (vesselsUpdated || burnersUpdated || kineticsCountChanged) {
        _lastSimulationCommitTime = now;
        set({
          vessels: newVessels,
          burners: newBurners,
          activeKinetics: newKinetics,
          pendingReactions: newPending,
          dissolvingSubstances: newDissolving
        });
      }
    },
    tick: (dt: number) => {
      get().tickSimulation(dt);
    },

    snapToGrid: false,
    toggleSnapToGrid: () => set(s => ({ snapToGrid: !s.snapToGrid })),
    activeTool: 'none',
    setActiveTool: (tool) => set({ activeTool: tool }),
    spatulaState: {
      chemical: null,
      mass_g: 0,
      color: '#cbd5e1',
    },
    setSpatulaScoop: (chemical, mass_g = 0.5, color = '#cbd5e1') =>
      set({
        spatulaState: {
          chemical,
          mass_g: chemical ? mass_g : 0,
          color: chemical ? color : '#cbd5e1',
        },
      }),

    // Environmental Spills & Cleanup
    spills: {},
    wasteMass_g: 0,
    wasteContents: [],
    addSpill: (pos, volume_ml, substances, color, sourceName, actualMass_g, contents) => {
      if (!Number.isFinite(volume_ml) || volume_ml < 0) return;
      if (volume_ml <= (actualMass_g !== undefined ? 1e-12 : 0.02)
        && !(actualMass_g !== undefined && actualMass_g > 0)) return;
      if (actualMass_g !== undefined && (!Number.isFinite(actualMass_g) || actualMass_g < 0)) return;
      set(s => {
        const existing = Object.values(s.spills).find(
          sp => Math.hypot(sp.position[0] - pos[0], sp.position[2] - pos[2]) < 0.35
        );
        const density = 1.0;
        const addedMass = actualMass_g ?? volume_ml * density;
        const newSpills = { ...s.spills };
        if (existing) {
          const totalVol = existing.volume_ml + volume_ml;
          const merged = (existing.contents ?? []).map(item => ({ ...item }));
          for (const item of contents ?? []) {
            const found = merged.find(target => target.formula === item.formula && target.phase === item.phase && target.liquidLayer === item.liquidLayer);
            if (found) { found.mass_g += item.mass_g; found.moles += item.moles; }
            else merged.push({ ...item });
          }
          newSpills[existing.id] = {
            ...existing,
            contents: merged,
            volume_ml: totalVol,
            mass_g: existing.mass_g + addedMass,
            radius: Math.min(1.2, 0.15 + Math.sqrt(totalVol || existing.mass_g + addedMass) * 0.07),
            substances: Array.from(new Set([...existing.substances, ...substances])),
            isHazard: existing.isHazard || substances.some(sub => ['H2SO4', 'HCl', 'HNO3', 'NaOH', 'BaCl2'].some(h => sub.includes(h))),
            timestamp: Date.now()
          };
        } else {
          const id = `spill_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const tableY = typeof pos[1] === 'number' && pos[1] < -0.5 ? pos[1] : -1.155;
          newSpills[id] = {
            id,
            position: [pos[0], tableY, pos[2]],
            substances,
            color: color || '#38bdf8',
            volume_ml,
            mass_g: addedMass,
            radius: Math.min(1.2, 0.15 + Math.sqrt(volume_ml || addedMass) * 0.07),
            isHazard: substances.some(sub => ['H2SO4', 'HCl', 'HNO3', 'NaOH', 'BaCl2'].some(h => sub.includes(h))),
            contents: contents?.map(item => ({ ...item })),
            sourceVesselName: sourceName,
            timestamp: Date.now()
          };
        }
        ppeService.handleChemicalSplash(substances, color);
        return { spills: newSpills };
      });
    },
    cleanSpills: () => {
      const currentSpills = Object.values(get().spills);
      if (currentSpills.length === 0) return;
      const collected = collectSpillWaste(get().wasteContents, currentSpills);
      labSound.playSpongeWipe();
      shardManager.cleanShards('brush_dustpan');
      set(s => ({
        spills: {},
        wasteMass_g: (s.wasteMass_g || 0) + collected.addedMass_g,
        wasteContents: collected.contents
      }));
    },
    wipeSpillAt: (pos: [number, number, number], radius: number = 0.55) => {
      const state = get();
      const currentSpills = Object.values(state.spills);
      if (currentSpills.length === 0) return;

      let cleanedAny = false;
      let totalCleanedMass = 0;
      const cleanedSpills: SpillState[] = [];
      const newSpills = { ...state.spills };

      for (const sp of currentSpills) {
        const dist = Math.hypot(sp.position[0] - pos[0], sp.position[2] - pos[2]);
        if (dist <= radius + (sp.radius || 0.2)) {
          cleanedAny = true;
          totalCleanedMass += sp.mass_g || 0;
          cleanedSpills.push(sp);
          delete newSpills[sp.id];
        }
      }

      if (cleanedAny) {
        labSound.playSpongeWipe();
        shardManager.cleanShards('brush_dustpan');
        set(s => ({
          spills: newSpills,
          wasteMass_g: (s.wasteMass_g || 0) + totalCleanedMass,
          wasteContents: collectSpillWaste(s.wasteContents, cleanedSpills).contents
        }));
      }
    },

    vessels: sanitizedVessels,
    vesselIds: Object.keys(sanitizedVessels),
    setVesselState: (id, state) => {
      set(s => {
        if (!s.vessels[id]) return s;
        const currentVessel = s.vessels[id];
        let updated = { ...s.vessels, [id]: { ...currentVessel, ...state } };

        // Synchronize slotted test tubes when test tube rack is moved
        if (state.position && currentVessel.type === 'test_tube_rack' && currentVessel.slottedTestTubeIds) {
          const dx = state.position[0] - currentVessel.position[0];
          const dy = state.position[1] - currentVessel.position[1];
          const dz = state.position[2] - currentVessel.position[2];
          for (const tubeId of currentVessel.slottedTestTubeIds) {
            if (updated[tubeId]) {
              const oldPos = updated[tubeId].position;
              updated[tubeId] = {
                ...updated[tubeId],
                position: [oldPos[0] + dx, oldPos[1] + dy, oldPos[2] + dz]
              };
            }
          }
        }

        // Synchronize gripped vessel when tongs are moved
        if (state.position && currentVessel.type === 'tongs' && currentVessel.grippedVesselId) {
          const gId = currentVessel.grippedVesselId;
          if (updated[gId]) {
            const dx = state.position[0] - currentVessel.position[0];
            const dy = state.position[1] - currentVessel.position[1];
            const dz = state.position[2] - currentVessel.position[2];
            const oldPos = updated[gId].position;
            updated[gId] = {
              ...updated[gId],
              position: [oldPos[0] + dx, oldPos[1] + dy, oldPos[2] + dz]
            };
          }
        }

        // If a slotted test tube is moved away from its rack (> 1.2m), un-slot it
        if (state.position && currentVessel.type === 'test_tube') {
          for (const [rId, r] of Object.entries(updated)) {
            if (r.type === 'test_tube_rack' && r.slottedTestTubeIds?.includes(id)) {
              const distFromRack = Math.hypot(state.position[0] - r.position[0], state.position[2] - r.position[2]);
              if (distFromRack > 1.2) {
                updated[rId] = {
                  ...r,
                  slottedTestTubeIds: r.slottedTestTubeIds.filter(tid => tid !== id)
                };
              }
            }
          }
        }

        // If a vessel held by tongs is moved away directly, release grip
        if (state.position && currentVessel.heldByTongsId) {
          const tId = currentVessel.heldByTongsId;
          if (updated[tId]) {
            const distFromTongs = Math.hypot(state.position[0] - updated[tId].position[0], state.position[2] - updated[tId].position[2]);
            if (distFromTongs > 1.0) {
              updated[tId] = { ...updated[tId], grippedVesselId: undefined };
              updated[id] = { ...updated[id], heldByTongsId: undefined };
            }
          }
        }

        // Synchronize filter funnel mounted in neck of this vessel (if flask/beaker moved)
        if (state.position) {
          const dx = state.position[0] - currentVessel.position[0];
          const dy = state.position[1] - currentVessel.position[1];
          const dz = state.position[2] - currentVessel.position[2];
          for (const [fId, f] of Object.entries(updated)) {
            if (f.type === 'filter_funnel' && fId !== id) {
              const distToF = Math.hypot(f.position[0] - currentVessel.position[0], f.position[2] - currentVessel.position[2]);
              if (distToF < 0.6 && f.position[1] > currentVessel.position[1] + 0.5) {
                updated[fId] = {
                  ...f,
                  position: [f.position[0] + dx, f.position[1] + dy, f.position[2] + dz]
                };
              }
            }
          }
        }

        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    addVessel: (type, customName) => {
      const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const name = customName || `${
        type === 'beaker' ? 'Beaker' : 
        type === 'flask' ? 'Flask' : 
        type === 'cylinder' ? 'Cylinder' : 
        type === 'watch_glass' ? 'Watch Glass' :
        type === 'evaporating_dish' ? 'Evaporating Dish' :
        type === 'crucible' ? 'Crucible' :
        type === 'petri_dish' ? 'Petri Dish' :
        type === 'volumetric_flask' ? 'Volumetric Flask' :
        type === 'separatory_funnel' ? 'Separatory Funnel' :
        type === 'filter_funnel' ? 'Filter Funnel' :
        type === 'mortar_pestle' ? 'Mortar & Pestle' :
        type === 'condenser' ? 'Liebig Condenser' :
        type === 'test_tube_rack' ? 'Test Tube Rack' :
        type === 'wash_bottle' ? 'Wash Bottle' :
        type === 'tongs' ? 'Crucible Tongs' :
        type === 'hot_plate' ? 'Bếp gia nhiệt' :
        'Test Tube'
      } ${Object.keys(get().vessels).length + 1}`;
      const capacity_ml = 
        type === 'flask' ? 250 : 
        type === 'beaker' ? 100 : 
        type === 'cylinder' ? 100 : 
        type === 'evaporating_dish' ? 100 :
        type === 'watch_glass' ? 40 :
        type === 'crucible' ? 50 :
        type === 'petri_dish' ? 60 :
        type === 'volumetric_flask' ? 100 :
        type === 'separatory_funnel' ? 150 :
        type === 'filter_funnel' ? 75 :
        type === 'mortar_pestle' ? 80 :
        type === 'condenser' ? 120 :
        type === 'test_tube_rack' ? 60 :
        type === 'wash_bottle' ? 250 :
        type === 'tongs' ? 20 :
        50;
      
      const count = Object.keys(get().vessels).length;
      const x = ((count % 5) - 2) * 1.5;
      const z = (Math.floor(count / 5) - 0.5) * 1.2;

      set(s => {
        const isWashBottle = type === 'wash_bottle';
        const newVessel: VesselState = {
          id,
          name,
          type,
          capacity_ml,
          position: [x, -0.135, z],
          rotationY: 0,
          isLocked: false,
          substances: isWashBottle ? ['H2O'] : [],
          contents: isWashBottle ? [{ formula: 'H2O', phase: 'l', moles: 200 / 18.015, mass_g: 200, volume_ml: 200 }] : [],
          volume: isWashBottle ? 0.8 : 0,
          volume_ml: isWashBottle ? 200 : 0,
          mass_g: isWashBottle ? 200 : 0,
          density_g_ml: 1.0,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
          liquidColor: isWashBottle ? '#e0f2fe' : undefined,
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false
        };
        const updated = { ...s.vessels, [id]: newVessel };
        pushHistorySnapshot('ADD_VESSEL', updated, s.burners, `Added ${name}`, `Đã thêm ${name}`);
        debounceSaveLocalState(updated, s.burners);
        return { 
          vessels: updated, 
          vesselIds: Object.keys(updated),
          selectedVesselId: id,
          canUndo: checkCanUndo(), 
          canRedo: checkCanRedo() 
        };
      });
    },

    duplicateVessel: (id) => {
      const source = get().vessels[id];
      if (!source) return;
      const newId = `${source.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newVessel: VesselState = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} (Copy)`,
        position: [source.position[0] + 0.8, source.position[1], source.position[2] + 0.5],
        isLocked: false
      };
      set(s => {
        const updated = { ...s.vessels, [newId]: newVessel };
        pushHistorySnapshot('ADD_VESSEL', updated, s.burners, `Duplicated ${source.name}`, `Nhân bản ${source.name}`);
        debounceSaveLocalState(updated, s.burners);
        return { 
          vessels: updated, 
          vesselIds: Object.keys(updated),
          selectedVesselId: newId, 
          canUndo: checkCanUndo(), 
          canRedo: checkCanRedo() 
        };
      });
    },

    removeVessel: (id) => {
      set(s => {
        const updated = { ...s.vessels };
        delete updated[id];
        pushHistorySnapshot('REMOVE_VESSEL', updated, s.burners, `Removed vessel`, `Xóa bình nghiệm`);
        debounceSaveLocalState(updated, s.burners);
        return {
          vessels: updated,
          vesselIds: Object.keys(updated),
          selectedVesselId: s.selectedVesselId === id ? null : s.selectedVesselId,
          canUndo: checkCanUndo(),
          canRedo: checkCanRedo()
        };
      });
    },

    toggleLockVessel: (id) => {
      set(s => {
        if (!s.vessels[id]) return s;
        const updated = {
          ...s.vessels,
          [id]: { ...s.vessels[id], isLocked: !s.vessels[id].isLocked }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    rotateVessel: (id, angleDeltaRad = Math.PI / 4) => {
      set(s => {
        if (!s.vessels[id]) return s;
        const updated = {
          ...s.vessels,
          [id]: { ...s.vessels[id], rotationY: (s.vessels[id].rotationY + angleDeltaRad) % (Math.PI * 2) }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    focusVessel: (id) => {
      const v = get().vessels[id];
      if (v) {
        set({ cameraFocusPosition: [...v.position], selectedVesselId: id });
      }
    },

    shatterVessel: (id, reason = 'Thermal shock & overpressure') => {
      const v = get().vessels[id];
      if (!v || v.isShattered) return;
      labSound.playGlassShatter();
      shardManager.spawnShatterShards(id, v.position, v.liquidColor || '#e2e8f0', 20);
      const released = releaseShatteredInventory(v);
      if (released.spill.volume_ml > 0 || released.spill.mass_g > 0) {
        get().addSpill(v.position, released.spill.volume_ml, released.spill.substances,
          v.liquidColor || v.precipitateColor || '#94a3b8', v.name, released.spill.mass_g, released.spill.contents);
      }
      set(s => {
        const updatedVessel: VesselState = {
          ...v,
          isShattered: true,
          shatterReason: reason,
          escapedGas_g: released.escapedGas_g,
          filterPaperResidue_g: 0,
          filterPaperResidueSubstance: undefined,
          immiscibleOrganicVolume_ml: 0,
          immiscibleOrganicColor: undefined,
          volume_ml: 0,
          volume: 0,
          mass_g: 0,
          substances: [],
          contents: [],
          hasPrecipitate: false,
          isBoiling: false,
          hasGas: false,
          foam_ml: 0,
          fumingIntensity: 0,
          condensationMist: 0,
          bumpingSurge: false,
          precipitateAmount_g: 0,
          liquidColor: undefined
        };
        const updated = { ...s.vessels, [id]: updatedVessel };
        const updatedKinetics = { ...s.activeKinetics };
        delete updatedKinetics[id];
        const updatedPending = { ...s.pendingReactions };
        delete updatedPending[id];
        const updatedDissolving = { ...s.dissolvingSubstances };
        delete updatedDissolving[id];

        debounceSaveLocalState(updated, s.burners);
        return { 
          vessels: updated,
          activeKinetics: updatedKinetics,
          pendingReactions: updatedPending,
          dissolvingSubstances: updatedDissolving
        };
      });
    },

    replaceShatteredVessel: (id) => {
      const v = get().vessels[id];
      if (!v) return;
      labSound.playGlassClink();
      set(s => {
        const updatedVessel: VesselState = {
          ...v,
          isShattered: false,
          shatterReason: undefined,
          volume_ml: 0,
          volume: 0,
          mass_g: 0,
          temperature_c: 25,
          ph: 7.0,
          stainIntensity: 0,
          condensationMist: 0,
          isSuperheated: false,
          bumpingSurge: false
        };
        const updated = { ...s.vessels, [id]: updatedVessel };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    grindMortar: (id) => {
      const v = get().vessels[id];
      if (!v || v.type !== 'mortar_pestle' || v.isShattered
        || !v.contents.some(item => (item.phase ?? item.state) === 's' && item.moles > 0 && item.location !== 'filter')) return;
      labSound.playPestleGrind(0.8);
      set(s => {
        const updated = {
          ...s.vessels,
          [id]: {
            ...v,
            isPulverized: true,
            precipitateMorphology: 'POWDER'
          }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    toggleStopcock: (id) => {
      const v = get().vessels[id];
      if (!v) return;
      labSound.playTap();
      set(s => {
        const isOpen = !v.stopcockOpen;
        const updated = {
          ...s.vessels,
          [id]: {
            ...v,
            stopcockOpen: isOpen
          }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    cleanVesselStain: (id) => {
      const v = get().vessels[id];
      if (!v) return;
      labSound.playLiquidPour(0.5);
      set(s => {
        const updated = {
          ...s.vessels,
          [id]: {
            ...v,
            stainIntensity: 0,
            stainColor: undefined,
            stainHeight: undefined,
            condensationMist: 0
          }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    squirtWashBottle: (washBottleId, targetVesselId) => {
      const state = get(), bottle = state.vessels[washBottleId];
      if (!bottle || bottle.type !== 'wash_bottle' || bottle.isShattered || bottle.isSealed || bottle.volume_ml <= 0) return;
      const selected = state.selectedVesselId !== washBottleId ? state.selectedVesselId : null;
      const targetId = targetVesselId ?? (bottle.washTargetId !== undefined ? bottle.washTargetId : selected);
      if (targetId === washBottleId || (targetId && !state.vessels[targetId])) return;
      const dose = bottle.washDose_ml ?? 5;
      if (!Number.isFinite(dose) || dose <= 0 || dose > 25) return;
      get().transferLiquidContinuous(washBottleId, targetId, dose);
      if (get().vessels[washBottleId] === bottle) return;
      labSound.playLiquidPour(0.5);
      // Rinsing adds actual sample material. It is not proof that an unknown
      // insoluble stain has been removed or chemically neutralized.
      debounceSaveLocalState(get().vessels, get().burners);
      if (targetId) void get().settleVesselMixture(targetId);
    },

    invertVolumetricFlask: (id) => {
      const v = get().vessels[id];
      // Inversion mixes a stoppered flask; it does not grind crystals or remove residue.
      if (!v || v.type !== 'volumetric_flask' || !v.isSealed || v.isShattered || v.volume_ml <= 0) return;
      labSound.playGlassClink();
      get().stirVessel(id);
    },

    placeTestTubeInRack: (rackId, tubeId) => {
      const rack = get().vessels[rackId];
      const tube = get().vessels[tubeId];
      if (!rack || !tube) return;
      labSound.playGlassClink();
      const currentSlotted = rack.slottedTestTubeIds || [];
      if (currentSlotted.includes(tubeId) || currentSlotted.length >= 4) return;

      const slotXOffsets = [-0.65, -0.22, 0.22, 0.65];
      // Determine which of the 4 physical slot indices are already occupied
      const occupiedSlots = currentSlotted.map(id => {
        const t = get().vessels[id];
        if (!t) return -1;
        const relX = t.position[0] - rack.position[0];
        let closestIdx = 0;
        let minDiff = Infinity;
        slotXOffsets.forEach((ox, i) => {
          const diff = Math.abs(relX - ox);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        });
        return closestIdx;
      });

      let freeSlotIdx = slotXOffsets.findIndex((_, idx) => !occupiedSlots.includes(idx));
      if (freeSlotIdx === -1) freeSlotIdx = currentSlotted.length;

      const slotX = rack.position[0] + (slotXOffsets[freeSlotIdx] ?? 0);
      const slotY = rack.position[1] + 0.45;
      const slotZ = rack.position[2];

      const newSlotted = [...currentSlotted, tubeId];
      set(s => {
        const updated = {
          ...s.vessels,
          [rackId]: { ...rack, slottedTestTubeIds: newSlotted },
          [tubeId]: { ...tube, position: [slotX, slotY, slotZ] as [number, number, number], isLocked: false }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    removeTestTubeFromRack: (rackId, tubeId) => {
      const rack = get().vessels[rackId];
      const tube = get().vessels[tubeId];
      if (!rack || !tube) return;
      labSound.playGlassClink();
      const newSlotted = (rack.slottedTestTubeIds || []).filter(id => id !== tubeId);
      set(s => {
        const updated = {
          ...s.vessels,
          [rackId]: { ...rack, slottedTestTubeIds: newSlotted },
          [tubeId]: {
            ...tube,
            position: [rack.position[0] + 0.6, -0.135, rack.position[2] + 0.5] as [number, number, number]
          }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    toggleGripWithTongs: (tongsId, targetVesselId) => {
      const tongs = get().vessels[tongsId];
      if (!tongs) return;
      labSound.playTap();
      if (tongs.grippedVesselId) {
        const gId = tongs.grippedVesselId;
        const gripped = get().vessels[gId];
        set(s => {
          const updated = {
            ...s.vessels,
            [tongsId]: { ...tongs, grippedVesselId: undefined },
            ...(gripped ? { [gId]: { ...gripped, heldByTongsId: undefined } } : {})
          };
          debounceSaveLocalState(updated, s.burners);
          return { vessels: updated };
        });
      } else if (targetVesselId && get().vessels[targetVesselId]) {
        const target = get().vessels[targetVesselId];
        set(s => {
          const updated = {
            ...s.vessels,
            [tongsId]: {
              ...tongs,
              grippedVesselId: targetVesselId,
              position: [target.position[0], target.position[1] + 0.4, target.position[2]] as [number, number, number]
            },
            [targetVesselId]: { ...target, heldByTongsId: tongsId }
          };
          debounceSaveLocalState(updated, s.burners);
          return { vessels: updated };
        });
      }
    },

    recoverFilterResidue: (sourceId, receiverId) => {
      const source = get().vessels[sourceId], receiver = get().vessels[receiverId];
      if (!source || !receiver || source.type !== 'filter_funnel' || receiverId.startsWith('lesson_vessel_')) return;
      const recovered = recoverFilterCake(source, receiver);
      if (!recovered) return;
      const mixed = reactAliquotMixture(recovered.receiver, get().language, false);
      const pending = findPendingReaction(mixed.vessel.substances, mixed.vessel.temperature_c, false, get().language);
      set(s => {
        const updated = { ...s.vessels, [sourceId]: recovered.source, [receiverId]: mixed.vessel };
        const activeKinetics = { ...s.activeKinetics }, pendingReactions = { ...s.pendingReactions }, dissolvingSubstances = { ...s.dissolvingSubstances };
        for (const id of [sourceId, receiverId]) { delete activeKinetics[id]; delete pendingReactions[id]; delete dissolvingSubstances[id]; }
        if (mixed.kinetics) activeKinetics[receiverId] = mixed.kinetics;
        if (pending) pendingReactions[receiverId] = { ...pending, vesselId: receiverId };
        pushHistorySnapshot('POUR', updated, s.burners, 'Recovered filter cake', 'Thu hồi lượng cặn thực trên giấy lọc');
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated, activeKinetics, pendingReactions, dissolvingSubstances, canUndo: checkCanUndo(), canRedo: checkCanRedo() };
      });
    },

    toggleCondenserWater: (id) => {
      const v = get().vessels[id];
      if (!v) return;
      labSound.playLiquidPour(0.4);
      set(s => {
        const updated = {
          ...s.vessels,
          [id]: { ...v, coolingWaterActive: !v.coolingWaterActive }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    sealVessel: (id) => {
      const v = get().vessels[id];
      if (!v) return;
      labSound.playTap();
      set(s => {
        const updated = {
          ...s.vessels,
          [id]: { ...v, isSealed: !v.isSealed, internalPressure_atm: v.isSealed ? 1.0 : (v.internalPressure_atm || 1.0) }
        };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    burners: sanitizedBurners,
    burnerIds: Object.keys(sanitizedBurners),
    addBurner: () => {
      const id = `burner_${Date.now()}`;
      set(s => {
        const updated = { ...s.burners, [id]: { id, position: [0, -0.975, 0] as [number, number, number], isOn: true, intensity: 3 } };
        pushHistorySnapshot('HEAT', s.vessels, updated, 'Added Bunsen burner', 'Thêm đèn cồn');
        debounceSaveLocalState(s.vessels, updated);
        return { 
          burners: updated, 
          burnerIds: Object.keys(updated),
          canUndo: checkCanUndo(), 
          canRedo: checkCanRedo() 
        };
      });
    },
    removeBurner: (id) => {
      set(s => {
        const updated = { ...s.burners };
        delete updated[id];
        debounceSaveLocalState(s.vessels, updated);
        return { 
          burners: updated,
          burnerIds: Object.keys(updated)
        };
      });
    },
    updateBurnerPosition: (id, pos) => set(s => {
      if (!s.burners[id]) return s;
      const updated = { ...s.burners, [id]: { ...s.burners[id], position: pos } };
      debounceSaveLocalState(s.vessels, updated);
      return { burners: updated };
    }),
    toggleBurner: (id) => set(s => {
      const b = s.burners[id];
      if (!b) return s;
      const turningOn = !b.isOn;
      if (turningOn && !stepAlcoholBurner({ ...b, isOn: true }, 0).burner.isOn) {
        return {
          globalWarning: s.language === 'en' ? 'Alcohol burner is out of fuel! Refill ethanol to ignite.' : 'Đèn cồn đã hết nhiên liệu! Cần nạp cồn để đánh lửa.',
          burners: { ...s.burners, [id]: { ...b, isOn: false, flameState: 'OUT_OF_FUEL', flameEmission: undefined } }
        };
      }
      const intensity = burnerIntensity(b.intensity);
      const flameState: BurnerFlameState = turningOn 
        ? (intensity === 1 ? 'LOW_FLAME' : (intensity >= 4 ? 'HIGH_FLAME' : 'MEDIUM_FLAME')) 
        : 'EXTINGUISHED';
      const updated = { 
        ...s.burners, 
        [id]: { 
          ...b, 
          isOn: turningOn,
          flameEmission: undefined,
          flameState,
          tempOutput_c: turningOn ? 320 + intensity * 45 : 25
        } 
      };
      debounceSaveLocalState(s.vessels, updated);
      return { burners: updated };
    }),
    setHotPlate: (id, options) => {
      const state = get(), plate = state.vessels[id];
      if (!plate || plate.type !== 'hot_plate' || plate.isShattered) return false;
      const hotPlate = { ...(plate.hotPlate ?? { isOn: false, setPoint_c: 100 }),
        ...(options.isOn === undefined ? {} : { isOn: options.isOn }),
        ...(options.setPoint_c === undefined ? {} : { setPoint_c: hotPlateSetpoint(options.setPoint_c) }) };
      const vessels = { ...state.vessels, [id]: { ...plate, hotPlate } };
      set({ vessels });
      debounceSaveLocalState(vessels, state.burners);
      return true;
    },

    placeOnHotPlate: (vesselId, plateId) => {
      const state = get(), vessel = state.vessels[vesselId], plate = state.vessels[plateId];
      if (!vessel || !plate || plate.type !== 'hot_plate' || plate.isShattered || vessel.isShattered
        || vessel.isLocked || vessel.heldByTongsId || vesselId.startsWith('lesson_vessel_')
        || !HOT_PLATE_RECEIVERS.includes(vessel.type)) return false;
      const occupied = Object.values(state.vessels).some(other => other.id !== vesselId && other.id !== plateId
        && Math.hypot(other.position[0] - plate.position[0], other.position[2] - plate.position[2]) < 0.55
        && Math.abs(other.position[1] - plate.position[1] - PLATE_TOP_Y) < 0.1);
      if (occupied) { set({ globalWarning: 'Mặt bếp đã có dụng cụ; di chuyển dụng cụ đó trước.' }); return false; }
      const vessels = { ...state.vessels, [vesselId]: { ...vessel,
        position: [plate.position[0], plate.position[1] + PLATE_TOP_Y, plate.position[2]] as [number, number, number], rotationZ: 0 } };
      set({ vessels, globalWarning: null });
      debounceSaveLocalState(vessels, state.burners);
      return true;
    },

    prepareStudioIceSample: () => {
      const id = 'studio_ice_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const index = get().vesselIds.length;
      const shell: VesselState = { ...defaultVessels.beaker_1, id,
        position: [((index % 5) - 2) * 1.5, -0.135, 1.8 + Math.floor(index / 5) * 1.2] };
      const vessel = createIceWaterSample(shell);
      set(s => {
        const vessels = { ...s.vessels, [id]: vessel };
        pushHistorySnapshot('ADD_VESSEL', vessels, s.burners, 'Prepared water and ice', 'Tạo mẫu nước và đá');
        debounceSaveLocalState(vessels, s.burners);
        return { vessels, vesselIds: Object.keys(vessels), selectedVesselId: id,
          globalWarning: null, canUndo: checkCanUndo(), canRedo: checkCanRedo() };
      });
      return id;
    },

    prepareStudioProgram: (programId, variant) => {
      const program = getProgramById(programId);
      if (!program || LESSON_PROGRAM_IDS.has(program.id)) return null;
      try {
        const id = 'studio_sample_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const index = get().vesselIds.length;
        const shell: VesselState = { ...defaultVessels.beaker_1, id, name: 'Mẫu Studio: ' + program.id,
          position: [((index % 5) - 2) * 1.5, -0.135, 1.8 + Math.floor(index / 5) * 1.2] };
        const vessel = createStudioSample(program, shell, variant);
        set(s => {
          const vessels = { ...s.vessels, [id]: vessel };
          pushHistorySnapshot('ADD_VESSEL', vessels, s.burners, 'Prepared virtual specimen', 'Tạo mẫu mô phỏng định lượng');
          debounceSaveLocalState(vessels, s.burners);
          return { vessels, vesselIds: Object.keys(vessels), selectedVesselId: id,
            globalWarning: null, mixError: null, canUndo: checkCanUndo(), canRedo: checkCanRedo() };
        });
        return id;
      } catch (error) {
        set({ mixError: error instanceof Error ? error.message : String(error) });
        return null;
      }
    },

    prepareStudioMorphology: (type) => {
      const entry = PRECIPITATE_MORPHOLOGIES.find(item => item.type === type);
      if (!entry) return null;
      if (entry.programId) return get().prepareStudioProgram(entry.programId);
      try {
        const id = 'studio_morphology_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const index = get().vesselIds.length;
        const shell: VesselState = { ...defaultVessels.beaker_1, id,
          position: [((index % 5) - 2) * 1.5, -0.135, 1.8 + Math.floor(index / 5) * 1.2] };
        const vessel = createStudioMorphologySample(type, shell);
        set(s => {
          const vessels = { ...s.vessels, [id]: vessel };
          pushHistorySnapshot('ADD_VESSEL', vessels, s.burners, 'Prepared solid specimen', 'Tạo mẫu chất rắn định lượng');
          debounceSaveLocalState(vessels, s.burners);
          return { vessels, vesselIds: Object.keys(vessels), selectedVesselId: id,
            globalWarning: null, mixError: null, canUndo: checkCanUndo(), canRedo: checkCanRedo() };
        });
        return id;
      } catch (error) {
        set({ mixError: error instanceof Error ? error.message : String(error) });
        return null;
      }
    },

    runStudioProgram: (vesselId) => {
      const state = get(), vessel = state.vessels[vesselId];
      if (!vessel || vessel.isShattered || state.activeKinetics[vesselId] || !vessel.studioProgramId) return false;
      const program = getProgramById(vessel.studioProgramId);
      if (!program || LESSON_PROGRAM_IDS.has(program.id)) return false;
      const plan = planStudioProgram(program, vessel, state.language);
      if (!plan.kinetics) { set({ globalWarning: plan.unmet.join(' ') }); return false; }
      set(s => ({ vessels: { ...s.vessels, [vesselId]: { ...s.vessels[vesselId], ignitedProgramId: undefined } },
        activeKinetics: { ...s.activeKinetics, [vesselId]: plan.kinetics! }, globalWarning: null, lastMixResult: null }));
      return true;
    },

    igniteStudioSample: (vesselId) => {
      const state = get(), vessel = state.vessels[vesselId];
      if (!vessel || vessel.isShattered || state.activeKinetics[vesselId] || !vessel.studioProgramId) return false;
      const program = getProgramById(vessel.studioProgramId);
      if (program?.chemistry.conditions?.activation !== 'ignition') return false;
      const source = Object.values(state.burners).some(burner => {
        const height = vessel.position[1] - burner.position[1];
        return stepAlcoholBurner(burner, 0).burner.isOn && height >= 0.6 && height <= 2.8
          && Math.hypot(vessel.position[0] - burner.position[0], vessel.position[2] - burner.position[2]) < 0.85;
      });
      if (!source) { set({ globalWarning: 'Đặt mẫu ở vùng nguồn nhiệt đang cháy trước khi mồi trong mô phỏng.' }); return false; }
      const primed = { ...vessel, ignitedProgramId: program.id };
      const plan = planStudioProgram(program, primed, state.language);
      if (!plan.kinetics) { set({ globalWarning: plan.unmet.join(' ') }); return false; }
      // Only this run receives the initiation event; later reagent additions
      // cannot borrow an ignition flag left on the container.
      set(s => ({ activeKinetics: { ...s.activeKinetics, [vesselId]: plan.kinetics! }, globalWarning: null }));
      return true;
    },

    seekStudioProgram: (vesselId, progress) => {
      const state = get(), vessel = state.vessels[vesselId], kinetics = state.activeKinetics[vesselId];
      if (!vessel || !kinetics?.program || !kinetics.initialVesselBaseline || !Number.isFinite(progress)
        || progress < 0 || progress > 1 || vessel.isShattered) return false;
      if (progress < kinetics.progress) {
        set({ globalWarning: 'Không tua ngược lượng chất đã phản ứng hoặc khí đã thoát. Tạo mẫu mới để xem lại.' });
        return false;
      }
      const ledger = applyProgramWithThermalSinks(kinetics.program, kinetics.initialVesselBaseline, vessel, progress, (progress - kinetics.progress) * kinetics.duration);
      const projected = { ...vessel, ...ledger };
      const foam = stepFoamInventory(projected, vessel, (progress - kinetics.progress) * kinetics.duration);
      const sampled = { ...projected, ...foam };
      const contents = sampled.contents;
      set(s => {
        const activeKinetics = { ...s.activeKinetics };
        if (progress >= 1) delete activeKinetics[vesselId];
        else activeKinetics[vesselId] = { ...kinetics, progress };
        return { vessels: { ...s.vessels, [vesselId]: { ...sampled, contents,
          substances: [...new Set(contents.filter(item => item.moles > 1e-12).map(item => item.formula))],
          hasGas: progress < 1 && !!ledger.hasGas } }, activeKinetics };
      });
      return true;
    },

    startFlameTest: (burnerId, element, duration_s = 7.5) => {
      const burner = get().burners[burnerId];
      const emission = createFlameEmission(element, performance.now(), duration_s);
      if (!burner || !burner.isOn || !emission || !stepAlcoholBurner(burner, 0).burner.isOn) return false;
      set(s => ({ burners: { ...s.burners, [burnerId]: { ...s.burners[burnerId], flameEmission: emission } } }));
      vfxBus.emit('flame:test', { burnerId, element, color: emission.color, cobaltFilter: false });
      return true;
    },

    setBurnerIntensity: (id, intensity) => set(s => {
      const b = s.burners[id];
      if (!b) return s;
      const clamped = burnerIntensity(intensity);
      const flameState: BurnerFlameState = b.isOn
        ? (clamped === 1 ? 'LOW_FLAME' : (clamped >= 4 ? 'HIGH_FLAME' : 'MEDIUM_FLAME'))
        : b.flameState || 'UNLIT';
      const updated = { 
        ...s.burners, 
        [id]: { 
          ...b, 
          intensity: clamped,
          flameState,
          tempOutput_c: b.isOn ? 320 + clamped * 45 : 25
        } 
      };
      debounceSaveLocalState(s.vessels, updated);
      return { burners: updated };
    }),

    burette: {
      id: 'burette_1',
      position: [0, 1.0, 0],
      reagentFormula: 'NaOH',
      currentVolume_ml: 50,
      maxVolume_ml: 50,
      concentration_M: 0.1,
      isDispensing: false,
      flowRate_ml_s: 0.5
    },
    updateBurette: (updates) => set(s => ({ burette: { ...s.burette, ...updates } })),
    toggleBuretteStopcock: () => set(s => ({ burette: { ...s.burette, isDispensing: !s.burette.isDispensing } })),
    dispenseBuretteDrop: (targetVesselId: string) => {
      const state = get();
      const burette = state.burette;
      const receiver = state.vessels[targetVesselId];
      if (!receiver || receiver.id.startsWith('lesson_vessel_') || receiver.isLocked || receiver.isShattered || burette.currentVolume_ml <= 0) return;
      const chemical = getChemical(burette.reagentFormula);
      if (!chemical || !Number.isFinite(burette.concentration_M) || burette.concentration_M < 0) return;
      const dropVol = Math.min(0.05, burette.currentVolume_ml);
      const moles = burette.concentration_M * dropVol / 1000;
      const transfer = dispenseAliquot(receiver, { volume_ml: dropVol, mass_g: dropVol,
        temperature_c: 25, color: chemical.color, substances: [burette.reagentFormula],
        contents: [{ formula: burette.reagentFormula, moles, mass_g: moles * chemical.molarMass, phase: 'aq' }],
      }, dropVol);
      if (transfer.dispensed_ml <= 0) return;
      const newVol = Math.max(0, burette.currentVolume_ml - transfer.dispensed_ml);
      const isHeated = Object.values(state.burners).some(b => b.isOn && Math.hypot(b.position[0] - receiver.position[0], b.position[2] - receiver.position[2]) < 1.5);
      const reacted = reactAliquotMixture(transfer.vessel, state.language, isHeated);
      set(current => ({ burette: { ...current.burette, currentVolume_ml: newVol,
        isDispensing: newVol > 1e-8 && current.burette.isDispensing },
        vessels: { ...current.vessels, [targetVesselId]: reacted.vessel },
        ...(reacted.kinetics ? { lastMixResult: reacted.mixResult,
          activeKinetics: { ...current.activeKinetics, [targetVesselId]: reacted.kinetics } } : {}),
      }));

      // Record titration history
      const target = get().vessels[targetVesselId];
      if (target) {
        const volAdded = Number(((get().titrationHistory.at(-1)?.volumeAdded_ml ?? 0) + transfer.dispensed_ml).toFixed(3));
        set(s => ({
          titrationHistory: [
            ...s.titrationHistory,
            {
              volumeAdded_ml: volAdded,
              ph: target.ph,
              color: target.liquidColor || '#ffffff',
              temperature_c: target.temperature_c,
              timestamp: Date.now()
            }
          ]
        }));
      }
    },
    titrationHistory: [],
    clearTitrationHistory: () => set({ titrationHistory: [] }),

    leftSidebarOpen: true,
    rightSidebarOpen: true,
    toggleLeftSidebar: () => set(s => ({ leftSidebarOpen: !s.leftSidebarOpen })),
    toggleRightSidebar: () => set(s => ({ rightSidebarOpen: !s.rightSidebarOpen })),
    setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
    openVesselInfo: (id) => set({ selectedVesselId: id, rightSidebarOpen: true }),

    soundEnabled: true,
    toggleSound: () => {
      const next = !get().soundEnabled;
      set({ soundEnabled: next });
      labSound.enabled = next;
    },

    pendingDispense: null,
    setPendingDispense: (val) => set({ pendingDispense: val }),

    activeLitmusVesselId: null,
    setActiveLitmusVesselId: (id) => set({ activeLitmusVesselId: id }),

    stirVessel: (id) => {
      const v = get().vessels[id];
      if (!v || v.isShattered || v.volume_ml <= 0 || v.contents.length === 0) return;
      labSound.playStir();
      // Trigger 3D stirring rod visual effect
      set({ stirringVesselId: id });
      setTimeout(() => {
        if (get().stirringVesselId === id) {
          set({ stirringVesselId: null });
        }
      }, 2500);

      // Mixing changes transport only. Replaying qualitative chemistry here used
      // labels as an unlimited reagent source and restarted completed effects.
      // Quantitative reactions run when material is added or conditions change.

    },

    isDraggingChemical: null,
    setIsDraggingChemical: (chem) => {
      if (get().isDraggingChemical === chem) return;
      set({ isDraggingChemical: chem });
    },

    pouringChemical: null,
    triggerPour: (chemical, targetId, amount) => {
      const chemData = findChemical(chemical);
      const amt = amount !== undefined ? amount : (chemData.type === 'solid' ? 2 : 20);
      // Immediately register chemical & begin reaction kinetics without any artificial delay!
      get().mixSubstances(targetId, chemical, amt);
      set({ pouringChemical: { chemical, targetId, type: chemData.type, amount: amt } });
    },
    clearPour: () => {
      set({ pouringChemical: null });
    },

    vesselPourAnimation: null,
    startVesselPourAnimation: (fromId: string, toId: string) => {
      const from = get().vessels[fromId];
      const to = get().vessels[toId];
      if (!from || !to || from.substances.length === 0 || from.volume_ml <= 0) return;
      labSound.playPour();
      set({
        vesselPourAnimation: { 
          fromId, 
          toId, 
          amount_ml: from.volume_ml,
          initialFromVolume_ml: from.volume_ml,
          initialToVolume_ml: to.volume_ml,
        }
      });
    },
    updatePourVolumeProgress: () => {},
    finishVesselPourAnimation: async () => {
      const anim = get().vesselPourAnimation;
      if (!anim) return;
      const { fromId, toId, amount_ml } = anim;
      set({ vesselPourAnimation: null });
      await get().pourVessel(fromId, toId, amount_ml);
    },

    transferLiquidContinuous: (fromId, toId, delta_ml, dropPos) => {
      const state = get();
      if (fromId.startsWith('lesson_vessel_') || toId?.startsWith('lesson_vessel_')) return;
      const from = state.vessels[fromId], to = toId ? state.vessels[toId] : null;
      if (!from || (toId && !to)) return;
      const transfer = decantLiquid(from, to ?? null, delta_ml);
      if (!transfer) return;
      const burners = Object.values(state.burners);
      const isHeated = !!to && burners.some(b => b.isOn && Math.hypot(b.position[0] - to.position[0], b.position[2] - to.position[2]) < 1.5);
      const reacted = transfer.receiver ? reactAliquotMixture(transfer.receiver, state.language, isHeated) : null;
      set(s => {
        const activeKinetics = { ...s.activeKinetics }, pendingReactions = { ...s.pendingReactions }, dissolvingSubstances = { ...s.dissolvingSubstances };
        for (const id of [fromId, ...(toId ? [toId] : [])]) {
          delete activeKinetics[id]; delete pendingReactions[id]; delete dissolvingSubstances[id];
        }
        if (reacted?.kinetics && toId) activeKinetics[toId] = reacted.kinetics;
        for (const vessel of [transfer.source, ...(reacted ? [reacted.vessel] : [])]) {
          const pending = findPendingReaction(vessel.substances, vessel.temperature_c, false, s.language);
          if (pending) pendingReactions[vessel.id] = { ...pending, vesselId: vessel.id };
        }
        return { vessels: { ...s.vessels, [fromId]: transfer.source, ...(reacted && toId ? { [toId]: reacted.vessel } : {}) },
          activeKinetics, pendingReactions, dissolvingSubstances, lastMixResult: reacted?.mixResult ?? null };
      });
      if (transfer.spill) {
        const spill = transfer.spill;
        get().addSpill(dropPos ?? to?.position ?? [from.position[0], -0.132, from.position[2]],
          spill.volume_ml, spill.substances, spill.color, from.name, spill.mass_g, spill.contents);
      }
    },

    settleVesselMixture: async (id) => {
      const snapshot = get().vessels[id];
      if (!snapshot || snapshot.isShattered || !snapshot.contents.length || get().activeKinetics[id]) return;
      const isHeated = Object.values(get().burners).some(b => b.isOn
        && Math.hypot(b.position[0] - snapshot.position[0], b.position[2] - snapshot.position[2]) < 1.5);
      try {
        const resolved = await resolveMixture(snapshot, get().language, isHeated);
        // Heating, reset or a transfer during resolution invalidates its baseline.
        if (get().vessels[id] !== snapshot || get().activeKinetics[id]) return;
        set(s => ({ vessels: { ...s.vessels, [id]: resolved.vessel },
          activeKinetics: resolved.kinetics ? { ...s.activeKinetics, [id]: resolved.kinetics } : s.activeKinetics,
          lastMixResult: resolved.mixResult }));
      } catch (error) {
        if (get().vessels[id] === snapshot) set({ mixError: error instanceof Error ? error.message : String(error) });
      }
    },

    selectedVesselId: null,
    setSelectedVesselId: (id) => set({ selectedVesselId: id, rightSidebarOpen: !!id }),

    hoveredVesselId: null,
    setHoveredVesselId: (id) => {
      if (get().hoveredVesselId === id) return;
      set({ hoveredVesselId: id });
    },

    nearestPourTargetId: null,
    setNearestPourTargetId: (id) => {
      if (get().nearestPourTargetId === id) return;
      set({ nearestPourTargetId: id });
    },

    draggingVesselId: null,
    setDraggingVesselId: (id) => {
      if (get().draggingVesselId === id) return;
      set({ draggingVesselId: id });
    },
    updateVesselPosition: (id, pos) => set(s => {
      if (!s.vessels[id] || s.vessels[id].isLocked) return s;
      if (!pos.every(Number.isFinite)) return s;
      const currentVessel = s.vessels[id];
      let finalPos = pos;
      if (s.snapToGrid) {
        finalPos = [
          Math.round(pos[0] * 2) / 2,
          pos[1],
          Math.round(pos[2] * 2) / 2
        ];
      }
      if (finalPos.every((coordinate, axis) => Math.abs(coordinate - currentVessel.position[axis]) < 0.0001)) return s;
      let updated = {
        ...s.vessels,
        [id]: { ...currentVessel, position: finalPos }
      };

      // 1. Synchronize slotted test tubes when test tube rack is moved
      if (currentVessel.type === 'test_tube_rack' && currentVessel.slottedTestTubeIds) {
        const dx = finalPos[0] - currentVessel.position[0];
        const dy = finalPos[1] - currentVessel.position[1];
        const dz = finalPos[2] - currentVessel.position[2];
        for (const tubeId of currentVessel.slottedTestTubeIds) {
          if (updated[tubeId]) {
            const oldPos = updated[tubeId].position;
            updated[tubeId] = {
              ...updated[tubeId],
              position: [oldPos[0] + dx, oldPos[1] + dy, oldPos[2] + dz]
            };
          }
        }
      }

      // 2. Synchronize gripped vessel when tongs are moved
      if (currentVessel.type === 'tongs' && currentVessel.grippedVesselId) {
        const gId = currentVessel.grippedVesselId;
        if (updated[gId]) {
          const dx = finalPos[0] - currentVessel.position[0];
          const dy = finalPos[1] - currentVessel.position[1];
          const dz = finalPos[2] - currentVessel.position[2];
          const oldPos = updated[gId].position;
          updated[gId] = {
            ...updated[gId],
            position: [oldPos[0] + dx, oldPos[1] + dy, oldPos[2] + dz]
          };
        }
      }

      // 3. If a slotted test tube is dragged away from its rack (> 1.2m), un-slot it
      if (currentVessel.type === 'test_tube') {
        for (const [rId, r] of Object.entries(updated)) {
          if (r.type === 'test_tube_rack' && r.slottedTestTubeIds?.includes(id)) {
            const distFromRack = Math.hypot(finalPos[0] - r.position[0], finalPos[2] - r.position[2]);
            if (distFromRack > 1.2) {
              updated[rId] = {
                ...r,
                slottedTestTubeIds: r.slottedTestTubeIds.filter(tid => tid !== id)
              };
            }
          }
        }
      }

      // 4. If a vessel held by tongs is dragged away, release grip
      if (currentVessel.heldByTongsId) {
        const tId = currentVessel.heldByTongsId;
        if (updated[tId]) {
          const distFromTongs = Math.hypot(finalPos[0] - updated[tId].position[0], finalPos[2] - updated[tId].position[2]);
          if (distFromTongs > 1.0) {
            updated[tId] = { ...updated[tId], grippedVesselId: undefined };
            updated[id] = { ...updated[id], heldByTongsId: undefined };
          }
        }
      }

      // 5. Synchronize filter funnel mounted in neck of this vessel (if flask/beaker moved)
      const dx = finalPos[0] - currentVessel.position[0];
      const dy = finalPos[1] - currentVessel.position[1];
      const dz = finalPos[2] - currentVessel.position[2];
      for (const [fId, f] of Object.entries(updated)) {
        if (f.type === 'filter_funnel' && fId !== id) {
          const distToF = Math.hypot(f.position[0] - currentVessel.position[0], f.position[2] - currentVessel.position[2]);
          if (distToF < 0.6 && f.position[1] > currentVessel.position[1] + 0.5) {
            updated[fId] = {
              ...f,
              position: [f.position[0] + dx, f.position[1] + dy, f.position[2] + dz]
            };
          }
        }
      }

      debounceSaveLocalState(updated, s.burners);
      return { vessels: updated };
    }),

    moveMode: false,
    setMoveMode: (active) => set({ moveMode: active }),

    canUndo: false,
    canRedo: false,
    undo: () => {
      const prev = stepUndo();
      if (prev) {
        set({
          vessels: prev.snapshot.vessels,
          vesselIds: Object.keys(prev.snapshot.vessels),
          burners: prev.snapshot.burners,
          burnerIds: Object.keys(prev.snapshot.burners),
          canUndo: checkCanUndo(),
          canRedo: checkCanRedo()
        });
        debounceSaveLocalState(prev.snapshot.vessels, prev.snapshot.burners);
      }
    },
    redo: () => {
      const next = stepRedo();
      if (next) {
        set({
          vessels: next.snapshot.vessels,
          vesselIds: Object.keys(next.snapshot.vessels),
          burners: next.snapshot.burners,
          burnerIds: Object.keys(next.snapshot.burners),
          canUndo: checkCanUndo(),
          canRedo: checkCanRedo()
        });
        debounceSaveLocalState(next.snapshot.vessels, next.snapshot.burners);
      }
    },

    lastMixResult: null,
    isMixing: false,
    mixError: null,

    timeScale: 1,
    setTimeScale: (scale) => set({ timeScale: scale }),

    mixSubstances: async (targetId: string, newChemical: string, addedVolume_ml: number = 20) => {
      const vessel = get().vessels[targetId];
      if (!vessel || targetId.startsWith('lesson_vessel_')) return;

      const chemData = findChemical(newChemical);
      const burners = Object.values(get().burners);
      const isHeated = burners.some(b => b.isOn && Math.hypot(b.position[0] - vessel.position[0], b.position[2] - vessel.position[2]) < 1.5);

      const isSolid = chemData.type === 'solid';

      // Real-World Mechanism: Thermal Shock Glass Shattering
      if (!isSolid && vessel.temperature_c >= 180 && vessel.volume_ml <= 2) {
        get().shatterVessel(targetId, 'Thermal Shock: Cold liquid poured into dry superheated glassware (>180°C)');
        return;
      }

      // Real-World Mechanism: Rayleigh-Taylor wave perturbation upon addition
      vfxBus.emit('surface:ripple', { 
        x: vessel.position[0], 
        z: vessel.position[2], 
        vesselId: targetId, 
        intensity: 0.95 
      });

      let accepted_ml = 0;
      let acceptedMass_g = 0;
      let overflow_ml = 0;

      if (isSolid) {
        // addedVolume_ml represents mass in grams for solid chemicals!
        const solidMass_g = addedVolume_ml;
        acceptedMass_g = solidMass_g;
        // Solids displace volume only if liquid solvent already exists:
        if (vessel.volume_ml > 0) {
          const solidDisplacement_ml = solidMass_g / (chemData.density || 2.2);
          const availableCapacity = Math.max(0, vessel.capacity_ml - vessel.volume_ml);
          accepted_ml = Math.min(solidDisplacement_ml, availableCapacity);
          overflow_ml = Math.max(0, solidDisplacement_ml - accepted_ml);
        } else {
          // EMPTY VESSEL: Adding dry solid powder / crystals produces NO liquid volume!
          accepted_ml = 0;
          overflow_ml = 0;
        }
      } else {
        const availableCapacity = Math.max(0, vessel.capacity_ml - vessel.volume_ml);
        accepted_ml = Math.min(addedVolume_ml, availableCapacity);
        overflow_ml = Math.max(0, addedVolume_ml - accepted_ml);
        const chemDensity = chemData.density || 1.0;
        acceptedMass_g = accepted_ml * chemDensity;
      }

      const newTotalVolume_ml = vessel.volume_ml + accepted_ml;
      const newTotalMass_g = (vessel.mass_g || 0) + acceptedMass_g;
      const newDensity = newTotalVolume_ml > 0 ? (newTotalMass_g / newTotalVolume_ml) : (chemData.density || 1.0);

      if (overflow_ml > 0) {
        get().addSpill(vessel.position, overflow_ml, [newChemical], chemData.color, vessel.name);
      }

      const newSubstances = Array.from(new Set([...vessel.substances, newChemical]));

      // Update contents tracking with physical moles and mass calculation (P0.3)
      let addedMoles = 0;
      let soluteMass_g = 0;
      let solventWaterMass_g = 0;

      if (isSolid) {
        addedMoles = acceptedMass_g / (chemData.molarMass || 100);
        soluteMass_g = acceptedMass_g;
      } else if (newChemical === 'H2O') {
        addedMoles = acceptedMass_g / 18.015;
        soluteMass_g = 0;
        solventWaterMass_g = acceptedMass_g;
      } else if (chemData.defaultConcentration !== undefined && chemData.defaultConcentration > 0) {
        // Solution reagent: n_solute = V (L) * c (mol/L)
        addedMoles = (accepted_ml / 1000.0) * chemData.defaultConcentration;
        soluteMass_g = addedMoles * (chemData.molarMass || 100);
        solventWaterMass_g = Math.max(0, acceptedMass_g - soluteMass_g);
      } else {
        // Neat liquid without specified molarity
        addedMoles = acceptedMass_g / (chemData.molarMass || 100);
        soluteMass_g = acceptedMass_g;
      }

      const existingContents = (vessel.contents || []).map(content => ({ ...content }));
      const existingItem = existingContents.find(c => c.formula === newChemical);
      if (existingItem) {
        existingItem.mass_g += isSolid ? acceptedMass_g : (chemData.defaultConcentration ? soluteMass_g : acceptedMass_g);
        existingItem.moles += addedMoles;
        if (isSolid) {
          existingItem.initialMoles = (existingItem.initialMoles || (existingItem.moles - addedMoles)) + addedMoles;
          existingItem.initialMass_g = (existingItem.initialMass_g || (existingItem.mass_g - acceptedMass_g)) + acceptedMass_g;
        }
        if (!isSolid) {
          existingItem.volume_ml = (existingItem.volume_ml || 0) + accepted_ml;
        }
        existingItem.concentration_M = newTotalVolume_ml > 0 
          ? (existingItem.moles / (newTotalVolume_ml / 1000.0))
          : (chemData.defaultConcentration || 0);
      } else {
        existingContents.push({
          formula: newChemical,
          phase: isSolid ? 's' : newChemical === 'H2O' ? 'l' : chemData.defaultConcentration ? 'aq' : 'l',
          moles: addedMoles,
          mass_g: isSolid ? acceptedMass_g : (chemData.defaultConcentration ? soluteMass_g : acceptedMass_g),
          volume_ml: !isSolid ? accepted_ml : 0,
          initialMoles: isSolid ? addedMoles : undefined,
          initialMass_g: isSolid ? acceptedMass_g : undefined,
          concentration_M: newTotalVolume_ml > 0 && !isSolid
            ? (addedMoles / (newTotalVolume_ml / 1000.0))
            : (chemData.defaultConcentration || 0)
        });
      }

      if (!isSolid && solventWaterMass_g > 0 && newChemical !== 'H2O') {
        const waterItem = existingContents.find(c => c.formula === 'H2O');
        const waterMoles = solventWaterMass_g / 18.015;
        if (waterItem) {
          waterItem.mass_g += solventWaterMass_g;
          waterItem.moles += waterMoles;
        } else {
          existingContents.push({ formula: 'H2O', phase: 'l', moles: waterMoles, mass_g: solventWaterMass_g });
        }
      }

      // Check safety rules immediately
      const safetyViolations = checkSafetyViolations(newSubstances, isHeated, vessel.temperature_c);
      const criticalViolation = safetyViolations.find(v => v.level === 'CRITICAL');
      if (criticalViolation) {
        set({ globalWarning: get().language === 'en' ? criticalViolation.message_en : criticalViolation.message_vi });
      }

      // Trigger realistic procedural audio tailored to state & morphology
      if (chemData.type === 'solid') {
        const morph = getSolidMorphology(newChemical);
        const hasWater = vessel.volume_ml > 0.05;
        if (morph === 'GRANULES' || morph === 'CHIPS') {
          if (hasWater) {
            labSound.playDroplet();
          } else {
            labSound.playTap();
          }
        } else if (morph === 'RIBBON' || morph === 'TURNINGS' || morph === 'FILINGS') {
          labSound.playTap();
        } else if (morph === 'PELLET') {
          if (hasWater && (newChemical === 'Na' || newChemical === 'K')) {
            labSound.playDroplet();
            labSound.playSodiumSizzlePop(0.35);
          } else {
            labSound.playTap();
          }
        } else {
          labSound.playPowder();
        }
      } else {
        labSound.playPour();
      }

      // Determine liquid color: only set if actual liquid solvent is present!
      const hasLiquidInVessel = newTotalVolume_ml > 0.05 && (
        newSubstances.some(sub => findChemical(sub)?.type !== 'solid') || !isSolid
      );
      const newLiquidColor = hasLiquidInVessel 
        ? (vessel.liquidColor || (!isSolid ? chemData.color : undefined))
        : undefined;

      const isImmiscible = isImmiscibleOrganic(newChemical);
      let newImmOrganicVol = vessel.immiscibleOrganicVolume_ml || 0;
      let newImmOrganicColor = vessel.immiscibleOrganicColor;
      if (isImmiscible) {
        newImmOrganicVol += accepted_ml;
        newImmOrganicColor = chemData.color || '#fef08a';
        for (const item of existingContents) {
          if (item.formula === newChemical) { item.phase = 'l'; item.liquidLayer = 'organic'; }
        }
      }

      // 1. Check if reaction requires conditions (e.g. heating by burner) that are not yet met
      const pendingCondition = findPendingReaction(newSubstances, vessel.temperature_c, isHeated, get().language);
      if (pendingCondition) {
        const updatedVessel: VesselState = {
          ...vessel,
          substances: newSubstances,
          contents: existingContents,
          volume_ml: newTotalVolume_ml,
          immiscibleOrganicVolume_ml: newImmOrganicVol,
          immiscibleOrganicColor: newImmOrganicColor,
          mass_g: newTotalMass_g,
          density_g_ml: newDensity,
          volume: Math.min(1.0, newTotalVolume_ml / vessel.capacity_ml),
          liquidColor: newLiquidColor
        };
        set(s => ({
          vessels: { ...s.vessels, [targetId]: updatedVessel },
          pendingReactions: { ...s.pendingReactions, [targetId]: { ...pendingCondition, vesselId: targetId } },
          globalWarning: pendingCondition.requiredCondition,
          selectedVesselId: targetId,
          rightSidebarOpen: true
        }));
        return;
      }

      // 2. Try multi-step stoichiometric chemistry engine first (Instant & completely offline)
      const multiStep = executeMultiStepReactions(
        existingContents,
        newSubstances,
        newTotalVolume_ml,
        vessel.temperature_c,
        isHeated,
        get().language
      );

      if (multiStep.reactionsOccurred.length > 0 && multiStep.combinedMixResult) {
        const localResult = multiStep.combinedMixResult;
        const primaryRx = multiStep.reactionsOccurred[0];

        if (multiStep.isExplosion) {
          vfxBus.emit('explosion', {
            vesselId: targetId,
            position: vessel.position,
            intensity: 1.0,
            isDangerous: true
          });
          labSound.playExplosion();
          labSound.playAlarm();
        } else if (multiStep.hasGas || multiStep.isBoiling) {
          labSound.playFizz();
        } else if (localResult.is_dangerous) {
          labSound.playAlarm();
        }

        const vfxRecipe = primaryRx.reactionId ? getReactionVfxRecipe(primaryRx.reactionId) : null;
        const kineticsItem: ActiveKineticsState = {
          vesselId: targetId,
          reactionId: primaryRx.reactionId,
          startTime: Date.now(),
          duration: vfxRecipe?.duration || (multiStep.isExplosion ? 2.2 : 5.0),
          progress: 0,
          reactionName: localResult.summary,
          equation: localResult.equation,
          initialLiquidColor: vessel.liquidColor || chemData.color,
          targetLiquidColor: multiStep.finalLiquidColor || vessel.liquidColor || chemData.color,
          hasGas: multiStep.hasGas,
          gasColor: multiStep.gasColor,
          hasPrecipitate: multiStep.hasPrecipitate,
          precipitateColor: multiStep.precipitateColor,
          precipitateSubstance: multiStep.precipitateSubstance || vfxRecipe?.precipitate?.substance,
          dissolvingReactants: extractDissolvingReactants(newSubstances),
          targetTemp: multiStep.finalTemperature_c
        };

        // Calculate updated vessel state with clean stoichiometric consumption of moles and products
        const updatedVessel: VesselState = {
          ...vessel,
          substances: multiStep.updatedSubstances,
          contents: multiStep.updatedContents,
          volume_ml: multiStep.finalVolume_ml,
          immiscibleOrganicVolume_ml: newImmOrganicVol,
          immiscibleOrganicColor: newImmOrganicColor,
          mass_g: newTotalMass_g,
          density_g_ml: newDensity,
          volume: Math.min(1.0, multiStep.finalVolume_ml / vessel.capacity_ml),
          liquidColor: multiStep.finalLiquidColor || newLiquidColor,
          hasPrecipitate: multiStep.hasPrecipitate,
          precipitateColor: multiStep.precipitateColor,
          precipitateSubstance: multiStep.precipitateSubstance || vfxRecipe?.precipitate?.substance,
          precipitateAmount_g: multiStep.precipitateAmount_g || 0,
          isBoiling: multiStep.isBoiling,
          hasGas: multiStep.hasGas,
          gasColor: multiStep.gasColor,
          isExplosion: multiStep.isExplosion,
          temperature_c: multiStep.finalTemperature_c,
          ph: multiStep.finalPh
        };

        set(s => {
          const updated = { ...s.vessels, [targetId]: updatedVessel };
          const activeKinetics = { ...s.activeKinetics, [targetId]: kineticsItem };
          pushHistorySnapshot('POUR', updated, s.burners, `Added ${newChemical} to ${vessel.name}`, `Đã thêm ${newChemical} vào ${vessel.name}`);
          debounceSaveLocalState(updated, s.burners);
          return {
            lastMixResult: localResult,
            vessels: updated,
            activeKinetics,
            rightSidebarOpen: true,
            selectedVesselId: targetId,
            canUndo: checkCanUndo(),
            canRedo: checkCanRedo()
          };
        });
        return;
      }

      // Known aqueous speciation is not an invented irreversible reaction.
      // Keep dilution/buffer mixing local and retire the old playback baseline.
      if (multiStep.phModel && multiStep.reactionsOccurred.length === 0) {
        const mixed: VesselState = {
          ...vessel, contents: multiStep.updatedContents, substances: multiStep.updatedSubstances,
          volume_ml: newTotalVolume_ml, volume: Math.min(1, newTotalVolume_ml / vessel.capacity_ml),
          mass_g: newTotalMass_g, density_g_ml: newDensity,
          immiscibleOrganicVolume_ml: newImmOrganicVol, immiscibleOrganicColor: newImmOrganicColor,
          ph: multiStep.finalPh, phModel: multiStep.phModel, liquidColor: multiStep.finalLiquidColor,
          hasGas: false, hasPrecipitate: false, precipitateAmount_g: 0, isExplosion: false,
        };
        set(s => {
          const updated = { ...s.vessels, [targetId]: mixed };
          const activeKinetics = { ...s.activeKinetics };
          const dissolvingSubstances = { ...s.dissolvingSubstances };
          delete activeKinetics[targetId];
          delete dissolvingSubstances[targetId];
          pushHistorySnapshot('POUR', updated, s.burners, 'Mixed aqueous solution', 'Trộn dung dịch và cập nhật cân bằng');
          debounceSaveLocalState(updated, s.burners);
          return { vessels: updated, activeKinetics, dissolvingSubstances, lastMixResult: null,
            selectedVesselId: targetId, rightSidebarOpen: true, canUndo: checkCanUndo(), canRedo: checkCanRedo() };
        });
        return;
      }

      // 2. Resolve program via 5-tier resolution pipeline and apply Conservation Ledger
      set({ isMixing: true, mixError: null });
      try {
        const { program: resolvedProgram } = await resolveReactionProgram(
          newSubstances,
          existingContents,
          { isHeated, temperature_c: vessel.temperature_c, volume_ml: newTotalVolume_ml, lang: get().language }
        );

        const baseVessel: VesselState = {
          ...vessel,
          substances: newSubstances,
          contents: existingContents,
          mass_g: newTotalMass_g,
          density_g_ml: newDensity,
          volume_ml: newTotalVolume_ml,
          immiscibleOrganicVolume_ml: newImmOrganicVol,
          immiscibleOrganicColor: newImmOrganicColor,
          volume: Math.min(1.0, newTotalVolume_ml / vessel.capacity_ml),
          temperature_c: vessel.temperature_c
        };

        const finalLedger = applyProgramToLedger(resolvedProgram, baseVessel, 1.0);
        const initialLedger = applyProgramToLedger(resolvedProgram, baseVessel, 0.0);

        // Flammability/hazard labels alone do not establish an explosion.
        const isHazardExplosion = initialLedger.isExplosion === true || finalLedger.isExplosion === true;

        // Grounded initial state at xi = 0 (before progression begins):
        const startingVessel: VesselState = {
          ...baseVessel,
          substances: newSubstances,
          contents: initialLedger.contents || existingContents,
          liquidColor: baseVessel.liquidColor || newLiquidColor,
          hasPrecipitate: vessel.hasPrecipitate ?? false,
          precipitateColor: vessel.precipitateColor,
          precipitateSubstance: vessel.precipitateSubstance,
          precipitateMorphology: vessel.precipitateMorphology,
          precipitateAmount_g: vessel.precipitateAmount_g || 0,
          isBoiling: false,
          hasGas: false,
          gasColor: undefined,
          isExplosion: false,
          temperature_c: baseVessel.temperature_c,
          mass_g: baseVessel.mass_g
        };

        const warningMsg = get().language === 'vi' ? resolvedProgram.chemistry.warning_vi : resolvedProgram.chemistry.warning_en;
        if (warningMsg) {
          set({ globalWarning: warningMsg });
        }

        const hasProducts = resolvedProgram.chemistry.species.some(s => s.role === 'product');
        const reactantFormulas = hasProducts
          ? resolvedProgram.chemistry.species.filter(s => s.role === 'reactant').map(s => s.formula)
          : [];
        const kineticsItem: ActiveKineticsState = {
          vesselId: targetId,
          reactionId: resolvedProgram.id,
          startTime: Date.now(),
          duration: resolvedProgram.visual?.duration_s || 5.0,
          progress: 0,
          reactionName: get().language === 'vi' ? resolvedProgram.explain.observation_vi : resolvedProgram.explain.observation_en,
          equation: resolvedProgram.chemistry.equation,
          initialLiquidColor: startingVessel.liquidColor || chemData.color,
          targetLiquidColor: finalLedger.liquidColor || chemData.color,
          hasGas: finalLedger.hasGas ?? false,
          gasColor: finalLedger.gasColor,
          hasPrecipitate: finalLedger.hasPrecipitate ?? false,
          precipitateColor: finalLedger.precipitateColor,
          precipitateSubstance: finalLedger.precipitateSubstance,
          precipitateMorphology: (finalLedger.precipitateMorphology as any) || (resolvedProgram.visual?.after?.precipitate?.morphology as any),
          dissolvingReactants: extractDissolvingReactants(newSubstances, reactantFormulas),
          targetTemp: finalLedger.temperature_c ?? baseVessel.temperature_c,
          timeWarp: resolvedProgram.visual?.timeWarp,
          program: resolvedProgram,
          initialVesselBaseline: baseVessel
        };

        if (isHazardExplosion) {
          vfxBus.emit('explosion', {
            vesselId: targetId,
            position: vessel.position,
            intensity: 1.0,
            isDangerous: true
          });
          labSound.playExplosion();
          labSound.playAlarm();
        } else if (finalLedger.hasGas || finalLedger.isBoiling) {
          labSound.playFizz();
        }

        set(s => {
          const updated = { ...s.vessels, [targetId]: startingVessel };
          const activeKinetics = { ...s.activeKinetics, [targetId]: kineticsItem };
          pushHistorySnapshot('POUR', updated, s.burners, `Added ${newChemical} to ${vessel.name}`, `Đã thêm ${newChemical} vào ${vessel.name}`);
          debounceSaveLocalState(updated, s.burners);
          return {
            lastMixResult: {
              reaction_detected: true,
              summary: kineticsItem.reactionName,
              equation: kineticsItem.equation,
              new_vessel_state: {
                liquid_color: startingVessel.liquidColor,
                has_precipitate: startingVessel.hasPrecipitate,
                precipitate_color: startingVessel.precipitateColor,
                is_boiling: startingVessel.isBoiling,
                has_gas: startingVessel.hasGas,
                gas_color: startingVessel.gasColor,
                is_explosion: startingVessel.isExplosion
              }
            } as unknown as MixResult,
            vessels: updated,
            activeKinetics,
            rightSidebarOpen: true,
            selectedVesselId: targetId,
            canUndo: checkCanUndo(),
            canRedo: checkCanRedo()
          };
        });
      } catch (e: any) {
        set({ mixError: e.message });
      } finally {
        set({ isMixing: false });
      }
    },

    pourVessel: async (fromId, toId, customAmount_ml) => {
      const state = get(), from = state.vessels[fromId], to = state.vessels[toId];
      if (!from || !to || fromId === toId || from.isSealed || to.isSealed || from.isShattered || to.isShattered) return;
      const requested = customAmount_ml ?? from.volume_ml;
      if (!Number.isFinite(requested) || requested <= 0) return;
      if (to.temperature_c >= 180 && to.volume_ml <= 2 && to.temperature_c - from.temperature_c >= 130) {
        get().shatterVessel(toId, 'Thermal Shock: Cold liquid poured into dry hot glassware (>180°C)');
        return;
      }
      get().transferLiquidContinuous(fromId, toId, requested);
      if (get().vessels[fromId] === from) return;
      labSound.playPour();
      await get().settleVesselMixture(toId);
      set(s => {
        pushHistorySnapshot('POUR', s.vessels, s.burners, 'Poured ' + from.name + ' into ' + to.name, 'Đã rót ' + from.name + ' vào ' + to.name);
        debounceSaveLocalState(s.vessels, s.burners);
        return { rightSidebarOpen: true, selectedVesselId: toId, canUndo: checkCanUndo(), canRedo: checkCanRedo() };
      });
    },

    resetWorkbench: () => {
      set({
        vessels: defaultVessels,
        vesselIds: Object.keys(defaultVessels),
        burners: sanitizedBurners,
        burnerIds: Object.keys(sanitizedBurners),
        spills: {},
        wasteMass_g: 0,
        wasteContents: [],
        selectedVesselId: null,
        hoveredVesselId: null,
        draggingVesselId: null,
        lastMixResult: null,
        globalWarning: null,
        titrationHistory: []
      });
      pushHistorySnapshot('RESET', defaultVessels, sanitizedBurners, 'Workbench reset', 'Đặt lại bàn thí nghiệm');
      debounceSaveLocalState(defaultVessels, sanitizedBurners);
    }
  };
});
