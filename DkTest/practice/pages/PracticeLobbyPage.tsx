import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Heart,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { PracticeRegistry } from "../core/PracticeRegistry";
import { PracticeHistoryService } from "../core/PracticeHistoryService";
import { PracticeCategory, PracticeMode } from "../core/types";

const CATEGORIES: Array<{ id: PracticeCategory | "all"; label: string; icon: any; subject?: "math" | "english" }> = [
  { id: "all", label: "Tất cả chủ đề", icon: Layers },
  { id: "english", label: "🇬🇧 Tiếng Anh Luyện tập", icon: BookOpen, subject: "english" },
  { id: "speed", label: "⚡ Thử thách & Tốc độ", icon: Zap, subject: "math" },
  { id: "arithmetic", label: "Phép tính cơ bản", icon: Calculator, subject: "math" },
  { id: "expressions", label: "Thứ tự biểu thức", icon: BookOpen, subject: "math" },
  { id: "equations", label: "Tìm x & Phương trình", icon: Sliders, subject: "math" },
  { id: "fractions", label: "Phân số", icon: Layers, subject: "math" },
  { id: "advanced", label: "Số học nâng cao", icon: Sparkles, subject: "math" },
  { id: "geometry", label: "Hình học & Đo lường", icon: Layers, subject: "math" },
  { id: "word_problems", label: "Toán lời văn", icon: BookOpen, subject: "math" },
];

