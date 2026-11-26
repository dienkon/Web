import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Check,
  X,
  Link as LinkIcon,
  ArrowRight,
  RotateCcw,
  Smartphone,
  GitCommitHorizontal,
  GitFork,
  Columns2,
} from "lucide-react";
import { MatchingConnections, MatchingItem, MatchingMode } from "../../types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import {
  findLeftItemIndex,
  findRightItemIndex,
  getLeftItemLabel,
  getRightItemLabel,
  getUnconnectedItems,
  normalizeMatchesToArrayMap,
  removeMatchWire,
  resolveMatchingMode,
  toggleMatchConnection,
} from "../../utils/matchingUtils";

interface Props {
  leftItems?: MatchingItem[];
  rightItems?: MatchingItem[];
  matches?: MatchingConnections;
  onChange?: (newMatches: MatchingConnections) => void;
  matchingMode?: MatchingMode;
  isReview?: boolean;
  isAnswerKeyPreview?: boolean;
  correctMatches?: MatchingConnections;
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
const EMPTY_MATCHES: MatchingConnections = {};

interface LineData {
  leftKey: string;
  rightKey: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  isCorrect?: boolean;
  isKeyGuide?: boolean;
}

interface ActiveSelection {
  side: "left" | "right";
  key: string;
}

export default function InteractiveMatchingBoard({
  leftItems = EMPTY_ITEMS,
  rightItems = EMPTY_ITEMS,
  matches = EMPTY_MATCHES,
  onChange,
  matchingMode,
  isReview = false,
  isAnswerKeyPreview = false,
  correctMatches = EMPTY_MATCHES,
  readOnly = false,
  className = "",
}: Props) {
  const effectiveMode: MatchingMode = useMemo(
    () =>
      resolveMatchingMode({
        matchingMode,
        correctMatches,
        matchingLeft: leftItems,
        matchingRight: rightItems,
      }),
    [matchingMode, correctMatches, leftItems, rightItems]
  );

  const isInteractive = !readOnly && !isReview && !isAnswerKeyPreview;

  // Layout mode: "board" (2-column visual wires) vs "quick_cards" (full-width mobile-friendly cards)
  const [viewLayout, setViewLayout] = useState<"board" | "quick_cards">("board");

  // Selected anchor for bidirectional tap-to-connect or handle drag
  const [selectedAnchor, setSelectedAnchor] = useState<ActiveSelection | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<ActiveSelection | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState<boolean>(false);

  // Normalize matches & correctMatches into canonical `leftLabel -> rightLabel[]`
  const normalizedMatches = useMemo(
    () => normalizeMatchesToArrayMap(matches, leftItems, rightItems),
    [matches, leftItems, rightItems]
  );

  const normalizedCorrectMatches = useMemo(
    () => normalizeMatchesToArrayMap(correctMatches, leftItems, rightItems),
    [correctMatches, leftItems, rightItems]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineData[]>([]);
  const justCompletedDragRef = useRef<number>(0);

  // Refs for observers & pointer listeners
  const leftItemsRef = useRef(leftItems);
  leftItemsRef.current = leftItems;

  const rightItemsRef = useRef(rightItems);
  rightItemsRef.current = rightItems;

  const rawMatchesRef = useRef(matches);
  rawMatchesRef.current = matches;

  const normalizedMatchesRef = useRef(normalizedMatches);
  normalizedMatchesRef.current = normalizedMatches;

  const normalizedCorrectRef = useRef(normalizedCorrectMatches);
  normalizedCorrectRef.current = normalizedCorrectMatches;

  const isReviewRef = useRef(isReview);
  isReviewRef.current = isReview;

  const isAnswerKeyPreviewRef = useRef(isAnswerKeyPreview);
  isAnswerKeyPreviewRef.current = isAnswerKeyPreview;

  const effectiveModeRef = useRef(effectiveMode);
  effectiveModeRef.current = effectiveMode;

  // Compute scale compensation for CSS zoom or transform animations
  const getContainerMetrics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = container.offsetWidth > 0 ? rect.width / container.offsetWidth : 1;
    const scaleY = container.offsetHeight > 0 ? rect.height / container.offsetHeight : 1;
    return {
      container,
      rect,
      scaleX: scaleX || 1,
      scaleY: scaleY || 1,
    };
  }, []);

