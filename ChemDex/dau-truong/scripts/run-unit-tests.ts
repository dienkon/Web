// scripts/run-unit-tests.ts
// Bộ kiểm thử tự động toàn diện (Unit Test Suite) cho Đấu Trường Hóa Học
// Chạy bằng tsx: npx tsx scripts/run-unit-tests.ts

import { normalizeSubscripts, isChemicalNameMatch } from '../src/data/vietnameseNames';
import { calculateSpeedRatio, calculateStreakMultiplier, evaluateRoundSubmission, calculateFairScore } from '../src/features/gameplay/scoring';
import { generateStemQuestion } from '../src/data/stemGenerators';
import { validateGameAnswer, checkNumericAnswer, validateOxidationStateAnswer } from '../src/games/registry';
import { cleanAndUpgradeQuestion } from '../src/data/questionCleaner';
import { calculateBreakDuration, getRoomQuestionTimeLimit, PRACTICE_TIME_OPTIONS, ROOM_TIME_LIMITS } from '../src/config/gameConfig';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, errorMsg?: string) {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.push({ name: testName, passed: false, error: errorMsg || 'Assertion failed' });
    console.error(`  ❌ FAIL: ${testName} - ${errorMsg || 'Assertion failed'}`);
  }
}

console.log('🧪 BẮT ĐẦU CHẠY BỘ KIỂM THỬ TỰ ĐỘNG CHEMARENA...\n');

// ============================================================================
// 1. KIỂM THỬ DANH PHÁP TIẾNG VIỆT & IUPAC
// ============================================================================
console.log('▶ [1/6] Kiểm thử Danh Pháp & Từ Điển Hóa Học (src/data/vietnameseNames.ts)');

assert(
  normalizeSubscripts('H₂SO₄') === 'H2SO4' && normalizeSubscripts('Ca(OH)₂') === 'Ca(OH)2',
  'Chuẩn hóa chỉ số dưới Unicode thành ký tự thường',
  'H₂SO₄ không chuyển thành H2SO4'
);

assert(
  isChemicalNameMatch('copper(II) sulfate', 'đồng(II) sunfat'),
  'Khớp tên IUPAC tiếng Anh với tên tiếng Việt SGK (copper(II) sulfate <-> đồng(II) sunfat)',
  'Không nhận diện được tên tiếng Việt tương đương'
);

assert(
  isChemicalNameMatch('iron(III) oxide', 'sắt(III) oxit'),
  'Khớp tên oxit kim loại (iron(III) oxide <-> sắt(III) oxit)'
);

assert(
  isChemicalNameMatch('ethanoic acid', 'axit axetic'),
  'Khớp tên axit hữu cơ thông thường (ethanoic acid <-> axit axetic)'
);

assert(
  isChemicalNameMatch('sodium hydroxide', 'natri hidroxit'),
  'Khớp tên bazơ kiềm không dấu và có dấu (sodium hydroxide <-> natri hidroxit)'
);

// ============================================================================
// 2. KIỂM THỬ CÔNG THỨC CHẤM ĐIỂM CÔNG BẰNG & TỐC ĐỘ (scoring.ts)
// ============================================================================
console.log('\n▶ [2/6] Kiểm thử Thuật Toán Điểm & Thưởng Tốc Độ (src/features/gameplay/scoring.ts)');

const speedRatioFull = calculateSpeedRatio(20, 20);
assert(
  Math.abs(speedRatioFull - 1.0) < 0.001,
  'Tốc độ nộp ngay giây đầu tiên đạt tỷ lệ 1.0 (100% điểm tốc độ)',
  `Kỳ vọng 1.0, nhận được ${speedRatioFull}`
);

const speedRatioHalf = calculateSpeedRatio(10, 20);
assert(
  Math.abs(speedRatioHalf - 0.85) < 0.001,
  'Tốc độ nộp ở giữa thời gian đạt tỷ lệ 0.85 (tuyến tính mượt mà)',
  `Kỳ vọng 0.85, nhận được ${speedRatioHalf}`
);

const speedRatioZero = calculateSpeedRatio(0, 20);
assert(
  Math.abs(speedRatioZero - 0.70) < 0.001,
  'Tốc độ nộp ở giây cuối cùng vẫn bảo đảm điểm sàn 70% (0.70)',
  `Kỳ vọng 0.70, nhận được ${speedRatioZero}`
);

