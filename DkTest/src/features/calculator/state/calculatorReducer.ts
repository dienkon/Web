import {
  CalculatorState,
  CalculatorMode,
  ScreenState,
  SemanticAction,
  HistoryItem,
  SolveWorkflowState,
  CalcWorkflowState,
  EquationWorkflowState,
  TableWorkflowState,
  MatrixWorkflowState,
  VectorWorkflowState,
  StatisticsWorkflowState,
  DistributionWorkflowState,
  InequalityWorkflowState,
  RatioWorkflowState,
  VerifyWorkflowState,
  BaseNMode,
  AngleUnit,
  InputOutputMode,
  DisplayMode,
} from "../types";

export type CalculatorAction =
  | { type: "SET_EXPRESSION"; expression: string }
  | { type: "SET_RESULT"; result: string; exact?: string; decimal?: string }
  | { type: "SET_SCREEN"; screen: ScreenState }
  | { type: "GO_BACK" }
  | { type: "TOGGLE_SHIFT" }
  | { type: "TOGGLE_ALPHA" }
  | { type: "RESET_MODIFIERS" }
  | { type: "TOGGLE_SD" }
  | { type: "SET_STO"; active: boolean }
  | { type: "SET_RCL"; active: boolean }
  | { type: "CLEAR" }
  | { type: "OPEN_MENU" }
  | { type: "OPEN_SETUP" }
  | { type: "OPEN_OPTN" }
  | { type: "CLOSE_MENU" }
  | { type: "SET_MENU_INDEX"; index: number }
  | { type: "MENU_NAVIGATE"; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }
  | { type: "SET_MODE"; mode: CalculatorMode }
  | { type: "SET_ANGLE_UNIT"; unit: AngleUnit }
  | { type: "SET_INPUT_MODE"; mode: InputOutputMode }
  | { type: "SET_DISPLAY_MODE"; mode: DisplayMode; digits?: number }
  | { type: "SET_ENGINEER_SYMBOL"; on: boolean }
  | { type: "SET_FRACTION_RESULT"; format: "d/c" | "ab/c" }
  | { type: "SET_COMPLEX_FORMAT"; format: "a+bi" | "r∠θ" }
  | { type: "SET_STATISTICS_FREQ"; on: boolean }
  | { type: "SET_EQUATION_COMPLEX"; on: boolean }
  | { type: "SET_TABLE_DUAL"; on: boolean }
  | { type: "SET_RECURRING_DEC"; on: boolean }
  | { type: "SET_DECIMAL_MARK"; mark: "Dot" | "Comma" }
  | { type: "SET_DIGIT_SEPARATOR"; on: boolean }
  | { type: "SET_VARIABLE"; name: string; value: number }
  | { type: "ADD_MEMORY_M"; delta: number }
  | { type: "CLEAR_MEMORY_M" }
  | { type: "ADD_HISTORY"; item: HistoryItem }
  | { type: "NAVIGATE_HISTORY"; direction: "UP" | "DOWN" }
  // Solve
  | { type: "START_SOLVE"; payload: SolveWorkflowState }
  | { type: "SOLVE_SET_VAR"; varName: string; value: number }
  | { type: "SOLVE_SET_SOLUTION"; solution: number; residual: number; canContinue?: boolean }
  | { type: "SOLVE_SET_ERROR"; error: string }
  // Calc
  | { type: "START_CALC"; payload: CalcWorkflowState }
  | { type: "CALC_SET_VAR"; varName: string; value: number }
  | { type: "CALC_NEXT_VAR" }
  // Equation
  | { type: "EQN_SET_TYPE"; eqnType: "simult" | "poly" }
  | { type: "EQN_SET_DEGREE"; degree: number }
  | { type: "EQN_SET_COEFF"; field: string; value: string }
  | { type: "EQN_SET_SOLUTIONS"; solutions: string[] }
  | { type: "EQN_NAVIGATE_SOL"; direction: "UP" | "DOWN" }
  // Table
  | { type: "TABLE_SET_FIELD"; field: "fExpr" | "gExpr" | "start" | "end" | "step"; value: string }
  | { type: "TABLE_SET_STEP"; step: "f" | "g" | "start" | "end" | "step" }
  | { type: "TABLE_SET_ROWS"; rows: { x: number; fx: string; gx?: string }[] }
  | { type: "TABLE_NAVIGATE_ROW"; direction: "UP" | "DOWN" }
  // Matrix
  | { type: "MATRIX_SET_ACTIVE"; mat: "MatA" | "MatB" | "MatC" | "MatD" }
  | { type: "MATRIX_SET_DIM"; rows: number; cols: number }
  | { type: "MATRIX_SET_CELL"; row: number; col: number; value: number }
  | { type: "MATRIX_NAVIGATE"; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }
  // Vector
  | { type: "VECTOR_SET_ACTIVE"; vct: "VctA" | "VctB" | "VctC" | "VctD" }
  | { type: "VECTOR_SET_DIM"; dim: 2 | 3 }
  | { type: "VECTOR_SET_COMP"; index: number; value: number }
  | { type: "VECTOR_NAVIGATE"; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }
  // Statistics
  | { type: "STAT_SET_TYPE"; statType: StatisticsWorkflowState["type"] }
  | { type: "STAT_SET_CELL"; row: number; col: number; value: number }
  | { type: "STAT_ADD_ROW"; x: number; y?: number; freq?: number }
  | { type: "STAT_SET_SUMMARY"; summary: Record<string, number> }
  | { type: "STAT_NAVIGATE"; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }
  // Distribution
  | { type: "DIST_SET_TYPE"; distType: DistributionWorkflowState["type"] }
  | { type: "DIST_SET_PARAM"; key: string; value: string }
  | { type: "DIST_SET_RESULT"; result: string }
  // Inequality
  | { type: "INEQ_SET_DEGREE"; degree: 2 | 3 }
  | { type: "INEQ_SET_TYPE"; ineqType: ">" | "<" | ">=" | "<=" }
  | { type: "INEQ_SET_COEFF"; field: string; value: string }
  | { type: "INEQ_SET_RESULT"; result: string }
  // Ratio
  | { type: "RATIO_SET_TYPE"; ratioType: 1 | 2 }
  | { type: "RATIO_SET_VALUE"; field: "a" | "b" | "c" | "d"; value: string }
  | { type: "RATIO_SET_RESULT"; result: string }
  // Verify
  | { type: "VERIFY_SET_EXPR1"; expr: string }
  | { type: "VERIFY_SET_OP"; op: "=" | "≠" | ">" | "<" | "≥" | "≤" }
  | { type: "VERIFY_SET_EXPR2"; expr: string }
  | { type: "VERIFY_SET_RESULT"; result: "TRUE" | "FALSE" }
  // Base-N
  | { type: "SET_BASE_N_MODE"; mode: BaseNMode }
  // Undo / Redo
  | { type: "PUSH_UNDO"; expression: string }
  | { type: "UNDO" }
  | { type: "REDO" }
  // Legacy / fallback actions
  | { type: "SET_EQN_COEFF"; field: string; value: string }
  | { type: "SET_EQN_SOLUTIONS"; solutions: string[] }
  | { type: "NAVIGATE_EQN_SOL"; direction: "UP" | "DOWN" }
  | { type: "SET_TABLE_PARAM"; param: "tableExpression" | "tableStart" | "tableEnd" | "tableStep"; value: string }
  | { type: "SET_TABLE_ROWS"; rows: { x: number; y: string }[] }
  | { type: "NAVIGATE_TABLE"; direction: "UP" | "DOWN" }
  | { type: "SET_MENU_SCREEN"; screen: any }
  | { type: "SET_PROMPT_VALUE"; value: string };

