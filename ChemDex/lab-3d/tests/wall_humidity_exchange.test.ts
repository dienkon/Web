import { afterEach, describe, expect, it } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { wallDropCap, wallDropEvaporationG } from '../src/science/wallDropletGeometry';
import { waterSaturationPressurePa } from '../src/science/waterSaturation';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { transportWallBeads } from '../src/engine/wallDropletTransport';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';

const original = useAppStore.getState();
const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'a', name: 'a', type: 'beaker', capacity_ml: 250, position: [0, 0, 0], rotationY: 0,
  isLocked: false, volume_ml: 0, volume: 0, mass_g: 0, temperature_c: 25, contents: [], substances: [],
  ph: 7, isBoiling: false, hasGas: false, hasPrecipitate: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch,
});
function wet(patch: Partial<VesselState> = {}, inner = 1e-6, outer = 0) {
  const v = sample(patch), wall = stepWallCondensation(v, 0, 0).wall;
  return { ...v, wallCondensation: { ...wall, inner_g: inner, outer_g: outer,
    innerBeads: [{ mass_g: inner, y: 0.5, theta: 0, sliding: false }],
    outerBeads: [{ mass_g: outer, y: 0.5, theta: 1, sliding: false }] } };
}
afterEach(() => useAppStore.setState(original, true));

