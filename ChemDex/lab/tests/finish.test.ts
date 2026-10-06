import { describe, it, expect } from 'vitest';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library/index';

/**
 * Simulates normalized reaction progress xi(t) from t=0 to t=duration_s.
 * At t >= duration_s (or xi >= xi_max), returns active effect intensity.
 */
function evaluateReactionEffectsAtTime(
  duration_s: number,
  currentTime_s: number,
  timeline: Array<{ window: [number, number]; intensity: any }>
): {
  progress: number;
  activeAtomCount: number;
  totalTransientIntensity: number;
} {
  const normTime = Math.min(1.0, Math.max(0.0, currentTime_s / duration_s));
  let activeAtomCount = 0;
  let totalTransientIntensity = 0;

  for (const atom of timeline) {
    const [start, end] = atom.window;
    if (normTime >= start && normTime < end) {
      activeAtomCount++;
      const val = typeof atom.intensity === 'number' ? atom.intensity : 1.0;
      totalTransientIntensity += val;
    }
  }

  return {
    progress: normTime,
    activeAtomCount,
    totalTransientIntensity
  };
}

describe('Reaction Termination & xi_max Completion Suite (§5.5 & §11.1)', () => {
  it('guarantees that every handcrafted reaction program finishes cleanly at t >= duration_s with 0 active transient atoms', () => {
    for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
      const dur = prog.visual.duration_s;
      expect(dur).toBeGreaterThan(0);

      // Midpoint: effects should typically be active
      const mid = evaluateReactionEffectsAtTime(dur, dur * 0.5, prog.visual.timeline);
      expect(mid.progress).toBe(0.5);

      // Finish point: at t = dur * 1.05 (beyond completion), ALL effects MUST be terminated
      const finished = evaluateReactionEffectsAtTime(dur, dur * 1.05, prog.visual.timeline);
      expect(finished.progress, `Program ${prog.id} progress at finish`).toBe(1.0);
      expect(
        finished.activeAtomCount,
        `Program ${prog.id} still has ${finished.activeAtomCount} active atoms after duration ended (infinite loop bug)`
      ).toBe(0);
      expect(finished.totalTransientIntensity).toBe(0);
    }
  });

  it('guarantees that every program defines a complete AfterState once reaction reaches xi_max', () => {
    for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
      const after = prog.visual.after;
      expect(after, `Program ${prog.id} missing after state`).toBeDefined();
      expect(after.liquidColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(after.liquidOpacity).toBeGreaterThanOrEqual(0);
      expect(after.liquidOpacity).toBeLessThanOrEqual(1.0);
      expect(after.turbidity).toBeGreaterThanOrEqual(0);
      expect(after.turbidity).toBeLessThanOrEqual(1.0);

      // If precipitate formed, verify valid morphology and color
      if (after.precipitate) {
        expect(after.precipitate.substance).toBeTruthy();
        expect(after.precipitate.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(after.precipitate.morphology).toBeTruthy();
      }
    }
  });
});
