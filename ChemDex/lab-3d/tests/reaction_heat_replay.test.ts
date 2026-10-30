import { afterEach, describe, expect, it } from 'vitest';
import { getProgramById } from '../src/vfx/programs/library';
import { createStudioSample } from '../src/engine/studioProgram';
import { applyProgramToLedger } from '../src/engine/ledger';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { applyThermalEnergy, sampleHeatCapacity, stepVesselThermal } from '../src/engine/thermalState';
import { H2O2_AQ_REACTION_DH_KJ } from '../src/science/thermochemistry';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';
const shell: VesselState = { id: 'heat', name: 'Heat test', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  mass_g: 0, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7,
  hasGas: false, hasPrecipitate: false, isBoiling: false };
const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));

describe('Incremental reaction heat and external thermal history', () => {
  it('adds only new reaction heat and preserves intervening external heating and cooling', () => {
    const program = getProgramById('hcl_naoh')!, baseline = createStudioSample(program, shell);
    let current = { ...baseline, temperature_c: 40 };
    const first = applyProgramWithThermalSinks(program, baseline, current, 0.2);
    expect(first.temperature_c).toBeCloseTo(40 + 55.83 * 0.2 / sampleHeatCapacity(current), 9);
    current = { ...current, ...first, temperature_c: first.temperature_c! + 8 };
    const cooled = { ...current, ...stepVesselThermal(current, 2) };
    const second = applyProgramWithThermalSinks(program, baseline, cooled, 0.6);
    expect(second.programHeatApplied_J).toBeCloseTo(55.83 * 0.6, 10);
    expect(second.temperature_c).toBeCloseTo(cooled.temperature_c + 55.83 * 0.4 / sampleHeatCapacity(cooled), 9);
    const repeated = applyProgramWithThermalSinks(program, baseline, { ...cooled, ...second }, 0.6);
    expect(repeated.temperature_c).toBeCloseTo(second.temperature_c!, 10);
  });
  it('normalizes enthalpy to the coefficients as written', () => {
    const original = getProgramById('hcl_naoh')!, sample = createStudioSample(original, shell);
    const doubled = { ...original, chemistry: { ...original.chemistry,
      species: original.chemistry.species.map(item => ({ ...item, coeff: item.coeff * 2 })),
      deltaH_kJ_per_mol: original.chemistry.deltaH_kJ_per_mol! * 2 } };
    const single = applyProgramToLedger(original, sample, 1), twice = applyProgramToLedger(doubled, sample, 1);
    expect(twice.programHeatApplied_J).toBeCloseTo(single.programHeatApplied_J!, 10);
    expect(twice.temperature_c).toBeCloseTo(single.temperature_c!, 10);
    expect(twice.contents).toEqual(single.contents);
  });
  it('accounts an endothermic packet once rather than resetting to baseline temperature', () => {
    const program = getProgramById('nh4no3_dissolution')!, baseline = createStudioSample(program, shell);
    const first = applyProgramWithThermalSinks(program, baseline, { ...baseline, temperature_c: 35 }, 0.5);
    expect(first.temperature_c).toBeLessThan(35);
    expect(first.temperature_c).toBeGreaterThan(34);
    const repeated = applyProgramWithThermalSinks(program, baseline, { ...baseline, ...first }, 0.5);
    expect(repeated.temperature_c).toBeCloseTo(first.temperature_c!, 10);
  });
  it('spends reaction heat on finite vaporization without replaying the lost water', () => {
    const original = getProgramById('hcl_naoh')!;
    const program = { ...original, chemistry: { ...original.chemistry, deltaH_kJ_per_mol: -5000 } };
    const baseline = { ...createStudioSample(program, shell), temperature_c: 99 };
    const result = applyProgramWithThermalSinks(program, baseline, baseline, 1, 1);
    expect(result.programHeatApplied_J).toBeCloseTo(5000, 10);
    expect(result.evaporated_ml).toBeGreaterThan(1);
    const inventory = { ...baseline, ...applyProgramToLedger(program, baseline, 1, { deferThermal: true }) };
    const packet = applyThermalEnergy(inventory, 5000, 1);
    expect(packet.latentEnergy_J + packet.sensibleEnergy_J).toBeCloseTo(5000, 8);
    expect(result.evaporated_ml).toBeCloseTo(packet.evaporated_ml!, 9);
    expect(result.mass_g! + result.evaporated_ml!).toBeCloseTo(baseline.mass_g, 8);
    const current = { ...baseline, ...result };
    const repeat = applyProgramWithThermalSinks(program, baseline, current, 1);
    expect(repeat.evaporated_ml).toBeCloseTo(result.evaporated_ml!, 8);
    expect(repeat.mass_g).toBeCloseTo(result.mass_g!, 8);
    expect(repeat.contents!.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(repeat.mass_g!, 8);
  });
  it('uses the dry vessel heat capacity without inventing 50 mL of solvent', () => {
    const program = getProgramById('mg_o2_burn')!;
    const sample = { ...createStudioSample(program, shell), ignitedProgramId: program.id };
    const end = applyProgramToLedger(program, sample, 1);
    expect(sample.volume_ml).toBe(0);
    expect(sampleHeatCapacity(sample)).toBe(33.2);
    expect(end.temperature_c! - sample.temperature_c).toBeCloseTo(end.programHeatApplied_J! / 33.2, 8);
    expect(end.volume_ml).toBe(0);
  });
  it('retains actual burner heat while a program advances and records its heat exactly once', () => {
    useAppStore.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {},
      isSimulationPaused: false, timeScale: 1 });
    const state = useAppStore.getState(), id = state.prepareStudioProgram('hcl_naoh')!;
    const sample = useAppStore.getState().vessels[id];
    useAppStore.setState({ burners: { lamp: { id: 'lamp', isOn: true, intensity: 3, fuelLevel_ml: 1,
      position: [sample.position[0], sample.position[1] - 1, sample.position[2]] } } });
    state.runStudioProgram(id);
    state.tickSimulation(0.1);
    const first = useAppStore.getState();
    const firstSample = first.vessels[id];
    // Half conversion at the declared 0.1 s half-time, independent of the
    // four-second presentation. The total heat must still be applied once.
    const reaction = 55.83 * 0.5;
    expect(firstSample.programHeatApplied_J).toBeCloseTo(reaction, 10);
    const burnerOnly = stepVesselThermal(sample, 0.1, first.burners.lamp.deliveredHeat_J! / 0.1);
    expect(firstSample.temperature_c).toBeCloseTo(burnerOnly.temperature_c + reaction / sampleHeatCapacity(sample), 8);
    state.seekStudioProgram(id, 1);
    const end = useAppStore.getState().vessels[id];
    expect(end.programHeatApplied_J).toBeCloseTo(55.83, 10);
    expect(useAppStore.getState().activeKinetics[id]).toBeUndefined();
  });
  it('keeps the aqueous peroxide reference distinct from a per-mole pure-liquid value', () => {
    const program = getProgramById('h2o2_mno2')!;
    expect(H2O2_AQ_REACTION_DH_KJ).toBeCloseTo(-190.16, 10);
    expect(program.chemistry.deltaH_kJ_per_mol).toBe(H2O2_AQ_REACTION_DH_KJ);
    expect(program.chemistry.deltaHReferenceTemperature_K).toBe(298.15);
    expect(program.chemistry.deltaHSourceUrls).toHaveLength(2);
  });
});
