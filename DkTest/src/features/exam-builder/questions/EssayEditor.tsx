import React from "react";
import {
  Sparkles,
  Bot,
  UserCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import { Question } from "../../../types";

interface Props {
  question: Question;
  update: (updates: Partial<Question>) => void;
}

export default function EssayEditor({ question, update }: Props) {
  const gradingMode = question.essayGradingMode || "ai";
  const rubric = question.essayRubric || "";
  const gradingPrompt = question.essayGradingPrompt || "";

  const handleApplyDefaultPrompt = () => {
    const defaultPrompt = `Bạn là giám khảo chấm thi tự luận chuyên nghiệp và công tâm. Hãy chấm điểm bài làm của học sinh theo thang điểm tối đa ${question.points || 1.0} điểm.
Đối chiếu bài làm của học sinh với Barem đáp án / Tiêu chí chấm:
"""
${rubric || "Xem câu hỏi và barem đáp án"}
"""
Hãy trả về nhận xét chi tiết gồm:
1. Điểm số chính xác (từ 0 đến ${question.points || 1.0}).
2. Điểm mạnh / các ý đúng đã nêu được.
3. Điểm thiếu sót / lỗi sai cần khắc phục.
4. Lời khuyên cải thiện cách diễn đạt và lập luận.`;
    update({ essayGradingPrompt: defaultPrompt });
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher: AI Grading vs Manual Teacher Review */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
          Phương thức chấm điểm câu tự luận
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => update({ essayGradingMode: "ai" })}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              gradingMode === "ai"
                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 ${
                gradingMode === "ai"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>AI Chấm Tự Động</span>
                {gradingMode === "ai" && (
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-semibold">
                    Đang chọn
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Hệ thống sử dụng Gemini AI đối chiếu với Barem đáp án & Prompt chấm để cho điểm và nhận xét tức thì.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => update({ essayGradingMode: "manual" })}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              gradingMode === "manual"
                ? "bg-purple-50 border-purple-500 ring-2 ring-purple-300 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 ${
                gradingMode === "manual"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Giáo Viên Duyệt Thủ Công</span>
                {gradingMode === "manual" && (
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-semibold">
                    Đang chọn
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Sau khi nộp, hệ thống sẽ <strong>khóa chưa công bố kết quả và điểm</strong> cho đến khi giáo viên vào chấm xong.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Rubric / Solution Guide */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Barem đáp án & Tiêu chí chấm điểm (Rubric)</span>
          </label>
        </div>
        <textarea
          rows={4}
          value={rubric}
          onChange={(e) => update({ essayRubric: e.target.value })}
          placeholder={`Ví dụ:
- Ý 1: Nêu đúng định nghĩa hoặc công thức chính (0.5 điểm)
- Ý 2: Trình bày chi tiết các bước biến đổi/chứng minh (1.0 điểm)
- Ý 3: Kết luận và biện luận điều kiện thực tiễn (0.5 điểm)`}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
        />
        <p className="text-[11px] text-slate-500">
          Cung cấp dàn ý câu trả lời và số điểm tương ứng cho từng ý để AI chấm chính xác hoặc giáo viên tham khảo khi duyệt bài.
        </p>
      </div>

      {/* AI Grading Prompt (if mode === 'ai') */}
      {gradingMode === "ai" && (
        <div className="space-y-1.5 p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Prompt hướng dẫn AI chấm điểm tự luận</span>
            </label>
            <button
              type="button"
              onClick={handleApplyDefaultPrompt}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100 rounded-lg border border-blue-300 transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Điền mẫu Prompt chuẩn</span>
            </button>
          </div>
          <textarea
            rows={4}
            value={gradingPrompt}
            onChange={(e) => update({ essayGradingPrompt: e.target.value })}
            placeholder="Nhập prompt điều khiển AI khi chấm câu này, hoặc nhấn nút 'Điền mẫu Prompt chuẩn' ở trên..."
            className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
          />
        </div>
      )}

      {/* Min / Max Words constraint */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Số từ tối thiểu (Tùy chọn)
          </label>
          <input
            type="number"
            min={0}
            value={question.essayMinWords || ""}
            onChange={(e) =>
              update({ essayMinWords: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="VD: 50 từ"
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Số từ tối đa (Tùy chọn)
          </label>
          <input
            type="number"
            min={0}
            value={question.essayMaxWords || ""}
            onChange={(e) =>
              update({ essayMaxWords: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="VD: 500 từ"
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