export const initialCalculatorState: CalculatorState = {
  currentMode: "CALCULATE",
  screenState: "MAIN",
  menuScreen: "NONE",
  menuIndex: 0,
  menuPage: 0,
  menuStack: [],

  expression: "",
  cursorPosition: 0,
  result: "",
  exactResult: "",
  decimalResult: "",
  isDecimalView: false,
  lastAns: "0",
  preAns: "0",
  isMultiStatementActive: false,
  multiStatements: [],
  multiStatementIndex: 0,

  shiftActive: false,
  alphaActive: false,
  stoActive: false,
  rclActive: false,

  angleUnit: "DEG",
  inputMode: "MathI/MathO",
  displayMode: "Norm",
  displayFixDigits: 3,
  displaySciDigits: 3,
  engineerSymbol: false,
  fractionResult: "d/c",
  complexFormat: "a+bi",
  statisticsFreqOn: false,
  equationComplexOn: true,
  tableDualFunction: true,
  recurringDecimalOn: true,
  decimalMark: "Dot",
  digitSeparatorOn: false,

  variables: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, Z: 0 },
  memoryM: 0,
  history: [],
  historyIndex: -1,

  solve: {
    equation: "",
    lhs: "",
    rhs: "",
    targetVar: "X",
    variables: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, Z: 0 },
    varNames: ["X"],
    currentVarIndex: 0,
    initialGuess: 0,
    solution: undefined,
    residual: undefined,
    canContinue: false,
  },

  calc: {
    expression: "",
    varNames: ["X"],
    currentVarIndex: 0,
    values: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, Z: 0 },
  },

  equation: {
    type: "poly",
    degree: 2,
    coeffs: { a: "1", b: "-5", c: "6", d: "0", e: "0" },
    activeField: "a",
    solutions: [],
    solutionIndex: 0,
  },

  table: {
    fExpr: "X^2",
    gExpr: "",
    hasG: true,
    start: "1",
    end: "5",
    step: "1",
    stepIndex: "f",
    rows: [],
    rowIndex: 0,
  },

  matrix: {
    activeMat: "MatA",
    matrices: {
      MatA: [[1, 0], [0, 1]],
      MatB: [[1, 0], [0, 1]],
      MatC: [[1, 0], [0, 1]],
      MatD: [[1, 0], [0, 1]],
    },
    tempRows: 2,
    tempCols: 2,
    cursorRow: 0,
    cursorCol: 0,
  },

  vector: {
    activeVct: "VctA",
    vectors: {
      VctA: [1, 0, 0],
      VctB: [0, 1, 0],
      VctC: [0, 0, 1],
      VctD: [1, 1, 1],
    },
    tempDim: 3,
    cursorIndex: 0,
  },

  statistics: {
    type: "1-var",
    xData: [1, 2, 3, 4, 5],
    yData: [],
    freqData: [1, 1, 1, 1, 1],
    cursorRow: 0,
    cursorCol: 0,
    summary: {},
  },

  distribution: {
    type: "normalPD",
    params: { x: "36", mu: "35", sigma: "2" },
    result: undefined,
  },

  inequality: {
    degree: 2,
    type: ">",
    coeffs: { a: "1", b: "-5", c: "6" },
    result: undefined,
  },

  ratio: {
    type: 1,
    a: "1",
    b: "2",
    c: "X",
    d: "4",
    result: undefined,
  },

  verify: {
    expr1: "1+2",
    op: "=",
    expr2: "3",
    result: undefined,
  },

  baseNMode: "DEC",

  undoStack: [],
  redoStack: [],

  // Legacy compatibility fields
  displayValue: "0",
  showMenu: false,
  showSetup: false,
  menuState: "NONE",
  eqnCoefficients: { a: "1", b: "-3", c: "2", d: "0" },
  eqnSolutions: undefined,
  eqnSolIndex: 0,
  tableExpression: "X^2",
  tableStart: "1",
  tableEnd: "5",
  tableStep: "1",
  tableRows: [],
  tableRowIndex: 0,
  calcTargetVariable: "X",
  promptValue: "0",
};

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case "SET_EXPRESSION":
      return {
        ...state,
        expression: action.expression,
      };

    case "SET_RESULT":
      return {
        ...state,
        result: action.result,
        exactResult: action.exact ?? action.result,
        decimalResult: action.decimal ?? action.result,
        isDecimalView: false,
        preAns: state.lastAns,
        lastAns:
          action.result && !action.result.includes("ERROR")
            ? (action.decimal ?? action.result)
            : state.lastAns,
      };

    case "SET_SCREEN":
      return {
        ...state,
        screenState: action.screen,
        menuStack: [...state.menuStack, state.screenState],
        menuState: action.screen === "MAIN" ? "NONE" : (action.screen as any),
        showMenu: action.screen === "MENU",
        showSetup: action.screen === "SETUP",
      };

    case "GO_BACK": {
      if (state.menuStack.length > 0) {
        const nextStack = [...state.menuStack];
        const prev = nextStack.pop() || "MAIN";
        return {
          ...state,
          screenState: prev,
          menuStack: nextStack,
          menuState: prev === "MAIN" ? "NONE" : (prev as any),
          showMenu: prev === "MENU",
          showSetup: prev === "SETUP",
        };
      }
      return {
        ...state,
        screenState: "MAIN",
        menuStack: [],
        menuState: "NONE",
        showMenu: false,
        showSetup: false,
      };
    }

    case "TOGGLE_SHIFT":
      return {
        ...state,
        shiftActive: !state.shiftActive,
        alphaActive: false,
      };

    case "TOGGLE_ALPHA":
      return {
        ...state,
        alphaActive: !state.alphaActive,
        shiftActive: false,
      };

    case "RESET_MODIFIERS":
      return {
        ...state,
        shiftActive: false,
        alphaActive: false,
        stoActive: false,
        rclActive: false,
      };

    case "TOGGLE_SD": {
      if (!state.result || state.result.includes("ERROR")) {
        return state;
      }
      const nextIsDecimal = !state.isDecimalView;
      const nextDisplay = nextIsDecimal
        ? (state.decimalResult || state.result)
        : (state.exactResult || state.result);
      return {
        ...state,
        isDecimalView: nextIsDecimal,
        result: nextDisplay,
      };
    }

    case "SET_STO":
      return {
        ...state,
        stoActive: action.active,
        rclActive: false,
        shiftActive: false,
        alphaActive: false,
      };

    case "SET_RCL":
      return {
        ...state,
        rclActive: action.active,
        stoActive: false,
        shiftActive: false,
        alphaActive: false,
      };

    case "CLEAR":
      return {
        ...state,
        expression: "",
        result: "",
        exactResult: "",
        decimalResult: "",
        isDecimalView: false,
        shiftActive: false,
        alphaActive: false,
        stoActive: false,
        rclActive: false,
        screenState: "MAIN",
        menuState: "NONE",
        menuIndex: 0,
        menuStack: [],
        historyIndex: -1,
      };

    case "OPEN_MENU":
      return {
        ...state,
        screenState: "MENU",
        menuState: "MAIN_MENU",
        menuIndex: 0,
        menuStack: [],
        shiftActive: false,
        alphaActive: false,
        showMenu: true,
      };

    case "OPEN_SETUP":
      return {
        ...state,
        screenState: "SETUP",
        menuState: "SETUP",
        menuIndex: 0,
        menuPage: 0,
        menuStack: [],
        shiftActive: false,
        alphaActive: false,
        showSetup: true,
      };

    case "OPEN_OPTN":
      return {
        ...state,
        screenState: "OPTN",
        menuState: "OPTN",
        menuIndex: 0,
        shiftActive: false,
        alphaActive: false,
      };

    case "CLOSE_MENU":
      return {
        ...state,
        screenState: "MAIN",
        menuState: "NONE",
        menuIndex: 0,
        menuStack: [],
        showMenu: false,
        showSetup: false,
      };

    case "SET_MENU_INDEX":
      return {
        ...state,
        menuIndex: action.index,
      };

    case "MENU_NAVIGATE": {
      const count = 4;
      let nextIndex = state.menuIndex;
      if (action.direction === "RIGHT" || action.direction === "DOWN") {
        nextIndex = (nextIndex + 1) % count;
      } else if (action.direction === "LEFT" || action.direction === "UP") {
        nextIndex = (nextIndex - 1 + count) % count;
      }
      return {
        ...state,
        menuIndex: nextIndex,
      };
    }

    case "SET_MODE": {
      let targetScreen: ScreenState = "CALCULATE";
      if (action.mode === "TABLE") {
        targetScreen = "TABLE_INPUT";
      } else if (action.mode === "EQUATION" || action.mode === "EQN") {
        targetScreen = "EQN_TYPE";
      } else if (action.mode === "INEQUALITY" || action.mode === "INEQ") {
        targetScreen = "INEQ_DEGREE";
      } else {
        targetScreen = "CALCULATE";
      }

      return {
        ...state,
        currentMode: action.mode,
        screenState: targetScreen,
        menuIndex: 0,
        menuStack: [],
        showMenu: false,
        showSetup: false,
        result: "",
      };
    }

    case "SET_ANGLE_UNIT":
      return {
        ...state,
        angleUnit: action.unit,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_INPUT_MODE":
      return {
        ...state,
        inputMode: action.mode,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_DISPLAY_MODE":
      return {
        ...state,
        displayMode: action.mode,
        displayFixDigits: action.digits ?? state.displayFixDigits,
        displaySciDigits: action.digits ?? state.displaySciDigits,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_ENGINEER_SYMBOL":
      return {
        ...state,
        engineerSymbol: action.on,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_FRACTION_RESULT":
      return {
        ...state,
        fractionResult: action.format,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_COMPLEX_FORMAT":
      return {
        ...state,
        complexFormat: action.format,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_STATISTICS_FREQ":
      return {
        ...state,
        statisticsFreqOn: action.on,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_EQUATION_COMPLEX":
      return {
        ...state,
        equationComplexOn: action.on,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_TABLE_DUAL":
      return {
        ...state,
        tableDualFunction: action.on,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_RECURRING_DEC":
      return {
        ...state,
        recurringDecimalOn: action.on,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_DECIMAL_MARK":
      return {
        ...state,
        decimalMark: action.mark,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_DIGIT_SEPARATOR":
      return {
        ...state,
        digitSeparatorOn: action.on,
        screenState: "MAIN",
        menuState: "NONE",
        showSetup: false,
      };

    case "SET_VARIABLE":
      return {
        ...state,
        variables: {
          ...state.variables,
          [action.name]: action.value,
        },
        stoActive: false,
        rclActive: false,
      };

    case "ADD_MEMORY_M":
      return {
        ...state,
        memoryM: state.memoryM + action.delta,
        shiftActive: false,
        alphaActive: false,
      };

    case "CLEAR_MEMORY_M":
      return {
        ...state,
        memoryM: 0,
      };

    case "ADD_HISTORY": {
      const updated = [action.item, ...state.history.slice(0, 49)];
      return {
        ...state,
        history: updated,
        historyIndex: -1,
      };
    }

    case "NAVIGATE_HISTORY": {
      if (state.history.length === 0) return state;
      let nextIndex = state.historyIndex;
      if (action.direction === "UP") {
        nextIndex = Math.min(state.history.length - 1, state.historyIndex + 1);
      } else {
        nextIndex = Math.max(-1, state.historyIndex - 1);
      }
      if (nextIndex === -1) {
        return {
          ...state,
          historyIndex: -1,
          expression: "",
          result: "",
        };
      }
      const item = state.history[nextIndex];
      return {
        ...state,
        historyIndex: nextIndex,
        expression: item.expression,
        result: item.result,
        exactResult: item.exactResult || item.result,
        decimalResult: item.decimalResult || item.result,
      };
    }

    // --- Solve Workflow Actions ---
    case "START_SOLVE":
      return {
        ...state,
        screenState: "SOLVE",
        solve: action.payload,
        shiftActive: false,
        alphaActive: false,
      };

    case "SOLVE_SET_VAR":
      return {
        ...state,
        solve: {
          ...state.solve,
          variables: {
            ...state.solve.variables,
            [action.varName]: action.value,
          },
        },
      };

    case "SOLVE_SET_SOLUTION":
      return {
        ...state,
        screenState: "SOLVE_RESULT",
        solve: {
          ...state.solve,
          solution: action.solution,
          residual: action.residual,
          canContinue: action.canContinue,
        },
      };

    case "SOLVE_SET_ERROR":
      return {
        ...state,
        result: action.error,
        screenState: "MAIN",
      };

    // --- Calc Workflow Actions ---
    case "START_CALC":
      return {
        ...state,
        screenState: "CALC_ASSIGN",
        calc: action.payload,
        shiftActive: false,
        alphaActive: false,
      };

    case "CALC_SET_VAR":
      return {
        ...state,
        calc: {
          ...state.calc,
          values: {
            ...state.calc.values,
            [action.varName]: action.value,
          },
        },
        variables: {
          ...state.variables,
          [action.varName]: action.value,
        },
      };

    case "CALC_NEXT_VAR": {
      const nextIdx = state.calc.currentVarIndex + 1;
      return {
        ...state,
        calc: {
          ...state.calc,
          currentVarIndex: nextIdx,
        },
      };
    }

    // --- Equation Workflow Actions ---
    case "EQN_SET_TYPE":
      return {
        ...state,
        equation: {
          ...state.equation,
          type: action.eqnType,
        },
        screenState: "EQN_DEGREE",
      };

    case "EQN_SET_DEGREE":
      return {
        ...state,
        equation: {
          ...state.equation,
          degree: action.degree,
        },
        screenState: "EQN_COEFFICIENT",
      };

    case "EQN_SET_COEFF":
      return {
        ...state,
        equation: {
          ...state.equation,
          coeffs: {
            ...state.equation.coeffs,
            [action.field]: action.value,
          },
        },
      };

    case "EQN_SET_SOLUTIONS":
      return {
        ...state,
        screenState: "EQN_RESULT",
        equation: {
          ...state.equation,
          solutions: action.solutions,
          solutionIndex: 0,
        },
      };

    case "EQN_NAVIGATE_SOL": {
      if (state.equation.solutions.length === 0) return state;
      const total = state.equation.solutions.length;
      const cur = state.equation.solutionIndex;
      const next = action.direction === "UP" ? (cur - 1 + total) % total : (cur + 1) % total;
      return {
        ...state,
        equation: {
          ...state.equation,
          solutionIndex: next,
        },
      };
    }

    // --- Table Workflow Actions ---
    case "TABLE_SET_FIELD":
      return {
        ...state,
        table: {
          ...state.table,
          [action.field]: action.value,
        },
      };

    case "TABLE_SET_STEP":
      return {
        ...state,
        table: {
          ...state.table,
          stepIndex: action.step,
        },
      };

    case "TABLE_SET_ROWS":
      return {
        ...state,
        screenState: "TABLE_RESULT",
        table: {
          ...state.table,
          rows: action.rows,
          rowIndex: 0,
        },
      };

    case "TABLE_NAVIGATE_ROW": {
      if (state.table.rows.length === 0) return state;
      const maxIdx = state.table.rows.length - 1;
      const cur = state.table.rowIndex;
      const next = action.direction === "UP" ? Math.max(0, cur - 1) : Math.min(maxIdx, cur + 1);
      return {
        ...state,
        table: {
          ...state.table,
          rowIndex: next,
        },
      };
    }

    // --- Matrix Workflow Actions ---
    case "MATRIX_SET_ACTIVE":
      return {
        ...state,
        screenState: "MATRIX_DIM",
        matrix: {
          ...state.matrix,
          activeMat: action.mat,
        },
      };

    case "MATRIX_SET_DIM": {
      const rows = action.rows;
      const cols = action.cols;
      const newGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
      return {
        ...state,
        screenState: "MATRIX_EDITOR",
        matrix: {
          ...state.matrix,
          tempRows: rows,
          tempCols: cols,
          cursorRow: 0,
          cursorCol: 0,
          matrices: {
            ...state.matrix.matrices,
            [state.matrix.activeMat]: newGrid,
          },
        },
      };
    }

    case "MATRIX_SET_CELL": {
      const active = state.matrix.activeMat;
      const currentGrid = state.matrix.matrices[active].map((r) => [...r]);
      if (currentGrid[action.row]) {
        currentGrid[action.row][action.col] = action.value;
      }
      return {
        ...state,
        matrix: {
          ...state.matrix,
          matrices: {
            ...state.matrix.matrices,
            [active]: currentGrid,
          },
        },
      };
    }

    case "MATRIX_NAVIGATE": {
      const maxR = state.matrix.tempRows - 1;
      const maxC = state.matrix.tempCols - 1;
      let r = state.matrix.cursorRow;
      let c = state.matrix.cursorCol;
      if (action.direction === "UP") r = Math.max(0, r - 1);
      if (action.direction === "DOWN") r = Math.min(maxR, r + 1);
      if (action.direction === "LEFT") c = Math.max(0, c - 1);
      if (action.direction === "RIGHT") c = Math.min(maxC, c + 1);
      return {
        ...state,
        matrix: {
          ...state.matrix,
          cursorRow: r,
          cursorCol: c,
        },
      };
    }

    // --- Vector Workflow Actions ---
    case "VECTOR_SET_ACTIVE":
      return {
        ...state,
        screenState: "VECTOR_DIM",
        vector: {
          ...state.vector,
          activeVct: action.vct,
        },
      };

    case "VECTOR_SET_DIM": {
      const dim = action.dim;
      const newArr = Array(dim).fill(0);
      return {
        ...state,
        screenState: "VECTOR_EDITOR",
        vector: {
          ...state.vector,
          tempDim: dim,
          cursorIndex: 0,
          vectors: {
            ...state.vector.vectors,
            [state.vector.activeVct]: newArr,
          },
        },
      };
    }

    case "VECTOR_SET_COMP": {
      const active = state.vector.activeVct;
      const currentVct = [...state.vector.vectors[active]];
      currentVct[action.index] = action.value;
      return {
        ...state,
        vector: {
          ...state.vector,
          vectors: {
            ...state.vector.vectors,
            [active]: currentVct,
          },
        },
      };
    }

    case "VECTOR_NAVIGATE": {
      const maxIdx = state.vector.tempDim - 1;
      let cur = state.vector.cursorIndex;
      if (action.direction === "LEFT" || action.direction === "UP") cur = Math.max(0, cur - 1);
      if (action.direction === "RIGHT" || action.direction === "DOWN") cur = Math.min(maxIdx, cur + 1);
      return {
        ...state,
        vector: {
          ...state.vector,
          cursorIndex: cur,
        },
      };
    }

    // --- Statistics Workflow Actions ---
    case "STAT_SET_TYPE":
      return {
        ...state,
        screenState: "STAT_EDITOR",
        statistics: {
          ...state.statistics,
          type: action.statType,
          xData: [],
          yData: [],
          freqData: [],
          cursorRow: 0,
          cursorCol: 0,
        },
      };

    case "STAT_ADD_ROW":
      return {
        ...state,
        statistics: {
          ...state.statistics,
          xData: [...state.statistics.xData, action.x],
          yData: action.y !== undefined ? [...state.statistics.yData, action.y] : state.statistics.yData,
          freqData: [...state.statistics.freqData, action.freq ?? 1],
        },
      };

    case "STAT_SET_CELL": {
      const nextX = [...state.statistics.xData];
      const nextY = [...state.statistics.yData];
      const nextFreq = [...state.statistics.freqData];
      if (action.col === 0) {
        nextX[action.row] = action.value;
      } else if (action.col === 1) {
        nextY[action.row] = action.value;
      } else {
        nextFreq[action.row] = action.value;
      }
      return {
        ...state,
        statistics: {
          ...state.statistics,
          xData: nextX,
          yData: nextY,
          freqData: nextFreq,
        },
      };
    }

    case "STAT_SET_SUMMARY":
      return {
        ...state,
        screenState: "STAT_RESULT",
        statistics: {
          ...state.statistics,
          summary: action.summary,
        },
      };

    case "STAT_NAVIGATE": {
      const rowCount = Math.max(1, state.statistics.xData.length);
      const colCount = state.statistics.type === "1-var" ? (state.statisticsFreqOn ? 2 : 1) : 3;
      let r = state.statistics.cursorRow;
      let c = state.statistics.cursorCol;
      if (action.direction === "UP") r = Math.max(0, r - 1);
      if (action.direction === "DOWN") r = Math.min(rowCount, r + 1);
      if (action.direction === "LEFT") c = Math.max(0, c - 1);
      if (action.direction === "RIGHT") c = Math.min(colCount - 1, c + 1);
      return {
        ...state,
        statistics: {
          ...state.statistics,
          cursorRow: r,
          cursorCol: c,
        },
      };
    }

    // --- Distribution Workflow Actions ---
    case "DIST_SET_TYPE":
      return {
        ...state,
        screenState: "DIST_INPUT",
        distribution: {
          ...state.distribution,
          type: action.distType,
          result: undefined,
        },
      };

    case "DIST_SET_PARAM":
      return {
        ...state,
        distribution: {
          ...state.distribution,
          params: {
            ...state.distribution.params,
            [action.key]: action.value,
          },
        },
      };

    case "DIST_SET_RESULT":
      return {
        ...state,
        screenState: "DIST_RESULT",
        distribution: {
          ...state.distribution,
          result: action.result,
        },
      };

    // --- Inequality Workflow Actions ---
    case "INEQ_SET_DEGREE":
      return {
        ...state,
        screenState: "INEQ_TYPE",
        inequality: {
          ...state.inequality,
          degree: action.degree,
        },
      };

    case "INEQ_SET_TYPE":
      return {
        ...state,
        screenState: "INEQ_COEFFICIENT",
        inequality: {
          ...state.inequality,
          type: action.ineqType,
        },
      };

    case "INEQ_SET_COEFF":
      return {
        ...state,
        inequality: {
          ...state.inequality,
          coeffs: {
            ...state.inequality.coeffs,
            [action.field]: action.value,
          },
        },
      };

    case "INEQ_SET_RESULT":
      return {
        ...state,
        screenState: "INEQ_RESULT",
        inequality: {
          ...state.inequality,
          result: action.result,
        },
      };

    // --- Ratio Workflow Actions ---
    case "RATIO_SET_TYPE":
      return {
        ...state,
        screenState: "RATIO_INPUT",
        ratio: {
          ...state.ratio,
          type: action.ratioType,
          result: undefined,
        },
      };

    case "RATIO_SET_VALUE":
      return {
        ...state,
        ratio: {
          ...state.ratio,
          [action.field]: action.value,
        },
      };

    case "RATIO_SET_RESULT":
      return {
        ...state,
        screenState: "RATIO_RESULT",
        ratio: {
          ...state.ratio,
          result: action.result,
        },
      };

    // --- Verify Workflow Actions ---
    case "VERIFY_SET_EXPR1":
      return {
        ...state,
        verify: {
          ...state.verify,
          expr1: action.expr,
        },
      };

    case "VERIFY_SET_OP":
      return {
        ...state,
        verify: {
          ...state.verify,
          op: action.op,
        },
      };

    case "VERIFY_SET_EXPR2":
      return {
        ...state,
        verify: {
          ...state.verify,
          expr2: action.expr,
        },
      };

    case "VERIFY_SET_RESULT":
      return {
        ...state,
        verify: {
          ...state.verify,
          result: action.result,
        },
      };

    // --- Base-N Actions ---
    case "SET_BASE_N_MODE":
      return {
        ...state,
        baseNMode: action.mode,
      };

    // --- Undo / Redo Actions ---
    case "PUSH_UNDO":
      return {
        ...state,
        undoStack: [action.expression, ...state.undoStack.slice(0, 30)],
        redoStack: [],
      };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const [prev, ...restUndo] = state.undoStack;
      return {
        ...state,
        expression: prev,
        undoStack: restUndo,
        redoStack: [state.expression, ...state.redoStack],
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const [next, ...restRedo] = state.redoStack;
      return {
        ...state,
        expression: next,
        redoStack: restRedo,
        undoStack: [state.expression, ...state.undoStack],
      };
    }

    // --- Legacy / Compatibility Handlers ---
    case "SET_EQN_COEFF":
      return {
        ...state,
        eqnCoefficients: {
          ...state.eqnCoefficients,
          [action.field]: action.value,
        },
      };

    case "SET_EQN_SOLUTIONS":
      return {
        ...state,
        eqnSolutions: action.solutions,
        eqnSolIndex: 0,
      };

    case "NAVIGATE_EQN_SOL": {
      if (!state.eqnSolutions || state.eqnSolutions.length === 0) return state;
      const count = state.eqnSolutions.length;
      let next = state.eqnSolIndex ?? 0;
      next = action.direction === "UP" ? (next - 1 + count) % count : (next + 1) % count;
      return {
        ...state,
        eqnSolIndex: next,
      };
    }

    case "SET_TABLE_PARAM":
      return {
        ...state,
        [action.param]: action.value,
      };

    case "SET_TABLE_ROWS":
      return {
        ...state,
        tableRows: action.rows,
        tableRowIndex: 0,
        menuState: "TABLE_RESULT",
      };

    case "NAVIGATE_TABLE": {
      if (!state.tableRows || state.tableRows.length === 0) return state;
      const maxIdx = state.tableRows.length - 1;
      const cur = state.tableRowIndex ?? 0;
      const next = action.direction === "UP" ? Math.max(0, cur - 1) : Math.min(maxIdx, cur + 1);
      return {
        ...state,
        tableRowIndex: next,
      };
    }

    case "SET_MENU_SCREEN":
      return {
        ...state,
        menuState: action.screen,
      };

    case "SET_PROMPT_VALUE":
      return {
        ...state,
        promptValue: action.value,
      };

    default:
      return state;
  }
}
