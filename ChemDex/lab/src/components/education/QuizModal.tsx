import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, X, Award } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

export const QuizModal: React.FC = () => {
  const { quizModalOpen, closeQuizModal, activeExperiment, exitExperiment } = useUiStore();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!quizModalOpen || !activeExperiment) return null;

  const quiz = activeExperiment.quiz;

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    return correct;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Câu Hỏi Củng Cố Kiến Thức</span>
          </div>
          <button
            onClick={closeQuizModal}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Questions */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {quiz.map((q, qIdx) => {
            const isAnswered = selectedAnswers[qIdx] !== undefined;
            const isCorrect = selectedAnswers[qIdx] === q.correctIndex;

            return (
              <div key={qIdx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="font-bold text-xs text-slate-800 leading-relaxed">
                  Câu {qIdx + 1}: {q.questionVi}
                </div>

                <div className="space-y-1.5">
                  {q.optionsVi.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[qIdx] === optIdx;
                    let optionStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

                    if (submitted) {
                      if (optIdx === q.correctIndex) {
                        optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold';
                      } else if (isSelected && !isCorrect) {
                        optionStyle = 'bg-rose-50 border-rose-300 text-rose-800 line-through';
                      }
                    } else if (isSelected) {
                      optionStyle = 'bg-sky-50 border-sky-400 text-sky-800 font-bold shadow-xs';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelect(qIdx, optIdx)}
                        className={`w-full p-2 text-left rounded-lg border text-xs transition-all flex items-center justify-between ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        {submitted && optIdx === q.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {submitted && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 italic">
                    <strong>Giải thích: </strong>{q.explanationVi}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {submitted && (
              <span className="text-xs font-bold text-slate-800">
                Kết quả: {calculateScore()} / {quiz.length} câu đúng
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors"
              >
                Nộp bài kiểm tra
              </button>
            ) : (
              <button
                onClick={() => {
                  closeQuizModal();
                  exitExperiment();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Hoàn thành thí nghiệm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
