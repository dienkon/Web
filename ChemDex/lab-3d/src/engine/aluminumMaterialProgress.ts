import type { MultiStepReactionResult } from './chemistryEngine';
import type { SubstanceContent, VesselState } from '../types/chemistry';
import { isAluminumReaction } from '../science/aluminumHydroxideEquilibrium';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { readComposition } from '../science/balance';
import { precipitateComponents, withLegacyPrecipitateOrigins } from '../science/precipitateInventory';
import { computeMolarMass } from './ledger';
import { applyLedgerWithThermalSinks } from './thermalLedger';
import { projectAqueousSolution } from './aqueousProjection';
import { getReactionVfxRecipe } from '../vfx/recipes/reactionVfx';
import type { ActiveKineticsState } from '../store/useAppStore';

interface MaterialSpecies { formula: string; coeff: number; phase: string }
/** Serializable finite native steps. Extents/enthalpies come from the actual
 * speciation-limited prediction, never from a VFX recipe's nominal mass. */
export interface AluminumMaterialStage {
  reactionId: string;
  extent_mol: number;
  deltaH_kJ_mol: number;
  weight_molAl: number;
  reactants: MaterialSpecies[];
  products: MaterialSpecies[];
}

export function aluminumMaterialStages(chemistry: MultiStepReactionResult): AluminumMaterialStage[] | null {
  if (!chemistry.reactionsOccurred.length || chemistry.reactionsOccurred.some(r => !isAluminumReaction(r.reactionId))) return null;
  return chemistry.reactionsOccurred.map(r => {
    // These reviewed native routes contain aqueous salts/base and solid
    // Al(OH)3 only. Do not generalize this phase mapping to other reactions.
    const reactants = Object.entries(r.match.stoichiometry).map(([formula, coeff]) => ({ formula, coeff,
      phase: sameMolecularFormula(formula, 'Al(OH)3') ? 's' : 'aq' }));
    return { reactionId: r.reactionId, extent_mol: r.xi, deltaH_kJ_mol: r.deltaH_kJ,
      weight_molAl: r.xi * reactants.reduce((s, c) => s + c.coeff * (readComposition(c.formula).atoms.Al ?? 0), 0),
      reactants, products: Object.entries(r.match.products).map(([formula, p]) => ({ formula, coeff: p.coeff, phase: p.state })) };
  });
}

/** Both metered samples and direct stock additions start from actual contact
 * inventory. The predicted endpoint is a plan, not already-created products. */
export function planAluminumMaterialReaction(vessel: VesselState, chemistry: MultiStepReactionResult) {
  const materialStages = aluminumMaterialStages(chemistry), result = chemistry.combinedMixResult;
  if (!materialStages || !result) return null;
  const reaction = chemistry.reactionsOccurred[0];
  const baseline = { ...vessel, contents: withLegacyPrecipitateOrigins(vessel) };
  const kinetics: ActiveKineticsState = {
    vesselId: vessel.id, reactionId: reaction.reactionId, startTime: Date.now(),
    duration: getReactionVfxRecipe(reaction.reactionId)?.duration ?? 5, progress: 0,
    reactionName: result.summary, equation: result.equation,
    initialLiquidColor: vessel.liquidColor ?? '#f8fafc', targetLiquidColor: chemistry.finalLiquidColor,
    hasGas: false, hasPrecipitate: chemistry.hasPrecipitate, precipitateColor: chemistry.precipitateColor,
    precipitateSubstance: chemistry.precipitateSubstance, precipitateMorphology: 'GEL',
    dissolvingReactants: [], targetTemp: chemistry.finalTemperature_c,
    materialStages, initialVesselBaseline: baseline,
  };
  return { vessel: { ...baseline, ...projectAqueousSolution(baseline) }, mixResult: result, kinetics };
}

/** Illustrative normalized first-order progression, NOT measured nucleation or
 * dissolution kinetics. Sequential time shares follow reacted mol Al, so tiny
 * numerical correction steps cannot occupy whole seconds of the animation. */
export function aluminumStageFractions(stages: readonly AluminumMaterialStage[], progress: number): number[] {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const total = stages.reduce((s, stage) => s + stage.weight_molAl, 0);
  let preceding = 0;
  return stages.map(stage => {
    const start = preceding; preceding += stage.weight_molAl;
    const local = stage.weight_molAl > 0 ? Math.max(0, Math.min(1, (p * total - start) / stage.weight_molAl)) : 0;
    return p === 1 ? 1 : local === 1 ? 1 : -Math.expm1(-4 * local) / -Math.expm1(-4);
  });
}

export function applyAluminumMaterialProgress(stages: readonly AluminumMaterialStage[], baseline: VesselState,
  current: VesselState, progress: number, elapsed_s = 0): Partial<VesselState> {
  const contents = withLegacyPrecipitateOrigins(baseline);
  const fractions = aluminumStageFractions(stages, progress);
  let heat_J = baseline.programHeatApplied_J ?? 0;
  const matching = (c: SubstanceContent, s: MaterialSpecies) => (!c.location || c.location === 'bulk')
    && sameMolecularFormula(c.formula, s.formula) && (c.phase ?? c.state ?? identifySpecies(c.formula).phase) === s.phase;
  for (const [index, stage] of stages.entries()) {
    let extent = stage.extent_mol * fractions[index];
    for (const s of stage.reactants) {
      const available = contents.filter(c => matching(c, s)).reduce((sum, c) => sum + c.moles, 0);
      extent = Math.min(extent, available / s.coeff);
    }
    if (!(extent > 0)) continue;
    for (const s of stage.reactants) {
      let needed = extent * s.coeff;
      for (const c of contents) {
        if (!matching(c, s) || !(c.moles > 0) || !(needed > 0)) continue;
        const removed = Math.min(needed, c.moles), keep = (c.moles - removed) / c.moles;
        c.moles *= keep; c.mass_g *= keep; needed = Math.max(0, needed - removed);
      }
    }
    for (const s of stage.products) {
      const amount = extent * s.coeff;
      const existing = contents.find(c => matching(c, s) && (s.phase !== 's' || c.solidOrigin === 'precipitate'));
      if (existing) { existing.moles += amount; existing.mass_g += amount * computeMolarMass(s.formula); }
      else contents.push({ formula: s.formula, phase: s.phase, moles: amount, mass_g: amount * computeMolarMass(s.formula),
        ...(s.phase === 's' ? { solidOrigin: 'precipitate', precipitateFormation: 'GEL' } : {}) });
    }
    heat_J -= extent * stage.deltaH_kJ_mol * 1000;
  }
  const components = precipitateComponents(contents, baseline.hasPrecipitate ? baseline.precipitateSubstance : undefined);
  const precipitateAmount_g = components.reduce((s, c) => s + c.mass_g, 0);
  const hasPrecipitate = precipitateAmount_g > 1e-12;
  return applyLedgerWithThermalSinks({ contents, mass_g: contents.reduce((s, c) => s + c.mass_g, 0),
    substances: [...new Set(contents.filter(c => c.moles > 1e-12).map(c => c.formula))],
    programHeatApplied_J: heat_J, escapedGas_g: baseline.escapedGas_g, hasGas: false, liquidColor: '#f8fafc',
    hasPrecipitate, precipitateAmount_g, precipitateSubstance: components[0]?.formula,
    precipitateColor: hasPrecipitate ? '#ffffff' : undefined, precipitateMorphology: hasPrecipitate ? 'GEL' : undefined,
    // Optical intensity comes from the physical suspension, not elapsed time.
    turbidity: 0 }, baseline, current, elapsed_s);
}
