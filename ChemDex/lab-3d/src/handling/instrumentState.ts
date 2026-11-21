import { create } from 'zustand';
import { MAX_PIPETTE_PRESENTATIONS, advancePipettePresentations, makePipettePresentation,
  type PipettePresentation, type PipettePresentationInput } from './pipettePresentation';
import { MAX_BURETTE_PRESENTATIONS, advanceBurettePresentations, makeBurettePresentation,
  type BurettePresentation, type BurettePresentationInput } from './burettePresentation';
import type { PracticeProbe, PracticeProbeReading } from '../engine/neutralizationPractice';

export interface InstrumentNotice {
  sequence: number;
  tool: string;
  message: string;
  success: boolean;
}

interface InstrumentState {
  practiceProbe: PracticeProbeReading | null;
  publishPracticeProbe: (tool: PracticeProbe, reading: PracticeProbeReading | null) => void;
  burettePresentations: BurettePresentation[];
  burettePresentationSequence: number;
  canQueueBurettePresentation: (epoch: number) => boolean;
  hasBurettePresentation: (epoch: number) => boolean;
  enqueueBurettePresentation: (input: BurettePresentationInput) => boolean;
  advanceBurettePresentation: (dt: number, epoch: number, isTargetValid?: (receipt: BurettePresentation) => boolean) => void;
  clearBurettePresentations: () => void;
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
  practiceProbe: null,
  publishPracticeProbe: (tool, reading) => {
    const current = get().practiceProbe;
    if (!reading) {
      if (current?.tool === tool) set({ practiceProbe: null });
      return;
    }
    if (current?.tool === tool && current.attemptId === reading.attemptId && current.epoch === reading.epoch
      && current.value === reading.value && current.settled === reading.settled
      && current.point.every((position, axis) => Math.abs(position - reading.point[axis]) < 0.002)) return;
    set({ practiceProbe: reading });
  },
  burettePresentations: [],
  burettePresentationSequence: 0,
  canQueueBurettePresentation: epoch => get().burettePresentations.filter(r => r.epoch === epoch).length < MAX_BURETTE_PRESENTATIONS,
  hasBurettePresentation: epoch => get().burettePresentations.some(r => r.epoch === epoch),
  enqueueBurettePresentation: input => {
    const state = get();
    if (!state.canQueueBurettePresentation(input.epoch)) return false;
    const receipt = makeBurettePresentation(input, state.burettePresentationSequence + 1);
    if (!receipt) return false;
    set({ burettePresentations: [...state.burettePresentations.filter(r => r.epoch === input.epoch), receipt], burettePresentationSequence: receipt.id });
    return true;
  },
  advanceBurettePresentation: (dt, epoch, isTargetValid) => {
    const state = get();
    const queue = advanceBurettePresentations(state.burettePresentations, dt, epoch, isTargetValid);
    if (queue.length !== state.burettePresentations.length || queue.some((r, i) => r !== state.burettePresentations[i])) set({ burettePresentations: queue });
  },
  clearBurettePresentations: () => set({ burettePresentations: [] }),
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
