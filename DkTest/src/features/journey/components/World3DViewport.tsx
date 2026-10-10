/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * World3DViewport: Immersive Gamified Learning Journey World for DkTEST
 * Features:
 * - Natural vertical scrolling (standard mouse wheel, trackpad, and touch swipe)
 * - Progressive road/line reveal following scroll progress
 * - 3D bouncy / juicy pop "úng ính" spring animations on nodes as you reach them
 * - Colorful, vibrant world decorations: Tropical Beach, Floating Islands, Vibrant Town
 * - 3D isometric perspective pitch & camera zoom controls
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Play,
  Check,
  Lock,
  Award,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import type {
  CameraState,
  Journey3DNode,
  QualityProfile,
  SubjectThemeType,
} from "../types/journey3D";
import { JourneyWorldDecorations } from "./JourneyWorldDecorations";

interface Props {
  nodes: Journey3DNode[];
  activeSubject: SubjectThemeType;
  currentLevel: number;
  selectedNodeId: string | null;
  onSelectNode: (node: Journey3DNode) => void;
  quality: QualityProfile;
  onQualityChange: (q: QualityProfile) => void;
  reducedMotion?: boolean;
  ambientParticles?: boolean;
}

export default function World3DViewport({
  nodes,
  activeSubject,
  currentLevel,
  selectedNodeId,
  onSelectNode,
  quality,
  onQualityChange,
  reducedMotion = false,
  ambientParticles = true,
}: Props) {
  // Camera state: zoom scale and pitch angle
  const [camera, setCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    zoom: 1,
    pitch: quality === "fallback" ? 0 : 18,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(680);

  // Subject atmospheric styling
  const theme = useMemo(() => {
    switch (activeSubject) {
      case "physics":
        return {
          skyLight: "from-sky-100/90 via-cyan-50/70 to-slate-100/60",
          skyDark: "from-sky-950 via-cyan-950 to-slate-950",
          pathColor: "#0284c7",
          pathUnpassedLight: "#94a3b8",
          pathUnpassedDark: "#334155",
          accentColor: "sky",
          formulas: ["E = mc²", "pV = nRT", "λ = v / f", "x = A cos(ωt + φ)", "I = U / R", "F = ma"],
        };
      case "chemistry":
        return {
          skyLight: "from-amber-100/80 via-orange-50/70 to-slate-100/60",
          skyDark: "from-amber-950 via-orange-950 to-slate-950",
          pathColor: "#d97706",
          pathUnpassedLight: "#94a3b8",
          pathUnpassedDark: "#334155",
          accentColor: "amber",
          formulas: ["RCOOR' + H₂O", "C₁₂H₂₂O₁₁", "pH = -log[H⁺]", "C₆H₅OH", "CH₃NH₂ + HCl", "n = m / M"],
        };
      case "math":
      default:
        return {
          skyLight: "from-indigo-100/90 via-blue-50/70 to-slate-100/60",
          skyDark: "from-indigo-950 via-blue-950 to-slate-950",
          pathColor: "#4f46e5",
          pathUnpassedLight: "#94a3b8",
          pathUnpassedDark: "#334155",
          accentColor: "indigo",
          formulas: ["∫ f(x)dx", "lim x→∞", "y' = 3x² - 6x", "Δ = b² - 4ac", "max y = f(x₀)", "π ≈ 3.14"],
        };
    }
  }, [activeSubject]);

  const totalWorldHeight = useMemo(() => {
    if (nodes.length === 0) return 1200;
    return nodes[nodes.length - 1].y + 400;
  }, [nodes]);

  // Track natural container scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  // Jump / Focus to current level
  const handleFocusCurrent = useCallback(() => {
    const currentNode = nodes.find((n) => n.level === currentLevel);
    if (currentNode && containerRef.current) {
      const targetY = Math.max(0, currentNode.y - containerRef.current.clientHeight / 2 + 50);
      containerRef.current.scrollTo({
        top: targetY,
        behavior: "smooth",
      });
    }
  }, [nodes, currentLevel]);

  // Auto smooth scroll to current level on load or subject change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFocusCurrent();
    }, 180);
    return () => clearTimeout(timer);
  }, [activeSubject, currentLevel, handleFocusCurrent]);

  // Zoom controls
  const handleZoom = (delta: number) => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(1.35, Math.max(0.75, Number((prev.zoom + delta).toFixed(2)))),
    }));
  };

  const handleResetCamera = () => {
    setCamera({
      x: 0,
      y: 0,
      zoom: 1,
      pitch: quality === "fallback" ? 0 : 18,
    });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Dynamic progressive line reveal threshold
  // As the user scrolls downwards, any element above visibleLead gets progressively drawn and activated
  const visibleLead = scrollTop + containerHeight * 0.88;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 select-none transition-colors">
      {/* 3D Juicy Bouncy Pop Spring Physics CSS */}
      <style>{`
        @keyframes pop3dJelly {
          0% {
            transform: perspective(600px) scale3d(0.65, 0.65, 1) translateY(24px) rotateX(25deg);
            opacity: 0.3;
          }
          55% {
            transform: perspective(600px) scale3d(1.22, 1.18, 1) translateY(-14px) rotateX(-12deg);
            opacity: 1;
          }
          75% {
            transform: perspective(600px) scale3d(0.92, 0.95, 1) translateY(4px) rotateX(6deg);
          }
          90% {
            transform: perspective(600px) scale3d(1.06, 1.04, 1) translateY(-2px) rotateX(-2deg);
          }
          100% {
            transform: perspective(600px) scale3d(1, 1, 1) translateY(0) rotateX(0deg);
            opacity: 1;
          }
        }
        .node-pop-active {
          animation: pop3dJelly 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .road-path-draw {
          transition: stroke-dashoffset 0.35s ease-out;
        }
      `}</style>

      {/* 1. HUD Floating Controls Bar */}
      <div className="sticky top-3 sm:top-4 z-40 px-3 sm:px-4 flex items-center justify-between gap-2 pointer-events-none mb-[-52px]">
        {/* Left: Quality Profile Switcher */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 p-1 sm:p-1.5 rounded-2xl shadow-md text-xs">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 sm:px-1.5 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-indigo-500" />
            <span className="hidden sm:inline">Đồ họa:</span>
          </span>
          {(["high", "balanced", "low", "fallback"] as QualityProfile[]).map((q) => (
            <button
              key={q}
              onClick={() => onQualityChange(q)}
              className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold capitalize transition-all cursor-pointer ${
                quality === q
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {q === "fallback" ? "2D" : q}
            </button>
          ))}
        </div>

        {/* Right: Camera Tools */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 p-1 sm:p-1.5 rounded-2xl shadow-md">
          <button
            type="button"
            onClick={() => handleZoom(0.15)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.15)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleFocusCurrent}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="Cuộn tới Màn hiện tại"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Màn {currentLevel}</span>
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Về đầu trang"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Natural Vertical Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative w-full h-[68vh] min-h-[460px] max-h-[760px] md:h-[740px] overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-black"
        style={{
          perspective: quality === "fallback" ? "none" : "1200px",
        }}
      >
        {/* Background Depth Sky & Perspective Grid Floor */}
        <div className="sticky top-0 h-0 pointer-events-none z-0">
          <div className="h-[740px] w-full relative">
            <div className={`w-full h-full bg-gradient-to-b ${theme.skyLight} dark:hidden opacity-70`} />
            <div className={`w-full h-full bg-gradient-to-b ${theme.skyDark} hidden dark:block opacity-50`} />

            {/* Depth perspective grid */}
            <div
              className="absolute inset-0 opacity-20 dark:opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>
        </div>

        {/* Floating Science Formulas in atmosphere */}
        {!reducedMotion && ambientParticles && quality !== "low" && quality !== "fallback" && (
          <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-20 select-none overflow-hidden" style={{ height: `${totalWorldHeight}px` }}>
            {theme.formulas.map((f, idx) => (
              <div
                key={idx}
                className="absolute font-serif text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider animate-pulse"
                style={{
                  left: `${(idx * 28 + 12) % 85}%`,
                  top: `${(idx * 340 + 100) % totalWorldHeight}px`,
                  animationDuration: `${3 + idx * 0.5}s`,
                }}
              >
                {f}
              </div>
            ))}
          </div>
        )}

        {/* 3D World Transform Stage */}
        <div
          className="relative left-1/2 -translate-x-1/2 w-full max-w-xl transition-transform duration-200 ease-out origin-top"
          style={{
            transform: `scale(${camera.zoom}) rotateX(${
              quality === "fallback" || reducedMotion ? 0 : camera.pitch
            }deg)`,
            transformStyle: quality === "fallback" || reducedMotion ? "flat" : "preserve-3d",
            height: `${totalWorldHeight}px`,
          }}
        >
          {/* THEMATIC WORLD DECORATIONS: Beach, Island, Village */}
          <JourneyWorldDecorations totalHeight={totalWorldHeight} />

          {/* SVG Connecting Roads with Progressive Scroll Drawing */}
          <svg
            className="absolute top-0 left-0 w-full pointer-events-none z-10"
            style={{ height: `${totalWorldHeight}px` }}
          >
            <defs>
              <linearGradient id="roadGradientPassed" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {nodes.slice(0, nodes.length - 1).map((nodeA, idx) => {
              const nodeB = nodes[idx + 1];
              const x1 = (nodeA.x / 100) * 440 + 40;
              const y1 = nodeA.y;
              const x2 = (nodeB.x / 100) * 440 + 40;
              const y2 = nodeB.y;

              const cy1 = y1 + 55;
              const cy2 = y2 - 55;
              const isPassed = nodeB.level <= currentLevel;

              // Progressive scroll reveal calculation
              let revealRatio = 1;
              if (!reducedMotion) {
                if (visibleLead < y1) {
                  revealRatio = 0;
                } else if (visibleLead >= y2) {
                  revealRatio = 1;
                } else {
                  revealRatio = Math.max(0, Math.min(1, (visibleLead - y1) / (y2 - y1)));
                }
              }

              // Path string
              const pathD = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
              const shadowD = `M ${x1} ${y1 + 12} C ${x1} ${cy1 + 12}, ${x2} ${cy2 + 12}, ${x2} ${y2 + 12}`;
              const strokeOffset = Math.round(100 - revealRatio * 100);

              return (
                <g key={nodeA.id}>
                  {/* Road Shadow */}
                  {quality !== "low" && quality !== "fallback" && (
                    <path
                      d={shadowD}
                      fill="none"
                      className="stroke-slate-300/60 dark:stroke-slate-950"
                      strokeWidth="12"
                      strokeOpacity="0.4"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset={strokeOffset}
                    />
                  )}

                  {/* Underlay Guide Track */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#cbd5e1"
                    className="dark:stroke-slate-800"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="6,6"
                    opacity={0.6}
                  />

                  {/* Main Animated Ribbon Road (Reveals as user scrolls down) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isPassed ? "url(#roadGradientPassed)" : theme.pathColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="road-path-draw"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset={strokeOffset}
                  />
                </g>
              );
            })}
          </svg>

          {/* 3D Floating Island Nodes with Bouncy Pop Effect */}
          {nodes.map((node) => {
            const isCompleted = node.level < currentLevel;
            const isCurrent = node.level === currentLevel;
            const isLocked = node.level > currentLevel;
            const isSelected = selectedNodeId === node.id;

            const posX = (node.x / 100) * 440 + 40;
            const posY = node.y;

            // Trigger 3D bouncy pop when scrolled near the node
            const isPopActivated = visibleLead >= posY - 80;

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-300 hover:scale-115 active:scale-95 group z-20 ${
                  isPopActivated ? "node-pop-active" : "opacity-30 scale-75"
                }`}
                style={{
                  left: `${posX}px`,
                  top: `${posY}px`,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* 1. Ground Shadow with depth blur */}
                {quality !== "low" && quality !== "fallback" && (
                  <div
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 h-8 rounded-full bg-slate-400/35 dark:bg-black/60 blur-md pointer-events-none transition-transform group-hover:scale-120"
                    style={{ transform: "rotateX(60deg)" }}
                  />
                )}

                {/* 2. Underside 3D Layer Bevel for physical pop depth */}
                {quality !== "fallback" && (
                  <div
                    className={`absolute inset-x-1 -bottom-2.5 h-5 rounded-b-3xl pointer-events-none transition-all shadow-md ${
                      node.isBoss
                        ? "bg-amber-800 dark:bg-amber-950"
                        : node.isCheckpoint
                        ? "bg-indigo-900 dark:bg-purple-950"
                        : isCompleted
                        ? "bg-emerald-800 dark:bg-teal-950"
                        : isCurrent
                        ? "bg-blue-800 dark:bg-indigo-950"
                        : "bg-slate-300 dark:bg-slate-900"
                    }`}
                  />
                )}

                {/* 3. Recommendation Beacon for current active level */}
                {isCurrent && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none animate-bounce z-30">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xl tracking-wider uppercase whitespace-nowrap ring-2 ring-white/60">
                      Đích đến tiếp theo
                    </span>
                    <div className="w-2.5 h-2.5 rotate-45 bg-indigo-600 -mt-1 shadow-xs" />
                  </div>
                )}

                {/* 4. Island Landmark Platform (Juicy 3D Pop & Glossy Sheen) */}
                <div
                  className={`relative flex flex-col items-center justify-center transition-all duration-300 rounded-3xl p-3 border overflow-hidden ${
                    node.isBoss
                      ? "w-24 h-24 bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 border-amber-300 shadow-amber-500/50 shadow-2xl ring-4 ring-amber-400/40 text-white"
                      : node.isCheckpoint
                      ? "w-22 h-22 bg-gradient-to-tr from-indigo-700 via-purple-600 to-pink-500 border-indigo-300 shadow-indigo-500/50 shadow-2xl ring-2 ring-indigo-400/40 text-white"
                      : isCompleted
                      ? "w-18 h-18 bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-300 shadow-emerald-500/40 shadow-xl text-white"
                      : isCurrent
                      ? "w-20 h-20 bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 border-white shadow-cyan-500/50 shadow-2xl ring-4 ring-indigo-400/50 text-white"
                      : "w-16 h-16 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-md opacity-90"
                  } ${isSelected ? "ring-4 ring-cyan-400 scale-110 shadow-cyan-400/50" : ""}`}
                >
                  {/* Glossy 3D Reflection overlay for "úng ính" shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-black/10 pointer-events-none rounded-3xl" />

                  {/* Floating Icon inside Podium */}
                  {node.isBoss ? (
                    <Award className="w-10 h-10 text-white drop-shadow-md animate-pulse relative z-10" />
                  ) : node.isCheckpoint ? (
                    <ShieldCheck className="w-8 h-8 text-white drop-shadow-md relative z-10" />
                  ) : isCompleted ? (
                    <Check className="w-7 h-7 text-white stroke-[3] drop-shadow-xs relative z-10" />
                  ) : isCurrent ? (
                    <Play className="w-8 h-8 text-white fill-white ml-0.5 animate-pulse relative z-10" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 relative z-10" />
                  )}

                  {/* Level Number */}
                  <span
                    className={`text-[10px] font-black mt-0.5 tracking-wider font-mono relative z-10 ${
                      isLocked ? "text-slate-600 dark:text-slate-400" : "text-white drop-shadow-xs"
                    }`}
                  >
                    Màn {node.level}
                  </span>
                </div>

                {/* 5. Island Floating Label */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 pointer-events-none text-center z-20">
                  <span
                    className={`text-[10px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full border shadow-md transition-colors max-w-[110px] sm:max-w-[150px] truncate block ${
                      isCurrent
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {node.topicName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
