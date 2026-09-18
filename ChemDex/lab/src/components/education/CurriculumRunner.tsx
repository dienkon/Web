import React from 'react';
import { BookOpen, CheckCircle, ArrowRight, ArrowLeft, HelpCircle, X } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

export const CurriculumRunner: React.FC = () => {
  const {
    activeExperiment,
    currentStepIndex,
    nextExperimentStep,
    prevExperimentStep,
    exitExperiment,
    openQuizModal
  } = useUiStore();

  if (!activeExperiment) return null;

  const currentStep = activeExperiment.steps[currentStepIndex];
  const isLastStep = currentStepIndex === activeExperiment.steps.length - 1;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-xl w-full px-4 select-none animate-in slide-in-from-top-4 duration-200">
      <div className="bg-white/95 backdrop-blur-md border border-sky-200 rounded-2xl p-3.5 shadow-lg shadow-sky-950/5 space-y-2.5">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
              Bài thực hành: {activeExperiment.titleVi}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Bước {currentStepIndex + 1} / {activeExperiment.steps.length}
            </span>
            <button
              onClick={exitExperiment}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Thoát chế độ hướng dẫn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Instruction */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <h4 className="font-bold text-xs text-slate-800 mb-1">
            {currentStep.titleVi}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {currentStep.instructionVi}
          </p>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={prevExperimentStep}
            disabled={currentStepIndex === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-30 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bước trước</span>
          </button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <button
                onClick={openQuizModal}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Làm bài trắc nghiệm</span>
              </button>
            ) : (
              <button
                onClick={nextExperimentStep}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Bước tiếp theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
