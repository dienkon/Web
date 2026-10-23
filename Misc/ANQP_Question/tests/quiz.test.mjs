import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../src/questions.mjs';
import { createSession } from '../src/session.mjs';

test('Đúng 5 câu và đáp án D, B, B, C, B theo đề', () => {
  assert.equal(questions.length, 5);
  assert.deepEqual(questions.map(q => 'ABCD'[q.correct]), ['D', 'B', 'B', 'C', 'B']);
  assert.ok(questions.every(q => q.answers.length === 4 && q.text.length > 0));
});
test('Chặn bỏ qua câu, đáp án không hợp lệ và bấm đáp án nhiều lần', () => {
  const quiz = createSession(questions);
  assert.equal(quiz.next(), false);
  assert.equal(quiz.choose(4), null);
  assert.equal(quiz.choose(-1), null);
  assert.equal(quiz.choose(1.2), null);
  assert.equal(quiz.choose(3).correct, true);
  assert.equal(quiz.choose(3), null);
  assert.equal(quiz.choose(0), null);
  assert.equal(quiz.state.score, 1);
  assert.equal(quiz.next(), true);
  assert.equal(quiz.state.selected, null);
});
test('Tính điểm, kết thúc đúng câu cuối và đặt lại toàn bộ phiên', () => {
  const quiz = createSession(questions);
  [3, 1, 1, 2, 1].forEach(answer => { quiz.choose(answer); quiz.next(); });
  assert.equal(quiz.state.score, 5);
  assert.equal(quiz.state.complete, true);
  assert.equal(quiz.state.index, 4);
  assert.equal(quiz.next(), false);
  assert.equal(quiz.choose(1), null);
  quiz.restart();
  assert.equal(quiz.state.score, 0);
  assert.equal(quiz.state.index, 0);
  assert.equal(quiz.state.selected, null);
  assert.equal(quiz.state.complete, false);
});

test('Sai không lộ đáp án, không chuyển câu, được chọn tiếp đến khi đúng', () => {
  const quiz = createSession(questions);
  for (const answer of [0, 1, 2, 0]) {
    const result = quiz.choose(answer);
    assert.deepEqual(result, { correct: false, answer });
    assert.equal(quiz.state.selected, null);
    assert.equal(quiz.state.score, 0);
    assert.equal(quiz.next(), false);
    assert.equal(quiz.state.index, 0);
  }
  assert.deepEqual(quiz.choose(3), { correct: true, answer: 3 });
  assert.equal(quiz.state.score, 1);
  assert.equal(quiz.choose(3), null);
  assert.equal(quiz.next(), true);
  assert.equal(quiz.state.index, 1);
});

test('Giữ thứ tự câu gốc, đảo lựa chọn và theo dõi đúng đáp án khi mở và ôn lại', () => {
  let value = 0;
  const original = structuredClone(questions);
  const quiz = createSession(questions, { shuffleAnswers: true, random: () => value });
  function finish() {
    const orders = [];
    while (!quiz.state.complete) {
      const question = quiz.state.question;
      const source = questions[quiz.state.index];
      assert.equal(question.id, source.id);
      assert.equal(question.text, source.text);
      assert.deepEqual([...question.answers].sort(), [...source.answers].sort());
      assert.equal(question.answers[question.correct], source.answers[source.correct]);
      const wrong = (question.correct + 1) % question.answers.length;
      assert.equal(quiz.choose(wrong).correct, false);
      assert.equal(quiz.next(), false);
      assert.equal(quiz.choose(question.answers.indexOf(source.answers[source.correct])).correct, true);
      orders.push(question.answers);
      quiz.next();
    }
    assert.equal(quiz.state.score, questions.length);
    return orders;
  }
  const first = finish();
  assert.notDeepEqual(first, questions.map(q => q.answers));
  value = 0.5;
  quiz.restart();
  assert.equal(quiz.state.index, 0);
  assert.equal(quiz.state.score, 0);
  assert.equal(quiz.state.selected, null);
  assert.notDeepEqual(finish(), first);
  assert.deepEqual(questions, original);
});
