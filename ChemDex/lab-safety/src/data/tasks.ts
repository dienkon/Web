import { LAB_SCENARIOS } from '../scenarios/catalog';
import { Task } from '../types';

export const INITIAL_TASKS: Task[] = [
  { id: 'task_alcohol_cap', title: 'Thực hành đậy nắp dập đèn cồn', completed: false, type: 'action', phase: 4 },
  { id: 'task_talk', title: 'Nói chuyện với thầy giáo', completed: false, type: 'action' },
  { id: 'task_rules', title: 'Đọc bảng nội quy (100 điều)', completed: false, type: 'learn' },
  { id: 'task_goggles', title: 'Trang bị kính bảo hộ', completed: false, type: 'equip' },
  { id: 'task_coat', title: 'Mặc áo blouse trắng', completed: false, type: 'equip' },
  { id: 'task_gloves', title: 'Đeo găng tay bảo hộ', completed: false, type: 'equip' },
  { id: 'task_mask', title: 'Đeo khẩu trang phòng độc', completed: false, type: 'equip' },
  { id: 'task_hair', title: 'Buộc tóc gọn gàng trước gương', completed: false, type: 'action' },
  { id: 'task_shoes', title: 'Kiểm tra giày kín mũi tại thảm', completed: false, type: 'action' },
  { id: 'task_fire_extinguisher', title: 'Tìm hiểu cách dùng bình cứu hỏa', completed: false, type: 'learn' },
  { id: 'task_chemical_symbols', title: 'Phân biệt biểu tượng cảnh báo hóa chất', completed: false, type: 'learn' },
  { id: 'task_inspect_acid', title: 'Tìm hiểu cách pha loãng Axit', completed: false, type: 'learn' },
  { id: 'task_bandage', title: 'Quấn băng gạc sơ cứu vết thương', completed: false, type: 'learn' },
  { id: 'task_spill_kit', title: 'Lấy bột trung hòa từ Spill Kit', completed: false, type: 'action' },
  { id: 'task_spill_neutralize', title: 'Trung hòa vũng hóa chất', completed: false, type: 'action' },
  { id: 'task_spill_wipe', title: 'Lau dọn sạch vũng hóa chất', completed: false, type: 'action' },
  { id: 'task_trash_disposal', title: 'Thu gom và phân loại 4 mẫu chất thải', completed: false, type: 'action' },
  { id: 'task_electrical_safety', title: 'Vòng 4 · An toàn điện khi có nước', completed: false, type: 'action', phase: 4 },
  { id: 'task_fume_safety', title: 'Vòng 5 · Hơi hóa chất và tủ hút', completed: false, type: 'action', phase: 4 },
  { id: 'task_evacuation', title: 'Vòng 6 · Báo động và sơ tán', completed: false, type: 'action', phase: 4 },
  ...LAB_SCENARIOS.map(s => ({ id: s.taskId, title: `Vòng ${s.number} · ${s.title}`, completed: false, type: 'action' as const, phase: 5 })),
];


