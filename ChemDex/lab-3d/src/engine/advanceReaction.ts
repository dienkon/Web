import type { ActiveKineticsState } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { assessProgramConditions, type ExperimentalEnvironment } from '../science/conditions';
import { advanceMetalAcidProgress } from './metalAcidPlan';
import { advanceHeatActivatedProgress } from './heatActivatedProgress';
import { advanceCatalyticProgress } from './contactKinetics';
import { stepLandoltLedger } from './landoltClockLedger';
import { landoltCapacity, landoltInventory } from '../science/landoltClock';
import { reactionStockContactFraction, stockLiquidContactFraction } from '../physical/stockLiquidContact';
import { aluminumStageFractions, aluminumStockProgressLimit } from './aluminumMaterialProgress';
import { programMaximumReactionMoles, programStockProgressLimit } from './ledger';
import { reactionReplayProgress } from './reactionProgress';
import { availableReagent, REAGENT_AMOUNT_THRESHOLD_MOL } from '../science/reagentAvailability';

/** Finish an already-running finite ledger when a required reagent's
 * remaining step is below the same threshold used for reagent discovery.
 * The caller still applies progress=1 through the ordinary conserved ledger;
 * no trace row is deleted, no material is fabricated and no deadline changes. */
function canFinishTraceRemainder(kinetics: ActiveKineticsState, vessel: VesselState, env: ExperimentalEnvironment) {
  const program = kinetics.program, baseline = kinetics.initialVesselBaseline;
  if (!program || !baseline || !(kinetics.progress > 0 && kinetics.progress < 1) || kinetics.materialStages
    || program.chemistry.representation || ['iodine_clock', 'cuso4_nh3'].includes(program.id)) return false;
  const extent = programMaximumReactionMoles(program, baseline);
  const remaining = extent * (1 - reactionReplayProgress(kinetics, kinetics.progress));
  if (!(remaining > 0) || !assessProgramConditions(program, vessel.contents, { ...env, reactantThreshold_mol: 0 }).ready
    || programStockProgressLimit(program, baseline, vessel) < 1) return false;
  let traceReagent = false;
  const canConsume = program.chemistry.species.filter(species => species.role === 'reactant').every(species => {
    const needed = remaining * species.coeff;
    const available = vessel.contents.filter(row => availableReagent(row, species.formula, species.phase, 0))
      .reduce((sum, row) => sum + row.moles, 0);
    const reference = baseline.contents.filter(row => availableReagent(row, species.formula, species.phase, 0))
      .reduce((sum, row) => sum + row.moles, 0);
    const arithmeticError = reference * Number.EPSILON * 32;
    if (needed <= REAGENT_AMOUNT_THRESHOLD_MOL && available <= REAGENT_AMOUNT_THRESHOLD_MOL) traceReagent = true;
    return available + arithmeticError >= needed;
  });
  return traceReagent && canConsume;
}

/** Shared eligibility and material clock for manual and automatic operation. */
export function advanceReaction(kinetics: ActiveKineticsState, vessel: VesselState, dt: number,
  stirring = false, isHeated = false, light = false): number {
  const previous = kinetics.progress;
  if (!Number.isFinite(dt) || dt <= 0) return previous;
  const environment: ExperimentalEnvironment = {
    temperature_c: vessel.temperature_c, pH: vessel.ph, volume_ml: vessel.volume_ml,
    isSealed: vessel.isSealed ?? false, requireInventory: true, isHeated, light,
    ignitedProgramId: kinetics.initialVesselBaseline?.ignitedProgramId,
    acidGradeReferenceContents: previous > 0 ? kinetics.initialVesselBaseline?.contents : undefined,
  };
  const assessment = kinetics.program ? assessProgramConditions(kinetics.program, vessel.contents, environment) : { ready: true, unmet: [] };
  kinetics.unmetConditions = assessment.unmet;
  const stageFractions = kinetics.materialStages ? aluminumStageFractions(kinetics.materialStages, previous) : [];
  const activeStage = kinetics.materialStages?.find((_, index) => stageFractions[index] < 1);
  const contactFraction = activeStage ? activeStage.reactants.filter(species => species.phase === 's')
    .reduce((fraction, species) => Math.min(fraction, stockLiquidContactFraction(vessel, species.formula)), 1)
    : reactionStockContactFraction(kinetics.program, vessel);
  if (!(contactFraction > 0)) {
    kinetics.unmetConditions = [...assessment.unmet, 'Chất rắn chưa tiếp xúc pha lỏng tham gia phản ứng.'];
    kinetics.actualProgressRate_s = 0; return previous;
  }
  if (!assessment.ready && canFinishTraceRemainder(kinetics, vessel, environment)) {
    kinetics.unmetConditions = [];
    kinetics.actualProgressRate_s = (1 - previous) / dt;
    return 1;
  }
  if (kinetics.program?.id === 'iodine_clock') {
    const step = assessment.ready ? stepLandoltLedger(vessel, dt) : null;
    if (!step) { kinetics.actualProgressRate_s = 0; return previous; }
    const baseline = kinetics.initialVesselBaseline;
    const reference = baseline ? landoltInventory(baseline.contents, baseline.volume_ml) : step.before;
    const capacity = reference ? landoltCapacity(reference) : 0;
    const progress = step.terminal ? 1 : capacity > 0
      ? Math.max(previous, Math.min(1 - 1e-9, 1 - landoltCapacity(step.after) / capacity)) : previous;
    kinetics.actualProgressRate_s = Math.max(0, progress - previous) / dt;
    return progress;
  }
  const limited = kinetics.program?.chemistry.kinetics.model === 'heat_activated'
    || kinetics.program?.chemistry.species.some(s => s.role === 'reactant' && s.phase === 'g');
  const candidate = !assessment.ready ? previous : kinetics.rateModel === 'metal_hcl'
    ? advanceMetalAcidProgress(kinetics, vessel, dt, stirring, contactFraction)
    : limited ? advanceHeatActivatedProgress(kinetics, vessel, dt, contactFraction) : advanceCatalyticProgress(kinetics, vessel, dt, contactFraction);
  const baseline = kinetics.initialVesselBaseline, replayBase = kinetics.replayProgressBase ?? 0;
  const materialLimit = baseline && kinetics.materialStages ? aluminumStockProgressLimit(kinetics.materialStages, baseline, vessel)
    : baseline && kinetics.program ? programStockProgressLimit(kinetics.program, baseline, vessel) : 1;
  const accepted = Math.max(previous, Math.min(candidate, replayBase + (1 - replayBase) * materialLimit));
  const progress = accepted >= 1 - 1e-12 ? 1 : accepted;
  kinetics.actualProgressRate_s = Math.max(0, progress - previous) / dt;
  return progress;
}
