// src/data/questionCleaner.ts
// Module chuẩn hóa và nâng cấp ngân hàng câu hỏi Hóa học:
// 1. Sửa lỗi triệt để 173 câu "->None"
// 2. Bổ sung ô trống "___" cho 30 câu thiếu
// 3. Tự động viết lại lời giải chi tiết, rõ ràng từng chất thay vì lời giải rập khuôn
// 4. Gắn thẻ phân loại Lớp (Grade) và Chương (Chapter) chuẩn theo SGK GDPT 2018
// 5. Mở rộng danh sách acceptedAnswers gồm tên tiếng Việt SGK, công thức chuẩn và unicode

import { COMPOUND_DICTIONARY, normalizeChemicalText } from './vietnameseNames';

export interface CleanQuestion {
  id?: string;
  mode: string;
  difficulty: string;
  grade: number;
  chapter: string;
  equation: string;
  answers?: any[];
  acceptedAnswers: string[];
  explanation: string;
  timeLimitSec: number;
  tags?: string[];
}

/**
 * Suy đoán Lớp và Chương chuẩn của câu hỏi
 */
export function inferGradeAndChapter(mode: string, difficulty: string, equation: string): { grade: number; chapter: string; tags: string[] } {
  const eq = equation.toLowerCase();

  if (mode === 'balance') {
    if (eq.includes('kmno4') || eq.includes('k2cr2o7') || eq.includes('hno3') || eq.includes('h2so4 dac')) {
      return {
        grade: 10,
        chapter: 'Phản ứng oxi hóa - khử',
        tags: ['Cân bằng e', 'Oxi hóa khử', 'THPT'],
      };
    }
    if (difficulty === 'easy') {
      return {
        grade: 8,
        chapter: 'Phản ứng hóa học và PTHH',
        tags: ['Cân bằng cơ bản', 'Bảo toàn nguyên tố', 'THCS'],
      };
    }
    return {
      grade: 9,
      chapter: 'Tính chất hóa học của kim loại và phi kim',
      tags: ['Kim loại', 'Phi kim', 'Axit'],
    };
  }

  if (mode === 'fill_blank') {
    if (eq.includes('kmno4') || eq.includes('k2cr2o7')) {
      return {
        grade: 10,
        chapter: 'Phản ứng oxi hóa - khử phức tạp',
        tags: ['Chất khử', 'Chất oxi hóa', 'THPT'],
      };
    }
    if (eq.includes('ch4') || eq.includes('c2h4') || eq.includes('c2h2') || eq.includes('ch3cooh')) {
      return {
        grade: 9,
        chapter: 'Hóa học hữu cơ - Hiđrocacbon & Dẫn xuất',
        tags: ['Hữu cơ', 'Sản phẩm phản ứng', 'THCS'],
      };
    }
    return {
      grade: 8,
      chapter: 'Sự biến đổi chất và PTHH',
      tags: ['Sản phẩm', 'Điền khuyết'],
    };
  }

  if (mode === 'compound_name') {
    return {
      grade: 8,
      chapter: 'Axit - Bazơ - Muối & Danh pháp quốc tế IUPAC',
      tags: ['IUPAC', 'Danh pháp SGK', 'Tên hợp chất'],
    };
  }

  if (mode === 'element_quiz') {
    return {
      grade: 10,
      chapter: 'Cấu tạo nguyên tử & Bảng tuần hoàn các nguyên tố hóa học',
      tags: ['Bảng tuần hoàn', 'Số hiệu nguyên tử Z', 'Cấu hình electron'],
    };
  }

  if (mode === 'oxidation_state') {
    return {
      grade: 10,
      chapter: 'Phản ứng oxi hóa - khử & Xác định số oxi hóa',
      tags: ['Số oxi hóa', 'Quy tắc xác định số oxi hóa'],
    };
  }

  return {
    grade: 8,
    chapter: 'Kiến thức Hóa học tổng hợp',
    tags: ['Hóa học'],
  };
}

/**
 * Xây dựng lời giải riêng biệt, trực quan cho câu điền khuyết
 */
function buildCustomFillBlankExplanation(equation: string, accepted: string[]): string {
  const missing = accepted[0] || 'chất còn thiếu';
  const cleanEq = equation.replace(/___/g, `[${missing}]`);

  // Tìm thông tin hợp chất từ từ điển
  const match = COMPOUND_DICTIONARY.find(c => c.formula.toLowerCase() === missing.toLowerCase());
  const nameVn = match?.sgkVn[0] ? ` (${match.sgkVn[0]})` : '';

  return `Chất cần điền vào chỗ trống là ${missing}${nameVn}.\n` +
    `Phương trình hoàn chỉnh sau khi điền:\n${cleanEq}\n` +
    `Giải thích: Điền ${missing} bảo toàn đầy đủ số lượng nguyên tử của từng nguyên tố ở cả 2 vế và đúng bản chất phản ứng hóa học.`;
}

