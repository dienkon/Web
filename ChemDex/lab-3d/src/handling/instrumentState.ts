import { create } from 'zustand';
import { MAX_PIPETTE_PRESENTATIONS, advancePipettePresentations, makePipettePresentation,
  type PipettePresentation, type PipettePresentationInput } from './pipettePresentation';

export interface InstrumentNotice {
  sequence: number;
  tool: string;
  message: string;
  success: boolean;
}

interface InstrumentState {
  pipettePresentations: PipettePresentation[];
  pipettePresentationSequence: number;
  canQueuePipettePresentation: (epoch: number) => boolean;
  hasPipettePresentation: (epoch: number) => boolean;
  enqueuePipettePresentation: (input: PipettePresentationInput) => boolean;
  advancePipettePresentation: (dt: number, epoch: number, isTargetValid?: (receipt: PipettePresentation) => boolean) => void;
  clearPipettePresentations: () => void;
  pipettePulse: number;
  pipetteDispensing: boolean;
  balanceTare_g: number;
  notices: InstrumentNotice[];
  sequence: number;
  pulsePipette: (dispensing?: boolean) => void;
  setTare: (mass: number) => void;
  notify: (tool: string, message: string, success: boolean) => void;
}

export const useInstrumentStore = create<InstrumentState>((set, get) => ({
  pipettePresentations: [],
  pipettePresentationSequence: 0,
  canQueuePipettePresentation: epoch => get().pipettePresentations.filter(receipt => receipt.epoch === epoch).length < MAX_PIPETTE_PRESENTATIONS,
  hasPipettePresentation: epoch => get().pipettePresentations.some(receipt => receipt.epoch === epoch),
  enqueuePipettePresentation: input => {
    const state = get(), queue = state.pipettePresentations.filter(receipt => receipt.epoch === input.epoch);
    if (queue.length >= MAX_PIPETTE_PRESENTATIONS) return false;
    const receipt = makePipettePresentation(input, state.pipettePresentationSequence + 1);
    if (!receipt) return false;
    set({ pipettePresentations: [...queue, receipt], pipettePresentationSequence: receipt.id });
    return true;
  },
  advancePipettePresentation: (dt, epoch, isTargetValid) => {
    const state = get();
    if (!state.pipettePresentations.length) return;
    const queue = advancePipettePresentations(state.pipettePresentations, dt, epoch, isTargetValid);
    if (queue.length !== state.pipettePresentations.length || queue.some((receipt, i) => receipt !== state.pipettePresentations[i])) set({ pipettePresentations: queue });
  },
  clearPipettePresentations: () => set({ pipettePresentations: [], pipetteDispensing: false }),
  pipettePulse: 0,
  pipetteDispensing: false,
  balanceTare_g: 0,
  notices: [],
  sequence: 0,
  pulsePipette: (dispensing = false) => set(state => ({
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
