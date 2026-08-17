import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Activity, Trophy, Crosshair, Star, Edit3, Check, Award, Target, Flame, BarChart3, LineChart as LineChartIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { renderTitleBadge } from '../utils/titleStyles';

interface ModeStat {
  modeName: string;
  key: string;
  matches: number;
  accuracy: number;
  totalScore: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  isUnlocked: boolean;
  progressText: string;
}

const getAchievements = (prof: any, stats: ModeStat[], overallAccuracy: number): Achievement[] => {
  const balanceStat = stats.find(s => s.key === 'balance');
  const nomenclatureStat = stats.find(s => s.key === 'compound_name');

  return [
    {
      id: 'first_reaction',
      title: 'Khơi Đầu Phản Ứng',
      description: 'Tôi luyện bản thân qua ít nhất 20 trận thi đấu thực tế tại đấu trường học thuật.',
      icon: '🧪',
      color: 'from-blue-500 to-indigo-500',
      isUnlocked: !!(prof && (prof.totalMatches || 0) >= 20),
      progressText: `${Math.min(prof?.totalMatches || 0, 20)}/20 trận`
    },
    {
      id: 'chain_reaction',
      title: 'Chất Kích Hoạt',
      description: 'Khẳng định bản lĩnh vượt trội bằng cách giành chiến thắng tối thiểu 40 trận đấu.',
      icon: '⚡',
      color: 'from-amber-500 to-orange-500',
      isUnlocked: !!(prof && (prof.winCount || 0) >= 40),
      progressText: `${prof?.winCount || 0}/40 trận`
    },
    {
      id: 'stable_nucleus',
      title: 'Hạt Nhân Siêu Bền',
      description: 'Bền bỉ tôi luyện bản thân vững vàng qua 100 trận đấu rực lửa.',
      icon: '⚛️',
      color: 'from-emerald-500 to-teal-500',
      isUnlocked: !!(prof && (prof.totalMatches || 0) >= 100),
      progressText: `${prof?.totalMatches || 0}/100 trận`
    },
    {
      id: 'activation_energy',
      title: 'Bão Nhiệt Hạch',
      description: 'Tích lũy đạt mốc cực khủng 25,000 XP để khởi động chuỗi bão phản ứng hạt nhân.',
      icon: '🔥',
      color: 'from-purple-500 to-pink-500',
      isUnlocked: !!(prof && (prof.xp || 0) >= 25000),
      progressText: `${(prof?.xp || 0).toLocaleString()}/25,000 XP`
    },
    {
      id: 'catalyst_master',
      title: 'Xúc Tác Tuyệt Đối',
      description: 'Đạt tỉ lệ chính xác xuất sắc >= 95% qua tối thiểu 30 trận đấu sòng phẳng.',
      icon: '💎',
      color: 'from-cyan-500 to-blue-500',
      isUnlocked: overallAccuracy >= 95 && !!(prof && (prof.totalMatches || 0) >= 30),
      progressText: `${overallAccuracy}%/95% (${prof?.totalMatches || 0}/30 trận)`
    },
    {
      id: 'balance_master',
      title: 'Thần Cân Bằng',
      description: 'Đạt độ chính xác hoàn hảo >= 96% trong ít nhất 20 trận "Cân bằng phương trình".',
      icon: '⚖️',
      color: 'from-rose-500 to-pink-600',
      isUnlocked: !!(balanceStat && balanceStat.accuracy >= 96 && balanceStat.matches >= 20),
      progressText: `${balanceStat?.matches || 0}/20 trận`
    },
    {
      id: 'nomenclature_expert',
      title: 'Đại Pháp Sư IUPAC',
      description: 'Đạt độ chính xác hoàn hảo >= 96% trong ít nhất 20 trận "Gọi tên hợp chất".',
      icon: '🔮',
      color: 'from-violet-500 to-purple-600',
      isUnlocked: !!(nomenclatureStat && nomenclatureStat.accuracy >= 96 && nomenclatureStat.matches >= 20),
      progressText: `${nomenclatureStat?.matches || 0}/20 trận`
    },
    {
      id: 'great_alchemist',
      title: 'Triết Nhân Giả Kim',
      description: 'Đạt mốc truyền thuyết tối thượng với lượng tích lũy đạt 50,000 XP.',
      icon: '👑',
      color: 'from-yellow-400 via-amber-500 to-rose-500',
      isUnlocked: !!(prof && (prof.xp || 0) >= 50000),
      progressText: `${(prof?.xp || 0).toLocaleString()}/50,000 XP`
    }
  ];
};

