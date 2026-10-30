import { afterEach, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { readComposition } from '../src/science/balance';
import { continueReactionAfterOutflow } from '../src/engine/reactionContinuation';
import { reactionReplayProgress } from '../src/engine/reactionProgress';
import { metalAcidProgressRate, metalAcidMaximumExtent, planMetalAcid } from '../src/engine/metalAcidPlan';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { advanceHeatActivatedProgress } from '../src/engine/heatActivatedProgress';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { applyAluminumMaterialProgress } from '../src/engine/aluminumMaterialProgress';
import { computeMolarMass } from '../src/engine/ledger';
import { decantLiquid } from '../src/engine/decantTransfer';
import { aspiratePipette } from '../src/handling/instrumentOperations';
import { useInstrumentStore } from '../src/handling/instrumentState';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
const instrumentOriginal = useInstrumentStore.getState();
afterEach(() => { useAppStore.setState(original, true); useInstrumentStore.setState(instrumentOriginal, true); });
const shell: VesselState = { id: 'source', name: 'Source', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  volume_ml: 0, volume: 0, mass_g: 0, temperature_c: 25, ph: 7,
  hasGas: false, hasPrecipitate: false, isBoiling: false };
function setup() {
  const program = getProgramById('hcl_naoh')!, sample = createStudioSample(program, shell);
  const kinetics = planStudioProgram(program, sample, 'vi').kinetics!;
  useAppStore.setState({ vessels: { source: sample, target: { ...shell, id: 'target' } },
    vesselIds: ['source', 'target'], activeKinetics: { source: kinetics }, burners: {},
    pendingReactions: {}, dissolvingSubstances: {}, inFlightPours: [], spills: {},
    isSimulationPaused: false, timeScale: 1 });
  useAppStore.getState().tickSimulation(0.1);
  return useAppStore.getState();
}
const amount = (v: VesselState, formula: string) => v.contents.filter(c => c.formula === formula).reduce((s, c) => s + c.moles, 0);
function inventory() {
  const s = useAppStore.getState(), samples = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample)];
  const atoms: Record<string, number> = {};
  for (const v of samples) for (const c of v.contents) for (const [a, n] of Object.entries(readComposition(c.formula).atoms))
    atoms[a] = (atoms[a] ?? 0) + n * c.moles;
  for (const v of Object.values(s.vessels)) {
    const water = (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0);
    atoms.H = (atoms.H ?? 0) + water * 2 / 18.015;
    atoms.O = (atoms.O ?? 0) + water / 18.015;
    for (const [formula, mass] of Object.entries(v.escapedGas_g ?? {}))
      for (const [a, n] of Object.entries(readComposition(formula).atoms))
        atoms[a] = (atoms[a] ?? 0) + mass / computeMolarMass(formula) * n;
  }
  return { mass: samples.reduce((sum, v) => sum + v.mass_g, 0)
    + Object.values(s.vessels).reduce((sum, v) => sum + (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0)
      + Object.values(v.escapedGas_g ?? {}).reduce((n, mass) => n + mass, 0), 0), atoms };
}
it.each(['direct', 'flight'])('continues the finite source reaction after %s withdrawal without replaying earlier heat', mode => {
  const before = setup(), source = before.vessels.source, conserved = inventory();
  const progress = before.activeKinetics.source.progress, startTime = before.activeKinetics.source.startTime;
  const volume = source.volume_ml / 2;
  if (mode === 'direct') before.transferLiquidContinuous('source', 'target', volume);
  else before.releasePourLiquid({ id: 'drop', sessionId: 'test', sourceId: 'source', sourceName: 'Source',
    targetId: null, targetPose: '', duration_s: 0.1,
    trajectory: { exitPos: [0, 4, 0], exitVel: [0, 0, 0], impactPos: [0, -1.175, 0],
      landingKind: 'table', targetVesselId: null, timeOfFlight: 1 } }, volume);
  const withdrawn = useAppStore.getState();
  expect(withdrawn.activeKinetics.source?.progress).toBe(progress);
  expect(withdrawn.activeKinetics.source.startTime).toBe(startTime);
  const acid = amount(withdrawn.vessels.source, 'HCl'), heat = withdrawn.vessels.source.programHeatApplied_J!;
  withdrawn.tickSimulation(0.1);
  const advanced = useAppStore.getState();
  expect(amount(advanced.vessels.source, 'HCl')).toBeCloseTo(acid / 2, 12);
  expect(advanced.vessels.source.programHeatApplied_J! - heat).toBeCloseTo(55.83 * 0.125, 9);
  expect(inventory().mass).toBeCloseTo(conserved.mass, 9);
  for (const [a, n] of Object.entries(conserved.atoms)) expect(inventory().atoms[a], a).toBeCloseTo(n, 10);
  expect(advanced.seekStudioProgram('source', 1)).toBe(true);
  expect(amount(useAppStore.getState().vessels.source, 'HCl')).toBeCloseTo(0, 12);
  expect(useAppStore.getState().vessels.source.programHeatApplied_J! - heat).toBeCloseTo(55.83 * 0.25, 9);
  expect(inventory().mass).toBeCloseTo(conserved.mass, 9);
});

