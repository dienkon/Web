import { create } from 'zustand';
import type { VesselState } from '../types/chemistry';
import { useAppStore } from '../store/useAppStore';
import type { LessonAction, LessonSession } from './types';
import { requireLessonDefinition } from './catalog';
import { getLessonSpecies } from './catalog/species';
import { lessonRuntime } from './runtime';
import { getLessonHistory, removeLessonHistory } from './history';

interface LessonLabState {
  sessionIds: string[];
  selectedSessionId: string | null;
  revision: number;
  error: string | null;
  start: (definitionId: string, scale?: number, excess?: Record<string, number>) => string | null;
  dispatch: (sessionId: string, action: LessonAction) => void;
  select: (sessionId: string) => void;
  remove: (sessionId: string) => void;
  clearError: () => void;
}

const PUBLISH_INTERVAL = 0.1;
let publishAccumulator = 0;
let nextVessel = 0;
const publishedSignatures = new Map<string, string>();

export function lessonVesselId(session: LessonSession): string {
  return session.vesselId;
}

function inventoryToContents(session: LessonSession): VesselState['contents'] {
  return session.inventory
    .filter(item => item.amount_mol > 1e-12)
    .map(item => {
      const species = getLessonSpecies(item.species);
      return {
        formula: species.formula,
        moles: item.amount_mol,
        mass_g: item.amount_mol * species.molarMass,
        phase: species.phase,
        concentration_M: species.phase === 'aq' ? item.amount_mol / (session.volume_ml / 1000) : undefined,
      };
    });
}

function createLessonVessel(session: LessonSession, index: number): VesselState {
  const definition = requireLessonDefinition(session.definitionId);
  const contents = inventoryToContents(session);
  return {
    id: session.vesselId,
    name: definition.title_vi,
    type: definition.family === 'combustion' ? 'evaporating_dish' : 'beaker',
    capacity_ml: 100,
    position: [((index % 3) - 1) * 2.2, -0.135, 1.8 + Math.floor(index / 3) * 1.5],
    rotationY: 0,
    isLocked: false,
    substances: [...new Set(contents.map(item => item.formula))],
    contents,
    volume_ml: session.volume_ml,
    volume: session.volume_ml / 100,
    mass_g: session.volume_ml + session.initialMass_g,
    density_g_ml: 1,
    temperature_c: 25,
    ph: 7,
    liquidColor: definition.initialColor,
    turbidity: 0,
    hasPrecipitate: false,
    isBoiling: false,
    hasGas: false,
    foam_ml: 0,
  };
}

function lessonVesselPatch(session: LessonSession): Partial<VesselState> {
  const visuals = session.visuals;
  const contents = inventoryToContents(session);
  const retainedMass = session.initialMass_g - session.escapedMass_g;
  return {
    contents,
    substances: [...new Set(contents.map(item => item.formula))],
    mass_g: session.volume_ml + Math.max(0, retainedMass),
    temperature_c: session.environment.temperature_c,
    ph: session.environment.pH,
    liquidColor: visuals.color,
    turbidity: visuals.turbidity,
    hasGas: visuals.gasRate_mol_s > 0,
    gasRate: visuals.gasRate_mol_s,
    gasColor: '#ffffff',
    hasPrecipitate: visuals.precipitate_g > 1e-9,
    precipitateAmount_g: visuals.precipitate_g,
    precipitateColor: visuals.precipitateColor,
    precipitateMorphology: 'fine_powder',
    isBoiling: false,
  };
}

export const useLessonLabStore = create<LessonLabState>((set, get) => ({
  sessionIds: [],
  selectedSessionId: null,
  revision: 0,
  error: null,
  start: (definitionId, scale = 0.001, excess = {}) => {
    try {
      const index = get().sessionIds.length;
      const vesselId = `lesson_vessel_${++nextVessel}`;
      const session = lessonRuntime.create(definitionId, vesselId, scale, excess);
      const vessel = createLessonVessel(session, index);
      useAppStore.setState(state => ({
        vessels: { ...state.vessels, [vesselId]: vessel },
        vesselIds: [...state.vesselIds, vesselId],
        selectedVesselId: vesselId,
      }));
      set(state => ({
        sessionIds: [...state.sessionIds, session.id],
        selectedSessionId: session.id,
        revision: state.revision + 1,
        error: null,
      }));
      return session.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Không thể tạo bài mô phỏng.' });
      return null;
    }
  },
  dispatch: (sessionId, action) => {
    lessonRuntime.dispatch(sessionId, action);
    set(state => ({ revision: state.revision + 1 }));
  },
  select: selectedSessionId => {
    const session = lessonRuntime.get(selectedSessionId);
    if (!session) return;
    set({ selectedSessionId });
    useAppStore.getState().setSelectedVesselId(session.vesselId);
  },
  remove: sessionId => {
    const session = lessonRuntime.get(sessionId);
    if (!session) return;
    lessonRuntime.remove(sessionId);
    publishedSignatures.delete(sessionId);
    removeLessonHistory(sessionId);
    useAppStore.getState().removeVessel(session.vesselId);
    set(state => {
      const sessionIds = state.sessionIds.filter(id => id !== sessionId);
      return {
        sessionIds,
        selectedSessionId: state.selectedSessionId === sessionId ? sessionIds[0] ?? null : state.selectedSessionId,
        revision: state.revision + 1,
      };
    });
  },
  clearError: () => set({ error: null }),
}));

export function tickLessonLab(delta: number): void {
  if (!useLessonLabStore.getState().sessionIds.length) return;
  const state = useAppStore.getState();
  for (const session of lessonRuntime.list()) {
    if (!state.vessels[session.vesselId]) {
      lessonRuntime.remove(session.id);
      publishedSignatures.delete(session.id);
      removeLessonHistory(session.id);
      useLessonLabStore.setState(current => ({
        sessionIds: current.sessionIds.filter(id => id !== session.id),
        selectedSessionId: current.selectedSessionId === session.id ? null : current.selectedSessionId,
      }));
    }
  }
  lessonRuntime.update(delta, state.isSimulationPaused, state.timeScale);
  publishAccumulator += Math.min(delta, 0.1);
  if (publishAccumulator < PUBLISH_INTERVAL) return;
  publishAccumulator %= PUBLISH_INTERVAL;
  const changed = lessonRuntime.list().filter(session => {
    const signature = `${session.elapsed_s}|${session.eventSequence}|${session.status}`;
    if (publishedSignatures.get(session.id) === signature) return false;
    publishedSignatures.set(session.id, signature);
    return true;
  });
  if (!changed.length) return;
  for (const session of changed) getLessonHistory(session.id).sample(session);
  const patches = changed.map(session => [session.vesselId, lessonVesselPatch(session)] as const);
  if (patches.length) {
    useAppStore.setState(current => {
      const vessels = { ...current.vessels };
      for (const [id, patch] of patches) {
        if (vessels[id]) vessels[id] = { ...vessels[id], ...patch };
      }
      return { vessels };
    });
  }
  useLessonLabStore.setState(current => ({ revision: current.revision + 1 }));
}
