import { create } from 'zustand';
import { simulationFrameDt } from '../core/clock';
import { sampleMeasurement } from '../science/sampleMeasurement';
import type { VesselState } from '../types/chemistry';
import { csvCell } from '../utils/csv';
import { isLessonVessel } from './instrumentCatalog';

const MAX_READINGS = 601;

export interface SampleReading {
  seconds: number;
  ph: number | null;
  temperature_c: number | null;
  volume_ml: number | null;
  mass_g: number | null;
  phBasis: ReturnType<typeof sampleMeasurement>['basis'];
  phReferenceTemperature_c: number | null;
}

type RecorderStatus = 'recording' | 'stopped' | 'sample-changed' | 'limit';

interface SampleRecording {
  vesselId: string;
  vesselName: string;
  sampleRevision: number;
  benchEpoch: number;
  status: RecorderStatus;
  readings: readonly SampleReading[];
}

interface RecorderFrame {
  vessels: Readonly<Record<string, VesselState>>;
  pourEpoch: number;
  isSimulationPaused: boolean;
  timeScale: number;
}

interface SampleRecorderState {
  recording: SampleRecording | null;
  reference: SampleRecording | null;
  start: (vessel: VesselState | undefined, benchEpoch: number) => void;
  stop: () => void;
  pinReference: () => void;
  clearReference: () => void;
  advance: (delta: number, frame: RecorderFrame) => void;
}

export function canRecordSample(vessel: VesselState | undefined): vessel is VesselState {
  return !!vessel && vessel.capacity_ml > 0 && !vessel.isShattered && !isLessonVessel(vessel.id);
}

function readSampleAt(vessel: VesselState, seconds: number): SampleReading {
  const observation = sampleMeasurement(vessel);
  return {
    seconds: Number(seconds.toFixed(6)),
    ph: observation.ph,
    temperature_c: observation.temperature_c,
    volume_ml: Number.isFinite(vessel.volume_ml) ? vessel.volume_ml : null,
    mass_g: Number.isFinite(vessel.mass_g) ? vessel.mass_g : null,
    phBasis: observation.basis,
    phReferenceTemperature_c: observation.referenceTemperature_c,
  };
}

export const useSampleRecorder = create<SampleRecorderState>((set, get) => {
  let elapsed = 0;
  let nextSampleAt = 1;
  return {
    recording: null,
    reference: null,
    start: (vessel, benchEpoch) => {
      if (get().recording?.status === 'recording' || !canRecordSample(vessel)) return;
      elapsed = 0;
      nextSampleAt = 1;
      set({ recording: { vesselId: vessel.id, vesselName: vessel.name,
        sampleRevision: vessel.effectSampleRevision ?? 0, benchEpoch, status: 'recording',
        readings: [readSampleAt(vessel, 0)] } });
    },
    stop: () => {
      const recording = get().recording;
      if (recording?.status === 'recording') set({ recording: { ...recording, status: 'stopped' } });
    },
    pinReference: () => {
      const recording = get().recording;
      if (recording && recording.status !== 'recording' && recording.readings.length >= 2) set({ reference: recording });
    },
    clearReference: () => set({ reference: null }),
    advance: (delta, frame) => {
      const recording = get().recording;
      if (recording?.status !== 'recording') return;
      const vessel = frame.vessels[recording.vesselId];
      if (!canRecordSample(vessel) || frame.pourEpoch !== recording.benchEpoch
        || (vessel.effectSampleRevision ?? 0) !== recording.sampleRevision) {
        set({ recording: { ...recording, status: 'sample-changed' } });
        return;
      }
      elapsed += simulationFrameDt(delta, frame);
      if (elapsed + 1e-9 < nextSampleAt) return;
      // Store the observed time instead of backfilling old times with the current sample.
      nextSampleAt = Math.floor(elapsed + 1e-9) + 1;
      const readings = [...recording.readings, readSampleAt(vessel, elapsed)];
      set({ recording: { ...recording, readings, status: readings.length >= MAX_READINGS ? 'limit' : 'recording' } });
    },
  };
});

export function sampleRecordingCSV(recording: SampleRecording): string {
  const header = 'vessel_id,vessel_name,simulation_time_s,pH,temperature_c,liquid_volume_ml,sample_mass_g,pH_basis,pH_reference_temperature_c';
  const rows = recording.readings.map(point => [recording.vesselId, recording.vesselName, point.seconds, point.ph,
    point.temperature_c, point.volume_ml, point.mass_g, point.phBasis, point.phReferenceTemperature_c].map(csvCell).join(','));
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n';
}
