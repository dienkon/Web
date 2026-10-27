import { afterEach, describe, expect, it } from 'vitest';
import { condenseWallFilm } from '../src/science/wallFilmCondensation';
import { waterSaturationPressurePa } from '../src/science/waterSaturation';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { transportWallBeads } from '../src/engine/wallDropletTransport';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { wallDropCap } from '../src/science/wallDropletGeometry';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import { sampleHeatCapacity } from '../src/engine/thermalState';
import type { VesselState } from '../src/types/chemistry';

const cp = 4.184, hv = cp * 50 + waterLatentHeatJ_G(50);
const boundary = { gasTemperature_c: 50, waterPressure_Pa: waterSaturationPressurePa(40), airSpeed_m_s: 0.1 };
const defaults = { mass_g: 0.001, temperature_c: 10, area_m2: 1e-4, dt: 0.5, boundary, vaporSpecificEnthalpy_J_g: hv };
const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const sample = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'a', name: 'a', type: 'beaker',
  capacity_ml: 100, position: [0, 0, 0], rotationY: 0, isLocked: false, mass_g: 0, volume_ml: 0, volume: 0,
  temperature_c: 100, contents: [], substances: [], ph: 7, isBoiling: false, hasGas: false, hasPrecipitate: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch });
function wet(inner = 0.001, patch: Partial<VesselState> = {}) {
  const v = sample(patch), wall = stepWallCondensation(v, 0, 0).wall;
  return { ...v, wallCondensation: { ...wall, inner_g: inner, innerWall_c: 10,
    innerBeads: [{ mass_g: inner, y: 0.5, theta: 0, sliding: false }] } };
}

