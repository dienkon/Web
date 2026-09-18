import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, Send, RotateCcw } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene8FinalQuestionProps {
  story: LoveStory;
  onRestart: () => void;
}

export const Scene8FinalQuestion: React.FC<Scene8FinalQuestionProps> = ({ story, onRestart }) => {
  const [decision, setDecision] = useState<'none' | 'yes' | 'maybe'>('none');

  const handleYes = () => {
    soundManager.playFireworks();
    setDecision('yes');

    // Launch multi-burst celebration confetti
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#f43f5e', '#ec4899', '#8b5cf6', '#ffd700', '#ffffff'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleMaybe = () => {
    soundManager.playClick();
    setDecision('maybe');
  };

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '40px 20px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        maxWidth: '820px',
        margin: '0 auto',
      }}
    >
      {decision === 'none' && (
        <div style={{ animation: 'inkReveal 0.6s ease-out', width: '100%' }}>
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
              marginBottom: '20px',
            }}
          >
            <Sparkles size={14} color="var(--theme-primary)" />
            <span>Khoảnh khắc của chúng mình</span>
          </div>

          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 700,
              marginBottom: '20px',
              lineHeight: 1.3,
              background: 'linear-gradient(180deg, #ffffff 60%, var(--theme-text-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {story.finalQuestion || 'Bạn có muốn cho mình một cơ hội không?'}
          </h2>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--theme-text-secondary)',
              marginBottom: '48px',
              maxWidth: '540px',
              margin: '0 auto 48px auto',
            }}
          >
            Dù câu trả lời là gì, mình vẫn luôn trân trọng từng phút giây được bên bạn.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handleYes}
              className="btn-vibrant cursor-heart"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 42px',
                borderRadius: '999px',
                fontSize: '1.2rem',
                minWidth: '200px',
                justifyContent: 'center',
              }}
            >
              <Heart size={20} fill="currentColor" />
              <span>❤️ Có</span>
            </button>

            <button
              onClick={handleMaybe}
              className="glass-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 36px',
                borderRadius: '999px',
                fontSize: '1.1rem',
                minWidth: '200px',
                justifyContent: 'center',
              }}
            >
              <span>😳 Cho mình suy nghĩ đã</span>
            </button>
          </div>
        </div>
      )}

      {/* YES ENDING */}
      {decision === 'yes' && (
        <div
          className="glass-card"
          style={{
            padding: 'clamp(32px, 6vw, 56px)',
            borderRadius: '28px',
            maxWidth: '680px',
            width: '100%',
            animation: 'inkReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '2px solid var(--theme-primary)',
            boxShadow: '0 0 50px var(--theme-glow)',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              boxShadow: '0 0 30px var(--theme-glow)',
              animation: 'heartbeatPulse 1.6s infinite',
            }}
          >
            <Heart size={44} fill="#ffffff" color="#ffffff" />
          </div>

          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(2rem, 5vw, 2.8rem)',
              fontWeight: 700,
              marginBottom: '16px',
              color: '#ffffff',
            }}
          >
            {story.endings.yes || 'Chúng ta bắt đầu một câu chuyện mới nhé! ❤️'}
          </h2>

          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--theme-text-secondary)',
              lineHeight: 1.7,
              marginBottom: '32px',
            }}
          >
            {story.endings.yesSubtext || 'Cảm ơn bạn đã mở cửa trái tim. Mình hứa sẽ luôn yêu thương và trân trọng bạn thật nhiều!'}
          </p>

          {/* Couple Certificate Tag */}
          <div
            style={{
              padding: '16px 28px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--theme-glass-border)',
              display: 'inline-block',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--theme-primary)',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}
            >
              {story.sender.name} × {story.receiver.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--theme-text-secondary)' }}>
              Được khắc ghi vào ngày {currentDate}
            </div>
          </div>

          {/* Secret Note if unlocked */}
          {story.endings.secretNote && (
            <div
              style={{
                padding: '14px 20px',
                borderRadius: '12px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px dashed var(--theme-primary)',
                fontSize: '0.92rem',
                color: '#ffd1dc',
                marginBottom: '28px',
              }}
            >
              {story.endings.secretNote}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                soundManager.playBurst();
                window.open(`https://zalo.me`, '_blank');
              }}
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
              <Send size={16} />
              <span>Nhắn tin cho {story.sender.name}</span>
            </button>

            <button
              onClick={onRestart}
              className="glass-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '999px',
                fontSize: '0.95rem',
              }}
            >
              <RotateCcw size={16} />
              <span>Xem lại từ đầu</span>
            </button>
          </div>
        </div>
      )}

      {/* SOFT MAYBE ENDING */}
      {decision === 'maybe' && (
        <div
          className="glass-card"
          style={{
            padding: 'clamp(32px, 6vw, 48px)',
            borderRadius: '28px',
            maxWidth: '640px',
            width: '100%',
            animation: 'inkReveal 0.6s ease-out',
          }}
        >
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              fontWeight: 600,
              marginBottom: '16px',
              color: '#ffffff',
            }}
          >
            {story.endings.maybe || 'Không sao đâu bạn ơi!'}
          </h2>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--theme-text-secondary)',
              lineHeight: 1.7,
              marginBottom: '28px',
            }}
          >
            {story.endings.maybeSubtext || 'Mình chỉ muốn bạn biết cảm xúc chân thành này của mình thôi. Hãy luôn vui vẻ, rạng rỡ và hạnh phúc nhé, mình vẫn luôn ở đây ủng hộ bạn!'}
          </p>

          <button
            onClick={onRestart}
            className="glass-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '999px',
              fontSize: '0.95rem',
            }}
          >
            <RotateCcw size={16} />
            <span>Xem lại câu chuyện</span>
          </button>
        </div>
      )}
    </div>
  );
};
