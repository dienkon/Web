import { calculateVesselMass } from './interactionEngine';
import { vesselTareG } from '../core/labGeometry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { waterVaporReleasedHistoryG } from './waterVaporRouting';
import type { VesselState } from '../types/chemistry';
import type { ExperimentDifficultyMode, StepValidationResult } from './experimentEngine';

export const MASS_CONSERVATION = {
  id: 'mass_conservation_bacl2_na2so4', receiverId: 'beaker_1', sourceId: 'beaker_2',
} as const;
export type MassConservationCup = typeof MASS_CONSERVATION.receiverId | typeof MASS_CONSERVATION.sourceId;
export type WeighingStage = 'before' | 'after';

interface Weighing {
  displayed_g: number;
  tareOffset_g: number;
  gross_g: number;
  releasedWater_g: number;
  sample: string;
}

export interface ConservationTransfer {
  released_g: number;
  received_g: number;
  spilled_g: number;
  diverted_g: number;
}

export interface MassConservationReceipt {
  attemptId: string;
  sampleRevision: number;
  preparedSample: string;
  before?: Weighing;
  after?: Weighing;
  transfer?: ConservationTransfer;
}

const EMPTY_TRANSFER: ConservationTransfer = { released_g: 0, received_g: 0, spilled_g: 0, diverted_g: 0 };
const PREPARED_CUPS = [MASS_CONSERVATION.receiverId, MASS_CONSERVATION.sourceId];
const grams = (value: number) => Number(value.toFixed(3));

function sampleFingerprint(vessel: VesselState): string {
  const releasedWater_g = waterVaporReleasedHistoryG(vessel);
  const species = new Map<string, number>([['H2O', releasedWater_g + (vessel.wallCondensation?.inner_g ?? 0)
    + (vessel.wallCondensation?.outer_g ?? 0)]]);
  for (const row of vessel.contents) {
    const key = sameMolecularFormula(row.formula, 'H2O') ? 'H2O' : row.formula;
    species.set(key, (species.get(key) ?? 0) + row.mass_g);
  }
  const composition = [...species].filter(([, mass]) => mass > 1e-8)
    .sort(([first], [second]) => first.localeCompare(second)).map(([key, mass]) => [key, mass.toFixed(6)]);
  return JSON.stringify([vessel.type, vessel.capacity_ml, (calculateVesselMass(vessel) + releasedWater_g).toFixed(6), composition]);
}

export function newMassConservationReceipt(vessel: VesselState, attemptId: string): MassConservationReceipt {
  return { attemptId, sampleRevision: vessel.effectSampleRevision ?? 0, preparedSample: sampleFingerprint(vessel) };
}

function receiptFor(vessel?: VesselState): MassConservationReceipt | undefined {
  if (!vessel || !PREPARED_CUPS.some(id => id === vessel.id) || vessel.isShattered) return;
  const receipt = vessel.massConservationPractice;
  if (receipt?.sampleRevision === (vessel.effectSampleRevision ?? 0)) return receipt;
}

export function massConservationSourceAttempt(vessel?: VesselState): string | undefined {
  if (vessel?.id === MASS_CONSERVATION.sourceId) return receiptFor(vessel)?.attemptId;
}

export function massConservationCups(vessels: Record<string, VesselState>) {
  const receiver = receiptFor(vessels[MASS_CONSERVATION.receiverId]);
  const source = receiptFor(vessels[MASS_CONSERVATION.sourceId]);
  return receiver && source?.attemptId === receiver.attemptId ? { receiver, source } : null;
}

export function massConservationPourPending(pours: readonly { sourceId: string; targetId: string | null }[]): boolean {
  return pours.some(pour => PREPARED_CUPS.some(id => id === pour.sourceId || id === pour.targetId));
}

export function recordConservationTransfer(vessel: VesselState | undefined, attemptId: string | undefined,
  event: Partial<ConservationTransfer>): VesselState | undefined {
  if (!vessel || vessel.id !== MASS_CONSERVATION.receiverId || !attemptId) return vessel;
  const receipt = receiptFor(vessel);
  if (receipt?.attemptId !== attemptId) return vessel;
  const previous = receipt.transfer ?? EMPTY_TRANSFER;
  return { ...vessel, massConservationPractice: { ...receipt, transfer: {
    released_g: previous.released_g + (event.released_g ?? 0),
    received_g: previous.received_g + (event.received_g ?? 0),
    spilled_g: previous.spilled_g + (event.spilled_g ?? 0),
    diverted_g: previous.diverted_g + (event.diverted_g ?? 0),
  } } };
}

export function captureConservationWeighing(vessel: VesselState, stage: WeighingStage, tareOffset_g: number,
  vessels: Record<string, VesselState>, mode: ExperimentDifficultyMode) {
  const receipt = receiptFor(vessel);
  const cups = massConservationCups(vessels);
  if (!receipt || !cups || !Number.isFinite(tareOffset_g)) return;
  const gross = calculateVesselMass(vessel);
  if (!Number.isFinite(gross)) return;
  const sample = sampleFingerprint(vessel);
  if (stage === 'before' && (sample !== receipt.preparedSample || (cups.receiver.transfer?.released_g ?? 0) > 0)) return;
  if (stage === 'after' && !assessMassConservation(vessels, mode).steps[1].isValid) return;
  const displayed_g = grams(gross - tareOffset_g);
  return { ...receipt, [stage]: { displayed_g, tareOffset_g, gross_g: grams(displayed_g + tareOffset_g),
    releasedWater_g: waterVaporReleasedHistoryG(vessel), sample } };
}

