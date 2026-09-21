import React, { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  X,
  FileCode,
  BookOpen,
  GraduationCap,
  Clock,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Headphones,
  Paperclip,
  Shuffle,
  Eye,
  Sliders,
  Award,
  Zap,
  RotateCcw,
} from "lucide-react";
import {
  PromptCustomConfig,
  DEFAULT_PROMPT_CONFIG,
  MASTER_PROMPT_PRESETS,
  buildFullChatGptPrompt,
} from "../../utils/prompt/chatGptMasterPrompt";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
}

export default function ChatGPTMasterPromptModal({ isOpen, onClose, initialTopic }: Props) {
  const [config, setConfig] = useState<PromptCustomConfig>({
    ...DEFAULT_PROMPT_CONFIG,
    topic: initialTopic || DEFAULT_PROMPT_CONFIG.topic,
  });

  const [activeTab, setActiveTab] = useState<"general" | "types" | "levels" | "advanced">("general");
  const [copied, setCopied] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!isOpen) return null;

  const fullPrompt = buildFullChatGptPrompt(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = MASTER_PROMPT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
    }));
  };

  const cog = config.cognitiveLevels || { recognition: 40, comprehension: 30, application: 20, advanced: 10 };
  const cogTotal = cog.recognition + cog.comprehension + cog.application + cog.advanced;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ChatGPT Master Prompt Engine 2026</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Tạo Master Prompt Đề Thi Chuẩn DkTEST
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Tùy chỉnh thông số chi tiết, cấu trúc Bộ GD&ĐT, độ khó và phòng thi. Prompt tự động đồng bộ theo các lựa chọn trên UI để bạn sao chép gửi cho ChatGPT/Claude/Gemini.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1 shrink-0 mr-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Mẫu đề nhanh:</span>
            </span>
            {MASTER_PROMPT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                title={preset.desc}
              >
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-5 pt-2 shrink-0 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "general"
                ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Thông tin chung</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("types")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "types"
                ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Cấu trúc & Dạng câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("levels")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "levels"
                ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>3. Phân bố mức độ (%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("advanced")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "advanced"
                ? "bg-white text-indigo-700 border-indigo-600 shadow-2xs"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>4. Cài đặt phòng thi & Nâng cao</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: General Info */}
          {activeTab === "general" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Môn học:</label>
                  <input
                    type="text"
                    value={config.subject}
                    onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                    placeholder="VD: Toán học, Tiếng Anh, Tin học, Vật lý..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Khối lớp / Cấp học:</label>
                  <input
                    type="text"
                    value={config.grade}
                    onChange={(e) => setConfig({ ...config, grade: e.target.value })}
                    placeholder="VD: Lớp 10, Lớp 12, Ôn thi Tốt nghiệp THPT..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Chủ đề & Trọng tâm bài thi:</label>
                  <textarea
                    rows={2}
                    value={config.topic}
                    onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                    placeholder="VD: Khảo sát hàm số, Hình không gian Oxyz, Di truyền học, Cấu trúc dữ liệu & Giải thuật..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Đối tượng học sinh & Mục đích:</label>
                  <input
                    type="text"
                    value={config.audience}
                    onChange={(e) => setConfig({ ...config, audience: e.target.value })}
                    placeholder="VD: Ôn thi tốt nghiệp THPT Quốc gia 2026, Thi Đánh giá năng lực HSA..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Thời gian làm bài (phút):</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={config.timeLimit || ""}
                    onChange={(e) =>
                      setConfig({ ...config, timeLimit: e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                    <span>Số lượng câu hỏi:</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={config.questionCount || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        questionCount: e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thang điểm tổng:</label>
                  <select
                    value={config.scoreScale || 10}
                    onChange={(e) => setConfig({ ...config, scoreScale: parseInt(e.target.value, 10) as 10 | 100 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={10}>Thang điểm 10 (Chuẩn phổ thông)</option>
                    <option value={100}>Thang điểm 100</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phong cách lời giải (Explanation):</label>
                  <select
                    value={config.pedagogyStyle || "detailed_steps"}
                    onChange={(e) => setConfig({ ...config, pedagogyStyle: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="detailed_steps">Chi tiết từng bước, lập luận sư phạm rõ ràng</option>
                    <option value="quick_tips">Kèm mẹo tư duy nhanh, bấm máy CASIO fx-580 VN X</option>
                    <option value="standard">Chuẩn xác, ngắn gọn</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Question Types & Sections */}
          {activeTab === "types" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Cấu trúc Phần thi (Sections):</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: "bogiaoduc_3parts",
                      title: "Chuẩn Bộ GD&ĐT (3 Phần)",
                      desc: "Phần I (1 ĐA), Phần II (Đúng/Sai 4 ý), Phần III (Trả lời ngắn)",
                    },
                    {
                      id: "by_topic",
                      title: "Theo chuyên đề kiến thức",
                      desc: "Tách theo các chủ điểm kiến thức riêng biệt trong bài thi",
                    },
                    {
                      id: "single_section",
                      title: "1 Phần duy nhất (Liên mạch)",
                      desc: "Gộp toàn bộ câu hỏi vào một phần, không chia nhỏ",
                    },
                  ].map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setConfig({ ...config, examStructure: sec.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        config.examStructure === sec.id
                          ? "bg-indigo-50 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold text-xs">{sec.title}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{sec.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="font-bold text-slate-700 block">Chọn các dạng câu hỏi cần tạo:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { id: "single_choice", label: "Trắc nghiệm 1 đáp án", desc: "single_choice (4 phương án A, B, C, D)" },
                    { id: "multiple_choice", label: "Trắc nghiệm nhiều đáp án", desc: "multiple_choice (chọn tất cả đáp án đúng)" },
                    { id: "true_false", label: "Đúng/Sai 4 ý (Bộ GD&ĐT)", desc: "true_false (ý a, b, c, d độc lập)" },
                    { id: "short_answer", label: "Điền kết quả ngắn", desc: "short_answer (điền số thực, phân số, từ khóa)" },
                    { id: "ordering", label: "Sắp xếp thứ tự", desc: "ordering (kéo thả thứ tự quy trình, thuật toán)" },
                    { id: "fill_blank", label: "Điền khuyết [_]", desc: "fill_blank (điền từ vào chỗ trống trong đoạn văn)" },
                  ].map((item) => {
                    const isSelected = (config.questionTypes || []).includes(item.id as any);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-50/80 border-indigo-300 text-indigo-900"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = config.questionTypes || [];
                            const next = e.target.checked
                              ? [...current, item.id as any]
                              : current.filter((t) => t !== item.id);
                            setConfig({ ...config, questionTypes: next });
                          }}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Cognitive Levels (%) */}
          {activeTab === "levels" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">Tỷ lệ phân bố 4 mức độ nhận thức</h4>
                  <p className="text-slate-500 text-[11px]">
                    Điều chỉnh tỷ lệ % câu hỏi theo ma trận đề thi chuẩn của Bộ Giáo Dục
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full font-bold text-xs border ${
                    cogTotal === 100
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }`}
                >
                  Tổng: {cogTotal}% {cogTotal === 100 ? "✓ (Chuẩn)" : "⚠️ (Nên đạt 100%)"}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-blue-700 block">1. Nhận biết</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={cog.recognition}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cognitiveLevels: { ...cog, recognition: parseInt(e.target.value, 10) || 0 },
                        })
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-center text-sm"
                    />
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-emerald-700 block">2. Thông hiểu</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={cog.comprehension}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cognitiveLevels: { ...cog, comprehension: parseInt(e.target.value, 10) || 0 },
                        })
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-center text-sm"
                    />
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-amber-700 block">3. Vận dụng</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={cog.application}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cognitiveLevels: { ...cog, application: parseInt(e.target.value, 10) || 0 },
                        })
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-center text-sm"
                    />
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-rose-700 block">4. Vận dụng cao</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={cog.advanced}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cognitiveLevels: { ...cog, advanced: parseInt(e.target.value, 10) || 0 },
                        })
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-center text-sm"
                    />
                    <span className="text-slate-500 font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Progress visual bar */}
              <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                <div style={{ width: `${Math.min(100, cog.recognition)}%` }} className="bg-blue-500" title="Nhận biết" />
                <div style={{ width: `${Math.min(100, cog.comprehension)}%` }} className="bg-emerald-500" title="Thông hiểu" />
                <div style={{ width: `${Math.min(100, cog.application)}%` }} className="bg-amber-500" title="Vận dụng" />
                <div style={{ width: `${Math.min(100, cog.advanced)}%` }} className="bg-rose-500" title="Vận dụng cao" />
              </div>
            </div>
          )}

          {/* TAB 4: Advanced Exam Settings */}
          {activeTab === "advanced" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Shuffle Questions */}
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.shuffleQuestions ?? false}
                    onChange={(e) => setConfig({ ...config, shuffleQuestions: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>🔀 Tự động đảo thứ tự câu hỏi khi thí sinh làm bài</span>
                </label>

                {/* Shuffle Options */}
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.shuffleOptions ?? false}
                    onChange={(e) => setConfig({ ...config, shuffleOptions: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>🔀 Tự động xáo trộn các phương án A, B, C, D</span>
                </label>

                {/* Show Results Immediately */}
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showResultsImmediately ?? true}
                    onChange={(e) => setConfig({ ...config, showResultsImmediately: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>📊 Cho phép học sinh xem điểm số ngay sau khi nộp</span>
                </label>

                {/* Show Details/Explanations */}
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showExplanationsImmediately ?? true}
                    onChange={(e) => setConfig({ ...config, showExplanationsImmediately: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>💡 Hiển thị bảng giải thích chi tiết từng câu</span>
                </label>

                {/* Audio Listening */}
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.hasAudio ?? false}
                    onChange={(e) => setConfig({ ...config, hasAudio: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>🎧 Tích hợp bài nghe Audio MP3 (Listening)</span>
                </label>

                {/* Attachments */}
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.hasAttachments ?? false}
                    onChange={(e) => setConfig({ ...config, hasAttachments: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>📎 Đính kèm tệp / link tra cứu bổ trợ</span>
                </label>

                {/* Sub-exam cut */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allowSubExam ?? false}
                      onChange={(e) => setConfig({ ...config, allowSubExam: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>✂️ Cắt đề ngẫu nhiên (Sub-Exam)</span>
                  </label>
                  {config.allowSubExam && (
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-slate-500">Mỗi thí sinh lấy:</span>
                      <input
                        type="number"
                        value={config.subExamQuestionCount || 20}
                        onChange={(e) =>
                          setConfig({ ...config, subExamQuestionCount: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-20 px-2 py-1 border border-slate-300 rounded-lg font-bold text-center"
                      />
                      <span className="text-slate-500">câu</span>
                    </div>
                  )}
                </div>

                {/* Programming Language style */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <label className="font-bold text-slate-700 block">Ngôn ngữ code môn Tin học:</label>
                  <select
                    value={config.programmingLanguage || "all"}
                    onChange={(e) => setConfig({ ...config, programmingLanguage: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="all">Song song Python 3 & C++ (Chuẩn Discord)</option>
                    <option value="python">Chỉ dùng Python 3</option>
                    <option value="cpp">Chỉ dùng C++</option>
                    <option value="pascal">Pascal / Delphi</option>
                    <option value="none">Không có mã nguồn (Môn lý thuyết)</option>
                  </select>
                </div>
              </div>

              {/* Special Note Textarea */}
              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="font-bold text-slate-700">Yêu cầu bổ sung đặc biệt (tùy chọn):</label>
                <textarea
                  rows={2}
                  value={config.additionalInfo || ""}
                  onChange={(e) => setConfig({ ...config, additionalInfo: e.target.value })}
                  placeholder="VD: Kèm theo bài đọc đoạn văn tiếng Anh, công thức giải thuật Python, hoặc câu hỏi tình huống thực tế..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Workflow Steps Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-blue-900">Bước 1: Copy Master Prompt</span>
              <p className="text-blue-800 font-medium">
                Bấm nút <strong>"Sao chép Prompt đầy đủ"</strong> để copy toàn bộ nội dung kèm Schema JSON đã tùy biến.
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-indigo-900">Bước 2: Dán vào AI</span>
              <p className="text-indigo-800 font-medium">
                Dán vào ChatGPT/Claude/Gemini kèm ảnh tài liệu nếu có. AI sẽ sinh ra khối mã JSON đề thi chuẩn xác 100%.
              </p>
            </div>
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-emerald-900">Bước 3: Nạp JSON vào DkTEST</span>
              <p className="text-emerald-800 font-medium">
                Dán JSON vào mục <strong>Nhập mã JSON</strong> trong DkTEST để xem trước đề thi và tổ chức thi ngay!
              </p>
            </div>
          </div>

          {/* Prompt Preview Accordion */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-100 hover:bg-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>
                  Xem trước nội dung Prompt sinh tự động ({fullPrompt.length} ký tự - Cập nhật tức thì)
                </span>
              </div>
              {showFullPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFullPreview && (
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-72 scrollbar-thin whitespace-pre-wrap">
                {fullPrompt}
              </pre>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Tối ưu cho <strong>ChatGPT Plus (GPT-4o), Claude 3.5 Sonnet & Gemini Pro</strong>.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Đã sao chép vào bộ nhớ tạm!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Sao chép Prompt đầy đủ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
