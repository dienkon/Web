/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, X, ChevronRight, HelpCircle } from "lucide-react";

interface TooltipProps {
  title: string;
  description: string;
  stepNumber: number;
  totalSteps: number;
  actionHint?: string;
  targetRect: DOMRect | null;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  allowManualNext?: boolean;
  onNext?: () => void;
  onSkip?: () => void;
}

export default function StudentOnboardingTooltip({
  title,
  description,
  stepNumber,
  totalSteps,
  actionHint,
  targetRect,
  placement = "bottom",
  allowManualNext = true,
  onNext,
  onSkip,
}: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 100, left: 20 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);

      if (!targetRect || !tooltipRef.current) {
        // Fallback center or bottom dock
        if (mobile) {
          setCoords({ top: window.innerHeight - 260, left: 16 });
        } else {
          setCoords({ top: 120, left: Math.max(16, (window.innerWidth - 420) / 2) });
        }
        return;
      }

      const tooltipWidth = tooltipRef.current.offsetWidth || 380;
      const tooltipHeight = tooltipRef.current.offsetHeight || 220;
      const margin = 14;

      // On mobile: position opposite of target to avoid covering it
      if (mobile) {
        const targetIsBottomHalf = targetRect.top > window.innerHeight / 2;
        const top = targetIsBottomHalf
          ? Math.max(16, targetRect.top - tooltipHeight - margin)
          : Math.min(window.innerHeight - tooltipHeight - 16, targetRect.bottom + margin);
        const left = 16;
        setCoords({ top, left });
        return;
      }

      // Desktop placement
      let top = 0;
      let left = targetRect.left + (targetRect.width - tooltipWidth) / 2;

      let effectivePlacement = placement;
      if (placement === "bottom" && targetRect.bottom + tooltipHeight + margin > window.innerHeight) {
        effectivePlacement = "top";
      } else if (placement === "top" && targetRect.top - tooltipHeight - margin < 0) {
        effectivePlacement = "bottom";
      }

      if (effectivePlacement === "bottom") {
        top = targetRect.bottom + margin;
      } else if (effectivePlacement === "top") {
        top = Math.max(margin, targetRect.top - tooltipHeight - margin);
      } else if (effectivePlacement === "right") {
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = targetRect.right + margin;
      } else if (effectivePlacement === "left") {
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = Math.max(margin, targetRect.left - tooltipWidth - margin);
      } else {
        // center
        top = Math.max(margin, (window.innerHeight - tooltipHeight) / 2);
        left = Math.max(margin, (window.innerWidth - tooltipWidth) / 2);
      }

      // Clamp horizontally within viewport
      left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [targetRect, placement, title, description]);

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        maxWidth: isMobile ? "calc(100vw - 32px)" : "420px",
        width: isMobile ? "calc(100vw - 32px)" : "420px",
      }}
      className="z-[9995] bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 select-none"
    >
      {/* Top Bar: Step Badge & Skip Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping inline-block" />
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
            Hướng dẫn • Bước {stepNumber} / {totalSteps}
          </span>
        </div>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-2 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
            title="Bỏ qua hướng dẫn"
          >
            <span>Bỏ qua</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Title & Description */}
      <div className="pt-3.5 space-y-2">
        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          <span>{title}</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">
          {description}
        </p>
      </div>

      {/* Action Hint Banner */}
      {actionHint && (
        <div className="mt-3.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2 shadow-2xs">
          <span className="text-base leading-none">👉</span>
          <div className="flex-1 leading-snug">{actionHint}</div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 overflow-hidden max-w-[140px]">
          <span className="text-[11px] font-bold text-slate-400">
            {Math.round((stepNumber / totalSteps) * 100)}%
          </span>
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Next Button */}
        {allowManualNext && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ml-auto"
          >
            <span>Đã hiểu • Tiếp tục</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
