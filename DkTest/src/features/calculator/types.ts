export type CalculatorMode = "COMP" | "BASE" | "COMPLEX" | "EQN" | "TABLE";

export interface CalculatorState {
  expression: string;
  cursorPosition: number;
  result: string;
  lastAns: string;
  preAns: string;
  shiftActive: boolean;
  alphaActive: boolean;
  angleUnit: "DEG" | "RAD" | "GRAD";
  inputMode: "MathI/MathO" | "MathI/DecimalO" | "LineI/LineO";
  displayMode: "Fix" | "Sci" | "Norm";
  displayValue: string;
  variables: Record<string, number>;
  memoryM: number;
  history: { expression: string; result: string }[];
  historyIndex: number;
  currentMode: CalculatorMode;
  showMenu: boolean;
  showSetup: boolean;
  
  // Solver/prompt states
  promptMode?: "NONE" | "CALC_PROMPT" | "EQN_SELECT" | "EQN_QUAD" | "EQN_CUBIC";
  calcTargetVariable?: string;
  promptValue?: string;
  eqnCoefficients?: { a: string; b: string; c: string; d: string };
  eqnStep?: "a" | "b" | "c" | "d" | "SOLUTIONS";
  eqnSolutions?: string[];
  eqnSolIndex?: number;
  
  // Table mode states
  tableExpression?: string;
  tableStart?: string;
  tableEnd?: string;
  tableStep?: string;
  tableStepIndex?: "EXPR" | "START" | "END" | "STEP" | "RESULT_TABLE";
  tableRows?: { x: number; y: string }[];
  tableRowIndex?: number;
}

export interface CalculatorKey {
  id: string;
  label: string; // Primary text on the button
  shiftLabel?: string; // Yellow text above
  alphaLabel?: string; // Red/magenta text above
  colorType: "digit" | "function" | "action" | "utility";
}
