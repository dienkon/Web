import { afterEach, describe, expect, it } from 'vitest';
import { landoltInventory, landoltSpeciation, landoltRates, evolveLandolt, landoltCapacity, LANDOLT_CONSTANTS } from '../src/science/landoltClock';
import { previewLandoltLedger, stepLandoltLedger } from '../src/engine/landoltClockLedger';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { advanceReaction } from '../src/engine/advanceReaction';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { getProgramById } from '../src/vfx/programs/library';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { assessProgramConditions } from '../src/science/conditions';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { useAppStore } from '../src/store/useAppStore';
import { continueReactionAfterOutflow } from '../src/engine/reactionContinuation';
import { getReactionController } from '../src/vfx/reactions/registry';
import type { ReactionContext } from '../src/vfx/reactions/types';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
const program = getProgramById('iodine_clock')!;
function sample(sulfite = 0.003, volume_ml = 30, starch = true): VesselState {
  const contents = [row('KIO3', 0.002), row('NaHSO3', sulfite), row('H2O', volume_ml / 18.015, 'l'),
    ...(starch ? [row('Starch', 1e-5)] : [])];
  return { id: 'clock', name: 'Clock', type: 'beaker', position: [0, 0, 0], rotationY: 0, isLocked: false,
    capacity_ml: 250, volume_ml, volume: volume_ml / 250, contents, substances: contents.map(c => c.formula),
    mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), temperature_c: 25, ph: 7,
    hasGas: false, hasPrecipitate: false, isBoiling: false, liquidColor: '#f8fafc' };
}
function atoms(contents: SubstanceContent[]) {
  const total: Record<string, number> = {};
  for (const c of contents.filter(c => c.formula !== 'Starch')) for (const [e, n] of Object.entries(readComposition(c.formula).atoms)) total[e] = (total[e] ?? 0) + n * c.moles;
  return total;
}
function conserved(before: VesselState, patch: Partial<VesselState>) {
  const a = atoms(before.contents), b = atoms(patch.contents!);
  for (const e of new Set([...Object.keys(a), ...Object.keys(b)])) expect(b[e] ?? 0, e).toBeCloseTo(a[e] ?? 0, 10);
  expect(patch.mass_g).toBeCloseTo(before.mass_g, 9);
  const charge = patch.contents!.filter(c => c.formula !== 'Starch').reduce((sum, c) => sum + readComposition(c.formula).charge * c.moles, 0);
  expect(patch.contents!.filter(c => c.formula === 'Starch')).toEqual(before.contents.filter(c => c.formula === 'Starch'));
  expect(Math.abs(charge)).toBeLessThan(1e-11);
}
function run(input: VesselState, dt = 0.05, limit = 180) {
  let v = input, firstColor: number | null = null, time = 0;
  for (; time < limit; time += dt) {
    const step = stepLandoltLedger(v, dt)!;
    v = { ...v, ...step.patch };
    if (firstColor === null && landoltInventory(v.contents, v.volume_ml)!.iodine / (v.volume_ml / 1000) > 2e-5) firstColor = time + dt;
    if (step.terminal) break;
  }
  return { v, time, firstColor };
}

