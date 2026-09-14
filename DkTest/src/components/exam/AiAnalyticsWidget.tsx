import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Lock,
  AlertTriangle,
  RotateCcw,
  Flag,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ListOrdered,
  AlertOctagon,
  Activity,
  Send,
  MessageSquare,
  Bot,
  User,
  ArrowRight,
  HelpCircle,
  Info,
  X,
} from "lucide-react";
import type { Submission, Exam, Question, Section, StructuredAiAnalysis, AiAnalysisCache } from "../../types";
import {
  computeAttemptTimeAnalytics,
  computeSegmentAnalytics,
  buildAiAnalysisPayload,
  TimeAnalyticsResult,
  SegmentAnalytics,
} from "../../utils/attemptAnalytics";
import { saveSubmissionAiAnalysis } from "../../services/submissionService";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import { useToast } from "../ui/ToastNotification";

interface AiAnalyticsWidgetProps {
  examId: string;
  currentSubmission: Submission;
  exam: Exam | null;
  questions: Question[];
  sections: Section[];
  timeAnalytics?: TimeAnalyticsResult;
  segments?: {
    start: SegmentAnalytics;
    middle: SegmentAnalytics;
    end: SegmentAnalytics;
  };
  onSelectQuestion?: (questionIndex: number) => void;
}

const AI_ANALYSIS_VERSION = "v2.0";

