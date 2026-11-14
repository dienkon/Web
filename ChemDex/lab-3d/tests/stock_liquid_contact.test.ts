import { afterEach, describe, expect, it } from 'vitest';
import { stockLiquidContactFraction, reactionStockContactFraction, partitionDryStock } from '../src/physical/stockLiquidContact';
import { planMetalAcid } from '../src/engine/metalAcidPlan';
import { advanceReaction } from '../src/engine/advanceReaction';
import { getProgramById } from '../src/vfx/programs/library';
import type { VesselState } from '../src/types/chemistry';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { useAppStore } from '../src/store/useAppStore';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { applyAluminumMaterialProgress, type AluminumMaterialStage } from '../src/engine/aluminumMaterialProgress';
const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));

const sample = (y: number, formula = 'Zn'): VesselState => ({
  id: `contact-${y}`, name: 'contact', type: 'beaker', capacity_ml: 100, position: [0, 0, 0], rotationY: 0,
  isLocked: false, volume_ml: 30, volume: 0.3, mass_g: 30.1, temperature_c: 25, ph: 1,
  hasGas: false, hasPrecipitate: false, isBoiling: false,
  contents: [{ formula, phase: 's', mass_g: 0.1, moles: 0.1 / 65.38 },
    { formula: 'HCl', phase: 'aq', mass_g: 0.3646, moles: 0.01 },
    { formula: 'H2O', phase: 'l', mass_g: 29.7354, moles: 29.7354 / 18.015 }],
  substances: [formula, 'HCl', 'H2O'],
  stockMotion: { tick: 1, grains: [{ id: 'solid', formula, mass_g: 0.1, scale_m: 0.002,
    position_m: [0, (y * 0.035), 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0],
    angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false }] },
});

function posedSample(id: string, height: number) {
  const program = getProgramById(id)!, vessel = createStudioSample(program, { ...sample(-0.7), contents: [], substances: [], stockMotion: undefined });
  const solid = program.chemistry.species.find(species => species.phase === 's' && ['reactant', 'catalyst'].includes(species.role))!;
  const row = vessel.contents.find(row => row.formula === solid.formula && row.phase === 's')!;
  const position_m = vesselLocalToWorld(vessel, [0, height, 0]).map(value => value * 0.035) as [number, number, number];
  vessel.stockMotion = { tick: 1, grains: [{ ...sample(0).stockMotion!.grains[0], formula: solid.formula, mass_g: row.mass_g,
    scale_m: 0.001, position_m }] };
  return { vessel, program, formula: solid.formula };
}

