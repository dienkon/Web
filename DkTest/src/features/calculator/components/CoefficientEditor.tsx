import React, { useState } from "react";
import { CalculatorState } from "../types";
import { CalculatorAction } from "../state/calculatorReducer";
import {
  solvePolynomial,
  solveLinearSystem,
  solveInequality,
} from "../engine/solver";

interface CoefficientEditorProps {
  mode: "EQUATION" | "INEQUALITY";
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  onClose: () => void;
  onSendToScratchpad?: (value: string) => void;
}

export const CoefficientEditor: React.FC<CoefficientEditorProps> = ({
  mode,
  state,
  dispatch,
  onClose,
  onSendToScratchpad,
}) => {
  // Navigation sub-steps:
  // For EQUATION: "choose_type" -> "choose_degree" -> "coefficients" -> "result"
  // For INEQUALITY: "choose_degree" -> "choose_sign" -> "coefficients" -> "result"
  const [subStep, setSubStep] = useState<string>(
    state.screenState === "EQN_RESULT" || state.screenState === "INEQ_RESULT"
      ? "result"
      : state.screenState === "EQN_COEFFICIENT" || state.screenState === "INEQ_COEFFICIENT"
      ? "coefficients"
      : mode === "EQUATION"
      ? "choose_type"
      : "choose_degree"
  );

  // Workflow variables
  const [eqnType, setEqnType] = useState<"simult" | "poly">("poly");
  const [degree, setDegree] = useState<number>(2);
  const [ineqSign, setIneqSign] = useState<">" | "<" | ">=" | "<=">("<");

  // Coefficients state
  const [coeffVals, setCoeffVals] = useState<Record<string, string>>({
    a: "1",
    b: "2",
    c: "-3",
    d: "0",
    e: "0",
    a1: "1",
    b1: "1",
    c1: "5",
    a2: "2",
    b2: "-1",
    c2: "1",
    a3: "1",
    b3: "1",
    c3: "1",
    d3: "6",
  });

  const [activeCellIdx, setActiveCellIdx] = useState<number>(0);
  const [solutions, setSolutions] = useState<string[]>([]);
  const [solIndex, setSolIndex] = useState<number>(0);

  // Field keys generator based on configuration
  const getFieldKeys = (): string[] => {
    if (mode === "INEQUALITY" || (mode === "EQUATION" && eqnType === "poly")) {
      if (degree === 2) return ["a", "b", "c"];
      if (degree === 3) return ["a", "b", "c", "d"];
      return ["a", "b", "c", "d", "e"];
    }
    // Simultaneous
    if (degree === 2) return ["a1", "b1", "c1", "a2", "b2", "c2"];
    if (degree === 3) return ["a1", "b1", "c1", "d1", "a2", "b2", "c2", "d2", "a3", "b3", "c3", "d3"];
    return [
      "a1", "b1", "c1", "d1", "e1",
      "a2", "b2", "c2", "d2", "e2",
      "a3", "b3", "c3", "d3", "e3",
      "a4", "b4", "c4", "d4", "e4",
    ];
  };

  const fieldKeys = getFieldKeys();

  // Execute solver
  const handleSolve = () => {
    if (mode === "INEQUALITY") {
      const a = parseFloat(coeffVals.a || "1");
      const b = parseFloat(coeffVals.b || "0");
      const c = parseFloat(coeffVals.c || "0");
      const ineqResult = solveInequality(degree, [a, b, c], ineqSign);
      setSolutions([ineqResult]);
      setSolIndex(0);
      setSubStep("result");
      dispatch({ type: "SET_SCREEN", screen: "INEQ_RESULT" });
      return;
    }

    if (eqnType === "poly") {
      const cList = fieldKeys.map((k) => parseFloat(coeffVals[k] || "0"));
      const roots = solvePolynomial(degree, cList);
      setSolutions(roots);
      setSolIndex(0);
      setSubStep("result");
      dispatch({ type: "SET_SCREEN", screen: "EQN_RESULT" });
    } else {
      // Simultaneous
      const rowLen = degree + 1;
      const matrix: number[][] = [];
      for (let r = 0; r < degree; r++) {
        const row: number[] = [];
        for (let c = 0; c < rowLen; c++) {
          const k = fieldKeys[r * rowLen + c];
          row.push(parseFloat(coeffVals[k] || "0"));
        }
        matrix.push(row);
      }
      const res = solveLinearSystem(matrix);
      setSolutions(res.formatted);
      setSolIndex(0);
      setSubStep("result");
      dispatch({ type: "SET_SCREEN", screen: "EQN_RESULT" });
    }
  };

  // --- 1. CHOOSE TYPE (For Equation) ---
  if (subStep === "choose_type") {
    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
          <span>Equation / Func</span>
          <button type="button" onClick={onClose} className="hover:underline">
            [AC]
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center space-y-1.5 px-2">
          <button
            type="button"
            onClick={() => {
              setEqnType("simult");
              setSubStep("choose_degree");
            }}
            className="w-full text-left px-2 py-1.5 bg-[#869586] hover:bg-[#728072] rounded font-bold cursor-pointer"
          >
            1: Simul Equation
          </button>
          <button
            type="button"
            onClick={() => {
              setEqnType("poly");
              setSubStep("choose_degree");
            }}
            className="w-full text-left px-2 py-1.5 bg-[#869586] hover:bg-[#728072] rounded font-bold cursor-pointer"
          >
            2: Polynomial
          </button>
        </div>
      </div>
    );
  }

  // --- 2. CHOOSE DEGREE / UNKNOWNS ---
  if (subStep === "choose_degree") {
    const label = mode === "INEQUALITY" || eqnType === "poly" ? "Polynomial Degree?" : "Number of Unknowns?";
    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
          <span>{label}</span>
          <button type="button" onClick={onClose} className="hover:underline">
            [AC]
          </button>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-1.5 p-2 items-center">
          {[2, 3, 4].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDegree(d);
                if (mode === "INEQUALITY") {
                  setSubStep("choose_sign");
                } else {
                  setSubStep("coefficients");
                }
              }}
              className="bg-[#869586] hover:bg-[#728072] rounded py-3 font-black text-sm cursor-pointer flex flex-col items-center justify-center text-black"
            >
              <span>{d}</span>
              <span className="text-[7.5px] opacity-75">
                {mode === "INEQUALITY" || eqnType === "poly" ? "Degree" : "Unknowns"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 3. CHOOSE INEQUALITY SIGN ---
  if (subStep === "choose_sign") {
    const signs: { id: ">" | "<" | ">=" | "<="; label: string }[] = [
      { id: ">", label: "1: ax² + bx + c > 0" },
      { id: "<", label: "2: ax² + bx + c < 0" },
      { id: ">=", label: "3: ax² + bx + c ≥ 0" },
      { id: "<=", label: "4: ax² + bx + c ≤ 0" },
    ];

    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[9.5px]">
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
          <span>Inequality Sign</span>
          <button type="button" onClick={() => setSubStep("choose_degree")} className="hover:underline">
            [◀] Back
          </button>
        </div>
        <div className="flex-1 space-y-1 py-1 px-1">
          {signs.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setIneqSign(s.id);
                setSubStep("coefficients");
              }}
              className="w-full text-left px-2 py-1 bg-[#869586] hover:bg-[#728072] rounded font-bold cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 4. COEFFICIENT EDITOR (Calculator Style Table) ---
  if (subStep === "coefficients") {
    const headerTitle =
      mode === "INEQUALITY"
        ? `Ineq (Deg ${degree})`
        : eqnType === "poly"
        ? `axⁿ+...=0 (Deg ${degree})`
        : `Simult (${degree} Unknowns)`;

    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[9px]">
        {/* Header */}
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black">
          <span>{headerTitle}</span>
          <button type="button" onClick={onClose} className="hover:underline">
            [AC]
          </button>
        </div>

        {/* Coefficients Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-1 py-1 px-0.5">
          {fieldKeys.map((k, idx) => {
            const isSelected = activeCellIdx === idx;
            return (
              <div
                key={k}
                onClick={() => setActiveCellIdx(idx)}
                className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  isSelected ? "bg-[#141714] text-[#96a796] font-black" : "bg-[#869586] text-black font-bold"
                }`}
              >
                <span>{k}=</span>
                <input
                  type="text"
                  value={coeffVals[k] || "0"}
                  onChange={(e) => {
                    setCoeffVals({ ...coeffVals, [k]: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (activeCellIdx === fieldKeys.length - 1) {
                        handleSolve();
                      } else {
                        setActiveCellIdx((p) => Math.min(fieldKeys.length - 1, p + 1));
                      }
                    }
                    if (e.key === "ArrowRight") setActiveCellIdx((p) => Math.min(fieldKeys.length - 1, p + 1));
                    if (e.key === "ArrowLeft") setActiveCellIdx((p) => Math.max(0, p - 1));
                    if (e.key === "ArrowDown") setActiveCellIdx((p) => Math.min(fieldKeys.length - 1, p + 3));
                    if (e.key === "ArrowUp") setActiveCellIdx((p) => Math.max(0, p - 3));
                  }}
                  className="w-10 text-right bg-transparent border-none outline-none font-mono font-bold text-inherit"
                />
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8px] font-bold">
          <span>▲▼◀▶ Navigate</span>
          <button
            type="button"
            onClick={handleSolve}
            className="bg-[#141714] text-[#96a796] px-2 py-0.5 rounded font-black cursor-pointer"
          >
            [EXE] Solve
          </button>
        </div>
      </div>
    );
  }

  // --- 5. RESULT SCREEN (Clear, prominent solution display on LCD) ---
  const currentSol = solutions[solIndex] || "No Solution";

  return (
    <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
      {/* Header */}
      <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
        <span>
          {mode === "INEQUALITY"
            ? "Inequality Result"
            : `Solution (${solIndex + 1}/${solutions.length})`}
        </span>
        {solutions.length > 1 && <span className="text-[8px] opacity-75">▲▼ Replay</span>}
      </div>

      {/* Main Result Display */}
      <div className="flex-1 flex items-center justify-center px-2 text-center">
        <span className="text-base font-black text-black tracking-tight leading-snug">
          {currentSol}
        </span>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8.5px] font-bold">
        <button
          type="button"
          onClick={() => setSubStep("coefficients")}
          className="hover:underline cursor-pointer"
        >
          [◀] Edit Coeffs
        </button>
        {onSendToScratchpad && currentSol && (
          <button
            type="button"
            onClick={() => onSendToScratchpad(currentSol)}
            className="bg-[#141714] text-[#96a796] px-1.5 py-0.5 rounded font-black cursor-pointer"
          >
            Paste to Scratchpad
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="hover:underline cursor-pointer"
        >
          [AC] Exit
        </button>
      </div>
    </div>
  );
};
