import { describe, expect, it } from 'vitest';
import { getProgramById } from '../src/vfx/programs/library';
import { CuSo4Nh3MultiStageController, Al2So43NaOhAmphotericController } from '../src/vfx/reactions/controllers/PrecipitationControllers';
import type { ReactionContext, ReactionRuntime } from '../src/vfx/reactions/types';
import { summarizeFrames } from '../src/render/FrameTelemetry';

function context(amounts: Record<string, number>): ReactionContext {
  return {
    vessel: {} as ReactionContext['vessel'], dt: 1 / 60, timeScale: 1,
    runtime: { elapsed: 0, progress: 0, turbidity: 0, precipitateRate: 0, reactantAvailability: amounts, customData: {} } as ReactionRuntime,
    addSurfaceImpulse() {}, emitBurst() {}, emitSparks() {}, playSound() {},
  };
}

describe('Observable chemistry regressions', () => {
  it('does not draw gas or visible steam for dilute neutralization', () => {
    for (const id of ['hcl_naoh', 'h2so4_naoh', 'hno3_koh', 'h2so4_nh3']) {
      const program = getProgramById(id)!;
      expect(program.visual.timeline.some(atom => ['thermalSteam', 'nucleateBubbles', 'effervescenceBurst'].includes(atom.atom)), id).toBe(false);
      expect(program.visual.after.gasesOffgassed).toEqual([]);
    }
  });

  it('retains copper hydroxide when ammonia is insufficient, even after the full timeline', () => {
    for (const [ammonia, dissolves] of [[0.001, false], [0.005, true]] as const) {
      const controller = new CuSo4Nh3MultiStageController();
      const ctx = context({ CuSO4: 0.001, NH3: ammonia });
      controller.initialize(ctx);
      for (let i = 0; i < 600; i++) controller.update(ctx);
      controller.finalize(ctx);
      expect(ctx.runtime.turbidity > 0).toBe(!dissolves);
      expect(ctx.runtime.precipitateRate).toBe(0);
    }
  });

  it('requires four hydroxides per aluminium atom to finish amphoteric dissolution', () => {
    for (const [base, dissolves] of [[0.006, false], [0.008, true]] as const) {
      const controller = new Al2So43NaOhAmphotericController();
      const ctx = context({ 'Al2(SO4)3': 0.001, NaOH: base });
      controller.initialize(ctx);
      for (let i = 0; i < 600; i++) controller.update(ctx);
      controller.finalize(ctx);
      expect(ctx.runtime.turbidity > 0).toBe(!dissolves);
    }
  });
});

describe('Frame telemetry', () => {
  it('reports refresh rates above 60 instead of silently clamping to 60', () => {
    expect(summarizeFrames([1000 / 120, 1000 / 120]).fps).toBe(120);
  });
  it('tracks tail latency separately from averages and ignores invalid samples', () => {
    const result = summarizeFrames([...Array(18).fill(10), 40, 60, Number.NaN, -1, 0]);
    expect(result.samples).toBe(20);
    expect(result.p95_ms).toBe(40);
    expect(result.ms).toBe(14);
    expect(summarizeFrames([]).fps).toBe(0);
  });
});
