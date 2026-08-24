import React, { useEffect, useRef, useState } from "react";
import { Check, X, ArrowRight, Lightbulb, Sparkles, HelpCircle } from "lucide-react";
import { PracticeQuestion, PracticeUserAnswer } from "../core/types";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Props {
  question: PracticeQuestion;
  currentAnswer: any;
  onChangeAnswer: (ans: any) => void;
  onSubmitAnswer: () => void;
  onNextQuestion: () => void;
  userResult: PracticeUserAnswer | null; // evaluated result if answered
  isSubmitted: boolean;
  disabled?: boolean;
}

export default function PracticeQuestionView({
  question,
  currentAnswer,
  onChangeAnswer,
  onSubmitAnswer,
  onNextQuestion,
  userResult,
  isSubmitted,
  disabled = false,
}: Props) {
  const numericInputRef = useRef<HTMLInputElement>(null);
  const fracNumRef = useRef<HTMLInputElement>(null);
  const fracDenRef = useRef<HTMLInputElement>(null);

  const [showExplanation, setShowExplanation] = useState(false);

  // Auto-focus input when moving to a new question
  useEffect(() => {
    setShowExplanation(false);
    if (!isSubmitted) {
      if (question.type === "numeric") {
        setTimeout(() => numericInputRef.current?.focus(), 50);
      } else if (question.type === "fraction") {
        setTimeout(() => fracNumRef.current?.focus(), 50);
      }
    }
  }, [question.id, isSubmitted]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in general unless Enter or Choice keys
      if (e.key === "Enter") {
        e.preventDefault();
        if (isSubmitted) {
          onNextQuestion();
        } else {
          onSubmitAnswer();
        }
      } else if (!isSubmitted) {
        if (question.type === "choice" && question.options) {
          const keyNum = parseInt(e.key);
          if (keyNum >= 1 && keyNum <= question.options.length) {
            onChangeAnswer(question.options[keyNum - 1].id);
          }
        } else if (question.type === "comparison") {
          if (e.key === ">" || e.key === "." || e.key === "1") onChangeAnswer(">");
          if (e.key === "<" || e.key === "," || e.key === "2") onChangeAnswer("<");
          if (e.key === "=" || e.key === "3") onChangeAnswer("=");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitted, currentAnswer, question, onNextQuestion, onSubmitAnswer, onChangeAnswer]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 py-4">
      {/* Question Card */}
      <div
        className={`bg-white rounded-3xl p-6 sm:p-8 shadow-sm border transition-all ${
          isSubmitted
            ? userResult?.isCorrect
              ? "border-emerald-300 ring-4 ring-emerald-50"
              : "border-rose-300 ring-4 ring-rose-50"
            : "border-slate-200 hover:shadow-md"
        }`}
      >
        {/* Subtitle / Question type header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            {question.subText || "Câu hỏi luyện tập"}
          </span>
          <span className="text-xs font-medium text-slate-400">Độ khó: {question.difficulty}/5</span>
        </div>

        {/* Prompt & LaTeX Formula */}
        <div className="text-center my-4 sm:my-6">
          {question.latex ? (
            <div className="text-2xl sm:text-4xl font-bold text-slate-900 py-2">
              <LatexPreview content={`$$${question.latex}$$`} className="text-slate-900" />
            </div>
          ) : (
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{question.prompt}</h2>
          )}

          {question.latex && question.prompt && question.prompt !== question.latex && (
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg mx-auto whitespace-pre-line">
              {question.prompt}
            </p>
          )}
        </div>

        {/* Input Interface */}
        <div className="mt-6 flex flex-col items-center">
          {/* Numeric Input */}
          {question.type === "numeric" && (
            <div className="w-full max-w-xs flex flex-col items-center gap-3">
              <input
                ref={numericInputRef}
                type="text"
                inputMode="decimal"
                disabled={isSubmitted || disabled}
                value={currentAnswer ?? ""}
                onChange={(e) => onChangeAnswer(e.target.value)}
                placeholder="Nhập kết quả..."
                className={`w-full text-center text-2xl font-bold px-4 py-3.5 rounded-2xl border-2 transition-all outline-hidden ${
                  isSubmitted
                    ? userResult?.isCorrect
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                      : "bg-rose-50 border-rose-400 text-rose-800"
                    : "bg-slate-50/80 border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                }`}
              />

              {/* Distractor option buttons for quick click */}
              {question.options && question.options.length > 0 && !isSubmitted && (
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {question.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeAnswer(opt.id)}
                      className={`px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
                        String(currentAnswer) === String(opt.id)
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 active:scale-95"
                      }`}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fraction Input */}
          {question.type === "fraction" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-1.5 w-32">
                <input
                  ref={fracNumRef}
                  type="text"
                  inputMode="numeric"
                  disabled={isSubmitted || disabled}
                  value={currentAnswer?.numerator ?? ""}
                  onChange={(e) =>
                    onChangeAnswer({
                      numerator: e.target.value,
                      denominator: currentAnswer?.denominator ?? "",
                    })
                  }
                  placeholder="Tử số"
                  className="w-full text-center text-xl font-bold px-3 py-2 rounded-xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                />
                <div className="w-full h-1 bg-slate-700 rounded-full" />
                <input
                  ref={fracDenRef}
                  type="text"
                  inputMode="numeric"
                  disabled={isSubmitted || disabled}
                  value={currentAnswer?.denominator ?? ""}
                  onChange={(e) =>
                    onChangeAnswer({
                      numerator: currentAnswer?.numerator ?? "",
                      denominator: e.target.value,
                    })
                  }
                  placeholder="Mẫu số"
                  className="w-full text-center text-xl font-bold px-3 py-2 rounded-xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                />
              </div>

              {/* Option choices for fraction */}
              {question.options && question.options.length > 0 && !isSubmitted && (
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {question.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const parts = opt.id.split("/");
                        if (parts.length === 2) {
                          onChangeAnswer({ numerator: parts[0], denominator: parts[1] });
                        }
                      }}
                      className="px-3 py-2 text-sm font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 active:scale-95 transition-all flex items-center justify-center"
                    >
                      {opt.latex ? <LatexPreview content={`$${opt.latex}$`} /> : opt.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Multiple Choice Options */}
          {question.type === "choice" && question.options && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {question.options.map((opt, idx) => {
                const isSelected = String(currentAnswer) === String(opt.id);
                const isCorrectOpt = isSubmitted && String(question.correctAnswer) === String(opt.id);
                const isWrongSelected = isSubmitted && isSelected && !userResult?.isCorrect;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isSubmitted || disabled}
                    onClick={() => onChangeAnswer(opt.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left font-medium transition-all ${
                      isCorrectOpt
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm"
                        : isWrongSelected
                        ? "bg-rose-50 border-rose-400 text-rose-900"
                        : isSelected
                        ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                        isCorrectOpt
                          ? "bg-emerald-500 text-white"
                          : isWrongSelected
                          ? "bg-rose-500 text-white"
                          : isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <div className="flex-1 text-sm sm:text-base">
                      {opt.latex ? <LatexPreview content={`$${opt.latex}$`} /> : opt.text}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Comparison (> < =) */}
          {question.type === "comparison" && (
            <div className="flex items-center justify-center gap-4 mt-2">
              {[
                { symbol: ">", label: "Lớn hơn (>)" },
                { symbol: "=", label: "Bằng (=)" },
                { symbol: "<", label: "Bé hơn (<)" },
              ].map((item) => {
                const isSelected = currentAnswer === item.symbol;
                const isCorrect = isSubmitted && question.correctAnswer === item.symbol;
                const isWrong = isSubmitted && isSelected && !userResult?.isCorrect;

                return (
                  <button
                    key={item.symbol}
                    type="button"
                    disabled={isSubmitted || disabled}
                    onClick={() => onChangeAnswer(item.symbol)}
                    className={`w-20 sm:w-24 h-16 sm:h-20 text-3xl font-black rounded-2xl border-2 flex items-center justify-center transition-all ${
                      isCorrect
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 scale-105"
                        : isWrong
                        ? "bg-rose-50 border-rose-400 text-rose-700"
                        : isSelected
                        ? "bg-blue-50 border-blue-600 text-blue-700 scale-105 shadow-md"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 active:scale-95"
                    }`}
                  >
                    {item.symbol}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button (Submit / Next) */}
        <div className="mt-8 flex items-center justify-center">
          {!isSubmitted ? (
            <button
              type="button"
              disabled={
                disabled ||
                currentAnswer === undefined ||
                currentAnswer === null ||
                currentAnswer === "" ||
                (question.type === "fraction" && (!currentAnswer.numerator || !currentAnswer.denominator))
              }
              onClick={onSubmitAnswer}
              className="w-full max-w-sm px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
            >
              <span>Kiểm tra đáp án</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextQuestion}
              className="w-full max-w-sm px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Câu tiếp theo (Phím Enter)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Result & Explanation Feedback Panel */}
      {isSubmitted && userResult && (
        <div
          className={`rounded-3xl p-5 sm:p-6 border transition-all ${
            userResult.isCorrect
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
              : "bg-rose-50/80 border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  userResult.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                }`}
              >
                {userResult.isCorrect ? <Check className="w-6 h-6 stroke-[3]" /> : <X className="w-6 h-6 stroke-[3]" />}
              </div>
              <div>
                <h4 className="font-bold text-base sm:text-lg">
                  {userResult.isCorrect ? "Chính xác! Xuất sắc!" : "Chưa chính xác rồi!"}
                </h4>
                <p className="text-xs sm:text-sm opacity-80">
                  {userResult.isCorrect ? `+${userResult.scoreEarned} điểm` : "Hãy xem kỹ lời giải chi tiết bên dưới nhé"}
                </p>
              </div>
            </div>

            {question.explanation && (
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-semibold shadow-2xs border border-slate-200/60 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>{showExplanation ? "Thu gọn lời giải" : "Xem lời giải"}</span>
              </button>
            )}
          </div>

          {/* Explanation content */}
          {(showExplanation || !userResult.isCorrect) && question.explanation && (
            <div className="mt-4 pt-4 border-t border-black/5">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Hướng dẫn giải chi tiết:</span>
              </h5>
              <div className="text-sm sm:text-base leading-relaxed text-slate-800 bg-white/90 p-4 rounded-2xl border border-slate-200/60 whitespace-pre-line">
                <LatexPreview content={question.explanation} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
