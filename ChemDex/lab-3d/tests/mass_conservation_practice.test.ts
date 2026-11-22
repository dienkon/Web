import { afterEach, beforeEach, expect, it } from 'vitest';
import { EXPERIMENT_CURRICULUM } from '../src/data/experiments';
import { experimentEngine } from '../src/engine/experimentEngine';
import { MASS_CONSERVATION, assessMassConservation, massConservationPourPending,
  type WeighingStage } from '../src/engine/massConservationPractice';
import { pourTargetPose } from '../src/engine/pourTransport';
import { balanceOccupant, tareBalance } from '../src/handling/instrumentOperations';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { clearHistory } from '../src/store/persistence';
import { useAppStore } from '../src/store/useAppStore';

const { id, receiverId, sourceId } = MASS_CONSERVATION;
const get = useAppStore.getState;
const initial = get(), initialInstruments = useInstrumentStore.getState();
const assess = () => assessMassConservation(get().vessels, 'exam', massConservationPourPending(get().inFlightPours));
const steps = () => assess().steps.map(step => step.isValid);

function weighBoth(stage: WeighingStage) {
  for (const cup of [receiverId, sourceId]) {
    expect(get().placeConservationCup(cup)).toBe(true);
    expect(balanceOccupant()?.id).toBe(cup);
    expect(get().recordConservationWeighing(stage)).toBe(true);
  }
}

beforeEach(() => {
  get().resetWorkbench();
  clearHistory();
  useInstrumentStore.getState().setTare(0);
  get().setExperimentDifficulty('exam');
  get().setupExperimentPreset(id);
});

afterEach(() => {
  get().resetWorkbench();
  useAppStore.setState(initial, true);
  useInstrumentStore.setState(initialInstruments, true);
  clearHistory();
});

it('compares four pan readings even when the user tares one reading and leaves solution in the source', async () => {
  expect(steps()).toEqual([false, false, false]);
  expect(tareBalance().ok).toBe(true);
  expect(get().recordConservationWeighing('before')).toBe(true);
  expect(assess().cups?.receiver.before).toMatchObject({ displayed_g: 0, tareOffset_g: 110.8, gross_g: 110.8 });
  expect(steps()).toEqual([false, false, false]);
  useInstrumentStore.getState().setTare(0);
  weighBoth('before');
  expect(steps()).toEqual([true, false, false]);
  await get().pourVessel(sourceId, receiverId, 12.5);
  expect(steps()).toEqual([true, true, false]);
  weighBoth('after');
  expect(steps()).toEqual([true, true, true]);
  expect(assess().metrics).toMatchObject({ conservationBefore_g: 221.6, conservationAfter_g: 221.6,
    conservationSourceLeft_g: 12.9, conservationReceived_g: 12.9, conservationSpilled_g: 0, conservationError_g: 0 });
  expect(assess().metrics.conservationPrecipitate_g).toBeGreaterThan(0.5);
  const lesson = EXPERIMENT_CURRICULUM.find(lesson => lesson.id === id)!;
  const state = get();
  expect(lesson.steps.map(step => experimentEngine.validateStep(step, {
    vessels: state.vessels, burners: state.burners, activeTool: state.activeTool, spatulaState: state.spatulaState,
    contaminatedTools: state.toolContamination, recentActions: [], inFlightPours: state.inFlightPours,
  }, 'exam').isValid)).toEqual([true, true, true]);
  expect(get().emptyVessel(receiverId)).toBe(true);
  expect(steps()).toEqual([false, false, false]);
  get().undo();
  expect(steps()).toEqual([true, true, true]);
});

it('counts only spills from the prepared source and reconciles them with the measured deficit', async () => {
  weighBoth('before');
  const preparedSource = get().vessels[sourceId];
  useAppStore.setState(state => ({ vessels: { ...state.vessels, extra: {
    ...preparedSource, id: 'extra', massConservationPractice: undefined, position: [0, 0, 2],
  } } }));
  expect(get().transferLiquidContinuous('extra', null, 2).spilled_ml).toBeCloseTo(2, 7);
  const spill = get().transferLiquidContinuous(sourceId, null, 5);
  expect(spill.spilled_ml).toBeCloseTo(5, 7);
  await get().pourVessel(sourceId, receiverId, 10);
  get().cleanSpills();
  expect(Object.keys(get().spills)).toHaveLength(0);
  weighBoth('after');
  expect(steps()).toEqual([true, true, true]);
  expect(assess().metrics).toMatchObject({ conservationBefore_g: 221.6, conservationAfter_g: 216.44,
    conservationSourceLeft_g: 10.32, conservationReceived_g: 10.32, conservationSpilled_g: 5.16, conservationError_g: 0 });
});

