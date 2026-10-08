import { MistakeId, MistakeDefinition } from '../types';

export const MistakeRegistry: Record<MistakeId, MistakeDefinition> = {
  ppe_missing: { id: 'ppe_missing', title: 'Thiếu trang bị bảo hộ', penalty: 10, consequence: 'Bạn chưa trang bị đầy đủ PPE.' },
  wrong_trash: { id: 'wrong_trash', title: 'Vứt rác sai quy định', penalty: 15, consequence: 'Phân loại rác sai có thể gây phản ứng nguy hiểm.' },
  glass_hazard: { id: 'glass_hazard', title: 'Nguy hiểm thủy tinh vỡ', penalty: 15, consequence: 'Thủy tinh vỡ có thể gây thương tích sắc nhọn.' },
  spill_hazard: { id: 'spill_hazard', title: 'Xử lý hóa chất đổ tràn sai', penalty: 20, consequence: 'Không trung hòa hóa chất trước khi lau sẽ gây ăn mòn.' },
  fire_hazard: { id: 'fire_hazard', title: 'Quy trình chữa cháy sai', penalty: 20, consequence: 'Làm đám cháy bùng to hoặc gây ngạt khí.' },
  general_error: { id: 'general_error', title: 'Lỗi quy trình', penalty: 5, consequence: 'Hành vi vi phạm quy định an toàn phòng lab!' },
  WRONG_EXTINGUISHER: { id: 'WRONG_EXTINGUISHER', title: 'Dùng nước dập đám cháy xăng/cồn (Lửa B)', penalty: 30, consequence: 'Nước làm chất lỏng cháy bắn tung tóe và lan rộng khắp bàn!' },
  WRONG_EXTINGUISHER_ELECTRICAL: { id: 'WRONG_EXTINGUISHER_ELECTRICAL', title: 'Dùng nước dập thiết bị điện đang cắm (Lửa C)', penalty: 30, consequence: 'Nước dẫn điện gây nguy cơ giật điện chết người!' },
  NO_PIN_PULLED: { id: 'NO_PIN_PULLED', title: 'Chưa rút chốt an toàn (Pull)', penalty: 5, consequence: 'Bình chữa cháy bị khóa chốt kẹp chì, bóp cò không phun được.' },
  AIM_AT_FLAME_NOT_BASE: { id: 'AIM_AT_FLAME_NOT_BASE', title: 'Phun vào ngọn lửa thay vì gốc lửa (Aim)', penalty: 10, consequence: 'Phun vào ngọn lửa làm tốn khí/bột mà không dập được nguồn nhiên liệu.' },
  BAD_DISTANCE: { id: 'BAD_DISTANCE', title: 'Khoảng cách đứng chữa cháy không an toàn', penalty: 10, consequence: 'Đứng quá gần có nguy cơ bỏng nhiệt, quá xa thì chất chữa cháy không tới được.' },
  NO_ALARM: { id: 'NO_ALARM', title: 'Chưa báo động/kêu cứu trước khi chữa cháy', penalty: 15, consequence: 'Cần hô hoán và kích hoạt báo cháy để mọi người kịp thời sơ tán.' },
  LOST_EXIT_PATH: { id: 'LOST_EXIT_PATH', title: 'Mất lối thoát hiểm sau lưng', penalty: 20, consequence: 'Luôn giữ lối thoát hiểm ở sau lưng để có thể rút lui an toàn nếu lửa lan.' },
  FIGHT_FIRE_TOO_LATE: { id: 'FIGHT_FIRE_TOO_LATE', title: 'Cố chữa đám cháy đã quá lớn / khói dày', penalty: 30, consequence: 'Lửa đã vượt tầm kiểm soát, bắt buộc phải sơ tán khẩn cấp!' },
  TOUCH_CO2_HORN: { id: 'TOUCH_CO2_HORN', title: 'Cầm vào loa phun bình CO2', penalty: 10, consequence: 'Khí CO2 thoát ra cực lạnh (-78.5°C) gây bỏng lạnh nặng!' }
};
