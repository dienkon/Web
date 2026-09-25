import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, X, Link as LinkIcon, ArrowRight, RotateCcw } from "lucide-react";
import { MatchingItem } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Props {
  leftItems?: MatchingItem[];
  rightItems?: MatchingItem[];
  matches?: Record<string, string>; // leftKey (e.g. "1" or label or id) -> rightKey (e.g. "a" or label or id)
  onChange?: (newMatches: Record<string, string>) => void;
  isReview?: boolean;
  correctMatches?: Record<string, string>;
  readOnly?: boolean;
  className?: string;
}

const LINE_COLORS = [
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#db2777", // pink-600
  "#0891b2", // cyan-600
  "#ea580c", // orange-600
  "#4f46e5", // indigo-600
  "#0284c7", // sky-600
  "#16a34a", // green-600
];

const EMPTY_ITEMS: MatchingItem[] = [];
const EMPTY_MATCHES: Record<string, string> = {};

interface LineData {
  leftKey: string;
  rightKey: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  isCorrect?: boolean;
  isKeyGuide?: boolean; // dashed line for correct answer in review
}

export default function InteractiveMatchingBoard({
  leftItems = EMPTY_ITEMS,
  rightItems = EMPTY_ITEMS,
  matches = EMPTY_MATCHES,
  onChange,
  isReview = false,
  correctMatches = EMPTY_MATCHES,
  readOnly = false,
  className = "",
}: Props) {
  // Selected source for click-to-connect or drag
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [hoveredRight, setHoveredRight] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Normalize stringified JSON or null inputs
  const safeMatches = typeof matches === "string" ? (() => {
    try { return JSON.parse(matches); } catch { return EMPTY_MATCHES; }
  })() : (matches || EMPTY_MATCHES);

  const safeCorrectMatches = typeof correctMatches === "string" ? (() => {
    try { return JSON.parse(correctMatches); } catch { return EMPTY_MATCHES; }
  })() : (correctMatches || EMPTY_MATCHES);

  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineData[]>([]);

  // Stable references
  const leftItemsRef = useRef(leftItems);
  leftItemsRef.current = leftItems;

  const rightItemsRef = useRef(rightItems);
  rightItemsRef.current = rightItems;

  const matchesRef = useRef(safeMatches);
  matchesRef.current = safeMatches;

  const correctMatchesRef = useRef(safeCorrectMatches);
  correctMatchesRef.current = safeCorrectMatches;

  const isReviewRef = useRef(isReview);
  isReviewRef.current = isReview;

  // Helpers to get item canonical labels
  const getLeftLabel = (idx: number, it?: MatchingItem) => it?.label || `${idx + 1}`;
  const getRightLabel = (idx: number, it?: MatchingItem) =>
    it?.label || String.fromCharCode(97 + idx); // 'a', 'b', 'c'...

  // Match canonical right label or item ID
  const findRightIndex = useCallback((val: string | undefined | null) => {
    if (val === undefined || val === null) return -1;
    const currentRightItems = rightItemsRef.current;
    const target = String(val).toLowerCase().trim();

    // 1. Direct ID match
    const idIdx = currentRightItems.findIndex((it) => it.id === val);
    if (idIdx !== -1) return idIdx;

    // 2. Direct label match (e.g. "a", "b", "c")
    const labelIdx = currentRightItems.findIndex(
      (it, i) => getRightLabel(i, it).toLowerCase().trim() === target
    );
    if (labelIdx !== -1) return labelIdx;

    // 3. Fallback letter index match: 'a' -> 0, 'b' -> 1
    if (target.length === 1 && target >= "a" && target <= "z") {
      const codeIdx = target.charCodeAt(0) - 97;
      if (codeIdx >= 0 && codeIdx < currentRightItems.length) return codeIdx;
    }

    return -1;
  }, []);

  // Helper to find existing match for a left item
  const getMatchedValForLeft = useCallback(
    (lIdx: number, lItem: MatchingItem) => {
      const currentMatches = matchesRef.current;
      const leftKey = getLeftLabel(lIdx, lItem);
      // Prioritize ID match, then exact label match
      if (lItem.id && currentMatches[lItem.id] !== undefined) {
        return currentMatches[lItem.id];
      }
      if (currentMatches[leftKey] !== undefined) {
        return currentMatches[leftKey];
      }
      // If label is not numeric and matches has 1-based index
      const numKey = `${lIdx + 1}`;
      if (currentMatches[numKey] !== undefined) {
        return currentMatches[numKey];
      }
      return undefined;
    },
    []
  );

  // Recalculate SVG coordinates of straight connecting lines
  const updateLinePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const currentLeftItems = leftItemsRef.current;
    const currentMatches = matchesRef.current;
    const currentCorrectMatches = correctMatchesRef.current;
    const currentIsReview = isReviewRef.current;

    const computedLines: LineData[] = [];

    // Helper to get anchor center relative to container
    const getDotCenter = (selector: string) => {
      const el = container.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      };
    };

    // 1. Review Mode: draw student matches & correct answer guides
    if (currentIsReview) {
      currentLeftItems.forEach((lItem, lIdx) => {
        const leftKey = getLeftLabel(lIdx, lItem);
        const userMatchedVal = getMatchedValForLeft(lIdx, lItem);
        const correctVal =
          (lItem.id && currentCorrectMatches[lItem.id]) ??
          currentCorrectMatches[leftKey] ??
          currentCorrectMatches[`${lIdx + 1}`];

        const leftCenter = getDotCenter(`[data-anchor-left="${lIdx}"]`);
        if (!leftCenter) return;

        // User's match line
        if (userMatchedVal !== undefined && userMatchedVal !== null && String(userMatchedVal).trim() !== "") {
          const rIdx = findRightIndex(String(userMatchedVal));
          if (rIdx !== -1) {
            const rightCenter = getDotCenter(`[data-anchor-right="${rIdx}"]`);
            if (rightCenter) {
              const rIdxCorrect = correctVal !== undefined ? findRightIndex(String(correctVal)) : -1;
              const isCorrect =
                correctVal !== undefined &&
                (String(userMatchedVal).toLowerCase().trim() === String(correctVal).toLowerCase().trim() ||
                 (rIdx !== -1 && rIdx === rIdxCorrect));

              computedLines.push({
                leftKey,
                rightKey: String(userMatchedVal),
                x1: leftCenter.x,
                y1: leftCenter.y,
                x2: rightCenter.x,
                y2: rightCenter.y,
                color: isCorrect ? "#059669" : "#dc2626",
                isCorrect,
                isKeyGuide: false,
              });
            }
          }
        }

        // If wrong or unanswered, draw the dashed guide line for correct answer
        if (correctVal !== undefined && String(correctVal).trim() !== "") {
          const rIdxUser = userMatchedVal !== undefined ? findRightIndex(String(userMatchedVal)) : -1;
          const rIdxCorr = findRightIndex(String(correctVal));
          const isUserCorrect =
            userMatchedVal !== undefined &&
            (String(userMatchedVal).toLowerCase().trim() === String(correctVal).toLowerCase().trim() ||
             (rIdxUser !== -1 && rIdxUser === rIdxCorr));

          if (!isUserCorrect) {
            const rIdx = rIdxCorr;
            if (rIdx !== -1) {
              const rightCenter = getDotCenter(`[data-anchor-right="${rIdx}"]`);
              if (rightCenter) {
                computedLines.push({
                  leftKey,
                  rightKey: String(correctVal),
                  x1: leftCenter.x,
                  y1: leftCenter.y,
                  x2: rightCenter.x,
                  y2: rightCenter.y,
                  color: "#10b981",
                  isCorrect: true,
                  isKeyGuide: true,
                });
              }
            }
          }
        }
      });
    } else {
      // 2. Taking exam / active mode: draw candidate matches
      currentLeftItems.forEach((lItem, lIdx) => {
        const leftKey = getLeftLabel(lIdx, lItem);
        const matchedVal = getMatchedValForLeft(lIdx, lItem);
        if (!matchedVal) return;

        const leftCenter = getDotCenter(`[data-anchor-left="${lIdx}"]`);
        if (!leftCenter) return;

        const rIdx = findRightIndex(String(matchedVal));
        if (rIdx === -1) return;

        const rightCenter = getDotCenter(`[data-anchor-right="${rIdx}"]`);
        if (!rightCenter) return;

        computedLines.push({
          leftKey,
          rightKey: String(matchedVal),
          x1: leftCenter.x,
          y1: leftCenter.y,
          x2: rightCenter.x,
          y2: rightCenter.y,
          color: LINE_COLORS[lIdx % LINE_COLORS.length],
        });
      });
    }

    // Deep equality check before calling setLines to prevent jitter & render loops
    setLines((prev) => {
      if (
        prev.length === computedLines.length &&
        prev.every(
          (p, i) =>
            p.leftKey === computedLines[i].leftKey &&
            p.rightKey === computedLines[i].rightKey &&
            Math.abs(p.x1 - computedLines[i].x1) < 0.8 &&
            Math.abs(p.y1 - computedLines[i].y1) < 0.8 &&
            Math.abs(p.x2 - computedLines[i].x2) < 0.8 &&
            Math.abs(p.y2 - computedLines[i].y2) < 0.8 &&
            p.color === computedLines[i].color &&
            p.isKeyGuide === computedLines[i].isKeyGuide &&
            p.isCorrect === computedLines[i].isCorrect
        )
      ) {
        return prev;
      }
      return computedLines;
    });
  }, [findRightIndex, getMatchedValForLeft]);

  // Robust observer & multi-pass measurement
  useEffect(() => {
    updateLinePositions();
    const raf1 = requestAnimationFrame(updateLinePositions);
    const t1 = setTimeout(updateLinePositions, 50);
    const t2 = setTimeout(updateLinePositions, 150);
    const t3 = setTimeout(updateLinePositions, 350);

    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;

    if (containerRef.current) {
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          updateLinePositions();
        });
        ro.observe(containerRef.current);
      }

      if (typeof MutationObserver !== "undefined") {
        mo = new MutationObserver(() => {
          updateLinePositions();
        });
        mo.observe(containerRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }
    }

    const handleResize = () => updateLinePositions();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [leftItems, rightItems, matches, correctMatches, isReview, updateLinePositions]);

  // Handle pointer tracking for live active rubberband line
  useEffect(() => {
    if (!selectedLeft) {
      setPointerPos(null);
      setIsDragging(false);
      return;
    }

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setPointerPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handlePointerUp = () => {
      // If pointer released outside any right element, keep selected or cancel
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [selectedLeft, isDragging]);

  // Connect or disconnect left item
  const handleLeftClick = (leftKey: string) => {
    if (readOnly || isReview) return;
    if (selectedLeft === leftKey) {
      setSelectedLeft(null);
      setPointerPos(null);
    } else {
      setSelectedLeft(leftKey);
    }
  };

  // Connect to right item
  const handleRightClick = (rightKey: string) => {
    if (readOnly || isReview) return;
    if (selectedLeft !== null) {
      const newMatches = { ...matches, [selectedLeft]: rightKey };
      onChange?.(newMatches);
      setSelectedLeft(null);
      setPointerPos(null);
      setHoveredRight(null);
      setIsDragging(false);
    } else {
      // If clicking a right item that is already matched, remove its match
      const existingLeft = Object.entries(matches).find(
        ([_, rVal]) => String(rVal).toLowerCase().trim() === rightKey.toLowerCase().trim()
      );
      if (existingLeft) {
        handleRemoveMatch(existingLeft[0]);
      }
    }
  };

  // Remove a single match
  const handleRemoveMatch = (leftKey: string) => {
    if (readOnly || isReview) return;
    const newMatches = { ...matches };
    delete newMatches[leftKey];
    onChange?.(newMatches);
  };

  // Clear all matches
  const handleClearAll = () => {
    if (readOnly || isReview) return;
    onChange?.({});
    setSelectedLeft(null);
    setPointerPos(null);
  };

  // Check if right item has a match
  const getMatchedLeftForRight = (rLabel: string, rId?: string) => {
    const entry = Object.entries(matches).find(([_, rVal]) => {
      const v = String(rVal).toLowerCase().trim();
      return v === rLabel.toLowerCase().trim() || (rId && v === rId.toLowerCase().trim());
    });
    return entry ? entry[0] : null;
  };

  // Active rubberband line start coordinates
  const getActiveRubberbandStart = () => {
    if (!selectedLeft || !containerRef.current) return null;
    const leftIdx = leftItems.findIndex((it, i) => getLeftLabel(i, it) === selectedLeft || it.id === selectedLeft);
    if (leftIdx === -1) return null;
    const dot = containerRef.current.querySelector(`[data-anchor-left="${leftIdx}"]`);
    if (!dot) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    return {
      x: dotRect.left + dotRect.width / 2 - containerRect.left,
      y: dotRect.top + dotRect.height / 2 - containerRect.top,
      color: LINE_COLORS[leftIdx % LINE_COLORS.length],
    };
  };

  const activeStart = getActiveRubberbandStart();

  return (
    <div className={`matching-board space-y-3 ${className}`}>
      {/* Header instructions & Clear button */}
      {!readOnly && !isReview && (
        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                selectedLeft !== null ? "bg-blue-600 animate-ping" : "bg-blue-500"
              }`}
            />
            <span>
              {selectedLeft !== null ? (
                <strong className="text-blue-700">
                  Đang chọn mục [{selectedLeft}] ở Cột 1 ➔ Nhấp vào mục tương ứng ở Cột 2 để nối đường thẳng!
                </strong>
              ) : (
                <span>
                  Nhấp chọn 1 dòng ở <strong>Cột 1</strong> rồi nhấp dòng tương ứng ở <strong>Cột 2</strong> (hoặc kéo thả giữa 2 chấm) để nối đường thẳng.
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedLeft !== null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLeft(null);
                  setPointerPos(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-0.5 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy chọn
              </button>
            )}

            {Object.keys(matches).length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nối lại</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Matching Table with Straight SVG Lines */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs overflow-hidden select-none"
      >
        {/* SVG Straight Lines Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <filter id="line-crisp-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.25" />
            </filter>
            <radialGradient id="dot-active-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Render All Established Matches */}
          {lines.map((ln, idx) => {
            const midX = (ln.x1 + ln.x2) / 2;
            const midY = (ln.y1 + ln.y2) / 2;

            return (
              <g key={`match-line-${ln.leftKey}-${ln.rightKey}-${idx}`}>
                {/* White casing line underneath for maximum contrast and pop */}
                <line
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  stroke="#ffffff"
                  strokeWidth={ln.isKeyGuide ? 5 : 6}
                  strokeLinecap="round"
                />

                {/* Straight Direct Line */}
                <line
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  stroke={ln.color}
                  strokeWidth={ln.isKeyGuide ? 2.5 : 3.5}
                  strokeDasharray={ln.isKeyGuide ? "6,4" : undefined}
                  strokeLinecap="round"
                  filter="url(#line-crisp-shadow)"
                />

                {/* Center Badge in Review Mode */}
                {isReview && !ln.isKeyGuide && (
                  <g transform={`translate(${midX - 11}, ${midY - 11})`}>
                    <circle cx="11" cy="11" r="11" fill={ln.isCorrect ? "#059669" : "#dc2626"} />
                    <text
                      x="11"
                      y="15.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="900"
                    >
                      {ln.isCorrect ? "✓" : "✗"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Active Live Rubberband Line (following mouse/pointer while connecting) */}
          {activeStart && pointerPos && !readOnly && !isReview && (
            <g>
              <line
                x1={activeStart.x}
                y1={activeStart.y}
                x2={pointerPos.x}
                y2={pointerPos.y}
                stroke="#ffffff"
                strokeWidth={6}
                strokeLinecap="round"
              />
              <line
                x1={activeStart.x}
                y1={activeStart.y}
                x2={pointerPos.x}
                y2={pointerPos.y}
                stroke={activeStart.color || "#2563eb"}
                strokeWidth={3.5}
                strokeDasharray="6,4"
                strokeLinecap="round"
                className="animate-pulse"
              />
              {/* Pointer Tip Dot */}
              <circle cx={pointerPos.x} cy={pointerPos.y} r={5} fill={activeStart.color || "#2563eb"} />
            </g>
          )}
        </svg>

        {/* 2 Columns Grid */}
        <div className="grid grid-cols-2 gap-8 sm:gap-16 relative z-20">
          {/* Column 1 (Left: 1..n) */}
          <div className="space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Cột 1 (Số 1 ➔ {leftItems.length})</span>
            </div>

            {leftItems.map((item, idx) => {
              const label = getLeftLabel(idx, item);
              const matchedVal = getMatchedValForLeft(idx, item);
              const isSelected = selectedLeft === label || selectedLeft === item.id;
              const isMatched = Boolean(matchedVal);
              const lineColor = LINE_COLORS[idx % LINE_COLORS.length];

              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleLeftClick(label)}
                  onPointerDown={() => {
                    if (readOnly || isReview) return;
                    setSelectedLeft(label);
                    setIsDragging(true);
                  }}
                  className={`relative p-3 sm:p-3.5 rounded-xl border transition-all text-xs sm:text-sm flex items-start gap-2.5 ${
                    !readOnly && !isReview ? "cursor-pointer hover:shadow-xs" : ""
                  } ${
                    isSelected
                      ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-sm"
                      : isMatched
                      ? "bg-slate-50/90 border-slate-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {/* Left Label Badge: 1, 2, 3 */}
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 shadow-2xs ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isMatched
                        ? "text-white"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                    style={isMatched && !isSelected ? { backgroundColor: lineColor } : undefined}
                  >
                    {label}
                  </span>

                  <div className="flex-1 min-w-0 pr-3">
                    <LatexPreview content={item.text} className="leading-snug" />
                  </div>

                  {/* Connected Target Pill Tag */}
                  {matchedVal && (
                    <span
                      className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white shrink-0 self-center shadow-2xs"
                      style={{ backgroundColor: lineColor }}
                    >
                      ➔ [{matchedVal}]
                    </span>
                  )}

                  {/* Precision Connection Node Dot (Anchor) */}
                  <div
                    data-anchor-left={idx}
                    className={`w-4 h-4 rounded-full border-2 absolute -right-2 top-1/2 -translate-y-1/2 shadow-xs transition-transform ${
                      isSelected
                        ? "bg-blue-600 border-white ring-4 ring-blue-400/50 scale-125 animate-pulse"
                        : isMatched
                        ? "border-white"
                        : "bg-slate-300 border-white"
                    }`}
                    style={isMatched && !isSelected ? { backgroundColor: lineColor } : undefined}
                  />
                </div>
              );
            })}
          </div>

          {/* Column 2 (Right: a..z) */}
          <div className="space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Cột 2 (Chữ a ➔ {String.fromCharCode(96 + rightItems.length)})</span>
            </div>

            {rightItems.map((item, idx) => {
              const label = getRightLabel(idx, item);
              const matchedLeft = getMatchedLeftForRight(label, item.id);
              const isMatched = Boolean(matchedLeft);
              const isHovered = hoveredRight === label;

              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleRightClick(label)}
                  onPointerEnter={() => {
                    if (selectedLeft) setHoveredRight(label);
                  }}
                  onPointerLeave={() => {
                    if (hoveredRight === label) setHoveredRight(null);
                  }}
                  onPointerUp={() => {
                    if (isDragging && selectedLeft) {
                      handleRightClick(label);
                    }
                  }}
                  className={`relative p-3 sm:p-3.5 rounded-xl border transition-all text-xs sm:text-sm flex items-start gap-2.5 ${
                    !readOnly && !isReview && selectedLeft !== null
                      ? isHovered
                        ? "cursor-pointer bg-blue-100 border-blue-600 ring-2 ring-blue-400 shadow-sm"
                        : "cursor-pointer bg-blue-50/50 border-blue-400 hover:bg-blue-100/70 hover:border-blue-600 shadow-2xs"
                      : isMatched
                      ? "bg-slate-50/90 border-slate-300 text-slate-900 cursor-pointer"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  {/* Precision Connection Node Dot (Anchor) */}
                  <div
                    data-anchor-right={idx}
                    className={`w-4 h-4 rounded-full border-2 absolute -left-2 top-1/2 -translate-y-1/2 shadow-xs transition-transform ${
                      isHovered
                        ? "bg-blue-600 border-white ring-4 ring-blue-400 scale-125"
                        : selectedLeft !== null
                        ? "bg-blue-500 border-white ring-2 ring-blue-300 scale-110"
                        : isMatched
                        ? "bg-indigo-600 border-white"
                        : "bg-slate-300 border-white"
                    }`}
                  />

                  {/* Right Label Badge: a, b, c */}
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 shadow-2xs ${
                      isMatched
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {label}
                  </span>

                  <div className="flex-1 min-w-0 pl-1">
                    <LatexPreview content={item.text} className="leading-snug" />
                  </div>

                  {/* Connected From Pill Tag */}
                  {matchedLeft && (
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0 self-center">
                      [{matchedLeft}] ➔
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Matched Pairs Summary Bar */}
      <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {isReview ? "Kết quả các cặp nối của bạn:" : "Danh sách cặp nối:"}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {Object.keys(matches).length} / {leftItems.length} cặp đã nối
          </span>
        </div>

        {Object.keys(matches).length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Chưa nối cặp nào. Hãy nhấp dòng ở Cột 1 rồi nhấp dòng tương ứng ở Cột 2 để nối đường thẳng.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {leftItems.map((lItem, idx) => {
              const leftKey = getLeftLabel(idx, lItem);
              const matchedVal = getMatchedValForLeft(idx, lItem);
              const correctVal =
                (lItem.id && correctMatches[lItem.id]) ??
                correctMatches[leftKey] ??
                correctMatches[`${idx + 1}`];

              if (!matchedVal && !isReview) return null;
              if (!matchedVal && isReview && !correctVal) return null;

              const userRIdx = matchedVal ? findRightIndex(String(matchedVal)) : -1;
              const userDisplayLabel = userRIdx !== -1 ? getRightLabel(userRIdx, rightItems[userRIdx]) : matchedVal;

              const corrRIdx = correctVal !== undefined ? findRightIndex(String(correctVal)) : -1;
              const corrDisplayLabel = corrRIdx !== -1 ? getRightLabel(corrRIdx, rightItems[corrRIdx]) : correctVal;

              const isMatchCorrect =
                isReview &&
                Boolean(matchedVal) &&
                correctVal !== undefined &&
                (String(matchedVal).toLowerCase().trim() === String(correctVal).toLowerCase().trim() ||
                 (userRIdx !== -1 && userRIdx === corrRIdx));

              const lineColor = LINE_COLORS[idx % LINE_COLORS.length];

              return (
                <div
                  key={leftKey}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${
                    isReview
                      ? isMatchCorrect
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-red-50 text-red-800 border-red-300"
                      : "bg-white text-slate-800 border-slate-200"
                  }`}
                >
                  <span
                    className="font-extrabold px-1.5 py-0.5 rounded text-white text-[11px]"
                    style={{ backgroundColor: lineColor }}
                  >
                    [{leftKey}]
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-extrabold text-indigo-700">
                    [{userDisplayLabel || "Chưa nối"}]
                  </span>

                  {isReview && (
                    <span className="text-xs font-black">
                      {isMatchCorrect ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 inline ml-0.5" />
                      ) : (
                        <span className="text-[11px] font-normal text-red-600 ml-1">
                          (Đúng: <strong>[{corrDisplayLabel}]</strong>)
                        </span>
                      )}
                    </span>
                  )}

                  {!readOnly && !isReview && matchedVal && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMatch(leftKey)}
                      className="ml-1 text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                      title="Gỡ đường nối này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
