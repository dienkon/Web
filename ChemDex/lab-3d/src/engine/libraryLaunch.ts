import { useAppStore } from '../store/useAppStore';
import { getProgramById } from '../vfx/programs/library';
import { LESSON_PROGRAM_IDS } from '../lesson/programCompiler';

export function libraryProgram(programId: string) {
  const program = getProgramById(programId);
  return program && !LESSON_PROGRAM_IDS.has(program.id) && program.chemistry.representation !== 'emission' ? program : null;
}

export type LibraryLaunchResult = {
  status: 'running' | 'conditions' | 'error';
  vesselId?: string;
  message: string;
};

/** Continue the existing prepared specimen after its conditions were changed.
 * The ignition action still checks for a real nearby burning source; this
 * control never replaces temperature, catalyst or finite reagent checks. */
export function continueLibraryProgram(vesselId: string): LibraryLaunchResult {
  const state = useAppStore.getState(), vessel = state.vessels[vesselId];
  const program = vessel?.studioProgramId && libraryProgram(vessel.studioProgramId);
  if (!vessel || vessel.isShattered || !program)
    return { status: 'error', message: 'Chọn mẫu đã chuẩn bị còn nguyên vẹn để chạy.' };
  if (state.activeKinetics[vesselId])
    return { status: 'conditions', vesselId, message: 'Mẫu này đang phản ứng.' };
  if (state.draggingVesselId === vesselId || state.pouringChemical?.targetId === vesselId
    || state.inFlightPours.some(parcel => parcel.targetId === vesselId || parcel.sourceId === vesselId)
    || state.instrumentRinse?.bottleId === vesselId || state.isMixing || state.isPouring)
    return { status: 'conditions', vesselId, message: 'Chờ thao tác chuyển mẫu kết thúc trước khi chạy.' };
  const started = program.chemistry.conditions?.activation === 'ignition'
    ? state.igniteStudioSample(vesselId) : state.runStudioProgram(vesselId);
  if (started) useAppStore.getState().setSimulationPaused(false);
  return { status: started ? 'running' : 'conditions', vesselId,
    message: started ? 'Đã bắt đầu phản ứng trong bình mẫu hiện tại.'
      : useAppStore.getState().globalWarning ?? 'Mẫu chưa đủ điều kiện để bắt đầu phản ứng.' };
}

/** A library click creates a separate finite specimen. It never replaces the
 * selected vessel and resolves entirely from the bundled program library. */
export function launchLibraryProgram(programId: string): LibraryLaunchResult {
  if (!libraryProgram(programId)) return { status: 'error', message: 'Mục này chưa có mẫu chạy trực tiếp trên bàn.' };
  const vesselId = useAppStore.getState().prepareStudioProgram(programId);
  if (!vesselId) return { status: 'error', message: useAppStore.getState().mixError
    ?? useAppStore.getState().globalWarning ?? 'Không thể đặt thêm mẫu lên bàn.' };
  const started = useAppStore.getState().runStudioProgram(vesselId);
  const conditions = useAppStore.getState().globalWarning;
  useAppStore.getState().focusVessel(vesselId);
  useAppStore.setState({ selectedVesselId: vesselId, leftSidebarOpen: false, rightSidebarOpen: !started,
    ...(started ? { isSimulationPaused: false } : {}) });
  return {
    status: started ? 'running' : 'conditions', vesselId,
    message: started ? 'Đã tạo mẫu phối sẵn trong bình mới và bắt đầu phản ứng. Bạn có thể khuấy, rót và quan sát trên bàn.'
      : `Đã chuẩn bị mẫu trong bình mới. ${conditions ?? 'Cần thiết lập thêm điều kiện trước khi chạy.'}`,
  };
}
