export type CalculatorMode =
  | "CALCULATE"
  | "COMPLEX"
  | "BASE_N"
  | "MATRIX"
  | "VECTOR"
  | "STATISTICS"
  | "DISTRIBUTION"
  | "TABLE"
  | "EQUATION"
  | "INEQUALITY"
  | "VERIFY"
  | "RATIO"
  // Legacy aliases for backward compatibility
  | "COMP"
  | "BASE"
  | "CMPLX"
  | "EQN"
  | "STAT"
  | "INEQ";

export type ScreenState =
  | "CALCULATE"
  | "MAIN"
  | "MENU"
  | "SETUP"
  | "SOLVE"
  | "CALC_ASSIGN"
  | "TABLE_INPUT"
  | "TABLE_RANGE"
  | "TABLE_RESULT"
  | "EQN_TYPE"
  | "EQN_DEGREE"
  | "EQN_COEFFICIENT"
  | "EQN_RESULT"
  | "INEQ_DEGREE"
  | "INEQ_TYPE"
  | "INEQ_COEFFICIENT"
  | "INEQ_RESULT"
  | "ERROR"
  // Extended / legacy aliases
  | "OPTN"
  | "CALC_PROMPT"
  | "SOLVE_PROMPT"
  | "SOLVE_RESULT"
  | "EQN_SELECT"
  | "EQN_POLY_DEG"
  | "EQN_SIMULT_UNKNOWN"
  | "EQN_COEFFS"
  | "EQN_SOLUTIONS"
  | "TABLE_VIEW"
  | "MATRIX_MENU"
  | "MATRIX_DIM"
  | "MATRIX_EDITOR"
  | "VECTOR_MENU"
  | "VECTOR_DIM"
  | "VECTOR_EDITOR"
  | "STAT_TYPE"
  | "STAT_EDITOR"
  | "STAT_RESULT"
  | "DIST_SELECT"
  | "DIST_INPUT"
  | "DIST_RESULT"
  | "INEQ_SELECT_DEG"
  | "INEQ_SELECT_TYPE"
  | "INEQ_COEFFS"
  | "VERIFY_SCREEN"
  | "RATIO_SELECT"
  | "RATIO_INPUT"
  | "RATIO_RESULT";

export type AngleUnit = "DEG" | "RAD" | "GRAD";
export type InputOutputMode = "MathI/MathO" | "MathI/DecimalO" | "LineI/LineO" | "LineI/DecimalO";
export type DisplayMode = "Norm" | "Fix" | "Sci";
export type BaseNMode = "DEC" | "HEX" | "BIN" | "OCT";

export type SemanticAction =
  | { type: "INSERT_TEXT"; text: string }
  | { type: "INSERT_TEMPLATE"; template: string }
  | { type: "EXECUTE_COMMAND"; command: string }
  | { type: "DIGIT"; value: string }
  | { type: "OPERATOR"; op: string }
  | { type: "VARIABLE"; name: string }
  | { type: "TOGGLE_SHIFT" }
  | { type: "TOGGLE_ALPHA" }
  | { type: "TOGGLE_SD" }
  | { type: "EXECUTE" }
  | { type: "DELETE" }
  | { type: "CLEAR" }
  | { type: "MOVE_CURSOR"; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }
  | { type: "OPEN_MENU" }
  | { type: "OPEN_SETUP" }
  | { type: "OPEN_OPTN" }
  | { type: "CLOSE_MENU" }
  | { type: "MENU_SELECT"; index: number }
  | { type: "STO" }
  | { type: "RCL" }
  | { type: "M_PLUS" }
  | { type: "M_MINUS" }
  | { type: "CALC" }
  | { type: "SOLVE" }
  | { type: "ENG" }
  | { type: "UNDO" }
  | { type: "SET_BASE_N_MODE"; mode: BaseNMode }
  | { type: "NOOP" };

export interface HistoryItem {
  expression: string;
  result: string;
  exactResult?: string;
  decimalResult?: string;
}

export interface SolveWorkflowState {
  equation: string;
  lhs: string;
  rhs: string;
  targetVar: string;
  variables: Record<string, number>;
  varNames: string[];
  currentVarIndex: number;
  initialGuess: number;
  solution?: number;
  residual?: number;
  canContinue?: boolean;
}

export interface CalcWorkflowState {
  expression: string;
  varNames: string[];
  currentVarIndex: number;
  values: Record<string, number>;
}

export interface EquationWorkflowState {
  type: "simult" | "poly";
  degree: number; // 2, 3, 4 for poly; 2, 3, 4 for simult
  coeffs: Record<string, string>;
  activeField: string;
  solutions: string[];
  solutionIndex: number;
}

