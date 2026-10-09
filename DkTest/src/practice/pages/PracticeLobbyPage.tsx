/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Lobby Page: Grade 12 Practice Center & Curriculum Hub
 * Conforms to GDPT 2018 (Thông tư 32/2018/TT-BGDĐT) and 2025 Exam Format (Quyết định 764/QĐ-BGDĐT).
 */

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Zap,
  Flame,
  Search,
  BookOpen,
  Trophy,
  ArrowRight,
  Sparkles,
  Calculator,
  Layers,
  ChevronRight,
  RotateCcw,
  History,
  Code2,
  Share2,
  Atom,
  FlaskConical,
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  Sliders,
  Play,
  Award,
  Box,
  BarChart3,
  Wind,
  ShieldAlert,
} from "lucide-react";
import { PracticeRegistry } from "../core/PracticeRegistry";
import { PracticeHistoryService } from "../core/PracticeHistoryService";
import { PracticeCategory, PracticeMode, UserQuestionAttempt } from "../core/types";
import OldExamsReviewTab from "../components/OldExamsReviewTab";
import { grade12CatalogService, TopicCatalogSummary } from "../curriculum/grade12CatalogService";
import { ALL_GRADE_12_TAXONOMIES, Grade12Subject } from "../curriculum/grade12Taxonomy";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

const CATEGORIES: Array<{ id: PracticeCategory | "all"; label: string; icon: any; subject?: "math" | "english" | "cs" | "physics" | "chemistry" }> = [
  { id: "all", label: "Tất cả chủ đề", icon: Layers },
  { id: "advanced", label: "📐 Toán học 12", icon: Calculator, subject: "math" },
  { id: "physics", label: "⚛️ Vật Lý 12", icon: Atom, subject: "physics" },
  { id: "chemistry", label: "🧪 Hóa Học 12", icon: FlaskConical, subject: "chemistry" },
  { id: "cs", label: "💻 Tin học 12", icon: Code2, subject: "cs" },
  { id: "english", label: "🇬🇧 Tiếng Anh THPT", icon: BookOpen, subject: "english" },
  { id: "speed", label: "⚡ Thử thách & Tốc độ", icon: Zap, subject: "math" },
  { id: "arithmetic", label: "Phép tính cơ bản", icon: Calculator, subject: "math" },
  { id: "expressions", label: "Thứ tự biểu thức", icon: BookOpen, subject: "math" },
  { id: "equations", label: "Tìm x & Phương trình", icon: Sliders, subject: "math" },
  { id: "fractions", label: "Phân số", icon: Layers, subject: "math" },
  { id: "geometry", label: "Hình học & Đo lường", icon: Layers, subject: "math" },
  { id: "word_problems", label: "Toán lời văn", icon: BookOpen, subject: "math" },
];