export default function Profile() {
  const { profile, user, updateProfileName, updateEquippedTitle } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || '');
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [modeStats, setModeStats] = useState<ModeStat[]>([
    { modeName: 'Cân bằng', key: 'balance', matches: 0, accuracy: 0, totalScore: 0 },
    { modeName: 'Điền khuyết', key: 'fill_blank', matches: 0, accuracy: 0, totalScore: 0 },
    { modeName: 'Gọi tên', key: 'compound_name', matches: 0, accuracy: 0, totalScore: 0 },
    { modeName: 'Đoán NT', key: 'element_quiz', matches: 0, accuracy: 0, totalScore: 0 },
    { modeName: 'Hỗn hợp', key: 'mixed', matches: 0, accuracy: 0, totalScore: 0 },
    { modeName: 'Số Oxi Hóa', key: 'oxidation_state', matches: 0, accuracy: 0, totalScore: 0 },
  ]);

  const [recentTrend, setRecentTrend] = useState<{ match: string; accuracy: number; score: number }[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState<number>(0);

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchAnalytics = async () => {
      try {
        setLoadingStats(true);
        const matchesRef = collection(db, 'users', profile.uid, 'matches');
        const q = query(matchesRef);
        const snapshot = await getDocs(q);

        const modeMap: Record<string, { matches: number; sumAccuracy: number; totalScore: number }> = {
          balance: { matches: 0, sumAccuracy: 0, totalScore: 0 },
          fill_blank: { matches: 0, sumAccuracy: 0, totalScore: 0 },
          compound_name: { matches: 0, sumAccuracy: 0, totalScore: 0 },
          element_quiz: { matches: 0, sumAccuracy: 0, totalScore: 0 },
          mixed: { matches: 0, sumAccuracy: 0, totalScore: 0 },
          oxidation_state: { matches: 0, sumAccuracy: 0, totalScore: 0 },
        };

        const docs: any[] = [];
        let grandSumAccuracy = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          docs.push({ id: docSnap.id, ...data, date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date() });
          
          const mKey = data.mode || 'balance';
          const acc = data.accuracy || 0;
          grandSumAccuracy += acc;

          if (modeMap[mKey]) {
            modeMap[mKey].matches += 1;
            modeMap[mKey].sumAccuracy += acc;
            modeMap[mKey].totalScore += (data.score || 0);
          }
        });

        // Compute overall accuracy
        const totalDocs = snapshot.size;
        setOverallAccuracy(totalDocs > 0 ? Math.round(grandSumAccuracy / totalDocs) : 0);

        // Map mode bar chart data
        const updatedModes: ModeStat[] = [
          { modeName: 'Cân bằng', key: 'balance', matches: modeMap.balance.matches, accuracy: modeMap.balance.matches > 0 ? Math.round(modeMap.balance.sumAccuracy / modeMap.balance.matches) : 0, totalScore: modeMap.balance.totalScore },
          { modeName: 'Điền khuyết', key: 'fill_blank', matches: modeMap.fill_blank.matches, accuracy: modeMap.fill_blank.matches > 0 ? Math.round(modeMap.fill_blank.sumAccuracy / modeMap.fill_blank.matches) : 0, totalScore: modeMap.fill_blank.totalScore },
          { modeName: 'Gọi tên IUPAC', key: 'compound_name', matches: modeMap.compound_name.matches, accuracy: modeMap.compound_name.matches > 0 ? Math.round(modeMap.compound_name.sumAccuracy / modeMap.compound_name.matches) : 0, totalScore: modeMap.compound_name.totalScore },
          { modeName: 'Đoán NT', key: 'element_quiz', matches: modeMap.element_quiz.matches, accuracy: modeMap.element_quiz.matches > 0 ? Math.round(modeMap.element_quiz.sumAccuracy / modeMap.element_quiz.matches) : 0, totalScore: modeMap.element_quiz.totalScore },
          { modeName: 'Hỗn hợp', key: 'mixed', matches: modeMap.mixed.matches, accuracy: modeMap.mixed.matches > 0 ? Math.round(modeMap.mixed.sumAccuracy / modeMap.mixed.matches) : 0, totalScore: modeMap.mixed.totalScore },
          { modeName: 'Số Oxi Hóa', key: 'oxidation_state', matches: modeMap.oxidation_state.matches, accuracy: modeMap.oxidation_state.matches > 0 ? Math.round(modeMap.oxidation_state.sumAccuracy / modeMap.oxidation_state.matches) : 0, totalScore: modeMap.oxidation_state.totalScore },
        ];

        setModeStats(updatedModes);

        // Sort docs chronologically for line chart trend (last 10 matches)
        docs.sort((a, b) => a.date.getTime() - b.date.getTime());
        const last10 = docs.slice(-10).map((d, i) => ({
          match: `T${i + 1}`,
          accuracy: d.accuracy || 0,
          score: d.score || 0,
        }));

        setRecentTrend(last10);
      } catch (err) {
        console.error("Lỗi lấy thống kê analytics:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchAnalytics();
  }, [profile?.uid]);

  if (!profile) return null;

  const winRate = profile.totalMatches ? Math.round((profile.winCount / profile.totalMatches) * 100) : 0;
  const isBenchmarkMet = overallAccuracy >= 75;

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    const trimmed = newName.trim().slice(0, 15);
    await updateProfileName(trimmed);
    setIsEditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          <div className="relative">
            <img src={profile.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-[#0F172A]" />
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-600 w-10 h-10 rounded-full border-4 border-white dark:border-[#0F172A] flex items-center justify-center">
              <Star className="text-slate-900 dark:text-white w-4 h-4" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            {isEditing ? (
              <div className="flex items-center gap-2 mb-2 max-w-xs justify-center md:justify-start">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.slice(0, 15))}
                  maxLength={15}
                  className="bg-slate-100 dark:bg-slate-800 border border-cyan-400 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold text-lg w-full focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-2 bg-cyan-500 text-slate-900 rounded-lg font-bold hover:bg-cyan-400 shrink-0 cursor-pointer"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">{profile.displayName}</h1>
                <button
                  onClick={() => {
                    setNewName(profile.displayName);
                    setIsEditing(true);
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-colors p-1 cursor-pointer"
                  title="Sửa tên"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            )}

            <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">{user?.email}</p>
            
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Rank PvP:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">{profile.rank}</span>
              </div>

              {profile.equippedTitle && (
                <div className="inline-flex items-center gap-1">
                  {renderTitleBadge(profile.equippedTitle, 'md')}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl text-center min-w-[200px]">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Tổng Điểm XP</div>
            <div className="text-4xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              {(profile.xp || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tổng Trận Đấu</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Activity size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{profile.totalMatches || 0}</div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Đã hoàn thành</span>
        </div>
        
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Trận Thắng PvP</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Trophy size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{profile.winCount || 0}</div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Tỉ lệ thắng: <strong>{winRate}%</strong></span>
        </div>

        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tỉ Lệ Chính Xác</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Target size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{overallAccuracy}%</div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Trung bình toàn bộ trận</span>
        </div>

        {/* IUPAC Standard Benchmark Card */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between shadow-xl ${
          isBenchmarkMet 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest">Tiêu Chuẩn IUPAC</span>
            {isBenchmarkMet ? <CheckCircle2 className="text-emerald-500" size={20} /> : <AlertCircle className="text-amber-500" size={20} />}
          </div>
          <div className="text-xl font-black uppercase">
            {isBenchmarkMet ? 'Đạt Chuẩn (>75%)' : 'Chưa Đạt (<75%)'}
          </div>
          <p className="text-[11px] opacity-80 mt-2">
            {isBenchmarkMet 
              ? 'Kiến thức danh pháp và phản ứng đạt trình độ Hóa Học Gia!' 
              : 'Hãy luyện tập thêm để nâng tỉ lệ chính xác lên trên 75%!'}
          </p>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Radar Chart: Skill Balance (Mạng nhện) */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-2xl flex flex-col min-w-0 w-full overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm md:text-base">Biểu Đồ Mạng Nhện</h3>
              <p className="text-xs text-slate-500">Phân tích đa chiều năng lực Hóa Học (%)</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="48%" data={modeStats.map(ms => ({ subject: ms.modeName, accuracy: ms.accuracy }))}>
                <PolarGrid stroke="#64748b" opacity={0.25} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 8 }} />
                <Radar name="Độ chính xác" dataKey="accuracy" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, 'Chính xác']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Accuracy by Game Mode */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-2xl flex flex-col min-w-0 w-full overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-500 shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm md:text-base">Độ Chính Xác Theo Chủ Đề</h3>
              <p className="text-xs text-slate-500">So sánh tỉ lệ trả lời đúng (%) ở 6 dạng bài</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modeStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="modeName" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, 'Độ chính xác']}
                />
                <Bar dataKey="accuracy" name="Tỉ lệ đúng (%)" fill="#22d3ee" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart: Accuracy Trend over Recent Matches */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-2xl flex flex-col col-span-1 lg:col-span-2 xl:col-span-1 min-w-0 w-full overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500 shrink-0">
              <LineChartIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm md:text-base">Phong Độ Gần Đây</h3>
              <p className="text-xs text-slate-500">Diễn biến độ chính xác (%) qua 10 trận đấu</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {recentTrend.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
                Chưa đủ dữ liệu trận đấu để vẽ biểu đồ phong độ.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="match" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(val: any) => [`${val}%`, 'Chính xác']}
                  />
                  <Line type="monotone" dataKey="accuracy" name="Độ chính xác (%)" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Academic Achievements & Special Titles (Danh hiệu đặc biệt) */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
            <Star size={20} className="fill-amber-500/10 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm md:text-base">Danh Hiệu Học Thuật & Thành Tích Đặc Biệt</h3>
            <p className="text-xs text-slate-500">Mở khóa các huy hiệu tôn vinh năng lực nghiên cứu Hóa học thực chiến của bạn</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {getAchievements(profile, modeStats, overallAccuracy).map((ach) => (
            <div
              key={ach.id}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 flex flex-col justify-between ${
                ach.isUnlocked
                  ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 shadow-md hover:-translate-y-0.5'
                  : 'bg-slate-50/20 dark:bg-slate-900/10 border-slate-200/50 dark:border-slate-900/50 opacity-55'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`text-2xl p-2 rounded-xl bg-gradient-to-br ${ach.isUnlocked ? ach.color + ' text-slate-900 dark:text-white' : 'from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 opacity-60'} flex items-center justify-center w-11 h-11 shrink-0 shadow`}>
                    {ach.icon}
                  </span>
                  {ach.isUnlocked ? (
                    <span className="bg-emerald-500 text-slate-900 dark:text-white p-0.5 rounded-full text-[10px] font-bold">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">
                      KHÓA
                    </span>
                  )}
                </div>
                <h4 className={`font-black text-xs sm:text-sm uppercase tracking-tight ${ach.isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-600'}`}>
                  {ach.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1 mb-3">
                  {ach.description}
                </p>
              </div>

              <div className="mt-2 mb-3">
                {ach.isUnlocked ? (
                  profile.equippedTitle === ach.title ? (
                    <button
                      disabled
                      className="w-full py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider"
                    >
                      ĐANG TRANG BỊ
                    </button>
                  ) : (
                    <button
                      onClick={() => updateEquippedTitle(ach.title)}
                      className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer shadow transition-all"
                    >
                      TRANG BỊ DANH HIỆU
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full py-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 dark:text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider"
                  >
                    CHƯA ĐẠT ĐIỀU KIỆN
                  </button>
                )}
              </div>

              <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center text-[10px] font-semibold font-mono">
                <span className="text-slate-500 dark:text-slate-400 uppercase">Tiến trình</span>
                <span className={ach.isUnlocked ? 'text-cyan-500' : 'text-slate-500'}>{ach.progressText}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Topic Skill Table */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-2xl">
        <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-base mb-4 flex items-center gap-2">
          <Award size={18} className="text-cyan-500" />
          <span>Chi Tiết Năng Lực Theo Chủ Đề Hóa Học</span>
        </h3>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="pb-3 font-bold">Chủ Đề Hóa Học</th>
                <th className="pb-3 font-bold text-center">Số Trận Played</th>
                <th className="pb-3 font-bold text-center">Tỉ Lệ Đúng (%)</th>
                <th className="pb-3 font-bold text-right">Tổng Điểm Tích Lũy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {modeStats.map((ms) => (
                <tr key={ms.key} className="hover:bg-slate-50 dark:hover:bg-slate-100/40 dark:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900 dark:text-slate-200">{ms.modeName}</td>
                  <td className="py-3.5 text-center text-slate-600 dark:text-slate-400">{ms.matches}</td>
                  <td className="py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                      ms.accuracy >= 75 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                        : ms.accuracy >= 50 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}>
                      {ms.accuracy}%
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                    {ms.totalScore.toLocaleString()} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
