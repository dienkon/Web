/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  RotateCcw,
  Flag,
  Send,
  FileDown,
  Lock,
  TrendingUp,
  PieChart,
  Eye,
  EyeOff,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { calculateExamScore } from "../../services/gradingService";
import {
  computeAttemptTimeAnalytics,
  computeSegmentAnalytics,
  computeProgressAccumulation,
} from "../../utils/attemptAnalytics";
import LatexPreview from "../exam-builder/editor/LatexPreview";
import InteractiveFillBlankText from "../../components/exam/InteractiveFillBlankText";
import InteractiveMatchingBoard from "../../components/exam/InteractiveMatchingBoard";
import QuestionTimeAnalysisChart from "../../components/exam/QuestionTimeAnalysisChart";
import ProgressAccumulationChart from "../../components/exam/ProgressAccumulationChart";
import ExamResultCharts from "../../components/exam/ExamResultCharts";
import AiAnalyticsWidget from "../../components/exam/AiAnalyticsWidget";
import {
  DEMO_EXAM,
  DEMO_QUESTIONS,
  DEMO_SECTION,
  DEMO_AI_ANALYSIS,
  DEMO_LEADERBOARD_ENTRIES,
} from "./StudentOnboardingDemoData";
import { useStudentOnboarding } from "./StudentOnboardingContext";
import { TOUR_DATA_IDS } from "./StudentOnboardingTypes";
import { useAuth } from "../../context/AuthContext";
import type { Submission, QuestionTiming } from "../../types";

