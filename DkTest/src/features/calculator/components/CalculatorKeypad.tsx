import React from "react";
import { CalculatorKey, SemanticAction } from "../types";
import { CALCULATOR_KEYS } from "../config/keyLayout";
import { CalculatorButton } from "./CalculatorButton";

interface CalculatorKeypadProps {
  isShift: boolean;
  isAlpha: boolean;
  currentMode?: string;
  onAction: (action: SemanticAction, keyDef: CalculatorKey) => void;
}

export const CalculatorKeypad: React.FC<CalculatorKeypadProps> = ({
  isShift,
  isAlpha,
  currentMode,
  onAction,
}) => {
  // Helper to find key by id
  const getKey = (id: string): CalculatorKey => {
    const found = CALCULATOR_KEYS.find((k) => k.id === id);
    if (!found) {
      return {
        id,
        label: id,
        colorType: "digit",
        action: { type: "NOOP" },
      };
    }
    return found;
  };

  const shiftKey = getKey("SHIFT");
  const alphaKey = getKey("ALPHA");
  const menuKey = getKey("MENU");
  const onKey = getKey("ON");

  // Function rows matching Casio fx-580VN X
  const funcRow1 = ["OPTN", "CALC", "fraction", "integral", "root", "power_2"].map(getKey);
  const funcRow2 = ["power_y", "log", "ln", "neg", "dms", "recip"].map(getKey);
  const funcRow3 = ["sin", "cos", "tan", "sto", "eng", "bracket_open"].map(getKey);
  const funcRow4 = ["bracket_close", "sd", "m_plus"].map(getKey);

  // Numeric pad rows
  const padRow1 = ["7", "8", "9", "DEL", "AC"].map(getKey);
  const padRow2 = ["4", "5", "6", "times", "divide"].map(getKey);
  const padRow3 = ["1", "2", "3", "plus", "minus"].map(getKey);
  const padRow4 = ["0", "dot", "exp", "Ans", "EXE"].map(getKey);

  return (
    <div className="flex flex-col gap-1.5 select-none pt-1">
      {/* 1. Top Control Cluster with D-Pad Navigational Disc */}
      <div className="flex justify-between items-center px-1">
        {/* Left modifier buttons: SHIFT and ALPHA */}
        <div className="flex flex-col gap-1 w-11">
          <CalculatorButton
            keyDef={shiftKey}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
            className="!h-7 !text-[9.5px] rounded-[50%]"
          />
          <CalculatorButton
            keyDef={alphaKey}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
            className="!h-7 !text-[9.5px] rounded-[50%]"
          />
        </div>

        {/* Center: D-Pad Navigational Disc */}
        <div className="w-[84px] h-[84px] bg-[#22242a] rounded-full border-2 border-[#101114] relative shadow-md flex items-center justify-center">
          <button
            type="button"
            onClick={() => onAction({ type: "MOVE_CURSOR", direction: "LEFT" }, getKey("LEFT"))}
            aria-label="Cursor left"
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-700/60 active:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-300 transition-colors cursor-pointer"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onAction({ type: "MOVE_CURSOR", direction: "RIGHT" }, getKey("RIGHT"))}
            aria-label="Cursor right"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-700/60 active:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-300 transition-colors cursor-pointer"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => onAction({ type: "MOVE_CURSOR", direction: "UP" }, getKey("UP"))}
            aria-label="Cursor up / numerator"
            className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full hover:bg-slate-700/60 active:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-300 transition-colors cursor-pointer"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onAction({ type: "MOVE_CURSOR", direction: "DOWN" }, getKey("DOWN"))}
            aria-label="Cursor down / denominator"
            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full hover:bg-slate-700/60 active:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-300 transition-colors cursor-pointer"
          >
            ▼
          </button>
          {/* Inner metallic button */}
          <div className="w-7 h-7 rounded-full border border-[#1b1c20] bg-[#18191d] shadow-inner" />
        </div>

        {/* Right utility buttons: MENU and ON */}
        <div className="flex flex-col gap-1 w-11">
          <CalculatorButton
            keyDef={menuKey}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
            className="!h-7 !text-[9.5px] rounded-[50%]"
          />
          <CalculatorButton
            keyDef={onKey}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
            className="!h-7 !text-[9.5px] rounded-[50%]"
          />
        </div>
      </div>

      {/* 2. Scientific Keys (3 rows x 6 keys) */}
      <div className="grid grid-cols-6 gap-1 px-0.5">
        {funcRow1.map((k) => (
          <CalculatorButton
            key={k.id}
            keyDef={k}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
          />
        ))}
        {funcRow2.map((k) => (
          <CalculatorButton
            key={k.id}
            keyDef={k}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
          />
        ))}
        {funcRow3.map((k) => (
          <CalculatorButton
            key={k.id}
            keyDef={k}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
          />
        ))}
      </div>

      {/* 3. Parentheses, S<=>D, M+ Row (3 keys) */}
      <div className="grid grid-cols-3 gap-1 px-0.5">
        {funcRow4.map((k) => (
          <CalculatorButton
            key={k.id}
            keyDef={k}
            isShift={isShift}
            isAlpha={isAlpha}
            currentMode={currentMode}
            onAction={onAction}
          />
        ))}
      </div>

      {/* 4. Numeric & Operations Pad (4 rows x 5 keys) */}
      <div className="flex flex-col gap-1 px-0.5 mt-0.5">
        <div className="grid grid-cols-5 gap-1">
          {padRow1.map((k) => (
            <CalculatorButton
              key={k.id}
              keyDef={k}
              isShift={isShift}
              isAlpha={isAlpha}
              currentMode={currentMode}
              onAction={onAction}
            />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {padRow2.map((k) => (
            <CalculatorButton
              key={k.id}
              keyDef={k}
              isShift={isShift}
              isAlpha={isAlpha}
              currentMode={currentMode}
              onAction={onAction}
            />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {padRow3.map((k) => (
            <CalculatorButton
              key={k.id}
              keyDef={k}
              isShift={isShift}
              isAlpha={isAlpha}
              currentMode={currentMode}
              onAction={onAction}
            />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {padRow4.map((k) => (
            <CalculatorButton
              key={k.id}
              keyDef={k}
              isShift={isShift}
              isAlpha={isAlpha}
              currentMode={currentMode}
              onAction={onAction}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
