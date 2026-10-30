import { describe, expect, it } from 'vitest';
import { calculateVesselWeirFlow } from '../src/pour/physics/vesselFlow';
import { calculateWeirFlow } from '../src/pour/physics/flow';
import { getWorldVesselProfile, getVesselProfile } from '../src/pour/physics/profiles';
import { retainedVolume, solveLevel } from '../src/pour/physics/retained';
import { occupiedLiquidVolume } from '../src/handling/solidOccupancy';
import { withdrawAliquot } from '../src/handling/aliquot';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { solidSceneVolume } from '../src/science/vesselDimensions';
import { stepPourSimulation, type SimVessel } from '../src/pour/physics/step';
import { computeMolarMass } from '../src/engine/ledger';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const item = (formula: string, mass_g: number, phase: 's' | 'l' | 'aq', precipitate = false): SubstanceContent => ({
  formula, mass_g, moles: mass_g / computeMolarMass(formula), phase, ...(precipitate ? { solidOrigin: 'precipitate' as const } : {}),
});
const vessel = (volume_ml: number, solids: SubstanceContent[] = []): VesselState => ({
  id: 'source', name: 'source', type: 'beaker', capacity_ml: 100, volume_ml, volume: volume_ml / 100,
  mass_g: volume_ml + solids.reduce((sum, s) => sum + s.mass_g, 0), contents: [item('H2O', volume_ml, 'l'), ...solids],
  substances: ['H2O', ...solids.map(s => s.formula)], temperature_c: 25, density_g_ml: 1, ph: 7, liquidColor: '#f8fafc',
  position: [0, 3, 0], rotationY: 0, isLocked: false, hasGas: false, hasPrecipitate: false, isBoiling: false,
});
const asSim = (v: VesselState): SimVessel => ({ ...v, rotationZ: 0, colorHex: v.liquidColor!, density_g_ml: 1 });

