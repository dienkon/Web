import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, ArrowRight, GraduationCap, Copy, Check, Mic, MonitorUp, Sparkles, Hand, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useMeetingStore } from '../store/meetingStore';
import { createRoom } from '../services/api';
import { saveHostToken } from '../services/identity';
import { showNotice } from '../components/ui/Dialogs';
import { parseRoomCode } from '../services/roomCode';
import { ToastContainer } from '../components/ui/Toast';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setRoomInfo, addToast } = useMeetingStore();
  const [inputCode, setInputCode] = useState('');

  // Created Room Modal State
  const [createdRoom, setCreatedRoom] = useState<{ id: string; code: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [creating, setCreating] = useState(false);
  const handleCreateRoom = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { id, code, hostToken } = await createRoom();
      saveHostToken(code, hostToken);
      const link = `${window.location.origin}/join/${code}`;
      setRoomInfo(id, code, true);
      setCreatedRoom({ id, code, link });
    } catch {
      showNotice('Không thể tạo phòng', 'Không kết nối được máy chủ. Vui lòng thử lại sau.');
    } finally { setCreating(false); }
  };

  // Join by Input Code
  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = parseRoomCode(inputCode);
    if (!clean) { addToast('Nhập mã phòng hợp lệ hoặc liên kết mời MeetClass.', 'warning'); return; }
    setRoomInfo(`ROOM-${clean}`, clean, false);
    navigate(`/join/${clean}`);
  };

  const copyLink = () => {
    if (!createdRoom) return;
    navigator.clipboard.writeText(createdRoom.link).then(() => {
      setCopied(true);
      addToast('Đã sao chép liên kết phòng học', 'success');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => addToast('Không sao chép được liên kết. Hãy chọn và sao chép trong ô bên dưới.', 'warning'));
  };

  const startCreatedRoom = () => {
    if (!createdRoom) return;
    navigate(`/join/${createdRoom.code}`);
  };

  return (
    <div className="home-shell min-h-screen text-gray-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <ToastContainer />
      {/* Top Navbar */}
      <nav className="h-20 border-b border-gray-800/60 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Meet<span className="text-blue-500">Class</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
          <span className="hidden sm:inline-flex items-center gap-2 text-blue-200"><Sparkles size={14} /> Không gian cho những ý tưởng lớn</span>
        </div>
      </nav>

      {/* Hero Body Section */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-12 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center flex-1">
        <div className="space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-blue-200 bg-blue-400/10 border border-blue-300/15"><span className="h-1.5 w-1.5 bg-blue-300 rounded-full" /> Học cùng nhau. Tiến xa hơn.</span>
            <h1 className="text-4xl sm:text-6xl font-semibold text-white tracking-tight leading-[1.12]">
              Kết nối gần hơn.<br /><span className="text-blue-300">Ý tưởng xa hơn.</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg font-normal leading-relaxed">
              Một không gian để gặp gỡ, chia sẻ màn hình và cùng học. Bật micro, mở cuộc trò chuyện và để mọi ý tưởng được lắng nghe.
            </p>
          </div>

          {/* Action Buttons & Room Code Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateRoom} disabled={creating}
              className="gap-2 font-semibold shadow-xl shadow-blue-900/40 shrink-0"
            >
              <Plus className="w-5 h-5" />
              Tạo cuộc họp
            </Button>

            <form onSubmit={handleJoin} className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                placeholder="Nhập mã phòng hoặc link..."
                aria-label="Mã phòng hoặc liên kết mời"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                icon={<Video className="w-4 h-4" />}
                className="bg-[#202124] border-gray-700 py-3"
              />
              <Button
                type="submit"
                aria-label="Tham gia bằng mã hoặc liên kết"
                variant="dark"
                size="lg"
                disabled={!inputCode.trim()}
                className="px-5 py-3 shrink-0"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </form>
          </div>

          {/* Feature Badges */}
          <div className="border-t border-gray-800/80 pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Mic className="text-blue-300 mb-3" size={19} /><span className="text-sm font-medium text-slate-200 block">Nghe rõ từng ý</span>
              <p className="text-xs text-gray-400 leading-relaxed">Chọn micro, thử loa và lọc tiếng ồn.</p>
            </div>
            <div className="space-y-1">
              <MonitorUp className="text-emerald-300 mb-3" size={19} /><span className="text-sm font-medium text-slate-200 block">Chia sẻ góc nhìn</span>
              <p className="text-xs text-gray-400 leading-relaxed">Trình chiếu tài liệu và tiếng của tab.</p>
            </div>
            <div className="space-y-1 hidden sm:block">
              <Hand className="text-amber-300 mb-3" size={19} /><span className="text-sm font-medium text-slate-200 block">Ai cũng góp lời</span>
              <p className="text-xs text-gray-400 leading-relaxed">Giơ tay và trả lời A/B/C/D trực tiếp.</p>
            </div>
          </div>
        </div>

        {/* Recent / Demo Visual Card */}
        <div className="relative">
          <div className="bg-gradient-to-br from-[#25344a] to-[#182231] rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-5 lg:rotate-1">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-semibold text-gray-200">Một buổi học nhiều cảm hứng</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800">
                Minh họa
              </span>
            </div>

            <div className="relative overflow-hidden min-h-56 rounded-2xl bg-[#c8d8f0] p-7 sm:p-9 flex flex-col justify-between text-slate-900">
              <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">Không gian của những ý tưởng</span>
              <p className="text-3xl sm:text-4xl tracking-tight font-semibold leading-tight max-w-64 my-6">Một câu hỏi.<br />Nhiều góc nhìn.</p>
              <span className="flex items-center gap-2 text-xs text-slate-600"><MessageSquare size={15} /> Cùng chia sẻ điều bạn nghĩ</span>
              <div className="absolute -right-12 -bottom-10 w-48 h-48 rounded-full border-[30px] border-blue-400/30" />
            </div>
            <div className="space-y-3 bg-[#121212]/80 p-4 rounded-2xl border border-gray-800">
              <span className="text-xs font-medium text-gray-300">Mỗi lựa chọn đều bắt đầu một cuộc thảo luận</span>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl text-center font-black text-blue-400">A</div>
                <div className="p-3 bg-emerald-600 text-white font-black rounded-xl text-center shadow-lg">B</div>
                <div className="p-3 bg-amber-600/20 border border-amber-500/40 rounded-xl text-center font-black text-amber-400">C</div>
                <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-xl text-center font-black text-purple-400">D</div>
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/join/DEMO88')}
              className="w-full justify-between"
            >
              <span>Khám phá phòng dùng thử</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Created Room Modal (Section 5) */}
      <Modal
        isOpen={Boolean(createdRoom)}
        onClose={() => setCreatedRoom(null)}
        title="Phòng học đã được tạo"
      >
        {createdRoom && (
          <div className="space-y-5">
            <div className="space-y-2 bg-[#121212] p-4 rounded-xl border border-gray-800">
              <span className="text-xs font-medium text-gray-400 block">Mã phòng:</span>
              <div className="text-2xl font-black tracking-widest text-blue-400 font-mono">
                {createdRoom.code}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-400 block">Đường dẫn tham gia:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdRoom.link}
                  className="flex-1 bg-[#121212] text-xs text-gray-300 px-3 py-2 rounded-lg border border-gray-800 focus:outline-none"
                />
                <Button variant="dark" size="sm" onClick={copyLink} className="gap-1 text-xs shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Đã chép' : 'Copy link'}
                </Button>
              </div>
            </div>

            <Button variant="primary" size="lg" onClick={startCreatedRoom} className="w-full gap-2">
              Bắt đầu phòng <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Modal>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-800/60 text-center text-xs text-gray-500">
        MeetClass &copy; 2026 · Kết nối để cùng tiến xa
      </footer>
    </div>
  );
};
