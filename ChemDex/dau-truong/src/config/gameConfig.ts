// src/config/gameConfig.ts
// Cấu hình tập trung cho toàn bộ hệ thống trò chơi, thời gian, điểm số và luật chơi

export type GameKind = 'balance' | 'fill_blank' | 'compound_name' | 'element_quiz' | 'oxidation_state'
  | 'mol_calc' | 'substance_match' | 'solution_ph' | 'organic_reactions' | 'experiment_lab'
  | 'mixed' | 'ranked_mixed';

export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'random';

export interface TimeConfig {
  easy: number;
  medium: number;
  hard: number;
}

/**
 * Bảng thời gian chuẩn (giây) theo độ khó cho từng loại trò chơi Hóa học.
 * Được thiết kế khoa học: câu hỏi tính toán và phản ứng phức tạp có thời gian dài hơn.
 */
export const GAME_TIME_LIMITS: Record<string, TimeConfig> = {
  balance: { easy: 25, medium: 35, hard: 50 },
  fill_blank: { easy: 25, medium: 35, hard: 50 },
  compound_name: { easy: 20, medium: 30, hard: 40 },
  element_quiz: { easy: 18, medium: 24, hard: 32 },
  oxidation_state: { easy: 20, medium: 30, hard: 40 },
  mol_calc: { easy: 25, medium: 40, hard: 60 },
  substance_match: { easy: 25, medium: 35, hard: 45 },
  solution_ph: { easy: 20, medium: 30, hard: 45 },
  organic_reactions: { easy: 25, medium: 35, hard: 50 },
  experiment_lab: { easy: 20, medium: 30, hard: 45 },
  default: { easy: 20, medium: 30, hard: 40 },
};

/**
 * Bảng thời gian dành cho phòng ghép đấu (Multiplayer Match Room)
 * Quy định nghiêm ngặt: Min 45s, Max 2 phút (120s) tùy theo độ khó và loại trò chơi Hóa học.
 * - Dễ (Easy): 45s (sàn tối thiểu)
 * - Vừa (Medium): 60s - 75s
 * - Khó (Hard): 90s - 120s (trần tối đa 2 phút cho các bài phức tạp)
 */
export const ROOM_TIME_LIMITS: Record<string, TimeConfig> = {
  balance: { easy: 45, medium: 75, hard: 120 },       // Cân bằng redox nhiều chất cần thời gian tính toán
  fill_blank: { easy: 45, medium: 65, hard: 100 },
  compound_name: { easy: 45, medium: 60, hard: 90 },
  element_quiz: { easy: 45, medium: 60, hard: 80 },
  oxidation_state: { easy: 45, medium: 65, hard: 95 },
  mol_calc: { easy: 50, medium: 80, hard: 120 },      // Tính toán số mol / nồng độ dung dịch
  substance_match: { easy: 45, medium: 65, hard: 90 },
  solution_ph: { easy: 45, medium: 60, hard: 85 },
  organic_reactions: { easy: 45, medium: 70, hard: 100 },
  experiment_lab: { easy: 45, medium: 60, hard: 85 },
  default: { easy: 45, medium: 70, hard: 110 },
};

/**
 * Tính toán thời gian cho câu hỏi trong phòng ghép đấu (Multiplayer Room)
 * Đảm bảo: MIN 45 GIÂY, MAX 120 GIÂY (2 PHÚT).
 */
