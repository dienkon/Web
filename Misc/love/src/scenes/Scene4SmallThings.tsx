import React, { useState } from 'react';
import { Sparkles, ChevronRight, Palette, Coffee, Smile, Compass, Heart } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene4SmallThingsProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene4SmallThings: React.FC<Scene4SmallThingsProps> = ({ story, onNext }) => {
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const items = story.smallThings.length > 0 ? story.smallThings : [
    { id: '1', title: 'Màu sắc yêu thích', value: 'Xanh ngọc & Hồng phấn', icon: 'palette' },
    { id: '2', title: 'Món uống yêu thích', value: 'Trà sen vàng 50% đường', icon: 'coffee' },
    { id: '3', title: 'Thói quen đáng yêu', value: 'Mỗi khi ngại là cười tít mắt', icon: 'smile' },
  ];

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'palette': return <Palette size={20} color="var(--theme-primary)" />;
      case 'coffee': return <Coffee size={20} color="#fb923c" />;
      case 'smile': return <Smile size={20} color="#facc15" />;
      case 'compass': return <Compass size={20} color="#38bdf8" />;
      default: return <Heart size={20} color="var(--theme-primary)" />;
    }
  };

  const handleChipClick = (id: string) => {
    soundManager.playBurst();
    setActiveChip(activeChip === id ? null : id);
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
        maxWidth: '820px',
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
        <span>Góc chi tiết vụn vặt</span>
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
        Những Điều Nhỏ Nhặt Về Bạn
      </h2>

      <p
        style={{
          fontSize: '1rem',
          color: 'var(--theme-text-secondary)',
          maxWidth: '520px',
          marginBottom: '40px',
        }}
      >
        Mình ghi nhớ từng sở thích, thói quen và những điều vụn vặt nhất… vì bạn là người đặc biệt. (Nhấp để mở chi tiết nhé!)
      </p>

      {/* Interactive Chips Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          width: '100%',
          marginBottom: '44px',
        }}
      >
        {items.map((item) => {
          const isSelected = activeChip === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleChipClick(item.id)}
              className="glass-card cursor-heart"
              style={{
                padding: '24px',
                borderRadius: '20px',
                cursor: 'pointer',
                textAlign: 'left',
                border: isSelected ? '1px solid var(--theme-primary)' : '1px solid var(--theme-glass-border)',
                background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'var(--theme-card-bg)',
                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 25px var(--theme-glow)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {getIcon(item.icon)}
                </div>
                <h4
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: 'var(--theme-text-primary)',
                  }}
                >
                  {item.title}
                </h4>
              </div>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: isSelected ? '#ffffff' : 'var(--theme-text-secondary)',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'color 0.2s ease',
                }}
              >
                {item.value}
              </p>
            </div>
          );
        })}
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
        <span>Tiếp tục hành trình</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};
