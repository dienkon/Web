import { EXPERIMENTS_CATALOG } from '../../data/experiments';
import { pushSnapshot } from '../labStoreHelpers';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type ExperimentSlice = Pick<
  LabStoreState,
  | 'activeMode'
  | 'activeExperiment'
  | 'currentStepIndex'
  | 'stepCompleted'
  | 'completedExperiments'
  | 'studentNotes'
  | 'setActiveMode'
  | 'setStudentNotes'
  | 'completeExperiment'
  | 'selectExperiment'
  | 'nextStep'
  | 'prevStep'
  | 'checkStepProgress'
>;

export const createExperimentSlice: LabSliceCreator<ExperimentSlice> = (set, get) => ({
  activeMode: 'free',
  activeExperiment: null,
  currentStepIndex: 0,
  stepCompleted: false,
  studentNotes: '',
  completedExperiments: (() => {
    try {
      return typeof window === 'undefined'
        ? {}
        : JSON.parse(localStorage.getItem('chemdex:completed-experiments') ?? '{}');
    } catch {
      return {};
    }
  })(),

  setActiveMode: (mode) => set({ activeMode: mode, isShowcaseActive: false }),
  setStudentNotes: (studentNotes) => set({ studentNotes }),

  completeExperiment: () => {
    const state = get();
    if (
      !state.activeExperiment ||
      state.currentStepIndex !== state.activeExperiment.steps.length - 1 ||
      !state.checkStepProgress()
    ) {
      return false;
    }
    const completedExperiments = {
      ...state.completedExperiments,
      [state.activeExperiment.id]: new Date().toISOString(),
    };
    try {
      localStorage.setItem('chemdex:completed-experiments', JSON.stringify(completedExperiments));
    } catch {}
    set({ completedExperiments, isQuizModalOpen: true });
    return true;
  },

  selectExperiment: (experimentId) => {
    if (!experimentId) {
      set({ activeExperiment: null, activeMode: 'free', currentStepIndex: 0, stepCompleted: false });
      return;
    }
    const exp = EXPERIMENTS_CATALOG.find(e => e.id === experimentId);
    if (!exp) return;

    set({
      ...pushSnapshot(get()),
      spillPuddles: [],
      studentNotes: '',
      activeExperiment: exp,
      activeMode: 'guided',
      currentStepIndex: 0,
      stepCompleted: false,
      equipment: {},
      selectedEquipmentId: null,
      history: [
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'RESET',
          details_en: `Started Guided Experiment: ${exp.title_en}`,
          details_vi: `Bắt đầu bài thực hành có hướng dẫn: ${exp.title_vi}`,
        },
      ],
    });
  },

  nextStep: () => {
    const { activeExperiment, currentStepIndex } = get();
    if (!activeExperiment) return;
    if (currentStepIndex < activeExperiment.steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1, stepCompleted: false });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1, stepCompleted: false });
    }
  },

  checkStepProgress: () => {
    const { activeExperiment, currentStepIndex, equipment } = get();
    if (!activeExperiment) return false;

    const step = activeExperiment.steps[currentStepIndex];
    if (!step) return false;

    const criteria = step.validationCriteria;
    const vessels = Object.values(equipment);

    const matches = vessels.some(v => {
      if (criteria.targetEquipment && v.type !== criteria.targetEquipment) return false;

      if (criteria.requiredFormulas && criteria.requiredFormulas.length > 0) {
        const hasAll = criteria.requiredFormulas.every(req =>
          v.contents.some(c => c.formula.toUpperCase() === req.toUpperCase() && c.moles > 1e-6)
        );
        if (!hasAll) return false;
      }

      if (criteria.requiredReactionId && !get().history.some(h => h.vesselId === v.id && h.reactionId === criteria.requiredReactionId))
        return false;
      if (criteria.absentFormulas?.some(formula => v.contents.some(c => c.formula === formula && c.moles > 1e-6))) return false;
      if (criteria.minMass_g !== undefined && v.mass_g < criteria.minMass_g) return false;
      if (criteria.minVolume_ml !== undefined && v.volume_ml < criteria.minVolume_ml) return false;
      if (criteria.maxVolume_ml !== undefined && v.volume_ml > criteria.maxVolume_ml) return false;
      if (criteria.targetPhMin !== undefined && v.ph < criteria.targetPhMin) return false;
      if (criteria.targetPhMax !== undefined && v.ph > criteria.targetPhMax) return false;
      if (criteria.minTemp_c !== undefined && v.temperature_c < criteria.minTemp_c) return false;
      if (criteria.mustHavePrecipitate && !v.hasPrecipitate) return false;
      if (criteria.precipitateFormula && v.precipitateSubstance?.toUpperCase() !== criteria.precipitateFormula.toUpperCase())
        return false;
      if (criteria.mustHaveGas && !v.hasGas) return false;

      return true;
    });

    if (matches) {
      if (!get().stepCompleted) set({ stepCompleted: true });
      return true;
    }
    if (get().stepCompleted) set({ stepCompleted: false });
    return false;
  },
});
