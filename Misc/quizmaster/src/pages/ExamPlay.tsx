import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Exam, JsonExam, JsonQuestion, Attempt } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import HtmlRenderer from '@/components/HtmlRenderer';
import { cn, formatTime } from '@/lib/utils';
import { CheckSquare, Circle, Clock, Grid3X3, ArrowRight, ArrowLeft, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { getLocalExam, getLocalAnswers } from '@/lib/localExams';

export default function ExamPlay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [examData, setExamData] = useState<JsonExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showGrid, setShowGrid] = useState(false); // Mobile grid toggle
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Flatten questions for easy navigation
  const questions: JsonQuestion[] = examData?.sections.flatMap(s => s.questions) || [];
  const currentQuestion = questions[currentQIndex];

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchExam = async () => {
      let data: Exam | null = null;
      if (id.startsWith('local_')) {
        data = getLocalExam(id);
      } else {
        const examSnap = await getDoc(doc(db, 'exams', id));
        if (examSnap.exists()) {
          data = examSnap.data() as Exam;
        }
      }
      
      if (data) {
        setExam(data);
        const parsed = typeof data.rawExamJson === 'string' ? JSON.parse(data.rawExamJson) : data.rawExamJson;
        setExamData(parsed);
        
        let totalTime = 0;
        parsed.sections.forEach((s: any) => totalTime += s.duration);
        setTimeLeft(totalTime * 60); // Assuming duration is in minutes
      }
    };
    fetchExam();
  }, [id, user]);

  useEffect(() => {
    if (timeLeft <= 0 || !exam) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, exam]);

  const handleSelectOption = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      showToast('Vui lòng đăng nhập để nộp bài thi!');
      return;
    }
    if (!exam || !id) return;
    setSubmitting(true);
    setShowConfirmModal(false);
    try {
      const durationUsed = (exam.duration * 60) - timeLeft;
      
      const attemptId = `${user.uid}_${id}`;
      const attempt: Attempt = {
        id: attemptId,
        uid: user.uid,
        examId: id,
        answers,
        score: 0, 
        submittedAt: Date.now(),
        gradedAt: 0,
        durationUsed,
        isFinished: true,
        totalCorrect: 0
      };

      await setDoc(doc(db, 'attempts', attemptId), attempt);
      navigate(`/exam/${id}/review/${attemptId}`);
    } catch (e) {
      console.error(e);
      alert('Failed to submit exam.');
      setSubmitting(false);
    }
  };

  if (!exam || !examData) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h5l4 4 4-4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5l-4-4-4 4Z"/></svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wider truncate max-w-sm">{exam.title}</h1>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-sm">{exam.description || 'No description'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Thời gian còn lại</span>
            <span className="text-xl font-mono font-bold text-indigo-600">{formatTime(timeLeft)}</span>
          </div>
          
          <button 
            onClick={() => setViewMode(m => m === 'single' ? 'all' : 'single')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {viewMode === 'single' ? (
              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> Cuộn</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="9"></rect><rect x="14" y="7" width="3" height="5"></rect></svg> Từng câu</>
            )}
          </button>

          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Đã copy link bài thi!');
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Chia sẻ</span>
          </button>

          <div className="hidden sm:block h-10 w-[1px] bg-slate-200"></div>
          <div className="hidden sm:flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full">
            <div className="text-right leading-none">
              <p className="text-xs font-bold truncate max-w-[120px]">{user.displayName}</p>
              <p className="text-[10px] text-slate-500">ID: {user.uid.slice(0,6)}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs border border-white">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Section: Question Content */}
        <div className="flex-1 flex flex-col bg-slate-50 p-4 sm:p-6 overflow-hidden">
          {viewMode === 'single' ? (
            currentQuestion ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight">Câu hỏi {currentQIndex + 1}</span>
                    <span className="text-slate-400 text-xs">/ {questions.length} câu</span>
                  </div>
                  <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                    {currentQuestion.points} pts
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 p-6 sm:p-8 overflow-y-auto leading-relaxed custom-scrollbar">
                    {currentQuestion.questionPremise && (
                      <div className="mb-6 p-4 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-100">
                        <HtmlRenderer html={currentQuestion.questionPremise} />
                      </div>
                    )}
                    
                    <div className="text-lg text-slate-800 mb-8 font-serif">
                      <HtmlRenderer html={currentQuestion.text || currentQuestion.questionText || ''} />
                    </div>
                    
                    {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                      <div className="grid grid-cols-1 gap-3">
                        {currentQuestion.options.map((opt, i) => {
                          const isSelected = answers[currentQuestion.id] === opt.value;
                          return (
                            <button 
                              key={i}
                              onClick={() => handleSelectOption(currentQuestion.id, opt.value)}
                              className={cn(
                                "flex items-center p-4 rounded-xl transition-all text-left group w-full",
                                isSelected 
                                  ? "border-2 border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2" 
                                  : "border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200"
                              )}
                            >
                              <span className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-4 shrink-0 transition-colors",
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "border border-slate-200 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent"
                              )}>
                                {opt.value}
                              </span>
                              <span className={cn(
                                "font-medium text-lg flex-1",
                                isSelected ? "text-indigo-900 font-bold" : "text-slate-700"
                              )}>
                                <HtmlRenderer html={opt.text} className="inline-block" />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {currentQuestion.type === 'short-answer' && (
                      <div className="mt-6">
                        <Input 
                          placeholder="Nhập câu trả lời..."
                          value={answers[currentQuestion.id] || ''}
                          onChange={(e) => handleSelectOption(currentQuestion.id, e.target.value)}
                          className="max-w-md h-12 text-lg rounded-xl border-slate-300 focus-visible:ring-indigo-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Navigation Footer */}
                  <div className="h-20 bg-slate-50 border-t border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0">
                    <button 
                      onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
                      disabled={currentQIndex === 0}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 bg-white hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                      <span className="hidden sm:inline">Câu trước</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <div className="w-4 h-1.5 rounded-full bg-indigo-600"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                    <button 
                      onClick={() => setCurrentQIndex(i => Math.min(questions.length - 1, i + 1))}
                      disabled={currentQIndex === questions.length - 1}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      <span className="hidden sm:inline">Câu tiếp theo</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">No question selected</div>
            )
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-8 pb-32">
              {questions.map((q, i) => (
                <div key={q.id} id={`question-${i}`} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-24">
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Câu hỏi {i + 1}</span>
                    <span className="text-xs font-bold text-slate-400">{q.points} pts</span>
                  </div>
                  <div className="p-6">
                    {q.questionPremise && (
                      <div className="mb-6 p-4 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-100">
                        <HtmlRenderer html={q.questionPremise} />
                      </div>
                    )}
                    
                    <div className="text-lg text-slate-800 mb-8 font-serif">
                      <HtmlRenderer html={q.text || q.questionText || ''} />
                    </div>
                    
                    {q.type === 'multiple-choice' && q.options && (
                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = answers[q.id] === opt.value;
                          return (
                            <button 
                              key={oIdx}
                              onClick={() => handleSelectOption(q.id, opt.value)}
                              className={cn(
                                "flex items-center p-4 rounded-xl transition-all text-left group w-full",
                                isSelected 
                                  ? "border-2 border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2" 
                                  : "border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200"
                              )}
                            >
                              <span className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-4 shrink-0 transition-colors",
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "border border-slate-200 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent"
                              )}>
                                {opt.value}
                              </span>
                              <span className={cn(
                                "font-medium text-lg flex-1",
                                isSelected ? "text-indigo-900 font-bold" : "text-slate-700"
                              )}>
                                <HtmlRenderer html={opt.text} className="inline-block" />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {q.type === 'short-answer' && (
                      <div className="mt-6">
                        <Input 
                          placeholder="Nhập câu trả lời..."
                          value={answers[q.id] || ''}
                          onChange={(e) => handleSelectOption(q.id, e.target.value)}
                          className="max-w-md h-12 text-lg rounded-xl border-slate-300 focus-visible:ring-indigo-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Right Section: Question Navigator */}
        <aside className="hidden lg:flex w-80 bg-white border-l border-slate-200 flex-col shrink-0">
          <div className="p-6 flex flex-col flex-1 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Danh sách câu hỏi</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded">Đã làm: {Object.keys(answers).length}/{questions.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-1 custom-scrollbar">
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, i) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = viewMode === 'single' ? i === currentQIndex : false;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        if (viewMode === 'single') {
                          setCurrentQIndex(i);
                        } else {
                          document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-lg text-xs transition-all",
                        isCurrent 
                          ? "border-2 border-indigo-600 text-indigo-600 font-black shadow-md bg-white" 
                          : isAnswered 
                            ? "bg-indigo-600 text-white font-bold" 
                            : "border border-slate-200 text-slate-400 font-bold bg-slate-50 hover:bg-slate-100 hover:text-slate-600"
                      )}
                    >
                      {(i + 1).toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-indigo-600"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Đã chọn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Chưa làm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded ring-2 ring-indigo-600 ring-offset-1"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Đang xem</span>
              </div>
            </div>

            <button 
              onClick={() => setShowConfirmModal(true)} 
              disabled={submitting}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-black transition-colors shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {submitting ? 'Đang nộp...' : 'Nộp bài thi'}
              {!submitting && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>}
            </button>
          </div>
        </aside>
      </main>

      {/* Progress Indicator (Mobile App Style Hook) */}
      <div className="h-1.5 w-full bg-slate-200 shrink-0">
        <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }}></div>
      </div>
      
      {/* Mobile Bottom Bar & Grid Toggle */}
      <div className="lg:hidden fixed bottom-1.5 left-0 right-0 bg-white border-t border-slate-200 p-3 flex items-center justify-between z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setShowGrid(!showGrid)} 
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 px-4"
        >
          <Grid3X3 className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Câu hỏi</span>
        </button>
        <button 
          onClick={() => setShowConfirmModal(true)} 
          disabled={submitting}
          className="flex-1 max-w-xs py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-black transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mx-4"
        >
          Nộp bài
        </button>
      </div>

      {/* Mobile Grid Sheet */}
      {showGrid && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 flex flex-col justify-end backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl p-6 max-h-[75vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900 uppercase tracking-tight">Danh sách câu hỏi</h3>
              <button className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full" onClick={() => setShowGrid(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto pb-8 custom-scrollbar">
              <div className="grid grid-cols-5 gap-3 sm:grid-cols-8">
                {questions.map((q, i) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = viewMode === 'single' ? i === currentQIndex : false;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        if (viewMode === 'single') {
                          setCurrentQIndex(i);
                        } else {
                          document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth' });
                        }
                        setShowGrid(false);
                      }}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-xl text-sm transition-all",
                        isCurrent 
                          ? "border-2 border-indigo-600 text-indigo-600 font-black shadow-md bg-white ring-2 ring-indigo-600 ring-offset-2" 
                          : isAnswered 
                            ? "bg-indigo-600 text-white font-bold" 
                            : "border border-slate-200 text-slate-400 font-bold bg-slate-50 hover:bg-slate-100"
                      )}
                    >
                      {(i + 1).toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Nộp bài thi?</h3>
            <p className="text-sm text-slate-600 mb-6">Bạn có chắc chắn muốn nộp bài thi ngay bây giờ? Bạn sẽ không thể sửa lại câu trả lời sau khi nộp.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                {submitting ? 'Đang nộp...' : 'Nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
