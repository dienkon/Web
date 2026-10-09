/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Accessible 2D Destination Browser for DkTEST Learning Journey
 * High-contrast, keyboard-navigable, non-color-dependent list interface.
 * Fully supports Light & Dark themes.
 */

import React, { useState } from "react";
import {
  CheckCircle2,
  Lock,
  Play,
  Clock,
  BookOpen,
} from "lucide-react";
import clsx from "clsx";
import type { Journey3DNode, SubjectThemeType } from "../types/journey3D";

interface AccessibleJourneyViewProps {
  nodes: Journey3DNode[];
  activeSubject: SubjectThemeType;
  currentLevel: number;
  onSelectNode: (node: Journey3DNode) => void;
  onStartChallenge: (level: number) => void;
}

export default function AccessibleJourneyView({
  nodes,
  activeSubject,
  currentLevel,
  onSelectNode,
  onStartChallenge,
}: AccessibleJourneyViewProps) {
  const [filter, setFilter] = useState<"all" | "available" | "checkpoints">("all");

  const filteredNodes = nodes.filter((n) => {
    if (filter === "available") return n.state === "current" || n.state === "completed";
    if (filter === "checkpoints") return n.isCheckpoint || n.isBoss;
    return true;
  });

  const getStatusBadge = (node: Journey3DNode) => {
    switch (node.state) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Đã hoàn thành</span>
          </span>
        );
      case "current":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40">
            <Play className="w-3.5 h-3.5 fill-amber-500" aria-hidden="true" />
            <span>Mục tiêu hiện tại</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Đang khóa</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6" role="region" aria-label="Danh sách điểm đến học tập dạng danh mục">
      {/* Accessibility notice banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-cyan-500/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
          <span>
            Chế độ trợ năng 2D: Tương thích cao với trình đọc màn hình và điều hướng bàn phím.
          </span>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full sm:w-auto" role="radiogroup" aria-label="Bộ lọc màn chơi">
          <button
            onClick={() => setFilter("all")}
            className={clsx(
              "flex-1 sm:flex-none px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center",
              filter === "all"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Tất cả ({nodes.length})
          </button>
          <button
            onClick={() => setFilter("available")}
            className={clsx(
              "flex-1 sm:flex-none px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center",
              filter === "available"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Đã mở khóa
          </button>
          <button
            onClick={() => setFilter("checkpoints")}
            className={clsx(
              "flex-1 sm:flex-none px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center",
              filter === "checkpoints"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Trạm mốc
          </button>
        </div>
      </div>

      {/* Nodes list table/cards */}
      <div className="space-y-3" role="list">
        {filteredNodes.map((node) => {
          const isPlayable = node.state === "current" || node.state === "completed";
          return (
            <div
              key={node.id}
              role="listitem"
              className={clsx(
                "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs",
                isPlayable
                  ? "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/80 hover:border-cyan-500/60"
                  : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-60"
              )}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Màn {node.level}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{node.title}</h3>
                  {getStatusBadge(node)}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chủ đề: <span className="text-slate-800 dark:text-slate-200 font-medium">{node.topicName}</span>
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    ~{node.estimatedMinutes} phút
                  </span>
                  <span>{node.questionCount} câu hỏi trắc nghiệm</span>
                  {node.pastAccuracy !== undefined && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Chính xác: {node.pastAccuracy}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onSelectNode(node)}
                  className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center text-center"
                >
                  Xem chi tiết
                </button>
                {isPlayable && (
                  <button
                    type="button"
                    onClick={() => onStartChallenge(node.level)}
                    className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 cursor-pointer text-center"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" aria-hidden="true" />
                    <span>Làm bài</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
