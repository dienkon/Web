import { useAppStore } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';
import { calculateVesselMass, LAB_PHYSICS } from '../engine/interactionEngine';
import { reactAliquotMixture } from '../engine/aliquotReaction';
import { withdrawAliquot, dispenseAliquot } from './aliquot';
import { useInstrumentStore } from './instrumentState';
import { constrainToolPosition, useToolDockStore, type ToolPosition } from './toolDockState';
import { getInstrument, instrumentHome, isLessonVessel, type InstrumentId } from './instrumentCatalog';
import { lessonRuntime } from '../lesson/runtime';
import { useLessonLabStore } from '../lesson/labBridge';
import { mobileSolidInventory } from '../science/suspensionTransport';
import { SimulationEngine } from '../simulation/core/SimulationEngine';
import { prepareAliquotContact } from '../engine/aliquotContactChemistry';
import { vesselHasBurnerHeat } from '../engine/burnerEnergy';
import { uiText } from '../utils/uiText';
import { pipetteHasRinseSample } from './instrumentRinse';
import { buretteTargetProblem, findBuretteReceiver } from './buretteTarget';
import type { BuretteStockId } from './buretteStocks';
import { BURETTE_MAX_ANCHOR_Y, BURETTE_NOZZLE_LOCAL_Y, BURETTE_RIM_CLEARANCE, constrainBurettePosition } from './burettePlacement';
import { balancePanVesselPosition, findBalanceOccupant, isVesselSupportedByBalance, restingVesselHeight } from './vesselRest';
import { vesselWorldDimensions } from '../science/vesselScale';

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
  if (useAppStore.getState().instrumentRinse?.tool === tool)
    return 'Dụng cụ đang rửa; chờ hoàn tất hoặc nhấn Dừng rửa.';
  if (vessel && useAppStore.getState().instrumentRinse?.bottleId === vessel.id
    && ['pipette', 'burette', 'stirring_rod', 'spatula'].includes(tool))
    return uiText('Bình đang cấp nước rửa dụng cụ; dừng rửa trước khi lấy hoặc thêm mẫu.');
  if (!vessel) return 'Chọn một bình trên bàn trước.';
  if (vessel.isShattered) return 'Bình đã vỡ; hãy chọn bình nguyên vẹn.';
  if (vessel.isSealed && ['pipette', 'burette', 'ph_meter', 'thermometer', 'stirring_rod', 'spatula'].includes(tool))
    return 'Mở nút bình trước khi đưa đầu dụng cụ hoặc hóa chất vào.';
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
  if (state.isSimulationPaused) return result('pipette', false, 'Tiếp tục mô phỏng trước khi hút mẫu.');
  if (state.draggingVesselId) return result('pipette', false, 'Đặt bình nguồn yên trên bàn trước khi hút mẫu.');
  if (state.moveMode) return result('pipette', false, 'Tắt chế độ di chuyển trước khi hút.');
  const loaded = state.pipetteSample;
  if (pipetteHasRinseSample(loaded)) return result('pipette', false, 'Pipet còn mẫu hoặc cặn khô; nhả hoặc thu gom mẫu vào chất thải trước khi hút tiếp.');
  if (!useInstrumentStore.getState().canQueuePipettePresentation(state.pourEpoch))
    return result('pipette', false, 'Chờ pipet xử lý các lần chuyển mẫu trước khi hút tiếp.');
  if (!Number.isFinite(requested_ml) || requested_ml <= 0 || requested_ml > 10) {
    return result('pipette', false, 'Thể tích hút phải lớn hơn 0 và không vượt quá 10 mL.');
  }
  if (source.volume_ml <= 0) return result('pipette', false, 'Bình nguồn không có dung dịch.');
  const transfer = withdrawAliquot(source, requested_ml, mobileSolidInventory(source, SimulationEngine.findManager(source.id)));
  const accepted = state.commitPipetteTransfer({ vessel: transfer.vessel,
    sample: prepareAliquotContact(transfer.sample, state.activeKinetics[source.id]?.program?.id), withdrawal: true });
  if (!accepted) return result('pipette', false, 'Chưa thể hút mẫu; mẫu vẫn được giữ trong bình nguồn.');
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
  if (state.isSimulationPaused) return result('pipette', false, 'Tiếp tục mô phỏng trước khi nhả mẫu.');
  if (state.draggingVesselId) return result('pipette', false, 'Đặt bình nhận yên trên bàn trước khi nhả mẫu.');
  if (state.moveMode) return result('pipette', false, 'Tắt chế độ di chuyển trước khi nhả.');
  if (!useInstrumentStore.getState().canQueuePipettePresentation(state.pourEpoch))
    return result('pipette', false, 'Chờ pipet xử lý các lần chuyển mẫu trước khi nhả tiếp.');
  const sample = state.pipetteSample;
  if (!sample || sample.volume_ml <= 1e-6) return result('pipette', false, 'Pipet đang rỗng.');
  if (!Number.isFinite(requested_ml) || requested_ml <= 0 || requested_ml > 10) {
    return result('pipette', false, 'Thể tích nhả phải lớn hơn 0 và không vượt quá 10 mL.');
  }
  const transfer = dispenseAliquot(receiver, sample, requested_ml);
  if (transfer.dispensed_ml <= 0) return result('pipette', false, 'Bình nhận đã đầy.');
  const heated = vesselHasBurnerHeat(receiver, state.burners);
  const reacted = transfer.failureReason ? { vessel: transfer.vessel, kinetics: null, mixResult: null }
    : reactAliquotMixture(transfer.vessel, state.language, heated);
  const accepted = state.commitPipetteTransfer({ vessel: reacted.vessel, sample: transfer.sample, withdrawal: false,
    kinetics: reacted.kinetics, mixResult: reacted.mixResult, failureReason: transfer.failureReason });
  if (!accepted) return result('pipette', false, 'Chưa thể nhả mẫu; mẫu vẫn được giữ trong pipet.');
  state.setActiveTool('pipette');
  return result('pipette', true, transfer.failureReason
    ? `Đã nhả ${transfer.dispensed_ml.toFixed(3)} mL; bình bị sốc nhiệt và mẫu chuyển ra bàn.`
    : `Đã nhả ${transfer.dispensed_ml.toFixed(3)} mL vào ${receiver.name}.`, transfer.dispensed_ml);
}

