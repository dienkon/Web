import { afterEach, describe, expect, it } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { aqueousWaterBoundary, WATER_MOLAR_MASS_G } from '../src/science/aqueousWaterBoundary';
import { boilDiluteSolution } from '../src/science/solutionBoiling';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from '../src/science/waterSaturation';
import { waterSaturationProperties, waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { aqueousBoilingPoint, applyThermalEnergy, sampleHeatCapacity } from '../src/engine/thermalState';
import { waterMassFluxG_M2_S } from '../src/science/waterSurface';
import { routeWaterVaporToWall } from '../src/engine/waterVaporRouting';
import { transferWaterCondensate } from '../src/engine/condensationTransfer';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import { SimulationEngine, VesselSimulationManager } from '../src/simulation/core/SimulationEngine';

const original = useAppStore.getState(), cp = 4.184;
const solution = (water = 100, salt = 1, patch: Partial<VesselState> = {}): VesselState => ({
  id: 'b', name: 'b', type: 'beaker', position: [0, 0, 0], rotationY: 0, isLocked: false,
  capacity_ml: 250, volume_ml: water, volume: water / 250, mass_g: water + salt, temperature_c: 25,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: water, moles: water / WATER_MOLAR_MASS_G },
    ...(salt > 0 ? [{ formula: 'NaCl', phase: 'aq', mass_g: salt, moles: salt / 58.44 }] : [])],
  substances: salt > 0 ? ['H2O', 'NaCl'] : ['H2O'], ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  environment: DEFAULT_LAB_ENVIRONMENT, ...patch,
});
const stored = (v: VesselState) => sampleHeatCapacity(v) * v.temperature_c;
afterEach(() => { useAppStore.setState(original, true); SimulationEngine.clearAll(); });

describe('Ideal nonvolatile water activity and pressure-dependent boiling', () => {
  it('satisfies the same Raoult partial-pressure boundary at 0.6, 1 and 1.2 atm', () => {
    const elevations: number[] = [];
    for (const pressure_atm of [0.6, 1, 1.2]) {
      const b = aqueousWaterBoundary(solution(100, 1, { environment: { ...DEFAULT_LAB_ENVIRONMENT, pressure_atm } }));
      expect(b.model).toBe('ideal-dilute-nonvolatile'); expect(b.activity!).toBeLessThan(1);
      expect(b.activity! * waterSaturationPressurePa(b.boiling_c) / b.pressure_Pa).toBeCloseTo(1, 10);
      elevations.push(b.boiling_c - b.pureBoiling_c);
    }
    expect(elevations[0]).toBeLessThan(elevations[1]); expect(elevations[1]).toBeLessThan(elevations[2]);
  });
  it('has no 1-g solvent floor: equal composition gives equal activity/Tb at very different scales', () => {
    const small = aqueousWaterBoundary(solution(0.1, 0.001)), large = aqueousWaterBoundary(solution(100, 1));
    expect(small.activity).toBeCloseTo(large.activity!, 14); expect(small.boiling_c).toBeCloseTo(large.boiling_c, 9);
  });
  it('counts dissolved particles, not settled salt, ice or escaped gas', () => {
    const liquid = solution(1, 0.01), reference = aqueousWaterBoundary(liquid);
    const withSolids = { ...liquid, contents: [...liquid.contents,
      { formula: 'H2O', phase: 's', mass_g: 100, moles: 100 / WATER_MOLAR_MASS_G },
      { formula: 'NaCl', phase: 's', mass_g: 50, moles: 50 / 58.44 },
      { formula: 'H2O', phase: 'g', mass_g: 100, moles: 100 / WATER_MOLAR_MASS_G }] };
    const b = aqueousWaterBoundary(withSolids);
    expect(b.water_g).toBe(1); expect(b.particle_mol).toBeCloseTo(2 * 0.01 / 58.44, 14);
    expect(b.boiling_c).toBe(reference.boiling_c);
  });
  it('matches the dilute limiting derivative of the chosen pressure/activity law', () => {
    const water = 100, soluteParticles = 1e-6;
    const v = solution(water, soluteParticles / 2 * 58.44), b = aqueousWaterBoundary(v);
    const slope = waterSaturationProperties(b.pureBoiling_c)!.pressureSlope_Pa_K;
    const expected = b.pressure_Pa * WATER_MOLAR_MASS_G / (1000 * slope);
    expect((b.boiling_c - b.pureBoiling_c) / (soluteParticles / (water / 1000))).toBeCloseTo(expected, 4);
  });
  it('marks volatile, unknown and concentrated mixtures unavailable instead of capping elevation at 18 C', () => {
    for (const formula of ['H2SO4 (conc)', 'HCl', 'C2H5OH', 'unknown_solute']) {
      const v = solution(100, 0); v.contents.push({ formula, phase: 'aq', mass_g: 1, moles: 0.01 }); v.mass_g += 1;
      expect(aqueousBoilingPoint(v)).toBeNaN();
      const thermal = applyThermalEnergy({ ...v, temperature_c: 200 }, 1000, 1, 1);
      expect(thermal.evaporatedStep_g).toBe(0); expect(thermal.isBoiling).toBe(false);
      expect(thermal.thermalModelLimit).toContain('VLE');
      expect(thermal.storedSensibleEnergyChange_J).toBeCloseTo(1000, 7);
    }
    expect(aqueousWaterBoundary(solution(100, 10)).reason).toBe('concentrated-solution');
  });
  it('lowers the outbound surface flux and has zero flux at the solution equilibrium humidity', () => {
    const aw = aqueousWaterBoundary(solution()).activity!;
    expect(waterMassFluxG_M2_S(25, 25, aw, 0.1, aw)).toBe(0);
    expect(waterMassFluxG_M2_S(25, 25, aw, 0.1)).toBeGreaterThan(0);
    expect(waterMassFluxG_M2_S(25, 25, 0, 0.1, aw) / waterMassFluxG_M2_S(25, 25, 0, 0.1)).toBeCloseTo(aw, 12);
  });
});