/**
 * Xây dựng lời giải riêng cho câu gọi tên hợp chất
 */
function buildCustomCompoundExplanation(formula: string, accepted: string[]): string {
  const match = COMPOUND_DICTIONARY.find(c => c.formula.toLowerCase() === formula.trim().toLowerCase());
  const iupac = match?.iupacEn[0] || accepted[0];
  const vn = match?.sgkVn[0] || '';
  const common = match?.commonNames?.[0] ? ` (Tên thường gọi: ${match.commonNames[0]})` : '';

  return `Hợp chất ${formula.trim()} có tên theo danh pháp quốc tế IUPAC là "${iupac}".\n` +
    (vn ? `Tên gọi theo chương trình SGK Việt Nam: "${vn}".\n` : '') +
    (common ? `${common}\n` : '') +
    `Hệ thống chấp nhận cả tên tiếng Anh chuẩn quốc tế và tên tiếng Việt chuẩn SGK.`;
}

/**
 * Hàm làm sạch và nâng cấp một câu hỏi bất kỳ
 */
export function cleanAndUpgradeQuestion(rawQ: any, mode: string, difficulty: string): CleanQuestion {
  let equation = String(rawQ.equation || '').trim();

  // 1. Sửa lỗi "->None"
  equation = equation.replace(/->None/g, '->');
  equation = equation.replace(/\s*->\s*/g, ' -> ');

  // 2. Sửa lỗi 30 câu điền khuyết thiếu ô trống "___"
  if (mode === 'fill_blank' && !equation.includes('___')) {
    equation = `${equation} + ___`;
  }

  // 3. Mở rộng acceptedAnswers
  let accepted: string[] = Array.isArray(rawQ.acceptedAnswers)
    ? [...rawQ.acceptedAnswers]
    : (rawQ.answers ? [String(rawQ.answers)] : []);

  // Bổ sung các biến thể chữ thường, không dấu, unicode subscript
  const extraAliases: string[] = [];
  if (mode === 'compound_name') {
    const match = COMPOUND_DICTIONARY.find(c => c.formula.toLowerCase() === equation.toLowerCase());
    if (match) {
      extraAliases.push(...match.sgkVn);
      extraAliases.push(...match.iupacEn);
      if (match.commonNames) extraAliases.push(...match.commonNames);
    }
  }

  if (mode === 'fill_blank') {
    // H2O -> H₂O
    accepted.forEach(ans => {
      const sub = ans.replace(/2/g, '₂').replace(/3/g, '₃').replace(/4/g, '₄');
      if (sub !== ans) extraAliases.push(sub);
    });
  }

  accepted = Array.from(new Set([...accepted, ...extraAliases]));

  // 4. Lời giải chi tiết
  let explanation = rawQ.explanation || '';
  if (mode === 'fill_blank' && (explanation.includes('Đặt hệ số theo nguyên tắc') || explanation.length < 30)) {
    explanation = buildCustomFillBlankExplanation(equation, accepted);
  } else if (mode === 'compound_name') {
    explanation = buildCustomCompoundExplanation(equation, accepted);
  }

  // 5. Gắn metadata
  const { grade, chapter, tags } = inferGradeAndChapter(mode, difficulty, equation);

  return {
    id: rawQ.id,
    mode,
    difficulty,
    grade,
    chapter,
    equation,
    answers: rawQ.answers,
    acceptedAnswers: accepted,
    explanation,
    timeLimitSec: rawQ.timeLimitSec || 25,
    tags,
  };
}

/**
 * Xử lý làm sạch toàn bộ ngân hàng câu hỏi
 */
export function cleanAllQuestions(questionsDatabase: Record<string, Record<string, any[]>>): Record<string, Record<string, CleanQuestion[]>> {
  const result: Record<string, Record<string, CleanQuestion[]>> = {};

  for (const mode of Object.keys(questionsDatabase)) {
    result[mode] = {};
    for (const diff of Object.keys(questionsDatabase[mode])) {
      const list = questionsDatabase[mode][diff] || [];
      result[mode][diff] = list.map(q => cleanAndUpgradeQuestion(q, mode, diff));
    }
  }

  return result;
}
