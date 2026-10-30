import { useAppStore } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { calculateVesselMass, LAB_PHYSICS } from '../engine/interactionEngine';
import { reactAliquotMixture } from '../engine/aliquotReaction';
import { withdrawAliquot, dispenseAliquot } from './aliquot';
import { useInstrumentStore } from './instrumentState';
import { constrainToolPosition, useToolDockStore, type ToolPosition } from './toolDock';
import { getInstrument, instrumentHome, isLessonVessel, type InstrumentId } from './instrumentCatalog';
import { lessonRuntime } from '../lesson/runtime';
import { useLessonLabStore } from '../lesson/labBridge';
import { mobileSolidInventory } from '../science/suspensionTransport';
import { SimulationEngine } from '../simulation/core/SimulationEngine';
import { prepareAliquotContact } from '../engine/aliquotContactChemistry';

export interface InstrumentResult {
  ok: boolean;
  message: string;
  transferred_ml?: number;
}

function result(tool: InstrumentId, ok: boolean, message: string, transferred_ml?: number): InstrumentResult {
  useInstrumentStore.getState().notify(tool, message, ok);
  return { ok, message, transferred_ml };
}

export function resolveInstrumentTarget(): VesselState | null {
  const state = useAppStore.getState();
  return state.selectedVesselId ? state.vessels[state.selectedVesselId] ?? null : null;
}

export function instrumentTargetProblem(tool: InstrumentId, vessel: VesselState | null): string | null {
  if (!vessel) return 'Chọn một bình trên bàn trước.';
  if (vessel.isShattered) return 'Bình đã vỡ; hãy chọn bình nguyên vẹn.';
  if (vessel.capacity_ml <= 0) return 'Dụng cụ đang chọn không phải bình chứa mẫu.';
  if (vessel.isLocked) return 'Bình đang khóa thao tác.';
  if (isLessonVessel(vessel.id) && !getInstrument(tool).allowsLesson) {
    return 'Mẫu bài học được định lượng riêng. Hãy dùng các bước điều khiển của bài học.';
  }
  return null;
}

export function aspiratePipette(requested_ml = 10): InstrumentResult {
  const state = useAppStore.getState();
  const source = resolveInstrumentTarget();
  const problem = instrumentTargetProblem('pipette', source);
  if (problem || !source) return result('pipette', false, problem ?? 'Không có mẫu.');
  if (state.moveMode) return result('pipette', false, 'Tắt chế độ di chuyển trước khi hút.');
  const loaded = state.pipetteSample;
  if (loaded && loaded.volume_ml > 1e-6) return result('pipette', false, 'Pipet còn mẫu; nhả mẫu trước khi hút tiếp.');
  if (!Number.isFinite(requested_ml) || requested_ml <= 0 || requested_ml > 10) {
    return result('pipette', false, 'Thể tích hút phải lớn hơn 0 và không vượt quá 10 mL.');
  }
  if (source.volume_ml <= 0) return result('pipette', false, 'Bình nguồn không có dung dịch.');
  const transfer = withdrawAliquot(source, requested_ml, mobileSolidInventory(source, SimulationEngine.findManager(source.id)));
  state.commitPipetteTransfer({ vessel: transfer.vessel,
    sample: prepareAliquotContact(transfer.sample, state.activeKinetics[source.id]?.program?.id), withdrawal: true });
  state.setActiveTool('pipette');
  const chemical = transfer.sample.substances[0];
  if (chemical) state.touchToolChemical('pipette', chemical);
  return result('pipette', true, `Đã hút ${transfer.sample.volume_ml.toFixed(3)} mL từ ${source.name}.`, transfer.sample.volume_ml);
}

export function dispensePipette(requested_ml = 2.5, targetId?: string): InstrumentResult {
  const state = useAppStore.getState();
  const receiver = targetId === undefined ? resolveInstrumentTarget() : state.vessels[targetId] ?? null;
  const problem = instrumentTargetProblem('pipette', receiver);
  if (problem || !receiver) return result('pipette', false, problem ?? 'Không có bình nhận.');
  if (state.moveMode) return result('pipette', false, 'Tắt chế độ di chuyển trước khi nhả.');
  const sample = state.pipetteSample;
  if (!sample || sample.volume_ml <= 1e-6) return result('pipette', false, 'Pipet đang rỗng.');
  if (!Number.isFinite(requested_ml) || requested_ml <= 0 || requested_ml > 10) {
    return result('pipette', false, 'Thể tích nhả phải lớn hơn 0 và không vượt quá 10 mL.');
  }
  const transfer = dispenseAliquot(receiver, sample, requested_ml);
  if (transfer.dispensed_ml <= 0) return result('pipette', false, 'Bình nhận đã đầy.');
  const heated = Object.values(state.burners).some(burner => burner.isOn
    && Math.hypot(burner.position[0] - receiver.position[0], burner.position[2] - receiver.position[2]) < 1.5);
  const reacted = reactAliquotMixture(transfer.vessel, state.language, heated);
  state.commitPipetteTransfer({ vessel: reacted.vessel, sample: transfer.sample, withdrawal: false,
    kinetics: reacted.kinetics, mixResult: reacted.mixResult });
  state.setActiveTool('pipette');
  return result('pipette', true, `Đã nhả ${transfer.dispensed_ml.toFixed(3)} mL vào ${receiver.name}.`, transfer.dispensed_ml);
}

