import type {
  LessonCheckpoint,
  LessonCondition,
  LessonDefinition,
  LessonEffect,
  LessonEffectKind,
  LessonTerm,
} from '../types';

export const RSC_ORGANIC = 'https://edu.rsc.org/resources/practical/experiments';
export const RSC_COPPER = 'https://edu.rsc.org/experiments/an-equilibrium-using-copperii-and-ammonia/1711.article';
export const CLEAR = '#f8fafc';

export function term(species: string, coefficient = 1): LessonTerm {
  return { species, coefficient };
}

export function contact(): LessonCondition {
  return { kind: 'mixed', label_vi: 'Cho các chất đầu tiếp xúc.' };
}

export function heating(minimum: number, maximum?: number): LessonCondition {
  return {
    kind: 'temperature',
    label_vi: maximum ? `Giữ trong khoảng ${minimum}–${maximum} °C trong mô hình.` : `Đạt ít nhất ${minimum} °C trong mô hình.`,
    minimum,
    maximum,
  };
}

export function catalyst(value: string): LessonCondition {
  return { kind: 'catalyst', value, label_vi: `Cần xúc tác ${value}.` };
}

export function acidic(): LessonCondition {
  return { kind: 'acidic', maximum: 4, label_vi: 'Cần môi trường axit.' };
}

export function alkaline(): LessonCondition {
  return { kind: 'alkaline', minimum: 10, label_vi: 'Cần môi trường kiềm.' };
}

export function ignition(): LessonCondition {
  return { kind: 'ignition', label_vi: 'Cần nguồn mồi ảo.' };
}

export function oxygen(): LessonCondition {
  return { kind: 'oxygen', label_vi: 'Cần nguồn O2 cho cháy hoàn toàn.' };
}

export function effect(
  kind: LessonEffectKind,
  color: string,
  explanation_vi: string,
  options: Partial<Omit<LessonEffect, 'kind' | 'color' | 'explanation_vi'>> = {},
): LessonEffect {
  return {
    kind,
    color,
    explanation_vi,
    location: 'bulk',
    onset: 0,
    peak: 0.5,
    end: 1,
    persists: ['color', 'precipitation', 'deposition', 'phase_separation', 'dissolution'].includes(kind),
    ...options,
  };
}

export function checkpoints(
  preparation: string,
  contactInstruction: string,
  observation: string,
  conclusion: string,
): LessonCheckpoint[] {
  return [
    { id: 'prepare', title_vi: 'Chuẩn bị mẫu ảo', instruction_vi: preparation, observation_vi: 'Các mẫu chưa tiếp xúc.', progress: 0 },
    { id: 'contact', title_vi: 'Thiết lập điều kiện', instruction_vi: contactInstruction, observation_vi: 'Kiểm tra đủ điều kiện trước khi phản ứng tiến triển.', progress: 0.02 },
    { id: 'observe', title_vi: 'Theo dõi diễn biến', instruction_vi: observation, observation_vi: observation, progress: 0.3 },
    { id: 'conclude', title_vi: 'Đối chiếu sản phẩm', instruction_vi: conclusion, observation_vi: conclusion, progress: 0.95 },
  ];
}

type DefinitionInput = Omit<LessonDefinition,
  'duration_s' | 'model' | 'initialColor' | 'finalColor' | 'finalTurbidity' |
  'physicalTime_vi' | 'sources' | 'safety_vi'> & Partial<Pick<LessonDefinition,
  'duration_s' | 'model' | 'initialColor' | 'finalColor' | 'finalTurbidity' |
  'physicalTime_vi' | 'sources' | 'safety_vi'>>;

export function defineLesson(input: DefinitionInput): LessonDefinition {
  return {
    duration_s: 18,
    model: 'mixing_limited',
    initialColor: CLEAR,
    finalColor: CLEAR,
    finalTurbidity: 0,
    physicalTime_vi: 'Thời gian diễn biến được rút gọn để học tập, chưa hiệu chuẩn thực nghiệm.',
    sources: [RSC_ORGANIC],
    safety_vi: 'Mẫu và điều kiện trong bài này chỉ dùng cho mô phỏng; không thay thế quy trình thực hành do giáo viên thẩm định.',
    ...input,
  };
}
