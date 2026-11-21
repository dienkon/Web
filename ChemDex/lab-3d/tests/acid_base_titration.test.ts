import { afterEach, beforeEach, expect, it } from 'vitest';
import { EXPERIMENT_CURRICULUM } from '../src/data/experiments';
import { ACID_BASE_EQUIVALENCE_ML, ACID_BASE_TITRATION, acidBaseReportedPh,
  assessAcidBaseTitration } from '../src/engine/acidBaseTitration';
import { alignSelectedVessel, dispenseOneBuretteDrop, serviceBurette } from '../src/handling/instrumentOperations';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { sameMolecularFormula } from '../src/science/speciesIdentity';
import { clearHistory } from '../src/store/persistence';
import { useAppStore } from '../src/store/useAppStore';
import { ObservationSession } from '../src/engine/observation';
import { experimentEngine } from '../src/engine/experimentEngine';

const setup = ACID_BASE_TITRATION;
const get = useAppStore.getState;
const original = get();
const sample = () => get().vessels[setup.vesselId];
const assess = () => assessAcidBaseTitration(sample(), 'exam');
const curriculumSteps = EXPERIMENT_CURRICULUM.find(lesson => lesson.id === setup.id)!.steps;
const verifyCurriculum = () => {
  const { vessels, burners, activeTool, spatulaState, toolContamination } = get();
  return curriculumSteps.map(step => experimentEngine.validateStep(step, {
    vessels, burners, activeTool, spatulaState, contaminatedTools: toolContamination, recentActions: [],
  }, 'exam').isValid);
};
const closeDropPresentation = () => useInstrumentStore.getState().clearBurettePresentations();

beforeEach(() => {
  get().resetWorkbench();
  clearHistory();
  get().setupExperimentPreset(setup.id);
});

afterEach(() => {
  get().resetWorkbench();
  useAppStore.setState(original, true);
  clearHistory();
});

it('prepares one burette load and measures the endpoint on the actual flask after 400 accepted drops', async () => {
  expect(sample().contents.find(row => sameMolecularFormula(row.formula, 'HCl'))?.moles).toBeCloseTo(.002, 13);
  expect(get().burette).toMatchObject({ reagentFormula: 'NaOH', concentration_M: .1, currentVolume_ml: 50 });
  expect(ACID_BASE_EQUIVALENCE_ML).toBe(20);
  expect(assess().steps.map(step => step.isValid)).toEqual([true, false, false]);
  expect(verifyCurriculum()).toEqual([true, false, false]);
  expect(assess().metrics.titrationDelivered_ml).toBe(0);
  expect(acidBaseReportedPh(sample())).toBeCloseTo(1, 1);
  get().setRightSidebarOpen(false);
  await get().mixSubstances(setup.vesselId, setup.indicator, setup.indicatorDose_ml, undefined, { revealInspector: false });
  expect(get().rightSidebarOpen).toBe(false);
  expect(assess().steps.map(step => step.isValid)).toEqual([true, true, false]);
  expect(verifyCurriculum()).toEqual([true, true, false]);
  expect(alignSelectedVessel('burette').ok).toBe(true);

  for (let i = 0; i < 400; i++) {
    get().dispenseBuretteDrop(setup.vesselId);
    closeDropPresentation();
  }
  expect(get().burette.currentVolume_ml).toBeCloseTo(30, 9);
  expect(assess().steps.map(step => step.isValid)).toEqual([true, true, true]);
  expect(verifyCurriculum()).toEqual([true, true, true]);
  expect(assess().metrics).toMatchObject({ titrationDelivered_ml: 20, titrationTarget_ml: 20, titrationError_ml: 0 });
  expect(acidBaseReportedPh(sample())).toBeCloseTo(7, 1);
  expect(get().titrationHistory.at(-1)?.ph).toBeCloseTo(7, 1);
  expect(dispenseOneBuretteDrop().ok).toBe(true);
  closeDropPresentation();
  expect(acidBaseReportedPh(sample())).toBeGreaterThan(9);
  expect(assess().metrics.titrationDelivered_ml).toBe(20.05);

  get().clearTitrationHistory(setup.vesselId);
  expect(get().titrationHistory).toHaveLength(0);
  expect(assess().metrics.titrationDelivered_ml).toBe(20.05);
  expect(get().emptyVessel(setup.vesselId)).toBe(true);
  expect(assess().steps.map(step => step.isValid)).toEqual([false, false, false]);
  expect(verifyCurriculum()).toEqual([false, false, false]);
  get().undo();
  expect(assess().metrics.titrationDelivered_ml).toBe(20.05);
});

it('counts only correct-stock burette deliveries in the prepared flask and resets a new attempt', async () => {
  await get().mixSubstances(setup.vesselId, 'NaOH', .1);
  expect(assess().metrics.titrationDelivered_ml).toBe(0);
  const beakerPosition = get().vessels.beaker_1.position;
  get().openVesselInfo('beaker_1');
  expect(alignSelectedVessel('burette').ok).toBe(true);
  expect(dispenseOneBuretteDrop().ok).toBe(true);
  closeDropPresentation();
  expect(get().titrationHistory.at(-1)?.vesselId).toBe('beaker_1');
  expect(assess().metrics.titrationDelivered_ml).toBe(0);
  get().updateVesselPosition('beaker_1', beakerPosition);
  get().openVesselInfo(setup.vesselId);
  expect(alignSelectedVessel('burette').ok).toBe(true);
  expect(serviceBurette('discard').ok).toBe(true);
  expect(serviceBurette('fill', 'naoh-005').ok).toBe(true);
  expect(dispenseOneBuretteDrop().ok).toBe(true);
  closeDropPresentation();
  expect(assess().metrics).toMatchObject({ titrationDelivered_ml: 0, titrationOtherTitrant_ml: .05 });
  get().undo();
  expect(assess().metrics.titrationOtherTitrant_ml).toBe(0);
  get().redo();
  expect(assess().metrics.titrationOtherTitrant_ml).toBe(.05);
  get().toggleBuretteStopcock();
  expect(get().burette.isDispensing).toBe(true);
  get().setupExperimentPreset(setup.id);
  expect(get().burette).toMatchObject({ isDispensing: false, currentVolume_ml: 50, concentration_M: .1 });
  expect(assess().metrics).toMatchObject({ titrationDelivered_ml: 0, titrationOtherTitrant_ml: 0 });
});

it('keeps the automatic observation separate from the assessed practice sample', () => {
  get().updateBurette({ currentVolume_ml: 12 });
  const observation = new ObservationSession(setup.id);
  expect(observation.total).toBeCloseTo(20, 9);
  expect(get().burette.currentVolume_ml).toBe(12);
  expect(assess().steps.map(step => step.isValid)).toEqual([false, false, false]);
  observation.stop();
  get().setupExperimentPreset(setup.id);
  expect(assess().steps.map(step => step.isValid)).toEqual([true, false, false]);
});
