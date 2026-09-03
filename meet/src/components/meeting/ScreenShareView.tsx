import React, { useRef, useEffect } from 'react';
import { Monitor, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface ScreenShareViewProps {
  stream: MediaStream;
  presenterName: string;
  isSelf?: boolean;
  onStopShare?: () => void;
}

export const ScreenShareView: React.FC<ScreenShareViewProps> = ({
  stream,
  presenterName,
  isSelf = false,
  onStopShare,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-[#121212] rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Presentation Header Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white text-xs sm:text-sm font-medium shadow-lg">
          <Monitor className="w-4 h-4 text-blue-400" />
          <span>{presenterName} đang trình chiếu</span>
        </div>

        {isSelf && onStopShare && (
          <div className="pointer-events-auto">
            <Button
              variant="danger"
              size="sm"
              onClick={onStopShare}
              className="gap-1.5 shadow-lg"
            >
              <X className="w-4 h-4" />
              Dừng trình chiếu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
