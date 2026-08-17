import React, { useState, useEffect } from 'react';
import { 
  Volume2, Monitor, Shield, LogOut, Sun, Moon, 
  BookOpen, Sliders, Bug, Upload, Trash2, CheckCircle, 
  AlertTriangle, Type, Zap, Smartphone, RefreshCw 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { updateBGMState, playClickSound } from '../utils/audio';
import { useRoomStore } from '../store/useRoomStore';

export default function Settings() {
  const { profile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  // Load functional settings with real persistence in localStorage
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('arena_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      sound: true,
      soundVolume: 80,
      music: true,
      musicVolume: 50,
      showRank: true,
      defaultDifficulty: 'random',
      defaultMaxPlayers: 4,
      defaultRounds: 5,
      reduceMotion: false,
      notifications: true,
      lowLatency: false,
      fontSize: 'md',
      hapticVibration: true,
    };
  });

  const updateSetting = (key: string, value: any) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem('arena_settings', JSON.stringify(next));
    
    // Instantly trigger BGM change or sound effect feedback
    updateBGMState();
    if (key === 'sound' || key === 'soundVolume' || key === 'music' || key === 'musicVolume') {
      playClickSound();
    }
  };

  const handleLogout = async () => {
    try {
      const roomState = useRoomStore.getState();
      if (roomState.roomId && profile?.uid) {
        await roomState.leaveRoom(profile.uid);
      }
    } catch (e) {
      console.warn("Error exiting room on logout:", e);
    }
    await auth.signOut();
    navigate('/login');
  };

  // Bug Reporting State
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugEmail, setBugEmail] = useState(profile?.email || '');
  const [bugImage, setBugImage] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Sync email on profile load
  useEffect(() => {
    if (profile?.email && !bugEmail) {
      setBugEmail(profile.email);
    }
  }, [profile, bugEmail]);

  // Image upload helpers
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setReportError("Chỉ chấp nhận các file định dạng hình ảnh (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setReportError("Dung lượng ảnh minh chứng phải nhỏ hơn 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setBugImage(reader.result as string);
      setReportError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDesc.trim()) {
      setReportError("Vui lòng điền đầy đủ tiêu đề và nội dung chi tiết lỗi.");
      return;
    }
    setReporting(true);
    setReportError(null);
    setReportSuccess(false);

    try {
      const res = await fetch("/api/report-bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bugTitle,
          description: bugDesc,
          userEmail: bugEmail || profile?.displayName || "Khách / Ẩn danh",
          image: bugImage
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gửi báo cáo lỗi thất bại.");
      }

      setReportSuccess(true);
      setBugTitle('');
      setBugDesc('');
      setBugImage(null);
    } catch (err: any) {
      setReportError(err.message || "Đã xảy ra sự cố kết nối máy chủ Discord.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
          Cấu Hình Hệ Thống
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Tùy chỉnh cá nhân hóa giao diện, âm thanh học thuật, thông báo và báo cáo lỗi trong ChemArena.
        </p>
      </div>

      <div className="flex-1 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-y-auto shadow-2xl p-4 sm:p-6 md:p-8 space-y-8 custom-scrollbar">
        
        {/* Section 1: UI Theme */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Monitor size={18} className="text-cyan-500" />
            <span>Chủ Đề & Giao Diện (Theme Mode)</span>
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base">Chế độ hiển thị màn hình</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lựa chọn giữa giao diện tối huyền bí bảo vệ mắt hoặc giao diện sáng tinh tế.
              </div>
            </div>
            <button 
              onClick={toggleTheme}
              className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0 self-start sm:self-auto ${
                theme === 'light' 
                  ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' 
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'light' ? 'Chuyển Sang Tối' : 'Chuyển Sang Sáng'}</span>
            </button>
          </div>
        </section>

        {/* Section 2: Chemistry Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <BookOpen size={18} className="text-purple-500" />
            <span>Tùy Chọn Học Thuật (Chemistry Specs)</span>
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
            {/* Default Difficulty */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Độ khó mặc định khi tạo phòng</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Độ khó tự động điền sẵn khi bạn khởi tạo phòng đấu hoặc luyện tập mới.
                </div>
              </div>
              <select
                value={settings.defaultDifficulty}
                onChange={(e) => updateSetting('defaultDifficulty', e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer w-full sm:w-48 animate-none"
              >
                <option value="easy">Dễ (Thích hợp Sơ Cấp)</option>
                <option value="medium">Trung Bình (Thích hợp Trung Cấp)</option>
                <option value="hard">Khó (Thích hợp Cao Thủ)</option>
                <option value="random">Ngẫu Nhiên (Đa dạng)</option>
              </select>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80"></div>

            {/* Default Max Players */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Số người chơi mặc định khi tạo phòng</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Số lượng đấu sĩ tham gia tối đa trong một phòng thi đấu PvP được định cấu hình sẵn.
                </div>
              </div>
              <select
                value={settings.defaultMaxPlayers || 4}
                onChange={(e) => updateSetting('defaultMaxPlayers', Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer w-full sm:w-48 animate-none"
              >
                {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(num => (
                  <option key={num} value={num}>{num} Đấu sĩ</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80"></div>

            {/* Default Rounds */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Số màn chơi mặc định</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Số lượng câu hỏi/màn chơi mặc định khi tạo phòng đấu PvP hoặc bắt đầu luyện tập.
                </div>
              </div>
              <select
                value={settings.defaultRounds || 5}
                onChange={(e) => updateSetting('defaultRounds', Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer w-full sm:w-48 animate-none"
              >
                {[1, 3, 5, 7, 10, 12, 15].map(num => (
                  <option key={num} value={num}>{num} Màn chơi</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Audio Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Volume2 size={18} className="text-amber-500" />
            <span>Âm Thanh & Phản Hồi Sinh Động</span>
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-6">
            
            {/* SFX sound */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Hiệu ứng âm thanh (SFX)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Phát tiếng bíp phản hồi khi trả lời đúng, sai hoặc đếm ngược thời gian.
                  </div>
                </div>
                <button 
                  onClick={() => updateSetting('sound', !settings.sound)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${settings.sound ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.sound ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              {settings.sound && (
                <div className="flex items-center gap-4 pl-4 py-2 border-l-2 border-cyan-500/30">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-12 text-right">Mức: {settings.soundVolume}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.soundVolume}
                    onChange={(e) => updateSetting('soundVolume', Number(e.target.value))}
                    className="flex-1 accent-cyan-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer animate-none"
                  />
                </div>
              )}
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80"></div>

            {/* Background Music */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Nhạc nền sảnh chờ (Lobby BGM)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Phát giai điệu lo-fi thư giãn, tập trung khi đang ngồi chờ trong phòng.
                  </div>
                </div>
                <button 
                  onClick={() => updateSetting('music', !settings.music)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${settings.music ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.music ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              {settings.music && (
                <div className="flex items-center gap-4 pl-4 py-2 border-l-2 border-cyan-500/30">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-12 text-right">Mức: {settings.musicVolume}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.musicVolume}
                    onChange={(e) => updateSetting('musicVolume', Number(e.target.value))}
                    className="flex-1 accent-cyan-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer animate-none"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Experience & Performance Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sliders size={18} className="text-emerald-500" />
            <span>Trải Nghiệm & Tối Ưu Hiệu Năng</span>
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
            
            {/* Reduce motion */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Giảm tải chuyển động (Reduce Motion)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tắt bớt các hiệu ứng bay, trồi, nhấp nháy phức tạp để tối ưu hiệu năng thiết bị cấu hình yếu.
                </div>
              </div>
              <button 
                onClick={() => updateSetting('reduceMotion', !settings.reduceMotion)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${settings.reduceMotion ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.reduceMotion ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80"></div>

            {/* Show opponent rank */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Công khai cấp bậc Rank của bạn</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cho phép đối thủ hoặc đồng đội xem danh hiệu Rank thực sự của bạn trong phòng thi đấu PvP.
                </div>
              </div>
              <button 
                onClick={() => updateSetting('showRank', !settings.showRank)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${settings.showRank ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showRank ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80"></div>

            {/* OPTIMIZATION 1: Question Font Size */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex gap-2.5 items-start">
                <Type size={18} className="text-cyan-500 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Kích cỡ chữ câu hỏi</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Điều chỉnh kích thước font chữ hiển thị đề thi, giúp tăng tính trực quan trên mọi kích cỡ màn hình.
                  </div>
                </div>
              </div>
              <select
                value={settings.fontSize || 'md'}
                onChange={(e) => updateSetting('fontSize', e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer w-full sm:w-48 animate-none"
              >
                <option value="sm">Nhỏ (14px)</option>
                <option value="md">Tiêu Chuẩn (16px)</option>
                <option value="lg">Lớn (18px)</option>
                <option value="xl">Rất Lớn (20px)</option>
              </select>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80"></div>

            {/* OPTIMIZATION 2: Haptic Vibration */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2.5 items-start">
                <Smartphone size={18} className="text-emerald-500 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Phản hồi rung vật lý (Haptic Feedback)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Rung nhẹ thiết bị khi trả lời sai hoặc khi trận đấu chuẩn bị bắt đầu (hỗ trợ tốt trên mobile).
                  </div>
                </div>
              </div>
              <button 
                onClick={() => updateSetting('hapticVibration', !settings.hapticVibration)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${settings.hapticVibration ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.hapticVibration ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800/80"></div>

            {/* OPTIMIZATION 3: Low Latency Mode */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2.5 items-start">
                <Zap size={18} className="text-amber-500 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Chế độ đồng bộ độ trễ thấp</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Giảm tối đa tần suất render nền để tăng độ nhạy và tiết kiệm pin của thiết bị di động.
                  </div>
                </div>
              </div>
              <button 
                onClick={() => updateSetting('lowLatency', !settings.lowLatency)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${settings.lowLatency ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.lowLatency ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Technical Bug Reporting */}
        <section className="space-y-4" id="report-bug-section">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Bug size={18} className="text-rose-500" />
            <span>Báo cáo lỗi kỹ thuật & Đóng góp ý kiến</span>
          </h3>
          
          <form onSubmit={handleReportSubmit} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn gặp sự cố, lỗi game hoặc tràn bố cục? Hãy mô tả chi tiết kèm theo ảnh chụp màn hình minh chứng. Hệ thống sẽ đóng gói và chuyển tiếp trực tiếp đến đội ngũ phát triển qua Discord Webhook.
            </p>

            {reportSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle size={18} className="shrink-0" />
                <span>Báo cáo của bạn đã được gửi đi thành công tới kênh Discord! Xin cảm ơn sự giúp đỡ của bạn.</span>
              </div>
            )}

            {reportError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0" />
                <span>Lỗi: {reportError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Tiêu đề sự cố / Lỗi <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Không tải được câu hỏi từ AI" 
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                />
              </div>

              {/* Sender Email Info */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Email phản hồi (Hoặc tên đấu sĩ)
                </label>
                <input 
                  type="text" 
                  placeholder="Email của bạn để chúng tôi phản hồi..." 
                  value={bugEmail}
                  onChange={(e) => setBugEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                />
              </div>
            </div>

            {/* Description textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mô tả chi tiết sự cố <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Vui lòng cung cấp các bước dẫn đến lỗi này và mô tả những gì xảy ra trên màn hình của bạn..."
                value={bugDesc}
                onChange={(e) => setBugDesc(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm resize-none"
              ></textarea>
            </div>

            {/* Image Upload Area with Drag and Drop */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Ảnh minh chứng lỗi (Không bắt buộc - Giới hạn 2MB)
              </label>

              {!bugImage ? (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    dragActive 
                      ? 'border-cyan-500 bg-cyan-500/10' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-cyan-500/60 hover:bg-slate-100/50 dark:hover:bg-slate-100/20 dark:bg-slate-800/20'
                  }`}
                  onClick={() => document.getElementById('bug-screenshot-upload')?.click()}
                >
                  <Upload size={24} className="text-slate-500 dark:text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Kéo thả ảnh chụp màn hình vào đây hoặc <span className="text-cyan-500 hover:underline">nhấp để duyệt file</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">PNG, JPG, WEBP dung lượng tối đa 2MB</p>
                  <input 
                    id="bug-screenshot-upload"
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img 
                      src={bugImage} 
                      alt="Bug attachment preview" 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-800 shrink-0" 
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">screenshot_attached.png</p>
                      <p className="text-[10px] text-emerald-500">Đã nén & sẵn sàng gửi đính kèm</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setBugImage(null)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={reporting}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs md:text-sm font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {reporting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>ĐANG GỬI BÁO CÁO...</span>
                  </>
                ) : (
                  <>
                    <Bug size={14} />
                    <span>GỬI BÁO CÁO QUA WEBHOOK DISCORD</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Section 6: Security & Dangerous Area */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Shield size={18} className="text-rose-500" />
            <span>Khu Vực Bảo Mật & Tài Khoản (Danger Zone)</span>
          </h3>
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="font-bold text-rose-500 text-sm md:text-base">Đăng xuất tài khoản ChemArena</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Thoát tài khoản đấu sĩ hiện tại khỏi thiết bị này. Bạn có thể đăng nhập lại bất cứ lúc nào.
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs md:text-sm font-extrabold rounded-xl border border-rose-500/20 transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <LogOut size={16} />
              <span>ĐĂNG XUẤT NGAY</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
