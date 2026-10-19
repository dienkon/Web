// scripts/check-questions.ts
// Script kiểm định chất lượng toàn diện của ngân hàng câu hỏi (Data Quality Check)

import { FALLBACK_QUESTIONS } from '../src/data/chemistryQuestions';
import { cleanAllQuestions } from '../src/data/questionCleaner';

let totalErrors = 0;
let totalWarnings = 0;

console.log('🔍 Bắt đầu kiểm tra dữ liệu ngân hàng câu hỏi...');

const cleanedDb = cleanAllQuestions(FALLBACK_QUESTIONS);

for (const mode of Object.keys(cleanedDb)) {
  for (const diff of Object.keys(cleanedDb[mode])) {
    const questions = cleanedDb[mode][diff];
    console.log(`\n▶ Kiểm tra chế độ [${mode}] - Độ khó [${diff}] (${questions.length} câu):`);

    const explanationMap = new Map<string, number>();

    questions.forEach((q, idx) => {
      const qNum = idx + 1;

      // 1. Kiểm tra "None" hoặc "undefined"
      if (q.equation.includes('None') || q.equation.includes('undefined')) {
        console.error(`  ❌ LỖI Câu ${qNum}: Phương trình chứa chuỗi rác ("None" hoặc "undefined"): ${q.equation}`);
        totalErrors++;
      }

      // 2. Kiểm tra fill_blank phải có ô trống "___"
      if (mode === 'fill_blank' && !q.equation.includes('___')) {
        console.error(`  ❌ LỖI Câu ${qNum}: Điền khuyết không có ký hiệu ô trống "___": ${q.equation}`);
        totalErrors++;
      }

      // 3. Kiểm tra acceptedAnswers không được rỗng
      if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
        console.error(`  ❌ LỖI Câu ${qNum}: acceptedAnswers rỗng!`);
        totalErrors++;
      }

      // 4. Kiểm tra oxidation_state có dấu (+/-) hoặc "0"
      if (mode === 'oxidation_state') {
        const hasValidSign = q.acceptedAnswers.some(ans => {
          const s = ans.trim();
          return s === '0' || s.startsWith('+') || s.startsWith('-');
        });
        if (!hasValidSign) {
          console.error(`  ❌ LỖI Câu ${qNum}: Số oxi hóa thiếu dấu (+/-): ${q.acceptedAnswers.join(', ')}`);
          totalErrors++;
        }
      }

      // 5. Thống kê lời giải trùng lặp
      const expKey = q.explanation.trim();
      const count = (explanationMap.get(expKey) || 0) + 1;
      explanationMap.set(expKey, count);
    });

    // Cảnh báo nếu có quá nhiều lời giải giống nhau
    let duplicateCount = 0;
    explanationMap.forEach((cnt, exp) => {
      if (cnt >= 15) {
        duplicateCount++;
      }
    });

    if (duplicateCount > 0) {
      console.warn(`  ⚠️ CẢNH BÁO: Có ${duplicateCount} lời giải dùng chung cho >= 15 câu khác nhau.`);
      totalWarnings++;
    } else {
      console.log(`  ✅ ${questions.length}/${questions.length} câu hợp lệ.`);
    }
  }
}

console.log('\n=======================================');
console.log(`📊 TỔNG KẾT: ${totalErrors} LỖI | ${totalWarnings} CẢNH BÁO`);
if (totalErrors === 0) {
  console.log('🎉 TẤT CẢ DỮ LIỆU ĐÃ ĐẠT CHUẨN XUẤT SẮC!');
  process.exit(0);
} else {
  console.error('💥 PHÁT HIỆN LỖI DỮ LIỆU! Vui lòng khắc phục trước khi commit.');
  process.exit(1);
}