export default function PracticeLobbyPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const allModes = PracticeRegistry.getAll();
  const historyStats = PracticeHistoryService.getGlobalStats();
  const pastSessions = PracticeHistoryService.getHistory();

  // Main Workflow Tabs
  // drill: Topic Drill (GDPT 2018 tree)
  // catalog: Mode Catalog (continuous question generators)
  // exam_sim: 2025 Ministry Exam Simulation (QĐ 764)
  // mistakes: Mistake Review (questions answered wrongly)
  // review: Old exams & retakes
  type PracticeTab = "drill" | "catalog" | "exam_sim" | "mistakes" | "review";

  const [activeTab, setActiveTab] = useState<PracticeTab>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "review") return "review";
    if (tabParam === "drill") return "drill";
    if (tabParam === "exam_sim") return "exam_sim";
    if (tabParam === "mistakes") return "mistakes";
    return "drill"; // Default to authentic Grade 12 Topic Drill
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "review" && activeTab !== "review") setActiveTab("review");
    else if (tabParam === "catalog" && activeTab !== "catalog") setActiveTab("catalog");
    else if (tabParam === "exam_sim" && activeTab !== "exam_sim") setActiveTab("exam_sim");
    else if (tabParam === "mistakes" && activeTab !== "mistakes") setActiveTab("mistakes");
    else if (tabParam === "drill" && activeTab !== "drill") setActiveTab("drill");
  }, [searchParams]);

  const [selectedSubject, setSelectedSubject] = useState<"all" | Grade12Subject | "english">("math");
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory | "all">("all");
  const [selectedGrade, setSelectedGrade] = useState<number | "all">(12);
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | "choice" | "true_false_group" | "numeric">("all");

  // Toast notification for sharing
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  // Modal for launching a mode with custom difficulty & length
  const [selectedModeForLaunch, setSelectedModeForLaunch] = useState<PracticeMode | null>(null);
  const [chosenDiff, setChosenDiff] = useState<number | string>("random");
  const [chosenTarget, setChosenTarget] = useState<number | "endless">(10);
  const [isCustomTarget, setIsCustomTarget] = useState(false);
  const [customTargetInput, setCustomTargetInput] = useState("");

  // Handle URL share & category/subject parameters
  useEffect(() => {
    const subParam = searchParams.get("subject");
    if (subParam && ["math", "physics", "chemistry", "computer_science", "english"].includes(subParam)) {
      setSelectedSubject(subParam as any);
    }
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategory(catParam as any);
      if (catParam === "physics") setSelectedSubject("physics");
      if (catParam === "chemistry") setSelectedSubject("chemistry");
      if (catParam === "cs") setSelectedSubject("computer_science");
      if (catParam === "english") setSelectedSubject("english");
    }

    const modeParam = searchParams.get("mode");
    if (modeParam) {
      const targetMode = allModes.find((m) => m.id === modeParam);
      if (targetMode) {
        setSelectedModeForLaunch(targetMode);
        const diffParam = searchParams.get("diff");
        setChosenDiff(diffParam === "random" ? "random" : parseInt(diffParam || "1", 10) || diffParam || "random");
      }
    }
  }, [searchParams, allModes]);

  // Catalog summaries for subjects
  const allCatalogSummaries = useMemo(() => {
    return grade12CatalogService.getAllSubjectsSummary();
  }, []);

  // Filtered topics for Curriculum Tree Drill
  const filteredTopics = useMemo(() => {
    const subKey = selectedSubject === "all" || selectedSubject === "english" ? undefined : (selectedSubject as Grade12Subject);
    return grade12CatalogService.searchTopics({
      subject: subKey,
      query: searchQuery,
      format: formatFilter === "all" ? undefined : formatFilter,
    });
  }, [selectedSubject, searchQuery, formatFilter]);

  // Filtered Modes for generator cards
  const filteredModes = useMemo(() => {
    return allModes.filter((m) => {
      if (selectedSubject === "physics" && m.category !== "physics") return false;
      if (selectedSubject === "chemistry" && m.category !== "chemistry") return false;
      if (selectedSubject === "computer_science" && m.category !== "cs") return false;
      if (selectedSubject === "english" && m.category !== "english") return false;
      if (selectedSubject === "math" && ["english", "cs", "physics", "chemistry"].includes(m.category)) return false;

      if (selectedCategory !== "all" && m.category !== selectedCategory) return false;

      if (selectedGrade !== "all") {
        const [minG, maxG] = m.gradeRange;
        if (selectedGrade < minG || selectedGrade > maxG) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = m.title.toLowerCase().includes(q);
        const inDesc = m.description.toLowerCase().includes(q);
        const inTag = m.shortTag?.toLowerCase().includes(q) || false;
        return inTitle || inDesc || inTag;
      }
      return true;
    });
  }, [allModes, selectedSubject, selectedCategory, selectedGrade, searchQuery]);

  // Aggregate missed questions from student history
  const mistakeAttempts = useMemo(() => {
    const mistakes: UserQuestionAttempt[] = [];
    const seenIds = new Set<string>();

    pastSessions.forEach((sess) => {
      if (sess.attempts && Array.isArray(sess.attempts)) {
        sess.attempts.forEach((att) => {
          if (!att.isCorrect && att.question && !seenIds.has(att.question.id)) {
            seenIds.add(att.question.id);
            mistakes.push(att);
          }
        });
      }
    });

    return mistakes.slice(0, 30);
  }, [pastSessions]);

  const handleOpenLaunchModal = (mode: PracticeMode) => {
    setSelectedModeForLaunch(mode);
    setChosenDiff("random");
    setIsCustomTarget(false);
    setCustomTargetInput("");
    const def = mode.defaultLength;
    const initialCount =
      typeof def === "number"
        ? def
        : def === "quick"
        ? 5
        : def === "marathon"
        ? 20
        : def === "endless"
        ? "endless"
        : 10;
    setChosenTarget(initialCount);
  };

  const handleShareMode = (
    e: React.MouseEvent,
    modeId: string,
    diff?: number | string,
    target?: number | "endless"
  ) => {
    e.stopPropagation();
    let url = `${window.location.origin}/practice?mode=${encodeURIComponent(modeId)}`;
    if (diff !== undefined && diff !== "random") url += `&diff=${encodeURIComponent(diff)}`;
    if (target !== undefined) url += `&target=${encodeURIComponent(target)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast("Đã sao chép liên kết chia sẻ minigame!"))
        .catch(() => prompt("Sao chép liên kết chia sẻ minigame:", url));
    } else {
      prompt("Sao chép liên kết chia sẻ minigame:", url);
    }
  };

  const handleStartSession = () => {
    if (!selectedModeForLaunch) return;
    const targetParam = chosenTarget === "endless" ? "endless" : String(chosenTarget);
    navigate(`/practice/${selectedModeForLaunch.id}?diff=${chosenDiff}&target=${targetParam}`);
  };

  // Start exam simulation
  const handleStartExamSimulation = (subject: Grade12Subject) => {
    const defaultModeMap: Record<Grade12Subject, string> = {
      math: "math_calculus_analysis",
      physics: "physics_thermal_gas",
      chemistry: "chem_ester_lipid",
      computer_science: "code_trace_loop",
    };
    const modeId = defaultModeMap[subject];
    const examQuestionCount = ALL_GRADE_12_TAXONOMIES[subject].examQuestionCount.total;
    navigate(`/practice/${modeId}?diff=2&target=${examQuestionCount}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white pt-10 pb-14 px-4 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-100 text-xs font-semibold mb-3 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Trung tâm Luyện thi Lớp 12 • Chương trình GDPT 2018</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Không gian Luyện tập THPT Quốc Gia
              </h1>
              <p className="mt-2 text-blue-100 text-xs sm:text-base max-w-2xl leading-relaxed">
                Đầy đủ 4 môn Toán, Vật Lý, Hóa Học, Tin Học theo cấu trúc đề thi 2025 (QĐ 764/QĐ-BGDĐT) với trắc nghiệm 4 lựa chọn, chùm câu Đúng/Sai và trả lời ngắn.
              </p>
            </div>

            {/* Quick Stats Panel */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-2 sm:px-3">
                <div className="text-[11px] text-blue-200 font-medium">Lượt đã luyện</div>
                <div className="text-xl sm:text-2xl font-black">{historyStats.totalSessions}</div>
              </div>
              <div className="px-2 sm:px-3 border-x border-white/10">
                <div className="text-[11px] text-blue-200 font-medium">Câu đã giải</div>
                <div className="text-xl sm:text-2xl font-black">{historyStats.totalQuestions}</div>
              </div>
              <div className="px-2 sm:px-3">
                <div className="text-[11px] text-blue-200 font-medium">Chuỗi đúng max</div>
                <div className="text-xl sm:text-2xl font-black text-amber-300 flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5 fill-amber-300" />
                  <span>x{historyStats.maxStreak}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        {/* Navigation Tabs (5 workflow entry points) */}
        <div className="flex items-center gap-1.5 overflow-x-auto mb-6 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xs no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab("drill");
              setSearchParams({ tab: "drill" });
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "drill"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Luyện chuyên đề (GDPT 2018)</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              activeTab === "drill" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
            }`}>
              Cốt lõi
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("catalog");
              setSearchParams({ tab: "catalog" });
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "catalog"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Kho chế độ sinh câu hỏi</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              activeTab === "catalog" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              40+ dạng
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("exam_sim");
              setSearchParams({ tab: "exam_sim" });
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "exam_sim"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Mô phỏng đề thi 2025</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              activeTab === "exam_sim" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
            }`}>
              QĐ 764
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("mistakes");
              setSearchParams({ tab: "mistakes" });
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "mistakes"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Target className="w-4 h-4 text-rose-500" />
            <span>Luyện câu sai</span>
            {mistakeAttempts.length > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                {mistakeAttempts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("review");
              setSearchParams({ tab: "review" });
            }}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "review"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Ôn tập bài cũ</span>
          </button>
        </div>

        {/* TAB 1: CURRICULUM TREE DRILL (GDPT 2018) */}
        {activeTab === "drill" && (
          <div className="space-y-6">
            {/* Subject Selector Bar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chọn môn học ôn luyện trọng tâm:
                </span>
                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                  Chuẩn GDPT 2018
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSubject("math")}
                  className={`min-h-[50px] p-3 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
                    selectedSubject === "math"
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <span>Toán học 12</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-70">
                    {allCatalogSummaries.math.totalTopics} bài
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSubject("physics")}
                  className={`min-h-[50px] p-3 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
                    selectedSubject === "physics"
                      ? "border-rose-600 bg-rose-50 text-rose-900 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Atom className="w-4 h-4 text-rose-600" />
                    <span>Vật Lý 12</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-70">
                    {allCatalogSummaries.physics.totalTopics} bài
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSubject("chemistry")}
                  className={`min-h-[50px] p-3 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
                    selectedSubject === "chemistry"
                      ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    <span>Hóa Học 12</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-70">
                    {allCatalogSummaries.chemistry.totalTopics} bài
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSubject("computer_science")}
                  className={`min-h-[50px] p-3 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
                    selectedSubject === "computer_science"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    <span>Tin Học 12</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-70">
                    {allCatalogSummaries.computer_science.totalTopics} bài
                  </span>
                </button>
              </div>

              {/* Search & Format Filter */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên bài học, khái niệm, công thức..."
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-hidden transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <span className="text-xs text-slate-400 font-semibold uppercase mr-1">Định dạng:</span>
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "choice", label: "Phần I: 4 chọn 1" },
                    { id: "true_false_group", label: "Phần II: Đúng/Sai" },
                    { id: "numeric", label: "Phần III: Trả lời ngắn" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormatFilter(f.id as any)}
                      className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer ${
                        formatFilter === f.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Curriculum Tree Explorer */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <span>Chuyên đề theo phân phối chương trình</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({filteredTopics.length} chuyên đề)
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTopics.map((item) => {
                  const isAvailable = item.status === "available";

                  return (
                    <div
                      key={item.topic.id}
                      className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                        isAvailable
                          ? "border-slate-200 hover:border-blue-400 hover:shadow-sm"
                          : "border-slate-200 bg-slate-50/50 opacity-90"
                      }`}
                    >
                      <div>
                        {/* Header: Code & Chapter Title */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.topic.code}
                          </span>
                          <span className="text-xs text-slate-400 truncate max-w-[200px]">
                            {item.topic.chapterTitle}
                          </span>
                        </div>

                        {/* Topic Title */}
                        <h4 className="font-bold text-slate-800 text-base mb-1.5 leading-snug">
                          {item.topic.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                          {item.topic.description}
                        </p>

                        {/* Supported Formats Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {item.topic.supportedFormats.map((fmt) => (
                            <span
                              key={fmt}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                            >
                              {fmt === "choice"
                                ? "4 lựa chọn"
                                : fmt === "true_false_group"
                                ? "Đúng/Sai (Phần II)"
                                : fmt === "numeric"
                                ? "Trả lời ngắn (Phần III)"
                                : fmt}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer: Honest status badge & Launch button */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          {isAvailable ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{item.itemCount}+ câu sẵn sàng</span>
                            </span>
                          ) : item.status === "in_progress" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <span>Đang cập nhật ({item.itemCount} câu)</span>
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                              Đang biên soạn nội dung
                            </span>
                          )}
                        </div>

                        {item.modeIds.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const targetMode = PracticeRegistry.get(item.modeIds[0]);
                              if (targetMode) handleOpenLaunchModal(targetMode);
                            }}
                            className="min-h-[40px] px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Luyện ngay</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="min-h-[40px] px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                          >
                            Sắp ra mắt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MODE CATALOG */}
        {activeTab === "catalog" && (
          <div className="space-y-6">
            {/* Filters Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm chế độ luyện tập..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-hidden transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <span className="text-xs font-semibold text-slate-400 mr-1 uppercase">Khối lớp:</span>
                  <button
                    onClick={() => setSelectedGrade("all")}
                    className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                      selectedGrade === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Tất cả
                  </button>
                  {[12, 11, 10, 9].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGrade(g)}
                      className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                        selectedGrade === g ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Lớp {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pt-4 no-scrollbar">
                {CATEGORIES.map((cat) => {
                  const IconComp = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredModes.map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => handleOpenLaunchModal(mode)}
                  className="group bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {mode.shortTag || "Lớp 12"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-400">
                          Lớp {mode.gradeRange[0]} - {mode.gradeRange[1]}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleShareMode(e, mode.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Chia sẻ minigame"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors mb-1.5 flex items-center justify-between">
                      <span>{mode.title}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{mode.description}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {mode.difficultyLevels?.length || 3} cấp độ khó
                    </span>
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:underline">
                      <span>Bắt đầu</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: 2025 EXAM SIMULATION (QĐ 764) */}
        {activeTab === "exam_sim" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold mb-3">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>Quyết định số 764/QĐ-BGDĐT ngày 08/03/2024</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                Mô phỏng Đề thi Tốt nghiệp THPT từ năm 2025
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100 max-w-3xl mt-2 leading-relaxed">
                Đề thi chuẩn hóa gồm 3 phần: Phần I (Trắc nghiệm nhiều lựa chọn), Phần II (Trắc nghiệm Đúng/Sai với thang điểm phi tuyến), và Phần III (Trả lời ngắn).
              </p>
            </div>

            {/* Ministry Scoring Curve Explainer */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-950 text-xs sm:text-sm">
              <h4 className="font-bold flex items-center gap-2 text-amber-900 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Quy tắc chấm điểm Phần II (Đúng/Sai) theo quy định Bộ Giáo dục & Đào tạo:</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-medium">
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-center">
                  <div className="text-xs text-slate-500">1 ý đúng</div>
                  <div className="font-bold text-blue-700 text-base">0,10 điểm</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-center">
                  <div className="text-xs text-slate-500">2 ý đúng</div>
                  <div className="font-bold text-blue-700 text-base">0,25 điểm</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-center">
                  <div className="text-xs text-slate-500">3 ý đúng</div>
                  <div className="font-bold text-blue-700 text-base">0,50 điểm</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-center">
                  <div className="text-xs text-slate-500">4 ý đúng</div>
                  <div className="font-bold text-emerald-700 text-base">1,00 điểm</div>
                </div>
              </div>
            </div>

            {/* 4 Subjects Exam Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[
                {
                  sub: "math" as Grade12Subject,
                  name: "Toán học 12",
                  icon: Calculator,
                  color: "blue",
                  duration: 90,
                  totalQ: 22,
                  p1: 12,
                  p2: 4,
                  p3: 6,
                },
                {
                  sub: "physics" as Grade12Subject,
                  name: "Vật Lý 12",
                  icon: Atom,
                  color: "rose",
                  duration: 50,
                  totalQ: 28,
                  p1: 18,
                  p2: 4,
                  p3: 6,
                },
                {
                  sub: "chemistry" as Grade12Subject,
                  name: "Hóa Học 12",
                  icon: FlaskConical,
                  color: "amber",
                  duration: 50,
                  totalQ: 28,
                  p1: 18,
                  p2: 4,
                  p3: 6,
                },
                {
                  sub: "computer_science" as Grade12Subject,
                  name: "Tin Học 12",
                  icon: Code2,
                  color: "indigo",
                  duration: 50,
                  totalQ: 30,
                  p1: 24,
                  p2: 6,
                  p3: 0,
                },
              ].map((card) => {
                const IconC = card.icon;

                return (
                  <div
                    key={card.sub}
                    className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                            <IconC className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-lg text-slate-800">{card.name}</h3>
                            <span className="text-xs text-slate-400">Thời gian làm bài: {card.duration} phút</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {card.totalQ} câu hỏi
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl mb-5">
                        <div className="flex justify-between">
                          <span>Phần I (Trắc nghiệm 4 lựa chọn):</span>
                          <span className="font-bold text-slate-800">{card.p1} câu</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phần II (Trắc nghiệm Đúng/Sai):</span>
                          <span className="font-bold text-slate-800">{card.p2} câu</span>
                        </div>
                        {card.p3 > 0 && (
                          <div className="flex justify-between">
                            <span>Phần III (Trả lời ngắn):</span>
                            <span className="font-bold text-slate-800">{card.p3} câu</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartExamSimulation(card.sub)}
                      className="w-full min-h-[44px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Bắt đầu thi thử {card.name} ({card.duration}p)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: MISTAKE REVIEW (LUYỆN CÂU SAI) */}
        {activeTab === "mistakes" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-rose-500" />
                  <h3 className="font-black text-slate-800 text-lg">
                    Danh sách câu làm sai cần củng cố ({mistakeAttempts.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Tự động tổng hợp từ lịch sử luyện tập</span>
              </div>

              {mistakeAttempts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 text-base">Tuyệt vời! Không có câu sai nào cần ôn tập.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hãy làm thêm các bài luyện chuyên đề để kiểm tra kiến thức nhé.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mistakeAttempts.map((att, idx) => (
                    <div
                      key={att.question.id || idx}
                      className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 text-left space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold text-rose-700">Câu sai #{idx + 1}</span>
                        <span>Độ khó: {att.question.difficulty}/5</span>
                      </div>

                      <div className="font-medium text-slate-800 text-sm">
                        <LatexPreview content={att.question.prompt} />
                      </div>

                      {att.question.explanation && (
                        <div className="text-xs text-slate-600 bg-white/90 p-3 rounded-xl border border-rose-100">
                          <span className="font-bold text-slate-700">Hướng dẫn giải: </span>
                          <LatexPreview content={att.question.explanation} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: OLD EXAMS REVIEW */}
        {activeTab === "review" && <OldExamsReviewTab />}
      </div>

      {/* Launch Configuration Modal */}
      {selectedModeForLaunch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-black text-slate-800 mb-1">
              {selectedModeForLaunch.title}
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {selectedModeForLaunch.description}
            </p>

            {/* Difficulty Selector */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                Mức độ thử thách:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChosenDiff("random")}
                  className={`min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                    chosenDiff === "random"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  🎲 Ngẫu nhiên
                </button>
                {selectedModeForLaunch.difficultyLevels.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setChosenDiff(lvl.id)}
                    className={`min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                      chosenDiff === lvl.id
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {lvl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Questions Count */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                Số lượng câu hỏi:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setChosenTarget(count);
                      setIsCustomTarget(false);
                    }}
                    className={`min-h-[44px] py-2 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                      chosenTarget === count && !isCustomTarget
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {count} câu
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setChosenTarget("endless");
                    setIsCustomTarget(false);
                  }}
                  className={`min-h-[44px] py-2 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                    chosenTarget === "endless" && !isCustomTarget
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  ∞ Vô tận
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedModeForLaunch(null)}
                className="w-1/3 min-h-[44px] py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                className="w-2/3 min-h-[44px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Bắt đầu ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
