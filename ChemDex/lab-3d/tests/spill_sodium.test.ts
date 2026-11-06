import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SpillState, VesselState } from '../src/types/chemistry';
import { stepSpillChemistry, stepWorkbenchSpills } from '../src/engine/spillChemistry';
import { mergeWorkbenchSpill } from '../src/engine/spillInventory';
import { computeMolarMass } from '../src/engine/ledger';
import { sodiumMetalMass, sodiumReactionDuration, SODIUM_DENSITY_G_ML } from '../src/science/sodiumWater';
import { sodiumPelletShape, submergedPelletVolume } from '../src/vfx/geometry/sodiumPellet';
import { spillSodiumBody, spillSurfaceY } from '../src/vfx/geometry/spillSodium';
import { solveSessileDrop } from '../src/science/sessileDrop';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { useAppStore } from '../src/store/useAppStore';
import { useLabEnvironment } from '../src/store/useLabEnvironment';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { runContactScenario } from '../src/vfx/dev/contactScenarios';
import { vfxBus } from '../src/vfx/bus';
import { debounceSaveLocalState, loadPersistedLabState } from '../src/store/persistence';

const storeBefore = useAppStore.getState(), roomBefore = useLabEnvironment.getState().conditions;
afterEach(() => { useAppStore.setState(storeBefore, true); useLabEnvironment.getState().setConditions(roomBefore);
  vi.useRealTimers(); vi.unstubAllGlobals(); });
