import React from "react";
import { CalculatorKey, SemanticAction } from "../types";
import { resolveKeyAction } from "../config/keyLayout";

export interface CalculatorButtonProps {
  keyDef: CalculatorKey;
  isShift: boolean;
  isAlpha: boolean;
  currentMode?: string;
  onAction: (action: SemanticAction, keyDef: CalculatorKey) => void;
  disabled?: boolean;
  className?: string;
}

export const CalculatorButton: React.FC<CalculatorButtonProps> = ({
  keyDef,
  isShift,
  isAlpha,
  currentMode,
  onAction,
  disabled = false,
  className = "",
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    const action = resolveKeyAction(keyDef, isShift, isAlpha, currentMode);
    onAction(action, keyDef);
  };

  // Determine button styles based on colorType and active state
  let bgClasses = "";
  let textClasses = "";
  let borderClasses = "";

  if (keyDef.colorType === "digit") {
    if (keyDef.id === "EXE") {
      bgClasses = "bg-[#1d4ed8] hover:bg-[#1e40af]";
      textClasses = "text-white font-black text-base";
      borderClasses = "border-[#172554]";
    } else {
      bgClasses = "bg-[#d4d4d8] hover:bg-[#e4e4e7]";
      textClasses = "text-[#18181b] font-bold text-sm";
      borderClasses = "border-[#a1a1aa]";
    }
  } else if (keyDef.colorType === "action") {
    bgClasses = "bg-[#e11d48] hover:bg-[#f43f5e]";
    textClasses = "text-white font-extrabold text-xs tracking-wider";
    borderClasses = "border-[#9f1239]";
  } else if (keyDef.colorType === "utility") {
    if (keyDef.id === "SHIFT") {
      bgClasses = isShift
        ? "bg-[#b45309] ring-2 ring-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]"
        : "bg-[#2e3036] hover:bg-[#3d3f47]";
      textClasses = "text-[#f59e0b] font-black text-[9.5px]";
      borderClasses = "border-[#18191d]";
    } else if (keyDef.id === "ALPHA") {
      bgClasses = isAlpha
        ? "bg-[#991b1b] ring-2 ring-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]"
        : "bg-[#2e3036] hover:bg-[#3d3f47]";
      textClasses = "text-[#ef4444] font-black text-[9.5px]";
      borderClasses = "border-[#18191d]";
    } else {
      bgClasses = "bg-[#2e3036] hover:bg-[#3d3f47]";
      textClasses = "text-slate-100 font-bold text-[9.5px]";
      borderClasses = "border-[#18191d]";
    }
  } else {
    // function key (scientific)
    bgClasses = "bg-[#26272c] hover:bg-[#34363d]";
    textClasses = "text-[#f3f4f6] font-semibold text-[11px]";
    borderClasses = "border-[#151619]";
  }

  return (
    <div className="relative flex flex-col items-center select-none w-full">
      {/* Upper Shift and Alpha annotation labels */}
      <div className="h-3 w-full flex justify-between items-center px-0.5 text-[8.5px] font-black pointer-events-none leading-none mb-0.5">
        <span className="text-[#f59e0b] truncate max-w-[50%]">
          {keyDef.shiftLabel || ""}
        </span>
        <span className="text-[#ef4444] truncate max-w-[50%] text-right">
          {keyDef.alphaLabel || ""}
        </span>
      </div>

      {/* Button element */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={keyDef.ariaLabel || keyDef.label}
        className={`w-full h-8 rounded-lg flex items-center justify-center border-b-[3px] active:border-b-0 active:translate-y-[2px] shadow-sm transition-all cursor-pointer ${bgClasses} ${textClasses} ${borderClasses} ${className}`}
      >
        <span className="truncate px-0.5">{keyDef.label}</span>
      </button>

      {/* Lower Mode-Specific Labels: Complex (purple) or Base-N (blue) */}
      {(keyDef.complexLabel || keyDef.baseNLabel) && (
        <div className="h-2.5 w-full flex justify-between items-center px-0.5 text-[7.5px] font-bold pointer-events-none leading-none mt-0.5">
          {keyDef.complexLabel && (
            <span className="text-[#c084fc] truncate">{keyDef.complexLabel}</span>
          )}
          {keyDef.baseNLabel && (
            <span className="text-[#60a5fa] truncate ml-auto">{keyDef.baseNLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};
