/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Journey Creator Studio — Administrative Campaign Authoring Tool
 * Allows teachers and administrators to design, validate (DAG cycle check),
 * preview, and publish narrative learning campaigns.
 */

import React, { useState } from "react";
import {
  Compass,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Layers,
  Trash2,
  Edit3,
  Eye,
  Send,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import type {
  NarrativeCampaign,
  CampaignNode,
  CampaignNodeType,
  CampaignStatus,
} from "../../features/journey/types/campaign";
import type { SubjectThemeType } from "../../features/journey/types/journey3D";
import {
  getAllCampaigns,
  saveCustomCampaign,
  validateCampaignGraph,
} from "../../features/journey/services/campaignService";
import { useToast } from "../../components/ui/ToastNotification";

export default function JourneyCreatorStudio() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<NarrativeCampaign[]>(() => getAllCampaigns());
  const [selectedCampaign, setSelectedCampaign] = useState<NarrativeCampaign | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"general" | "nodes" | "preview">("general");

  const refreshList = () => {
    setCampaigns(getAllCampaigns());
  };

  const handleCreateNew = () => {
    const newCamp: NarrativeCampaign = {
      id: `camp_${Date.now()}`,
      version: 1,
      title: "Chiến Dịch Học Tập Mới",
      slug: `new-campaign-${Date.now()}`,
      description: "Mô tả mục tiêu của chiến dịch...",
      narrativeIntro: "Lời dẫn truyện truyền cảm hứng cho học sinh...",
      subject: "math",
      grade: 12,
      status: "draft",
      regions: [
        {
          id: `reg_${Date.now()}_1`,
          name: "Vùng 1: Khởi Nguyên",
          description: "Mô tả vùng học tập",
          subject: "math",
          accentColor: "indigo",
        },
      ],
      nodes: [
        {
          id: `node_${Date.now()}_1`,
          title: "Màn 1: Cửa Ngõ",
          learningObjective: "Nắm vững lý thuyết cơ bản",
          type: "story_intro",
          regionId: `reg_${Date.now()}_1`,
          chapterName: "Chương 1",
          topicName: "Chủ đề 1",
          prerequisiteNodeIds: [],
          isOptional: false,
          estimatedMinutes: 5,
          x: 20,
          y: 20,
          questionCount: 3,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedCampaign(newCamp);
    setValidationResult(null);
    setActiveTab("general");
  };

  const handleValidate = () => {
    if (!selectedCampaign) return;
    const res = validateCampaignGraph(selectedCampaign.nodes);
    setValidationResult(res);
    if (res.isValid) {
      toast.success("Cấu trúc sơ đồ đồ thị hợp lệ! Không có chu trình phụ thuộc vòng (Cycle).");
    } else {
      toast.error(`Phát hiện ${res.errors.length} lỗi cấu trúc trong chiến dịch!`);
    }
  };

  const handleSave = (publish: boolean = false) => {
    if (!selectedCampaign) return;
    const res = validateCampaignGraph(selectedCampaign.nodes);
    if (!res.isValid) {
      setValidationResult(res);
      toast.error("Không thể lưu: Vui lòng sửa các lỗi cấu trúc sơ đồ trước!");
      return;
    }

    const toSave: NarrativeCampaign = {
      ...selectedCampaign,
      status: publish ? "published" : selectedCampaign.status,
      publishedAt: publish ? new Date().toISOString() : selectedCampaign.publishedAt,
      updatedAt: new Date().toISOString(),
    };

    const saveRes = saveCustomCampaign(toSave);
    if (saveRes.success) {
      toast.success(publish ? "Đã phát hành chiến dịch thành công!" : "Đã lưu bản thảo chiến dịch!");
      setSelectedCampaign(toSave);
      refreshList();
    } else {
      toast.error(saveRes.errors[0] || "Lỗi lưu chiến dịch");
    }
  };

  const handleAddNode = () => {
    if (!selectedCampaign) return;
    const newNode: CampaignNode = {
      id: `node_${Date.now()}`,
      title: `Cột Mốc ${selectedCampaign.nodes.length + 1}`,
      learningObjective: "Mục tiêu bài học...",
      type: "practice_encounter",
      regionId: selectedCampaign.regions[0]?.id || "reg_default",
      chapterName: "Chương 1",
      topicName: "Chủ đề mới",
      prerequisiteNodeIds:
        selectedCampaign.nodes.length > 0
          ? [selectedCampaign.nodes[selectedCampaign.nodes.length - 1].id]
          : [],
      isOptional: false,
      estimatedMinutes: 8,
      x: 50,
      y: 50,
      questionCount: 5,
    };
    setSelectedCampaign({
      ...selectedCampaign,
      nodes: [...selectedCampaign.nodes, newNode],
    });
    setValidationResult(null);
  };

  const handleRemoveNode = (nodeId: string) => {
    if (!selectedCampaign) return;
    setSelectedCampaign({
      ...selectedCampaign,
      nodes: selectedCampaign.nodes.filter((n) => n.id !== nodeId),
    });
    setValidationResult(null);
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<CampaignNode>) => {
    if (!selectedCampaign) return;
    setSelectedCampaign({
      ...selectedCampaign,
      nodes: selectedCampaign.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
    });
    setValidationResult(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Xưởng Thiết Kế Chiến Dịch (Journey Studio)</h1>
            <p className="text-xs text-slate-400">
              Công cụ quản trị xây dựng sơ đồ hành trình học tập, quản lý nhánh rẽ và kiểm soát logic DAG
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNew}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo chiến dịch mới
          </button>
          {selectedCampaign && (
            <>
              <button
                onClick={handleValidate}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Kiểm tra logic đồ thị (DAG)
              </button>
              <button
                onClick={() => handleSave(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600/50 flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                Lưu bản thảo
              </button>
              <button
                onClick={() => handleSave(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                Phát hành chính thức
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Campaigns List */}
        <div className="w-72 border-r border-slate-800 bg-slate-950/40 p-4 overflow-y-auto space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Danh sách chiến dịch ({campaigns.length})
          </span>

          {campaigns.map((camp) => {
            const isSel = selectedCampaign?.id === camp.id;
            return (
              <div
                key={camp.id}
                onClick={() => {
                  setSelectedCampaign(camp);
                  setValidationResult(null);
                }}
                className={clsx(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5",
                  isSel
                    ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800/80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    {camp.subject} • Khối {camp.grade}
                  </span>
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                      camp.status === "published"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    )}
                  >
                    {camp.status}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white line-clamp-1">{camp.title}</h4>
                <span className="text-[11px] text-slate-500 block">
                  {camp.nodes.length} cột mốc • {camp.regions.length} khu vực
                </span>
              </div>
            );
          })}
        </div>

        {/* Center / Right Editor Area */}
        {selectedCampaign ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/60">
            {/* Editor Subtabs */}
            <div className="flex items-center gap-3 px-6 py-2.5 bg-slate-950/40 border-b border-slate-800">
              <button
                onClick={() => setActiveTab("general")}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeTab === "general"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Thông tin chung & Cốt truyện
              </button>
              <button
                onClick={() => setActiveTab("nodes")}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
                  activeTab === "nodes"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <GitBranch className="w-3.5 h-3.5" />
                Sơ đồ cột mốc & Tiên quyết ({selectedCampaign.nodes.length})
              </button>
            </div>

            {/* Validation Feedback Banner */}
            {validationResult && (
              <div
                className={clsx(
                  "px-6 py-3 border-b text-xs flex items-start gap-2.5",
                  validationResult.isValid
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                )}
              >
                {validationResult.isValid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">
                    {validationResult.isValid
                      ? "Cấu trúc đồ thị chuẩn xác (Valid DAG)!"
                      : "Phát hiện lỗi cấu trúc logic:"}
                  </span>
                  {!validationResult.isValid && (
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {validationResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Subtab Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === "general" && (
                <div className="max-w-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Tên chiến dịch:</label>
                      <input
                        type="text"
                        value={selectedCampaign.title}
                        onChange={(e) =>
                          setSelectedCampaign({ ...selectedCampaign, title: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Môn học:</label>
                      <select
                        value={selectedCampaign.subject}
                        onChange={(e) =>
                          setSelectedCampaign({
                            ...selectedCampaign,
                            subject: e.target.value as SubjectThemeType,
                          })
                        }
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="math">Toán Học</option>
                        <option value="physics">Vật Lý</option>
                        <option value="chemistry">Hóa Học</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Lời dẫn truyện (Narrative Lore):</label>
                    <textarea
                      rows={3}
                      value={selectedCampaign.narrativeIntro}
                      onChange={(e) =>
                        setSelectedCampaign({ ...selectedCampaign, narrativeIntro: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Mô tả mục tiêu tổng quát:</label>
                    <textarea
                      rows={2}
                      value={selectedCampaign.description}
                      onChange={(e) =>
                        setSelectedCampaign({ ...selectedCampaign, description: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === "nodes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">
                      Sắp xếp các cột mốc, xác lập điều kiện tiên quyết và nhánh rẽ tùy chọn
                    </span>
                    <button
                      onClick={handleAddNode}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm cột mốc
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedCampaign.nodes.map((node, idx) => (
                      <div
                        key={node.id}
                        className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={node.title}
                              onChange={(e) => handleUpdateNode(node.id, { title: e.target.value })}
                              className="px-2.5 py-1 text-xs font-bold bg-slate-900 border border-slate-700 rounded-lg text-white w-64 focus:outline-hidden focus:border-indigo-500"
                            />
                            <select
                              value={node.type}
                              onChange={(e) =>
                                handleUpdateNode(node.id, { type: e.target.value as CampaignNodeType })
                              }
                              className="px-2 py-1 text-[11px] font-semibold bg-slate-900 border border-slate-700 rounded-lg text-slate-300"
                            >
                              <option value="story_intro">Cửa ngõ (Story Intro)</option>
                              <option value="practice_encounter">Thử thách (Practice)</option>
                              <option value="optional_branch">Nhánh mở rộng (Optional)</option>
                              <option value="checkpoint">Trạm kiểm soát (Checkpoint)</option>
                              <option value="final_assessment">Trùm cuối (Final)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={node.isOptional}
                                onChange={(e) =>
                                  handleUpdateNode(node.id, { isOptional: e.target.checked })
                                }
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                              />
                              <span>Nhánh tùy chọn</span>
                            </label>

                            <button
                              onClick={() => handleRemoveNode(node.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Xóa cột mốc"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <input
                            type="text"
                            placeholder="Mục tiêu năng lực bài học..."
                            value={node.learningObjective}
                            onChange={(e) =>
                              handleUpdateNode(node.id, { learningObjective: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                          />

                          {/* Prerequisites selection */}
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 shrink-0">Tiên quyết:</span>
                            <select
                              value={node.prerequisiteNodeIds[0] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateNode(node.id, {
                                  prerequisiteNodeIds: val ? [val] : [],
                                });
                              }}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                            >
                              <option value="">(Không có tiên quyết - Mở ngay)</option>
                              {selectedCampaign.nodes
                                .filter((n) => n.id !== node.id)
                                .map((other) => (
                                  <option key={other.id} value={other.id}>
                                    {other.title}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-300">Chưa chọn chiến dịch</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Chọn một chiến dịch từ danh sách bên trái hoặc tạo mới để bắt đầu thiết kế.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
