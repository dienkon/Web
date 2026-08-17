import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, calculateRank } from '../store/useAuthStore';
import { Trophy, Play, Users, Activity, Flame, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Dashboard() {
  const { profile } = useAuthStore();
  const [platformStats, setPlatformStats] = useState({ totalUsers: 0, totalMatches: 0 });
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [roomStats, setRoomStats] = useState({
    totalRooms: 0,
    totalPlayers: 0,
    byMode: {
      balance: 0,
      fill_blank: 0,
      compound_name: 0,
      element_quiz: 0,
      oxidation_state: 0,
    } as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to real-time rooms from Firestore
    const qRooms = query(collection(db, 'rooms'));
    const unsubscribeRooms = onSnapshot(qRooms, (snapshot) => {
      let activeRoomCount = 0;
      let activePlayerCount = 0;
      const modeCounts: Record<string, number> = {
        balance: 0,
        fill_blank: 0,
        compound_name: 0,
        element_quiz: 0,
        oxidation_state: 0,
      };

      snapshot.docs.forEach((docSnap) => {
        const room = docSnap.data();
        if (room.status === 'lobby' || room.status === 'preparing' || room.status?.startsWith('round')) {
          activeRoomCount++;
          const players = room.players ? Object.keys(room.players).length : 0;
          activePlayerCount += players;

          if (room.mode && modeCounts[room.mode] !== undefined) {
            modeCounts[room.mode]++;
          }
        }
      });

      setRoomStats({
        totalRooms: activeRoomCount,
        totalPlayers: activePlayerCount,
        byMode: modeCounts,
      });
    }, (err) => console.error("Realtime rooms error:", err));

    // 2. Fetch real top 5 users + total users count + total matches count
    const fetchPlatformData = async () => {
      try {
        const qUsers = query(collection(db, 'users'), orderBy('xp', 'desc'));
        const userSnap = await getDocs(qUsers);
        const list: any[] = [];
        userSnap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setTopUsers(list.slice(0, 5));

        const matchesSnap = await getDocs(collection(db, 'matches'));

        setPlatformStats({
          totalUsers: userSnap.size,
          totalMatches: matchesSnap.size,
        });
      } catch (e) {
        console.error("Platform data error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatformData();

    return () => unsubscribeRooms();
  }, []);

  const totalMatches = profile?.totalMatches || 0;
  const winRate = totalMatches > 0 ? Math.round(((profile?.winCount || 0) / totalMatches) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col space-y-8">
      {/* Top Banner & Quick Join */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative group overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl p-8 flex flex-col justify-end min-h-[220px] shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 group-hover:scale-[1.6] transition-transform duration-700 pointer-events-none">
            <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.45 13.5l-3-5.2c-.35-.61-1-1-1.7-1H9.25c-.7 0-1.35.39-1.7 1l-3 5.2c-.35.61-.35 1.39 0 2l3 5.2c.35.61 1 1 1.7 1h5.5c.7 0 1.35-.39 1.7-1l3-5.2c.35-.61.35-1.39 0-2z" />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="bg-white/20 backdrop-blur text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full text-white mb-4 inline-flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-300" /> Realtime Arena
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-2 text-white leading-tight uppercase">
              Chào mừng, {profile?.displayName }!
            </h2>
            <p className="text-blue-100 text-sm max-w-md leading-relaxed">
              Tranh tài kiến thức Hóa Học thực tế cùng cộng đồng. Đã có{' '}
              <strong className="text-amber-300 font-extrabold">{roomStats.totalPlayers}</strong> người chơi trực tuyến.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <Link
                to="/create-room"
                className="px-6 py-3 bg-white text-blue-900 rounded-xl font-extrabold shadow-xl hover:bg-slate-100 transition-all text-sm uppercase tracking-wider flex items-center gap-2"
              >
                <span>Tạo phòng đấu</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/practice"
                className="px-6 py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-900 dark:text-white rounded-xl font-extrabold border border-white/20 transition-all text-sm uppercase tracking-wider"
              >
                Luyện tập 
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Join Match Box */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Users className="text-cyan-600 dark:text-cyan-400" size={16} />
            Sảnh
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-cyan-500/40 flex items-center justify-center animate-[spin_4s_linear_infinite]"></div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-cyan-600 dark:text-cyan-400 text-lg">
                {roomStats.totalRooms}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-200">
                {roomStats.totalRooms > 0 ? `${roomStats.totalRooms} Phòng Đang Mở` : 'Chưa Có Phòng Nào'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {roomStats.totalPlayers > 0 ? `${roomStats.totalPlayers} người đang ở phòng` : 'Tạo phòng mới để chờ đối thủ'}
              </p>
            </div>
            <Link
              to="/join"
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wider text-center transition-all shadow-md block"
            >
              Vào danh sách phòng
            </Link>
          </div>
        </div>
      </section>

      {/* Main Stats & Games Grid */}
      <section className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="flex flex-col space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-cyan-600 dark:text-cyan-400" size={20} />
              <span>Chế Độ Chơi Trực Tuyến</span>
            </h3>
            <span className="text-xs font-bold px-3 py-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full border border-cyan-500/20">
              Dữ liệu thực tế
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/create-room"
              className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl hover:border-cyan-500 transition-all group cursor-pointer block shadow-sm"
            >
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all">
                <Activity size={24} />
              </div>
              <h4 className="font-bold text-base mb-1 text-slate-900 dark:text-slate-200">Cân bằng Hóa học</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Tìm hệ số cân bằng tối giản chuẩn xác.
              </p>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-cyan-600 dark:text-cyan-400">{roomStats.byMode.balance || 0} phòng</span>
              </div>
            </Link>

            <Link
              to="/create-room"
              className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl hover:border-blue-500 transition-all group cursor-pointer block shadow-sm"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-900 dark:hover:text-white transition-all">
                <Play size={24} />
              </div>
              <h4 className="font-bold text-base mb-1 text-slate-900 dark:text-slate-200">Điền khuyết phản ứng</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Điền chính xác công thức hợp chất còn thiếu.
              </p>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-blue-600 dark:text-blue-400">{roomStats.byMode.fill_blank || 0} phòng </span>

              </div>
            </Link>

            <Link
              to="/create-room"
              className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl hover:border-purple-500 transition-all group cursor-pointer block shadow-sm"
            >
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-900 dark:hover:text-white transition-all">
                <Trophy size={24} />
              </div>
              <h4 className="font-bold text-base mb-1 text-slate-900 dark:text-slate-200">Gọi tên hợp chất</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Sử dụng danh pháp IUPAC quốc tế chuẩn xác.
              </p>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-purple-600 dark:text-purple-400">{roomStats.byMode.compound_name || 0} phòng live</span>
              </div>
            </Link>
          </div>

          {/* User Real Profile Stats Banner */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src={profile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'}
                alt="Avatar"
                className="w-12 h-12 rounded-full border-2 border-cyan-500 bg-white dark:bg-slate-900"
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  Thành tích cá nhân: <span className="text-cyan-600 dark:text-cyan-400">{profile?.displayName}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 mt-1.5">
                  <span>Rank: <strong className="text-amber-500 uppercase">{profile?.rank || 'Electron Tự Do'}</strong></span>
                  <span>•</span>
                  <span>Thắng: <strong className="text-emerald-600">{profile?.winCount || 0} trận</strong></span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-[11px] font-black border border-amber-500/20 shadow-sm animate-pulse">
                    🔥 {profile?.activityStreak || 1} ngày
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tỉ lệ thắng</div>
                <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">{winRate}%</div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">XP</div>
                <div className="text-xl font-black text-amber-500 dark:text-yellow-400 font-mono">
                  {(profile?.xp || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Live Top 5 Leaderboard */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              BXH
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Top 5</span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-6">Đang tải xếp hạng...</div>
            ) : topUsers.length === 0 ? (
              <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-6">Chưa có dữ liệu xếp hạng</div>
            ) : (
              topUsers.map((u, idx) => {
                const isMe = u.id === profile?.uid;
                const topColors = [
                  'bg-amber-400 text-amber-950',
                  'bg-slate-300 text-slate-900',
                  'bg-amber-600 text-slate-900 dark:text-white',
                  'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                  'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                ];

                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                      isMe ? 'bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-500/40' : 'hover:bg-slate-50 dark:hover:bg-slate-100/40 dark:bg-slate-800/40'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${topColors[idx]}`}
                    >
                      {idx + 1}
                    </div>
                    <img
                      src={u.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'}
                      alt={u.displayName}
                      className="w-8 h-8 rounded-full border bg-white dark:bg-slate-900 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate flex items-center gap-1">
                        {u.displayName || 'Hóa thủ'}
                        {isMe && <span className="text-[9px] bg-cyan-500 text-slate-900 px-1 rounded font-black">BẠN</span>}
                      </p>
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">{calculateRank(u.xp || 0)}</p>
                    </div>
                    <span className="text-xs font-black font-mono text-cyan-600 dark:text-cyan-400 shrink-0">
                      {(u.xp || 0).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <Link
              to="/leaderboard"
              className="block w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl text-xs font-extrabold shadow-md text-center transition-colors uppercase tracking-wider"
            >
              Xem BXH Đầy Đủ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
