import React, { useState } from "react";
import { CalculatorState } from "../types";
import { CalculatorAction } from "../state/calculatorReducer";
import { generateTableRows } from "../engine/solver";
import { evaluateCalculatorExpression } from "../engine/calculatorEngine";

interface TableScreenProps {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  onClose: () => void;
}

export const TableScreen: React.FC<TableScreenProps> = ({
  state,
  dispatch,
  onClose,
}) => {
  const { table, screenState } = state;

  // Local state for Step in workflow: "f" -> "g" (if dual) -> "range" -> "result"
  const [activeStep, setActiveStep] = useState<"f" | "g" | "range" | "result">(
    screenState === "TABLE_RESULT" || screenState === "TABLE_VIEW"
      ? "result"
      : screenState === "TABLE_RANGE"
      ? "range"
      : "f"
  );

  const [fVal, setFVal] = useState<string>(table.fExpr || "X^2");
  const [gVal, setGVal] = useState<string>(table.gExpr || "");
  const [startVal, setStartVal] = useState<string>(table.start || "1");
  const [endVal, setEndVal] = useState<string>(table.end || "5");
  const [stepVal, setStepVal] = useState<string>(table.step || "1");

  const [selectedRow, setSelectedRow] = useState<number>(table.rowIndex || 0);
  const [editXInput, setEditXInput] = useState<string>("");

  const handleGenerate = () => {
    const s = parseFloat(startVal || "1");
    const e = parseFloat(endVal || "5");
    const st = parseFloat(stepVal || "1");

    if (isNaN(s) || isNaN(e) || isNaN(st) || st <= 0 || s > e) {
      alert("Range ERROR: Ensure Step > 0 and Start <= End");
      return;
    }

    const rows = generateTableRows(fVal, s, e, st, state, state.tableDualFunction ? gVal : undefined);
    dispatch({
      type: "TABLE_SET_ROWS",
      rows: rows.map((r) => ({ x: r.x, fx: r.fx, gx: r.gx })),
    });
    setActiveStep("result");
    dispatch({ type: "SET_SCREEN", screen: "TABLE_RESULT" });
  };

  // Dynamically recompute a row when x value is modified
  const handleEditX = (newXStr: string) => {
    const newX = parseFloat(newXStr);
    if (isNaN(newX)) return;

    const customState = {
      ...state,
      variables: { ...state.variables, X: newX, x: newX },
    };
    const resF = evaluateCalculatorExpression(fVal, customState);
    const fxStr = resF.isError ? "Math ERROR" : resF.display;

    let gxStr: string | undefined = undefined;
    if (state.tableDualFunction && gVal.trim()) {
      const resG = evaluateCalculatorExpression(gVal, customState);
      gxStr = resG.isError ? "Math ERROR" : resG.display;
    }

    const updatedRows = [...table.rows];
    if (updatedRows[selectedRow]) {
      updatedRows[selectedRow] = {
        x: newX,
        fx: fxStr,
        gx: gxStr,
      };
      dispatch({ type: "TABLE_SET_ROWS", rows: updatedRows });
    }
  };

  // --- 1. f(x) INPUT SCREEN ---
  if (activeStep === "f") {
    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
          <span>TABLE</span>
          <button type="button" onClick={onClose} className="hover:underline">
            [AC]
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center px-1 space-y-1">
          <div className="text-[11px] font-bold">f(x) =</div>
          <input
            type="text"
            value={fVal}
            onChange={(e) => {
              setFVal(e.target.value);
              dispatch({ type: "TABLE_SET_FIELD", field: "fExpr", value: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (state.tableDualFunction) {
                  setActiveStep("g");
                } else {
                  setActiveStep("range");
                }
              }
            }}
            placeholder="e.g. X^2 - 1"
            className="w-full bg-[#869586] px-2 py-1 rounded font-bold outline-none text-black text-xs"
            autoFocus
          />
        </div>
        <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8.5px] font-bold">
          <button type="button" onClick={onClose} className="hover:underline">
            [AC] Exit
          </button>
          <button
            type="button"
            onClick={() => {
              if (state.tableDualFunction) {
                setActiveStep("g");
              } else {
                setActiveStep("range");
              }
            }}
            className="bg-[#141714] text-[#96a796] px-2 py-0.5 rounded font-black cursor-pointer"
          >
            [EXE] Next
          </button>
        </div>
      </div>
    );
  }

  // --- 2. g(x) INPUT SCREEN ---
  if (activeStep === "g") {
    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
          <span>TABLE (Dual)</span>
          <button type="button" onClick={() => setActiveStep("f")} className="hover:underline">
            [◀] Back
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center px-1 space-y-1">
          <div className="text-[11px] font-bold">g(x) =</div>
          <input
            type="text"
            value={gVal}
            onChange={(e) => {
              setGVal(e.target.value);
              dispatch({ type: "TABLE_SET_FIELD", field: "gExpr", value: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setActiveStep("range");
            }}
            placeholder="(optional, e.g. 2X)"
            className="w-full bg-[#869586] px-2 py-1 rounded font-bold outline-none text-black text-xs"
            autoFocus
          />
        </div>
        <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8.5px] font-bold">
          <button type="button" onClick={() => setActiveStep("f")} className="hover:underline">
            [◀] Back
          </button>
          <button
            type="button"
            onClick={() => setActiveStep("range")}
            className="bg-[#141714] text-[#96a796] px-2 py-0.5 rounded font-black cursor-pointer"
          >
            [EXE] Range
          </button>
        </div>
      </div>
    );
  }

  // --- 3. TABLE RANGE SCREEN (Start, End, Step) ---
  if (activeStep === "range") {
    return (
      <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1.5 select-none font-mono text-[10px]">
        <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black text-[9px]">
          <span>Table Range</span>
          <button type="button" onClick={() => setActiveStep("f")} className="hover:underline">
            [◀] Back
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold">Start :</span>
            <input
              type="text"
              value={startVal}
              onChange={(e) => setStartVal(e.target.value)}
              className="w-20 bg-[#869586] px-1 py-0.5 rounded font-bold text-right outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold">End   :</span>
            <input
              type="text"
              value={endVal}
              onChange={(e) => setEndVal(e.target.value)}
              className="w-20 bg-[#869586] px-1 py-0.5 rounded font-bold text-right outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold">Step  :</span>
            <input
              type="text"
              value={stepVal}
              onChange={(e) => setStepVal(e.target.value)}
              className="w-20 bg-[#869586] px-1 py-0.5 rounded font-bold text-right outline-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8.5px] font-bold">
          <button type="button" onClick={() => setActiveStep("f")} className="hover:underline">
            [◀] Back
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="bg-[#141714] text-[#96a796] px-2 py-0.5 rounded font-black cursor-pointer"
          >
            [EXE] Generate
          </button>
        </div>
      </div>
    );
  }

  // --- 4. TABLE RESULT SCREEN ---
  const hasG = Boolean(state.tableDualFunction && gVal.trim() && table.rows.some((r) => r.gx !== undefined));

  return (
    <div className="absolute inset-0 bg-[#96a796] text-[#111] z-20 flex flex-col p-1 select-none font-mono text-[9px]">
      {/* Header */}
      <div className="flex justify-between items-center pb-0.5 border-b border-[#7e8f7e] font-black">
        <span>TABLE RESULT ({table.rows.length} rows)</span>
        <button
          type="button"
          onClick={() => setActiveStep("f")}
          className="hover:underline cursor-pointer text-[8px]"
        >
          [◀] Edit Function
        </button>
      </div>

      {/* Table Data */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="border-b border-[#7e8f7e] font-black text-[8.5px]">
              <th className="py-0.5 px-1">No.</th>
              <th className="px-1">x</th>
              <th className="px-1">f(x)</th>
              {hasG && <th className="px-1">g(x)</th>}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => {
              const isSelected = selectedRow === idx;
              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedRow(idx)}
                  className={`border-b border-[#869586] transition-colors cursor-pointer ${
                    isSelected ? "bg-[#141714] text-[#96a796] font-black" : "hover:bg-[#869586]"
                  }`}
                >
                  <td className="py-0.5 px-1 opacity-70">{idx + 1}</td>
                  <td className="px-1">
                    {isSelected ? (
                      <input
                        type="text"
                        defaultValue={row.x}
                        onBlur={(e) => handleEditX(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditX((e.target as HTMLInputElement).value);
                        }}
                        className="w-12 text-center bg-transparent border-none outline-none font-mono font-bold text-inherit"
                      />
                    ) : (
                      row.x
                    )}
                  </td>
                  <td className="px-1 font-bold">{row.fx}</td>
                  {hasG && <td className="px-1">{row.gx ?? "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-0.5 border-t border-[#7e8f7e] text-[8px] font-bold">
        <span>▲▼ Row | Edit x</span>
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
