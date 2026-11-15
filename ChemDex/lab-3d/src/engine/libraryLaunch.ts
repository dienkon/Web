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
