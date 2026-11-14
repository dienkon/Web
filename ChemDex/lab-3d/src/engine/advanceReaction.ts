import type { ActiveKineticsState } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { assessProgramConditions } from '../science/conditions';
import { advanceMetalAcidProgress } from './metalAcidPlan';
import { advanceHeatActivatedProgress } from './heatActivatedProgress';
import { advanceCatalyticProgress } from './contactKinetics';
import { stepLandoltLedger } from './landoltClockLedger';
import { landoltCapacity, landoltInventory } from '../science/landoltClock';
import { reactionStockContactFraction, stockLiquidContactFraction } from '../physical/stockLiquidContact';
import { aluminumStageFractions } from './aluminumMaterialProgress';

/** Shared eligibility and material clock for manual and automatic operation. */
export function advanceReaction(kinetics: ActiveKineticsState, vessel: VesselState, dt: number,
  stirring = false, isHeated = false, light = false): number {
  const previous = kinetics.progress;
  if (!Number.isFinite(dt) || dt <= 0) return previous;
  const assessment = kinetics.program ? assessProgramConditions(kinetics.program, vessel.contents, {
    temperature_c: vessel.temperature_c, pH: vessel.ph, volume_ml: vessel.volume_ml,
    isSealed: vessel.isSealed ?? false, requireInventory: true, isHeated, light,
    ignitedProgramId: kinetics.initialVesselBaseline?.ignitedProgramId,
  }) : { ready: true, unmet: [] };
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
  const progress = candidate >= 1 - 1e-12 ? 1 : candidate;
  kinetics.actualProgressRate_s = Math.max(0, progress - previous) / dt;
  return progress;
}
