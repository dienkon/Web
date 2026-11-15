import { useEffect, useSyncExternalStore } from 'react';
import { useStore } from '../../store/useStore';
import { inputManager } from '../../systems/input/InputManager';
import '../../styles/platform-navigation.css';

let navigationOpen = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => navigationOpen;
const setNavigationOpen = (open: boolean) => {
  if (navigationOpen === open) return;
  navigationOpen = open;
  listeners.forEach(listener => listener());
};
export const usePlatformNavigationOpen = () => useSyncExternalStore(subscribe, getSnapshot, () => false);

/** The platform injects its shared navigation after this app's bundle loads. */
export function PlatformNavigationBridge() {
  useEffect(() => {
    const html = document.documentElement;
    const app = document.getElementById('root');
    const previouslyInert = app?.inert ?? false;
    let blocking = false;
    const sync = () => {
      const sidebar = document.getElementById('chemdex-sidebar');
      const toggle = document.querySelector<HTMLButtonElement>('.cd-mobile-toggle');
      const overlay = document.querySelector<HTMLElement>('.cd-mobile-overlay');
      if (!sidebar || !toggle) return;
      sidebar.setAttribute('data-ui', '');
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      toggle.setAttribute('data-ui', '');
      overlay?.setAttribute('data-ui', '');
      const open = html.classList.contains('cd-menu-open');
      if (open === blocking) return;
      blocking = open;
      setNavigationOpen(open);
      if (app) app.inert = open || previouslyInert;
      if (open) {
        inputManager.resetAll();
        if (document.pointerLockElement) document.exitPointerLock();
      }
      useStore.setState(state => ({ sceneModalCount: Math.max(0, state.sceneModalCount + (open ? 1 : -1)) }));
    };
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { childList: true });
    sync();
    return () => {
      observer.disconnect();
      setNavigationOpen(false);
      if (app) app.inert = previouslyInert;
      if (blocking) useStore.setState(state => ({ sceneModalCount: Math.max(0, state.sceneModalCount - 1) }));
    };
  }, []);
  return null;
}
