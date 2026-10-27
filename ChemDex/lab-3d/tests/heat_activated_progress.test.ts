import { afterEach, describe, expect, it } from 'vitest';
import { advanceHeatActivatedProgress } from '../src/engine/heatActivatedProgress';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { planStudioProgram } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { computeMolarMass } from '../src/engine/ledger';
import { useAppStore } from '../src/store/useAppStore';
import { reactionIsEmitting } from '../src/vfx/reactionActivity';
import type { VesselState } from '../src/types/chemistry';

const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before, true));
const sample = (temperature_c = 85.1): VesselState => ({ id: 'heated', name: 'test', type: 'beaker',
  capacity_ml: 100, position: [0, 0, 0], rotationY: 0, isLocked: false, temperature_c,
  volume_ml: 0, volume: 0, mass_g: 0.02 * computeMolarMass('NaHCO3'),
  contents: [{ formula: 'NaHCO3', phase: 's', moles: 0.02, mass_g: 0.02 * computeMolarMass('NaHCO3') }],
  substances: ['NaHCO3'], ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false });
const setup = (temperature = 85.1) => {
  const vessel = sample(temperature), program = getProgramById('nahco3_heat')!;
  return { vessel, program, kinetics: planStudioProgram(program, vessel, 'vi').kinetics! };
};

describe('Heat-activated reaction progress uses the live thermal budget', () => {
  it('limits a large endothermic step at the declared activation bound and conserves stoichiometry', () => {
    const { vessel, program, kinetics } = setup();
    const snapshot = JSON.stringify([vessel, kinetics]);
    const progress = advanceHeatActivatedProgress(kinetics, vessel, 1);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1 / kinetics.duration);
    const next = applyProgramWithThermalSinks(program, vessel, vessel, progress);
    expect(next.temperature_c!).toBeGreaterThanOrEqual(85);
    expect(next.temperature_c!).toBeLessThan(85.00001);
    const consumedNaHCO3 = 0.02 - next.contents!.find(c => c.formula === 'NaHCO3')!.moles;
    expect(next.escapedGas_g!.CO2 / computeMolarMass('CO2')).toBeCloseTo(consumedNaHCO3 / 2, 12);
    expect(next.escapedGas_g!.H2O / computeMolarMass('H2O')).toBeCloseTo(consumedNaHCO3 / 2, 12);
    expect(next.mass_g! + Object.values(next.escapedGas_g!).reduce((s, n) => s + n, 0)).toBeCloseTo(vessel.mass_g, 12);
    expect(JSON.stringify([vessel, kinetics])).toBe(snapshot);
  });
  it('does not consume more reactant after cooling below the required temperature', () => {
    const { vessel, kinetics } = setup();
    kinetics.progress = 0.2;
    expect(advanceHeatActivatedProgress(kinetics, { ...vessel, temperature_c: 84.9 }, 1)).toBe(0.2);
    expect(advanceHeatActivatedProgress(kinetics, { ...vessel, temperature_c: NaN }, 1)).toBe(0.2);
  });
  it('permits the nominal step when the heat ledger can pay for it', () => {
    const { vessel, kinetics } = setup(150);
    expect(advanceHeatActivatedProgress(kinetics, vessel, 0.1)).toBeCloseTo(0.1 / kinetics.duration, 12);
  });
  it.each([0, -1, NaN, Infinity])('does not advance at invalid time %s', dt => {
    const { vessel, kinetics } = setup();
    expect(advanceHeatActivatedProgress(kinetics, vessel, dt)).toBe(0);
  });
  it('rejects an invalid duration instead of instantly completing the reaction', () => {
    const { vessel, kinetics } = setup();
    expect(advanceHeatActivatedProgress({ ...kinetics, duration: 0 }, vessel, 1)).toBe(0);
  });
  it('does not emit transient reaction effects while waiting for heat', () => {
    const { kinetics } = setup();
    expect(reactionIsEmitting({ ...kinetics, actualProgressRate_s: 0 })).toBe(false);
    expect(reactionIsEmitting({ ...kinetics, actualProgressRate_s: NaN })).toBe(false);
    expect(reactionIsEmitting({ ...kinetics, actualProgressRate_s: 0.1 })).toBe(true);
  });
  it('stalls a live cooling sample, resumes with metered heat, and freezes on pause', () => {
    const { vessel, kinetics } = setup(85.2);
    useAppStore.setState({ vessels: { heated: vessel }, vesselIds: ['heated'], activeKinetics: { heated: kinetics },
      burners: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 60; i++) useAppStore.getState().tickSimulation(1 / 60);
    const cold = useAppStore.getState(), stopped = cold.activeKinetics.heated.progress;
    expect(stopped).toBeGreaterThan(0);
    expect(stopped).toBeLessThan(0.02);
    expect(cold.activeKinetics.heated.actualProgressRate_s).toBe(0);
    expect(cold.vessels.heated.hasGas).toBe(false);
    const gasBefore = cold.vessels.heated.escapedGas_g!.CO2;
    for (let i = 0; i < 60; i++) useAppStore.getState().tickSimulation(1 / 60);
    expect(useAppStore.getState().activeKinetics.heated.progress).toBe(stopped);
    expect(useAppStore.getState().vessels.heated.escapedGas_g!.CO2).toBe(gasBefore);
    useAppStore.getState().setVesselState('heated', { effectHeatInput_W: 300 });
    for (let i = 0; i < 120; i++) useAppStore.getState().tickSimulation(1 / 60);
    expect(useAppStore.getState().activeKinetics.heated.progress).toBeGreaterThan(stopped + 0.1);
    expect(useAppStore.getState().vessels.heated.escapedGas_g!.CO2).toBeGreaterThan(gasBefore);
    useAppStore.setState({ isSimulationPaused: true });
    const frozen = useAppStore.getState();
    frozen.tickSimulation(0.1);
    expect(useAppStore.getState()).toBe(frozen);
  });
});
