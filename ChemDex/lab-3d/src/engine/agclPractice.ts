import type { LiquidAliquot } from '../handling/aliquot';
import { phaseVolumes } from '../science/liquidLayers';
import { silverChlorideIonInventory } from '../science/silverChloridePrecipitation';
import { sameMolecularFormula } from '../science/speciesIdentity';
import type { VesselState } from '../types/chemistry';
import type { ExperimentDifficultyMode, StepValidationResult } from './experimentEngine';
import { computeMolarMass } from './ledger';

export const AGCL_PRACTICE = {
  id: 'agcl_curdy_precipitation',
  sourceId: 'cylinder_1',
  receiverId: 'beaker_1',
  volume_ml: 25,
  concentration_M: 0.1,
  stirring_s: 1,
} as const;
const AGCL_MOLAR_MASS = computeMolarMass('AgCl');
const GUIDED_VOLUME_TOLERANCE_ML = 1;
const STOCK_CONCENTRATION_TOLERANCE_M = 0.001;

export interface AgClPracticeReceipt {
  attemptId: string;
  sampleRevision: number;
  received_ml: number;
  stirred_s: number;
}

function receiptFor(vessel: VesselState | undefined, id: string): AgClPracticeReceipt | undefined {
  if (vessel?.id !== id || vessel.isShattered) return;
  const receipt = vessel.agclPractice;
  if (receipt?.sampleRevision === (vessel.effectSampleRevision ?? 0)) return receipt;
}

export function agclSourceAttempt(vessel: VesselState | undefined): string | undefined {
  return receiptFor(vessel, AGCL_PRACTICE.sourceId)?.attemptId;
}

function silverStockMoles(contents: LiquidAliquot['contents']) {
  let moles = 0;
  for (const row of contents) {
    if (!(row.moles > 0) || sameMolecularFormula(row.formula, 'H2O')) continue;
    if (row.phase !== 'aq' || !sameMolecularFormula(row.formula, 'AgNO3')) return 0;
    moles += row.moles;
  }
  return moles;
}

function isSilverStock(contents: LiquidAliquot['contents'], volume_ml: number) {
  return volume_ml > 0 && Math.abs(silverStockMoles(contents) * 1000 / volume_ml - AGCL_PRACTICE.concentration_M)
    <= STOCK_CONCENTRATION_TOLERANCE_M;
}

export function recordAgClDelivery(vessel: VesselState, sourceAttempt: string | undefined, sample: LiquidAliquot, retained_ml: number) {
  if (!sourceAttempt || !(retained_ml > 0)) return vessel;
  const receipt = receiptFor(vessel, AGCL_PRACTICE.receiverId);
  if (receipt?.attemptId !== sourceAttempt || !isSilverStock(sample.contents, sample.volume_ml)) return vessel;
  return { ...vessel, agclPractice: { ...receipt, received_ml: receipt.received_ml + Math.min(retained_ml, sample.volume_ml), stirred_s: 0 } };
}

function precipitate_g(vessel: VesselState) {
  return vessel.contents.reduce((total, row) => total + (row.phase === 's' && row.solidOrigin === 'precipitate'
    && (!row.location || row.location === 'bulk') && sameMolecularFormula(row.formula, 'AgCl') ? row.mass_g : 0), 0);
}

function assessProduct(vessel: VesselState, received_ml: number) {
  const solids_g = precipitate_g(vessel);
  const dissolved = silverChlorideIonInventory(vessel.contents);
  const solidMoles = solids_g / AGCL_MOLAR_MASS;
  const expectedSilver = received_ml * AGCL_PRACTICE.concentration_M / 1000;
  const expectedChloride = AGCL_PRACTICE.volume_ml * AGCL_PRACTICE.concentration_M / 1000;
  const tolerance_mol = expectedChloride * 0.02;
  const inventoryMatches = !!dissolved && Math.abs(dissolved.silver + solidMoles - expectedSilver) <= tolerance_mol
    && Math.abs(dissolved.chloride + solidMoles - expectedChloride) <= tolerance_mol;
  return { solids_g, inventoryMatches, madeEnoughSolid: solidMoles >= expectedSilver * 0.95 };
}

