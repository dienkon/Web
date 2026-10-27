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
    <div className="absolute top-4 left-6 right-6 z-30 max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg p-4 select-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {language === 'vi' ? 'Bài thực hành có hướng dẫn' : 'Guided Lab'}
          </h2>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-semibold text-slate-800">{title}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-slate-500 font-semibold">
            {language === 'vi' ? `Bước ${currentStepIndex + 1} / ${totalSteps}` : `Step ${currentStepIndex + 1} of ${totalSteps}`}
          </span>
          <button
            onClick={() => selectExperiment(null)}
            className="text-[11px] text-slate-400 hover:text-slate-600 font-medium px-2 py-0.5 rounded-md hover:bg-slate-100"
          >
            {language === 'vi' ? 'Thoát' : 'Exit'}
          </button>
        </div>
      </div>

      {/* Step Instruction & Status */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {stepCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
          ) : (
            <Circle className="w-6 h-6 text-amber-500" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900">{stepTitle}</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{instruction}</p>

          {/* Hint or Theory toggles */}
          <div className="mt-2.5 flex items-center gap-3">
            {hint && (
              <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
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
  );
};
