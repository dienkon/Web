import { VesselState, BurnerState, LabActionHistory } from '../types/chemistry';

const STORAGE_KEY_VESSELS = 'chemlab_vessels_state_v2';
const STORAGE_KEY_BURNERS = 'chemlab_burners_state_v2';
const STORAGE_KEY_HISTORY = 'chemlab_action_history_v2';

export interface PersistedLabState {
  vessels: Record<string, VesselState>;
  burners: Record<string, BurnerState>;
  savedAt: number;
}

// Load locally saved state
export function loadPersistedLabState(): PersistedLabState | null {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage) {
      return null;
    }
    const rawVessels = localStorage.getItem(STORAGE_KEY_VESSELS);
    const rawBurners = localStorage.getItem(STORAGE_KEY_BURNERS);
    if (rawVessels) {
      return {
        vessels: JSON.parse(rawVessels),
        burners: rawBurners ? JSON.parse(rawBurners) : {},
        savedAt: Date.now()
      };
    }
  } catch (e) {
    console.warn('Failed to load local lab state:', e);
  }
  return null;
}

// Debounced local persistence
let saveTimer: any = null;

export function debounceSaveLocalState(
  vessels: Record<string, VesselState>, 
  burners: Record<string, BurnerState>
) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage) return;
      localStorage.setItem(STORAGE_KEY_VESSELS, JSON.stringify(vessels));
      localStorage.setItem(STORAGE_KEY_BURNERS, JSON.stringify(burners));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, 1000);
}

// History stack management for Undo/Redo
const MAX_HISTORY = 30;
let historyStack: LabActionHistory[] = [];
let historyPointer = -1;

export function pushHistorySnapshot(
  action: LabActionHistory['action'],
  vessels: Record<string, VesselState>,
  burners: Record<string, BurnerState>,
  description_en: string,
  description_vi: string
) {
  // If we undid and then did a new action, slice off future
  if (historyPointer < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyPointer + 1);
  }

  const snapshot: LabActionHistory = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    action,
    description_en,
    description_vi,
    snapshot: {
      vessels: JSON.parse(JSON.stringify(vessels)),
      burners: JSON.parse(JSON.stringify(burners))
    }
  };

  historyStack.push(snapshot);
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  } else {
    historyPointer++;
  }
}

export function canUndo(): boolean {
  return historyPointer > 0;
}

export function canRedo(): boolean {
  return historyPointer < historyStack.length - 1;
}

export function stepUndo(): LabActionHistory | null {
  if (!canUndo()) return null;
  historyPointer--;
  return historyStack[historyPointer];
}

export function stepRedo(): LabActionHistory | null {
  if (!canRedo()) return null;
  historyPointer++;
  return historyStack[historyPointer];
}

export function getHistoryList(): LabActionHistory[] {
  return [...historyStack];
}

export function clearHistory() {
  historyStack = [];
  historyPointer = -1;
}
