import React, { useState, useEffect, useRef } from 'react';
import { PourController } from '../controller/PourController';
import { PourSessionState } from '../controller/modes';
import { useAppStore } from '../../store/useAppStore';
import { RotateCw, Play, Square } from 'lucide-react';

export const PourInput = React.memo(function PourInput() {
  const [session, setSession] = useState<PourSessionState | null>(null);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const nearestPourTargetId = useAppStore(state => state.nearestPourTargetId);
  const isPouringButtonActive = useRef(false);
  const lang = useAppStore(state => state.language);

  useEffect(() => {
    return PourController.subscribe(s => setSession(s));
  }, []);

  // Keyboard controls: Q/E or ArrowLeft/ArrowRight to tilt, Space to pour, Esc to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const current = PourController.getSession();
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        if (current) {
          PourController.setTilt(current.targetTilt + 0.08);
        } else if (selectedVesselId && nearestPourTargetId) {
          PourController.beginPour({
            mode: 'HAND_TILT',
            sourceId: selectedVesselId,
            targetId: nearestPourTargetId
          });
          PourController.setTilt(0.2);
        }
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        if (current) {
          PourController.setTilt(Math.max(0, current.targetTilt - 0.08));
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (current) {
          PourController.setTilt(1.15); // ~66 degrees optimal weir pour angle
        } else if (selectedVesselId && nearestPourTargetId) {
          PourController.beginPour({
            mode: 'ASSIST',
            sourceId: selectedVesselId,
            targetId: nearestPourTargetId
          });
          PourController.setTilt(1.15);
        }
      } else if (e.key === 'Escape') {
        PourController.cancelPour();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        const current = PourController.getSession();
        if (current) {
          PourController.setTilt(0);
          setTimeout(() => {
            PourController.commitCurrentPour();
          }, 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedVesselId, nearestPourTargetId]);

  // Touch / Hold-to-Pour controls
  const handleHoldStart = () => {
    isPouringButtonActive.current = true;
    const current = PourController.getSession();
    if (current) {
      PourController.setTilt(1.18);
    } else if (selectedVesselId && nearestPourTargetId) {
      PourController.beginPour({
        mode: 'ASSIST',
        sourceId: selectedVesselId,
        targetId: nearestPourTargetId
      });
      PourController.setTilt(1.18);
    }
  };

  const handleHoldEnd = () => {
    isPouringButtonActive.current = false;
    const current = PourController.getSession();
    if (current) {
      PourController.setTilt(0);
      setTimeout(() => {
        PourController.commitCurrentPour();
      }, 350);
    }
  };

  // If a vessel is actively selected and near another vessel, or actively pouring:
  const canShowControls = !!session || (!!selectedVesselId && !!nearestPourTargetId);
  if (!canShowControls) return null;

  return (
    <div className="fixed right-6 bottom-24 z-40 flex flex-col items-end gap-3 select-none">
      {/* 2D Touch Tilt Dial / Slider for Touchscreen & Mobile Devices */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'vi' ? 'Độ nghiêng' : 'Tilt Dial'}</span>
        </div>

        {/* Rotary Range Slider */}
        <input
          type="range"
          min="0"
          max="80"
          value={session ? Math.round((session.tilt * 180) / Math.PI) : 0}
          onChange={(e) => {
            const rad = (parseFloat(e.target.value) * Math.PI) / 180;
            if (session) {
              PourController.setTilt(rad);
            } else if (selectedVesselId && nearestPourTargetId) {
              PourController.beginPour({
                mode: 'HAND_TILT',
                sourceId: selectedVesselId,
                targetId: nearestPourTargetId
              });
              PourController.setTilt(rad);
            }
          }}
          className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />

        <div className="flex justify-between w-full text-[10px] text-slate-400 px-1 font-mono">
          <span>0°</span>
          <span>45°</span>
          <span>80°</span>
        </div>
      </div>

      {/* Large Tactile "Hold to Pour" Button for Mobile & Tablets */}
      <button
        onPointerDown={handleHoldStart}
        onPointerUp={handleHoldEnd}
        onPointerLeave={handleHoldEnd}
        className={`px-5 py-3 rounded-2xl font-semibold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 touch-none ${
          session && session.flow_ml_s > 0
            ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/40'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        }`}
      >
        {session && session.flow_ml_s > 0 ? (
          <>
            <Square className="w-4 h-4 fill-current" />
            <span>{lang === 'vi' ? 'Thả để ngừng' : 'Release to Stop'}</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>{lang === 'vi' ? 'Giữ để rót' : 'Hold to Pour'}</span>
          </>
        )}
      </button>
    </div>
  );
});