describe('Finite wet-film condensation retains the incoming enthalpy', () => {
  it('agrees with independent fine RK4 in added-mass and temperature coordinates', () => {
    let mass = 0, t = 10;
    const dt = 0.5 / 4096;
    const rate = (m: number, temperature: number) => {
      const flux = 1000 * (0.002 + 0.006 * Math.sqrt(0.1))
        * (boundary.waterPressure_Pa - waterSaturationPressurePa(temperature))
        / (461.5 * ((temperature + boundary.gasTemperature_c) / 2 + 273.15));
      const dm = 1e-4 * Math.max(0, flux);
      return [dm, (hv - cp * temperature) * dm / (cp * (0.001 + m))];
    };
    for (let i = 0; i < 4096; i++) {
      const a = rate(mass, t), b = rate(mass + dt * a[0] / 2, t + dt * a[1] / 2);
      const c = rate(mass + dt * b[0] / 2, t + dt * b[1] / 2), d = rate(mass + dt * c[0], t + dt * c[1]);
      mass += dt * (a[0] + 2 * b[0] + 2 * c[0] + d[0]) / 6;
      t += dt * (a[1] + 2 * b[1] + 2 * c[1] + d[1]) / 6;
    }
    const out = condenseWallFilm(defaults);
    expect(out.valid).toBe(true); expect(out.condensed_g).toBeCloseTo(mass, 13);
    expect(out.temperature_c).toBeCloseTo(t, 7);
    expect(cp * (0.001 + out.condensed_g) * out.temperature_c)
      .toBeCloseTo(cp * 0.001 * 10 + out.receivedVaporEnergy_J, 13);
  });
  it('warms toward dewpoint and accepts less than an isothermal flux would predict', () => {
    const out = condenseWallFilm(defaults);
    const flux0 = 1000 * (0.002 + 0.006 * Math.sqrt(0.1)) * (boundary.waterPressure_Pa - waterSaturationPressurePa(10))
      / (461.5 * ((10 + 50) / 2 + 273.15));
    expect(out.condensed_g).toBeGreaterThan(0);
    expect(out.condensed_g).toBeLessThan(flux0 * defaults.area_m2 * defaults.dt);
    expect(out.temperature_c).toBeGreaterThan(10); expect(out.temperature_c).toBeLessThan(40);
  });
  it('stops at the analytic finite-capacity dewpoint limit rather than growing without a heat sink', () => {
    const out = condenseWallFilm({ ...defaults, dt: 1000 });
    const maximum = 0.001 * cp * (40 - 10) / (hv - cp * 40);
    expect(out.valid).toBe(true); expect(out.condensed_g).toBeCloseTo(maximum, 12);
    expect(out.temperature_c).toBeCloseTo(40, 7); expect(out.temperature_c).toBeLessThanOrEqual(40);
  });
  it('obeys finite vapor supply and computes its exact sensible-energy receipt', () => {
    const out = condenseWallFilm({ ...defaults, area_m2: 0.1, dt: 10, availableVapor_g: 1e-6 });
    expect(out.condensed_g).toBe(1e-6); expect(out.reason).toBe('vapor-inventory');
    expect(out.temperature_c).toBeCloseTo((cp * 0.001 * 10 + 1e-6 * hv) / (cp * 0.001001), 12);
    expect(out.receivedVaporEnergy_J).toBe(1e-6 * hv);
  });
  it('does not nucleate on nonexistent water, or condense at equal/undersaturated pressure', () => {
    expect(condenseWallFilm({ ...defaults, mass_g: 0 }).condensed_g).toBe(0);
    for (const factor of [0, 0.5, 1]) {
      const out = condenseWallFilm({ ...defaults, boundary: { ...boundary, waterPressure_Pa: waterSaturationPressurePa(10) * factor } });
      expect(out.valid).toBe(true); expect(out.condensed_g).toBe(0); expect(out.temperature_c).toBe(10);
    }
  });
  it('keeps composition and enthalpy consistent across time partitions', () => {
    const one = condenseWallFilm({ ...defaults, dt: 2 });
    let mass = 0.001, t = 10, energy = 0;
    for (let i = 0; i < 20; i++) {
      const out = condenseWallFilm({ ...defaults, mass_g: mass, temperature_c: t, dt: 0.1 });
      expect(out.valid).toBe(true); mass += out.condensed_g; t = out.temperature_c; energy += out.receivedVaporEnergy_J;
    }
    expect(mass - 0.001).toBeCloseTo(one.condensed_g, 12); expect(t).toBeCloseTo(one.temperature_c, 7);
    expect(energy).toBeCloseTo(one.receivedVaporEnergy_J, 10);
  });
  it('retains micro-film mass/energy without a gram floor', () => {
    const mass = 1e-15, out = condenseWallFilm({ ...defaults, mass_g: mass, area_m2: 1e-13, dt: 0.001 });
    expect(out.valid).toBe(true); expect(out.condensed_g).toBeGreaterThan(0);
    expect(cp * (mass + out.condensed_g) * out.temperature_c / (cp * mass * 10 + out.receivedVaporEnergy_J)).toBeCloseTo(1, 13);
  });
  it('rejects malformed boundaries and insufficient vapor enthalpy without committing mass', () => {
    for (const patch of [{ availableVapor_g: -1 }, { vaporSpecificEnthalpy_J_g: 0 },
      { boundary: { ...boundary, waterPressure_Pa: 1e9 } }, { area_m2: NaN }]) {
      const out = condenseWallFilm({ ...defaults, ...patch });
      expect(out.valid).toBe(false); expect(out.condensed_g).toBe(0); expect(out.receivedVaporEnergy_J).toBe(0);
    }
  });
});