export function getRoomQuestionTimeLimit(mode: string, difficulty: string, promptText?: string): number {
  const diff = (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') ? difficulty : 'medium';
  const table = ROOM_TIME_LIMITS[mode] || ROOM_TIME_LIMITS.default;
  let time = table[diff];

  // Nếu đề bài dài (nhiều chất hoặc bài toán tự luận), bù thêm thời gian đọc đề
  if (promptText && promptText.length > 80) {
    const extraChars = promptText.length - 80;
    const extraSec = Math.round((extraChars / 100) * 2);
    time += extraSec;
  }

  // Khóa cứng trong khoảng [45s, 120s] theo đúng yêu cầu đề bài
  return Math.min(120, Math.max(45, time));
}

/**
 * Các tùy chọn thời gian custom dành cho chế độ LUYỆN TẬP SOLO
 */
export const PRACTICE_TIME_OPTIONS = [
  { value: 0, label: 'Không giới hạn (∞)', desc: 'Thư giãn, không tính giờ' },
  { value: 30, label: '30 giây', desc: 'Rèn phản xạ nhanh' },
  { value: 45, label: '45 giây', desc: 'Tiêu chuẩn thi đấu' },
  { value: 60, label: '60 giây', desc: 'Thong thả suy nghĩ' },
  { value: 90, label: '90 giây', desc: 'Bài toán mức độ vừa' },
  { value: 120, label: '2 phút (120s)', desc: 'Cho bài toán khó' },
  { value: 180, label: '3 phút (180s)', desc: 'Nghiên cứu kỹ lưỡng' },
] as const;

/**
 * Tính toán thời gian cho một câu hỏi cụ thể (luyện tập hoặc mặc định):
 * Tự động cộng thêm 1.5s cho mỗi 100 ký tự vượt quá 80 ký tự trong đề bài.
 */
export function calculateQuestionTimeLimit(mode: string, difficulty: string, promptText?: string): number {
  const diff = (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') ? difficulty : 'medium';
  const table = GAME_TIME_LIMITS[mode] || GAME_TIME_LIMITS.default;
  let baseTime = table[diff];

  if (promptText && promptText.length > 80) {
    const extraChars = promptText.length - 80;
    const extraSec = Math.round((extraChars / 100) * 1.5);
    baseTime += extraSec;
  }

  return baseTime;
}

/**
 * Hệ số điểm cơ sở theo độ khó
 */
export const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

/**
 * Cấu hình hệ thống điểm công bằng & động lực chơi:
 */
export const SCORING_RULES = {
  // Điểm tối đa trên thang chuẩn hóa cho mỗi trận hoàn hảo
  MAX_MATCH_POINTS: 100,
  // Tỷ lệ sàn tốc độ: dù nộp ở giây cuối cùng vẫn nhận tối thiểu 70% điểm cơ sở
  SPEED_FLOOR_RATIO: 0.70,
  // Tỷ lệ dốc tốc độ: 30% điểm biến thiên liên tục theo (thời gian còn lại / tổng thời gian)
  SPEED_SLOPE_RATIO: 0.30,
  // Thưởng người trả lời đúng đầu tiên trong phòng (+20% điểm cơ sở)
  FIRST_SOLVER_BONUS: 0.20,
  // Thưởng chuỗi đúng (streak) từ 3 câu liên tiếp trở lên: +10% mỗi câu, tối đa +30%
  STREAK_BONUS_STEP: 0.10,
  STREAK_BONUS_MAX: 0.30,
  MIN_STREAK_FOR_BONUS: 3,
  // Điểm cho đáp án đúng nhưng hệ số nhân bội (VD 4:2:4 thay vì 2:1:2 trong cân bằng)
  PARTIAL_RATIO_FACTOR: 0.50,
};

/**
 * Tính toán thời gian màn nghỉ giữa các vòng (giây):
 * Tự động điều chỉnh theo độ dài lời giải: clamp(4 + len/20, 5, 12)
 */
export function calculateBreakDuration(explanation?: string): number {
  if (!explanation) return 5;
  const raw = 4 + explanation.length / 20;
  return Math.min(12, Math.max(5, Math.round(raw)));
}

/**
 * Cấu hình các trợ giúp (Power-ups) có thể dùng trong trận đấu
 */
export interface PowerUpConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  penaltyRatio: number; // Tỷ lệ trừ điểm nếu sử dụng (VD 0.30 = trừ 30%)
  maxUsesPerMatch: number;
}

export const POWER_UPS: Record<string, PowerUpConfig> = {
  fifty_fifty: {
    id: 'fifty_fifty',
    name: '50 : 50',
    description: 'Loại bỏ 2 đáp án sai trong câu hỏi trắc nghiệm',
    icon: 'Sparkles',
    penaltyRatio: 0.25,
    maxUsesPerMatch: 1,
  },
  first_letter_hint: {
    id: 'first_letter_hint',
    name: 'Gợi ý chữ đầu',
    description: 'Hiện ký tự gợi ý đầu tiên của đáp án cần điền',
    icon: 'Lightbulb',
    penaltyRatio: 0.30,
    maxUsesPerMatch: 1,
  },
  extra_time: {
    id: 'extra_time',
    name: '+10 Giây',
    description: 'Cộng thêm 10 giây làm bài cho câu hiện tại',
    icon: 'Timer',
    penaltyRatio: 0.30,
    maxUsesPerMatch: 1,
  },
};
