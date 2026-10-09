/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Puzzle Interaction Modal Component
 * Renders tactile Keypad, Sequence Arranger, Dial Rotors, Knowledge Quiz, Multi-Lock, and 3-Tier Progressive Hints.
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Lock,
  Unlock,
  KeyRound,
  HelpCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  Delete,
} from "lucide-react";
import { PuzzleDefinition, HintTier } from "../types/escapeRoom";
import { escapeAudio } from "../utils/escapeAudio";

interface PuzzleInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzle: PuzzleDefinition;
  isAlreadySolved: boolean;
  playerInventoryItemIds: string[];
  currentHintTier: HintTier | 0;
  onRequestHint: (tier: HintTier) => void;
  onSolve: (answer: {
    code?: string;
    order?: string[];
    dialChoices?: Record<string, string>;
    selectedIndex?: number;
  }) => { isCorrect: boolean; message: string };
}

export const PuzzleInteractionModal: React.FC<PuzzleInteractionModalProps> = ({
  isOpen,
  onClose,
  puzzle,
  isAlreadySolved,
  playerInventoryItemIds,
  currentHintTier,
  onRequestHint,
  onSolve,
}) => {
  // Keypad state
  const [keyCode, setKeyCode] = useState<string>("");
  // Sequence state
  const [sequenceOrder, setSequenceOrder] = useState<string[]>([]);
  // Dial state
  const [dialChoices, setDialChoices] = useState<Record<string, string>>({});
  // Knowledge state
  const [selectedKnowledgeIndex, setSelectedKnowledgeIndex] = useState<number | null>(null);

  // Status message state
  const [feedback, setFeedback] = useState<{ isError: boolean; message: string } | null>(null);
  // Hint drawer state
  const [showHintDrawer, setShowHintDrawer] = useState<boolean>(false);

  // Initialize state based on puzzle definition
  useEffect(() => {
    setFeedback(null);
    setKeyCode("");

    if (puzzle.type === "sequence" && puzzle.config.sequence) {
      // Default initial order (shuffled or current config order)
      const initial = puzzle.config.sequence.items.map((i) => i.id);
      setSequenceOrder(initial);
    }

    if (puzzle.type === "dial" && puzzle.config.dial) {
      const initialChoices: Record<string, string> = {};
      puzzle.config.dial.rings.forEach((ring) => {
        initialChoices[ring.id] = ring.options[0] || "";
      });
      setDialChoices(initialChoices);
    }

    if (puzzle.type === "knowledge") {
      setSelectedKnowledgeIndex(null);
    }
  }, [puzzle]);

  if (!isOpen) return null;

  // Handle Keypad Buttons
  const handleKeypadPress = (val: string) => {
    escapeAudio.playClick();
    const maxLen = puzzle.config.keypad?.codeLength || 4;
    if (keyCode.length < maxLen) {
      setKeyCode((prev) => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    escapeAudio.playClick();
    setKeyCode((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    escapeAudio.playClick();
    setKeyCode("");
  };

  // Handle Sequence Reorder via Up/Down buttons (Mobile first-class accessible)
  const handleMoveSequence = (index: number, direction: "up" | "down") => {
    escapeAudio.playClick();
    const newOrder = [...sequenceOrder];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setSequenceOrder(newOrder);
  };

  // Handle Dial Rotation
  const handleRotateDial = (ringId: string, direction: "next" | "prev") => {
    escapeAudio.playClick();
    const ring = puzzle.config.dial?.rings.find((r) => r.id === ringId);
    if (!ring) return;

    const currentOpt = dialChoices[ringId] || ring.options[0];
    const currIdx = ring.options.indexOf(currentOpt);
    let nextIdx = direction === "next" ? currIdx + 1 : currIdx - 1;

    if (nextIdx >= ring.options.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = ring.options.length - 1;

    setDialChoices((prev) => ({
      ...prev,
      [ringId]: ring.options[nextIdx],
    }));
  };

  // Submit Answer
  const handleSubmit = () => {
    let payload: {
      code?: string;
      order?: string[];
      dialChoices?: Record<string, string>;
      selectedIndex?: number;
    } = {};

    if (puzzle.type === "keypad") {
      payload = { code: keyCode };
    } else if (puzzle.type === "sequence") {
      payload = { order: sequenceOrder };
    } else if (puzzle.type === "dial") {
      payload = { dialChoices };
    } else if (puzzle.type === "knowledge") {
      if (selectedKnowledgeIndex === null) {
        setFeedback({ isError: true, message: "Vui lòng chọn một đáp án." });
        return;
      }
      payload = { selectedIndex: selectedKnowledgeIndex };
    } else if (puzzle.type === "multi-lock") {
      payload = {};
    }

    const result = onSolve(payload);
    if (result.isCorrect) {
      escapeAudio.playUnlock();
      setFeedback({ isError: false, message: result.message });
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      escapeAudio.playError();
      setFeedback({ isError: true, message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {puzzle.title}
              </h2>
              <span className="text-xs text-indigo-300 font-medium">
                {isAlreadySolved ? "✓ Đã giải mã thành công" : "Cơ chế phong ấn cổ đại"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Lore Intro */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-sm text-slate-300 font-serif italic leading-relaxed">
            "{puzzle.loreIntro}"
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-medium ${
                feedback.isError
                  ? "bg-red-950/80 border border-red-500/50 text-red-200"
                  : "bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 animate-pulse"
              }`}
            >
              {feedback.isError ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* 1. KEYPAD PUZZLE */}
          {puzzle.type === "keypad" && (
            <div className="space-y-4 max-w-xs mx-auto">
              {/* Screen Readout */}
              <div className="py-4 px-6 rounded-2xl bg-slate-950 border-2 border-indigo-500/60 text-center font-mono text-3xl font-extrabold tracking-widest text-cyan-300 shadow-inner">
                {keyCode.padEnd(puzzle.config.keypad?.codeLength || 4, "-")}
              </div>

              {/* Number Pad Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 active:text-white border border-slate-700 text-lg font-bold text-slate-100 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-14 rounded-2xl bg-slate-800/60 hover:bg-red-950/60 border border-slate-700 text-xs font-bold text-red-400 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center uppercase tracking-wider"
                >
                  Xóa hết
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress("0")}
                  className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 active:text-white border border-slate-700 text-lg font-bold text-slate-100 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700 active:bg-indigo-600 border border-slate-700 text-sm font-bold text-slate-300 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center"
                  aria-label="Lùi một ký tự"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* 2. SEQUENCE PUZZLE */}
          {puzzle.type === "sequence" && puzzle.config.sequence && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Sử dụng mũi tên ⬆ ⬇ để đổi vị trí các công đoạn theo đúng quy trình:
              </p>
              <div className="space-y-2.5">
                {sequenceOrder.map((itemId, idx) => {
                  const item = puzzle.config.sequence?.items.find((i) => i.id === itemId);
                  if (!item) return null;
                  return (
                    <div
                      key={itemId}
                      className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-100">
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSequence(idx, "up")}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none text-slate-200 transition-colors"
                          aria-label="Di chuyển lên"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sequenceOrder.length - 1}
                          onClick={() => handleMoveSequence(idx, "down")}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none text-slate-200 transition-colors"
                          aria-label="Di chuyển xuống"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DIAL PUZZLE */}
          {puzzle.type === "dial" && puzzle.config.dial && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Xoay các vòng định luật để khớp đúng đại lượng không đổi của từng đẳng quá trình:
              </p>
              <div className="space-y-3">
                {puzzle.config.dial.rings.map((ring) => {
                  const currentSelection = dialChoices[ring.id] || ring.options[0];
                  return (
                    <div
                      key={ring.id}
                      className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2 shadow-md"
                    >
                      <span className="text-xs font-bold text-cyan-300">{ring.label}</span>
                      <div className="flex items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleRotateDial(ring.id, "prev")}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                          aria-label="Chọn lựa chọn trước"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <span className="text-xs sm:text-sm font-semibold text-center text-slate-100 flex-1 px-2">
                          {currentSelection}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRotateDial(ring.id, "next")}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                          aria-label="Chọn lựa chọn kế tiếp"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. KNOWLEDGE PUZZLE */}
          {puzzle.type === "knowledge" && puzzle.config.knowledge && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                  {puzzle.config.knowledge.topic}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                {puzzle.config.knowledge.question}
              </h3>
              <div className="space-y-2.5">
                {puzzle.config.knowledge.options.map((opt, idx) => {
                  const isSelected = selectedKnowledgeIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        escapeAudio.playClick();
                        setSelectedKnowledgeIndex(idx);
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "bg-indigo-600/30 border-indigo-400 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 text-slate-200"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-700/80 text-slate-300"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-relaxed flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. MULTI-LOCK PUZZLE */}
          {puzzle.type === "multi-lock" && puzzle.config.multiLock && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-300 leading-relaxed font-serif">
                {puzzle.config.multiLock.prompt}
              </p>
              <div className="flex items-center justify-center gap-3 py-4">
                {puzzle.config.multiLock.requiredItemIds.map((itemId) => {
                  const hasItem = playerInventoryItemIds.includes(itemId);
                  return (
                    <div
                      key={itemId}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-2 min-w-[110px] ${
                        hasItem
                          ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                          : "bg-slate-800/40 border-slate-700/50 text-slate-500"
                      }`}
                    >
                      {hasItem ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                      ) : (
                        <Lock className="w-8 h-8 text-slate-600" />
                      )}
                      <span className="text-[11px] font-bold">
                        {hasItem ? "Đã có vật phẩm" : "Chưa có"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progressive Hint Drawer Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                escapeAudio.playClick();
                setShowHintDrawer(!showHintDrawer);
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold text-amber-300 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Gợi ý giải đố phân tầng (3 Cấp)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                {currentHintTier > 0 ? `Cấp ${currentHintTier}/3` : "Chưa dùng"}
              </span>
            </button>

            {/* Hint Details */}
            {showHintDrawer && (
              <div className="mt-3 p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                {/* Tier 1 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300">
                      Cấp 1: Gợi ý định hướng (-5đ)
                    </span>
                    {currentHintTier >= 1 ? (
                      <span className="text-[10px] text-emerald-400">Đã mở</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestHint(1)}
                        className="text-[10px] font-bold text-amber-200 underline cursor-pointer"
                      >
                        Mở gợi ý Cấp 1
                      </button>
                    )}
                  </div>
                  {currentHintTier >= 1 && (
                    <p className="text-xs text-amber-200/90 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      {puzzle.hints.tier1Nudge}
                    </p>
                  )}
                </div>

                {/* Tier 2 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300">
                      Cấp 2: Hướng dẫn suy luận (-12đ)
                    </span>
                    {currentHintTier >= 2 ? (
                      <span className="text-[10px] text-emerald-400">Đã mở</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestHint(2)}
                        className="text-[10px] font-bold text-amber-200 underline cursor-pointer"
                      >
                        Mở gợi ý Cấp 2
                      </button>
                    )}
                  </div>
                  {currentHintTier >= 2 && (
                    <p className="text-xs text-amber-200/90 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      {puzzle.hints.tier2Reasoning}
                    </p>
                  )}
                </div>

                {/* Tier 3 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300">
                      Cấp 3: Lời giải & Đáp án chi tiết (-20đ)
                    </span>
                    {currentHintTier >= 3 ? (
                      <span className="text-[10px] text-emerald-400">Đã mở</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestHint(3)}
                        className="text-[10px] font-bold text-amber-200 underline cursor-pointer"
                      >
                        Mở giải pháp Cấp 3
                      </button>
                    )}
                  </div>
                  {currentHintTier >= 3 && (
                    <p className="text-xs text-amber-200/90 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 font-mono">
                      {puzzle.hints.tier3Solution}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Xác nhận giải mã</span>
          </button>
        </div>
      </div>
    </div>
  );
};
