import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Edit3 } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface StoryControlsProps {
  currentScene: number;
  totalScenes: number;
  onGoToStudio?: () => void;
  onTriggerEasterEgg?: () => void;
  showStudioLink?: boolean;
}

export const StoryControls: React.FC<StoryControlsProps> = ({
  currentScene,
  totalScenes,
  onGoToStudio,
  onTriggerEasterEgg,
  showStudioLink = true,
}) => {
  const [muted, setMuted] = useState(soundManager.getIsMuted());
  const [starClickCount, setStarClickCount] = useState(0);

  const handleToggleMute = () => {
    const isNowMuted = soundManager.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      soundManager.playClick();
    }
  };

  const handleStarClick = () => {
    soundManager.playClick();
    const newCount = starClickCount + 1;
    setStarClickCount(newCount);
    if (newCount >= 3) {
      setStarClickCount(0);
      onTriggerEasterEgg?.();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 90,
        pointerEvents: 'none',
      }}
    >
      {/* Left: Progress & Secret Star Easter Egg */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={handleStarClick}
          className="glass-button"
          title="Ngôi sao lấp lánh (Nhấp 3 lần để mở bí mật!)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} color="var(--theme-primary)" />
          <span>{currentScene + 1}/{totalScenes}</span>
        </button>
      </div>

      {/* Right: Audio control & Studio button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={handleToggleMute}
          className="glass-button"
          title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} color="var(--theme-primary)" />}
        </button>

        {showStudioLink && onGoToStudio && (
          <button
            onClick={onGoToStudio}
            className="glass-button"
            title="Tự tạo trang tỏ tình"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">Tạo Lời Tỏ Tình</span>
          </button>
        )}
      </div>
    </div>
  );
};
