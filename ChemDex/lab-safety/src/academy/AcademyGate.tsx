import React, { lazy, Suspense, useEffect } from 'react';
import { useAcademy } from './core/store';
import { useStore } from '../store/useStore';
import { isSceneInputBlocked } from '../systems/input/sceneInput';

const AcademyHub = lazy(() => import('./AcademyHub'));

export function AcademyGate() {
  const open = useAcademy(state => state.open);
  const view = useStore(state => state.view);
  useEffect(() => {
    const launch = () => {
      const state = useStore.getState();
      if (state.view === 'start' || !isSceneInputBlocked()) useAcademy.getState().openHub();
    };
    window.addEventListener('lab-open-academy', launch);
    return () => window.removeEventListener('lab-open-academy', launch);
  }, []);
  useEffect(() => {
    if (!open) return;
    useStore.setState(state => ({ sceneModalCount: state.sceneModalCount + 1 }));
    return () => {
      useStore.setState(state => ({ sceneModalCount: Math.max(0, state.sceneModalCount - 1) }));
    };
  }, [open]);
  if (open) {
    return (
      <Suspense fallback={<div role="status" className="fixed inset-0 z-[2000] grid place-items-center bg-white text-cyan-700">Đang mở học viện ChemDex…</div>}>
        <AcademyHub />
      </Suspense>
    );
  }
  if (view !== 'start') return null;
  return (
    <button
      type="button"
      data-open-academy
      className={`fixed z-40 rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm font-bold text-cyan-700 shadow-sm ${view === 'start' ? 'bottom-5 right-5' : 'bottom-56 right-4'}`}
      onClick={() => window.dispatchEvent(new Event('lab-open-academy'))}
    >
      🎮 Học viện · 44 thử thách
    </button>
  );
}
