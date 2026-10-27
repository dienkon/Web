import { afterEach, describe, expect, it } from 'vitest';
import { evaporateWallFilm } from '../src/science/wallFilmEvaporation';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from '../src/science/waterSaturation';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { transportWallBeads } from '../src/engine/wallDropletTransport';
import { stepWallCondensation, returnWallWater } from '../src/engine/wallCondensation';
import { routeWaterVaporToWall, finalizeWaterVaporOutflow } from '../src/engine/waterVaporRouting';
import { sampleHeatCapacity } from '../src/engine/thermalState';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import type { VesselState } from '../src/types/chemistry';

const cp = 4.184, roomPressure = waterSaturationPressurePa(25) * 0.5;
const boundary = { gasTemperature_c: 25, waterPressure_Pa: roomPressure, airSpeed_m_s: 0.1 };
const oldStore = useAppStore.getState();
afterEach(() => useAppStore.setState(oldStore, true));
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'a', name: 'a', type: 'beaker',
  capacity_ml: 100, position: [0, 0, 0], rotationY: 0, isLocked: false, mass_g: 0, volume_ml: 0, volume: 0,
  temperature_c: 25, contents: [], substances: [], ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
function wet(inner = 1e-6, outer = 0, patch: Partial<VesselState> = {}) {
  const v = sample(patch), wall = stepWallCondensation(v, 0, 0).wall;
  return { ...v, wallCondensation: { ...wall, inner_g: inner, outer_g: outer,
    innerBeads: [{ mass_g: inner, y: 0.5, theta: 0, sliding: false }],
    outerBeads: [{ mass_g: outer, y: 0.5, theta: 2, sliding: false }] } };
}

