import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Target, BookOpen, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Submission, Exam, Question, Section } from "../../types";

interface AiAnalyticsWidgetProps {
  examId: string;
  currentSubmission: Submission;
  exam: Exam | null;
  questions: Question[];
  sections: Section[];
}

export default function AiAnalyticsWidget({ examId, currentSubmission, exam, questions, sections }: AiAnalyticsWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchHistoryAndAnalyze = async () => {
    let studentUsername = currentSubmission.studentId;
    if (!studentUsername) {
      const infoStr = localStorage.getItem("student_info");
      if (infoStr) {
        try {
          const parsed = JSON.parse(infoStr);
          studentUsername = parsed.username || parsed.displayName;
        } catch {}
      }
    }
    
    if (!studentUsername || !examId) return;
    
    setLoading(true);
    setError(null);
    try {
      // Fetch historical submissions for this exam by this user
      const q = query(
        collection(db, "submissions"),
        where("examId", "==", examId),
        where("studentId", "==", studentUsername)
      );
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => doc.data() as Submission)
        .sort((a, b) => (a.submittedAt?.toMillis() || 0) - (b.submittedAt?.toMillis() || 0)); // Sort by date ascending

      // Calculate some basic stats to feed to AI
      const historicalScores = history.map(h => ({
        date: new Date(h.submittedAt?.toMillis() || 0).toISOString(),
        score: h.score,
        maxScore: h.maxScore,
        correctCount: h.correctCount,
        totalQuestions: h.totalCount
      }));

      // Calculate performance by question type and section from current submission
      const typeStats: Record<string, { total: number, correct: number }> = {};
      const sectionStats: Record<string, { total: number, correct: number }> = {};

      questions.forEach((q) => {
        const t = q.type || "unknown";
        if (!typeStats[t]) typeStats[t] = { total: 0, correct: 0 };
        typeStats[t].total++;

        const sId = q.sectionId || "no_section";
        if (!sectionStats[sId]) sectionStats[sId] = { total: 0, correct: 0 };
        sectionStats[sId].total++;

        // Determine correct based on currentSubmission
        const studentAns = currentSubmission.answers?.[q.id];
        let isCorrect = false;
        
        if (studentAns !== undefined && studentAns !== null) {
          if (q.type === "single_choice") {
            isCorrect = q.correctOptionIds?.includes(studentAns) || false;
          } else if (q.type === "multiple_choice") {
            const correctSet = new Set<string>(q.correctOptionIds || []);
            const ansSet = new Set<string>((studentAns as string[]) || []);
            isCorrect =
              correctSet.size > 0 &&
              correctSet.size === ansSet.size &&
              [...correctSet].every((id: string) => ansSet.has(id));
          } else if (q.type === "short_answer") {
            const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
            isCorrect = accepted.includes(String(studentAns || "").trim().toLowerCase());
          } else if (q.type === "true_false") {
            const stmts = q.statements || [];
            if (stmts.length > 0 && typeof studentAns === "object") {
              let correctCount = 0;
              stmts.forEach((s) => {
                if (studentAns[s.id] === s.correctAnswer) correctCount++;
              });
              isCorrect = correctCount === stmts.length;
            }
          }
        }

        if (isCorrect) {
          typeStats[t].correct++;
          sectionStats[sId].correct++;
        }
      });

      const sectionTitles: Record<string, string> = { "no_section": "Phần chung" };
      sections.forEach(s => { sectionTitles[s.id] = s.title; });

      const analyticsInput = {
        examTitle: exam?.title || "Bài thi",
        currentAttempt: {
          score: currentSubmission.score,
          maxScore: currentSubmission.maxScore,
          correctCount: currentSubmission.correctCount,
          totalQuestions: currentSubmission.totalCount,
          timeSpent: currentSubmission.timeSpent,
        },
        historicalScores,
        performanceByType: Object.entries(typeStats).map(([type, stats]) => ({
          type,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          totalQuestions: stats.total
        })),
        performanceBySection: Object.entries(sectionStats).map(([sId, stats]) => ({
          sectionId: sId,
          title: sectionTitles[sId] || "Section",
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          totalQuestions: stats.total
        }))
      };

      const response = await fetch("/api/ai/analyze-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyticsInput })
      });

      if (!response.ok) {
        throw new Error("Lỗi khi kết nối AI Analyst");
      }

      const result = await response.json();
      setAnalytics(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  if (!analytics && !loading && !error) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">AI Phân Tích Kết Quả</h3>
            <p className="text-sm text-slate-600">Nhận đánh giá chi tiết, xu hướng điểm số và lộ trình học tập cá nhân hóa.</p>
          </div>
        </div>
        <button 
          onClick={fetchHistoryAndAnalyze}
          className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Sparkles className="w-4 h-4" /> Bắt đầu phân tích
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex flex-col items-center justify-center gap-4 min-h-[200px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-600 animate-pulse">AI đang phân tích dữ liệu học tập của bạn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4 text-red-700">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
          <TrendingDown className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold">Không thể phân tích</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
        <button onClick={fetchHistoryAndAnalyze} className="px-4 py-2 bg-white text-red-700 text-sm font-bold rounded-xl border border-red-200 hover:bg-red-50">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-indigo-100 rounded-3xl overflow-hidden shadow-xs">
      {/* Header */}
      <button 
        className="w-full px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold text-lg">AI Phân Tích & Tư Vấn Học Tập</h3>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isExpanded && analytics && (
        <div className="p-6 space-y-8">
          
          {/* Summary */}
          <div>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
              {analytics.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths & Weaknesses */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" /> Điểm Mạnh
              </h4>
              <ul className="space-y-2">
                {analytics.strengths?.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" /> Điểm Cần Cải Thiện
              </h4>
              <ul className="space-y-2">
                {analytics.weaknesses?.map((w: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                    <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section Analysis */}
          {analytics.sectionAnalysis && analytics.sectionAnalysis.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Phân Tích Theo Phần</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analytics.sectionAnalysis.map((sec: any, i: number) => (
                  <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-white relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 text-sm truncate pr-2">{sec.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        sec.accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        sec.accuracy >= 50 ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {sec.accuracy}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{sec.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Plan */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Lộ Trình Học Tập Đề Xuất
            </h4>
            <div className="space-y-3">
              {analytics.studyPlan?.map((step: any, i: number) => (
                <div key={i} className="flex gap-3 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                    {step.step}
                  </div>
                  <p className="text-sm text-slate-700 pt-0.5">{step.action}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
