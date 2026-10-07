import { create } from 'zustand';
import { GameState, ViewState, GameMode, PlayerState, Rule, CharacterProfile, SettingsState, MistakeRecord, ErrorBannerData } from '../types';
import { INITIAL_TASKS } from '../data/tasks';
import { SAFETY_RULES } from '../data/rules';
import { soundManager } from '../audio/soundManager';

// Shared mutable coordinate store for high-frequency 60Hz Three.js frames
// This completely avoids React tree re-renders per frame!
export const playerCoords = {
  position: [0, 0, 3.5] as [number, number, number],
  rotationY: 0,
  isMoving: false,
};

const DEFAULT_CHARACTER: CharacterProfile = {
  name: 'Học Sinh',
  gender: 'female',
  skinTone: '#f7d3ba',
  hairStyle: 'ponytail',
  hairColor: '#2b1d0c',
  shirtColor: '#0ea5b7',
};

const DEFAULT_SETTINGS: SettingsState = {
  graphicsQuality: 'high',
  musicVolume: 0.6,
  sfxVolume: 0.8,
  voiceVolume: 0.8,
  vibration: true,
  reduceMotion: false,
  largeText: false,
  leftHanded: false,
  cameraSensitivity: 1.0,
};

function loadStoredCharacter(): CharacterProfile {
  try {
    const raw = localStorage.getItem('labSafetyCharacter');
    if (raw) return { ...DEFAULT_CHARACTER, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CHARACTER;
}

function loadStoredSettings(): SettingsState {
  try {
    const raw = localStorage.getItem('labSafetySettings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export const useStore = create<GameState>((set, get) => ({
  view: 'start',
  gameMode: 'learn',
  score: 100,
  errors: 0,
  mistakes: [],
  startTime: null,
  endTime: null,
  tasks: INITIAL_TASKS,
  achievements: [],
  currentPhase: 1,
  activeRuleDialog: null,
  activeInteraction: null,
  activeErrorBanner: null,
  dialogMessages: [],
  currentDialogIndex: 0,
  isDialogActive: false,
  dialogCallback: null,
  showRulesList: false,
  showCharacterCreator: false,
  showSettings: false,
  showFireExtinguisherQuiz: false,
  showBandageQuiz: false,
  showChemicalSymbolsQuiz: false,
  
  character: loadStoredCharacter(),
  settings: loadStoredSettings(),

  player: {
    hasGoggles: false,
    hasLabCoat: false,
    hasGloves: false,
    hasMask: false,
    hairTied: false,
    hasClosedShoes: false,
    hasFireExtinguisher: false,
    fireExtinguished: false,
    isHoldingTrash: false,
    heldTrashType: null,
    hasSweeper: false,
    trashCount: 0,
    trash1Picked: false,
    trash2Picked: false,
    trash3Picked: false,
  },

  playerPosition: [0, 0, 3.5],
  playerRotationY: 0,
  isMoving: false,
  joystickVec: { x: 0, y: 0 },

  setJoystickVec: (vec) => set({ joystickVec: vec }),
  setView: (view: ViewState) => set({ view }),
  setGameMode: (gameMode: GameMode) => set({ gameMode }),

  startGame: () => {
    playerCoords.position = [0, 0, 3.5];
    playerCoords.rotationY = 0;
    playerCoords.isMoving = false;

    set({
      view: 'game',
      startTime: Date.now(),
      score: 100,
      errors: 0,
      mistakes: [],
      tasks: INITIAL_TASKS.map(t => ({ ...t, completed: false })),
      achievements: [],
      playerPosition: [0, 0, 3.5],
      playerRotationY: 0,
      isMoving: false,
      currentPhase: 1,
      showRulesList: false,
      showCharacterCreator: false,
      showSettings: false,
      showFireExtinguisherQuiz: false,
      showBandageQuiz: false,
      showChemicalSymbolsQuiz: false,
      activeErrorBanner: null,
      joystickVec: { x: 0, y: 0 },
      player: {
        hasGoggles: false,
        hasLabCoat: false,
        hasGloves: false,
        hasMask: false,
        hairTied: false,
        hasClosedShoes: false,
        hasFireExtinguisher: false,
        fireExtinguished: false,
        isHoldingTrash: false,
        heldTrashType: null,
        hasSweeper: false,
        trashCount: 0,
        trash1Picked: false,
        trash2Picked: false,
        trash3Picked: false,
      }
    });
  },

  endGame: () => {
    try {
      localStorage.setItem('hasCompletedSafetyTraining', 'true');
    } catch {}
    set({ view: 'certificate', endTime: Date.now() });
    get().checkAchievements();
  },

  completeTask: (taskId: string) => {
    soundManager.play('success');
    set((state) => {
      const newTasks = state.tasks.map(t => t.id === taskId ? { ...t, completed: true } : t);
      
      // Auto-advance phase when appropriate
      const phase1Ids = ['task_talk', 'task_rules', 'task_goggles', 'task_coat', 'task_gloves', 'task_mask', 'task_hair', 'task_shoes'];
      const phase2Ids = ['task_fire_extinguisher', 'task_chemical_symbols', 'task_inspect_acid', 'task_bandage'];
      
      let nextPhase = state.currentPhase;
      const allPhase1Done = phase1Ids.every(id => newTasks.find(t => t.id === id)?.completed);
      const allPhase2Done = phase2Ids.every(id => newTasks.find(t => t.id === id)?.completed);

      if (state.currentPhase === 1 && allPhase1Done) {
        nextPhase = 2;
      } else if (state.currentPhase === 2 && allPhase2Done) {
        nextPhase = 3;
      }

      return { tasks: newTasks, currentPhase: nextPhase };
    });
  },

  addError: (ruleId: number, penalty: number = 5) => {
    soundManager.play('error');
    const rule = SAFETY_RULES.find(r => r.id === ruleId);
    const ruleTitle = rule ? rule.title : `Quy tắc #${ruleId}`;
    const consequence = rule?.consequence || 'Hành vi vi phạm quy định an toàn phòng lab!';
    const dangerLevel = rule?.dangerLevel || 'medium';

    set((state) => {
      const newMistakes: MistakeRecord[] = [
        ...state.mistakes,
        {
          ruleId,
          title: ruleTitle,
          penalty,
          consequence,
          timestamp: Date.now()
        }
      ];

      return {
        errors: state.errors + 1,
        score: Math.max(0, state.score - penalty),
        mistakes: newMistakes,
        activeErrorBanner: {
          ruleId,
          title: ruleTitle,
          consequence,
          dangerLevel,
          timestamp: Date.now()
        }
      };
    });
  },

  dismissErrorBanner: () => set({ activeErrorBanner: null }),

  equipItem: (item: keyof PlayerState) => {
    soundManager.play('snap');
    set((state) => ({
      player: { ...state.player, [item]: true }
    }));
  },

  updateCharacter: (profile: Partial<CharacterProfile>) => {
    set((state) => {
      const updated = { ...state.character, ...profile };
      try {
        localStorage.setItem('labSafetyCharacter', JSON.stringify(updated));
      } catch {}
      return { character: updated };
    });
  },

  updateSettings: (settings: Partial<SettingsState>) => {
    set((state) => {
      const updated = { ...state.settings, ...settings };
      try {
        localStorage.setItem('labSafetySettings', JSON.stringify(updated));
      } catch {}
      soundManager.setVolumes(updated.sfxVolume, updated.musicVolume);
      return { settings: updated };
    });
  },

  setActiveRuleDialog: (rule: Rule | null) => set({ activeRuleDialog: rule }),
  setActiveInteraction: (interactionId: string | null) => set({ activeInteraction: interactionId }),

  checkAchievements: () => set((state) => {
    const newAch = [...state.achievements];
    if (state.errors === 0 && !newAch.includes('Không mắc lỗi')) newAch.push('Không mắc lỗi');
    if (state.score >= 95 && !newAch.includes('Xuất sắc')) newAch.push('Xuất sắc');
    
    const timeSpent = state.endTime && state.startTime ? (state.endTime - state.startTime) / 1000 : 0;
    if (timeSpent > 0 && timeSpent < 600 && !newAch.includes('Hoàn thành dưới 10 phút')) {
      newAch.push('Hoàn thành dưới 10 phút');
    }
    return { achievements: newAch };
  }),

  startDialog: (messages: string[], callback?: () => void) => set({
    dialogMessages: messages,
    currentDialogIndex: 0,
    isDialogActive: true,
    dialogCallback: callback || null
  }),

  nextDialog: () => {
    soundManager.play('click');
    set((state) => {
      if (state.currentDialogIndex < state.dialogMessages.length - 1) {
        return { currentDialogIndex: state.currentDialogIndex + 1 };
      }
      if (state.dialogCallback) {
        const cb = state.dialogCallback;
        setTimeout(() => cb(), 50);
      }
      return { isDialogActive: false, dialogCallback: null };
    });
  },

  closeDialog: () => set({ isDialogActive: false }),

  setShowRulesList: (show: boolean) => set({ showRulesList: show }),
  setShowCharacterCreator: (show: boolean) => set({ showCharacterCreator: show }),
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  setShowFireExtinguisherQuiz: (show: boolean) => set({ showFireExtinguisherQuiz: show }),
  setShowBandageQuiz: (show: boolean) => set({ showBandageQuiz: show }),
  setShowChemicalSymbolsQuiz: (show: boolean) => set({ showChemicalSymbolsQuiz: show }),
  setCurrentPhase: (phase: number) => set({ currentPhase: phase }),

  setPlayerPosition: (pos: [number, number, number]) => {
    playerCoords.position = pos;
    // Only update discrete React state when needed
  },

  setPlayerRotationY: (rot: number) => {
    playerCoords.rotationY = rot;
  },

  setIsMoving: (isMoving: boolean) => {
    playerCoords.isMoving = isMoving;
    set({ isMoving });
  }
}));