assert(
  calculateStreakMultiplier(0) === 1.0 &&
  calculateStreakMultiplier(2) === 1.0 &&
  calculateStreakMultiplier(3) === 1.1 &&
  calculateStreakMultiplier(5) === 1.3 &&
  calculateStreakMultiplier(10) === 1.3,
  'Hệ số chuỗi thắng (Streak Multiplier) tăng dần từ chuỗi 3 (+10%) đến chuỗi 5+ (tối đa +30%)'
);

const evalScoreCorrect = evaluateRoundSubmission({
  uid: 'user1',
  roomId: 'room1',
  round: 1,
  userAnswer: 'H2O',
  isCorrect: true,
  isPartialRatio: false,
  alreadySubmittedCount: 0,
  timeRemainingSec: 15,
  totalTimeSec: 20,
  currentScore: 10,
  currentStreak: 3,
  difficulty: 'medium',
  totalRounds: 10,
});
assert(
  evalScoreCorrect.pointsEarned > 0 && evalScoreCorrect.newStreak === 4,
  'Chấm điểm câu đúng: điểm cộng hợp lệ và chuỗi thắng tăng 1 đơn vị',
  `Điểm: ${evalScoreCorrect.pointsEarned}, Streak: ${evalScoreCorrect.newStreak}`
);

const evalScoreWrong = evaluateRoundSubmission({
  uid: 'user1',
  roomId: 'room1',
  round: 2,
  userAnswer: 'CO2',
  isCorrect: false,
  isPartialRatio: false,
  alreadySubmittedCount: 1,
  timeRemainingSec: 10,
  totalTimeSec: 20,
  currentScore: 20,
  currentStreak: 4,
  difficulty: 'medium',
  totalRounds: 10,
});
assert(
  evalScoreWrong.pointsEarned === 0 && evalScoreWrong.newStreak === 0,
  'Chấm điểm câu sai: 0 điểm và reset chuỗi thắng về 0'
);

// ============================================================================
// 3. KIỂM THỬ TRÌNH TẠO ĐỀ THI THỰC HÀNH STEM (stemGenerators.ts)
// ============================================================================
console.log('\n▶ [3/6] Kiểm thử Sinh Đề Tự Động 6 Chế Độ STEM (src/data/stemGenerators.ts)');

for (const diff of ['easy', 'medium', 'hard'] as const) {
  const molQ = generateStemQuestion('mol_calc', diff);
  assert(
    molQ.correctValue !== undefined && !isNaN(Number(molQ.correctValue)) && Number(molQ.correctValue) > 0,
    `[mol_calc - ${diff}] Giá trị mol hợp lệ: ${molQ.correctValue} ${molQ.unit}`
  );

  const mathQ = generateStemQuestion('math_algebra', diff);
  assert(
    mathQ.correctValue !== undefined && !isNaN(Number(mathQ.correctValue)) && mathQ.equation.length > 5,
    `[math_algebra - ${diff}] Phương trình đại số chuẩn: ${mathQ.equation} => ${mathQ.correctValue}`
  );

  const physQ = generateStemQuestion('physics_calc', diff);
  assert(
    physQ.correctValue !== undefined && !isNaN(Number(physQ.correctValue)),
    `[physics_calc - ${diff}] Bài toán vật lý tính toán chính xác: ${physQ.correctValue} ${physQ.unit}`
  );

  const unitQ = generateStemQuestion('unit_convert', diff);
  assert(
    unitQ.correctValue !== undefined && !isNaN(Number(unitQ.correctValue)) && Number(unitQ.correctValue) > 0,
    `[unit_convert - ${diff}] Đổi đơn vị đo: ${unitQ.equation} => ${unitQ.correctValue}`
  );

  const mcqQ = generateStemQuestion('science_mcq', diff);
  assert(
    Array.isArray(mcqQ.options) && mcqQ.options.length === 4 && mcqQ.correctIndex !== undefined && mcqQ.correctIndex >= 0 && mcqQ.correctIndex <= 3,
    `[science_mcq - ${diff}] Trắc nghiệm KHTN có 4 đáp án và index đáp án đúng hợp lệ (0-3)`
  );

  const matchQ = generateStemQuestion('substance_match', diff);
  assert(
    Array.isArray(matchQ.options) && matchQ.options.length === 4 && matchQ.correctIndex !== undefined,
    `[substance_match - ${diff}] Ghép tính chất chất hóa học có 4 lựa chọn`
  );
}

// ============================================================================
// 4. KIỂM THỬ BỘ THẨM ĐỊNH ĐÁP ÁN THEO CHẾ ĐỘ (registry.ts)
// ============================================================================
console.log('\n▶ [4/6] Kiểm thử Thẩm Định Đáp Án Đa Dạng (src/games/registry.ts)');