  // Recalculate SVG coordinates of straight connecting lines
  const updateLinePositions = useCallback(() => {
    const metrics = getContainerMetrics();
    if (!metrics) return;
    const { container, rect: containerRect, scaleX, scaleY } = metrics;

    const currentLeftItems = leftItemsRef.current;
    const currentRightItems = rightItemsRef.current;
    const userMap = normalizedMatchesRef.current;
    const corrMap = normalizedCorrectRef.current;
    const currentIsReview = isReviewRef.current;
    const currentIsKeyPreview = isAnswerKeyPreviewRef.current;

    const computedLines: LineData[] = [];

    const getDotCenter = (selector: string) => {
      const el = container.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: (rect.left + rect.width / 2 - containerRect.left) / scaleX,
        y: (rect.top + rect.height / 2 - containerRect.top) / scaleY,
      };
    };

    if (currentIsKeyPreview) {
      // Answer-key preview mode (Editor paper preview / Solution preview): crisp emerald lines
      const previewMap = Object.keys(corrMap).length > 0 ? corrMap : userMap;
      currentLeftItems.forEach((lItem, lIdx) => {
        const leftKey = getLeftItemLabel(lIdx, lItem);
        const targets = previewMap[leftKey] || [];
        if (targets.length === 0) return;

        const leftCenter = getDotCenter(`[data-anchor-left="${lIdx}"]`);
        if (!leftCenter) return;

        targets.forEach((rVal) => {
          const rIdx = findRightItemIndex(rVal, currentRightItems);
          if (rIdx === -1) return;
          const rightCenter = getDotCenter(`[data-anchor-right="${rIdx}"]`);
          if (!rightCenter) return;

          computedLines.push({
            leftKey,
            rightKey: getRightItemLabel(rIdx, currentRightItems[rIdx]),
            x1: leftCenter.x,
            y1: leftCenter.y,
            x2: rightCenter.x,
            y2: rightCenter.y,
            color: "#059669",
            isCorrect: true,
            isKeyGuide: false,
          });
        });
      });
    } else if (currentIsReview) {
      // Student post-submission review mode: evaluate each wire + draw dashed guides for missed wires
      currentLeftItems.forEach((lItem, lIdx) => {
        const leftKey = getLeftItemLabel(lIdx, lItem);
        const userTargets = userMap[leftKey] || [];
        const corrTargets = corrMap[leftKey] || [];
        const corrLower = new Set(corrTargets.map((t) => t.toLowerCase()));
        const userLower = new Set(userTargets.map((t) => t.toLowerCase()));

        const leftCenter = getDotCenter(`[data-anchor-left="${lIdx}"]`);
        if (!leftCenter) return;

        // 1. Student's wires (green if in corrTargets, red if wrong or distractor)
        userTargets.forEach((uVal) => {
          const rIdx = findRightItemIndex(uVal, currentRightItems);
          if (rIdx === -1) return;
          const rightCenter = getDotCenter(`[data-anchor-right="${rIdx}"]`);
          if (!rightCenter) return;
          const canonicalR = getRightItemLabel(rIdx, currentRightItems[rIdx]);
          const isWireCorrect = corrLower.has(canonicalR.toLowerCase());

          computedLines.push({
            leftKey,
            rightKey: canonicalR,
            x1: leftCenter.x,
            y1: leftCenter.y,
            x2: rightCenter.x,
            y2: rightCenter.y,
            color: isWireCorrect ? "#059669" : "#dc2626",
            isCorrect: isWireCorrect,
            isKeyGuide: false,
          });
        });

        // 2. Missed required wires (dashed emerald guide)
        corrTargets.forEach((cVal) => {
          const rIdx = findRightItemIndex(cVal, currentRightItems);
          if (rIdx === -1) return;
          const canonicalR = getRightItemLabel(rIdx, currentRightItems[rIdx]);
          if (userLower.has(canonicalR.toLowerCase())) return;

          const rightCenter = getDotCenter(`[data-anchor-right="${rIdx}"]`);
          if (!rightCenter) return;

          computedLines.push({
            leftKey,
            rightKey: canonicalR,
            x1: leftCenter.x,
            y1: leftCenter.y,
            x2: rightCenter.x,
            y2: rightCenter.y,
            color: "#10b981",
            isCorrect: true,
            isKeyGuide: true,
          });
        });
      });
    } else {
      // Active exam-taking / editor wiring mode
      currentLeftItems.forEach((lItem, lIdx) => {
        const leftKey = getLeftItemLabel(lIdx, lItem);
        const targets = userMap[leftKey] || [];
        if (targets.length === 0) return;

        const leftCenter = getDotCenter(`[data-anchor-left="${lIdx}"]`);
        if (!leftCenter) return;

        targets.forEach((rVal) => {
          const rIdx = findRightItemIndex(rVal, currentRightItems);
          if (rIdx === -1) return;
          const rightCenter = getDotCenter(`[data-anchor-right="${rIdx}"]`);
          if (!rightCenter) return;

          computedLines.push({
            leftKey,
            rightKey: getRightItemLabel(rIdx, currentRightItems[rIdx]),
            x1: leftCenter.x,
            y1: leftCenter.y,
            x2: rightCenter.x,
            y2: rightCenter.y,
            color: LINE_COLORS[lIdx % LINE_COLORS.length],
          });
        });
      });
    }

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
  }, [getContainerMetrics]);

  // Multi-pass measurement & ResizeObserver / MutationObserver
  useEffect(() => {
    if (viewLayout !== "board") return;
    updateLinePositions();
    const raf1 = requestAnimationFrame(updateLinePositions);
    const t1 = setTimeout(updateLinePositions, 60);
    const t2 = setTimeout(updateLinePositions, 180);
    const t3 = setTimeout(updateLinePositions, 400);

    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;

    if (containerRef.current) {
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => updateLinePositions());
        ro.observe(containerRef.current);
      }
      if (typeof MutationObserver !== "undefined") {
        mo = new MutationObserver(() => updateLinePositions());
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
  }, [
    leftItems,
    rightItems,
    normalizedMatches,
    normalizedCorrectMatches,
    isReview,
    isAnswerKeyPreview,
    viewLayout,
    updateLinePositions,
  ]);

  // Execute connection toggle between a leftKey and rightKey
  const commitConnection = useCallback(
    (leftKey: string, rightKey: string) => {
      if (!isInteractive) return;
      const next = toggleMatchConnection(
        rawMatchesRef.current,
        leftKey,
        rightKey,
        effectiveModeRef.current,
        leftItemsRef.current,
        rightItemsRef.current
      );
      onChange?.(next);
    },
    [isInteractive, onChange]
  );

  // Pointer tracking ONLY when dragging from an anchor handle (never hijacks normal touch scrolling!)
  useEffect(() => {
    if (!isDraggingHandle || !selectedAnchor || !isInteractive) {
      return;
    }

    const handlePointerMove = (e: PointerEvent | TouchEvent | MouseEvent) => {
      const metrics = getContainerMetrics();
      if (!metrics) return;

      let clientX = 0;
      let clientY = 0;
      if ("touches" in e && e.touches.length > 0) {
        if (e.cancelable) e.preventDefault();
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      } else {
        return;
      }

      setPointerPos({
        x: (clientX - metrics.rect.left) / metrics.scaleX,
        y: (clientY - metrics.rect.top) / metrics.scaleY,
      });

      const elUnderPointer = document.elementFromPoint(clientX, clientY);
      if (selectedAnchor.side === "left") {
        const rightCard = elUnderPointer?.closest("[data-right-card-label]") as HTMLElement | null;
        const rLabel = rightCard?.getAttribute("data-right-card-label");
        setHoveredTarget(rLabel ? { side: "right", key: rLabel } : null);
      } else {
        const leftCard = elUnderPointer?.closest("[data-left-card-label]") as HTMLElement | null;
        const lLabel = leftCard?.getAttribute("data-left-card-label");
        setHoveredTarget(lLabel ? { side: "left", key: lLabel } : null);
      }
    };

    const handlePointerUp = (e: PointerEvent | TouchEvent | MouseEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ("changedTouches" in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if ("clientX" in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      if (clientX && clientY) {
        const elUnderPointer = document.elementFromPoint(clientX, clientY);
        if (selectedAnchor.side === "left") {
          const rightCard = elUnderPointer?.closest("[data-right-card-label]") as HTMLElement | null;
          const rLabel = rightCard?.getAttribute("data-right-card-label");
          if (rLabel) {
            justCompletedDragRef.current = Date.now();
            commitConnection(selectedAnchor.key, rLabel);
            setSelectedAnchor(null);
          }
        } else {
          const leftCard = elUnderPointer?.closest("[data-left-card-label]") as HTMLElement | null;
          const lLabel = leftCard?.getAttribute("data-left-card-label");
          if (lLabel) {
            justCompletedDragRef.current = Date.now();
            commitConnection(lLabel, selectedAnchor.key);
            setSelectedAnchor(null);
          }
        }
      }

      setIsDraggingHandle(false);
      setPointerPos(null);
      setHoveredTarget(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDraggingHandle, selectedAnchor, isInteractive, getContainerMetrics, commitConnection]);

  // Desktop hover rubberband when selectedAnchor is set (without dragging)
  const handleBoardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !selectedAnchor || isDraggingHandle) return;
    // Only show hover rubberband on fine-pointer devices (mouse)
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) return;
    const metrics = getContainerMetrics();
    if (!metrics) return;
    setPointerPos({
      x: (e.clientX - metrics.rect.left) / metrics.scaleX,
      y: (e.clientY - metrics.rect.top) / metrics.scaleY,
    });
  };

  // Bidirectional tap-to-connect on Left Card
  const handleLeftCardClick = (leftKey: string) => {
    if (!isInteractive) return;
    if (Date.now() - justCompletedDragRef.current < 250) return;

    if (!selectedAnchor) {
      setSelectedAnchor({ side: "left", key: leftKey });
      return;
    }

    if (selectedAnchor.side === "left") {
      if (selectedAnchor.key === leftKey) {
        setSelectedAnchor(null);
        setPointerPos(null);
      } else {
        setSelectedAnchor({ side: "left", key: leftKey });
      }
      return;
    }

    // selectedAnchor.side === "right" -> connect (leftKey, selectedAnchor.key)!
    commitConnection(leftKey, selectedAnchor.key);
    setSelectedAnchor(null);
    setPointerPos(null);
    setHoveredTarget(null);
  };

  // Bidirectional tap-to-connect on Right Card
  const handleRightCardClick = (rightKey: string) => {
    if (!isInteractive) return;
    if (Date.now() - justCompletedDragRef.current < 250) return;

    if (!selectedAnchor) {
      setSelectedAnchor({ side: "right", key: rightKey });
      return;
    }

    if (selectedAnchor.side === "right") {
      if (selectedAnchor.key === rightKey) {
        setSelectedAnchor(null);
        setPointerPos(null);
      } else {
        setSelectedAnchor({ side: "right", key: rightKey });
      }
      return;
    }

    // selectedAnchor.side === "left" -> connect (selectedAnchor.key, rightKey)!
    commitConnection(selectedAnchor.key, rightKey);
    // In multiple mode, if user prefers connecting more wires from same left item via quick pills they can,
    // while card-to-card tap finishes cleanly (or user can tap quick pills directly!)
    setSelectedAnchor(null);
    setPointerPos(null);
    setHoveredTarget(null);
  };

  // Start drag from dedicated handle dot
  const handleAnchorHandlePointerDown = (
    e: React.PointerEvent,
    side: "left" | "right",
    key: string
  ) => {
    if (!isInteractive) return;
    e.stopPropagation();
    setSelectedAnchor({ side, key });
    setIsDraggingHandle(true);
    const metrics = getContainerMetrics();
    if (metrics) {
      setPointerPos({
        x: (e.clientX - metrics.rect.left) / metrics.scaleX,
        y: (e.clientY - metrics.rect.top) / metrics.scaleY,
      });
    }
  };

  const handleRemoveSingleWire = (leftKey: string, rightKey?: string) => {
    if (!isInteractive) return;
    const next = removeMatchWire(
      matches,
      leftKey,
      rightKey,
      effectiveMode,
      leftItems,
      rightItems
    );
    onChange?.(next);
  };

  const handleClearAll = () => {
    if (!isInteractive) return;
    onChange?.({});
    setSelectedAnchor(null);
    setPointerPos(null);
    setHoveredTarget(null);
  };

  // Map rightLabel -> array of connected leftLabels (supports both 1-1 and multiple!)
  const rightToLeftMap = useMemo(() => {
    const activeMap = isAnswerKeyPreview && Object.keys(normalizedCorrectMatches).length > 0
      ? normalizedCorrectMatches
      : normalizedMatches;
    const rev: Record<string, string[]> = {};
    Object.entries(activeMap).forEach(([lKey, rTargets]) => {
      rTargets.forEach((rKey) => {
        const lower = rKey.toLowerCase();
        if (!rev[lower]) rev[lower] = [];
        rev[lower].push(lKey);
      });
    });
    return rev;
  }, [normalizedMatches, normalizedCorrectMatches, isAnswerKeyPreview]);

  const totalWiresCount = useMemo(
    () => Object.values(normalizedMatches).reduce((sum, arr) => sum + arr.length, 0),
    [normalizedMatches]
  );

  const unconnectedInfo = useMemo(() => {
    const refMap = isAnswerKeyPreview || isReview ? normalizedCorrectMatches : normalizedMatches;
    return getUnconnectedItems(leftItems, rightItems, refMap);
  }, [leftItems, rightItems, normalizedCorrectMatches, normalizedMatches, isAnswerKeyPreview, isReview]);

  // Active rubberband start coordinates
  const getActiveRubberbandStart = () => {
    if (!selectedAnchor || !containerRef.current) return null;
    const metrics = getContainerMetrics();
    if (!metrics) return null;

    if (selectedAnchor.side === "left") {
      const lIdx = findLeftItemIndex(selectedAnchor.key, leftItems);
      if (lIdx === -1) return null;
      const dot = metrics.container.querySelector(`[data-anchor-left="${lIdx}"]`);
      if (!dot) return null;
      const dotRect = dot.getBoundingClientRect();
      return {
        x: (dotRect.left + dotRect.width / 2 - metrics.rect.left) / metrics.scaleX,
        y: (dotRect.top + dotRect.height / 2 - metrics.rect.top) / metrics.scaleY,
        color: LINE_COLORS[lIdx % LINE_COLORS.length],
      };
    } else {
      const rIdx = findRightItemIndex(selectedAnchor.key, rightItems);
      if (rIdx === -1) return null;
      const dot = metrics.container.querySelector(`[data-anchor-right="${rIdx}"]`);
      if (!dot) return null;
      const dotRect = dot.getBoundingClientRect();
      return {
        x: (dotRect.left + dotRect.width / 2 - metrics.rect.left) / metrics.scaleX,
        y: (dotRect.top + dotRect.height / 2 - metrics.rect.top) / metrics.scaleY,
        color: "#4f46e5",
      };
    }
  };

  const getHoveredTargetDot = () => {
    if (!hoveredTarget || !containerRef.current) return null;
    const metrics = getContainerMetrics();
    if (!metrics) return null;

    const selector =
      hoveredTarget.side === "right"
        ? `[data-anchor-right="${findRightItemIndex(hoveredTarget.key, rightItems)}"]`
        : `[data-anchor-left="${findLeftItemIndex(hoveredTarget.key, leftItems)}"]`;
    const dot = metrics.container.querySelector(selector);
    if (!dot) return null;
    const dotRect = dot.getBoundingClientRect();
    return {
      x: (dotRect.left + dotRect.width / 2 - metrics.rect.left) / metrics.scaleX,
      y: (dotRect.top + dotRect.height / 2 - metrics.rect.top) / metrics.scaleY,
    };
  };

  const activeStart = viewLayout === "board" ? getActiveRubberbandStart() : null;
  const uniqueSvgFilterId = useRef(`line-shadow-${Math.random().toString(36).slice(2, 8)}`).current;

  return (
    <div className={`matching-board space-y-3 ${className}`}>
      {/* Mode Badge & Interactive Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Rule Mode Pill */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-extrabold text-[11px] border shrink-0 ${
              effectiveMode === "multiple"
                ? "bg-purple-50 text-purple-800 border-purple-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            {effectiveMode === "multiple" ? (
              <>
                <GitFork className="w-3 h-3" />
                <span>1 ô nối nhiều mạch</span>
              </>
            ) : (
              <>
                <GitCommitHorizontal className="w-3.5 h-3.5" />
                <span>Chỉ 1 ô – 1 mạch</span>
              </>
            )}
          </span>

          {isInteractive ? (
            selectedAnchor !== null ? (
              <span className="text-blue-700 font-bold">
                Đang chọn {selectedAnchor.side === "left" ? "Cột 1" : "Cột 2"} [{selectedAnchor.key}] ➔ Chạm ô bên{" "}
                {selectedAnchor.side === "left" ? "Cột 2" : "Cột 1"} để nối/gỡ!
              </span>
            ) : (
              <span className="text-slate-600">
                Chạm 1 ô rồi chạm ô cột kia (hoặc kéo chấm tròn) để nối. Ô không liên quan có thể để trống.
              </span>
            )
          ) : isAnswerKeyPreview ? (
            <span className="text-emerald-800 font-semibold">
               Chế độ xem trước đáp án nối bảng chuẩn
            </span>
          ) : (
            <span className="text-slate-600 font-medium">
              Bảng đối chiếu kết quả nối 2 cột
            </span>
          )}
        </div>

        {/* Right Controls: Mobile Layout Toggle + Cancel + Reset */}
        {isInteractive && (
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Switch between 2-column SVG wires & Mobile Easy-Pick Full-Width Cards */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewLayout("board")}
                className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  viewLayout === "board"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Hiển thị bảng 2 cột với đường dây nối trực quan"
              >
                <Columns2 className="w-3 h-3" />
                <span>Sơ đồ dây</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewLayout("quick_cards");
                  setSelectedAnchor(null);
                  setPointerPos(null);
                }}
                className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  viewLayout === "quick_cards"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Giao diện thẻ rộng tối ưu cho điện thoại: bấm nút ghép nhanh không cần kéo"
              >
                <Smartphone className="w-3 h-3" />
                <span>Ghép nhanh ĐT</span>
              </button>
            </div>

            {selectedAnchor !== null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAnchor(null);
                  setPointerPos(null);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold px-2 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Bỏ chọn
              </button>
            )}

            {totalWiresCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= VIEW 1: 2-COLUMN VISUAL WIRE BOARD ================= */}
      {viewLayout === "board" ? (
        <div
          ref={containerRef}
          onMouseMove={handleBoardMouseMove}
          onMouseLeave={() => {
            if (!isDraggingHandle) setPointerPos(null);
          }}
          className="relative rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-5 shadow-xs overflow-hidden select-none"
        >
          {/* SVG Straight Lines Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              <filter id={uniqueSvgFilterId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.22" />
              </filter>
            </defs>

            {/* Render All Established Matches */}
            {lines.map((ln, idx) => {
              const midX = (ln.x1 + ln.x2) / 2;
              const midY = (ln.y1 + ln.y2) / 2;

              return (
                <g key={`match-line-${ln.leftKey}-${ln.rightKey}-${ln.isKeyGuide ? "g" : "u"}-${idx}`}>
                  <line
                    x1={ln.x1}
                    y1={ln.y1}
                    x2={ln.x2}
                    y2={ln.y2}
                    stroke="#ffffff"
                    strokeWidth={ln.isKeyGuide ? 5 : 6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={ln.x1}
                    y1={ln.y1}
                    x2={ln.x2}
                    y2={ln.y2}
                    stroke={ln.color}
                    strokeWidth={ln.isKeyGuide ? 2.5 : 3.2}
                    strokeDasharray={ln.isKeyGuide ? "6,4" : undefined}
                    strokeLinecap="round"
                    filter={`url(#${uniqueSvgFilterId})`}
                  />

                  {/* Center Badge in Student Review Mode */}
                  {isReview && !isAnswerKeyPreview && !ln.isKeyGuide && (
                    <g transform={`translate(${midX - 10}, ${midY - 10})`}>
                      <circle cx="10" cy="10" r="10" fill={ln.isCorrect ? "#059669" : "#dc2626"} />
                      <text
                        x="10"
                        y="14"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="900"
                      >
                        {ln.isCorrect ? "✓" : "✗"}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Active Live Rubberband Line */}
            {activeStart && pointerPos && isInteractive && (() => {
              const snapDot = getHoveredTargetDot();
              const targetX = snapDot ? snapDot.x : pointerPos.x;
              const targetY = snapDot ? snapDot.y : pointerPos.y;
              return (
                <g>
                  <line
                    x1={activeStart.x}
                    y1={activeStart.y}
                    x2={targetX}
                    y2={targetY}
                    stroke="#ffffff"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={activeStart.x}
                    y1={activeStart.y}
                    x2={targetX}
                    y2={targetY}
                    stroke={activeStart.color || "#2563eb"}
                    strokeWidth={3.2}
                    strokeDasharray={snapDot ? undefined : "6,4"}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={targetX}
                    cy={targetY}
                    r={snapDot ? 7 : 5}
                    fill={activeStart.color || "#2563eb"}
                  />
                </g>
              );
            })()}
          </svg>

          {/* 2 Columns Grid — Responsive spacing so mobile text isn't crushed */}
          <div className="grid grid-cols-2 gap-5 sm:gap-14 relative z-20">
            {/* Column 1 (Left: 1..n) */}
            <div className="space-y-2.5 sm:space-y-3 min-w-0">
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>Cột 1 (1 ➔ {leftItems.length})</span>
              </div>

              {leftItems.map((item, idx) => {
                const label = getLeftItemLabel(idx, item);
                const activeDisplayMap =
                  isAnswerKeyPreview && Object.keys(normalizedCorrectMatches).length > 0
                    ? normalizedCorrectMatches
                    : normalizedMatches;
                const matchedTargets = activeDisplayMap[label] || [];
                const isSelected =
                  selectedAnchor?.side === "left" && selectedAnchor.key === label;
                const isHoveredFromRight =
                  hoveredTarget?.side === "left" && hoveredTarget.key === label;
                const isTargetableFromRight =
                  isInteractive && selectedAnchor?.side === "right";
                const isMatched = matchedTargets.length > 0;
                const lineColor = isAnswerKeyPreview
                  ? "#059669"
                  : LINE_COLORS[idx % LINE_COLORS.length];

                return (
                  <div key={item.id || idx} className="space-y-1.5">
                    <div
                      data-left-card-label={label}
                      onClick={() => handleLeftCardClick(label)}
                      onPointerEnter={() => {
                        if (isTargetableFromRight) {
                          setHoveredTarget({ side: "left", key: label });
                        }
                      }}
                      onPointerLeave={() => {
                        if (hoveredTarget?.side === "left" && hoveredTarget.key === label) {
                          setHoveredTarget(null);
                        }
                      }}
                      className={`relative p-2.5 sm:p-3.5 rounded-xl border transition-all text-xs sm:text-sm flex items-start gap-2 ${
                        isInteractive ? "cursor-pointer active:scale-[0.99]" : ""
                      } ${
                        isSelected
                          ? "bg-blue-50 border-blue-600 ring-2 ring-blue-300 shadow-sm"
                          : isTargetableFromRight
                          ? isHoveredFromRight
                            ? "bg-indigo-100 border-indigo-600 ring-2 ring-indigo-300 shadow-sm"
                            : "bg-indigo-50/50 border-indigo-400 hover:bg-indigo-100/60"
                          : isMatched
                          ? "bg-slate-50/90 border-slate-300 text-slate-900"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {/* Left Label Badge */}
                      <span
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center shrink-0 shadow-2xs ${
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

                      <div className="flex-1 min-w-0 pr-2 break-words">
                        <LatexPreview content={item.text} className="leading-snug" />
                        {/* Connected Target Pills (Visible on both mobile & desktop!) */}
                        {matchedTargets.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {matchedTargets.map((t) => (
                              <span
                                key={t}
                                onClick={(e) => {
                                  if (!isInteractive) return;
                                  e.stopPropagation();
                                  handleRemoveSingleWire(label, t);
                                }}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white shadow-2xs ${
                                  isInteractive ? "hover:opacity-85 cursor-pointer" : ""
                                }`}
                                style={{ backgroundColor: lineColor }}
                                title={isInteractive ? `Chạm để gỡ mạch [${label}] ➔ [${t}]` : undefined}
                              >
                                <span>➔ {t}</span>
                                {isInteractive && <X className="w-2.5 h-2.5 ml-0.5" />}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Touch-Safe Drag Handle + Precision Anchor Dot */}
                      <div
                        data-drag-handle="left"
                        onPointerDown={(e) => handleAnchorHandlePointerDown(e, "left", label)}
                        style={{ touchAction: isInteractive ? "none" : "auto" }}
                        className={`w-8 h-8 -right-4 top-1/2 -translate-y-1/2 absolute flex items-center justify-center z-30 ${
                          isInteractive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
                        }`}
                        title={isInteractive ? "Kéo chấm tròn sang Cột 2 hoặc chạm thẻ để nối" : undefined}
                      >
                        <div
                          data-anchor-left={idx}
                          className={`w-4 h-4 rounded-full border-2 shadow-xs transition-transform ${
                            isSelected
                              ? "bg-blue-600 border-white ring-4 ring-blue-400/50 scale-125"
                              : isMatched
                              ? "border-white"
                              : "bg-slate-300 border-white"
                          }`}
                          style={isMatched && !isSelected ? { backgroundColor: lineColor } : undefined}
                        />
                      </div>
                    </div>

                    {/* Mobile Inline Quick-Pick Strip right below selected Left item! */}
                    {isInteractive && isSelected && rightItems.length > 0 && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-blue-50/90 border border-blue-200 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150"
                      >
                        <span className="text-[10px] font-extrabold text-blue-800 w-full sm:w-auto">
                          Nối nhanh [{label}] với:
                        </span>
                        {rightItems.map((rIt, rIdx) => {
                          const rLbl = getRightItemLabel(rIdx, rIt);
                          const active = matchedTargets.some(
                            (t) => t.toLowerCase() === rLbl.toLowerCase()
                          );
                          return (
                            <button
                              key={rIt.id || rIdx}
                              type="button"
                              onClick={() => {
                                commitConnection(label, rLbl);
                                if (effectiveMode === "one_to_one") {
                                  setSelectedAnchor(null);
                                  setPointerPos(null);
                                }
                              }}
                              className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                                active
                                  ? "bg-blue-600 text-white border-blue-700 shadow-2xs"
                                  : "bg-white text-indigo-700 border-blue-200 hover:bg-blue-100"
                              }`}
                              title={`${rLbl}. ${rIt.text}`}
                            >
                              {rLbl}
                              {active ? " ✓" : ""}
                            </button>
                          );
                        })}
                        {matchedTargets.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              handleRemoveSingleWire(label);
                              setSelectedAnchor(null);
                            }}
                            className="h-7 px-2 rounded-lg text-[11px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 cursor-pointer"
                          >
                            Không nối
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Column 2 (Right: a..z) */}
            <div className="space-y-2.5 sm:space-y-3 min-w-0">
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>
                  Cột 2 (a ➔ {rightItems.length > 0 ? getRightItemLabel(rightItems.length - 1, rightItems[rightItems.length - 1]) : "z"})
                </span>
              </div>

              {rightItems.map((item, idx) => {
                const label = getRightItemLabel(idx, item);
                const connectedLefts = rightToLeftMap[label.toLowerCase()] || [];
                const isMatched = connectedLefts.length > 0;
                const isSelectedRight =
                  selectedAnchor?.side === "right" && selectedAnchor.key === label;
                const isTargetableFromLeft =
                  isInteractive && selectedAnchor?.side === "left";
                const isHovered =
                  hoveredTarget?.side === "right" && hoveredTarget.key === label;

                return (
                  <div key={item.id || idx} className="space-y-1.5">
                    <div
                      data-right-card-label={label}
                      onClick={() => handleRightCardClick(label)}
                      onPointerEnter={() => {
                        if (isTargetableFromLeft) {
                          setHoveredTarget({ side: "right", key: label });
                        }
                      }}
                      onPointerLeave={() => {
                        if (hoveredTarget?.side === "right" && hoveredTarget.key === label) {
                          setHoveredTarget(null);
                        }
                      }}
                      className={`relative p-2.5 sm:p-3.5 rounded-xl border transition-all text-xs sm:text-sm flex items-start gap-2 ${
                        isInteractive ? "cursor-pointer active:scale-[0.99]" : ""
                      } ${
                        isSelectedRight
                          ? "bg-indigo-50 border-indigo-600 ring-2 ring-indigo-300 shadow-sm"
                          : isTargetableFromLeft
                          ? isHovered
                            ? "bg-blue-100 border-blue-600 ring-2 ring-blue-400 shadow-sm"
                            : "bg-blue-50/50 border-blue-400 hover:bg-blue-100/70 hover:border-blue-600 shadow-2xs"
                          : isMatched
                          ? "bg-slate-50/90 border-slate-300 text-slate-900"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {/* Touch-Safe Drag Handle + Precision Anchor Dot */}
                      <div
                        data-drag-handle="right"
                        onPointerDown={(e) => handleAnchorHandlePointerDown(e, "right", label)}
                        style={{ touchAction: isInteractive ? "none" : "auto" }}
                        className={`w-8 h-8 -left-4 top-1/2 -translate-y-1/2 absolute flex items-center justify-center z-30 ${
                          isInteractive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
                        }`}
                        title={isInteractive ? "Kéo chấm tròn sang Cột 1 hoặc chạm thẻ để nối" : undefined}
                      >
                        <div
                          data-anchor-right={idx}
                          className={`w-4 h-4 rounded-full border-2 shadow-xs transition-transform ${
                            isHovered || isSelectedRight
                              ? "bg-indigo-600 border-white ring-4 ring-indigo-400/50 scale-125"
                              : isTargetableFromLeft
                              ? "bg-blue-500 border-white ring-2 ring-blue-300 scale-110"
                              : isMatched
                              ? isAnswerKeyPreview
                                ? "bg-emerald-600 border-white"
                                : "bg-indigo-600 border-white"
                              : "bg-slate-300 border-white"
                          }`}
                        />
                      </div>

                      {/* Right Label Badge */}
                      <span
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center shrink-0 shadow-2xs ml-1 ${
                          isSelectedRight
                            ? "bg-indigo-600 text-white"
                            : isMatched
                            ? isAnswerKeyPreview
                              ? "bg-emerald-600 text-white"
                              : "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {label}
                      </span>

                      <div className="flex-1 min-w-0 break-words">
                        <LatexPreview content={item.text} className="leading-snug" />
                        {connectedLefts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {connectedLefts.map((lKey) => (
                              <span
                                key={lKey}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200"
                              >
                                [{lKey}] ➔
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Quick-Pick Strip when Right item is selected */}
                    {isInteractive && isSelectedRight && leftItems.length > 0 && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-indigo-50/90 border border-indigo-200 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150"
                      >
                        <span className="text-[10px] font-extrabold text-indigo-800 w-full sm:w-auto">
                          Nối [{label}] từ Cột 1:
                        </span>
                        {leftItems.map((lIt, lIdx) => {
                          const lLbl = getLeftItemLabel(lIdx, lIt);
                          const active = connectedLefts.some(
                            (k) => k.toLowerCase() === lLbl.toLowerCase()
                          );
                          return (
                            <button
                              key={lIt.id || lIdx}
                              type="button"
                              onClick={() => {
                                commitConnection(lLbl, label);
                                if (effectiveMode === "one_to_one") {
                                  setSelectedAnchor(null);
                                  setPointerPos(null);
                                }
                              }}
                              className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                                active
                                  ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                                  : "bg-white text-blue-700 border-indigo-200 hover:bg-indigo-100"
                              }`}
                              title={`${lLbl}. ${lIt.text}`}
                            >
                              {lLbl}
                              {active ? " ✓" : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ================= VIEW 2: FULL-WIDTH MOBILE QUICK-CARDS MODE ================= */
        <div className="space-y-4">
          {/* Reference Box for Column 2 (Full width, easy to read formulas & long options on mobile) */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center justify-between">
              <span>Danh mục Cột 2 (a ➔ {rightItems.length > 0 ? getRightItemLabel(rightItems.length - 1, rightItems[rightItems.length - 1]) : "z"})</span>
              <span className="text-[11px] font-semibold text-indigo-600">Đọc & bấm chọn ở dưới</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rightItems.map((rItem, rIdx) => {
                const rLabel = getRightItemLabel(rIdx, rItem);
                const usedBy = rightToLeftMap[rLabel.toLowerCase()] || [];
                return (
                  <div
                    key={rItem.id || rIdx}
                    className={`p-2.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2 bg-white ${
                      usedBy.length > 0 ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        usedBy.length > 0
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {rLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <LatexPreview content={rItem.text} className="leading-snug" />
                    </div>
                    {usedBy.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold shrink-0">
                        ← [{usedBy.join(", ")}]
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full-width Cột 1 Cards with Large Thumb-Friendly Option Buttons */}
          <div className="space-y-3">
            {leftItems.map((lItem, lIdx) => {
              const lLabel = getLeftItemLabel(lIdx, lItem);
              const matchedTargets = normalizedMatches[lLabel] || [];
              const lineColor = LINE_COLORS[lIdx % LINE_COLORS.length];

              return (
                <div
                  key={lItem.id || lIdx}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 text-white shadow-2xs"
                      style={{ backgroundColor: matchedTargets.length > 0 ? lineColor : "#475569" }}
                    >
                      {lLabel}
                    </span>
                    <div className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-900">
                      <LatexPreview content={lItem.text} className="leading-relaxed" />
                    </div>
                  </div>

                  {/* Large Tap Pills for every Right Item + Unconnected button */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                      <span>
                        {effectiveMode === "multiple"
                          ? "Chạm để chọn 1 hoặc nhiều mục Cột 2 (hoặc để trống):"
                          : "Chạm để chọn 1 mục Cột 2 (hoặc để trống):"}
                      </span>
                      {matchedTargets.length > 0 ? (
                        <span className="text-blue-700 font-extrabold">
                          Đã nối: [{matchedTargets.join(", ")}]
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Không nối</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {rightItems.map((rItem, rIdx) => {
                        const rLabel = getRightItemLabel(rIdx, rItem);
                        const isSelected = matchedTargets.some(
                          (t) => t.toLowerCase() === rLabel.toLowerCase()
                        );
                        return (
                          <button
                            key={rItem.id || rIdx}
                            type="button"
                            onClick={() => commitConnection(lLabel, rLabel)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 text-left ${
                              isSelected
                                ? "text-white border-transparent shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                            style={isSelected ? { backgroundColor: lineColor } : undefined}
                          >
                            <span
                              className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-white/20 text-white" : "bg-white border border-slate-300 text-indigo-700"
                              }`}
                            >
                              {rLabel}
                            </span>
                            <span className="line-clamp-1 max-w-[180px] sm:max-w-[240px]">
                              {rItem.text.replace(/\$+/g, "")}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}

                      {matchedTargets.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleWire(lLabel)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100 transition-colors cursor-pointer active:scale-95"
                        >
                          Để trống (Không nối)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matched Pairs & Unconnected Distractors Summary Bar */}
      {(isInteractive || isReview || isAnswerKeyPreview || totalWiresCount > 0) && (
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 flex-wrap gap-1">
            <div className="flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {isAnswerKeyPreview
                  ? "Đáp án các mạch nối chuẩn:"
                  : isReview
                  ? "Đối chiếu kết quả nối của bạn:"
                  : "Các mạch đã nối:"}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {isAnswerKeyPreview
                ? `${Object.values(normalizedCorrectMatches).reduce((s, a) => s + a.length, 0)} mạch đáp án`
                : `${totalWiresCount} mạch đã nối`}
            </span>
          </div>

          {/* Answer-Key Preview Summary */}
          {isAnswerKeyPreview ? (
            <div className="space-y-2">
              {Object.keys(normalizedCorrectMatches).length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Chưa thiết lập mạch nối đáp án nào (tất cả các ô đang để trống).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {leftItems.map((lItem, idx) => {
                    const leftKey = getLeftItemLabel(idx, lItem);
                    const targets = normalizedCorrectMatches[leftKey] || [];
                    if (targets.length === 0) return null;
                    return (
                      <div
                        key={leftKey}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs"
                      >
                        <span className="font-extrabold px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[11px]">
                          [{leftKey}]
                        </span>
                        <ArrowRight className="w-3 h-3 text-emerald-600" />
                        <span className="font-extrabold text-emerald-800">
                          [{targets.join(", ")}]
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(unconnectedInfo.unconnectedLeftLabels.length > 0 ||
                unconnectedInfo.unconnectedRightLabels.length > 0) && (
                <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold text-slate-700">Ô không cần nối (gây nhiễu):</span>
                  {unconnectedInfo.unconnectedLeftLabels.length > 0 && (
                    <span>
                      Cột 1:{" "}
                      <strong className="text-slate-900">
                        [{unconnectedInfo.unconnectedLeftLabels.join(", ")}]
                      </strong>
                    </span>
                  )}
                  {unconnectedInfo.unconnectedRightLabels.length > 0 && (
                    <span>
                      Cột 2:{" "}
                      <strong className="text-slate-900">
                        [{unconnectedInfo.unconnectedRightLabels.join(", ")}]
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : isReview ? (
            /* Student Post-Submission Review Summary */
            <div className="flex flex-wrap gap-2">
              {leftItems.map((lItem, idx) => {
                const leftKey = getLeftItemLabel(idx, lItem);
                const userTargets = normalizedMatches[leftKey] || [];
                const corrTargets = normalizedCorrectMatches[leftKey] || [];
                const lineColor = LINE_COLORS[idx % LINE_COLORS.length];

                // Case 1: Unconnected distractor row in Cột 1
                if (corrTargets.length === 0) {
                  if (userTargets.length === 0) {
                    return (
                      <div
                        key={leftKey}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50/70 text-emerald-800 border border-emerald-200"
                      >
                        <span className="font-extrabold px-1.5 py-0.5 rounded bg-slate-500 text-white text-[11px]">
                          [{leftKey}]
                        </span>
                        <span>Không nối</span>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={leftKey}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-800 border border-red-300"
                    >
                      <span
                        className="font-extrabold px-1.5 py-0.5 rounded text-white text-[11px]"
                        style={{ backgroundColor: lineColor }}
                      >
                        [{leftKey}]
                      </span>
                      <ArrowRight className="w-3 h-3 text-red-400" />
                      <span>[{userTargets.join(", ")}]</span>
                      <span className="text-[11px] font-normal text-red-700">
                        (Đúng: <strong>Không nối</strong>)
                      </span>
                    </div>
                  );
                }

                // Case 2: Row has required target(s)
                const corrLower = new Set(corrTargets.map((t) => t.toLowerCase()));
                const isExactRowMatch =
                  userTargets.length === corrTargets.length &&
                  userTargets.every((t) => corrLower.has(t.toLowerCase()));

                return (
                  <div
                    key={leftKey}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${
                      isExactRowMatch
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-red-50 text-red-800 border-red-300"
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
                      [{userTargets.length > 0 ? userTargets.join(", ") : "Chưa nối"}]
                    </span>
                    {isExactRowMatch ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 inline ml-0.5" />
                    ) : (
                      <span className="text-[11px] font-normal text-red-600 ml-1">
                        (Đúng: <strong>[{corrTargets.join(", ")}]</strong>)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Active Interactive Summary */
            <>
              {totalWiresCount === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Chưa có mạch nối nào. Chạm 1 ô ở Cột 1 rồi chạm ô ở Cột 2 (hoặc chuyển sang{" "}
                  <strong>Ghép nhanh ĐT</strong> trên điện thoại) để nối.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {leftItems.map((lItem, idx) => {
                    const leftKey = getLeftItemLabel(idx, lItem);
                    const targets = normalizedMatches[leftKey] || [];
                    if (targets.length === 0) return null;
                    const lineColor = LINE_COLORS[idx % LINE_COLORS.length];

                    return targets.map((rKey) => (
                      <div
                        key={`${leftKey}-${rKey}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        <span
                          className="font-extrabold px-1.5 py-0.5 rounded text-white text-[11px]"
                          style={{ backgroundColor: lineColor }}
                        >
                          [{leftKey}]
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-extrabold text-indigo-700">[{rKey}]</span>
                        {isInteractive && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSingleWire(leftKey, rKey)}
                            className="ml-0.5 text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                            title="Gỡ mạch nối này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ));
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
