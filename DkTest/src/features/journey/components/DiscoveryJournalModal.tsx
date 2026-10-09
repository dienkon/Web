/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Personal Discovery Journal Modal for DkTEST 3D Learning Journey
 * Chronological learning milestones and private student reflections.
 * Fully supports Light & Dark themes.
 */

import React, { useState } from "react";
import {
  X,
  BookMarked,
  Sparkles,
  Calendar,
  Star,
  Edit3,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import type { DiscoveryJournalEntry } from "../types/journal";
import {
  getStudentJournalEntries,
  updateJournalReflection,
  deleteJournalEntry,
} from "../services/discoveryJournalService";

interface DiscoveryJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentUid: string;
}

export default function DiscoveryJournalModal({
  isOpen,
  onClose,
  studentUid,
}: DiscoveryJournalModalProps) {
  const [journalData, setJournalData] = useState(() =>
    getStudentJournalEntries(studentUid, 1, 20)
  );

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const [difficultText, setDifficultText] = useState("");
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(4);

  if (!isOpen) return null;

  const refreshData = () => {
    setJournalData(getStudentJournalEntries(studentUid, 1, 20));
  };

  const handleStartEdit = (entry: DiscoveryJournalEntry) => {
    setEditingEntryId(entry.id);
    setReflectionText(entry.reflection?.learnedWhat || "");
    setDifficultText(entry.reflection?.difficultPart || "");
    setConfidence(entry.reflection?.confidenceLevel || 4);
  };

  const handleSaveReflection = (entryId: string) => {
    if (!reflectionText.trim()) return;
    updateJournalReflection({
      studentUid,
      entryId,
      reflection: {
        learnedWhat: reflectionText.trim(),
        difficultPart: difficultText.trim() || undefined,
        confidenceLevel: confidence,
      },
    });
    setEditingEntryId(null);
    refreshData();
  };

  const handleDelete = (entryId: string) => {
    deleteJournalEntry(studentUid, entryId);
    refreshData();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[82vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Nhật Ký Khám Phá Cá Nhân
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                  Discovery Journal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ghi nhận các cột mốc tri thức đáng nhớ và góc suy ngẫm riêng tư của bạn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entries list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {journalData.entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <BookMarked className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                Nhật ký đang mở trang đầu tiên
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Khi bạn hoàn thành các thử thách, trạm kiểm soát hoặc chiến dịch mới trên bản đồ, các cột mốc sẽ tự động được ghi lại tại đây.
              </p>
            </div>
          ) : (
            journalData.entries.map((entry) => {
              const isEditing = editingEntryId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                          {entry.topicOrSubject}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{entry.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{entry.summary}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(entry.timestamp).toLocaleDateString("vi-VN")}
                      </span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Xóa mục nhật ký"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Private Reflection Section */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Góc suy ngẫm của học sinh:
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(entry)}
                          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          {entry.reflection ? "Chỉnh sửa" : "Viết cảm nghĩ"}
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 pt-2">
                        <textarea
                          rows={2}
                          value={reflectionText}
                          onChange={(e) => setReflectionText(e.target.value)}
                          placeholder="Hôm nay mình đã học được điều gì mới?"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                        />
                        <input
                          type="text"
                          value={difficultText}
                          onChange={(e) => setDifficultText(e.target.value)}
                          placeholder="Phần nào vẫn còn cảm thấy lúng túng? (tùy chọn)"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                        />

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>Mức độ tự tin:</span>
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setConfidence(lvl as any)}
                                className={clsx(
                                  "w-6 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                  confidence === lvl
                                    ? "bg-amber-500 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingEntryId(null)}
                              className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => handleSaveReflection(entry.id)}
                              className="px-3.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer"
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : entry.reflection ? (
                      <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        <p className="italic leading-relaxed">
                          "{entry.reflection.learnedWhat}"
                        </p>
                        {entry.reflection.difficultPart && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            • Còn vướng mắc: {entry.reflection.difficultPart}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-[11px] text-amber-500 dark:text-amber-400 pt-1">
                          <span>Độ tự tin:</span>
                          {Array.from({ length: entry.reflection.confidenceLevel }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-500 dark:fill-amber-400" />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Chưa có ghi chú suy ngẫm nào cho cột mốc này.
                      </p>
                    )}
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
