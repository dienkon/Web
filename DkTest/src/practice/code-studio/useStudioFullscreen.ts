import { useEffect, useRef, useState } from 'react';
export function useStudioFullscreen() {
  const root = useRef<HTMLElement>(null), [fullscreen, setFullscreen] = useState(false);
  async function toggle() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current?.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* Keep the full-viewport layout on unsupported browsers. */ }
  }
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === root.current);
    const firstTouch = (event: PointerEvent) => {
      if (window.innerWidth >= 900 || !event.isTrusted || !(event.target as HTMLElement).closest('.studio-main') || document.fullscreenElement) return;
      document.removeEventListener('pointerup', firstTouch, true);
      void root.current?.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
    };
    document.addEventListener('fullscreenchange', changed); document.addEventListener('pointerup', firstTouch, true);
    return () => { document.removeEventListener('fullscreenchange', changed); document.removeEventListener('pointerup', firstTouch, true); };
  }, []);
  return { root, fullscreen, toggle };
}