// Cân bằng phản ứng
const balanceQ = {
  equation: 'H2 + O2 -> H2O',
  answers: [2, 1, 2],
  coefficients: [2, 1, 2],
  mode: 'balance',
};
const balResExact = validateGameAnswer('balance', balanceQ, '2 : 1 : 2');
assert(balResExact.isCorrect && !balResExact.isPartialRatio, 'Cân bằng: Hệ số chuẩn 2 : 1 : 2 chính xác 100%');

const balResSpaced = validateGameAnswer('balance', balanceQ, '2 1 2');
assert(balResSpaced.isCorrect, 'Cân bằng: Nhập bằng khoảng trắng "2 1 2" vẫn được chấp nhận');

const balResPartial = validateGameAnswer('balance', balanceQ, '4 : 2 : 4');
assert(balResPartial.isCorrect && Boolean(balResPartial.isPartialRatio), 'Cân bằng: Hệ số bội số 4 : 2 : 4 nhận diện đúng tỷ lệ');

const balResWrong = validateGameAnswer('balance', balanceQ, '1 : 1 : 1');
assert(!balResWrong.isCorrect, 'Cân bằng: Hệ số sai 1 : 1 : 1 bị từ chối');

// Số oxi hóa
const oxQ = {
  equation: 'KMnO4',
  oxidationState: '+7',
  acceptedAnswers: ['+7', '7'],
};
assert(validateOxidationStateAnswer(oxQ, '+7'), 'Số oxi hóa: Nhập "+7" chính xác');
assert(validateOxidationStateAnswer(oxQ, '7'), 'Số oxi hóa: Nhập số "7" (tự hiểu dấu dương) chính xác');
assert(!validateOxidationStateAnswer(oxQ, '-7'), 'Số oxi hóa: Nhập sai dấu "-7" bị từ chối');

// Kiểm tra số học (sai số dung sai)
assert(checkNumericAnswer('0.25', ['0.25'], 0.25, 0.02), 'Số học: Nhập đúng 0.25');
assert(checkNumericAnswer('0,25', ['0.25'], 0.25, 0.02), 'Số học: Dấu phẩy thập phân kiểu Việt "0,25" tự động chuẩn hóa');
assert(checkNumericAnswer('0.252', ['0.25'], 0.25, 0.02), 'Số học: Sai số làm tròn trong ngưỡng sai số cho phép');
assert(!checkNumericAnswer('0.35', ['0.25'], 0.25, 0.02), 'Số học: Giá trị lệch quá ngưỡng bị từ chối');

// ============================================================================
// 5. KIỂM THỬ LÀM SẠCH VÀ SỬA LỖI DỮ LIỆU (questionCleaner.ts)
// ============================================================================
console.log('\n▶ [5/6] Kiểm thử Bộ Sửa Dữ Liệu Tự Động (src/data/questionCleaner.ts)');

const rawNoneQ = {
  equation: 'CH4 + Cl2 -(as)-> CH3Cl + HCl',
  explanation: 'None',
  answers: ['CH3Cl'],
};
const cleanedNoneQ = cleanAndUpgradeQuestion(rawNoneQ, 'fill_blank', 'medium');
assert(
  !cleanedNoneQ.explanation.includes('None') && cleanedNoneQ.explanation.length > 20,
  'Sửa lỗi giải thích "None" thành lời giải chi tiết',
  `Lời giải sau sửa: ${cleanedNoneQ.explanation}`
);

const rawMissingBlankQ = {
  equation: '2 SO2 + O2 -(V2O5, t°)-> 2 SO3',
  answers: ['SO3'],
};
const cleanedBlankQ = cleanAndUpgradeQuestion(rawMissingBlankQ, 'fill_blank', 'hard');
assert(
  cleanedBlankQ.equation.includes('___'),
  'Sửa lỗi câu điền khuyết thiếu ô trống "___"',
  `Phương trình sau sửa: ${cleanedBlankQ.equation}`
);

// ============================================================================
// 6. KIỂM THỬ THỜI GIAN MÀN NGHỈ ĐỘNG (gameConfig.ts)
// ============================================================================
console.log('\n▶ [6/6] Kiểm thử Thời Gian Màn Nghỉ Động (src/config/gameConfig.ts)');

const shortBreak = calculateBreakDuration('Giải thích ngắn.');
assert(
  shortBreak >= 5 && shortBreak <= 6,
  `Màn nghỉ cho lời giải ngắn (>= 5s, thực tế: ${shortBreak}s)`
);

