import { describe, expect, it } from 'vitest';
import { ProgramPlayer } from '../src/vfx/programs/player/ProgramPlayer';
import { buildProgramLedgerView, programAppearanceChanges } from '../src/vfx/programs/player/authoritativeView';
import { getProgramById, ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { EFFECT_ATOM_CATALOG } from '../src/vfx/catalog';
import { getGenericVfxRecipe } from '../src/vfx/recipes/generic';
import { waterVisualState } from '../src/vfx/waterVisualState';
import { createStudioSample } from '../src/engine/studioProgram';
import { LESSON_PROGRAM_IDS } from '../src/lesson/programCompiler';
import type { VesselState } from '../src/types/chemistry';
import type { ActiveKineticsState } from '../src/store/useAppStore';

const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'view', name: 'Water', type: 'beaker',
  capacity_ml: 250, volume_ml: 100, volume: 0.4, mass_g: 100, temperature_c: 0, ph: 7,
  position: [0, 0, 0], rotationY: 0, isLocked: false, hasGas: false, hasPrecipitate: false, isBoiling: false,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }], substances: ['H2O'],
  environment: { temperature_c: 25, pressure_atm: 0.7, oxygenFraction: 0.2095, airSpeed_m_s: 0.1, relativeHumidity: 0.5 }, ...patch });
const kinetics = (progress = 0.2) => ({ progress, duration: 100 } as ActiveKineticsState);
const context = { vesselId: 'view', position: [0, 0, 0] as [number, number, number],
  dimensions: { radius: 0.04, height: 0.1, liquidY: 0.04, mouthY: 0.1 }, seed: 1, timeScale: 1 };
const forbidden = ['temperature_c', 'foam_ml', 'hasGas', 'gasRate', 'hasPrecipitate', 'mass_g', 'volume_ml', 'contents'];

describe('Visual timelines cannot overwrite chemistry or energy', () => {
  it('builds the view from actual species, pressure, progress and zero-degree temperature', () => {
    const view = buildProgramLedgerView(sample({ hasGas: true }), kinetics(0.3));
    expect(view.temperature_c).toBe(0);
    expect(view.pressure_atm).toBe(0.7);
    expect(view.speciesAmounts.H2O).toBeCloseTo(100 / 18.015, 12);
    expect(view.gasHoldup).toBe(0);
    expect(view.reactionProgress).toBe(0.3);
    expect(view.time_s).toBe(30);
    expect(view.evaporationRate_g_s).toBe(0);
  });
  it('keeps chemical progress authoritative even when the visual duration is shorter', () => {
    const player = new ProgramPlayer();
    const session = player.startProgram('view', getProgramById('cacl2_na2co3')!);
    const view = buildProgramLedgerView(sample(), kinetics(0.1));
    player.update(20, { view });
    expect(session.progress).toBe(0.1); expect(session.isComplete).toBe(false);
    view.reactionProgress = 0.6; player.update(0.1, { view });
    expect(session.progress).toBe(0.6);
    expect(session.activeAtoms.has('precip')).toBe(false);
    expect(session.activeAtoms.has('stokes')).toBe(true);
    view.reactionProgress = 1; player.update(0.1, { view });
    expect(session.isComplete).toBe(true); expect(session.activeAtoms.size).toBe(0);
  });
  it('does not mount or update atoms for paused, invalid, or zero-time inputs', () => {
    const player = new ProgramPlayer(), session = player.startProgram('view', getProgramById('cacl2_na2co3')!);
    for (const dt of [0, -1, NaN, Infinity]) expect(player.update(dt)).toEqual({});
    expect(session.activeAtoms.size).toBe(0); expect(session.elapsed_s).toBe(0);
    session.ctx.timeScale = 0;
    expect(player.update(1)).toEqual({}); expect(session.elapsed_s).toBe(0);
    session.ctx.timeScale = 2;
    player.update(0.5);
    expect(session.elapsed_s).toBe(1);
    expect(session.activeAtoms.get('precip')!.handle.custom.elapsed).toBe(1);
  });
  it('forbids all registered atoms from writing thermochemical state', () => {
    const view = buildProgramLedgerView(sample(), kinetics());
    for (const atom of EFFECT_ATOM_CATALOG) {
      const params = Object.fromEntries(Object.entries(atom.params).map(([k, spec]) => [k, spec.default]));
      const handle = atom.mount(context, params), patch = {};
      atom.update(handle, 0.1, view); atom.writeBack?.(handle, patch);
      for (const key of forbidden) expect(patch, `${atom.name}.${key}`).not.toHaveProperty(key);
      atom.dispose(handle); expect(handle.alive, atom.name).toBe(false);
    }
  });
  it('retains every authored sample inventory and thermal ledger despite arbitrary visual patches', () => {
    for (const program of ALL_HANDCRAFTED_PROGRAMS) {
      if (program.chemistry.representation === 'emission') continue;
      // Lessons use their own multi-apparatus inventory compiler, not Studio specimens.
      if (LESSON_PROGRAM_IDS.has(program.id)) continue;
      const vessel = createStudioSample(program, sample()), original = structuredClone(vessel);
      const forged = { temperature_c: 450, foam_ml: 40, hasGas: true, contents: [], mass_g: 0,
        liquidColor: '#ff00ff', turbidity: 1, residues: [{ where: 'wall', kind: 'salt', amount: 100, color: '#fff' }] };
      const changes = programAppearanceChanges(vessel, forged, program);
      const after = { ...vessel, ...changes };
      for (const key of [...forbidden, 'turbidity', 'residues']) expect(after[key as keyof VesselState], `${program.id}.${key}`)
        .toEqual(original[key as keyof VesselState]);
      if (program.chemistry.representation !== 'indicator') expect(after.liquidColor, program.id).toBe(original.liquidColor);
      expect(vessel).toEqual(original);
    }
  });
  it('uses measured pH for indicators and validates optical opacity', () => {
    const program = getProgramById('phenolphthalein_naoh')!;
    expect(programAppearanceChanges(sample({ ph: 3 }), { liquidColor: '#ff00ff' }, program).liquidColor).not.toBe('#ff00ff');
    for (const liquidOpacity of [-1, 2, NaN, Infinity]) expect(programAppearanceChanges(sample(), { liquidOpacity }, program)).not.toHaveProperty('liquidOpacity');
    expect(programAppearanceChanges(sample(), { liquidOpacity: 0.5 }, program).liquidOpacity).toBe(0.5);
  });
});

