import { questions } from './questions.mjs';
import { createSession } from './session.mjs';
import { questionPanel, answerPanel } from './panels.mjs';
import { createEffects } from './effects.mjs';

const app = document.querySelector('#app');
const file = location.pathname.split('/').pop();
const mode = file === 'o-chu.html' ? 'crossword' : file === 'luyen-tap.html' ? 'practice' : 'review';
const session = createSession(questions, { shuffleAnswers: true });
let busy = false;
let muted = false;
let feedbackTimer;
const sounds = { correct: new Audio('./assets/trld.mp3'), wrong: new Audio('./assets/trlsai.mp3') };
Object.values(sounds).forEach(audio => { audio.preload = 'auto'; audio.volume = .85; });

app.innerHTML = `<div class="landscape" aria-hidden="true"></div><div class="site-shell"><header class="masthead"><div class="identity"><span class="identity-seal"><img src="./assets/star.svg" alt=""></span><div><span class="eyebrow">GIÁO DỤC QUỐC PHÒNG & AN NINH</span><p>DẤU CHÂN NGƯỜI LÍNH</p></div></div><div class="utilities"><button type="button" id="sound-toggle" class="utility" aria-pressed="false">♪ <span>Âm thanh bật</span></button><button type="button" id="fullscreen" class="utility">⛶ <span>Toàn màn hình</span></button></div></header><main id="main"></main><footer class="site-footer"><span>VỮNG KIẾN THỨC · BỀN Ý CHÍ</span><span id="keyboard-hint">A–D chọn đáp án <i>·</i> Enter tiếp tục</span></footer></div><div id="effect-root" aria-hidden="true"></div><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;
const main = document.querySelector('#main');
const effects = createEffects(document.querySelector('#effect-root'));
const fullscreen = document.querySelector('#fullscreen');
const soundToggle = document.querySelector('#sound-toggle');

function announce(text) { document.querySelector('#announcement').textContent = text; }
async function enterFullscreen() {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  try { await document.documentElement.requestFullscreen(); }
  catch { fullscreen.title = 'Trình duyệt yêu cầu bấm nút hoặc nhấn F11 để vào toàn màn hình.'; }
}
fullscreen.addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  else await enterFullscreen();
});
document.addEventListener('fullscreenchange', () => {
  fullscreen.querySelector('span').textContent = document.fullscreenElement ? 'Thoát toàn màn hình' : 'Toàn màn hình';
});
// Trình duyệt thường chặn yêu cầu tự động; thử lại tại tương tác đầu tiên.
enterFullscreen();
document.addEventListener('pointerdown', enterFullscreen, { once: true });
document.addEventListener('keydown', enterFullscreen, { once: true });
soundToggle.addEventListener('click', () => {
  muted = !muted;
  soundToggle.setAttribute('aria-pressed', String(muted));
  soundToggle.querySelector('span').textContent = muted ? 'Âm thanh tắt' : 'Âm thanh bật';
  if (muted) Object.values(sounds).forEach(audio => audio.pause());
});

function renderQuestion(focus = false) {
  document.querySelector('.question-panel')?.dispose?.();
  const { index, score, total, question } = session.state;
  main.innerHTML = `<div class="section-heading"><div><span class="eyebrow gold">HỌC TẬP & RÈN LUYỆN</span><h2>Câu hỏi ôn bài</h2></div><div class="mission-info"><span>LLVT ĐỊA PHƯƠNG</span><strong><b>${String(index + 1).padStart(2, '0')}</b> / ${String(total).padStart(2, '0')}</strong></div></div><div class="progress-track" role="progressbar" aria-label="Tiến độ trả lời" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${index}"><span style="width:${index / total * 100}%"></span></div><div id="quiz-stage"></div><div class="quiz-bottom"><p class="instruction">Chọn một đáp án để kiểm tra kiến thức.</p><span class="score">${score} câu đúng</span></div><section id="feedback" class="feedback" hidden aria-label="Kết quả trả lời"></section>`;
  const stage = document.querySelector('#quiz-stage');
  stage.append(questionPanel(question.text, index + 1));
  const answers = document.createElement('div'); answers.className = 'answers'; answers.setAttribute('role', 'group'); answers.setAttribute('aria-label', 'Các đáp án');
  question.answers.forEach((text, i) => answers.append(answerPanel(text, i, choose)));
  stage.append(answers);
  if (focus) document.querySelector('#question-text').focus({ preventScroll: true });
}