it('requires fresh readings after an extra addition and then rejects the extra mass', async () => {
  weighBoth('before');
  await get().pourVessel(sourceId, receiverId, 12.5);
  weighBoth('after');
  expect(steps()).toEqual([true, true, true]);
  await get().mixSubstances(receiverId, 'H2O', 2);
  expect(steps()).toEqual([true, true, false]);
  expect(assess().metrics.conservationError_g).toBeUndefined();
  weighBoth('after');
  expect(steps()).toEqual([true, true, false]);
  expect(assess().metrics.conservationError_g).toBeCloseTo(2, 2);
});

it('accounts for ambient evaporation between live readings without invalidating them', async () => {
  const tick = () => { for (let frame = 0; frame < 120; frame++) get().tickSimulation(0.25); };
  tick();
  expect(get().vessels[sourceId].waterVaporReleased_g).toBeGreaterThan(0);
  weighBoth('before');
  tick();
  expect(steps()).toEqual([true, false, false]);
  await get().pourVessel(sourceId, receiverId, 12.5);
  tick();
  weighBoth('after');
  tick();
  expect(steps()).toEqual([true, true, true]);
  expect(assess().metrics.conservationWaterVapor_g).toBeGreaterThan(0);
  expect(assess().metrics.conservationError_g).toBeLessThanOrEqual(0.002);
});

it('waits for animated transport before marking the reaction and accepting new weighings', () => {
  weighBoth('before');
  const receiver = get().vessels[receiverId];
  const point = receiver.position;
  expect(get().releasePourLiquid({ id: 'parcel', sessionId: 'conservation', sourceId, sourceName: 'Source',
    targetId: receiverId, targetPose: pourTargetPose(receiver), duration_s: 0.1, trajectory: {
      exitPos: point, exitVel: [0, -1, 0], impactPos: point, targetVesselId: receiverId,
      landingKind: 'inside', detailKind: 'liquid', timeOfFlight: 0.2,
    } }, 12.5)).toBeCloseTo(12.5, 8);
  expect(get().releasePourLiquid({ id: 'missed', sessionId: 'conservation', sourceId, sourceName: 'Source',
    targetId: null, targetPose: '', duration_s: 0.1, trajectory: {
      exitPos: [0, 0, 0], exitVel: [0, -1, 0], impactPos: [0, 0, 0], targetVesselId: null,
      landingKind: 'table', timeOfFlight: 0.8,
    } }, 2.5)).toBeCloseTo(2.5, 8);
  expect(get().recordConservationWeighing('after')).toBe(false);
  expect(steps()).toEqual([true, false, false]);
  get().advancePourTransport(0.4);
  expect(steps()).toEqual([true, false, false]);
  get().advancePourTransport(0.6);
  expect(steps()).toEqual([true, true, false]);
  weighBoth('after');
  expect(assess().metrics).toMatchObject({ conservationReceived_g: 12.9, conservationSpilled_g: 2.58, conservationError_g: 0 });
  expect(steps()).toEqual([true, true, true]);
});

it('rejects a pour before baseline readings and separates observation and new attempts', async () => {
  await get().pourVessel(sourceId, receiverId, 5);
  expect(get().recordConservationWeighing('before')).toBe(false);
  expect(steps()).toEqual([false, false, false]);
  const attempt = assess().cups?.receiver.attemptId;
  get().setupExperimentPreset(id, 'observation');
  expect(get().recordConservationWeighing('before')).toBe(false);
  expect(assess().cups).toBeNull();
  get().setupExperimentPreset(id);
  expect(assess().cups?.receiver.attemptId).not.toEqual(attempt);
  expect(steps()).toEqual([false, false, false]);
});
