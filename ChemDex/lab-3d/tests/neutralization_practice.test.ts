import { afterEach, beforeEach, expect, it } from 'vitest';
import { EXPERIMENT_CURRICULUM } from '../src/data/experiments';
import { experimentEngine, type ProceduralStep } from '../src/engine/experimentEngine';
import { NEUTRALIZATION_PRACTICE, assessNeutralizationPractice, type PracticeProbe } from '../src/engine/neutralizationPractice';
import { pourTargetPose } from '../src/engine/pourTransport';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { neutralPhAtTemperature } from '../src/science/aqueousTemperature';
import { sampleMeasurement } from '../src/science/sampleMeasurement';
import { vesselWorldLiquidSurfaceY } from '../src/science/vesselGeometry';
import { clearHistory } from '../src/store/persistence';
import { useAppStore } from '../src/store/useAppStore';
import { useLabEnvironment } from '../src/store/useLabEnvironment';

const get = useAppStore.getState, original = get();
const environment = useLabEnvironment.getState().conditions;
const { id, sourceId, receiverId } = NEUTRALIZATION_PRACTICE;
const receiver = () => get().vessels[receiverId];
const assess = () => assessNeutralizationPractice(get().vessels, 'exam');
const steps = () => assess().steps.map(step => step.isValid);
const publish = useInstrumentStore.getState().publishPracticeProbe;

function probe(tool: PracticeProbe) {
  const vessel = receiver();
  const measured = sampleMeasurement(vessel);
  const point = tool === 'thermometer' ? measured.thermometerPoint : measured.phPoint;
  const value = tool === 'thermometer' ? measured.temperature_c : measured.ph;
  if (!point || value === null) throw Error('Sensor fixture has no valid model reading');
  return { tool, point, value: Number(value.toFixed(2)), attemptId: vessel.neutralizationPractice!.attemptId,
    epoch: get().pourEpoch, settled: true };
}

beforeEach(() => {
  get().resetWorkbench();
  clearHistory();
  useLabEnvironment.setState({ conditions: { ...environment, temperature_c: 25 } });
  get().setExperimentDifficulty('exam');
  get().setupExperimentPreset(id);
});
afterEach(() => {
  publish('thermometer', null);
  publish('ph_meter', null);
  get().resetWorkbench();
  useAppStore.setState(original, true);
  useLabEnvironment.setState({ conditions: environment });
  clearHistory();
});

it('initializes exact mole balance and grades a real pour and two recorded probes in sequence', async () => {
  const data = EXPERIMENT_CURRICULUM.find(lesson => lesson.id === id)!;
  const empty = { vessels: {}, burners: {}, activeTool: 'thermometer', spatulaState: { chemical: null, mass_g: 0 },
    contaminatedTools: {}, recentActions: [] };
  for (const step of data.steps)
    expect(experimentEngine.validateStep(step as ProceduralStep, empty, 'exam').isValid).toBe(false);
  expect(receiver().contents[0].moles).toBeCloseTo(.08, 14);
  expect(get().vessels[sourceId].contents[0].moles).toBeCloseTo(.08, 14);
  expect(steps()).toEqual([false, false, false]);
  get().setActiveTool('thermometer');
  expect(get().recordNeutralizationProbe('thermometer')).toBe(false);
  const initial = probe('thermometer');
  publish('thermometer', { ...initial, settled: false });
  expect(get().recordNeutralizationProbe('thermometer')).toBe(false);
  publish('thermometer', { ...initial, epoch: initial.epoch - 1 });
  expect(get().recordNeutralizationProbe('thermometer')).toBe(false);
  publish('thermometer', { ...initial, point: [initial.point[0] + .2, initial.point[1], initial.point[2]] });
  expect(get().recordNeutralizationProbe('thermometer')).toBe(false);
  publish('thermometer', initial);
  useAppStore.setState({ selectedVesselId: sourceId });
  expect(get().recordNeutralizationProbe('thermometer')).toBe(false);
  useAppStore.setState({ selectedVesselId: receiverId });
  expect(get().recordNeutralizationProbe('thermometer')).toBe(true);
  expect(steps()).toEqual([true, false, false]);

  await get().pourVessel(sourceId, receiverId, undefined, { revealInspector: false });
  expect(steps()).toEqual([true, true, false]);
  expect(assess().metrics.neutralizationReceived_ml).toBe(40);
  expect(assess().metrics.neutralizationPeak_c).toBeCloseTo(37.14, 1);
  expect(assess().metrics.neutralizationRise_c).toBeCloseTo(12.14, 1);
  expect(get().recordNeutralizationProbe('thermometer')).toBe(false);
  get().setActiveTool('ph_meter');
  const endpoint = probe('ph_meter');
  publish('ph_meter', endpoint);
  expect(get().recordNeutralizationProbe('ph_meter')).toBe(true);
  expect(steps()).toEqual([true, true, true]);
  const metrics = assess().metrics;
  expect(metrics.finalPh).toBeCloseTo(6.81, 2);
  expect(metrics.neutralizationNeutralPh).toBe(neutralPhAtTemperature(metrics.neutralizationMeasurement_c!));
  get().undo();
  expect(steps()).toEqual([true, true, false]);
  get().redo();
  expect(steps()).toEqual([true, true, true]);
});

it('credits airborne stock upon arrival and rejects another pour after a valid reading changes the sample', async () => {
  get().setActiveTool('thermometer');
  publish('thermometer', probe('thermometer'));
  expect(get().recordNeutralizationProbe('thermometer')).toBe(true);
  const s = get(), vessel = receiver(), source = s.vessels[sourceId];
  const profile = getWorldVesselProfile(vessel.type, vessel.capacity_ml);
  const mouthY = vessel.position[1] + profile.lipLocal[1];
  const trajectory = traceLaunchedStream([vessel.position[0], mouthY + .3, vessel.position[2]],
    [0, -1, 0], { id: receiverId, position: vessel.position, mouthR: profile.mouthR, mouthY,
      liquidSurfaceY: vesselWorldLiquidSurfaceY(vessel), profile }, -.135);
  expect(trajectory.landingKind).toBe('inside');
  expect(s.releasePourLiquid({ id: 'neutralization-dose', sessionId: 'practice', sourceId, sourceName: source.name,
    targetId: receiverId, targetPose: pourTargetPose(vessel), duration_s: .1, trajectory }, 40)).toBe(40);
  expect(assess().metrics.neutralizationReceived_ml).toBe(0);
  for (let i = 0; i < 40; i++) s.advancePourTransport(.05);
  expect(assess().metrics.neutralizationReceived_ml).toBeCloseTo(40, 8);
  expect(steps()).toEqual([true, true, false]);
  get().setActiveTool('ph_meter');
  publish('ph_meter', probe('ph_meter'));
  expect(get().recordNeutralizationProbe('ph_meter')).toBe(true);
  expect(steps()).toEqual([true, true, true]);
  await get().mixSubstances(receiverId, 'HCl (dil)', .05);
  expect(steps()[2]).toBe(false);
});
