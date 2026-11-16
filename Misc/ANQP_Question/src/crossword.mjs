import { crosswordRows, crosswordKeyword } from './crossword-data.mjs';
import { createCrosswordSession, normalizeCrosswordAnswer } from './crossword-session.mjs';

export function mountCrossword(main, { playFeedback, stopFeedback, announce }) {
  const game = createCrosswordSession(crosswordRows, crosswordKeyword, { shuffleRows: true });
  const typeNames = { image: 'Nhìn hình', choice: 'Trắc nghiệm', action: 'Diễn động tác', rebus: 'Nhìn hình bắt chữ' };
  const keyColumn = Math.max(...crosswordRows.map(row => row.keywordIndex));
  const columns = Math.max(...crosswordRows.map(row => keyColumn - row.keywordIndex + normalizeCrosswordAnswer(row.answer).length));
  let retryTimer = 0;
  let clock = 0;
  let activeRow = null;
  let returnFocus;
  let busy = false;
  let closeHandled = true;
  const usedHints = new Set();

  main.classList.add('crossword-main');
  main.innerHTML = `<header class="cw-heading"><h1>Mật mã rừng xanh</h1><div class="cw-counter"><strong id="cw-count">0 / 6</strong><span>HÀNG ĐÃ MỞ</span></div></header>
    <div class="cw-layout"><section class="cw-board-panel" aria-label="Bảng ô chữ"><div class="cw-panel-heading"><span id="cw-board-status">Chọn một hàng để bắt đầu</span></div><div class="cw-board-scroll"><div class="cw-grid" style="--cw-columns:${columns}"><div class="cw-key-heading" style="grid-template-columns:44px repeat(${columns},var(--cw-cell))"><span style="grid-column:${keyColumn + 2}">CỘT DỌC</span></div><div id="cw-rows"></div></div></div><p class="cw-scroll-note">Vuốt ngang để xem đủ các ô chữ.</p></section>
    <aside class="cw-sidebar"><section class="cw-key-card"><h2>Chữ gợi ý</h2><div id="cw-key-preview" class="cw-key-preview" aria-label="Các chữ vàng theo thứ tự xáo trộn"></div><button type="button" class="primary" id="cw-guess-keyword">Đoán từ khóa →</button><p>Xếp lại các chữ vàng để tìm từ khóa.</p></section><button type="button" class="utility cw-reset" id="cw-reset">↻ Chơi lại</button></aside></div>
    <dialog class="cw-dialog" id="cw-dialog" aria-labelledby="cw-dialog-title"></dialog>`;
  const dialog = main.querySelector('#cw-dialog');
  const rowsRoot = main.querySelector('#cw-rows');
  const keywordButton = main.querySelector('#cw-guess-keyword');

  function renderBoard() {
    const { solved, solvedCount, complete, revealedKeyword, rowOrder } = game.state;
    rowsRoot.replaceChildren();
    rowOrder.forEach((index, position) => {
      const row = crosswordRows[index];
      const word = normalizeCrosswordAnswer(row.answer);
      const open = solved[index] || complete;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cw-row${open ? ' is-solved' : ''}`;
      button.dataset.row = index;
      button.dataset.position = position;
      button.style.gridTemplateColumns = `44px repeat(${columns},var(--cw-cell))`;
      button.setAttribute('aria-label', `Hàng ngang ${position + 1}, ${word.length} chữ cái, ${typeNames[row.type]}${open ? `, đã mở: ${row.answer}` : ''}`);
      const number = document.createElement('span');
      number.className = 'cw-row-number'; number.textContent = position + 1;
      number.style.gridColumn = 1; button.append(number);
      [...word].forEach((letter, position) => {
        const cell = document.createElement('span');
        cell.className = `cw-cell${position === row.keywordIndex ? ' cw-key-cell' : ''}`;
        cell.style.gridColumn = keyColumn - row.keywordIndex + position + 2;
        cell.textContent = open ? letter : '·';
        cell.setAttribute('aria-hidden', 'true'); button.append(cell);
      });
      button.addEventListener('click', () => openRow(index, button));
      rowsRoot.append(button);
    });
    main.querySelector('#cw-count').textContent = `${complete ? crosswordRows.length : solvedCount} / ${crosswordRows.length}`;
    main.querySelector('#cw-board-status').textContent = complete ? 'Giải mã thành công!' : solvedCount === crosswordRows.length ? 'Xếp lại các chữ vàng để đoán từ khóa!' : 'Chọn một số để mở câu hỏi';
    const preview = main.querySelector('#cw-key-preview'); preview.replaceChildren();
    rowOrder.forEach(index => {
      const letter = normalizeCrosswordAnswer(crosswordRows[index].answer)[crosswordRows[index].keywordIndex];
      const cell = document.createElement('span');
      cell.textContent = complete ? letter : revealedKeyword[index] || '?';
      if (complete || revealedKeyword[index]) cell.classList.add('is-revealed');
      preview.append(cell);
    });
    keywordButton.textContent = complete ? 'Xem từ khóa đã giải ✓' : 'Đoán từ khóa →';
  }

  function clearClueTimers() {
    clearTimeout(retryTimer); clearInterval(clock); busy = false; stopFeedback();
  }
  function openDialog(title, source) {
    clearClueTimers(); returnFocus = source;
    closeHandled = false;
    dialog.innerHTML = `<header class="cw-dialog-header"><span class="eyebrow" id="cw-dialog-title"></span><button type="button" class="cw-close" aria-label="Đóng câu hỏi">×</button></header><div class="cw-clue-body"></div>`;
    dialog.querySelector('#cw-dialog-title').textContent = title;
    dialog.querySelector('.cw-close').addEventListener('click', closeClue);
    dialog.showModal();
    return dialog.querySelector('.cw-clue-body');
  }
  function shuffleOptions(options) {
    const result = [...options];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  function openRow(index, source) {
    activeRow = index;
    const row = crosswordRows[index];
    const displayNumber = game.state.rowOrder.indexOf(index) + 1;
    const body = openDialog(`Hàng ${String(displayNumber).padStart(2, '0')} · ${typeNames[row.type]} · ${normalizeCrosswordAnswer(row.answer).length} ô`, source);
    body.dataset.type = row.type;
    const prompt = document.createElement('h2'); prompt.className = 'cw-prompt'; prompt.textContent = row.prompt; body.append(prompt);
    const content = document.createElement('div'); content.className = 'cw-clue-content';
    const response = document.createElement('div'); response.className = 'cw-response';
    body.append(content, response);
    if (row.type === 'image') {
      const figure = document.createElement('figure'); figure.className = 'cw-image-clue';
      const picture = document.createElement('img'); picture.src = row.image; picture.alt = row.alt;
      figure.append(picture); content.append(figure);
    }
    if (row.type === 'rebus') {
      const images = document.createElement('div'); images.className = 'cw-rebus'; images.setAttribute('aria-label', 'Ghép ý của các hình từ trái sang phải');
      row.images.forEach((item, imageIndex) => {
        if (imageIndex) { const plus = document.createElement('span'); plus.className = 'cw-rebus-sign'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true'); images.append(plus); }
        const figure = document.createElement('figure'); figure.className = 'cw-rebus-picture';
        const picture = document.createElement('img'); picture.src = item.src; picture.alt = item.alt; figure.append(picture); images.append(figure);
      });
      content.append(images);
    }
    if (row.type === 'action') {
      const stage = document.createElement('section'); stage.className = 'cw-action-stage';
      stage.innerHTML = `<div class="cw-action-clock"><output id="cw-clock" aria-live="off">45</output><span>GIÂY</span><button type="button" class="cw-secondary" id="cw-start-clock">Bắt đầu diễn</button></div><details class="cw-performer-card"><summary>Thẻ người diễn</summary><p class="cw-private-note">Xem riêng, rồi đóng thẻ trước khi chiếu.</p><p id="cw-performer-instructions"></p></details>`;
      stage.querySelector('#cw-performer-instructions').textContent = row.performerInstructions;
      stage.querySelector('#cw-start-clock').addEventListener('click', () => {
        clearInterval(clock);
        stage.querySelector('details').open = false;
        const deadline = Date.now() + 45000;
        const output = stage.querySelector('#cw-clock'); output.textContent = '45';
        stage.querySelector('#cw-start-clock').textContent = 'Diễn lại 45 giây';
        announce('Bắt đầu 45 giây diễn động tác.');
        clock = setInterval(() => {
          const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); output.textContent = seconds;
          if (!seconds) { clearInterval(clock); announce('Hết giờ diễn. Cả lớp hãy đưa ra đáp án.'); }
        }, 200);
      });
      content.append(stage);
    }
    if (row.type === 'choice') {
      const choices = document.createElement('div'); choices.className = 'cw-choices';
      shuffleOptions(row.options).forEach((option, position) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'cw-choice';
        const badge = document.createElement('b'); badge.textContent = 'ABCD'[position];
        const text = document.createElement('span'); text.textContent = option;
        button.append(badge, text); button.addEventListener('click', () => submitRow(option, button)); choices.append(button);
      }); content.append(choices);
    } else {
      const form = document.createElement('form'); form.className = 'cw-answer-form';
      form.innerHTML = `<label class="sr-only" for="cw-answer">Đáp án của bạn</label><div><input id="cw-answer" name="answer" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="80" placeholder="Nhập đáp án" required><button class="primary" type="submit">Trả lời →</button></div>`;
      form.addEventListener('submit', event => { event.preventDefault(); submitRow(form.elements.answer.value); }); response.append(form);
    }
    const hint = document.createElement('div'); hint.className = 'cw-hint';
    hint.innerHTML = `<button type="button" class="cw-secondary" id="cw-show-hint">Gợi ý</button><p id="cw-hint-text" hidden></p>`;
    hint.querySelector('p').textContent = row.hint;
    const revealHint = () => { usedHints.add(index); hint.querySelector('p').hidden = false; hint.querySelector('button').disabled = true; hint.querySelector('button').textContent = 'Đã mở gợi ý'; };
    hint.querySelector('button').addEventListener('click', revealHint);
    if (usedHints.has(index)) revealHint(); response.append(hint);
    const status = document.createElement('p'); status.id = 'cw-answer-status'; status.className = 'cw-answer-status'; status.setAttribute('role', 'status'); response.append(status);
    const back = document.createElement('button'); back.type = 'button'; back.className = 'primary cw-back'; back.textContent = 'Về ô chữ →'; back.hidden = true;
    back.addEventListener('click', closeClue); response.append(back);
    if (game.state.solved[index] || game.state.complete) {
      status.textContent = `Hàng ngang đã mở: ${row.answer}.`;
      body.querySelectorAll('.cw-choice, .cw-answer-form button, .cw-answer-form input').forEach(control => { control.disabled = true; }); back.hidden = false;
    }
  }

  function lockAnswers(lock) {
    dialog.querySelectorAll('.cw-choice, .cw-answer-form button, .cw-answer-form input').forEach(control => { control.disabled = lock; });
  }
  function submitRow(value, selectedButton) {
    if (busy || !normalizeCrosswordAnswer(value)) return;
    const result = game.submitRow(activeRow, value); if (!result) return;
    if (result.alreadySolved) return;
    busy = true; lockAnswers(true); clearInterval(clock);
    const status = dialog.querySelector('#cw-answer-status');
    status.className = `cw-answer-status ${result.correct ? 'is-correct' : 'is-wrong'}`;
    status.textContent = result.correct ? `Chính xác! Hàng ngang là ${crosswordRows[activeRow].answer}.` : 'Chưa chính xác. Hãy thử lại nhé!';
    selectedButton?.classList.add(result.correct ? 'cw-choice-correct' : 'cw-choice-wrong');
    if (!result.correct) dialog.querySelector('input')?.setAttribute('aria-invalid', 'true');
    else dialog.querySelector('input')?.removeAttribute('aria-invalid');
    playFeedback(result.correct); announce(status.textContent);
    if (result.correct) {
      renderBoard();
      dialog.querySelector('.cw-back').hidden = false;
      dialog.querySelector('.cw-back').focus({ preventScroll: true });
    } else {
      retryTimer = setTimeout(() => { busy = false; lockAnswers(false); dialog.querySelector('input')?.focus({ preventScroll: true }); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 2800);
    }
  }

  function showVictory(body) {
    body.dataset.type = 'victory';
    body.innerHTML = `<section class="cw-victory"><img src="./assets/star.svg" alt=""><h2>DU KÍCH</h2><div class="cw-victory-letters" aria-label="DUKICH"></div><button type="button" class="primary" id="cw-play-again">Chơi lại ↻</button></section>`;
    [...crosswordKeyword].forEach(letter => { const cell = document.createElement('span'); cell.textContent = letter; body.querySelector('.cw-victory-letters').append(cell); });
    body.querySelector('#cw-play-again').addEventListener('click', () => { closeClue(); restart(); });
  }
  function openKeyword(source) {
    activeRow = null;
    const body = openDialog('Từ khóa · 6 ô chữ', source);
    if (game.state.complete) { showVictory(body); return; }
    body.dataset.type = 'keyword';
    body.innerHTML = `<h2 class="cw-prompt">Xếp lại chữ vàng thành từ khóa gì?</h2><form class="cw-answer-form"><label class="sr-only" for="cw-keyword">Nhập từ khóa gồm 6 chữ cái</label><div><input id="cw-keyword" name="keyword" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="Nhập từ khóa" required><button type="submit" class="primary">Giải mã →</button></div></form><p class="cw-answer-status" role="status"></p>`;
    body.querySelector('form').addEventListener('submit', event => {
      event.preventDefault(); if (busy) return;
      const input = body.querySelector('input'); if (!normalizeCrosswordAnswer(input.value)) return;
      const result = game.submitKeyword(input.value);
      busy = true; lockAnswers(true); playFeedback(result.correct);
      if (result.correct) { renderBoard(); showVictory(body); announce('Chính xác! Từ khóa là du kích. Giải mã thành công!'); }
      else {
        const status = body.querySelector('.cw-answer-status'); status.classList.add('is-wrong'); status.textContent = 'Chưa đúng từ khóa. Bạn có thể thử lại hoặc mở thêm hàng ngang.';
        input.setAttribute('aria-invalid', 'true'); announce(status.textContent);
        retryTimer = setTimeout(() => { busy = false; lockAnswers(false); input.focus({ preventScroll: true }); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 2800);
      }
    });
  }
  function restart() {
    clearClueTimers(); usedHints.clear(); game.restart(); renderBoard(); keywordButton.focus({ preventScroll: true }); announce('Đã bắt đầu lượt ô chữ mới.');
  }
  function finishClose() {
    if (closeHandled) return;
    closeHandled = true;
    clearClueTimers();
    const target = activeRow === null ? returnFocus : rowsRoot.querySelector(`[data-row="${activeRow}"]`);
    target?.focus({ preventScroll: true });
  }
  function closeClue() { dialog.close(); finishClose(); }
  dialog.addEventListener('close', () => { if (!dialog.open) finishClose(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeClue(); });
  keywordButton.addEventListener('click', () => openKeyword(keywordButton));
  main.querySelector('#cw-reset').addEventListener('click', restart);
  renderBoard();
  return { destroy() { if (dialog.open) closeClue(); else clearClueTimers(); } };
}
