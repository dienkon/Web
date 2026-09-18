const fs = require('fs');
const path = require('path');
const SourcePatcher = require('./js/patcher.js');
const Validator = require('./js/validator.js');
const DiffEngine = require('./js/diff.js');

const samplePath = path.join(__dirname, 'js/sample_source.js');
const originalSource = fs.readFileSync(samplePath, 'utf8');

console.log('============================================================');
console.log('CHƯƠNG TRÌNH KIỂM TRA 5 BÀI TEST CHÍNH THỨC CỦA NGƯỜI DÙNG');
console.log('============================================================');

let passedTests = 0;
let totalTests = 5;

// --- TEST 1: Paste source gốc -> Không chỉnh gì -> Export ---
console.log('\n▶ TEST 1: Paste source gốc -> Không chỉnh gì -> Export');
const parse1 = SourcePatcher.parseSource(originalSource);
const exported1 = SourcePatcher.patchOriginalSource(originalSource, {});
if (exported1 === originalSource) {
  console.log('✓ TEST 1 ĐẠT: File xuất ra giống 100% từng byte với file gốc!');
  passedTests++;
} else {
  console.error('✗ TEST 1 THẤT BẠI: File xuất ra bị khác biệt khi chưa chỉnh sửa.');
}

// --- TEST 2: Chỉ sửa GHI_CHU_CHIEU[2] thành "Mang đề cương" ---
console.log('\n▶ TEST 2: Chỉ sửa GHI_CHU_CHIEU[2] -> "Mang đề cương" -> Export');
const newNotes = { ...parse1.blocks['GHI_CHU_CHIEU'].value, 2: "Mang đề cương" };
const exported2 = SourcePatcher.patchOriginalSource(originalSource, { ghiChuChieu: newNotes });
const diff2 = DiffEngine.computeLineDiff(originalSource, exported2);

const hasMangDeCuong = exported2.includes('"Mang đề cương"');
const hasAllFunctions2 = exported2.includes('function getDateParts') &&
                          exported2.includes('function getSchedule') &&
                          exported2.includes('function escapeJsonString');
const hasSection18 = exported2.includes('// 18. TÌM TIẾT CHIỀU TRỐNG') &&
                     exported2.includes('// Nhưng KHÔNG hiển thị từng tiết trống trong message.');
const hasResult2 = exported2.includes('result = {') && exported2.includes('jsonSafeMessage: jsonSafeMessage');

if (hasMangDeCuong && hasAllFunctions2 && hasSection18 && hasResult2 && diff2.changesCount === 2) {
  console.log('✓ TEST 2 ĐẠT: Toàn bộ source, functions, comment (18. TÌM TIẾT CHIỀU TRỐNG) và result còn nguyên!');
  console.log(`  Diff: -${diff2.removedCount} / +${diff2.addedCount} dòng (chỉ duy nhất dòng GHI_CHU_CHIEU[2] thay đổi)`);
  passedTests++;
} else {
  console.error('✗ TEST 2 THẤT BẠI: Kiểm tra các điều kiện bảo toàn không đạt.');
}

// --- TEST 3: Đổi Thứ Hai / Sáng / Tiết 1 SHĐT thành "Toán" ---
console.log('\n▶ TEST 3: Đổi Thứ Hai / Sáng / Tiết 1 SHĐT thành "Toán" -> Export');
const newTkb3 = parse1.blocks['TKB_JSON'].value.map(item => {
  if (item.thu === 2 && item.buoi === 'Sáng' && item.tiet === 1) {
    return { ...item, mon: 'Toán' };
  }
  return item;
});
const exported3 = SourcePatcher.patchOriginalSource(originalSource, { tkb: newTkb3 });
const parse3 = SourcePatcher.parseSource(exported3);
const itemThu2Tiet1 = parse3.blocks['TKB_JSON'].value.find(i => i.thu === 2 && i.buoi === 'Sáng' && i.tiet === 1);

