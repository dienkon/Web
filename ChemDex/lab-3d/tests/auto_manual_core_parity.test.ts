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
