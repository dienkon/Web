import { afterEach, describe, expect, it } from 'vitest';
import { returnWallWater, stepWallCondensation, wallReturnCapacityG } from '../src/engine/wallCondensation';
import { finalizeWaterVaporOutflow, routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { sampleHeatCapacity } from '../src/engine/thermalState';
import { occupiedLiquidVolume } from '../src/handling/solidOccupancy';
import { waterBoilingPointAtPressure, DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';

const before = useAppStore.getState();
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'b', name: 'b', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, capacity_ml: 100, mass_g: 50, volume_ml: 50, volume: 0.5,
  temperature_c: 100, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, substances: ['H2O'],
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
const stored = (v: VesselState) => sampleHeatCapacity(v) * v.temperature_c - v.contents.reduce((sum, c) => sum
  + (c.formula === 'H2O' && c.phase === 's' ? c.mass_g * 334 : 0), 0);
function withContactingFilm(v: VesselState, inner = 1, outer = 0) {
  return { ...v, wallCondensation: { ...stepWallCondensation(v, 0, 0).wall, inner_g: inner, outer_g: outer,
    innerBeads: [{ mass_g: inner, y: -2, theta: 0, sliding: false }], outerBeads: [] } };
}
afterEach(() => { useAppStore.setState(before, true); SimulationEngine.clearAll(); });

describe('Returned condensate brings its own sensible enthalpy', () => {
  it('removes the old 313.8-J phantom heat for one gram of cold return', () => {
    const initial = sample(), snapshot = structuredClone(initial), next = returnWallWater(initial, 1, 25);
    const expected = (sampleHeatCapacity(initial) * 100 + 4.184 * 25) / (sampleHeatCapacity(initial) + 4.184);
    expect(next.temperature_c).toBeCloseTo(expected, 10); expect(next.temperature_c).toBeLessThan(99);
    expect(stored(next) - stored(initial)).toBeCloseTo(4.184 * 25, 8);
    expect(next.mass_g).toBe(51); expect(next.contents[0].moles * 18.015).toBeCloseTo(51, 10);
    expect(initial).toEqual(snapshot);
  });
  it('warms a colder sample, dilutes solute and uses explicit wall temperature by default', () => {
    const initial = sample({ temperature_c: 10, mass_g: 50.5, contents: [...sample().contents,
      { formula: 'NaCl', phase: 'aq', mass_g: 0.5, moles: 0.5 / 58.44 }] });
    const wall = { ...stepWallCondensation(initial, 0, 0).wall, innerWall_c: 80 };
    const next = returnWallWater({ ...initial, wallCondensation: wall }, 1);
    expect(next.temperature_c).toBeGreaterThan(10); expect(next.temperature_c).toBeLessThan(80);
    expect(stored(next) - stored(initial)).toBeCloseTo(4.184 * 80, 8);
    const salt = next.contents.find(c => c.formula === 'NaCl')!;
    expect(salt.moles).toBe(0.5 / 58.44); expect(salt.concentration_M).toBeCloseTo(salt.moles / 0.051, 10);
  });
  it('turns off a stale boiling flag when cold return subcools the sample', () => {
    const initial = sample({ temperature_c: waterBoilingPointAtPressure(), isBoiling: true, boilingIntensity: 1 });
    const next = returnWallWater(initial, 1, 25);
    expect(next.isBoiling).toBe(false); expect(next.boilingIntensity).toBe(0);
    expect(next.temperature_c).toBeLessThan(waterBoilingPointAtPressure());
  });
  it('spends incoming heat melting ice rather than simply warming the whole sample', () => {
    const initial = sample({ temperature_c: 0, mass_g: 1, volume_ml: 0, contents: [
      { formula: 'H2O', phase: 's', mass_g: 1, moles: 1 / 18.015 }], iceVolume_ml: 1 / 0.917 });
    const next = returnWallWater(initial, 1, 25), ice = next.contents.find(c => c.phase === 's')!;
    expect(next.temperature_c).toBe(0); expect(ice.mass_g).toBeCloseTo(1 - 4.184 * 25 / 334, 10);
    expect(stored(next) - stored(initial)).toBeCloseTo(4.184 * 25, 8);
    expect(next.mass_g).toBe(2);
  });
  it('uses post-mixing liquid displacement instead of treating an ice-only receiver as empty', () => {
    const ice = sample({ capacity_ml: 2, volume_ml: 0, mass_g: 1, temperature_c: -10,
      contents: [{ formula: 'H2O', phase: 's', mass_g: 1, moles: 1 / 18.015 }], iceVolume_ml: 1 / 0.917 });
    const frozen = returnWallWater(ice, 1, 0);
    expect(frozen.volume_ml).toBe(0); expect(frozen.iceVolume_ml).toBeCloseTo(2 / 0.917, 10);
    const atZero = { ...ice, temperature_c: 0 }, warmLimit = wallReturnCapacityG(atZero, 25, 2);
    // Melted/afloat pure ice displaces its mass of water, not its entire dry
    // volume. One more gram reaches the 2-mL liquid brim; two would overfill.
    expect(warmLimit).toBeCloseTo(1, 9);
    expect(occupiedLiquidVolume(returnWallWater(atZero, 2, 25))).toBeGreaterThan(2);
    const melted = returnWallWater(atZero, warmLimit, 25);
    expect(occupiedLiquidVolume(melted)).toBeCloseTo(2, 9);
    expect(occupiedLiquidVolume(melted)).toBeLessThanOrEqual(2);
  });
  it('routes immediate flash from hot dry glass into the same finite vapor budget', () => {
    const initial = withContactingFilm(sample({ temperature_c: 240, mass_g: 0, volume_ml: 0, contents: [] }));
    const sourceTemperature = 25 + 0.35 * (240 - 25), direct = returnWallWater(initial, 1, sourceTemperature);
    const point = waterBoilingPointAtPressure(), vaporEnergy = 4.184 * point + waterLatentHeatJ_G(point);
    expect(direct.mass_g).toBe(0); expect(direct.evaporated_ml).toBe(1);
    expect(stored(direct) + vaporEnergy - stored(initial)).toBeCloseTo(4.184 * sourceTemperature, 7);
    const routed = routeWaterVaporToWall(initial, initial, 0.01);
    expect(routed.availableVapor_g).toBeCloseTo(1, 12);
    const wall = routed.vessel.wallCondensation!;
    expect(wall.innerThermalEvaporated_g).toBeGreaterThan(0);
    expect(wall.inner_g).toBeCloseTo(0, 12);
    expect(wall.returnedSensibleEnergy_J).toBeCloseTo(wall.returned_g * 4.184 * wall.innerWall_c, 10);
    expect(stored(routed.vessel) + wall.inner_g * 4.184 * wall.innerWall_c + routed.availableVaporEnergy_J
      + wall.heatRejected_J).toBeCloseTo(stored(initial) + 4.184 * sourceTemperature, 7);
    const final = finalizeWaterVaporOutflow(routed.vessel, initial, routed.availableVapor_g, 0.01);
    expect(final.waterVaporReleased_g).toBeCloseTo(1, 12);
    const again = routeWaterVaporToWall(final, final, 0.01);
    expect(routed.availableVapor_g + again.availableVapor_g + again.vessel.wallCondensation!.inner_g).toBeCloseTo(1, 12);
    expect(again.vessel.mass_g).toBe(0);
  });
  it('retains unadmitted water in the bead pool instead of overflowing a cold ice receiver', () => {
    const initial = withContactingFilm(sample({ capacity_ml: 2, volume_ml: 0, mass_g: 1, temperature_c: -10,
      contents: [{ formula: 'H2O', phase: 's', mass_g: 1, moles: 1 / 18.015 }], iceVolume_ml: 1 / 0.917,
      environment: { ...DEFAULT_LAB_ENVIRONMENT, temperature_c: 0, relativeHumidity: 0 } }));
    // Below-zero wall temperature is outside the liquid-return closure.
    const wall = stepWallCondensation(initial, 0.01, 0);
    expect(wall.returnedStep_g).toBe(0); expect(wall.wall.inner_g).toBe(1);
    const admissible = withContactingFilm({ ...initial, environment: DEFAULT_LAB_ENVIRONMENT }, 2);
    const routed = routeWaterVaporToWall(admissible, admissible, 0.01);
    expect(occupiedLiquidVolume(routed.vessel)).toBeLessThanOrEqual(2 + 1e-10);
    expect(routed.vessel.wallCondensation!.inner_g).toBeGreaterThan(0);
    expect(routed.vessel.mass_g + routed.vessel.wallCondensation!.inner_g + routed.availableVapor_g).toBeCloseTo(3, 9);
  });
  it('keeps source, wall and external sinks conserved in the live store during flash and subsequent frames', () => {
    const initial = withContactingFilm(sample({ temperature_c: 240, mass_g: 0, volume_ml: 0, contents: [], substances: [] }));
    useAppStore.setState({ vessels: { b: initial }, vesselIds: ['b'], burners: {}, spills: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 3; i++) {
      useAppStore.getState().tickSimulation(0.05);
      const v = useAppStore.getState().vessels.b;
      expect(v.mass_g + (v.wallCondensation?.inner_g ?? 0) + (v.waterVaporReleased_g ?? 0)).toBeCloseTo(1, 9);
    }
    expect(useAppStore.getState().vessels.b.waterVaporReleased_g).toBeGreaterThan(0.99);
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['b']);
  });
  it('rejects invalid mass/temperature receipts before changing inventory', () => {
    const initial = sample();
    expect(returnWallWater(initial, 1)).toBe(initial);
    for (const [mass, temperature] of [[NaN, 25], [Infinity, 25], [-1, 25], [1, NaN], [1, -1], [1, 400]]) {
      expect(returnWallWater(initial, mass, temperature)).toBe(initial);
    }
    expect(wallReturnCapacityG(initial, NaN, 1)).toBe(0);
    const opaqueLiquid = { ...initial, contents: [] };
    expect(returnWallWater(opaqueLiquid, 1, 25)).toBe(opaqueLiquid);
    expect(wallReturnCapacityG(opaqueLiquid, 25, 1)).toBe(0);
  });
});
