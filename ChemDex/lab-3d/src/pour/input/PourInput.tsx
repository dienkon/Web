import React, { useState, useEffect, useRef } from 'react';
import { PourController } from '../controller/PourController';
import { PourSessionState } from '../controller/modes';
import { useAppStore } from '../../store/useAppStore';
import { RotateCw, Play, Square } from 'lucide-react';
import { getHandleLimits } from '../../handling/limits';

export const PourInput = React.memo(function PourInput() {
  const [session, setSession] = useState<PourSessionState | null>(null);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const nearestPourTargetId = useAppStore(state => state.nearestPourTargetId);
  const isPouringButtonActive = useRef(false);
  const heldSessionId = useRef<string | null>(null);
  const spaceSessionId = useRef<string | null>(null);
  const lang = useAppStore(state => state.language);
  const sourceType = useAppStore(state => state.vessels[session?.sourceId ?? selectedVesselId ?? '']?.type);
  const maxTilt = getHandleLimits(sourceType).tilt[1];

  useEffect(() => {
    return PourController.subscribe(s => setSession(s));
  }, []);

  // Keyboard controls: Q/E or ArrowLeft/ArrowRight to tilt, Space to pour, Esc to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('input, textarea, select, button'))) return;

      const current = PourController.getSession();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
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
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (current) {
          PourController.setTilt(Math.max(0, current.targetTilt - 0.08));
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;
        if (!current && selectedVesselId && nearestPourTargetId) {
          PourController.beginPour({
            mode: 'ASSIST',
            sourceId: selectedVesselId,
            targetId: nearestPourTargetId
          });
        }
        PourController.useAssistedTilt();
        spaceSessionId.current = PourController.getSession()?.id ?? null;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        if (spaceSessionId.current === PourController.getSession()?.id) PourController.stopPour();
        spaceSessionId.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const onBlur = () => PourController.stopPour();
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [selectedVesselId, nearestPourTargetId]);

  // Touch / Hold-to-Pour controls: smooth progressive tilt
  const holdIntervalRef = useRef<any>(null);

  const handleHoldStart = () => {
    isPouringButtonActive.current = true;
    let target = 0.65;
    const current = PourController.getSession();
    if (current) {
      PourController.setTilt(target);
    } else if (selectedVesselId && nearestPourTargetId) {
      PourController.beginPour({
        mode: 'ASSIST',
        sourceId: selectedVesselId,
        targetId: nearestPourTargetId
      });
      PourController.setTilt(target);
    }
    heldSessionId.current = PourController.getSession()?.id ?? null;

    // Slowly increase tilt if user keeps holding
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => {
      const sess = PourController.getSession();
      if (!sess || sess.id !== heldSessionId.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        isPouringButtonActive.current = false;
        return;
      }
      target = Math.min(maxTilt, target + 0.04);
      PourController.setTilt(target);
    }, 120);
  };

  const handleHoldEnd = () => {
    if (!isPouringButtonActive.current) return;
    isPouringButtonActive.current = false;
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (heldSessionId.current === PourController.getSession()?.id) PourController.stopPour();
    heldSessionId.current = null;
  };

  useEffect(() => {
    const release = () => handleHoldEnd();
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('blur', release);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (isPouringButtonActive.current && heldSessionId.current === PourController.getSession()?.id) PourController.stopPour();
    };
  }, []);

  // If a vessel is actively selected and near another vessel, or actively pouring:
  const canShowControls = !!session || (!!selectedVesselId && !!nearestPourTargetId);
  if (!canShowControls) return null;

  const currentDeg = session ? Math.round((session.tilt * 180) / Math.PI) : 0;

  return (
    <div 
      className="fixed right-6 bottom-24 z-40 flex flex-col items-end gap-3 select-none"
      onWheel={(e) => {
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.04 : -0.04;
        const current = PourController.getSession();
        if (current) {
          PourController.setTilt(Math.max(0, Math.min(maxTilt, current.targetTilt + delta)));
        } else if (selectedVesselId && nearestPourTargetId && delta > 0) {
          PourController.beginPour({
            mode: 'ASSIST',
            sourceId: selectedVesselId,
            targetId: nearestPourTargetId
          });
          PourController.setTilt(0.5);
        }
      }}
    >
      {/* 2D Touch Tilt Dial / Speed Controller */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2">
        <div className="flex items-center justify-between w-full text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'vi' ? 'Độ nghiêng & Tốc độ rót' : 'Tilt & Flow Rate'}</span>
          </div>
          <span className="font-mono text-amber-400 font-bold">{currentDeg}°</span>
        </div>

        {/* Rotary Range Slider */}
        <input
          type="range"
          min="0"
          max={Math.round(maxTilt * 180 / Math.PI)}
          value={session ? Math.round(session.targetTilt * 180 / Math.PI) : 0}
          onChange={(e) => {
            const rad = (parseFloat(e.target.value) * Math.PI) / 180;
            if (session) {
              PourController.setTilt(rad);
            } else if (selectedVesselId && nearestPourTargetId) {
              PourController.beginPour({
                mode: 'ASSIST',
                sourceId: selectedVesselId,
                targetId: nearestPourTargetId
              });
              PourController.setTilt(rad);
            }
          }}
          className="w-44 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />

        {/* Tilt Speed Presets */}
        <div className="flex gap-1 w-full pt-1">
          {[
            { label: lang === 'vi' ? 'Chậm' : 'Slow', deg: 35, rad: 0.61 },
            { label: lang === 'vi' ? 'Vừa' : 'Medium', deg: 48, rad: 0.84 },
            { label: lang === 'vi' ? 'Nhanh' : 'Fast', deg: 65, rad: 1.13 },
            { label: lang === 'vi' ? 'Mạnh' : 'Max', deg: 78, rad: 1.36 }
          ].map(p => (
            <button
              key={p.deg}
              onClick={() => {
                if (session) {
                  PourController.setTilt(p.rad);
                } else if (selectedVesselId && nearestPourTargetId) {
                  PourController.beginPour({
                    mode: 'ASSIST',
                    sourceId: selectedVesselId,
                    targetId: nearestPourTargetId
                  });
                  PourController.setTilt(p.rad);
                }
              }}
              className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition-colors border border-slate-700/60"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Large Tactile "Hold to Pour" Button */}
      <button
        onPointerDown={(event) => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); handleHoldStart(); }}
        onPointerUp={handleHoldEnd}
        onPointerCancel={handleHoldEnd}
        onLostPointerCapture={handleHoldEnd}
        title={lang === 'vi' ? 'Rót dịch phía trên; cặn lắng được giữ trong bình nguồn.' : 'Decant the liquid; settled solids remain in the source.'}
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
