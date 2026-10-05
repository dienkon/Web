import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { EXPERIMENT_CURRICULUM, ExperimentGuide } from '../data/experiments';
import { 
  BookOpen, CheckCircle2, ChevronRight, HelpCircle, ShieldAlert, Sparkles, 
  Award, AlertTriangle, RefreshCw, Clock, Check, Droplets, Target, FileText, X,
  ChevronDown, Cpu, Code2, Layers
} from 'lucide-react';
import { experimentEngine, ExperimentDifficultyMode, ExamReportCard } from '../engine/experimentEngine';
import { labSound } from '../utils/audio';

export function GuidedExperimentPanel() {
  const { 
    language, 
    activeExperimentId, 
    setActiveExperimentId, 
    activeStepIndex, 
    setActiveStepIndex,
    setupExperimentPreset,
    experimentDifficulty,
    setExperimentDifficulty,
    vessels,
    burners,
    activeTool,
    spatulaState,
    toolContamination,
    cleanTool,
    examReport,
    setExamReport
  } = useAppStore();

  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [examStartTime, setExamStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [toleranceErrors, setToleranceErrors] = useState<number[]>([]);
  const [showReportCardModal, setShowReportCardModal] = useState<boolean>(false);
  const [showAlgorithmDetails, setShowAlgorithmDetails] = useState<boolean>(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  const currentExperiment = EXPERIMENT_CURRICULUM.find(e => e.id === activeExperimentId);

  // Timer for Exam mode
  useEffect(() => {
    if (experimentDifficulty !== 'exam' || !activeExperimentId) return;
    setExamStartTime(Date.now());
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - examStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [experimentDifficulty, activeExperimentId, examStartTime]);

  // Validation state prepared for engine
  const validationState = useMemo(() => ({
    vessels,
    burners,
    activeTool,
    spatulaState,
    contaminatedTools: toolContamination,
    recentActions: []
  }), [vessels, burners, activeTool, spatulaState, toolContamination]);

  // Validate current step
  const currentStep = currentExperiment ? currentExperiment.steps[activeStepIndex] : null;
  const validationResult = useMemo(() => {
    if (!currentStep) return null;
    return experimentEngine.validateStep(currentStep as any, validationState, experimentDifficulty);
  }, [currentStep, validationState, experimentDifficulty]);

  // Record tolerance errors if valid
  useEffect(() => {
    if (validationResult?.isWithinTolerance && validationResult.toleranceError !== undefined) {
      setToleranceErrors(prev => [...prev, validationResult.toleranceError!]);
    }
  }, [validationResult?.isWithinTolerance, validationResult?.toleranceError]);

  // Contaminated tools check
  const dirtyTools = Object.entries(toolContamination).filter(([_, chem]) => chem !== null) as Array<['pipette' | 'stirring_rod' | 'spatula', string]>;

  // Handle Exam Completion
  const handleCompleteExam = () => {
    if (!currentExperiment) return;
    const isQuizCorrect = selectedQuizAnswer !== null && selectedQuizAnswer === currentExperiment.quizzes[0]?.correctAnswer;
    const contaminationCount = dirtyTools.length;
    const report = experimentEngine.generateReportCard(
      currentExperiment.id,
      experimentDifficulty,
      currentExperiment.steps.length,
      activeStepIndex + (validationResult?.isValid ? 1 : 0),
      toleranceErrors,
      contaminationCount,
      isQuizCorrect ? 1 : 0,
      currentExperiment.quizzes.length,
      elapsedSeconds
    );
    setExamReport(report);
    setShowReportCardModal(true);
    labSound.playSuccess();
  };

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

        {/* Difficulty Mode Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Target size={13} className="text-blue-600" />
            <span>{t('Experiment Difficulty Mode', 'Chế độ đánh giá thực hành')}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 pt-1">
            {(['guided', 'standard', 'practical', 'exam'] as ExperimentDifficultyMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setExperimentDifficulty(mode)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  experimentDifficulty === mode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {mode === 'guided' ? t('Guided', 'Hướng dẫn') :
                 mode === 'standard' ? t('Standard', 'Chuẩn') :
                 mode === 'practical' ? t('Practical', 'Thực hành') : t('Exam', 'Thi thử')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {EXPERIMENT_CURRICULUM.map(exp => (
            <div 
              key={exp.id}
              onClick={() => {
                setActiveExperimentId(exp.id);
                setSelectedQuizAnswer(null);
                setShowExplanation(false);
                setToleranceErrors([]);
                setExamReport(null);
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

  const totalSteps = currentExperiment.steps.length;
  const isLastStep = activeStepIndex >= totalSteps - 1;

  return (
    <div className="space-y-4">
      {/* Experiment Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => {
              setActiveExperimentId(null);
              setExamReport(null);
            }}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← {t('All Experiments', 'Tất cả thí nghiệm')}
          </button>
          
          <div className="flex items-center gap-2">
            {experimentDifficulty === 'exam' && (
              <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                <Clock size={11} />
                <span>{Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
              {t('Step', 'Bước')} {activeStepIndex + 1} / {totalSteps}
            </span>
          </div>
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

        {/* Auto-setup Workbench Button */}
        <button
          onClick={() => setupExperimentPreset(currentExperiment.id)}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <Sparkles size={14} className="text-amber-300" />
          <span>{t('Auto-Setup Lab Workbench', 'Tự động bày bàn thí nghiệm')}</span>
        </button>
      </div>

      {/* Tool Hygiene & Contamination Alert */}
      {dirtyTools.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-orange-800 text-xs font-bold">
              <AlertTriangle size={14} className="text-orange-600" />
              <span>{t('Tool Contamination Detected', 'Phát hiện dụng cụ dính hóa chất')}</span>
            </div>
            <span className="text-[10px] bg-orange-200 text-orange-900 px-1.5 py-0.5 rounded font-semibold">
              {dirtyTools.length} {t('Tool(s)', 'Dụng cụ')}
            </span>
          </div>

          <div className="text-[11px] text-orange-700">
            {dirtyTools.map(([tool, chem]) => (
              <div key={tool} className="flex items-center justify-between py-0.5">
                <span>{tool}: <strong className="font-mono">{chem}</strong></span>
                <button
                  onClick={() => {
                    cleanTool(tool);
                    labSound.playTap();
                  }}
                  className="px-2 py-0.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-[10px] font-semibold flex items-center gap-1"
                >
                  <Droplets size={10} />
                  <span>{t('Rinse in H2O', 'Tráng nước cất')}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Physical Model & Simulation Algorithm Card */}
      {(currentExperiment.simulationAlgorithm_en || currentExperiment.phenomenologyCases) && (
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
          <button
            onClick={() => setShowAlgorithmDetails(!showAlgorithmDetails)}
            className="w-full flex items-center justify-between text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Cpu size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                  {t('Physical Model & Simulation Algorithm', 'Mô hình Vật lý & Thuật toán mô phỏng')}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {t('Governing ODEs, kinetics & phenomenological regime cases', 'Phương trình vi phân, động học & phân loại hiện tượng')}
                </p>
              </div>
            </div>
            <ChevronDown
              size={15}
              className={`text-slate-400 transition-transform duration-200 shrink-0 ${showAlgorithmDetails ? 'rotate-180' : ''}`}
            />
          </button>

          {showAlgorithmDetails && (
            <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
              {/* Simulation Algorithm */}
              {(currentExperiment.simulationAlgorithm_en || currentExperiment.simulationAlgorithm_vi) && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    <Code2 size={12} />
                    <span>{t('Core Simulation Algorithm & Physical Laws', 'Thuật toán mô phỏng & Định luật chi phối')}</span>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {language === 'en' 
                      ? (currentExperiment.simulationAlgorithm_en || currentExperiment.simulationAlgorithm_vi)
                      : (currentExperiment.simulationAlgorithm_vi || currentExperiment.simulationAlgorithm_en)}
                  </pre>
                </div>
              )}

              {/* Phenomenology Cases */}
              {currentExperiment.phenomenologyCases && currentExperiment.phenomenologyCases.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <Layers size={12} />
                      <span>{t('Phenomenological Cases & Regime Classification', 'Phân loại các trường hợp & Hiện tượng vật lý')}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                      {currentExperiment.phenomenologyCases.length} {t('Cases', 'Trường hợp')}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {currentExperiment.phenomenologyCases.map((c, idx) => {
                      const isSelected = activeCaseId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setActiveCaseId(isSelected ? null : c.id)}
                          className={`cursor-pointer p-2.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-slate-800/95 border-amber-500/50 shadow-inner'
                              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-[9px] font-mono font-bold flex items-center justify-center text-amber-400">
                                {idx + 1}
                              </span>
                              {language === 'en' ? c.name_en : c.name_vi}
                            </span>
                            <ChevronRight
                              size={12}
                              className={`text-slate-500 transition-transform ${isSelected ? 'rotate-90 text-amber-400' : ''}`}
                            />
                          </div>
                          {isSelected && (
                            <div className="mt-2 pt-2 border-t border-slate-700/60 space-y-1.5 text-[11px] animate-in fade-in duration-100">
                              <p className="text-slate-300 leading-relaxed">
                                {language === 'en' ? c.description_en : c.description_vi}
                              </p>
                              <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300 leading-snug">
                                <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">{t('Governing Model:', 'Mô hình chi phối:')}</span>
                                {c.algorithm}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Step Protocol */}
      {currentStep && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                validationResult?.isValid ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                {validationResult?.isValid ? <Check size={12} /> : currentStep.stepNumber}
              </span>
              <h3 className="text-xs font-bold text-slate-800">
                {language === 'en' ? currentStep.title_en : currentStep.title_vi}
              </h3>
            </div>

            {/* Validation Pill */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              validationResult?.isValid
                ? 'bg-emerald-100 text-emerald-800 flex items-center gap-1'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {validationResult?.isValid ? (
                <>
                  <CheckCircle2 size={11} />
                  <span>{t('Validated', 'Hợp lệ')}</span>
                </>
              ) : (
                <span>{t('In Progress', 'Đang thực hiện')}</span>
              )}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs text-slate-700 leading-relaxed font-medium">
            {language === 'en' ? currentStep.instruction_en : currentStep.instruction_vi}
          </div>

          {/* Tolerance & Real-time Sensor Feedback */}
          {validationResult && validationResult.targetValue !== undefined && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">{t('Live Sensor Measurement:', 'Đo đạc cảm biến thực tế:')}</span>
                <span className={`font-mono font-bold ${validationResult.isWithinTolerance ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {validationResult.currentValue ?? 0} / {validationResult.targetValue} {currentStep.unit || ''}
                </span>
              </div>
              {validationResult.toleranceError !== undefined && (
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>{t('Tolerance Error:', 'Sai số dung sai:')}</span>
                  <span className="font-mono">±{validationResult.toleranceError} (Tol: ±{currentStep.tolerance || 1.0})</span>
                </div>
              )}
            </div>
          )}

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

            {isLastStep ? (
              <button
                onClick={handleCompleteExam}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs"
              >
                <Award size={14} />
                <span>{t('Finish & Grade Exam', 'Hoàn tất & Chấm điểm')}</span>
              </button>
            ) : (
              <button 
                onClick={() => setActiveStepIndex(Math.min(totalSteps - 1, activeStepIndex + 1))}
                className={`flex items-center gap-1 px-3 py-1.5 text-white rounded text-xs font-semibold shadow-xs transition-colors ${
                  validationResult?.isValid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <span>{t('Next Step', 'Bước tiếp')}</span>
                <ChevronRight size={14} />
              </button>
            )}
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

      {/* Exam Report Card Modal */}
      {showReportCardModal && examReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">{t('Laboratory Practical Exam Report', 'Báo Cáo Điểm Thi Thực Hành')}</h3>
              </div>
              <button 
                onClick={() => setShowReportCardModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Score & Letter Grade Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-blue-100 uppercase tracking-wider">{t('Final Assessment Score', 'Điểm Tổng Kết')}</div>
                <div className="text-3xl font-extrabold tracking-tight">{examReport.score} <span className="text-sm font-medium text-blue-200">/ 100</span></div>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-xs rounded-xl flex items-center justify-center text-3xl font-black text-amber-300 shadow-inner">
                {examReport.letterGrade}
              </div>
            </div>

            {/* Rubric Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600">{t('Procedure Adherence', 'Quy trình thực hiện')}:</span>
                <span className="font-bold text-slate-800">{examReport.procedureScore} / 40</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600">{t('Measurement Precision', 'Độ chuẩn xác số đo')}:</span>
                <span className="font-bold text-slate-800">{examReport.accuracyScore} / 25</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600">{t('Tool Hygiene & Safety', 'Vệ sinh dụng cụ & An toàn')}:</span>
                <span className="font-bold text-slate-800">{examReport.hygieneScore} / 15</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600">{t('Theory Understanding', 'Lý thuyết & Trắc nghiệm')}:</span>
                <span className="font-bold text-slate-800">{examReport.quizScore} / 20</span>
              </div>
            </div>

            {/* Instructor Feedback */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <span className="font-bold text-slate-700">{t('Pedagogical Critique:', 'Nhận xét của giảng viên:')}</span>
              {(language === 'en' ? examReport.feedback_en : examReport.feedback_vi).map((fb, idx) => (
                <p key={idx} className="text-slate-600 leading-relaxed">• {fb}</p>
              ))}
            </div>

            <button
              onClick={() => setShowReportCardModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              {t('Continue Practical Work', 'Tiếp tục thực hành')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
