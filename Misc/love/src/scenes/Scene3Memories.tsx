import React, { useState } from 'react';
import { X, Calendar, MapPin, ChevronRight, Maximize2 } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { LoveStory, MemoryItem } from '../models/LoveStory';

interface Scene3MemoriesProps {
  story: LoveStory;
  onNext: () => void;
}

export const Scene3Memories: React.FC<Scene3MemoriesProps> = ({ story, onNext }) => {
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const memories = story.memories.length > 0 ? story.memories : [];

  const handleOpenLightbox = (m: MemoryItem) => {
    soundManager.playClick();
    setSelectedMemory(m);
  };

  const handleCloseLightbox = () => {
    soundManager.playClick();
    setSelectedMemory(null);
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
        maxWidth: '1040px',
        margin: '0 auto',
      }}
    >
      <h2
        className="font-display"
        style={{
          fontSize: 'clamp(2rem, 4.5vw, 3rem)',
          fontWeight: 600,
          marginBottom: '12px',
          background: 'linear-gradient(180deg, #ffffff 60%, var(--theme-text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Vũ Trụ Kỷ Niệm
      </h2>

      <p
        style={{
          fontSize: '1rem',
          color: 'var(--theme-text-secondary)',
          marginBottom: '40px',
          maxWidth: '520px',
        }}
      >
        Mỗi bức ảnh lưu giữ một mảnh ghép ký ức mà mình luôn muốn nâng niu mãi mãi.
      </p>

      {/* Floating Polaroids Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '28px',
          width: '100%',
          marginBottom: '44px',
        }}
      >
        {memories.map((item, index) => {
          // slight alternating rotations for polaroid effect
          const rotations = [-2.5, 3, -1.8, 2.2];
          const rotation = rotations[index % rotations.length];

          return (
            <div
              key={item.id}
              onClick={() => handleOpenLightbox(item)}
              className="glass-card cursor-photo"
              style={{
                padding: '14px',
                borderRadius: '16px',
                cursor: 'pointer',
                transform: `rotate(${rotation}deg)`,
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
              }}
              onMouseEnter={(e) => {
                soundManager.playHover();
                e.currentTarget.style.transform = 'scale(1.05) rotate(0deg) translateY(-8px)';
                e.currentTarget.style.zIndex = '20';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `rotate(${rotation}deg)`;
                e.currentTarget.style.zIndex = '1';
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '14px',
                  position: 'relative',
                }}
              >
                <img
                  src={item.image}
                  alt={item.title || 'Kỷ niệm'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Maximize2 size={14} />
                </div>
              </div>

              <h4
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: 'var(--theme-text-primary)',
                  marginBottom: '6px',
                  textAlign: 'left',
                }}
              >
                {item.title || 'Khoảnh khắc ngọt ngào'}
              </h4>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '12px',
                  color: 'var(--theme-text-secondary)',
                  textAlign: 'left',
                }}
              >
                {item.date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} color="var(--theme-primary)" />
                    {item.date}
                  </span>
                )}
                {item.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="var(--theme-accent)" />
                    {item.location}
                  </span>
                )}
              </div>
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
        <span>Khám phá tiếp</span>
        <ChevronRight size={18} />
      </button>

      {/* Cinematic Fullscreen Lightbox Modal */}
      {selectedMemory && (
        <div
          onClick={handleCloseLightbox}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'inkReveal 0.3s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              maxWidth: '680px',
              width: '100%',
              borderRadius: '24px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseLightbox}
              className="glass-button"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <X size={20} />
            </button>

            <img
              src={selectedMemory.image}
              alt={selectedMemory.title}
              style={{
                width: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                background: 'rgba(0,0,0,0.5)',
              }}
            />

            <div style={{ padding: '24px', textAlign: 'left' }}>
              <h3
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--theme-text-primary)',
                }}
              >
                {selectedMemory.title}
              </h3>

              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '13px',
                  color: 'var(--theme-text-secondary)',
                  marginBottom: '14px',
                }}
              >
                {selectedMemory.date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} color="var(--theme-primary)" />
                    {selectedMemory.date}
                  </span>
                )}
                {selectedMemory.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="var(--theme-accent)" />
                    {selectedMemory.location}
                  </span>
                )}
              </div>

              {selectedMemory.description && (
                <p
                  style={{
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    color: 'var(--theme-text-secondary)',
                  }}
                >
                  {selectedMemory.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
