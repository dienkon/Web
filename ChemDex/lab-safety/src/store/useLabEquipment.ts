import { create } from 'zustand';
export type InstrumentKind = 'washBottle' | 'ventilation' | 'gas' | 'blanket' | 'locker' | 'clock' | 'smokeAlarm' | 'acid' | 'balance' | 'volume' | 'titration' | 'heat' | 'wash' | 'storage' | 'glass' | 'ph' | 'hood' | 'workspace' | 'seat' | 'drawer' | 'door' | 'electrical' | 'board' | 'ppe' | 'extinguisher' | 'spillKit' | 'firstAid' | 'shower' | 'mirror' | 'waste';
export interface LabItem { id: string; title: string; kind: InstrumentKind; position: [number,number,number]; equipKey?: string; }
export interface ItemProgress { completed?: boolean; uses?: number; active?: boolean; }
interface State {
  items: LabItem[];
  destination: LabItem | null;
  progress: Record<string, ItemProgress>;
  setItems: (items: LabItem[]) => void;
  navigate: (item: LabItem | null) => void;
  setActive: (id: string, active: boolean) => void;
  record: (id: string, active?: boolean) => void;
  reset: () => void;
}
export const useLabEquipment = create<State>((set) => ({
  items: [], destination: null, progress: {},
  setItems: items => set({items}), navigate: destination => set({destination}),
  setActive: (id, active) => set(s=>({progress:{...s.progress,[id]:{...s.progress[id],active}}})),
  record: (id, active = false) => set(s=>({progress:{...s.progress,[id]:{completed:true,uses:(s.progress[id]?.uses??0)+1,active}}})),
  reset: () => set({destination:null,progress:{}}),
}));
