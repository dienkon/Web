import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState, Language } from '../store/useAppStore';
import type { MixResult } from '../shared/schemas';
import { findHandcraftedProgram } from '../vfx/programs/resolver';
import { planStudioProgram } from './studioProgram';

/** A recognized pH model does not establish that precipitation or other
 * verified multireagent chemistry is absent. Native reactions keep priority;
 * this planner is used only when that solver found no irreversible step. */
export function planVerifiedContact(vessel: VesselState, language: Language, isHeated: boolean) {
  const program = findHandcraftedProgram(vessel.substances, vessel.contents, {
    temperature_c: vessel.temperature_c, isHeated, isSealed: vessel.isSealed,
    volume_ml: vessel.volume_ml, pH: vessel.ph, ignitedProgramId: vessel.ignitedProgramId,
  });
  if (!program || ['indicator', 'emission', 'dilution'].includes(program.chemistry.representation ?? '')
    || program.chemistry.species.filter(item => item.role === 'reactant').length < 2
    || !program.chemistry.species.some(item => item.role === 'product')) return null;
  const baseline = { ...vessel, contents: vessel.contents.map(item => ({ ...item })) };
  const plan = planStudioProgram(program, baseline, language);
  if (!plan.kinetics) return null;
  const kinetics: ActiveKineticsState = plan.kinetics;
  const mixResult: MixResult = { reaction_id: program.id, summary: kinetics.reactionName, equation: kinetics.equation,
    reactants: program.chemistry.species.filter(item => item.role === 'reactant').map(item => item.formula),
    products: program.chemistry.species.filter(item => item.role === 'product').map(item => item.formula),
    safety_notes: (language === 'vi' ? program.chemistry.warning_vi : program.chemistry.warning_en) ?? '',
    observable_changes: kinetics.reactionName, effects: [], confidence: program.confidence,
    is_dangerous: !!program.chemistry.hazards?.length,
    new_vessel_state: { has_gas: false, is_boiling: vessel.isBoiling, is_explosion: false,
      has_precipitate: vessel.hasPrecipitate, liquid_level: vessel.volume,
      liquid_color: vessel.liquidColor, temperature_c: vessel.temperature_c } };
  return { vessel: { ...baseline, hasGas: false, isExplosion: false }, kinetics, mixResult };
}