describe('Displaced free surface and finite liquid discharge', () => {
  it('starts a submerged copper source at its displaced lip level and retains the metal', () => {
    const p = getWorldVesselProfile('beaker', 100), angle = 0.5, grossRetained = retainedVolume(p, angle);
    // Small fully immersed stock supports the closed-form +0.1 mL result.
    // A 10 mL turning group protrudes and must be tested by its actual mesh.
    const v = vessel(grossRetained - 0.05, [item('Cu', 0.896, 's')]);
    const plain = calculateWeirFlow(p, v.volume_ml, angle), flow = calculateVesselWeirFlow(v, angle);
    expect(plain.flowRate_ml_s).toBe(0);
    expect(flow.flowRate_ml_s).toBeGreaterThan(0);
    expect(flow.surfaceVolume_ml).toBeCloseTo(v.volume_ml + 0.1, 10);
    expect(flow.retainedLiquidVolume_ml).toBeCloseTo(grossRetained - 0.1, 10);
    expect(flow.excessVolume_ml).toBeCloseTo(0.05, 10);
    const c = solveLevel(p, angle, v.volume_ml + 0.1).c;
    const lip = -Math.sin(angle) * p.lipLocal[0] + Math.cos(angle) * p.lipLocal[1];
    expect(flow.head_cm).toBeCloseTo((c - lip) * p.sceneScale, 11);
    const result = stepPourSimulation({ sourceId: v.id, targetId: null, tilt: angle,
      isStreaming: true, totalTransferred_ml: 0, totalSpilled_ml: 0, lastFlowRate: 0 }, { source: asSim(v) }, 100, 0);
    expect(result.nextSession.totalSpilled_ml).toBeCloseTo(0.05, 10);
    expect(result.updatedSource.contents!.find(c => c.formula === 'Cu')!.mass_g).toBe(0.896);
    expect(result.updatedSource.volume_ml).toBeCloseTo(grossRetained - 0.1, 9);
    expect(result.updatedSource.mass_g).toBeCloseTo(v.mass_g - 0.05, 9);
  });
  it('reduces to the existing no-solid flow across vessel types and poses', () => {
    for (const type of ['beaker', 'flask', 'test_tube', 'cylinder'] as const) {
      for (const angle of [0, 0.5, 1.2, 2.2, Math.PI]) {
        const v = { ...vessel(60), type }, p = getWorldVesselProfile(type, 100);
        const { surfaceVolume_ml, retainedGrossVolume_ml, retainedLiquidVolume_ml, displacementBasis, ...actual } = calculateVesselWeirFlow(v, angle);
        expect(actual).toEqual(calculateWeirFlow(p, v.volume_ml, angle));
        expect(surfaceVolume_ml).toBe(v.volume_ml); expect(displacementBasis).toBe('liquid-only');
        expect(retainedLiquidVolume_ml).toBe(retainedGrossVolume_ml);
      }
    }
  });
  it('never turns an unknown density, dry source, filter deposit or headspace gas into liquid flow', () => {
    const base = vessel(50), angle = 1.2;
    const plain = calculateVesselWeirFlow(base, angle);
    for (const solid of [item('Unspecified', 10, 's'), { ...item('Cu', 10, 's'), location: 'filter' as const },
      { ...item('CO2', 1, 'l'), phase: 'g' as const }]) {
      expect(calculateVesselWeirFlow(vessel(50, [solid]), angle)).toEqual(plain);
    }
    const dry = calculateVesselWeirFlow(vessel(0, [item('Cu', 89.6, 's')]), Math.PI);
    expect(dry.flowRate_ml_s).toBe(0); expect(dry.excessVolume_ml).toBe(0);
    expect(calculateVesselWeirFlow({ ...base, capacity_ml: 0 }, angle).flowRate_ml_s).toBe(0);
  });
  it('counts floating ice as displaced water and keeps the ice out of the liquid dose', () => {
    const p = getWorldVesselProfile('beaker', 100), v = { ...vessel(20, [item('H2O', 5, 's')]), temperature_c: 0 };
    let low = 0.5, high = 1.5;
    for (let i = 0; i < 55; i++) { const m = (low + high) / 2; if (retainedVolume(p, m) > 22) low = m; else high = m; }
    const angle = (low + high) / 2, flow = calculateVesselWeirFlow(v, angle);
    expect(calculateWeirFlow(p, 20, angle).flowRate_ml_s).toBe(0);
    expect(flow.surfaceVolume_ml).toBeCloseTo(25, 10);
    expect(flow.excessVolume_ml).toBeCloseTo(3, 9);
    const result = stepPourSimulation({ sourceId: v.id, targetId: null, tilt: angle, isStreaming: true,
      totalTransferred_ml: 0, totalSpilled_ml: 0, lastFlowRate: 0 }, { source: asSim(v) }, 100, 0);
    expect(result.updatedSource.contents!.find(c => c.phase === 's')!.mass_g).toBe(5);
    expect(result.updatedSource.volume_ml).toBeCloseTo(17, 8);
  });
  it('uses the displaced liquid retained after uniform suspended material leaves with its carrier', () => {
    const mass = 1, v = vessel(80, [item('CuS', mass, 's', true)]), angle = 0.5;
    const mobile = { CuS: { inventoryMass_g: mass, suspendedMass_g: mass } };
    const flow = calculateVesselWeirFlow(v, angle, 0, 1, mobile);
    const solidVolume = mass / getPrecipitateProfile('CuS').particleDensity_g_cm3;
    const expectedRetained = flow.retainedGrossVolume_ml / (1 + solidVolume / 80);
    expect(flow.retainedLiquidVolume_ml).toBeCloseTo(expectedRetained, 10);
    const projected = withdrawAliquot(v, flow.excessVolume_ml, mobile);
    expect(occupiedLiquidVolume(projected.vessel)).toBeCloseTo(flow.retainedGrossVolume_ml, 9);
    const result = stepPourSimulation({ sourceId: v.id, targetId: null, tilt: angle, isStreaming: true,
      totalTransferred_ml: 0, totalSpilled_ml: 0, lastFlowRate: 0 }, { source: asSim(v) }, 100, 0, Infinity, mobile);
    expect(result.updatedSource.volume_ml).toBeCloseTo(expectedRetained, 9);
    expect(result.updatedSource.contents!.find(c => c.formula === 'CuS')!.mass_g).toBeCloseTo(mass * expectedRetained / 80, 10);
    expect(result.updatedSource.mass_g + projected.sample.mass_g).toBeCloseTo(v.mass_g, 10);
  });
  it('solves a partially immersed sampled sphere against an independent cubic', () => {
    const mass = 0.46, v = vessel(0.1, [item('CuS', mass, 's', true)]);
    const p = getWorldVesselProfile('beaker', 100), raw = getVesselProfile('beaker', 100), retained = 0.05;
    let low = 1.2, high = 1.65;
    for (let i = 0; i < 55; i++) { const m = (low + high) / 2; if (retainedVolume(p, m) > retained) low = m; else high = m; }
    const angle = (low + high) / 2, mobile = { CuS: { inventoryMass_g: mass, suspendedMass_g: mass } };
    const flow = calculateVesselWeirFlow(v, angle, 0, 1, mobile);
    const k = solidSceneVolume(v, 1), h = raw.H * flow.retainedGrossVolume_ml / 100;
    const radius = Math.cbrt(3 * k * mass / getPrecipitateProfile('CuS').particleDensity_g_cm3 / (4 * Math.PI));
    // x = cbrt(L_remaining/L_initial): L_initial*x³ + A*x - B = 0.
    const a = Math.PI * h * h * radius / k / v.volume_ml;
    const b = (flow.retainedGrossVolume_ml + Math.PI * h ** 3 / (3 * k)) / v.volume_ml;
    const x = 2 * Math.sqrt(a / 3) * Math.sinh(Math.asinh(3 * b / (2 * a) * Math.sqrt(3 / a)) / 3);
    expect(h).toBeLessThan(2 * radius * x);
    expect(flow.retainedLiquidVolume_ml).toBeCloseTo(v.volume_ml * x ** 3, 10);
    const projected = withdrawAliquot(v, flow.excessVolume_ml, mobile);
    expect(occupiedLiquidVolume(projected.vessel)).toBeCloseTo(flow.retainedGrossVolume_ml, 9);
  });
  it('partitions one suspended sample into receiver capacity and spill with the same composition', () => {
    const source = vessel(80, [item('CuS', 1, 's', true)]), target = { ...vessel(99.98), id: 'target', position: [0, -0.135, 0] as [number, number, number] };
    const mobile = { CuS: { inventoryMass_g: 1, suspendedMass_g: 1 } }, angle = 1.2;
    const result = stepPourSimulation({ sourceId: source.id, targetId: target.id, sourcePos: [0, 3, 0], tilt: angle,
      isStreaming: true, totalTransferred_ml: 0, totalSpilled_ml: 0, lastFlowRate: 0, assist: 'high' },
      { source: asSim(source), target: asSim(target) }, 100, 0, Infinity, mobile);
    const moved = source.volume_ml - result.updatedSource.volume_ml;
    expect(result.nextSession.totalTransferred_ml).toBeGreaterThan(0);
    const density = getPrecipitateProfile('CuS').particleDensity_g_cm3;
    const expectedAccepted = 0.02 / (1 + 1 / (80 * density));
    expect(result.nextSession.totalTransferred_ml).toBeCloseTo(expectedAccepted, 8);
    expect(result.updatedTarget!.contents!.find(c => c.formula === 'CuS')!.mass_g).toBeCloseTo(expectedAccepted / 80, 10);
    expect(result.updatedSource.contents!.find(c => c.formula === 'CuS')!.mass_g).toBeCloseTo(1 - moved / 80, 10);
    expect(result.nextSession.totalSpilled_ml + result.nextSession.totalTransferred_ml).toBeCloseTo(moved, 10);
    const spillMass = result.nextSession.totalSpilled_ml * (1 + 1 / 80);
    expect(result.updatedSource.mass_g + result.updatedTarget!.mass_g + spillMass).toBeCloseTo(source.mass_g + target.mass_g, 8);
  });
  it('treats stale sampling authorization as retained sediment, without creating a dose', () => {
    const v = vessel(80, [item('CuS', 1, 's', true)]), angle = 0.5;
    const fixed = calculateVesselWeirFlow(v, angle);
    const stale = calculateVesselWeirFlow(v, angle, 0, 1, { CuS: { inventoryMass_g: 2, suspendedMass_g: 2 } });
    expect(stale).toEqual(fixed);
  });
});
