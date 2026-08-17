import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Search, Activity, Play, Trophy, Sparkles, Filter } from 'lucide-react';

export default function JoinRoom() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available'>('all');
  const [filterRanked, setFilterRanked] = useState<'all' | 'ranked' | 'casual'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'),
      where('status', '==', 'lobby')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const roomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((room: any) => {
        if (!room.createdAt) return true;
        const createdAt = room.createdAt.toMillis ? room.createdAt.toMillis() : room.createdAt;
        // Hide rooms older than 10 minutes if still in lobby
        return (now - createdAt) < 600000;
      });
      setRooms(roomData);
      setLoading(false);
    }, (err) => {
      console.warn("JoinRoom onSnapshot error (likely logged out):", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRooms = rooms.filter(room => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = room.id.toLowerCase().includes(searchLower) || 
      Object.values(room.players || {}).some((p: any) => p.displayName?.toLowerCase().includes(searchLower));
    
    const playerCount = Object.keys(room.players || {}).length;
    const isAvailable = playerCount < room.maxPlayers;
    const matchesAvailability = filterAvailability === 'all' || (filterAvailability === 'available' && isAvailable);

    const matchesMode = filterMode === 'all' || room.mode === filterMode;
    const matchesDifficulty = filterDifficulty === 'all' || room.difficulty === filterDifficulty;
    
    const matchesRanked = filterRanked === 'all' || 
      (filterRanked === 'ranked' && room.isRanked) || 
      (filterRanked === 'casual' && !room.isRanked);

    return matchesSearch && matchesAvailability && matchesMode && matchesDifficulty && matchesRanked;
  });

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">Ghép Phòng Trực Tuyến</h1>
      </div>

      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden shadow-2xl flex-1">
        {/* Filter Controls Bar */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-50 dark:bg-slate-800/30 shrink-0">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Tìm theo ID phòng, người chơi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm text-xs">
              <Filter size={14} className="text-cyan-500" />
              <span className="font-bold text-slate-500 dark:text-slate-400 mr-1">Chế độ:</span>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Tất cả chế độ</option>
                <option value="balance" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Cân bằng phương trình</option>
                <option value="fill_blank" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Điền khuyết phản ứng</option>
                <option value="compound_name" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Gọi tên hợp chất</option>
                <option value="element_quiz" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Đoán nguyên tố</option>
                <option value="mixed" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Chế độ Hỗn hợp</option>
                <option value="oxidation_state" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Xác định Số Oxi Hóa</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm text-xs">
              <Sparkles size={14} className="text-amber-500" />
              <span className="font-bold text-slate-500 dark:text-slate-400 mr-1">Độ khó:</span>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Tất cả độ khó</option>
                <option value="easy" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Dễ</option>
                <option value="medium" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Trung bình</option>
                <option value="hard" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Khó</option>
                <option value="random" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">Ngẫu nhiên</option>
              </select>
            </div>

            <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 border border-slate-300 dark:border-slate-700 rounded-xl">
              <button 
                onClick={() => setFilterAvailability('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterAvailability === 'all' ? 'bg-cyan-500 text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setFilterAvailability('available')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterAvailability === 'available' ? 'bg-cyan-500 text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Phòng trống
              </button>
            </div>
            
            <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 border border-slate-300 dark:border-slate-700 rounded-xl">
              <button 
                onClick={() => setFilterRanked('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterRanked === 'all' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Mọi Thể Loại
              </button>
              <button 
                onClick={() => setFilterRanked('ranked')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterRanked === 'ranked' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Xếp Hạng
              </button>
              <button 
                onClick={() => setFilterRanked('casual')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filterRanked === 'casual' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Thường
              </button>
            </div>
          </div>
        </div>

        {/* Room Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <Users size={64} className="mb-4 opacity-20" />
              <p className="text-base font-bold text-slate-500 dark:text-slate-400">Không tìm thấy phòng phù hợp với bộ lọc.</p>
              <p className="text-xs text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc tạo phòng mới.</p>
              <Link to="/create-room" className="mt-4 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md">
                Tạo phòng ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map(room => {
                const playerCount = Object.keys(room.players || {}).length;
                const isFull = playerCount >= room.maxPlayers;
                
                let ModeIcon = Activity;
                if (room.mode === 'fill_blank') ModeIcon = Play;
                if (room.mode === 'compound_name') ModeIcon = Trophy;

                const modeLabels: Record<string, string> = {
                  balance: 'Cân bằng PT',
                  fill_blank: 'Điền khuyết',
                  compound_name: 'Gọi tên hợp chất',
                  element_quiz: 'Đoán nguyên tố',
                  mixed: 'Hỗn hợp',
                  oxidation_state: 'Số Oxi Hóa',
                };

                return (
                  <div key={room.id} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-100 dark:bg-slate-800 transition-all group flex flex-col shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-900 flex items-center justify-center border border-slate-300 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-colors">
                          <ModeIcon size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-200 text-sm flex items-center gap-2">
                            {modeLabels[room.mode] || room.mode}
                            {room.isRanked && (
                              <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">Ranked</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono font-semibold">ID: #{room.id}</div>
                        </div>
                      </div>
                      <div className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase ${
                        room.difficulty === 'easy' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' :
                        room.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}>
                        {room.difficulty}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex -space-x-2">
                        {Object.values(room.players || {}).slice(0, 3).map((p: any, i) => (
                          <img key={i} src={p.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'} className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800" alt="player" />
                        ))}
                        {playerCount > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-900 dark:text-white font-bold">
                            +{playerCount - 3}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {playerCount} / {room.maxPlayers} người
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate(`/room/${room.id}`)}
                      disabled={isFull}
                      className={`w-full py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        isFull 
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
                          : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-md shadow-cyan-500/10'
                      }`}
                    >
                      {isFull ? 'PHÒNG ĐẦY' : 'THAM GIA NGAY'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
