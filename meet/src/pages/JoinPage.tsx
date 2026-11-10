import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MediaPreview } from '../components/meeting/MediaPreview';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useMeetingStore } from '../store/meetingStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { User, LogIn, ArrowLeft, GraduationCap } from 'lucide-react';
import { DeviceSettings, MicMeter } from '../components/meeting/DeviceSettings';
import { getHostToken } from '../services/identity';
import { ToastContainer } from '../components/ui/Toast';

export const JoinPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const roomCode = (code || 'CLASSROOM').toUpperCase();
  const roomId = `ROOM-${roomCode}`;

  const { userName, setUserName, setRoomInfo } = useMeetingStore();
  const [nameInput, setNameInput] = useState(
    userName || (typeof localStorage !== 'undefined' ? localStorage.getItem('meetclass_user_name') || '' : '')
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>();

  const {
    localStream,
    initLocalStream,
    toggleAudio,
    toggleVideo,
    audioEnabled,
    videoEnabled,
    changeDevice,
    stopAllMedia,
  } = useWebRTC();

  useEffect(() => {
    clearTimeout(releaseTimer.current);
    // Initialize stream preview on mount
    initLocalStream();
    return () => {
      releaseTimer.current = setTimeout(() => {
        if (!window.location.pathname.startsWith('/meeting/')) stopAllMedia();
      }, 0);
    };
  }, [initLocalStream, stopAllMedia]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = nameInput.trim() || 'Học sinh';
    setUserName(finalName);
    try {
      localStorage.setItem('meetclass_user_name', finalName);
    } catch {}
    setRoomInfo(roomId, roomCode, !!getHostToken(roomCode));

    navigate(`/meeting/${roomCode}`);
  };

  return (
    <div className="home-shell min-h-screen text-gray-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="h-20 border-b border-gray-800/60 px-6 sm:px-12 flex items-center justify-between">
        <button
          onClick={() => { stopAllMedia(); navigate('/'); }}
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Trang chủ
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-bold text-white tracking-tight">
            Meet<span className="text-blue-500">Class</span>
          </span>
        </div>
      </header>

      {/* Main Join Container */}
      <main className="max-w-4xl mx-auto px-6 py-8 w-full flex-1 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left: Camera Preview */}
        <div className="w-full lg:w-1/2">
          <MediaPreview
            stream={localStream}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            userName={nameInput}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
          />
          <div className="mt-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-4">
            <MicMeter />
            <button type="button" onClick={() => setSettingsOpen(true)} className="text-sm text-blue-300 hover:text-blue-200">Chọn micro, camera & kiểm tra loa →</button>
          </div>
        </div>

        {/* Right: User Details Form */}
        <div className="w-full lg:w-1/2 max-w-md bg-[#202124] p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
              Tham gia phòng {roomCode}
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Sẵn sàng kết nối?</h2>
            <p className="text-xs text-gray-400">
              Kiểm tra camera và micro trước khi bước vào phòng học.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-5">
            <Input
              label="Tên hiển thị của bạn trong phòng học"
              placeholder="Nguyễn Văn A"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 font-semibold text-base py-3 shadow-xl shadow-blue-900/30"
            >
              <LogIn className="w-5 h-5" /> Tham gia phòng
            </Button>
          </form>
        </div>
      </main>
      <DeviceSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onChangeDevice={changeDevice} />
      <ToastContainer />

      {/* Footer */}
      <footer className="py-6 border-t border-gray-800/60 text-center text-xs text-gray-500">
        MeetClass &copy; 2026 · Một chút chuẩn bị, cuộc trò chuyện trọn vẹn
      </footer>
    </div>
  );
};
