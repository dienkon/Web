import { crosswordRows, crosswordKeyword } from './crossword-data.mjs';

export function normalizeCrosswordAnswer(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z]/g, '');
}

export function createCrosswordSession(rows = crosswordRows, keyword = crosswordKeyword) {
  const normalizedAnswers = rows.map(row => normalizeCrosswordAnswer(row.answer));
  const normalizedKeyword = normalizeCrosswordAnswer(keyword);
  let solved = rows.map(() => false);
  let keywordSolved = false;
  return {
    get state() {
      return {
        solved: [...solved],
        solvedCount: solved.filter(Boolean).length,
        complete: keywordSolved,
        keywordSolved,
        revealedKeyword: solved.map((done, index) => done ? normalizedAnswers[index][rows[index].keywordIndex] : null),
      };
    },
    submitRow(index, value) {
      if (keywordSolved || !Number.isInteger(index) || index < 0 || index >= rows.length) return null;
      if (solved[index]) return { correct: true, alreadySolved: true };
      const correct = normalizeCrosswordAnswer(value) === normalizedAnswers[index];
      if (correct) solved[index] = true;
      return { correct };
    },
    submitKeyword(value) {
      const correct = normalizeCrosswordAnswer(value) === normalizedKeyword;
      if (correct) keywordSolved = true;
      return { correct };
    },
    restart() {
      solved = rows.map(() => false);
      keywordSolved = false;
    },
  };
}