export function positionInstrument(id: InstrumentId, position: ToolPosition): InstrumentResult {
  if (!position.every(Number.isFinite)) return result(id, false, 'Tọa độ phải là số hữu hạn.');
  if (id === 'sponge') return result(id, false, 'Miếng lau đi theo con trỏ khi kích hoạt.');
  const constrained = constrainToolPosition(...position);
  const next = [constrained[0], instrumentHome(id)[1], constrained[2]] as ToolPosition;
  useAppStore.getState().setActiveTool('none');
  useToolDockStore.setState(state => ({ positions: { ...state.positions, [id]: next } }));
  if (id === 'balance') LAB_PHYSICS.BALANCE_POSITION = next;
  if (id === 'burette') useAppStore.getState().updateBurette({ position: next, isDispensing: false });
  return result(id, true, `Đã đặt ${getInstrument(id).name} tại x=${next[0].toFixed(2)}, z=${next[2].toFixed(2)}.`);
}

export function returnInstrumentHome(id: InstrumentId): InstrumentResult {
  return positionInstrument(id, instrumentHome(id));
}

export function activateInstrument(id: InstrumentId): InstrumentResult {
  const state = useAppStore.getState();
  state.setMoveMode(false);
  if (id === 'burette') return result(id, true, 'Chọn bình nhận và căn bình dưới đầu buret.');
  if (getInstrument(id).targetRequired) {
    const problem = instrumentTargetProblem(id, resolveInstrumentTarget());
    if (problem) return result(id, false, problem);
  }
  state.setActiveTool(id);
  return result(id, true, `Đã kích hoạt ${getInstrument(id).name}.`);
}

export function currentInstrumentPosition(id: InstrumentId): ToolPosition {
  const saved = useToolDockStore.getState().positions[id];
  if (saved) return [...saved];
  if (id === 'burette') return [...useAppStore.getState().burette.position];
  return instrumentHome(id);
}

export function balanceOccupant(): VesselState | null {
  const position = currentInstrumentPosition('balance');
  return Object.values(useAppStore.getState().vessels)
    .filter(vessel => !vessel.isShattered && vessel.capacity_ml > 0)
    .find(vessel => Math.hypot(vessel.position[0] - position[0], vessel.position[2] - position[2]) < LAB_PHYSICS.BALANCE_PAN_RADIUS) ?? null;
}

export function balanceReading(): number {
  const vessel = balanceOccupant();
  const raw = vessel ? calculateVesselMass(vessel) : 0;
  return raw - useInstrumentStore.getState().balanceTare_g;
}

export function tareBalance(): InstrumentResult {
  const vessel = balanceOccupant();
  const raw = vessel ? calculateVesselMass(vessel) : 0;
  useInstrumentStore.getState().setTare(raw);
  return result('balance', true, `Đã trừ bì ${raw.toFixed(3)} g.`);
}

export function alignSelectedVessel(tool: 'balance' | 'burette'): InstrumentResult {
  const vessel = resolveInstrumentTarget();
  const problem = instrumentTargetProblem(tool, vessel);
  if (problem || !vessel) return result(tool, false, problem ?? 'Không có bình.');
  const position = currentInstrumentPosition(tool);
  const occupied = Object.values(useAppStore.getState().vessels).some(other => other.id !== vessel.id
    && Math.hypot(other.position[0] - position[0], other.position[2] - position[2]) < 0.7);
  if (occupied) return result(tool, false, 'Vị trí đã có bình khác; di chuyển bình đó trước.');
  useAppStore.getState().setVesselState(vessel.id, {
    position: [position[0], tool === 'balance' ? position[1] + 1.35 : vessel.position[1], position[2]],
  });
  return result(tool, true, tool === 'balance' ? 'Đã đặt bình lên đĩa cân.' : 'Đã căn bình dưới đầu buret.');
}

export function buretteReceiver(): VesselState | null {
  const position = currentInstrumentPosition('burette');
  return Object.values(useAppStore.getState().vessels)
    .filter(vessel => vessel.capacity_ml > 0 && !vessel.isShattered && !isLessonVessel(vessel.id))
    .find(vessel => Math.hypot(vessel.position[0] - position[0], vessel.position[2] - position[2]) < 0.6) ?? null;
}

