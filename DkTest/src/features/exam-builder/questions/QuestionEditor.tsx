import { Question } from "../../../types";
import { useExamEditorContext } from "../context/ExamEditorContext";
import SingleChoiceEditor from "./SingleChoiceEditor";
import MultipleChoiceEditor from "./MultipleChoiceEditor";
import TrueFalseEditor from "./TrueFalseEditor";
import ShortAnswerEditor from "./ShortAnswerEditor";
import OrderingEditor from "./OrderingEditor";
import FillBlankEditor from "./FillBlankEditor";
import RichTextEditor from "../editor/RichTextEditor";
import { Pin, Shuffle } from "lucide-react";

export default function QuestionEditor({ question }: { question: Question }) {
  const { actions } = useExamEditorContext();

  const update = (updates: Partial<Question>) => {
    actions.updateQuestion(question.id, updates);
  };

  const isChoiceType = question.type === "single_choice" || question.type === "multiple_choice";

  return (
    <div className="space-y-6">
      {/* Content Editor */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Nội dung câu hỏi</label>
        <RichTextEditor
          value={question.text}
          onChange={(text) => update({ text })}
          placeholder="Nhập nội dung câu hỏi (hỗ trợ LaTeX bằng $công thức$ hoặc $$công thức khối$$)..."
        />
      </div>

      {/* Type Specific Editor */}
      <div>
        {question.type === "single_choice" && <SingleChoiceEditor question={question} update={update} />}
        {question.type === "multiple_choice" && <MultipleChoiceEditor question={question} update={update} />}
        {question.type === "true_false" && <TrueFalseEditor question={question} update={update} />}
        {question.type === "short_answer" && <ShortAnswerEditor question={question} update={update} />}
        {question.type === "ordering" && <OrderingEditor question={question} update={update} />}
        {question.type === "fill_blank" && <FillBlankEditor question={question} update={update} />}
      </div>

      {/* Points & Difficulty & Specific Shuffling Controls */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mức độ nhận thức</label>
            <select
              value={question.difficulty || "medium"}
              onChange={(e) => update({ difficulty: e.target.value as any })}
              className="w-full sm:w-64 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
            >
              <option value="easy">Dễ (Nhận biết)</option>
              <option value="medium">Trung bình (Thông hiểu)</option>
              <option value="hard">Khó (Vận dụng cao)</option>
            </select>
          </div>
        </div>

        {/* Shuffling options for this question */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={question.pinQuestion || false}
              onChange={(e) => update({ pinQuestion: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
            />
            <Pin className="w-3.5 h-3.5 text-blue-600" />
            <span>Cố định vị trí câu hỏi này (không đảo thứ tự khi phát đề)</span>
          </label>

          {isChoiceType && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={question.shuffleOptions !== false}
                onChange={(e) => update({ shuffleOptions: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
              />
              <Shuffle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cho phép xáo trộn đáp án (A, B, C, D) câu này</span>
            </label>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Lời giải chi tiết / Giải thích đáp án</label>
        <RichTextEditor
          value={question.explanation || ""}
          onChange={(text) => update({ explanation: text })}
          placeholder="Nhập lời giải chi tiết để học sinh xem lại sau khi hoàn thành..."
          minHeight="90px"
        />
      </div>
    </div>
  );
}