export default function AiAnalyticsWidget({
  examId,
  currentSubmission,
  exam,
  questions,
  sections,
  timeAnalytics: propTimeAnalytics,
  segments: propSegments,
  onSelectQuestion,
}: AiAnalyticsWidgetProps) {
  const { error: showErrorToast, info: showInfoToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<StructuredAiAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sectionPerformance: true,
    priorities: true,
    mistakePatterns: true,
    progressAnalysis: false,
    timeAnalysis: false,
    notableQuestions: false,
  });

  // Report issue modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSection, setReportSection] = useState("all");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Follow-up chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Calculate deterministic analytics if not passed from parent
  const timeAnalytics = React.useMemo(() => {
    return propTimeAnalytics || computeAttemptTimeAnalytics(currentSubmission, questions);
  }, [propTimeAnalytics, currentSubmission, questions]);

  const segments = React.useMemo(() => {
    return propSegments || computeSegmentAnalytics(timeAnalytics.evaluations);
  }, [propSegments, timeAnalytics.evaluations]);

  const toggleAccordion = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Check cache on load
  useEffect(() => {
    if (!currentSubmission) return;

    // 1. Check if submission already contains cached analysis
    if (
      currentSubmission.aiAnalysis &&
      currentSubmission.aiAnalysis.data &&
      currentSubmission.aiAnalysis.version === AI_ANALYSIS_VERSION
    ) {
      setAnalysis(currentSubmission.aiAnalysis.data);
      return;
    }

    // 2. Fallback to localStorage cache
    try {
      const localCacheStr = localStorage.getItem(`ai_analysis_cache_${currentSubmission.id}`);
      if (localCacheStr) {
        const cached: AiAnalysisCache = JSON.parse(localCacheStr);
        if (cached && cached.data && cached.version === AI_ANALYSIS_VERSION) {
          setAnalysis(cached.data);
        }
      }
    } catch (e) {}
  }, [currentSubmission?.id]);

  // Request AI Analysis
  const handleGenerateAnalysis = async (forceRegenerate: boolean = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const payload = buildAiAnalysisPayload(
        currentSubmission,
        exam,
        questions,
        sections,
        timeAnalytics,
        segments
      );

      const response = await fetch("/api/ai/analyze-structured-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        // Fallback to legacy endpoint if structured route failed
        const legacyRes = await fetch("/api/ai/analyze-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analyticsInput: payload }),
        });

        if (!legacyRes.ok) {
          throw new Error("Không thể kết nối đến hệ thống AI. Vui lòng thử lại sau.");
        }

        const legacyResult = await legacyRes.json();
        // Wrap legacy result into structured format
        const adapted: StructuredAiAnalysis = {
          summary: legacyResult.summary || "Đã phân tích kết quả bài làm.",
          sectionPerformance: (legacyResult.sectionAnalysis || []).map((s: any) => ({
            title: s.title || "Phần thi",
            accuracy: s.accuracy || 0,
            strength: s.advice || undefined,
          })),
          priorities: (legacyResult.recommendations || []).slice(0, 3).map((r: any, idx: number) => ({
            title: `Ưu tiên ${idx + 1}: ${r.topic || "Củng cố kiến thức"}`,
            reason: r.advice || "",
            evidence: "Dựa trên các câu trả lời sai",
            action: r.advice || "Ôn tập lại lý thuyết và làm bài tập cùng dạng.",
          })),
          mistakePatterns: [
            {
              pattern: "Phân bổ kiến thức chưa đồng đều",
              description: "Có một số dạng bài đạt điểm chưa tối ưu.",
              affectedQuestions: [],
              suggestion: "Tập trung giải kỹ từng bước cho các câu hỏi khó.",
            },
          ],
          progressAnalysis: {
            startPhase: `Đầu bài: ${segments.start.accuracy}% đúng`,
            middlePhase: `Giữa bài: ${segments.middle.accuracy}% đúng`,
            endPhase: `Cuối bài: ${segments.end.accuracy}% đúng`,
            pacingInsight: "Cần chú ý giữ vững tốc độ và độ chính xác xuyên suốt bài thi.",
          },
          timeAnalysis: {
            overallPacing: `Thời gian trung bình ${timeAnalytics.averageSecondsPerQuestion}s mỗi câu.`,
            efficiencyAdvice: "Nên làm các câu chắc chắn đúng trước.",
          },
          notableQuestions: [],
          followUpQuestions: [
            "Vì sao em sai những câu trong bài này?",
            "Làm thế nào để cải thiện điểm số ở lần thi tới?",
          ],
          disclaimer: "Gợi ý tham khảo dựa trên kết quả bài làm thực tế của bạn.",
        };
        saveAndSetAnalysis(adapted);
        return;
      }

      const result: StructuredAiAnalysis = await response.json();
      saveAndSetAnalysis(result);
    } catch (err: any) {
      console.error("[AiAnalyticsWidget] Error generating analysis:", err);
      setError(err.message || "Đã xảy ra lỗi khi tạo phân tích.");
    } finally {
      setLoading(false);
    }
  };

  const saveAndSetAnalysis = (data: StructuredAiAnalysis) => {
    setAnalysis(data);

    const cacheObj: AiAnalysisCache = {
      version: AI_ANALYSIS_VERSION,
      data,
      generatedAt: new Date().toISOString(),
      inputHash: `${currentSubmission.id}_${currentSubmission.score}_${currentSubmission.correctCount}`,
    };

    // Save to Firestore
    if (currentSubmission.id) {
      saveSubmissionAiAnalysis(currentSubmission.id, cacheObj);
    }

    // Save to localStorage
    try {
      localStorage.setItem(`ai_analysis_cache_${currentSubmission.id}`, JSON.stringify(cacheObj));
    } catch (e) {}
  };

  // Scroll to question
  const scrollToQuestion = (displayIndex: number) => {
    const zeroBased = displayIndex - 1;
    if (onSelectQuestion) {
      onSelectQuestion(zeroBased);
    } else {
      const el = document.getElementById(`q-result-card-${zeroBased}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-blue-500", "transition-all");
        setTimeout(() => el.classList.remove("ring-2", "ring-blue-500"), 2000);
      }
    }
  };

  // Follow-up chat send
  const handleSendFollowUp = async (customPrompt?: string) => {
    const textToSend = (customPrompt || chatInput).trim();
    if (!textToSend || isChatSending) return;

    const newMsgs = [...chatMessages, { role: "user" as const, text: textToSend }];
    setChatMessages(newMsgs);
    setChatInput("");
    setIsChatSending(true);

    try {
      // Build context of current attempt for AI tutor
      const context = {
        examTitle: exam?.title || currentSubmission.examTitleSnapshot,
        score: currentSubmission.score,
        maxScore: currentSubmission.maxScore,
        correctCount: currentSubmission.correctCount,
        totalCount: currentSubmission.totalCount,
        timeSpent: currentSubmission.timeSpent,
        summary: analysis?.summary || "",
        priorities: analysis?.priorities || [],
        questions: questions.slice(0, 30).map((q, idx) => ({
          number: idx + 1,
          text: q.text?.substring(0, 150),
          isCorrect: timeAnalytics.evaluations[idx]?.isCorrect,
          timeSpent: timeAnalytics.evaluations[idx]?.timeSpentSeconds,
        })),
      };

      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs,
          context,
        }),
      });

      if (!res.ok) throw new Error("Lỗi kết nối");

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let buffer = "";

        setChatMessages((prev) => [...prev, { role: "model", text: "" }]);

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice("data: ".length).trim();
                if (dataStr === "[DONE]") break;
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.text) {
                    setChatMessages((prev) => {
                      const last = prev[prev.length - 1];
                      return [...prev.slice(0, -1), { ...last, text: last.text + parsed.text }];
                    });
                  }
                } catch (e) {}
              }
            }
          }
        }
      }
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        { role: "model", text: "Xin lỗi, đã xảy ra lỗi khi trao đổi với trợ lý AI. Vui lòng thử lại!" },
      ]);
    } finally {
      setIsChatSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // Submit report error
  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setIsSubmittingReport(true);
    try {
      const DISCORD_WEBHOOK_URL =
        "https://discord.com/api/webhooks/1500812404190085120/R1oclYbsjomTS5AUdbVkCD1hw1FqZZhb8LzvrfsyJVozADVmXWDlf4Mk3HlGUKqRI8zn";

      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🚩 BÁO CÁO NHẬN XÉT AI CHƯA CHÍNH XÁC",
              color: 15105570,
              fields: [
                { name: "Mã bài nộp (AttemptId)", value: `\`${currentSubmission.id}\``, inline: true },
                { name: "Bài thi", value: `${exam?.title || "N/A"}`, inline: true },
                { name: "Mục báo cáo", value: reportSection, inline: false },
                { name: "Nội dung phản ánh", value: reportReason.trim(), inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      setShowReportModal(false);
      setReportReason("");
      showInfoToast("Đã gửi phản hồi về AI cho quản trị viên thành công!");
    } catch (err) {
      showErrorToast("Gửi báo cáo thất bại, vui lòng thử lại!");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Not generated yet view
  if (!analysis && !loading && !error) {
    return (
      <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-white border border-indigo-100 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 print:hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-white mt-0.5">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-lg">
                Nhận xét chuyên sâu từ Trợ lý AI
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Riêng tư
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Khám phá bức tranh tổng thể, 3 việc ưu tiên cải thiện, mẫu sai lặp lại và phân tích tốc độ giải đề theo tiêu chuẩn sư phạm.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleGenerateAnalysis(false)}
          className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" /> Bắt đầu phân tích
        </button>
      </div>
    );
  }

  // Loading skeleton state
  if (loading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center gap-4 text-center min-h-[260px] print:hidden">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-900 text-base">
            AI đang phân tích bài thi của bạn...
          </h4>
          <p className="text-xs text-slate-500 max-w-md">
            Hệ thống đang trích xuất dữ liệu thời gian, so sánh diễn biến 3 giai đoạn và xác định 3 việc cần ưu tiên khắc phục.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-red-700 print:hidden">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <p className="font-extrabold text-sm text-red-900">Không thể tạo phân tích AI</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleGenerateAnalysis(true)}
          className="px-4 py-2 bg-white hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-all cursor-pointer shrink-0"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs space-y-0 print:hidden">
      {/* 1. Card Top Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-extrabold tracking-tight">
              Nhận xét của trợ lý AI
            </h2>
          </div>
          <p className="text-xs text-indigo-200">
            Bản phân tích năng lực chi tiết dựa trên dữ liệu thi thực tế
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Privacy Badge */}
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-800/80 border border-indigo-700/80 text-indigo-100 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-indigo-300" />
            <span>Chỉ mình em thấy</span>
          </span>

          {/* Re-analyze Button */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleGenerateAnalysis(true)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Tạo lại nhận xét mới từ AI"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Phân tích lại</span>
          </button>

          {/* Report incorrect Button */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-xs font-bold text-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Báo cáo khi AI nhận xét chưa đúng"
          >
            <Flag className="w-3.5 h-3.5 text-red-300" />
            <span>Báo sai</span>
          </button>
        </div>
      </div>

      {/* 2. Warning Bar */}
      <div className="bg-amber-50/80 border-b border-amber-200/70 px-5 sm:px-6 py-2.5 flex items-center gap-2 text-xs font-medium text-amber-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>⚠ Gợi ý tham khảo — AI có thể sai, hãy tự kiểm tra.</span>
      </div>

      {/* 3. Summary Block */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/40">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 block mb-1">
            TỔNG QUAN PHONG ĐỘ
          </span>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            {analysis.summary}
          </p>
        </div>
      </div>

      {/* 4. Structured Accordion List */}
      <div className="divide-y divide-slate-100">
        {/* Accordion 1: Bức tranh từng phần */}
        <div className="p-5 sm:p-6 space-y-4">
          <button
            type="button"
            onClick={() => toggleAccordion("sectionPerformance")}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                Bức tranh từng phần
              </h3>
            </div>
            {openSections.sectionPerformance ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.sectionPerformance && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 animate-in fade-in duration-200">
              {analysis.sectionPerformance?.map((sec, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200/50 pb-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {sec.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                        sec.accuracy >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : sec.accuracy >= 50
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {sec.accuracy}%
                    </span>
                  </div>

                  {sec.strength && (
                    <div className="text-[11px] sm:text-xs text-emerald-800 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{sec.strength}</span>
                    </div>
                  )}

                  {sec.weakness && (
                    <div className="text-[11px] sm:text-xs text-red-700 flex items-start gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{sec.weakness}</span>
                    </div>
                  )}

                  {sec.stability && (
                    <p className="text-[10px] text-slate-400 font-medium">
                      Độ ổn định: <strong>{sec.stability}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accordion 2: Ba việc nên ưu tiên sửa */}
        <div className="p-5 sm:p-6 space-y-4">
          <button
            type="button"
            onClick={() => toggleAccordion("priorities")}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ListOrdered className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-amber-600 transition-colors">
                Ba việc nên ưu tiên sửa
              </h3>
            </div>
            {openSections.priorities ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.priorities && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              {analysis.priorities?.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-white border-2 border-indigo-100/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5 relative overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 flex-1">
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {p.title}
                      </h4>
                      <p className="text-xs text-slate-600">
                        <strong className="text-slate-800 font-semibold">Lý do:</strong> {p.reason}
                      </p>
                      {p.evidence && (
                        <p className="text-xs text-indigo-700 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100/60 inline-block font-mono">
                          🔍 Dẫn chứng: {p.evidence}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50/50 p-2.5 rounded-xl">
                    <span className="font-bold shrink-0">Hành động:</span>
                    <span>{p.action}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accordion 3: Kiểu sai hay lặp lại */}
        <div className="p-5 sm:p-6 space-y-4">
          <button
            type="button"
            onClick={() => toggleAccordion("mistakePatterns")}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-red-600 transition-colors">
                Kiểu sai hay lặp lại
              </h3>
            </div>
            {openSections.mistakePatterns ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.mistakePatterns && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              {analysis.mistakePatterns?.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-red-50/40 border border-red-100 rounded-2xl p-4 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-red-900 text-xs sm:text-sm">
                      {m.pattern}
                    </span>
                    {m.affectedQuestions && m.affectedQuestions.length > 0 && (
                      <span className="text-[11px] font-mono font-bold bg-white text-red-700 px-2 py-0.5 rounded-md border border-red-200">
                        {m.affectedQuestions.join(", ")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {m.description}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium italic">
                    💡 Đề xuất: {m.suggestion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accordion 4: Diễn biến đầu / giữa / cuối bài */}
        <div className="p-5 sm:p-6 space-y-4">
          <button
            type="button"
            onClick={() => toggleAccordion("progressAnalysis")}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                Diễn biến đầu / giữa / cuối bài
              </h3>
            </div>
            {openSections.progressAnalysis ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.progressAnalysis && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Đầu bài</span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {analysis.progressAnalysis?.startPhase}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Giữa bài</span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {analysis.progressAnalysis?.middlePhase}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Cuối bài</span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {analysis.progressAnalysis?.endPhase}
                  </p>
                </div>
              </div>

              {analysis.progressAnalysis?.pacingInsight && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{analysis.progressAnalysis.pacingInsight}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 5: Phân tích thời gian */}
        <div className="p-5 sm:p-6 space-y-4">
          <button
            type="button"
            onClick={() => toggleAccordion("timeAnalysis")}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-600 transition-colors">
                Phân tích thời gian & tốc độ
              </h3>
            </div>
            {openSections.timeAnalysis ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.timeAnalysis && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200 text-xs sm:text-sm text-slate-700">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <p>
                  <strong>Tốc độ tổng thể:</strong> {analysis.timeAnalysis?.overallPacing}
                </p>
                {analysis.timeAnalysis?.stuckAreas && (
                  <p className="text-red-700">
                    <strong>Khu vực mất nhiều thời gian (stuck):</strong> {analysis.timeAnalysis.stuckAreas}
                  </p>
                )}
                {analysis.timeAnalysis?.rushingAreas && (
                  <p className="text-amber-700">
                    <strong>Khu vực làm quá nhanh (rushing):</strong> {analysis.timeAnalysis.rushingAreas}
                  </p>
                )}
                <p className="text-emerald-800 pt-1 border-t border-slate-200/60 font-medium">
                  💡 <strong>Lời khuyên quản lý thời gian:</strong> {analysis.timeAnalysis?.efficiencyAdvice}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 6: Câu đáng chú ý */}
        <div className="p-5 sm:p-6 space-y-4">
          <button
            type="button"
            onClick={() => toggleAccordion("notableQuestions")}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-purple-600 transition-colors">
                Câu đáng chú ý
              </h3>
            </div>
            {openSections.notableQuestions ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSections.notableQuestions && (
            <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
              {analysis.notableQuestions && analysis.notableQuestions.length > 0 ? (
                analysis.notableQuestions.map((nq, idx) => (
                  <div
                    key={idx}
                    onClick={() => scrollToQuestion(nq.questionIndex)}
                    className="p-3.5 bg-slate-50/70 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all cursor-pointer flex items-start justify-between gap-3 shadow-2xs group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm group-hover:text-indigo-700">
                          Câu {nq.questionIndex}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          ({nq.timeSpentSeconds}s)
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            nq.status === "correct"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {nq.status === "correct" ? "Đúng" : "Sai"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{nq.reason}</p>
                      {nq.recommendation && (
                        <p className="text-[11px] text-indigo-700 font-medium">
                          → {nq.recommendation}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0 mt-1">
                      Mở câu <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic p-3">
                  Không có câu hỏi bất thường trong lần làm bài này.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Interactive Follow-up Chat ("Hỏi thêm về bài làm này") */}
      <div className="p-5 sm:p-6 bg-slate-50/80 border-t border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
            Hỏi thêm về bài làm này
          </h4>
        </div>

        {/* Quick prompt chips */}
        <div className="flex items-center flex-wrap gap-2">
          {["Vì sao em sai câu này?", "Em nên ôn phần nào trước?", "Giải lại câu khó nhất cho em"].map(
            (pill, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleSendFollowUp(pill)}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-full text-xs font-medium text-slate-700 hover:text-indigo-700 transition-all cursor-pointer shadow-2xs"
              >
                {pill}
              </button>
            )
          )}
        </div>

        {/* Chat message thread */}
        {chatMessages.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 max-h-64 overflow-y-auto space-y-3 text-xs leading-relaxed">
            {chatMessages.map((msg, mIdx) => (
              <div
                key={mIdx}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none"
                  }`}
                >
                  <LatexPreview content={msg.text} />
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isChatSending && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span>AI đang soạn câu trả lời...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Chat input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendFollowUp();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Hỏi thêm về bài làm này (ví dụ: 'Câu 15 cách làm nhanh thế nào?')..."
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatSending}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isChatSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 6. Report Incorrect Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <Flag className="w-5 h-5 fill-red-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Báo sai nhận xét AI
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phản hồi giúp cải thiện chất lượng phân tích
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mục nhận xét bạn thấy chưa chính xác:
                </label>
                <select
                  value={reportSection}
                  onChange={(e) => setReportSection(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">Toàn bộ nhận xét</option>
                  <option value="sectionPerformance">Bức tranh từng phần</option>
                  <option value="priorities">Ba việc nên ưu tiên sửa</option>
                  <option value="mistakePatterns">Kiểu sai hay lặp lại</option>
                  <option value="progressAnalysis">Diễn biến đầu / giữa / cuối</option>
                  <option value="timeAnalysis">Phân tích thời gian</option>
                  <option value="notableQuestions">Câu đáng chú ý</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả cụ thể vấn đề:
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Ví dụ: AI nhận xét em sai câu 15 do tính toán nhưng thực tế em đọc sai đề bài..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <span>Gửi báo sai</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
