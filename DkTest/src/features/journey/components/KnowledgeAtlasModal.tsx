/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * KnowledgeAtlasModal: Search, Filter and Quick Jump Navigation Across 50 Levels
 */

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  ShieldCheck,
  ChevronRight,
  Filter,
} from "lucide-react";
import type { Journey3DNode, SubjectThemeType } from "../types/journey3D";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nodes: Journey3DNode[];
  onSelectNode: (node: Journey3DNode) => void;
  currentLevel: number;
  activeSubject: SubjectThemeType;
}

export default function KnowledgeAtlasModal({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  currentLevel,
  activeSubject,
}: Props) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "completed" | "pending" | "checkpoint">("all");

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // 1. Search text filter
      const matchSearch =
        node.topicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(node.level).includes(searchTerm);

      if (!matchSearch) return false;

      // 2. Status filter
      if (filterType === "completed") return node.level < currentLevel;
      if (filterType === "pending") return node.level >= currentLevel;
      if (filterType === "checkpoint") return node.isCheckpoint || node.isBoss;

      return true;
    });
  }, [nodes, searchTerm, filterType, currentLevel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Bản Đồ Địa Dư Tri Thức (Knowledge Atlas)
              </h3>
              <p className="text-xs text-slate-500">
                Tra cứu nhanh toàn bộ 50 Màn chơi và định vị ngay lập tức trên bản đồ 3D
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên chuyên đề hoặc số màn (VD: Cực trị, Tiệm cận, 10)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto text-xs">
            {[
              { id: "all", label: "Tất cả" },
              { id: "completed", label: "Đã xong" },
              { id: "pending", label: "Chưa qua" },
              { id: "checkpoint", label: "Trạm mốc" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  filterType === f.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredNodes.length === 0 ? (
            <p className="text-center py-10 text-xs text-slate-400">
              Không tìm thấy chuyên đề phù hợp với từ khóa "{searchTerm}".
            </p>
          ) : (
            filteredNodes.map((node) => {
              const isCompleted = node.level < currentLevel;
              const isCurrent = node.level === currentLevel;

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node);
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-slate-850 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl font-mono font-black flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : isCurrent
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {node.level}
                    </span>

                    <div className="truncate">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {node.topicName}
                        </span>
                        {node.isBoss && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Trùm Cuối
                          </span>
                        )}
                        {node.isCheckpoint && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Kiểm Soát
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {node.level <= 10
                          ? "Mức độ 1: Nhận biết khái niệm"
                          : node.level <= 25
                          ? "Mức độ 2: Thông hiểu bản chất"
                          : node.level <= 40
                          ? "Mức độ 3: Vận dụng thực tế"
                          : "Mức độ 4: Vận dụng cao (VDC)"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                          : isCurrent
                          ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
                          : "text-slate-400"
                      }`}
                    >
                      {isCompleted ? "Đã xong" : isCurrent ? "Hiện tại" : "Chưa làm"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
