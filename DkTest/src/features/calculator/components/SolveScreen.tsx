import React, { useState } from "react";
import { CalculatorState } from "../types";
import { CalculatorAction } from "../state/calculatorReducer";
import { solveNumericEquation } from "../engine/solver";

interface SolveScreenProps {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  onClose: () => void;
  onSendToScratchpad?: (value: string) => void;
}

export const SolveScreen: React.FC<SolveScreenProps> = ({
  state,
  dispatch,
  onClose,
  onSendToScratchpad,
}) => {
  const { solve, screenState } = state;
  const isResultScreen = screenState === "SOLVE_RESULT";

  // State for active variable selection and editing
  const [selectedVarIdx, setSelectedVarIdx] = useState<number>(0);
  const [inputVal, setInputVal] = useState<string>("");

  const varNames = solve.varNames.length > 0 ? solve.varNames : ["X"];
  const currentVar = varNames[selectedVarIdx] || varNames[0] || "X";

  const handleRunSolve = (targetVariable = currentVar) => {
    const res = solveNumericEquation(
      solve.equation || state.expression,
      solve.variables,
      targetVariable,
      solve.initialGuess || 0.0
    );

    if (res.solution !== undefined) {
      dispatch({
        type: "SOLVE_SET_SOLUTION",
        solution: res.solution,
        residual: res.residual ?? 0,
        canContinue: false,
      });
    } else if (res.canContinue) {
      dispatch({
        type: "SOLVE_SET_SOLUTION",
        solution: res.approxSolution ?? 0,
        residual: res.residual ?? 0.01,
        canContinue: true,
      });
    } else {
      dispatch({
        type: "SOLVE_SET_ERROR",
        error: res.error || "Can't Solve",
      });
    }
  };

  const handleExeAssign = () => {
    // Save current input if typed
    if (inputVal.trim()) {
      const num = parseFloat(inputVal);
      if (!isNaN(num)) {
        dispatch({ type: "SOLVE_SET_VAR", varName: currentVar, value: num });
      }
      setInputVal("");
    }

    // If at the end of variables or explicitly on target var, solve!
    if (selectedVarIdx === varNames.length - 1) {
      handleRunSolve(currentVar);
    } else {
      setSelectedVarIdx((prev) => Math.min(varNames.length - 1, prev + 1));
    }
  };

  // --- RESULT VIEW ---
  if (isResultScreen) {
    const solStr =
      solve.solution !== undefined
        ? String(solve.solution)
        : "Can't Solve";

    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
        {/* Header */}
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
          <span className="truncate max-w-[70%]">{solve.equation || state.expression}</span>
          <span className="text-[8px] bg-[#111] text-[#96a796] px-1 rounded">SOLVE</span>
        </div>

        {/* Main Solution Area */}
        <div className="flex-1 flex flex-col justify-center px-2 space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-xs">{solve.targetVar} =</span>
            <span className="text-base font-black text-black">
              {solStr}
            </span>
          </div>

          <div className="flex justify-between items-center text-[9px] opacity-80 border-t border-[#869586] pt-0.5">
            <span>L - R =</span>
            <span>{solve.residual !== undefined ? solve.residual.toExponential(4) : "0"}</span>
          </div>

          {solve.canContinue && (
            <div className="text-[9px] text-[#b91c1c] font-black animate-pulse">
              Continue: [=]
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8.5px] font-bold">
          <button
            type="button"
            onClick={onClose}
            className="hover:underline cursor-pointer"
          >
            [AC] Exit
          </button>
          {onSendToScratchpad && solve.solution !== undefined && (
            <button
              type="button"
              onClick={() => onSendToScratchpad(String(solve.solution))}
              className="bg-[#141714] text-[#96a796] px-1.5 py-0.5 rounded font-black cursor-pointer"
            >
              Paste to Scratchpad
            </button>
          )}
          <button
            type="button"
            onClick={() => handleRunSolve(solve.targetVar)}
            className="bg-[#141714] text-[#96a796] px-2 py-0.5 rounded font-black cursor-pointer"
          >
            [EXE] Re-solve
          </button>
        </div>
      </div>
    );
  }

  // --- VARIABLE ASSIGNMENT VIEW ---
  return (
    <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
      {/* Header */}
      <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
        <span className="truncate max-w-[70%]">{solve.equation || state.expression}</span>
        <span className="text-[8px] bg-[#111] text-[#96a796] px-1 rounded">SOLVE</span>
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto space-y-1 py-1 px-1">
        {varNames.map((vName, idx) => {
          const isSelected = selectedVarIdx === idx;
          const currentVal = solve.variables[vName] ?? 0;

          return (
            <div
              key={vName}
              onClick={() => setSelectedVarIdx(idx)}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                isSelected
                  ? "bg-[#141714] text-[#96a796] font-black"
                  : "hover:bg-[#869586] text-black font-bold"
              }`}
            >
              <span>{vName} =</span>
              {isSelected ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={inputVal !== "" ? inputVal : String(currentVal)}
                    onChange={(e) => {
                      setInputVal(e.target.value);
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num)) {
                        dispatch({ type: "SOLVE_SET_VAR", varName: vName, value: num });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleExeAssign();
                      if (e.key === "ArrowUp") setSelectedVarIdx((p) => Math.max(0, p - 1));
                      if (e.key === "ArrowDown") setSelectedVarIdx((p) => Math.min(varNames.length - 1, p + 1));
                    }}
                    className="w-16 text-right bg-transparent border-none outline-none font-mono font-bold text-inherit"
                    autoFocus
                  />
                  <span className="text-[8px] opacity-75">?</span>
                </div>
              ) : (
                <span>{currentVal}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Controls */}
      <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8.5px] font-bold">
        <button
          type="button"
          onClick={onClose}
          className="hover:underline cursor-pointer"
        >
          [AC] Cancel
        </button>
        <span className="text-[8px] opacity-75">▲▼ Select</span>
        <button
          type="button"
          onClick={() => handleRunSolve(currentVar)}
          className="bg-[#141714] text-[#96a796] px-2 py-0.5 rounded font-black cursor-pointer"
        >
          [EXE] Solve {currentVar}
        </button>
      </div>
    </div>
  );
};
