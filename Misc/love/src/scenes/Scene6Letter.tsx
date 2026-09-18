import React, { useEffect, useState } from 'react';
import { ChevronRight, FastForward, Heart } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory } from '../models/LoveStory';

interface Scene6LetterProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene6Letter: React.FC<Scene6LetterProps> = ({ story, onNext }) => {
  const fullText = story.confession || `Gửi ${story.receiver.name || 'bạn'},

Có những điều bình dị chỉ khi gặp được bạn, mình mới bắt đầu thấu hiểu trọn vẹn ý nghĩa.

Từ ánh mắt đầu tiên ở góc phố hôm ấy, đến từng mẩu chuyện vu vơ mỗi tối, bạn đã dần trở thành thói quen ngọt ngào nhất mà mình không bao giờ muốn đánh mất.

Mình muốn là người được cùng bạn đón những sớm mai rực rỡ, che ô cho bạn qua những ngày mưa bão, và cùng bạn viết tiếp những trang kỷ niệm ngọt ngào nhất.`;

  const [displayedLength, setDisplayedLength] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (displayedLength < fullText.length) {
      const char = fullText[displayedLength];
      const delay = char === '\n' ? 220 : char === '.' ? 180 : 35;

      const timer = setTimeout(() => {
        setDisplayedLength((prev) => prev + 1);
        if (Math.random() < 0.25) {
          soundManager.playTyping();
        }
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setIsFinished(true);
    }
  }, [displayedLength, fullText]);

  const handleSkip = () => {
    soundManager.playClick();
    setDisplayedLength(fullText.length);
    setIsFinished(true);
  };

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
        maxWidth: '740px',
        margin: '0 auto',
      }}
    >
      {/* Letter Parchment Container */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          padding: 'clamp(28px, 6vw, 48px)',
          borderRadius: '24px',
          background: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          textAlign: 'left',
          position: 'relative',
          marginBottom: '32px',
          minHeight: '320px',
        }}
      >
        {/* Subtle decorative stamp */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '2px dashed var(--theme-glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
          }}
        >
          <Heart size={20} color="var(--theme-primary)" />
        </div>

        {/* Handwritten text content */}
        <div
          className="font-handwriting"
          style={{
            fontSize: 'clamp(1.45rem, 3.8vw, 2.05rem)',
            lineHeight: 1.8,
            color: '#fffbf5',
            whiteSpace: 'pre-line',
            letterSpacing: '0.02em',
          }}
        >
          {fullText.slice(0, displayedLength)}
          {!isFinished && (
            <span
              style={{
                display: 'inline-block',
                width: '3px',
                height: '1.2em',
                background: 'var(--theme-primary)',
                marginLeft: '4px',
                verticalAlign: 'middle',
                animation: 'blinkCursor 0.8s infinite',
              }}
            />
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {!isFinished && (
          <button
            onClick={handleSkip}
            className="glass-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '999px',
              fontSize: '0.9rem',
            }}
          >
            <FastForward size={14} />
            <span>Đọc nhanh</span>
          </button>
        )}

        {isFinished && (
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
              fontSize: '1.05rem',
              animation: 'inkReveal 0.5s ease-out',
            }}
          >
            <span>Khoảnh khắc quyết định</span>
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
