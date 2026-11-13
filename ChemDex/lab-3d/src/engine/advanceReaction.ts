import type { ActiveKineticsState } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { assessProgramConditions } from '../science/conditions';
import { advanceMetalAcidProgress } from './metalAcidPlan';
import { advanceHeatActivatedProgress } from './heatActivatedProgress';
import { advanceCatalyticProgress } from './contactKinetics';

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
  const limited = kinetics.program?.chemistry.kinetics.model === 'heat_activated'
    || kinetics.program?.chemistry.species.some(s => s.role === 'reactant' && s.phase === 'g');
  const candidate = !assessment.ready ? previous : kinetics.rateModel === 'metal_hcl'
    ? advanceMetalAcidProgress(kinetics, vessel, dt, stirring)
    : limited ? advanceHeatActivatedProgress(kinetics, vessel, dt) : advanceCatalyticProgress(kinetics, vessel, dt);
  const progress = candidate >= 1 - 1e-12 ? 1 : candidate;
  kinetics.actualProgressRate_s = Math.max(0, progress - previous) / dt;
  return progress;
}
