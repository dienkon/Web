import { create } from 'zustand';
import { LAB_SCENARIOS, SCENARIO_BY_ID } from './catalog';
import { newScenarioAttempt, restoreScenarioAttempt, transitionScenario } from './engine';
import type { ScenarioAttempt, ScenarioEvent } from './types';

interface ScenarioSession {
  openId: string | null;
  waitingForFilm: boolean;
  runs: Record<string, ScenarioAttempt>;
  message: string;
  lastMistake: boolean;
  begin: (id: string) => boolean;
  reveal: () => void;
  close: () => void;
  dispatch: (event: ScenarioEvent) => { accepted: boolean; mistake: boolean; completed: boolean };
  exportRuns: () => Record<string, ScenarioAttempt>;
  restore: (runs: unknown) => void;
  reset: () => void;
}

export const useScenarioSession = create<ScenarioSession>((set, get) => ({
  openId: null,
  waitingForFilm: false,
  runs: {},
  message: '',
  lastMistake: false,
  begin: id => {
    const scenario = SCENARIO_BY_ID.get(id);
    if (!scenario || get().openId) return false;
    const existing = get().runs[id];
    set(state => ({
      openId: id,
      waitingForFilm: !existing,
      message: '',
      lastMistake: false,
      runs: { ...state.runs, [id]: existing ?? newScenarioAttempt(scenario) },
    }));
    return true;
  },
  reveal: () => set({ waitingForFilm: false }),
  close: () => set({ openId: null, waitingForFilm: false, message: '', lastMistake: false }),
  dispatch: event => {
    const state = get();
    const scenario = state.openId ? SCENARIO_BY_ID.get(state.openId) : null;
    if (!scenario || state.waitingForFilm) return { accepted: false, mistake: false, completed: false };
    const current = state.runs[scenario.id] ?? newScenarioAttempt(scenario);
    const result = transitionScenario(scenario, current, event);
    if (result.accepted) {
      set({
        runs: { ...state.runs, [scenario.id]: result.attempt },
        message: result.message,
        lastMistake: result.mistake,
      });
    }
    return { accepted: result.accepted, mistake: result.mistake, completed: result.attempt.completed };
  },
  exportRuns: () => get().runs,
  restore: value => {
    const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const runs: Record<string, ScenarioAttempt> = {};
    for (const scenario of LAB_SCENARIOS) {
      if (input[scenario.id]) runs[scenario.id] = restoreScenarioAttempt(scenario, input[scenario.id]);
    }
    set({ runs, openId: null, waitingForFilm: false, message: '', lastMistake: false });
  },
  reset: () => set({ openId: null, waitingForFilm: false, runs: {}, message: '', lastMistake: false }),
}));
