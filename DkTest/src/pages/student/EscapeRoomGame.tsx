/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EscapeRoomGame - Complete Interactive Educational Puzzle Game
 * "The Lost Archive" (Kho Lưu Trữ Thất Lạc)
 */

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  KeyRound,
  BookOpen,
  Briefcase,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  Layers,
  Award,
  AlertCircle,
} from "lucide-react";
import {
  EscapeRoomSession,
  ChamberId,
  InteractiveObject,
  PuzzleDefinition,
  InventoryItem,
  HintTier,
} from "../../features/escape-room/types/escapeRoom";
import { EscapeRoomEngine } from "../../features/escape-room/services/escapeRoomEngine";
import { LOST_ARCHIVE_CAMPAIGN } from "../../features/escape-room/data/lostArchiveCampaign";
import { RoomViewport } from "../../features/escape-room/components/RoomViewport";
import { ClueNotebookModal } from "../../features/escape-room/components/ClueNotebookModal";
import { PuzzleInteractionModal } from "../../features/escape-room/components/PuzzleInteractionModal";
import { RoomSummaryModal } from "../../features/escape-room/components/RoomSummaryModal";
import { AmbientSoundControls } from "../../features/escape-room/components/AmbientSoundControls";
import { escapeAudio } from "../../features/escape-room/utils/escapeAudio";

