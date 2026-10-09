/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 2.5D Room Viewport Component
 * Renders atmospheric perspective room with SVG layers, lighting, and interactive objects.
 */

import React, { useMemo } from "react";
import {
  BookOpen,
  Briefcase,
  Layers,
  DoorClosed,
  DoorOpen,
  Gem,
  FlaskConical,
  Compass,
  ShieldAlert,
  Library,
  Sparkles,
  Award,
  Lock,
  Unlock,
  Key,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { ChamberDefinition, InteractiveObject } from "../types/escapeRoom";

interface RoomViewportProps {
  chamber: ChamberDefinition;
  unlockedObjectIds: string[];
  solvedPuzzleIds: string[];
  onSelectObject: (obj: InteractiveObject) => void;
  reducedMotion?: boolean;
}

const OBJECT_ICONS: Record<string, React.ElementType> = {
  BookOpen,
  Briefcase,
  Layers,
  DoorClosed,
  DoorOpen,
  Gem,
  FlaskConical,
  Compass,
  ShieldAlert,
  Library,
  Sparkles,
  Award,
  Key,
};

export const RoomViewport: React.FC<RoomViewportProps> = ({
  chamber,
  unlockedObjectIds,
  solvedPuzzleIds,
  onSelectObject,
  reducedMotion = false,
}) => {
  // SVG background perspective theme
  const svgTheme = useMemo(() => {
    switch (chamber.id) {
      case "chamber-1":
        return {
          wallGrad1: "#0f172a",
          wallGrad2: "#1e1b4b",
          floorGrad1: "#1e293b",
          floorGrad2: "#0f172a",
          pillarColor: "#334155",
          accentGlow: "rgba(99, 102, 241, 0.25)",
          torchGlow: "#818cf8",
        };
      case "chamber-2":
        return {
          wallGrad1: "#082f49",
          wallGrad2: "#164e63",
          floorGrad1: "#0f172a",
          floorGrad2: "#082f49",
          pillarColor: "#0e7490",
          accentGlow: "rgba(6, 182, 212, 0.25)",
          torchGlow: "#22d3ee",
        };
      case "chamber-3":
      default:
        return {
          wallGrad1: "#1e1b4b",
          wallGrad2: "#3b0764",
          floorGrad1: "#0f172a",
          floorGrad2: "#1e1b4b",
          pillarColor: "#7e22ce",
          accentGlow: "rgba(168, 85, 247, 0.3)",
          torchGlow: "#c084fc",
        };
    }
  }, [chamber.id]);

  return (
    <div className="relative w-full h-full min-h-[420px] sm:min-h-[520px] md:min-h-[580px] select-none overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-700/60 shadow-2xl bg-slate-950">
      {/* 2.5D Layered SVG Background */}
      <svg
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 1000 600"
      >
        <defs>
          <linearGradient id={`wallGrad_${chamber.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={svgTheme.wallGrad1} />
            <stop offset="100%" stopColor={svgTheme.wallGrad2} />
          </linearGradient>
          <linearGradient id={`floorGrad_${chamber.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={svgTheme.floorGrad1} />
            <stop offset="100%" stopColor={svgTheme.floorGrad2} />
          </linearGradient>
          <radialGradient id={`glowGrad_${chamber.id}`} cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor={svgTheme.torchGlow} stopOpacity="0.35" />
            <stop offset="100%" stopColor={svgTheme.torchGlow} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Back Wall */}
        <polygon points="0,0 1000,0 850,340 150,340" fill={`url(#wallGrad_${chamber.id})`} />

        {/* Left Wall Perspective */}
        <polygon points="0,0 150,340 0,600" fill="#090d16" opacity="0.85" />
        {/* Right Wall Perspective */}
        <polygon points="1000,0 850,340 1000,600" fill="#090d16" opacity="0.85" />

        {/* Perspective Floor */}
        <polygon points="150,340 850,340 1000,600 0,600" fill={`url(#floorGrad_${chamber.id})`} />

        {/* Floor Grid Lines */}
        <line x1="250" y1="340" x2="160" y2="600" stroke="#334155" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="380" y1="340" x2="350" y2="600" stroke="#334155" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="500" y1="340" x2="500" y2="600" stroke="#334155" strokeWidth="2" strokeOpacity="0.5" />
        <line x1="620" y1="340" x2="650" y2="600" stroke="#334155" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="750" y1="340" x2="840" y2="600" stroke="#334155" strokeWidth="1.5" strokeOpacity="0.4" />

        {/* Transverse Floor Paver Lines */}
        <line x1="100" y1="410" x2="900" y2="410" stroke="#334155" strokeWidth="1" strokeOpacity="0.3" />
        <line x1="50" y1="490" x2="950" y2="490" stroke="#334155" strokeWidth="1.2" strokeOpacity="0.35" />

        {/* Chamber Pillars */}
        <rect x="140" y="80" width="30" height="260" fill={svgTheme.pillarColor} opacity="0.5" rx="4" />
        <rect x="830" y="80" width="30" height="260" fill={svgTheme.pillarColor} opacity="0.5" rx="4" />

        {/* Ambient Back Glow */}
        <ellipse cx="500" cy="200" rx="350" ry="180" fill={`url(#glowGrad_${chamber.id})`} />

        {/* Arcane Ceiling Beams */}
        <line x1="0" y1="0" x2="150" y2="340" stroke="#475569" strokeWidth="2" strokeOpacity="0.5" />
        <line x1="1000" y1="0" x2="850" y2="340" stroke="#475569" strokeWidth="2" strokeOpacity="0.5" />
        <line x1="150" y1="340" x2="850" y2="340" stroke="#475569" strokeWidth="2.5" strokeOpacity="0.6" />
      </svg>

      {/* Floating Ambient Light Motes */}
      {!reducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-2 h-2 rounded-full bg-cyan-400/40 blur-xs top-1/4 left-1/5 animate-pulse" />
          <div className="absolute w-3 h-3 rounded-full bg-purple-400/30 blur-xs top-1/3 right-1/4 animate-bounce duration-1000" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-indigo-300/30 blur-xs bottom-1/3 left-1/3 animate-pulse" />
        </div>
      )}

      {/* Chamber Header Tag */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 shadow-md">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
          {chamber.name}
        </span>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          • {chamber.themeTitle}
        </span>
      </div>

      {/* Interactive Objects Placed Responsively */}
      {chamber.objects.map((obj) => {
        const isUnlocked = unlockedObjectIds.includes(obj.id);
        const isPuzzleSolved = obj.requiresPuzzleId
          ? solvedPuzzleIds.includes(obj.requiresPuzzleId)
          : false;

        let IconComponent = OBJECT_ICONS[obj.icon] || Info;
        if (obj.type === "door") {
          IconComponent = isUnlocked || isPuzzleSolved ? DoorOpen : DoorClosed;
        }

        const isDoor = obj.type === "door";

        return (
          <div
            key={obj.id}
            style={{
              left: `${obj.x}%`,
              top: `${obj.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute z-10 group"
          >
            {/* Clickable Card Button (>= 48px tap target on mobile) */}
            <button
              type="button"
              onClick={() => onSelectObject(obj)}
              aria-label={`Khám phá ${obj.name}`}
              className={`relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl cursor-pointer transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                isDoor
                  ? isUnlocked || isPuzzleSolved
                    ? "bg-emerald-950/80 hover:bg-emerald-900 border-2 border-emerald-400 text-emerald-200 shadow-[0_0_25px_rgba(52,211,153,0.5)] scale-110"
                    : "bg-amber-950/70 hover:bg-amber-900/80 border-2 border-amber-500/80 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  : isUnlocked
                  ? "bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 shadow-md"
                  : "bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-400/60 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.35)]"
              }`}
            >
              {/* Pulsing Aura if interactive */}
              {!reducedMotion && !isUnlocked && (
                <span className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-xs animate-pulse pointer-events-none" />
              )}

              {/* Status Badge in corner */}
              <div className="absolute -top-2 -right-2">
                {isUnlocked || isPuzzleSolved ? (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                ) : obj.isLocked || obj.requiresPuzzleId || obj.requiresItemId ? (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-xs">
                    <Lock className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white shadow-xs">
                    <Sparkles className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Main Icon */}
              <IconComponent
                className={`w-7 h-7 sm:w-9 sm:h-9 transition-transform group-hover:scale-110 ${
                  isDoor
                    ? isUnlocked || isPuzzleSolved
                      ? "text-emerald-300 animate-pulse"
                      : "text-amber-300"
                    : isUnlocked
                    ? "text-slate-300"
                    : "text-cyan-300"
                }`}
              />

              {/* Object Label Pill */}
              <span className="mt-1 text-[11px] sm:text-xs font-bold tracking-tight text-center max-w-[90px] sm:max-w-[120px] truncate drop-shadow-md">
                {obj.name}
              </span>

              {/* Sub-label state */}
              <span className="text-[9px] font-medium opacity-80 uppercase tracking-wider">
                {isDoor
                  ? isUnlocked || isPuzzleSolved
                    ? "Cửa Mở - Tiến Vào"
                    : "Đang Khóa"
                  : isUnlocked
                  ? "Đã khám phá"
                  : "Chạm để mở"}
              </span>
            </button>
          </div>
        );
      })}

      {/* Narrative Ambient Footnote */}
      <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-6 z-20 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-center shadow-lg">
          <p className="text-xs sm:text-sm text-slate-300 italic font-serif leading-relaxed line-clamp-2">
            "{chamber.narrativeIntro}"
          </p>
        </div>
      </div>
    </div>
  );
};