describe('heterogeneous stock contact gates', () => {
  it('blocks dry airborne stock and resumes when the same carrier is immersed', () => {
    const wet = sample(-0.7), dry = sample(0.6), program = getProgramById('zn_hcl')!;
    expect(stockLiquidContactFraction(wet, 'Zn')).toBeGreaterThan(0);
    expect(stockLiquidContactFraction(dry, 'Zn')).toBe(0);
    expect(reactionStockContactFraction(program, wet)).toBeGreaterThan(0);
    expect(reactionStockContactFraction(program, dry)).toBe(0);
    const wetKinetics = planMetalAcid(wet, 'vi')!.kinetics, dryKinetics = planMetalAcid(dry, 'vi')!.kinetics;
    expect(advanceReaction(wetKinetics, wet, 0.1)).toBeGreaterThan(0);
    expect(advanceReaction(dryKinetics, dry, 0.1)).toBe(0);
    expect(dryKinetics.unmetConditions.join(' ')).toContain('tiếp xúc pha lỏng');
  });

  it('keeps a moving stock fraction continuous and preserves static fallback layouts', () => {
    const moving = sample(-0.72), staticStock = { ...sample(-0.72), stockMotion: undefined }, program = getProgramById('zn_hcl')!;
    const dynamicFraction = stockLiquidContactFraction(moving, 'Zn');
    expect(dynamicFraction).toBeGreaterThan(0);
    expect(dynamicFraction).toBeLessThanOrEqual(1);
    expect(stockLiquidContactFraction(staticStock, 'Zn')).toBeGreaterThan(0);
    expect(reactionStockContactFraction(program, staticStock)).toBeGreaterThan(0);
  });

  it('does not gate a dry solid-only thermal decomposition', () => {
    const program = getProgramById('cuoh2_decomp')!;
    const dry = sample(0.8, 'Cu(OH)2');
    expect(program.chemistry.species.some(species => species.phase === 's' && species.role === 'reactant')).toBe(true);
    expect(program.chemistry.species.some(species => ['aq', 'l'].includes(species.phase) && species.role === 'reactant')).toBe(false);
    expect(reactionStockContactFraction(program, dry)).toBe(1);
    expect(reactionStockContactFraction(getProgramById('mg_o2_burn'), dry)).toBe(1);
  });

  it('provides bulk water in the authored potassium demonstration, matching the sodium specimen', () => {
    const program = getProgramById('k_h2o')!, vessel = createStudioSample(program, sample(-0.7));
    expect(vessel.volume_ml).toBe(30);
    const water = vessel.contents.find(row => row.formula === 'H2O' && row.phase === 'l')!;
    const potassium = vessel.contents.find(row => row.formula === 'K' && row.phase === 's')!;
    expect(water.moles).toBeGreaterThan(potassium.moles * 100);
  });

  it.each(['zn_hcl', 'h2o2_mno2', 'fe_cuso4', 'caco3_hcl', 'nh4no3_dissolution'])('%s cannot advance while its required solid is dry', id => {
    const { vessel, program, formula } = posedSample(id, 0.7), plan = planStudioProgram(program, vessel, 'vi').kinetics!;
    expect(plan).toBeTruthy();
    expect(advanceReaction(plan, vessel, 0.1)).toBe(0);
    expect(plan.actualProgressRate_s).toBe(0);
    vessel.stockMotion!.grains[0].position_m = vesselLocalToWorld(vessel, [0, -0.75, 0]).map(x => x * 0.035) as [number, number, number];
    expect(stockLiquidContactFraction(vessel, formula)).toBeGreaterThan(0);
    expect(advanceReaction(plan, vessel, 0.1)).toBeGreaterThan(0);
  });

  it('uses the exposed fraction for a partially immersed stock, without accelerating beyond fully wetted stock', () => {
    const { vessel, program, formula } = posedSample('zn_hcl', -0.75), plan = planStudioProgram(program, vessel, 'vi').kinetics!;
    const wet = advanceReaction(structuredClone(plan), vessel, 0.1), level = vesselLiquidSurfaceY(vessel);
    vessel.stockMotion!.grains[0].position_m = vesselLocalToWorld(vessel, [0, level, 0]).map(x => x * 0.035) as [number, number, number];
    const fraction = stockLiquidContactFraction(vessel, formula), partial = advanceReaction(structuredClone(plan), vessel, 0.1);
    expect(fraction).toBeGreaterThan(0.1); expect(fraction).toBeLessThan(0.9);
    expect(partial).toBeGreaterThan(0); expect(partial).toBeLessThan(wet);
  });

  it('blocks native pour-contact displacement while the stock is above the liquid', () => {
    const { vessel, formula } = posedSample('fe_cuso4', 0.7);
    const before = vessel.contents.find(row => row.formula === formula)!.moles;
    const native = executeMultiStepReactions(vessel.contents, vessel.substances, vessel.volume_ml, 25, false, 'vi', { vesselContact: vessel });
    expect(native.reactionsOccurred).toHaveLength(0);
    const received = reactAliquotMixture(vessel, 'vi', false);
    expect(received.vessel.contents.find(row => row.formula === formula)!.moles).toBe(before);
    vessel.stockMotion!.grains[0].position_m = vesselLocalToWorld(vessel, [0, -0.75, 0]).map(x => x * 0.035) as [number, number, number];
    const wet = executeMultiStepReactions(vessel.contents, vessel.substances, vessel.volume_ml, 25, false, 'vi', { vesselContact: vessel });
    expect(wet.reactionsOccurred.length).toBeGreaterThan(0);
  });

  it('requires the aqueous layer rather than mistaking an upper organic phase for acid contact', () => {
    const { vessel } = posedSample('zn_hcl', -0.05);
    vessel.volume_ml = 60; vessel.immiscibleOrganicVolume_ml = 30;
    vessel.contents.push({ formula: 'C6H14', phase: 'l', mass_g: 19.8, moles: 19.8 / 86.18, liquidLayer: 'organic' });
    expect(stockLiquidContactFraction(vessel, 'Zn')).toBe(0);
    expect(stockLiquidContactFraction(vessel, 'Zn', false)).toBeGreaterThan(0);
    vessel.stockMotion!.grains[0].position_m = vesselLocalToWorld(vessel, [0, -0.75, 0]).map(x => x * 0.035) as [number, number, number];
    expect(stockLiquidContactFraction(vessel, 'Zn')).toBeGreaterThan(0);
  });

  it('uses the gravity-horizontal surface when a vessel is tilted', () => {
    const { vessel } = posedSample('zn_hcl', -0.5); vessel.rotationZ = 0.7;
    const at = (x: number) => {
      vessel.stockMotion!.grains[0].position_m = vesselLocalToWorld(vessel, [x, -0.5, 0]).map(value => value * 0.035) as [number, number, number];
      return stockLiquidContactFraction(vessel, 'Zn');
    };
    expect(at(-0.45)).toBeGreaterThan(0.9);
    expect(at(0.45)).toBe(0);
  });

  it('manual and automatic material clocks preserve reactants, heat and gas until solid contact', () => {
    const { vessel, program } = posedSample('h2o2_mno2', 0.7), k = planStudioProgram(program, vessel, 'vi').kinetics!;
    const auto = new AutoExperiment(program.id, false);
    const internal = auto as unknown as { lesson: unknown; kinetics: typeof k; baseline: VesselState };
    internal.lesson = undefined; internal.kinetics = structuredClone(k); internal.baseline = structuredClone(vessel);
    auto.sample = structuredClone(vessel); auto.phase = 'react';
    useAppStore.setState({ vessels: { [vessel.id]: structuredClone(vessel) }, vesselIds: [vessel.id],
      burners: {}, spills: {}, activeKinetics: { [vessel.id]: structuredClone(k) }, pendingReactions: {},
      dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    for (let i = 0; i < 6; i++) { auto.tick(1 / 60); useAppStore.getState().tickSimulation(1 / 60); }
    const manual = useAppStore.getState().vessels[vessel.id];
    for (const after of [manual, auto.sample]) {
      expect(after.contents.find(row => row.formula === 'H2O2')!.moles).toBe(vessel.contents.find(row => row.formula === 'H2O2')!.moles);
      expect(after.temperature_c).toBeCloseTo(vessel.temperature_c, 9);
      expect(Object.values(after.gasFlux?.generated_mol_s ?? {}).reduce((sum, value) => sum + value, 0)).toBe(0);
    }
    expect(useAppStore.getState().activeKinetics[vessel.id].progress).toBe(0); expect(auto.progress).toBe(0);
  });

  it('also gates dry Cu(OH)2 supplied directly to the coupled ammonia equilibrium', () => {
    const { vessel } = posedSample('zn_hcl', 0.7), program = getProgramById('cuso4_nh3')!;
    vessel.contents = [{ formula: 'Cu(OH)2', phase: 's', moles: 0.001, mass_g: 0.09756 },
      { formula: 'NH3', phase: 'aq', moles: 0.06, mass_g: 1.02186 },
      { formula: 'H2O', phase: 'l', moles: 30 / 18.015, mass_g: 30 }];
    vessel.substances = vessel.contents.map(row => row.formula);
    vessel.stockMotion!.grains[0].formula = 'Cu(OH)2'; vessel.stockMotion!.grains[0].mass_g = 0.09756;
    const plan = planStudioProgram(program, vessel, 'vi').kinetics!;
    expect(plan).toBeTruthy(); expect(advanceReaction(plan, vessel, 0.1)).toBe(0);
    const native = executeMultiStepReactions(vessel.contents, vessel.substances, vessel.volume_ml, 25, false, 'vi', { vesselContact: vessel });
    expect(native.updatedContents.find(row => row.formula === 'Cu(OH)2' && row.phase === 's')!.moles).toBe(0.001);
    vessel.contents[0].solidOrigin = 'precipitate';
    expect(reactionStockContactFraction(program, vessel)).toBe(1);
    expect(advanceReaction(plan, vessel, 0.1)).toBeGreaterThan(0);
  });

  it('reacts wet carbonate precipitate while preserving a dry stock row of the same formula', () => {
    const { vessel, program } = posedSample('caco3_hcl', 0.7);
    const stock = vessel.contents.find(row => row.formula === 'CaCO3')!;
    vessel.contents.push({ ...stock, solidOrigin: 'precipitate' });
    const partition = partitionDryStock(vessel);
    expect(partition.inertContents).toEqual([stock]);
    expect(stockLiquidContactFraction(vessel, 'CaCO3')).toBeGreaterThan(0);
    const after = applyProgramToLedger(program, vessel, 1, { deferThermal: true });
    expect(after.contents!.find(row => row.formula === 'CaCO3' && !row.solidOrigin)!.moles).toBe(stock.moles);
    expect(after.contents!.filter(row => row.formula === 'CaCO3' && row.solidOrigin === 'precipitate')
      .reduce((sum, row) => sum + row.moles, 0)).toBeLessThan(stock.moles);
  });

  it('native selection uses dissolved carbonate without spending an inaccessible solid row', () => {
    const { vessel } = posedSample('caco3_hcl', 0.7);
    const stock = { formula: 'Na2CO3', phase: 's', moles: 0.001, mass_g: computeMolarMass('Na2CO3') * 0.001 };
    vessel.contents = [stock, { ...stock, phase: 'aq', moles: 0.0001, mass_g: stock.mass_g / 10 },
      { formula: 'HCl', phase: 'aq', moles: 0.001, mass_g: computeMolarMass('HCl') * 0.001 },
      { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 }];
    vessel.substances = vessel.contents.map(row => row.formula);
    vessel.stockMotion!.grains[0].formula = 'Na2CO3'; vessel.stockMotion!.grains[0].mass_g = stock.mass_g;
    const result = executeMultiStepReactions(vessel.contents, vessel.substances, 30, 25, false, 'vi', { vesselContact: vessel });
    expect(result.updatedContents.find(row => row.formula === 'Na2CO3' && row.phase === 's')!.moles).toBe(0.001);
    expect(result.updatedContents.find(row => row.formula === 'Na2CO3' && row.phase === 'aq')?.moles ?? 0).toBeLessThan(0.0001);
  });

  it('copper aqueous complexation continues beside dry stock without dissolving that stock', () => {
    const { vessel } = posedSample('zn_hcl', 0.7), program = getProgramById('cuso4_nh3')!;
    const stock = { formula: 'Cu(OH)2', phase: 's', moles: 0.001, mass_g: computeMolarMass('Cu(OH)2') * 0.001 };
    vessel.contents = [stock, { formula: 'CuSO4', phase: 'aq', moles: 0.001, mass_g: computeMolarMass('CuSO4') * 0.001 },
      { formula: 'NH3', phase: 'aq', moles: 0.06, mass_g: computeMolarMass('NH3') * 0.06 },
      { formula: 'H2O', phase: 'l', moles: 30 / 18.015, mass_g: 30 }];
    vessel.substances = vessel.contents.map(row => row.formula); vessel.mass_g = vessel.contents.reduce((sum, row) => sum + row.mass_g, 0);
    vessel.stockMotion!.grains[0].formula = stock.formula; vessel.stockMotion!.grains[0].mass_g = stock.mass_g;
    const plan = planStudioProgram(program, vessel, 'vi').kinetics!, p = advanceReaction(plan, vessel, 0.1);
    expect(p).toBeGreaterThan(0);
    const after = applyProgramWithThermalSinks(program, vessel, vessel, p, 0.1);
    expect(after.contents!.find(row => row.formula === stock.formula && row.phase === 's' && !row.solidOrigin)!.moles).toBe(stock.moles);
    expect(after.contents!.find(row => row.formula === 'CuSO4')!.moles).toBeLessThan(0.001);
    expect(after.contents!.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(vessel.mass_g, 10);
    // A non-copper dry stock must stay inert without making the coupled pool
    // bookkeeping re-solve an unsupported whole-inventory mixture.
    stock.formula = 'Zn'; stock.mass_g = computeMolarMass('Zn') * stock.moles;
    vessel.stockMotion!.grains[0].formula = 'Zn'; vessel.stockMotion!.grains[0].mass_g = stock.mass_g;
    vessel.substances = vessel.contents.map(row => row.formula);
    const native = executeMultiStepReactions(vessel.contents, vessel.substances, 30, 25, false, 'vi', { vesselContact: vessel });
    expect(native.updatedContents.find(row => row.formula === 'Zn')!.moles).toBe(0.001);
    expect(native.reactionsOccurred.some(reaction => reaction.reactionId === 'cuso4_nh3_complex')).toBe(true);
  });

  it('cumulative replay does not dissolve or resurrect a stock lifted after accepted reaction', () => {
    const { vessel: baseline, program } = posedSample('zn_hcl', -0.75);
    const accepted = { ...baseline, ...applyProgramWithThermalSinks(program, baseline, baseline, 0.25, 0.1) };
    accepted.stockMotion = structuredClone(baseline.stockMotion);
    accepted.stockMotion!.grains[0].position_m = vesselLocalToWorld(accepted, [0, 0.7, 0]).map(x => x * 0.035) as [number, number, number];
    const mass = accepted.contents.find(row => row.formula === 'Zn')!.mass_g;
    for (const progress of [0.25, 0.5]) {
      const replay = applyProgramWithThermalSinks(program, baseline, accepted, progress, 0.1);
      expect(replay.contents!.find(row => row.formula === 'Zn')!.mass_g).toBeCloseTo(mass, 12);
      expect(replay.escapedGas_g?.H2).toBeCloseTo(accepted.escapedGas_g!.H2, 12);
    }
  });

  it('native aluminum material stages obey contact even without an authored program object', () => {
    const { vessel, program } = posedSample('aloh3_naoh', 0.7);
    // This specimen intentionally represents added macrostock, not gel.
    vessel.hasPrecipitate = false; vessel.precipitateSubstance = undefined;
    const stock = vessel.contents.find(row => row.formula === 'Al(OH)3')!; stock.solidOrigin = undefined;
    const stage: AluminumMaterialStage = { reactionId: 'aloh3_naoh_dissolution', extent_mol: stock.moles, deltaH_kJ_mol: 0,
      weight_molAl: stock.moles, reactants: [{ formula: 'Al(OH)3', coeff: 1, phase: 's' }, { formula: 'NaOH', coeff: 1, phase: 'aq' }],
      products: [{ formula: 'Na[Al(OH)4]', coeff: 1, phase: 'aq' }] };
    const kinetics = { ...planStudioProgram(program, vessel, 'vi').kinetics!, program: undefined, materialStages: [stage] };
    expect(advanceReaction(kinetics, vessel, 0.1)).toBe(0);
    const after = applyAluminumMaterialProgress([stage], vessel, vessel, 0.5, 0.1);
    expect(after.contents!.find(row => row.formula === 'Al(OH)3')!.moles).toBe(stock.moles);
  });
});
