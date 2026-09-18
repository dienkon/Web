import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, Sparkles } from 'lucide-react';
import { StoryElement, EntranceAnimation } from '../../models/LoveStory';
import { soundManager } from '../../audio/SoundManager';

interface VisualTimelineProps {
  elements: StoryElement[];
  totalDuration?: number;
  onUpdateElements: (elements: StoryElement[]) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
}

export const VisualTimeline: React.FC<VisualTimelineProps> = ({
  elements,
  totalDuration = 6,
  onUpdateElements,
  selectedElementId,
  onSelectElement,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let animId: number;
    let lastTimestamp: number | null = null;

    const tick = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      if (isPlaying) {
        animId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, totalDuration]);

  const togglePlay = () => {
    soundManager.playClick();
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    soundManager.playClick();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleUpdateAnimation = (
    id: string,
    delay: number,
    duration: number,
    entrance?: EntranceAnimation
  ) => {
    onUpdateElements(
      elements.map((el) =>
        el.id === id
          ? {
              ...el,
              animation: {
                ...el.animation,
                delay: Math.max(0, delay),
                duration: Math.max(0.2, duration),
                ...(entrance ? { entrance } : {}),
              },
            }
          : el
      )
    );
  };

  const timeMarkers = [];
  for (let i = 0; i <= totalDuration; i++) {
    timeMarkers.push(i);
  }

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--theme-glass-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header with Timeline Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--theme-primary)" />
          <h4 style={{ fontSize: '13px', fontWeight: 700 }}>
            Dòng Thời Gian Hiệu Ứng (Visual Timeline)
          </h4>
          <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
            ({currentTime.toFixed(1)}s / {totalDuration}s)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={togglePlay}
            className="glass-button"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            <span>{isPlaying ? 'Tạm Dừng' : 'Phát Thử'}</span>
          </button>

          <button
            onClick={handleReset}
            className="glass-button"
            title="Quay lại đầu"
            style={{ padding: '6px', borderRadius: '8px' }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Timeline Ruler */}
      <div style={{ position: 'relative', width: '100%', height: '22px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--theme-text-secondary)', paddingLeft: '140px' }}>
          {timeMarkers.map((sec) => (
            <span key={sec}>{sec}s</span>
          ))}
        </div>

        {/* Playhead Scrub Indicator */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: '-200px',
            left: `calc(140px + ((100% - 140px) * ${currentTime / totalDuration}))`,
            width: '2px',
            background: 'var(--theme-primary)',
            boxShadow: '0 0 8px var(--theme-primary)',
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--theme-primary)',
              transform: 'translate(-4px, -4px)',
            }}
          />
        </div>
      </div>

      {/* Tracks Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {elements.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', padding: '12px 0', textAlign: 'center' }}>
            Chưa có phần tử nào trong màn này để hiển thị trên dòng thời gian.
          </div>
        ) : (
          elements.map((el) => {
            const isSelected = el.id === selectedElementId;
            const delayPercent = (el.animation.delay / totalDuration) * 100;
            const durationPercent = (el.animation.duration / totalDuration) * 100;

            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '34px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid var(--theme-primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Element Name Label */}
                <div
                  style={{
                    width: '140px',
                    padding: '0 10px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 600 : 400,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    flexShrink: 0,
                    color: isSelected ? '#ffffff' : 'var(--theme-text-secondary)',
                  }}
                >
                  {el.name}
                </div>

                {/* Visual Bar Track */}
                <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      bottom: '6px',
                      left: `${delayPercent}%`,
                      width: `${Math.min(durationPercent, 100 - delayPercent)}%`,
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
                      boxShadow: '0 0 10px var(--theme-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#ffffff',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Sparkles size={10} style={{ marginRight: '4px' }} />
                    <span>{el.animation.entrance} ({el.animation.duration}s)</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
