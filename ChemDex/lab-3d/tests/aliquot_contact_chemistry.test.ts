import { afterEach, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { createStudioSample } from '../src/engine/studioProgram';
import { getProgramById, getAllHandcraftedPrograms } from '../src/vfx/programs/library';
import { aliquotContactProgramSupported, evolveAliquotContact, prepareAliquotContact, meanContactConversion } from '../src/engine/aliquotContactChemistry';
import { withdrawAliquot, type LiquidAliquot } from '../src/handling/aliquot';
import { advancePourParcel, type PourParcel } from '../src/engine/pourTransport';
import { createOverflowParcel, advanceOverflowParcel, overflowWallTime } from '../src/engine/overflowTransport';
import { createWallFilm, advanceWallFilm, wallTimeAtHeight } from '../src/engine/wallFilm';
import { vesselWorldLiquidSurfaceY } from '../src/science/vesselGeometry';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';
import { aspiratePipette, dispensePipette } from '../src/handling/instrumentOperations';
import { readComposition } from '../src/science/balance';
import { clearHistory, pushHistorySnapshot, loadPersistedLabState } from '../src/store/persistence';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState(), instrument = useInstrumentStore.getState();
afterEach(() => { useAppStore.setState(original, true); useInstrumentStore.setState(instrument, true);
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); clearHistory(); });
const shell: VesselState = { id: 'source', name: 'Source', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [], substances: [], mass_g: 0,
  volume_ml: 0, volume: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
const amount = (sample: Pick<LiquidAliquot, 'contents'>, formula: string) => sample.contents.filter(c => c.formula === formula).reduce((n, c) => n + c.moles, 0);
function sample(id = 'hcl_naoh'): LiquidAliquot {
  return prepareAliquotContact(withdrawAliquot(createStudioSample(getProgramById(id)!, shell), 5).sample, id);
}
function atoms(samples: Pick<LiquidAliquot, 'contents'>[]) {
  const result: Record<string, number> = {};
  for (const sample of samples) for (const c of sample.contents) for (const [a, n] of Object.entries(readComposition(c.formula).atoms)) result[a] = (result[a] ?? 0) + c.moles * n;
  return result;
}
function conserved(before: LiquidAliquot, after: LiquidAliquot[]) {
  expect(after.reduce((n, c) => n + c.mass_g, 0)).toBeCloseTo(before.mass_g, 11);
  const expected = atoms([before]), actual = atoms(after);
  for (const [a, n] of Object.entries(expected)) expect(actual[a] ?? 0, a).toBeCloseTo(n, 11);
}
function packet(input = sample()): PourParcel {
  const trajectory = traceLaunchedStream([0, 3, 0], [0, 0, 0], null, LAB_PHYSICS.TABLE_SURFACE_Y);
  return { id: 'flight', sessionId: 'test', sourceId: 'source', sourceName: 'Source', targetId: null, targetPose: '',
    trajectory, sample: input, releasedVolume_ml: input.volume_ml, duration_s: 0.2, elapsed_s: 0, arrivedFraction: 0 };
}
function setup() {
  const source = createStudioSample(getProgramById('hcl_naoh')!, shell);
  useAppStore.setState({ vessels: { source, receiver: { ...shell, id: 'receiver' } }, vesselIds: ['source', 'receiver'],
    selectedVesselId: 'source', moveMode: false, pipetteSample: null, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, burners: {}, inFlightPours: [], spills: {}, isSimulationPaused: false, timeScale: 1 });
  return source;
}

it('continues neutralization in an uncontained finite sample with finite heat and no beaker heat capacity', () => {
  const initial = sample(), before = JSON.stringify(initial), acid = amount(initial, 'HCl');
  const after = evolveAliquotContact(initial, 0.1);
  expect(JSON.stringify(initial)).toBe(before);
  expect(amount(after, 'HCl')).toBeCloseTo(acid / 2, 12);
  expect(amount(after, 'NaOH')).toBeCloseTo(acid / 2, 12);
  expect(amount(after, 'NaCl')).toBeCloseTo(acid / 2, 12);
  expect(after.temperature_c - initial.temperature_c).toBeCloseTo(acid / 2 * 55830 / (initial.mass_g * 4.184), 10);
  conserved(initial, [after]);
  const twice = evolveAliquotContact(evolveAliquotContact(initial, 0.05), 0.05);
  expect(amount(twice, 'HCl')).toBeCloseTo(amount(after, 'HCl'), 12);
  expect(twice.temperature_c).toBeCloseTo(after.temperature_c, 10);
});

it('forms finite precipitate in transit, rather than waiting for contact to invent endpoint solids', () => {
  const initial = sample('agno3_nacl'), after = evolveAliquotContact(initial, 0.1), silver = amount(initial, 'AgNO3') - amount(after, 'AgNO3');
  expect(silver).toBeGreaterThan(0); expect(silver).toBeLessThan(amount(initial, 'AgNO3'));
  expect(amount(after, 'AgCl')).toBeCloseTo(silver, 12);
  expect(amount(initial, 'NaCl') - amount(after, 'NaCl')).toBeCloseTo(silver, 12);
  conserved(initial, [after]);
});

it.each([1, 0.1, 1 / 60, 1 / 120])('integrates the actual arrival-age interval, independent of transport step %s', dt => {
  const initial = sample(), first = packet(initial), arrival: LiquidAliquot[] = [];
  let current = first;
  for (let t = 0; t < 1 - 1e-12;) {
    const step = Math.min(dt, 1 - t), next = advancePourParcel(current, step);
    if (next.contact) arrival.push(next.contact);
    current = next.parcel; t += step;
  }
  expect(current.sample.volume_ml).toBeCloseTo(0, 12);
  const k = Math.LN2 / 0.1, flight = first.trajectory.timeOfFlight, duration = first.duration_s;
  const expectedAcid = amount(initial, 'HCl') * (Math.exp(-k * flight) - Math.exp(-k * (flight + duration))) / (k * duration);
  const acid = arrival.reduce((n, c) => n + amount(c, 'HCl'), 0);
  expect(acid).toBeCloseTo(expectedAcid, 12);
  const heat = (amount(initial, 'HCl') - expectedAcid) * 55830;
  expect(arrival.reduce((n, c) => n + c.mass_g * 4.184 * (c.temperature_c - initial.temperature_c), 0)).toBeCloseTo(heat, 9);
  conserved(initial, [...arrival, current.sample]);
});

it('keeps unsupported gas/surface kinetics and phase crossings explicit instead of losing material to an untracked sink', () => {
  expect(aliquotContactProgramSupported(getProgramById('mg_hcl')!)).toBe(false);
  expect(aliquotContactProgramSupported(getProgramById('h2so4_dilution')!)).toBe(false);
  for (const p of getAllHandcraftedPrograms().filter(p => aliquotContactProgramSupported(p)))
    expect(p.chemistry.species.some(s => s.role === 'product' && s.phase === 'g')).toBe(false);
  const hot = { ...sample(), temperature_c: 99.99 }, next = evolveAliquotContact(hot, 1);
  expect(next.contactChemistryLimit).toBe('phase_boundary'); expect(next.contents).toBe(hot.contents); expect(next.mass_g).toBe(hot.mass_g);
  expect(meanContactConversion(0.1, 0.1)).toBeCloseTo(0.5, 12);
});

it('continues chemistry through exterior-wall delay, with the correct mean exposure at ground contact', () => {
  const initial = sample(), target = { ...shell, id: 'wall', position: [0, 4, 0] as [number, number, number] };
  const p = createOverflowParcel(target, initial, { duration_s: 0.2 })!, delay = overflowWallTime(p) + p.trajectory.timeOfFlight;
  const first = advanceOverflowParcel(p, 0.05);
  expect(first.contact).toBeNull(); expect(amount(first.parcel.sample, 'HCl')).toBeCloseTo(amount(initial, 'HCl') * 2 ** -0.5, 12);
  const next = advanceOverflowParcel(first.parcel, 2), contact = next.contact!;
  const k = Math.LN2 / 0.1;
  expect(amount(contact, 'HCl')).toBeCloseTo(amount(initial, 'HCl') * (Math.exp(-k * delay) - Math.exp(-k * (delay + 0.2))) / (k * 0.2), 12);
  conserved(initial, [contact, next.parcel.sample]);
});

it('continues a sample on the inner glass before it reaches the bulk liquid', () => {
  const initial = sample(), target = createStudioSample(getProgramById('hcl_naoh')!, { ...shell, id: 'inner' });
  const air = packet(initial);
  air.trajectory = { ...air.trajectory, detailKind: 'wall_inner', impactPos: [0.96, target.position[1] + 0.9, 0] };
  const film = createWallFilm(air, initial, target)!;
  expect(film).not.toBeNull();
  const contactTime = wallTimeAtHeight(film.wallFilm!, vesselWorldLiquidSurfaceY(target)), dt = contactTime / 2;
  expect(dt).toBeGreaterThan(0);
  const first = advanceWallFilm(film, dt, target);
  expect(first.contact).toBeNull();
  expect(amount(first.parcel.sample, 'HCl')).toBeCloseTo(amount(initial, 'HCl') * 2 ** (-dt / 0.1), 12);
  conserved(initial, [first.parcel.sample]);
});

it('updates a real pipette sample on the shared clock even with no vessels, and freezes on pause', () => {
  setup(); expect(aspiratePipette(5).ok).toBe(true);
  useAppStore.setState({ vessels: {}, vesselIds: [] });
  const initial = useAppStore.getState().pipetteSample!, acid = amount(initial, 'HCl');
  useAppStore.getState().tickSimulation(0.1);
  const after = useAppStore.getState().pipetteSample!;
  expect(amount(after, 'HCl')).toBeCloseTo(acid / 2, 12);
  useAppStore.setState({ isSimulationPaused: true }); useAppStore.getState().tickSimulation(1);
  expect(useAppStore.getState().pipetteSample).toBe(after); conserved(initial, [after]);
});

it('commits aspiration/dispensing atomically, and the retained pipette remainder continues reacting', () => {
  const source = setup(), versions: { mass: number; atoms: Record<string, number> }[] = [];
  const stop = useAppStore.subscribe(s => {
    const samples = [...Object.values(s.vessels), ...(s.pipetteSample ? [s.pipetteSample] : [])];
    const vapor = Object.values(s.vessels).reduce((sum, v) => sum + (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0), 0);
    const inventory = atoms(samples);
    inventory.H = (inventory.H ?? 0) + 2 * vapor / 18.015; inventory.O = (inventory.O ?? 0) + vapor / 18.015;
    versions.push({ mass: samples.reduce((sum, p) => sum + p.mass_g, vapor), atoms: inventory });
  });
  try {
    expect(aspiratePipette(5).ok).toBe(true);
    useAppStore.getState().tickSimulation(0.1);
    expect(dispensePipette(2.5, 'receiver').ok).toBe(true);
    const held = useAppStore.getState().pipetteSample!, acid = amount(held, 'HCl');
    useAppStore.getState().tickSimulation(0.1);
    expect(amount(useAppStore.getState().pipetteSample!, 'HCl')).toBeCloseTo(acid / 2, 12);
    for (const v of versions) {
      expect(v.mass).toBeCloseTo(source.mass_g, 9);
      for (const [a, n] of Object.entries(atoms([source]))) expect(v.atoms[a] ?? 0, a).toBeCloseTo(n, 10);
    }
  } finally { stop(); }
});

it('persists and restores pipette matter and chemistry through reload data and undo/redo', async () => {
  setup(); vi.useFakeTimers(); const storage = new Map<string, string>(); vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
  const snapshot = () => { const s = useAppStore.getState(); return { inFlightPours: s.inFlightPours, spills: s.spills,
    wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents, pipetteSample: s.pipetteSample }; };
  pushHistorySnapshot('POUR', useAppStore.getState().vessels, {}, 'before', 'trước', snapshot());
  expect(aspiratePipette(5).ok).toBe(true); useAppStore.getState().tickSimulation(0.1);
  const saved = useAppStore.getState().pipetteSample!;
  pushHistorySnapshot('POUR', useAppStore.getState().vessels, {}, 'after', 'sau', snapshot());
  await vi.advanceTimersByTimeAsync(1000);
  expect(loadPersistedLabState()!.materials!.pipetteSample).toEqual(saved);
  useAppStore.getState().undo(); expect(useAppStore.getState().pipetteSample).toBeNull();
  useAppStore.getState().redo(); expect(useAppStore.getState().pipetteSample).toEqual(saved);
  useAppStore.getState().tickSimulation(0.1);
  expect(amount(useAppStore.getState().pipetteSample!, 'HCl')).toBeCloseTo(amount(saved, 'HCl') / 2, 12);
});