export default function EscapeRoomGame() {
  // Session state
  const [session, setSession] = useState<EscapeRoomSession>(() => {
    return EscapeRoomEngine.loadSession() || EscapeRoomEngine.createInitialSession();
  });

  // UI state
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [notebookTab, setNotebookTab] = useState<"inventory" | "clues">("clues");
  const [activePuzzle, setActivePuzzle] = useState<PuzzleDefinition | null>(null);
  const [bannerToast, setBannerToast] = useState<{ text: string; type: "info" | "success" | "warn" } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentChamber = EscapeRoomEngine.getChamber(session.currentChamberId);

  // Helper to show transient notification toast
  const showToast = (text: string, type: "info" | "success" | "warn" = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setBannerToast({ text, type });
    toastTimerRef.current = setTimeout(() => {
      setBannerToast(null);
    }, 4500);
  };

  // Timer loop
  useEffect(() => {
    if (session.isCompleted) return;

    const timer = setInterval(() => {
      setSession((prev) => {
        const next = { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.isCompleted]);

  // Handle Object click in viewport
  const handleSelectObject = (obj: InteractiveObject) => {
    escapeAudio.playClick();

    // 1. If object requires a puzzle that is not solved yet
    if (obj.requiresPuzzleId && !session.solvedPuzzleIds.includes(obj.requiresPuzzleId)) {
      const puzzle = EscapeRoomEngine.getPuzzle(obj.requiresPuzzleId);
      if (puzzle) {
        setActivePuzzle(puzzle);
        return;
      }
    }

    // 2. Perform object interaction through Engine
    const result = EscapeRoomEngine.interactWithObject(session, obj.id);
    setSession(result.updatedSession);

    if (result.triggerPuzzleId && !session.solvedPuzzleIds.includes(result.triggerPuzzleId)) {
      const puzzle = EscapeRoomEngine.getPuzzle(result.triggerPuzzleId);
      if (puzzle) {
        setActivePuzzle(puzzle);
        return;
      }
    }

    // Audio cues for discoveries
    if (result.newItems.length > 0 || result.newClues.length > 0) {
      escapeAudio.playClueFound();
      const names = [
        ...result.newItems.map((i) => `Vật phẩm: [${i.name}]`),
        ...result.newClues.map((c) => `Manh mối: [${c.title}]`),
      ].join(" • ");
      showToast(`Đã phát hiện! ${names}`, "success");
    } else {
      escapeAudio.playInspect();
      showToast(result.message, result.isSuccess ? "info" : "warn");
    }

    // Door transition check
    if (result.triggerTransitionChamberId) {
      const isDoorOpen = session.unlockedObjectIds.includes(obj.id) ||
        (obj.requiresPuzzleId && session.solvedPuzzleIds.includes(obj.requiresPuzzleId));

      if (isDoorOpen) {
        handleChamberTransition(result.triggerTransitionChamberId);
      }
    }
  };

  // Handle Chamber navigation
  const handleChamberTransition = (targetChamberId: ChamberId) => {
    escapeAudio.playUnlock();
    const updated = EscapeRoomEngine.moveToChamber(session, targetChamberId);
    setSession(updated);
    const newChamberDef = EscapeRoomEngine.getChamber(targetChamberId);
    showToast(`Bạn đã tiến vào: ${newChamberDef.name}!`, "success");
  };

  // Handle item use from Inventory
  const handleUseItem = (item: InventoryItem) => {
    if (!item.usableOnObjectId) {
      showToast(`${item.name} không thể sử dụng ở đây lúc này.`, "info");
      return;
    }

    const targetObj = EscapeRoomEngine.getObject(item.usableOnObjectId);
    if (!targetObj || targetObj.chamberId !== session.currentChamberId) {
      showToast(`${item.name} chỉ có thể kích hoạt ở phòng chứa cơ cấu phù hợp.`, "warn");
      return;
    }

    const result = EscapeRoomEngine.interactWithObject(session, targetObj.id, item.id);
    setSession(result.updatedSession);

    if (result.isSuccess) {
      escapeAudio.playUnlock();
      showToast(item.usableMessage || result.message, "success");
    } else {
      showToast(result.message, "warn");
    }
  };

  // Handle puzzle solving
  const handleSolvePuzzle = (answer: {
    code?: string;
    order?: string[];
    dialChoices?: Record<string, string>;
    selectedIndex?: number;
  }) => {
    if (!activePuzzle) return { isCorrect: false, message: "Không tìm thấy câu đố." };

    const result = EscapeRoomEngine.solvePuzzle(session, activePuzzle.id, answer);
    setSession(result.updatedSession);

    if (result.isCorrect) {
      if (result.newItems.length > 0 || result.newClues.length > 0) {
        escapeAudio.playClueFound();
        const names = [
          ...result.newItems.map((i) => `Vật phẩm: [${i.name}]`),
          ...result.newClues.map((c) => `Manh mối: [${c.title}]`),
        ].join(" • ");
        showToast(`Mở khóa thành công! Nhận được: ${names}`, "success");
      }
    }

    return {
      isCorrect: result.isCorrect,
      message: result.message,
    };
  };

  // Handle hint requests
  const handleRequestHint = (tier: HintTier) => {
    if (!activePuzzle) return;
    escapeAudio.playClick();
    const res = EscapeRoomEngine.requestHint(session, activePuzzle.id, tier);
    setSession(res.updatedSession);
  };

  // Reset Game
  const handleResetGame = () => {
    EscapeRoomEngine.clearSession();
    const fresh = EscapeRoomEngine.createInitialSession();
    setSession(fresh);
    setShowResetConfirm(false);
    setActivePuzzle(null);
    setIsNotebookOpen(false);
    showToast("Đã khởi động lại phòng mật mã từ đầu!", "info");
  };

  // Formatted Timer string
  const minutes = Math.floor(session.elapsedSeconds / 60);
  const seconds = session.elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const resolvedInventory = EscapeRoomEngine.getSessionInventory(session);

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-x-hidden">
      {/* Top Game Navigation & Status Bar */}
      <header className="h-14 sm:h-16 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/journey"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            title="Về Bản đồ Hành trình"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-xs font-bold">Hành Trình</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <KeyRound className="w-4 h-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight line-clamp-1">
                {LOST_ARCHIVE_CAMPAIGN.title}
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {currentChamber.name} ({currentChamber.order}/3)
              </span>
            </div>
          </div>
        </div>

        {/* Center: Chamber Progression Breadcrumb (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-950/60 rounded-full border border-slate-800 text-xs font-semibold">
          {Object.values(LOST_ARCHIVE_CAMPAIGN.chambers).map((ch, idx) => {
            const isCurrent = session.currentChamberId === ch.id;
            const isPassed = ch.order < currentChamber.order;

            return (
              <React.Fragment key={ch.id}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                <button
                  type="button"
                  disabled={ch.order > currentChamber.order}
                  onClick={() => handleChamberTransition(ch.id)}
                  className={`px-2.5 py-0.5 rounded-full transition-colors ${
                    isCurrent
                      ? "bg-indigo-600 text-white font-bold"
                      : isPassed
                      ? "text-emerald-400 hover:bg-slate-800 cursor-pointer"
                      : "text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {ch.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Actions: Timer, Inventory & Clues, Sound */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timer Display */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeFormatted}</span>
          </div>

          {/* Clues Notebook Button */}
          <button
            type="button"
            onClick={() => {
              escapeAudio.playClick();
              setNotebookTab("clues");
              setIsNotebookOpen(true);
            }}
            className="relative p-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-300 hover:text-indigo-100 transition-colors cursor-pointer"
            title="Mở Sổ Tay Manh Mối"
            aria-label="Mở Sổ Tay Manh Mối"
          >
            <BookOpen className="w-4 h-4" />
            {session.discoveredClues.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                {session.discoveredClues.length}
              </span>
            )}
          </button>

          {/* Inventory Button */}
          <button
            type="button"
            onClick={() => {
              escapeAudio.playClick();
              setNotebookTab("inventory");
              setIsNotebookOpen(true);
            }}
            className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Mở Túi Đồ"
            aria-label="Mở Túi Đồ"
          >
            <Briefcase className="w-4 h-4" />
            {session.inventoryItemIds.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {session.inventoryItemIds.length}
              </span>
            )}
          </button>

          {/* Ambient Sound & Accessibility Controls */}
          <AmbientSoundControls
            reducedMotion={reducedMotion}
            onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
            onResetGame={() => setShowResetConfirm(true)}
          />
        </div>
      </header>

      {/* Toast Notification Banner */}
      {bannerToast && (
        <div className="fixed top-16 sm:top-20 inset-x-4 sm:inset-x-auto sm:right-6 z-40 max-w-md mx-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`p-3.5 rounded-2xl shadow-xl flex items-center gap-3 border ${
              bannerToast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-100"
                : bannerToast.type === "warn"
                ? "bg-amber-950/90 border-amber-500/60 text-amber-100"
                : "bg-slate-900/95 border-indigo-500/60 text-slate-100"
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0 text-cyan-400" />
            <p className="text-xs sm:text-sm font-medium leading-relaxed">{bannerToast.text}</p>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 p-2 sm:p-4 md:p-6 flex flex-col justify-center items-center">
        <div className="w-full max-w-5xl h-full flex flex-col">
          <RoomViewport
            chamber={currentChamber}
            unlockedObjectIds={session.unlockedObjectIds}
            solvedPuzzleIds={session.solvedPuzzleIds}
            onSelectObject={handleSelectObject}
            reducedMotion={reducedMotion}
          />
        </div>
      </main>

      {/* Clue Notebook & Inventory Modal */}
      <ClueNotebookModal
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        inventory={resolvedInventory}
        clues={session.discoveredClues}
        initialTab={notebookTab}
        onUseItem={handleUseItem}
      />

      {/* Puzzle Interaction Modal */}
      {activePuzzle && (
        <PuzzleInteractionModal
          isOpen={Boolean(activePuzzle)}
          onClose={() => setActivePuzzle(null)}
          puzzle={activePuzzle}
          isAlreadySolved={session.solvedPuzzleIds.includes(activePuzzle.id)}
          playerInventoryItemIds={session.inventoryItemIds}
          currentHintTier={session.hintsRequested[activePuzzle.id] || 0}
          onRequestHint={handleRequestHint}
          onSolve={handleSolvePuzzle}
        />
      )}

      {/* Room Summary / Victory Screen Modal */}
      {session.isCompleted && session.finalScore && (
        <RoomSummaryModal
          isOpen={session.isCompleted}
          score={session.finalScore}
          onReplay={handleResetGame}
        />
      )}

      {/* Reset Game Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
            <h3 className="text-base font-bold text-white">Chơi lại từ đầu?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Toàn bộ tiến trình căn phòng, manh mối và túi đồ hiện tại sẽ được khởi động lại. Bạn có chắc chắn muốn bắt đầu lại không?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetGame}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Xác nhận chơi lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