export function assessMassConservation(vessels: Record<string, VesselState>, mode: ExperimentDifficultyMode, pending = false) {
  const cups = massConservationCups(vessels);
  const receiver = vessels[MASS_CONSERVATION.receiverId], source = vessels[MASS_CONSERVATION.sourceId];
  const transfer = cups?.receiver.transfer ?? EMPTY_TRANSFER;
  const tolerance = mode === 'guided' ? 0.05 : mode === 'standard' ? 0.02 : 0.01;
  const before = cups?.receiver.before && cups.source.before ? [cups.receiver.before, cups.source.before] as const : null;
  const weighedBefore = !!before && !!cups && (transfer.released_g > 0 || (sampleFingerprint(receiver) === cups.receiver.preparedSample
    && sampleFingerprint(source) === cups.source.preparedSample));
  const product_g = cups && receiver ? receiver.contents.reduce((mass, row) => mass + (row.phase === 's'
    && sameMolecularFormula(row.formula, 'BaSO4') ? row.mass_g : 0), 0) : 0;
  const transferError = Math.abs(transfer.released_g - transfer.received_g - transfer.spilled_g);
  const reacted = weighedBefore && !pending && transfer.released_g > 0 && transfer.received_g > 0
    && Math.abs(transfer.diverted_g) <= 1e-6 && transferError <= tolerance && product_g > 1e-6;
  const afterReceiver = cups?.receiver.after;
  const afterSource = cups?.source.after;
  const after = reacted && afterReceiver && afterSource
    && afterReceiver.sample === sampleFingerprint(receiver) && afterSource.sample === sampleFingerprint(source)
    ? [afterReceiver, afterSource] as const : null;
  const beforeTotal = before ? before[0].gross_g + before[1].gross_g : undefined;
  const afterTotal = after ? after[0].gross_g + after[1].gross_g : undefined;
  const receiverVapor = before && after ? after[0].releasedWater_g - before[0].releasedWater_g : 0;
  const sourceVapor = before && after ? after[1].releasedWater_g - before[1].releasedWater_g : 0;
  const totalVapor = receiverVapor + sourceVapor;
  const error = before && after && beforeTotal !== undefined && afterTotal !== undefined ? Math.max(
    Math.abs(beforeTotal - afterTotal - transfer.spilled_g - totalVapor),
    Math.abs(before[1].gross_g - after[1].gross_g - transfer.released_g - sourceVapor),
    Math.abs(after[0].gross_g - before[0].gross_g - transfer.received_g + receiverVapor),
  ) : undefined;
  const balanced = error !== undefined && error <= tolerance + 1e-8;
  const steps: StepValidationResult[] = [
    { isValid: weighedBefore, progress: weighedBefore ? 1 : 0,
      message_en: 'Record the gross mass of both prepared cups before pouring.',
      message_vi: 'Ghi khối lượng cả hai cốc đã chuẩn bị trước khi rót.' },
    { isValid: reacted, progress: reacted ? 1 : 0,
      message_en: pending ? 'Wait for the poured liquid and runoff to land.' : 'Pour into the prepared receiver to form BaSO₄.',
      message_vi: pending ? 'Chờ dung dịch rót và phần tràn rơi hết.' : 'Rót vào cốc nhận đã chuẩn bị để tạo BaSO₄.' },
    { isValid: balanced, progress: balanced ? 1 : 0,
      message_en: error !== undefined && !balanced ? 'The readings differ from the transfer record. Undo the extra change or prepare a new attempt.'
        : 'Weigh both cups again and account for spilled liquid and evaporated water.',
      message_vi: error !== undefined && !balanced ? 'Số cân lệch so với lượng đã rót. Hoàn tác thay đổi thêm hoặc bày lại bàn.'
        : 'Cân lại cả hai cốc và đối chiếu phần tràn cùng lượng nước đã bay hơi.' },
  ];
  return { steps, tolerance, cups, metrics: {
    conservationBefore_g: beforeTotal === undefined ? undefined : grams(beforeTotal),
    conservationAfter_g: afterTotal === undefined ? undefined : grams(afterTotal),
    conservationReceiverBefore_g: cups?.receiver.before?.gross_g,
    conservationSourceBefore_g: cups?.source.before?.gross_g,
    conservationReceiverAfter_g: after?.[0].gross_g,
    conservationSourceAfter_g: after?.[1].gross_g,
    conservationSourceLeft_g: after ? grams(after[1].gross_g - vesselTareG(source.type, source.tare_g)) : undefined,
    conservationReceived_g: grams(transfer.received_g),
    conservationSpilled_g: grams(transfer.spilled_g),
    conservationWaterVapor_g: after ? Number(totalVapor.toFixed(6)) : undefined,
    conservationError_g: error === undefined ? undefined : grams(error),
    conservationPrecipitate_g: grams(product_g),
  } };
}
