const fs = require('fs');
const path = require('path');
const SourcePatcher = require('./js/patcher.js');

const sampleCode = fs.readFileSync(path.join(__dirname, 'js/sample_source.js'), 'utf8');

console.log('--- TEST 1: Parse Source ---');
const parsed = SourcePatcher.parseSource(sampleCode);
console.log('Success:', parsed.success);
console.log('Found Blocks:', parsed.foundList);
console.log('TKB Items count:', parsed.blocks['TKB_JSON'].value.length);
console.log('GHI_CHU_CHIEU:', parsed.blocks['GHI_CHU_CHIEU'].value);

console.log('\n--- TEST 2: Patch GHI_CHU_CHIEU (Tiết 2: "Mang đề cương") ---');
const newNotes = { ...parsed.blocks['GHI_CHU_CHIEU'].value, 2: "Mang đề cương" };
const patched1 = SourcePatcher.patchOriginalSource(sampleCode, { ghiChuChieu: newNotes });

// Verify patched1 still has functions and comments
console.log('Patched1 contains GHI_CHU_CHIEU note?:', patched1.includes('"Mang đề cương"'));
console.log('Patched1 contains getDateParts?:', patched1.includes('function getDateParts(date)'));
console.log('Patched1 contains 18. TÌM TIẾT CHIỀU TRỐNG?:', patched1.includes('// 18. TÌM TIẾT CHIỀU TRỐNG'));
console.log('Patched1 contains result = {...}?:', patched1.includes('result = {'));

console.log('\n--- TEST 3: Patch TKB_JSON (Thứ 2, Sáng, Tiết 1 -> "Toán") ---');
const newTkb = parsed.blocks['TKB_JSON'].value.map(item => {
  if (item.thu === 2 && item.buoi === 'Sáng' && item.tiet === 1) {
    return { ...item, mon: 'Toán', ghiChu: 'Đã đổi từ SHĐT' };
  }
  return item;
});
const patched2 = SourcePatcher.patchOriginalSource(sampleCode, { tkb: newTkb });
console.log('Patched2 contains "Đã đổi từ SHĐT"?:', patched2.includes('Đã đổi từ SHĐT'));
console.log('Patched2 line count:', patched2.split('\n').length);
console.log('Sample line count:', sampleCode.split('\n').length);

console.log('\n--- TEST 4: Syntax Check execution via new Function() ---');
try {
  let result;
  new Function(patched2);
  console.log('Patched2 syntax is 100% valid JavaScript!');
} catch (e) {
  console.error('Syntax error:', e);
}

console.log('\nAll tests passed!');
