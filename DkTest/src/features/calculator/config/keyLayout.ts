import { CalculatorKey } from "../types";

export const CALCULATOR_KEYS: CalculatorKey[] = [
  // Top row control keys
  { id: "SHIFT", label: "SHIFT", colorType: "utility" },
  { id: "ALPHA", label: "ALPHA", colorType: "utility" },
  { id: "UP", label: "▲", colorType: "utility" },
  { id: "LEFT", label: "◀", colorType: "utility" },
  { id: "RIGHT", label: "▶", colorType: "utility" },
  { id: "DOWN", label: "▼", colorType: "utility" },
  { id: "MENU", label: "MENU", shiftLabel: "SETUP", colorType: "utility" },
  { id: "ON", label: "ON", colorType: "utility" },

  // Function Row 1
  { id: "OPTN", label: "OPTN", colorType: "function" },
  { id: "CALC", label: "CALC", shiftLabel: "SOLVE", colorType: "function" },
  { id: "fraction", label: "a/b", shiftLabel: "d/c", colorType: "function" },
  { id: "integral", label: "∫dx", shiftLabel: "d/dx", colorType: "function" },
  { id: "root", label: "√", shiftLabel: "³√", colorType: "function" },
  { id: "power", label: "x²", shiftLabel: "x³", colorType: "function" },

  // Function Row 2
  { id: "power_y", label: "xʸ", shiftLabel: "ⁿ√", colorType: "function" },
  { id: "log", label: "log", shiftLabel: "10ˣ", colorType: "function" },
  { id: "ln", label: "ln", shiftLabel: "eˣ", colorType: "function" },
  { id: "neg", label: "(-)", shiftLabel: "∠", colorType: "function" },
  { id: "dms", label: "°'\"", shiftLabel: "←", colorType: "function" },
  { id: "recip", label: "x⁻¹", shiftLabel: "x!", colorType: "function" },

  // Function Row 3
  { id: "sin", label: "sin", shiftLabel: "sin⁻¹", alphaLabel: "D", colorType: "function" },
  { id: "cos", label: "cos", shiftLabel: "cos⁻¹", alphaLabel: "E", colorType: "function" },
  { id: "tan", label: "tan", shiftLabel: "tan⁻¹", alphaLabel: "F", colorType: "function" },
  { id: "sto", label: "STO", shiftLabel: "RECALL", colorType: "function" },
  { id: "eng", label: "ENG", shiftLabel: "←", colorType: "function" },

  // Bracket rows and memory
  { id: "bracket_open", label: "(", shiftLabel: "%", alphaLabel: "X", colorType: "function" },
  { id: "bracket_close", label: ")", shiftLabel: "x", alphaLabel: "Y", colorType: "function" },
  { id: "comma", label: ",", shiftLabel: "PreAns", alphaLabel: "Z", colorType: "function" },
  { id: "m_plus", label: "M+", shiftLabel: "M-", alphaLabel: "M", colorType: "function" },

  // Number / Digits Pad and core actions
  { id: "7", label: "7", alphaLabel: "A", colorType: "digit" },
  { id: "8", label: "8", alphaLabel: "B", colorType: "digit" },
  { id: "9", label: "9", alphaLabel: "C", colorType: "digit" },
  { id: "DEL", label: "DEL", colorType: "action" },
  { id: "AC", label: "AC", colorType: "action" },

  { id: "4", label: "4", colorType: "digit" },
  { id: "5", label: "5", colorType: "digit" },
  { id: "6", label: "6", colorType: "digit" },
  { id: "times", label: "×", shiftLabel: "nPr", colorType: "digit" },
  { id: "divide", label: "÷", shiftLabel: "nCr", colorType: "digit" },

  { id: "1", label: "1", colorType: "digit" },
  { id: "2", label: "2", colorType: "digit" },
  { id: "3", label: "3", colorType: "digit" },
  { id: "plus", label: "+", shiftLabel: "POL", colorType: "digit" },
  { id: "minus", label: "−", shiftLabel: "REC", colorType: "digit" },

  { id: "0", label: "0", colorType: "digit" },
  { id: "dot", label: ".", colorType: "digit" },
  { id: "exp", label: "×10ˣ", shiftLabel: "e", colorType: "digit" },
  { id: "Ans", label: "Ans", shiftLabel: "PreAns", colorType: "digit" },
  { id: "EXE", label: "=", colorType: "digit" },
];