it('rebases repeated withdrawals without resetting time or restoring previously removed material', () => {
  setup();
  for (let i = 0; i < 12; i++) {
    const s = useAppStore.getState(), acid = amount(s.vessels.source, 'HCl');
    s.transferLiquidContinuous('source', 'target', s.vessels.source.volume_ml / 10);
    s.tickSimulation(0.01);
    expect(amount(useAppStore.getState().vessels.source, 'HCl')).toBeCloseTo(acid * 0.9 * 2 ** -0.1, 12);
  }
  expect(useAppStore.getState().activeKinetics.source.progress).toBeCloseTo(1 - 2 ** -2.2, 10);
});

it('clears an exhausted source and never recreates its withdrawn reactants', () => {
  const s = setup();
  s.transferLiquidContinuous('source', 'target', s.vessels.source.volume_ml);
  expect(useAppStore.getState().activeKinetics.source).toBeUndefined();
  s.tickSimulation(0.1);
  expect(amount(useAppStore.getState().vessels.source, 'HCl')).toBe(0);
  expect(useAppStore.getState().vessels.source.mass_g).toBeCloseTo(0, 10);
});

it('continues the source after an actual pipette aspiration but retires arbitrary replacement baselines', () => {
  const s = setup(), source = s.vessels.source;
  useAppStore.setState({ selectedVesselId: 'source', moveMode: false });
  useAppStore.getState().setPipetteSample(null);
  expect(aspiratePipette(5).ok).toBe(true);
  const remaining = useAppStore.getState().vessels.source, acid = amount(remaining, 'HCl');
  expect(remaining.volume_ml).toBeCloseTo(source.volume_ml - 5, 10);
  expect(useAppStore.getState().pipetteSample!.volume_ml).toBe(5);
  s.tickSimulation(0.1);
  expect(amount(useAppStore.getState().vessels.source, 'HCl')).toBeCloseTo(acid / 2, 12);
  s.setVesselState('source', { contents: [...remaining.contents] });
  expect(useAppStore.getState().activeKinetics.source).toBeUndefined();
});

it.each(['separatory_funnel', 'filter_funnel'] as const)('continues reacting inventory while the %s drains', type => {
  const s = setup(), source = { ...s.vessels.source, type, position: [0, 2, 0] as [number, number, number], stopcockOpen: true };
  useAppStore.setState({ vessels: { source, target: s.vessels.target } });
  const acid = amount(source, 'HCl');
  s.tickSimulation(0.1);
  const after = useAppStore.getState();
  expect(after.vessels.source.volume_ml).toBeLessThan(source.volume_ml);
  expect(after.activeKinetics.source.progress).toBeCloseTo(0.75, 10);
  expect(amount(after.vessels.source, 'HCl')).toBeCloseTo(acid / 2 * after.vessels.source.volume_ml / source.volume_ml, 12);
});

it.each(['Mg', 'Zn', 'Fe'])('preserves the %s surface reference and physical mol/s after acid withdrawal', metal => {
  const program = getProgramById(`${metal.toLowerCase()}_hcl`)!;
  const baseline = createStudioSample(program, shell), k = planMetalAcid(baseline, 'vi')!.kinetics;
  const progress = 0.3, current = { ...baseline, ...applyProgramWithThermalSinks(program, baseline, baseline, progress) };
  const running = { ...k, progress }, flux = metalAcidProgressRate(running, current) * metalAcidMaximumExtent(running);
  const remaining = decantLiquid(current, null, current.volume_ml / 2)!.source;
  const continued = continueReactionAfterOutflow(running, remaining, 'vi')!;
  const continuedFlux = metalAcidProgressRate(continued, remaining) / (1 - progress) * metalAcidMaximumExtent(continued);
  expect(continuedFlux).toBeCloseTo(flux, 12);
  expect(reactionReplayProgress(continued, progress)).toBe(0);
  const repeated = continueReactionAfterOutflow(continued, remaining, 'vi')!;
  expect(repeated.surfaceReferenceMass_g).toBe(continued.surfaceReferenceMass_g);
});

