/// <reference types="vite/client" />

import { create } from 'zustand';
import { z } from 'zod';
import { simulationFrameDt } from '../core/clock';
import { sampleMeasurement } from '../science/sampleMeasurement';
import type { VesselState } from '../types/chemistry';
import { csvCell } from '../utils/csv';
import { isLessonVessel } from './instrumentCatalog';

const MAX_READINGS = 601;
const STORAGE_KEY = 'chemdex_sample_recordings_v1';
const MAX_SUMMARY_MARKERS = 6;
export const MAX_SAMPLE_MARKERS = 24;
export const SAMPLE_MARKER_NOTE_LENGTH = 96;
export const MAX_SAMPLE_RECORDING_FILE_BYTES = 512 * 1024;

const optionalReading = z.number().nullable();
const sampleTime_s = z.number().nonnegative().max(MAX_READINGS);
const sampleReading = z.object({
  seconds: sampleTime_s,
  ph: optionalReading,
  temperature_c: optionalReading,
  volume_ml: optionalReading,
  mass_g: optionalReading,
  phBasis: z.enum(['scenario', 'ideal_aqueous_25c', 'ideal_aqueous_temperature']).nullable(),
  phReferenceTemperature_c: optionalReading,
});
export type SampleReading = z.infer<typeof sampleReading>;
const sampleMarker = z.object({ seconds: sampleTime_s, note: z.string().max(SAMPLE_MARKER_NOTE_LENGTH) });
export type SampleMarker = z.infer<typeof sampleMarker>;

export const SAMPLE_METRICS = {
  temperature_c: { en: 'Temperature', vi: 'Nhiệt độ', unit: '°C' },
  ph: { en: 'pH', vi: 'pH', unit: '' },
  volume_ml: { en: 'Liquid volume', vi: 'Thể tích chất lỏng', unit: 'mL' },
  mass_g: { en: 'Sample mass', vi: 'Khối lượng mẫu', unit: 'g' },
};

const sampleRecording = z.object({
  vesselId: z.string().min(1),
  vesselName: z.string(),
  sampleRevision: z.number(),
  benchEpoch: z.number(),
  status: z.enum(['recording', 'stopped', 'sample-changed', 'limit']),
  markers: z.array(sampleMarker).max(MAX_SAMPLE_MARKERS).readonly()
    .refine(markers => markers.every((marker, index) => index === 0 || marker.seconds >= markers[index - 1].seconds))
    .default([]),
  readings: z.array(sampleReading).min(1).max(MAX_READINGS).readonly()
    .refine(readings => readings[0]?.seconds === 0
      && readings.every((point, index) => index === 0 || point.seconds > readings[index - 1].seconds)),
});
type SampleRecording = z.infer<typeof sampleRecording>;
const savedRecordings = z.object({
  recording: sampleRecording.nullable(),
  reference: z.union([sampleRecording, z.literal('current'), z.null()]),
});
const recordingFile = z.object({
  format: z.literal('chemdex-sample-recording'),
  version: z.literal(1),
  recording: sampleRecording,
});

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
  importReference: (text: string) => boolean;
  advance: (delta: number, frame: RecorderFrame) => void;
  mark: (frame: RecorderFrame) => void;
  editMarker: (index: number, marker: SampleMarker, note: string) => void;
}

export function canRecordSample(vessel: VesselState | undefined): vessel is VesselState {
  return !!vessel && vessel.capacity_ml > 0 && !vessel.isShattered && !isLessonVessel(vessel.id);
}

function ownedSample(recording: SampleRecording, frame: RecorderFrame): VesselState | undefined {
  const vessel = frame.vessels[recording.vesselId];
  if (canRecordSample(vessel) && frame.pourEpoch === recording.benchEpoch
    && (vessel.effectSampleRevision ?? 0) === recording.sampleRevision) return vessel;
}

