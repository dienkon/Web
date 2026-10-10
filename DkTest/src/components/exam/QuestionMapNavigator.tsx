/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * QuestionMapNavigator: Sơ đồ câu hỏi trực quan cho trang xem lại bài thi
 * Dùng cho cả Học sinh (ExamResult) và Quản trị viên/Phụ huynh (SubmissionDetail).
 */

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  LayoutGrid,
  Filter,
} from "lucide-react";
import type { Question } from "../../types";

export type QuestionAnswerStatus = "correct" | "incorrect" | "partial" | "unanswered";

interface QuestionMapNavigatorProps {
  questions: Question[];
  answers: Record<string, any>;
  targetPrefix?: string; // e.g. "q-result-card-" or "admin-q-card-"
  timing?: Record<string, { timeSpentSeconds?: number }>;
  onSelectQuestion?: (index: number, question: Question) => void;
  className?: string;
  showFloatingTrigger?: boolean;
}

export function evaluateQuestionStatus(q: Question, ans: any): QuestionAnswerStatus {
  const isAnswered =
    ans !== undefined &&
    ans !== null &&
    ans !== "" &&
    (!Array.isArray(ans) || ans.length > 0) &&
    (typeof ans !== "object" || Object.keys(ans).length > 0);

  if (!isAnswered) {
    return "unanswered";
  }

  if (q.type === "single_choice") {
    return q.correctOptionIds?.includes(ans) ? "correct" : "incorrect";
  }

  if (q.type === "multiple_choice") {
    const correctSet = new Set(q.correctOptionIds || []);
    const ansSet = new Set<string>(Array.isArray(ans) ? ans : []);
    if (correctSet.size === 0) return "unanswered";
    const isExact = correctSet.size === ansSet.size && [...correctSet].every((id) => ansSet.has(id));
    if (isExact) return "correct";
    const hasAnyCorrect = [...ansSet].some((id) => correctSet.has(id));
    return hasAnyCorrect ? "partial" : "incorrect";
  }

  if (q.type === "true_false") {
    const stmts = q.statements || [];
    if (stmts.length === 0) return "unanswered";
    let correctStmts = 0;
    stmts.forEach((s) => {
      if (ans && ans[s.id] === s.correctAnswer) correctStmts++;
    });
    if (correctStmts === stmts.length) return "correct";
    if (correctStmts > 0) return "partial";
    return "incorrect";
  }

  if (q.type === "short_answer") {
    const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
    return accepted.includes(String(ans).trim().toLowerCase()) ? "correct" : "incorrect";
  }

  if (q.type === "fill_blank") {
    const blanks: Record<string, any> = q.acceptedAnswersPerBlank || (q as any).fillBlankCorrectAnswers || {};
    const keys = Object.keys(blanks);
    if (keys.length === 0) return "unanswered";
    let correctCount = 0;
    keys.forEach((k) => {
      const userVal = String(ans?.[k] || "").trim().toLowerCase();
      const rawAccepted = blanks[k] || [];
      const acceptedVals = Array.isArray(rawAccepted)
        ? rawAccepted.map((v: string) => String(v).trim().toLowerCase())
        : [String(rawAccepted).trim().toLowerCase()];
      if (acceptedVals.includes(userVal)) correctCount++;
    });
    if (correctCount === keys.length) return "correct";
    if (correctCount > 0) return "partial";
    return "incorrect";
  }

  if (q.type === "matching") {
    if (q.correctMatches) {
      const correctMap = q.correctMatches;
      const keys = Object.keys(correctMap);
      if (keys.length === 0) return "unanswered";
      let correctMatches = 0;
      keys.forEach((k) => {
        if (String(ans?.[k] || "").trim().toLowerCase() === String(correctMap[k] || "").trim().toLowerCase()) {
          correctMatches++;
        }
      });
      if (correctMatches === keys.length) return "correct";
      if (correctMatches > 0) return "partial";
      return "incorrect";
    }
    const pairs = (q as any).matchingPairs || [];
    if (pairs.length === 0) return "unanswered";
    let correctMatches = 0;
    pairs.forEach((p) => {
      if (ans?.[p.id] === p.matchTargetId) correctMatches++;
    });
    if (correctMatches === pairs.length) return "correct";
    if (correctMatches > 0) return "partial";
    return "incorrect";
  }

  return "unanswered";
}

