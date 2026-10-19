import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore, GameMode, Difficulty } from '../store/useRoomStore';
import { useToastStore } from '../store/useToastStore';
import { Beaker, Settings, Users, Swords, Clock } from 'lucide-react';
import { ALL_GAME_MODES } from '../data/modes';

export default function RoomCreator() {
  const { profile } = useAuthStore();
  const { createRoom, loading } = useRoomStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<GameMode>('balance');
    const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = localStorage.getItem('arena_settings');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.defaultDifficulty) return config.defaultDifficulty as Difficulty;
      } catch (e) {}
    }
    return 'random';
  });
  const [maxPlayers, setMaxPlayers] = useState<number>(() => {
    const saved = localStorage.getItem('arena_settings');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.defaultMaxPlayers) return Number(config.defaultMaxPlayers);
      } catch (e) {}
    }
    return 4;
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

  const handleCreate = async () => {
    if (!profile) return;
    try {
      const roomId = await createRoom(profile.uid, profile, {
        mode,
        difficulty: mode === 'ranked_mixed' ? 'hard' : difficulty,
        maxPlayers,
        totalRounds: mode === 'ranked_mixed' ? 15 : totalRounds,
        isRanked: mode === 'ranked_mixed'
      });
      showToast("Tạo phòng đấu sĩ thành công!", "success");
      navigate(`/room/${roomId}`);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Lỗi tạo phòng", "error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Tạo Phòng Mới</h1>
        <p className="text-slate-500 dark:text-slate-400">Tùy chỉnh luật chơi và mời bạn bè cùng thi đấu.</p>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl overflow-y-auto">
        <div className="space-y-10">
          {/* Game Mode */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-6">
              <Beaker size={18} className="text-cyan-400" />
              Chọn Minigame
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ALL_GAME_MODES.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setMode(g.id as GameMode)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    mode === g.id 
                      ? (g.id === 'ranked_mixed' ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]') 
                      : (g.id === 'ranked_mixed' ? 'border-amber-200/50 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-300 hover:bg-amber-100/50 dark:hover:border-amber-700' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-100/40 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800')
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-base ${mode === g.id ? (g.id === 'ranked_mixed' ? 'text-amber-500' : 'text-cyan-400') : (g.id === 'ranked_mixed' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100')}`}>
                      {g.name}
                    </span>
                    {g.isNew && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white uppercase">
                        Mới
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1">{g.description}</div>
                  <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 mt-1">{g.subjectName} • {g.gradeText}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings - Hidden in Ranked Mode */}
          {mode !== 'ranked_mixed' && (
            <>
              <hr className="border-slate-200/50 dark:border-slate-700/50" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-6">
                  <Settings size={18} className="text-cyan-400" />
                  Tùy chỉnh trận đấu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Độ khó</label>
                    <div className="flex bg-white/50 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                      {['easy', 'medium', 'hard', 'random'].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setDifficulty(level as Difficulty)}
                          className={`flex-1 capitalize py-2.5 rounded-lg text-sm font-bold transition-colors ${
                            difficulty === level 
                              ? level === 'easy' ? 'bg-green-500/20 text-green-400 shadow-sm' 
                                : level === 'medium' ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
                                : level === 'hard' ? 'bg-red-500/20 text-red-400 shadow-sm'
                                : 'bg-purple-500/20 text-purple-400 shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {level === 'easy' ? 'Dễ' : level === 'medium' ? 'Trung bình' : level === 'hard' ? 'Khó' : 'Ngẫu nhiên'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Số màn chơi: <span className="text-cyan-400 font-black">{totalRounds}</span> / 15 màn
                    </label>
                    <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setTotalRounds(Math.max(1, totalRounds - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        value={totalRounds}
                        onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setTotalRounds(Math.min(15, totalRounds + 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <hr className="border-slate-200/50 dark:border-slate-700/50" />

          {/* Room Size */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-6">
              <Users size={18} className="text-cyan-400" />
              Số lượng người chơi tối đa: <span className="text-cyan-400 font-black">{maxPlayers}</span> / 20 người
            </h3>
            <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 max-w-md">
              <button
                type="button"
                onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
              >
                -
              </button>
              <input
                type="range"
                min="2"
                max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="flex-1 accent-cyan-400 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setMaxPlayers(Math.min(20, maxPlayers + 1))}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Room Time Limit Rule Info Banner */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-start gap-3.5">
            <Clock size={20} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
                Quy định thời gian phòng ghép đấu
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Thời gian mỗi câu được tự động tính toán theo mức độ khó của câu hỏi (<strong>Tối thiểu 45 giây — Tối đa 2 phút / 120s</strong>). Câu hỏi dễ có 45s - 50s, trung bình 60s - 75s, câu khó 90s - 120s giúp các đấu thủ có đủ thời gian cân bằng và suy luận logic.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                💡 <em>Lưu ý: Tùy chỉnh thời gian thi đấu tự do hoặc không giới hạn thời gian chỉ áp dụng trong chế độ <Link to="/practice" className="text-cyan-500 underline font-semibold hover:text-cyan-400">Luyện Tập Solo</Link>.</em>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3.5 px-10 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20 text-sm tracking-wide"
          >
            {loading ? 'ĐANG TẠO...' : 'TẠO PHÒNG NGAY'}
          </button>
        </div>
      </div>
    </div>
  );
}
