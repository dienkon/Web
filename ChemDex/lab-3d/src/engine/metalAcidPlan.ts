import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState, Language } from '../store/useAppStore';
import type { MixResult } from '../shared/schemas';
import { getProgramById } from '../vfx/programs/library';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { planStudioProgram } from './studioProgram';

const PROGRAMS = ['mg_hcl', 'zn_hcl', 'fe_hcl'];

/** Bounded single-reaction mixtures only. Competing oxidants, other metals and
 * unknown additives stay with the multi-reaction resolver, rather than silently
 * receiving this non-oxidizing-acid model. */
export function planMetalAcid(vessel: VesselState, language: Language) {
  if (vessel.isShattered || !(vessel.volume_ml > 0)) return null;
  const acid = vessel.contents.find(item => sameMolecularFormula(item.formula, 'HCl')
    && item.phase === 'aq' && item.moles > 1e-12);
  if (!acid || identifySpecies(acid.formula).concentration === 'concentrated') return null;
  for (const id of PROGRAMS) {
    const program = getProgramById(id);
    if (!program) continue;
    const metal = program.chemistry.species.find(item => item.role === 'reactant' && item.phase === 's')!;
    if (!vessel.contents.some(item => sameMolecularFormula(item.formula, metal.formula)
      && item.phase === 's' && item.moles > 1e-12)) continue;
    const allowed = [...program.chemistry.species.map(item => item.formula), 'H2O', 'NaCl', 'KCl',
      'Phenolphthalein', 'Methyl_Orange', 'Bromothymol_Blue'];
    if (vessel.contents.some(item => item.moles > 1e-12
      && !allowed.some(formula => sameMolecularFormula(item.formula, formula)))) continue;
    const baseline = { ...vessel, contents: vessel.contents.map(item => ({ ...item,
      initialMass_g: item.initialMass_g ?? item.mass_g, initialMoles: item.initialMoles ?? item.moles })) };
    const plan = planStudioProgram(program, baseline, language);
    if (!plan.kinetics) continue;
    const kinetics: ActiveKineticsState = { ...plan.kinetics, rateModel: 'metal_hcl',
      reactionName: plan.kinetics.reactionName + (language === 'vi'
        ? ' Tốc độ mô phỏng minh họa, chưa hiệu chuẩn thời gian thực nghiệm.'
        : ' Illustrative rate; experimental timing is not calibrated.') };
    const mixResult: MixResult = { reaction_id: id, summary: kinetics.reactionName, equation: kinetics.equation,
      reactants: [metal.formula, 'HCl'], products: program.chemistry.species.filter(item => item.role === 'product').map(item => item.formula),
      is_dangerous: true, safety_notes: (language === 'vi' ? program.chemistry.warning_vi : program.chemistry.warning_en) ?? '', observable_changes: kinetics.reactionName,
      effects: [], confidence: 1, new_vessel_state: { has_gas: false, is_boiling: false, is_explosion: false,
        has_precipitate: vessel.hasPrecipitate, liquid_color: vessel.liquidColor, temperature_c: vessel.temperature_c,
        liquid_level: vessel.volume_ml / vessel.capacity_ml } };
    return { vessel: { ...baseline, hasGas: false, isExplosion: false }, kinetics, mixResult };
  }
  return null;
}

export function metalAcidMaximumExtent(kinetics: ActiveKineticsState): number {
  const metal = kinetics.program?.chemistry.species.find(item => item.role === 'reactant' && item.phase === 's');
  const contents = kinetics.initialVesselBaseline?.contents;
  if (!metal || !contents) return 0;
  const solid = contents.find(item => sameMolecularFormula(item.formula, metal.formula) && item.phase === 's');
  const acid = contents.find(item => sameMolecularFormula(item.formula, 'HCl') && item.phase === 'aq');
  return Math.max(0, Math.min(solid?.moles ?? 0, (acid?.moles ?? 0) / 2));
}

/** Qualitative surface model, NOT a fitted kinetic law. The existing program
 * duration sets an illustrative reference at 25 C, 1 M HCl and 0.1 g metal.
 * Smaller granules expose more area per mass; ribbon has approximately constant
 * broad-face area. Q10=2 and grinding/stirring multipliers are explicit teaching
 * assumptions, not measured parameters for Mg/Zn/Fe.
 * Sources for trends, not constants:
 * https://static.nsta.org/extras/adi-chem/Lab21StudentHandout-ReactionRates.pdf
 * https://openstax.org/books/chemistry-2e/pages/12-2-factors-affecting-reaction-rates
 */
export function metalAcidProgressRate(kinetics: ActiveKineticsState, current: VesselState,
  stirred = false, progress = kinetics.progress): number {
  if (kinetics.rateModel !== 'metal_hcl' || !kinetics.program || !kinetics.initialVesselBaseline
    || !(kinetics.duration > 0) || !(current.volume_ml > 0) || !Number.isFinite(current.temperature_c)
    || !Number.isFinite(progress) || current.isShattered || progress >= 1) return 0;
  const metal = kinetics.program.chemistry.species.find(item => item.role === 'reactant' && item.phase === 's')!;
  const baseline = kinetics.initialVesselBaseline;
  const solid = baseline.contents.find(item => sameMolecularFormula(item.formula, metal.formula) && item.phase === 's');
  const acid = baseline.contents.find(item => sameMolecularFormula(item.formula, 'HCl') && item.phase === 'aq');
  if (!solid || !acid || !(solid.moles > 0)) return 0;
  const extent = Math.min(solid.moles, acid.moles / 2);
  if (!(extent > 0)) return 0;
  const p = Math.max(0, Math.min(1, progress));
  const remainingFraction = Math.max(0, 1 - extent * p / solid.moles);
  const acidConcentration = Math.max(0, acid.moles - 2 * extent * p) / (current.volume_ml / 1000);
  const massFactor = Math.cbrt(0.1 / Math.max(1e-12, solid.mass_g));
  const areaFactor = metal.formula === 'Mg' ? (remainingFraction > 0 ? 1 : 0) : remainingFraction ** (2 / 3);
  const temperatureFactor = Math.max(0.05, Math.min(16, 2 ** ((current.temperature_c - 25) / 10)));
  const grinding = current.isPulverized ? 5 : 1;
  const stirring = stirred ? 1 + (kinetics.program.chemistry.kinetics?.stirSensitivity ?? 0.5) : 1;
  return solid.moles / extent / kinetics.duration * massFactor * areaFactor
    * acidConcentration * temperatureFactor * grinding * stirring;
}

/** Integrate extent rather than a visual clock; the ledger enforces the exact
 * limiting yield. Completion snaps only the final 1e-8 fraction of that yield. */
export function advanceMetalAcidProgress(kinetics: ActiveKineticsState, current: VesselState,
  dt: number, stirred = false): number {
  let p = Number.isFinite(kinetics.progress) ? Math.max(0, Math.min(1, kinetics.progress)) : 0;
  if (!Number.isFinite(dt) || dt <= 0) return p;
  const steps = Math.min(200, Math.max(1, Math.ceil(dt / 0.025))), h = dt / steps;
  const rate = (value: number) => metalAcidProgressRate(kinetics, current, stirred, value);
  for (let i = 0; i < steps && p < 1; i++) {
    const a = rate(p), b = rate(p + h * a / 2), c = rate(p + h * b / 2), d = rate(p + h * c);
    p = Math.min(1, p + h * (a + 2 * b + 2 * c + d) / 6);
  }
  return 1 - p < 1e-8 ? 1 : p;
}