describe('Concentration evolves during a single finite heat packet', () => {
  it('heats the retained solution to its increasing Tb and spends heat on that change', () => {
    const before = solution(100, 2); before.temperature_c = aqueousBoilingPoint(before);
    const thermal = applyThermalEnergy(before, 5000), after = { ...before, ...thermal };
    expect(thermal.evaporatedStep_g).toBeLessThan(5000 / waterLatentHeatJ_G(before.temperature_c));
    expect(after.temperature_c).toBeGreaterThan(before.temperature_c);
    expect(after.temperature_c).toBeCloseTo(aqueousBoilingPoint(after), 8);
    expect(after.contents.find(c => c.formula === 'NaCl')!.moles).toBe(2 / 58.44);
    expect(stored(after) - stored(before) + after.thermalVaporEnthalpy_J!).toBeCloseTo(5000, 6);
  });
  it('matches an independent midpoint enthalpy integral without reusing the production heat derivative/quadrature', () => {
    const before = solution(100, 2), b = aqueousWaterBoundary(before); before.temperature_c = b.boiling_c;
    const thermal = applyThermalEnergy(before, 5000), after = { ...before, ...thermal }, n = 4096;
    let outgoing = 0;
    const de = thermal.evaporatedStep_g / n;
    for (let i = 0; i < n; i++) {
      const remaining = 100 - (i + 0.5) * de, x = remaining / (remaining + b.particle_mol * WATER_MOLAR_MASS_G);
      const t = waterSaturationTemperatureC(b.pressure_Pa / x);
      outgoing += (cp * t + waterLatentHeatJ_G(t)) * de;
    }
    expect(outgoing).toBeCloseTo(after.thermalVaporEnthalpy_J!, 6);
    expect(stored(after) - stored(before) + outgoing).toBeCloseTo(5000, 6);
  });
  it('agrees for one, 20 and 100 heat packets rather than freezing the first boiling point', () => {
    const run = (n: number) => {
      let v = solution(100, 2); v.temperature_c = aqueousBoilingPoint(v);
      for (let i = 0; i < n; i++) v = { ...v, ...applyThermalEnergy(v, 5000 / n) };
      return v;
    };
    const one = run(1);
    for (const n of [20, 100]) {
      const v = run(n); expect(v.mass_g).toBeCloseTo(one.mass_g, 6);
      expect(v.temperature_c).toBeCloseTo(one.temperature_c, 7);
      expect(v.thermalVaporEnthalpy_J).toBeCloseTo(one.thermalVaporEnthalpy_J!, 4);
    }
  });
  it('stops at the declared concentration envelope and accounts for unrepresented heat without deleting water', () => {
    const before = solution(); before.temperature_c = aqueousBoilingPoint(before);
    const heat = 500000, thermal = applyThermalEnergy(before, heat), after = { ...before, ...thermal };
    expect(thermal.evaporatedStep_g).toBeCloseTo(81, 10);
    expect(after.contents[0].mass_g).toBeCloseTo(19, 10); expect(after.contents[1].mass_g).toBe(1);
    expect(thermal.thermalEnergyOutsideModel_J).toBeGreaterThan(0); expect(thermal.thermalModelLimit).toContain('nồng độ');
    useAppStore.setState({ vessels: { [after.id]: after } });
    const diagnostic = effects.forVessel(after.id).inspect().state!;
    expect(diagnostic.thermalEnergyOutsideModel_J).toBe(thermal.thermalEnergyOutsideModel_J);
    expect(diagnostic.thermalModelLimit).toBe(thermal.thermalModelLimit);
    expect(stored(after) - stored(before) + after.thermalVaporEnthalpy_J! + thermal.thermalEnergyOutsideModel_J!).toBeCloseTo(heat, 4);
    const again = applyThermalEnergy(after, 1000);
    expect(again.evaporatedStep_g).toBeCloseTo(0, 10);
    expect(again.thermalEnergyOutsideModel_J! - after.thermalEnergyOutsideModel_J!).toBeCloseTo(1000, 6);
  });
  it('rejects malformed pure-solver input without committing a partial solvent transfer', () => {
    const p = { water_g: 100, particle_mol: 0.01, capacity_J_K: 500, pressure_Pa: 101325, availableHeat_J: 1000, maxEvaporated_g: 10 };
    for (const patch of [{ particle_mol: -1 }, { maxEvaporated_g: 100 }, { pressure_Pa: NaN }, { capacity_J_K: 0 }]) {
      const r = boilDiluteSolution({ ...p, ...patch }); expect(r.valid).toBe(false); expect(r.evaporated_g).toBe(0);
    }
  });
});

