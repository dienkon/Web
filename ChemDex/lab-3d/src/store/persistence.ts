import { VesselState, BurnerState, LabActionHistory, LabMaterialSnapshot } from '../types/chemistry';
import { normalizeSpillFootprints } from '../engine/spillInventory';
import { capturePhysicalLab } from '../physical/usePhysicsStore';

const STORAGE_KEY_VESSELS = 'chemlab_vessels_state_v2';
const STORAGE_KEY_BURNERS = 'chemlab_burners_state_v2';
const STORAGE_KEY_HISTORY = 'chemlab_action_history_v2';
const STORAGE_KEY_PHYSICAL = 'chemlab_physical_state_v4';
const STORAGE_KEY_PHYSICAL_LEGACY = 'chemlab_physical_state_v3';

export interface PersistedLabState {
  vessels: Record<string, VesselState>;
  burners: Record<string, BurnerState>;
  savedAt: number;
  materials?: LabMaterialSnapshot;
}

// Load locally saved state
export function loadPersistedLabState(): PersistedLabState | null {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage) {
      return null;
    }
    const physical = localStorage.getItem(STORAGE_KEY_PHYSICAL) ?? localStorage.getItem(STORAGE_KEY_PHYSICAL_LEGACY);
    if (physical) {
      const parsed = JSON.parse(physical) as PersistedLabState;
      if (parsed.vessels && parsed.burners) {
        if (parsed.materials?.spills) parsed.materials.spills = normalizeSpillFootprints(parsed.materials.spills);
        return parsed;
      }
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

const SAVE_IDLE_MS = 1000;
const SAVE_MAX_WAIT_MS = 5000;
let idleSave: ReturnType<typeof setTimeout> | undefined;
let deadlineSave: ReturnType<typeof setTimeout> | undefined;
let pendingSave: Omit<PersistedLabState, 'savedAt'> | undefined;

function flushPendingSave() {
  clearTimeout(idleSave);
  clearTimeout(deadlineSave);
  idleSave = deadlineSave = undefined;
  const state = pendingSave;
  pendingSave = undefined;
  if (!state || typeof window === 'undefined' || typeof localStorage === 'undefined' || !localStorage) return;
  try {
    // Source, target and readings share one record, even when the page leaves mid-flow.
    localStorage.setItem(STORAGE_KEY_PHYSICAL, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

if (typeof window !== 'undefined') window.addEventListener?.('pagehide', flushPendingSave);

export function debounceSaveLocalState(
  vessels: Record<string, VesselState>, 
  burners: Record<string, BurnerState>,
  materials?: LabMaterialSnapshot,
) {
  const completeMaterials = materials ? { ...materials, physics: materials.physics ?? capturePhysicalLab() } : materials;
  pendingSave = { vessels, burners, materials: completeMaterials };
  clearTimeout(idleSave);
  idleSave = setTimeout(flushPendingSave, SAVE_IDLE_MS);
  // Continuous transfers may never reach the idle timeout.
  deadlineSave ??= setTimeout(flushPendingSave, SAVE_MAX_WAIT_MS);
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
  description_vi: string,
  materials?: LabMaterialSnapshot,
  coalesceKey?: string,
) {
  // If we undid and then did a new action, slice off future
  if (historyPointer < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyPointer + 1);
  }

  let materialSnapshot: LabMaterialSnapshot | undefined;
  if (materials) {
    const { titrationHistory, ...mutableMaterials } = materials;
    materialSnapshot = {
      ...JSON.parse(JSON.stringify({ ...mutableMaterials, physics: materials.physics ?? capturePhysicalLab() })),
      // Points and their lists are immutable. Cloning them on each drop repeats the full curve.
      ...(titrationHistory ? { titrationHistory } : {}),
    };
  }

  const snapshot: LabActionHistory = {
    ...(coalesceKey ? { coalesceKey } : {}),
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    action,
    description_en,
    description_vi,
    snapshot: {
      vessels: JSON.parse(JSON.stringify(vessels)),
      burners: JSON.parse(JSON.stringify(burners)),
      ...(materialSnapshot ? { materials: materialSnapshot } : {}),
    }
  };

  if (coalesceKey && historyPointer === historyStack.length - 1
    && historyStack[historyPointer]?.coalesceKey === coalesceKey) {
    historyStack[historyPointer] = snapshot;
    return;
  }
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

/** Check the pointer, not the final stack item, so redo branches never coalesce. */
export function hasCurrentHistoryCoalesceKey(key: string): boolean {
  return historyStack[historyPointer]?.coalesceKey === key;
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
