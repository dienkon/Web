import { useEffect, useRef } from 'react';
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import { create } from 'zustand';
import { AdaptiveQualityController } from './adaptiveQuality';
import { useQualityStore } from '../vfx/quality';

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

/** Samples complete frames, including all scene and postprocessing passes.
 * Hidden tabs reset the window rather than counting background throttling. */
export function FrameTelemetry() {
  const gl = useThree(state => state.gl);
  const samples = useRef(new Float32Array(240));
  const count = useRef(0);
  const elapsed = useRef(0);
  const publish = useRef(false);
  const qualityController = useRef(new AdaptiveQualityController());
  useEffect(() => {
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    const resetWindow = () => {
      count.current = 0; elapsed.current = 0; publish.current = false;
      qualityController.current.reset();
    };
    const restoreCounters = () => {
      // Three replaces renderer.info when rebuilding a lost WebGL context.
      gl.info.autoReset = false;
      resetWindow();
    };
    document.addEventListener?.('visibilitychange', resetWindow);
    gl.domElement?.addEventListener('webglcontextrestored', restoreCounters);
    const unsubscribe = addAfterEffect(() => {
      if (!publish.current) return;
      publish.current = false;
      const summary = summarizeFrames(samples.current, count.current);
      useFrameStats.setState({ ...summary,
        drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles });
      const quality = useQualityStore.getState();
      if (quality.preference === 'auto' && quality.rendererClass !== 'software') {
        const adjustment = qualityController.current.sample(summary, quality.effectiveTier);
        if (adjustment === 'decline') quality.handlePerformanceDecline();
        if (adjustment === 'incline') quality.handlePerformanceIncline();
      } else qualityController.current.reset();
      count.current = 0;
      elapsed.current = 0;
    });
    return () => {
      unsubscribe();
      document.removeEventListener?.('visibilitychange', resetWindow);
      gl.domElement?.removeEventListener('webglcontextrestored', restoreCounters);
      gl.info.autoReset = autoReset; gl.info.reset();
    };
  }, [gl]);
  useFrame((_, delta) => {
    // Negative priority leaves rendering to R3F/the composer. Reset before
    // frame callbacks; read after rendering so the final quad cannot hide
    // the scene, shadows and other passes from the HUD.
    gl.info.reset();
    publish.current = false;
    if (document.hidden) {
      count.current = 0; elapsed.current = 0;
      qualityController.current.reset();
      return;
    }
    if (!Number.isFinite(delta) || delta <= 0) return;
    samples.current[count.current++] = delta * 1000;
    elapsed.current += delta;
    if (elapsed.current >= 1 || count.current === samples.current.length) {
      publish.current = true;
    }
  }, -Infinity);
  return null;
}