export interface TableWorkflowState {
  fExpr: string;
  gExpr: string;
  hasG: boolean;
  start: string;
  end: string;
  step: string;
  stepIndex: "f" | "g" | "start" | "end" | "step";
  rows: { x: number; fx: string; gx?: string }[];
  rowIndex: number;
}

export interface MatrixWorkflowState {
  activeMat: "MatA" | "MatB" | "MatC" | "MatD";
  matrices: Record<string, number[][]>;
  tempRows: number;
  tempCols: number;
  cursorRow: number;
  cursorCol: number;
}

export interface VectorWorkflowState {
  activeVct: "VctA" | "VctB" | "VctC" | "VctD";
  vectors: Record<string, number[]>;
  tempDim: 2 | 3;
  cursorIndex: number;
}

export interface StatisticsWorkflowState {
  type: "1-var" | "linear" | "quad" | "log" | "exp" | "power" | "inv";
  xData: number[];
  yData: number[];
  freqData: number[];
  cursorRow: number;
  cursorCol: number;
  summary: Record<string, number>;
}

export interface DistributionWorkflowState {
  type: "normalPD" | "normalCD" | "invNormal" | "binomPD" | "binomCD" | "poissonPD" | "poissonCD";
  params: Record<string, string>;
  result?: string;
}

export interface InequalityWorkflowState {
  degree: 2 | 3 | 4;
  type: ">" | "<" | ">=" | "<=";
  coeffs: Record<string, string>;
  result?: string;
}

export interface RatioWorkflowState {
  type: 1 | 2; // 1: A:B = X:D; 2: A:B = C:X
  a: string;
  b: string;
  c: string;
  d: string;
  result?: string;
}

export interface VerifyWorkflowState {
  expr1: string;
  op: "=" | "≠" | ">" | "<" | "≥" | "≤";
  expr2: string;
  result?: "TRUE" | "FALSE";
}

export interface CalculatorState {
  // Screen & Mode State Machine
  currentMode: CalculatorMode;
  screenState: ScreenState;
  menuScreen: string; // submenu routing
  menuIndex: number;
  menuPage: number;
  menuStack: ScreenState[];

  // Core expression and result
  expression: string;
  cursorPosition: number;
  result: string;
  exactResult?: string;
  decimalResult?: string;
  isDecimalView?: boolean;
  lastAns: string;
  preAns: string;
  isMultiStatementActive?: boolean;
  multiStatements?: string[];
  multiStatementIndex?: number;

  // Modifiers
  shiftActive: boolean;
  alphaActive: boolean;
  stoActive: boolean;
  rclActive: boolean;

  // Configurations (from SETUP)
  angleUnit: AngleUnit;
  inputMode: InputOutputMode;
  displayMode: DisplayMode;
  displayFixDigits: number;
  displaySciDigits: number;
  engineerSymbol: boolean;
  fractionResult: "d/c" | "ab/c";
  complexFormat: "a+bi" | "r∠θ";
  statisticsFreqOn: boolean;
  equationComplexOn: boolean;
  tableDualFunction: boolean;
  recurringDecimalOn: boolean;
  decimalMark: "Dot" | "Comma";
  digitSeparatorOn: boolean;

  // General variables & Memory
  variables: Record<string, number>;
  memoryM: number;
  history: HistoryItem[];
  historyIndex: number;

  // Specialized Workflow Payloads
  solve: SolveWorkflowState;
  calc: CalcWorkflowState;
  equation: EquationWorkflowState;
  table: TableWorkflowState;
  matrix: MatrixWorkflowState;
  vector: VectorWorkflowState;
  statistics: StatisticsWorkflowState;
  distribution: DistributionWorkflowState;
  inequality: InequalityWorkflowState;
  ratio: RatioWorkflowState;
  verify: VerifyWorkflowState;
  baseNMode: BaseNMode;

  // Undo / Redo buffer
  undoStack: string[];
  redoStack: string[];

  // Legacy compatibility fields
  displayValue: string;
  showMenu: boolean;
  showSetup: boolean;
  menuState: any;
  eqnCoefficients?: any;
  eqnSolutions?: string[];
  eqnSolIndex?: number;
  tableExpression?: string;
  tableStart?: string;
  tableEnd?: string;
  tableStep?: string;
  tableRows?: any[];
  tableRowIndex?: number;
  calcTargetVariable?: string;
  promptValue?: string;
}

export interface CalculatorKey {
  id: string;
  label: string; // Primary label on button
  shiftLabel?: string; // Yellow text above
  alphaLabel?: string; // Red text above
  complexLabel?: string; // Purple label (Complex mode)
  baseNLabel?: string; // Blue label (Base-N mode)
  colorType: "digit" | "function" | "action" | "utility";
  action: SemanticAction;
  shiftAction?: SemanticAction;
  alphaAction?: SemanticAction;
  complexAction?: SemanticAction;
  baseNAction?: SemanticAction;
  ariaLabel?: string;
  className?: string;
}