export function dispenseOneBuretteDrop(): InstrumentResult {
  const state = useAppStore.getState();
  if (state.moveMode) return result('burette', false, 'Tắt chế độ di chuyển trước khi nhả.');
  const receiver = buretteReceiver();
  if (!receiver) return result('burette', false, 'Chưa có bình nhận dưới đầu buret.');
  const problem = instrumentTargetProblem('burette', receiver);
  if (problem) return result('burette', false, problem);
  const before = state.burette.currentVolume_ml;
  if (before <= 0) return result('burette', false, 'Buret đã hết dung dịch.');
  state.dispenseBuretteDrop(receiver.id);
  const transferred = before - useAppStore.getState().burette.currentVolume_ml;
  return transferred > 0
    ? result('burette', true, `Đã nhả ${transferred.toFixed(3)} mL.`, transferred)
    : result('burette', false, 'Bình nhận đã đầy; không nhả thêm.');
}

export function setBuretteFlow(flow: number): InstrumentResult {
  if (!Number.isFinite(flow) || flow < 0.1 || flow > 2) return result('burette', false, 'Lưu lượng phải trong khoảng 0,1–2 mL/s.');
  useAppStore.getState().updateBurette({ flowRate_ml_s: flow });
  return result('burette', true, `Lưu lượng mô hình ${flow.toFixed(2)} mL/s.`);
}

export function setBuretteValve(open: boolean): InstrumentResult {
  const state = useAppStore.getState();
  if (open && (!buretteReceiver() || state.burette.currentVolume_ml <= 0)) {
    return result('burette', false, 'Cần dung dịch trong buret và bình nhận bên dưới.');
  }
  state.updateBurette({ isDispensing: open });
  return result('burette', true, open ? 'Đã mở khóa buret.' : 'Đã đóng khóa buret.');
}

export function stirSelectedVessel(): InstrumentResult {
  const state = useAppStore.getState();
  const vessel = resolveInstrumentTarget();
  const problem = instrumentTargetProblem('stirring_rod', vessel);
  if (problem || !vessel) return result('stirring_rod', false, problem ?? 'Không có mẫu.');
  if (isLessonVessel(vessel.id)) {
    const session = lessonRuntime.list().find(entry => entry.vesselId === vessel.id);
    if (!session) return result('stirring_rod', false, 'Bài học đã được đóng.');
    useLessonLabStore.getState().dispatch(session.id, { type: 'stir', active: !session.environment.stirring });
    return result('stirring_rod', true, session.environment.stirring ? 'Đang khuấy mẫu bài học.' : 'Đã dừng khuấy mẫu bài học.');
  }
  state.stirVessel(vessel.id);
  state.setActiveTool('stirring_rod');
  if (vessel.substances[0]) state.touchToolChemical('stirring_rod', vessel.substances[0]);
  return result('stirring_rod', true, `Đã khuấy ${vessel.name}.`);
}

export async function depositSpatula(): Promise<InstrumentResult> {
  const state = useAppStore.getState();
  const vessel = resolveInstrumentTarget();
  const problem = instrumentTargetProblem('spatula', vessel);
  if (problem || !vessel) return result('spatula', false, problem ?? 'Không có bình.');
  const sample = state.spatulaState;
  if (!sample.chemical || sample.mass_g <= 0) return result('spatula', false, 'Thìa chưa có hóa chất rắn.');
  // Reserve the sample before awaiting the async chemistry resolver.
  state.setSpatulaScoop(null);
  try {
    await state.mixSubstances(vessel.id, sample.chemical, sample.mass_g);
    state.touchToolChemical('spatula', sample.chemical);
    return result('spatula', true, `Đã cho ${sample.mass_g.toFixed(3)} g ${sample.chemical} vào ${vessel.name}.`);
  } catch {
    state.setSpatulaScoop(sample.chemical, sample.mass_g, sample.color);
    return result('spatula', false, 'Không chuyển được mẫu; đã trả lại mẫu lên thìa.');
  }
}

export function rinseInstrument(id: 'pipette' | 'stirring_rod' | 'spatula'): InstrumentResult {
  const state = useAppStore.getState();
  if (id === 'pipette' && (state.pipetteSample?.volume_ml ?? 0) > 1e-6) {
    return result(id, false, 'Nhả hết mẫu vào bình nhận trước khi rửa pipet.');
  }
  if (id === 'spatula' && state.spatulaState.mass_g > 0) return result(id, false, 'Chuyển hết mẫu rắn trước khi rửa thìa.');
  state.cleanTool(id);
  return result(id, true, 'Đã rửa dụng cụ trong mô hình.');
}

export function cleanAllSpills(): InstrumentResult {
  const state = useAppStore.getState();
  const before = Object.values(state.spills).reduce((sum, spill) => sum + spill.mass_g, 0);
  state.cleanSpills();
  return result('sponge', true, `Đã thu gom ${before.toFixed(3)} g chất tràn vào chất thải.`);
}
