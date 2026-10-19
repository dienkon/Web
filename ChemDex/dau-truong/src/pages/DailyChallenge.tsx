// src/pages/DailyChallenge.tsx
// Màn hình Thử thách hằng ngày (Daily Challenge) với chuỗi ngày liên tiếp (Streak)

import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Calendar, CheckCircle2, XCircle, ArrowRight, RotateCcw, Sparkles, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChemText } from '../components/common/ChemText';
import { generateStemQuestion, GeneratedQuestion } from '../data/stemGenerators';
import { NumericGame } from '../features/gameplay/NumericGame';
import { ChoiceGame } from '../features/gameplay/ChoiceGame';
import { validateGameAnswer } from '../games/registry';
import { recordWrongAnswer } from '../features/learning/wrongQuestionTracker';

const DAILY_KEY = 'chemdex_daily_challenge_state_v1';

export default function DailyChallenge() {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, { ans: string; isCorrect: boolean }>>({});
  const [completed, setCompleted] = useState(false);
  const [streakDays, setStreakDays] = useState(1);
  const [lastCompletedDate, setLastCompletedDate] = useState<string | null>(null);

  useEffect(() => {
    // Tải thông tin streak từ localStorage
    try {
      const raw = localStorage.getItem(DAILY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setStreakDays(parsed.streak || 1);
        setLastCompletedDate(parsed.lastDate || null);
        if (parsed.lastDate === todayStr && parsed.savedAnswers) {
          setUserAnswers(parsed.savedAnswers);
          setCompleted(true);
        }
      }
    } catch (e) {}

    // Sinh 5 câu hỏi ngẫu nhiên cho ngày hôm nay
    const modes = ['mol_calc', 'math_algebra', 'physics_calc', 'unit_convert', 'science_mcq'];
    const diffs: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'medium', 'hard', 'medium'];
    const dailySet: GeneratedQuestion[] = modes.map((m, i) => generateStemQuestion(m, diffs[i]));
    setQuestions(dailySet);
  }, [todayStr]);

  const handleAnswer = (answer: string) => {
    const q = questions[currentIdx];
    const { isCorrect } = validateGameAnswer(q.mode, q, answer);

    if (!isCorrect) {
      recordWrongAnswer({
        mode: q.mode,
        difficulty: q.difficulty,
        grade: q.grade,
        chapter: q.chapter,
        equation: q.equation,
        explanation: q.explanation,
        acceptedAnswers: q.acceptedAnswers,
      }, answer);
    }

    const updated = {
      ...userAnswers,
      [currentIdx]: { ans: answer, isCorrect },
    };
    setUserAnswers(updated);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Đã hoàn thành 5 câu
      setCompleted(true);
      const isYesterday = (dStr: string) => {
        const d = new Date(dStr);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return d.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
      };

      let newStreak = streakDays;
      if (lastCompletedDate && isYesterday(lastCompletedDate)) {
        newStreak += 1;
      } else if (lastCompletedDate !== todayStr) {
        newStreak = 1;
      }
      setStreakDays(newStreak);

      try {
        localStorage.setItem(DAILY_KEY, JSON.stringify({
          lastDate: todayStr,
          streak: newStreak,
          savedAnswers: updated,
        }));
      } catch (e) {}
    }
  };

  const currentQ = questions[currentIdx];
  const correctCount = Object.values(userAnswers).filter(x => x.isCorrect).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Ngày {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Flame className="w-8 h-8 text-amber-500 fill-amber-500 animate-pulse" />
            <span>Thử Thách Hằng Ngày (Daily STEM)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            5 câu hỏi kiến thức khoa học ngẫu nhiên mỗi ngày. Giữ lửa chuỗi ngày học tập liên tục!
          </p>
        </div>

        {/* Streak Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl self-start sm:self-auto shadow-xs">
          <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
          <div>
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Chuỗi ngày (Streak)</div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400">{streakDays} Ngày Liên Tiếp 🔥</div>
          </div>
        </div>
      </div>

      {!completed && currentQ ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-6 md:p-8">
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span>Câu {currentIdx + 1} / {questions.length}</span>
            <span className="capitalize text-cyan-600 dark:text-cyan-400 font-bold">{currentQ.mode} • Lớp {currentQ.grade}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 rounded-full"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Render Game tương ứng */}
          {currentQ.options && currentQ.options.length > 0 ? (
            <ChoiceGame question={currentQ} onSubmit={handleAnswer} fontSize="lg" />
          ) : (
            <NumericGame question={currentQ} onSubmit={handleAnswer} fontSize="lg" />
          )}
        </div>
      ) : (
        /* Màn hình hoàn thành */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-6 md:p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-inner">
            <Award className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            Đã Hoàn Thành Thử Thách Hôm Nay!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Bạn đã xuất sắc trả lời đúng <b>{correctCount} / {questions.length}</b> câu hỏi. Chuỗi ngày học tập được nâng lên <b>{streakDays} ngày</b>!
          </p>

          {/* Danh sách câu hỏi và lời giải chi tiết */}
          <div className="flex flex-col gap-3 text-left max-w-2xl mx-auto mb-8">
            {questions.map((q, idx) => {
              const res = userAnswers[idx];
              const isCorrect = res?.isCorrect;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${
                    isCorrect
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500">Câu {idx + 1} • {q.chapter}</span>
                    {isCorrect ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1 font-bold">
                        <XCircle className="w-3.5 h-3.5" /> Chưa đúng
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
                    <ChemText text={q.equation} />
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 p-2.5 bg-white/70 dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-line leading-relaxed">
                    <ChemText text={q.explanation} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-3">
            <Link
              to="/practice"
              className="px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện Tập Tự Do</span>
            </Link>

            <Link
              to="/mistakes"
              className="px-6 py-3 rounded-2xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
            >
              <span>Xem Sổ Tay Câu Sai</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
