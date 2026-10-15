export type ScenarioVector = [number, number, number];
export type PropKind =
  | 'bottle' | 'beaker' | 'glass' | 'burner' | 'hose'
  | 'cabinet' | 'pipette' | 'centrifuge' | 'crate'
  | 'goggles' | 'gloves' | 'waste' | 'vacuum' | 'tray'
  | 'switch' | 'label' | 'barrier';

export interface ScenarioClue {
  id: string;
  title: string;
  detail: string;
  offset: ScenarioVector;
  prop: PropKind;
  color: string;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  feedback: string;
  safe: boolean;
}

export interface ScenarioDecision {
  id: string;
  title: string;
  prompt: string;
  choices: ScenarioChoice[];
}

export interface ScenarioAction {
  id: string;
  label: string;
  explanation: string;
}

export interface ScenarioDialogue {
  speaker: string;
  line: string;
  camera: ScenarioVector;
  target: ScenarioVector;
}

export interface LabScenario {
  id: string;
  taskId: string;
  number: number;
  title: string;
  category: string;
  summary: string;
  position: ScenarioVector;
  approach: ScenarioVector;
  color: string;
  model: PropKind;
  objectives: string[];
  clues: ScenarioClue[];
  decisions: ScenarioDecision[];
  actions: ScenarioAction[];
  dialogue: ScenarioDialogue[];
  debrief: {
    cause: string;
    response: string;
    transfer: string;
  };
}

export type ScenarioStage = 'observe' | 'decide' | 'act' | 'review' | 'complete';

export interface ScenarioAttempt {
  scenarioId: string;
  stage: ScenarioStage;
  observed: string[];
  decisionIndex: number;
  answered: Record<string, string>;
  actionIndex: number;
  mistakes: number;
  attempts: number;
  completed: boolean;
}

export type ScenarioEvent =
  | { type: 'observe'; clueId: string }
  | { type: 'start-decisions' }
  | { type: 'answer'; choiceId: string }
  | { type: 'retry' }
  | { type: 'continue' }
  | { type: 'action'; actionId: string }
  | { type: 'finish' };

export interface ScenarioTransition {
  attempt: ScenarioAttempt;
  accepted: boolean;
  mistake: boolean;
  message: string;
}
