import React from "react";
import { Plus, HelpCircle, CheckCircle2, Type, Sparkles } from "lucide-react";
import { Question } from "../../../types";

interface Props {
  question: Question;
  update: (updates: Partial<Question>) => void;
}

export function extractBlanksCount(text: string): number {
  if (!text) return 0;
  const matches = text.match(/\[_\]|\[blank\]/gi);
  return matches ? matches.length : 0;
}

export default function FillBlankEditor({ question, update }: Props) {
  const blanksCount = extractBlanksCount(question.text);
  const acceptedAnswersMap: Record<number, string[]> = question.acceptedAnswersPerBlank || {};

  const handleAddBlankPlaceholder = () => {
    const updatedText = question.text ? `${question.text} [_]` : "[_]";
    update({ text: updatedText });
  };

  const handleUpdateBlankAnswers = (blankIndex: number, rawInput: string) => {
    // Split by comma or semicolon or newline
    const answers = rawInput
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newMap = {
      ...acceptedAnswersMap,
      [blankIndex]: answers.length > 0 ? answers : [rawInput.trim()],
    };

    update({ acceptedAnswersPerBlank: newMap });
  };

  return (
    <div className="space-y-4">
      {/* Helper & Quick Insert */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <span className="font-bold">Cách soạn câu hỏi điền lỗ:</span> Hãy nhập ký hiệu <code className="px-1.5 py-0.5 bg-blue-200/80 rounded font-mono font-bold text-blue-950">[_]</code> vào bất kỳ vị trí nào trong câu hỏi. Hệ thống sẽ tự động tạo ô điền từ cho học sinh và tạo ô cấu hình đáp án tương ứng bên dưới!
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddBlankPlaceholder}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Chèn nhanh [_]</span>
        </button>
      </div>

      {/* Detected Blanks Count */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-600" />
          <span>Đáp án hợp lệ cho từng ô trống ({blanksCount} vị trí phát hiện)</span>
        </label>
      </div>

      {blanksCount === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-2">
          <p className="text-sm font-medium text-slate-600">
            Chưa có vị trí điền lỗ nào trong nội dung câu hỏi.
          </p>
          <p className="text-xs text-slate-400">
            Thêm ký hiệu <span className="font-mono font-bold text-indigo-600">[_]</span> vào ô "Nội dung câu hỏi" ở trên để bắt đầu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: blanksCount }).map((_, index) => {
            const currentAnswers = acceptedAnswersMap[index] || [];
            const displayValue = currentAnswers.join(", ");

            return (
              <div
                key={index}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Ô trống số #{index + 1}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Nhập nhiều đáp án đúng cách nhau bởi dấu phẩy ",")
                  </span>
                </div>

                <input
                  type="text"
                  value={displayValue}
                  onChange={(e) => handleUpdateBlankAnswers(index, e.target.value)}
                  placeholder="Ví dụ: Hà Nội, Ha Noi, Hanoi, tp hà nội"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                />

                {currentAnswers.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-semibold text-slate-400">Các đáp án được tính là ĐÚNG:</span>
                    {currentAnswers.map((ans, aIdx) => (
                      <span
                        key={aIdx}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold"
                      >
                        ✓ {ans}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Case sensitivity & whitespace options */}
      <div className="pt-2 flex flex-wrap gap-4 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={question.caseSensitive || false}
            onChange={(e) => update({ caseSensitive: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
          />
          <span>Phân biệt chữ hoa / chữ thường</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={question.trimWhitespace !== false}
            onChange={(e) => update({ trimWhitespace: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
          />
          <span>Tự động bỏ khoảng trắng thừa đầu/cuối</span>
        </label>
      </div>
    </div>
  );
}
