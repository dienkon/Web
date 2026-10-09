
import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';

export const PerformanceHUD: React.FC = () => {
  const [fps, setFps] = useState(60);
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const currentFps = (frameCount * 1000) / (now - lastTime);
        setFps(Math.round(currentFps));
        frameCount = 0;
        lastTime = now;

        // Auto quality adjustment logic
        if (settings.graphicsQuality === 'auto') {
           if (currentFps < 30) {
              updateSettings({ graphicsQuality: 'low' });
           } else if (currentFps < 45) {
              updateSettings({ graphicsQuality: 'medium' });
           }
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [settings.graphicsQuality, updateSettings]);

  return (
    <div className="fixed top-0 left-0 bg-black/50 text-white p-2 text-xs z-50 pointer-events-none rounded-br-lg">
      FPS: {fps} | Preset: {settings.graphicsQuality}
    </div>
  );
};
