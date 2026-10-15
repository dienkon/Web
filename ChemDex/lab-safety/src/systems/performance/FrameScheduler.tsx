import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import { isSceneInputBlocked } from '../input/sceneInput';

export function FrameScheduler() {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    let frame = 0;
    let nextFrame = 0;
    let disposed = false;
    const tick = (time: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      if (document.hidden) {
        nextFrame = time;
        return;
      }
      const state = useStore.getState();
      const quality = state.settings.graphicsQuality;
      const activeRate = quality === 'potato' ? 30 : quality === 'low' ? 40 : 60;
      const fps = state.cinematic ? activeRate : isSceneInputBlocked(state) ? 15 : activeRate;
      const interval = 1000 / fps;
      if (time + .5 < nextFrame) return;
      if (nextFrame === 0 || time - nextFrame > interval * 3) nextFrame = time;
      nextFrame += interval;
      invalidate();
    };
    const visible = () => {
      nextFrame = 0;
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', visible);
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [invalidate]);
  return null;
}
