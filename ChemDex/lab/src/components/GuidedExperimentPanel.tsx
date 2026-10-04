import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { EXPERIMENT_CURRICULUM, ExperimentGuide } from '../data/experiments';
import { BookOpen, CheckCircle2, ChevronRight, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react';

export function GuidedExperimentPanel() {
  const { 
    language, 
    activeExperimentId, 
    setActiveExperimentId, 
    activeStepIndex, 
    setActiveStepIndex,
    setupExperimentPreset
  } = useAppStore();

  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  const currentExperiment = EXPERIMENT_CURRICULUM.find(e => e.id === activeExperimentId);

  // If no experiment selected, show curriculum catalog
  if (!currentExperiment) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-wider mb-1">
            <BookOpen size={15} />
            <span>{t('Standard Curriculum Experiments', 'Chương trình thí nghiệm chuẩn')}</span>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            {t('Select an experiment below to follow teacher-designed protocols and test your understanding.', 'Chọn một thí nghiệm chuẩn để làm theo quy trình sư phạm và kiểm tra kiến thức.')}
          </p>
        </div>

        <div className="space-y-2.5">
          {EXPERIMENT_CURRICULUM.map(exp => (
            <div 
              key={exp.id}
              onClick={() => {
                setActiveExperimentId(exp.id);
                setSelectedQuizAnswer(null);
                setShowExplanation(false);
              }}
              className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md p-3.5 rounded-xl cursor-pointer transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {language === 'en' ? exp.title_en : exp.title_vi}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  exp.difficulty === 'basic' ? 'bg-emerald-50 text-emerald-700' :
                  exp.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                }`}>
                  {exp.difficulty}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {language === 'en' ? exp.objective_en : exp.objective_vi}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentStep = currentExperiment.steps[activeStepIndex];
  const totalSteps = currentExperiment.steps.length;
  const isLastStep = activeStepIndex >= totalSteps - 1;

  return (
    <div className="space-y-4">
      {/* Experiment Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveExperimentId(null)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← {t('All Experiments', 'Tất cả thí nghiệm')}
          </button>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {t('Step', 'Bước')} {activeStepIndex + 1} / {totalSteps}
          </span>
        </div>
        
        <h2 className="text-sm font-bold text-slate-900 leading-snug">
          {language === 'en' ? currentExperiment.title_en : currentExperiment.title_vi}
        </h2>
        
        <p className="text-xs text-slate-600 leading-relaxed">
          {language === 'en' ? currentExperiment.objective_en : currentExperiment.objective_vi}
        </p>

        {/* Safety Advisory Banner */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 text-amber-800 text-[11px] leading-relaxed">
          <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span>{language === 'en' ? currentExperiment.safetyAdvisory_en : currentExperiment.safetyAdvisory_vi}</span>
        </div>

        {/* Auto-setup Workbench Button for Teachers and Students */}
        <button
          onClick={() => setupExperimentPreset(currentExperiment.id)}
          className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <Sparkles size={14} className="text-amber-300" />
          <span>{t('Auto-Setup Lab Workbench', 'Tự động bày bàn thí nghiệm')}</span>
        </button>
      </div>

      {/* Current Step Protocol */}
      {currentStep && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              {currentStep.stepNumber}
            </span>
            <h3 className="text-xs font-bold text-slate-800">
              {language === 'en' ? currentStep.title_en : currentStep.title_vi}
            </h3>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs text-slate-700 leading-relaxed font-medium">
            {language === 'en' ? currentStep.instruction_en : currentStep.instruction_vi}
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
            <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">{t('Expected Observation: ', 'Hiện tượng dự kiến: ')}</span>
              <span>{language === 'en' ? currentStep.expectedResult_en : currentStep.expectedResult_vi}</span>
            </div>
          </div>

          {/* Navigation between steps */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button 
              disabled={activeStepIndex === 0}
              onClick={() => setActiveStepIndex(Math.max(0, activeStepIndex - 1))}
              className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {t('Previous', 'Trước')}
            </button>
            <button 
              disabled={isLastStep}
              onClick={() => setActiveStepIndex(Math.min(totalSteps - 1, activeStepIndex + 1))}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm disabled:opacity-40"
            >
              <span>{t('Next Step', 'Bước tiếp')}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Conceptual Knowledge Quiz */}
      {currentExperiment.quizzes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <HelpCircle size={15} />
            <span>{t('Conceptual Knowledge Quiz', 'Câu hỏi củng cố kiến thức')}</span>
          </div>

          {currentExperiment.quizzes.map((quiz, qIdx) => (
            <div key={qIdx} className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {language === 'en' ? quiz.question_en : quiz.question_vi}
              </p>

              <div className="space-y-1.5">
                {(language === 'en' ? quiz.options_en : quiz.options_vi).map((opt, oIdx) => {
                  const isSelected = selectedQuizAnswer === oIdx;
                  const isCorrect = oIdx === quiz.correctAnswer;
                  let btnStyle = 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200';
                  if (showExplanation) {
                    if (isCorrect) btnStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
                    else if (isSelected) btnStyle = 'bg-red-50 text-red-800 border-red-300';
                  } else if (isSelected) {
                    btnStyle = 'bg-blue-50 text-blue-700 border-blue-300 font-semibold';
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => {
                        setSelectedQuizAnswer(oIdx);
                        setShowExplanation(true);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${btnStyle}`}
                    >
                      <span className="font-mono mr-2 font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
                  selectedQuizAnswer === quiz.correctAnswer ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  <div className="font-bold mb-1 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>{selectedQuizAnswer === quiz.correctAnswer ? t('Correct Answer!', 'Chính xác!') : t('Review Explanation:', 'Giải thích chi tiết:')}</span>
                  </div>
                  {language === 'en' ? quiz.explanation_en : quiz.explanation_vi}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