export function discardPipetteContents(): InstrumentResult {
  const before = useAppStore.getState().pipetteSample;
  if (!before) return result('pipette', false, 'Pipet đang rỗng.');
  const accepted = useAppStore.getState().discardPipetteSample();
  return result('pipette', accepted, accepted
    ? `Đã thu gom ${before.mass_g.toPrecision(4)} g mẫu pipet vào chất thải; rửa pipet trước khi đổi mẫu.`
    : 'Tiếp tục mô phỏng và chờ pipet chuyển mẫu xong trước khi thu gom.');
}

export function positionInstrument(id: InstrumentId, position: ToolPosition): InstrumentResult {
  if (id === 'pipette' && useInstrumentStore.getState().hasPipettePresentation(useAppStore.getState().pourEpoch))
    return result(id, false, 'Chờ pipet chuyển mẫu xong trước khi đổi vị trí.');
  if (useAppStore.getState().instrumentRinse?.tool === id) return result(id, false, 'Dừng rửa trước khi đổi vị trí dụng cụ.');
  if (!position.every(Number.isFinite)) return result(id, false, 'Tọa độ phải là số hữu hạn.');
  if (id === 'sponge') return result(id, false, 'Miếng lau đi theo con trỏ khi kích hoạt.');
  const constrained = constrainToolPosition(...position);
  const next: ToolPosition = id === 'burette' ? constrainBurettePosition(position)
    : [constrained[0], instrumentHome(id)[1], constrained[2]];
  useAppStore.getState().setActiveTool('none');
  if (id === 'burette') {
    useAppStore.getState().updateBurette({ position: next, isDispensing: false });
  } else {
    useToolDockStore.setState(state => ({ positions: { ...state.positions, [id]: next }, deployed: { ...state.deployed, [id]: true } }));
    if (id === 'balance') LAB_PHYSICS.BALANCE_POSITION = next;
  }
  return result(id, true, `Đã đặt ${getInstrument(id).name} tại x=${next[0].toFixed(2)}, z=${next[2].toFixed(2)}.`);
}

export function returnInstrumentHome(id: InstrumentId): InstrumentResult {
  return positionInstrument(id, instrumentHome(id));
}