const longBreak = calculateBreakDuration(
  'Đây là một lời giải rất chi tiết về phản ứng oxi hóa khử nhiều giai đoạn giữa đồng và axit nitric, giải thích cặn kẽ từng bán phản ứng nhường nhận electron và cách cân bằng bảo toàn điện tích cũng như bảo toàn nguyên tố.'
);
assert(
  longBreak >= 9 && longBreak <= 12,
  `Màn nghỉ cho lời giải dài giãn theo độ dài (9 - 12s, thực tế: ${longBreak}s)`
);

// ============================================================================
// 7. KIỂM THỬ THỜI GIAN PHÒNG GHÉP ĐẤU (45S - 120S) & CUSTOM LUYỆN TẬP
// ============================================================================
console.log('\n▶ [7/7] Kiểm thử Thời Gian Phòng Ghép Đấu (Min 45s - Max 120s) & Luyện Tập Solo (gameConfig.ts)');

// Kiểm tra toàn bộ 14 chế độ và 3 cấp độ khó
const allModes = Object.keys(ROOM_TIME_LIMITS);
let allBoundsValid = true;
let easyMinMaxValid = true;
let hardMinMaxValid = true;

for (const m of allModes) {
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const t = getRoomQuestionTimeLimit(m, diff);
    if (t < 45 || t > 120) {
      allBoundsValid = false;
      console.error(`  ❌ Lỗi thời gian phòng: mode=${m}, diff=${diff}, t=${t}`);
    }
    if (diff === 'easy' && (t < 45 || t > 50)) {
      easyMinMaxValid = false;
    }
    if (diff === 'hard' && (t < 75 || t > 120)) {
      hardMinMaxValid = false;
    }
  }
}

assert(
  allBoundsValid,
  'Tất cả chế độ và độ khó trong phòng ghép đấu đều tuân thủ nghiêm ngặt 45s <= thời gian <= 120s'
);

assert(
  easyMinMaxValid,
  'Mức độ DỄ (Easy) có thời gian ngắn gọn (45s - 50s)'
);

assert(
  hardMinMaxValid,
  'Mức độ KHÓ (Hard) có thời gian dồi dào để tính toán và cân bằng (75s - 120s)'
);

// Kiểm tra trường hợp đề cực dài (bonus đọc đề) không bao giờ vượt trần 120s (2 phút)
const superLongPrompt = 'A'.repeat(500);
const clampedHardTime = getRoomQuestionTimeLimit('balance', 'hard', superLongPrompt);
assert(
  clampedHardTime === 120,
  `Đề bài siêu dài vẫn bị chặn trần tối đa đúng 120 giây (2 phút), thực tế: ${clampedHardTime}s`
);

// Kiểm tra bảng tùy chọn luyện tập Solo
const hasUnlimitedPractice = PRACTICE_TIME_OPTIONS.some(opt => opt.value === 0);
const hasStandardPractice = PRACTICE_TIME_OPTIONS.some(opt => opt.value === 45);
const hasMaxPractice = PRACTICE_TIME_OPTIONS.some(opt => opt.value === 180);
assert(
  hasUnlimitedPractice && hasStandardPractice && hasMaxPractice,
  'Tùy chọn thời gian luyện tập Solo phong phú: Có chế độ không giới hạn (0s), tiêu chuẩn (45s) và nâng cao (180s)'
);

// Kiểm tra tính điểm khi thời gian không giới hạn (isUnlimited: totalTimeSec = 45, timeRemainingSec = 45)
const unlimitedSpeedRatio = calculateSpeedRatio(45, 45);
assert(
  Math.abs(unlimitedSpeedRatio - 1.0) < 0.001,
  'Chế độ luyện tập không giới hạn thời gian bảo toàn 100% tỷ lệ điểm tốc độ (speedRatio = 1.0)'
);

// ============================================================================
// BÁO CÁO TỔNG KẾT
// ============================================================================
console.log('\n======================================================');
const passedCount = results.filter(r => r.passed).length;
const failedCount = results.filter(r => !r.passed).length;
console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passedCount} THÀNH CÔNG | ${failedCount} THẤT BẠI`);

if (failedCount === 0) {
  console.log('🎉 100% TẤT CẢ CÁC BÀI TEST ĐỀU ĐẠT CHUẨN XUẤT SẮC!\n');
  process.exit(0);
} else {
  console.error('⚠️ CÓ BÀI TEST THẤT BẠI, VUI LÒNG KIỂM TRA LẠI!\n');
  process.exit(1);
}
