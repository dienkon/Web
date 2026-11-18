import { create } from 'zustand';
import { LAB_TOUR_STEPS } from '../data/labTour';
import { useAppStore } from './useAppStore';

export const LAB_TOUR_STORAGE_KEY = 'chemdex_lab_interactive_tour_v2';
interface TourProgress { index: number; completed: boolean; done: string[]; vesselId: string | null }
const empty: TourProgress = { index: 0, completed: false, done: [], vesselId: null };
function load(): TourProgress | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAB_TOUR_STORAGE_KEY) ?? 'null');
    if (value && Number.isInteger(value.index) && value.index >= 0 && value.index < LAB_TOUR_STEPS.length
      && typeof value.completed === 'boolean' && Array.isArray(value.done)
      && value.done.every((id: unknown) => typeof id === 'string') && (value.vesselId === null || typeof value.vesselId === 'string')) return value;
  } catch { /* Browser storage is optional. */ }
  return null;
}
function save(progress: TourProgress) {
  try { localStorage.setItem(LAB_TOUR_STORAGE_KEY, JSON.stringify(progress)); } catch { /* Keep session progress. */ }
}
const initial = load();
interface TourState extends TourProgress {
  active: boolean;
  initialize: (autoOpen: boolean) => void;
  start: () => void;
  pause: () => void;
  next: () => void;
  back: () => void;
  markDone: (id: string) => void;
  setVessel: (id: string) => void;
  finish: () => void;
  recover: () => void;
  restartFrom: (stepId: string) => void;
}
const progressOf = (s: TourState): TourProgress => ({ index: s.index, completed: s.completed, done: s.done, vesselId: s.vesselId });
export const useLabTour = create<TourState>((set, get) => ({
  ...(initial ?? empty), active: false,
  initialize: autoOpen => { if (autoOpen && !initial) set({ active: true }); },
  start: () => {
    if (get().completed) { set({ ...empty, active: true }); save(empty); }
    else { get().recover(); set({ active: true }); }
  },
  pause: () => { save(progressOf(get())); set({ active: false }); },
  next: () => { set(s => ({ index: Math.min(s.index + 1, LAB_TOUR_STEPS.length - 1) })); save(progressOf(get())); },
  back: () => { set(s => ({ index: Math.max(0, s.index - 1) })); save(progressOf(get())); },
  markDone: id => { set(s => ({ done: [...new Set([...s.done, id])] })); save(progressOf(get())); },
  setVessel: vesselId => { set({ vesselId }); save(progressOf(get())); },
  finish: () => { set({ completed: true, active: false }); save(progressOf(get())); },
  restartFrom: stepId => {
    const index = LAB_TOUR_STEPS.findIndex(item => item.id === stepId);
    if (index < 0) return;
    set(s => ({ index, done: s.done.filter(id => LAB_TOUR_STEPS.findIndex(item => item.id === id) < index) }));
    save(progressOf(get()));
  },
  recover: () => {
    const s = get(), step = LAB_TOUR_STEPS[s.index];
    if (s.index < 5) return;
    const vessel = s.vesselId ? useAppStore.getState().vessels[s.vesselId] : null;
    const waterNeeded = s.index >= LAB_TOUR_STEPS.findIndex(item => item.id === 'open-inspect');
    if (!vessel || vessel.isShattered || (waterNeeded && vessel.volume_ml < 9.9)) {
      const index = LAB_TOUR_STEPS.findIndex(item => item.id === 'add-beaker');
      set({ index, vesselId: null, done: s.done.filter(id => LAB_TOUR_STEPS.findIndex(item => item.id === id) < index) });
    } else if (step.id === 'wait-water' && !useAppStore.getState().pouringChemical && vessel.volume_ml < 9.9) {
      const index = LAB_TOUR_STEPS.findIndex(item => item.id === 'add-beaker');
      set({ index, vesselId: null, done: s.done.filter(id => LAB_TOUR_STEPS.findIndex(item => item.id === id) < index) });
    }
  },
}));