describe('Finite cap evaporation follows humidity and exposed water area', () => {
  it('reconciles stale or malformed bead metadata to the actual inventory even far below 1e-10 g', () => {
    const mass = 1e-15;
    for (const previous of [
      [{ mass_g: 1e-12, y: 0.5, theta: 0, sliding: false }],
      [{ mass_g: NaN, y: 0.5, theta: 0, sliding: false }],
      [{ mass_g: mass, y: NaN, theta: 0, sliding: false }],
    ]) {
      const out = transportWallBeads({ initialMass_g: mass, deposited_g: 0, evaporated_g: 0,
        evaporationFlux_g_m2_s: 0, dt: 0.01, points: [[0.5, 0], [0.5, 1]], bottom: 0, top: 1,
        temperature_c: 25, inner: false, previous });
      expect((out.retained_g + out.drained_g + out.evaporated_g) / mass).toBeCloseTo(1, 13);
      expect(out.beads.every(b => [b.mass_g, b.y, b.theta].every(Number.isFinite))).toBe(true);
    }
  });
  it('uses the curved cap area and matches the analytic shrinking-radius solution', () => {
    const mass = 1e-6, flux = 0.1, dt = 0.5, cap = wallDropCap(mass);
    // At fixed contact angle/density, m is proportional to R^3, area to R^2.
    const expectedRadius = cap.radius_m - flux * cap.surfaceArea_m2 * cap.radius_m / (3 * mass) * dt;
    const expectedMass = mass * (expectedRadius / cap.radius_m) ** 3;
    expect(cap.surfaceArea_m2).toBeCloseTo(2 * Math.PI * cap.radius_m * cap.height_m, 18);
    expect(mass - wallDropEvaporationG(mass, flux, dt)).toBeCloseTo(expectedMass, 16);
    const half = mass - wallDropEvaporationG(mass, flux, dt / 2);
    expect(half - wallDropEvaporationG(half, flux, dt / 2)).toBeCloseTo(expectedMass, 16);
    expect(wallDropEvaporationG(mass, flux, 1e9)).toBe(mass);
  });
  it('integrates the same finite shrinking cap through actual bead substeps', () => {
    const initial = 1e-6, flux = 0.05, dt = 0.2;
    const out = transportWallBeads({ initialMass_g: initial, deposited_g: 0, evaporated_g: 0,
      evaporationFlux_g_m2_s: flux, dt, points: [[0.5, 0], [0.5, 1]], bottom: 0, top: 1,
      temperature_c: 25, inner: false,
      previous: [{ mass_g: initial, y: 0.5, theta: 0, sliding: false }] });
    expect(out.evaporated_g).toBeCloseTo(wallDropEvaporationG(initial, flux, dt), 16);
    expect(out.retained_g + out.evaporated_g + out.drained_g).toBeCloseTo(initial, 16);
  });
  it('does not evaporate a bead touching a full receiving pool when return admission is zero', () => {
    const out = transportWallBeads({ initialMass_g: 2e-6, deposited_g: 0, evaporated_g: 0,
      evaporationFlux_g_m2_s: 0.1, dt: 0.2, points: [[0.5, 0], [0.5, 1]], bottom: 0, top: 1,
      temperature_c: 25, inner: true, maximumDrain_g: 0, previous: [
        { mass_g: 1e-6, y: -0.01, theta: 0, sliding: false },
        { mass_g: 1e-6, y: 0.5, theta: 2, sliding: false }] });
    expect(out.beads[0].mass_g).toBe(1e-6);
    expect(out.beads[1].mass_g).toBeLessThan(1e-6);
    expect(out.drained_g).toBe(0);
    expect(out.retained_g + out.evaporated_g).toBeCloseTo(2e-6, 16);
  });
  it('has exactly zero net evaporation at equal gas and droplet water pressures', () => {
    const before = wet({ environment: { ...DEFAULT_LAB_ENVIRONMENT, relativeHumidity: 1 } });
    const out = stepWallCondensation(before, 1, 0);
    expect(out.wallEvaporatedStep_g).toBe(0); expect(out.availableVapor_g).toBe(0);
    expect(out.wall.inner_g).toBe(before.wallCondensation.inner_g);
    expect(out.wall.innerEvaporationFlux_g_m2_s).toBe(0);
    expect(out.wall.innerGasWaterPressure_Pa).toBe(waterSaturationPressurePa(25));
  });
  it('dries faster in lower humidity and does not run a humidity-independent 30-second clock', () => {
    const out = [0, 0.5, 1].map(relativeHumidity => stepWallCondensation(wet({
      environment: { ...DEFAULT_LAB_ENVIRONMENT, relativeHumidity } }), 0.2, 0));
    expect(out[0].wallEvaporatedStep_g).toBeGreaterThan(out[1].wallEvaporatedStep_g);
    expect(out[1].wallEvaporatedStep_g).toBeGreaterThan(0);
    expect(out[2].wallEvaporatedStep_g).toBe(0);
    expect(out[0].wall.innerWall_c).toBeLessThan(out[1].wall.innerWall_c);
    expect(out[1].wall.innerWall_c).toBeLessThan(25);
    expect(out[2].wall.innerWall_c).toBe(25);
  });
  it('uses partial pressure rather than a wall-temperature-versus-bulk drying gate', () => {
    const before = wet({ temperature_c: 80 });
    const out = stepWallCondensation(before, 0.2, 0, { headspaceWaterPressure_Pa: 0,
      wallTemperatures: { innerWall_c: 10 } });
    expect(out.wall.innerWall_c).toBeLessThan(before.temperature_c);
    expect(out.wallEvaporatedStep_g).toBeGreaterThan(0);
    const saturated = stepWallCondensation(before, 0.2, 0, { headspaceWaterPressure_Pa: waterSaturationPressurePa(10),
      wallTemperatures: { innerWall_c: 10 } });
    expect(saturated.wallEvaporatedStep_g).toBe(0);
    const superSaturated = stepWallCondensation(before, 0.2, 0, { headspaceWaterPressure_Pa: waterSaturationPressurePa(10) * 2,
      wallTemperatures: { innerWall_c: 10 } });
    expect(superSaturated.wallEvaporatedStep_g).toBe(0);
  });
  it('evaporates an existing exterior bead according to that bead, independently of bulk fill area', () => {
    const empty = wet({}, 0, 1e-6), filled = wet({ volume_ml: 100, mass_g: 100,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }] }, 0, 1e-6);
    const a = stepWallCondensation(empty, 0.2, 0), b = stepWallCondensation(filled, 0.2, 0);
    expect(a.wall.ambientReleased_g).toBeGreaterThan(0);
    expect(a.wall.ambientReleased_g).toBe(b.wall.ambientReleased_g);
    expect(a.wall.outer_g + a.wall.ambientReleased_g + a.drainedStep_g).toBeCloseTo(1e-6, 16);
    expect(a.latentHeatToSample_J).toBe(0);
    expect(a.wall.outer_g * 4.184 * a.wall.outerWall_c + a.wall.outerMassTransferVaporEnergy_J!)
      .toBeCloseTo(1e-6 * 4.184 * 25, 14);
  });
  it('uses humid room air when no gas stream exists, and explicit dry reaction gas when it does', () => {
    const saturated = wet({ environment: { ...DEFAULT_LAB_ENVIRONMENT, relativeHumidity: 1 } });
    const idle = routeWaterVaporToWall(saturated, saturated, 0.2);
    expect(idle.availableVapor_g).toBe(0);
    expect(idle.vessel.wallCondensation!.innerGasWaterPressure_Pa).toBe(waterSaturationPressurePa(25));
    const flowing = routeWaterVaporToWall({ ...saturated, escapedGas_g: { CO2: 0.1 } }, saturated, 0.2);
    expect(flowing.availableVapor_g).toBeGreaterThan(0);
    expect(flowing.vessel.wallCondensation!.innerGasWaterPressure_Pa).toBe(0);
    expect(flowing.vessel.waterVaporFromChemistry_g).toBe(0);
  });
  it('carries actual drying mass/enthalpy from finite film storage without an isothermal latent credit', () => {
    const before = wet(), out = routeWaterVaporToWall(before, before, 0.2), wall = out.vessel.wallCondensation!;
    const mass = out.availableVapor_g;
    expect(mass).toBeGreaterThan(0);
    expect(wall.innerMassTransferEvaporated_g).toBeCloseTo(mass, 16);
    expect(wall.inner_g + mass + wall.returned_g).toBeCloseTo(1e-6, 16);
    expect(wall.innerWall_c).toBeLessThan(25);
    expect(out.availableVaporEnergy_J / mass).toBeLessThan(4.184 * 25 + waterLatentHeatJ_G(25));
    expect(out.availableVaporEnergy_J + wall.inner_g * 4.184 * wall.innerWall_c).toBeCloseTo(1e-6 * 4.184 * 25, 14);
    expect(wall.heatRejected_J).toBe(0);
    expect(out.vessel.thermalVaporEnthalpy_J ?? 0).toBe(0);
  });
  it('keeps inner water sealed while exterior beads can exchange with room air', () => {
    const before = wet({ isSealed: true }, 1e-6, 1e-6), out = stepWallCondensation(before, 0.2, 0);
    expect(out.wallEvaporatedStep_g).toBe(0); expect(out.wall.inner_g).toBe(1e-6);
    expect(out.wall.ambientReleased_g).toBeGreaterThan(0);
  });
  it('keeps saturated live-store wall inventory on the existing ID and reports the pressure/flux model', () => {
    const a = wet({ effectsEnvironment: { relativeHumidity: 1 } });
    useAppStore.setState({ vessels: { a }, vesselIds: ['a'], burners: {}, spills: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.1);
    const out = useAppStore.getState().vessels.a, inspect = effects.forVessel('a').inspect().state!;
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a']);
    expect(out.wallCondensation!.inner_g).toBe(1e-6);
    expect(out.waterVaporOutflow_g_s).toBe(0);
    expect(inspect.wall!.massTransferModel).toBe('finite-film-pressure-driven-cap');
    expect(inspect.wall!.innerEvaporationFlux_g_m2_s).toBe(0);
  });
});
