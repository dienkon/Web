import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, ArrowRight, GraduationCap, Copy, Check, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useMeetingStore } from '../store/meetingStore';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setRoomInfo, addToast } = useMeetingStore();
  const [inputCode, setInputCode] = useState('');

  // Created Room Modal State
  const [createdRoom, setCreatedRoom] = useState<{ id: string; code: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper to generate room code like 8F42K
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create Room
  const handleCreateRoom = () => {
    const code = generateRoomCode();
    const roomId = `ROOM-${code}`;
    const link = `${window.location.origin}/join/${code}`;

    setRoomInfo(roomId, code, true); // Mark as Host
    setCreatedRoom({ id: roomId, code, link });
  };

  // Join by Input Code
  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim().toUpperCase().replace(/^ROOM-/, '');
    if (!clean) return;

    navigate(`/join/${clean}`);
  };

  const copyLink = () => {
    if (!createdRoom) return;
    navigator.clipboard.writeText(createdRoom.link).then(() => {
      setCopied(true);
      addToast('Đã sao chép liên kết phòng học', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const startCreatedRoom = () => {
    if (!createdRoom) return;
    navigate(`/join/${createdRoom.code}`);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
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
          <span className="hidden sm:inline-block">Phòng Học Tương Tác Trực Tuyến</span>
        </div>
      </nav>

      {/* Hero Body Section */}
      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center flex-1">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Cuộc họp video & lớp học tương tác dành cho giáo viên
            </h1>
            <p className="text-gray-400 text-base sm:text-lg font-normal leading-relaxed">
              Trải nghiệm họp truyền hình chất lượng cao như Google Meet, kết hợp hệ thống câu hỏi trắc nghiệm <strong className="text-blue-400 font-semibold">A / B / C / D</strong> thời gian thực vượt trội.
            </p>
          </div>

          {/* Action Buttons & Room Code Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateRoom}
              className="gap-2 font-semibold shadow-xl shadow-blue-900/40 shrink-0"
            >
              <Plus className="w-5 h-5" />
              Tạo phòng học
            </Button>

            <form onSubmit={handleJoin} className="flex items-center gap-2 flex-1 min-w-[260px]">
              <Input
                placeholder="Nhập mã phòng hoặc link..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                icon={<Video className="w-4 h-4" />}
                className="bg-[#202124] border-gray-700 py-3"
              />
              <Button
                type="submit"
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
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">WebRTC Realtime</span>
              <p className="text-xs text-gray-400">Video HD & Audio độ trễ cực thấp</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Teaching Mode</span>
              <p className="text-xs text-gray-400">Bộ nút A/B/C/D tương tác tức thì</p>
            </div>
            <div className="space-y-1 hidden sm:block">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Thống kê Live</span>
              <p className="text-xs text-gray-400">Biểu đồ câu trả lời cho giáo viên</p>
            </div>
          </div>
        </div>

        {/* Recent / Demo Visual Card */}
        <div className="relative">
          <div className="bg-gradient-to-br from-[#202124] to-[#1a1b1e] rounded-3xl p-6 border border-gray-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-gray-200">Phòng học thử nghiệm</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800">
                Sẵn sàng
              </span>
            </div>

            {/* Simulated Answer Bar Visual */}
            <div className="space-y-3 bg-[#121212]/80 p-4 rounded-2xl border border-gray-800">
              <span className="text-xs font-bold text-gray-300">Minh họa Chế độ Trả lời A/B/C/D:</span>
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
              <span>Tham gia phòng Demo nhanh (CODE: DEMO88)</span>
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
        MeetClass &copy; 2026 - Interactive Google Meet Clone
      </footer>
    </div>
  );
};
