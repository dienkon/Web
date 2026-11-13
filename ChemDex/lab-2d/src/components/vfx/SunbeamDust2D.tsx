import React, { useEffect, useRef } from 'react';
import { useLabEnvironment } from '../../store/useLabEnvironment';

interface DustMote {
  x: number;
  y: number;
  r: number;
  alpha: number;
  vx: number;
  vy: number;
  phase: number;
}

export const SunbeamDust2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labTheme = useLabEnvironment((s) => s.labTheme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const motes: DustMote[] = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.78,
      r: 0.7 + Math.random() * 1.4,
      alpha: 0.14 + Math.random() * 0.28,
      vx: (Math.random() - 0.35) * 0.012,
      vy: (Math.random() - 0.5) * 0.008,
      phase: Math.random() * Math.PI * 2,
    }));

    let rafId = 0;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.005, (now - lastTime) / 1000));
      lastTime = now;

      const parent = canvas.parentElement;
      if (parent && !document.hidden) {
        const w = Math.max(320, parent.clientWidth);
        const h = Math.max(240, parent.clientHeight);
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        const pw = Math.floor(w * dpr);
        const ph = Math.floor(h * dpr);
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw;
          canvas.height = ph;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const env = useLabEnvironment.getState().environment;
          const windPush = env.airSpeed_m_s * 0.045;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);

          for (const m of motes) {
            m.phase += dt * 1.4;
            m.x += (m.vx + windPush) * dt;
            m.y += (m.vy + Math.sin(m.phase) * 0.004) * dt;
            if (m.x > 1.04) m.x = -0.04;
            if (m.x < -0.04) m.x = 1.04;
            if (m.y > 0.78) m.y = 0.02;
            if (m.y < 0.02) m.y = 0.76;

            const px = m.x * w;
            const py = m.y * h;
            const beamGlow = Math.max(0.15, 1 - Math.abs(m.x - 0.38 - m.y * 0.28) * 1.8);
            const a = m.alpha * beamGlow * (labTheme === 'dark' ? 0.55 : 0.9);
            if (a <= 0.02) continue;

            ctx.fillStyle = labTheme === 'dark'
              ? `rgba(148, 224, 255, ${a})`
              : `rgba(255, 251, 235, ${a})`;
            ctx.beginPath();
            ctx.arc(px, py, m.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [labTheme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
    />
  );
};
