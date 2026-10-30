import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState, Language } from '../store/useAppStore';
import { getProgramById } from '../vfx/programs/library';
import { planStudioProgram } from './studioProgram';
import { sodiumReactionDuration, sodiumWaterContact } from '../science/sodiumWater';
import type { MixResult } from '../shared/schemas';

/** One mole H2 for each two moles of limiting Na/H2O consumed. The current
 * sodium ledger advances linearly over its illustrative duration. */
export function sodiumWaterGasMolesPerSecond(kinetics: ActiveKineticsState): number {
  const baseline = kinetics.initialVesselBaseline;
  if (!baseline || !(kinetics.duration > 0) || kinetics.progress >= 1) return 0;
  const total = (formula: string, phase: string) => baseline.contents.filter(item => item.formula === formula
    && (item.phase ?? item.state ?? phase) === phase).reduce((sum, item) => sum + Math.max(0, item.moles), 0);
  return Math.min(total('Na', 's'), total('H2O', 'l')) / (2 * kinetics.duration);
}

/** Keep the original inventory until simulation time advances. Shared by direct
 * dispensing, liquid transfer, and the existing-mixture resolver. */
export function planSodiumWater(vessel: VesselState, language: Language) {
  if (!sodiumWaterContact(vessel)) return null;
  const program = getProgramById('na_h2o');
  if (!program) return null;
  const plan = planStudioProgram(program, vessel, language);
  if (!plan.kinetics) return null;
  const kinetics: ActiveKineticsState = { ...plan.kinetics, duration: sodiumReactionDuration(vessel) };
  const mixResult: MixResult = { reaction_id: program.id, summary: kinetics.reactionName, equation: kinetics.equation,
    reactants: ['Na', 'H2O'], products: ['NaOH', 'H2'], is_dangerous: true,
    safety_notes: language === 'vi' ? program.chemistry.warning_vi ?? '' : program.chemistry.warning_en ?? '',
    observable_changes: kinetics.reactionName, effects: [], confidence: 1,
    new_vessel_state: { has_gas: false, is_boiling: false, is_explosion: false, has_precipitate: false,
      liquid_level: vessel.volume_ml / vessel.capacity_ml, temperature_c: vessel.temperature_c,
      liquid_color: vessel.liquidColor } };
  return { vessel: { ...vessel, contents: vessel.contents.map(item => ({ ...item,
    initialMoles: item.initialMoles ?? item.moles, initialMass_g: item.initialMass_g ?? item.mass_g })),
    hasGas: false, isBoiling: false, isExplosion: false }, kinetics, mixResult };
}
