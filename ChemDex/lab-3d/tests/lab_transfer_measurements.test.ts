import { afterEach, expect, it } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { useAppStore } from '../src/store/useAppStore';
import { useLabEnvironment } from '../src/store/useLabEnvironment';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { dispenseAliquot } from '../src/handling/aliquot';
import { aspiratePipette, dispensePipette } from '../src/handling/instrumentOperations';
import { buretteAliquot } from '../src/handling/buretteAliquot';
import { BuretteFlowClock } from '../src/handling/buretteFlow';
import { liquidContactFailure } from '../src/handling/liquidContact';
import { readInstrument } from '../src/handling/instrumentReadings';
import { sampleMeasurement, probePoint } from '../src/science/sampleMeasurement';
import { findChemical } from '../src/data/chemicals';
import { computeMolarMass } from '../src/engine/ledger';
import { simulationFrameDt } from '../src/core/clock';
import { calculateVesselMass } from '../src/engine/interactionEngine';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { formatPH, formatTemperature } from '../src/utils/units';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { runContactScenario } from '../src/vfx/dev/contactScenarios';

const original = useAppStore.getState(), env = useLabEnvironment.getState().conditions, instruments = useInstrumentStore.getState();
afterEach(() => { useAppStore.setState(original, true); useLabEnvironment.setState({ conditions: env }); useInstrumentStore.setState(instruments, true); });
const row = (formula: string, mass_g: number, phase: string) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
const vessel = (id: string, volume_ml = 0, patch: Partial<VesselState> = {}): VesselState => ({ id, name: id, type: 'beaker',
  capacity_ml: 100, volume_ml, volume: volume_ml / 100, mass_g: volume_ml, contents: volume_ml > 0 ? [row('H2O', volume_ml, 'l')] : [],
  substances: volume_ml > 0 ? ['H2O'] : [], position: [id === 'source' ? -3 : 0, -0.135, 0], rotationY: 0,
  isLocked: false, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch });
const water = (volume_ml: number, temperature_c = 25) => ({ volume_ml, mass_g: volume_ml, contents: [row('H2O', volume_ml, 'l')],
  substances: ['H2O'], color: '#f8fafc', temperature_c });
function setup(temperature_c = 210) {
  useAppStore.setState({ vessels: { source: vessel('source', 25), target: vessel('target', 0, { temperature_c }), other: vessel('other') },
    vesselIds: ['source', 'target', 'other'], selectedVesselId: 'target', burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
    inFlightPours: [], spills: {}, pipetteSample: null, workbenchEscapedGas_g: {}, isSimulationPaused: false, timeScale: 1, moveMode: false,
    burette: { ...original.burette, reagentFormula: 'HCl', concentration_M: 0.1, currentVolume_ml: 1, isDispensing: false } });
  return useAppStore.getState();
}
function mass() {
  const s = useAppStore.getState();
  return Object.values(s.vessels).reduce((sum, v) => sum + v.mass_g + Object.values(v.escapedGas_g ?? {}).reduce((a, b) => a + b, 0), 0)
    + Object.values(s.spills).reduce((sum, p) => sum + p.mass_g, 0) + s.inFlightPours.reduce((sum, p) => sum + p.sample.mass_g, 0)
    + (s.pipetteSample?.mass_g ?? 0) + s.burette.currentVolume_ml;
}