describe('Dry glass and finite water have different condensation heat owners', () => {
  const transport = (regionArea_m2 = 0, mass = 0.001, dryWallTemperature_c = 10) => transportWallBeads({
    initialMass_g: mass, deposited_g: 0, evaporated_g: 0, dt: 0.2, points: [[0.5, 0], [0.5, 1]] as const,
    bottom: 0, top: 1, temperature_c: 10, inner: false, condensationBoundary: {
      ...boundary, regionArea_m2, dryWallTemperature_c, vaporSpecificEnthalpy_J_g: hv, availableVapor_g: 0.01 },
    previous: mass > 0 ? [{ mass_g: mass, y: 0.5, theta: 0, sliding: false }] : undefined });
  it('adds wet growth only to existing caps and retains all wet vapor enthalpy', () => {
    const out = transport();
    expect(out.wetCondensed_g).toBeGreaterThan(0); expect(out.dryCondensed_g).toBe(0);
    expect(out.beads.filter(b => b.mass_g > 0)).toHaveLength(1);
    expect(out.temperature_c).toBeGreaterThan(10); expect(out.condensationBoundaryHeat_J).toBe(0);
    expect(out.retained_g + out.drained_g).toBeCloseTo(0.001 + out.condensed_g, 13);
    expect(cp * out.retained_g * out.temperature_c + out.drainedSensibleEnergy_J)
      .toBeCloseTo(cp * 0.001 * 10 + out.condensationReceivedEnergy_J, 12);
  });
  it('nucleates on bare cold glass while explicitly recording that boundary heat sink', () => {
    const out = transport(0.001, 0);
    expect(out.dryCondensed_g).toBeGreaterThan(0); expect(out.wetCondensed_g).toBeGreaterThan(0);
    expect(out.beads.some(b => b.mass_g > 0)).toBe(true);
    expect(out.condensationBoundaryHeat_J).toBeGreaterThan(0);
    expect(cp * out.retained_g * out.temperature_c + out.drainedSensibleEnergy_J + out.condensationBoundaryHeat_J)
      .toBeCloseTo(out.condensationReceivedEnergy_J, 12);
  });
  it('converges as transport time is refined while the growing cap changes its collection area', () => {
    const run = (n: number) => {
      let mass = 0.001, t = 10, captured = 0, beads = [{ mass_g: mass, y: 0.5, theta: 0, sliding: false }];
      for (let i = 0; i < n; i++) {
        const out = transportWallBeads({ initialMass_g: mass, deposited_g: 0, evaporated_g: 0, dt: 1 / n,
          points: [[0.5, 0], [0.5, 1]], bottom: 0, top: 1, temperature_c: t, inner: false, previous: beads,
          condensationBoundary: { ...boundary, regionArea_m2: 0, dryWallTemperature_c: 50,
            vaporSpecificEnthalpy_J_g: hv, availableVapor_g: 0.01 - captured } });
        expect(out.drained_g).toBe(0); captured += out.condensed_g; mass = out.retained_g; t = out.temperature_c; beads = out.beads;
      }
      expect(cp * mass * t).toBeCloseTo(cp * 0.001 * 10 + captured * hv, 11);
      expect(beads.filter(b => b.mass_g > 0)).toHaveLength(1);
      return mass;
    };
    const coarse = run(1), fine = run(240), finer = run(480);
    expect(coarse).toBeLessThan(fine); expect(fine).toBeLessThan(finer);
    expect(fine - coarse).toBeGreaterThan(1.5 * (finer - fine));
  });
  it('removes covered footprint from the bare-glass area and never consumes more than the shared source', () => {
    const cap = wallDropCap(0.001), footprint = Math.PI * cap.contactRadius_m ** 2;
    const covered = transport(footprint * 0.5);
    expect(covered.dryCondensed_g).toBe(0); expect(covered.wetCondensed_g).toBeGreaterThan(0);
    const finite = transportWallBeads({ initialMass_g: 0.001, deposited_g: 0, evaporated_g: 0, dt: 1,
      points: [[0.5, 0], [0.5, 1]], bottom: 0, top: 1, temperature_c: 10, inner: false,
      previous: [{ mass_g: 0.001, y: 0.5, theta: 0, sliding: false }], condensationBoundary: {
        ...boundary, regionArea_m2: 0.1, dryWallTemperature_c: 10, vaporSpecificEnthalpy_J_g: hv, availableVapor_g: 1e-6 } });
    expect(finite.condensed_g).toBe(1e-6);
    expect(finite.wetCondensed_g + finite.dryCondensed_g).toBeCloseTo(finite.condensed_g, 16);
  });
  it('does not pretend the warm dry glass is cold just because an existing droplet is cold', () => {
    const before = wet(), out = stepWallCondensation(before, 0.2, 0.01, { headspaceWaterPressure_Pa: boundary.waterPressure_Pa,
      vaporSpecificEnthalpy_J_g: hv });
    expect(out.wall.innerDryGlass_c).toBeGreaterThan(40);
    expect(out.wall.innerDryCondensed_g).toBe(0); expect(out.wall.innerWetCondensed_g).toBeGreaterThan(0);
    expect(out.wall.innerWall_c).toBeGreaterThan(10); expect(out.wall.innerWall_c).toBeLessThan(40);
    expect(out.wall.heatRejected_J).toBe(0);
    expect(cp * out.wall.inner_g * out.wall.innerWall_c + out.wall.returnedSensibleEnergy_J!)
      .toBeCloseTo(cp * 0.001 * 10 + out.wall.innerCondensationEnergyReceived_J!, 12);
  });
  it('stores ambient vapor heat in an existing cold exterior drop instead of crediting bulk again', () => {
    const before = wet(0, { temperature_c: 25 }); before.wallCondensation.outer_g = 0.001;
    before.wallCondensation.outerWall_c = 5;
    before.wallCondensation.outerBeads = [{ mass_g: 0.001, y: 0.5, theta: 0, sliding: false }];
    const out = stepWallCondensation(before, 0.2, 0), wall = out.wall;
    expect(wall.outerWetCondensed_g).toBeGreaterThan(0); expect(wall.outerDryCondensed_g).toBe(0);
    expect(out.latentHeatToSample_J).toBe(0); expect(wall.outerWall_c).toBeGreaterThan(5);
    expect(cp * wall.outer_g * wall.outerWall_c + wall.outerDrainedSensibleEnergy_J!)
      .toBeCloseTo(cp * 0.001 * 5 + wall.ambientCondensationEnergyReceived_J!, 12);
  });
  it('keeps actual routing and inspection counters on the same vessel without manufacturing heat', () => {
    const before = wet(0.001, { temperature_c: 25 }), current = { ...before, escapedGas_g: { H2O: 0.001 } };
    const out = routeWaterVaporToWall(current, before, 0.2), wall = out.vessel.wallCondensation!;
    expect(out.availableVapor_g + wall.inner_g + wall.returned_g).toBeCloseTo(0.002, 12);
    expect(wall.returned_g).toBe(0); expect(wall.ambientCollected_g).toBe(0);
    // Conduction precedes capture and supplies finite heat from the bulk.
    // Chemical vapor without an energy ledger is estimated at this actual
    // pre-capture bulk temperature (no later return/outer heat in this case).
    const bulkChange = sampleHeatCapacity(out.vessel) * out.vessel.temperature_c - sampleHeatCapacity(before) * before.temperature_c;
    const sourceH = cp * out.vessel.temperature_c + waterLatentHeatJ_G(out.vessel.temperature_c);
    expect(out.availableVaporEnergy_J + wall.heatRejected_J + cp * wall.inner_g * wall.innerWall_c
      + wall.returnedSensibleEnergy_J! + bulkChange).toBeCloseTo(cp * 0.001 * 10 + 0.001 * sourceH, 8);
    useAppStore.setState({ vessels: { a: out.vessel }, vesselIds: ['a'] });
    const inspected = effects.forVessel('a').inspect().state!.wall!;
    expect(inspected.condensationModel).toBe('finite-wet-caps/isothermal-dry-glass');
    expect(inspected.innerWetCondensed_g).toBeGreaterThan(0);
    expect(inspected.innerCondensationEnergyReceived_J).toBeGreaterThan(0);
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a']);
  });
  it('warms a cold exterior film from room vapor in live ticks without a second latent credit to bulk or another vessel', () => {
    const a = wet(0, { temperature_c: 25, effectsEnvironment: { relativeHumidity: 0.9 } });
    a.wallCondensation.outer_g = 0.001; a.wallCondensation.outerWall_c = 5;
    a.wallCondensation.outerBeads = [{ mass_g: 0.001, y: 0.5, theta: 0, sliding: false }];
    useAppStore.setState({ vessels: { a }, vesselIds: ['a'], burners: {}, spills: {}, activeKinetics: {},
      pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(0.1);
    const after = useAppStore.getState().vessels.a, wall = after.wallCondensation!;
    expect(wall.outerWetCondensed_g).toBeGreaterThan(0); expect(wall.outerDryCondensed_g).toBe(0);
    expect(wall.outerWall_c).toBeGreaterThan(5); expect(after.temperature_c).toBeLessThanOrEqual(25);
    expect(wall.ambientCondensationEnergyReceived_J).toBeGreaterThan(0);
    expect(wall.outer_g + wall.ambientReleased_g + wall.drainedOutside_g - wall.ambientCollected_g).toBeCloseTo(0.001, 12);
    expect(after.mass_g).toBe(0); expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a']);
    expect(effects.forVessel('a').inspect().state!.wall!.outerWetCondensed_g).toBe(wall.outerWetCondensed_g);
  });
});
