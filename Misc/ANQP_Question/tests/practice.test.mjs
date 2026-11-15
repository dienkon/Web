import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceQuestions } from '../src/practice-questions.mjs';
import { createSession } from '../src/session.mjs';

test('Luyện tập có đủ 5 câu theo thứ tự đề và đáp án C, A, B, C, B', () => {
  assert.equal(practiceQuestions.length, 5);
  assert.deepEqual(practiceQuestions.map(q => q.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(practiceQuestions.map(q => 'ABCD'[q.correct]), ['C', 'A', 'B', 'C', 'B']);
  assert.deepEqual(practiceQuestions.map(q => q.answers[q.correct]), [
    'Tập trung toàn bộ lực lượng mở các chiến dịch quy mô lớn trên toàn quốc.',
    'Chỉ huy, lực lượng, phương tiện, hậu cần.',
    'Địa đạo Củ Chi và địa đạo Vịnh Mốc.',
    'Vận dụng linh hoạt nhiều hình thức chiến thuật, sáng tạo nhiều cách đánh.',
    'Tích cực học tập, rèn luyện, sẵn sàng thực hiện nghĩa vụ quân sự khi đến tuổi quy định.',
  ]);
  assert.deepEqual(practiceQuestions.map(q => q.text), [
    'Nội dung nào dưới đây không nằm trong nét chính về nghệ thuật quân sự của lực lượng vũ trang địa phương?',
    'Phương châm "bốn tại chỗ" trong nghệ thuật quân sự địa phương bao gồm:',
    'Điển hình của việc cải tạo địa hình, xây dựng công sự, đường hầm kiên cố được nhắc đến trong bài là:',
    'Các thủ đoạn chiến đấu linh hoạt như tập kích, phục kích, độn thổ, độn thủy thuộc về nội dung nào của nghệ thuật quân sự địa phương?',
    'Trách nhiệm nào sau đây thuộc về học sinh trong việc giữ gìn và phát huy truyền thống quê hương?',
  ]);
  assert.ok(practiceQuestions.every(q => q.answers.length === 4 && new Set(q.answers).size === 4));
});

test('Luyện tập cho thử lại, chấm đúng sau đảo lựa chọn và làm lại không đổi ngân hàng đề', () => {
  const original = structuredClone(practiceQuestions);
  let randomValue = 0;
  const session = createSession(practiceQuestions, { shuffleAnswers: true, random: () => randomValue });
  function completeRound() {
    const answerOrders = [];
    for (const source of original) {
      const { question, score } = session.state;
      assert.equal(question.id, source.id);
      assert.equal(question.text, source.text);
      assert.deepEqual([...question.answers].sort(), [...source.answers].sort());
      const correctIndex = question.answers.indexOf(source.answers[source.correct]);
      const wrongIndex = (correctIndex + 1) % 4;
      assert.equal(question.correct, correctIndex);
      assert.deepEqual(session.choose(wrongIndex), { correct: false, answer: wrongIndex });
      assert.equal(session.state.selected, null);
      assert.equal(session.state.score, score);
      assert.equal(session.next(), false);
      assert.deepEqual(session.choose(correctIndex), { correct: true, answer: correctIndex });
      assert.equal(session.choose(correctIndex), null);
      answerOrders.push(question.answers);
      assert.equal(session.next(), true);
    }
    assert.equal(session.state.complete, true);
    assert.equal(session.state.score, 5);
    assert.equal(session.next(), false);
    return answerOrders;
  }
  const first = completeRound();
  assert.notDeepEqual(first, original.map(q => q.answers));
  randomValue = 0.5;
  session.restart();
  assert.equal(session.state.index, 0);
  assert.equal(session.state.score, 0);
  assert.equal(session.state.selected, null);
  assert.equal(session.state.complete, false);
  assert.notDeepEqual(completeRound(), first);
  assert.deepEqual(practiceQuestions, original);
});
