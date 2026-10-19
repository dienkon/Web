// src/games/registry.ts
// Bộ đăng ký trò chơi tập trung (Game Module Registry)

import { GameModuleInfo } from './types';
import { GAME_TIME_LIMITS } from '../config/gameConfig';
import { isAnswerAcceptable, normalizeChemicalText } from '../data/vietnameseNames';
import { checkNumericAnswer } from '../data/stemGenerators';
export { checkNumericAnswer };

/**
 * Kiểm tra câu trả lời cân bằng phương trình:
 * Hỗ trợ bộ hệ số tối giản (đúng hoàn toàn) hoặc bộ hệ số nhân tỉ lệ (đúng một phần)
 */
export function validateBalanceAnswer(question: any, userAnswer: any): { isCorrect: boolean; isPartialRatio: boolean } {
  if (!question || !userAnswer) return { isCorrect: false, isPartialRatio: false };

  const userCoeffs = Array.isArray(userAnswer)
    ? userAnswer.map((x: any) => parseInt(String(x).trim(), 10))
    : String(userAnswer).split(/[\s,:]+/).map(x => parseInt(x.trim(), 10));

  const standardAnswers = question.answers || question.acceptedAnswers?.map((x: string) => parseInt(x, 10));
  if (!standardAnswers || standardAnswers.length === 0 || userCoeffs.length !== standardAnswers.length) {
    return { isCorrect: false, isPartialRatio: false };
  }

  // 1. Kiểm tra khớp chính xác từng hệ số
  const isExact = standardAnswers.every((val: number, idx: number) => val === userCoeffs[idx]);
  if (isExact) {
    return { isCorrect: true, isPartialRatio: false };
  }

  // 2. Kiểm tra tỉ lệ nhân bội (VD 4:2:4 thay vì 2:1:2)
  if (userCoeffs.every((c: number) => !isNaN(c) && c > 0)) {
    const ratio = userCoeffs[0] / standardAnswers[0];
    if (ratio > 0 && Math.abs(ratio - Math.round(ratio)) < 1e-6) {
      const isProportional = standardAnswers.every((val: number, idx: number) => {
        return Math.abs(userCoeffs[idx] - val * ratio) < 1e-6;
      });
      if (isProportional) {
        return { isCorrect: true, isPartialRatio: true };
      }
    }
  }

  return { isCorrect: false, isPartialRatio: false };
}

/**
 * Kiểm tra số oxi hóa (bắt buộc có dấu + hoặc - rõ ràng, riêng 0 là "0")
 */
export function validateOxidationStateAnswer(question: any, userAnswer: any): boolean {
  if (!userAnswer) return false;
  let str = String(userAnswer).trim().toLowerCase();
  str = str.replace(/[\(\)]/g, ''); // Bỏ dấu ngoặc nếu có: (+2) -> +2

  const accepted = (question.acceptedAnswers || []).map((x: string) => String(x).trim().toLowerCase());
  if (accepted.includes(str)) return true;

  // Nếu người dùng nhập "0" cho số oxi hóa 0
  if ((str === '0' || str === '+0' || str === '-0') && accepted.some((a: string) => a === '0' || a === '+0')) {
    return true;
  }

  return false;
}

/**
 * Danh sách Module của tất cả các minigame trong hệ thống
 */
