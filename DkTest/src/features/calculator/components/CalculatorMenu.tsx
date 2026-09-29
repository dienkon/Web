import React, { useState } from "react";
import {
  CalculatorState,
  CalculatorMode,
  ScreenState,
  AngleUnit,
  InputOutputMode,
} from "../types";
import { CalculatorAction } from "../state/calculatorReducer";
import { SETUP_PAGES, SetupPageItem } from "../config/setupConfig";
import { SolveScreen } from "./SolveScreen";
import { TableScreen } from "./TableScreen";
import { CoefficientEditor } from "./CoefficientEditor";

interface CalculatorMenuProps {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  onCloseMenu: () => void;
  onSendToScratchpad?: (value: string) => void;
  onInsertText?: (text: string) => void;
}

export const CalculatorMenu: React.FC<CalculatorMenuProps> = ({
  state,
  dispatch,
  onCloseMenu,
  onSendToScratchpad,
  onInsertText,
}) => {
  const { screenState, menuIndex } = state;

  const [setupSubPage, setSetupSubPage] = useState<string | null>(null);
  const [setupPageNum, setSetupPageNum] = useState<number>(0);

  // If on main screen, render nothing
  if (screenState === "MAIN" || screenState === "CALCULATE") return null;

  // --- 1. SOLVE SCREEN DELEGATION ---
  if (
    screenState === "SOLVE" ||
    screenState === "SOLVE_PROMPT" ||
    screenState === "SOLVE_RESULT" ||
    screenState === "CALC_ASSIGN" ||
    screenState === "CALC_PROMPT"
  ) {
    return (
      <SolveScreen
        state={state}
        dispatch={dispatch}
        onClose={onCloseMenu}
        onSendToScratchpad={onSendToScratchpad}
      />
    );
  }

  // --- 2. TABLE SCREEN DELEGATION ---
  if (
    screenState === "TABLE_INPUT" ||
    screenState === "TABLE_RANGE" ||
    screenState === "TABLE_RESULT" ||
    screenState === "TABLE_VIEW"
  ) {
    return (
      <TableScreen
        state={state}
        dispatch={dispatch}
        onClose={onCloseMenu}
      />
    );
  }

  // --- 3. EQUATION / FUNC SCREEN DELEGATION ---
  if (
    screenState === "EQN_TYPE" ||
    screenState === "EQN_DEGREE" ||
    screenState === "EQN_COEFFICIENT" ||
    screenState === "EQN_RESULT" ||
    screenState === "EQN_SELECT" ||
    screenState === "EQN_POLY_DEG" ||
    screenState === "EQN_SIMULT_UNKNOWN" ||
    screenState === "EQN_COEFFS" ||
    screenState === "EQN_SOLUTIONS"
  ) {
    return (
      <CoefficientEditor
        mode="EQUATION"
        state={state}
        dispatch={dispatch}
        onClose={onCloseMenu}
        onSendToScratchpad={onSendToScratchpad}
      />
    );
  }

  // --- 4. INEQUALITY SCREEN DELEGATION ---
  if (
    screenState === "INEQ_DEGREE" ||
    screenState === "INEQ_TYPE" ||
    screenState === "INEQ_COEFFICIENT" ||
    screenState === "INEQ_RESULT" ||
    screenState === "INEQ_SELECT_DEG" ||
    screenState === "INEQ_SELECT_TYPE" ||
    screenState === "INEQ_COEFFS"
  ) {
    return (
      <CoefficientEditor
        mode="INEQUALITY"
        state={state}
        dispatch={dispatch}
        onClose={onCloseMenu}
        onSendToScratchpad={onSendToScratchpad}
      />
    );
  }

  // --- 5. SETUP MENU (3 Pages inside LCD) ---
  if (screenState === "SETUP") {
    const curPage: SetupPageItem[] = SETUP_PAGES[setupPageNum] || SETUP_PAGES[0];

    if (setupSubPage === "io") {
      const ioOptions: InputOutputMode[] = [
        "MathI/MathO",
        "MathI/DecimalO",
        "LineI/LineO",
        "LineI/DecimalO",
      ];
      return (
        <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono">
          <div className="flex justify-between items-center pb-1 border-b border-[#7e8f7e] text-[10px] font-black">
            <span>Input/Output</span>
            <button
              type="button"
              onClick={() => setSetupSubPage(null)}
              className="hover:underline text-[9px]"
            >
              Back
            </button>
          </div>
          <div className="flex-1 space-y-1 pt-1 text-[9.5px]">
            {ioOptions.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  dispatch({ type: "SET_INPUT_MODE", mode: opt });
                  setSetupSubPage(null);
                }}
                className={`w-full text-left px-1.5 py-1 rounded font-bold cursor-pointer ${
                  state.inputMode === opt ? "bg-[#141714] text-[#96a796]" : "hover:bg-[#869586]"
                }`}
              >
                {i + 1}: {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (setupSubPage === "angle") {
      const angleOptions: { label: string; unit: AngleUnit }[] = [
        { label: "1: Degree", unit: "DEG" },
        { label: "2: Radian", unit: "RAD" },
        { label: "3: Gradian", unit: "GRAD" },
      ];
      return (
        <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono">
          <div className="flex justify-between items-center pb-1 border-b border-[#7e8f7e] text-[10px] font-black">
            <span>Angle Unit</span>
            <button
              type="button"
              onClick={() => setSetupSubPage(null)}
              className="hover:underline text-[9px]"
            >
              Back
            </button>
          </div>
          <div className="flex-1 space-y-1 pt-1 text-[9.5px]">
            {angleOptions.map((opt) => (
              <button
                key={opt.unit}
                type="button"
                onClick={() => {
                  dispatch({ type: "SET_ANGLE_UNIT", unit: opt.unit });
                  setSetupSubPage(null);
                }}
                className={`w-full text-left px-1.5 py-1 rounded font-bold cursor-pointer ${
                  state.angleUnit === opt.unit ? "bg-[#141714] text-[#96a796]" : "hover:bg-[#869586]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1 select-none font-mono text-[10px]">
        {/* Header with Page indicator ▲ ▼ */}
        <div className="flex justify-between items-center px-1 pb-0.5 border-b border-[#7e8f7e] font-black text-[9.5px]">
          <span>SETUP ({setupPageNum + 1}/3)</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSetupPageNum((prev) => (prev > 0 ? prev - 1 : 2))}
              className="px-1 hover:bg-[#7e8f7e] rounded cursor-pointer"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => setSetupPageNum((prev) => (prev < 2 ? prev + 1 : 0))}
              className="px-1 hover:bg-[#7e8f7e] rounded cursor-pointer"
            >
              ▼
            </button>
            <button
              type="button"
              onClick={onCloseMenu}
              className="px-1 hover:bg-[#7e8f7e] rounded cursor-pointer font-bold"
            >
              [AC]
            </button>
          </div>
        </div>

        {/* 4 items for current setup page */}
        <div className="flex-1 space-y-0.5 pt-1 px-1">
          {curPage.map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => {
                if (setupPageNum === 0) {
                  if (item.num === 1) setSetupSubPage("io");
                  if (item.num === 2) setSetupSubPage("angle");
                  if (item.num === 3) dispatch({ type: "SET_DISPLAY_MODE", mode: "Norm", digits: 1 });
                  if (item.num === 4) dispatch({ type: "SET_ENGINEER_SYMBOL", on: !state.engineerSymbol });
                } else if (setupPageNum === 1) {
                  if (item.num === 1) dispatch({ type: "SET_FRACTION_RESULT", format: state.fractionResult === "d/c" ? "ab/c" : "d/c" });
                  if (item.num === 2) dispatch({ type: "SET_COMPLEX_FORMAT", format: state.complexFormat === "a+bi" ? "r∠θ" : "a+bi" });
                  if (item.num === 3) dispatch({ type: "SET_STATISTICS_FREQ", on: !state.statisticsFreqOn });
                  if (item.num === 4) dispatch({ type: "SET_EQUATION_COMPLEX", on: !state.equationComplexOn });
                } else if (setupPageNum === 2) {
                  if (item.num === 1) dispatch({ type: "SET_TABLE_DUAL", on: !state.tableDualFunction });
                  if (item.num === 2) dispatch({ type: "SET_RECURRING_DEC", on: !state.recurringDecimalOn });
                  if (item.num === 3) dispatch({ type: "SET_DECIMAL_MARK", mark: state.decimalMark === "Dot" ? "Comma" : "Dot" });
                  if (item.num === 4) dispatch({ type: "SET_DIGIT_SEPARATOR", on: !state.digitSeparatorOn });
                }
              }}
              className="w-full text-left px-1.5 py-0.5 rounded font-bold hover:bg-[#869586] flex justify-between items-center cursor-pointer"
            >
              <span>{item.title}</span>
              <span className="text-[8px] opacity-75">
                {setupPageNum === 0 && item.num === 2 && state.angleUnit}
                {setupPageNum === 1 && item.num === 1 && state.fractionResult}
                {setupPageNum === 2 && item.num === 1 && (state.tableDualFunction ? "f(x),g(x)" : "f(x)")}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 6. MAIN MENU (Focused 4 Core Modes) ---
  const activeModes: { num: number; mode: CalculatorMode; title: string; desc: string }[] = [
    { num: 1, mode: "CALCULATE", title: "1: Calculate", desc: "Tính toán thông thường" },
    { num: 2, mode: "TABLE", title: "2: Table", desc: "Bảng giá trị f(x), g(x)" },
    { num: 3, mode: "EQUATION", title: "3: Equation/Func", desc: "Hệ PT & Đa thức bậc 2-4" },
    { num: 4, mode: "INEQUALITY", title: "4: Inequality", desc: "Bất phương trình bậc 2-4" },
  ];

  const handleSelect = (mode: CalculatorMode) => {
    dispatch({ type: "SET_MODE", mode });
  };

  return (
    <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
      {/* Header */}
      <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
        <span>MENU (4 Modes)</span>
        <button type="button" onClick={onCloseMenu} className="hover:underline cursor-pointer">
          [AC] Close
        </button>
      </div>

      {/* 4 Mode Items List in compact LCD layout */}
      <div className="flex-1 space-y-1 py-1">
        {activeModes.map((item, idx) => {
          const isSelected = menuIndex === idx;
          return (
            <button
              key={item.num}
              type="button"
              onClick={() => {
                dispatch({ type: "SET_MENU_INDEX", index: idx });
                handleSelect(item.mode);
              }}
              className={`w-full text-left px-2 py-1 rounded font-bold cursor-pointer transition-all flex items-center justify-between ${
                isSelected ? "bg-[#141714] text-[#96a796] font-black" : "hover:bg-[#869586]"
              }`}
            >
              <span>{item.title}</span>
              <span className="text-[8px] opacity-75">{item.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Footer navigation info */}
      <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8px] font-bold opacity-80">
        <span>▲▼ Select | EXE</span>
        <span>[1] - [4] Direct</span>
      </div>
    </div>
  );
};
