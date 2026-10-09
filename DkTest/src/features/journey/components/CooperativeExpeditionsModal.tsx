/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cooperative Expeditions Modal for DkTEST 3D Learning Journey
 * Supports shared study groups, invite codes, and privacy-preserving team goals.
 * Fully supports Light & Dark themes.
 */

import React, { useState } from "react";
import {
  X,
  Users,
  Plus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";
import type { SubjectThemeType } from "../types/journey3D";
import type { CooperativeExpedition } from "../types/expedition";
import {
  getStudentExpeditions,
  createExpedition,
  joinExpeditionByCode,
} from "../services/cooperativeExpeditionService";

interface CooperativeExpeditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: SubjectThemeType;
  studentUid: string;
  studentName: string;
}

export default function CooperativeExpeditionsModal({
  isOpen,
  onClose,
  activeSubject,
  studentUid,
  studentName,
}: CooperativeExpeditionsModalProps) {
  const [expeditions, setExpeditions] = useState<CooperativeExpedition[]>(() =>
    getStudentExpeditions(studentUid)
  );

  const [activeTab, setActiveTab] = useState<"list" | "create" | "join">("list");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinMessage, setJoinMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Form state for creating
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetTasks, setNewTargetTasks] = useState(20);

  if (!isOpen) return null;

  const refreshList = () => {
    setExpeditions(getStudentExpeditions(studentUid));
  };

  const handleJoin = () => {
    if (!inviteCodeInput.trim()) return;
    const res = joinExpeditionByCode({
      inviteCode: inviteCodeInput,
      studentUid,
      studentName,
    });
    setJoinMessage({ text: res.message, success: res.success });
    if (res.success) {
      refreshList();
      setTimeout(() => {
        setActiveTab("list");
        setJoinMessage(null);
        setInviteCodeInput("");
      }, 1200);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createExpedition({
      leaderUid: studentUid,
      leaderName: studentName,
      subject: activeSubject,
      title: newTitle.trim(),
      description: newDescription.trim() || "Cùng nhau học tập và vượt qua các nhiệm vụ kiến thức.",
      targetTasksCount: newTargetTasks,
    });
    refreshList();
    setActiveTab("list");
    setNewTitle("");
    setNewDescription("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[80vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Đoàn Thám Hiểm Học Tập
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30">
                  Cooperative Expeditions
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hợp tác nhóm cùng bạn bè, chung tay hoàn thành chỉ tiêu bài tập mà không áp lực cạnh tranh
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

        {/* Action Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("list")}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                activeTab === "list"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                  : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              Đoàn Của Tôi ({expeditions.length})
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === "join"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                  : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Nhập Mã Tham Gia
            </button>
          </div>

          <button
            onClick={() => setActiveTab("create")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === "create"
                ? "bg-indigo-600 text-white"
                : "bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-600/40"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Lập Đoàn Mới
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "list" && (
            <div className="space-y-4">
              {expeditions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    Bạn chưa tham gia đoàn thám hiểm nào
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Hãy xin mã mời từ bạn bè trong lớp hoặc tự tạo một đoàn thám hiểm để cùng nhau tích lũy nhiệm vụ.
                  </p>
                </div>
              ) : (
                expeditions.map((exp) => {
                  const pct = Math.min(100, Math.round((exp.completedTasksCount / exp.targetTasksCount) * 100));
                  return (
                    <div
                      key={exp.id}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-900 dark:text-white">{exp.title}</h4>
                            <span
                              className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                exp.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                                  : "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30"
                              )}
                            >
                              {exp.status === "completed" ? "Đã Hoàn Thành" : "Đang Diễn Ra"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{exp.description}</p>
                        </div>

                        {/* Invite Code Badge */}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Mã mời:</span>
                          <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-500/30 block select-all">
                            {exp.inviteCode}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                          <span>Mục tiêu chung:</span>
                          <span className="font-bold text-teal-700 dark:text-teal-400">
                            {exp.completedTasksCount}/{exp.targetTasksCount} bài ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Team Members List (Privacy-preserving: only task counts) */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                          Thành viên tham gia ({exp.members.length} người):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {exp.members.map((m) => (
                            <div
                              key={m.uid}
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center gap-2 text-xs"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-medium text-slate-800 dark:text-slate-200">{m.displayName}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                • {m.tasksContributed} bài đóng góp
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "join" && (
            <div className="max-w-md mx-auto py-8 space-y-4">
              <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto border border-teal-200 dark:border-teal-500/30">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Gia Nhập Bằng Mã Mời</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nhập mã 6 ký tự được bạn bè hoặc trưởng đoàn chia sẻ.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="VÍ DỤ: XK9M2P"
                  className="w-full text-center tracking-widest text-lg font-mono py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-teal-500"
                />

                {joinMessage && (
                  <div
                    className={clsx(
                      "p-3 rounded-xl text-xs flex items-center gap-2",
                      joinMessage.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                    )}
                  >
                    {joinMessage.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <span>{joinMessage.text}</span>
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  disabled={!inviteCodeInput.trim()}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
                >
                  Tham gia đoàn thám hiểm
                </button>
              </div>
            </div>
          )}

          {activeTab === "create" && (
            <form onSubmit={handleCreate} className="max-w-lg mx-auto py-4 space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Thiết Lập Đoàn Thám Hiểm Mới</h3>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên đoàn:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Vd: Biệt Đội Chinh Phục Cực Trị Lớp 12A1"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mô tả mục tiêu:</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Vd: Cùng nhau hoàn thành 30 bài luyện tập Chương 1 trong tuần này."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chỉ tiêu bài tập hoàn thành:
                </label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={newTargetTasks}
                  onChange={(e) => setNewTargetTasks(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Khởi tạo đoàn & Tạo mã mời
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