function restoreSampleRecordings(): Pick<SampleRecorderState, 'recording' | 'reference'> {
  try {
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    const saved = savedRecordings.safeParse(raw ? JSON.parse(raw) : null);
    if (saved.success) {
      const previous = saved.data.recording;
      const recording = previous?.status === 'recording' ? { ...previous, status: 'stopped' as const } : previous;
      return { recording, reference: saved.data.reference === 'current' ? recording : saved.data.reference };
    }
  } catch {
    // Private or embedded browsers can block storage without disabling recording.
  }
  return { recording: null, reference: null };
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
    ...restoreSampleRecordings(),
    start: (vessel, benchEpoch) => {
      if (get().recording?.status === 'recording' || !canRecordSample(vessel)) return;
      elapsed = 0;
      nextSampleAt = 1;
      set({ recording: { vesselId: vessel.id, vesselName: vessel.name,
        sampleRevision: vessel.effectSampleRevision ?? 0, benchEpoch, status: 'recording',
        markers: [], readings: [readSampleAt(vessel, 0)] } });
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
    importReference: text => {
      if (text.length > MAX_SAMPLE_RECORDING_FILE_BYTES) return false;
      try {
        const result = recordingFile.safeParse(JSON.parse(text.replace(/^\uFEFF/, '')));
        if (!result.success) return false;
        const { recording } = result.data;
        set({ reference: { ...recording, status: 'stopped' } });
        return true;
      } catch {
        return false;
      }
    },
    mark: frame => {
      const recording = get().recording;
      if (recording?.status !== 'recording' || recording.markers.length >= MAX_SAMPLE_MARKERS) return;
      if (!ownedSample(recording, frame)) {
        set({ recording: { ...recording, status: 'sample-changed' } });
        return;
      }
      const marker = { seconds: Number(elapsed.toFixed(6)), note: '' };
      set({ recording: { ...recording, markers: [...recording.markers, marker] } });
    },
    editMarker: (index, marker, note) => {
      const { recording, reference } = get();
      const trimmed = note.trim().slice(0, SAMPLE_MARKER_NOTE_LENGTH);
      if (!recording || recording.markers[index] !== marker || marker.note === trimmed) return;
      const next = { ...recording, markers: recording.markers.map((item, i) => i === index ? { ...item, note: trimmed } : item) };
      set({ recording: next, reference: reference === recording ? next : reference });
    },
    advance: (delta, frame) => {
      const recording = get().recording;
      if (recording?.status !== 'recording') return;
      const vessel = ownedSample(recording, frame);
      if (!vessel) {
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

if (typeof window !== 'undefined') {
  const save = () => {
    try {
      const { recording, reference } = useSampleRecorder.getState();
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ recording,
        reference: reference && reference === recording ? 'current' : reference }));
    } catch {
      // The in-memory run and CSV export are still available.
    }
  };
  const unsubscribe = useSampleRecorder.subscribe((next, previous) => {
    if (next.reference !== previous.reference || next.recording?.status !== previous.recording?.status
      || next.recording?.markers !== previous.recording?.markers
      || (next.recording && next.recording.readings.length % 20 === 0)) save();
  });
  window.addEventListener('pagehide', save);
  import.meta.hot?.dispose(() => {
    unsubscribe();
    window.removeEventListener('pagehide', save);
  });
}

export function sampleRecordingCSV(recording: SampleRecording): string {
  const header = 'vessel_id,vessel_name,simulation_time_s,pH,temperature_c,liquid_volume_ml,sample_mass_g,pH_basis,pH_reference_temperature_c';
  const rows = recording.readings.map(point => [recording.vesselId, recording.vesselName, point.seconds, point.ph,
    point.temperature_c, point.volume_ml, point.mass_g, point.phBasis, point.phReferenceTemperature_c].map(csvCell).join(','));
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n';
}

export function sampleRecordingJSON(recording: SampleRecording): string {
  return JSON.stringify({ format: 'chemdex-sample-recording', version: 1,
    recording: { ...recording, status: 'stopped' } });
}

export function sampleMarkersCSV(recording: SampleRecording): string {
  const rows = recording.markers.map((marker, index) => [
    recording.vesselId, index + 1, marker.seconds, marker.note,
  ].map(csvCell).join(','));
  return '\uFEFF' + ['vessel_id,marker_number,simulation_time_s,note', ...rows].join('\r\n') + '\r\n';
}

export function sampleRecordingSummary(recording: SampleRecording, language: 'en' | 'vi', reference = false): string {
  const format = new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format;
  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const { readings } = recording;
  const title = reference ? t('Reference log', 'Nhật ký đối chứng') : t('Sample log', 'Nhật ký số đo');
  const lines = [title + ' · ' + recording.vesselName + ' · ' + readings.length + t(' readings', ' mốc đo')
    + ' · ' + format(readings.at(-1)?.seconds ?? 0) + t(' simulated s', ' s mô phỏng')];
  for (const metric of Object.keys(SAMPLE_METRICS) as (keyof typeof SAMPLE_METRICS)[]) {
    const description = SAMPLE_METRICS[metric];
    const label = description[language] + (description.unit ? ' (' + description.unit + ')' : '');
    const points = readings.flatMap(point => {
      const value = point[metric];
      return value !== null ? [{ value, seconds: point.seconds }] : [];
    });
    const first = points[0], last = points.at(-1);
    if (!first || !last) {
      lines.push('- ' + label + ' · ' + t('no valid readings', 'chưa có số đo hợp lệ'));
      continue;
    }
    const values = points.map(point => point.value);
    const reading = (point: typeof first) => format(point.value) + t(' at ', ' ở ') + format(point.seconds) + ' s';
    lines.push('- ' + label + ' · ' + reading(first) + ' → ' + reading(last)
      + ' · ' + t('range ', 'khoảng ') + format(Math.min(...values)) + '–' + format(Math.max(...values))
      + ' · ' + points.length + '/' + readings.length + t(' valid', ' hợp lệ'));
  }
  if (recording.markers.length) {
    lines.push(t('Sample events', 'Mốc thao tác'));
    recording.markers.slice(0, MAX_SUMMARY_MARKERS).forEach((marker, index) => {
      lines.push('- ' + format(marker.seconds) + ' s · ' + (marker.note || t('Marker ', 'Mốc ') + (index + 1)));
    });
    const remaining = recording.markers.length - MAX_SUMMARY_MARKERS;
    if (remaining > 0) lines.push(t('Other events in the event CSV · ', 'Các mốc khác trong CSV mốc · ') + remaining);
  }
  return lines.join('\n');
}