const hasAllFunctions3 = exported3.includes('function getDateParts') && exported3.includes('result = {');

if (itemThu2Tiet1 && itemThu2Tiet1.mon === 'Toán' && hasAllFunctions3) {
  console.log('✓ TEST 3 ĐẠT: TKB_JSON cập nhật chính xác sang "Toán", các hàm logic và result còn 100%!');
  passedTests++;
} else {
  console.error('✗ TEST 3 THẤT BẠI.');
}

// --- TEST 4: Thêm phòng phong: "B203" -> Export ---
console.log('\n▶ TEST 4: Thêm phòng phong: "B203" -> Export');
const newTkb4 = parse1.blocks['TKB_JSON'].value.map(item => {
  if (item.thu === 2 && item.buoi === 'Sáng' && item.tiet === 5) {
    return { ...item, phong: 'B203' };
  }
  return item;
});
const exported4 = SourcePatcher.patchOriginalSource(originalSource, { tkb: newTkb4 });
const parse4 = SourcePatcher.parseSource(exported4);
const itemHóa = parse4.blocks['TKB_JSON'].value.find(i => i.thu === 2 && i.buoi === 'Sáng' && i.tiet === 5);

if (itemHóa && itemHóa.phong === 'B203' && exported4.includes('result = {')) {
  console.log('✓ TEST 4 ĐẠT: Phòng "B203" được cập nhật thành công, file JavaScript đầy đủ vẫn còn nguyên!');
  passedTests++;
} else {
  console.error('✗ TEST 4 THẤT BẠI.');
}

// --- TEST 5: Không sửa gì, bấm Export -> File .js chứa 100% source gốc ---
console.log('\n▶ TEST 5: File .js phải chứa 100% source gốc, không được biến thành JSON');
const isRawJson = exported1.trim().startsWith('{') || exported1.trim().startsWith('[');
const isFullJsFile = exported1.includes('const GHI_CHU_CHIEU =') &&
                     exported1.includes('const TKB_JSON =') &&
                     exported1.includes('function getDateParts') &&
                     exported1.includes('result = {');

if (!isRawJson && isFullJsFile) {
  console.log('✓ TEST 5 ĐẠT: File xuất ra là file JavaScript hoàn chỉnh 100%, không bị biến thành JSON!');
  passedTests++;
} else {
  console.error('✗ TEST 5 THẤT BẠI.');
}

// --- BONUS TEST: VALIDATION CHỐNG TRÙNG LẶP TIẾT (thu + buoi + tiet) ---
console.log('\n▶ BONUS TEST: Kiểm tra Validation chống trùng lặp slot');
const duplicateTkb = [
  ...parse1.blocks['TKB_JSON'].value,
  { thu: 2, buoi: 'Sáng', tiet: 1, mon: 'Văn' } // Trùng với SHĐT
];
const valResult = Validator.validateAll({ tkb: duplicateTkb }, exported1);
if (!valResult.isValid && valResult.errors.some(e => e.field === 'DUPLICATE_SLOT')) {
  console.log('✓ BONUS TEST ĐẠT: Validator phát hiện ngay lập tức lỗi trùng lặp Thứ 2 / Sáng / Tiết 1!');
}

// --- BONUS TEST: SYNTAX CHECK THỰC THI JAVASCRIPT ---
console.log('\n▶ BONUS TEST: Kiểm tra cú pháp JavaScript có thể chạy được');
let syntaxValid = true;
try {
  let result;
  new Function(exported2);
  new Function(exported3);
  new Function(exported4);
} catch (e) {
  syntaxValid = false;
  console.error('Syntax error:', e);
}
if (syntaxValid) {
  console.log('✓ BONUS TEST ĐẠT: Toàn bộ mã sau khi patch đều là JavaScript hợp lệ 100%!');
}

console.log('============================================================');
console.log(`KẾT QUẢ: ${passedTests}/${totalTests} BÀI TEST CHÍNH ĐẠT 100%!`);
console.log('============================================================');
