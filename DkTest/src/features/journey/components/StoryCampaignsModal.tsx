/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Story Campaigns Modal for DkTEST 3D Learning Journey
 * Displays narrative learning campaigns with branching exploration graphs and prerequisites.
 */

import React, { useState } from "react";
import {
  X,
  Compass,
  Sparkles,
  CheckCircle2,
  Lock,
  Play,
  ArrowRight,
  GitBranch,
  Target,
  Clock,
  BookOpen,
  HelpCircle,
  Award,
} from "lucide-react";
import clsx from "clsx";
import type { NarrativeCampaign, CampaignNode } from "../types/campaign";
import type { SubjectThemeType } from "../types/journey3D";
import {
  getAllCampaigns,
  getStudentCampaignProgress,
  recordCampaignNodeCompletion,
} from "../services/campaignService";

interface StoryCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject: SubjectThemeType;
  studentUid: string;
  onLaunchNode: (node: CampaignNode) => void;
}

export default function StoryCampaignsModal({
  isOpen,
  onClose,
  activeSubject,
  studentUid,
  onLaunchNode,
}: StoryCampaignsModalProps) {
  const allCampaigns = getAllCampaigns();
  const [selectedSubject, setSelectedSubject] = useState<SubjectThemeType>(activeSubject);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
    const found = allCampaigns.find((c) => c.subject === activeSubject);
    return found ? found.id : allCampaigns[0]?.id || "";
  });

  const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null);

  if (!isOpen) return null;

  const currentCampaign =
    allCampaigns.find((c) => c.id === selectedCampaignId) || allCampaigns[0];

  const progress = currentCampaign
    ? getStudentCampaignProgress(studentUid, currentCampaign)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 dark:border-indigo-500/30">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Chiến Dịch Khám Phá Tri Thức</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30">
                  Story Campaigns
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phiêu lưu qua các vùng đất học thuật với cốt truyện và nhánh rẽ tự chọn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject Selector Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-2">Môn học:</span>
          {(["math", "physics", "chemistry"] as SubjectThemeType[]).map((sub) => {
            const isSel = selectedSubject === sub;
            const label = sub === "math" ? "Toán Học" : sub === "physics" ? "Vật Lý" : "Hóa Học";
            return (
              <button
                key={sub}
                onClick={() => {
                  setSelectedSubject(sub);
                  const matching = allCampaigns.find((c) => c.subject === sub);
                  if (matching) setSelectedCampaignId(matching.id);
                  setSelectedNode(null);
                }}
                className={clsx(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  isSel
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        {currentCampaign && progress ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Campaign Overview & Interactive Node Path */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
              {/* Campaign Narrative Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/50 dark:via-slate-800/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-500/30 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentCampaign.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    <Target className="w-3.5 h-3.5" />
                    <span>
                      Tiến độ: {progress.completedNodeCount}/{progress.totalNodeCount} cột mốc
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic mb-4 leading-relaxed">
                  "{currentCampaign.narrativeIntro}"
                </p>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                    style={{
                      width: `${(progress.completedNodeCount / progress.totalNodeCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Campaign Regions & Connected Nodes */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Mạng Lưới Khám Phá & Nhánh Rẽ (Campaign Graph)
                </h4>

                <div className="space-y-4">
                  {currentCampaign.nodes.map((node, idx) => {
                    const nodeProg = progress.nodeProgress[node.id];
                    const isUnlocked = nodeProg?.isUnlocked ?? false;
                    const isCompleted = nodeProg?.isCompleted ?? false;
                    const isSelected = selectedNode?.id === node.id;

                    return (
                      <div
                        key={node.id}
                        onClick={() => isUnlocked && setSelectedNode(node)}
                        className={clsx(
                          "relative p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                          !isUnlocked && "opacity-50 cursor-not-allowed bg-slate-100/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800",
                          isUnlocked && !isSelected && "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:bg-slate-50 dark:hover:bg-slate-800",
                          isSelected && "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30"
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Node status icon */}
                          <div
                            className={clsx(
                              "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border",
                              isCompleted
                                ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/40"
                                : isUnlocked
                                ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 dark:border-indigo-500/40"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : isUnlocked ? (
                              <span>{idx + 1}</span>
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold text-sm text-slate-900 dark:text-white">{node.title}</h5>
                              {node.isOptional && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  Tùy chọn
                                </span>
                              )}
                              {node.type === "checkpoint" && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                  Trạm kiểm soát
                                </span>
                              )}
                              {node.type === "final_assessment" && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  Trùm cuối
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {node.learningObjective}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {node.estimatedMinutes}p
                          </span>
                          {isUnlocked && (
                            <ArrowRight
                              className={clsx(
                                "w-4 h-4 transition-transform",
                                isSelected ? "text-indigo-600 dark:text-indigo-400 translate-x-1" : "text-slate-400 dark:text-slate-500"
                              )}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Node Details & Actions */}
            <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-6 flex flex-col justify-between">
              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30">
                      Chi tiết cột mốc
                    </span>
                    {selectedNode.isOptional && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30">
                        Nhánh mở rộng
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedNode.title}</h3>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Mục tiêu học thuật:
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedNode.learningObjective}
                    </p>
                  </div>

                  {selectedNode.guideDialogue && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 space-y-1">
                      <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Lời dặn từ người dẫn đường:
                      </div>
                      <p className="text-xs text-indigo-900 dark:text-indigo-200 italic leading-relaxed">
                        "{selectedNode.guideDialogue}"
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block">Số lượng câu:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedNode.questionCount} câu hỏi
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block">Thời lượng ước tính:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        ~{selectedNode.estimatedMinutes} phút
                      </span>
                    </div>
                  </div>

                  {progress.nodeProgress[selectedNode.id]?.isCompleted && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Đã chinh phục thành công! Độ chính xác cao nhất:{" "}
                        <strong>
                          {progress.nodeProgress[selectedNode.id]?.bestAccuracy || 100}%
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center">
                    <Target className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Chọn một cột mốc</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Nhấp vào bất kỳ cột mốc nào đã mở khóa trên bản đồ để xem mục tiêu và bắt đầu thử thách.
                  </p>
                </div>
              )}

              {selectedNode && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      onLaunchNode(selectedNode);
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Bắt đầu thử thách ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
            Không tìm thấy chiến dịch nào khả dụng cho môn học này.
          </div>
        )}
      </div>
    </div>
  );
}
