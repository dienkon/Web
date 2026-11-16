import test from 'node:test';
import assert from 'node:assert/strict';
import { crosswordRows, crosswordKeyword } from '../src/crossword-data.mjs';
import { createCrosswordSession, normalizeCrosswordAnswer } from '../src/crossword-session.mjs';

test('Sáu hàng giao cột dọc đúng DUKICH và có đủ bốn dạng câu hỏi', () => {
  assert.equal(crosswordKeyword, 'DUKICH');
  assert.deepEqual(crosswordRows.map(row => row.id), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(crosswordRows.map(row => normalizeCrosswordAnswer(row.answer)), ['DIADAO', 'HAUCAN', 'DOANKET', 'TRINHSAT', 'CUUHO', 'HANHQUAN']);
  assert.equal(crosswordRows.map(row => normalizeCrosswordAnswer(row.answer)[row.keywordIndex]).join(''), crosswordKeyword);
  assert.deepEqual(crosswordRows.map(row => row.type), ['image', 'choice', 'choice', 'action', 'action', 'rebus']);
  for (const row of crosswordRows.filter(row => row.type === 'choice')) {
    assert.equal(row.options.length, 4);
    assert.equal(row.options.filter(option => normalizeCrosswordAnswer(option) === normalizeCrosswordAnswer(row.answer)).length, 1);
  }
  for (const row of crosswordRows.filter(row => row.type === 'action')) assert.ok(row.performerInstructions);
});

test('Câu ghép hình dùng hai nguồn ảnh khác nhau và giữ đáp án, số ô, chữ cột dọc', () => {
  const row = crosswordRows.find(row => row.type === 'rebus');
  assert.equal(row.id, 6);
  assert.ok(row.images.length >= 2);
  assert.equal(new Set(row.images.map(image => image.src)).size, row.images.length);
  assert.deepEqual(row.images.map(image => image.src), ['./assets/rebus-hanh.png', './assets/rebus-quan-co.png']);
  assert.ok(row.images.every(image => image.src.startsWith('./assets/') && image.alt.length > 0));
  assert.equal('image' in row, false);
  assert.equal('alt' in row, false);
  const answer = normalizeCrosswordAnswer(row.answer);
  assert.equal(answer, 'HANHQUAN');
  assert.equal(answer.length, 8);
  assert.equal(row.keywordIndex, 3);
  assert.equal(answer[row.keywordIndex], 'H');
});

test('Nhận tiếng Việt có dấu, không dấu, khoảng trắng và dấu gạch nối', () => {
  assert.equal(normalizeCrosswordAnswer('  địa-đạo  '), 'DIADAO');
  assert.equal(normalizeCrosswordAnswer('ĐOÀN KẾT'), 'DOANKET');
  assert.equal(normalizeCrosswordAnswer(' du kích '), 'DUKICH');
  assert.equal(normalizeCrosswordAnswer(null), '');
});

test('Sai không mở chữ hoặc lộ đáp án; giải đúng không bị tính lặp', () => {
  const session = createCrosswordSession();
  assert.deepEqual(session.state.revealedKeyword, [null, null, null, null, null, null]);
  assert.equal(session.submitRow(-1, 'ĐỊA ĐẠO'), null);
  assert.equal(session.submitRow(6, 'ĐỊA ĐẠO'), null);
  assert.equal(session.submitRow(0.5, 'ĐỊA ĐẠO'), null);
  assert.deepEqual(session.submitRow(0, 'sai'), { correct: false });
  assert.equal(session.state.solvedCount, 0);
  assert.deepEqual(session.submitRow(0, 'dia dao'), { correct: true });
  assert.equal(session.state.solvedCount, 1);
  assert.deepEqual(session.state.revealedKeyword, ['D', null, null, null, null, null]);
  assert.deepEqual(session.submitRow(0, 'dia dao'), { correct: true, alreadySolved: true });
  assert.equal(session.state.solvedCount, 1);
  const state = session.state;
  state.solved[1] = true;
  state.revealedKeyword[1] = 'U';
  assert.equal(session.state.solved[1], false);
  assert.equal(session.state.revealedKeyword[1], null);
});

test('Có thể đoán từ khóa sớm; đoán sai không kết thúc lượt', () => {
  const session = createCrosswordSession();
  assert.deepEqual(session.submitKeyword('đội quân'), { correct: false });
  assert.equal(session.state.complete, false);
  assert.deepEqual(session.submitKeyword('Du Kích'), { correct: true });
  assert.equal(session.state.keywordSolved, true);
  assert.equal(session.state.complete, true);
  assert.equal(session.state.solvedCount, 0);
  assert.equal(session.submitRow(0, 'dia dao'), null);
});

test('Giải hết hàng ngang vẫn cần chốt từ khóa; chơi lại đặt lại mọi trạng thái', () => {
  const session = createCrosswordSession();
  for (let index = 0; index < crosswordRows.length; index++) assert.deepEqual(session.submitRow(index, crosswordRows[index].answer), { correct: true });
  assert.equal(session.state.solvedCount, 6);
  assert.equal(session.state.revealedKeyword.join(''), 'DUKICH');
  assert.equal(session.state.keywordSolved, false);
  assert.equal(session.state.complete, false);
  session.submitKeyword('DUKICH');
  assert.equal(session.state.complete, true);
  session.restart();
  assert.equal(session.state.solvedCount, 0);
  assert.equal(session.state.complete, false);
  assert.equal(session.state.keywordSolved, false);
  assert.deepEqual(session.state.solved, [false, false, false, false, false, false]);
  assert.deepEqual(session.state.revealedKeyword, [null, null, null, null, null, null]);
  assert.deepEqual(session.submitRow(0, 'Địa đạo'), { correct: true });
});
