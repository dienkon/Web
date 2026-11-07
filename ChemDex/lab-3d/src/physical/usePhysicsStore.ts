import { create } from 'zustand';
import type { PhysicalBodyInput, SimulationSnapshot, PhysicalLabSave } from './types';
import { createReferenceExperiment, isReferenceExperiment, type ReferenceExperiment, type ExperimentKind } from './ReferenceExperiments';
export interface PhysicsUIState {
  enabled: boolean; panelOpen: boolean; status: 'off' | 'starting' | 'running' | 'error'; error: string | null;
  snapshot: SimulationSnapshot | null; previous: SimulationSnapshot | null; receivedAt: number;
  expansions: PhysicalBodyInput[]; revision: number;
  resumeTick: number; seed: number;
  experiments: ReferenceExperiment[];
  startExperiment: (kind: ExperimentKind, options?: Record<string, number | string>) => void;
  setEnabled: (enabled: boolean) => void; setPanelOpen: (open: boolean) => void;
  addExpansion: (input: PhysicalBodyInput) => void; clearExpansions: () => void;
}
export const usePhysicsStore = create<PhysicsUIState>((set) => ({
  enabled: false, panelOpen: false, status: 'off', error: null, snapshot: null, previous: null,
  receivedAt: 0, expansions: [], revision: 0, resumeTick: 0, seed: 17, experiments: [],
  startExperiment: (kind, options = {}) => set(s => {
    const id = `${kind}:${options.liquid ?? 'default'}`;
    const run_revision = Number(s.experiments.find(e => e.id === id)?.parameters.run_revision ?? 0) + 1;
    return { experiments: [...s.experiments.filter(e => e.id !== id), createReferenceExperiment(id, kind, { ...options, run_revision })] };
  }),
  setEnabled: enabled => set(s => {
    if (enabled === s.enabled) return s;
    const saved = capturePhysicalLab();
    return { enabled, expansions: saved.expansions, experiments: saved.experiments ?? s.experiments, resumeTick: saved.tick,
      revision: s.revision + 1, status: enabled ? 'starting' : 'off', error: null, snapshot: null, previous: null };
  }),
  setPanelOpen: panelOpen => set({ panelOpen }),
  addExpansion: input => set(s => ({ expansions: [...s.expansions, input] })),
  clearExpansions: () => set(s => ({ expansions: [], experiments: [], revision: s.revision + 1,
    resumeTick: s.snapshot?.tick ?? s.resumeTick })),
}));

export function capturePhysicalLab(): PhysicalLabSave {
  const s = usePhysicsStore.getState();
  const results = new Map((s.snapshot?.experiments ?? []).map(e => [e.id, e]));
  const experiments = s.experiments.map(config => {
    const result = results.get(config.id);
    return result && JSON.stringify(result.parameters) === JSON.stringify(config.parameters) ? result : config;
  });
  return { version: 1, enabled: s.enabled, tick: s.snapshot?.tick ?? s.resumeTick, seed: s.seed,
    experiments: structuredClone(experiments),
    expansions: s.expansions.map(input => {
      const pose = s.snapshot?.objects.find(o => o.id === input.id);
      return pose ? { ...input, position_m: [...pose.position_m], rotation: [...pose.rotation], velocity_m_s: [...pose.velocity_m_s],
        angularVelocity_rad_s: [...pose.angularVelocity_rad_s], temperature_K: pose.temperature_K } : input;
    }) };
}
export function restorePhysicalLab(save?: PhysicalLabSave) {
  const valid = save?.version === 1 && Number.isSafeInteger(save.tick) && save.tick >= 0 && Number.isSafeInteger(save.seed)
    && typeof save.enabled === 'boolean' && (!save.experiments || (Array.isArray(save.experiments) && save.experiments.every(isReferenceExperiment)))
    && Array.isArray(save.expansions) && save.expansions.every(e => e && typeof e.id === 'string' && e.definition
      && e.position_m?.length === 3 && e.rotation?.length === 4 && Math.hypot(...e.rotation) > 1e-6
      && [...e.position_m, ...e.rotation].every(Number.isFinite))
    && new Set(save.expansions.map(e => e.id)).size === save.expansions.length;
  usePhysicsStore.setState(s => ({ enabled: valid ? save.enabled : s.enabled, resumeTick: valid ? save.tick : 0, seed: valid ? save.seed : 17,
    expansions: valid ? structuredClone(save.expansions) : [], experiments: valid ? structuredClone(save.experiments ?? []) : [],
    revision: s.revision + 1, snapshot: null, previous: null,
    error: null, status: (valid ? save.enabled : s.enabled) ? 'starting' : 'off' }));
}
