import { sampleMeasurement } from '../science/sampleMeasurement';
import { indicatorKey } from '../science/aqueousEquilibrium';
import { sameMolecularFormula } from '../science/speciesIdentity';
import type { BuretteState, VesselState } from '../types/chemistry';
import type { ExperimentDifficultyMode, StepValidationResult } from './experimentEngine';

export const ACID_BASE_TITRATION = {
  id: 'acid_base_titration',
  vesselId: 'flask_1',
  flaskCapacity_ml: 100,
  acidFormula: 'HCl (dil)',
  acidVolume_ml: 20,
  acidConcentration_M: 0.1,
  reagentFormula: 'NaOH',
  concentration_M: 0.1,
  indicator: 'Phenolphthalein',
  indicatorDose_ml: 0.1,
} as const;

const { acidVolume_ml, acidConcentration_M, concentration_M, reagentFormula, vesselId } = ACID_BASE_TITRATION;
export const ACID_BASE_EQUIVALENCE_ML = acidVolume_ml * acidConcentration_M / concentration_M;

export interface AcidBaseTitrationReceipt {
  sampleRevision: number;
  delivered_ml: number;
  otherTitrant_ml: number;
}

export function preparedAcidBaseSample(vessel: VesselState | undefined): AcidBaseTitrationReceipt | undefined {
  if (vessel?.id !== vesselId || vessel.isShattered || !(vessel.volume_ml > 0)) return;
  const receipt = vessel.acidBaseTitration;
  if (receipt?.sampleRevision === (vessel.effectSampleRevision ?? 0)) return receipt;
}

export function recordAcidBaseDelivery(vessel: VesselState, burette: BuretteState, volume_ml: number): AcidBaseTitrationReceipt | undefined {
  const receipt = preparedAcidBaseSample(vessel);
  if (!receipt) return vessel.acidBaseTitration;
  const matches = sameMolecularFormula(burette.reagentFormula, reagentFormula)
    && Math.abs(burette.concentration_M - concentration_M) < 1e-9;
  return matches ? { ...receipt, delivered_ml: receipt.delivered_ml + volume_ml }
    : { ...receipt, otherTitrant_ml: receipt.otherTitrant_ml + volume_ml };
}

export function assessAcidBaseTitration(vessel: VesselState | undefined, mode: ExperimentDifficultyMode) {
  const receipt = preparedAcidBaseSample(vessel);
  const hasIndicator = !!receipt && !!vessel?.contents.some(row =>
    row.moles > 0 && row.phase === 'aq' && indicatorKey(row.formula) === 'phenolphthalein');
  const delivered = receipt?.delivered_ml ?? 0;
  const wrongTitrant = (receipt?.otherTitrant_ml ?? 0) > 0;
  const target = ACID_BASE_EQUIVALENCE_ML;
  const tolerance = mode === 'guided' ? 0.5 : mode === 'standard' ? 0.25 : 0.1;
  const error = Math.abs(delivered - target);
  const within = !!receipt && !wrongTitrant && error <= tolerance + 1e-9;
  const steps: StepValidationResult[] = [
    {
      isValid: !!receipt, progress: receipt ? 1 : 0,
      message_en: receipt ? 'The HCl sample is ready.' : 'Set up the workbench to prepare the HCl sample.',
      message_vi: receipt ? 'Mẫu HCl đã sẵn sàng.' : 'Bày bàn thí nghiệm để chuẩn bị mẫu HCl.',
    },
    {
      isValid: hasIndicator, progress: hasIndicator ? 1 : 0,
      message_en: hasIndicator ? 'Indicator is present in the flask.' : 'Add phenolphthalein to the prepared flask.',
      message_vi: hasIndicator ? 'Bình đã có chỉ thị.' : 'Thêm phenolphthalein vào bình đã chuẩn bị.',
    },
    {
      isValid: within, progress: Math.min(1, delivered / target),
      currentValue: Number(delivered.toFixed(3)), targetValue: target, toleranceError: Number(error.toFixed(3)),
      isWithinTolerance: within,
      message_en: wrongTitrant ? 'A different titrant entered the flask. Undo that delivery or prepare a new sample.'
        : 'Only NaOH 0.10 M received from the burette counts toward this step.',
      message_vi: wrongTitrant ? 'Bình đã nhận dung dịch chuẩn khác. Hãy hoàn tác lần nhả đó hoặc bày mẫu mới.'
        : 'Bước này tính thể tích NaOH 0,10 M thực sự đi từ buret vào bình.',
    },
  ];
  return {
    steps, tolerance,
    metrics: {
      titrationDelivered_ml: Number(delivered.toFixed(6)),
      titrationTarget_ml: target,
      titrationError_ml: Number(error.toFixed(6)),
      titrationOtherTitrant_ml: Number((receipt?.otherTitrant_ml ?? 0).toFixed(6)),
    },
  };
}

export function acidBaseReportedPh(vessel: VesselState | undefined): number | undefined {
  return preparedAcidBaseSample(vessel) ? sampleMeasurement(vessel).ph ?? undefined : undefined;
}