export default function PracticeLobbyPage() {
  const navigate = useNavigate();
  const allModes = PracticeRegistry.getAll();
  const historyStats = PracticeHistoryService.getGlobalStats();

  const [selectedSubject, setSelectedSubject] = useState<"all" | "math" | "english">("all");
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory | "all">("all");
  const [selectedGrade, setSelectedGrade] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal for launching a mode with custom difficulty & length
  const [selectedModeForLaunch, setSelectedModeForLaunch] = useState<PracticeMode | null>(null);
  const [chosenDiff, setChosenDiff] = useState<number | string>("random");
  const [chosenTarget, setChosenTarget] = useState<number | "endless">(10);

  // Filter modes
  const filteredModes = useMemo(() => {
    return allModes.filter((m) => {
      // Subject filter
      if (selectedSubject === "math" && m.category === "english") return false;
      if (selectedSubject === "english" && m.category !== "english") return false;

      // Category filter
      if (selectedCategory !== "all" && m.category !== selectedCategory) return false;

      // Grade filter
      if (selectedGrade !== "all") {
        const [minG, maxG] = m.gradeRange;
        if (selectedGrade < minG || selectedGrade > maxG) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesDesc = m.description.toLowerCase().includes(q);
        const matchesTag = m.shortTag?.toLowerCase().includes(q) || false;
        return matchesTitle || matchesDesc || matchesTag;
      }

      return true;
    });
  }, [allModes, selectedCategory, selectedGrade, searchQuery]);

  const handleOpenLaunchModal = (mode: PracticeMode) => {
    setSelectedModeForLaunch(mode);
    setChosenDiff("random");
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

  const handleStartSession = () => {
    if (!selectedModeForLaunch) return;
    const targetParam = chosenTarget === "endless" ? "endless" : String(chosenTarget);
    navigate(`/practice/${selectedModeForLaunch.id}?diff=${chosenDiff}&target=${targetParam}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Hero Header */}
      <div className="bg-linear-to-b from-blue-700 via-indigo-700 to-indigo-800 text-white pt-10 pb-14 px-4 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-100 text-xs font-semibold mb-3 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Hệ thống luyện tập độc lập DkTEST • Sinh câu hỏi vô tận</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Trung tâm Luyện tập Toán</h1>
              <p className="mt-2 text-blue-100 text-sm sm:text-base max-w-xl">
                Rèn luyện kỹ năng tính toán, chinh phục các dạng toán kinh điển và nâng cao phản xạ với hơn 35+ chế độ sinh đề tự động.
              </p>
            </div>

            {/* Quick Stats Panel */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 text-center">
              <div className="px-2 sm:px-3">
                <div className="text-xs text-blue-200 font-medium">Lượt đã luyện</div>
                <div className="text-xl sm:text-2xl font-black">{historyStats.totalSessions}</div>
              </div>
              <div className="px-2 sm:px-3 border-x border-white/10">
                <div className="text-xs text-blue-200 font-medium">Câu đã giải</div>
                <div className="text-xl sm:text-2xl font-black">{historyStats.totalQuestions}</div>
              </div>
              <div className="px-2 sm:px-3">
                <div className="text-xs text-blue-200 font-medium">Chuỗi đúng kỷ lục</div>
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
        {/* Filters Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 mb-8">
          {/* Search bar & Grade Pills */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm chủ đề, từ khóa..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all"
              />
            </div>

            {/* Grade Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-400 mr-1 uppercase">Khối lớp:</span>
              <button
                onClick={() => setSelectedGrade("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                  selectedGrade === "all" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>
              {[3, 4, 5, 6, 7, 8, 9].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                    selectedGrade === g ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Filter Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 mr-1 uppercase">Môn học:</span>
            <button
              onClick={() => { setSelectedSubject("all"); setSelectedCategory("all"); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedSubject === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🌐 Tất cả môn
            </button>
            <button
              onClick={() => { setSelectedSubject("math"); setSelectedCategory("all"); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedSubject === "math"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              📐 Môn Toán
            </button>
            <button
              onClick={() => { setSelectedSubject("english"); setSelectedCategory("english"); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedSubject === "english"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🇬🇧 Môn Tiếng Anh (Mới)
            </button>
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            Danh sách chế độ ({filteredModes.length})
          </h2>
          <span className="text-xs text-slate-500">Bấm vào chế độ để bắt đầu luyện tập</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredModes.map((mode) => {
            const stats = historyStats.byMode[mode.id];

            return (
              <div
                key={mode.id}
                onClick={() => handleOpenLaunchModal(mode)}
                className="group bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {mode.shortTag || "Toán"}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      Lớp {mode.gradeRange[0]} - {mode.gradeRange[1]}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors mb-1.5 flex items-center justify-between">
                    <span>{mode.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{mode.description}</p>
                </div>

                {/* Bottom stats & levels */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{mode.difficultyLevels?.length || 5} cấp độ</span>
                  </div>

                  {stats && stats.timesPlayed > 0 ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>{stats.bestScore}đ</span>
                    </div>
                  ) : (
                    <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-1">
                      <span>Bắt đầu</span>
                      <Play className="w-3 h-3 fill-current" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredModes.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 my-8">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">Không tìm thấy chế độ nào</h3>
            <p className="text-xs text-slate-500">Hãy thử chọn danh mục khác hoặc xóa từ khóa tìm kiếm.</p>
          </div>
        )}
      </div>

      {/* Mode Launch Modal */}
      {selectedModeForLaunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {selectedModeForLaunch.shortTag || "Cấu hình luyện tập"}
              </span>
              <button
                onClick={() => setSelectedModeForLaunch(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <h3 className="text-xl font-bold text-slate-800">{selectedModeForLaunch.title}</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6 leading-relaxed">
              {selectedModeForLaunch.description}
            </p>

            {/* Difficulty Picker */}
            {selectedModeForLaunch.difficultyLevels && selectedModeForLaunch.difficultyLevels.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Chọn mức độ khó:
                </label>
                <div className="space-y-1.5 max-h-[40vh] sm:max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                  {[
                    { id: "random", name: "Ngẫu nhiên (Đề xuất)", description: "Các câu hỏi sẽ thay đổi mức độ khó liên tục.", examples: "Dễ, vừa, khó đan xen" },
                    ...selectedModeForLaunch.difficultyLevels
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setChosenDiff(lvl.id)}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                        chosenDiff === lvl.id
                          ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold ring-2 ring-blue-100"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="font-bold text-sm flex items-center justify-between">
                        <span>{lvl.name}</span>
                        {chosenDiff === lvl.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                      </div>
                      <div className="opacity-80 mt-0.5 line-clamp-2">{lvl.description}</div>
                      {lvl.examples && (
                        <div className="text-[11px] text-blue-600 font-mono mt-1 opacity-90 truncate">Ví dụ: {lvl.examples}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target Question Count (Unless game rule prescribes it) */}
            {!selectedModeForLaunch.gameRule && (
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Số lượng câu hỏi:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, "endless"].map((t) => (
                    <button
                      key={String(t)}
                      onClick={() => setChosenTarget(t as any)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        chosenTarget === t
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      {t === "endless" ? "Vô hạn (∞)" : `${t} câu`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSelectedModeForLaunch(null)}
                className="flex-1 py-3 text-sm font-semibold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleStartSession}
                className="flex-1 py-3 text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Bắt đầu ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
