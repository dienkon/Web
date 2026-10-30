import type { ActiveKineticsState, Language } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { executeMultiStepReactions } from './chemistryEngine';
import { aluminumMaterialStages } from './aluminumMaterialProgress';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { withLegacyPrecipitateOrigins } from '../science/precipitateInventory';

export function continueReactionAfterOutflow(kinetics: ActiveKineticsState | undefined,
  remaining: VesselState, language: Language): ActiveKineticsState | null {
  if (!kinetics?.initialVesselBaseline || kinetics.progress >= 1 || remaining.isShattered
    || (!kinetics.program && !kinetics.materialStages)) return null;
  const baseline = { ...remaining, contents: withLegacyPrecipitateOrigins(remaining) };
  let materialStages = kinetics.materialStages;
  if (materialStages) {
    // Native sequential extents were limited by the old sample. Predict only
    // the remaining steps; do not commit their endpoint at withdrawal time.
    materialStages = aluminumMaterialStages(executeMultiStepReactions(baseline.contents, baseline.substances,
      baseline.volume_ml, baseline.temperature_c, baseline.temperature_c > 25, language, { preserveQuantities: true })) ?? undefined;
    if (!materialStages?.length) return null;
  } else if (kinetics.program!.chemistry.species.filter(s => s.role === 'reactant').some(s =>
    !baseline.contents.some(c => sameMolecularFormula(c.formula, s.formula) && (!c.phase || c.phase === s.phase)
      && (!c.location || c.location === 'bulk') && c.moles > 1e-12))) return null;
  const metal = kinetics.program?.chemistry.species.find(s => s.role === 'reactant' && s.phase === 's');
  const originalSolid = metal && kinetics.initialVesselBaseline.contents.find(c =>
    sameMolecularFormula(c.formula, metal.formula) && c.phase === 's');
  return { ...kinetics, materialStages, initialVesselBaseline: baseline,
    replayProgressBase: kinetics.progress, targetPrecipitateMass_g: undefined,
    surfaceReferenceMass_g: kinetics.surfaceReferenceMass_g ?? (originalSolid ? originalSolid.mass_g : undefined),
    surfaceReferenceMoles: kinetics.surfaceReferenceMoles ?? (originalSolid ? originalSolid.moles : undefined) };
}
