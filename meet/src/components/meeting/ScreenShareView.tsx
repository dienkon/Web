import React, { useRef, useEffect } from 'react';
import { Monitor, X, PictureInPicture2, Maximize2, RotateCw, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { useMeetingStore } from '../../store/meetingStore';
import { clsx } from 'clsx';

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
  const { isMobileLandscape, toggleMobileLandscape } = useMeetingStore();

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

  const handleToggleOrientation = async () => {
    try {
      const orientation = (screen as any).orientation;
      if (orientation && orientation.lock) {
        if (!document.fullscreenElement && containerRef.current) {
          await containerRef.current.requestFullscreen().catch(() => {});
        }
        if (isMobileLandscape) {
          await orientation.unlock?.().catch(() => {});
        } else {
          await orientation.lock?.('landscape').catch(() => {});
        }
      }
    } catch {
      // Ignored if orientation lock not supported
    }
    toggleMobileLandscape();
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative w-full h-full bg-[#121212] rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center shadow-2xl group transition-all',
        isMobileLandscape &&
          'fixed inset-0 z-50 rounded-none border-none bg-black flex items-center justify-center'
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={clsx(
          'w-full h-full object-contain transition-transform duration-300',
          isMobileLandscape && 'rotate-90 sm:rotate-0 w-[100vh] h-[100vw] sm:w-full sm:h-full max-w-none'
        )}
      />

      {/* Presentation Header Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white text-xs sm:text-sm font-medium shadow-lg">
          <Monitor className="w-4 h-4 text-blue-400" />
          <span>{presenterName} đang trình chiếu</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Rotate Landscape Button for Mobile */}
          <button
            onClick={handleToggleOrientation}
            className={clsx(
              'p-2 rounded-full transition-colors backdrop-blur-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
              isMobileLandscape
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-black/60 hover:bg-black/90 text-slate-200'
            )}
            title={isMobileLandscape ? 'Quay lại màn hình dọc' : 'Xoay ngang màn hình (Landscape)'}
            aria-label="Xoay hướng màn hình"
          >
            {isMobileLandscape ? <RotateCcw size={16} /> : <RotateCw size={16} />}
          </button>

          {document.pictureInPictureEnabled && (
            <button
              onClick={togglePip}
              className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-200 transition-colors backdrop-blur-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Hình trong hình (Picture-in-Picture)"
              aria-label="Hình trong hình"
            >
              <PictureInPicture2 size={16} />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-200 transition-colors backdrop-blur-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            title="Toàn màn hình trình chiếu"
            aria-label="Toàn màn hình"
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
