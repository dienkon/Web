import { afterEach, describe, expect, it } from 'vitest';
import { applyThermalEnergy, sampleHeatCapacity } from '../src/engine/thermalState';
import type { ThermalStep } from '../src/engine/thermalState';
import { equilibrateWaterIce, createIceWaterSample, liquidSurfaceVolume, waterPhaseMasses } from '../src/engine/waterPhase';
import { WATER_CP_J_G_K, ICE_CP_J_G_K, WATER_FUSION_J_G } from '../src/engine/waterProperties';
import { getProgramById } from '../src/vfx/programs/library';
import { createStudioSample } from '../src/engine/studioProgram';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const shell: VesselState = { id: 'water', name: 'Water', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  volume_ml: 0, volume: 0, mass_g: 0, temperature_c: 25, ph: 7,
  hasPrecipitate: false, hasGas: false, isBoiling: false };
function water(mass = 1, temperature = 0, ice = false): VesselState {
  return { ...shell, contents: [{ formula: 'H2O', phase: ice ? 's' : 'l', mass_g: mass, moles: mass / 18.015 }],
    substances: ['H2O'], mass_g: mass, volume_ml: ice ? 0 : mass, temperature_c: temperature };
}
const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));
function conserved(initial: VesselState, final: ThermalStep) {
  expect(final.contents!.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(initial.mass_g - (final.evaporatedStep_g ?? 0), 10);
  expect(final.mass_g).toBeCloseTo(initial.mass_g - (final.evaporatedStep_g ?? 0), 10);
}
describe('Pure-water phase energy and finite volume', () => {
  it('freezes only the amount supported by removed heat, holding the coexistence temperature at zero', () => {
    const initial = water(1, 10);
    const heat = -(33.2 + WATER_CP_J_G_K) * 10 - WATER_FUSION_J_G / 2;
    const end = applyThermalEnergy(initial, heat);
    expect(end.temperature_c).toBe(0);
    expect(waterPhaseMasses({ ...initial, ...end })).toEqual({ liquid_g: 0.5, ice_g: 0.5 });
    expect(end.latentEnergy_J).toBeCloseTo(-WATER_FUSION_J_G / 2, 10);
    expect(end.sensibleEnergy_J + end.latentEnergy_J).toBeCloseTo(heat, 10);
    conserved(initial, end);
  });
  it('warms subzero ice, melts it, then warms the resulting liquid in that order', () => {
    const initial = water(1, -10, true);
    const half = applyThermalEnergy(initial, (33.2 + ICE_CP_J_G_K) * 10 + WATER_FUSION_J_G / 2);
    expect(half.temperature_c).toBe(0);
    expect(waterPhaseMasses({ ...initial, ...half }).ice_g).toBeCloseTo(0.5, 10);
    const end = applyThermalEnergy({ ...initial, ...half }, WATER_FUSION_J_G / 2 + (33.2 + WATER_CP_J_G_K) * 5);
    expect(end.temperature_c).toBeCloseTo(5, 10);
    expect(waterPhaseMasses({ ...initial, ...end }).ice_g).toBe(0);
    expect(end.volume_ml).toBeCloseTo(1, 10);
    conserved(initial, end);
  });
  it('does not evaporate solid ice as though it were liquid water', () => {
    const initial = water(1, 0, true);
    const end = applyThermalEnergy(initial, WATER_FUSION_J_G / 4);
    expect(end.evaporatedStep_g).toBe(0);
    expect(end.volume_ml).toBeCloseTo(0.25, 10);
    expect(waterPhaseMasses({ ...initial, ...end }).ice_g).toBeCloseTo(0.75, 10);
    expect(sampleHeatCapacity(initial)).toBeCloseTo(33.2 + ICE_CP_J_G_K, 10);
  });
  it('does not invent a zero-degree freezing point for a salt solution', () => {
    const initial = water(20, -2);
    initial.contents.push({ formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 });
    initial.mass_g += 1;
    expect(equilibrateWaterIce(initial, -100)).toBeNull();
    const end = applyThermalEnergy(initial, -100);
    expect(end.contents!.some(item => item.phase === 's')).toBe(false);
    expect(end.thermalModelLimit).toBeTruthy();
  });
  it('never returns below absolute zero and reports energy outside the supported model', () => {
    for (const initial of [water(1, 0), { ...shell, temperature_c: 25 }]) {
      const end = applyThermalEnergy(initial, -1e8);
      expect(end.temperature_c).toBeGreaterThanOrEqual(-273.15000001);
      expect(end.thermalEnergyOutsideModel_J).toBeLessThan(0);
      expect(end.thermalModelLimit).toBeTruthy();
      expect(end.sensibleEnergy_J + end.latentEnergy_J + end.thermalEnergyOutsideModel_J!).toBeCloseTo(-1e8, 4);
    }
  });
  it('materializes newly generated liquid water in a dry reaction and updates it without replay growth', () => {
    const program = getProgramById('cuoh2_decomp')!;
    const baseline = { ...createStudioSample(program, shell), temperature_c: 70 };
    expect(baseline.volume_ml).toBe(0);
    let current = baseline;
    for (const extent of [0.25, 0.5, 1]) {
      current = { ...current, ...applyProgramWithThermalSinks(program, baseline, current, extent) };
      expect(current.volume_ml).toBeCloseTo(0.001 * 18.015 * extent, 10);
      expect(current.contents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(baseline.mass_g, 10);
    }
    const again = applyProgramWithThermalSinks(program, baseline, current, 1);
    expect(again.volume_ml).toBeCloseTo(current.volume_ml, 10);
  });
  it('keeps the floating-water level steady during melting and handles shallow bottom contact', () => {
    const initial = createIceWaterSample(shell);
    expect(liquidSurfaceVolume(initial)).toBeCloseTo(25, 10);
    const melted = { ...initial, ...applyThermalEnergy(initial, 5 * WATER_FUSION_J_G) };
    expect(liquidSurfaceVolume(melted)).toBeCloseTo(25, 10);
    expect(melted.volume_ml).toBeCloseTo(25, 10);
    const shallow = { ...initial, volume_ml: 0.1 };
    expect(liquidSurfaceVolume(shallow)).toBeLessThan(5.1);
    expect(liquidSurfaceVolume(shallow)).toBeGreaterThan(0.1);
  });
  it('prepares a separate specimen and spends ambient heat on melting in actual ticks', () => {
    const original = { ...shell, id: 'original' };
    useAppStore.setState({ vessels: { original }, vesselIds: ['original'], burners: {},
      activeKinetics: {}, pendingReactions: {}, isSimulationPaused: false, timeScale: 1 });
    const id = useAppStore.getState().prepareStudioIceSample()!;
    expect(useAppStore.getState().vessels.original).toBe(original);
    for (let frame = 0; frame < 10; frame++) useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), sample = state.vessels[id];
    expect(state.vessels.original).toMatchObject(original);
    expect(sample.temperature_c).toBe(0);
    expect(waterPhaseMasses(sample).ice_g).toBeLessThan(5);
    expect(waterPhaseMasses(sample).ice_g).toBeGreaterThan(4.9);
    expect(sample.mass_g).toBe(25);
    expect(sample.volume_ml).toBeGreaterThan(20);
    expect(state.activeKinetics[id]).toBeUndefined();
  });
});
