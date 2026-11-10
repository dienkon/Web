import React, { useRef, useEffect } from 'react';
import { Participant } from '../../types/meeting';
import { Mic, MicOff, Crown, Pin, PinOff, Hand, PictureInPicture2, Wifi } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { clsx } from 'clsx';

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
  isPinned?: boolean;
  isActiveSpeaker?: boolean;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal = false,
  isPinned = false,
  isActiveSpeaker = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setPinnedParticipant } = useMeetingStore();

  const showVideo = Boolean(
    participant.videoEnabled &&
      participant.stream &&
      participant.stream.getVideoTracks().length > 0 &&
      participant.stream.getVideoTracks().some((t) => t.readyState === 'live')
  );

  // All tiles are muted; persistent audio elements handle sound independently of layout.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (participant.stream) {
      if (video.srcObject !== participant.stream) {
        video.srcObject = participant.stream;
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.debug('[ParticipantTile] play warning:', err?.message || err);
        });
      }
    } else {
      video.srcObject = null;
    }
  }, [participant.stream, participant.videoEnabled, showVideo]);

  // Extract initial letter for avatar
  const initialLetter = participant.name ? participant.name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div
      className={clsx(
        'relative w-full h-full bg-[#202124] rounded-2xl overflow-hidden shadow-lg border transition-all duration-200 group flex items-center justify-center select-none',
        isActiveSpeaker
          ? 'border-emerald-500 ring-4 ring-emerald-500/80 shadow-lg shadow-emerald-950/50'
          : 'border-gray-800 hover:border-gray-700'
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          videoRef.current?.play().catch(() => {});
        }}
        className={clsx(
          'w-full h-full object-cover transition-opacity duration-200',
          isLocal && 'scale-x-[-1]',
          !showVideo ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'
        )}
      />

      {/* Avatar Fallback when camera is disabled */}
      {!showVideo && (
        <div className="flex flex-col items-center justify-center p-6 text-center animate-fade-in z-0">
          <div
            className={clsx(
              'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold shadow-xl border-2 transition-all',
              isActiveSpeaker ? 'border-emerald-400 ring-4 ring-emerald-400/50 scale-105' : 'border-blue-400/30'
            )}
          >
            {initialLetter}
          </div>
        </div>
      )}

      {/* Top Controls: Host badge, Network Quality, PiP, Pin button */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 pointer-events-auto flex-wrap">
          {participant.isHost && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-gray-950 font-bold text-xs rounded-full shadow-md">
              <Crown className="w-3 h-3 fill-current" />
              Chủ phòng
            </span>
          )}

          {participant.handRaised && (
            <span className="bg-amber-300 text-slate-950 p-1.5 rounded-full shadow-md" title="Đang giơ tay">
              <Hand size={15} />
            </span>
          )}

          {participant.networkQuality && participant.networkQuality !== 'checking' && (
            <span
              className={clsx(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md shadow-md border border-white/10',
                participant.networkQuality === 'good'
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : participant.networkQuality === 'fair'
                  ? 'bg-amber-500/30 text-amber-300'
                  : 'bg-rose-500/30 text-rose-300'
              )}
              title={participant.latency ? `Độ trễ: ${participant.latency}ms` : undefined}
            >
              <Wifi className="w-2.5 h-2.5" />
              {participant.latency ? `${participant.latency}ms` : ''}
            </span>
          )}

          {participant.connectionState && ['connecting', 'disconnected', 'failed'].includes(participant.connectionState) && (
            <span className="text-xs bg-black/60 text-amber-200 px-2 py-1 rounded-full">
              {participant.connectionState === 'failed' ? 'Không kết nối được media' : 'Đang kết nối…'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {showVideo && (
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (document.pictureInPictureElement) {
                    document.exitPictureInPicture().catch(() => {});
                  } else {
                    videoRef.current.requestPictureInPicture().catch(() => {});
                  }
                }
              }}
              className="p-2 rounded-full backdrop-blur-md bg-black/50 text-gray-200 hover:bg-black/80 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              title="Hình trong hình (Picture-in-Picture)"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setPinnedParticipant(participant.id)}
            className={clsx(
              'p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100',
              isPinned
                ? 'bg-blue-600 text-white opacity-100'
                : 'bg-black/50 text-gray-200 hover:bg-black/80 hover:text-white'
            )}
            title={isPinned ? 'Bỏ ghim' : 'Ghim video'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Name & Mic status tag */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full max-w-[85%] border border-white/10 shadow-md">
          <span className="text-xs sm:text-sm font-medium text-white truncate">
            {participant.name} {isLocal && '(Bạn)'}
          </span>
        </div>

        <div
          className={clsx(
            'p-1.5 rounded-full shadow-md backdrop-blur-md border border-white/10 transition-colors',
            participant.audioEnabled
              ? isActiveSpeaker
                ? 'bg-emerald-500 text-white'
                : 'bg-black/70 text-white'
              : 'bg-red-600 text-white'
          )}
        >
          {participant.audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};
