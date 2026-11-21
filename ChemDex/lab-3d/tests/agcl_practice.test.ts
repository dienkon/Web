import { afterEach, beforeEach, expect, it } from 'vitest';
import { EXPERIMENT_CURRICULUM } from '../src/data/experiments';
import { AGCL_PRACTICE, assessAgClPractice } from '../src/engine/agclPractice';
import { experimentEngine, type ProceduralStep } from '../src/engine/experimentEngine';
import { ObservationSession } from '../src/engine/observation';
import { pourTargetPose } from '../src/engine/pourTransport';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { vesselWorldLiquidSurfaceY } from '../src/science/vesselGeometry';
import { setRodContact } from '../src/science/stirring';
import { clearHistory } from '../src/store/persistence';
import { useAppStore } from '../src/store/useAppStore';

const get = useAppStore.getState;
const original = get();
const { id, sourceId, receiverId } = AGCL_PRACTICE;
const assess = () => assessAgClPractice(get().vessels, 'exam');
const steps = () => assess().steps.map(step => step.isValid);

function advanceChemistry() {
  for (let i = 0; i < 80; i++) get().tickSimulation(.1);
}

beforeEach(() => {
  get().resetWorkbench();
  clearHistory();
  get().setupExperimentPreset(id);
});

afterEach(() => {
  setRodContact(sourceId);
  setRodContact(receiverId);
  get().resetWorkbench();
  useAppStore.setState(original, true);
  clearHistory();
});

it('marks the authored steps only after delivery, precipitation, and one second of immersed stirring', async () => {
  const data = EXPERIMENT_CURRICULUM.find(lesson => lesson.id === id)!;
  const validation = { vessels: {}, burners: {}, activeTool: 'stirring_rod', spatulaState: { chemical: null, mass_g: 0 },
    contaminatedTools: {}, recentActions: [] };
  for (const step of data.steps)
    expect(experimentEngine.validateStep(step as ProceduralStep, validation, 'exam').isValid).toBe(false);
  expect(steps()).toEqual([true, false, false]);
  get().setRightSidebarOpen(false);
  await get().pourVessel(sourceId, receiverId, undefined, { revealInspector: false });
  expect(get().rightSidebarOpen).toBe(false);
  expect(assess().metrics.agclReceived_ml).toBe(25);
  get().undo();
  expect(steps()).toEqual([true, false, false]);
  get().redo();
  expect(assess().metrics.agclReceived_ml).toBe(25);
  advanceChemistry();
  expect(assess().metrics.agclReceived_ml).toBe(25);
  expect(assess().metrics.agclPrecipitate_g).toBeCloseTo(.358, 2);
  expect(steps()).toEqual([true, true, false]);

  useAppStore.setState({ selectedVesselId: sourceId, activeTool: 'stirring_rod' });
  setRodContact(sourceId, true);
  get().tickSimulation(1.1);
  expect(assess().metrics.agclStirred_s).toBe(0);
  useAppStore.setState({ selectedVesselId: receiverId });
  setRodContact(receiverId, false);
  get().tickSimulation(1.1);
  expect(assess().metrics.agclStirred_s).toBe(0);
  setRodContact(receiverId, true);
  get().tickSimulation(.4);
  expect(assess().metrics.agclStirred_s).toBe(.4);
  get().setSimulationPaused(true);
  get().tickSimulation(3);
  expect(assess().metrics.agclStirred_s).toBe(.4);
  get().setSimulationPaused(false);
  get().tickSimulation(.6);
  expect(steps()).toEqual([true, true, true]);
  expect(assess().metrics.agclStirred_s).toBe(1);
  get().setupExperimentPreset(id);
  expect(steps()).toEqual([true, false, false]);
  expect(get().activeTool).toBe('none');
});

it('uses an accepted bulk arrival for an airborne dose and ignores a pour from another cylinder', () => {
  const s = get(), source = s.vessels[sourceId], receiver = s.vessels[receiverId];
  useAppStore.setState({ vessels: { ...s.vessels, other: { ...source, id: 'other' } } });
  expect(s.transferLiquidContinuous('other', receiverId, 10).accepted_ml).toBe(10);
  expect(assess().metrics.agclReceived_ml).toBe(0);

  const profile = getWorldVesselProfile(receiver.type, receiver.capacity_ml);
  const mouthY = receiver.position[1] + profile.lipLocal[1];
  const exit: [number, number, number] = [receiver.position[0], mouthY + .3, receiver.position[2]];
  const trajectory = traceLaunchedStream(exit, [0, -1, 0], { id: receiver.id, position: receiver.position,
    mouthR: profile.mouthR, mouthY, liquidSurfaceY: vesselWorldLiquidSurfaceY(get().vessels[receiverId]), profile }, -.135);
  expect(trajectory.landingKind).toBe('inside');
  expect(s.releasePourLiquid({ id: 'practice-air-dose', sessionId: 'practice', sourceId, sourceName: source.name,
    targetId: receiverId, targetPose: pourTargetPose(get().vessels[receiverId]), duration_s: .1, trajectory }, 25)).toBe(25);
  expect(assess().metrics.agclReceived_ml).toBe(0);
  for (let i = 0; i < 30; i++) get().advancePourTransport(.05);
  expect(assess().metrics.agclReceived_ml).toBeCloseTo(25, 8);
  get().advancePourTransport(2);
  expect(assess().metrics.agclReceived_ml).toBeCloseTo(25, 8);
  advanceChemistry();
  expect(steps()).toEqual([true, false, false]);
});

it('does not carry assessed evidence into the observation preset', () => {
  const run = new ObservationSession(id);
  expect(run.total).toBeCloseTo(25, 8);
  expect(steps()).toEqual([false, false, false]);
  for (let i = 0; i < 100; i++) { run.advance(.25); get().tickSimulation(.25); }
  expect(run.phase).toBe('complete');
  expect(assess().metrics.agclReceived_ml).toBe(0);
});
