import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Participant } from '../../types/meeting';
import { VolumeX } from 'lucide-react';

interface RemoteAudioContainerProps {
  participants: Participant[];
}

export const RemoteAudioContainer: React.FC<RemoteAudioContainerProps> = ({ participants }) => {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Filter participants that have streams
  const remoteStreams = participants.filter((p) => p.stream && p.id !== 'local_user');

  const playAllAudios = useCallback(() => {
    audioRefs.current.forEach((audioEl) => {
      if (audioEl) {
        audioEl
          .play()
          .then(() => setAudioBlocked(false))
          .catch((err) => {
            console.warn('[RemoteAudio] Autoplay blocked:', err);
            setAudioBlocked(true);
          });
      }
    });
  }, []);

  useEffect(() => {
    remoteStreams.forEach((p) => {
      const audioEl = audioRefs.current.get(p.id);
      if (audioEl && p.stream) {
        if (audioEl.srcObject !== p.stream) {
          audioEl.srcObject = p.stream;
        }
        audioEl
          .play()
          .then(() => {
            setAudioBlocked(false);
          })
          .catch((err) => {
            console.warn(`[RemoteAudio] Autoplay blocked for peer ${p.id}:`, err);
            setAudioBlocked(true);
          });

        p.stream.onaddtrack = () => {
          audioEl.play().catch(() => setAudioBlocked(true));
        };
      }
    });
  }, [remoteStreams]);

  // Unlock audio on any user touch/click gesture (standard mobile browser autoplay unlocking)
  useEffect(() => {
    const handleGesture = () => {
      let anyPaused = false;
      audioRefs.current.forEach((audioEl) => {
        if (audioEl && audioEl.paused) {
          anyPaused = true;
          audioEl.play().catch(() => {});
        }
      });
      if (!anyPaused) {
        setAudioBlocked(false);
      }
    };

    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('pointerdown', handleGesture);
    };
  }, []);

  return (
    <>
      {/* 
        Persistent remote audio elements in DOM.
        NOT display:none because iOS Safari / Chrome Android deprioritizes or silences display:none elements.
      */}
      <div
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0.001,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {remoteStreams.map((p) => (
          <audio
            key={p.id}
            ref={(el) => {
              if (el) {
                audioRefs.current.set(p.id, el);
                if (p.stream && el.srcObject !== p.stream) {
                  el.srcObject = p.stream;
                  el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
                }
              } else {
                audioRefs.current.delete(p.id);
              }
            }}
            autoPlay
            playsInline
          />
        ))}
      </div>

      {/* Floating Unmute Notice if browser autoplay policy blocks audio on mobile */}
      {audioBlocked && (
        <div
          onClick={playAllAudios}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs sm:text-sm rounded-full shadow-2xl cursor-pointer animate-bounce select-none border-2 border-white/40"
        >
          <VolumeX className="w-4 h-4 text-gray-950 animate-pulse" />
          <span>Bấm vào đây để BẬT TIẾNG cuộc họp (Âm thanh đang bị trình duyệt chặn)</span>
        </div>
      )}
    </>
  );
};
