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
  Sparkles,
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
import {
  saveAdminJourneyLevel,
  getAdminJourneyLevel,
  getAllAdminJourneyLevels,
  calculateJourneyDefaultRewardRange,
  type AdminJourneyCustomLevel,
} from "../../features/journey/services/journeyAdminSyncService";
import type { JourneyQuestionItem } from "../../features/journey/data/journeySubjectQuestions";
import { useToast } from "../../components/ui/ToastNotification";

export default function JourneyCreatorStudio() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<NarrativeCampaign[]>(() => getAllCampaigns());
  const [selectedCampaign, setSelectedCampaign] = useState<NarrativeCampaign | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"general" | "nodes" | "preview" | "csdl_events">("general");

  // Admin CSDL Synchronizer State
  const [csdlSubject, setCsdlSubject] = useState<"math" | "physics" | "chemistry">("math");
  const [csdlLevel, setCsdlLevel] = useState<number>(1);
  const [csdlEventName, setCsdlEventName] = useState<string>("");
  const [csdlEventDesc, setCsdlEventDesc] = useState<string>("");
  const [csdlEventActive, setCsdlEventActive] = useState<boolean>(false);
  const [csdlRewardMin, setCsdlRewardMin] = useState<number>(5);
  const [csdlRewardMax, setCsdlRewardMax] = useState<number>(30);
  const [csdlQuestions, setCsdlQuestions] = useState<JourneyQuestionItem[]>([]);
  const [savedCsdlLevels, setSavedCsdlLevels] = useState<AdminJourneyCustomLevel[]>([]);
  const [isSavingCsdl, setIsSavingCsdl] = useState<boolean>(false);

  const loadCsdlLevels = async () => {
    try {
      const all = await getAllAdminJourneyLevels();
      setSavedCsdlLevels(all);
    } catch (_) {}
  };

  const handleLoadLevelFromCsdl = async (sub: "math" | "physics" | "chemistry", lvl: number) => {
    setCsdlSubject(sub);
    setCsdlLevel(lvl);
    const existing = await getAdminJourneyLevel(sub, lvl);
    if (existing) {
      setCsdlEventName(existing.eventName || "");
      setCsdlEventDesc(existing.eventDescription || "");
      setCsdlEventActive(!!existing.eventActive);
      const defaultRange = calculateJourneyDefaultRewardRange(lvl);
      setCsdlRewardMin(existing.rewardCoinsMin ?? defaultRange.min);
      setCsdlRewardMax(existing.rewardCoinsMax ?? defaultRange.max);
      setCsdlQuestions(existing.questions && existing.questions.length > 0 ? existing.questions : []);
      toast.success(`Đã nạp dữ liệu Màn ${lvl} môn ${sub}!`);
    } else {
      const defaultRange = calculateJourneyDefaultRewardRange(lvl);
      setCsdlEventName("");
      setCsdlEventDesc("");
      setCsdlEventActive(false);
      setCsdlRewardMin(defaultRange.min);
      setCsdlRewardMax(defaultRange.max);
      setCsdlQuestions([]);
      toast.info(`Màn ${lvl} môn ${sub} đang dùng câu hỏi mặc định.`);
    }
  };

  const handleSaveCsdlLevel = async () => {
    setIsSavingCsdl(true);
    try {
      await saveAdminJourneyLevel({
        id: `${csdlSubject}_lvl_${csdlLevel}`,
        subject: csdlSubject,
        level: csdlLevel,
        title: `Màn ${csdlLevel}`,
        eventName: csdlEventName,
        eventDescription: csdlEventDesc,
        eventActive: csdlEventActive,
        rewardCoinsMin: csdlRewardMin,
        rewardCoinsMax: csdlRewardMax,
        questions: csdlQuestions,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Đã đồng bộ Màn ${csdlLevel} môn ${csdlSubject} lên Firestore CSDL thành công!`);
      loadCsdlLevels();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu CSDL");
    } finally {
      setIsSavingCsdl(false);
    }
  };

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
          <button
            type="button"
            onClick={() => {
              setActiveTab("csdl_events");
              loadCsdlLevels();
            }}
            className={clsx(
              "w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border mb-3 shadow-md",
              activeTab === "csdl_events"
                ? "bg-purple-600 border-purple-500 text-white shadow-purple-600/30"
                : "bg-purple-950/40 hover:bg-purple-900/50 border-purple-800 text-purple-300"
            )}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Đồng bộ CSDL & Sự kiện</span>
          </button>

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
        ) : activeTab === "csdl_events" ? (
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-900/80 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Đồng Bộ CSDL Hành Trình & Câu Hỏi Riêng (Firestore)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Quản lý câu hỏi tùy biến, sự kiện thử thách và phần thưởng xu cho 50 màn chơi của từng môn học.
                </p>
              </div>
              <button
                type="button"
                disabled={isSavingCsdl}
                onClick={handleSaveCsdlLevel}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingCsdl ? "Đang đồng bộ..." : "Lưu & Đồng bộ lên CSDL"}</span>
              </button>
            </div>

            {/* Level & Subject Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Môn học</label>
                <select
                  value={csdlSubject}
                  onChange={(e) => handleLoadLevelFromCsdl(e.target.value as any, csdlLevel)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-hidden focus:border-purple-500"
                >
                  <option value="math">Toán Học (12)</option>
                  <option value="physics">Vật Lý (12)</option>
                  <option value="chemistry">Hóa Học (12)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Màn chơi (1 - 50)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={csdlLevel}
                  onChange={(e) => handleLoadLevelFromCsdl(csdlSubject, Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Phần thưởng vượt màn (Xu/Đồng)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={csdlRewardMin}
                    onChange={(e) => setCsdlRewardMin(parseInt(e.target.value, 10) || 5)}
                    className="w-20 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-center text-white"
                  />
                  <span className="text-slate-400 text-xs">đến</span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={csdlRewardMax}
                    onChange={(e) => setCsdlRewardMax(parseInt(e.target.value, 10) || 30)}
                    className="w-20 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-center text-white"
                  />
                  <span className="text-slate-400 text-xs font-bold">đồng</span>
                </div>
              </div>
            </div>

            {/* Special Event Configuration */}
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Sự kiện đặc biệt tại Màn {csdlLevel}
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={csdlEventActive}
                    onChange={(e) => setCsdlEventActive(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  Kích hoạt sự kiện
                </label>
              </div>

              {csdlEventActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Tên sự kiện / Thử thách</label>
                    <input
                      type="text"
                      value={csdlEventName}
                      onChange={(e) => setCsdlEventName(e.target.value)}
                      placeholder="VD: Đại Chiến Đạo Hàm - Nhân Đôi Xu Thưởng"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Mô tả sự kiện</label>
                    <input
                      type="text"
                      value={csdlEventDesc}
                      onChange={(e) => setCsdlEventDesc(e.target.value)}
                      placeholder="VD: Hoàn thành màn này để nhận thêm huy hiệu và phần thưởng đặc biệt!"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Custom Questions Authoring */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Câu hỏi riêng của Màn {csdlLevel} ({csdlQuestions.length} câu)
                  </h4>
                  <p className="text-xs text-slate-500">
                    {csdlQuestions.length === 0
                      ? "Chưa có câu hỏi riêng. Hệ thống sẽ tự động dùng câu hỏi chuẩn từ ngân hàng mặc định."
                      : "Học sinh vượt màn này sẽ làm các câu hỏi riêng do Admin thiết lập dưới đây."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newQ: JourneyQuestionItem = {
                      id: `custom_${csdlSubject}_lvl_${csdlLevel}_${Date.now()}`,
                      subject: csdlSubject,
                      level: csdlLevel,
                      title: `Màn ${csdlLevel} - Câu ${csdlQuestions.length + 1}`,
                      question: "Đề bài câu hỏi mới (hỗ trợ công thức LaTeX $...$)...",
                      options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                      correctIndex: 0,
                      explanation: "Lời giải chi tiết...",
                    };
                    setCsdlQuestions([...csdlQuestions, newQ]);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Thêm câu hỏi riêng
                </button>
              </div>

              <div className="space-y-4">
                {csdlQuestions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400">Câu hỏi #{qIdx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setCsdlQuestions(csdlQuestions.filter((_, idx) => idx !== qIdx))}
                        className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa câu hỏi
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">Nội dung câu hỏi (LaTeX):</label>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...csdlQuestions];
                          updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                          setCsdlQuestions(updated);
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correctIndex === oIdx}
                            onChange={() => {
                              const updated = [...csdlQuestions];
                              updated[qIdx] = { ...updated[qIdx], correctIndex: oIdx };
                              setCsdlQuestions(updated);
                            }}
                            className="text-emerald-500 focus:ring-emerald-400"
                          />
                          <span className="text-xs font-bold text-slate-400">{String.fromCharCode(65 + oIdx)}:</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...csdlQuestions];
                              const newOpts = [...updated[qIdx].options];
                              newOpts[oIdx] = e.target.value;
                              updated[qIdx] = { ...updated[qIdx], options: newOpts };
                              setCsdlQuestions(updated);
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">Lời giải chi tiết:</label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => {
                          const updated = [...csdlQuestions];
                          updated[qIdx] = { ...updated[qIdx], explanation: e.target.value };
                          setCsdlQuestions(updated);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-300">Chưa chọn chiến dịch</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Chọn một chiến dịch từ danh sách bên trái hoặc bấm "Đồng bộ CSDL & Sự kiện" để cấu hình câu hỏi riêng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
