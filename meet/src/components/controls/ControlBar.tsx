import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  Users,
  GraduationCap,
  PhoneOff,
  MoreVertical,
} from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { Tooltip } from '../ui/Tooltip';
import { clsx } from 'clsx';

interface ControlBarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onOpenHostModal?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  participantCount,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  onOpenHostModal,
}) => {
  const { activePanel, setActivePanel, isHost } = useMeetingStore();

  return (
    <div className="h-20 bg-[#121212]/95 backdrop-blur-md border-t border-gray-800/80 px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left Info spacer */}
      <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-400">
        <span>MeetClass</span>
      </div>

      {/* Main Centered Controls Pill */}
      <div className="flex items-center gap-2 sm:gap-3 bg-[#202124] p-2 rounded-full border border-gray-700/80 shadow-2xl mx-auto md:mx-0">
        {/* Microphone */}
        <Tooltip content={audioEnabled ? 'Tắt micro' : 'Bật micro'}>
          <button
            onClick={onToggleAudio}
            className={clsx(
              'p-3 rounded-full transition-all duration-150',
              audioEnabled
                ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            )}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        </Tooltip>

        {/* Camera */}
        <Tooltip content={videoEnabled ? 'Tắt camera' : 'Bật camera'}>
          <button
            onClick={onToggleVideo}
            className={clsx(
              'p-3 rounded-full transition-all duration-150',
              videoEnabled
                ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            )}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </Tooltip>

        {/* Screen Share */}
        <Tooltip content={isScreenSharing ? 'Dừng trình chiếu' : 'Trình chiếu màn hình'}>
          <button
            onClick={onToggleScreenShare}
            className={clsx(
              'p-3 rounded-full transition-all duration-150',
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
            )}
          >
            <Monitor className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* Classroom Interactive Mode Panel */}
        <Tooltip content="Chế độ Lớp học (A/B/C/D)">
          <button
            onClick={() => setActivePanel('classroom')}
            className={clsx(
              'p-3 rounded-full transition-all duration-150 relative',
              activePanel === 'classroom'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
            )}
          >
            <GraduationCap className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* Chat Panel */}
        <Tooltip content="Trò chuyện">
          <button
            onClick={() => setActivePanel('chat')}
            className={clsx(
              'p-3 rounded-full transition-all duration-150',
              activePanel === 'chat'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
            )}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* Participants Panel */}
        <Tooltip content="Người tham gia">
          <button
            onClick={() => setActivePanel('participants')}
            className={clsx(
              'p-3 rounded-full transition-all duration-150 relative',
              activePanel === 'participants'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
            )}
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-blue-500 text-[10px] font-bold text-white rounded-full">
              {participantCount}
            </span>
          </button>
        </Tooltip>

        {/* Host controls modal trigger */}
        {isHost && onOpenHostModal && (
          <Tooltip content="Quản lý phòng (Host)">
            <button
              onClick={onOpenHostModal}
              className="p-3 bg-[#3c4043] hover:bg-[#4a4e51] text-white rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </Tooltip>
        )}

        {/* Leave Meeting */}
        <Tooltip content="Rời khỏi cuộc họp">
          <button
            onClick={onLeave}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors ml-1"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>

      {/* Right spacer */}
      <div className="hidden md:block w-20"></div>
    </div>
  );
};
