import React from 'react';
import { useStore } from '../../../store/useStore';

export const PPEOverlay: React.FC = () => {
  const view = useStore((s) => s.view);
  const player = useStore((s) => s.player);

  if (view !== 'game') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* 1. Goggles Frame Overlay: subtle tinted periphery & frame borders */}
      {player.equipment.hasGoggles && (
        <div className="absolute inset-0">
          {/* Subtle curved vignette & blue-tinted protective border */}
          <div
            className="absolute inset-0 opacity-40 transition-opacity duration-700"
            style={{
              boxShadow: 'inset 0 0 120px 40px rgba(14, 165, 233, 0.25)',
              border: '18px solid rgba(15, 23, 42, 0.45)',
              borderRadius: '60px',
            }}
          />
          {/* Slight lens reflection on top corner */}
          <div className="absolute top-6 left-12 w-48 h-12 bg-white/10 blur-xl rotate-12 rounded-full" />
        </div>
      )}

      {/* 2. Mask breathing border at the bottom */}
      {player.equipment.hasMask && (
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-900/40 via-sky-950/20 to-transparent backdrop-blur-[0.5px]" />
      )}
    </div>
  );
};
