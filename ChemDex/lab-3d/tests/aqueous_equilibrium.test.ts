import { describe, expect, it, vi } from 'vitest';
import { AQUEOUS_CONSTANTS_25C, solveAqueousEquilibrium, cachedAqueousEquilibrium } from '../src/science/aqueousEquilibrium';
import { indicatorColor, solutionIndicatorColor } from '../src/science/indicatorAppearance';
import { projectAqueousSolution } from '../src/engine/aqueousProjection';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { getProgramById } from '../src/vfx/programs/library';
import { ProgramPlayer } from '../src/vfx/programs/player/ProgramPlayer';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { useAppStore } from '../src/store/useAppStore';
import { readInstrument } from '../src/handling/instrumentReadings';
import { CHEMICAL_DATABASE, findChemical } from '../src/data/chemicals';
import { vfxBus } from '../src/vfx/bus';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import type { LedgerView } from '../src/vfx/catalog/types';

const sample = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({
  formula, moles, phase, mass_g: moles * computeMolarMass(formula),
});
const vessel = (contents: SubstanceContent[], patch: Partial<VesselState> = {}): VesselState => ({
  id: 'aqueous_test', name: 'Dung dịch', type: 'beaker', position: [0, 0, 0], rotationY: 0,
  isLocked: false, volume_ml: 100, volume: 0.4, capacity_ml: 250,
  contents, substances: contents.map(item => item.formula), mass_g: 100,
  temperature_c: 25, ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false, ...patch,
});
function solution(contents: SubstanceContent[], volume = 100) {
  const result = solveAqueousEquilibrium(contents, volume);
  expect(result).not.toBeNull();
  expect(Math.abs(result!.chargeResidual_M)).toBeLessThan(1e-12);
  expect(result!.hydrogen_M * result!.hydroxide_M).toBeCloseTo(1e-14, 25);
  return result!;
}

describe('Aqueous electroneutrality, water and conjugate-pair speciation', () => {
  it('recovers the independent quadratic solution for 0.1 M acetic acid and ammonia', () => {
    const ka = AQUEOUS_CONSTANTS_25C.aceticKa;
    const hydrogen = 2 * ka * 0.1 / (ka + Math.sqrt(ka * ka + 4 * ka * 0.1));
    const acid = solution([sample('CH3COOH', 0.01)]);
    expect(acid.ph).toBeCloseTo(-Math.log10(hydrogen), 6);
    expect(acid.ph).toBeGreaterThan(2.8);
    expect(acid.ph).toBeLessThan(3);
    expect(solution([sample('NH3', 0.01)]).ph).toBeCloseTo(14 + Math.log10(hydrogen), 6);
  });

  it.each([['CH3COONa', 8.87], ['NH4Cl', 5.13], ['NH4NO3', 5.13]] as const)('%s hydrolyzes rather than being assigned pH 7', (formula, ph) => {
    expect(solution([sample(formula, 0.01)]).ph).toBeCloseTo(ph, 1);
  });

  it('preserves family totals and uses acid/base ratio through a buffer region', () => {
    for (const ratio of [0.1, 0.5, 1, 2, 10]) {
      const result = solution([sample('CH3COOH', 0.01), sample('CH3COONa', 0.01 * ratio)]);
      expect(result.aceticAcid_M + result.acetate_M).toBeCloseTo(0.1 * (1 + ratio), 12);
      expect(result.ph).toBeCloseTo(-Math.log10(1.8e-5) + Math.log10(ratio), 1);
    }
    const ammoniacal = solution([sample('NH3', 0.01), sample('NH4Cl', 0.01)]);
    expect(ammoniacal.ammonia_M + ammoniacal.ammonium_M).toBeCloseTo(0.2, 12);
    expect(ammoniacal.ph).toBeCloseTo(14 + Math.log10(1.8e-5), 2);
  });

  it('includes water autoionization for ultra-dilute strong acid/base', () => {
    expect(solution([sample('HCl', 1e-11)]).ph).toBeGreaterThan(6.99);
    expect(solution([sample('HCl', 1e-11)]).ph).toBeLessThan(7);
    expect(solution([sample('NaOH', 1e-11)]).ph).toBeGreaterThan(7);
    expect(solution([sample('NaCl', 0.01)]).ph).toBeCloseTo(7, 10);
    expect(solution([sample('HCl', 0.01), sample('NaOH', 0.01)]).ph).toBeCloseTo(7, 10);
  });

  it('does not fully dissociate the second sulfate proton at every concentration', () => {
    const c = 0.1, ka = AQUEOUS_CONSTANTS_25C.bisulfateKa;
    const x = 2 * ka * c / (c + ka + Math.sqrt((c + ka) ** 2 + 4 * ka * c));
    const result = solution([sample('H2SO4', 0.01)]);
    expect(result.ph).toBeCloseTo(-Math.log10(c + x), 6);
    expect(result.bisulfate_M + result.sulfate_M).toBeCloseTo(c, 12);
  });

  it('handles ammonium acetate without guessing one salt pH', () => {
    const salt = solution([sample('CH3COONH4', 0.01)]);
    const precursors = solution([sample('CH3COOH', 0.01), sample('NH3', 0.01)]);
    expect(salt.ph).toBeCloseTo(7, 6);
    expect(precursors.ph).toBeCloseTo(salt.ph, 10);
  });

  it('moves toward neutral when a weak acid is diluted', () => {
    const initial = [sample('CH3COOH', 0.001)];
    expect(solution(initial, 1000).ph).toBeGreaterThan(solution(initial, 100).ph);
  });

  it('declines unsupported phases, metal hydrolysis and invalid inventories', () => {
    expect(solveAqueousEquilibrium([sample('FeCl3', 0.01)], 100)).toBeNull();
    expect(solveAqueousEquilibrium([sample('NaOH', 0.01, 's')], 100)).toBeNull();
    expect(solveAqueousEquilibrium([sample('HCl', 0.01, 'g')], 100)).toBeNull();
    expect(solveAqueousEquilibrium([sample('CH3COOH', -0.01)], 100)).toBeNull();
    expect(solveAqueousEquilibrium([sample('HCl', 0.01)], 0)).toBeNull();
  });

  it('does not consume or mutate formula-unit inventories to display equilibrium', () => {
    const input = [sample('NH3', 0.01), sample('NH4Cl', 0.003)];
    const before = structuredClone(input);
    const first = cachedAqueousEquilibrium(input, 100);
    expect(cachedAqueousEquilibrium(input, 100)).toBe(first);
    expect(cachedAqueousEquilibrium(input, 200)).not.toBe(first);
    expect(input).toEqual(before);
  });
});

