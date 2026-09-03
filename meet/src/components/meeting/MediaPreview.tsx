import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import { clsx } from 'clsx';

interface MediaPreviewProps {
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  userName: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  stream,
  audioEnabled,
  videoEnabled,
  userName,
  onToggleAudio,
  onToggleVideo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoEnabled]);

  const initialLetter = userName ? userName.trim().charAt(0).toUpperCase() : '?';

  return (
    <div className="relative w-full aspect-video bg-[#202124] rounded-2xl overflow-hidden shadow-2xl border border-gray-700/80 flex items-center justify-center">
      {videoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-4xl font-bold shadow-2xl border-2 border-blue-400/40 mb-3">
            {initialLetter}
          </div>
          <span className="text-gray-300 font-medium">{userName || 'Xem trước thiết bị'}</span>
        </div>
      )}

      {/* Floating Media Toggle Controls */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-xl z-10">
        <button
          onClick={onToggleAudio}
          className={clsx(
            'p-3.5 rounded-full transition-all duration-150',
            audioEnabled
              ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          )}
          title={audioEnabled ? 'Tắt micro' : 'Bật micro'}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleVideo}
          className={clsx(
            'p-3.5 rounded-full transition-all duration-150',
            videoEnabled
              ? 'bg-[#3c4043] hover:bg-[#4a4e51] text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          )}
          title={videoEnabled ? 'Tắt camera' : 'Bật camera'}
        >
          {videoEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
