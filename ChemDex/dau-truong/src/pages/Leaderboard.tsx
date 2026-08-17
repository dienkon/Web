import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Trophy, Star, Flame, Crown, Award, Medal, ChevronDown, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore, calculateRank } from '../store/useAuthStore';
import { renderTitleBadge } from '../utils/titleStyles';

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const { profile } = useAuthStore();

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        // Optimize read limit to 10 on first load
        const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        
        const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ensure at least 3 players exist for the podium view
        while (data.length < 3) {
          data.push({
            id: `player-${data.length}`,
            displayName: `Hóa thủ ${data.length + 1}`,
            photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=player${data.length}`,
            xp: 0,
            rank: 'Electron Tự Do',
            totalMatches: 0,
            winCount: 0,
          });
        }
        
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        }
        setHasMore(snapshot.docs.length === 10);
        setUsers(data);
      } catch (error) {
        console.error("Lỗi lấy BXH ban đầu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    try {
      setLoadingMore(true);
      const q = query(
        collection(db, 'users'), 
        orderBy('xp', 'desc'), 
        startAfter(lastDoc), 
        limit(10)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 10);
      setUsers(prev => [...prev, ...data]);
    } catch (err) {
      console.error("Lỗi tải thêm BXH:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col space-y-6 px-4 sm:px-6 pb-12 min-w-0">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center justify-center gap-3">
          <Trophy className="text-amber-500 dark:text-yellow-400 w-8 h-8 md:w-10 md:h-10 animate-bounce" />
          <span>Bảng Vàng Hóa Học</span>
          <Trophy className="text-amber-500 dark:text-yellow-400 w-8 h-8 md:w-10 md:h-10 animate-bounce" />
        </h1>
  
      </div>

      {/* Top 3 Podium Cards */}
      {!loading && top3.length > 0 && (
        <div className="flex justify-center items-end gap-3 md:gap-8 mb-4 mt-6 min-h-[280px]">
          {/* Top 2 - Silver */}
          {top3[1] && (
            <div className="flex flex-col items-center z-0 transform transition-all hover:scale-105 duration-300">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.2 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  <img src={top3[1].photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=2'} alt="Top 2" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-300 shadow-lg bg-slate-100 dark:bg-slate-900" />
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-900 text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow whitespace-nowrap">
                    Top 2
                  </div>
                </div>
                <div className="text-slate-900 dark:text-white font-bold text-sm md:text-base mb-0.5 truncate w-24 md:w-28 text-center">{top3[1].displayName}</div>
                {top3[1].equippedTitle && (
                  <div className="mb-1.5 flex justify-center scale-90">
                    {renderTitleBadge(top3[1].equippedTitle, 'sm')}
                  </div>
                )}
                <div className="text-cyan-600 dark:text-cyan-400 font-black text-xs md:text-sm mb-2 font-mono">{(top3[1].xp || 0).toLocaleString()} XP</div>
              </motion.div>
              <motion.div 
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.8, ease: "easeOut" }}
                className="w-20 md:w-28 h-24 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-700/60 dark:to-slate-800/40 rounded-t-xl border-t-4 border-slate-300 flex items-center justify-center origin-bottom"
              >
                <Medal className="text-slate-500 dark:text-slate-400 opacity-60" size={32} />
              </motion.div>
            </div>
          )}

          {/* Top 1 - Gold Champion */}
          {top3[0] && (
            <div className="flex flex-col items-center z-10 transform transition-all hover:scale-105 duration-300">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="flex flex-col items-center"
              >
                <Crown className="text-amber-400 w-10 h-10 md:w-12 md:h-12 mb-1 animate-bounce drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
                <div className="relative mb-3">
                  <img src={top3[0].photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=1'} alt="Top 1" className="w-22 h-22 md:w-28 md:h-28 rounded-full border-4 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] bg-slate-100 dark:bg-slate-900" />
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap">
                    Top 1 Quán Quân
                  </div>
                </div>
                <div className="text-slate-900 dark:text-white font-black text-base md:text-xl mb-0.5 truncate w-32 md:w-40 text-center">{top3[0].displayName}</div>
                {top3[0].equippedTitle && (
                  <div className="mb-1.5 flex justify-center">
                    {renderTitleBadge(top3[0].equippedTitle, 'sm')}
                  </div>
                )}
                <div className="text-amber-500 dark:text-yellow-400 font-black text-base md:text-xl mb-3 font-mono">{(top3[0].xp || 0).toLocaleString()} XP</div>
              </motion.div>
              <motion.div 
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0, ease: "easeOut" }}
                className="w-28 md:w-36 h-36 bg-gradient-to-t from-amber-400/30 to-amber-100/40 dark:from-yellow-500/30 dark:to-slate-800/60 rounded-t-xl border-t-4 border-amber-400 flex items-center justify-center origin-bottom"
              >
                <Trophy className="text-amber-500 opacity-80 animate-pulse" size={48} />
              </motion.div>
            </div>
          )}

          {/* Top 3 - Bronze */}
          {top3[2] && (
            <div className="flex flex-col items-center z-0 transform transition-all hover:scale-105 duration-300">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 2.0 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  <img src={top3[2].photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=3'} alt="Top 3" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-amber-600 shadow-lg bg-slate-100 dark:bg-slate-900" />
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-600 text-slate-900 dark:text-white text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow whitespace-nowrap">
                    Top 3
                  </div>
                </div>
                <div className="text-slate-900 dark:text-white font-bold text-sm md:text-base mb-0.5 truncate w-24 md:w-28 text-center">{top3[2].displayName}</div>
                {top3[2].equippedTitle && (
                  <div className="mb-1.5 flex justify-center scale-90">
                    {renderTitleBadge(top3[2].equippedTitle, 'sm')}
                  </div>
                )}
                <div className="text-cyan-600 dark:text-cyan-400 font-black text-xs md:text-sm mb-2 font-mono">{(top3[2].xp || 0).toLocaleString()} XP</div>
              </motion.div>
              <motion.div 
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.6, ease: "easeOut" }}
                className="w-20 md:w-28 h-18 bg-gradient-to-t from-amber-100 to-amber-50 dark:from-amber-800/40 dark:to-slate-800/40 rounded-t-xl border-t-4 border-amber-600 flex items-center justify-center origin-bottom"
              >
                <Award className="text-amber-700 opacity-60" size={28} />
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard List Table */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-2xl p-4 sm:p-6 w-full min-w-0">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-48 space-y-3">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Đang tải bảng xếp hạng ChemArena...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {rest.map((userItem, index) => {
                const rankIndex = index + 4;
                const isMe = userItem.id === profile?.uid;
                
                const totalMatches = userItem.totalMatches || 0;
                const winRate = totalMatches > 0 ? Math.round(((userItem.winCount || 0) / totalMatches) * 100) : 0;

                return (
                  <motion.div 
                    key={userItem.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex items-center gap-3 md:gap-4 p-3.5 md:p-4 rounded-xl border transition-all ${
                      isMe 
                        ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-400 dark:border-cyan-500/50 shadow-md' 
                        : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-100/80 dark:bg-slate-800/80'
                    }`}
                  >
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-800 flex items-center justify-center font-black text-xs md:text-sm shrink-0 font-mono">
                      #{rankIndex}
                    </div>
                    
                    <img 
                      src={userItem.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'} 
                      alt={userItem.displayName} 
                      className={`w-10 h-10 md:w-11 md:h-11 rounded-full border bg-slate-100 dark:bg-slate-900 ${isMe ? 'border-cyan-500 border-2' : 'border-slate-300 dark:border-slate-700'}`} 
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm md:text-base flex items-center gap-1.5 truncate">
                        <span className="truncate">{userItem.displayName}</span>
                        {isMe && <span className="text-[9px] bg-cyan-500 text-slate-950 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0">Bạn</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-cyan-600 dark:text-cyan-400 tracking-wider uppercase font-semibold">{calculateRank(userItem.xp || 0)}</span>
                        {userItem.equippedTitle && renderTitleBadge(userItem.equippedTitle, 'sm')}
                      </div>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-6 px-4">
                       <div className="text-right flex flex-col items-center">
                          <Flame size={15} className="text-orange-500 mb-0.5" />
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Trận</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{totalMatches}</div>
                       </div>
                       <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                       <div className="text-right flex flex-col items-center">
                          <Trophy size={15} className="text-amber-500 dark:text-yellow-400 mb-0.5" />
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Tỷ lệ thắng</div>
                          <div className="font-bold text-cyan-600 dark:text-cyan-400 text-[11px]">{winRate}%</div>
                       </div>
                    </div>
                    
                    <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-700/50 shrink-0 min-w-[70px]">
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 justify-end font-bold uppercase tracking-wider">
                        XP <Star size={11} className="text-amber-500 dark:text-yellow-400 fill-amber-500 dark:fill-yellow-400" />
                      </div>
                      <div className="font-black text-sm md:text-base text-cyan-600 dark:text-cyan-400 font-mono">
                        {(userItem.xp || 0).toLocaleString()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>ĐANG TẢI THÊM...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      <span>XEM THÊM ĐẤU SĨ</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
