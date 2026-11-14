import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, HelpCircle, Lightbulb, BookOpen, Activity, Award } from 'lucide-react';

export const GuidedExperimentHUD: React.FC = () => {
  const {
    activeExperiment,
    currentStepIndex,
    stepCompleted,
    nextStep,
    completeExperiment,
    prevStep,
    language,
    selectExperiment,
    toggleTitrationCurve,
    toggleQuizModal,
  } = useLabStore();

  const [showTheory, setShowTheory] = useState(false);

  if (!activeExperiment) return null;

  const step = activeExperiment.steps[currentStepIndex];
  if (!step) return null;

  const totalSteps = activeExperiment.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const title = language === 'vi' ? activeExperiment.title_vi : activeExperiment.title_en;
  const stepTitle = language === 'vi' ? step.title_vi : step.title_en;
  const instruction = language === 'vi' ? step.instruction_vi : step.instruction_en;
  const hint = language === 'vi' ? step.hint_vi : step.hint_en;
  const theory = language === 'vi' ? step.theory_vi : step.theory_en;

  return (
    <div className="relative z-20 shrink-0 px-2.5 sm:px-4 pt-1.5 sm:pt-2 pb-1.5 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs select-none animate-in fade-in duration-200">
      <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
          <h2 className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-blue-600 shrink-0">
            {language === 'vi' ? 'Bài thực hành' : 'Guided Lab'}
          </h2>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-xs font-bold sm:font-semibold text-slate-800 truncate">{title}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-slate-500 font-semibold">
            {language === 'vi' ? `Bước ${currentStepIndex + 1} / ${totalSteps}` : `Step ${currentStepIndex + 1} of ${totalSteps}`}
          </span>
          <button
            onClick={() => selectExperiment(null)}
            className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2.5 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            {language === 'vi' ? 'Thoát' : 'Exit'}
          </button>
        </div>
      </div>

      {/* Step Instruction & Status */}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="mt-0.5 shrink-0">
          {stepCompleted ? (
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 animate-bounce" />
          ) : (
            <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{stepTitle}</h3>
          <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
            {instruction}
          </p>

          {/* Hint or Theory toggles */}
          <div className="mt-1.5 sm:mt-2.5 flex flex-wrap items-center gap-1.5 sm:gap-3">
            {hint && (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{hint}</span>
              </div>
            )}
            {theory && (
              <button
                onClick={() => setShowTheory(!showTheory)}
                className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? (showTheory ? 'Ẩn lý thuyết' : 'Xem lý thuyết hóa học') : (showTheory ? 'Hide theory' : 'View chemistry theory')}</span>
              </button>
            )}
            {activeExperiment.id === 'exp-titration' && (
              <button
                onClick={() => toggleTitrationCurve(true)}
                className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title={language === 'vi' ? 'Mở biểu đồ đường cong chuẩn độ trực tiếp' : 'Open live titration curve graph'}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Đồ thị chuẩn độ' : 'Titration Curve'}</span>
              </button>
            )}
            <button
              onClick={() => toggleQuizModal(true)}
              className="flex items-center gap-1 text-[11px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 hover:bg-purple-100 transition-colors"
              title={language === 'vi' ? 'Làm bài kiểm tra đánh giá kiến thức' : 'Take assessment quiz'}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Bài kiểm tra' : 'Quiz'}</span>
            </button>
          </div>

          {showTheory && theory && (
            <div className="mt-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              {theory}
            </div>
          )}
        </div>

        {/* Step Navigation Controls */}
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-600 transition-colors"
            title={language === 'vi' ? 'Bước trước' : 'Previous step'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={isLastStep ? completeExperiment : nextStep}
            disabled={!stepCompleted}
            className={`flex items-center gap-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
              stepCompleted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white'
            }`}
          >
            <span>{isLastStep ? (language === 'vi' ? 'Hoàn thành' : 'Finish') : (language === 'vi' ? 'Bước kế tiếp' : 'Next Step')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
