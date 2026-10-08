import { MistakeId, MistakeDefinition } from '../types';

export const MistakeRegistry: Record<MistakeId, MistakeDefinition> = {
  ppe_missing: { id: 'ppe_missing', title: 'Thiếu trang bị bảo hộ', penalty: 10, consequence: 'Bạn chưa trang bị đầy đủ PPE.' },
  wrong_trash: { id: 'wrong_trash', title: 'Vứt rác sai quy định', penalty: 15, consequence: 'Phân loại rác sai có thể gây phản ứng nguy hiểm.' },
  glass_hazard: { id: 'glass_hazard', title: 'Nguy hiểm thủy tinh vỡ', penalty: 15, consequence: 'Thủy tinh vỡ có thể gây thương tích sắc nhọn.' },
  spill_hazard: { id: 'spill_hazard', title: 'Xử lý hóa chất đổ tràn sai', penalty: 20, consequence: 'Không trung hòa hóa chất trước khi lau sẽ gây ăn mòn.' },
  fire_hazard: { id: 'fire_hazard', title: 'Quy trình chữa cháy sai', penalty: 20, consequence: 'Làm đám cháy bùng to hoặc gây ngạt khí.' },
  general_error: { id: 'general_error', title: 'Lỗi quy trình', penalty: 5, consequence: 'Hành vi vi phạm quy định an toàn phòng lab!' }
};
