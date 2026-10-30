import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { EXPERIMENT_QUIZZES } from '../../data/experimentQuizzes';
import { X, Award, CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { soundEngine } from '../../services/soundEngine';

interface ExperimentQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExperimentQuizModal: React.FC<ExperimentQuizModalProps> = ({ isOpen, onClose }) => {
  const { activeExperiment, language } = useLabStore();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Find quiz for current active experiment, or default to neutralization
  const expId = activeExperiment ? activeExperiment.id : 'exp-neutralization';
  const quiz = EXPERIMENT_QUIZZES.find(q => q.experimentId === expId) || EXPERIMENT_QUIZZES[0];

  const handleSelect = (questionId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIdx }));
    soundEngine.click();
  };

  const calculateScore = () => {
    let correct = 0;
    for (const q of quiz.questions) {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    }
    return {
      correct,
      total: quiz.questions.length,
      pct: Math.round((correct / quiz.questions.length) * 100),
    };
  };

  const score = calculateScore();
  const hasPassed = score.pct >= 66;

  const handleSubmit = () => {
    setIsSubmitted(true);
    try{const progress=JSON.parse(localStorage.getItem('chemdex:experiment-scores')??'{}');progress[expId]={...score,submittedAt:new Date().toISOString()};localStorage.setItem('chemdex:experiment-scores',JSON.stringify(progress));}catch{}
    if (hasPassed) {
      soundEngine.ignite(); // celebratory audio cue
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {language === 'vi' ? quiz.title_vi : quiz.title_en}
              </h2>
              <p className="text-[11px] text-slate-500">
                {language === 'vi' ? 'Đánh giá kiến thức thực nghiệm & lý thuyết hóa học' : 'Experimental knowledge & theoretical chemistry test'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quiz Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Questions */}
          {quiz.questions.map((q, idx) => {
            const userChoice = selectedAnswers[q.id];
            const isAnswered = userChoice !== undefined;
            const isCorrect = userChoice === q.correctIndex;

            return (
              <div key={q.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-start gap-2.5 mb-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-xs font-bold text-slate-800 leading-snug">
                    {language === 'vi' ? q.question_vi : q.question_en}
                  </h3>
                </div>

                {/* Options List */}
                <div className="space-y-2 pl-8">
                  {(language === 'vi' ? q.options_vi : q.options_en).map((opt, optIdx) => {
                    const isOptionSelected = userChoice === optIdx;
                    let style = 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 text-slate-700';

                    if (isSubmitted) {
                      if (optIdx === q.correctIndex) {
                        style = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (isOptionSelected) {
                        style = 'border-red-400 bg-red-50 text-red-900';
                      } else {
                        style = 'border-slate-200 bg-white opacity-60 text-slate-500';
                      }
                    } else if (isOptionSelected) {
                      style = 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold ring-1 ring-blue-600';
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelect(q.id, optIdx)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center gap-2.5 ${style}`}
                      >
                        <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] shrink-0 font-mono">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isSubmitted && optIdx === q.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {isSubmitted && isOptionSelected && optIdx !== q.correctIndex && (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation upon submission */}
                {isSubmitted && (
                  <div className="mt-3.5 pl-8 text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-200 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">
                        {language === 'vi' ? 'Giải thích: ' : 'Explanation: '}
                      </span>
                      <span>{language === 'vi' ? q.explanation_vi : q.explanation_en}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Result Card when submitted */}
          {isSubmitted && (
            <div className={`p-4 rounded-xl border text-center ${
              hasPassed ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
            }`}>
              <span className="text-3xl mb-1 block">{hasPassed ? '🎉' : '📚'}</span>
              <h4 className="text-sm font-bold text-slate-800">
                {language === 'vi'
                  ? (hasPassed ? 'Chúc mừng! Bạn đã hoàn thành bài kiểm tra!' : 'Cần ôn tập thêm kiến thức')
                  : (hasPassed ? 'Congratulations! Test Passed!' : 'Review Recommended')}
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                {language === 'vi'
                  ? `Kết quả: ${score.correct} / ${score.total} câu đúng (${score.pct}%)`
                  : `Score: ${score.correct} / ${score.total} (${score.pct}%)`}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          {isSubmitted ? (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Làm lại bài' : 'Retake Quiz'}</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              {Object.keys(selectedAnswers).length} / {quiz.questions.length} {language === 'vi' ? 'câu đã chọn' : 'answered'}
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <span>{language === 'vi' ? 'Nộp bài kiểm tra' : 'Submit Answers'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                {language === 'vi' ? 'Hoàn thành' : 'Done'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