export default function QuestionMapNavigator({
  questions,
  answers,
  targetPrefix = "q-result-card-",
  timing,
  onSelectQuestion,
  className = "",
  showFloatingTrigger = true,
}: QuestionMapNavigatorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | QuestionAnswerStatus>("all");

  const evaluatedItems = useMemo(() => {
    return questions.map((q, idx) => {
      const status = evaluateQuestionStatus(q, answers?.[q.id]);
      const timeSpent = timing?.[q.id]?.timeSpentSeconds;
      return { question: q, index: idx, status, timeSpent };
    });
  }, [questions, answers, timing]);

  const stats = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let partial = 0;
    let unanswered = 0;
    evaluatedItems.forEach((item) => {
      if (item.status === "correct") correct++;
      else if (item.status === "incorrect") incorrect++;
      else if (item.status === "partial") partial++;
      else unanswered++;
    });
    return { correct, incorrect, partial, unanswered, total: evaluatedItems.length };
  }, [evaluatedItems]);

  const handleJump = (idx: number, q: Question) => {
    if (onSelectQuestion) {
      onSelectQuestion(idx, q);
    }

    const attemptScroll = (retries = 10) => {
      const targetElement =
        document.getElementById(`${targetPrefix}${q.id}`) ||
        document.getElementById(`${targetPrefix}${idx}`) ||
        document.querySelector(`[data-card-idx="${targetPrefix}${idx}"]`) ||
        document.querySelector(`[data-card-idx="q-result-card-${idx}"]`) ||
        document.querySelector(`[data-card-idx="admin-q-card-${idx}"]`);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        targetElement.classList.add("ring-4", "ring-indigo-400", "ring-offset-2");
        setTimeout(() => {
          targetElement.classList.remove("ring-4", "ring-indigo-400", "ring-offset-2");
        }, 1600);
      } else if (retries > 0) {
        setTimeout(() => attemptScroll(retries - 1), 60);
      }
    };

    attemptScroll();
    setIsModalOpen(false);
  };

  const filteredItems = useMemo(() => {
    if (filter === "all") return evaluatedItems;
    return evaluatedItems.filter((it) => it.status === filter);
  }, [evaluatedItems, filter]);

  const renderBadge = (status: QuestionAnswerStatus, num: number, idx: number, q: Question) => {
    let colorClass = "";
    let icon = null;

    switch (status) {
      case "correct":
        colorClass = "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20";
        icon = <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />;
        break;
      case "incorrect":
        colorClass = "bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-rose-500/20";
        icon = <XCircle className="w-2.5 h-2.5 shrink-0" />;
        break;
      case "partial":
        colorClass = "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20";
        icon = <AlertCircle className="w-2.5 h-2.5 shrink-0" />;
        break;
      default:
        colorClass = "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700";
        icon = <HelpCircle className="w-2.5 h-2.5 shrink-0 text-slate-400" />;
        break;
    }

    return (
      <button
        key={`${q.id}-${idx}`}
        type="button"
        onClick={() => handleJump(idx, q)}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 border ${colorClass}`}
        title={`Câu ${num}: ${
          status === "correct"
            ? "Đúng"
            : status === "incorrect"
            ? "Sai"
            : status === "partial"
            ? "Đúng một phần"
            : "Chưa làm"
        }`}
      >
        <span className="leading-none">{num}</span>
        <span className="mt-0.5">{icon}</span>
      </button>
    );
  };

  return (
    <>
      {/* 1. Embedded In-Page Question Map Box */}
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-all ${className}`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Sơ đồ câu hỏi</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
                  {stats.total} câu
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Bấm số câu để cuộn nhanh đến câu hỏi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Status Legend Filters */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilter(filter === "correct" ? "all" : "correct")}
                className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  filter === "correct"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>{stats.correct} Đúng</span>
              </button>

              <button
                type="button"
                onClick={() => setFilter(filter === "incorrect" ? "all" : "incorrect")}
                className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  filter === "incorrect"
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200"
                }`}
              >
                <XCircle className="w-3 h-3" />
                <span>{stats.incorrect} Sai</span>
              </button>

              {stats.partial > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter(filter === "partial" ? "all" : "partial")}
                  className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    filter === "partial"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200"
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{stats.partial} Một phần</span>
                </button>
              )}

              {stats.unanswered > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter(filter === "unanswered" ? "all" : "unanswered")}
                  className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    filter === "unanswered"
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200"
                  }`}
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>{stats.unanswered} Chưa làm</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
              title={isOpen ? "Thu gọn sơ đồ" : "Mở rộng sơ đồ"}
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Question Grid */}
        {isOpen && (
          <div className="pt-3.5 space-y-3 animate-in fade-in duration-200">
            {/* Mobile Filter Chips */}
            <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded-lg border shrink-0 ${
                  filter === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                Tất cả ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilter("correct")}
                className={`px-2 py-1 rounded-lg border shrink-0 ${
                  filter === "correct" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                Đúng ({stats.correct})
              </button>
              <button
                type="button"
                onClick={() => setFilter("incorrect")}
                className={`px-2 py-1 rounded-lg border shrink-0 ${
                  filter === "incorrect" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"
                }`}
              >
                Sai ({stats.incorrect})
              </button>
              {stats.unanswered > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("unanswered")}
                  className={`px-2 py-1 rounded-lg border shrink-0 ${
                    filter === "unanswered" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Chưa làm ({stats.unanswered})
                </button>
              )}
            </div>

            {/* Questions Palette */}
            <div className="flex flex-wrap gap-2 max-h-[320px] overflow-y-auto p-1 scrollbar-thin">
              {filteredItems.map((item) => renderBadge(item.status, item.index + 1, item.index, item.question))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Floating Quick Jump Button (Always visible on scroll) */}
      {showFloatingTrigger && (
        <>
          <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 no-print">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl hover:shadow-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 border border-indigo-400/40"
              title="Mở sơ đồ câu hỏi để nhảy nhanh tới câu"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Sơ đồ câu ({stats.correct}/{stats.total})</span>
            </button>
          </div>

          {/* Floating Slide-over / Popup Modal for Question Map */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                onClick={() => setIsModalOpen(false)}
              />

              <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Sơ đồ câu hỏi làm bài
                      </h3>
                      <p className="text-xs text-slate-400">Chọn câu để nhảy trực tiếp</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      filter === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Tất cả ({stats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("correct")}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      filter === "correct" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Đúng ({stats.correct})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("incorrect")}
                    className={`px-3 py-1.5 rounded-xl border transition-all ${
                      filter === "incorrect" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    Sai ({stats.incorrect})
                  </button>
                  {stats.unanswered > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilter("unanswered")}
                      className={`px-3 py-1.5 rounded-xl border transition-all ${
                        filter === "unanswered" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Chưa làm ({stats.unanswered})
                    </button>
                  )}
                </div>

                {/* Question Grid in Modal */}
                <div className="flex-1 overflow-y-auto p-1">
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                    {filteredItems.map((item) =>
                      renderBadge(item.status, item.index + 1, item.index, item.question)
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