it.each(['bottle', 'continuous', 'pipette', 'burette', 'flight'])('actual %s contact with hot dry glass releases the finite dose once', async mode => {
  const s = setup();
  if (mode === 'pipette') s.setPipetteSample(water(5));
  const before = mass(); let incomingStockMass = 0;
  if (mode === 'bottle') { await s.mixSubstances('target', 'H2O', 10); incomingStockMass = 10; }
  if (mode === 'continuous') {
    const receipt = s.transferLiquidContinuous('source', 'target', 10);
    expect(receipt).toEqual({ moved_ml: 10, accepted_ml: 0, spilled_ml: 10 });
  }
  if (mode === 'pipette') expect(dispensePipette(2.5).transferred_ml).toBe(2.5);
  if (mode === 'burette') s.dispenseBuretteDrop('target');
  if (mode === 'flight') {
    const target = s.vessels.target, lip = getWorldVesselProfile(target.type, target.capacity_ml).lipLocal[1];
    const exit: [number, number, number] = [target.position[0], target.position[1] + lip + 0.3, target.position[2]];
    const profile = getWorldVesselProfile(target.type, target.capacity_ml);
    const trajectory = traceLaunchedStream(exit, [0, -1, 0], { id: target.id, position: target.position,
      mouthR: profile.mouthR, mouthY: target.position[1] + lip,
      liquidSurfaceY: target.position[1] + profile.baseY, profile }, -0.135);
    expect(trajectory.landingKind).toBe('inside');
    expect(s.releasePourLiquid({ id: 'thermal-dose', sessionId: 'test', sourceId: 'source', sourceName: 'Water',
      targetId: 'target', targetPose: '', duration_s: 0.1, trajectory }, 10)).toBe(10);
    expect(useAppStore.getState().vessels.target.isShattered).toBeFalsy();
    for (let i = 0; i < 40 && !useAppStore.getState().vessels.target.isShattered; i++) s.advancePourTransport(0.05);
  }
  const after = useAppStore.getState();
  expect(after.vessels.target.isShattered).toBe(true); expect(after.vessels.target.shatterReason).toContain('Thermal Shock');
  expect(after.activeKinetics.target).toBeUndefined(); expect(after.vessels.target.contents).toEqual([]);
  expect(mass()).toBeCloseTo(before + incomingStockMass, 9);
  after.shatterVessel('target', 'again'); expect(mass()).toBeCloseTo(before + incomingStockMass, 9);
});

it('warm contact, wet vessels, invalid/zero doses and non-glass tools do not satisfy the cold-shock criterion', () => {
  const hot = vessel('target', 0, { temperature_c: 200 });
  expect(liquidContactFailure(hot, water(10, 100), 10)).toBeUndefined();
  expect(liquidContactFailure({ ...hot, volume_ml: 20 }, water(10), 10)).toBeUndefined();
  expect(liquidContactFailure({ ...hot, type: 'wash_bottle' }, water(10), 10)).toBeUndefined();
  expect(liquidContactFailure(hot, water(10), 0)).toBeUndefined();
  expect(liquidContactFailure(hot, water(10, NaN), 10)).toBeUndefined();
});

it('Studio hot-glass quick test uses a real dose and leaves exactly that dose outside the broken glass', async () => {
  setup(25);
  await runContactScenario('target', 'thermal_shock');
  const s = useAppStore.getState();
  expect(s.vessels.target.isShattered).toBe(true);
  expect(Object.values(s.spills).reduce((sum, p) => sum + p.volume_ml, 0)).toBeCloseTo(10, 12);
  expect(Object.values(s.spills).reduce((sum, p) => sum + p.mass_g, 0)).toBeCloseTo(10, 12);
});

it('sealed and broken receivers reject aliquots without mutating the sample; a sealed source rejects pipette aspiration', () => {
  for (const patch of [{ isSealed: true }, { isShattered: true }]) {
    const v = vessel('target', 0, patch), sample = water(5), received = dispenseAliquot(v, sample, 2);
    expect(received.dispensed_ml).toBe(0); expect(received.vessel).toBe(v); expect(received.sample).toBe(sample);
  }
  setup(); useAppStore.getState().setVesselState('source', { isSealed: true });
  useAppStore.getState().setSelectedVesselId('source'); expect(aspiratePipette(5).ok).toBe(false);
  expect(useAppStore.getState().pipetteSample).toBeNull(); expect(useAppStore.getState().vessels.source.volume_ml).toBe(25);
});

it('metered burette solution contains its solvent and remains transferable after repeated drops', () => {
  const s = setup(25), initial = mass();
  for (let i = 0; i < 10; i++) s.dispenseBuretteDrop('target');
  const target = useAppStore.getState().vessels.target;
  expect(target.volume_ml).toBeCloseTo(0.5, 10); expect(target.contents.reduce((sum, c) => sum + c.mass_g, 0)).toBeCloseTo(target.mass_g, 12);
  expect(target.contents.find(c => c.formula === 'H2O')!.mass_g).toBeGreaterThan(0.49);
  expect(s.transferLiquidContinuous('target', 'other', 0.2).moved_ml).toBeCloseTo(0.2, 12);
  expect(mass()).toBeCloseTo(initial, 10);
});

it('invalid aqueous burette concentrations and elemental metal reagents cannot manufacture mass or start dosing', () => {
  expect(buretteAliquot(findChemical('NaCl'), 'NaCl', 100, 0.05, 25)).toBeNull();
  expect(buretteAliquot(findChemical('Na'), 'Na(s)', 0.1, 0.05, 25)).toBeNull();
  const s = setup(25), v = s.vessels.target;
  s.updateBurette({ concentration_M: Infinity }); s.dispenseBuretteDrop('target');
  expect(useAppStore.getState().burette.currentVolume_ml).toBe(1); expect(useAppStore.getState().vessels.target).toBe(v);
});