describe('Unavailable mixture VLE does not erase independently supplied gas', () => {
  it('keeps chemical bubbles while withholding unsupported water boiling', () => {
    const v = solution(100, 0); v.contents.push({ formula: 'HCl', phase: 'aq', mass_g: 1, moles: 1 / 36.46 }); v.mass_g += 1;
    const manager = new VesselSimulationManager('b');
    const r = manager.step(v, 1, { thermalStateAuthoritative: true, reactionGasRate: 30 });
    expect(r.isBoiling).toBe(false); expect(manager.boilingSystem.bubbles.length).toBeGreaterThan(0);
    expect(manager.boilingSystem.bubbles.every(b => b.source === 'reaction')).toBe(true); manager.reset();
  });
  it('routes already generated chemical steam with a pure-water gas reference, not an unavailable liquid-mixture Tb', () => {
    const before = solution(100, 0, { temperature_c: 100 });
    before.contents.push({ formula: 'H2SO4', phase: 'aq', mass_g: 100, moles: 100 / 98.08 }); before.mass_g += 100;
    const current = { ...before, escapedGas_g: { H2O: 0.1 } }, routed = routeWaterVaporToWall(current, before, 1);
    expect(Number.isFinite(routed.availableVaporEnergy_J)).toBe(true);
    const receiver = solution(0, 0, { id: 'r', type: 'condenser', vaporSourceId: 'b', coolingWaterActive: true });
    const out = transferWaterCondensate({ b: routed.vessel, r: receiver }, new Map([['b', routed.availableVapor_g]]), 1,
      new Map([['b', routed.availableVaporEnergy_J]]));
    expect(out.r.condensateReceived_g).toBeGreaterThan(0);
  });
  it('reports model/activity through the ID-bound API and keeps the live dilute solution source on that ID', () => {
    const b = solution(100, 1, { effectHeatInput_W: 300 }); b.temperature_c = aqueousBoilingPoint(b);
    useAppStore.setState({ vessels: { b }, vesselIds: ['b'], burners: {}, spills: {}, activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 5; i++) useAppStore.getState().tickSimulation(0.05);
    const after = useAppStore.getState().vessels.b, inspect = effects.forVessel('b').inspect().state!;
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['b']);
    expect(after.evaporated_ml).toBeGreaterThan(0); expect(after.contents[1].moles).toBe(1 / 58.44);
    expect(inspect.boilingPointModel).toBe('ideal-dilute-nonvolatile'); expect(inspect.waterActivity!).toBeLessThan(1);
  });
});