const row = (formula: string, mass_g: number, phase: string) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
const shell: VesselState = { id: 'sodium-source', name: 'Sodium source', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, volume_ml: 50, volume: 0.5, mass_g: 50.1,
  contents: [row('Na', 0.1, 's'), row('H2O', 50, 'l')], substances: ['Na', 'H2O'],
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
const sample = (metal = 0.1): SpillState => ({ id: 'sodium-pool', position: [0, -1.175, 0], radius: 1,
  volume_ml: 50, mass_g: 50 + metal, contents: [row('Na', metal, 's'), row('H2O', 50, 'l')],
  substances: ['Na', 'H2O'], temperature_c: 25, color: '#fff', isHazard: true, timestamp: 0 });
const metalMass = (s: SpillState) => sodiumMetalMass({ contents: s.contents ?? [] });
const gasMass = (s: SpillState) => Object.values(s.escapedGas_g ?? {}).reduce((n, g) => n + g, 0);
const duration = sodiumReactionDuration(shell);
function setup() {
  useLabEnvironment.getState().setConditions(DEFAULT_LAB_ENVIRONMENT);
  useAppStore.setState({ vessels: { [shell.id]: { ...shell, contents: shell.contents.map(c => ({ ...c })) } }, vesselIds: [shell.id],
    burners: {}, spills: {}, inFlightPours: [], workbenchEscapedGas_g: {}, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, wasteMass_g: 0, wasteContents: [], isSimulationPaused: false, timeScale: 1 });
}

describe('One finite sodium-water contact after leaving the glass', () => {
  it.each([1, 7, 70])('consumes half of the limiting sodium in half its contact duration with %s subdivisions', n => {
    const initial = sample(); let current = initial;
    for (let i = 0; i < n; i++) current = stepSpillChemistry(current, duration / 2 / n);
    expect(metalMass(current)).toBeCloseTo(0.05, 10);
    expect(current.sodiumContact!.duration_s).toBe(duration);
    expect(current.sodiumContact!.elapsed_s).toBeCloseTo(duration / 2, 10);
    const reacted = 0.05 / computeMolarMass('Na');
    expect(current.contents!.find(c => c.formula === 'NaOH')!.moles).toBeCloseTo(reacted, 10);
    expect(current.escapedGas_g!.H2 / computeMolarMass('H2')).toBeCloseTo(reacted / 2, 10);
    expect(current.mass_g + gasMass(current)).toBeCloseTo(initial.mass_g, 9);
  });
  it('finishes at the captured duration and stops the source instead of growing an asymptotic visible tail', () => {
    const initial = sample(); let current = initial;
    for (let i = 0; i < 70; i++) current = stepSpillChemistry(current, duration / 70);
    expect(metalMass(current)).toBeLessThan(1e-10);
    const gas = current.escapedGas_g!.H2, heat = current.reactionHeat_J;
    current = stepSpillChemistry(current, 1);
    expect(current.escapedGas_g!.H2).toBe(gas); expect(current.reactionHeat_J).toBe(heat);
    expect(current.gasRate_mol_s).toBe(0);
    expect(current.mass_g + gasMass(current)).toBeCloseTo(initial.mass_g, 9);
  });
  it('keeps the disruptive contact stationary in one short regime rather than switching to small-pellet timing halfway through', () => {
    let current = sample(0.8);
    for (let i = 0; i < 5; i++) current = stepSpillChemistry(current, 0.05);
    expect(current.sodiumContact!.regime).toBe('disruptive');
    expect(current.sodiumContact!.duration_s).toBe(0.25);
    expect(metalMass(current)).toBeLessThan(1e-10);
    expect(current.mass_g + gasMass(current)).toBeCloseTo(50.8, 9);
  });
  it('rebases a fresh contact on retained quantities after a real dose merges without restoring consumed sodium', () => {
    const half = stepSpillChemistry(sample(), duration / 2);
    const merged = Object.values(mergeWorkbenchSpill({ [half.id]: half }, half.position, 10, ['H2O'], '#fff', '', 10, [row('H2O', 10, 'l')]))[0];
    expect(merged.sodiumContact).toBeUndefined(); expect(metalMass(merged)).toBeCloseTo(0.05, 10);
    const begun = stepSpillChemistry(merged, 0.01);
    expect(begun.sodiumContact!.initialMetal_g).toBeCloseTo(0.05, 10);
    const rest = stepSpillChemistry(begun, begun.sodiumContact!.duration_s);
    expect(metalMass(rest)).toBeLessThan(1e-10);
    expect(rest.mass_g + gasMass(rest)).toBeCloseTo(60.1, 9);
  });
  it('recovers a malformed saved contact without NaN rates or lost material', () => {
    const initial = sample(); initial.sodiumContact = { initialMetal_g: NaN, reactiveMetal_g: Infinity,
      duration_s: 0, elapsed_s: -1, regime: 'skitter' };
    const next = stepSpillChemistry(initial, 0.1);
    expect(next.sodiumContact!.duration_s).toBe(duration);
    expect(metalMass(next)).toBeLessThan(0.1);
    expect(Number.isFinite(next.gasRate_mol_s)).toBe(true);
    expect(next.mass_g + gasMass(next)).toBeCloseTo(initial.mass_g, 9);
  });
  it('does not advance or emit at zero simulation time', () => {
    const begun = stepSpillChemistry(sample(), 0.1);
    expect(stepSpillChemistry(begun, 0)).toBe(begun);
    expect(stepWorkbenchSpills({ [begun.id]: { ...begun, escapedGas_g: undefined } }, 0).spills[begun.id].sodiumContact)
      .toBe(begun.sodiumContact);
  });
  it('restores the accepted contact clock from the actual save envelope instead of restarting the remaining metal', async () => {
    vi.useFakeTimers(); const values = new Map<string, string>(); vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value) });
    const half = stepSpillChemistry(sample(), duration / 2);
    debounceSaveLocalState({}, {}, { inFlightPours: [], spills: { [half.id]: half }, wasteMass_g: 0, wasteContents: [] });
    await vi.advanceTimersByTimeAsync(1000);
    const restored = loadPersistedLabState()!.materials!.spills[half.id];
    expect(restored.sodiumContact).toEqual(half.sodiumContact);
    const threeQuarters = stepSpillChemistry(restored, duration / 4);
    expect(metalMass(threeQuarters)).toBeCloseTo(0.025, 10);
    expect(threeQuarters.mass_g + gasMass(threeQuarters)).toBeCloseTo(50.1, 9);
  });
});

