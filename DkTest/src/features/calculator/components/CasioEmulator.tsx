import React, { useReducer, useRef, useEffect, useState, useCallback } from "react";
import { X, Maximize2, Minimize2, Move, Grid } from "lucide-react";
import "mathlive";

import { SemanticAction, CalculatorKey, CalculatorMode } from "../types";
import { calculatorReducer, initialCalculatorState } from "../state/calculatorReducer";
import { CalculatorLCD } from "./CalculatorLCD";
import { CalculatorKeypad } from "./CalculatorKeypad";
import { evaluateCalculatorExpression } from "../engine/calculatorEngine";
import { solveNumericalEquation } from "../engine/solver";
import { MENU_MODES, getModeByShortcut } from "../config/menuConfig";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendToScratchpad?: (value: string) => void;
}

export default function CasioEmulator({ isOpen, onClose, onSendToScratchpad }: Props) {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);

  // Floating Window Coordinates & Dragging
  const [position, setPosition] = useState({ x: 100, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // MathLive Field Ref
  const mfRef = useRef<any>(null);
  const calculatorContainerRef = useRef<HTMLDivElement>(null);

  // Position on open
  useEffect(() => {
    if (isOpen) {
      const initialX =
        typeof window !== "undefined"
          ? Math.max(10, Math.min(window.innerWidth - 370, window.innerWidth - 380))
          : 100;
      setPosition({ x: initialX, y: 70 });
    }
  }, [isOpen]);

  // Keep MathLive focused when active on MAIN screen
  const focusMathField = useCallback(() => {
    if (mfRef.current && !isMinimized && state.screenState === "MAIN") {
      try {
        mfRef.current.virtualKeyboardMode = "off";
        mfRef.current.mathVirtualKeyboardPolicy = "manual";
        mfRef.current.focus();
      } catch {
        // ignore
      }
    }
  }, [isMinimized, state.screenState]);

  useEffect(() => {
    if (isOpen && !isMinimized && state.screenState === "MAIN") {
      focusMathField();
    }
  }, [isOpen, isMinimized, state.screenState, focusMathField]);

  // Window Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    // Only drag from header, ignore buttons
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: position.x, initY: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const maxX = Math.max(0, window.innerWidth - 360);
    const maxY = Math.max(0, window.innerHeight - 80);
    const newX = Math.max(0, Math.min(maxX, dragRef.current.initX + (e.clientX - dragRef.current.startX)));
    const newY = Math.max(0, Math.min(maxY, dragRef.current.initY + (e.clientY - dragRef.current.startY)));
    setPosition({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Expression Evaluation Handler
  const handleEvaluate = useCallback(() => {
    if (!mfRef.current) return;
    const latexVal = mfRef.current.getValue("latex") || state.expression || "";
    if (!latexVal.trim()) {
      dispatch({ type: "SET_RESULT", result: "" });
      return;
    }

    const evalResult = evaluateCalculatorExpression(latexVal, state);
    dispatch({
      type: "SET_RESULT",
      result: evalResult.display,
      exact: evalResult.exact,
      decimal: evalResult.decimal,
    });

    if (!evalResult.isError) {
      dispatch({
        type: "ADD_HISTORY",
        item: {
          expression: latexVal,
          result: evalResult.display,
          exactResult: evalResult.exact,
          decimalResult: evalResult.decimal,
        },
      });
    }

    dispatch({ type: "RESET_MODIFIERS" });
  }, [state]);

  // Solve Equation Handler: Initializes the interactive SOLVE workflow
  const handleSolve = useCallback(() => {
    if (!mfRef.current) return;
    const latexVal = mfRef.current.getValue("latex") || state.expression || "";
    if (!latexVal.trim()) return;

    // Detect variables in equation
    const rawMatches = latexVal.match(/[A-Za-z]/g);
    const varList: string[] = rawMatches ? Array.from(new Set(rawMatches)) : ["X"];
    const varNames: string[] = varList.filter((v) => v !== "e" && v !== "i" && v !== "d");
    if (varNames.length === 0) varNames.push("X");

    dispatch({
      type: "START_SOLVE",
      payload: {
        equation: latexVal,
        lhs: latexVal.split("=")[0] || latexVal,
        rhs: latexVal.split("=")[1] || "0",
        targetVar: varNames[0] || "X",
        variables: { ...state.variables },
        varNames,
        currentVarIndex: 0,
        initialGuess: 0,
      },
    });
  }, [state]);

  // CALC Handler: Initializes the interactive CALC workflow
  const handleCalc = useCallback(() => {
    if (!mfRef.current) return;
    const latexVal = mfRef.current.getValue("latex") || state.expression || "";
    if (!latexVal.trim()) return;

    const rawMatches = latexVal.match(/[A-Za-z]/g);
    const varList: string[] = rawMatches ? Array.from(new Set(rawMatches)) : ["X"];
    const varNames: string[] = varList.filter((v) => v !== "e" && v !== "i" && v !== "d");
    if (varNames.length === 0) varNames.push("X");

    dispatch({
      type: "START_CALC",
      payload: {
        expression: latexVal,
        varNames,
        currentVarIndex: 0,
        values: { ...state.variables },
      },
    });
  }, [state]);

  // Insert arbitrary text or template from submenus
  const handleInsertText = useCallback(
    (text: string) => {
      if (mfRef.current) {
        if (text.includes("#?")) {
          mfRef.current.insert(text, { selectionMode: "placeholder" });
        } else {
          mfRef.current.insert(text);
        }
        dispatch({ type: "SET_EXPRESSION", expression: mfRef.current.getValue("latex") });
        focusMathField();
      }
    },
    [focusMathField]
  );

  // Main Semantic Action Dispatcher
  const handleAction = useCallback(
    (action: SemanticAction, keyDef?: CalculatorKey) => {
      // If Menu / Sub-screen is open, handle navigation actions
      if (state.screenState !== "MAIN" && state.screenState !== "CALCULATE") {
        if (action.type === "CLEAR") {
          dispatch({ type: "CLOSE_MENU" });
          focusMathField();
          return;
        }
        if (state.screenState === "MENU") {
          if (action.type === "MOVE_CURSOR") {
            dispatch({ type: "MENU_NAVIGATE", direction: action.direction });
            return;
          }
          if (action.type === "EXECUTE") {
            const modes: CalculatorMode[] = ["CALCULATE", "TABLE", "EQUATION", "INEQUALITY"];
            const chosen = modes[state.menuIndex] || "CALCULATE";
            dispatch({ type: "SET_MODE", mode: chosen });
            return;
          }
          if (action.type === "DIGIT") {
            if (action.value === "1") {
              dispatch({ type: "SET_MODE", mode: "CALCULATE" });
              return;
            }
            if (action.value === "2") {
              dispatch({ type: "SET_MODE", mode: "TABLE" });
              return;
            }
            if (action.value === "3") {
              dispatch({ type: "SET_MODE", mode: "EQUATION" });
              return;
            }
            if (action.value === "4") {
              dispatch({ type: "SET_MODE", mode: "INEQUALITY" });
              return;
            }
          }
        }
      }

      // Record state in undo buffer prior to changes
      if (
        action.type === "INSERT_TEXT" ||
        action.type === "INSERT_TEMPLATE" ||
        action.type === "DIGIT" ||
        action.type === "OPERATOR" ||
        action.type === "DELETE"
      ) {
        if (mfRef.current) {
          dispatch({ type: "PUSH_UNDO", expression: mfRef.current.getValue("latex") || "" });
        }
      }

      switch (action.type) {
        case "INSERT_TEXT":
          if (mfRef.current) {
            mfRef.current.insert(action.text);
            dispatch({ type: "SET_EXPRESSION", expression: mfRef.current.getValue("latex") });
            focusMathField();
          }
          if (state.shiftActive || state.alphaActive) {
            dispatch({ type: "RESET_MODIFIERS" });
          }
          break;

        case "INSERT_TEMPLATE":
          if (mfRef.current) {
            mfRef.current.insert(action.template, { selectionMode: "placeholder" });
            dispatch({ type: "SET_EXPRESSION", expression: mfRef.current.getValue("latex") });
            focusMathField();
          }
          if (state.shiftActive || state.alphaActive) {
            dispatch({ type: "RESET_MODIFIERS" });
          }
          break;

        case "DIGIT":
          if (mfRef.current) {
            mfRef.current.insert(action.value);
            dispatch({ type: "SET_EXPRESSION", expression: mfRef.current.getValue("latex") });
            focusMathField();
          }
          if (state.shiftActive || state.alphaActive) {
            dispatch({ type: "RESET_MODIFIERS" });
          }
          break;

        case "OPERATOR":
          if (mfRef.current) {
            mfRef.current.insert(action.op);
            dispatch({ type: "SET_EXPRESSION", expression: mfRef.current.getValue("latex") });
            focusMathField();
          }
          if (state.shiftActive || state.alphaActive) {
            dispatch({ type: "RESET_MODIFIERS" });
          }
          break;

        case "VARIABLE":
          if (state.stoActive) {
            // Store current result into variable
            const val = parseFloat(state.decimalResult || state.result || "0");
            dispatch({ type: "SET_VARIABLE", name: action.name, value: isNaN(val) ? 0 : val });
          } else if (state.rclActive) {
            // Recall variable value into math-field
            const val = state.variables[action.name] ?? 0;
            if (mfRef.current) {
              mfRef.current.insert(String(val));
              focusMathField();
            }
            dispatch({ type: "RESET_MODIFIERS" });
          } else {
            // Normal variable insertion
            if (mfRef.current) {
              mfRef.current.insert(action.name);
              dispatch({ type: "SET_EXPRESSION", expression: mfRef.current.getValue("latex") });
              focusMathField();
            }
            dispatch({ type: "RESET_MODIFIERS" });
          }
          break;

        case "EXECUTE_COMMAND":
          if (mfRef.current) {
            mfRef.current.executeCommand(action.command);
            focusMathField();
          }
          break;

        case "MOVE_CURSOR":
          if (mfRef.current) {
            if (action.direction === "LEFT") {
              mfRef.current.executeCommand("moveToPreviousChar");
            } else if (action.direction === "RIGHT") {
              mfRef.current.executeCommand("moveToNextChar");
            } else if (action.direction === "UP") {
              const curVal = mfRef.current.getValue("latex");
              if (!curVal && state.history.length > 0) {
                dispatch({ type: "NAVIGATE_HISTORY", direction: "UP" });
              } else {
                mfRef.current.executeCommand("moveUp");
              }
            } else if (action.direction === "DOWN") {
              const curVal = mfRef.current.getValue("latex");
              if (!curVal && state.history.length > 0) {
                dispatch({ type: "NAVIGATE_HISTORY", direction: "DOWN" });
              } else {
                mfRef.current.executeCommand("moveDown");
              }
            }
            focusMathField();
          }
          break;

        case "DELETE":
          if (mfRef.current) {
            mfRef.current.executeCommand("deleteBackward");
            dispatch({ type: "SET_EXPRESSION", expression: mfRef.current.getValue("latex") });
            focusMathField();
          }
          break;

        case "CLEAR":
          if (mfRef.current) {
            mfRef.current.value = "";
          }
          dispatch({ type: "CLEAR" });
          focusMathField();
          break;

        case "EXECUTE":
          handleEvaluate();
          break;

        case "TOGGLE_SHIFT":
          dispatch({ type: "TOGGLE_SHIFT" });
          break;

        case "TOGGLE_ALPHA":
          dispatch({ type: "TOGGLE_ALPHA" });
          break;

        case "TOGGLE_SD":
          dispatch({ type: "TOGGLE_SD" });
          break;

        case "STO":
          dispatch({ type: "SET_STO", active: !state.stoActive });
          break;

        case "RCL":
          dispatch({ type: "SET_RCL", active: !state.rclActive });
          break;

        case "M_PLUS": {
          const val = parseFloat(state.decimalResult || state.result || "0");
          dispatch({ type: "ADD_MEMORY_M", delta: isNaN(val) ? 0 : val });
          break;
        }

        case "M_MINUS": {
          const val = parseFloat(state.decimalResult || state.result || "0");
          dispatch({ type: "ADD_MEMORY_M", delta: isNaN(val) ? 0 : -val });
          break;
        }

        case "CALC":
          handleCalc();
          break;

        case "SOLVE":
          handleSolve();
          break;

        case "OPEN_MENU":
          dispatch({ type: "OPEN_MENU" });
          break;

        case "OPEN_SETUP":
          dispatch({ type: "OPEN_SETUP" });
          break;

        case "OPEN_OPTN":
          dispatch({ type: "OPEN_OPTN" });
          break;

        case "CLOSE_MENU":
          dispatch({ type: "CLOSE_MENU" });
          focusMathField();
          break;

        case "UNDO":
          if (state.undoStack.length > 0) {
            dispatch({ type: "UNDO" });
          } else if (mfRef.current) {
            mfRef.current.executeCommand("undo");
          }
          break;

        case "SET_BASE_N_MODE":
          dispatch({ type: "SET_BASE_N_MODE", mode: action.mode });
          break;

        case "ENG":
          // Engineering notation shift
          break;

        default:
          break;
      }
    },
    [state, focusMathField, handleEvaluate, handleSolve, handleCalc]
  );

  // Sync state.expression when history navigation updates it
  useEffect(() => {
    if (mfRef.current && state.expression !== undefined && state.historyIndex >= 0) {
      mfRef.current.value = state.expression;
    }
  }, [state.expression, state.historyIndex]);

  // Global PC Keyboard Shortcuts Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is inside an input or textarea outside this calculator
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") &&
        !calculatorContainerRef.current?.contains(activeEl)
      ) {
        return;
      }

      if (state.screenState === "MENU") {
        if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4") {
          e.preventDefault();
          handleAction({ type: "DIGIT", value: e.key });
          return;
        }
      }

      if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleAction({ type: "EXECUTE" });
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (state.screenState !== "MAIN" && state.screenState !== "CALCULATE") {
          dispatch({ type: "CLOSE_MENU" });
          focusMathField();
        } else {
          handleAction({ type: "CLEAR" });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleAction({ type: "MOVE_CURSOR", direction: "UP" });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleAction({ type: "MOVE_CURSOR", direction: "DOWN" });
      } else if (e.key === "ArrowLeft") {
        if (state.screenState === "MENU") {
          e.preventDefault();
          handleAction({ type: "MOVE_CURSOR", direction: "LEFT" });
        }
      } else if (e.key === "ArrowRight") {
        if (state.screenState === "MENU") {
          e.preventDefault();
          handleAction({ type: "MOVE_CURSOR", direction: "RIGHT" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, state.screenState, handleAction, focusMathField]);

  if (!isOpen) return null;

  // Minimized Floating Widget
  if (isMinimized) {
    return (
      <div
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className="fixed z-[60] bg-[#1e1f22] border-2 border-blue-500/80 rounded-2xl shadow-2xl p-2.5 flex items-center gap-2.5 cursor-grab active:cursor-grabbing text-white select-none backdrop-blur-md"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center gap-1.5 px-1 font-bold text-xs text-blue-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>fx-580VN X</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
          title="Mở rộng máy tính Casio"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Mở</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
          title="Đóng máy tính"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={calculatorContainerRef}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className="dk-casio-container fixed z-[60] w-[350px] max-w-[96vw] shadow-2xl rounded-3xl border border-slate-700 bg-[#1e1f22] flex flex-col overflow-hidden text-slate-100 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* 1. Emulator Header / Drag Bar */}
      <div
        className="h-10 bg-[#141517] border-b border-[#2a2b30] flex items-center justify-between px-3.5 cursor-grab active:cursor-grabbing text-neutral-400 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-black tracking-widest text-[#d1d5db]">CASIO fx-580VN X</span>
          <span className="text-[9.5px] bg-blue-900/60 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-700/50">
            {state.currentMode}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: state.screenState === "MAIN" ? "OPEN_MENU" : "CLOSE_MENU" })}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              state.screenState !== "MAIN" ? "bg-amber-500 text-slate-900" : "hover:text-white hover:bg-slate-800"
            }`}
            title="Menu chức năng (MENU)"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Thu nhỏ cửa sổ"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Đóng máy tính"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Body: LCD Screen + Keypad */}
      <div className="p-3 flex flex-col gap-2 bg-[#1e1f22]">
        {/* LCD Screen with Integrated Menu Overlay */}
        <CalculatorLCD
          state={state}
          dispatch={dispatch}
          mfRef={mfRef}
          onSendToScratchpad={onSendToScratchpad}
          onCloseMenu={() => {
            dispatch({ type: "CLOSE_MENU" });
            focusMathField();
          }}
          onExpressionChange={(val) => dispatch({ type: "SET_EXPRESSION", expression: val })}
          onInsertText={handleInsertText}
        />

        {/* Hardware Keypad */}
        <CalculatorKeypad
          isShift={state.shiftActive}
          isAlpha={state.alphaActive}
          currentMode={state.currentMode}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}
