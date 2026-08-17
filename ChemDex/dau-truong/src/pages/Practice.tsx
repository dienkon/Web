import { useState } from 'react';
import { useRoomStore, GameMode, Difficulty } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useNavigate } from 'react-router-dom';
import { Activity, Play, Trophy, Loader2, Atom, Shuffle, Zap, Flame } from 'lucide-react';

export default function Practice() {
  const { createRoom, startGame } = useRoomStore();
  const { profile } = useAuthStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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

  const handleStartPractice = async (mode: GameMode) => {
    if (!profile) return;
    setLoading(true);
    try {
      const roomId = await createRoom(profile.uid, profile, {
        mode,
        difficulty,
        maxPlayers: 1,
        totalRounds
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

  const practiceModes: { id: GameMode; title: string; desc: string; icon: any; color: string }[] = [
    { id: 'balance', title: 'Cân bằng HH', desc: 'Thử thách 5 vòng cân bằng phương trình hóa học cấp độ AI.', icon: Activity, color: 'cyan' },
    { id: 'fill_blank', title: 'Điền khuyết', desc: 'Xác định chất tham gia hoặc sản phẩm còn thiếu trong sơ đồ phản ứng.', icon: Play, color: 'blue' },
    { id: 'compound_name', title: 'Gọi Tên Chất', desc: 'Đọc tên gọi IUPAC hoặc công thức hóa học chuẩn xác của hợp chất.', icon: Trophy, color: 'purple' },
    { id: 'element_quiz', title: 'Đoán Nguyên Tố', desc: 'Sử dụng manh mối số hiệu Z, cấu hình electron để đoán tên nguyên tố.', icon: Atom, color: 'amber' },
    { id: 'mixed', title: 'Hỗn hợp', desc: 'Trải nghiệm ngẫu nhiên các loại câu hỏi khác nhau từ tất cả các mini-game.', icon: Shuffle, color: 'emerald' },
    { id: 'oxidation_state', title: 'Số Oxi Hóa', desc: 'Xác định số oxi hóa chuẩn xác của nguyên tố trong hợp chất.', icon: Zap, color: 'rose' },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Phòng Luyện Tập Solo</h1>
          <p className="text-slate-500 dark:text-slate-400">Chọn 1 trong 6 chế độ đấu solo luyện phản xạ kiến thức Hóa Học.</p>
        </div>

        {/* Selectors Group */}
        <div className="flex flex-col sm:flex-row gap-4 items-start md:items-center">
          {/* Difficulty Selector */}
          <div className="bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 flex items-center gap-1.5 shrink-0">
              <Flame size={16} className="text-amber-400" />
              <span>Cấp độ:</span>
            </div>
            <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              {[
                { id: 'easy', name: 'Dễ', color: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' },
                { id: 'medium', name: 'Trung Bình', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
                { id: 'hard', name: 'Khó', color: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30' },
                { id: 'random', name: 'Ngẫu nhiên', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30' }
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setDifficulty(lvl.id as Difficulty)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                    difficulty === lvl.id
                      ? `${lvl.color} shadow-md`
                      : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {lvl.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Rounds Selector */}
          <div className="bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 shadow-lg w-full sm:w-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 flex items-center gap-1.5 shrink-0">
              <Trophy size={16} className="text-cyan-400" />
              <span>Số màn:</span>
            </div>
            <div className="flex items-center gap-3 px-2 flex-1 sm:flex-none justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => setTotalRounds(Math.max(1, totalRounds - 1))}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors shrink-0"
              >
                -
              </button>
              <span className="font-black text-cyan-400 text-lg w-6 text-center">{totalRounds}</span>
              <button
                type="button"
                onClick={() => setTotalRounds(Math.min(20, totalRounds + 1))}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors shrink-0"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
          <div className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Đang khởi tạo trận solo...</div>
          <div className="text-sm text-cyan-400 mt-2 font-medium">
            Hệ thống đang soạn bộ đề cấp độ <span className="uppercase font-bold text-amber-300">{difficulty}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {practiceModes.map((m) => {
          const IconComponent = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => handleStartPractice(m.id)}
              className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 hover:border-cyan-400/80 cursor-pointer group transition-all shadow-xl hover:shadow-cyan-950/40 flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all duration-300 group-hover:scale-110 shadow-md">
                <IconComponent className="w-8 h-8 text-cyan-400 group-hover:text-slate-900" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 uppercase">{m.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed flex-1">{m.desc}</p>
              <button className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-900 font-black rounded-xl transition-colors uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                <span>Bắt đầu ({difficulty.toUpperCase()})</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
