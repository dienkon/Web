import { PhaseId, PhaseDefinition } from '../types';

export const PhaseRegistry: Record<PhaseId, PhaseDefinition> = {
  phase_5: { id: 'phase_5', title: 'Thực hành tình huống' },
  phase_4: { id: 'phase_4', title: 'An toàn nâng cao' },
  phase_1: { id: 'phase_1', title: 'Giai đoạn 1: Chuẩn bị bảo hộ' },
  phase_2: { id: 'phase_2', title: 'Giai đoạn 2: Nhận diện nguy hiểm' },
  phase_3: { id: 'phase_3', title: 'Giai đoạn 3: Xử lý sự cố' }
};