export const GAME_REGISTRY: Record<string, GameModuleInfo> = {
  balance: {
    id: 'balance',
    name: 'Cân Bằng PTHH',
    shortName: 'Cân bằng',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 9, 10],
    icon: 'Scale',
    badgeColor: 'amber',
    description: 'Điền hệ số nguyên tối giản để cân bằng số lượng nguyên tử ở hai vế.',
    inputType: 'coefficients',
    timeConfig: GAME_TIME_LIMITS.balance,
    validateAnswer: (question, answer) => validateBalanceAnswer(question, answer).isCorrect,
  },

  fill_blank: {
    id: 'fill_blank',
    name: 'Điền Khuyết PTHH',
    shortName: 'Điền khuyết',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 9, 10, 11],
    icon: 'Edit3',
    badgeColor: 'blue',
    description: 'Dự đoán sản phẩm hoặc chất tham gia còn thiếu tại ô trống ___.',
    inputType: 'text',
    timeConfig: GAME_TIME_LIMITS.fill_blank,
    validateAnswer: (question, answer) => {
      if (!answer) return false;
      const cleanUser = normalizeChemicalText(String(answer));
      const accepted = (question.acceptedAnswers || []).map((a: string) => normalizeChemicalText(a));
      return accepted.includes(cleanUser);
    },
  },

  compound_name: {
    id: 'compound_name',
    name: 'Danh Pháp Hợp Chất',
    shortName: 'Gọi tên',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 9, 10, 11, 12],
    icon: 'BookOpen',
    badgeColor: 'emerald',
    description: 'Gọi tên hợp chất theo IUPAC quốc tế hoặc danh pháp SGK tiếng Việt.',
    inputType: 'text',
    timeConfig: GAME_TIME_LIMITS.compound_name,
    validateAnswer: (question, answer) => {
      if (!answer) return false;
      return isAnswerAcceptable(String(answer), question.acceptedAnswers || [], question.equation);
    },
  },

  element_quiz: {
    id: 'element_quiz',
    name: 'Đoán Nguyên Tố',
    shortName: 'Nguyên tố',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 10],
    icon: 'Atom',
    badgeColor: 'purple',
    description: 'Đoán ký hiệu hóa học hoặc tên nguyên tố theo gợi ý chu kỳ, nhóm, Z.',
    inputType: 'text',
    timeConfig: GAME_TIME_LIMITS.element_quiz,
    validateAnswer: (question, answer) => {
      if (!answer) return false;
      return isAnswerAcceptable(String(answer), question.acceptedAnswers || []);
    },
  },

  oxidation_state: {
    id: 'oxidation_state',
    name: 'Số Oxi Hóa',
    shortName: 'Số oxi hóa',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [10],
    icon: 'Zap',
    badgeColor: 'rose',
    description: 'Xác định số oxi hóa của nguyên tố trong hợp chất hoặc ion.',
    inputType: 'text',
    timeConfig: GAME_TIME_LIMITS.oxidation_state,
    validateAnswer: (question, answer) => validateOxidationStateAnswer(question, answer),
  },

  mol_calc: {
    id: 'mol_calc',
    name: 'Tính Toán Hóa Học',
    shortName: 'Tính mol',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 9, 10],
    icon: 'FlaskConical',
    badgeColor: 'cyan',
    description: 'Tính số mol, khối lượng mol, thể tích khí, nồng độ C%, CM, tính theo PTHH.',
    inputType: 'number',
    timeConfig: GAME_TIME_LIMITS.mol_calc,
    validateAnswer: (question, answer) => {
      return checkNumericAnswer(String(answer), question.acceptedAnswers || [], question.correctValue, question.tolerance || 0.1);
    },
  },

  substance_match: {
    id: 'substance_match',
    name: 'Nhận Biết & Ứng Dụng Hóa Chất',
    shortName: 'Nhận biết chất',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 9, 10, 11, 12],
    icon: 'CheckSquare',
    badgeColor: 'fuchsia',
    description: 'Dùng thuốc thử đặc trưng nhận biết các ion, chất khí và liên hệ ứng dụng hóa chất thực tế.',
    inputType: 'choice',
    timeConfig: GAME_TIME_LIMITS.substance_match,
    validateAnswer: (question, answer) => {
      if (!answer) return false;
      const clean = String(answer).trim().toLowerCase();
      const accepted = (question.acceptedAnswers || []).map((x: string) => String(x).trim().toLowerCase());
      return accepted.includes(clean);
    },
  },

  solution_ph: {
    id: 'solution_ph',
    name: 'Dung Dịch, Axit - Bazơ & Độ pH',
    shortName: 'Dung dịch & pH',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 11],
    icon: 'Activity',
    badgeColor: 'violet',
    description: 'Môi trường axit, bazơ, trung tính, đổi màu chất chỉ thị quỳ tím/phenolphtalein và tính toán độ pH.',
    inputType: 'choice',
    timeConfig: GAME_TIME_LIMITS.solution_ph,
    validateAnswer: (question, answer) => {
      if (!answer) return false;
      const clean = String(answer).trim().toLowerCase();
      const accepted = (question.acceptedAnswers || []).map((x: string) => String(x).trim().toLowerCase());
      return accepted.includes(clean);
    },
  },

  organic_reactions: {
    id: 'organic_reactions',
    name: 'Hóa Học Hữu Cơ & Polime',
    shortName: 'Hữu cơ',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [9, 11, 12],
    icon: 'Layers',
    badgeColor: 'amber',
    description: 'Phản ứng đặc trưng của hiđrocacbon, ancol, anđehit, axit axetic, este, chất béo, protein và polime.',
    inputType: 'choice',
    timeConfig: GAME_TIME_LIMITS.organic_reactions,
    validateAnswer: (question, answer) => {
      if (!answer) return false;
      const clean = String(answer).trim().toLowerCase();
      const accepted = (question.acceptedAnswers || []).map((x: string) => String(x).trim().toLowerCase());
      return accepted.includes(clean);
    },
  },

  experiment_lab: {
    id: 'experiment_lab',
    name: 'Thí Nghiệm & An Toàn Phòng Hóa',
    shortName: 'An toàn Lab',
    subject: 'chemistry',
    subjectName: 'Hóa học',
    grade: [8, 9, 10, 11, 12],
    icon: 'RefreshCw',
    badgeColor: 'rose',
    description: 'Quan sát hiện tượng thí nghiệm, thao tác dụng cụ lab và quy tắc an toàn hóa chất.',
    inputType: 'choice',
    timeConfig: GAME_TIME_LIMITS.experiment_lab,
    validateAnswer: (question, answer) => {
      if (!answer) return false;
      const clean = String(answer).trim().toLowerCase();
      const accepted = (question.acceptedAnswers || []).map((x: string) => String(x).trim().toLowerCase());
      return accepted.includes(clean);
    },
  },
};

/**
 * Lấy module game theo id
 */
export function getGameModule(modeId: string): GameModuleInfo {
  return GAME_REGISTRY[modeId] || GAME_REGISTRY.balance;
}

/**
 * Kiểm tra đáp án tổng quát cho bất kỳ chế độ chơi nào
 */
export function validateGameAnswer(mode: string, question: any, answer: any): { isCorrect: boolean; isPartialRatio?: boolean } {
  if (mode === 'balance') {
    return validateBalanceAnswer(question, answer);
  }
  const mod = GAME_REGISTRY[mode];
  if (mod) {
    const isCorrect = mod.validateAnswer(question, answer);
    return { isCorrect };
  }
  // Mặc định so sánh chuỗi
  if (!answer) return { isCorrect: false };
  const str = String(answer).trim().toLowerCase();
  const accepted = (question.acceptedAnswers || []).map((x: string) => String(x).trim().toLowerCase());
  return { isCorrect: accepted.includes(str) };
}
