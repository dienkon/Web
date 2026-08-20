import React, { useEffect, useState } from "react";
import { X, Clock, AlertTriangle, Eye, CheckCircle2, ChevronRight, Check } from "lucide-react";
import type { ActiveSession } from "../../services/realtimeProctoringService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import type { Exam, Question } from "../../types";

export default function LiveSessionDetailModal({
  session,
  onClose,
}: {
  session: ActiveSession | null;
  onClose: () => void;
}) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    const loadExam = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "exams", session.examId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setExam({ id: snap.id, ...snap.data() } as Exam);
        }
      } catch (e) {}
      setLoading(false);
    };
    loadExam();
  }, [session?.examId]);

  if (!session) return null;

  const questions: Question[] = Array.isArray((exam as any)?.questions)
    ? (exam as any).questions
    : [];
  
  // Sort questions to match student view
  questions.sort((a,b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm">
              {session.studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {session.studentName}
                {session.status === "taking" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" />
                )}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {session.examTitle} • Lớp: {session.studentClass || "N/A"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left: Summary & Progress */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</h4>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" /> Còn lại
                  </span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                    {Math.floor(session.timeLeft / 60)}:{(session.timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Đã trả lời
                  </span>
                  <span className="font-bold text-slate-800">
                    {session.answeredCount} / {session.totalQuestions}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Cảnh báo
                  </span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    {session.warnings} lần
                  </span>
                </div>
              </div>

              {/* Progress Map */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  Bản đồ câu hỏi
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: session.totalQuestions }).map((_, i) => {
                    const qId = questions[i]?.id;
                    const hasAns = qId && session.answers && session.answers[qId] !== undefined && session.answers[qId] !== "";
                    const isActive = session.activeQuestionIdx === i;
                    
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                          isActive 
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-600/30 ring-offset-1 scale-110 z-10" 
                            : hasAns 
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                            : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Live View */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col h-full min-h-[400px]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" /> Học sinh đang xem
                  </h4>
                  {typeof session.activeQuestionIdx === "number" && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                      Câu {session.activeQuestionIdx + 1}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="flex-1 flex items-center justify-center text-sm font-semibold text-slate-400 animate-pulse">
                    Đang tải nội dung đề thi...
                  </div>
                ) : questions.length > 0 && typeof session.activeQuestionIdx === "number" && questions[session.activeQuestionIdx] ? (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {/* Render exact question text */}
                    <div className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                      {questions[session.activeQuestionIdx].text}
                    </div>
                    
                    {/* Render choices state */}
                    {questions[session.activeQuestionIdx].type === "single_choice" || questions[session.activeQuestionIdx].type === "multiple_choice" && (
                      <div className="space-y-2 mt-4">
                        {(questions[session.activeQuestionIdx].options || []).map((opt, oIdx) => {
                          const qId = questions[session.activeQuestionIdx].id;
                          const selectedAns = session.answers?.[qId];
                          const isSelected = selectedAns === opt.id || selectedAns === opt.text;
                          
                          return (
                            <div key={oIdx} className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-3 transition-colors ${
                              isSelected 
                                ? "bg-blue-50 border-blue-200 text-blue-800" 
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                                isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                              }`}>
                                {isSelected ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + oIdx)}
                              </div>
                              <span className="flex-1">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    
                    {questions[session.activeQuestionIdx].type === "true_false" && (
                      <div className="mt-4 space-y-2">
                        {(questions[session.activeQuestionIdx].statements || []).map((stmt, sIdx) => {
                          const qId = questions[session.activeQuestionIdx].id;
                          const studentAnsObj = session.answers?.[qId] || {};
                          const studentChoice = studentAnsObj[stmt.id];
                          return (
                            <div key={sIdx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-3">
                              <span className="font-medium text-slate-700">{stmt.text}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-3 py-1 rounded-lg font-bold text-xs ${studentChoice === true ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>Đúng</span>
                                <span className={`px-3 py-1 rounded-lg font-bold text-xs ${studentChoice === false ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>Sai</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Show fill in the blank answer */}
                    {questions[session.activeQuestionIdx].type === "short_answer" && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Học sinh đã nhập:</p>
                        <div className="text-sm font-semibold text-slate-800">
                          {session.answers?.[questions[session.activeQuestionIdx].id] || <span className="text-slate-400 italic">Chưa trả lời</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm font-semibold text-slate-400">
                    Không có thông tin câu hỏi.
                  </div>
                )}
              </div>

              {/* Scratchpad View */}
              {session.scratchpadImage && (
                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                    <Eye className="w-4 h-4 text-purple-500" /> Bảng nháp hiện tại
                  </h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                    <img 
                      src={session.scratchpadImage} 
                      alt="Student Scratchpad" 
                      className="max-w-full max-h-[300px] object-contain rounded-lg shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
