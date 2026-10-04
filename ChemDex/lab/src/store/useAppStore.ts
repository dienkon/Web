import { create } from 'zustand';
import { MixResult } from '../shared/schemas';
import { CHEMICAL_DATABASE, findChemical } from '../data/chemicals';
import { VesselState, BurnerState, BuretteState, TitrationPoint, VesselType, SpillState, BurnerFlameState } from '../types/chemistry';
import { evaluateLocalChemistry, findPendingReaction, initReactionCache } from '../engine/chemistryEngine';
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

export type Language = 'en' | 'vi';
export type SubstanceType = 'liquid' | 'solid' | 'gas';
export type LabMode = 'free' | 'guided' | 'strict';
export type CameraPreset = 'perspective' | 'top' | 'front' | 'side';

export const CHEMICALS = CHEMICAL_DATABASE;
export const getChemical = (formula: string) => findChemical(formula);

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
  dissolvingReactants: string[];
  targetTemp: number;
}

export interface PendingReactionState {
  vesselId: string;
  equation: string;
  requiredCondition: string;
  minTemp_c: number;
  reactants: string[];
}

export interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;

  globalWarning: string | null;
  setGlobalWarning: (warning: string | null) => void;

  // Lab Mode & Curriculum
  labMode: LabMode;
  setLabMode: (mode: LabMode) => void;
  activeExperimentId: string | null;
  setActiveExperimentId: (id: string | null) => void;
  activeStepIndex: number;
  setActiveStepIndex: (idx: number) => void;
  setupExperimentPreset: (experimentId: string) => void;

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

  stirringVesselId: string | null;
  setStirringVesselId: (id: string | null) => void;

  activeKinetics: Record<string, ActiveKineticsState>;
  pendingReactions: Record<string, PendingReactionState>;
  dissolvingSubstances: Record<string, Record<string, number>>; // vesselId -> substance -> fraction (0..1)
  tickSimulation: (dt: number) => void;

  // Workbench Grid & Tools
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  activeTool: 'none' | 'thermometer' | 'ph_meter' | 'balance' | 'pipette' | 'stirring_rod';
  setActiveTool: (tool: 'none' | 'thermometer' | 'ph_meter' | 'balance' | 'pipette' | 'stirring_rod') => void;
  transferLiquidContinuous: (fromId: string, toId: string | null, delta_ml: number, dropPos?: [number, number, number]) => void;

  // Environmental Mass Conservation & Workbench Spills
  spills: Record<string, SpillState>;
  wasteMass_g: number;
  addSpill: (pos: [number, number, number], volume_ml: number, substances: string[], color: string, sourceName?: string) => void;
  cleanSpills: () => void;

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
    setGlobalWarning: (warning) => set({ globalWarning: warning }),

    labMode: 'free',
    setLabMode: (mode) => set({ labMode: mode }),
    activeExperimentId: null,
    setActiveExperimentId: (id) => set({ activeExperimentId: id, activeStepIndex: 0 }),
    activeStepIndex: 0,
    setActiveStepIndex: (idx) => set({ activeStepIndex: idx }),
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
          contents: [{ formula: 'Pb(NO3)2', moles: 0.03, mass_g: 1.0 }],
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
          contents: [{ formula: 'KI', moles: 0.06, mass_g: 1.0 }],
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
          contents: [{ formula: 'CaCO3', moles: 0.1, mass_g: 10.0 }],
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
          contents: [{ formula: 'HCl', moles: 0.05, mass_g: 1.8 }],
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
          contents: [{ formula: 'H2O', moles: 2.7, mass_g: 50.0 }],
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
          contents: [{ formula: 'Na', moles: 0.04, mass_g: 1.0 }],
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
          contents: [{ formula: 'H2O', moles: 2.7, mass_g: 50.0 }],
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
          contents: [{ formula: 'H2SO4', moles: 0.2, mass_g: 20.0 }],
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

      // Fast exit if simulation state has no ongoing physical or chemical dynamics
      if (!hasActiveKinetics && !hasPendingReactions && !anyBurnerOn && !anyVesselHot && !anyFoam) {
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
      for (const [vId, v] of Object.entries(newVessels)) {
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

        // Newton's law of cooling towards ambient 25°C
        const coolingPower = 0.12 * (v.temperature_c - 25.0);
        const dT = (totalHeatingPower - coolingPower) * effectiveDt;
        const curTemp = Math.max(25.0, Math.min(100.0, v.temperature_c + dT));
        const roundedTemp = Math.round(curTemp * 10) / 10;

        const isBoilingNow = roundedTemp >= 95.0 && v.volume_ml > 0;
        const boilingIntensity = isBoilingNow ? Math.min(1.0, (roundedTemp - 95.0) / 5.0) : 0;

        // Evaporation of liquid mass into vapor
        let currentVol = v.volume_ml;
        let currentMass = v.mass_g || (currentVol * (v.density_g_ml || 1.0));
        let evap_ml = 0;

        if (currentVol > 0) {
          const ambientEvap = 0.003 * effectiveDt * Math.pow(roundedTemp / 100, 2);
          const boilEvap = isBoilingNow ? (0.2 + 0.3 * boilingIntensity) * effectiveDt : 0;
          evap_ml = Math.min(currentVol, ambientEvap + boilEvap);
          if (evap_ml > 0.001) {
            currentVol = Math.max(0, currentVol - evap_ml);
            currentMass = Math.max(0, currentMass - evap_ml * (v.density_g_ml || 1.0));
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
          Math.abs(currentFoam - (v.foam_ml || 0)) > 0.01
        ) {
          newVessels[vId] = {
            ...v,
            temperature_c: roundedTemp,
            isBoiling: isBoilingNow,
            boilingIntensity,
            volume_ml: currentVol,
            mass_g: currentMass,
            volume: Math.min(1.0, currentVol / v.capacity_ml),
            foam_ml: currentFoam,
            evaporated_ml: (v.evaporated_ml || 0) + evap_ml
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
              newKinetics[vId] = {
                vesselId: vId,
                reactionId: localResult.reaction_id,
                startTime: Date.now(),
                duration: 5.0,
                progress: 0,
                reactionName: localResult.summary,
                equation: localResult.equation,
                initialLiquidColor: v.liquidColor || '#f8fafc',
                targetLiquidColor: localResult.new_vessel_state.liquid_color || '#38bdf8',
                hasGas: !!localResult.new_vessel_state.has_gas,
                gasColor: localResult.new_vessel_state.gas_color,
                hasPrecipitate: !!localResult.new_vessel_state.has_precipitate,
                precipitateColor: localResult.new_vessel_state.precipitate_color,
                dissolvingReactants: v.substances.filter(s => ['Cu(OH)2', 'Cu', 'Fe', 'CaCO3', 'Zn'].includes(s)),
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

        // Gas evolution generates rising foam
        let updatedFoam = v.foam_ml || 0;
        if (kinetics.hasGas && newProgress < 0.85) {
          const foamGenRate = 14.0 * (1.0 - newProgress);
          updatedFoam += foamGenRate * effectiveDt;

          // Reaction foam overflow check!
          if (v.volume_ml + updatedFoam > v.capacity_ml) {
            const overflowFoam = (v.volume_ml + updatedFoam) - v.capacity_ml;
            updatedFoam = v.capacity_ml - v.volume_ml;
            get().addSpill(
              v.position,
              overflowFoam,
              v.substances,
              kinetics.targetLiquidColor || v.liquidColor || '#ffffff',
              v.name
            );
          }
        }

        // Dissolve solid reactants progressively
        if (kinetics.dissolvingReactants.length > 0) {
          if (!newDissolving[vId]) newDissolving[vId] = {};
          for (const sub of kinetics.dissolvingReactants) {
            newDissolving[vId][sub] = Math.min(1.0, (newDissolving[vId][sub] || 0) + (effectiveDt / kinetics.duration));
          }
        }

        // Continuous real-time precipitate mass accumulation & nucleation
        let curPrecipAmount_g = v.precipitateAmount_g || 0;
        if (kinetics.hasPrecipitate) {
          const targetPrecipMass = 0.85;
          const tNorm = Math.max(0, Math.min(1.0, (newProgress - 0.08) / 0.85));
          const precipCurve = tNorm * tNorm * (3 - 2 * tNorm);
          curPrecipAmount_g = targetPrecipMass * precipCurve;
        }

        newVessels[vId] = {
          ...v,
          hasGas: kinetics.hasGas && newProgress < 0.95,
          gasColor: kinetics.gasColor,
          hasPrecipitate: kinetics.hasPrecipitate && curPrecipAmount_g > 0.01,
          precipitateColor: kinetics.precipitateColor,
          precipitateAmount_g: curPrecipAmount_g,
          foam_ml: updatedFoam
        };
        vesselsUpdated = true;

        if (newProgress >= 1.0) {
          newVessels[vId] = {
            ...newVessels[vId],
            liquidColor: kinetics.targetLiquidColor,
            hasPrecipitate: kinetics.hasPrecipitate,
            precipitateColor: kinetics.precipitateColor,
            precipitateAmount_g: kinetics.hasPrecipitate ? (v.precipitateAmount_g || 0.85) : 0,
            hasGas: false
          };
          delete newKinetics[vId];
        }
      }

      const kineticsCountChanged = Object.keys(newKinetics).length !== Object.keys(state.activeKinetics).length;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const shouldCommit = kineticsCountChanged || (now - _lastSimulationCommitTime >= 100);

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
          newSpills[id] = {
            id,
            position: [pos[0], -0.132, pos[2]],
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
        return { spills: newSpills };
      });
    },
    cleanSpills: () => {
      const currentSpills = Object.values(get().spills);
      if (currentSpills.length === 0) return;
      const cleanedMass = currentSpills.reduce((sum, sp) => sum + sp.mass_g, 0);
      import('../utils/audio').then(({ labSound }) => {
        labSound.playPour?.(0.3);
      });
      set(s => ({
        spills: {},
        wasteMass_g: (s.wasteMass_g || 0) + cleanedMass
      }));
    },

    vessels: sanitizedVessels,
    vesselIds: Object.keys(sanitizedVessels),
    setVesselState: (id, state) => {
      set(s => {
        if (!s.vessels[id]) return s;
        const updated = { ...s.vessels, [id]: { ...s.vessels[id], ...state } };
        debounceSaveLocalState(updated, s.burners);
        return { vessels: updated };
      });
    },

    addVessel: (type, customName) => {
      const id = `${type}_${Date.now()}`;
      const name = customName || `${type === 'beaker' ? 'Beaker' : type === 'flask' ? 'Flask' : type === 'cylinder' ? 'Cylinder' : 'Test Tube'} ${Object.keys(get().vessels).length + 1}`;
      const capacity_ml = type === 'flask' ? 250 : (type === 'beaker' ? 100 : (type === 'cylinder' ? 100 : 50));
      
      const count = Object.keys(get().vessels).length;
      const x = ((count % 5) - 2) * 1.5;
      const z = (Math.floor(count / 5) - 0.5) * 1.2;

      set(s => {
        const newVessel: VesselState = {
          id,
          name,
          type,
          capacity_ml,
          position: [x, -0.135, z],
          rotationY: 0,
          isLocked: false,
          substances: [],
          contents: [],
          volume: 0,
          volume_ml: 0,
          mass_g: 0,
          density_g_ml: 1.0,
          foam_ml: 0,
          temperature_c: 25,
          ph: 7.0,
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
      const newId = `${source.type}_${Date.now()}`;
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
      import('../utils/audio').then(({ labSound }) => { labSound.enabled = next; });
    },

    pendingDispense: null,
    setPendingDispense: (val) => set({ pendingDispense: val }),

    activeLitmusVesselId: null,
    setActiveLitmusVesselId: (id) => set({ activeLitmusVesselId: id }),

    stirVessel: (id) => {
      const v = get().vessels[id];
      if (!v || v.substances.length === 0) return;
      import('../utils/audio').then(({ labSound }) => labSound.playStir());
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
    setIsDraggingChemical: (chem) => set({ isDraggingChemical: chem }),

    pouringChemical: null,
    triggerPour: (chemical, targetId, amount) => {
      const chemData = findChemical(chemical);
      set({ pouringChemical: { chemical, targetId, type: chemData.type, amount } });
    },
    clearPour: () => {
      const pouring = get().pouringChemical;
      if (pouring) {
        const amt = pouring.amount !== undefined ? pouring.amount : (pouring.type === 'solid' ? 2 : 20);
        get().mixSubstances(pouring.targetId, pouring.chemical, amt);
      }
      set({ pouringChemical: null });
    },

    vesselPourAnimation: null,
    startVesselPourAnimation: (fromId: string, toId: string) => {
      const from = get().vessels[fromId];
      const to = get().vessels[toId];
      if (!from || !to || from.substances.length === 0 || from.volume_ml <= 0) return;
      import('../utils/audio').then(({ labSound }) => labSound.playPour());
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
            import('../utils/audio').then(({ labSound }) => {
              labSound.playExplosion();
              labSound.playAlarm();
            });
          } else if (localResult.is_dangerous) {
            import('../utils/audio').then(({ labSound }) => labSound.playAlarm());
          }

          const kineticsItem: ActiveKineticsState = {
            vesselId: toId,
            reactionId: localResult.reaction_id,
            startTime: Date.now(),
            duration: localResult.new_vessel_state.is_explosion ? 2.2 : 4.5,
            progress: 0,
            reactionName: localResult.summary,
            equation: localResult.equation,
            initialLiquidColor: to.liquidColor || '#38bdf8',
            targetLiquidColor: localResult.new_vessel_state.liquid_color || to.liquidColor || '#38bdf8',
            hasGas: !!localResult.new_vessel_state.has_gas,
            gasColor: localResult.new_vessel_state.gas_color,
            hasPrecipitate: !!localResult.new_vessel_state.has_precipitate,
            precipitateColor: localResult.new_vessel_state.precipitate_color,
            dissolvingReactants: combinedSubstances.filter(s => ['Cu(OH)2', 'Cu', 'Fe', 'CaCO3', 'Zn', 'BaSO4', 'NaCl'].includes(s)),
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
    setHoveredVesselId: (id) => set({ hoveredVesselId: id }),

    nearestPourTargetId: null,
    setNearestPourTargetId: (id) => set({ nearestPourTargetId: id }),

    draggingVesselId: null,
    setDraggingVesselId: (id) => set({ draggingVesselId: id }),
    updateVesselPosition: (id, pos) => set(s => {
      if (!s.vessels[id] || s.vessels[id].isLocked) return s;
      let finalPos = pos;
      if (s.snapToGrid) {
        finalPos = [
          Math.round(pos[0] * 2) / 2,
          pos[1],
          Math.round(pos[2] * 2) / 2
        ];
      }
      const updated = {
        ...s.vessels,
        [id]: { ...s.vessels[id], position: finalPos }
      };
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

      const newSubstances = [...vessel.substances, newChemical];

      // Update contents tracking
      const existingContents = [...(vessel.contents || [])];
      const existingItem = existingContents.find(c => c.formula === newChemical);
      if (existingItem) {
        existingItem.mass_g += acceptedMass_g;
        if (!isSolid) {
          existingItem.volume_ml = (existingItem.volume_ml || 0) + accepted_ml;
        }
      } else {
        existingContents.push({
          formula: newChemical,
          moles: acceptedMass_g / (chemData.molarMass || 100),
          mass_g: acceptedMass_g,
          volume_ml: !isSolid ? accepted_ml : 0
        });
      }

      // Check safety rules immediately
      const safetyViolations = checkSafetyViolations(newSubstances, isHeated, vessel.temperature_c);
      const criticalViolation = safetyViolations.find(v => v.level === 'CRITICAL');
      if (criticalViolation) {
        set({ globalWarning: get().language === 'en' ? criticalViolation.message_en : criticalViolation.message_vi });
      }

      // Trigger realistic procedural audio
      if (chemData.type === 'solid') {
        import('../utils/audio').then(({ labSound }) => labSound.playPowder());
      } else {
        import('../utils/audio').then(({ labSound }) => labSound.playPour());
      }

      // Determine liquid color: only set if actual liquid solvent is present!
      const hasLiquidInVessel = newTotalVolume_ml > 0.05 && (
        newSubstances.some(sub => findChemical(sub)?.type !== 'solid') || !isSolid
      );
      const newLiquidColor = hasLiquidInVessel 
        ? (vessel.liquidColor || (!isSolid ? chemData.color : undefined))
        : undefined;

      // 1. Check if reaction requires conditions (e.g. heating by burner) that are not yet met
      const pendingCondition = findPendingReaction(newSubstances, vessel.temperature_c, isHeated, get().language);
      if (pendingCondition) {
        const updatedVessel: VesselState = {
          ...vessel,
          substances: newSubstances,
          contents: existingContents,
          volume_ml: newTotalVolume_ml,
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

      // 2. Try local deterministic chemistry engine first (Instant & completely offline)
      const localResult = evaluateLocalChemistry(
        newSubstances, 
        newTotalVolume_ml, 
        vessel.temperature_c, 
        isHeated, 
        get().language
      );

      if (localResult) {
        if (localResult.new_vessel_state?.is_explosion) {
          vfxBus.emit('explosion', {
            vesselId: targetId,
            position: vessel.position,
            intensity: 1.0,
            isDangerous: true
          });
          import('../utils/audio').then(({ labSound }) => {
            labSound.playExplosion();
            labSound.playAlarm();
          });
        } else if (localResult.new_vessel_state?.has_gas || localResult.new_vessel_state?.is_boiling) {
          import('../utils/audio').then(({ labSound }) => labSound.playFizz());
        } else if (localResult.is_dangerous) {
          import('../utils/audio').then(({ labSound }) => labSound.playAlarm());
        }

        // Initialize gradual reaction kinetics (real-time kinetics over 4.5 seconds)
        const kineticsItem: ActiveKineticsState = {
          vesselId: targetId,
          reactionId: localResult.reaction_id,
          startTime: Date.now(),
          duration: 4.5,
          progress: 0,
          reactionName: localResult.summary,
          equation: localResult.equation,
          initialLiquidColor: vessel.liquidColor || chemData.color,
          targetLiquidColor: localResult.new_vessel_state.liquid_color || vessel.liquidColor || chemData.color,
          hasGas: !!localResult.new_vessel_state.has_gas,
          gasColor: localResult.new_vessel_state.gas_color,
          hasPrecipitate: !!localResult.new_vessel_state.has_precipitate,
          precipitateColor: localResult.new_vessel_state.precipitate_color,
          dissolvingReactants: newSubstances.filter(s => ['Cu(OH)2', 'Cu', 'Fe', 'CaCO3', 'Zn', 'BaSO4', 'NaCl'].includes(s)),
          targetTemp: localResult.new_vessel_state.is_boiling ? 100 : (localResult.is_dangerous ? 75 : (isHeated ? Math.min(95, vessel.temperature_c + 20) : vessel.temperature_c))
        };

        // Calculate updated vessel state
        const updatedVessel: VesselState = {
          ...vessel,
          substances: newSubstances,
          contents: existingContents,
          volume_ml: newTotalVolume_ml,
          mass_g: newTotalMass_g,
          density_g_ml: newDensity,
          volume: Math.min(1.0, newTotalVolume_ml / vessel.capacity_ml),
          liquidColor: newLiquidColor,
          hasPrecipitate: false, // will appear as kinetics progresses
          precipitateColor: localResult.new_vessel_state.precipitate_color,
          precipitateAmount_g: 0,
          isBoiling: localResult.new_vessel_state.is_boiling,
          hasGas: localResult.new_vessel_state.has_gas,
          gasColor: localResult.new_vessel_state.gas_color,
          isExplosion: localResult.new_vessel_state.is_explosion,
          temperature_c: localResult.new_vessel_state.is_boiling ? 100 : (localResult.is_dangerous ? 75 : (isHeated ? Math.min(95, vessel.temperature_c + 20) : vessel.temperature_c)),
          ph: chemData.ph !== undefined ? chemData.ph : vessel.ph
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

      // 2. Fallback to API if not in deterministic local list
      set({ isMixing: true, mixError: null });
      try {
        const res = await fetch('/api/experiment/mix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            substances: newSubstances, 
            volume: (newTotalVolume_ml / 100), 
            lang: get().language, 
            isHeated 
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to mix');
        const result = data as MixResult;

        if (result.warning_message) {
          set({ globalWarning: result.warning_message });
        }

        const updatedVessel: VesselState = {
          ...vessel,
          substances: newSubstances,
          volume_ml: newTotalVolume_ml,
          volume: Math.min(1.0, newTotalVolume_ml / vessel.capacity_ml),
          liquidColor: result.new_vessel_state.liquid_color || chemData.color,
          hasPrecipitate: result.new_vessel_state.has_precipitate,
          precipitateColor: result.new_vessel_state.precipitate_color,
          isBoiling: result.new_vessel_state.is_boiling,
          hasGas: result.new_vessel_state.has_gas,
          gasColor: result.new_vessel_state.gas_color,
          isExplosion: result.new_vessel_state.is_explosion,
          temperature_c: isHeated ? 80 : vessel.temperature_c
        };

        set(s => {
          const updated = { ...s.vessels, [targetId]: updatedVessel };
          pushHistorySnapshot('POUR', updated, s.burners, `Added ${newChemical} to ${vessel.name}`, `Đã thêm ${newChemical} vào ${vessel.name}`);
          debounceSaveLocalState(updated, s.burners);
          return {
            lastMixResult: result,
            vessels: updated,
            rightSidebarOpen: true,
            selectedVesselId: targetId,
            canUndo: checkCanUndo(),
            canRedo: checkCanRedo()
          };
        });
      } catch (e: any) {
        set({ mixError: e.message });
        // Smooth local state update even if API fails or is offline!
        set(s => {
          const updatedVessel: VesselState = {
            ...vessel,
            substances: newSubstances,
            volume_ml: newTotalVolume_ml,
            volume: Math.min(1.0, newTotalVolume_ml / vessel.capacity_ml),
            liquidColor: chemData.color || vessel.liquidColor
          };
          const updated = { ...s.vessels, [targetId]: updatedVessel };
          debounceSaveLocalState(updated, s.burners);
          return { vessels: updated };
        });
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

      import('../utils/audio').then(({ labSound }) => labSound.playPour());

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

      // Empty source container
      const emptiedFrom: VesselState = {
        ...from,
        substances: [],
        contents: [],
        volume: 0,
        volume_ml: 0,
        mass_g: 0,
        density_g_ml: 1.0,
        foam_ml: 0,
        liquidColor: undefined,
        hasPrecipitate: false,
        precipitateColor: undefined,
        isBoiling: false,
        hasGas: false,
        gasColor: undefined,
        isExplosion: false
      };

      // 1. Try local engine first
      const localResult = evaluateLocalChemistry(combinedSubstances, newToVolume_ml, to.temperature_c, isHeated, get().language);
      if (localResult) {
        if (localResult.new_vessel_state?.is_explosion) {
          vfxBus.emit('explosion', {
            vesselId: toId,
            position: to.position,
            intensity: 1.0,
            isDangerous: true
          });
          import('../utils/audio').then(({ labSound }) => {
            labSound.playExplosion();
            labSound.playAlarm();
          });
        }

        const kineticsItem: ActiveKineticsState = {
          vesselId: toId,
          reactionId: localResult.reaction_id,
          startTime: Date.now(),
          duration: localResult.new_vessel_state.is_explosion ? 2.2 : 4.5,
          progress: 0,
          reactionName: localResult.summary,
          equation: localResult.equation,
          initialLiquidColor: to.liquidColor || from.liquidColor || '#38bdf8',
          targetLiquidColor: localResult.new_vessel_state.liquid_color || from.liquidColor || to.liquidColor || '#38bdf8',
          hasGas: !!localResult.new_vessel_state.has_gas,
          gasColor: localResult.new_vessel_state.gas_color,
          hasPrecipitate: !!localResult.new_vessel_state.has_precipitate,
          precipitateColor: localResult.new_vessel_state.precipitate_color,
          dissolvingReactants: combinedSubstances.filter(s => ['Cu(OH)2', 'Cu', 'Fe', 'CaCO3', 'Zn', 'BaSO4', 'NaCl'].includes(s)),
          targetTemp: isHeated ? 75 : Math.round((from.temperature_c + to.temperature_c) / 2)
        };

        const updatedTo: VesselState = {
          ...to,
          substances: combinedSubstances,
          volume_ml: newToVolume_ml,
          mass_g: newToMass_g,
          density_g_ml: newToDensity,
          volume: Math.min(1.0, newToVolume_ml / to.capacity_ml),
          liquidColor: to.liquidColor || from.liquidColor,
          hasPrecipitate: false,
          precipitateColor: localResult.new_vessel_state.precipitate_color,
          isBoiling: localResult.new_vessel_state.is_boiling,
          hasGas: localResult.new_vessel_state.has_gas,
          gasColor: localResult.new_vessel_state.gas_color,
          isExplosion: localResult.new_vessel_state.is_explosion,
          temperature_c: isHeated ? 75 : Math.round((from.temperature_c + to.temperature_c) / 2)
        };

        set(s => {
          const updated = { ...s.vessels, [fromId]: emptiedFrom, [toId]: updatedTo };
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

      // 2. Fallback to API if not in deterministic list
      set({ isMixing: true, mixError: null });
      try {
        const res = await fetch('/api/experiment/mix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            substances: combinedSubstances, 
            volume: (newToVolume_ml / 100), 
            lang: get().language, 
            isHeated 
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to mix');
        const result = data as MixResult;

        if (result.warning_message) {
          set({ globalWarning: result.warning_message });
        }

        const updatedTo: VesselState = {
          ...to,
          substances: combinedSubstances,
          volume_ml: newToVolume_ml,
          mass_g: newToMass_g,
          density_g_ml: newToDensity,
          volume: Math.min(1.0, newToVolume_ml / to.capacity_ml),
          liquidColor: result.new_vessel_state.liquid_color || from.liquidColor || to.liquidColor,
          hasPrecipitate: result.new_vessel_state.has_precipitate,
          precipitateColor: result.new_vessel_state.precipitate_color,
          isBoiling: result.new_vessel_state.is_boiling,
          hasGas: result.new_vessel_state.has_gas,
          gasColor: result.new_vessel_state.gas_color,
          isExplosion: result.new_vessel_state.is_explosion
        };

        set(s => {
          const updated = { ...s.vessels, [fromId]: emptiedFrom, [toId]: updatedTo };
          pushHistorySnapshot('POUR', updated, s.burners, `Poured ${from.name} into ${to.name}`, `Đã rót ${from.name} vào ${to.name}`);
          debounceSaveLocalState(updated, s.burners);
          return {
            lastMixResult: result,
            vessels: updated,
            rightSidebarOpen: true,
            selectedVesselId: toId,
            canUndo: checkCanUndo(),
            canRedo: checkCanRedo()
          };
        });
      } catch (e: any) {
        set({ mixError: e.message });
        const updatedTo: VesselState = {
          ...to,
          substances: combinedSubstances,
          volume_ml: newToVolume_ml,
          mass_g: newToMass_g,
          density_g_ml: newToDensity,
          volume: Math.min(1.0, newToVolume_ml / to.capacity_ml),
          liquidColor: from.liquidColor || to.liquidColor
        };
        set(s => {
          const updated = { ...s.vessels, [fromId]: emptiedFrom, [toId]: updatedTo };
          debounceSaveLocalState(updated, s.burners);
          return { vessels: updated };
        });
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
