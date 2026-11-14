import { afterEach, expect, it } from 'vitest';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { planStudioProgram, createStudioSample } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { useAppStore, type ActiveKineticsState } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
it('rejects invalid automatic speeds without accepting simulated time', () => {
  const e = new AutoExperiment('h2o2_mno2', false);
  for (const speed of [NaN, Infinity, 0, -1]) { e.speed = speed; e.tick(0.1); expect(e.elapsed).toBe(0); }
});
it('cannot invent an ignition event when the automatic source is disabled', () => {
  const e = new AutoExperiment('mg_o2_burn', false); e.sourceEnabled = false;
  for (let i = 0; i < 1000 && e.phase !== 'condition'; i++) e.tick(0.1);
  expect(e.phase).toBe('condition');
  for (let i = 0; i < 80; i++) e.tick(0.1);
  expect(e.sample.ignitedProgramId).toBeUndefined(); expect(e.progress).toBe(0); expect(e.flame).toBe(false);
});
it.each(['flame_na', 'flame_k', 'flame_cu'])('%s clears the live flame test when its source is extinguished', id => {
  const e = new AutoExperiment(id, false);
  for (let i = 0; i < 1000 && !(e.phase === 'react' && e.progress > 0); i++) e.tick(0.1);
  expect(e.phase).toBe('react'); expect(e.flame).toBe(true);
  const progress = e.progress;
  e.sourceEnabled = false;
  e.tick(0.1);
  expect(e.flame).toBe(false); expect(e.phase).toBe('error');
  expect(e.error).toContain('Nguồn đốt'); expect(e.progress).toBe(progress);
  e.sourceEnabled = true; e.tick(0.1);
  expect(e.flame).toBe(false); expect(e.progress).toBe(progress);
});
it('stops emission after finite automatic fuel exhaustion', () => {
  const e = new AutoExperiment('flame_na', false);
  for (let i = 0; i < 1000 && e.progress === 0; i++) e.tick(0.1);
  const internal = e as unknown as { lamp: { fuelLevel_ml: number } };
  internal.lamp.fuelLevel_ml = 1e-8;
  e.tick(0.1);
  expect(internal.lamp.fuelLevel_ml).toBe(0);
  expect(e.flame).toBe(false); expect(e.phase).toBe('error');
});
it('uses the manual missing-catalyst gate during automatic playback', () => {
  const e = new AutoExperiment('h2o2_mno2', false), p = getProgramById('h2o2_mno2')!;
  const v = createStudioSample(p, { ...e.sample, id: 'parity' });
  const k = planStudioProgram(p, v, 'vi').kinetics!;
  const without = { ...v, contents: v.contents.filter(c => c.formula !== 'MnO2') };
  // Enter the material step directly to compare both dispatchers with the same
  // inventory; choreography and stock transfer have their own parity suite.
  const internal = e as unknown as { lesson: unknown; kinetics: ActiveKineticsState; baseline: VesselState };
  internal.lesson = undefined; internal.kinetics = structuredClone(k); internal.baseline = structuredClone(v);
  e.sample = structuredClone(without); e.phase = 'react';
  useAppStore.setState({ vessels: { parity: structuredClone(without) }, burners: {}, spills: {},
    activeKinetics: { parity: structuredClone(k) }, pendingReactions: {}, isSimulationPaused: false, timeScale: 1 });
  for (let i = 0; i < 6; i++) { e.tick(1 / 60); useAppStore.getState().tickSimulation(1 / 60); }
  expect(e.progress).toBe(0);
  expect(useAppStore.getState().activeKinetics.parity.progress).toBe(0);
  expect(e.sample.contents.find(c => c.formula === 'H2O2')!.moles).toBe(v.contents.find(c => c.formula === 'H2O2')!.moles);
});
