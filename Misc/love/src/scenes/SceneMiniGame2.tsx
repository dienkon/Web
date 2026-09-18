import React, { useState } from 'react';
import { Heart, Sparkles, ChevronRight } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface SceneMiniGame2Props {
  story: LoveStory;
  onNext: () => void;
}

interface HeartItem {
  id: number;
  label: string;
  isSecret: boolean;
  message: string;
  size: number;
  color: string;
}

export const SceneMiniGame2: React.FC<SceneMiniGame2Props> = ({ story, onNext }) => {
  const [selectedHeart, setSelectedHeart] = useState<HeartItem | null>(null);

  const hearts: HeartItem[] = [
    {
      id: 1,
      label: 'Trái tim Ánh Sao',
      isSecret: false,
      message: '“Nụ cười của bạn là điều tỏa sáng nhất trong ngày của mình!”',
      size: 64,
      color: '#ec4899',
    },
    {
      id: 2,
      label: 'Trái tim Bí Mật',
      isSecret: true,
      message: `“🎉 Bạn đã tìm thấy trái tim bí mật! Lời thì thầm: ${story.sender.name || 'Người ấy'} đã crush bạn từ lâu lắm rồi đó!”`,
      size: 78,
      color: 'var(--theme-primary)',
    },
    {
      id: 3,
      label: 'Trái tim Kẹo Ngọt',
      isSecret: false,
      message: '“Mỗi lần gặp bạn, tim mình lại đập rộn ràng như lần đầu tiên.”',
      size: 60,
      color: '#f43f5e',
    },
    {
      id: 4,
      label: 'Trái tim Bình Yên',
      isSecret: false,
      message: '“Chỉ cần ở cạnh bạn, mọi giông bão ngoài kia đều dừng sau cánh cửa.”',
      size: 70,
      color: '#8b5cf6',
    },
  ];

  const handleSelect = (h: HeartItem) => {
    soundManager.playBurst();
    setSelectedHeart(h);
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
        maxWidth: '760px',
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
        <Sparkles size={14} color="var(--theme-primary)" />
        <span>Trò chơi trái tim</span>
      </div>

      <h2
        className="font-display"
        style={{
          fontSize: 'clamp(2rem, 4.5vw, 3rem)',
          fontWeight: 600,
          marginBottom: '14px',
          background: 'linear-gradient(180deg, #ffffff 60%, var(--theme-text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Chọn Một Trái Tim
      </h2>

      <p
        style={{
          fontSize: '1rem',
          color: 'var(--theme-text-secondary)',
          marginBottom: '44px',
          maxWidth: '500px',
        }}
      >
        Một trong số những trái tim này cất giấu một điều bí mật đặc biệt. Hãy lắng nghe trực giác của bạn nhé!
      </p>

      {/* Floating Interactive Hearts Container */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(16px, 4vw, 36px)',
          flexWrap: 'wrap',
          marginBottom: '44px',
          width: '100%',
        }}
      >
        {hearts.map((h, idx) => {
          const isSelected = selectedHeart?.id === h.id;
          return (
            <div
              key={h.id}
              onClick={() => handleSelect(h)}
              className="cursor-heart"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                animation: `float ${3.5 + idx * 0.5}s ease-in-out infinite`,
                animationDelay: `${idx * 0.4}s`,
              }}
              onMouseEnter={() => soundManager.playHover()}
            >
              <div
                style={{
                  width: `${h.size + 16}px`,
                  height: `${h.size + 16}px`,
                  borderRadius: '50%',
                  background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected ? `2px solid ${h.color}` : '1px solid var(--theme-glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? `0 0 30px ${h.color}` : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                <Heart
                  size={h.size * 0.6}
                  fill={isSelected ? h.color : 'rgba(255, 255, 255, 0.3)'}
                  color={h.color}
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 10px ${h.color})` : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Secret / Message Box */}
      {selectedHeart && (
        <div
          className="glass-card"
          style={{
            padding: '24px 32px',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            marginBottom: '36px',
            animation: 'inkReveal 0.4s ease-out',
            border: selectedHeart.isSecret ? '2px solid var(--theme-primary)' : '1px solid var(--theme-glass-border)',
            boxShadow: selectedHeart.isSecret ? '0 0 30px var(--theme-glow)' : 'none',
          }}
        >
          <p
            className={selectedHeart.isSecret ? 'font-display' : ''}
            style={{
              fontSize: '1.15rem',
              fontWeight: 500,
              lineHeight: 1.6,
              color: '#ffffff',
            }}
          >
            {selectedHeart.message}
          </p>
        </div>
      )}

      {selectedHeart && (
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
          <span>Đọc bức thư tay</span>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};
