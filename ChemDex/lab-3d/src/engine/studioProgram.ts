import type { ReactionProgram } from '../shared/programSchema';
import type { SubstanceContent, VesselState } from '../types/chemistry';
import type { ActiveKineticsState, Language } from '../store/useAppStore';
import { CHEMICAL_DATABASE } from '../data/chemicals';
import { computeMolarMass, applyProgramToLedger } from './ledger';
import { readComposition } from '../science/balance';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { assessProgramConditions } from '../science/conditions';
import { cachedAqueousEquilibrium } from '../science/aqueousEquilibrium';
import { DETERMINISTIC_PROGRAM_ALIASES } from '../science/reviewCatalog';
import { getProgramById } from '../vfx/programs/library';

const EXTRA_ALIASES: Record<string, string> = {
  cacl2_na2co3_precipitate: 'cacl2_na2co3', al_naoh: 'aloh3_naoh',
  burn_magnesium: 'mg_o2_burn', k2cr2o7_naoh_equilibrium: 'k2cr2o7_naoh',
  na2s2o3_hcl_turbidity: 'thiosulfate_acid_clock',
};
export function studioProgramForReaction(id: string) {
  return getProgramById(EXTRA_ALIASES[id] ?? DETERMINISTIC_PROGRAM_ALIASES[id] ?? id);
}

function molarMass(formula: string, declared?: number) {
  try { readComposition(formula); return computeMolarMass(formula); }
  catch {
    const known = CHEMICAL_DATABASE.find(item => sameMolecularFormula(item.formula, formula));
    const result = declared ?? known?.molarMass;
    if (!result || !Number.isFinite(result) || result <= 0) throw new Error(`Chưa có khối lượng mol xác định cho ${formula}.`);
    return result;
  }
}

/** Authored virtual specimen, not an experimentally validated lab procedure.
 * Normal aqueous demos assume 30 mL and density 1 g/mL. Concentrated acid
 * specimens have explicit stock water instead of an arbitrary 30 mL dilution. */
