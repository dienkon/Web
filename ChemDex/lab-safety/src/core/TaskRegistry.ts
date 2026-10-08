import { Task } from '../types';

export const TaskRegistry: Record<string, Task> = {
  task_talk: { id: 'task_talk', title: 'Nói chuyện với thầy giáo', completed: false, type: 'action', phase: 1 },
  task_rules: { id: 'task_rules', title: 'Đọc bảng nội quy (100 điều)', completed: false, type: 'learn', phase: 1 },
  task_goggles: { id: 'task_goggles', title: 'Trang bị kính bảo hộ', completed: false, type: 'equip', phase: 1 },
  task_coat: { id: 'task_coat', title: 'Mặc áo blouse trắng', completed: false, type: 'equip', phase: 1 },
  task_gloves: { id: 'task_gloves', title: 'Đeo găng tay bảo hộ', completed: false, type: 'equip', phase: 1 },
  task_mask: { id: 'task_mask', title: 'Đeo khẩu trang phòng độc', completed: false, type: 'equip', phase: 1 },
  task_hair: { id: 'task_hair', title: 'Buộc tóc gọn gàng trước gương', completed: false, type: 'action', phase: 1 },
  task_shoes: { id: 'task_shoes', title: 'Kiểm tra giày kín mũi tại thảm', completed: false, type: 'action', phase: 1 },
  
  task_fire_extinguisher: { id: 'task_fire_extinguisher', title: 'Tìm hiểu cách dùng bình cứu hỏa', completed: false, type: 'learn', phase: 2 },
  task_chemical_symbols: { id: 'task_chemical_symbols', title: 'Phân biệt biểu tượng cảnh báo hóa chất', completed: false, type: 'learn', phase: 2 },
  task_inspect_acid: { id: 'task_inspect_acid', title: 'Tìm hiểu cách pha loãng Axit', completed: false, type: 'learn', phase: 2 },
  task_bandage: { id: 'task_bandage', title: 'Quấn băng gạc sơ cứu vết thương', completed: false, type: 'learn', phase: 2 },
  
  task_spill_kit: { id: 'task_spill_kit', title: 'Lấy bột trung hòa từ Spill Kit', completed: false, type: 'action', phase: 3 },
  task_spill_neutralize: { id: 'task_spill_neutralize', title: 'Trung hòa vũng hóa chất', completed: false, type: 'action', phase: 3 },
  task_spill_wipe: { id: 'task_spill_wipe', title: 'Lau dọn sạch vũng hóa chất', completed: false, type: 'action', phase: 3 },
  task_trash_disposal: { id: 'task_trash_disposal', title: 'Thu gom rác thải hóa chất nguy hại (0/3)', completed: false, type: 'action', phase: 3 },
};

export const getAllTasks = (): Task[] => Object.values(TaskRegistry);
