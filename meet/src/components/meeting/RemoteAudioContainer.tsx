import React, { useEffect, useState, useCallback } from 'react';
import { Participant } from '../../types/meeting';
import { VolumeX } from 'lucide-react';

interface RemoteAudioContainerProps {
  participants: Participant[];
}

export const RemoteAudioContainer: React.FC<RemoteAudioContainerProps> = ({ participants }) => {
  const [audioBlocked, setAudioBlocked] = useState(false);

  const unlockMedia = useCallback(() => {
    let blocked = false;
    const mediaElements = document.querySelectorAll<HTMLMediaElement>('video, audio');
    mediaElements.forEach((el) => {
      if (!el.muted && el.paused && el.srcObject) {
        el.play().catch(() => {
          blocked = true;
        });
      }
    });
    setAudioBlocked(blocked);
  }, []);

  // Check on participant change if any unmuted remote stream is paused
  useEffect(() => {
    const checkPaused = () => {
      const mediaElements = document.querySelectorAll<HTMLMediaElement>('video');
      let foundBlocked = false;
      mediaElements.forEach((el) => {
        if (!el.muted && el.paused && el.srcObject) {
          el.play().catch(() => {
            foundBlocked = true;
            setAudioBlocked(true);
          });
        }
      });
      if (!foundBlocked) {
        setAudioBlocked(false);
      }
    };

    const timer = setTimeout(checkPaused, 500);
    return () => clearTimeout(timer);
  }, [participants]);

  // Unlock audio on any user touch/click/key gesture (satisfies browser autoplay policies)
  useEffect(() => {
    const handleGesture = () => {
      unlockMedia();
    };

    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, [unlockMedia]);

  if (!audioBlocked) return null;

  return (
    <div
      onClick={unlockMedia}
      className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs sm:text-sm rounded-full shadow-2xl cursor-pointer animate-bounce select-none border-2 border-white/40"
    >
      <VolumeX className="w-4 h-4 text-gray-950 animate-pulse" />
      <span>Bấm vào đây để BẬT TIẾNG cuộc họp (Âm thanh đang bị trình duyệt chặn)</span>
    </div>
  );
};
