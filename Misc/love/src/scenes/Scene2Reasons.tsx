import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Sparkles } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene2ReasonsProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene2Reasons: React.FC<Scene2ReasonsProps> = ({ story, onNext }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reasons = story.reasons.length > 0 ? story.reasons : [
    { id: '1', text: 'Vì nụ cười của bạn làm tan chảy mọi mệt mỏi trong mình.', subtext: 'Chỉ cần nhìn thấy bạn cười là lòng mình bình yên.' }
  ];

  const handlePrev = () => {
    if (currentIndex > 0) {
      soundManager.playClick();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNextReason = () => {
    if (currentIndex < reasons.length - 1) {
      soundManager.playClick();
      setCurrentIndex((prev) => prev + 1);
    } else {
      soundManager.playTransition();
      onNext();
    }
  };

  const currentItem = reasons[currentIndex];

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
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Subtitle Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--theme-glass-border)',
          fontSize: '13px',
          color: 'var(--theme-text-secondary)',
          marginBottom: '16px',
        }}
      >
        <Sparkles size={14} color="var(--theme-primary)" />
        <span>Lý do thứ {currentIndex + 1} trên {reasons.length}</span>
      </div>

      <h2
        className="font-display"
        style={{
          fontSize: 'clamp(2rem, 4.5vw, 3rem)',
          fontWeight: 600,
          marginBottom: '36px',
          background: 'linear-gradient(180deg, #ffffff 60%, var(--theme-text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Vì Sao Là Bạn?
      </h2>

      {/* Floating Glass Reason Card */}
      <div
        key={currentItem.id}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '40px 32px',
          borderRadius: '24px',
          position: 'relative',
          marginBottom: '36px',
          animation: 'inkReveal 0.5s ease-out',
        }}
      >
        {/* Glowing Index Badge */}
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '15px',
            boxShadow: '0 0 16px var(--theme-glow)',
          }}
        >
          0{currentIndex + 1}
        </div>

        <p
          style={{
            fontSize: 'clamp(1.2rem, 3.2vw, 1.55rem)',
            fontWeight: 500,
            lineHeight: 1.6,
            color: 'var(--theme-text-primary)',
            marginBottom: currentItem.subtext ? '16px' : '0',
            marginTop: '10px',
          }}
        >
          {currentItem.text}
        </p>

        {currentItem.subtext && (
          <p
            style={{
              fontSize: '0.98rem',
              color: 'var(--theme-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {currentItem.subtext}
          </p>
        )}
      </div>

      {/* Navigation Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="glass-button"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Indicators */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {reasons.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: idx === currentIndex ? 'var(--theme-primary)' : 'rgba(255, 255, 255, 0.2)',
                boxShadow: idx === currentIndex ? '0 0 8px var(--theme-glow)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNextReason}
          className="btn-vibrant cursor-heart"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            borderRadius: '999px',
            fontSize: '0.95rem',
          }}
        >
          <span>{currentIndex < reasons.length - 1 ? 'Lý do tiếp theo' : 'Bước tiếp'}</span>
          {currentIndex < reasons.length - 1 ? <ChevronRight size={18} /> : <Heart size={16} fill="currentColor" />}
        </button>
      </div>
    </div>
  );
};
