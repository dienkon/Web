import { crosswordRows, crosswordKeyword } from './crossword-data.mjs';

export function normalizeCrosswordAnswer(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z]/g, '');
}

export function createCrosswordSession(rows = crosswordRows, keyword = crosswordKeyword, { shuffleRows = false, random = Math.random } = {}) {
  const normalizedAnswers = rows.map(row => normalizeCrosswordAnswer(row.answer));
  const normalizedKeyword = normalizeCrosswordAnswer(keyword);
  function makeRowOrder(previous) {
    const canonical = rows.map((_, index) => index);
    const order = [...canonical];
    if (!shuffleRows || order.length < 2) return order;
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const same = other => other && order.every((value, index) => value === other[index]);
    // At most two rotations are forbidden for six distinct rows. A bounded
    // fallback also handles a deterministic random source without retry loops.
    // Two rows have only one noncanonical order, so consecutive repeats are unavoidable.
    for (let rotations = 0; rotations < order.length && (same(canonical) || (order.length > 2 && same(previous))); rotations++) {
      order.push(order.shift());
    }
    return order;
  }
  let rowOrder = makeRowOrder();
  let solved = rows.map(() => false);
  let keywordSolved = false;
  return {
    get state() {
      return {
        rowOrder: [...rowOrder],
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
      rowOrder = makeRowOrder(rowOrder);
      solved = rows.map(() => false);
      keywordSolved = false;
    },
  };
}
