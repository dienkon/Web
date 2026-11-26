import { Question } from "../../../types";
import { useExamEditorContext } from "../context/ExamEditorContext";
import SingleChoiceEditor from "./SingleChoiceEditor";
import MultipleChoiceEditor from "./MultipleChoiceEditor";
import TrueFalseEditor from "./TrueFalseEditor";
import ShortAnswerEditor from "./ShortAnswerEditor";
import OrderingEditor from "./OrderingEditor";
import FillBlankEditor from "./FillBlankEditor";
import MatchingEditor from "./MatchingEditor";
import EssayEditor from "./EssayEditor";
import RichTextEditor from "../editor/RichTextEditor";
import AudioConfigEditor from "../../../components/exam/AudioConfigEditor";
import { Pin, Shuffle } from "lucide-react";
import {
  COGNITIVE_LEVEL_META,
  COGNITIVE_LEVEL_ORDER,
  cognitiveLevelToDifficulty,
  resolveQuestionCognitiveLevel,
  type CognitiveLevel,
} from "../../../utils/cognitiveLevelUtils";

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

      {/* Embedded Question Audio (Listening MP3) */}
      <AudioConfigEditor
        audioConfig={question.audioConfig}
        onChange={(cfg) => update({ audioConfig: cfg, audioUrl: cfg.url })}
        onRemove={() => update({ audioConfig: undefined, audioUrl: null })}
        label="Nhúng bài nghe Audio vào câu hỏi này (MP3)"
        defaultTitle="Audio câu hỏi"
      />

      {/* Type Specific Editor */}
      <div>
        {question.type === "single_choice" && <SingleChoiceEditor question={question} update={update} />}
        {question.type === "multiple_choice" && <MultipleChoiceEditor question={question} update={update} />}
        {question.type === "true_false" && <TrueFalseEditor question={question} update={update} />}
        {question.type === "short_answer" && <ShortAnswerEditor question={question} update={update} />}
        {question.type === "ordering" && <OrderingEditor question={question} update={update} />}
        {question.type === "fill_blank" && <FillBlankEditor question={question} update={update} />}
        {question.type === "matching" && <MatchingEditor question={question} update={update} />}
        {question.type === "essay" && <EssayEditor question={question} update={update} />}
      </div>

      {/* Points & Cognitive Level (NB / TH / VD / VDC) & Shuffling Controls */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="block text-xs font-bold text-slate-700">
              Mức độ nhận thức (Chuẩn ma trận đề thi)
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              {COGNITIVE_LEVEL_META[resolveQuestionCognitiveLevel(question)].description}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COGNITIVE_LEVEL_ORDER.map((lv: CognitiveLevel) => {
              const meta = COGNITIVE_LEVEL_META[lv];
              const isSelected = resolveQuestionCognitiveLevel(question) === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() =>
                    update({
                      level: lv,
                      difficulty: cognitiveLevelToDifficulty(lv),
                    })
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? meta.activePillClass
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70"
                  }`}
                >
                  <span className="font-black">{meta.shortLabel}</span>
                  <span className="opacity-90 font-semibold">• {meta.label}</span>
                </button>
              );
            })}
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
