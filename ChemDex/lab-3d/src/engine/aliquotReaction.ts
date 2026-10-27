import type { VesselState } from '../types/chemistry';
import type { ActiveKineticsState, Language } from '../store/useAppStore';
import { executeMultiStepReactions } from './chemistryEngine';
import { getReactionVfxRecipe } from '../vfx/recipes/reactionVfx';
import { planSodiumWater } from './sodiumWaterPlan';
import { planMetalAcid } from './metalAcidPlan';
import { planVerifiedContact } from './verifiedContactPlan';
import { withLegacyPrecipitateOrigins } from '../science/precipitateInventory';
import { planAluminumMaterialReaction } from './aluminumMaterialProgress';

/** One chemistry path for already-metered liquid samples. Reagent molarity is
 * taken from the sample ledger, never reconstructed from a stock bottle. */
export function reactAliquotMixture(vessel: VesselState, language: Language, isHeated: boolean) {
  const sodium = planSodiumWater(vessel, language);
  if (sodium) return sodium;
  const metalAcid = planMetalAcid(vessel, language);
  if (metalAcid) return metalAcid;
  const chemistry = executeMultiStepReactions(withLegacyPrecipitateOrigins(vessel), vessel.substances,
    vessel.volume_ml, vessel.temperature_c, isHeated, language, { preserveQuantities: true });
  const reaction = chemistry.reactionsOccurred[0];
  if (!reaction) {
    const verified = planVerifiedContact(vessel, language, isHeated);
    if (verified) return verified;
  }
  if (!reaction || !chemistry.combinedMixResult) return {
    vessel: { ...vessel, phModel: chemistry.phModel, phReferenceTemperature_c: chemistry.phReferenceTemperature_c,
      ...(chemistry.phModel ? { ph: chemistry.finalPh, phModel: chemistry.phModel,
      liquidColor: chemistry.finalLiquidColor } : {}) },
    mixResult: null, kinetics: null as ActiveKineticsState | null,
  };
  const aluminum = planAluminumMaterialReaction(vessel, chemistry);
  if (aluminum) return aluminum;
  const recipe = getReactionVfxRecipe(reaction.reactionId);
  const kinetics: ActiveKineticsState = {
    vesselId: vessel.id, reactionId: reaction.reactionId, startTime: Date.now(),
    duration: recipe?.duration ?? 5, progress: 0, reactionName: reaction.summary, equation: reaction.equation,
    initialLiquidColor: vessel.liquidColor ?? '#f8fafc', targetLiquidColor: chemistry.finalLiquidColor,
    hasGas: chemistry.hasGas, gasColor: chemistry.gasColor, hasPrecipitate: chemistry.hasPrecipitate,
    precipitateColor: chemistry.precipitateColor, precipitateSubstance: chemistry.precipitateSubstance,
    dissolvingReactants: [], targetTemp: chemistry.finalTemperature_c,
  };
  return { vessel: { ...vessel, contents: chemistry.updatedContents,
    volume_ml: chemistry.finalVolume_ml, volume: vessel.capacity_ml > 0 ? chemistry.finalVolume_ml / vessel.capacity_ml : 0,
    substances: chemistry.updatedSubstances, ph: chemistry.finalPh, phModel: chemistry.phModel,
    phReferenceTemperature_c: chemistry.phReferenceTemperature_c,
    liquidColor: chemistry.finalLiquidColor, temperature_c: chemistry.finalTemperature_c,
    hasGas: chemistry.hasGas, gasColor: chemistry.gasColor, hasPrecipitate: chemistry.hasPrecipitate,
    precipitateColor: chemistry.precipitateColor, precipitateSubstance: chemistry.precipitateSubstance,
    precipitateAmount_g: chemistry.precipitateAmount_g, isBoiling: chemistry.isBoiling, isExplosion: chemistry.isExplosion },
    mixResult: chemistry.combinedMixResult, kinetics };
}
