import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState, Language } from '../store/useAppStore';
import type { MixResult } from '../shared/schemas';
import { findHandcraftedProgram } from '../vfx/programs/resolver';
import { planStudioProgram } from './studioProgram';
import { copperAmmoniaInventory } from '../science/copperAmmoniaEquilibrium';
import { getProgramById } from '../vfx/programs/library';
import { COPPER_AMMONIA_EQUATION } from './copperAmmoniaLedger';
import { landoltCapacity, landoltInventory } from '../science/landoltClock';

/** A recognized pH model does not establish that precipitation or other
 * verified multireagent chemistry is absent. Native reactions keep priority;
 * this planner is used only when that solver found no irreversible step. */
export function planVerifiedContact(vessel: VesselState, language: Language, isHeated: boolean, conditionedOnly = false) {
  const copperAmmonia = copperAmmoniaInventory(vessel.contents, vessel.volume_ml);
  const landolt = landoltInventory(vessel.contents, vessel.volume_ml);
  const clock = landolt && (landoltCapacity(landolt) > 1e-12 || Math.min(landolt.iodine, landolt.sulfite) > 1e-12);
  const program = copperAmmonia ? getProgramById('cuso4_nh3') : clock ? getProgramById('iodine_clock') : findHandcraftedProgram(vessel.substances, vessel.contents, {
    temperature_c: vessel.temperature_c, isHeated, isSealed: vessel.isSealed,
    volume_ml: vessel.volume_ml, pH: vessel.ph, ignitedProgramId: vessel.ignitedProgramId,
  });
  if (!program || ['indicator', 'emission', 'dilution'].includes(program.chemistry.representation ?? '')
    || program.chemistry.species.filter(item => item.role === 'reactant').length < (conditionedOnly ? 1 : 2)
    || !program.chemistry.species.some(item => item.role === 'product')) return null;
  if (conditionedOnly && !copperAmmonia && !clock && program.chemistry.kinetics.model !== 'heat_activated'
    && !program.chemistry.species.some(item => item.role === 'catalyst')) return null;
  const baseline = { ...vessel, contents: vessel.contents.map(item => ({ ...item })) };
  const plan = planStudioProgram(program, baseline, language);
  if (!plan.kinetics) return null;
  const kinetics: ActiveKineticsState = plan.kinetics;
  if (copperAmmonia) kinetics.equation = COPPER_AMMONIA_EQUATION;
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

/** Heat/catalyst-driven chemistry must enter a progressive ledger before the
 * instantaneous native solver consumes all reagents at once. */
export function planConditionedContact(vessel: VesselState, language: Language, isHeated: boolean) {
  return planVerifiedContact(vessel, language, isHeated, true);
}