describe('Fallback effects require physical phase and gas identity', () => {
  it('does not infer boiling, vapor or sound from 48/98/100 °C thresholds', () => {
    for (const temperature_c of [48, 75, 98, 100, 110]) {
      const recipe = getGenericVfxRecipe(null, sample({ temperature_c }));
      expect(recipe.bubbles).toBeUndefined(); expect(recipe.steam).toBeUndefined(); expect(recipe.soundEffect).toBeUndefined();
    }
  });
  it('supports pressure-dependent boiling below 98 °C, and hot evaporation before boiling', () => {
    const boiling = sample({ temperature_c: 90, isBoiling: true, evaporationRate_g_s: 0.1 });
    expect(getGenericVfxRecipe(null, boiling).bubbles?.gasType).toBe('boil');
    const evaporating = { ...boiling, isBoiling: false };
    expect(getGenericVfxRecipe(null, evaporating).bubbles).toBeUndefined();
    expect(getGenericVfxRecipe(null, evaporating).steam?.active).toBe(true);
    expect(waterVisualState({ ...boiling, waterVaporOutflow_g_s: 0 }).mistRate).toBe(0);
    expect(waterVisualState({ ...boiling, waterVaporOutflow_g_s: 0 }).isBoiling).toBe(true);
    expect(waterVisualState({ ...boiling, isSealed: true }).mistRate).toBe(0);
    expect(waterVisualState({ ...boiling, isShattered: true }).mistRate).toBe(0);
  });
  it('never infers gas density or visible smoke from a supplied color', () => {
    const hydrogen = sample({ hasGas: true, gasColor: 'brown', contents: [
      ...sample().contents, { formula: 'H2', phase: 'g', mass_g: 0.002016, moles: 0.001 }] });
    expect(getGenericVfxRecipe(null, hydrogen).gasPlume).toBeUndefined();
    const no2 = { ...hydrogen, contents: [...sample().contents,
      { formula: 'NO2', phase: 'g', mass_g: 0.046, moles: 0.001 }] };
    expect(getGenericVfxRecipe(null, no2).gasPlume?.density).toBe('heavy');
    expect(getGenericVfxRecipe(null, { ...no2, isSealed: true }).gasPlume).toBeUndefined();
    const mixed = { ...no2, contents: [...hydrogen.contents, ...no2.contents] };
    expect(getGenericVfxRecipe(null, mixed).gasPlume?.density).toBe('heavy');
    expect(getGenericVfxRecipe(null, { ...hydrogen, contents: sample().contents }).gasPlume).toBeUndefined();
  });
});