it('titration volumes belong to each receiver and unsupported readings remain gaps', () => {
  const s = setup(25);
  s.dispenseBuretteDrop('target'); s.dispenseBuretteDrop('other'); s.dispenseBuretteDrop('target');
  const history = useAppStore.getState().titrationHistory;
  expect(history.map(p => p.volumeAdded_ml)).toEqual([0.05, 0.05, 0.1]);
  expect(history.map(p => p.vesselId)).toEqual(['target', 'other', 'target']);
  expect(history.every(p => p.ph === null)).toBe(true);
  const target = vessel('target', 50);
  useAppStore.setState({ vessels: { ...useAppStore.getState().vessels, target } });
  s.dispenseBuretteDrop('target');
  const measured = useAppStore.getState().titrationHistory.at(-1)!;
  expect(measured.ph).not.toBeNull(); expect(measured.ph!).toBeLessThan(7);
});

it.each([10, 30, 60, 120])('automatic burette meters the selected flow at %s FPS across 1/4/8x without draining during pause', fps => {
  for (const timeScale of [1, 4, 8]) {
    const clock = new BuretteFlowClock(); let available = 100;
    const dispense = () => { const dose = Math.min(0.05, available); available -= dose; return dose; };
    for (let i = 0; i < fps * 2; i++) clock.step(simulationFrameDt(1 / fps, { timeScale, isSimulationPaused: false }), true, 2, available, dispense);
    expect(100 - available).toBeCloseTo(4 * timeScale, 8);
    const paused = available;
    for (let i = 0; i < 100; i++) clock.step(simulationFrameDt(1 / fps, { timeScale, isSimulationPaused: true }), true, 2, available, dispense);
    expect(available).toBe(paused);
  }
});

it('a partial final burette drop and a rejected receipt cannot build a later burst of unmetered liquid', () => {
  const clock = new BuretteFlowClock(); let remaining = 0.03;
  expect(clock.step(0.015, true, 2, remaining, () => { const dose = remaining; remaining = 0; return dose; })).toBe(0.03);
  expect(clock.step(1, true, 2, 5, () => 0)).toBe(0);
  expect(clock.step(0.01, true, 2, 5, () => 0.05)).toBe(0);
});

it('pH reads current aqueous chemistry immediately without changing a paused specimen or trusting a default 7', () => {
  const contents = [row('CuSO4', 0.798045, 'aq'), row('H2O', 49.201955, 'l')];
  const sample = vessel('target', 50, { contents, substances: ['CuSO4', 'H2O'] }), before = JSON.stringify(sample);
  const observation = sampleMeasurement(sample);
  expect(observation.ph).not.toBeNull(); expect(observation.ph!).toBeLessThan(7); expect(JSON.stringify(sample)).toBe(before);
  setup(25); useAppStore.setState({ vessels: { target: sample }, selectedVesselId: 'target', isSimulationPaused: true });
  expect(Number(readInstrument('ph_meter').value)).toBeCloseTo(observation.ph!, 2);
});

it('unsupported media, shallow films, sealed and broken vessels do not display an invented pH', () => {
  const oil = vessel('target', 50, { contents: [row('C6H14', 33, 'l')], substances: ['C6H14'], mass_g: 33 });
  for (const v of [oil, vessel('target', 0.06), vessel('target', 50, { isSealed: true }), vessel('target', 50, { isShattered: true })]) {
    expect(sampleMeasurement(v).ph).toBeNull();
    useAppStore.setState({ vessels: { target: v }, selectedVesselId: 'target' });
    expect(readInstrument('ph_meter').valid).toBe(false); expect(readInstrument('ph_meter').value).toBe('---');
  }
  expect(formatPH(NaN)).toBe('---'); expect(formatPH(14.3)).toBe('14.30'); expect(formatTemperature(NaN)).toBe('—°C');
});

it('probe placement follows actual liquid depth/capacity and weighing includes both wall condensate inventories', () => {
  const v = vessel('target', 50), p = probePoint(v, 0.09);
  expect(p).not.toBeNull(); expect(probePoint(vessel('target', 0), 0.09)).toBeNull();
  const wall = stepWallCondensation(v, 0, 0).wall;
  const wet = { ...v, wallCondensation: { ...wall, inner_g: 0.3, outer_g: 0.2 } };
  expect(calculateVesselMass(wet) - calculateVesselMass(v)).toBeCloseTo(0.5, 12);
});
