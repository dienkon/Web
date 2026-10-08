export type ViewState = 'start' | 'game' | 'certificate';
export type GameMode = 'learn' | 'challenge' | 'exam';
export type GameRunState = 'RUNNING' | 'PAUSED';

export type TaskId = 'task_talk' | 'task_rules' | 'task_goggles' | 'task_coat' | 'task_gloves' | 'task_mask' | 'task_hair' | 'task_shoes' | 'task_fire_extinguisher' | 'task_chemical_symbols' | 'task_inspect_acid' | 'task_bandage' | 'task_spill_kit' | 'task_spill_neutralize' | 'task_spill_wipe' | 'task_trash_disposal';
export type PhaseId = 'phase_1' | 'phase_2' | 'phase_3';
export type MistakeId =
  | 'ppe_missing'
  | 'wrong_trash'
  | 'glass_hazard'
  | 'spill_hazard'
  | 'fire_hazard'
  | 'general_error'
  | 'WRONG_EXTINGUISHER'
  | 'WRONG_EXTINGUISHER_ELECTRICAL'
  | 'NO_PIN_PULLED'
  | 'AIM_AT_FLAME_NOT_BASE'
  | 'BAD_DISTANCE'
  | 'NO_ALARM'
  | 'LOST_EXIT_PATH'
  | 'FIGHT_FIRE_TOO_LATE'
  | 'TOUCH_CO2_HORN';

export interface TaskDefinition {
  id: TaskId;
  titleKey: string;
  prerequisites: TaskId[];
  target: { type: string; value: string };
  completion: { condition: string; auto: boolean };
}

export interface PhaseDefinition {
  id: PhaseId;
  title: string;
}

export interface MistakeDefinition {
  id: MistakeId;
  title: string;
  penalty: number;
  consequence: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: 'equip' | 'action' | 'learn';
  requiredItemId?: string;
  phase?: number;
}

export interface Rule {
  id: number;
  title: string;
  description: string;
  dangerLevel: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  why?: string;
  correct?: string;
  wrong?: string;
  consequence?: string;
  category?: 'ppe' | 'chemical' | 'heat' | 'glass' | 'firstaid' | 'waste';
  reviewStatus?: 'draft' | 'needs-review' | 'reviewed';
  sources?: string[];
}

export interface PlayerState {
  equipment: {
    hasGoggles: boolean;
    hasLabCoat: boolean;
    hasGloves: boolean;
    hasMask: boolean;
    hairTied: boolean;
    hasClosedShoes: boolean;
  };
  inventory: {
    hasFireExtinguisher?: boolean;
    isHoldingTrash?: boolean;
    heldTrashType?: 'domestic' | 'chemical' | 'sharps' | null;
    hasSweeper?: boolean;
  };
  flags: {
    fireExtinguished?: boolean;
    trashCount?: number;
    trash1Picked?: boolean;
    trash2Picked?: boolean;
    trash3Picked?: boolean;
  };
}

export interface CharacterProfile {
  name: string;
  gender: 'male' | 'female';
  skinTone: string;
  hairStyle: 'short' | 'ponytail' | 'long' | 'bun' | 'braided';
  hairColor: string;
  shirtColor: string;
}

export interface MistakeRecord {
  id: MistakeId;
  title: string;
  penalty: number;
  consequence: string;
  timestamp: number;
}

export interface ErrorBannerData {
  id: MistakeId;
  title: string;
  consequence: string;
  dangerLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface SettingsState {
  graphicsQuality: 'ultra' | 'high' | 'medium' | 'low' | 'potato' | 'auto';
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  vibration: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  leftHanded: boolean;
  cameraSensitivity: number;
  safeEffects: boolean;
}

export interface GameState {
  view: ViewState;
  gameMode: GameMode;
  score: number;
  errors: number;
  mistakes: MistakeRecord[];
  startTime: number | null;
  endTime: number | null;
  tasks: Task[];
  player: PlayerState;
  character: CharacterProfile;
  settings: SettingsState;
  currentPhase: number;
  runState: GameRunState;
  setRunState: (state: GameRunState) => void;
  achievements: string[];
  
  // UI Panels
  activeRuleDialog: Rule | null;
  activeInteraction: string | null;
  activeErrorBanner: ErrorBannerData | null;
  dialogMessages: string[];
  currentDialogIndex: number;
  isDialogActive: boolean;
  dialogCallback: (() => void) | null;
  showRulesList: boolean;
  showCharacterCreator: boolean;
  showSettings: boolean;
  showFireExtinguisherQuiz: boolean;
  showBandageQuiz: boolean;
  showChemicalSymbolsQuiz: boolean;
  
  // Dynamic screen effects (water spray, chemical splash)
  waterEffect: { active: boolean; type: 'shower' | 'eyewash' | 'acid_splash' };
  setWaterEffect: (effect: { active: boolean; type: 'shower' | 'eyewash' | 'acid_splash' }) => void;
  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;
  
  // Joystick vector for touch
  joystickVec: { x: number; y: number };
  setJoystickVec: (vec: { x: number; y: number }) => void;

  // Actions
  setView: (view: ViewState) => void;
  setGameMode: (mode: GameMode) => void;
  startGame: () => void;
  resumeGame: () => void;
  saveGame: () => void;
  endGame: () => void;
  completeTask: (taskId: string) => void;
  addError: (id: MistakeId, ctx?: any) => void;
  dismissErrorBanner: () => void;
  equipItem: (item: string) => void;
  updateCharacter: (profile: Partial<CharacterProfile>) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  setActiveRuleDialog: (rule: Rule | null) => void;
  setActiveInteraction: (interactionId: string | null) => void;
  checkAchievements: () => void;
  startDialog: (messages: string[], callback?: () => void) => void;
  nextDialog: () => void;
  closeDialog: () => void;
  setShowRulesList: (show: boolean) => void;
  setShowCharacterCreator: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowFireExtinguisherQuiz: (show: boolean) => void;
  setShowBandageQuiz: (show: boolean) => void;
  setShowChemicalSymbolsQuiz: (show: boolean) => void;
  setCurrentPhase: (phase: number) => void;

  // Discrete Player State
  playerPosition: [number, number, number];
  playerRotationY: number;
  isMoving: boolean;
  setPlayerPosition: (pos: [number, number, number]) => void;
  setPlayerRotationY: (rot: number) => void;
  setIsMoving: (isMoving: boolean) => void;
}
