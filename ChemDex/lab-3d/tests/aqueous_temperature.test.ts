import { afterEach, describe, expect, it } from 'vitest';
import { aqueousConstantsAtTemperature, neutralPhAtTemperature, solutionAcidity } from '../src/science/aqueousTemperature';
import { carbonateConstantsAtTemperature, CARBONATE_CONSTANTS_25C } from '../src/science/carbonateEquilibrium';
import { solveAqueousEquilibrium, cachedAqueousEquilibrium } from '../src/science/aqueousEquilibrium';
import { calciteEquilibriumTarget } from '../src/engine/calcitePhase';
import { projectAqueousSolution } from '../src/engine/aqueousProjection';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { getProgramById } from '../src/vfx/programs/library';
import { studioInventoryReading } from '../src/engine/studioInventoryReading';
import { useAppStore } from '../src/store/useAppStore';
import { useLabEnvironment } from '../src/store/useLabEnvironment';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState(), room = useLabEnvironment.getState();
afterEach(() => { useAppStore.setState(original, true); useLabEnvironment.setState(room, true); });
const item = (formula: string, moles: number, phase = 'aq'): SubstanceContent =>
  ({ formula, phase, moles, mass_g: moles * computeMolarMass(formula) });
const water = (): VesselState => ({ id: 'temperature_ph', name: 'Water', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false,
  contents: [item('H2O', 50 / 18.015, 'l')], substances: ['H2O'], mass_g: 50, volume_ml: 50, volume: 0.5,
  temperature_c: 25, ph: 7, phModel: 'ideal_aqueous_25c', hasGas: false, hasPrecipitate: false, isBoiling: false });