describe('Landolt finite material mechanism', () => {
  it('uses the published reference coefficients and concentration-dependent rates', () => {
    expect(LANDOLT_CONSTANTS.k1a).toBe(0.08);
    expect(LANDOLT_CONSTANTS.triiodideBeta).toBeCloseTo(658.823529, 5);
    const v = sample(), t = landoltInventory(v.contents, 30)!;
    const s = landoltSpeciation(t), r = landoltRates(t);
    expect(Math.abs(s.charge)).toBeLessThan(1e-12);
    expect(r.initiation_M_s).toBeCloseTo((0.08 + 4e3 * s.h + 3e5 * s.h ** 2) * (t.iodate / 0.03) * s.hso3, 12);
    expect(r.dushman_M_s).toBe(0);
  });

  it.each([0, 0.01, 0.5, 1])('conserves every atom and net charge in a preview at fraction %s', fraction => {
    const v = sample(); conserved(v, previewLandoltLedger(v, fraction)!);
  });

  it('consumes real reagents during the clear interval rather than waiting 4.5 seconds', () => {
    const v = sample(), t = landoltInventory(v.contents, 30)!;
    const early = evolveLandolt(t, 0.001);
    expect(early.sulfite).toBeLessThan(t.sulfite);
    expect(early.iodate).toBeLessThan(t.iodate);
    expect(early.iodine / 0.03).toBeLessThan(2e-5);
    conserved(v, stepLandoltLedger(v, 0.001)!.patch);
  });

  it('accumulates iodine only after reductant loss, and never invents a starch molecule product', () => {
    const initial = sample(), { v, firstColor, time } = run(initial);
    expect(firstColor).not.toBeNull(); expect(time).toBeLessThan(180);
    const t = landoltInventory(v.contents, v.volume_ml)!;
    expect(t.sulfite).toBeLessThan(1e-9);
    expect(t.iodine).toBeGreaterThan(1e-5);
    expect(v.liquidColor).toBe('#0f172a');
    expect(v.contents.some(c => c.formula === 'I_starch')).toBe(false);
    conserved(initial, v);
  });

  it('keeps a sulfite-excess specimen clear instead of forcing every clock blue', () => {
    const initial = sample(0.009), { v, firstColor } = run(initial);
    const t = landoltInventory(v.contents, v.volume_ml)!;
    expect(firstColor).toBeNull(); expect(t.sulfite).toBeGreaterThan(0.0029);
    expect(v.liquidColor).toBe('#f8fafc'); conserved(initial, v);
  });

  it('reports iodine brown when starch is absent', () => {
    const { v } = run(sample(0.003, 30, false)); expect(v.liquidColor).toBe('#99621d');
  });

  it('changes the clock time on dilution and converges across caller step sizes', () => {
    const base = run(sample(), 0.1), finer = run(sample(), 0.025), diluted = run(sample(0.003, 60), 0.05);
    expect(Math.abs(base.firstColor! - finer.firstColor!)).toBeLessThan(0.2);
    expect(diluted.firstColor!).toBeGreaterThan(finer.firstColor! * 1.5);
    expect(landoltCapacity(landoltInventory(base.v.contents, 30)!)).toBeLessThan(5e-7);
  });

  it('blocks dry, wrong-phase and unsupported oxidant mixtures and leaves separated starch inactive', () => {
    const v = sample();
    expect(landoltInventory(v.contents.filter(c => c.formula !== 'H2O'), 30)).toBeNull();
    expect(landoltInventory(v.contents.map(c => c.formula === 'KIO3' ? { ...c, phase: 's' } : c), 30)).toBeNull();
    expect(landoltInventory([...v.contents, row('H2O2', 0.001)], 30)).toBeNull();
    const separated = { ...v, contents: v.contents.map(c => c.formula === 'Starch' ? { ...c, location: 'filter' as const } : c) };
    expect(previewLandoltLedger(separated, 1)!.liquidColor).toBe('#99621d');
    expect(assessProgramConditions(program, v.contents, { volume_ml: 30, temperature_c: 100 }).ready).toBe(false);
  });

  it('freezes invalid time and does not mutate caller inventories', () => {
    const v = sample(), t = landoltInventory(v.contents, 30)!, saved = JSON.stringify(t);
    for (const dt of [0, -1, NaN, Infinity]) expect(evolveLandolt(t, dt)).toBe(t);
    evolveLandolt(t, 1); expect(JSON.stringify(t)).toBe(saved);
  });

  it('does not fall back to instantaneous native chemistry outside the live model domain', () => {
    const v = sample();
    for (const input of [{ ...v, temperature_c: 100 },
      { ...v, contents: [...v.contents, row('H2O2', 0.001)] }]) {
      const result = reactAliquotMixture(input, 'vi', false);
      expect(result.kinetics).toBeNull(); expect(result.vessel.contents).toEqual(input.contents);
    }
  });

  it('does not color a real specimen by the gallery clock when iodine is absent', () => {
    const v = sample(), controller = getReactionController('iodine_clock')!;
    const runtime = { elapsed: 0, progress: 0, chemistryProgress: 0.95, chemistryRate_s: 0.1,
      targetColor: '#0f172a', customData: {} } as ReactionContext['runtime'];
    const context = { vessel: v, runtime, dt: 0.1 } as ReactionContext;
    controller.initialize(context); runtime.elapsed = 100;
    controller.update(context); expect(runtime.currentColor).toBe('#f8fafc');
    controller.finalize(context); expect(runtime.currentColor).toBe('#f8fafc');
  });

  it('continues a finite withdrawn specimen from its current dissociated material', () => {
    const initial = sample(), k = planStudioProgram(program, initial, 'vi').kinetics!;
    k.progress = advanceReaction(k, initial, 0.01);
    const reacted = { ...initial, ...stepLandoltLedger(initial, 0.01)!.patch };
    const remaining = { ...reacted, volume_ml: reacted.volume_ml / 2, mass_g: reacted.mass_g / 2,
      contents: reacted.contents.map(c => ({ ...c, moles: c.moles / 2, mass_g: c.mass_g / 2 })) };
    const continued = continueReactionAfterOutflow(k, remaining, 'vi')!;
    expect(continued).not.toBeNull(); expect(continued.progress).toBe(0);
    const progress = advanceReaction(continued, remaining, 0.05);
    const patch = applyProgramWithThermalSinks(program, remaining, remaining, progress, 0.05);
    conserved(remaining, patch);
  });

  it('manual simulation pause preserves chemistry and resume advances the same finite model', () => {
    const v = sample(), k = planStudioProgram(program, v, 'vi').kinetics!;
    useAppStore.setState({ vessels: { clock: v }, vesselIds: ['clock'], activeKinetics: { clock: k },
      burners: {}, pendingReactions: {}, isSimulationPaused: true });
    useAppStore.getState().tickSimulation(0.01);
    expect(useAppStore.getState().vessels.clock.contents).toEqual(v.contents);
    useAppStore.setState({ isSimulationPaused: false }); useAppStore.getState().tickSimulation(0.01);
    const after = useAppStore.getState().vessels.clock;
    expect(landoltInventory(after.contents, after.volume_ml)!.sulfite).toBeLessThan(0.003);
    conserved(v, after);
  });

  it('manual contact plans finite material before the instantaneous native predictor', () => {
    const v = sample(), plan = reactAliquotMixture(v, 'vi', false);
    expect(plan.kinetics?.program?.id).toBe('iodine_clock');
    expect(plan.vessel.contents).toEqual(v.contents);
    const k = plan.kinetics!;
    const progress = advanceReaction(k, v, 0.5); k.progress = progress;
    const patch = applyProgramWithThermalSinks(program, v, v, progress, 0.5);
    expect(patch).toEqual(stepLandoltLedger(v, 0.5)!.patch);
    conserved(v, patch);
  });

  it('plans again from dissociated pools after a dose and preserves their current chemistry', () => {
    const v = sample(), after = { ...v, ...stepLandoltLedger(v, 2)!.patch };
    expect(planStudioProgram(program, after, 'vi').kinetics).not.toBeNull();
    expect(reactAliquotMixture(after, 'vi', false).kinetics?.program?.id).toBe('iodine_clock');
  });

  it('prepares iodate excess in the shared demonstration sample', () => {
    const v = createStudioSample(program, sample());
    const t = landoltInventory(v.contents, v.volume_ml)!;
    expect(t.sulfite / t.iodate).toBeLessThan(3);
    expect(previewLandoltLedger(v, 1)!.liquidColor).toBe('#0f172a');
  });

  it('runs the real automatic transfer and material clock without modifying the manual store', async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const e = new AutoExperiment('iodine_clock', false); await e.stocks.initialize();
    const before = useAppStore.getState();
    for (let i = 0; i < 240 * 60 && !['complete', 'error'].includes(e.phase); i++) e.tick(1 / 60);
    expect(e.error).toBeNull(); expect(e.phase).toBe('complete');
    expect(e.sample.liquidColor).toBe('#0f172a');
    expect(useAppStore.getState()).toBe(before); e.stocks.dispose();
  }, 30000);
});
