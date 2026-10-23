export function createSession(questionBank, { shuffleAnswers = false, random = Math.random } = {}) {
  // Keep the original question order; track the correct option through the shuffle.
  function makeOrder() {
    return questionBank.map(question => {
      const options = question.answers.map((text, originalIndex) => ({ text, originalIndex }));
      if (shuffleAnswers) for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return {
        ...question,
        answers: options.map(option => option.text),
        correct: options.findIndex(option => option.originalIndex === question.correct),
      };
    });
  }
  let questions = makeOrder();
  let index = 0;
  let score = 0;
  let selected = null;
  let complete = false;
  return {
    get state() { return { index, score, selected, complete, total: questions.length, question: questions[index] }; },
    choose(answer) {
      if (complete || selected !== null || !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
      const correct = answer === questions[index].correct;
      if (correct) { selected = answer; score++; }
      // A wrong attempt neither solves the question nor reveals the correct option.
      return { correct, answer };
    },
    next() {
      if (complete || selected === null) return false;
      if (index === questions.length - 1) complete = true;
      else { index++; selected = null; }
      return true;
    },
    restart() { questions = makeOrder(); index = 0; score = 0; selected = null; complete = false; },
  };
}
