/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  Activity,
  HelpCircle,
  ShieldAlert,
  Brain,
  Award,
  BookOpen,
  Zap,
  Info,
  Beaker,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
} from "lucide-react";
import { PipelineResult } from "../types";
import { TranslationDictionary } from "../utils/translations";
import {
  ChemicalEquationRenderer,
  ChemicalTextRenderer,
} from "./ChemicalEquationRenderer";

interface PipelineResultsProps {
  results: PipelineResult[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  loadingAI: boolean;
  t: TranslationDictionary;
  language: "vi" | "en";
  onReanalyzeEquation?: (index: number) => void;
}

export const PipelineResults: React.FC<PipelineResultsProps> = ({
  results,
  selectedIndex,
  onSelectIndex,
  loadingAI,
  t,
  language,
  onReanalyzeEquation,
}) => {
  const result = results[selectedIndex] || results[0];
  const [copiedIndices, setCopiedIndices] = useState<Record<number, boolean>>(
    {},
  );
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "mechanism" | "ionic" | "redox" | "practical"
  >("mechanism");

  // Feedback states
  const [rating, setRating] = useState<"like" | "dislike" | null>(null);
  const [comment, setComment] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Reset feedback when results update
  React.useEffect(() => {
    setRating(null);
    setComment("");
    setSubmittedFeedback(false);
    setFeedbackError(null);
  }, [result]);

  const handleCopyIndex = (index: number, equation: string) => {
    navigator.clipboard.writeText(equation);
    setCopiedIndices((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setCopiedIndices((prev) => ({ ...prev, [index]: false }));
    }, 2000);
  };

  // Copy final equation to clipboard (legacy support)
  const handleCopy = () => {
    navigator.clipboard.writeText(result.finalEquation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit feedback
  const handleFeedbackSubmit = async (
    selectedRating: "like" | "dislike",
    finalComment: string = "",
  ) => {
    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawOCR: result.rawOCR || "",
          finalEquation: result.finalEquation || "",
          rating: selectedRating,
          comment: finalComment,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save feedback on server.");
      }
      setSubmittedFeedback(true);
    } catch (err: any) {
      console.error(err);
      setFeedbackError(err.message || "Lỗi lưu ý kiến.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Determine styling color depending on confidence score
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return "text-emerald-700 bg-emerald-50 border-emerald-100";
    if (score >= 70) return "text-blue-700 bg-blue-50 border-blue-100";
    if (score >= 55) return "text-amber-700 bg-amber-50 border-amber-100";
    return "text-rose-700 bg-rose-50 border-rose-100";
  };

  const getConfidenceBarColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 55) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* =======================================================
          DÒNG 3: PHƯƠNG TRÌNH HOÀN CHỈNH (MẪU ĐẸP)
          ======================================================= */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500 animate-pulse" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
              {t.row3Title} ({results.length} {language === "vi" ? "PT" : "E"})
            </h3>
          </div>
        </div>

        {/* List of equations (rows) with auto-generating layout */}
        <div className="space-y-3">
          {results.map((res, idx) => {
            const isSelected = idx === selectedIndex;
            const isBalanced = res.finalIsBalanced;
            const isCopied = !!copiedIndices[idx];

            // AI CHECK & overall score must be standard, realistic, and capped at max 80%
            const overallVal = Math.min(80, res.confidence.overall);

            return (
              <div
                key={idx}
                id={`eq-row-${idx}`}
                onClick={() => onSelectIndex(idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 select-none ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/10 ring-2 ring-blue-500/10 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"
                }`}
              >
                {/* Left side: PT index & status indicator */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 select-none transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white animate-pulse"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getConfidenceColor(overallVal)}`}
                      >
                        {t.row3Confidence} {overallVal}%
                      </span>
                      {isBalanced ? (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Beautiful Chemical Equation Render */}
                <div className="flex-1 flex justify-center py-2 min-w-0">
                  <ChemicalEquationRenderer
                    equation={res.finalEquation}
                    extraConditions={res.geminiVerified?.arrowConditions}
                    className="w-full justify-center max-w-xl shadow-none py-2 px-3 bg-white border border-slate-150 rounded-lg text-xs"
                  />
                </div>

                {/* Right side: Actions & Meta */}
                <div className="flex items-center gap-2.5 justify-end shrink-0">
                  {onReanalyzeEquation && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReanalyzeEquation(idx);
                      }}
                      disabled={loadingAI}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                      title={
                        language === "vi"
                          ? "Phân tích lại phương trình này"
                          : "Re-analyze this equation"
                      }
                    >
                      <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="hidden md:inline"></span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyIndex(idx, res.finalEquation);
                    }}
                    className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                      isCopied
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-50"
                    }`}
                    title={t.btnCopy}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =======================================================
          DÒNG 4: THÔNG TIN CHI TIẾT (PHÂN TÍCH AI CHUYÊN SÂU)
          ======================================================= */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative">
        <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-4">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm">
            AI
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
              {t.row4Title}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t.row4Subtitle}
            </p>
          </div>
        </div>

        {/* AI reliability disclaimer banner (Always visible) */}
        <div className="mb-5 p-3.5 bg-amber-50/70 border border-amber-200/50 rounded-xl text-[11px] text-amber-800 font-semibold flex items-start gap-2.5">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600 mt-0.5 animate-bounce" />
          <div>
            <p className="font-bold">Chú thích độ tin cậy AI</p>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5 leading-relaxed">
              Kết quả phân tích từ AI chỉ mang tính chất tham khảo học thuật và
              có thể có sai sót. Vui lòng tự đối chiếu với sách giáo khoa hoặc
              kiểm chứng trong phòng thí nghiệm thực tế.
            </p>
          </div>
        </div>

        {/* Equation Switcher Tabs (Only if there are multiple equations) */}
        {results.length > 1 && (
          <div className="mb-5 p-1.5 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 pr-1 select-none">
              {language === "vi"
                ? "Phân tích phương trình:"
                : "Analyze equation:"}
            </span>
            {results.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`py-1 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  idx === selectedIndex
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                PT {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Loading AI spinner */}
        {loadingAI ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <h4 className="text-xs font-bold text-slate-700">{t.queryingAi}</h4>
            <p className="text-[11px] text-slate-400 mt-1.5 max-w-sm">
              {t.queryingAiDesc}
            </p>
          </div>
        ) : result.geminiVerified ? (
          <div className="space-y-5">
            {/* Tab selection buttons with distinctive dynamic chemistry accents */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => setActiveTab("mechanism")}
                className={`flex-1 min-w-[100px] text-center py-2 px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "mechanism"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/15"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                {t.tabMechanism}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ionic")}
                className={`flex-1 min-w-[100px] text-center py-2 px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "ionic"
                    ? "bg-teal-600 text-white shadow-sm shadow-teal-500/15"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                {t.tabIonic}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("redox")}
                className={`flex-1 min-w-[100px] text-center py-2 px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "redox"
                    ? "bg-amber-600 text-white shadow-sm shadow-amber-500/15"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                {t.tabRedox}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("practical")}
                className={`flex-1 min-w-[100px] text-center py-2 px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "practical"
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-500/15"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                {t.tabPractical}
              </button>
            </div>

            {/* Render selected active tab with premium left border matching tab category */}
            <div
              className={`p-6 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 leading-relaxed font-sans shadow-sm transition-all duration-300 ${
                activeTab === "mechanism"
                  ? "bg-blue-50/40 border-l-4 border-l-blue-600"
                  : activeTab === "ionic"
                    ? "bg-teal-50/40 border-l-4 border-l-teal-600"
                    : activeTab === "redox"
                      ? "bg-amber-50/40 border-l-4 border-l-amber-600"
                      : "bg-rose-50/40 border-l-4 border-l-rose-600"
              }`}
            >
              {/* Tab 1: Mechanism & Phenomenon */}
              {activeTab === "mechanism" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-extrabold text-sm sm:text-base mb-1">
                    <Beaker className="w-5 h-5 text-blue-600" />
                    <span>{t.chemistryDetailReasoning}</span>
                  </div>
                  <div className="whitespace-pre-line text-slate-900 font-medium leading-relaxed bg-white/80 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                    <ChemicalTextRenderer
                      text={
                        result.geminiVerified.detailedMechanism ||
                        result.geminiVerified.reasoning ||
                        result.reasoning
                      }
                    />
                  </div>

                  {result.geminiVerified.productsPredicted &&
                    result.geminiVerified.productsPredicted.length > 0 && (
                      <div className="mt-4 border-t border-slate-200/60 pt-3">
                        <span className="font-extrabold text-slate-700 block mb-2 text-xs uppercase tracking-wider">
                          {t.predictedProducts}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {result.geminiVerified.productsPredicted.map(
                            (prod, idx) => (
                              <span
                                key={idx}
                                className="font-mono px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-extrabold shadow-sm"
                              >
                                <ChemicalTextRenderer text={prod} />
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Tab 2: Ionic Equations */}
              {activeTab === "ionic" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-extrabold text-sm sm:text-base mb-1">
                    <Zap className="w-5 h-5 text-teal-600" />
                    <span>{t.tabIonic}</span>
                  </div>
                  <div className="whitespace-pre-line font-mono bg-white p-4 rounded-xl border border-teal-200 text-slate-950 text-xs sm:text-sm font-bold leading-relaxed shadow-sm">
                    {(() => {
                      const eq =
                        result.geminiVerified.ionicEquation ||
                        "Không có thông tin ion hoặc phản ứng không tạo ion trong dung dịch.";
                      const needsLatexWrap =
                        !eq.includes("$") &&
                        (eq.includes("→") ||
                          eq.includes("->") ||
                          eq.includes("⇄") ||
                          eq.includes("=") ||
                          eq.includes("+"));
                      return (
                        <ChemicalTextRenderer
                          text={needsLatexWrap ? `$${eq}$` : eq}
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Tab 3: Redox Analysis */}
              {activeTab === "redox" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm sm:text-base mb-1">
                    <Activity className="w-5 h-5 text-amber-600" />
                    <span>{t.tabRedox}</span>
                  </div>
                  <div className="whitespace-pre-line text-slate-900 font-medium leading-relaxed bg-white/80 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                    <ChemicalTextRenderer
                      text={
                        result.geminiVerified.redoxAnalysis ||
                        "Phản ứng không có sự thay đổi số oxi hóa (Không phải phản ứng Oxi hóa - Khử)."
                      }
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Practical Applications & Safety */}
              {activeTab === "practical" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm sm:text-base mb-1">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>{t.tabPractical}</span>
                  </div>
                  <div className="whitespace-pre-line text-slate-900 font-medium leading-relaxed bg-white/80 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                    <ChemicalTextRenderer
                      text={
                        result.geminiVerified.practicalApplication ||
                        "Không có cảnh báo an toàn cụ thể cho phản ứng thường gặp này."
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : result.geminiError ? (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-inner">
            <div className="flex items-start gap-2.5 text-rose-700 text-xs">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
              <div>
                <h4 className="font-bold text-slate-850">{t.noAiAnalysis}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {t.noAiAnalysisDesc} <br />
                  <span className="text-amber-700 font-semibold mt-1 block bg-amber-50 px-2 py-1 rounded border border-amber-100">
                    {t.offlineFallbackActive} {t.chemistryDetailReasoning} "
                    {result.reasoning}"
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/60 text-center text-xs text-slate-400">
            <Info className="w-5 h-5 mx-auto mb-2 text-slate-300 animate-bounce" />
            <p>{t.waitingForInput}</p>
          </div>
        )}
      </div>

      {/* =======================================================
          DÒNG 5: ĐÁNH GIÁ KẾT QUẢ & TIẾN TRÌNH (PIPELINE)
          ======================================================= */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
            {t.row5Title}
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
          {t.row5Subtitle}
        </p>

        {/* Confidence Breakdown Metrics */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
            {t.overallScore}
          </span>

          {/* 1. OCR */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">{t.ocrMetric}</span>
              <span className="font-mono text-slate-700 font-bold">
                {result.confidence.ocr}%
              </span>
            </div>
            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden border border-slate-100">
              <div
                className={`h-full ${getConfidenceBarColor(result.confidence.ocr)}`}
                style={{ width: `${result.confidence.ocr}%` }}
              ></div>
            </div>
          </div>

          {/* 2. Repair */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">
                {t.repairMetric}
              </span>
              <span className="font-mono text-slate-700 font-bold">
                {result.confidence.repair}%
              </span>
            </div>
            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden border border-slate-100">
              <div
                className={`h-full ${getConfidenceBarColor(result.confidence.repair)}`}
                style={{ width: `${result.confidence.repair}%` }}
              ></div>
            </div>
          </div>

          {/* 3. Inference */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">
                {t.inferenceMetric}
              </span>
              <span className="font-mono text-slate-700 font-bold">
                {result.confidence.inference}%
              </span>
            </div>
            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden border border-slate-100">
              <div
                className={`h-full ${getConfidenceBarColor(result.confidence.inference)}`}
                style={{ width: `${result.confidence.inference}%` }}
              ></div>
            </div>
          </div>

          {/* 4. Balancing */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">
                {t.balancingMetric}
              </span>
              <span className="font-mono text-slate-700 font-bold">
                {result.confidence.balancing}%
              </span>
            </div>
            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden border border-slate-100">
              <div
                className={`h-full ${getConfidenceBarColor(result.confidence.balancing)}`}
                style={{ width: `${result.confidence.balancing}%` }}
              ></div>
            </div>
          </div>

          {/* 5. Gemini */}
          {result.geminiVerified &&
            (() => {
              const displayedGemini = Math.min(80, result.confidence.gemini);
              return (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">
                      {t.aiMetric}
                    </span>
                    <span className="font-mono text-slate-700 font-bold">
                      {displayedGemini}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className={`h-full ${getConfidenceBarColor(displayedGemini)}`}
                      style={{ width: `${displayedGemini}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}
        </div>

        {/* Detailed Logs & Diagnostics text */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          {/* Raw OCR */}
          <div className="text-xs flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500 shrink-0 font-bold">
              1
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-600 font-bold">{t.rawOcrLabel}</p>
              <code className="block bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 font-mono text-amber-700 mt-1.5 font-semibold truncate">
                {result.rawOCR || "None"}
              </code>
            </div>
          </div>

          {/* Repaired Local text */}
          <div className="text-xs flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500 shrink-0 font-bold">
              2
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-600 font-bold">{t.repairedLocalLabel}</p>
              <code className="block bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 font-mono text-blue-600 mt-1.5 font-semibold truncate">
                {result.repairedText || "None"}
              </code>
            </div>
          </div>

          {/* Structure local */}
          {result.parsedLocal && (
            <div className="text-xs flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500 shrink-0 font-bold">
                3
              </span>
              <div className="w-full">
                <p className="text-slate-600 font-bold">
                  {t.structuredLocalLabel}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider block mb-1 font-bold">
                      {t.reactantsLabel}
                    </span>
                    <ul className="space-y-1">
                      {result.parsedLocal.reactants.map((r, i) => (
                        <li
                          key={i}
                          className="font-mono text-slate-600 text-xs"
                        >
                          {r.coefficient > 1 ? (
                            <span className="text-blue-600 font-bold">
                              {r.coefficient}
                            </span>
                          ) : (
                            ""
                          )}
                          {r.formula}
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            (
                            {Object.entries(r.elements)
                              .map(([el, cnt]) => `${el}:${cnt}`)
                              .join(", ")}
                            )
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider block mb-1 font-bold">
                      {t.productsLabel}
                    </span>
                    <ul className="space-y-1">
                      {result.parsedLocal.products.map((p, i) => (
                        <li
                          key={i}
                          className="font-mono text-slate-600 text-xs"
                        >
                          {p.coefficient > 1 ? (
                            <span className="text-blue-600 font-bold">
                              {p.coefficient}
                            </span>
                          ) : (
                            ""
                          )}
                          {p.formula}
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            {Object.keys(p.elements).length > 0 &&
                              `(${Object.entries(p.elements)
                                .map(([el, cnt]) => `${el}:${cnt}`)
                                .join(", ")})`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Corrections Applied list */}
          {result.correctionsMade.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 text-xs">
              <span className="font-bold text-slate-600 block mb-2">
                {t.correctionsLabel}
              </span>
              <ul className="space-y-1 text-slate-500 list-disc list-inside">
                {result.correctionsMade.map((cor, i) => (
                  <li key={i}>{cor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* =======================================================
              FEEDBACK RATING SECTION
              ======================================================= */}
          <div className="border-t border-slate-100 pt-5 mt-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t.rateHeading}
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              {t.rateSubheading}
            </p>

            {submittedFeedback ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-3 animate-fade-in">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{t.feedbackSuccess}</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Like / Dislike buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRating("like");
                      handleFeedbackSubmit("like");
                    }}
                    disabled={submittingFeedback}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer border ${
                      rating === "like"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-850"
                    }`}
                  >
                    <ThumbsUp
                      className={`w-4 h-4 ${rating === "like" ? "fill-white animate-bounce" : ""}`}
                    />
                    <span>{t.likeButton}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRating("dislike");
                      setSubmittedFeedback(false);
                    }}
                    disabled={submittingFeedback}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer border ${
                      rating === "dislike"
                        ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-rose-600"
                    }`}
                  >
                    <ThumbsDown
                      className={`w-4 h-4 ${rating === "dislike" ? "fill-white" : ""}`}
                    />
                    <span>{t.dislikeButton}</span>
                  </button>
                </div>

                {/* Dislike detail submission box */}
                {rating === "dislike" && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 animate-slide-up">
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t.dislikePlaceholder}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />

                    <div className="flex items-center justify-between">
                      {feedbackError && (
                        <span className="text-[11px] font-medium text-rose-600">
                          {feedbackError}
                        </span>
                      )}
                      <span className="hidden sm:inline"></span>

                      <button
                        type="button"
                        onClick={() => handleFeedbackSubmit("dislike", comment)}
                        disabled={submittingFeedback || !comment.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-sm ml-auto"
                      >
                        {submittingFeedback ? (
                          <>
                            <Sparkles className="w-4 h-4 animate-spin" />
                            <span>{t.feedbackSubmitting}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>{t.feedbackSubmit}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
