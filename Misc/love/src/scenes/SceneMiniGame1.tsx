import React, { useState } from 'react';
import { Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface SceneMiniGame1Props {
  story: LoveStory;
  onNext: () => void;
}

export const SceneMiniGame1: React.FC<SceneMiniGame1Props> = ({ story, onNext }) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [reactionText, setReactionText] = useState<string>('');
  const [counterValue, setCounterValue] = useState<string>('');
  const [isInfinity, setIsInfinity] = useState(false);

  const handleChoice = (choice: string) => {
    setSelectedChoice(choice);
    setIsInfinity(false);

    if (choice === '10%') {
      soundManager.playHover();
      setReactionText('Ủa sao chọn ít xỉn vậy nè! Người ta thương bạn nhiều hơn thế gấp trăm lần đó! 🙈');
    } else if (choice === '50%') {
      soundManager.playClick();
      setReactionText('Vẫn chưa đúng nha! Thích bạn nhiều hơn một nửa thế giới này luôn á! ✨');
    } else if (choice === '100%') {
      soundManager.playBurst();
      setReactionText('Gần đúng rồi... Nhưng mà 100% vẫn chưa đong đếm hết được đâu! 💖');
    } else if (choice === 'more') {
      soundManager.playBurst();
      setReactionText('Chính xác rồi! Thật ra mức độ thích bạn là...');
      // Animate counter
      const steps = ['100%', '300%', '800%', '9999%', '∞ (Vô cực)'];
      steps.forEach((val, idx) => {
        setTimeout(() => {
          setCounterValue(val);
          soundManager.playTyping();
          if (idx === steps.length - 1) {
            setIsInfinity(true);
            soundManager.playBurst();
          }
        }, (idx + 1) * 350);
      });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '32px 20px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
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
        <HelpCircle size={14} color="var(--theme-primary)" />
        <span>Thử thách tương tác</span>
      </div>

      <h2
        className="font-display"
        style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.7rem)',
          fontWeight: 600,
          marginBottom: '14px',
          lineHeight: 1.4,
          background: 'linear-gradient(180deg, #ffffff 60%, var(--theme-text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Bạn đoán xem {story.sender.name || 'người ấy'} thích bạn bao nhiêu?
      </h2>

      <p
        style={{
          fontSize: '1rem',
          color: 'var(--theme-text-secondary)',
          marginBottom: '36px',
        }}
      >
        Hãy chọn một con số mà bạn nghĩ là đúng nhất nhé!
      </p>

      {/* Choice Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          width: '100%',
          maxWidth: '460px',
          marginBottom: '32px',
        }}
      >
        {[
          { id: '10%', label: '10%' },
          { id: '50%', label: '50%' },
          { id: '100%', label: '100%' },
          { id: 'more', label: 'Nhiều hơn thế ✨' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleChoice(btn.id)}
            className="glass-card cursor-heart"
            style={{
              padding: '18px 24px',
              borderRadius: '16px',
              fontSize: '1.15rem',
              fontWeight: 600,
              color: selectedChoice === btn.id ? '#ffffff' : 'var(--theme-text-primary)',
              background: selectedChoice === btn.id ? 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' : 'var(--theme-card-bg)',
              border: selectedChoice === btn.id ? '1px solid transparent' : '1px solid var(--theme-glass-border)',
              boxShadow: selectedChoice === btn.id ? '0 0 25px var(--theme-glow)' : 'none',
              transform: selectedChoice === btn.id ? 'scale(1.04)' : 'scale(1)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Dynamic Feedback Card */}
      {reactionText && (
        <div
          className="glass-card"
          style={{
            padding: '24px 32px',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            marginBottom: '32px',
            animation: 'inkReveal 0.4s ease-out',
            border: isInfinity ? '2px solid var(--theme-primary)' : '1px solid var(--theme-glass-border)',
          }}
        >
          <p
            style={{
              fontSize: '1.1rem',
              fontWeight: 500,
              color: 'var(--theme-text-primary)',
              lineHeight: 1.6,
            }}
          >
            {reactionText}
          </p>

          {counterValue && (
            <div
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                fontWeight: 800,
                color: 'var(--theme-primary)',
                marginTop: '12px',
                textShadow: '0 0 30px var(--theme-glow)',
                animation: isInfinity ? 'heartbeatPulse 1.5s infinite' : 'none',
              }}
            >
              {counterValue}
            </div>
          )}
        </div>
      )}

      {selectedChoice && (
        <button
          onClick={() => {
            soundManager.playTransition();
            onNext();
          }}
          className="btn-vibrant cursor-heart"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 36px',
            borderRadius: '999px',
            fontSize: '1rem',
            animation: 'inkReveal 0.4s ease-out',
          }}
        >
          <Sparkles size={16} />
          <span>Tiếp tục trò chơi</span>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};
