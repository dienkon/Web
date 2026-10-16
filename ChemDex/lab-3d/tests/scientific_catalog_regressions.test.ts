import { describe, expect, it } from 'vitest';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById } from '../src/vfx/programs/library';
import { DETERMINISTIC_REACTIONS, chemicalFormulaMatches, executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { projectEscapedGas } from '../src/engine/gasInventory';
import { auditEquation, readComposition } from '../src/science/balance';
import { assessProgramConditions } from '../src/science/conditions';
import { identifySpecies } from '../src/science/speciesIdentity';
import { getReactionReview, SCIENCE_REFERENCES } from '../src/science/reviewCatalog';
import { validateProgram } from '../src/vfx/programs/validate';
import { getReactionVfxRecipe } from '../src/vfx/recipes/reactionVfx';
import { deriveProgramFromRules } from '../src/vfx/programs/resolver';
import { auditDisplayedEquation } from '../src/science/equationText';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

function amount(formula: string, moles: number, phase: string = 'aq'): SubstanceContent {
  return { formula, moles, phase, mass_g: moles * computeMolarMass(formula) };
}
function solve(contents: SubstanceContent[], temperature = 25, labels = contents.map(item => item.formula)) {
  return executeMultiStepReactions(contents, labels, 100, temperature, temperature > 25, 'vi', { preserveQuantities: true });
}
function vessel(contents: SubstanceContent[], patch: Partial<VesselState> = {}): VesselState {
  return {
    id: 'science_test', name: 'Science', type: 'beaker', capacity_ml: 250,
    position: [0, 0, 0], rotationY: 0, isLocked: false,
    volume_ml: 100, volume: 0.4, mass_g: contents.reduce((sum, item) => sum + item.mass_g, 0),
    temperature_c: 25, ph: 7, contents, substances: contents.map(item => item.formula),
    hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch,
  };
}
function atoms(contents: SubstanceContent[]) {
  const totals: Record<string, number> = {};
  for (const item of contents) {
    for (const [element, count] of Object.entries(readComposition(item.formula).atoms)) {
      totals[element] = (totals[element] ?? 0) + count * item.moles;
    }
  }
  return totals;
}

describe('Every catalog equation and its review coverage', () => {
  it.each(ALL_HANDCRAFTED_PROGRAMS.map(program => [program.id, program] as const))('%s has a balanced inventory or an explicit optical representation', (id, program) => {
    const review = getReactionReview(id);
    expect(review, id).toBeDefined();
    expect(review!.finding_vi.length).toBeGreaterThan(30);
    expect(review!.quantitativeCalibration).toBe('not_validated');
    if (program.chemistry.ionic) expect(auditDisplayedEquation(program.chemistry.ionic).every(result => result.valid), id).toBe(true);
    for (const key of review!.references) expect(SCIENCE_REFERENCES[key]?.url).toMatch(/^https:\/\//);
    const reactants = program.chemistry.species.filter(item => item.role === 'reactant');
    const products = program.chemistry.species.filter(item => item.role === 'product');
    if (['indicator', 'emission'].includes(program.chemistry.representation ?? '')) {
      expect(reactants).toHaveLength(0);
      expect(products).toHaveLength(0);
      return;
    }
    const balance = auditEquation(reactants.map(item => ({ formula: item.formula, coefficient: item.coeff })),
      products.map(item => ({ formula: item.formula, coefficient: item.coeff })));
    expect(balance, id).toMatchObject({ valid: true, atomDifference: {}, chargeDifference: 0 });
    for (const gas of program.visual.after.gasesOffgassed) {
      expect(products.some(item => item.phase === 'g' && item.formula === gas.species), id).toBe(true);
    }
  });

  it.each(DETERMINISTIC_REACTIONS.map(reaction => [reaction.id, reaction] as const))('%s conserves every element and charge', (id, reaction) => {
    const balance = auditEquation(Object.entries(reaction.stoichiometry).filter(([, coeff]) => coeff > 0)
      .map(([formula, coefficient]) => ({ formula, coefficient })),
    Object.entries(reaction.products).map(([formula, product]) => ({ formula, coefficient: product.coeff })));
    expect(balance, id).toMatchObject({ valid: true, atomDifference: {}, chargeDifference: 0 });
    expect(getReactionReview(id), id).toBeDefined();
    if (reaction.ionic_equation) expect(auditDisplayedEquation(reaction.ionic_equation).every(result => result.valid), id).toBe(true);
  });
});

describe('Formula identity and rejection of fabricated chemistry', () => {
  it('retains molecular groups, hydration waters and acid grade', () => {
    expect(identifySpecies('Cu(NO₃)₂(aq)').formula).toBe('Cu(NO3)2');
    expect(chemicalFormulaMatches('Cu(NO3)2', 'Cu')).toBe(false);
    expect(chemicalFormulaMatches('CuSO4·5H2O', 'CuSO4')).toBe(false);
    expect(chemicalFormulaMatches('HNO3(dil)', 'HNO3(conc)')).toBe(false);
    expect(readComposition('CuSO4·5H2O').atoms).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(readComposition('[CoCl4]2-').charge).toBe(-2);
    expect(readComposition('NH4+')).toEqual({ atoms: { N: 1, H: 4 }, charge: 1 });
  });

  it('rejects missing elements, unbalanced charge and pseudo-products', () => {
    expect(auditEquation([{ formula: 'HCl', coefficient: 1 }, { formula: 'NaOH', coefficient: 1 }],
      [{ formula: 'NaCl', coefficient: 1 }]).valid).toBe(false);
    expect(auditEquation([{ formula: 'Fe3+', coefficient: 1 }], [{ formula: 'Fe2+', coefficient: 1 }]).valid).toBe(false);
    expect(() => readComposition('I_starch')).toThrow();
    const invalid = structuredClone(getProgramById('hcl_naoh')!);
    invalid.chemistry.species = invalid.chemistry.species.filter(item => item.formula !== 'H2O');
    expect(validateProgram(invalid).valid).toBe(false);
  });

  it('does not regenerate a missing or exhausted reagent from labels', () => {
    const empty = solve([], 25, ['HCl', 'NaOH']);
    expect(empty.reactionsOccurred).toHaveLength(0);
    const depleted = solve([amount('HCl', 0), amount('NaOH', 0.01)], 25, ['HCl', 'NaOH']);
    expect(depleted.reactionsOccurred).toHaveLength(0);
    const missing = solve([amount('NaOH', 0.01)], 25, ['HCl', 'NaOH']);
    expect(missing.updatedContents.some(item => item.formula === 'NaCl')).toBe(false);
  });
});

describe('Actual reagent phase, quantity and experimental conditions', () => {
  it('distinguishes aqueous neutralization from gas-phase ammonium chloride smoke', () => {
    const aqueous = solve([amount('NH3', 0.01), amount('HCl', 0.01)]);
    expect(aqueous.reactionsOccurred.map(item => item.reactionId)).toEqual(['nh3_hcl_aqueous']);
    expect(aqueous.hasGas).toBe(false);
    expect(aqueous.updatedContents.find(item => item.formula === 'NH4Cl')?.phase).toBe('aq');
    const gases = solve([amount('NH3', 0.01, 'g'), amount('HCl', 0.01, 'g')]);
    expect(gases.reactionsOccurred[0].reactionId).toBe('nh3_hcl_fumes');
    expect(gases.updatedContents.find(item => item.formula === 'NH4Cl')?.phase).toBe('s');
  });

  it('keeps solid iodine and iodine vapor distinct without repeating sublimation', () => {
    const initial = [amount('I2', 0.01, 's')];
    const result = solve(initial, 70);
    expect(result.reactionsOccurred.map(item => item.reactionId)).toEqual(['iodine_sublimation']);
    expect(result.updatedContents).toHaveLength(1);
    expect(result.updatedContents[0]).toMatchObject({ formula: 'I2', phase: 'g', moles: 0.01 });
    expect(solve(result.updatedContents, 70).reactionsOccurred).toHaveLength(0);
  });

  it('consumes the gas reagent rather than an aqueous species with the same formula', () => {
    const result = solve([amount('NH3', 0.003), amount('NH3', 0.001, 'g'), amount('HCl', 0.001, 'g')]);
    expect(result.updatedContents.find(item => item.formula === 'NH3' && item.phase === 'aq')?.moles).toBeCloseTo(0.003, 12);
    expect(result.updatedContents.some(item => item.formula === 'NH3' && item.phase === 'g')).toBe(false);
  });

  it('dehydrates the hydrate rather than aqueous copper sulfate', () => {
    expect(solve([amount('CuSO4', 0.01)], 200).reactionsOccurred).toHaveLength(0);
    const initial = [amount('CuSO4·5H2O', 0.01, 's')];
    const result = solve(initial, 210);
    expect(result.reactionsOccurred[0].reactionId).toBe('cuso4_thermal_dehydration');
    expect(result.updatedContents.find(item => item.formula === 'H2O')?.moles).toBeCloseTo(0.05);
    expect(atoms(result.updatedContents)).toEqual(atoms(initial));
  });

  it.each([['HNO3(conc)', 'NO2'], ['HNO3(dil)', 'NO']] as const)('uses the declared grade %s to produce %s', (acid, gas) => {
    const result = solve([amount('Cu', 0.003, 's'), amount(acid, 0.02)]);
    expect(result.gasFormula).toBe(gas);
    expect(result.updatedContents.some(item => item.formula === gas && item.phase === 'g')).toBe(true);
    expect(solve(result.updatedContents).reactionsOccurred).toHaveLength(0);
  });

  it('requires actual acid for the acidic permanganate/oxalate equation', () => {
    const initial = [amount('KMnO4', 0.002), amount('H2C2O4', 0.005)];
    expect(solve(initial, 60).reactionsOccurred).toHaveLength(0);
    const acidified = [...initial, amount('H2SO4', 0.003)];
    const result = solve(acidified, 60);
    expect(result.reactionsOccurred.some(item => item.reactionId === 'kmno4_oxalic_redox')).toBe(true);
    const before = atoms(acidified), after = atoms(result.updatedContents);
    for (const element of Object.keys(before)) expect(after[element]).toBeCloseTo(before[element], 10);
  });

  it('requires residual iodate and starch for blue-black clock color', () => {
    const stoichiometric = [amount('KIO3', 0.001), amount('NaHSO3', 0.003)];
    expect(solve(stoichiometric).finalLiquidColor).not.toBe('#0f172a');
    const excess = [amount('KIO3', 0.002), amount('NaHSO3', 0.003)];
    expect(solve(excess).finalLiquidColor).toBe('#99621d');
    expect(solve(excess, 25, ['KIO3', 'NaHSO3', 'Starch']).finalLiquidColor).toBe('#0f172a');
  });

  it('creates copper hydroxide at low ammonia and dissolved complex in excess', () => {
    const low = solve([amount('CuSO4', 0.01), amount('NH3', 0.02), amount('H2O', 5, 'l')]);
    expect(low.updatedContents.some(item => item.formula === 'Cu(OH)2' && item.phase === 's')).toBe(true);
    const high = solve([amount('CuSO4', 0.01), amount('NH3', 0.05), amount('H2O', 5, 'l')]);
    expect(high.updatedContents.some(item => item.formula === '[Cu(NH3)4]SO4' && item.phase === 'aq')).toBe(true);
    expect(high.hasPrecipitate).toBe(false);
  });

  it('does not accelerate peroxide decomposition without its catalyst or consume MnO2', () => {
    expect(solve([amount('H2O2', 0.01)]).reactionsOccurred).toHaveLength(0);
    const result = solve([amount('H2O2', 0.01), amount('MnO2', 0.001, 's')]);
    expect(result.hasGas).toBe(true);
    expect(result.updatedContents.find(item => item.formula === 'MnO2')?.moles).toBe(0.001);
  });

  it('blocks program eligibility when heat, catalyst, phase or acid grade is missing', () => {
    const peroxide = getProgramById('h2o2_mno2')!;
    expect(assessProgramConditions(peroxide, [amount('H2O2', 0.01)], {}).ready).toBe(false);
    expect(assessProgramConditions(getProgramById('nh3_hcl')!, [amount('NH3', 0.01), amount('HCl', 0.01)], {}).ready).toBe(false);
    expect(assessProgramConditions(getProgramById('cu_hno3_dilute')!, [amount('Cu', 0.01, 's'), amount('HNO3(conc)', 0.05)], {}).ready).toBe(false);
    expect(assessProgramConditions(getProgramById('cu_conc_h2so4')!, [amount('Cu', 0.01, 's'), amount('H2SO4(conc)', 0.05)], { temperature_c: 25 }).ready).toBe(false);
  });
});

describe('Finite escaped gas and correct optical recipes', () => {
  it('removes open-vessel gas mass once and keeps sealed inventory', () => {
    const initial = vessel([amount('NaCl', 0.01), amount('CO2', 0.005, 'g')]);
    const patch = projectEscapedGas(initial)!;
    expect(patch.mass_g).toBeCloseTo(initial.mass_g - 0.005 * computeMolarMass('CO2'));
    expect(patch.escapedGas_g?.CO2).toBeCloseTo(0.005 * computeMolarMass('CO2'));
    expect(projectEscapedGas({ ...initial, ...patch })).toBeNull();
    expect(projectEscapedGas({ ...initial, isSealed: true })).toBeNull();
  });

  it('accounts for gas loss in the ledger rather than retaining a second copy', () => {
    const initial = vessel([amount('Na2CO3', 0.001), amount('HCl', 0.002)]);
    const program = getProgramById('na2co3_hcl')!;
    const open = applyProgramToLedger(program, initial, 1);
    expect(open.contents!.some(item => item.formula === 'CO2')).toBe(false);
    expect(open.escapedGas_g?.CO2).toBeCloseTo(0.001 * computeMolarMass('CO2'));
    const closed = applyProgramToLedger(program, { ...initial, isSealed: true }, 1);
    expect(closed.contents!.some(item => item.formula === 'CO2' && item.phase === 'g')).toBe(true);
    expect(closed.mass_g).toBeCloseTo(initial.mass_g);
  });

  it('does not give dilute nitric acid an NO2 plume or make all acid dilution explode', () => {
    const dilute = getReactionVfxRecipe('cu_hno3_dilute')!;
    expect(dilute.bubbles?.gasType).toBe('NO');
    expect(dilute.gasPlume).toBeUndefined();
    expect(getReactionVfxRecipe('nh3_hcl_aqueous')).toBeNull();
    const dilution = getReactionVfxRecipe('water_into_conc_h2so4_explosion')!;
    expect(dilution.layers.some(layer => ['burst', 'flash', 'shake'].includes(layer.kind))).toBe(false);
    expect(getProgramById('iodine_clock')!.visual.timeline.some(atom => atom.atom === 'beerLambertFade')).toBe(false);
  });
});

describe('Dynamic reaction rules obey the same conservation requirements', () => {
  const pairs = ['Na2CO3', 'K2CO3', 'NaHCO3', 'KHCO3', 'CaCO3', 'MgCO3']
    .flatMap(carbonate => ['HCl', 'HNO3', 'CH3COOH'].map(acid => [carbonate, acid]));
  it.each(pairs)('%s + %s includes the actual salt and conserves all atoms', (carbonate, acid) => {
    const program = deriveProgramFromRules([carbonate, acid], {})!;
    expect(program).toBeDefined();
    expect(validateProgram(program).valid).toBe(true);
    expect(program.chemistry.equation).not.toContain('Salt');
    expect(program.chemistry.species.filter(item => item.role === 'product')).toHaveLength(3);
  });
  it('does not invent metal-to-hydrogen equations for oxidizing acids', () => {
    expect(deriveProgramFromRules(['Zn', 'HNO3'], {})).toBeNull();
    const hypothetical = structuredClone(getProgramById('zn_hcl')!);
    expect(assessProgramConditions(hypothetical, [amount('Zn', 0.01, 's'), amount('HNO3', 0.05)], {}).ready).toBe(false);
  });
  it('rejects substitution templates with the wrong counterion inventory', () => {
    const template = getProgramById('bacl2_na2so4')!;
    expect(assessProgramConditions(template, [amount('Ba(NO3)2', 0.01), amount('Na2SO4', 0.01)], {}).ready).toBe(false);
  });
});
