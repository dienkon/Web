export type LessonPhase = 'aq' | 's' | 'l' | 'g';
export type LessonFamily =
  | 'addition'
  | 'substitution'
  | 'combustion'
  | 'oxidation'
  | 'neutralization'
  | 'esterification'
  | 'hydrolysis'
  | 'complexation'
  | 'fermentation'
  | 'decomposition'
  | 'hydration';
export type LessonConditionKind =
  | 'mixed'
  | 'temperature'
  | 'pressure'
  | 'catalyst'
  | 'ignition'
  | 'acidic'
  | 'alkaline'
  | 'enzyme'
  | 'industrial'
  | 'oxygen';
export type LessonStatus =
  | 'prepared'
  | 'waiting'
  | 'running'
  | 'paused'
  | 'complete'
  | 'stopped';
export type LessonEffectKind =
  | 'color'
  | 'precipitation'
  | 'dissolution'
  | 'bubbles'
  | 'flame'
  | 'deposition'
  | 'phase_separation'
  | 'condensation'
  | 'invisible';

export interface LessonSpecies {
  id: string;
  formula: string;
  name_vi: string;
  phase: LessonPhase;
  color: string;
  molarMass: number;
  density?: number;
  acid?: {
    kind: 'strong_acid' | 'weak_acid' | 'strong_base' | 'weak_base';
    equivalents: number;
    pKa?: number;
  };
  amountBasis?: 'molecule' | 'repeat_unit';
}

export interface LessonTerm {
  species: string;
  coefficient: number;
}

export interface LessonCondition {
  kind: LessonConditionKind;
  label_vi: string;
  minimum?: number;
  maximum?: number;
  value?: string;
}

export interface LessonEffect {
  kind: LessonEffectKind;
  species?: string;
  color: string;
  location: 'bulk' | 'surface' | 'bottom' | 'metal' | 'headspace';
  onset: number;
  peak: number;
  end: number;
  explanation_vi: string;
  persists: boolean;
  maximumParticles?: number;
}

export interface LessonCheckpoint {
  id: string;
  title_vi: string;
  instruction_vi: string;
  observation_vi: string;
  progress: number;
}

export interface LessonQuestion {
  prompt_vi: string;
  choices_vi: string[];
  correct: number;
  explanation_vi: string;
}

export interface LessonDefinition {
  id: string;
  title_vi: string;
  family: LessonFamily;
  grades: number[];
  equation: string;
  reactants: LessonTerm[];
  products: LessonTerm[];
  conditions: LessonCondition[];
  effects: LessonEffect[];
  checkpoints: LessonCheckpoint[];
  question: LessonQuestion;
  explanation_vi: string;
  observation_vi: string;
  safety_vi: string;
  misconception_vi: string;
  duration_s: number;
  model: 'mixing_limited' | 'surface_limited' | 'heat_activated' | 'enzyme_limited';
  reversible?: {
    targetConversion: number;
    basis: 'illustrative';
  };
  initialColor: string;
  finalColor: string;
  finalTurbidity: number;
  physicalTime_vi: string;
  sources: string[];
}

export interface LessonInventoryItem {
  species: string;
  initial_mol: number;
  amount_mol: number;
  consumed_mol: number;
  produced_mol: number;
  escaped_mol: number;
}

export interface LessonEnvironment {
  pressure_bar: number;
  temperature_c: number;
  targetTemperature_c: number;
  pH: number;
  mixed: boolean;
  stirring: boolean;
  catalysts: string[];
  enzymes: string[];
  ignition: boolean;
  industrial: boolean;
  oxygenAvailable: boolean;
  vented: boolean;
}

export interface LessonConditionResult {
  condition: LessonCondition;
  satisfied: boolean;
  message_vi: string;
}

export interface LessonVisualState {
  color: string;
  turbidity: number;
  gasRate_mol_s: number;
  gasSpecies: string | null;
  precipitate_g: number;
  precipitateColor: string;
  solidRemaining_g: number;
  solidColor: string;
  flame: number;
  flameColor: string;
  deposition: number;
  phaseSplit: number;
  condensation: number;
  dissolution: number;
  activeEffects: LessonEffect[];
}

export interface LessonEvent {
  sequence: number;
  time_s: number;
  kind: 'action' | 'condition' | 'checkpoint' | 'complete' | 'warning';
  message_vi: string;
}

export interface LessonSession {
  id: string;
  definitionId: string;
  vesselId: string;
  status: LessonStatus;
  elapsed_s: number;
  physicalProgress: number;
  extent_mol: number;
  maxExtent_mol: number;
  initialMass_g: number;
  escapedMass_g: number;
  inventory: LessonInventoryItem[];
  environment: LessonEnvironment;
  visuals: LessonVisualState;
  conditionResults: LessonConditionResult[];
  events: LessonEvent[];
  reachedCheckpoints: string[];
  lastRate_mol_s: number;
  accumulator_s: number;
  eventSequence: number;
  sampleScale_mol: number;
  volume_ml: number;
  answer: number | null;
  seed: number;
}

export type LessonAction =
  | { type: 'pressure'; value: number }
  | { type: 'mix' }
  | { type: 'stir'; active: boolean }
  | { type: 'temperature'; value: number }
  | { type: 'pH'; value: number }
  | { type: 'catalyst'; id: string; active: boolean }
  | { type: 'enzyme'; id: string; active: boolean }
  | { type: 'ignition'; active: boolean }
  | { type: 'industrial'; active: boolean }
  | { type: 'oxygen'; active: boolean }
  | { type: 'vent'; active: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'answer'; index: number };

export interface LessonMassAudit {
  initial_g: number;
  retained_g: number;
  escaped_g: number;
  error_g: number;
  relativeError: number;
  conserved: boolean;
}

export interface LessonReport {
  schema: 'chemdex.lesson-report/1';
  reactionId: string;
  equation: string;
  status: LessonStatus;
  progress: number;
  elapsed_s: number;
  extent_mol: number;
  inventory: LessonInventoryItem[];
  conditions: LessonConditionResult[];
  mass: LessonMassAudit;
  events: LessonEvent[];
  correctAnswer: boolean | null;
  modelNotice_vi: string;
}
