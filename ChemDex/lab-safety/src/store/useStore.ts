import { useScenarioSession } from '../scenarios/store';
import { fireSimulation } from '../core/fire/FireSim';
import { SimulationClock } from '../core/simulation/SimulationClock';
import { toolControls } from '../systems/input/toolControls';
import { AnalyticsService } from '../systems/analytics/AnalyticsService';
import { create } from 'zustand';
import { GameState, ViewState, GameMode, PlayerState, Rule, CharacterProfile, SettingsState, MistakeRecord, ErrorBannerData, MistakeId } from '../types';
import { INITIAL_TASKS } from '../data/tasks';
import { SAFETY_RULES } from '../data/rules';
import { soundManager } from '../audio/soundManager';
import { MistakeRegistry } from '../core/MistakeRegistry';

// Shared mutable coordinate store for high-frequency 60Hz Three.js frames
// This completely avoids React tree re-renders per frame!
export const playerCoords = {
  position: [-6.0, 0, 5.8] as [number, number, number],
  rotationY: Math.PI,
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
  graphicsQuality: 'auto',
  musicVolume: 0.6,
  sfxVolume: 0.8,
  voiceVolume: 0.8,
  vibration: true,
  reduceMotion: false,
  largeText: false,
  leftHanded: false,
  cameraSensitivity: 1.0,
  invertY: false,
  safeEffects: false,
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
  cinematic: null,
  startCinematic: (cinematic) => {
    if (get().cinematic || get().view !== 'game') return;
    toolControls.spraying = false;
    set({ cinematic, activeInteraction: null, joystickVec: { x: 0, y: 0 } });
  },
  finishCinematic: () => {
    const cinematic = get().cinematic;
    set(s => ({ cinematic: null, player: cinematic === 'fire'
      ? { ...s.player, flags: { ...s.player.flags, fireIntroSeen: true } } : s.player }));
    get().saveGame();
  },
  activeTool: null,
  selectTool: (tool) => {
    const inv = get().player.inventory;
    if (tool === 'extinguisher' && !get().player.flags.passTrained) { set({ showFireExtinguisherQuiz: true }); return; }
    if (tool && !(tool === 'extinguisher' ? inv.hasFireExtinguisher : tool === 'spillKit' ? inv.hasSweeper : inv.isHoldingTrash)) return;
    toolControls.spraying = false;
    set({ activeTool: tool });
  },
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
  sceneModalCount: 0,
  runState: 'PAUSED',
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
  waterEffect: { active: false, type: 'shower' },
  showMinimap: false,
  isFlashlightOn: false,
  
  character: loadStoredCharacter(),
  settings: loadStoredSettings(),

  player: { equipment: { hasGoggles: false, hasLabCoat: false, hasGloves: false, hasMask: false, hairTied: false, hasClosedShoes: false }, inventory: { hasFireExtinguisher: false, isHoldingTrash: false, heldTrashType: null, hasSweeper: false }, flags: { fireExtinguished: false, trashCount: 0, trash1Picked: false, trash2Picked: false, trash3Picked: false } },

  playerPosition: [0, 0, 3.5],
  playerRotationY: 0,
  isMoving: false,
  joystickVec: { x: 0, y: 0 },

  setJoystickVec: (vec) => set({ joystickVec: vec }),
  setView: (view: ViewState) => set({ view, cinematic: null }),
  setGameMode: (gameMode: GameMode) => set({ gameMode }),

  startGame: () => {
    useScenarioSession.getState().reset();
    fireSimulation.reset(); SimulationClock.reset(); toolControls.spraying = false;
    playerCoords.position = [-4.0, 0, 3.2];
    playerCoords.rotationY = Math.PI;
    playerCoords.isMoving = false;

    set({
      cinematic: null,
      activeTool: null,
      activeRuleDialog: null,
      isDialogActive: false,
      dialogCallback: null,
      view: 'game',
      runState: 'RUNNING',
      startTime: Date.now(),
      score: 100,
      errors: 0,
      mistakes: [],
      tasks: INITIAL_TASKS.map(t => ({ ...t, completed: false })),
      achievements: [],
      playerPosition: [-6.0, 0, 5.8],
      playerRotationY: Math.PI,
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
    playerCoords.position = [-6.0, 0, 5.8];
    playerCoords.rotationY = Math.PI;
    playerCoords.isMoving = false;
    get().saveGame();
  },

  resumeGame: () => {
    try {
      const saved = localStorage.getItem('labSafetySave');
      if (saved) {
        const parsed = JSON.parse(saved);
        useScenarioSession.getState().restore(parsed.scenarioRuns);
        fireSimulation.reset(); SimulationClock.reset(); toolControls.spraying = false;
        const tasks = INITIAL_TASKS.map(task => ({ ...task, completed: !!parsed.tasks?.find((saved: { id: string; completed: boolean }) => saved.id === task.id)?.completed }));
        const currentPhase = parsed.currentPhase >= 5 && !tasks.find(task => task.id === 'task_alcohol_cap')?.completed ? 4 : parsed.currentPhase;
        set({ ...parsed, tasks, currentPhase, cinematic: null, activeTool: null, sceneModalCount: 0, isDialogActive: false, activeRuleDialog: null, showSettings: false, showRulesList: false, showFireExtinguisherQuiz: false, showBandageQuiz: false, showChemicalSymbolsQuiz: false, view: 'game', runState: 'RUNNING' });
        // Spawn player near entrance or checkpoint
        playerCoords.position = [-6.0, 0, 5.8];
        playerCoords.rotationY = Math.PI;
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
      scenarioRuns: useScenarioSession.getState().exportRuns(),
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
    if (get().tasks.find(t => t.id === taskId)?.completed) return;
    soundManager.play('success');
    set((state) => {
      const newTasks = state.tasks.map(t => t.id === taskId ? { ...t, completed: true } : t);
      return { tasks: newTasks };
    });
    get().saveGame();
  },

  addError: (id: MistakeId, ctx?: any) => {
    const entry = MistakeRegistry[id];
    const penalty = ctx?.penalty || entry?.penalty || 5;
    soundManager.play('error');
    
    const ruleTitle = entry?.title || `Lỗi: ${id}`;
    const consequence = entry?.consequence || 'Hành vi vi phạm quy định an toàn phòng lab!';
    const dangerLevel = 'medium';

    set((state) => {
      const newMistakes: MistakeRecord[] = [
        ...state.mistakes,
        {
          id,
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
          id,
          title: ruleTitle,
          consequence,
          dangerLevel,
          timestamp: Date.now()
        }
      };
    });
  },

  dismissErrorBanner: () => set({ activeErrorBanner: null }),

  equipItem: (item: string) => {
    if (item === 'hasFireExtinguisher' && !get().player.flags.passTrained) { set({ showFireExtinguisherQuiz: true }); return; }
    soundManager.play('snap');
    set((state) => {
      const newPlayer = JSON.parse(JSON.stringify(state.player));
      if (item in newPlayer.equipment) {
        newPlayer.equipment[item] = true;
      } else if (item in newPlayer.inventory) {
        newPlayer.inventory[item] = true;
      } else if (item in newPlayer.flags) {
        newPlayer.flags[item] = true;
      }
      if (item === 'hasFireExtinguisher') newPlayer.flags.extinguisherReady = true;
      const tool = item === 'hasFireExtinguisher' ? 'extinguisher' : item === 'hasSweeper' ? 'spillKit' : get().activeTool;
      return { player: newPlayer, activeTool: tool };
    });
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
      soundManager.setSafeEffects(updated.safeEffects || updated.reduceMotion);
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
  setWaterEffect: (waterEffect) => set({ waterEffect }),
  setShowMinimap: (show: boolean) => set({ showMinimap: show }),
  toggleFlashlight: () => {
    soundManager.play('click');
    set((state) => ({ isFlashlightOn: !state.isFlashlightOn }));
  },
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
,
  setRunState: (state: any) => set({ runState: state })
}));
