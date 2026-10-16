import { create } from 'zustand';
import type { LiquidAliquot } from './aliquot';

export interface InstrumentNotice {
  sequence: number;
  tool: string;
  message: string;
  success: boolean;
}

interface InstrumentState {
  pipetteSample: LiquidAliquot | null;
  pipettePulse: number;
  pipetteDispensing: boolean;
  balanceTare_g: number;
  notices: InstrumentNotice[];
  sequence: number;
  setSample: (sample: LiquidAliquot | null, dispensing?: boolean) => void;
  setTare: (mass: number) => void;
  notify: (tool: string, message: string, success: boolean) => void;
}

export const useInstrumentStore = create<InstrumentState>((set) => ({
  pipetteSample: null,
  pipettePulse: 0,
  pipetteDispensing: false,
  balanceTare_g: 0,
  notices: [],
  sequence: 0,
  setSample: (pipetteSample, dispensing = false) => set(state => ({
    pipetteSample,
    pipetteDispensing: dispensing,
    pipettePulse: state.pipettePulse + 1,
  })),
  setTare: balanceTare_g => {
    if (Number.isFinite(balanceTare_g)) set({ balanceTare_g });
  },
  notify: (tool, message, success) => set(state => ({
    sequence: state.sequence + 1,
    notices: [...state.notices.slice(-19), {
      sequence: state.sequence + 1,
      tool,
      message,
      success,
    }],
  })),
}));
