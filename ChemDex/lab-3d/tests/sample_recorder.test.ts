import { beforeEach, expect, it } from 'vitest';
import { sampleMarkersCSV, sampleRecordingCSV, sampleRecordingSummary, useSampleRecorder } from '../src/handling/sampleRecorder';
import type { VesselState } from '../src/types/chemistry';

const get = useSampleRecorder.getState;
const water: VesselState = {
  id: 'tracked', name: '="+Cốc A"', type: 'beaker', position: [0, 0, 0],
  mass_g: 40, volume_ml: 40, volume: 0.4, capacity_ml: 100, temperature_c: 25, ph: 7,
  rotationY: 0, isLocked: false, hasGas: false, hasPrecipitate: false, isBoiling: false,
  substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 40, moles: 40 / 18.015 }],
};
const frame = { pourEpoch: 1, isSimulationPaused: false, timeScale: 2, vessels: { tracked: water } };

beforeEach(() => useSampleRecorder.setState({ recording: null, reference: null }));

it('records current readings from the original vessel at simulated, not wall-clock, times', () => {
  get().start(water, 1);
  for (let i = 0; i < 4; i++) get().advance(0.1, frame);
  get().advance(100, { ...frame, isSimulationPaused: true });
  get().start({ ...water, id: 'other' }, 1);
  expect(get().recording?.readings).toHaveLength(1);
  const changed = { ...water, temperature_c: 52, volume_ml: 39, mass_g: 39 };
  get().advance(0.5, { ...frame, vessels: { tracked: changed } });
  expect(get().recording?.vesselId).toBe(water.id);
  expect(get().recording?.readings.map(p => [p.seconds, p.temperature_c])).toEqual([[0, 25], [1, 52]]);
  expect(get().recording?.readings[1]).toMatchObject({ mass_g: 39, volume_ml: 39 });
  get().stop();
  for (let i = 0; i < 20; i++) get().advance(0.1, frame);
  expect(get().recording?.readings).toHaveLength(2);
});

it('stops on a replaced specimen or new bench, including while paused', () => {
  for (const update of [{ ...frame, pourEpoch: 2 }, {
    ...frame, isSimulationPaused: true, vessels: { tracked: { ...water, effectSampleRevision: 1 } },
  }, { ...frame, vessels: {} }]) {
    get().start(water, 1);
    get().advance(0.1, update);
    expect(get().recording).toMatchObject({ status: 'sample-changed', readings: [{ seconds: 0 }] });
  }
});

it('exports missing pH as an empty cell and handles quoted specimen names as text', () => {
  const empty = { ...water, mass_g: 0, volume_ml: 0, volume: 0, contents: [], substances: [] };
  get().start(empty, 1);
  const record = get().recording!;
  expect(record.readings[0]).toMatchObject({ mass_g: 0, volume_ml: 0, ph: null, phBasis: null });
  expect(sampleRecordingCSV(record)).toContain("\"tracked\",\"'=\"\"+Cốc A\"\"\",0,,25,0,0,,\r\n");
});

it('retains a finite run without losing its starting point', () => {
  const empty = { ...water, mass_g: 0, volume_ml: 0, volume: 0, contents: [], substances: [] };
  get().start(empty, 1);
  const fast = { ...frame, timeScale: 8, vessels: { tracked: empty } };
  for (let i = 0; i < 1_000; i++) get().advance(0.1, fast);
  const record = get().recording!;
  expect(record.status).toBe('limit');
  expect(record.readings).toHaveLength(601);
  expect(record.readings[0].seconds).toBe(0);
  expect(record.readings.at(-1)?.seconds).toBeCloseTo(600, 1);
});

it('keeps the pinned series and its timestamps stable across subsequent runs', () => {
  get().start(water, 1);
  for (let i = 0; i < 5; i++) get().advance(0.1, frame);
  get().pinReference();
  expect(get().reference).toBeNull();
  get().stop();
  get().pinReference();
  const baseline = get().reference!;
  const csv = sampleRecordingCSV(baseline);
  get().start({ ...water, temperature_c: 40 }, 2);
  for (let i = 0; i < 5; i++) get().advance(0.1, { ...frame, pourEpoch: 2 });
  expect(get().recording?.readings[0].temperature_c).toBe(40);
  expect(get().reference).toBe(baseline);
  expect(sampleRecordingCSV(get().reference!)).toBe(csv);
  get().clearReference();
  expect(get().reference).toBeNull();
  expect(get().recording?.readings).toHaveLength(2);
});

it('summarizes measured endpoints, extrema, and missing pH from exact source rows', () => {
  const empty = { ...water, name: 'Cốc khô', mass_g: 0, volume_ml: 0, volume: 0, contents: [], substances: [] };
  get().start(empty, 1);
  for (const temperature_c of [33, 29]) {
    for (let i = 0; i < 5; i++) get().advance(0.1, { ...frame, vessels: { tracked: { ...empty, temperature_c } } });
  }
  const summary = sampleRecordingSummary(get().recording!, 'vi', true);
  expect(summary).toContain('Nhật ký đối chứng · Cốc khô · 3 mốc đo · 2 s mô phỏng');
  expect(summary).toContain('Nhiệt độ (°C) · 25 ở 0 s → 29 ở 2 s · khoảng 25–33 · 3/3 hợp lệ');
  expect(summary).toContain('pH · chưa có số đo hợp lệ');
});

it('marks accepted simulation time without changing readings and preserves annotations on a pinned run', () => {
  get().start(water, 1);
  get().mark(frame);
  for (let i = 0; i < 6; i++) get().advance(0.1, frame);
  get().advance(40, { ...frame, isSimulationPaused: true });
  get().mark({ ...frame, isSimulationPaused: true });
  const active = get().recording!;
  expect(active.readings.map(point => point.seconds)).toEqual([0, 1]);
  expect(active.markers.map(marker => marker.seconds)).toEqual([0, 1.2]);
  get().stop();
  get().pinReference();
  get().editMarker(1, active.markers[1], '  =thêm mẫu  ');
  expect(get().reference).toBe(get().recording);
  expect(sampleMarkersCSV(get().reference!)).toContain("\"tracked\",2,1.2,\"'=thêm mẫu\"");
  get().start(water, 1);
  get().mark({ ...frame, pourEpoch: 2 });
  expect(get().recording).toMatchObject({ status: 'sample-changed', markers: [] });
  expect(get().reference?.markers[1].note).toBe('=thêm mẫu');
});