export function stowInstrument(id: InstrumentId): InstrumentResult {
  if (id === 'pipette' && useInstrumentStore.getState().hasPipettePresentation(useAppStore.getState().pourEpoch))
    return result(id, false, 'Chờ pipet chuyển mẫu xong trước khi cất dụng cụ.');
  if (useAppStore.getState().instrumentRinse?.tool === id) return result(id, false, 'Dừng rửa trước khi cất dụng cụ.');
  if (id === 'balance' || id === 'burette') return result(id, false, 'Thiết bị này có vị trí cố định trên bàn.');
  if (useAppStore.getState().activeTool === id) useAppStore.getState().setActiveTool('none');
  useToolDockStore.setState(s => ({ deployed: { ...s.deployed, [id]: false }, dragging: s.dragging === id ? null : s.dragging }));
  return result(id, true, `Đã cất ${getInstrument(id).name}.`);
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
  if (id === 'burette') return [...useAppStore.getState().burette.position];
  const saved = useToolDockStore.getState().positions[id];
  if (saved) return [...saved];
  return instrumentHome(id);
}

export function balanceOccupant(): VesselState | null {
  const { vessels, draggingVesselId } = useAppStore.getState();
  if (useToolDockStore.getState().dragging === 'balance') return null;
  return findBalanceOccupant(vessels, currentInstrumentPosition('balance'), draggingVesselId);
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
  const state = useAppStore.getState();
  const vessel = resolveInstrumentTarget();
  const problem = instrumentTargetProblem(tool, vessel);
  if (problem || !vessel) return result(tool, false, problem ?? 'Không có bình.');
  if (state.draggingVesselId || useToolDockStore.getState().dragging)
    return result(tool, false, 'Thả dụng cụ hoặc bình đang kéo trước khi căn.');
  const position = currentInstrumentPosition(tool);
  const occupied = Object.values(state.vessels).some(other => other.id !== vessel.id
    && (tool === 'balance' ? isVesselSupportedByBalance(other, position)
      : Math.hypot(other.position[0] - position[0], other.position[2] - position[2]) < 0.7));
  if (occupied) return result(tool, false, 'Vị trí đã có bình khác; di chuyển bình đó trước.');
  const destination: ToolPosition = tool === 'balance'
    ? balancePanVesselPosition(position, vessel.type, vessel.capacity_ml)
    : [position[0], restingVesselHeight(vessel.type, vessel.capacity_ml), position[2]];
  const patch: Partial<VesselState> = { position: destination, rotationZ: 0, physicalMotion: undefined };
  let raisedStand: ToolPosition | undefined;
  if (tool === 'burette') {
    const rimY = destination[1] + vesselWorldDimensions(vessel).topY;
    const anchorY = rimY - BURETTE_NOZZLE_LOCAL_Y + BURETTE_RIM_CLEARANCE;
    if (anchorY > BURETTE_MAX_ANCHOR_Y) return result(tool, false, 'Bình quá cao so với hành trình nâng buret.');
    raisedStand = constrainBurettePosition([position[0], anchorY, position[2]]);
    const alignment = buretteTargetProblem({ ...vessel, ...patch }, raisedStand);
    if (alignment) return result(tool, false, alignment);
  }
  state.setVesselState(vessel.id, patch);
  const placed = useAppStore.getState().vessels[vessel.id];
  if (!placed || placed.position.some((coordinate, axis) => Math.abs(coordinate - destination[axis]) > 1e-8))
    return result(tool, false, 'Chưa thể đặt bình; mở khóa các bình gắn cùng dụng cụ trước.');
  if (raisedStand) state.updateBurette({ position: raisedStand, isDispensing: false });
  return result(tool, true, tool === 'balance' ? 'Đã đặt bình lên đĩa cân.' : 'Đã căn bình dưới đầu buret.');
}

export function buretteReceiver(): VesselState | null {
  const position = currentInstrumentPosition('burette');
  return findBuretteReceiver(useAppStore.getState().vessels, position);
}

