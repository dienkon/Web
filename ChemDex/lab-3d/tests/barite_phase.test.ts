import { describe, expect, it } from 'vitest';
import { baritePhaseTarget, partitionBarite } from '../src/engine/baritePhase';
import { BARITE_KSP_25C, bariteKspAtTemperature, bariteDissolutionEnthalpy_J_mol } from '../src/science/baritePrecipitation';
import { sampleHeatCapacity } from '../src/engine/thermalState';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';

const sample = (moles = 1e-4): VesselState => ({ id: 'barite-phase', type: 'beaker',
  name: 'BaSO4', position: [0, 0, 0], rotationY: 0, isLocked: false,
  contents: [{ formula: 'H2O', phase: 'l', moles: 100 / 18.015, mass_g: 100 },
    { formula: 'BaSO4', phase: 's', moles, mass_g: moles * 233.39 }],
  substances: ['H2O', 'BaSO4'], volume_ml: 100, capacity_ml: 250, volume: 0.4,
  mass_g: 100 + moles * 233.39, temperature_c: 25, ph: 7,
  hasPrecipitate: true, precipitateAmount_g: moles * 233.39, precipitateSubstance: 'BaSO4',
  hasGas: false, isBoiling: false });
const settle = (v: VesselState) => {
  for (let i = 0; i < 800; i++) v = { ...v, ...partitionBarite(v, 0.1) };
  return v;
};
const dissolved = (v: VesselState) => v.contents.filter(c => c.formula === 'BaSO4' && c.phase === 'aq').reduce((s, c) => s + c.moles, 0);

describe('Finite reversible BaSO4 phase pool', () => {
  it('accounts for heat consumed by dissolution and released by crystallization', () => {
    for (const direction of ['dissolve', 'crystallize']) {
      const initial = sample();
      if (direction === 'crystallize') initial.contents[1].phase = 'aq';
      const end = { ...initial, ...partitionBarite(initial, 0.1) };
      const heat = -(dissolved(end) - dissolved(initial)) * bariteDissolutionEnthalpy_J_mol(25)!;
      expect(Math.sign(end.temperature_c - 25)).toBe(direction === 'dissolve' ? -1 : 1);
      expect((end.temperature_c - 25) * sampleHeatCapacity(end)).toBeCloseTo(heat, 9);
    }
  });
  it('dissolves only the saturation amount, then becomes idle', () => {
    const initial = sample(), end = settle(initial);
    expect(dissolved(end)).toBeCloseTo(Math.sqrt(bariteKspAtTemperature(end.temperature_c)!) * 0.1, 12);
    expect(end.contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(initial.mass_g, 12);
    expect(partitionBarite(end, 0.1)).toBeNull();
  });
  it('suppresses dissolution with a common ion without consuming its counterions', () => {
    const v = sample();
    const salt = { formula: 'Na2SO4', phase: 'aq' as const, moles: 1e-4, mass_g: 0.014204 };
    v.contents.push(salt);
    const end = settle(v), n = dissolved(end);
    expect(n).toBeLessThan(Math.sqrt(BARITE_KSP_25C) * 0.1);
    expect(n * (salt.moles + n) / 0.01).toBeCloseTo(bariteKspAtTemperature(end.temperature_c)!, 18);
    expect(end.contents.find(c => c.formula === 'Na2SO4')).toEqual(salt);
  });
  it('dissolves on dilution/heating and reprecipitates on cooling without losing formula units', () => {
    const initial = sample(), cold = settle(initial);
    const diluted = settle({ ...cold, volume_ml: 200 });
    expect(dissolved(diluted)).toBeCloseTo(Math.sqrt(bariteKspAtTemperature(diluted.temperature_c)!) * 0.2, 12);
    const hot = settle({ ...cold, temperature_c: 80 });
    expect(dissolved(hot)).toBeGreaterThan(dissolved(cold));
    const recooled = settle({ ...JSON.parse(JSON.stringify(hot)), temperature_c: 25 });
    expect(dissolved(recooled)).toBeCloseTo(Math.sqrt(bariteKspAtTemperature(recooled.temperature_c)!) * 0.1, 12);
    expect(recooled.contents.filter(c => c.formula === 'BaSO4').reduce((s, c) => s + c.moles, 0)).toBeCloseTo(1e-4, 14);
  });
  it('clears visual solid after complete dissolution of a tiny sample', () => {
    const v = settle(sample(1e-8));
    expect(v.hasPrecipitate).toBe(false);
    expect(v.precipitateAmount_g).toBe(0);
    const system = new PrecipitationSystem(40, 'BaSO4');
    const params = { temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, radius: 1,
      liquidBottomY: 0, surfaceY: 1, precipitateAmount_g: 0.01 };
    system.update(0.1, params);
    system.update(0.1, { ...params, precipitateAmount_g: v.precipitateAmount_g! });
    expect(system.representedMass_g).toBe(0);
    expect(system.particles).toHaveLength(0);
  });
  it('does not relocate filter cake or extrapolate an unsupported mixture', () => {
    const v = sample();
    v.contents[1].location = 'filter';
    expect(partitionBarite(v, 0.1)).toBeNull();
    expect(baritePhaseTarget(sample().contents, 100, 100)).toBeNull();
    const acid = sample();
    acid.contents.push({ formula: 'HCl', phase: 'aq', mass_g: 0.03646, moles: 0.001 });
    expect(partitionBarite(acid, 0.1)).toBeNull();
  });
  it('runs through the live store phase update', () => {
    const before = useAppStore.getState(), v = sample();
    try {
      useAppStore.setState({ vessels: { [v.id]: v }, vesselIds: [v.id], activeKinetics: {},
        pendingReactions: {}, isSimulationPaused: false });
      useAppStore.getState().tickSimulation(0.1);
      expect(dissolved(useAppStore.getState().vessels[v.id])).toBeGreaterThan(0);
    } finally { useAppStore.setState(before); }
  });
});