function choose(index) {
  if (busy) return;
  const result = session.choose(index);
  if (!result) return;
  busy = true;
  const buttons = [...document.querySelectorAll('.answer-panel')];
  buttons.forEach(button => { button.disabled = true; });
  buttons[index].classList.add(result.correct ? 'is-correct' : 'is-wrong');
  buttons[index].querySelector('.answer-result').textContent = result.correct ? '✓' : '×';
  if (!muted) {
    Object.values(sounds).forEach(audio => { audio.pause(); audio.currentTime = 0; });
    sounds[result.correct ? 'correct' : 'wrong'].play().catch(() => announce('Trình duyệt chưa cho phép phát âm thanh.'));
  }
  effects.play(result.correct);
  announce(result.correct ? 'Chính xác!' : 'Chưa chính xác. Hãy chọn lại.');
  feedbackTimer = setTimeout(() => {
    busy = false;
    if (!result.correct) {
      buttons.forEach(button => { button.disabled = false; });
      document.querySelector('.instruction').textContent = 'Chưa chính xác. Hãy chọn lại đến khi trả lời đúng.';
      announce('Hãy thử lại. Bạn có thể tiếp tục chọn đáp án.');
      buttons[index].focus({ preventScroll: true });
      return;
    }
    const feedback = document.querySelector('#feedback');
    feedback.hidden = false;
    feedback.className = `feedback ${result.correct ? 'correct' : 'wrong'}`;
    feedback.innerHTML = `<div><span class="eyebrow">${result.correct ? 'HOÀN THÀNH MỤC TIÊU' : 'GHI NHỚ KIẾN THỨC'}</span><h2>${result.correct ? 'Chính xác!' : 'Chưa chính xác!'}</h2><p></p></div><button type="button" class="primary" id="next">${session.state.index === questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'} <span>→</span></button>`;
    feedback.querySelector('p').textContent = `Đáp án ${'ABCD'[index]}: ${session.state.question.answers[index]}`;
    document.querySelector('.instruction').textContent = result.correct ? 'Tiếp tục giữ vững phong độ!' : 'Ghi nhớ đáp án và tiếp tục luyện tập.';
    document.querySelector('.score').textContent = `${session.state.score} câu đúng`;
    document.querySelector('#next').addEventListener('click', next);
    document.querySelector('#next').focus({ preventScroll: true });
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 2700);
}
function next() {
  if (busy || !session.next()) return;
  effects.stop();
  Object.values(sounds).forEach(audio => audio.pause());
  if (session.state.complete) renderSummary();
  else renderQuestion(true);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function renderSummary() {
  document.querySelector('.question-panel')?.dispose?.();
  const { score, total } = session.state;
  main.innerHTML = `<section class="summary"><img src="./assets/star.svg" alt=""><span class="eyebrow gold">HOÀN THÀNH ÔN TẬP</span><h1>Vững bước tiến lên!</h1><p>Bạn đã hoàn thành ${total} câu hỏi về lực lượng vũ trang địa phương.</p><strong>${score}<span> / ${total}</span></strong><p>câu trả lời chính xác</p><button type="button" class="primary" id="restart">Ôn tập lại ↻</button></section>`;
  const restart = document.querySelector('#restart');
  restart.addEventListener('click', () => { session.restart(); renderQuestion(true); }); restart.focus();
  announce(`Hoàn thành. Bạn trả lời đúng ${score} trên ${total} câu.`);
}
if (mode === 'review') renderQuestion();
else {
  const title = mode === 'crossword' ? 'Trò chơi ô chữ' : 'Câu hỏi luyện tập';
  document.title = `${title} · Dấu chân người lính`;
  document.querySelector('#keyboard-hint').textContent = 'GIÁO DỤC QUỐC PHÒNG & AN NINH';
  main.innerHTML = `<section class="summary coming-soon"><img src="./assets/star.svg" alt=""><span class="eyebrow gold">KHÔNG GIAN HỌC TẬP</span><h1>${title}</h1><p>Khung trang đã sẵn sàng.<br>Nội dung sẽ được bổ sung ở bước tiếp theo.</p><a class="primary" href="./on-bai.html">Vào câu hỏi ôn bài →</a></section>`;
}
document.addEventListener('keydown', event => {
  if (mode !== 'review' || event.altKey || event.ctrlKey || event.metaKey || event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  const index = 'abcd'.indexOf(event.key.toLowerCase());
  if (index >= 0 && !session.state.complete) { event.preventDefault(); choose(index); }
  // Native Enter on focused buttons already dispatches click. Avoid advancing twice.
  if (event.key === 'Enter' && !event.target.closest('button, a') && session.state.selected !== null && !session.state.complete) { event.preventDefault(); next(); }
});
window.addEventListener('pagehide', () => { clearTimeout(feedbackTimer); effects.stop(); Object.values(sounds).forEach(audio => audio.pause()); });