export default function StudentTutorialResult() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { answersDraft, triggerAction } = useStudentOnboarding();

  // Accordion open/close states
  const [showTimeAnalysis, setShowTimeAnalysis] = useState(false);
  const [showProgressChart, setShowProgressChart] = useState(false);
  const [showResultCharts, setShowResultCharts] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({
    demo_q1: true,
  });

  // Demo interactive modals
  const [demoAiModalQuestion, setDemoAiModalQuestion] = useState<any>(null);
  const [demoReportQuestion, setDemoReportQuestion] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  // Compute grading entirely on client
  const gradingSummary = useMemo(() => {
    return calculateExamScore(DEMO_QUESTIONS, answersDraft, { totalScale: 10.0 });
  }, [answersDraft]);

  // Construct deterministic local question timings
  const demoTiming = useMemo<Record<string, QuestionTiming>>(() => {
    const timing: Record<string, QuestionTiming> = {};
    const secondsPerQ = [15, 25, 30, 20, 35, 22, 33];
    DEMO_QUESTIONS.forEach((q, idx) => {
      timing[q.id] = {
        questionId: q.id,
        questionIndex: idx,
        timeSpentSeconds: secondsPerQ[idx] || 25,
        visits: 1,
        answerChanges: 1,
      };
    });
    return timing;
  }, []);

  const totalTimeSpent = useMemo(() => {
    return Object.values(demoTiming).reduce((acc, t) => acc + t.timeSpentSeconds, 0);
  }, [demoTiming]);

  const demoSubmission = useMemo<Submission>(() => {
    return {
      id: "sub_demo_student_tutorial",
      examId: DEMO_EXAM.id,
      examTitleSnapshot: DEMO_EXAM.title,
      examCodeSnapshot: DEMO_EXAM.code,
      studentId: userProfile?.uid || "student",
      studentNameSnapshot:
        userProfile?.displayName || userProfile?.fullName || "Bạn (Học sinh trải nghiệm)",
      studentUsername: userProfile?.username || "student",
      score: gradingSummary.score,
      maxScore: 10,
      correctCount: gradingSummary.correctCount,
      totalCount: DEMO_QUESTIONS.length,
      timeSpent: totalTimeSpent,
      cheatViolations: 0,
      submittedAt: { seconds: Math.floor(Date.now() / 1000) } as any,
      answers: answersDraft,
      shuffledQuestionsSnapshot: DEMO_QUESTIONS,
      questionTiming: demoTiming,
      aiAnalysis: {
        version: "v2.0",
        data: DEMO_AI_ANALYSIS,
        generatedAt: new Date().toISOString(),
        inputHash: "demo_hash",
      },
    };
  }, [gradingSummary, totalTimeSpent, answersDraft, userProfile, demoTiming]);

  // Compute charts data
  const timeAnalytics = useMemo(() => {
    return computeAttemptTimeAnalytics(demoSubmission, DEMO_QUESTIONS);
  }, [demoSubmission]);

  const segmentAnalytics = useMemo(() => {
    if (!timeAnalytics) return null;
    return computeSegmentAnalytics(timeAnalytics.evaluations);
  }, [timeAnalytics]);

  const accumulationData = useMemo(() => {
    if (!timeAnalytics) return [];
    return computeProgressAccumulation(timeAnalytics.evaluations);
  }, [timeAnalytics]);

  const toggleExplanation = (qId: string) => {
    setExpandedExplanations((prev) => ({ ...prev, [qId]: !prev[qId] }));
    triggerAction("toggle_explanation");
  };

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Banner: Local Sandbox Demo Mode Notice */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
            <span>DEMO — KẾT QUẢ BÀI HƯỚNG DẪN (Dữ liệu thử nghiệm hoàn toàn tại máy của bạn)</span>
          </div>
          <Link to="/" className="text-amber-800 underline hover:text-amber-950">
            Trang chủ
          </Link>
        </div>

        {/* Score Card Hero */}
        <div
          data-tour-id={TOUR_DATA_IDS.RESULT_SUMMARY}
          className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-xs overflow-hidden relative"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                KẾT QUẢ KHẢO THÍ HỌC SINH
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {DEMO_EXAM.title}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Thí sinh: <strong className="text-slate-800">{demoSubmission.studentNameSnapshot}</strong>
              </p>
            </div>

            {/* Score Badge */}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center shadow-xs">
                <span className="text-2xl font-black leading-none">{demoSubmission.score}</span>
                <span className="text-[10px] font-bold opacity-80 mt-0.5">/ 10</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>
                    {demoSubmission.score >= 8.5
                      ? "Xuất sắc"
                      : demoSubmission.score >= 7.0
                      ? "Giỏi"
                      : demoSubmission.score >= 5.0
                      ? "Đạt yêu cầu"
                      : "Cần cố gắng"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Tỷ lệ đúng: {Math.round((demoSubmission.correctCount / DEMO_QUESTIONS.length) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 font-semibold block">Số câu đúng</span>
              <span className="text-sm font-extrabold text-slate-800">
                {demoSubmission.correctCount} / {DEMO_QUESTIONS.length}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 font-semibold block">Thời gian làm</span>
              <span className="text-sm font-extrabold text-slate-800">
                {Math.floor(totalTimeSpent / 60)}p {totalTimeSpent % 60}s
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 font-semibold block">Gian lận</span>
              <span className="text-sm font-extrabold text-emerald-700">0 lần</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <BookOpen className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 font-semibold block">Trạng thái</span>
              <span className="text-sm font-extrabold text-indigo-700">Đã chấm điểm</span>
            </div>
          </div>
        </div>

        {/* Accordion 1: Time Analysis Chart */}
        {timeAnalytics && segmentAnalytics && (
          <div
            data-tour-id={TOUR_DATA_IDS.RESULT_TIME_ANALYSIS}
            className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden transition-all"
          >
            <button
              type="button"
              onClick={() => {
                setShowTimeAnalysis((prev) => !prev);
                triggerAction("toggle_time_analysis");
              }}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Phân tích thời gian làm bài từng câu
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-700">
                      {timeAnalytics.averageSecondsPerQuestion}s / câu
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Nhấp để {showTimeAnalysis ? "thu gọn" : "xem chi tiết tốc độ, nhịp độ và các câu tốn thời gian"}
                  </p>
                </div>
              </div>
              <div className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100/70">
                {showTimeAnalysis ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
            {showTimeAnalysis && (
              <div className="border-t border-slate-100 p-2 sm:p-4">
                <QuestionTimeAnalysisChart
                  timeAnalytics={timeAnalytics}
                  segments={segmentAnalytics}
                  onSelectQuestion={() => {}}
                />
              </div>
            )}
          </div>
        )}

        {/* Accordion 2: Progress Accumulation Chart */}
        {accumulationData.length > 0 && (
          <div
            data-tour-id={TOUR_DATA_IDS.RESULT_PROGRESS_CHART}
            className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden transition-all"
          >
            <button
              type="button"
              onClick={() => {
                setShowProgressChart((prev) => !prev);
                triggerAction("toggle_progress_chart");
              }}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Diễn biến làm bài & tích lũy điểm số
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700">
                      {demoSubmission.score}/10 đ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Nhấp để {showProgressChart ? "thu gọn" : "xem biểu đồ tích lũy điểm qua từng câu từ đầu đến cuối"}
                  </p>
                </div>
              </div>
              <div className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100/70">
                {showProgressChart ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
            {showProgressChart && (
              <div className="border-t border-slate-100 p-2 sm:p-4">
                <ProgressAccumulationChart data={accumulationData} maxScore={10} />
              </div>
            )}
          </div>
        )}

        {/* Accordion 3: Category & Question Type Result Charts */}
        <div
          data-tour-id={TOUR_DATA_IDS.RESULT_CATEGORY_CHART}
          className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden transition-all"
        >
          <button
            type="button"
            onClick={() => {
              setShowResultCharts((prev) => !prev);
              triggerAction("toggle_category_chart");
            }}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Biểu đồ phân tích tỉ lệ đúng / sai & chuyên đề
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-700">
                    {demoSubmission.correctCount}/{DEMO_QUESTIONS.length} câu đúng
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Nhấp để {showResultCharts ? "thu gọn" : "xem tỷ lệ hoàn thành theo phần thi và dạng câu hỏi"}
                </p>
              </div>
            </div>
            <div className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100/70">
              {showResultCharts ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>
          {showResultCharts && (
            <div className="border-t border-slate-100 p-2 sm:p-4">
              <ExamResultCharts
                submission={demoSubmission}
                questions={DEMO_QUESTIONS}
                sections={[DEMO_SECTION]}
              />
            </div>
          )}
        </div>

        {/* AI Analytics Widget Section */}
        <div data-tour-id={TOUR_DATA_IDS.RESULT_AI_ANALYSIS} className="space-y-2">
          <AiAnalyticsWidget
            examId={DEMO_EXAM.id}
            currentSubmission={demoSubmission}
            exam={DEMO_EXAM}
            questions={DEMO_QUESTIONS}
            sections={[DEMO_SECTION]}
            timeAnalytics={timeAnalytics || undefined}
            segments={segmentAnalytics || undefined}
            onSelectQuestion={() => {}}
          />
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white/70 border border-slate-200/50 p-2.5 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Link
              to="/"
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs"
              title="Quay lại danh sách đề thi"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <button
              type="button"
              data-tour-id={TOUR_DATA_IDS.RESULT_EXPORT_BTN}
              onClick={() => {
                alert("Trong bài thi thật, tính năng này sẽ xuất toàn bộ đề và đáp án ra file Word (.doc) hoàn chỉnh!");
              }}
              className="px-3 py-2 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all shadow-2xs text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Tải toàn bộ đề thi kèm bảng đáp án về file Word (.doc)"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Tải file Word</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-tour-id={TOUR_DATA_IDS.RESULT_DETAILS_TOGGLE}
              onClick={() => {
                setShowDetails(!showDetails);
                triggerAction("toggle_details");
              }}
              className={`p-2.5 rounded-xl transition-all shadow-2xs cursor-pointer ${
                showDetails
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
              }`}
              title="Xem chi tiết bài làm"
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              type="button"
              data-tour-id={TOUR_DATA_IDS.RESULT_RETAKE_BTN}
              onClick={() => {
                alert("Tính năng 'Làm lại đề thi' cho phép thí sinh rèn luyện lại để cải thiện điểm số.");
              }}
              className="p-2.5 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Làm lại đề thi"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              type="button"
              data-tour-id={TOUR_DATA_IDS.RESULT_LEADERBOARD_BTN}
              onClick={() => {
                setShowLeaderboard(!showLeaderboard);
                triggerAction("toggle_leaderboard");
              }}
              className={`p-2.5 rounded-xl transition-all shadow-2xs cursor-pointer ${
                showLeaderboard
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-200/80 hover:bg-amber-100"
              }`}
              title="Xem bảng xếp hạng"
            >
              <Trophy className="w-4 h-4 text-current" />
            </button>
          </div>
        </div>

        {/* Demo Leaderboard Drawer/Card */}
        {showLeaderboard && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  BẢNG XẾP HẠNG DEMO (Không ảnh hưởng dữ liệu thật)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {DEMO_LEADERBOARD_ENTRIES.map((entry) => {
                const isUser = entry.isCurrentStudent;
                return (
                  <div
                    key={entry.id}
                    className={`py-3 px-3 flex items-center justify-between rounded-xl transition-colors ${
                      isUser ? "bg-blue-50 border border-blue-200 font-bold" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          entry.rank === 1
                            ? "bg-amber-500 text-white"
                            : entry.rank === 2
                            ? "bg-slate-400 text-white"
                            : entry.rank === 3
                            ? "bg-amber-700 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {entry.rank}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">
                          {entry.studentNameSnapshot} {isUser && "(Bạn)"}
                        </div>
                        <div className="text-[11px] text-slate-400">{entry.studentClassSnapshot}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-blue-700 text-sm">{entry.score} đ</div>
                      <div className="text-[11px] text-slate-400">{entry.timeSpent}s</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Questions Review List */}
        {showDetails && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Chi tiết câu trả lời & Lời giải chuẩn
            </div>

            {DEMO_QUESTIONS.map((q, qIdx) => {
              const studentAns = answersDraft[q.id];
              const gradingResult = gradingSummary.results[q.id];
              const isCorrect = gradingResult?.status === "correct";
              const isExpanded = expandedExplanations[q.id];

              return (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-900 text-white font-bold text-xs rounded-lg">
                        Câu {qIdx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {q.type === "single_choice" && "Trắc nghiệm 1 đáp án"}
                        {q.type === "multiple_choice" && "Trắc nghiệm nhiều đáp án"}
                        {q.type === "true_false" && "Đúng / Sai theo ý"}
                        {q.type === "short_answer" && "Câu trả lời ngắn"}
                        {q.type === "ordering" && "Sắp xếp thứ tự"}
                        {q.type === "fill_blank" && "Điền vào chỗ trống"}
                        {q.type === "matching" && "Nối bảng (2 cột)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Report Question Button */}
                      <button
                        type="button"
                        data-tour-id={qIdx === 0 ? TOUR_DATA_IDS.RESULT_REPORT_BTN : undefined}
                        onClick={() => {
                          setDemoReportQuestion({ question: q, index: qIdx });
                          setReportReason("");
                          setReportSuccess(false);
                          triggerAction("open_report");
                        }}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Báo cáo câu hỏi có lỗi"
                      >
                        <Flag className="w-3.5 h-3.5 text-red-500" />
                        <span className="hidden sm:inline">Báo cáo</span>
                      </button>

                      {/* Ask AI Tutor Button */}
                      <button
                        type="button"
                        data-tour-id={qIdx === 0 ? TOUR_DATA_IDS.RESULT_ASK_AI_BTN : undefined}
                        onClick={() => {
                          setDemoAiModalQuestion({ question: q, index: qIdx });
                          triggerAction("open_ask_ai");
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Hỏi Gia sư AI về câu hỏi này"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Hỏi AI</span>
                      </button>

                      {/* Correct / Incorrect indicator */}
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                          <XCircle className="w-3.5 h-3.5" /> Chưa đúng
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                    {q.type === "fill_blank" ? (
                      <InteractiveFillBlankText
                        content={q.text}
                        isReview={true}
                        answers={typeof studentAns === "object" && studentAns ? studentAns : {}}
                      />
                    ) : (
                      <LatexPreview content={q.text} />
                    )}
                  </div>

                  {/* Summary Comparison */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-500">Bài làm của bạn: </span>
                      <strong className={isCorrect ? "text-emerald-700" : "text-red-600"}>
                        {typeof studentAns === "object"
                          ? JSON.stringify(studentAns)
                          : String(studentAns || "Chưa trả lời")}
                      </strong>
                    </div>
                  </div>

                  {/* Explanation Toggle */}
                  {q.explanation && (
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        data-tour-id={qIdx === 0 ? TOUR_DATA_IDS.RESULT_EXPLANATION_BTN : undefined}
                        onClick={() => toggleExplanation(q.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? "Thu gọn lời giải chi tiết" : "Xem lời giải chi tiết"}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs sm:text-sm text-slate-800 space-y-2 animate-in fade-in">
                          <p className="font-bold text-blue-900">Hướng dẫn giải chi tiết:</p>
                          <LatexPreview content={q.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Demo AI Tutor Modal */}
      {demoAiModalQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Gia sư AI — Giải thích Câu {demoAiModalQuestion.index + 1}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tự động nhận diện đề bài và bài làm của bạn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDemoAiModalQuestion(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800">
              <span className="font-bold text-slate-500 block mb-1">Đề bài:</span>
              <LatexPreview content={demoAiModalQuestion.question.text} />
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs sm:text-sm text-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Phản hồi từ Gia sư AI:</span>
              </div>
              <p className="leading-relaxed">
                Chào bạn! Đối với câu hỏi này, phương pháp tối ưu là áp dụng định lý cơ bản và giải
                từng bước rõ ràng. Bạn có thể xem lại lời giải chi tiết của bài để củng cố thêm nhé!
              </p>
              <LatexPreview content={demoAiModalQuestion.question.explanation || ""} />
            </div>

            <button
              type="button"
              onClick={() => setDemoAiModalQuestion(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đã hiểu, cảm ơn Gia sư AI!
            </button>
          </div>
        </div>
      )}

      {/* Demo Report Question Modal */}
      {demoReportQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <Flag className="w-5 h-5 fill-red-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Báo cáo sự cố câu hỏi (DEMO)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Câu {demoReportQuestion.index + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDemoReportQuestion(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">Gửi báo cáo thành công!</h4>
                <p className="text-xs text-emerald-700">
                  (Đây là chế độ DEMO — báo cáo chưa được gửi đến Discord thật).
                </p>
                <button
                  type="button"
                  onClick={() => setDemoReportQuestion(null)}
                  className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Nếu bạn phát hiện sai đáp án, lỗi công thức LaTeX, sai chính tả hoặc hình ảnh không hiển thị, bạn có thể gửi báo cáo tại đây.
                </p>
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Ví dụ: Lỗi chính tả ở đề bài, sai kết quả tính toán..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-semibold">
                  * Chế độ DEMO: Báo cáo mô phỏng sẽ không gửi webhook Discord thật ra bên ngoài.
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDemoReportQuestion(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportSuccess(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Gửi báo cáo thử
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
