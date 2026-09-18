import React, { useEffect } from 'react';
import { ChevronRight, Heart } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene1GreetingProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene1Greeting: React.FC<Scene1GreetingProps> = ({ story, onNext }) => {
  useEffect(() => {
    soundManager.playChime();
  }, []);

  const handleNext = () => {
    soundManager.playTransition();
    onNext();
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
      }}
    >
      {/* Sender / Receiver Avatar */}
      {story.sender.avatar && (
        <div
          style={{
            position: 'relative',
            marginBottom: '24px',
            animation: 'inkReveal 0.7s ease-out',
          }}
        >
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--theme-glass-border)',
              boxShadow: '0 0 25px var(--theme-glow)',
              margin: '0 auto',
            }}
          >
            <img
              src={story.sender.avatar}
              alt={story.sender.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: 'calc(50% - 42px)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--theme-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Heart size={15} fill="#ffffff" color="#ffffff" />
          </div>
        </div>
      )}

      {/* Greeting Title */}
      <h2
        style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
          fontWeight: 700,
          marginBottom: '16px',
          letterSpacing: '-0.02em',
          animation: 'inkReveal 0.7s ease-out 0.2s backwards',
        }}
      >
        Chào <span style={{ color: 'var(--theme-primary)', textShadow: '0 0 20px var(--theme-glow)' }}>{story.receiver.name}</span>
        {story.receiver.nickname && (
          <span style={{ fontSize: '0.6em', color: 'var(--theme-text-secondary)', display: 'block', fontWeight: 400, marginTop: '6px' }}>
            ({story.receiver.nickname})
          </span>
        )}
      </h2>

      {/* Secret message reveal */}
      <p
        className="font-display"
        style={{
          fontSize: 'clamp(1.15rem, 3vw, 1.55rem)',
          color: 'var(--theme-text-secondary)',
          maxWidth: '580px',
          lineHeight: 1.6,
          fontStyle: 'italic',
          marginBottom: '44px',
          animation: 'inkReveal 0.7s ease-out 0.45s backwards',
        }}
      >
        “Có một chuyện mình đã muốn nói với bạn khá lâu rồi…”
      </p>

      {/* Action to continue */}
      <button
        onClick={handleNext}
        className="glass-button cursor-heart"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 34px',
          borderRadius: '999px',
          fontSize: '1rem',
          fontWeight: 500,
          animation: 'inkReveal 0.7s ease-out 0.7s backwards',
        }}
        onMouseEnter={() => soundManager.playHover()}
      >
        <span>Lắng nghe tiếp nhé</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};