it('continues metal conversion in the live store without replaying escaped hydrogen after decanting', () => {
  setup();
  const program = getProgramById('zn_hcl')!, baseline = createStudioSample(program, shell);
  const k = planMetalAcid(baseline, 'vi')!.kinetics;
  useAppStore.setState({ vessels: { source: baseline, target: { ...shell, id: 'target' } }, activeKinetics: { source: k } });
  const before = inventory(), s = useAppStore.getState();
  s.tickSimulation(0.1);
  const reacted = useAppStore.getState().vessels.source, escaped = reacted.escapedGas_g!.H2;
  expect(escaped).toBeGreaterThan(0);
  s.transferLiquidContinuous('source', 'target', reacted.volume_ml / 2);
  const remaining = useAppStore.getState().vessels.source;
  s.tickSimulation(0.1);
  const after = useAppStore.getState().vessels.source;
  expect(amount(after, 'Zn')).toBeLessThan(amount(remaining, 'Zn'));
  expect(after.escapedGas_g!.H2 - escaped).toBeCloseTo((amount(remaining, 'Zn') - amount(after, 'Zn')) * computeMolarMass('H2'), 12);
  expect(inventory().mass).toBeCloseTo(before.mass, 9);
  for (const [a, n] of Object.entries(before.atoms)) expect(inventory().atoms[a], a).toBeCloseTo(n, 10);
});

it('keeps a cooled reaction armed and applies thermal feasibility to the remaining extent', () => {
  const program = getProgramById('nahco3_heat')!;
  const baseline = { ...createStudioSample(program, shell), temperature_c: 150 };
  const k = planStudioProgram(program, baseline, 'vi').kinetics!, progress = 0.2;
  const current = { ...baseline, ...applyProgramWithThermalSinks(program, baseline, baseline, progress), temperature_c: 84 };
  const continued = continueReactionAfterOutflow({ ...k, progress }, current, 'vi')!;
  expect(continued).not.toBeNull();
  expect(advanceHeatActivatedProgress(continued, current, 1)).toBe(progress);
  const reheated = { ...current, temperature_c: 85.1 };
  const next = advanceHeatActivatedProgress(continued, reheated, 1);
  expect(next).toBeGreaterThan(progress);
  const result = applyProgramWithThermalSinks(program, current, reheated, reactionReplayProgress(continued, next));
  expect(result.temperature_c!).toBeGreaterThanOrEqual(85);
  expect(result.temperature_c!).toBeLessThan(85.00001);
});

it('plans only remaining native aluminum stages and preserves the existing gel and heat at zero replay', () => {
  const row = (formula: string, moles: number, phase: string) => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
  const contents = [row('H2O', 100 / 18.015, 'l'), row('AlCl3', 0.0001, 'aq'), row('NaOH', 0.0003, 'aq')];
  const baseline = { ...shell, contents, substances: contents.map(c => c.formula), volume_ml: 100, volume: 1,
    mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0) };
  const k = reactAliquotMixture(baseline, 'vi', false).kinetics!, progress = 0.2;
  const current = { ...baseline, ...applyAluminumMaterialProgress(k.materialStages!, k.initialVesselBaseline!, baseline, progress) };
  const remaining = decantLiquid(current, null, 30)!.source;
  const continued = continueReactionAfterOutflow({ ...k, progress }, remaining, 'vi')!;
  expect(continued.materialStages?.length).toBeGreaterThan(0);
  const start = { ...remaining, ...applyAluminumMaterialProgress(continued.materialStages!, remaining, remaining, 0) };
  expect(amount(start, 'Al(OH)3')).toBeCloseTo(amount(remaining, 'Al(OH)3'), 12);
  expect(start.programHeatApplied_J).toBe(remaining.programHeatApplied_J);
  const end = { ...remaining, ...applyAluminumMaterialProgress(continued.materialStages!, remaining, remaining, 1) };
  expect(amount(end, 'Al(OH)3')).toBeGreaterThan(amount(start, 'Al(OH)3'));
  expect(end.mass_g).toBeCloseTo(remaining.mass_g, 9);
});
