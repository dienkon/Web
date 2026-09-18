import React, { useState } from 'react';
import { Play, Pause, Disc, ChevronRight, Music } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene5MusicProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene5Music: React.FC<Scene5MusicProps> = ({ story, onNext }) => {
  const [isPlaying, setIsPlaying] = useState(soundManager.isMusicActive());
  const music = story.music;

  const togglePlay = () => {
    soundManager.playClick();
    if (isPlaying) {
      soundManager.stopAudio();
      setIsPlaying(false);
    } else {
      if (music.url) {
        soundManager.playCustomAudio(music.url);
      } else {
        soundManager.startSynthMelody();
      }
      setIsPlaying(true);
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
        maxWidth: '680px',
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
        <Music size={14} color="var(--theme-primary)" />
        <span>Giai điệu thanh âm</span>
      </div>

      <h2
        className="font-display"
        style={{
          fontSize: 'clamp(2rem, 4.5vw, 3rem)',
          fontWeight: 600,
          marginBottom: '10px',
          background: 'linear-gradient(180deg, #ffffff 60%, var(--theme-text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Khúc Tình Ca Dành Cho Bạn
      </h2>

      <p
        style={{
          fontSize: '1rem',
          color: 'var(--theme-text-secondary)',
          marginBottom: '40px',
          maxWidth: '480px',
        }}
      >
        “Có một bản nhạc, mỗi khi lắng nghe giai điệu này, người đầu tiên mình nghĩ đến luôn là bạn…”
      </p>

      {/* Vinyl Record & Player Card */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          padding: '36px 28px',
          borderRadius: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '36px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated Vinyl Disc */}
        <div
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #2d3748 0%, #1a202c 40%, #000000 100%)',
            border: '6px solid #111827',
            boxShadow: isPlaying ? '0 0 35px var(--theme-glow)' : '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            position: 'relative',
            animation: isPlaying ? 'rotateRecord 4s linear infinite' : 'none',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {/* Vinyl Grooves rings */}
          <div
            style={{
              position: 'absolute',
              width: '84%',
              height: '84%',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '68%',
              height: '68%',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          {/* Vinyl Center Label */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Disc size={26} />
          </div>
        </div>

        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '4px',
            color: 'var(--theme-text-primary)',
          }}
        >
          {music.title || 'Ánh Sao Trong Mắt Em'}
        </h3>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--theme-text-secondary)',
            marginBottom: '20px',
          }}
        >
          {music.artist || 'Giai Điệu Tình Yêu'}
        </p>

        {/* Dynamic Waveform Bars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            height: '28px',
            marginBottom: '24px',
          }}
        >
          {[0.2, 0.5, 0.3, 0.8, 0.4, 0.9, 0.6, 0.3, 0.7, 0.5, 0.8, 0.4].map((delay, idx) => (
            <div
              key={idx}
              style={{
                width: '4px',
                height: isPlaying ? '20px' : '4px',
                background: 'var(--theme-primary)',
                borderRadius: '999px',
                animation: isPlaying ? `waveBar 1s ease-in-out infinite alternate` : 'none',
                animationDelay: `${delay}s`,
                transition: 'height 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="btn-vibrant cursor-heart"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 36px',
            borderRadius: '999px',
            fontSize: '1rem',
          }}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          <span>{isPlaying ? 'Tạm dừng giai điệu' : 'Phát bài hát này'}</span>
        </button>
      </div>

      <button
        onClick={() => {
          soundManager.playTransition();
          onNext();
        }}
        className="glass-button cursor-heart"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 34px',
          borderRadius: '999px',
          fontSize: '1rem',
          fontWeight: 500,
        }}
      >
        <span>Lắng nghe lời tiếp theo</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};
