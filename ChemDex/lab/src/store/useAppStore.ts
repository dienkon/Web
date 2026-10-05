import { create } from 'zustand';
import { MixResult } from '../shared/schemas';
import { CHEMICAL_DATABASE, findChemical, isImmiscibleOrganic, getSolidMorphology } from '../data/chemicals';
import { VesselState, BurnerState, BuretteState, TitrationPoint, VesselType, SpillState, BurnerFlameState, SolidMorphology } from '../types/chemistry';
import { evaluateLocalChemistry, findPendingReaction, initReactionCache, executeMultiStepReactions } from '../engine/chemistryEngine';
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
}

const DISSOLVING_SOLID_REACTANTS = [
  'Cu(OH)2', 'Cu', 'Fe', 'CaCO3', 'Zn', 'BaSO4', 'NaCl', 'Na', 'Al', 'Mg', 'K', 'I2'
];

export function extractDissolvingReactants(substances: string[]): string[] {
  return substances.filter(s => {
    if (DISSOLVING_SOLID_REACTANTS.includes(s)) return true;
    const chem = getChemical(s);
    return chem && chem.type === 'solid';
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

export interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;

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
  transferLiquidContinuous: (fromId: string, toId: string | null, delta_ml: number, dropPos?: [number, number, number]) => void;

  // Environmental Mass Conservation & Workbench Spills
  spills: Record<string, SpillState>;
  wasteMass_g: number;
  addSpill: (pos: [number, number, number], volume_ml: number, substances: string[], color: string, sourceName?: string) => void;
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
  sealVessel: (id: string) => void;

  // Burners
  burners: Record<string, BurnerState>;
  burnerIds: string[];
  addBurner: () => void;
  removeBurner: (id: string) => void;
  updateBurnerPosition: (id: string, pos: [number, number, number]) => void;
  toggleBurner: (id: string) => void;
  setBurnerIntensity: (id: string, intensity: number) => void;

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

// Ensure all items sit precisely on the table surface (Y = -0.135 for vessels, -0.975 for burners)
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
    position: [v.position[0], -0.135, v.position[2]]
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
          contents: [{ formula: 'HNO3', moles: 0.1, mass_g: 6.3 }],
          volume_ml: 25,
          volume: 25 / 100,
          mass_g: 35,
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
          contents: [{ formula: 'H2SO4', moles: 0.2039, mass_g: 20.0 }],
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
      set({
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
      if (state.isSimulationPaused || dt <= 0) return;

      const burners = Object.values(state.burners);
      const hasActiveKinetics = Object.keys(state.activeKinetics).length > 0;
      const hasPendingReactions = Object.keys(state.pendingReactions).length > 0;
      const anyBurnerOn = burners.some(b => b.isOn);
      const anyVesselHot = Object.values(state.vessels).some(v => v.temperature_c > 25);
      const anyFoam = Object.values(state.vessels).some(v => (v.foam_ml || 0) > 0);
      const anyStopcockDraining = Object.values(state.vessels).some(
        v => v.type === 'separatory_funnel' && v.stopcockOpen && (v.volume_ml > 0 || (v.immiscibleOrganicVolume_ml || 0) > 0)
      );
      const anyFuming = Object.values(state.vessels).some(
        v => (v.fumingIntensity || 0) > 0 || v.substances.some(s => {
          const lower = s.toLowerCase();
          return lower.includes('hcl') || lower.includes('hno3') || lower.includes('nh3');
        })
      );
      const anyMist = Object.values(state.vessels).some(v => (v.condensationMist || 0) > 0);

      // Fast exit if simulation state has no ongoing physical or chemical dynamics
      if (
        !hasActiveKinetics && 
        !hasPendingReactions && 
        !anyBurnerOn && 
        !anyVesselHot && 
        !anyFoam && 
        !anyStopcockDraining && 
        !anyFuming && 
        !anyMist
      ) {
        return;
      }

      const scale = state.timeScale || 1;
      const effectiveDt = Math.min(0.1, dt) * scale;
      let vesselsUpdated = false;
      let burnersUpdated = false;
      const newVessels = { ...state.vessels };
      const newBurners = { ...state.burners };
      const newKinetics = { ...state.activeKinetics };
      const newPending = { ...state.pendingReactions };
      const newDissolving = { ...state.dissolvingSubstances };

      // 1. Burner fuel consumption and flame state update
      for (const [bId, b] of Object.entries(newBurners)) {
        if (b.isOn) {
          const fuelRate = 0.02 * ((b.intensity || 3) / 3); // mL/s fuel burn rate
          const remainingFuel = Math.max(0, (b.fuelLevel_ml ?? 120) - fuelRate * effectiveDt);
          const intensity = b.intensity || 3;
          const flameState: BurnerFlameState = remainingFuel <= 0 
            ? 'OUT_OF_FUEL' 
            : (intensity === 1 ? 'LOW_FLAME' : (intensity >= 4 ? 'HIGH_FLAME' : 'MEDIUM_FLAME'));
          const isStillOn = remainingFuel > 0;
          const tempOutput_c = isStillOn ? 320 + intensity * 45 : 25;

          if (remainingFuel !== b.fuelLevel_ml || isStillOn !== b.isOn || flameState !== b.flameState) {
            newBurners[bId] = {
              ...b,
              fuelLevel_ml: Math.round(remainingFuel * 100) / 100,
              isOn: isStillOn,
              flameState,
              tempOutput_c
            };
            burnersUpdated = true;
          }
        }
      }

      // 2. Physical thermal conduction & cooling for each vessel
      for (const vId of Object.keys(newVessels)) {
        const v = newVessels[vId];
        let totalHeatingPower = 0;

        for (const b of Object.values(newBurners)) {
          if (!b.isOn) continue;
          const flameTopY = b.position[1] + 1.25;
          const hDist = Math.hypot(b.position[0] - v.position[0], b.position[2] - v.position[2]);
          const dist3d = Math.hypot(b.position[0] - v.position[0], flameTopY - v.position[1], b.position[2] - v.position[2]);
          const yDiff = v.position[1] - b.position[1];

          // Direct heating on wire gauze above burner
          let exposureFactor = 0;
          if (hDist < 0.85 && yDiff >= 0.6 && yDiff <= 2.8) {
            exposureFactor = 1.0;
          } else if (dist3d < (b.heatRadius || 1.8)) {
            exposureFactor = Math.max(0, 1 - Math.pow(dist3d / (b.heatRadius || 1.8), 1.8)) * 0.35;
          }

          if (exposureFactor > 0) {
            const burnerOutput = (b.tempOutput_c || 450) * 0.08 * ((b.intensity || 3) / 3);
            totalHeatingPower += burnerOutput * exposureFactor;
          }
        }

        // Initial volume and mass for thermal calculation and evaporation
        let currentVol = v.volume_ml;
        let currentMass = v.mass_g || (currentVol * (v.density_g_ml || 1.0));
        let evap_ml = 0;

        // 1. Heat capacity calculation with Cp (P1.1-lite)
        // Water cp = 4.184 J/(g·K), Borosilicate glass cp = 0.83 J/(g·K), Glass mass ~40 g
        const glassHeatCapacity = 33.2; // 40g * 0.83 J/(g·K)
        const liquidHeatCapacity = currentVol > 0.05 ? currentMass * 4.184 : 0;
        const totalHeatCapacity = Math.max(10.0, liquidHeatCapacity + glassHeatCapacity);

        // Absorbed heating power in Watts (calibrated: ~300W absorbed heats 100mL water by ~0.7 K/s)
        const absorbedPower_W = totalHeatingPower * 8.5;
        // Convective & radiative cooling in Watts (Newton's cooling towards 25°C)
        const coolingCoeff = (currentVol > 1.0 ? 0.35 : 0.18);
        const coolingPower_W = coolingCoeff * (v.temperature_c - 25.0);

        // Net temperature rate: dT/dt = (P_heat - P_cool) / C_total
        const dT = ((absorbedPower_W - coolingPower_W) / totalHeatCapacity) * effectiveDt;

        // 2. Colligative boiling point elevation: Tb = 100 + i * Kb * m (P1.5-lite)
        // Water ebullioscopic constant Kb = 0.512 K·kg/mol
        let boilingElevation_K = 0;
        if (v.contents && v.contents.length > 0 && currentVol > 0.5) {
          let totalDissolvedIonMoles = 0;
          for (const item of v.contents) {
            if (item.formula === 'H2O') continue;
            const f = item.formula.toUpperCase();
            let vanthoff_i = 1.0;
            if (f.includes('NACL') || f.includes('KI') || f.includes('NAOH') || f.includes('HCL')) {
              vanthoff_i = 1.8;
            } else if (f.includes('BACL2') || f.includes('NA2SO4') || f.includes('CACL2') || f.includes('H2SO4') || f.includes('PB(NO3)2')) {
              vanthoff_i = 2.5;
            } else if (f.includes('FECL3') || f.includes('AL2(SO4)3')) {
              vanthoff_i = 3.2;
            }
            totalDissolvedIonMoles += (item.moles || 0) * vanthoff_i;
          }
          const solventKg = Math.max(0.001, (currentVol * 0.95) / 1000.0);
          const molality = totalDissolvedIonMoles / solventKg;
          boilingElevation_K = Math.min(18.0, 0.512 * molality);
        }

        const normalBoilingPoint_c = 100.0 + boilingElevation_K;
        const maxTempPossible = (currentVol > 0.5) ? normalBoilingPoint_c : 450.0;
        const curTemp = Math.max(25.0, Math.min(maxTempPossible, v.temperature_c + dT));
        const roundedTemp = Math.round(curTemp * 10) / 10;

        // REAL-WORLD MECHANISM: Dry heating empty glassware explosion (>235°C without liquid buffer)
        const isGlassware = ['beaker', 'flask', 'volumetric_flask', 'test_tube', 'cylinder'].includes(v.type);
        if (isGlassware && currentVol <= 0.2 && roundedTemp >= 235.0 && !v.isShattered) {
          get().shatterVessel(vId, 'Nổ nhiệt: Nung bình thủy tinh rỗng không chứa chất lỏng (>235°C)');
          vfxBus.emit('explosion', {
            vesselId: vId,
            position: v.position,
            intensity: 1.8,
            color: '#f97316',
            isDangerous: true
          });
          labSound.playExplosion();
          labSound.playGlassShatter();
          set({
            globalWarning: get().language === 'en' 
              ? `⚠️ SAFETY VIOLATION: Dry heating empty glass ${v.name} caused catastrophic thermal shock shattering!` 
              : `⚠️ CẢNH BÁO AN TOÀN: Nung bình thủy tinh rỗng ${v.name} không có chất lỏng gây sốc nhiệt làm nổ vỡ bình!`
          });
          continue;
        }

        const isBoilingNow = roundedTemp >= (normalBoilingPoint_c - 5.0) && currentVol > 0.5;
        const boilingIntensity = isBoilingNow 
          ? Math.min(1.0, Math.max(0.1, (roundedTemp - (normalBoilingPoint_c - 5.0)) / 5.0)) 
          : 0;

        // Evaporation of liquid mass into vapor
        if (currentVol > 0) {
          const ambientEvap = 0.003 * effectiveDt * Math.pow(Math.min(100, roundedTemp) / 100, 2);
          const boilEvap = isBoilingNow ? (0.2 + 0.3 * boilingIntensity) * effectiveDt : 0;
          evap_ml = Math.min(currentVol, ambientEvap + boilEvap);
          if (evap_ml > 0.001) {
            currentVol = Math.max(0, currentVol - evap_ml);
            currentMass = Math.max(0, currentMass - evap_ml * (v.density_g_ml || 1.0));
          }
        }

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
        if (evap_ml > 0.001 && v.substances.length > 0) {
          currentStain = Math.min(1.0, currentStain + 0.06 * (evap_ml / (currentVol + 0.5)));
          stainColor = v.liquidColor || '#0284c7';
          stainHeight = Math.max(0.15, Math.min(0.85, v.volume_ml / v.capacity_ml));
        }

        // Real-World Mechanism: Boiling Bumping Surge without Nucleation
        let isSuperheated = false;
        let bumpingSurge = v.bumpingSurge || false;
        let bumpingTimer = (v as any)._bumpingTimer || 0;
        if (bumpingSurge) {
          bumpingTimer += effectiveDt;
          if (bumpingTimer >= 1.2) {
            bumpingSurge = false;
            bumpingTimer = 0;
          }
        }
        (v as any)._bumpingTimer = bumpingTimer;

        if (roundedTemp >= normalBoilingPoint_c - 0.5 && currentVol > 5) {
          const hasStirrer = state.stirringVesselId === vId;
          if (!hasStirrer) {
            isSuperheated = true;
            if (!bumpingSurge && Math.random() < 0.12 * effectiveDt) {
              bumpingSurge = true;
              (v as any)._bumpingTimer = 0;
              labSound.playBumping();
              get().addSpill(v.position, 1.2, v.substances, v.liquidColor || '#38bdf8', v.name);
            }
          } else {
            bumpingSurge = false;
          }
        } else if (roundedTemp < normalBoilingPoint_c - 2.0) {
          bumpingSurge = false;
        }

        // Real-World Mechanism: Dense Acid/Base Fuming Aerosol
        const hasVolatileFuming = v.substances.some(s => {
          const lower = s.toLowerCase();
          return lower.includes('hcl') || lower.includes('hno3') || lower.includes('nh3');
        });
        const hasBothNH3andHCl = v.substances.some(s => s.toLowerCase().includes('hcl')) && 
                                 v.substances.some(s => s.toLowerCase().includes('nh3'));
        const fumingIntensity = hasBothNH3andHCl ? 1.0 : (hasVolatileFuming ? 0.85 : 0);
        const fumingColor = hasBothNH3andHCl 
          ? '#ffffff' 
          : (v.substances.some(s => s.toLowerCase().includes('hno3')) ? '#b45309' : '#f8fafc');

        // Real-World Mechanism: Separatory Funnel Stopcock Two-Phase Draining
        let currentOrganicVol = v.immiscibleOrganicVolume_ml || 0;
        let organicDrained = 0;
        let aqueousDrained = 0;
        if (v.type === 'separatory_funnel' && v.stopcockOpen && (currentVol > 0 || currentOrganicVol > 0)) {
          const drainRate = 2.5 * effectiveDt;
          if (currentVol > 0) {
            // Lower dense aqueous phase drains out first!
            aqueousDrained = Math.min(currentVol, drainRate);
            currentVol = Math.max(0, currentVol - aqueousDrained);
            currentMass = Math.max(0, currentMass - aqueousDrained * (v.density_g_ml || 1.0));
          } else if (currentOrganicVol > 0) {
            // Once aqueous layer is completely emptied, upper organic layer drains
            organicDrained = Math.min(currentOrganicVol, drainRate);
            currentOrganicVol = Math.max(0, currentOrganicVol - organicDrained);
            currentMass = Math.max(0, currentMass - organicDrained * 0.66);
          }

          const totalDrained = aqueousDrained + organicDrained;
          if (totalDrained > 0) {
            let receiverId: string | null = null;
            for (const [otherId, other] of Object.entries(newVessels)) {
              if (otherId !== vId && Math.hypot(other.position[0] - v.position[0], other.position[2] - v.position[2]) < 0.85) {
                receiverId = otherId;
                break;
              }
            }

            const drainedSubs = aqueousDrained > 0
              ? v.substances.filter(s => !isImmiscibleOrganic(s))
              : v.substances.filter(s => isImmiscibleOrganic(s));
            const drainColor = aqueousDrained > 0 
              ? (v.liquidColor || '#38bdf8') 
              : (v.immiscibleOrganicColor || '#fef08a');

            if (receiverId) {
              const r = newVessels[receiverId];
              const newRVol = Math.min(r.capacity_ml, r.volume_ml + totalDrained);
              const rOrganic = organicDrained > 0 
                ? ((r.immiscibleOrganicVolume_ml || 0) + organicDrained) 
                : r.immiscibleOrganicVolume_ml;
              newVessels[receiverId] = {
                ...r,
                volume_ml: newRVol,
                volume: Math.min(1.0, newRVol / r.capacity_ml),
                immiscibleOrganicVolume_ml: rOrganic,
                immiscibleOrganicColor: organicDrained > 0 ? (v.immiscibleOrganicColor || '#fef08a') : r.immiscibleOrganicColor,
                substances: Array.from(new Set([...r.substances, ...drainedSubs])),
                liquidColor: r.liquidColor || drainColor
              };
            } else {
              get().addSpill(v.position, totalDrained, drainedSubs, drainColor, v.name);
            }
          }
        }

        // Real-World Mechanism: Filter Funnel Filtration
        let currentFilterResidue = v.filterPaperResidue_g || 0;
        let currentFilterSubstance = v.filterPaperResidueSubstance;
        let isFiltrating = false;
        if (v.type === 'filter_funnel' && currentVol > 0) {
          isFiltrating = true;
          const filterRate = 2.0 * effectiveDt;
          const filtrateDrained = Math.min(currentVol, filterRate);
          currentVol = Math.max(0, currentVol - filtrateDrained);
          currentMass = Math.max(0, currentMass - filtrateDrained * (v.density_g_ml || 1.0));

          if (v.hasPrecipitate || (v.precipitateAmount_g || 0) > 0) {
            currentFilterResidue = (currentFilterResidue || 0) + (v.precipitateAmount_g || 1.2);
            currentFilterSubstance = v.precipitateSubstance || v.substances.find(s => {
              const chem = getChemical(s);
              return chem?.type === 'solid';
            }) || 'Precipitate';
          }

          let receiverId: string | null = null;
          let minHDist = Infinity;
          for (const [otherId, other] of Object.entries(newVessels)) {
            if (otherId !== vId && other.type !== 'filter_funnel' && other.type !== 'separatory_funnel' && other.type !== 'condenser' && other.type !== 'wash_bottle' && other.type !== 'tongs' && other.type !== 'test_tube_rack') {
              const hDist = Math.hypot(other.position[0] - v.position[0], other.position[2] - v.position[2]);
              if (hDist < 0.85 && hDist < minHDist) {
                minHDist = hDist;
                receiverId = otherId;
              }
            }
          }

          const solubleSubs = v.substances.filter(s => {
            const chem = getChemical(s);
            return !chem || chem.type !== 'solid' || s === 'H2O';
          });
          const filtrateSubs = solubleSubs.length > 0 ? solubleSubs : ['H2O'];
          const filtrateColor = v.liquidColor || '#38bdf8';

          if (receiverId) {
            const r = newVessels[receiverId];
            const newRVol = Math.min(r.capacity_ml, r.volume_ml + filtrateDrained);
            if (r.volume_ml + filtrateDrained > r.capacity_ml) {
              const overflow_ml = (r.volume_ml + filtrateDrained) - r.capacity_ml;
              get().addSpill(r.position, overflow_ml, filtrateSubs, filtrateColor, r.name);
            }
            newVessels[receiverId] = {
              ...r,
              volume_ml: newRVol,
              volume: Math.min(1.0, newRVol / r.capacity_ml),
              substances: Array.from(new Set([...r.substances, ...filtrateSubs])),
              liquidColor: r.liquidColor || filtrateColor
            };
          } else {
            get().addSpill(v.position, filtrateDrained, filtrateSubs, filtrateColor, v.name);
          }
        }

        // Real-World Mechanism: Liebig Condenser Cooling & Distillation
        if (v.type === 'condenser' && v.coolingWaterActive) {
          for (const [otherId, other] of Object.entries(newVessels)) {
            if (otherId !== vId && other.isBoiling && Math.hypot(other.position[0] - v.position[0], other.position[2] - v.position[2]) < 1.4) {
              const condensed_ml = 0.6 * effectiveDt;
              currentVol = Math.min(v.capacity_ml, currentVol + condensed_ml);
              v.substances = Array.from(new Set([...v.substances, 'H2O']));
              v.liquidColor = v.liquidColor || '#e0f2fe';
              break;
            }
          }
        }

        // Real-World Mechanism: Overpressure Gas Explosion in Sealed Containers
        let currentPressure = v.internalPressure_atm || 1.0;
        let isExploded = v.isExplosion || false;
        let isShattered = v.isShattered || false;
        let shatterReason = v.shatterReason;
        const hasGasNow = newKinetics[vId]?.hasGas || v.hasGas;
        if (v.isSealed && (hasGasNow || isBoilingNow)) {
          const gasPressureGen = (hasGasNow ? 0.45 : 0.2) * effectiveDt;
          currentPressure += gasPressureGen;
          if (currentPressure > 2.5 && !isShattered) {
            isExploded = true;
            isShattered = true;
            shatterReason = 'Overpressure Gas Explosion (Burst > 2.5 atm)';
            const spillVol = currentVol || 25;
            currentVol = 0;
            currentMass = 0;
            labSound.playExplosion();
            get().addSpill(v.position, spillVol, v.substances, v.liquidColor || '#38bdf8', v.name);
          }
        }

        // Natural foam dissipation when gas reaction stops
        let currentFoam = v.foam_ml || 0;
        if (currentFoam > 0 && !newKinetics[vId]?.hasGas) {
          currentFoam = Math.max(0, currentFoam - 3.5 * effectiveDt);
        }

        if (
          roundedTemp !== v.temperature_c || 
          v.isBoiling !== isBoilingNow || 
          Math.abs(currentVol - v.volume_ml) > 0.01 ||
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
          if (curTemp >= pending.minTemp_c || totalHeatingPower > 5) {
            delete newPending[vId];
            const localResult = evaluateLocalChemistry(
              v.substances,
              currentVol,
              curTemp,
              true,
              state.language
            );
            if (localResult) {
              const vfxRecipe = localResult.reaction_id ? getReactionVfxRecipe(localResult.reaction_id) : null;
              newKinetics[vId] = {
                vesselId: vId,
                reactionId: localResult.reaction_id,
                startTime: Date.now(),
                duration: vfxRecipe?.duration || 5.0,
                progress: 0,
                reactionName: localResult.summary,
                equation: localResult.equation,
                initialLiquidColor: v.liquidColor || '#f8fafc',
                targetLiquidColor: localResult.new_vessel_state.liquid_color || '#38bdf8',
                hasGas: !!localResult.new_vessel_state.has_gas,
                gasColor: localResult.new_vessel_state.gas_color,
                hasPrecipitate: !!localResult.new_vessel_state.has_precipitate,
                precipitateColor: localResult.new_vessel_state.precipitate_color,
                precipitateSubstance: vfxRecipe?.precipitate?.substance,
                dissolvingReactants: extractDissolvingReactants(v.substances),
                targetTemp: localResult.new_vessel_state.is_boiling ? 100 : curTemp
              };
            }
          }
        }
      }

      // 3. Advance active reaction kinetics, gas production, foam overflow
      for (const [vId, kinetics] of Object.entries(newKinetics)) {
        const v = newVessels[vId];
        if (!v) {
          delete newKinetics[vId];
          continue;
        }

        const newProgress = Math.min(1.0, kinetics.progress + effectiveDt / kinetics.duration);
        kinetics.progress = newProgress;

        const rxId = (kinetics.reactionId || '').toLowerCase();

        // In real chemistry, ONLY designated foaming decompositions (e.g. H2O2 + MnO2 Elephant's Toothpaste)
        // produce persistent cellular foam. Normal gas evolutions (Sodium + H2O, Zn + HCl, CaCO3 + HCl)
        // release buoyant gaseous bubbles directly into the headspace, NEVER accumulating foam!
        const isFoamingReaction = rxId.includes('h2o2_mno2') || 
                                  rxId.includes('elephant_toothpaste') || 
                                  rxId.includes('decomposition_foam');
        let updatedFoam = v.foam_ml || 0;
        if (isFoamingReaction && newProgress < 0.85) {
          const foamGenRate = 14.0 * (1.0 - newProgress);
          updatedFoam += foamGenRate * effectiveDt;

          // Reaction foam overflow check!
          if (v.volume_ml + updatedFoam > v.capacity_ml) {
            const overflowFoam = (v.volume_ml + updatedFoam) - v.capacity_ml;
            updatedFoam = v.capacity_ml - v.volume_ml;
            get().addSpill(
              [v.position[0], -1.155, v.position[2]],
              overflowFoam,
              v.substances,
              kinetics.targetLiquidColor || v.liquidColor || '#ffffff',
              v.name
            );
          }
        } else if (updatedFoam > 0) {
          // Rapid natural dissipation for non-foaming reactions
          updatedFoam = Math.max(0, updatedFoam - 6.0 * effectiveDt);
        }

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

        if (rxId.includes('cuso4_nh3') || rxId === 'cuso4+nh3') {
          // Stage 1 (p < 0.45): sky-blue Cu(OH)2 gel precipitate; Stage 2 (p >= 0.45): redissolves in excess NH3
          activePrecipColor = '#38bdf8';
          activePrecipSubstance = 'Cu(OH)2';
          activePrecipMorphology = 'GEL';
          if (newProgress < 0.45) {
            activeHasPrecip = true;
            curPrecipAmount_g = 0.75 * Math.min(1.0, newProgress / 0.35);
          } else {
            const dissolveFrac = Math.min(1.0, (newProgress - 0.45) / 0.35);
            curPrecipAmount_g = 0.75 * (1.0 - dissolveFrac);
            activeHasPrecip = curPrecipAmount_g > 0.02;
          }
        } else if (rxId === 'al_naoh' || rxId.includes('al2so4_naoh') || rxId === 'al2(so4)3+naoh') {
          // Stage 1 (p < 0.45): white Al(OH)3 gel precipitate; Stage 2 (p >= 0.45): amphoteric redissolution
          activePrecipColor = '#f8fafc';
          activePrecipSubstance = 'Al(OH)3';
          activePrecipMorphology = 'GEL';
          if (newProgress < 0.45) {
            activeHasPrecip = true;
            curPrecipAmount_g = 0.70 * Math.min(1.0, newProgress / 0.35);
          } else {
            const dissolveFrac = Math.min(1.0, (newProgress - 0.45) / 0.35);
            curPrecipAmount_g = 0.70 * (1.0 - dissolveFrac);
            activeHasPrecip = curPrecipAmount_g > 0.02;
          }
        } else if (kinetics.hasPrecipitate) {
          const targetPrecipMass = 0.85;
          const tNorm = Math.max(0, Math.min(1.0, (newProgress - 0.08) / 0.85));
          const precipCurve = tNorm * tNorm * (3 - 2 * tNorm);
          curPrecipAmount_g = targetPrecipMass * precipCurve;
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

        if (newProgress >= 1.0) {
          const remainingSubstances = v.substances.filter(sub => !kinetics.dissolvingReactants.includes(sub));
          const finalHasPrecip = (rxId.includes('cuso4_nh3') || rxId === 'cuso4+nh3' || rxId === 'al_naoh' || rxId.includes('al2so4_naoh'))
            ? false
            : kinetics.hasPrecipitate;
          newVessels[vId] = {
            ...newVessels[vId],
            substances: remainingSubstances,
            liquidColor: kinetics.targetLiquidColor,
            hasPrecipitate: finalHasPrecip,
            precipitateColor: activePrecipColor,
            precipitateSubstance: activePrecipSubstance,
            precipitateMorphology: activePrecipMorphology,
            precipitateAmount_g: finalHasPrecip ? (v.precipitateAmount_g || 0.85) : 0,
            hasGas: false
          };
          delete newKinetics[vId];
        }
      }

      const kineticsCountChanged = Object.keys(newKinetics).length !== Object.keys(state.activeKinetics).length;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const isTestEnv = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || !!process.env?.VITEST);
      const shouldCommit = isTestEnv || kineticsCountChanged || (now - _lastSimulationCommitTime >= 50);

      if ((vesselsUpdated || burnersUpdated || kineticsCountChanged) && shouldCommit) {
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
    addSpill: (pos, volume_ml, substances, color, sourceName) => {
      if (volume_ml <= 0.02) return;
      set(s => {
        const existing = Object.values(s.spills).find(
          sp => Math.hypot(sp.position[0] - pos[0], sp.position[2] - pos[2]) < 0.35
        );
        const density = 1.0;
        const addedMass = volume_ml * density;
        const newSpills = { ...s.spills };
        if (existing) {
          const totalVol = existing.volume_ml + volume_ml;
          newSpills[existing.id] = {
            ...existing,
            volume_ml: totalVol,
            mass_g: existing.mass_g + addedMass,
            radius: Math.min(1.2, 0.15 + Math.sqrt(totalVol) * 0.07),
            substances: Array.from(new Set([...existing.substances, ...substances])),
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
            radius: Math.min(1.2, 0.15 + Math.sqrt(volume_ml) * 0.07),
            isHazard: substances.some(sub => ['H2SO4', 'HCl', 'HNO3', 'NaOH', 'BaCl2'].some(h => sub.includes(h))),
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
      const cleanedMass = currentSpills.reduce((sum, sp) => sum + sp.mass_g, 0);
      labSound.playSpongeWipe();
      shardManager.cleanShards('brush_dustpan');
      set(s => ({
        spills: {},
        wasteMass_g: (s.wasteMass_g || 0) + cleanedMass
      }));
    },
    wipeSpillAt: (pos: [number, number, number], radius: number = 0.55) => {
      const state = get();
      const currentSpills = Object.values(state.spills);
      if (currentSpills.length === 0) return;

      let cleanedAny = false;
      let totalCleanedMass = 0;
      const newSpills = { ...state.spills };

      for (const sp of currentSpills) {
        const dist = Math.hypot(sp.position[0] - pos[0], sp.position[2] - pos[2]);
        if (dist <= radius + (sp.radius || 0.2)) {
          cleanedAny = true;
          totalCleanedMass += sp.mass_g || 0;
          delete newSpills[sp.id];
        }
      }

      if (cleanedAny) {
        labSound.playSpongeWipe();
        shardManager.cleanShards('brush_dustpan');
        set(s => ({
          spills: newSpills,
          wasteMass_g: (s.wasteMass_g || 0) + totalCleanedMass
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
          contents: isWashBottle ? [{ formula: 'H2O', moles: 200 / 18, mass_g: 200, volume_ml: 200 }] : [],
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
      // Spill contents onto workbench
      if (v.volume_ml > 0 || (v.mass_g || 0) > 0) {
        get().addSpill(v.position, v.volume_ml || 10, v.substances, v.liquidColor || '#38bdf8', v.name);
      }
      set(s => {
        const updatedVessel: VesselState = {
          ...v,
          isShattered: true,
          shatterReason: reason,
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
      if (!v) return;
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
      const bottle = get().vessels[washBottleId];
      if (!bottle || bottle.volume_ml <= 0) return;
      const targetId = targetVesselId || get().selectedVesselId;
      const squirtVol = Math.min(15, bottle.volume_ml);
      labSound.playLiquidPour(0.5);

      if (targetId && targetId !== washBottleId && get().vessels[targetId]) {
        const target = get().vessels[targetId];
        const newTargetVol = Math.min(target.capacity_ml, target.volume_ml + squirtVol);
        const newTargetSubs = Array.from(new Set([...target.substances, 'H2O']));
        const updatedTarget = {
          ...target,
          volume_ml: newTargetVol,
          volume: Math.min(1.0, newTargetVol / target.capacity_ml),
          substances: newTargetSubs,
          liquidColor: target.liquidColor || '#e0f2fe',
          stainIntensity: Math.max(0, (target.stainIntensity || 0) - 0.5),
          condensationMist: 0
        };

        set(s => {
          const updatedVol = Math.max(0, bottle.volume_ml - squirtVol);
          const updated = {
            ...s.vessels,
            [washBottleId]: {
              ...bottle,
              volume_ml: updatedVol,
              volume: Math.min(1.0, updatedVol / bottle.capacity_ml),
              mass_g: Math.max(0, (bottle.mass_g || 0) - squirtVol)
            },
            [targetId]: updatedTarget
          };
          debounceSaveLocalState(updated, s.burners);
          return { vessels: updated };
        });
      } else {
        get().addSpill(bottle.position, squirtVol, ['H2O'], '#e2f1fc', bottle.name);
        set(s => {
          const updatedVol = Math.max(0, bottle.volume_ml - squirtVol);
          const updated = {
            ...s.vessels,
            [washBottleId]: {
              ...bottle,
              volume_ml: updatedVol,
              volume: Math.min(1.0, updatedVol / bottle.capacity_ml),
              mass_g: Math.max(0, (bottle.mass_g || 0) - squirtVol)
            }
          };
          debounceSaveLocalState(updated, s.burners);
          return { vessels: updated };
        });
      }
    },

    invertVolumetricFlask: (id) => {
      const v = get().vessels[id];
      if (!v) return;
      labSound.playGlassClink();
      set(s => {
        const dissolving = s.dissolvingSubstances[id] || {};
        const updatedDissolving = { ...dissolving };
        for (const sub of v.substances) {
          updatedDissolving[sub] = 1.0;
        }
        const updated = {
          ...s.vessels,
          [id]: {
            ...v,
            isPulverized: true,
            hasPrecipitate: false
          }
        };
        debounceSaveLocalState(updated, s.burners);
        return {
          vessels: updated,
          dissolvingSubstances: {
            ...s.dissolvingSubstances,
            [id]: updatedDissolving
          }
        };
      });
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
      if (turningOn && (b.fuelLevel_ml ?? 120) <= 0) {
        return {
          globalWarning: s.language === 'en' ? 'Alcohol burner is out of fuel! Refill ethanol to ignite.' : 'Đèn cồn đã hết nhiên liệu! Cần nạp cồn để đánh lửa.',
          burners: { ...s.burners, [id]: { ...b, isOn: false, flameState: 'OUT_OF_FUEL' } }
        };
      }
      const intensity = b.intensity || 3;
      const flameState: BurnerFlameState = turningOn 
        ? (intensity === 1 ? 'LOW_FLAME' : (intensity >= 4 ? 'HIGH_FLAME' : 'MEDIUM_FLAME')) 
        : 'EXTINGUISHED';
      const updated = { 
        ...s.burners, 
        [id]: { 
          ...b, 
          isOn: turningOn, 
          flameState,
          tempOutput_c: turningOn ? 320 + intensity * 45 : 25
        } 
      };
      debounceSaveLocalState(s.vessels, updated);
      return { burners: updated };
    }),
    setBurnerIntensity: (id, intensity) => set(s => {
      const b = s.burners[id];
      if (!b) return s;
      const clamped = Math.max(1, Math.min(5, Math.round(intensity)));
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
      const burette = get().burette;
      if (burette.currentVolume_ml <= 0) return;
      const dropVol = 0.5; // 0.5 mL per titration step
      const newVol = Math.max(0, burette.currentVolume_ml - dropVol);
      get().updateBurette({ currentVolume_ml: newVol });
      get().mixSubstances(targetVesselId, burette.reagentFormula, dropVol);

      // Record titration history
      const target = get().vessels[targetVesselId];
      if (target) {
        const volAdded = Number((burette.maxVolume_ml - newVol).toFixed(2));
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
      if (!v || v.substances.length === 0) return;
      labSound.playStir();
      // Trigger 3D stirring rod visual effect
      set({ stirringVesselId: id });
      setTimeout(() => {
        if (get().stirringVesselId === id) {
          set({ stirringVesselId: null });
        }
      }, 2500);

      // Stirring rapidly boosts solid dissolution
      set(s => {
        const dissolving = { ...s.dissolvingSubstances };
        if (dissolving[id]) {
          for (const sub of Object.keys(dissolving[id])) {
            dissolving[id][sub] = Math.min(1.0, (dissolving[id][sub] || 0) + 0.4);
          }
        }
        return { dissolvingSubstances: dissolving };
      });

      // Re-evaluate reaction with stir effect (homogenize)
      const burners = Object.values(get().burners);
      const isHeated = burners.some(b => b.isOn && Math.hypot(b.position[0] - v.position[0], b.position[2] - v.position[2]) < 1.5);
      const res = evaluateLocalChemistry(v.substances, v.volume_ml, v.temperature_c, isHeated, get().language);
      if (res) {
        set(s => ({
          vessels: {
            ...s.vessels,
            [id]: {
              ...v,
              liquidColor: res.new_vessel_state.liquid_color || v.liquidColor,
              hasPrecipitate: res.new_vessel_state.has_precipitate,
              precipitateColor: res.new_vessel_state.precipitate_color,
              isBoiling: res.new_vessel_state.is_boiling,
              hasGas: res.new_vessel_state.has_gas
            }
          }
        }));
      }
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

    transferLiquidContinuous: (fromId: string, toId: string | null, delta_ml: number, dropPos?: [number, number, number]) => {
      const state = get();
      const from = state.vessels[fromId];
      if (!from || from.volume_ml <= 0.01 || from.substances.length === 0) return;

      const poured_ml = Math.min(from.volume_ml, delta_ml);
      if (poured_ml <= 0.001) return;

      const fromDensity = from.density_g_ml || 1.0;
      const pouredMass_g = poured_ml * fromDensity;

      const newFromVol = Math.max(0, from.volume_ml - poured_ml);
      const newFromMass = Math.max(0, (from.mass_g || 0) - pouredMass_g);

      const updatedFrom: VesselState = {
        ...from,
        volume_ml: newFromVol,
        mass_g: newFromMass,
        volume: Math.min(1.0, newFromVol / from.capacity_ml),
        substances: newFromVol <= 0.05 ? [] : from.substances,
        liquidColor: newFromVol <= 0.05 ? undefined : from.liquidColor,
      };

      if (!toId) {
        // Poured onto workbench surface
        const spillPos: [number, number, number] = dropPos || [from.position[0], -0.132, from.position[2]];
        get().addSpill(spillPos, poured_ml, from.substances, from.liquidColor || '#38bdf8', from.name);
        set(s => ({
          vessels: {
            ...s.vessels,
            [fromId]: updatedFrom
          }
        }));
        return;
      }

      const to = state.vessels[toId];
      if (!to) return;

      if (to.temperature_c >= 180 && to.volume_ml <= 2) {
        get().shatterVessel(toId, 'Thermal Shock: Cold liquid poured into dry hot glassware (>180°C)');
        return;
      }

      const availableCapacity = Math.max(0, to.capacity_ml - to.volume_ml);
      const accepted_ml = Math.min(poured_ml, availableCapacity);
      const overflow_ml = Math.max(0, poured_ml - accepted_ml);

      const acceptedMass_g = accepted_ml * fromDensity;
      const newToVol = to.volume_ml + accepted_ml;
      const newToMass = (to.mass_g || 0) + acceptedMass_g;
      const combinedSubstances = Array.from(new Set([...to.substances, ...from.substances]));

      if (overflow_ml > 0) {
        get().addSpill(to.position, overflow_ml, combinedSubstances, from.liquidColor || to.liquidColor || '#38bdf8', to.name);
      }

      const updatedTo: VesselState = {
        ...to,
        volume_ml: newToVol,
        mass_g: newToMass,
        volume: Math.min(1.0, newToVol / to.capacity_ml),
        substances: combinedSubstances,
        liquidColor: to.liquidColor || from.liquidColor,
      };

      set(s => ({
        vessels: {
          ...s.vessels,
          [fromId]: updatedFrom,
          [toId]: updatedTo,
        },
      }));

      // Evaluate local reaction when liquid mixes
      if (accepted_ml > 0.8 || newFromVol <= 0.05) {
        const burners = Object.values(state.burners);
        const isHeated = burners.some(b => b.isOn && Math.hypot(b.position[0] - to.position[0], b.position[2] - to.position[2]) < 1.5);
        const localResult = evaluateLocalChemistry(combinedSubstances, newToVol, to.temperature_c, isHeated, state.language);
        if (localResult) {
          if (localResult.new_vessel_state?.is_explosion) {
            vfxBus.emit('explosion', {
              vesselId: toId,
              position: to.position,
              intensity: 1.0,
              isDangerous: true
            });
            labSound.playExplosion();
            labSound.playAlarm();
          } else if (localResult.is_dangerous) {
            labSound.playAlarm();
          }

          const vfxRecipe = localResult.reaction_id ? getReactionVfxRecipe(localResult.reaction_id) : null;
          const kineticsItem: ActiveKineticsState = {
            vesselId: toId,
            reactionId: localResult.reaction_id,
            startTime: Date.now(),
            duration: vfxRecipe?.duration || (localResult.new_vessel_state.is_explosion ? 2.2 : 5.0),
            progress: 0,
            reactionName: localResult.summary,
            equation: localResult.equation,
            initialLiquidColor: to.liquidColor || '#38bdf8',
            targetLiquidColor: localResult.new_vessel_state.liquid_color || to.liquidColor || '#38bdf8',
            hasGas: !!localResult.new_vessel_state.has_gas,
            gasColor: localResult.new_vessel_state.gas_color,
            hasPrecipitate: !!localResult.new_vessel_state.has_precipitate,
            precipitateColor: localResult.new_vessel_state.precipitate_color,
            precipitateSubstance: vfxRecipe?.precipitate?.substance,
            dissolvingReactants: extractDissolvingReactants(combinedSubstances),
            targetTemp: localResult.new_vessel_state.is_boiling ? 100 : (localResult.is_dangerous ? 75 : (isHeated ? Math.min(95, to.temperature_c + 20) : to.temperature_c))
          };

          set(s => ({
            vessels: {
              ...s.vessels,
              [toId]: {
                ...s.vessels[toId],
                liquidColor: to.liquidColor,
                hasPrecipitate: false,
                precipitateColor: localResult.new_vessel_state.precipitate_color,
                precipitateSubstance: vfxRecipe?.precipitate?.substance,
                isBoiling: localResult.new_vessel_state.is_boiling,
                hasGas: localResult.new_vessel_state.has_gas,
                gasColor: localResult.new_vessel_state.gas_color,
                isExplosion: localResult.new_vessel_state.is_explosion
              },
            },
            activeKinetics: { ...s.activeKinetics, [toId]: kineticsItem },
            lastMixResult: localResult,
          }));
        }
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
      const currentVessel = s.vessels[id];
      let finalPos = pos;
      if (s.snapToGrid) {
        finalPos = [
          Math.round(pos[0] * 2) / 2,
          pos[1],
          Math.round(pos[2] * 2) / 2
        ];
      }
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
      if (!vessel) return;

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

      const existingContents = [...(vessel.contents || [])];
      const existingItem = existingContents.find(c => c.formula === newChemical);
      if (existingItem) {
        existingItem.mass_g += isSolid ? acceptedMass_g : (chemData.defaultConcentration ? soluteMass_g : acceptedMass_g);
        existingItem.moles += addedMoles;
        if (!isSolid) {
          existingItem.volume_ml = (existingItem.volume_ml || 0) + accepted_ml;
        }
        existingItem.concentration_M = newTotalVolume_ml > 0 
          ? (existingItem.moles / (newTotalVolume_ml / 1000.0))
          : (chemData.defaultConcentration || 0);
      } else {
        existingContents.push({
          formula: newChemical,
          moles: addedMoles,
          mass_g: isSolid ? acceptedMass_g : (chemData.defaultConcentration ? soluteMass_g : acceptedMass_g),
          volume_ml: !isSolid ? accepted_ml : 0,
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
          volume_ml: newTotalVolume_ml,
          immiscibleOrganicVolume_ml: newImmOrganicVol,
          immiscibleOrganicColor: newImmOrganicColor,
          mass_g: newTotalMass_g,
          density_g_ml: newDensity,
          volume: Math.min(1.0, newTotalVolume_ml / vessel.capacity_ml),
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

      // 2. Resolve program via 5-tier resolution pipeline and apply Conservation Ledger
      set({ isMixing: true, mixError: null });
      try {
        const { program: resolvedProgram } = await resolveReactionProgram(
          newSubstances,
          existingContents,
          { isHeated, volume_ml: newTotalVolume_ml, lang: get().language }
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
          temperature_c: isHeated ? 80 : vessel.temperature_c
        };

        const ledgerResult = applyProgramToLedger(resolvedProgram, baseVessel, 1.0);
        const finalContents = ledgerResult.contents || existingContents;
        const activeSubstances = Array.from(new Set(
          finalContents
            .filter(c => (c.moles || 0) > 1e-6)
            .map(c => c.formula)
            .concat((ledgerResult.hasPrecipitate && ledgerResult.precipitateSubstance) ? [ledgerResult.precipitateSubstance] : [])
        ));

        const isHazardExplosion = resolvedProgram.chemistry.hazards?.some(h => h.includes('01') || h.includes('02')) || false;

        const updatedVessel: VesselState = {
          ...baseVessel,
          substances: activeSubstances.length > 0 ? activeSubstances : newSubstances,
          contents: finalContents,
          liquidColor: ledgerResult.liquidColor || chemData.color,
          hasPrecipitate: ledgerResult.hasPrecipitate ?? false,
          precipitateColor: ledgerResult.precipitateColor,
          precipitateSubstance: ledgerResult.precipitateSubstance,
          precipitateMorphology: ledgerResult.precipitateMorphology as any,
          precipitateAmount_g: ledgerResult.precipitateAmount_g,
          isBoiling: ledgerResult.isBoiling ?? false,
          hasGas: ledgerResult.hasGas ?? false,
          gasColor: ledgerResult.gasColor,
          isExplosion: isHazardExplosion,
          temperature_c: ledgerResult.temperature_c ?? (isHeated ? 80 : vessel.temperature_c),
          mass_g: ledgerResult.mass_g ?? baseVessel.mass_g,
          internalPressure_atm: ledgerResult.internalPressure_atm ?? baseVessel.internalPressure_atm
        };

        const warningMsg = get().language === 'vi' ? resolvedProgram.chemistry.warning_vi : resolvedProgram.chemistry.warning_en;
        if (warningMsg) {
          set({ globalWarning: warningMsg });
        }

        const kineticsItem: ActiveKineticsState = {
          vesselId: targetId,
          reactionId: resolvedProgram.id,
          startTime: Date.now(),
          duration: resolvedProgram.visual.duration_s || 5.0,
          progress: 0,
          reactionName: get().language === 'vi' ? resolvedProgram.explain.observation_vi : resolvedProgram.explain.observation_en,
          equation: resolvedProgram.chemistry.equation,
          initialLiquidColor: vessel.liquidColor || chemData.color,
          targetLiquidColor: updatedVessel.liquidColor || chemData.color,
          hasGas: updatedVessel.hasGas,
          gasColor: updatedVessel.gasColor,
          hasPrecipitate: updatedVessel.hasPrecipitate,
          precipitateColor: updatedVessel.precipitateColor,
          precipitateSubstance: updatedVessel.precipitateSubstance,
          precipitateMorphology: updatedVessel.precipitateMorphology,
          dissolvingReactants: extractDissolvingReactants(newSubstances),
          targetTemp: updatedVessel.temperature_c,
          timeWarp: resolvedProgram.visual.timeWarp,
          program: resolvedProgram
        };

        if (updatedVessel.isExplosion) {
          vfxBus.emit('explosion', {
            vesselId: targetId,
            position: vessel.position,
            intensity: 1.0,
            isDangerous: true
          });
          labSound.playExplosion();
          labSound.playAlarm();
        } else if (updatedVessel.hasGas || updatedVessel.isBoiling) {
          labSound.playFizz();
        }

        set(s => {
          const updated = { ...s.vessels, [targetId]: updatedVessel };
          const activeKinetics = { ...s.activeKinetics, [targetId]: kineticsItem };
          pushHistorySnapshot('POUR', updated, s.burners, `Added ${newChemical} to ${vessel.name}`, `Đã thêm ${newChemical} vào ${vessel.name}`);
          debounceSaveLocalState(updated, s.burners);
          return {
            lastMixResult: {
              reaction_detected: true,
              summary: kineticsItem.reactionName,
              equation: kineticsItem.equation,
              new_vessel_state: {
                liquid_color: updatedVessel.liquidColor,
                has_precipitate: updatedVessel.hasPrecipitate,
                precipitate_color: updatedVessel.precipitateColor,
                is_boiling: updatedVessel.isBoiling,
                has_gas: updatedVessel.hasGas,
                gas_color: updatedVessel.gasColor,
                is_explosion: updatedVessel.isExplosion
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

    pourVessel: async (fromId: string, toId: string, customAmount_ml?: number) => {
      const from = get().vessels[fromId];
      const to = get().vessels[toId];
      if (!from || !to) return;

      const pouredAmount_ml = customAmount_ml !== undefined ? customAmount_ml : from.volume_ml;
      if (pouredAmount_ml <= 0.001 || from.substances.length === 0) return;

      // Real-World Mechanism: Thermal Shock Glass Shattering
      if (to.temperature_c >= 180 && to.volume_ml <= 2) {
        get().shatterVessel(toId, 'Thermal Shock: Cold liquid poured into dry hot glassware (>180°C)');
        return;
      }

      labSound.playPour();

      const fromDensity = from.density_g_ml || 1.0;
      const pouredMass_g = pouredAmount_ml * fromDensity;

      const availableCapacity = Math.max(0, to.capacity_ml - to.volume_ml);
      const accepted_ml = Math.min(pouredAmount_ml, availableCapacity);
      const overflow_ml = Math.max(0, pouredAmount_ml - accepted_ml);

      const acceptedMass_g = accepted_ml * fromDensity;
      const newToVolume_ml = to.volume_ml + accepted_ml;
      const newToMass_g = (to.mass_g || (to.volume_ml * (to.density_g_ml || 1.0))) + acceptedMass_g;
      const newToDensity = newToVolume_ml > 0 ? newToMass_g / newToVolume_ml : 1.0;
      const combinedSubstances = Array.from(new Set([...to.substances, ...from.substances]));

      if (overflow_ml > 0.05) {
        get().addSpill(to.position, overflow_ml, combinedSubstances, from.liquidColor || to.liquidColor || '#38bdf8', to.name);
      }

      // Check safety rules
      const burners = Object.values(get().burners);
      const isHeated = burners.some(b => b.isOn && Math.hypot(b.position[0] - to.position[0], b.position[2] - to.position[2]) < 1.5);
      const violations = checkSafetyViolations(combinedSubstances, isHeated, to.temperature_c);
      const criticalViolation = violations.find(v => v.level === 'CRITICAL');
      if (criticalViolation) {
        set({ globalWarning: get().language === 'en' ? criticalViolation.message_en : criticalViolation.message_vi });
      }

      const transferredOrganic = from.immiscibleOrganicVolume_ml
        ? Math.min(from.immiscibleOrganicVolume_ml, pouredAmount_ml)
        : 0;
      const newToOrganicVol = (to.immiscibleOrganicVolume_ml || 0) + transferredOrganic;
      const newToOrganicColor = from.immiscibleOrganicColor || to.immiscibleOrganicColor;
      const isPulverizedTo = to.isPulverized || from.isPulverized;

      const transferredPrecipitate = from.hasPrecipitate || (from.precipitateAmount_g || 0) > 0;
      const combinedPrecipitateG = (to.precipitateAmount_g || 0) + (from.precipitateAmount_g || (from.hasPrecipitate ? 1.5 : 0));
      const combinedPrecipitateSub = from.precipitateSubstance || to.precipitateSubstance;
      const combinedPrecipitateCol = from.precipitateColor || to.precipitateColor;

      // Calculate transferred contents and remaining source contents based on volume fraction
      const fromVol = Math.max(0.001, from.volume_ml);
      const pouredFraction = Math.min(1.0, accepted_ml / fromVol);
      const transferredContents: typeof from.contents = [];
      const remainingFromContents: typeof from.contents = [];

      for (const item of (from.contents || [])) {
        const tMoles = item.moles * pouredFraction;
        const tMass = item.mass_g * pouredFraction;
        const rMoles = Math.max(0, item.moles - tMoles);
        const rMass = Math.max(0, item.mass_g - tMass);

        if (tMoles > 1e-6) {
          transferredContents.push({
            ...item,
            moles: tMoles,
            mass_g: tMass,
            volume_ml: item.volume_ml ? item.volume_ml * pouredFraction : undefined
          });
        }
        if (rMoles > 1e-6) {
          remainingFromContents.push({
            ...item,
            moles: rMoles,
            mass_g: rMass,
            volume_ml: item.volume_ml ? item.volume_ml * (1 - pouredFraction) : undefined
          });
        }
      }

      // Combine into recipient contents
      const combinedContents = (to.contents || []).map(c => ({ ...c }));
      for (const item of transferredContents) {
        const existing = combinedContents.find(c => c.formula === item.formula);
        if (existing) {
          existing.moles += item.moles;
          existing.mass_g += item.mass_g;
          if (item.volume_ml) {
            existing.volume_ml = (existing.volume_ml || 0) + item.volume_ml;
          }
        } else {
          combinedContents.push({ ...item });
        }
      }

      // Calculate remaining source container state
      const remainingFromVol = Math.max(0, from.volume_ml - accepted_ml);
      const updatedFrom: VesselState = remainingFromVol <= 0.05 ? {
        ...from,
        substances: [],
        contents: [],
        volume: 0,
        volume_ml: 0,
        immiscibleOrganicVolume_ml: 0,
        immiscibleOrganicColor: undefined,
        isPulverized: false,
        mass_g: 0,
        density_g_ml: 1.0,
        foam_ml: 0,
        liquidColor: undefined,
        hasPrecipitate: false,
        precipitateColor: undefined,
        precipitateSubstance: undefined,
        precipitateAmount_g: 0,
        isBoiling: false,
        hasGas: false,
        gasColor: undefined,
        isExplosion: false
      } : {
        ...from,
        volume_ml: remainingFromVol,
        volume: Math.min(1.0, remainingFromVol / from.capacity_ml),
        contents: remainingFromContents,
        substances: remainingFromContents.filter(c => c.moles > 1e-6 && c.formula !== 'H2O').map(c => c.formula),
        mass_g: Math.max(0, (from.mass_g || 0) - acceptedMass_g)
      };

      // 1. Try multi-step stoichiometric chemistry engine first
      const targetTemp = isHeated ? 75 : Math.round((from.temperature_c + to.temperature_c) / 2);
      const multiStep = executeMultiStepReactions(
        combinedContents,
        combinedSubstances,
        newToVolume_ml,
        targetTemp,
        isHeated,
        get().language
      );

      if (multiStep.reactionsOccurred.length > 0 && multiStep.combinedMixResult) {
        const localResult = multiStep.combinedMixResult;
        const primaryRx = multiStep.reactionsOccurred[0];

        if (multiStep.isExplosion) {
          vfxBus.emit('explosion', {
            vesselId: toId,
            position: to.position,
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
          vesselId: toId,
          reactionId: primaryRx.reactionId,
          startTime: Date.now(),
          duration: vfxRecipe?.duration || (multiStep.isExplosion ? 2.2 : 5.0),
          progress: 0,
          reactionName: localResult.summary,
          equation: localResult.equation,
          initialLiquidColor: to.liquidColor || from.liquidColor || '#38bdf8',
          targetLiquidColor: multiStep.finalLiquidColor || from.liquidColor || to.liquidColor || '#38bdf8',
          hasGas: multiStep.hasGas,
          gasColor: multiStep.gasColor,
          hasPrecipitate: multiStep.hasPrecipitate || transferredPrecipitate || to.hasPrecipitate,
          precipitateColor: multiStep.precipitateColor || combinedPrecipitateCol,
          precipitateSubstance: multiStep.precipitateSubstance || combinedPrecipitateSub,
          dissolvingReactants: extractDissolvingReactants(combinedSubstances),
          targetTemp: multiStep.finalTemperature_c
        };

        const updatedTo: VesselState = {
          ...to,
          substances: multiStep.updatedSubstances,
          contents: multiStep.updatedContents,
          volume_ml: newToVolume_ml,
          immiscibleOrganicVolume_ml: newToOrganicVol,
          immiscibleOrganicColor: newToOrganicColor,
          isPulverized: isPulverizedTo,
          precipitateMorphology: isPulverizedTo ? 'POWDER' : (to.precipitateMorphology || from.precipitateMorphology),
          mass_g: newToMass_g,
          density_g_ml: newToDensity,
          volume: Math.min(1.0, newToVolume_ml / to.capacity_ml),
          liquidColor: multiStep.finalLiquidColor || to.liquidColor || from.liquidColor,
          hasPrecipitate: multiStep.hasPrecipitate || transferredPrecipitate || to.hasPrecipitate,
          precipitateColor: multiStep.precipitateColor || combinedPrecipitateCol,
          precipitateSubstance: multiStep.precipitateSubstance || combinedPrecipitateSub,
          precipitateAmount_g: multiStep.precipitateAmount_g ?? (combinedPrecipitateG > 0 ? combinedPrecipitateG : undefined),
          isBoiling: multiStep.isBoiling,
          hasGas: multiStep.hasGas,
          gasColor: multiStep.gasColor,
          isExplosion: multiStep.isExplosion,
          temperature_c: multiStep.finalTemperature_c,
          ph: multiStep.finalPh
        };

        set(s => {
          const updated = { ...s.vessels, [fromId]: updatedFrom, [toId]: updatedTo };
          const activeKinetics = { ...s.activeKinetics, [toId]: kineticsItem };
          pushHistorySnapshot('POUR', updated, s.burners, `Poured ${from.name} into ${to.name}`, `Đã rót ${from.name} vào ${to.name}`);
          debounceSaveLocalState(updated, s.burners);
          return {
            lastMixResult: localResult,
            vessels: updated,
            activeKinetics,
            rightSidebarOpen: true,
            selectedVesselId: toId,
            canUndo: checkCanUndo(),
            canRedo: checkCanRedo()
          };
        });
        return;
      }

      // 2. Resolve program via 5-tier resolution pipeline and apply Conservation Ledger
      set({ isMixing: true, mixError: null });
      try {
        const { program: resolvedProgram } = await resolveReactionProgram(
          combinedSubstances,
          combinedContents,
          { isHeated, volume_ml: newToVolume_ml, lang: get().language }
        );

        const baseTo: VesselState = {
          ...to,
          substances: combinedSubstances,
          contents: combinedContents,
          volume_ml: newToVolume_ml,
          immiscibleOrganicVolume_ml: newToOrganicVol,
          immiscibleOrganicColor: newToOrganicColor,
          isPulverized: isPulverizedTo,
          precipitateMorphology: isPulverizedTo ? 'POWDER' : (to.precipitateMorphology || from.precipitateMorphology),
          mass_g: newToMass_g,
          density_g_ml: newToDensity,
          volume: Math.min(1.0, newToVolume_ml / to.capacity_ml),
          temperature_c: targetTemp,
          hasPrecipitate: transferredPrecipitate || to.hasPrecipitate,
          precipitateAmount_g: combinedPrecipitateG > 0 ? combinedPrecipitateG : undefined,
          precipitateColor: combinedPrecipitateCol,
          precipitateSubstance: combinedPrecipitateSub
        };

        const ledgerResult = applyProgramToLedger(resolvedProgram, baseTo, 1.0);
        const finalContents = ledgerResult.contents || combinedContents;
        const activeSubstances = Array.from(new Set(
          finalContents
            .filter(c => (c.moles || 0) > 1e-6)
            .map(c => c.formula)
            .concat((ledgerResult.hasPrecipitate && ledgerResult.precipitateSubstance) ? [ledgerResult.precipitateSubstance] : (combinedPrecipitateSub ? [combinedPrecipitateSub] : []))
        ));

        const isHazardExplosion = resolvedProgram.chemistry.hazards?.some(h => h.includes('01') || h.includes('02')) || false;

        const updatedTo: VesselState = {
          ...baseTo,
          substances: activeSubstances.length > 0 ? activeSubstances : combinedSubstances,
          contents: finalContents,
          liquidColor: ledgerResult.liquidColor || from.liquidColor || to.liquidColor,
          hasPrecipitate: ledgerResult.hasPrecipitate || transferredPrecipitate || to.hasPrecipitate,
          precipitateColor: ledgerResult.precipitateColor || combinedPrecipitateCol,
          precipitateSubstance: ledgerResult.precipitateSubstance || combinedPrecipitateSub,
          precipitateMorphology: (ledgerResult.precipitateMorphology as any) || (isPulverizedTo ? 'POWDER' : (to.precipitateMorphology || from.precipitateMorphology)),
          precipitateAmount_g: (ledgerResult.precipitateAmount_g && ledgerResult.precipitateAmount_g > 0)
            ? ledgerResult.precipitateAmount_g
            : (combinedPrecipitateG > 0 ? combinedPrecipitateG : undefined),
          isBoiling: ledgerResult.isBoiling ?? false,
          hasGas: ledgerResult.hasGas ?? false,
          gasColor: ledgerResult.gasColor,
          isExplosion: isHazardExplosion,
          temperature_c: ledgerResult.temperature_c ?? targetTemp,
          mass_g: ledgerResult.mass_g ?? baseTo.mass_g,
          internalPressure_atm: ledgerResult.internalPressure_atm ?? baseTo.internalPressure_atm
        };

        const warningMsg = get().language === 'vi' ? resolvedProgram.chemistry.warning_vi : resolvedProgram.chemistry.warning_en;
        if (warningMsg) {
          set({ globalWarning: warningMsg });
        }

        const kineticsItem: ActiveKineticsState = {
          vesselId: toId,
          reactionId: resolvedProgram.id,
          startTime: Date.now(),
          duration: resolvedProgram.visual.duration_s || 5.0,
          progress: 0,
          reactionName: get().language === 'vi' ? resolvedProgram.explain.observation_vi : resolvedProgram.explain.observation_en,
          equation: resolvedProgram.chemistry.equation,
          initialLiquidColor: to.liquidColor || from.liquidColor || '#38bdf8',
          targetLiquidColor: updatedTo.liquidColor || '#38bdf8',
          hasGas: updatedTo.hasGas,
          gasColor: updatedTo.gasColor,
          hasPrecipitate: updatedTo.hasPrecipitate,
          precipitateColor: updatedTo.precipitateColor,
          precipitateSubstance: updatedTo.precipitateSubstance,
          precipitateMorphology: updatedTo.precipitateMorphology,
          dissolvingReactants: extractDissolvingReactants(combinedSubstances),
          targetTemp: updatedTo.temperature_c,
          timeWarp: resolvedProgram.visual.timeWarp,
          program: resolvedProgram
        };

        if (updatedTo.isExplosion) {
          vfxBus.emit('explosion', {
            vesselId: toId,
            position: to.position,
            intensity: 1.0,
            isDangerous: true
          });
          labSound.playExplosion();
          labSound.playAlarm();
        } else if (updatedTo.hasGas || updatedTo.isBoiling) {
          labSound.playFizz();
        }

        set(s => {
          const updated = { ...s.vessels, [fromId]: updatedFrom, [toId]: updatedTo };
          const activeKinetics = { ...s.activeKinetics, [toId]: kineticsItem };
          pushHistorySnapshot('POUR', updated, s.burners, `Poured ${from.name} into ${to.name}`, `Đã rót ${from.name} vào ${to.name}`);
          debounceSaveLocalState(updated, s.burners);
          return {
            lastMixResult: {
              reaction_detected: true,
              summary: kineticsItem.reactionName,
              equation: kineticsItem.equation,
              new_vessel_state: {
                liquid_color: updatedTo.liquidColor,
                has_precipitate: updatedTo.hasPrecipitate,
                precipitate_color: updatedTo.precipitateColor,
                is_boiling: updatedTo.isBoiling,
                has_gas: updatedTo.hasGas,
                gas_color: updatedTo.gasColor,
                is_explosion: updatedTo.isExplosion
              }
            } as unknown as MixResult,
            vessels: updated,
            activeKinetics,
            rightSidebarOpen: true,
            selectedVesselId: toId,
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

    resetWorkbench: () => {
      set({
        vessels: defaultVessels,
        vesselIds: Object.keys(defaultVessels),
        burners: sanitizedBurners,
        burnerIds: Object.keys(sanitizedBurners),
        spills: {},
        wasteMass_g: 0,
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
