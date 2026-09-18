import React, { useEffect, useState } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene7ClimaxProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene7Climax: React.FC<Scene7ClimaxProps> = ({ story, onNext }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Sequence timing
    // 0: Darkness, beating heart
    const hbInterval = setInterval(() => {
      soundManager.playHeartbeat();
    }, 1200);

    const t1 = setTimeout(() => {
      setStage(1); // "Mình có một điều muốn nói..."
    }, 1800);

    const t2 = setTimeout(() => {
      setStage(2); // Pause, intense heartbeat
    }, 3800);

    const t3 = setTimeout(() => {
      clearInterval(hbInterval);
      setStage(3); // "Mình thích bạn." - BURST!
      soundManager.playBurst();
      soundManager.playFireworks();
    }, 5200);

    return () => {
      clearInterval(hbInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

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
        backgroundColor: stage < 3 ? 'rgba(0, 0, 0, 0.65)' : 'transparent',
        transition: 'background-color 1s ease',
      }}
    >
      {/* Beating Glowing Heart Icon */}
      <div
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
          animation: 'heartbeatPulse 1.2s infinite',
          filter: 'drop-shadow(0 0 35px var(--theme-primary))',
        }}
      >
        <Heart
          size={stage >= 3 ? 84 : 64}
          fill="var(--theme-primary)"
          color="var(--theme-primary)"
          style={{
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* Stage 1 Text: Subtle confession prelude */}
      {stage >= 1 && stage < 3 && (
        <p
          className="font-display"
          style={{
            fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
            color: 'var(--theme-text-secondary)',
            animation: 'inkReveal 0.8s ease-out',
            fontStyle: 'italic',
            maxWidth: '600px',
          }}
        >
          “Thực ra... mình có một điều đã giấu rất lâu rồi…”
        </p>
      )}

      {/* Stage 3: THE CLIMAX */}
      {stage >= 3 && (
        <div
          style={{
            animation: 'inkReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '720px',
          }}
        >
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(2.8rem, 8vw, 5rem)',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #ffffff 0%, #ffd1dc 40%, var(--theme-primary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 50px var(--theme-glow)',
            }}
          >
            Mình Thích Bạn!
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
              color: 'var(--theme-text-secondary)',
              marginBottom: '44px',
              lineHeight: 1.7,
            }}
          >
            {story.receiver.name}, làm người yêu của mình nhé?
          </p>

          <button
            onClick={() => {
              soundManager.playTransition();
              onNext();
            }}
            className="btn-vibrant cursor-heart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '16px 44px',
              borderRadius: '999px',
              fontSize: '1.1rem',
            }}
          >
            <span>Câu trả lời của bạn</span>
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
