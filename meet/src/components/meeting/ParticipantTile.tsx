import React, { useRef, useEffect } from 'react';
import { Participant } from '../../types/meeting';
import { Mic, MicOff, Crown, Pin, PinOff } from 'lucide-react';
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

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream, participant.videoEnabled]);

  // Extract initial letter for avatar
  const initialLetter = participant.name ? participant.name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div
      className={clsx(
        'relative w-full h-full bg-[#202124] rounded-2xl overflow-hidden shadow-lg border transition-all duration-200 group flex items-center justify-center select-none',
        isActiveSpeaker
          ? 'border-emerald-500 ring-2 ring-emerald-500/80 shadow-emerald-950/40'
          : 'border-gray-800 hover:border-gray-700'
      )}
    >
      {/* Video Element or Avatar Fallback */}
      {participant.videoEnabled && participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={clsx('w-full h-full object-cover', isLocal && 'scale-x-[-1]')}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold shadow-xl border-2 border-blue-400/30">
            {initialLetter}
          </div>
        </div>
      )}

      {/* Top Controls: Host badge & Pin button */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {participant.isHost && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/90 text-gray-950 font-bold text-xs rounded-full shadow-md backdrop-blur-xs">
              <Crown className="w-3 h-3 fill-current" />
              Teacher
            </span>
          )}
        </div>

        <button
          onClick={() => setPinnedParticipant(participant.id)}
          className={clsx(
            'p-2 rounded-full backdrop-blur-md transition-all pointer-events-auto opacity-0 group-hover:opacity-100',
            isPinned
              ? 'bg-blue-600 text-white opacity-100'
              : 'bg-black/40 text-gray-200 hover:bg-black/70 hover:text-white'
          )}
          title={isPinned ? 'Bỏ ghim' : 'Ghim video'}
        >
          {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Name & Mic status tag */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full max-w-[85%] border border-white/10 shadow-md">
          <span className="text-xs sm:text-sm font-medium text-white truncate">
            {participant.name} {isLocal && '(Bạn)'}
          </span>
        </div>

        <div
          className={clsx(
            'p-1.5 rounded-full shadow-md backdrop-blur-md border border-white/10',
            participant.audioEnabled ? 'bg-black/60 text-white' : 'bg-red-600/90 text-white'
          )}
        >
          {participant.audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};
