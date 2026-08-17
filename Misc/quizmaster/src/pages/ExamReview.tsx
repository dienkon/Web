import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Exam, JsonExam, JsonAnswer, Attempt, JsonQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import HtmlRenderer from '@/components/HtmlRenderer';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Home, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function ExamReview() {
  const { id, attemptId } = useParams();
  const { user } = useAuthStore();
  const [exam, setExam] = useState<Exam | null>(null);
  const [examData, setExamData] = useState<JsonExam | null>(null);
  const [answerData, setAnswerData] = useState<JsonAnswer | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  
  useEffect(() => {
    if (!id || !attemptId) return;
    const fetchDocs = async () => {
      const eSnap = await getDoc(doc(db, 'exams', id));
      if (eSnap.exists()) {
        const e = eSnap.data() as Exam;
        setExam(e);
        setExamData(JSON.parse(e.rawExamJson));
      }
      
      const attSnap = await getDoc(doc(db, 'attempts', attemptId));
      if (attSnap.exists()) {
        setAttempt(attSnap.data() as Attempt);
      }

      // User needs finished attempt or admin to read examAnswers (rules enforced)
      try {
        const ansSnap = await getDoc(doc(db, 'examAnswers', id));
        if (ansSnap.exists()) {
          setAnswerData(JSON.parse(ansSnap.data().rawAnswerJson));
        }
      } catch (err) {
        console.log("No answers available or permission denied", err);
      }
    };
    fetchDocs();
  }, [id, attemptId]);

  if (!exam || !examData || !attempt) return <div className="p-8 text-center">Loading results...</div>;

  const questions = examData.sections.flatMap(s => s.questions);
  let score = 0;
  let totalScore = 0;

  // Grade on the client side for display if answerData exists
  const questionStatus: Record<string, { isCorrect: boolean, correctAnswer: string, explanation: string }> = {};
  
  if (answerData) {
    answerData.answers.forEach(a => {
      const userAns = attempt.answers[a.questionId] || '';
      const isCorrect = userAns.trim().toLowerCase() === a.correctAnswer.trim().toLowerCase();
      questionStatus[a.questionId] = {
        isCorrect,
        correctAnswer: a.correctAnswer,
        explanation: a.explanation || ''
      };
    });
  }

  questions.forEach(q => {
    totalScore += q.points;
    if (questionStatus[q.id]?.isCorrect) {
      score += q.points;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <h1 className="font-bold text-lg truncate flex-1">{exam.title} - Results</h1>
        <div className="flex space-x-2">
           <Button variant="outline" size="sm" asChild>
            <Link to="/"><Home className="w-4 h-4 mr-2" /> Home</Link>
          </Button>
          {user?.role === 'admin' && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin"><LayoutDashboard className="w-4 h-4 mr-2" /> Admin</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Exam Completed</h2>
          {answerData ? (
            <div className="text-5xl font-black text-blue-600 my-6">
              {score} <span className="text-2xl text-slate-400">/ {totalScore} pts</span>
            </div>
          ) : (
            <div className="text-lg text-slate-600 my-6">Answers are not yet published for this exam.</div>
          )}
          <p className="text-slate-500">
            Time used: {Math.floor(attempt.durationUsed / 60)}m {attempt.durationUsed % 60}s
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold">Review Questions</h3>
          {questions.map((q, idx) => {
            const userAns = attempt.answers[q.id];
            const status = questionStatus[q.id];
            
            return (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border p-6 relative overflow-hidden">
                {status && (
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full", status.isCorrect ? "bg-green-500" : "bg-red-500")} />
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="text-sm font-semibold text-slate-500">
                    Question {idx + 1}
                  </div>
                  {status && (
                    <div className="flex items-center">
                      {status.isCorrect ? (
                        <span className="text-green-600 font-medium flex items-center bg-green-50 px-2 py-1 rounded text-sm"><CheckCircle2 className="w-4 h-4 mr-1" /> Correct</span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center bg-red-50 px-2 py-1 rounded text-sm"><XCircle className="w-4 h-4 mr-1" /> Incorrect</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-lg font-medium text-slate-900 mb-6">
                  <HtmlRenderer html={q.text || q.questionText || ''} />
                </div>

                {q.type === 'multiple-choice' && q.options && (
                  <div className="space-y-2 mb-6">
                    {q.options.map((opt, i) => {
                      const isSelected = userAns === opt.value;
                      const isCorrectAnswer = status?.correctAnswer === opt.value;
                      
                      let borderClass = "border-slate-200 bg-white";
                      if (status) {
                        if (isCorrectAnswer) {
                          borderClass = "border-green-500 bg-green-50";
                        } else if (isSelected && !isCorrectAnswer) {
                          borderClass = "border-red-300 bg-red-50";
                        }
                      } else if (isSelected) {
                        borderClass = "border-blue-500 bg-blue-50";
                      }

                      return (
                        <div key={i} className={cn("flex items-start p-3 rounded-md border-2", borderClass)}>
                          <div className="font-bold mr-3 text-slate-500 w-6">{opt.value}.</div>
                          <div className="flex-1"><HtmlRenderer html={opt.text} className="inline-block" /></div>
                          {isSelected && <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded ml-2">Your Answer</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {q.type === 'short-answer' && (
                  <div className="mb-6 space-y-2">
                    <div className="p-3 border rounded-md bg-slate-50">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Your Answer:</span>
                      {userAns || <span className="italic text-slate-400">No answer provided</span>}
                    </div>
                    {status && !status.isCorrect && (
                      <div className="p-3 border-2 border-green-200 rounded-md bg-green-50 text-green-800">
                        <span className="text-xs font-semibold block mb-1">Correct Answer:</span>
                        {status.correctAnswer}
                      </div>
                    )}
                  </div>
                )}

                {status?.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <h4 className="text-sm font-bold text-blue-800 mb-2">Explanation:</h4>
                    <HtmlRenderer html={status.explanation} className="text-sm text-blue-900" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
