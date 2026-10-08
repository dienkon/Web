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

  player: { equipment: { hasGoggles: false, hasLabCoat: false, hasGloves: false, hasMask: false, hairTied: false, hasClosedShoes: false }, inventory: { hasFireExtinguisher: false, isHoldingTrash: false, heldTrashType: null, hasSweeper: false }, flags: { fireExtinguished: false, trashCount: 0, trash1Picked: false, trash2Picked: false, trash3Picked: false } },

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
      player: { equipment: { hasGoggles: false, hasLabCoat: false, hasGloves: false, hasMask: false, hairTied: false, hasClosedShoes: false }, inventory: { hasFireExtinguisher: false, isHoldingTrash: false, heldTrashType: null, hasSweeper: false }, flags: { fireExtinguished: false, trashCount: 0, trash1Picked: false, trash2Picked: false, trash3Picked: false } }
    });
    get().saveGame();
  },

  resumeGame: () => {
    try {
      const saved = localStorage.getItem('labSafetySave');
      if (saved) {
        const parsed = JSON.parse(saved);
        set({ ...parsed, view: 'game' });
        // Spawn player near checkpoint of current phase
        if (parsed.currentPhase === 1) {
          playerCoords.position = [0, 0, 3.5];
        } else if (parsed.currentPhase === 2) {
          playerCoords.position = [1.5, 0, 2.5]; 
        } else if (parsed.currentPhase === 3) {
          playerCoords.position = [-2.5, 0, 3]; 
        } else {
           playerCoords.position = [0, 0, 3.5];
        }
        playerCoords.rotationY = 0;
        playerCoords.isMoving = false;
      } else {
        get().startGame();
      }
    } catch {
      get().startGame();
    }
  },

  saveGame: () => {
    const state = get();
    if (state.view !== 'game') return; // only save if in game
    const stateToSave = {
      gameMode: state.gameMode,
      score: state.score,
      errors: state.errors,
      mistakes: state.mistakes,
      startTime: state.startTime,
      endTime: state.endTime,
      tasks: state.tasks,
      player: state.player,
      character: state.character,
      settings: state.settings,
      currentPhase: state.currentPhase,
      achievements: state.achievements,
      playerPosition: playerCoords.position,
      playerRotationY: playerCoords.rotationY,
    };
    try {
      localStorage.setItem('labSafetySave', JSON.stringify(stateToSave));
      localStorage.setItem('hasCompletedSafetyTraining', 'true');
    } catch {}
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
      return { tasks: newTasks };
    });
    get().saveGame();
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

  closeDialog: () => {
    soundManager.play('click');
    set((state) => {
      if (state.dialogCallback) {
        const cb = state.dialogCallback;
        setTimeout(() => cb(), 50);
      }
      return { isDialogActive: false, dialogCallback: null };
    });
  },

  setShowRulesList: (show: boolean) => set({ showRulesList: show }),
  setShowCharacterCreator: (show: boolean) => set({ showCharacterCreator: show }),
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  setShowFireExtinguisherQuiz: (show: boolean) => set({ showFireExtinguisherQuiz: show }),
  setShowBandageQuiz: (show: boolean) => set({ showBandageQuiz: show }),
  setShowChemicalSymbolsQuiz: (show: boolean) => set({ showChemicalSymbolsQuiz: show }),
  setCurrentPhase: (phase: number) => {
    set({ currentPhase: phase });
    get().saveGame();
  },

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
