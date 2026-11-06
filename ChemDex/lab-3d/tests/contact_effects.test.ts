import { afterEach, expect, it } from 'vitest';
import { createSodiumMotion, stepSodiumMotion } from '../src/science/sodiumMotion';
import { sodiumContactRegime } from '../src/science/sodiumWater';
import { useAppStore } from '../src/store/useAppStore';
import { createStudioSample } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { dispenseAliquot } from '../src/handling/aliquot';
import { mergeWorkbenchSpill, mergeWorkbenchSpillBatch } from '../src/engine/spillInventory';
import { stepSpillChemistry } from '../src/engine/spillChemistry';
import { computeMolarMass } from '../src/engine/ledger';
import { runContactScenario } from '../src/vfx/dev/contactScenarios';
import type { SpillState, VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState();
afterEach(() => useAppStore.setState(initial, true));
const shell: VesselState = { id: 'contact', name: 'Contact', type: 'beaker', position: [0, -0.135, 0],
  capacity_ml: 250, rotationY: 0, isLocked: false, contents: [], substances: [], volume_ml: 0,
  volume: 0, mass_g: 0, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
const row = (formula: string, mass_g: number, phase: string) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
const liquid = (color: string, volume_ml: number) => ({ color, volume_ml, mass_g: volume_ml, temperature_c: 25,
  contents: [row('H2O', volume_ml, 'l')], substances: ['H2O'] });

it('mixes arriving colors by accepted volume across instruments and both spill deposition paths', () => {
  const blue = liquid('#2563eb', 20), yellow = liquid('#facc15', 20);
  const target = { ...shell, volume_ml: 20, mass_g: 20, contents: blue.contents, liquidColor: blue.color };
  const mixed = dispenseAliquot(target, yellow, 20).vessel;
  expect(mixed.liquidColor).not.toBe(blue.color); expect(mixed.liquidColor).not.toBe(yellow.color);
  expect(mixed.mass_g).toBe(40);
  const old = mergeWorkbenchSpill({}, [0, -1.175, 0], 20, ['H2O'], blue.color, '', 20, blue.contents);
  const a = Object.values(mergeWorkbenchSpill(old, [0, -1.175, 0], 20, ['H2O'], yellow.color, '', 20, yellow.contents))[0];
  const b = Object.values(mergeWorkbenchSpillBatch(old, [[0, -1.175, 0]], yellow))[0];
  expect(a.color).toBe(mixed.liquidColor); expect(b.color).toBe(a.color);
  expect(a.mass_g).toBe(40); expect(b.mass_g).toBe(40);
});

it('does not recolor a full receiver that accepts no liquid, or merge immiscible phases optically', () => {
  const target = { ...shell, capacity_ml: 20, volume_ml: 20, mass_g: 20, contents: [row('H2O', 20, 'l')], liquidColor: '#2563eb' };
  expect(dispenseAliquot(target, liquid('#facc15', 20), 20).vessel.liquidColor).toBe('#2563eb');
  const oil = { ...liquid('#facc15', 10), organicVolume_ml: 10, organicColor: '#facc15' };
  expect(dispenseAliquot({ ...target, capacity_ml: 250 }, oil, 10).vessel.liquidColor).toBe('#2563eb');
});

it('recoil changes angular direction, stays inside the rim and is reproducible by contact seed', () => {
  const a = createSodiumMotion('contact:1'), b = createSodiumMotion('contact:1');
  let clockwise = 0, counterclockwise = 0;
  for (let i = 0; i < 1500; i++) {
    stepSodiumMotion(a, 1 / 120, 0.3, 1); stepSodiumMotion(b, 1 / 120, 0.3, 1);
    expect(Math.hypot(a.x, a.z)).toBeLessThanOrEqual(0.30000001);
    const momentum = a.x * a.vz - a.z * a.vx;
    if (momentum > 1e-4) clockwise++; if (momentum < -1e-4) counterclockwise++;
  }
  expect(clockwise).toBeGreaterThan(40); expect(counterclockwise).toBeGreaterThan(40); expect(a).toEqual(b);
  const before = { ...a }; stepSodiumMotion(a, 0, 0.3, 1); expect(a).toEqual(before);
});

it('trace limiting water cannot trigger the bulk disruptive sodium scenario', () => {
  const v = { ...shell, volume_ml: 0.001, contents: [row('Na', 5, 's'), row('H2O', 0.001, 'l')] };
  expect(sodiumContactRegime(v)).toBe('skitter');
  expect(sodiumContactRegime({ ...v, volume_ml: 50, contents: [row('Na', 0.8, 's'), row('H2O', 50, 'l')] })).toBe('disruptive');
});

it.each(['cuso4_naoh', 'na2co3_hcl'])('continues %s chemistry on the workbench with conserved mass including escaped gas', id => {
  const sample = createStudioSample(getProgramById(id)!, shell);
  const spill: SpillState = { id: 'spill', position: [0, -1.175, 0], radius: 0.5, volume_ml: sample.volume_ml,
    mass_g: sample.mass_g, contents: sample.contents, substances: sample.substances, color: sample.liquidColor!, timestamp: 0, isHazard: true };
  const next = stepSpillChemistry(spill, 0.1);
  expect(next.contents).not.toEqual(spill.contents);
  expect(next.mass_g + Object.values(next.escapedGas_g ?? {}).reduce((s, g) => s + g, 0)).toBeCloseTo(spill.mass_g, 9);
  if (id === 'cuso4_naoh') expect(next.contents!.some(c => c.formula === 'Cu(OH)2' && c.phase === 's' && c.mass_g > 0)).toBe(true);
  else { expect(next.escapedGas_g?.CO2).toBeGreaterThan(0); expect(next.gasRate_mol_s).toBeGreaterThan(0); }
  let completed = next;
  for (let i = 0; i < 100; i++) completed = stepSpillChemistry(completed, 0.1);
  const reactant = id === 'cuso4_naoh' ? 'CuSO4' : 'Na2CO3';
  const initialMoles = spill.contents!.find(c => c.formula === reactant)!.moles;
  expect(completed.contents!.find(c => c.formula === reactant)!.moles).toBeLessThan(initialMoles * 0.001);
  expect(completed.mass_g + Object.values(completed.escapedGas_g ?? {}).reduce((s, g) => s + g, 0)).toBeCloseTo(spill.mass_g, 9);
});

it('quick Studio sodium samples use the live contact engine and can be tested repeatedly after replacement', async () => {
  useAppStore.setState({ vessels: { contact: shell }, vesselIds: ['contact'], burners: {}, spills: {},
    activeKinetics: {}, pendingReactions: {}, inFlightPours: [], isSimulationPaused: false, timeScale: 1 });
  await runContactScenario('contact', 'sodium_small');
  expect(useAppStore.getState().activeKinetics.contact.program?.id).toBe('na_h2o');
  useAppStore.getState().tickSimulation(0.05);
  expect(useAppStore.getState().vessels.contact.isShattered).toBeFalsy();
  await runContactScenario('contact', 'sodium_large');
  useAppStore.getState().tickSimulation(0.05);
  expect(useAppStore.getState().vessels.contact.isShattered).toBe(true);
  useAppStore.getState().replaceShatteredVessel('contact');
  await runContactScenario('contact', 'sodium_small');
  expect(useAppStore.getState().activeKinetics.contact.program?.id).toBe('na_h2o');
});

it('keeps workbench gas in the atmosphere ledger after wiping, without replaying gas at pause', async () => {
  useAppStore.setState({ vessels: { contact: shell }, vesselIds: ['contact'], burners: {}, spills: {}, workbenchEscapedGas_g: {},
    activeKinetics: {}, pendingReactions: {}, inFlightPours: [], isSimulationPaused: false, timeScale: 1 });
  await runContactScenario('contact', 'spill_gas');
  const before = Object.values(useAppStore.getState().spills).reduce((s, spill) => s + spill.mass_g, 0);
  useAppStore.getState().tickSimulation(0.1);
  const escaped = useAppStore.getState().workbenchEscapedGas_g.CO2;
  expect(escaped).toBeGreaterThan(0);
  useAppStore.getState().setSimulationPaused(true);
  useAppStore.getState().tickSimulation(1);
  expect(useAppStore.getState().workbenchEscapedGas_g.CO2).toBe(escaped);
  useAppStore.getState().cleanSpills();
  expect(useAppStore.getState().workbenchEscapedGas_g.CO2 + useAppStore.getState().wasteMass_g).toBeCloseTo(before, 9);
});

it('direct stock additions visibly combine unlike colors without inventing a reaction for an unknown pair', async () => {
  useAppStore.setState({ vessels: { contact: shell }, vesselIds: ['contact'], burners: {}, spills: {},
    activeKinetics: {}, pendingReactions: {}, inFlightPours: [], isSimulationPaused: false, timeScale: 1 });
  useAppStore.getState().prepareStudioWaterSample('contact');
  await useAppStore.getState().mixSubstances('contact', 'CuSO4', 20);
  const blue = useAppStore.getState().vessels.contact.liquidColor;
  await useAppStore.getState().mixSubstances('contact', 'KMnO4', 20);
  const mixed = useAppStore.getState().vessels.contact;
  expect(mixed.liquidColor).not.toBe(blue);
  expect(mixed.volume_ml).toBe(140);
  expect(useAppStore.getState().activeKinetics.contact).toBeUndefined();
  expect(mixed.contents.some(c => c.formula === 'CuSO4' && c.moles > 0)).toBe(true);
  expect(mixed.contents.some(c => c.formula === 'KMnO4' && c.moles > 0)).toBe(true);
});