export function createStudioSample(program: ReactionProgram, shell: VesselState): VesselState {
  if (program.chemistry.representation === 'emission') throw new Error('Phát xạ ngọn lửa dùng mẫu màu trên đèn.');
  const concentrated = ['cu_hno3_conc', 'cu_conc_h2so4', 'kcl_conc_h2so4', 'water_into_h2so4', 'h2so4_dilution'].includes(program.id);
  const extent = concentrated ? 0.01 : 0.001;
  const contents: SubstanceContent[] = [];
  for (const species of program.chemistry.species.filter(item => item.role !== 'product')) {
    if (program.chemistry.representation === 'indicator' && ['In_basic', 'HIn_acidic', 'In_blue'].includes(species.formula)) continue;
    const indicator = ['Phenolphthalein', 'Methyl_Orange', 'Bromothymol_Blue'].includes(species.formula);
    const moles = indicator ? 1e-7 : species.role === 'reactant' || program.chemistry.representation === 'indicator' ? species.coeff * extent : 1e-5;
    if (!Number.isFinite(moles) || moles <= 0) throw new Error('Lượng mẫu không hợp lệ.');
    let formula = species.formula;
    if (concentrated && ['HNO3', 'H2SO4'].some(acid => sameMolecularFormula(acid, formula))) formula += ' (conc)';
    else if (['cu_hno3_dil', 'cu_hno3_dilute', 'zn_h2so4_dilute'].includes(program.id)
      && ['HNO3', 'H2SO4'].some(acid => sameMolecularFormula(acid, formula))) formula += ' (dil)';
    contents.push({ formula, phase: species.phase, moles, initialMoles: moles,
      mass_g: moles * molarMass(species.formula, species.molarMass_g_mol) });
  }
  const catalyst = program.chemistry.conditions?.catalyst;
  if (catalyst && !contents.some(item => sameMolecularFormula(item.formula, catalyst))) {
    contents.push({ formula: catalyst, phase: 's', moles: 1e-5, mass_g: 1e-5 * molarMass(catalyst) });
  }
  const addWater = (mass_g: number) => {
    if (mass_g <= 0) return;
    const existing = contents.find(item => sameMolecularFormula(item.formula, 'H2O') && item.phase === 'l');
    if (existing) { existing.mass_g += mass_g; existing.moles += mass_g / molarMass('H2O'); existing.initialMoles = existing.moles; }
    else contents.push({ formula: 'H2O', phase: 'l', mass_g, moles: mass_g / molarMass('H2O') });
  };
  if (concentrated) for (const acid of contents.filter(item => item.formula.includes('(conc)'))) {
    const fraction = sameMolecularFormula(acid.formula, 'HNO3') ? 0.68 : 0.98;
    addWater(acid.mass_g * (1 / fraction - 1));
  }
  else if (contents.some(item => item.phase === 'aq') || program.id.endsWith('_dissolution')) {
    const fluidMass = contents.filter(item => item.phase === 'l' || item.phase === 'aq').reduce((sum, item) => sum + item.mass_g, 0);
    if (fluidMass >= 30) throw new Error('Mẫu vượt ngân sách dung môi của ví dụ.');
    addWater(30 - fluidMass);
  }
  const liquid = contents.filter(item => item.phase === 'l' || item.phase === 'aq');
  const fluidMass = liquid.reduce((sum, item) => sum + item.mass_g, 0);
  const density = concentrated ? contents.some(item => sameMolecularFormula(item.formula, 'HNO3')) ? 1.41 : 1.84 : 1;
  const volume_ml = fluidMass / density;
  if (volume_ml > shell.capacity_ml) throw new Error('Dụng cụ không đủ sức chứa mẫu.');
  for (const item of contents) if (item.phase === 'aq') item.concentration_M = item.moles / (volume_ml / 1000);
  const equilibrium = cachedAqueousEquilibrium(contents, volume_ml);
  return { ...shell, studioProgramId: program.id, contents,
    substances: [...new Set(contents.map(item => item.formula))], mass_g: contents.reduce((sum, item) => sum + item.mass_g, 0),
    volume_ml, volume: volume_ml / shell.capacity_ml, density_g_ml: volume_ml > 0 ? density : undefined,
    temperature_c: 25, ph: equilibrium?.ph ?? 7, phModel: equilibrium ? 'ideal_aqueous_25c' : undefined,
    liquidColor: program.chemistry.species.find(item => item.role !== 'product' && item.phase === 'aq' && item.colorHex)?.colorHex ?? '#f8fafc',
    hasGas: false, isBoiling: false, hasPrecipitate: false, precipitateAmount_g: 0, foam_ml: 0,
    isSealed: contents.some(item => item.phase === 'g') || program.chemistry.conditions?.sealed === true,
    escapedGas_g: {}, evaporated_ml: 0,
  };
}

export function planStudioProgram(program: ReactionProgram, vessel: VesselState, language: Language) {
  if (!vessel.contents.some(item => item.moles > 1e-12)) return { unmet: ['Mẫu đã hết lượng chất để phản ứng.'], kinetics: null };
  const assessment = assessProgramConditions(program, vessel.contents, { temperature_c: vessel.temperature_c,
    volume_ml: vessel.volume_ml, pH: vessel.ph, isHeated: vessel.temperature_c > 25 });
  if (!assessment.ready) return { unmet: assessment.unmet, kinetics: null };
  const end = applyProgramToLedger(program, vessel, 1);
  const kinetics: ActiveKineticsState = {
    vesselId: vessel.id, reactionId: program.id, progress: 0, duration: program.visual.duration_s || 5,
    startTime: Date.now(), reactionName: language === 'vi' ? program.explain.observation_vi : program.explain.observation_en,
    equation: program.chemistry.equation, initialLiquidColor: vessel.liquidColor ?? '#f8fafc',
    targetLiquidColor: end.liquidColor ?? vessel.liquidColor ?? '#f8fafc', hasGas: end.hasGas ?? false,
    gasColor: end.gasColor, hasPrecipitate: end.hasPrecipitate ?? false, precipitateColor: end.precipitateColor,
    precipitateSubstance: end.precipitateSubstance, precipitateMorphology: end.precipitateMorphology,
    targetTemp: end.temperature_c ?? vessel.temperature_c, dissolvingReactants: [],
    timeWarp: program.visual.timeWarp, program, initialVesselBaseline: vessel,
  };
  return { unmet: [], kinetics };
}
