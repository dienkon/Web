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
  ExternalLink,
} from "lucide-react";
import {
  PromptCustomConfig,
  DEFAULT_PROMPT_CONFIG,
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

  const [copied, setCopied] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!isOpen) return null;

  const fullPrompt = buildFullChatGptPrompt(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ChatGPT Master Prompt Schema v3</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Tạo Prompt Chuẩn Cho ChatGPT / Claude / Gemini
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Tùy chỉnh thông tin môn học & chủ đề, copy prompt kèm <strong>Schema JSON đầy đủ 100%</strong> để nhận đề thi chuẩn xác nhất từ AI.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Independent Scrolling */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Customizer Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>1. Tùy chỉnh thông tin đề thi của bạn:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Môn học:</label>
                <textarea
                  rows={3}
                  value={config.subject}
                  onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                  placeholder="VD: Toán học, Tiếng Anh, Vật lý..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Khối lớp / Cấp học:</label>
                <textarea
                  rows={3}
                  value={config.grade}
                  onChange={(e) => setConfig({ ...config, grade: e.target.value })}
                  placeholder="VD: Lớp 10, Lớp 12, Ôn thi Đại học..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Chủ đề & Nội dung kiểm tra chi tiết:</label>
                <textarea
                  rows={3}
                  value={config.topic}
                  onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  placeholder="VD: Khảo sát hàm số, Bất đẳng thức, Di truyền Men-đen, Thì quá khứ hoàn thành..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Đối tượng học sinh / Mục đích thi:</label>
                <textarea
                  rows={3}
                  value={config.audience}
                  onChange={(e) => setConfig({ ...config, audience: e.target.value })}
                  placeholder="VD: Ôn tập kiểm tra 1 tiết, Thi học kỳ, Luyện thi THPTQG..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thời gian làm bài (phút):</span>
                </label>
                <input type="number" value={config.timeLimit === 0 ? "" : config.timeLimit}
                  onChange={(e) => setConfig({ ...config, timeLimit: e.target.value === "" ? 0 : (parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                  <span>Số lượng câu hỏi:</span>
                </label>
                <input type="number" value={config.questionCount === 0 ? "" : config.questionCount}
                  onChange={(e) => setConfig({ ...config, questionCount: e.target.value === "" ? 0 : (parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Mức độ phân hóa:</label>
                <textarea
                  rows={3}
                  value={config.difficulty}
                  onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                  placeholder="VD: 50% Thông hiểu, 30% Vận dụng, 20% Vận dụng cao"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Yêu cầu đặc biệt (tùy chọn):</label>
                <textarea
                  rows={3}
                  value={config.additionalInfo || ""}
                  onChange={(e) => setConfig({ ...config, additionalInfo: e.target.value })}
                  placeholder="VD: Kèm theo bài đọc đoạn văn tiếng Anh, hoặc có câu hỏi thực tế..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-blue-900">Bước 1: Copy Prompt</span>
              <p className="text-blue-800 font-medium">
                Bấm nút <strong>"Sao chép Prompt"</strong> bên dưới để copy toàn bộ nội dung kèm Schema JSON.
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-indigo-900">Bước 2: Gửi ChatGPT</span>
              <p className="text-indigo-800 font-medium">
                Dán vào ChatGPT/Claude kèm file ảnh hoặc đề thô nếu có. AI sẽ trả về khối mã JSON.
              </p>
            </div>
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
              <span className="font-extrabold text-emerald-900">Bước 3: Nạp JSON vào DkTEST</span>
              <p className="text-emerald-800 font-medium">
                Dán JSON vào mục <strong>Nhập mã JSON</strong> để rà soát theo dạng  và xuất đề.
              </p>
            </div>
          </div>

          {/* Prompt Preview Accordion */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>Xem trước toàn bộ nội dung Prompt & Schema JSON ({fullPrompt.length} ký tự)</span>
              </div>
              {showFullPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFullPreview && (
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-64 scrollbar-thin whitespace-pre-wrap">
                {fullPrompt}
              </pre>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Prompt đã được tối ưu cho <strong>ChatGPT Plus, GPT-4o, Claude 3.5 Sonnet & Gemini Pro</strong>.
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
