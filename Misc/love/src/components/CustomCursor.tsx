import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [followerPos, setFollowerPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [cursorType, setCursorType] = useState<'default' | 'button' | 'heart' | 'photo' | 'drag'>('default');
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Check if device supports touch only
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      if (window.matchMedia('(pointer: coarse)').matches) {
        setIsTouch(true);
        return;
      }
    }

    document.body.classList.add('has-custom-cursor');

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      // Determine hover target
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest('button, a, input, textarea, select, [role="button"]');
      const heartEl = target.closest('.cursor-heart, [data-cursor="heart"]');
      const photoEl = target.closest('.cursor-photo, [data-cursor="photo"]');
      const dragEl = target.closest('.cursor-drag, [data-cursor="drag"]');

      if (heartEl) {
        setCursorType('heart');
        setIsHovered(true);
      } else if (photoEl) {
        setCursorType('photo');
        setIsHovered(true);
      } else if (dragEl) {
        setCursorType('drag');
        setIsHovered(true);
      } else if (clickable) {
        setCursorType('button');
        setIsHovered(true);
      } else {
        setCursorType('default');
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Smooth follower lerp
    let animId: number;
    const updateFollower = () => {
      setFollowerPos((prev) => {
        const dx = position.x - prev.x;
        const dy = position.y - prev.y;
        return {
          x: prev.x + dx * 0.22,
          y: prev.y + dy * 0.22,
        };
      });
      animId = requestAnimationFrame(updateFollower);
    };
    animId = requestAnimationFrame(updateFollower);

    return () => {
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, [position.x, position.y]);

  if (isTouch) return null;

  const getSize = () => {
    switch (cursorType) {
      case 'heart':
        return { w: 42, h: 42, border: '2px solid rgba(244, 63, 94, 0.9)', bg: 'rgba(244, 63, 94, 0.25)' };
      case 'photo':
        return { w: 50, h: 50, border: '2px solid rgba(56, 189, 248, 0.8)', bg: 'rgba(56, 189, 248, 0.2)' };
      case 'drag':
        return { w: 44, h: 44, border: '2px dashed rgba(255, 255, 255, 0.7)', bg: 'rgba(255, 255, 255, 0.15)' };
      case 'button':
        return { w: 38, h: 38, border: '2px solid var(--theme-primary)', bg: 'rgba(255, 255, 255, 0.1)' };
      default:
        return { w: 26, h: 26, border: '1px solid rgba(255, 255, 255, 0.4)', bg: 'rgba(255, 255, 255, 0.05)' };
    }
  };

  const styleConfig = getSize();

  return (
    <>
      <div
        className="custom-cursor-dot"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          opacity: position.x < 0 ? 0 : 1,
        }}
      />
      <div
        className="custom-cursor-follower"
        style={{
          left: `${followerPos.x}px`,
          top: `${followerPos.y}px`,
          width: `${styleConfig.w}px`,
          height: `${styleConfig.h}px`,
          border: styleConfig.border,
          background: styleConfig.bg,
          boxShadow: isHovered ? '0 0 20px var(--theme-glow)' : 'none',
          opacity: followerPos.x < 0 ? 0 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
        }}
      >
        {cursorType === 'heart' && '💖'}
        {cursorType === 'photo' && '🔍'}
      </div>
    </>
  );
};
