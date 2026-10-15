import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { inputManager } from '../systems/input/InputManager';

export function useScenarioModal(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (document.pointerLockElement) document.exitPointerLock();
    inputManager.resetAll();
    useStore.setState(state => ({ sceneModalCount: state.sceneModalCount + 1 }));
    return () => {
      inputManager.resetAll();
      useStore.setState(state => ({ sceneModalCount: Math.max(0, state.sceneModalCount - 1) }));
      previous?.focus({ preventScroll: true });
    };
  }, [open]);
}
