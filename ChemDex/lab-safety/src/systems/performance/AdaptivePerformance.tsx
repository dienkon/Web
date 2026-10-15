import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import { isSceneInputBlocked } from '../input/sceneInput';

const PRESET_DPR = {
  potato: .7,
  low: .85,
  medium: 1,
  high: 1.25,
  ultra: 1.5,
  auto: 1,
};

export function AdaptivePerformance() {
  const { setDpr } = useThree();
  const quality = useStore(state => state.settings.graphicsQuality);
  const sample = useRef({ elapsed: 0, frames: 0, dpr: 1, slow: 0, fast: 0, warmup: 3 });
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, PRESET_DPR[quality]);
    sample.current = { elapsed: 0, frames: 0, dpr, slow: 0, fast: 0, warmup: 3 };
    setDpr(dpr);
  }, [quality, setDpr]);
  useFrame((_, delta) => {
    const state = useStore.getState();
    const current = sample.current;
    if (quality !== 'auto' || document.hidden) return;
    // Menus deliberately render at 15 fps. Never interpret that limit as GPU overload.
    if (isSceneInputBlocked(state) && !state.cinematic) {
      current.elapsed = 0;
      current.frames = 0;
      return;
    }
    if (current.warmup > 0) {
      current.warmup -= delta;
      return;
    }
    if (delta > .25) return;
    current.elapsed += delta;
    current.frames++;
    if (current.elapsed < 2) return;
    const fps = current.frames / current.elapsed;
    current.slow = fps < 46 ? current.slow + 1 : 0;
    current.fast = fps > 57 ? current.fast + 1 : 0;
    if (current.slow >= 2 && current.dpr > .7) {
      current.dpr = Math.max(.7, current.dpr - .1);
      current.slow = 0;
      current.fast = 0;
      setDpr(current.dpr);
    } else if (current.fast >= 4 && current.dpr < Math.min(1.25, window.devicePixelRatio || 1)) {
      current.dpr = Math.min(1.25, window.devicePixelRatio || 1, current.dpr + .1);
      current.fast = 0;
      setDpr(current.dpr);
    }
    current.elapsed = 0;
    current.frames = 0;
  });
  return null;
}
