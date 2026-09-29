import React, { useRef, useEffect } from "react";
import { CalculatorState } from "../types";
import { CalculatorAction } from "../state/calculatorReducer";
import { CalculatorMenu } from "./CalculatorMenu";

interface CalculatorLCDProps {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  mfRef: React.RefObject<any>;
  onSendToScratchpad?: (value: string) => void;
  onCloseMenu: () => void;
  onExpressionChange: (val: string) => void;
  onInsertText?: (text: string) => void;
}

export const CalculatorLCD: React.FC<CalculatorLCDProps> = ({
  state,
  dispatch,
  mfRef,
  onSendToScratchpad,
  onCloseMenu,
  onExpressionChange,
  onInsertText,
}) => {
  const resultMfRef = useRef<any>(null);

  // Configure math-field options on mount
  useEffect(() => {
    if (mfRef.current) {
      try {
        mfRef.current.virtualKeyboardMode = "off";
        mfRef.current.mathVirtualKeyboardPolicy = "manual";
        mfRef.current.smartFence = true;
        mfRef.current.smartSuperscript = true;
      } catch {
        // Fallback
      }
    }
  }, [mfRef]);

  // Keep read-only result field in sync
  useEffect(() => {
    if (resultMfRef.current) {
      try {
        resultMfRef.current.value = state.result || "";
      } catch {
        // ignore
      }
    }
  }, [state.result]);

  const handleResultClick = () => {
    if (!state.result || state.result.includes("ERROR")) return;
    if (onSendToScratchpad) {
      // Send canonical LaTeX result to scratchpad
      onSendToScratchpad(state.exactResult || state.result);
    }
  };

  // Status bar angle label
  const angleLabel = state.angleUnit === "DEG" ? "D" : state.angleUnit === "RAD" ? "R" : "G";
  const isFix = state.displayMode === "Fix";
  const isSci = state.displayMode === "Sci";

  return (
    <div className="relative bg-[#96a796] rounded-xl p-2 border-[3px] border-[#0c0d10] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] flex flex-col h-[138px] font-mono select-none overflow-hidden text-[#111] transition-all">
      {/* 1. Status Bar Header (Authentic Casio ClassWiz LCD Top Indicators) */}
      <div className="flex justify-between items-center text-[10px] font-black h-4 select-none border-b border-[#7e8f7e] pb-0.5">
        {/* Left indicators: Shift, Alpha, Memory, STO, RCL, Complex, Base-N */}
        <div className="flex items-center gap-1.5 min-w-[80px]">
          {state.shiftActive && (
            <span className="bg-[#111] text-[#f59e0b] px-1 rounded text-[8px] leading-tight font-black">
              S
            </span>
          )}
          {state.alphaActive && (
            <span className="bg-[#111] text-[#ef4444] px-1 rounded text-[8px] leading-tight font-black">
              A
            </span>
          )}
          {state.memoryM !== 0 && (
            <span className="text-[9px] font-black text-[#111]">M</span>
          )}
          {state.stoActive && (
            <span className="bg-[#111] text-[#38bdf8] px-1 rounded text-[8px] leading-tight font-black">
              STO
            </span>
          )}
          {state.rclActive && (
            <span className="bg-[#111] text-[#38bdf8] px-1 rounded text-[8px] leading-tight font-black">
              RCL
            </span>
          )}
          {state.currentMode === "COMPLEX" && (
            <span className="text-[9px] font-black text-[#6b21a8]">i</span>
          )}
          {state.currentMode === "BASE_N" && (
            <span className="bg-[#1e3a8a] text-white px-1 rounded text-[7.5px] leading-tight font-black">
              {state.baseNMode}
            </span>
          )}
        </div>

        {/* Center: Current active mode badge if not default CALCULATE */}
        <div className="text-[9px] font-black tracking-wider text-[#222]">
          {state.currentMode !== "CALCULATE" && state.currentMode !== "COMP" ? state.currentMode : ""}
        </div>

        {/* Right indicators: Angle unit, display format, Math format */}
        <div className="flex items-center gap-1.5 text-[9px] font-black text-[#222]">
          <span className="px-0.5 border border-[#637563] rounded text-[8.5px]">{angleLabel}</span>
          {isFix && <span>FIX</span>}
          {isSci && <span>SCI</span>}
          <span>MATH</span>
          {state.history.length > 0 && <span className="text-[8px] opacity-75">▲▼</span>}
        </div>
      </div>

      {/* 2. Math Expression Area (MathLive Input) */}
      <div
        className="flex-1 overflow-x-auto flex items-center w-full min-h-[46px] my-0.5"
        style={{ fontSize: "1.35rem" }}
      >
        {React.createElement("math-field", {
          ref: mfRef,
          onInput: (e: any) => {
            const val = e.target.value;
            onExpressionChange(val);
          },
          style: {
            width: "100%",
            backgroundColor: "transparent",
            color: "#111",
            border: "none",
            outline: "none",
            boxShadow: "none",
            fontWeight: "600",
            cursor: "text",
          },
        })}
      </div>

      {/* 3. Evaluation Result Area */}
      <div className="h-7 flex items-center justify-end border-t border-[#7e8f7e] pt-0.5">
        {state.result ? (
          <div
            onClick={handleResultClick}
            className={`w-full text-right cursor-pointer hover:bg-[#869586] rounded px-1 transition-colors flex items-center justify-end ${
              state.result.includes("ERROR") ? "text-red-700 font-bold" : "text-black"
            }`}
            title="Nhấn để gửi kết quả vào nháp (Scratchpad)"
          >
            {state.result.includes("ERROR") ? (
              <span className="text-sm font-extrabold tracking-tight">{state.result}</span>
            ) : (
              React.createElement("math-field", {
                ref: resultMfRef,
                "read-only": true,
                style: {
                  textAlign: "right",
                  backgroundColor: "transparent",
                  color: "#000",
                  border: "none",
                  outline: "none",
                  pointerEvents: "none",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                },
                value: state.result,
              })
            )}
          </div>
        ) : null}
      </div>

      {/* 4. Overlay Menu Layer (renders on top of LCD, zero layout shift) */}
      <CalculatorMenu
        state={state}
        dispatch={dispatch}
        onCloseMenu={onCloseMenu}
        onSendToScratchpad={onSendToScratchpad}
        onInsertText={onInsertText}
      />
    </div>
  );
};