describe('Finite film storage supplies its own evaporation enthalpy', () => {
  it('agrees with independent fine RK4 in mass/T/enthalpy coordinates, not the production cap-exposure coordinate', () => {
    const initial = 1e-6, duration = 2, n = 4096, h = duration / n, cosine = Math.cos(70 * Math.PI / 180);
    const rate = (s: number[]) => {
      const [mass, t] = s, radius = Math.cbrt(3 * mass * 1e-6 / (Math.PI * (2 - 3 * cosine + cosine ** 3)));
      const area = 2 * Math.PI * radius * radius * (1 - cosine);
      const flux = 1000 * (0.002 + 0.006 * Math.sqrt(0.1)) * (waterSaturationPressurePa(t) - roomPressure)
        / (461.5 * ((t + 25) / 2 + 273.15));
      const loss = Math.max(0, flux) * area, latent = waterLatentHeatJ_G(t);
      return [-loss, -latent * loss / (cp * mass), (cp * t + latent) * loss, t * loss];
    };
    let ref = [initial, 25, 0, 0];
    for (let i = 0; i < n; i++) {
      const add = (k: number[], f: number) => ref.map((v, j) => v + h * k[j] * f);
      const a = rate(ref), b = rate(add(a, 0.5)), c = rate(add(b, 0.5)), d = rate(add(c, 1));
      ref = ref.map((v, j) => v + h * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
    }
    const out = evaporateWallFilm({ masses_g: [initial], totalMass_g: initial, temperature_c: 25, dt: duration, boundary });
    expect(out.valid).toBe(true);
    expect(out.masses_g[0]).toBeCloseTo(ref[0], 16);
    expect(out.temperature_c).toBeCloseTo(ref[1], 7);
    expect(out.vaporEnergy_J).toBeCloseTo(ref[2], 12);
    expect(out.vaporTemperatureMass_c_g).toBeCloseTo(ref[3], 14);
    expect(cp * out.masses_g[0] * out.temperature_c + out.vaporEnergy_J).toBeCloseTo(cp * initial * 25, 15);
  });
  it('has exactly zero sink and no temperature reset at saturation', () => {
    const out = evaporateWallFilm({ masses_g: [1e-6], totalMass_g: 1e-6, temperature_c: 25, dt: 100,
      boundary: { ...boundary, waterPressure_Pa: waterSaturationPressurePa(25) } });
    expect(out.valid).toBe(true); expect(out.evaporated_g).toBe(0); expect(out.temperature_c).toBe(25);
    expect(out.vaporEnergy_J).toBe(0);
  });
  it('approaches the gas dew point without using an infinite heat source to evaporate the remainder', () => {
    const out = evaporateWallFilm({ masses_g: [1e-6], totalMass_g: 1e-6, temperature_c: 25, dt: 2000, boundary });
    const dew = waterSaturationTemperatureC(roomPressure);
    expect(out.valid).toBe(true); expect(out.temperature_c).toBeGreaterThanOrEqual(dew);
    expect(out.temperature_c).toBeCloseTo(dew, 6); expect(out.masses_g[0]).toBeGreaterThan(0.95e-6);
    expect(out.vaporEnergy_J).toBeLessThan(cp * 1e-6 * 25);
  });
  it('stops at the liquid floor in dry gas, rather than solving unmodeled frost or sublimation', () => {
    const out = evaporateWallFilm({ masses_g: [1e-6], totalMass_g: 1e-6, temperature_c: 5, dt: 2000,
      boundary: { ...boundary, waterPressure_Pa: 0 } });
    expect(out.valid).toBe(true); expect(out.temperature_c).toBeCloseTo(0, 7);
    expect(out.limitedBy).toBe('liquid-floor'); expect(out.masses_g[0]).toBeGreaterThan(0.99e-6);
    expect(out.vaporEnergy_J).toBeCloseTo(cp * 1e-6 * 5, 12);
    const atFloor = evaporateWallFilm({ masses_g: [1e-6], totalMass_g: 1e-6, temperature_c: 0, dt: 1,
      boundary: { ...boundary, waterPressure_Pa: 0 } });
    expect(atFloor.evaporated_g).toBe(0); expect(atFloor.limitedBy).toBe('liquid-floor');
  });
  it('includes protected film heat capacity without evaporating its unexposed mass', () => {
    const small = evaporateWallFilm({ masses_g: [1e-6], totalMass_g: 1e-6, temperature_c: 25, dt: 1, boundary });
    const protectedFilm = evaporateWallFilm({ masses_g: [1e-6], totalMass_g: 0.1, temperature_c: 25, dt: 1, boundary });
    expect(protectedFilm.valid).toBe(true); expect(protectedFilm.evaporated_g).toBeLessThanOrEqual(1e-6);
    expect(protectedFilm.temperature_c).toBeGreaterThan(small.temperature_c);
    expect(cp * (0.1 - protectedFilm.evaporated_g) * protectedFilm.temperature_c + protectedFilm.vaporEnergy_J)
      .toBeCloseTo(cp * 0.1 * 25, 10);
  });
  it('converges across accepted time partitions for a cooling and shrinking droplet', () => {
    const one = evaporateWallFilm({ masses_g: [1e-6], totalMass_g: 1e-6, temperature_c: 25, dt: 5, boundary });
    let mass = 1e-6, t = 25, energy = 0, moment = 0;
    for (let i = 0; i < 50; i++) {
      const out = evaporateWallFilm({ masses_g: [mass], totalMass_g: mass, temperature_c: t, dt: 0.1, boundary });
      expect(out.valid).toBe(true); mass = out.masses_g[0]; t = out.temperature_c;
      energy += out.vaporEnergy_J; moment += out.vaporTemperatureMass_c_g;
    }
    expect(mass).toBeCloseTo(one.masses_g[0], 16); expect(t).toBeCloseTo(one.temperature_c, 7);
    expect(energy).toBeCloseTo(one.vaporEnergy_J, 12); expect(moment).toBeCloseTo(one.vaporTemperatureMass_c_g, 14);
  });
  it('handles microscopic liquid inventory without erasing it at an absolute cutoff', () => {
    const mass = 1e-15;
    const out = evaporateWallFilm({ masses_g: [mass], totalMass_g: mass, temperature_c: 25, dt: 0.1, boundary });
    expect(out.valid).toBe(true); expect(out.masses_g[0]).toBeGreaterThan(0.95 * mass);
    expect(out.evaporated_g).toBeGreaterThan(0);
    expect((cp * out.masses_g[0] * out.temperature_c + out.vaporEnergy_J) / (cp * mass * 25)).toBeCloseTo(1, 13);
  });
  it('keeps latent enthalpy when a tiny exposed cap cools a much larger protected node by less than a displayed-temperature ulp', () => {
    const out = evaporateWallFilm({ masses_g: [1e-15], totalMass_g: 1000, temperature_c: 25, dt: 1e-5, boundary });
    expect(out.valid).toBe(true); expect(out.evaporated_g).toBeGreaterThan(0);
    expect(out.temperature_c).toBe(25);
    expect(out.vaporEnergy_J / out.evaporated_g).toBeCloseTo(cp * 25 + waterLatentHeatJ_G(25), 7);
  });
  it('refuses unsupported thermal data without committing a partial material sink', () => {
    const out = evaporateWallFilm({ masses_g: [1], totalMass_g: 0.1, temperature_c: 25, dt: 1, boundary });
    expect(out.valid).toBe(false); expect(out.evaporated_g).toBe(0); expect(out.vaporEnergy_J).toBe(0);
    const moved = transportWallBeads({ initialMass_g: 1e-6, deposited_g: 0, evaporated_g: 0, dt: 0.1,
      temperature_c: 25, inner: false, points: [[0.5, 0], [0.5, 1]], bottom: 0, top: 1,
      evaporationBoundary: { ...boundary, gasTemperature_c: NaN },
      previous: [{ mass_g: 1e-6, y: 0.5, theta: 0, sliding: false }] });
    expect(moved.retained_g).toBe(1e-6); expect(moved.evaporated_g).toBe(0);
    expect(moved.temperature_c).toBe(25); expect(moved.evaporationThermalLimit).toBe('numerical-or-domain-limit');
  });
});

describe('Finite film enthalpy reaches receipts and vapor render sources', () => {
  it('closes deposit/evaporation/drain/retained-film energy while drainage uses its own emission temperature', () => {
    const out = transportWallBeads({ initialMass_g: 0.0004, deposited_g: 0.0001, evaporated_g: 0, dt: 1,
      temperature_c: 40, inner: true, evaporationBoundary: boundary,
      points: [[0.5, 0], [0.5, 1]], bottom: 0, top: 1, previous: [
        { mass_g: 0.0001, y: -1, theta: 0, sliding: false },
        { mass_g: 0.0003, y: 0.5, theta: 2, sliding: false }] });
    expect(out.temperature_c).toBeLessThan(40); expect(out.drained_g).toBeGreaterThan(0);
    expect(out.drainedSensibleEnergy_J / (cp * out.drained_g)).toBeGreaterThan(out.temperature_c);
    expect(out.retained_g + out.evaporated_g + out.drained_g).toBeCloseTo(0.0005, 14);
    expect(cp * out.retained_g * out.temperature_c + out.drainedSensibleEnergy_J + out.vaporEnergy_J)
      .toBeCloseTo(cp * 0.0005 * 40, 11);
  });
  it('does not reset a cooled film to the nominal dry-wall temperature in the next direct step', () => {
    const before = wet(), first = stepWallCondensation(before, 1, 0);
    const second = stepWallCondensation({ ...before, wallCondensation: first.wall }, 1, 0);
    expect(first.wall.innerWall_c).toBeLessThan(25);
    expect(second.wall.innerWall_c).toBeLessThan(first.wall.innerWall_c);
    expect(second.wall.heatRejected_J).toBe(0);
    expect(cp * second.wall.inner_g * second.wall.innerWall_c + second.wall.innerMassTransferVaporEnergy_J!)
      .toBeCloseTo(cp * 1e-6 * 25, 13);
  });
  it('uses integrated vapor enthalpy/temperature, not the colder final film or bulk temperature', () => {
    const before = wet(), routed = routeWaterVaporToWall(before, before, 1), wall = routed.vessel.wallCondensation!;
    const mean = routed.availableVaporTemperatureMass_c_g / routed.availableVapor_g;
    expect(mean).toBeGreaterThan(wall.innerWall_c); expect(mean).toBeLessThan(25);
    expect(routed.availableVaporEnergy_J).toBe(wall.innerMassTransferVaporEnergy_J);
    expect(routed.availableVaporEnergy_J / routed.availableVapor_g)
      .toBeGreaterThan(cp * wall.innerWall_c + waterLatentHeatJ_G(wall.innerWall_c));
    const final = finalizeWaterVaporOutflow(routed.vessel, before, routed.availableVapor_g, 1,
      routed.availableVaporEnergy_J, routed.availableVaporTemperatureMass_c_g);
    expect(final.waterVaporTemperature_c).toBe(mean);
    expect(final.thermalVaporEnthalpy_J ?? 0).toBe(0); expect(final.mass_g).toBe(before.mass_g);
  });
  it('debits exterior film storage rather than cooling the bulk again', () => {
    const before = wet(0, 1e-6), out = routeWaterVaporToWall(before, before, 0.2), wall = out.vessel.wallCondensation!;
    expect(wall.outerWall_c).toBeLessThan(25); expect(out.vessel.temperature_c).toBe(25);
    expect(out.availableVapor_g).toBe(0); expect(wall.ambientReleased_g).toBeGreaterThan(0);
    expect(cp * wall.outer_g * wall.outerWall_c + wall.outerMassTransferVaporEnergy_J!).toBeCloseTo(cp * 1e-6 * 25, 14);
  });
  it('returns draining water at the mass-weighted receipt temperature and closes sample-plus-film energy', () => {
    const before = wet(0.0004, 0);
    before.wallCondensation.innerWall_c = 40;
    before.wallCondensation.innerBeads = [
      { mass_g: 0.0001, y: -2, theta: 0, sliding: false },
      { mass_g: 0.0003, y: 0.5, theta: 2, sliding: false }];
    const result = stepWallCondensation(before, 1, 0), wall = result.wall;
    expect(result.returnedStep_g).toBeGreaterThan(0);
    expect(result.returnedTemperature_c).toBeGreaterThan(wall.innerWall_c);
    const received = returnWallWater({ ...before, wallCondensation: wall }, result.returnedStep_g, result.returnedTemperature_c);
    const sampleEnergyChange = sampleHeatCapacity(received) * received.temperature_c - sampleHeatCapacity(before) * before.temperature_c;
    expect(sampleEnergyChange).toBeCloseTo(wall.returnedSensibleEnergy_J!, 10);
    expect(sampleEnergyChange + cp * wall.inner_g * wall.innerWall_c + result.wallEvaporatedEnergy_J)
      .toBeCloseTo(cp * 0.0004 * 40, 10);
  });
  it('keeps live-store finite cooling and both cumulative meters on the existing vessel ID', () => {
    const a = wet(), b = wet(1e-6, 0, { id: 'b', effectsEnvironment: { relativeHumidity: 1 } });
    useAppStore.setState({ vessels: { a, b }, vesselIds: ['a', 'b'], burners: {}, spills: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), inspected = effects.forVessel('a').inspect().state!;
    expect(Object.keys(state.vessels)).toEqual(['a', 'b']);
    expect(state.vessels.a.wallCondensation!.innerWall_c).toBeLessThan(25);
    expect(state.vessels.b.wallCondensation!.innerWall_c).toBe(25);
    expect(state.vessels.b.waterVaporReleased_g ?? 0).toBe(0);
    expect(inspected.wall!.innerMassTransferVaporEnergy_J).toBeGreaterThan(0);
    expect(state.vessels.a.waterVaporReleasedEnergy_J).toBeCloseTo(inspected.wall!.innerMassTransferVaporEnergy_J!, 14);
    expect(state.vessels.a.thermalVaporEnthalpy_J ?? 0).toBe(0);
  });
});
