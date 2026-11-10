import React, { useRef, useEffect } from 'react';
import { Monitor, X, PictureInPicture2, Maximize2 } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const togglePip = () => {
    if (!videoRef.current || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      videoRef.current.requestPictureInPicture().catch(() => {});
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#121212] rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center shadow-2xl group"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Presentation Header Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white text-xs sm:text-sm font-medium shadow-lg">
          <Monitor className="w-4 h-4 text-blue-400" />
          <span>{presenterName} đang trình chiếu</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {document.pictureInPictureEnabled && (
            <button
              onClick={togglePip}
              className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-200 transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100"
              title="Hình trong hình (Picture-in-Picture)"
            >
              <PictureInPicture2 size={16} />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-200 transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100"
            title="Toàn màn hình trình chiếu"
          >
            <Maximize2 size={16} />
          </button>

          {isSelf && onStopShare && (
            <Button
              variant="danger"
              size="sm"
              onClick={onStopShare}
              className="gap-1.5 shadow-lg"
            >
              <X className="w-4 h-4" />
              Dừng trình chiếu
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