describe('Mass-scaled sodium in the actual puddle profile', () => {
  it.each([0, 0.5, 1])('preserves physical metal volume for melt factor %s', melt => {
    const s = sample(), body = spillSodiumBody(s, solveSessileDrop(s.volume_ml)), shape = sodiumPelletShape(melt);
    const volume_m3 = submergedPelletVolume(shape.positions, 2) * (body.radius * METERS_PER_SCENE_UNIT) ** 3;
    expect(volume_m3).toBeCloseTo(0.1 / SODIUM_DENSITY_G_ML * 1e-6, 12);
  });
  it('supports a shallow pellet on the tabletop and constrains its entire body inside the wet footprint', () => {
    const s = sample(), drop = solveSessileDrop(s.volume_ml)!;
    const body = spillSodiumBody(s, drop, 100, 100);
    expect(body.centerY + body.shape.bottom * body.radius).toBeGreaterThanOrEqual(-1e-10);
    expect(Math.hypot(body.x, body.z) + body.horizontalRadius).toBeLessThanOrEqual(drop.radius_m / METERS_PER_SCENE_UNIT + 1e-10);
    expect(body.surface).toBe(spillSurfaceY(drop, body.x, body.z));
    expect(spillSurfaceY(drop, 100, 100)).toBe(0);
  });
  it('draws no decorative sodium after the finite metal is exhausted', () => {
    const s = stepSpillChemistry(sample(), duration), body = spillSodiumBody(s, solveSessileDrop(s.volume_ml));
    expect(body.mass_g).toBeLessThan(1e-10); expect(body.active).toBe(false);
    expect(body.radius).toBeLessThan(1e-6);
  });
});

describe('Shatter, replace and repeat without discarding a live sample', () => {
  it('rejects replacement of intact glass and preserves its reaction baseline and material', () => {
    setup(); const before = useAppStore.getState(), v = before.vessels[shell.id];
    before.replaceShatteredVessel(shell.id);
    expect(useAppStore.getState().vessels[shell.id]).toBe(v);
    expect(useAppStore.getState().spills).toBe(before.spills);
  });
  it('replaces only the body at room conditions, retires specimen controls and preserves the existing reacting spill', async () => {
    setup(); const events: number[] = [];
    const off = vfxBus.on('explosion', () => events.push(1));
    try {
      await runContactScenario(shell.id, 'sodium_spill');
      useAppStore.getState().tickSimulation(0.1);
      const broken = useAppStore.getState().vessels[shell.id], spills = useAppStore.getState().spills;
      expect(broken.isShattered).toBe(true); expect(events).toHaveLength(0);
      const p = Object.values(spills)[0]; expect(p.sodiumContact!.elapsed_s).toBeGreaterThan(0);
      useLabEnvironment.getState().setConditions({ temperature_c: 33, pressure_atm: 0.8 });
      useAppStore.getState().replaceShatteredVessel(shell.id);
      const fresh = useAppStore.getState().vessels[shell.id];
      expect(fresh.temperature_c).toBe(33); expect(fresh.internalPressure_atm).toBe(0.8);
      expect(fresh.isShattered).toBe(false); expect(fresh.bodyRevision).toBe((broken.bodyRevision ?? 0) + 1);
      expect(fresh.effectSampleRevision).toBe((broken.effectSampleRevision ?? 0) + 1);
      expect(fresh.studioProgramId).toBeUndefined(); expect(fresh.programHeatApplied_J).toBe(0);
      expect(useAppStore.getState().spills).toBe(spills);
      useAppStore.getState().setSimulationPaused(true);
      useAppStore.getState().tickSimulation(1);
      expect(useAppStore.getState().spills).toBe(spills);
      useAppStore.getState().setSimulationPaused(false);
      useAppStore.getState().tickSimulation(0.1);
      expect(metalMass(Object.values(useAppStore.getState().spills)[0])).toBeLessThan(metalMass(p));
      expect(useAppStore.getState().activeKinetics[shell.id]).toBeUndefined();
      const gas = useAppStore.getState().workbenchEscapedGas_g.H2;
      expect(gas).toBeGreaterThan(0);
    } finally { off(); }
  });
});
