import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Trophy, XCircle, Loader2, PlayCircle, Flame, Eye, X, CheckCircle, BarChart3, Award, Star, Medal } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import ChemText, { formatBalancedEquation } from '../components/common/ChemText';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, CartesianGrid } from 'recharts';

interface RoundDetail {
  roundNumber: number;
  equation: string;
  acceptedAnswers: string[];
  answers: number[];
  explanation: string;
  userAnswer: string;
  isCorrect?: boolean;
}

interface PlayerResult {
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
  placement: number;
}

interface RealMatchRecord {
  id: string;
  userId: string;
  mode: string;
  placement: number;
  totalPlayers: number;
  score: number;
  isWin: boolean;
  isSolo?: boolean;
  accuracy: number;
  earnedXp: number;
  rounds?: RoundDetail[];
  playersResult?: PlayerResult[];
  createdAt: any;
}

export default function History() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<RealMatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<RealMatchRecord | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      try {
        setLoading(true);
        const matchesRef = collection(db, 'users', profile.uid, 'matches');
        const q = query(
          matchesRef
        );
        const querySnapshot = await getDocs(q);
        const docsList: RealMatchRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          docsList.push({
            id: docSnap.id,
            userId: data.userId,
            mode: data.mode || 'balance',
            placement: data.placement || 1,
            totalPlayers: data.totalPlayers || 1,
            score: data.score || 0,
            isWin: !!data.isWin,
            isSolo: !!data.isSolo,
            accuracy: data.accuracy || 0,
            earnedXp: data.earnedXp || 0,
            rounds: data.rounds || [],
            playersResult: data.playersResult || [],
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
          });
        });

        docsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setMatches(docsList);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [profile?.uid]);

  // Exclude Solo training from public win rate & stats calculations
  const nonSoloMatches = matches.filter(m => !m.isSolo);
  const totalMatches = nonSoloMatches.length;
  const wins = nonSoloMatches.filter(m => m.isWin).length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const highScore = nonSoloMatches.length > 0 ? Math.max(...nonSoloMatches.map(m => m.score)) : 0;

  const displayedMatches = matches.slice(0, visibleCount);
  const hasMore = matches.length > visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  const getAnswerLabel = (mode: string) => {
    switch (mode) {
      case 'balance':
        return 'Hệ số cân bằng đúng:';
      case 'fill_blank':
        return 'Chất cần điền đúng:';
      case 'compound_name':
        return 'Tên gọi IUPAC đúng:';
      case 'element_quiz':
        return 'Ký hiệu/Tên nguyên tố đúng:';
      case 'oxidation_state':
        return 'Số oxi hóa đúng:';
      default:
        return 'Đáp án chính xác:';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col space-y-6 px-4 sm:px-6 pb-12 min-w-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Lịch Sử Đấu Thực Tế</h1>
          <p className="text-slate-600 dark:text-slate-400">Xem lại chi tiết kết quả và đáp án từng vòng ở mỗi trận thi đấu.</p>
        </div>
        <button
          onClick={() => navigate('/practice')}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer w-full sm:w-auto justify-center shrink-0"
        >
          <PlayCircle size={20} />
          <span>Vào Trận Solo</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col shadow-2xl">
        {/* Real Stats Bar (Excluding Solo) */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap gap-8 justify-between items-center">
          <div className="flex gap-8 flex-wrap">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Tổng trận PvP</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{totalMatches}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Tỉ lệ thắng PvP (Top 1)</div>
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{winRate}%</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Điểm cao nhất PvP</div>
              <div className="text-2xl font-black text-amber-500 dark:text-yellow-400">{highScore.toLocaleString()}</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
            * Các trận Đấu Luyện (Solo) không tính vào tỉ lệ thắng và tổng trận PvP của hệ thống.
          </div>
        </div>

        {/* History List (Natural flow for smooth scroll on mobile) */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="animate-spin text-cyan-500 mb-3" size={36} />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Đang tải lịch sử đấu...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-4 border border-slate-200 dark:border-slate-700">
                <Flame size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Chưa Có Trận Đấu Nào</h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
                Bạn chưa tham gia trận đấu solo hay phòng thi đấu nào. Hãy chơi ngay để lưu lịch sử đấu thực tế!
              </p>
              <button
                onClick={() => navigate('/practice')}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
              >
                Chơi Trận Solo Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        match.isWin
                          ? 'bg-amber-500/10 text-amber-500 dark:text-yellow-400 border border-amber-500/30'
                          : 'bg-slate-200 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {match.isWin ? <Trophy size={20} /> : <XCircle size={20} />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                          {getModeTitle(match.mode)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                            match.isSolo 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : (match.isWin ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300')
                          }`}
                        >
                          {match.isSolo ? 'Đấu Luyện (Solo)' : `Hạng ${match.placement}/${match.totalPlayers}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {match.createdAt.toLocaleDateString('vi-VN')} lúc{' '}
                        {match.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200 dark:border-slate-700/50 flex-wrap sm:flex-nowrap">
                    <div className="text-left sm:text-right">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Điểm số</div>
                      <div className={`text-lg font-black ${match.isWin ? 'text-emerald-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                        {match.score.toLocaleString()} đ
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Chính xác</div>
                      <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">{match.accuracy}%</div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Thưởng XP</div>
                      <div className="text-lg font-black text-amber-500 dark:text-yellow-400 font-mono">
                        +{match.earnedXp} XP
                      </div>
                    </div>

                    <button className="px-4 py-2 bg-white dark:bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-900 text-cyan-600 dark:text-cyan-400 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shrink-0 shadow-sm cursor-pointer ml-auto sm:ml-0">
                      <Eye size={14} />
                      <span>Chi tiết</span>
                    </button>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <span>XEM THÊM TRẬN ĐẤU</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Round Modal with leaderboard and chart analysis */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700/80 rounded-2xl w-full max-w-4xl my-8 flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/80 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3">
                  <span>Chi Tiết Trận: {getModeTitle(selectedMatch.mode)}</span>
                  <span className="text-xs bg-amber-500/10 text-amber-500 dark:text-yellow-400 border border-amber-500/20 px-2.5 py-1 rounded font-bold font-mono">
                    +{selectedMatch.earnedXp} XP
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Đã thi đấu ngày {selectedMatch.createdAt.toLocaleDateString('vi-VN')} lúc {selectedMatch.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar max-h-[70vh]">
              {/* Match ranking and chart layout (Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Leaderboard section */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Trophy size={16} className="text-amber-500" />
                    <span>Xếp Hạng Chung Cuộc Trận Đấu</span>
                  </h4>

                  <div className="space-y-2 flex-1">
                    {selectedMatch.playersResult && selectedMatch.playersResult.length > 0 ? (
                      selectedMatch.playersResult.map((p) => {
                        const isMe = p.uid === profile?.uid;
                        return (
                          <div
                            key={p.uid}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              isMe
                                ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500/50 shadow-sm'
                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-800 flex items-center justify-center font-black text-xs font-mono">
                                #{p.placement}
                              </div>
                              <img src={p.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`} alt={p.displayName} className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900" />
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[150px] flex items-center gap-1.5">
                                <span className="truncate">{p.displayName}</span>
                                {isMe && <span className="text-[8px] bg-cyan-500 text-slate-950 px-1 py-0.2 rounded font-black shrink-0 uppercase tracking-tighter">Bạn</span>}
                              </span>
                            </div>
                            <div className="font-black text-cyan-600 dark:text-cyan-400 text-xs font-mono shrink-0">
                              {p.score} đ
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-800 flex items-center justify-center font-black text-xs font-mono">
                            #{selectedMatch.placement}
                          </div>
                          <img src={profile?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'} alt={profile?.displayName} className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {profile?.displayName} (Bạn)
                          </span>
                        </div>
                        <div className="font-black text-cyan-600 dark:text-cyan-400 text-xs font-mono">
                          {selectedMatch.score} đ
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Chart analysis section */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-purple-500" />
                    <span>Biểu Đồ So Sánh Điểm Số Trận Đấu</span>
                  </h4>

                  <div className="h-44 w-full flex-1 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={
                          selectedMatch.playersResult && selectedMatch.playersResult.length > 0
                            ? selectedMatch.playersResult.map(p => ({ name: p.displayName, score: p.score, isMe: p.uid === profile?.uid }))
                            : [{ name: profile?.displayName || 'Bạn', score: selectedMatch.score, isMe: true }]
                        }
                        margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {(
                            selectedMatch.playersResult && selectedMatch.playersResult.length > 0
                              ? selectedMatch.playersResult
                              : [{ uid: profile?.uid }]
                          ).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.uid === profile?.uid ? '#22d3ee' : '#64748b'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 3. Detailed Rounds List */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span>Hành Trình Từng Vòng Đấu</span>
                  <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    Đúng: {selectedMatch.rounds?.filter(r => r.isCorrect).length || 0} / {selectedMatch.rounds?.length || 5} vòng
                  </span>
                </h4>

                {!selectedMatch.rounds || selectedMatch.rounds.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    Trận đấu này thuộc phiên bản cũ không lưu dữ liệu từng vòng.
                  </div>
                ) : (
                  selectedMatch.rounds.map((round) => {
                    let formattedAnswer = 'N/A';
                    if (round.equation && round.equation.includes('__') && round.answers && round.answers.length > 0) {
                      formattedAnswer = formatBalancedEquation(round.equation, round.answers);
                    } else if (selectedMatch.mode === 'balance' && round.answers && round.answers.length > 0) {
                      formattedAnswer = round.answers.join(' : ');
                    } else if (round.acceptedAnswers && round.acceptedAnswers.length > 0) {
                      formattedAnswer = round.acceptedAnswers.join(' / ');
                    } else if (round.answers && round.answers.length > 0) {
                      formattedAnswer = round.answers.join(' / ');
                    }

                    const isCorrect = !!round.isCorrect;

                    return (
                      <div
                        key={round.roundNumber}
                        className={`p-5 rounded-2xl border transition-all shadow-sm ${
                          isCorrect
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-red-500/5 border-red-500/20'
                        }`}
                      >
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-2 mb-3">
                          <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isCorrect ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            <span>Vòng {round.roundNumber}</span>
                            <span>•</span>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-white dark:bg-slate-950/80">
                              {isCorrect ? '✓ CHÍNH XÁC' : '✗ CHƯA ĐÚNG'}
                            </span>
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            Đã nộp: <strong className={isCorrect ? 'text-emerald-500' : 'text-red-500'}>{round.userAnswer}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Đề bài:</div>
                            <div className="text-base font-bold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                              <ChemText text={round.equation} />
                            </div>
                          </div>

                          <div>
                            <div className={`text-[10px] font-bold uppercase mb-1 tracking-wider ${
                              isCorrect ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {getAnswerLabel(selectedMatch.mode)}
                            </div>
                            <div className="text-base font-bold text-cyan-600 dark:text-cyan-300 font-mono bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                              <ChemText text={formattedAnswer} />
                            </div>
                          </div>
                        </div>

                        {round.explanation && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-500/5 dark:bg-slate-950/20 p-3 rounded-xl border border-amber-500/10 mt-3">
                            💡 <span className="font-bold text-amber-500">Giải thích:</span> {round.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ĐÓNG CHI TIẾT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getModeTitle(mode: string): string {
  switch (mode) {
    case 'balance': return 'Cân bằng phản ứng';
    case 'fill_blank': return 'Điền khuyết phản ứng';
    case 'compound_name': return 'Gọi tên chất';
    case 'element_quiz': return 'Đoán nguyên tố';
    case 'oxidation_state': return 'Số oxi hóa';
    default: return mode;
  }
}
