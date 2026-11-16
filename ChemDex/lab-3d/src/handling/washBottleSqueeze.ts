import type { VesselState } from '../types/chemistry';
import { canReceivePour } from '../engine/decantTransfer';

type WashBottleState = {
  vessels: Record<string, VesselState>;
  selectedVesselId: string | null;
  isSimulationPaused: boolean;
  moveMode: boolean;
  draggingVesselId: string | null;
  instrumentRinse: { bottleId: string } | null;
};

export function washBottleReceiverId(state: WashBottleState, bottle: VesselState, explicitTarget?: string): string | null {
  const selected = state.selectedVesselId !== bottle.id ? state.selectedVesselId : null;
  return explicitTarget ?? (bottle.washTargetId !== undefined ? bottle.washTargetId : selected);
}

/** User squeezes obey the same interaction boundary from controls and 3D
 * triggers. The lower-level transfer remains available to physical flows. */
export function washBottleSqueezeProblem(state: WashBottleState, bottleId: string, explicitTarget?: string): string | null {
  if (state.isSimulationPaused) return 'Tiếp tục mô phỏng trước khi tia dung dịch.';
  if (state.moveMode) return 'Tắt chế độ di chuyển trước khi tia dung dịch.';
  if (state.draggingVesselId) return 'Đặt bình yên trên bàn trước khi tia dung dịch.';
  if (state.instrumentRinse?.bottleId === bottleId) return 'Bình đang cấp nước rửa dụng cụ; dừng rửa trước khi dùng tia nước.';
  const bottle = state.vessels[bottleId];
  if (!bottle || bottle.type !== 'wash_bottle' || bottle.isShattered || bottle.isSealed) return 'Cần bình tia mở và nguyên vẹn.';
  if (bottle.isLocked) return 'Mở khóa bình tia trước khi sử dụng.';
  if (bottle.id.startsWith('lesson_vessel_')) return 'Mẫu bài học được định lượng riêng.';
  if (!Number.isFinite(bottle.volume_ml) || bottle.volume_ml <= 0) return 'Bình tia đã hết dung dịch.';
  const dose = bottle.washDose_ml ?? 5;
  if (!Number.isFinite(dose) || dose <= 0 || dose > 25) return 'Thể tích tia phải lớn hơn 0 và không vượt quá 25 mL.';
  const targetId = washBottleReceiverId(state, bottle, explicitTarget);
  if (targetId !== null) {
    const target = state.vessels[targetId];
    if (!target || target.id === bottle.id || !canReceivePour(target)) return 'Chọn bình nhận mở và nguyên vẹn.';
    if (target.isLocked) return 'Mở khóa bình nhận trước khi tia dung dịch.';
    if (target.id.startsWith('lesson_vessel_')) return 'Mẫu bài học được định lượng riêng.';
  }
  return null;
}
