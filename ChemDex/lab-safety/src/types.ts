export type ViewState = 'start' | 'game' | 'certificate';
export type GameMode = 'learn' | 'challenge' | 'exam';

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
}

export interface PlayerState {
  hasGoggles: boolean;
  hasLabCoat: boolean;
  hasGloves: boolean;
  hasMask: boolean;
  hairTied: boolean;
  hasClosedShoes: boolean;
  hasFireExtinguisher?: boolean;
  fireExtinguished?: boolean;
  isHoldingTrash?: boolean;
  heldTrashType?: 'domestic' | 'chemical' | 'sharps' | null;
  hasSweeper?: boolean;
  trashCount?: number;
  trash1Picked?: boolean;
  trash2Picked?: boolean;
  trash3Picked?: boolean;
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
  ruleId: number;
  title: string;
  penalty: number;
  consequence: string;
  timestamp: number;
}

export interface ErrorBannerData {
  ruleId: number;
  title: string;
  consequence: string;
  dangerLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface SettingsState {
  graphicsQuality: 'auto' | 'high' | 'medium' | 'low';
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  vibration: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  leftHanded: boolean;
  cameraSensitivity: number;
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
  
  // Joystick vector for touch
  joystickVec: { x: number; y: number };
  setJoystickVec: (vec: { x: number; y: number }) => void;

  // Actions
  setView: (view: ViewState) => void;
  setGameMode: (mode: GameMode) => void;
  startGame: () => void;
  endGame: () => void;
  completeTask: (taskId: string) => void;
  addError: (ruleId: number, penalty?: number) => void;
  dismissErrorBanner: () => void;
  equipItem: (item: keyof PlayerState) => void;
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