describe('Sourced equilibrium temperature dependencies', () => {
  it('preserves the selected 25 C references and predicts the changing neutral point of water', () => {
    expect(aqueousConstantsAtTemperature(25)!.waterKw).toBe(1e-14);
    expect(carbonateConstantsAtTemperature(25)).toEqual(CARBONATE_CONSTANTS_25C);
    expect(neutralPhAtTemperature(0)).toBeCloseTo(7.47, 2);
    expect(neutralPhAtTemperature(25)).toBe(7);
    expect(neutralPhAtTemperature(50)).toBeCloseTo(6.63, 2);
    for (const temperature of [0, 10, 25, 40, 50, 80, 90]) {
      const result = solveAqueousEquilibrium(water().contents, 50, temperature)!;
      expect(result.hydrogen_M).toBeCloseTo(result.hydroxide_M, 14);
      expect(result.ph).toBeCloseTo(neutralPhAtTemperature(temperature)!, 10);
      expect(result.referenceTemperature_c).toBe(temperature);
      expect(result.chargeResidual_M).toBeCloseTo(0, 14);
    }
  });
  it('does not classify hot neutral water as an acid or infer intrinsic acid strength from pH', () => {
    expect(solutionAcidity(neutralPhAtTemperature(50)!, 50)).toBe('neutral');
    expect(solutionAcidity(7, 50)).toBe('basic');
    expect(solutionAcidity(6, 50)).toBe('acidic');
  });
  it('keeps ice outside the solution charge balance while modeling liquid water at 0 C', () => {
    const contents = [...water().contents, item('H2O', 5 / 18.015, 's')];
    const result = solveAqueousEquilibrium(contents, 50, 0)!;
    expect(result.ph).toBeCloseTo(7.47, 2);
    expect(result.ph).toBe(solveAqueousEquilibrium(water().contents, 50, 0)!.ph);
    expect(result.referenceTemperature_c).toBe(0);
  });
  it('updates both ammonium and bisulfate constants while retaining each analytical total', () => {
    for (const temperature of [10, 25, 50]) {
      const ammonium = solveAqueousEquilibrium([item('NH4Cl', 0.001)], 100, temperature)!;
      const sulfate = solveAqueousEquilibrium([item('NaHSO4', 0.001)], 100, temperature)!;
      expect(ammonium.ammonia_M + ammonium.ammonium_M).toBeCloseTo(0.01, 12);
      expect(sulfate.sulfate_M + sulfate.bisulfate_M).toBeCloseTo(0.01, 12);
      expect(ammonium.chargeResidual_M).toBeCloseTo(0, 12);
      expect(sulfate.chargeResidual_M).toBeCloseTo(0, 12);
    }
    const cold = solveAqueousEquilibrium([item('NH4Cl', 0.001)], 100, 10)!;
    const hot = solveAqueousEquilibrium([item('NH4Cl', 0.001)], 100, 50)!;
    expect(hot.ph).toBeLessThan(cold.ph);
  });
  it('uses temperature in both caches and in the coupled calcite saturation calculation', () => {
    const contents = [...water().contents, item('CaCO3', 0.01, 's'), item('CO2', 0.001)];
    const cold = calciteEquilibriumTarget(contents, 50, 10)!;
    const hot = calciteEquilibriumTarget(contents, 50, 50)!;
    expect(hot).not.toBe(cold);
    expect(hot.dissolvedMoles).not.toBeCloseTo(cold.dissolvedMoles, 8);
    for (const [result, temperature] of [[cold, 10], [hot, 50]] as const) {
      expect(result.equilibrium.calcium_M * result.equilibrium.carbonate_M)
        .toBeCloseTo(carbonateConstantsAtTemperature(temperature)!.calciteKsp, 15);
      expect(result.equilibrium.referenceTemperature_c).toBe(temperature);
    }
    const fluid = [item('NaHCO3', 0.001)];
    const first = cachedAqueousEquilibrium(fluid, 100, 10)!;
    expect(cachedAqueousEquilibrium(fluid, 100, 10)).toBe(first);
    expect(cachedAqueousEquilibrium(fluid, 100, 50)).not.toBe(first);
  });
  it('keeps acetate systems explicitly on the 25 C reference until its temperature fit is sourced', () => {
    const contents = [item('CH3COOH', 0.001), item('CH3COONa', 0.001)];
    const result = solveAqueousEquilibrium(contents, 100, 50)!;
    expect(result.referenceTemperature_c).toBe(25);
    expect(result.ph).toBe(solveAqueousEquilibrium(contents, 100, 25)!.ph);
    const state = { ...water(), contents, temperature_c: 50 };
    expect(projectAqueousSolution(state)!.phModel).toBe('ideal_aqueous_25c');
    expect(projectAqueousSolution(state)!.phReferenceTemperature_c).toBe(25);
  });
  it('declines unsupported temperature extrapolation instead of clamping it to a hidden reference', () => {
    for (const temperature of [-10, 91, NaN, Infinity]) {
      expect(aqueousConstantsAtTemperature(temperature)).toBeNull();
      expect(carbonateConstantsAtTemperature(temperature)).toBeNull();
      expect(solveAqueousEquilibrium(water().contents, 50, temperature)).toBeNull();
    }
    const cleared = projectAqueousSolution({ ...water(), phReferenceTemperature_c: 25, temperature_c: 100 })!;
    expect(cleared.phModel).toBeUndefined();
    expect(cleared.phReferenceTemperature_c).toBeUndefined();
  });
  it('projects the current model temperature and reports a valid charge residual for a modeled hot sample', () => {
    const input = { ...water(), temperature_c: 50 };
    const next = { ...input, ...projectAqueousSolution(input) };
    expect(next.phModel).toBe('ideal_aqueous_temperature');
    expect(next.phReferenceTemperature_c).toBe(50);
    expect(projectAqueousSolution(next)).toBeNull();
    expect(Math.abs(studioInventoryReading(next).chargeResidual_M!)).toBeLessThan(1e-12);
  });
  it('uses the final heated temperature when a neutralization ledger reports pH', () => {
    const contents = [...water().contents, item('HCl', 0.01), item('NaOH', 0.01)];
    const input = { ...water(), contents, substances: contents.map(entry => entry.formula),
      mass_g: contents.reduce((sum, entry) => sum + entry.mass_g, 0) };
    const result = applyProgramToLedger(getProgramById('hcl_naoh')!, input, 1);
    expect(result.temperature_c).toBeGreaterThan(25);
    expect(result.phReferenceTemperature_c).toBe(result.temperature_c);
    expect(result.ph).toBeCloseTo(neutralPhAtTemperature(result.temperature_c!)!, 10);
  });
  it('responds to room temperature through the actual simulation without changing inventory', () => {
    const input = water();
    useLabEnvironment.setState({ conditions: { ...room.conditions, temperature_c: 40 } });
    useAppStore.setState({ vessels: { [input.id]: input }, vesselIds: [input.id], burners: {}, activeKinetics: {},
      pendingReactions: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 20; i++) useAppStore.getState().tickSimulation(0.1);
    const next = useAppStore.getState().vessels[input.id];
    expect(next.temperature_c).toBeGreaterThan(25);
    expect(next.ph).toBeLessThan(7);
    expect(next.phReferenceTemperature_c).toBe(next.temperature_c);
    expect(solutionAcidity(next.ph, next.phReferenceTemperature_c!)).toBe('neutral');
    expect(next.contents).toEqual(input.contents);
    expect(next.mass_g).toBe(input.mass_g);
  });
});
