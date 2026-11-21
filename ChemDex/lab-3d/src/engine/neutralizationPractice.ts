import type { LiquidAliquot } from '../handling/aliquot';
import { neutralPhAtTemperature } from '../science/aqueousTemperature';
import { sampleMeasurement } from '../science/sampleMeasurement';
import { sameMolecularFormula } from '../science/speciesIdentity';
import type { SubstanceContent, VesselState } from '../types/chemistry';
import type { ExperimentDifficultyMode, StepValidationResult } from './experimentEngine';
import { projectAqueousSolution } from './aqueousProjection';

export const NEUTRALIZATION_PRACTICE = {
  id: 'exothermic_neutralization',
  sourceId: 'beaker_2',
  receiverId: 'beaker_1',
  volume_ml: 40,
  concentration_M: 2,
} as const;

export type PracticeProbe = 'thermometer' | 'ph_meter';
export interface PracticeProbeReading {
  tool: PracticeProbe;
  attemptId: string;
  epoch: number;
  value: number;
  point: [number, number, number];
  settled: boolean;
}

export interface NeutralizationPracticeReceipt {
  attemptId: string;
  sampleRevision: number;
  received_ml: number;
  initialTemperature_c?: number;
  peakTemperature_c?: number;
  endpoint?: { ph: number; neutralPh: number; temperature_c: number };
}

const { sourceId, receiverId, volume_ml, concentration_M } = NEUTRALIZATION_PRACTICE;
const preparedMoles = volume_ml * concentration_M / 1000;

function receiptFor(vessel: VesselState | undefined, id: string) {
  if (vessel?.id !== id || vessel.isShattered) return;
  const receipt = vessel.neutralizationPractice;
  if (receipt?.sampleRevision === (vessel.effectSampleRevision ?? 0)) return receipt;
}

export const neutralizationSourceAttempt = (vessel: VesselState | undefined) => receiptFor(vessel, sourceId)?.attemptId;
export const neutralizationProbeAttempt = (vessel: VesselState | undefined) => receiptFor(vessel, receiverId)?.attemptId;

function solutionMoles(contents: readonly SubstanceContent[], formula: string): number {
  let total = 0;
  for (const row of contents) {
    if (!Number.isFinite(row.moles) || row.moles < 0) return 0;
    if (row.moles <= 0 || sameMolecularFormula(row.formula, 'H2O')) continue;
    if (row.phase !== 'aq' || !sameMolecularFormula(row.formula, formula) || (row.location && row.location !== 'bulk')) return 0;
    total += row.moles;
  }
  return total;
}

export function recordNeutralizationDelivery(vessel: VesselState, sourceAttempt: string | undefined, sample: LiquidAliquot, retained_ml: number) {
  const receipt = receiptFor(vessel, receiverId);
  if (!sourceAttempt || receipt?.attemptId !== sourceAttempt || !(retained_ml > 0) || !(sample.volume_ml > 0)
    || Math.abs(solutionMoles(sample.contents, 'NaOH') * 1000 / sample.volume_ml - concentration_M) > 0.02) return vessel;
  return { ...vessel, neutralizationPractice: {
    ...receipt,
    received_ml: receipt.received_ml + Math.min(retained_ml, sample.volume_ml),
    peakTemperature_c: Math.max(receipt.peakTemperature_c ?? vessel.temperature_c, vessel.temperature_c),
    endpoint: undefined,
  } };
}

function inventoryMatches(vessel: VesselState, received_ml: number) {
  let acid = 0, base = 0, salt = 0;
  for (const row of vessel.contents) {
    if (row.moles <= 0 || sameMolecularFormula(row.formula, 'H2O')) continue;
    if (row.phase !== 'aq' || (row.location && row.location !== 'bulk')) return false;
    if (sameMolecularFormula(row.formula, 'HCl')) acid += row.moles;
    else if (sameMolecularFormula(row.formula, 'NaOH')) base += row.moles;
    else if (sameMolecularFormula(row.formula, 'NaCl')) salt += row.moles;
    else return false;
  }
  const expectedBase = received_ml * concentration_M / 1000;
  const tolerance = preparedMoles * 0.02;
  return Math.abs(salt + acid - preparedMoles) <= tolerance && Math.abs(salt + base - expectedBase) <= tolerance
    && salt >= Math.min(expectedBase, preparedMoles) * 0.95;
}

function volumeTolerance(mode: ExperimentDifficultyMode) {
  return mode === 'guided' ? 1 : mode === 'standard' ? 0.5 : 0.25;
}

function verifiedPour(vessel: VesselState | undefined, receipt: NeutralizationPracticeReceipt | undefined, mode: ExperimentDifficultyMode) {
  return !!vessel && !!receipt && Math.abs(receipt.received_ml - volume_ml) <= volumeTolerance(mode) + 1e-9
    && inventoryMatches(vessel, receipt.received_ml)
    && receipt.initialTemperature_c !== undefined && receipt.peakTemperature_c !== undefined
    && receipt.peakTemperature_c > receipt.initialTemperature_c;
}

