import { describe, expect, it } from 'vitest';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { createAutoVisualRuntime } from '../src/vfx/autoplay/autoVisualRuntime';
import { useAppStore } from '../src/store/useAppStore';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import type { ActiveKineticsState } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

describe('automatic scenes inherit the bench renderer and material state', () => {
  it('publishes one isolated sample, clock and physical manager without stepping or changing the manual bench', () => {
    const manual = useAppStore.getState(), e = new AutoExperiment('cuso4_naoh', false);
    const { runtime, publish } = createAutoVisualRuntime(e);
    expect(runtime.manager).toBe(e.physics); expect(runtime.appearance).toBe(e.appearance);
    const tick = e.physics.precipitationSystem.integratedTime_s;
    const initial = runtime.store.getState();
    publish(); expect(runtime.store.getState()).toBe(initial);
    e.tick(0.1); e.paused = true; e.speed = 2; publish();
    const projected = runtime.store.getState();
    expect(projected.vessels[e.sample.id]).toBe(e.sample);
    expect(projected.isSimulationPaused).toBe(true); expect(projected.timeScale).toBe(2);
    expect(runtime.elapsed!()).toBe(e.elapsed);
    expect(e.physics.precipitationSystem.integratedTime_s).toBe(tick);
    expect(useAppStore.getState()).toBe(manual);
    expect(useAppStore.getState().vessels[e.sample.id]).toBeUndefined();
  });

  it('routes actual hot water through finite wall condensation and exhaust with conserved mass', () => {
    const e = new AutoExperiment('cuso4_naoh', false);
    e.sample = { ...e.sample, volume_ml: 50, volume: 0.2, mass_g: 50, temperature_c: 95,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'] };
    e.phase = 'complete';
    for (let i = 0; i < 120; i++) e.tick(1 / 60);
    const v = e.sample;
    expect(v.wallCondensation).toBeDefined();
    expect((v.evaporated_ml ?? 0) + (v.waterVaporReleased_g ?? 0)).toBeGreaterThan(0);
    expect(v.mass_g + (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0)).toBeCloseTo(50, 8);
    expect(v.waterVaporOutflow_g_s).toBeGreaterThanOrEqual(0);
    e.paused = true; const held = JSON.stringify(e.sample); e.tick(1);
    expect(JSON.stringify(e.sample)).toBe(held);
  });

  it('retains finite oxygen as foam only when the actual automatic specimen contains surfactant', () => {
    const e = new AutoExperiment('h2o2_mno2', false);
    const initial = createStudioSample(e.program, e.sample, 'oxygen_foam');
    const kinetics = planStudioProgram(e.program, initial, 'vi').kinetics!;
    const internal = e as unknown as { lesson: unknown; baseline: VesselState; kinetics: ActiveKineticsState };
    internal.lesson = undefined; internal.baseline = structuredClone(initial); internal.kinetics = kinetics;
    e.sample = structuredClone(initial); e.phase = 'react';
    let maximumFoam = 0;
    for (let i = 0; i < 240; i++) {
      e.tick(1 / 60); maximumFoam = Math.max(maximumFoam, e.sample.foam_ml ?? 0);
      const gas = Object.values(e.sample.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0);
      expect(e.sample.mass_g + gas + (e.sample.evaporated_ml ?? 0)
        - (e.sample.wallCondensation?.returned_g ?? 0)).toBeCloseTo(initial.mass_g, 8);
    }
    expect(maximumFoam).toBeGreaterThan(0.05);
    expect(e.sample.contents.some(row => row.location === 'foam' && row.mass_g > 0)).toBe(true);
  });
});