export function dispenseOneBuretteDrop(): InstrumentResult {
  const state = useAppStore.getState();
  if (state.isSimulationPaused) return result('burette', false, 'Tiếp tục mô phỏng trước khi nhả giọt.');
  if (state.draggingVesselId) return result('burette', false, 'Đặt bình nhận yên trên bàn trước khi nhả giọt.');
  if (state.moveMode) return result('burette', false, 'Tắt chế độ di chuyển trước khi nhả.');
  const receiver = buretteReceiver();
  if (!receiver) return result('burette', false, 'Chưa có bình nhận dưới đầu buret.');
  const problem = instrumentTargetProblem('burette', receiver);
  if (problem) return result('burette', false, problem);
  const alignment = buretteTargetProblem(receiver, currentInstrumentPosition('burette'));
  if (alignment) return result('burette', false, alignment);
  const before = state.burette.currentVolume_ml;
  if (before <= 0) return result('burette', false, 'Buret đã hết dung dịch.');
  state.dispenseBuretteDrop(receiver.id);
  const transferred = before - useAppStore.getState().burette.currentVolume_ml;
  return transferred > 0
    ? result('burette', true, `Đã nhả ${transferred.toFixed(3)} mL.`, transferred)
    : result('burette', false, 'Bình nhận đã đầy; không nhả thêm.');
}

export function serviceBurette(action: 'fill' | 'discard', stockId?: BuretteStockId): InstrumentResult {
  const { volume_ml, problem } = useAppStore.getState().serviceBurette(action, stockId);
  if (problem) return result('burette', false, problem);
  return result('burette', true, action === 'fill'
    ? `Đã nạp ${volume_ml.toFixed(2)} mL từ kho mô phỏng.`
    : `Đã thu gom ${volume_ml.toFixed(2)} mL vào chất thải.`, volume_ml);
}

export function setBuretteFlow(flow: number): InstrumentResult {
  if (!Number.isFinite(flow) || flow < 0.1 || flow > 2) return result('burette', false, 'Lưu lượng phải trong khoảng 0,1–2 mL/s.');
  useAppStore.getState().updateBurette({ flowRate_ml_s: flow });
  return result('burette', true, `Lưu lượng mô hình ${flow.toFixed(2)} mL/s.`);
}

export function setBuretteValve(open: boolean): InstrumentResult {
  const state = useAppStore.getState();
  if (open && state.isSimulationPaused) return result('burette', false, 'Tiếp tục mô phỏng trước khi mở khóa buret.');
  if (open && state.draggingVesselId) return result('burette', false, 'Đặt bình nhận yên trên bàn trước khi mở khóa buret.');
  if (open && state.moveMode) return result('burette', false, 'Tắt chế độ di chuyển trước khi mở khóa buret.');
  if (open && (!buretteReceiver() || state.burette.currentVolume_ml <= 0)) {
    return result('burette', false, 'Cần dung dịch trong buret và bình nhận bên dưới.');
  }
  state.updateBurette({ isDispensing: open });
  const applied = useAppStore.getState().burette.isDispensing === open;
  return result('burette', applied, applied ? open ? 'Đã mở khóa buret.' : 'Đã đóng khóa buret.' : 'Chưa thể mở khóa buret.');
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
  if (state.moveMode) return result('spatula', false, 'Tắt chế độ di chuyển trước khi chuyển mẫu.');
  if (state.isSimulationPaused) return result('spatula', false, 'Tiếp tục mô phỏng trước khi chuyển mẫu.');
  if (state.pouringChemical) return result('spatula', false, 'Chờ lần cấp hóa chất hiện tại kết thúc.');
  if (!sample.chemical || !Number.isFinite(sample.mass_g) || sample.mass_g <= 0)
    return result('spatula', false, 'Thìa chưa có lượng hóa chất rắn hợp lệ.');
  if (!state.beginSpatulaDose(vessel.id)) return result('spatula', false, 'Chưa thể chuyển mẫu; mẫu vẫn được giữ trên thìa.');
  state.touchToolChemical('spatula', sample.chemical);
  return result('spatula', true, `Đang chuyển ${sample.mass_g.toFixed(3)} g ${sample.chemical} vào ${vessel.name}.`);
}

export function rinseInstrument(id: 'pipette' | 'stirring_rod' | 'spatula'): InstrumentResult {
  const started = useAppStore.getState().cleanTool(id);
  return result(id, started.ok, started.message);
}

export function cleanAllSpills(): InstrumentResult {
  const state = useAppStore.getState();
  const before = Object.values(state.spills).reduce((sum, spill) => sum + spill.mass_g, 0);
  state.cleanSpills();
  return result('sponge', true, `Đã thu gom ${before.toFixed(3)} g chất tràn vào chất thải.`);
}