describe('Titration and indicator rendering follow the current sample', () => {
  it('exposes the aqueous buffer stocks and indicators on the actual chemical shelf', () => {
    for (const formula of ['CH3COOH', 'CH3COONa', 'CH3COOK', 'NH4Cl(aq)']) {
      const stock = CHEMICAL_DATABASE.find(item => item.formula === formula)!;
      expect(stock?.type).toBe('liquid');
      expect(stock.defaultConcentration).toBe(0.1);
      expect(stock.molarMass).toBeCloseTo(computeMolarMass(formula), 2);
    }
    expect(findChemical('NH4Cl').type).toBe('solid');
    expect(findChemical('NH4Cl(aq)').type).toBe('liquid');
    for (const formula of ['Phenolphthalein', 'Methyl_Orange', 'Bromothymol_Blue']) {
      expect(CHEMICAL_DATABASE.find(item => item.formula === formula)?.category).toBe('indicator');
    }
  });
  it('follows a weak-acid titration before, at and after equivalence', () => {
    const fractions = [0, 0.25, 0.5, 0.75, 0.99, 1, 1.01, 1.5, 2];
    const values = fractions.map(fraction => solution([sample('CH3COOH', 0.01), sample('NaOH', 0.01 * fraction)], 100 * (1 + fraction)).ph);
    expect(values.every((ph, index) => index === 0 || ph > values[index - 1])).toBe(true);
    expect(values[2]).toBeCloseTo(-Math.log10(1.8e-5), 2);
    expect(values[5]).toBeCloseTo(8.72, 1);
    expect(values[6]).toBeGreaterThan(10.5);
  });

  it('gives acidic ammonia equivalence and different colors for the same indicator dose', () => {
    const result = solution([sample('NH3', 0.01), sample('HCl', 0.01)], 200);
    expect(result.ph).toBeCloseTo(5.28, 1);
    const dye = [sample('Phenolphthalein', 1e-7)];
    expect(solutionIndicatorColor(dye, 7)).not.toBe(solutionIndicatorColor(dye, 10));
    expect(solutionIndicatorColor(dye, 8.5)).not.toBe(solutionIndicatorColor(dye, 10));
    expect(solutionIndicatorColor([sample('Phenolphthalein', 0)], 12)).toBeNull();
    expect(solutionIndicatorColor([...dye, sample('Methyl_Orange', 1e-7)], 7)).toBeNull();
  });

  it.each(['methyl_orange', 'bromothymol_blue', 'phenolphthalein'])('%s responds smoothly and reversibly without a timer', indicator => {
    const at = (ph: number) => indicatorColor(indicator, ph);
    expect(at(3)).not.toBe(at(11));
    const channel = (ph: number, offset: number) => parseInt(at(ph)!.slice(offset, offset + 2), 16);
    if (indicator === 'bromothymol_blue') {
      expect(channel(7, 3)).toBeGreaterThan(channel(7, 1));
      expect(channel(7, 3)).toBeGreaterThan(channel(7, 5));
    } else if (indicator === 'methyl_orange') {
      expect(channel(3, 1)).toBeGreaterThan(channel(3, 3));
      expect(channel(11, 3)).toBeGreaterThan(channel(3, 3));
    } else {
      expect(channel(3, 3)).toBeGreaterThan(240);
      expect(channel(11, 3)).toBeLessThan(100);
    }
    expect(indicatorColor(indicator, NaN)).toBeNull();
  });

  it('updates a weak-acid ledger at equivalence without a preset pH', () => {
    const initial = vessel([sample('CH3COOH', 0.01), sample('NaOH', 0.01)]);
    const result = applyProgramToLedger(getProgramById('ch3cooh_naoh')!, initial, 1);
    expect(result.ph).toBeGreaterThan(8.5);
    expect(result.phModel).toBe('ideal_aqueous_25c');
  });

  it('uses the same equilibrium for native neutralization and metered samples', () => {
    const input = [sample('NH3', 0.01), sample('HCl', 0.01)];
    const native = executeMultiStepReactions(input, ['NH3', 'HCl'], 100, 25, false);
    expect(native.finalPh).toBeCloseTo(5.13, 1);
    expect(native.phModel).toBe('ideal_aqueous_25c');
    const metered = reactAliquotMixture(vessel(input), 'vi', false);
    expect(metered.vessel.ph).toBeCloseTo(native.finalPh, 10);
    const weakOnly = reactAliquotMixture(vessel([sample('CH3COOH', 0.01)]), 'vi', false);
    expect(weakOnly.vessel.ph).toBeLessThan(3);
    expect(weakOnly.mixResult).toBeNull();
  });

  it('consumes strong base when making an acetate buffer rather than leaving phantom NaOH', () => {
    const initial = [sample('CH3COOH', 0.01), sample('NaOH', 0.005)];
    const result = executeMultiStepReactions(initial, initial.map(item => item.formula), 100, 25, false);
    expect(result.reactionsOccurred.map(item => item.reactionId)).toEqual(['ch3cooh_naoh_aqueous']);
    expect(result.updatedContents.some(item => item.formula === 'NaOH')).toBe(false);
    expect(result.updatedContents.find(item => item.formula === 'CH3COONa')?.moles).toBeCloseTo(0.005, 12);
    expect(result.updatedContents.find(item => item.formula === 'CH3COOH')?.moles).toBeCloseTo(0.005, 12);
    expect(result.finalPh).toBeCloseTo(-Math.log10(1.8e-5), 2);
    const beforeMass = initial.reduce((sum, item) => sum + item.mass_g, 0);
    expect(result.updatedContents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(beforeMass, 10);
    expect(executeMultiStepReactions(result.updatedContents, result.updatedSubstances, 100, 25, false).reactionsOccurred).toHaveLength(0);
  });

  it('reacidifies acetate and deprotonates ammonium without fabricating gas', () => {
    for (const salt of ['CH3COONa', 'CH3COOK']) {
      const input = [sample(salt, 0.01), sample('HCl', 0.005)];
      const result = executeMultiStepReactions(input, input.map(item => item.formula), 100, 25, false);
      expect(result.updatedContents.find(item => item.formula === 'CH3COOH')?.moles).toBeCloseTo(0.005, 12);
      expect(result.finalPh).toBeCloseTo(-Math.log10(1.8e-5), 2);
      expect(result.hasGas).toBe(false);
    }
    const input = [sample('NH4Cl', 0.01), sample('NaOH', 0.005)];
    const result = executeMultiStepReactions(input, input.map(item => item.formula), 100, 25, false);
    expect(result.updatedContents.find(item => item.formula === 'NH3')?.moles).toBeCloseTo(0.005, 12);
    expect(result.finalPh).toBeCloseTo(14 + Math.log10(1.8e-5), 2);
    expect(result.hasGas).toBe(false);
  });

  it('does not let an indicator timeline turn an acidic sample pink', () => {
    const player = new ProgramPlayer();
    player.startProgram('dye', getProgramById('phenolphthalein_naoh')!);
    const view: LedgerView = { pH: 3, time_s: 0, temperature_c: 25, pressure_atm: 1,
      turbidity: 0, liquidColor: '#f8fafc', gasHoldup: 0, foam_ml: 0, speciesAmounts: {}, speciesRates: {}, heatRate_W: 0 };
    expect(player.update(1, { dye: view }).dye.liquidColor).toBe(indicatorColor('phenolphthalein', 3));
    view.pH = 11;
    expect(player.update(0.1, { dye: view }).dye.liquidColor).toBe(indicatorColor('phenolphthalein', 11));
    view.pH = 3;
    expect(player.update(0.1, { dye: view }).dye.liquidColor).toBe(indicatorColor('phenolphthalein', 3));
    player.dispose();
  });

  it('updates real store state and labels the pH meter reference model', () => {
    const before = useAppStore.getState();
    try {
      const v = vessel([sample('CH3COOH', 0.01), sample('Phenolphthalein', 1e-7)]);
      useAppStore.setState({ vessels: { [v.id]: v }, vesselIds: [v.id], selectedVesselId: v.id,
        burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false });
      useAppStore.getState().tickSimulation(0.02);
      const current = useAppStore.getState().vessels[v.id];
      expect(current.ph).toBeLessThan(3);
      expect(current.phModel).toBe('ideal_aqueous_25c');
      expect(current.liquidColor).toBe(indicatorColor('phenolphthalein', current.ph));
      expect(readInstrument('ph_meter').details[0].value).toContain('25 °C');
      expect(projectAqueousSolution(current)).toBeNull();
    } finally { useAppStore.setState(before, true); }
  });

  it('dilutes and pours an actual buffer locally without AI-generated reaction playback', async () => {
    const before = useAppStore.getState();
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'));
    try {
      const acidSolute = sample('CH3COOH', 0.01), donorSolute = sample('CH3COONa', 0.01);
      const water = (solute: SubstanceContent) => sample('H2O', (100 - solute.mass_g) / computeMolarMass('H2O'), 'l');
      const acid = vessel([acidSolute, water(acidSolute)]);
      const donor = vessel([donorSolute, water(donorSolute)], { id: 'acetate_donor' });
      useAppStore.setState({ vessels: { [acid.id]: acid, [donor.id]: donor }, vesselIds: [acid.id, donor.id],
        activeKinetics: {}, burners: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false });
      await useAppStore.getState().mixSubstances(acid.id, 'H2O', 20);
      const diluted = useAppStore.getState().vessels[acid.id];
      expect(diluted.volume_ml).toBe(120);
      expect(diluted.ph).toBeGreaterThan(2.9);
      expect(diluted.ph).toBeLessThan(3);
      expect(diluted.phModel).toBe('ideal_aqueous_25c');
      await useAppStore.getState().pourVessel(donor.id, acid.id, 100);
      const buffer = useAppStore.getState().vessels[acid.id];
      expect(buffer.volume_ml).toBe(220);
      expect(buffer.ph).toBeCloseTo(-Math.log10(1.8e-5), 2);
      expect(useAppStore.getState().activeKinetics[acid.id]).toBeUndefined();
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); useAppStore.setState(before, true); }
  });

  it('does not turn a flammable-gas hazard label into a spontaneous explosion', async () => {
    const before = useAppStore.getState();
    const explosion = vi.fn();
    const unsubscribe = vfxBus.on('explosion', explosion);
    try {
      const carbide = vessel([sample('CaC2', 0.001, 's')], { volume_ml: 0, volume: 0, mass_g: 0.0641 });
      useAppStore.setState({ vessels: { [carbide.id]: carbide }, vesselIds: [carbide.id], burners: {},
        activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false });
      await useAppStore.getState().mixSubstances(carbide.id, 'H2O', 20);
      const run = useAppStore.getState().activeKinetics[carbide.id];
      expect(run.program?.id).toBe('cac2_h2o');
      expect(run.hasGas).toBe(true);
      expect(useAppStore.getState().vessels[carbide.id].isExplosion).toBe(false);
      expect(explosion).not.toHaveBeenCalled();
    } finally { unsubscribe(); useAppStore.setState(before, true); }
  });
});
