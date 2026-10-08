import { PhaseId, PhaseDefinition } from '../types';

export const PhaseRegistry: Record<PhaseId, PhaseDefinition> = {
  phase_1: { id: 'phase_1', title: 'Giai đoạn 1: Chuẩn bị bảo hộ' },
  phase_2: { id: 'phase_2', title: 'Giai đoạn 2: Nhận diện nguy hiểm' },
  phase_3: { id: 'phase_3', title: 'Giai đoạn 3: Xử lý sự cố' }
};
