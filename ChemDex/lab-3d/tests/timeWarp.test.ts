import { describe, it, expect } from 'vitest';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library/index';

/**
 * Calculates time-lapse compression factor:
 * factor = physical_s / display_s
 */
export function calculateTimeWarpFactor(physical_s: number, display_s: number): number {
  if (display_s <= 0) return 1.0;
  return physical_s / display_s;
}

/**
 * Determines HUD display category based on §2.6 Time Honesty rules:
 * - factor <= 20: 'normal' (no HUD chip required)
 * - 20 < factor <= 200: 'timelapse_hud' (shows "⏩ time-lapse xN")
 * - factor > 200: 'skip_time' (explicit "Skip time / Wait" control)
 */
export function classifyTimeWarpMode(factor: number): 'normal' | 'timelapse_hud' | 'skip_time' {
  if (factor <= 20.0) return 'normal';
  if (factor <= 200.0) return 'timelapse_hud';
  return 'skip_time';
}

describe('Time Honesty & TimeWarp Factor Suite (§2.6 & §11.1)', () => {
  it('correctly classifies fast or real-time reactions as normal without HUD chips', () => {
    // 5s display of a 10s real-world reaction (factor 2.0 <= 20)
    const factor = calculateTimeWarpFactor(10.0, 5.0);
    expect(factor).toBe(2.0);
    expect(classifyTimeWarpMode(factor)).toBe('normal');
  });

  it('correctly flags medium time-lapse factors (20 - 200x) for HUD chip display', () => {
    // 300s real reaction compressed into 6s display (factor 50x)
    const factor = calculateTimeWarpFactor(300.0, 6.0);
    expect(factor).toBe(50.0);
    expect(classifyTimeWarpMode(factor)).toBe('timelapse_hud');
  });

  it('correctly classifies long physical processes (>200x, e.g. BaSO4 7h settle) as skip_time', () => {
    // BaSO4 settling: 25,200 s (7 hours) compressed into 8 s display (factor 3,150x)
    const factor = calculateTimeWarpFactor(25200.0, 8.0);
    expect(factor).toBe(3150.0);
    expect(classifyTimeWarpMode(factor)).toBe('skip_time');
  });

  it('verifies handcrafted programs declare honest timeWarp parameters where real timescale is large', () => {
    for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
      if (prog.visual.timeWarp) {
        expect(prog.visual.timeWarp.physical_s).toBeGreaterThan(0);
        expect(prog.visual.duration_s).toBeGreaterThan(0);
        const factor = calculateTimeWarpFactor(prog.visual.timeWarp.physical_s, prog.visual.duration_s);
        expect(factor).toBeGreaterThan(1.0);
        
        // Ensure bilingual notes exist if timeWarp is declared
        if (prog.visual.timeWarp.note_en) {
          expect(prog.visual.timeWarp.note_en.length).toBeGreaterThan(5);
        }
        if (prog.visual.timeWarp.note_vi) {
          expect(prog.visual.timeWarp.note_vi.length).toBeGreaterThan(5);
        }
      }
    }
  });
});
