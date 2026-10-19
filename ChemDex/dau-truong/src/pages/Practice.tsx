// src/pages/Practice.tsx
// Phòng luyện tập Solo toàn diện hỗ trợ đầy đủ 14 chế độ Hóa học & STEM

import React, { useState, useEffect } from 'react';
import { useRoomStore, GameMode, Difficulty } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Activity, Play, Trophy, Loader2, Atom, Shuffle, Zap, Flame,
  Scale, Edit3, BookOpen, FlaskConical, Binary, RefreshCw, CheckSquare,
  Layers, Sparkles, Filter, ArrowRight, Clock
} from 'lucide-react';
import { ALL_GAME_MODES, ModeInfo } from '../data/modes';
import { PRACTICE_TIME_OPTIONS } from '../config/gameConfig';

const ICON_MAP: Record<string, React.FC<any>> = {
  Scale,
  Edit3,
  BookOpen,
  Atom,
  Zap,
  FlaskConical,
  Binary,
  Activity,
  RefreshCw,
  CheckSquare,
  Layers,
  Shuffle,
  Trophy,
  Sparkles,
};

export default function Practice() {
  const { createRoom, startGame } = useRoomStore();
  const { profile } = useAuthStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const urlDiff = searchParams.get('difficulty');
    if (urlDiff === 'easy' || urlDiff === 'medium' || urlDiff === 'hard' || urlDiff === 'random') {
      return urlDiff as Difficulty;
    }
    const saved = localStorage.getItem('arena_settings');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.defaultDifficulty) return config.defaultDifficulty as Difficulty;
      } catch (e) {}
    }
    return 'random';
  });

  const [totalRounds, setTotalRounds] = useState<number>(() => {
    const saved = localStorage.getItem('arena_settings');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.defaultRounds) return Number(config.defaultRounds);
      } catch (e) {}
    }
    return 5;
  });

  const [customTimeLimitSec, setCustomTimeLimitSec] = useState<number>(() => {
    const saved = localStorage.getItem('arena_practice_time');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 45; // Mặc định 45s
  });

  const handleStartPractice = async (mode: GameMode) => {
    if (!profile) return;
    setLoading(true);
    try {
      const roomId = await createRoom(profile.uid, profile, {
        mode,
        difficulty,
        maxPlayers: 1,
        totalRounds,
        customTimeLimitSec,
      });
      await startGame();
      showToast("Khởi tạo trận đấu luyện tập thành công!", "success");
      navigate(`/match/${roomId}`);
    } catch (e) {
      console.error(e);
      showToast('Không thể bắt đầu luyện tập. Vui lòng thử lại.', "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredModes = ALL_GAME_MODES.filter(m => {
    if (selectedSubject === 'all') return true;
    if (selectedSubject === 'chemistry' && m.subject === 'chemistry') return true;
    if (selectedSubject === 'math' && m.subject === 'math') return true;
    if (selectedSubject === 'physics' && m.subject === 'physics') return true;
    if (selectedSubject === 'science' && (m.subject === 'science' || m.subject === 'mixed')) return true;
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full space-y-8">
      {/* Top Banner: Thử thách hằng ngày & Sổ tay câu sai */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/daily"
          className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-300/80 dark:border-amber-800/60 flex items-center justify-between hover:scale-[1.01] transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Flame className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Mỗi ngày 5 câu</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">Thử Thách Hằng Ngày (Streak)</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/mistakes"
          className="p-5 rounded-3xl bg-gradient-to-r from-rose-500/15 via-pink-500/15 to-purple-500/15 border border-rose-300/80 dark:border-rose-800/60 flex items-center justify-between hover:scale-[1.01] transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Ôn lại điểm yếu</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">Sổ Tay Câu Sai & Lời Giải</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-rose-500 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">
            Phòng Luyện Tập Solo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lựa chọn trong 14 chế độ thi đấu Hóa học và STEM để nâng cao kỹ năng và tốc độ phản xạ.
          </p>
        </div>

        {/* Selectors Group */}
        <div className="flex flex-col sm:flex-row gap-3 items-start md:items-center">
          {/* Difficulty Selector */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1 shrink-0">
              <Flame size={14} className="text-amber-500" />
              <span>Cấp độ:</span>
            </div>
            <div className="flex gap-1">
              {[
                { id: 'easy', name: 'Dễ' },
                { id: 'medium', name: 'Vừa' },
                { id: 'hard', name: 'Khó' },
                { id: 'random', name: 'Trộn' },
              ].map(lvl => (
                <button
                  key={lvl.id}
                  onClick={() => setDifficulty(lvl.id as Difficulty)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    difficulty === lvl.id
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {lvl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Rounds Selector */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1 shrink-0">
              <Trophy size={14} className="text-cyan-500" />
              <span>Số màn:</span>
            </div>
            <div className="flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => setTotalRounds(Math.max(1, totalRounds - 1))}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors"
              >
                -
              </button>
              <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm w-5 text-center">
                {totalRounds}
              </span>
              <button
                type="button"
                onClick={() => setTotalRounds(Math.min(20, totalRounds + 1))}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Custom Time Limit Selector (Chỉ áp dụng Luyện tập) */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1 shrink-0" title="Thời gian làm bài mỗi câu (Chỉ áp dụng trong Luyện tập Solo)">
              <Clock size={14} className="text-amber-500" />
              <span>Thời gian:</span>
            </div>
            <div className="px-1">
              <select
                aria-label="Chọn thời gian làm bài mỗi câu"
                value={customTimeLimitSec}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCustomTimeLimitSec(val);
                  localStorage.setItem('arena_practice_time', String(val));
                }}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-hidden border border-transparent focus:border-cyan-500 cursor-pointer"
              >
                {PRACTICE_TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Phân Loại Môn Học */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'all', name: 'Tất cả các chế độ (14)' },
          { id: 'chemistry', name: 'Hóa Học (7)' },
          { id: 'math', name: 'Toán Nhanh (1)' },
          { id: 'physics', name: 'Vật Lí (1)' },
          { id: 'science', name: 'KHTN / STEM (5)' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedSubject(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedSubject === tab.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center">
          <Loader2 className="w-14 h-14 text-cyan-400 animate-spin mb-4" />
          <div className="text-xl font-black text-white uppercase tracking-wider">Đang khởi tạo trận solo...</div>
          <div className="text-xs text-cyan-300 mt-2 font-medium">
            Hệ thống đang chuẩn bị bộ đề cấp độ <span className="uppercase font-bold text-amber-300">{difficulty}</span>
          </div>
        </div>
      )}

      {/* Grid danh sách chế độ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredModes.map((m: ModeInfo) => {
          const IconComp = ICON_MAP[m.icon] || FlaskConical;
          return (
            <div
              key={m.id}
              onClick={() => handleStartPractice(m.id as GameMode)}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 dark:hover:border-cyan-500/60 cursor-pointer group transition-all shadow-sm hover:shadow-lg flex flex-col justify-between relative overflow-hidden"
            >
              {m.isNew && (
                <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white uppercase tracking-wider shadow-xs">
                  Mới
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-xs">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {m.subjectName} • {m.gradeText}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                      {m.name}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {m.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500">
                <span>Vào Luyện Tập ({difficulty.toUpperCase()})</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