export function captureNeutralizationProbe(vessel: VesselState | undefined, reading: PracticeProbeReading, mode: ExperimentDifficultyMode) {
  const receipt = receiptFor(vessel, receiverId);
  if (!vessel || !receipt || receipt.attemptId !== reading.attemptId || !reading.settled || !Number.isFinite(reading.value)) return;
  const sample = sampleMeasurement(vessel);
  const point = reading.tool === 'thermometer' ? sample.thermometerPoint : sample.phPoint;
  if (!point || !reading.point.every(Number.isFinite)
    || Math.hypot(...point.map((position, axis) => position - reading.point[axis])) > 0.01) return;
  if (reading.tool === 'thermometer') {
    if (!sample.thermometerPoint || sample.temperature_c === null || Math.abs(reading.value - sample.temperature_c) > 0.15
      || receipt.received_ml > 0 || Math.abs(vessel.volume_ml - volume_ml) > volumeTolerance(mode)
      || Math.abs(solutionMoles(vessel.contents, 'HCl') - preparedMoles) > preparedMoles * 0.01) return;
    return { ...receipt, initialTemperature_c: reading.value };
  }
  if (!verifiedPour(vessel, receipt, mode) || sample.ph === null || sample.referenceTemperature_c === null
    || Math.abs(sample.ph - reading.value) > 0.05) return;
  const neutral = neutralPhAtTemperature(sample.referenceTemperature_c);
  if (neutral === null) return;
  return { ...receipt, endpoint: { ph: reading.value, neutralPh: neutral, temperature_c: sample.referenceTemperature_c } };
}

export function assessNeutralizationPractice(vessels: Record<string, VesselState>, mode: ExperimentDifficultyMode) {
  const receiver = vessels[receiverId];
  const receipt = receiptFor(receiver, receiverId);
  const initial = receipt?.initialTemperature_c;
  const peak = receipt?.peakTemperature_c;
  const delivered = receipt?.received_ml ?? 0;
  const endpoint = receipt?.endpoint;
  const tolerance = volumeTolerance(mode);
  const poured = verifiedPour(receiver, receipt, mode);
  const phError = endpoint && Math.abs(endpoint.ph - endpoint.neutralPh);
  const phTolerance = mode === 'guided' ? 0.4 : mode === 'standard' ? 0.3 : 0.2;
  const current = receiver && poured && endpoint ? { ...receiver, ...projectAqueousSolution(receiver) } : null;
  const currentNeutralPh = current?.phModel ? neutralPhAtTemperature(current.phReferenceTemperature_c ?? current.temperature_c) : null;
  const neutral = poured && phError !== undefined && phError <= phTolerance && currentNeutralPh !== null
    && Math.abs(current!.ph - currentNeutralPh) <= phTolerance;
  const steps: StepValidationResult[] = [
    { isValid: initial !== undefined, progress: initial === undefined ? 0 : 1,
      message_en: initial === undefined ? 'Record the immersed thermometer before pouring.' : `Initial probe reading ${initial.toFixed(2)} °C.`,
      message_vi: initial === undefined ? 'Ghi số đo từ nhiệt kế đã ngập trước khi rót.' : `Nhiệt độ ban đầu từ đầu dò ${initial.toFixed(2)} °C.` },
    { isValid: poured, progress: Math.min(1, delivered / volume_ml), currentValue: Number(delivered.toFixed(3)),
      targetValue: volume_ml, toleranceError: Number(Math.abs(delivered - volume_ml).toFixed(3)), isWithinTolerance: poured,
      message_en: 'The assay checks the received NaOH, the neutralization products, and the temperature rise.',
      message_vi: 'Bước rót kiểm tra NaOH nhận được, sản phẩm trung hòa và độ tăng nhiệt.' },
    { isValid: neutral, progress: neutral ? 1 : 0,
      message_en: endpoint ? `Recorded pH ${endpoint.ph.toFixed(2)}. Neutral pH at ${endpoint.temperature_c.toFixed(1)} °C is ${endpoint.neutralPh.toFixed(2)}.`
        : 'Record an immersed pH reading after pouring.',
      message_vi: endpoint ? `pH đo được ${endpoint.ph.toFixed(2)}. Ở ${endpoint.temperature_c.toFixed(1)} °C, pH trung tính là ${endpoint.neutralPh.toFixed(2)}.`
        : 'Ghi pH từ đầu dò đã ngập trong dung dịch sau khi rót.' },
  ];
  return { steps, tolerance, metrics: {
    neutralizationReceived_ml: Number(delivered.toFixed(6)),
    neutralizationTarget_ml: volume_ml,
    neutralizationError_ml: Number(Math.abs(delivered - volume_ml).toFixed(6)),
    neutralizationInitial_c: initial,
    neutralizationPeak_c: peak,
    neutralizationRise_c: initial !== undefined && peak !== undefined ? peak - initial : undefined,
    neutralizationNeutralPh: endpoint?.neutralPh,
    neutralizationMeasurement_c: endpoint?.temperature_c,
    finalPh: endpoint?.ph,
  } };
}
