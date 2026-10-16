import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { create } from 'zustand';

interface FrameStats {
  fps: number;
  ms: number;
  p95_ms: number;
  drawCalls: number;
  triangles: number;
  samples: number;
}
export const useFrameStats = create<FrameStats>(() => ({ fps: 0, ms: 0, p95_ms: 0, drawCalls: 0, triangles: 0, samples: 0 }));

export function summarizeFrames(values: ArrayLike<number>, count = values.length) {
  const sorted = Array.from(values).slice(0, count).filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return { fps: 0, ms: 0, p95_ms: 0, samples: 0 };
  const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return { fps: Math.round(1000 / average), ms: Math.round(average * 10) / 10,
    p95_ms: Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1] * 10) / 10, samples: sorted.length };
}

/** Samples the R3F loop, publishing once a second. Hidden tabs reset the
 * sampling window instead of counting background RAF throttling as lag. */
export function FrameTelemetry() {
  const samples = useRef(new Float32Array(240));
  const count = useRef(0);
  const elapsed = useRef(0);
  useFrame(({ gl }, delta) => {
    if (document.hidden || delta > 0.5) { count.current = 0; elapsed.current = 0; return; }
    if (!Number.isFinite(delta) || delta <= 0) return;
    samples.current[count.current++] = delta * 1000;
    elapsed.current += delta;
    if (elapsed.current >= 1 || count.current === samples.current.length) {
      useFrameStats.setState({ ...summarizeFrames(samples.current, count.current),
        drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles });
      count.current = 0;
      elapsed.current = 0;
    }
  });
  return null;
}
