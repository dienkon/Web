import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState, Language } from '../store/useAppStore';
import type { MixResult } from '../shared/schemas';
import { reactAliquotMixture } from './aliquotReaction';
import { resolveReactionProgram } from '../vfx/programs/resolver';
import { applyProgramToLedger } from './ledger';
import { baritePrecipitationExtent } from '../science/baritePrecipitation';
import { magnesiumHydroxideExtent } from '../science/magnesiumHydroxidePrecipitation';
import { silverHalideProgramExtent } from '../science/silverChloridePrecipitation';
import { copperHydroxideExtent } from '../science/copperHydroxidePrecipitation';
import { ferricHydroxideExtent, ferricHydroxideDissolutionExtent } from '../science/ferricHydroxidePrecipitation';
import { aluminumReactionExtent } from '../science/aluminumHydroxideEquilibrium';

/** Resolve an existing quantitative sample; adding or transferring matter is a
 * separate transaction. Callers must reject results for a changed vessel ref. */
export async function resolveMixture(vessel: VesselState, language: Language, isHeated: boolean) {
  const native = reactAliquotMixture(vessel, language, isHeated);
  if (native.kinetics || native.vessel.phModel) return native;
  const base = native.vessel;
  const { program, provenance } = await resolveReactionProgram(base.substances, base.contents, {
    temperature_c: base.temperature_c, isHeated, isSealed: base.isSealed, ignitedProgramId: base.ignitedProgramId,
    pressure_bar: (base.internalPressure_atm ?? 1) * 1.01325,
    pH: base.ph, volume_ml: base.volume_ml, lang: language,
  });
  // An unknown mixture remains a mixture, rather than an endless fake reaction.
  if (provenance === 'fallback') return native;
  const aluminumLimit = aluminumReactionExtent(program.id, base.contents, base.volume_ml, base.temperature_c);
  if (aluminumLimit !== undefined && !(aluminumLimit !== null && aluminumLimit > 1e-12)) return native;
  if (program.id === 'feoh3_hcl' && !((ferricHydroxideDissolutionExtent(base.contents, base.volume_ml, base.temperature_c) ?? 0) > 0)) return native;
  if (program.id === 'fecl3_naoh' && ferricHydroxideExtent(base.contents, base.volume_ml, base.temperature_c) === 0) return native;
  if (program.id === 'cuso4_naoh' && copperHydroxideExtent(base.contents, base.volume_ml, base.temperature_c) === 0) return native;
  if (silverHalideProgramExtent(program.id, base.contents, base.volume_ml, base.temperature_c) === 0) return native;
  if (program.id === 'mgcl2_naoh' && magnesiumHydroxideExtent(base.contents, base.volume_ml, base.temperature_c) === 0) return native;
  if (program.id === 'bacl2_na2so4' && baritePrecipitationExtent(base.contents, base.volume_ml, base.temperature_c) === 0) return native;
  const final = applyProgramToLedger(program, base, 1);
  const initial = applyProgramToLedger(program, base, 0);
  const kinetics: ActiveKineticsState = {
    vesselId: base.id, reactionId: program.id, startTime: Date.now(),
    duration: program.visual.duration_s ?? 5, progress: 0,
    reactionName: language === 'vi' ? program.explain.observation_vi : program.explain.observation_en,
    equation: program.chemistry.equation, initialLiquidColor: base.liquidColor ?? '#f8fafc',
    targetLiquidColor: final.liquidColor ?? base.liquidColor ?? '#f8fafc',
    hasGas: final.hasGas ?? false, gasColor: final.gasColor,
    hasPrecipitate: final.hasPrecipitate ?? false, precipitateColor: final.precipitateColor,
    precipitateSubstance: final.precipitateSubstance,
    precipitateMorphology: final.precipitateMorphology as ActiveKineticsState['precipitateMorphology'],
    dissolvingReactants: [], targetTemp: final.temperature_c ?? base.temperature_c,
    timeWarp: program.visual.timeWarp, program, initialVesselBaseline: base,
  };
  const mixResult: MixResult = { reaction_id: program.id,
    summary: kinetics.reactionName, equation: kinetics.equation,
    reactants: program.chemistry.species.filter(item => item.role === 'reactant').map(item => item.formula),
    products: program.chemistry.species.filter(item => item.role === 'product').map(item => item.formula),
    safety_notes: (language === 'vi' ? program.chemistry.warning_vi : program.chemistry.warning_en) ?? '',
    observable_changes: kinetics.reactionName, effects: [], confidence: program.confidence,
    is_dangerous: !!program.chemistry.hazards?.length,
    new_vessel_state: { liquid_color: initial.liquidColor, has_precipitate: initial.hasPrecipitate ?? false,
      precipitate_color: initial.precipitateColor, is_boiling: initial.isBoiling ?? false,
      has_gas: initial.hasGas ?? false, gas_color: initial.gasColor, is_explosion: initial.isExplosion ?? false,
      liquid_level: base.volume, temperature_c: base.temperature_c },
  };
  return { vessel: { ...base, ...initial } as VesselState, mixResult, kinetics };
}
