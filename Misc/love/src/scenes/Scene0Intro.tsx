import React, { useState } from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene0IntroProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene0Intro: React.FC<Scene0IntroProps> = ({ story, onNext }) => {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = (e: React.MouseEvent<HTMLButtonElement>) => {
    soundManager.playBurst();
    setIsStarting(true);
    setTimeout(() => {
      onNext();
    }, 350);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        transition: 'all 0.6s ease',
        opacity: isStarting ? 0 : 1,
        transform: isStarting ? 'scale(1.08)' : 'scale(1)',
        filter: isStarting ? 'blur(8px)' : 'blur(0px)',
      }}
    >
      {/* Ambient glowing badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid var(--theme-glass-border)',
          backdropFilter: 'blur(10px)',
          fontSize: '13px',
          color: 'var(--theme-text-secondary)',
          marginBottom: '28px',
          animation: 'float 4s ease-in-out infinite',
        }}
      >
        <Sparkles size={14} color="var(--theme-primary)" />
        <span>Một thông điệp bí mật gửi tới {story.receiver.name || 'bạn'}</span>
      </div>

      {/* Secret Entry Text */}
      <h1
        className="font-display"
        style={{
          fontSize: 'clamp(2rem, 5.5vw, 3.8rem)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          maxWidth: '720px',
          lineHeight: 1.3,
          marginBottom: '20px',
          background: 'linear-gradient(180deg, #ffffff 40%, var(--theme-text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 40px rgba(255, 255, 255, 0.2)',
        }}
      >
        {story.intro || 'Có một thứ mình muốn cho bạn xem…'}
      </h1>

      <p
        style={{
          fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
          color: 'var(--theme-text-secondary)',
          maxWidth: '480px',
          marginBottom: '44px',
          lineHeight: 1.7,
        }}
      >
        Hãy đeo tai nghe hoặc bật âm lượng để cảm nhận trọn vẹn từng khoảnh khắc nhé.
      </p>

      {/* Magnetic Glowing Button */}
      <button
        onClick={handleStart}
        className="btn-vibrant cursor-heart"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 42px',
          borderRadius: '999px',
          fontSize: '1.1rem',
          letterSpacing: '0.02em',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={() => soundManager.playHover()}
      >
        <Heart size={20} fill="currentColor" />
        <span>Bắt đầu trải nghiệm</span>
      </button>
    </div>
  );
};
