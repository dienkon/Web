import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createOverflowParcel, advanceOverflowParcel, overflowWallTime } from '../src/engine/overflowTransport';
import { ExteriorFilmGeometry } from '../src/pour/render/ExteriorFilmGeometry';
import { TransitStreamGeometry } from '../src/pour/render/transitGeometry';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const target: VesselState = { id: 'bench', name: 'Benchmark', type: 'beaker', capacity_ml: 100,
  position: [0, 4, 0], rotationY: 0, isLocked: false, volume_ml: 100, volume: 1, mass_g: 100,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }], substances: ['H2O'],
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
const sample = (volume_ml: number) => ({ volume_ml, mass_g: volume_ml, contents: [{ formula: 'H2O', phase: 'l', mass_g: volume_ml, moles: volume_ml / 18.015 }],
  substances: ['H2O'], color: '#65cfff', temperature_c: 25 });
const distribution = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { median_ms: sorted[Math.floor(sorted.length / 2)], p95_ms: sorted[Math.floor(sorted.length * 0.95)], min_ms: sorted[0], max_ms: sorted.at(-1) };
};
const results = [];
for (const count of [1, 24]) {
  const wall = new ExteriorFilmGeometry(), air = new TransitStreamGeometry();
  const packets = Array.from({ length: count }, (_, i) => {
    const p = createOverflowParcel(target, sample(count === 1 ? 20 : 20 / 24), { duration_s: count === 1 ? 0.12 : 0.12 / 24 })!;
    return advanceOverflowParcel(p, count === 1 ? overflowWallTime(p) + Math.min(0.01, p.trajectory.timeOfFlight / 2) : 0.002 + i * 0.005).parcel;
  });
  const times: number[] = [];
  for (let i = 0; i < 140; i++) {
    const start = performance.now(); wall.update(packets, { bench: target }); air.update(packets);
    if (i >= 20) times.push(performance.now() - start);
  }
  results.push({ scenario: `${count}_finite_packets`, packets: count, ...distribution(times),
    triangles: (wall.drawRange.count + air.drawRange.count) / 3,
    batchedBufferBytes: [wall, air].reduce((sum, g) => sum + Object.values(g.attributes).reduce((n, a) => n + a.array.byteLength, 0) + (g.index?.array.byteLength ?? 0), 0) });
  wall.dispose(); air.dispose();
}
const initial = useAppStore.getState(), depositTimes: number[] = [];
try {
  for (let i = 0; i < 24; i++) {
    const parcel = createOverflowParcel(target, sample(20))!;
    useAppStore.setState({ vessels: { bench: target }, vesselIds: ['bench'], inFlightPours: [parcel], spills: {}, burners: {},
      activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false });
    const start = performance.now(); useAppStore.getState().advancePourTransport(2);
    if (i >= 4) depositTimes.push(performance.now() - start);
  }
} finally { useAppStore.setState(initial, true); }
const report = { node: process.version, scope: 'CPU geometry update and complete-dose ground transaction; not GPU FPS or before/after equivalence',
  geometry: results, completeDoseDeposition: distribution(depositTimes) };
const folder = 'docs/research/circular-overflow-2026-10-29'; mkdirSync(folder, { recursive: true });
writeFileSync(`${folder}/cpu-benchmark.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
