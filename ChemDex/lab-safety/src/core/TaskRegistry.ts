import { TaskId, TaskDefinition } from '../types';

export const TaskRegistry: Record<TaskId, TaskDefinition> = {
  task_talk: { id: 'task_talk', titleKey: 'Nói chuyện với thầy giáo', prerequisites: [], target: { type: 'npc', value: 'teacher' }, completion: { condition: 'talked', auto: true } },
  task_rules: { id: 'task_rules', titleKey: 'Đọc bảng nội quy (100 điều)', prerequisites: ['task_talk'], target: { type: 'board', value: 'rules' }, completion: { condition: 'read', auto: true } },
  task_goggles: { id: 'task_goggles', titleKey: 'Trang bị kính bảo hộ', prerequisites: ['task_rules'], target: { type: 'equip', value: 'goggles' }, completion: { condition: 'equipped', auto: true } },
  task_coat: { id: 'task_coat', titleKey: 'Mặc áo blouse trắng', prerequisites: ['task_rules'], target: { type: 'equip', value: 'coat' }, completion: { condition: 'equipped', auto: true } },
  task_gloves: { id: 'task_gloves', titleKey: 'Đeo găng tay bảo hộ', prerequisites: ['task_rules'], target: { type: 'equip', value: 'gloves' }, completion: { condition: 'equipped', auto: true } },
  task_mask: { id: 'task_mask', titleKey: 'Đeo khẩu trang phòng độc', prerequisites: ['task_rules'], target: { type: 'equip', value: 'mask' }, completion: { condition: 'equipped', auto: true } },
  task_hair: { id: 'task_hair', titleKey: 'Buộc tóc gọn gàng trước gương', prerequisites: ['task_rules'], target: { type: 'action', value: 'hair' }, completion: { condition: 'done', auto: true } },
  task_shoes: { id: 'task_shoes', titleKey: 'Kiểm tra giày kín mũi tại thảm', prerequisites: ['task_rules'], target: { type: 'action', value: 'shoes' }, completion: { condition: 'done', auto: true } },
  
  task_fire_extinguisher: { id: 'task_fire_extinguisher', titleKey: 'Tìm hiểu cách dùng bình cứu hỏa', prerequisites: [], target: { type: 'learn', value: 'fire_extinguisher' }, completion: { condition: 'done', auto: true } },
  task_chemical_symbols: { id: 'task_chemical_symbols', titleKey: 'Phân biệt biểu tượng cảnh báo hóa chất', prerequisites: [], target: { type: 'learn', value: 'chemical_symbols' }, completion: { condition: 'done', auto: true } },
  task_inspect_acid: { id: 'task_inspect_acid', titleKey: 'Tìm hiểu cách pha loãng Axit', prerequisites: [], target: { type: 'learn', value: 'acid' }, completion: { condition: 'done', auto: true } },
  task_bandage: { id: 'task_bandage', titleKey: 'Quấn băng gạc sơ cứu vết thương', prerequisites: [], target: { type: 'learn', value: 'bandage' }, completion: { condition: 'done', auto: true } },
  
  task_spill_kit: { id: 'task_spill_kit', titleKey: 'Lấy bột trung hòa từ Spill Kit', prerequisites: [], target: { type: 'action', value: 'spill_kit' }, completion: { condition: 'done', auto: true } },
  task_spill_neutralize: { id: 'task_spill_neutralize', titleKey: 'Trung hòa vũng hóa chất', prerequisites: ['task_spill_kit'], target: { type: 'action', value: 'neutralize' }, completion: { condition: 'done', auto: true } },
  task_spill_wipe: { id: 'task_spill_wipe', titleKey: 'Lau dọn sạch vũng hóa chất', prerequisites: ['task_spill_neutralize'], target: { type: 'action', value: 'wipe' }, completion: { condition: 'done', auto: true } },
  task_trash_disposal: { id: 'task_trash_disposal', titleKey: 'Thu gom rác thải hóa chất nguy hại (0/3)', prerequisites: [], target: { type: 'action', value: 'trash' }, completion: { condition: 'done', auto: true } }
};
