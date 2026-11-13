import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProgramById } from '../src/vfx/programs/library';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { assessProgramConditions } from '../src/science/conditions';
import { advanceCatalyticProgress } from '../src/engine/contactKinetics';
import { burnerIsBurning, vesselHasBurnerHeat, stepAlcoholBurner } from '../src/engine/burnerEnergy';
import { pointInAlcoholFlame, ALCOHOL_FLAME } from '../src/science/flameGeometry';
import { ReactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { getReactionController } from '../src/vfx/reactions/registry';
import { useAppStore } from '../src/store/useAppStore';
import type { BurnerState, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => { useAppStore.setState(original, true); vi.restoreAllMocks(); });
const shell: VesselState = { id: 'sequence', type: 'beaker', name: 'Sequence', capacity_ml: 250,
  volume_ml: 0, volume: 0, mass_g: 0, temperature_c: 25, ph: 7, position: [0, 0, 0], rotationY: 0,
  isLocked: false, contents: [], substances: [], hasGas: false, hasPrecipitate: false, isBoiling: false };
const burner: BurnerState = { id: 'source', position: [0, 0, 0], isOn: true, intensity: 3, fuelLevel_ml: 1 };

describe('Source, activation and effect sequence', () => {
  it('requires a fueled finite source at the correct height and restricts contact to the rendered flame', () => {
    expect(pointInAlcoholFlame([0, ALCOHOL_FLAME.baseY + 0.3, 0], burner.position)).toBe(true);
    for (const point of [[0, 0.2, 0], [0, 2, 0], [0.6, 1.1, 0], [0, NaN, 0]])
      expect(pointInAlcoholFlame(point, burner.position)).toBe(false);
    for (const patch of [{ fuelLevel_ml: 0 }, { ethanolVolumeFraction: 0 }, { intensity: 0 }, { intensity: NaN }]) {
      const invalid = { ...burner, ...patch };
      expect(burnerIsBurning(invalid)).toBe(false);
      expect(stepAlcoholBurner(invalid, 0.1).energy_J).toBe(0);
      expect(vesselHasBurnerHeat({ position: [0, 1.2, 0] }, { source: invalid })).toBe(false);
    }
    expect(vesselHasBurnerHeat({ position: [0, 9, 0] }, { burner })).toBe(false);
  });
  it('does not accept reagents in another compartment, an infinite quantity, or an empty physical sample', () => {
    const p = getProgramById('hcl_naoh')!;
    const v = createStudioSample(p, shell);
    for (const contents of [[], v.contents.map(c => c.formula === 'HCl' ? { ...c, location: 'filter' as const } : c),
      v.contents.map(c => c.formula === 'HCl' ? { ...c, moles: Infinity } : c)])
      expect(assessProgramConditions(p, contents, { requireInventory: true }).ready).toBe(false);
    expect(assessProgramConditions(p, v.contents, { temperature_c: NaN }).ready).toBe(false);
  });
  it('honors the full induction interval and the residual part of a frame that crosses it', () => {
    const p = getProgramById('al_hcl')!, v = createStudioSample(p, shell);
    const k = planStudioProgram(p, v, 'vi').kinetics!;
    expect(advanceCatalyticProgress(k, v, 2.9)).toBe(0);
    k.progress = advanceCatalyticProgress(k, v, 0.2);
    expect(k.progress).toBeCloseTo(1 - 2 ** (-0.1 / 1.5), 12);
    expect(k.inductionElapsed_s).toBeCloseTo(3.1, 12);
  });
  it('keeps first-order material conversion independent of frame partition and visual clip length', () => {
    const p = getProgramById('h2o2_mno2')!, v = createStudioSample(p, shell);
    const run = (steps: number) => {
      const k = planStudioProgram(p, v, 'vi').kinetics!; k.duration = 90;
      for (let i = 0; i < steps; i++) k.progress = advanceCatalyticProgress(k, v, p.chemistry.kinetics.halfTime_s / steps);
      return k.progress;
    };
    expect(run(1)).toBeCloseTo(0.5, 12); expect(run(120)).toBeCloseTo(run(1), 12);
  });
  it('does not let a dedicated controller emit while authoritative chemistry is stalled', () => {
    useAppStore.setState({ vessels: { [shell.id]: shell } });
    const engine = new ReactionSimulationEngine();
    engine.startReaction(shell.id, 'burn_magnesium', { chemistryProgress: 0.4, chemistryRate_s: 0 });
    const update = vi.spyOn(getReactionController('burn_magnesium')!, 'update');
    engine.update(0.1);
    expect(update).not.toHaveBeenCalled(); expect(engine.getRuntime(shell.id)!.progress).toBe(0.4);
    engine.getRuntime(shell.id)!.chemistryRate_s = 0.1;
    engine.update(0.1); expect(update).toHaveBeenCalled(); engine.resetAll();
  });
  it('does not let forward scrubbing bypass a missing live thermal condition', () => {
    const p = getProgramById('nahco3_heat')!;
    const v = { ...createStudioSample(p, shell), temperature_c: 90 };
    const k = planStudioProgram(p, v, 'vi').kinetics!;
    expect(k).toBeDefined();
    const cold = { ...v, temperature_c: 25 };
    useAppStore.setState({ vessels: { [v.id]: cold }, activeKinetics: { [v.id]: k }, burners: {} });
    expect(useAppStore.getState().seekStudioProgram(v.id, 0.1)).toBe(false);
    expect(useAppStore.getState().activeKinetics[v.id].progress).toBe(0);
    expect(useAppStore.getState().vessels[v.id].contents).toEqual(cold.contents);
  });
});
