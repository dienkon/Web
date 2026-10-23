// Khung, nhãn và nội dung DOM độc lập; không ghi câu hỏi lên ảnh.
export function questionPanel(text, number) {
  const panel = document.createElement('section');
  panel.className = 'question-panel frame';
  panel.setAttribute('aria-labelledby', 'question-text');
  panel.innerHTML = `<img class="question-crest" src="./assets/frame-question-crest.png" alt="" aria-hidden="true"><div class="panel-paper"><h1 id="question-text" tabindex="-1"></h1></div>`;
  panel.querySelector('h1').textContent = text;
  panel.dataset.question = number;
  return panel;
}

export function answerPanel(text, index, onChoose) {
  const button = document.createElement('button');
  const letter = 'ABCD'[index];
  button.type = 'button';
  button.className = 'answer-panel frame';
  button.dataset.answer = index;
  button.setAttribute('aria-label', `${letter}. ${text}`);
  button.innerHTML = `<span class="answer-frame-body" aria-hidden="true"></span><img class="original-answer-frame" src="./assets/frame-badge-${letter.toLowerCase()}.png" alt="" aria-hidden="true"><span class="answer-paper"><span class="answer-text"></span></span><span class="answer-result" aria-hidden="true"></span>`;
  button.querySelector('.answer-text').textContent = text;
  button.addEventListener('click', () => onChoose(index));
  return button;
}