export function recordAgClStirring(vessel: VesselState, dt: number): VesselState {
  const receipt = receiptFor(vessel, AGCL_PRACTICE.receiverId);
  if (!receipt || receipt.received_ml < AGCL_PRACTICE.volume_ml - GUIDED_VOLUME_TOLERANCE_ML - 1e-6
    || receipt.stirred_s >= AGCL_PRACTICE.stirring_s) return vessel;
  const product = assessProduct(vessel, receipt.received_ml);
  if (!product.inventoryMatches || !product.madeEnoughSolid) return vessel;
  return { ...vessel, agclPractice: { ...receipt, stirred_s: Math.min(AGCL_PRACTICE.stirring_s, receipt.stirred_s + dt) } };
}

export function assessAgClPractice(vessels: Record<string, VesselState>, mode: ExperimentDifficultyMode) {
  const { sourceId, receiverId, volume_ml, stirring_s } = AGCL_PRACTICE;
  const source = vessels[sourceId], receiver = vessels[receiverId];
  const receipt = receiptFor(receiver, receiverId);
  const fromPrepared = !!receipt && agclSourceAttempt(source) === receipt.attemptId;
  const current_ml = source ? phaseVolumes(source).aqueous : 0;
  const prepared = !!receipt && (receipt.received_ml > 0 || fromPrepared && current_ml >= volume_ml - GUIDED_VOLUME_TOLERANCE_ML
    && isSilverStock(source.contents, current_ml));
  const delivered_ml = receipt?.received_ml ?? 0;
  const product = receipt && receiver ? assessProduct(receiver, delivered_ml) : null;
  const mixed_s = receipt?.stirred_s ?? 0;
  const tolerance = mode === 'guided' ? GUIDED_VOLUME_TOLERANCE_ML : mode === 'standard' ? 0.5 : 0.25;
  const error = Math.abs(delivered_ml - volume_ml);
  const volumeInRange = error <= tolerance + 1e-9;
  const poured = prepared && volumeInRange && !!product?.inventoryMatches && product.madeEnoughSolid;
  const stirred = poured && mixed_s >= stirring_s - 1e-9;
  const steps: StepValidationResult[] = [
    { isValid: prepared, progress: prepared ? 1 : 0,
      message_en: prepared ? 'The two samples are ready.' : 'Set up the workbench to prepare both samples.',
      message_vi: prepared ? 'Hai mẫu đã sẵn sàng.' : 'Bày bàn thí nghiệm để chuẩn bị hai mẫu.' },
    { isValid: poured, progress: Math.min(1, delivered_ml / volume_ml), currentValue: Number(delivered_ml.toFixed(3)),
      targetValue: volume_ml, toleranceError: Number(error.toFixed(3)), isWithinTolerance: poured,
      message_en: volumeInRange && !product?.inventoryMatches
        ? 'The silver or chloride inventory differs from the prepared samples. Undo the extra transfer or set up the samples again.'
        : 'Pour the prepared silver nitrate into the sodium chloride beaker until solid AgCl forms.',
      message_vi: volumeInRange && !product?.inventoryMatches
        ? 'Lượng bạc hoặc chloride trong cốc lệch so với mẫu đã chuẩn bị. Hãy hoàn tác lần chuyển thêm hoặc bày lại bàn.'
        : 'Rót AgNO₃ đã chuẩn bị từ ống đong vào cốc NaCl để tạo AgCl rắn.' },
    { isValid: stirred, progress: Math.min(1, mixed_s / stirring_s), currentValue: Number(mixed_s.toFixed(2)), targetValue: stirring_s,
      message_en: 'Stir the precipitate with the immersed glass rod.',
      message_vi: 'Khuấy cốc kết tủa bằng đũa thủy tinh đã ngập trong mẫu.' },
  ];
  return { steps, tolerance, metrics: {
    agclReceived_ml: Number(delivered_ml.toFixed(6)),
    agclTarget_ml: volume_ml,
    agclError_ml: Number(error.toFixed(6)),
    agclPrecipitate_g: Number((product?.solids_g ?? 0).toFixed(6)),
    agclStirred_s: Number(mixed_s.toFixed(3)),
  } };
}
