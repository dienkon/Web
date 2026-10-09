/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * World3DViewport: Immersive 3D Floating-Island Expedition Canvas for DkTEST
 * Supports interactive camera (pan, zoom, reset), 3D perspective pitch,
 * subject atmospheres adapting to Light & Dark modes, quality profiles,
 * and multi-layered floating island archetypes.
 */

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Sparkles,
  Play,
  Check,
  Lock,
  Award,
  ShieldCheck,
  ChevronRight,
  Sliders,
} from "lucide-react";
import type {
  CameraState,
  Journey3DNode,
  QualityProfile,
  SubjectThemeType,
} from "../types/journey3D";

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
  // Camera state: zoom, pan offset (x, y), pitch angle
  const [camera, setCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    zoom: 1,
    pitch: 20, // 20-degree isometric tilt for depth
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDecidedRef = useRef<boolean>(false);

  // Subject Atmospheric theme (both light and dark compatible)
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

  // Handle Pan Dragging (Mouse & Touch)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setCamera((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch Support for mobile with vertical scroll preservation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchOriginRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchDecidedRef.current = false;
      dragStartRef.current = {
        x: e.touches[0].clientX - camera.x,
        y: e.touches[0].clientY - camera.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    if (!touchDecidedRef.current) {
      const dx = Math.abs(e.touches[0].clientX - touchOriginRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchOriginRef.current.y);

      // If predominantly vertical gesture, allow native page scroll
      if (dy > dx && dy > 8) {
        isDraggingRef.current = false;
        touchDecidedRef.current = true;
        return;
      } else if (dx > 8 || dy > 8) {
        isDraggingRef.current = true;
        touchDecidedRef.current = true;
      }
    }

    if (!isDraggingRef.current) return;

    setCamera((prev) => ({
      ...prev,
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    }));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchDecidedRef.current = false;
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(1.4, Math.max(0.65, prev.zoom + delta)),
    }));
  };

  const handleResetCamera = () => {
    setCamera({ x: 0, y: 0, zoom: 1, pitch: quality === "fallback" ? 0 : 20 });
  };

  const handleFocusCurrent = () => {
    const currentNode = nodes.find((n) => n.level === currentLevel);
    if (currentNode) {
      setCamera({
        x: 0,
        y: -(currentNode.y - 250),
        zoom: 1.05,
        pitch: quality === "fallback" ? 0 : 20,
      });
      onSelectNode(currentNode);
    }
  };

  // Focus on current level when subject changes
  useEffect(() => {
    handleFocusCurrent();
  }, [activeSubject]);

  const totalWorldHeight = useMemo(() => {
    if (nodes.length === 0) return 1000;
    return nodes[nodes.length - 1].y + 350;
  }, [nodes]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 select-none transition-colors">
      {/* 1. HUD Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Quality Switcher */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 p-1 sm:p-1.5 rounded-2xl shadow-md text-xs">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 sm:px-2 flex items-center gap-1">
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
              aria-label={`Chọn cấu hình đồ họa ${q}`}
            >
              {q === "fallback" ? "2D" : q}
            </button>
          ))}
        </div>

        {/* Right: Camera Tools */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 p-1 sm:p-1.5 rounded-2xl shadow-md">
          <button
            type="button"
            onClick={() => handleZoom(0.15)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Phóng to"
            aria-label="Phóng to bản đồ"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.15)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Thu nhỏ"
            aria-label="Thu nhỏ bản đồ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleFocusCurrent}
            className="h-9 sm:h-10 px-2.5 sm:px-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="Chuyển tới Màn hiện tại"
            aria-label={`Chuyển tới Màn ${currentLevel}`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Màn {currentLevel}</span>
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Đặt lại góc nhìn"
            aria-label="Đặt lại góc nhìn ban đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Interactive World Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[52vh] min-h-[380px] max-h-[620px] md:h-[620px] overflow-hidden cursor-grab active:cursor-grabbing bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-black"
        style={{ perspective: quality === "fallback" ? "none" : "1100px" }}
      >
        {/* Background Depth Atmosphere */}
        <div className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40 transition-opacity">
          {/* Light sky gradient */}
          <div className={`w-full h-full bg-gradient-to-b ${theme.skyLight} dark:hidden`} />
          {/* Dark sky gradient */}
          <div className={`w-full h-full bg-gradient-to-b ${theme.skyDark} hidden dark:block`} />

          {/* Perspective Grid Floor */}
          <div
            className="absolute inset-0 opacity-20 dark:opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Floating Formulas / Atmospheric Depth Objects */}
        {!reducedMotion && ambientParticles && quality !== "low" && quality !== "fallback" && (
          <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-20 select-none overflow-hidden">
            {theme.formulas.map((f, idx) => (
              <div
                key={idx}
                className="absolute font-serif text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider animate-float-slow"
                style={{
                  left: `${(idx * 28 + 10) % 85}%`,
                  top: `${(idx * 160 + 50) % 600}px`,
                  animationDelay: `${idx * 1.5}s`,
                }}
              >
                {f}
              </div>
            ))}
          </div>
        )}

        {/* 3D Transform Layer: holds islands & roads */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-full max-w-lg transition-transform duration-100 ease-out origin-center"
          style={{
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom}) rotateX(${
              quality === "fallback" || reducedMotion ? 0 : camera.pitch
            }deg)`,
            transformStyle: quality === "fallback" || reducedMotion ? "flat" : "preserve-3d",
            height: `${totalWorldHeight}px`,
          }}
        >
          {/* SVG Connecting Road / Ribbon */}
          <svg
            className="absolute top-0 left-0 w-full pointer-events-none"
            style={{ height: `${totalWorldHeight}px` }}
          >
            {nodes.slice(0, nodes.length - 1).map((nodeA, idx) => {
              const nodeB = nodes[idx + 1];
              const x1 = (nodeA.x / 100) * 440 + 40;
              const y1 = nodeA.y;
              const x2 = (nodeB.x / 100) * 440 + 40;
              const y2 = nodeB.y;

              const cy1 = y1 + 55;
              const cy2 = y2 - 55;
              const isPassed = nodeB.level <= currentLevel;

              return (
                <g key={nodeA.id}>
                  {/* Road Shadow */}
                  {quality !== "low" && quality !== "fallback" && (
                    <path
                      d={`M ${x1} ${y1 + 12} C ${x1} ${cy1 + 12}, ${x2} ${cy2 + 12}, ${x2} ${y2 + 12}`}
                      fill="none"
                      className="stroke-slate-300/60 dark:stroke-slate-950"
                      strokeWidth="12"
                      strokeOpacity="0.4"
                    />
                  )}
                  {/* Main Road Ribbon */}
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isPassed ? theme.pathColor : "#94a3b8"}
                    className={isPassed ? "" : "stroke-slate-400 dark:stroke-slate-700"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={isPassed ? "none" : "8,8"}
                  />
                </g>
              );
            })}
          </svg>

          {/* 3D Floating Island Nodes */}
          {nodes.map((node) => {
            const isCompleted = node.level < currentLevel;
            const isCurrent = node.level === currentLevel;
            const isLocked = node.level > currentLevel;
            const isSelected = selectedNodeId === node.id;

            const posX = (node.x / 100) * 440 + 40;
            const posY = node.y;

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95 group"
                style={{
                  left: `${posX}px`,
                  top: `${posY}px`,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* 1. Ground Shadow */}
                {quality !== "low" && quality !== "fallback" && (
                  <div
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 h-8 rounded-full bg-slate-400/30 dark:bg-black/60 blur-md pointer-events-none"
                    style={{ transform: "rotateX(60deg)" }}
                  />
                )}

                {/* 2. Underside 3D Layer Bevel for physical depth */}
                {quality !== "fallback" && (
                  <div
                    className={`absolute inset-x-1 -bottom-2 h-4 rounded-b-3xl pointer-events-none transition-all ${
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

                {/* 3. Recommendation Beacon (For current active level) */}
                {isCurrent && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none animate-bounce-short z-20">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-lg tracking-wider uppercase whitespace-nowrap">
                      Đích đến tiếp theo
                    </span>
                    <div className="w-2 h-2 rotate-45 bg-indigo-600 -mt-1" />
                  </div>
                )}

                {/* 4. Island Landmark Platform (Archetypes: Boss, Checkpoint, Completed, Current, Locked) */}
                <div
                  className={`relative flex flex-col items-center justify-center transition-all duration-300 rounded-3xl p-3 border ${
                    node.isBoss
                      ? "w-24 h-24 bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 border-amber-300 shadow-amber-500/40 shadow-xl ring-4 ring-amber-400/30 text-white"
                      : node.isCheckpoint
                      ? "w-22 h-22 bg-gradient-to-tr from-indigo-700 via-purple-600 to-pink-500 border-indigo-300 shadow-indigo-500/40 shadow-xl ring-2 ring-indigo-400/30 text-white"
                      : isCompleted
                      ? "w-18 h-18 bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-300 shadow-emerald-500/30 shadow-lg text-white"
                      : isCurrent
                      ? "w-20 h-20 bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 border-white shadow-cyan-500/40 shadow-xl ring-4 ring-indigo-400/40 text-white"
                      : "w-16 h-16 bg-white/95 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm opacity-85"
                  } ${isSelected ? "ring-4 ring-cyan-400 scale-105" : ""}`}
                >
                  {/* Floating Icon inside Podium */}
                  {node.isBoss ? (
                    <Award className="w-10 h-10 text-white drop-shadow-md animate-pulse" />
                  ) : node.isCheckpoint ? (
                    <ShieldCheck className="w-8 h-8 text-white drop-shadow-md" />
                  ) : isCompleted ? (
                    <Check className="w-7 h-7 text-white stroke-[3]" />
                  ) : isCurrent ? (
                    <Play className="w-8 h-8 text-white fill-white ml-0.5 animate-pulse" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )}

                  {/* Level Number */}
                  <span
                    className={`text-[10px] font-black mt-0.5 tracking-wider font-mono ${
                      isLocked ? "text-slate-600 dark:text-slate-400" : "text-white"
                    }`}
                  >
                    Màn {node.level}
                  </span>
                </div>

                {/* 5. Island Floating Label */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 pointer-events-none text-center z-10">
                  <span
                    className={`text-[10px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full border shadow-xs transition-colors max-w-[110px] sm:max-w-[150px] truncate block ${
                      isCurrent
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
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
