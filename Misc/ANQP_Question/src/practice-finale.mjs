export const practiceEssayQuestion = 'Nghệ thuật quân sự của lực lượng vũ trang địa phương được thể hiện ở những nội dung cơ bản nào?';

export function mountPracticeFinale(host, { onRestart, announce, isMuted = () => false }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const previousFocus = document.activeElement;
  const timers = new Set();
  const sources = new Set();
  let audio;
  let stage = 'intro';
  const root = document.createElement('section');
  root.id = 'practice-finale';
  root.dataset.stage = stage;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Phần tự luận và giao lưu');
  root.tabIndex = -1;
  let destroyed = false;
  root.innerHTML = `<div class="pf-landscape" aria-hidden="true"></div><div class="pf-horizon" aria-hidden="true"></div><div class="pf-distant-shells" aria-hidden="true"><i></i><i></i><i></i></div><div class="pf-smoke pf-smoke-one" aria-hidden="true"></div><div class="pf-smoke pf-smoke-two" aria-hidden="true"></div><div class="pf-smoke pf-smoke-three" aria-hidden="true"></div><div class="pf-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="pf-ground" aria-hidden="true"></div><div class="pf-tank" aria-hidden="true"><svg viewBox="0 0 860 380" fill="none"><defs><linearGradient id="pf-hull" x1="200" y1="100" x2="540" y2="330" gradientUnits="userSpaceOnUse"><stop stop-color="#859265"/><stop offset=".42" stop-color="#4e6340"/><stop offset="1" stop-color="#1d3022"/></linearGradient><linearGradient id="pf-edge" x2="0" y2="1"><stop stop-color="#c0bd8c"/><stop offset=".35" stop-color="#69704a"/><stop offset="1" stop-color="#2c402a"/></linearGradient><linearGradient id="pf-track" x2="0" y2="1"><stop stop-color="#273126"/><stop offset="1" stop-color="#0d1813"/></linearGradient></defs><ellipse cx="390" cy="345" rx="340" ry="25" fill="#020906" opacity=".55"/><path d="M106 235h545l54 41-20 57H110l-36-53Z" fill="url(#pf-track)" stroke="#8b9271" stroke-width="10"/><g fill="#3b4935" stroke="#9a9e7c" stroke-width="7"><circle cx="144" cy="285" r="35"/><circle cx="232" cy="285" r="35"/><circle cx="320" cy="285" r="35"/><circle cx="408" cy="285" r="35"/><circle cx="496" cy="285" r="35"/><circle cx="584" cy="285" r="35"/><circle cx="657" cy="285" r="26"/></g><g class="pf-track-links" stroke="#9da183" stroke-width="5"><path d="M102 249h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22M110 323h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22m8 0h22"/></g><path d="m119 180 424-13 132 61 24 28H86Z" fill="url(#pf-hull)" stroke="#a6ad7c" stroke-width="5"/><path d="m122 180 34-34h398l-11 21Z" fill="#8e9670"/><path d="M100 233h580" stroke="#c0bf8d" stroke-width="5"/><path d="m172 190 63 2-11 36-73-1Zm113-2 73-2-2 42h-82Zm112-5 82-2 18 47h-92Z" fill="#293d29" opacity=".6"/><g class="pf-turret"><path d="m275 107 62-35h152l63 53-17 52H253Z" fill="url(#pf-hull)" stroke="#a6ad7c" stroke-width="5"/><path d="m337 72 30-20h86l36 20" fill="#71825b" stroke="#a6ad7c" stroke-width="4"/><path d="M470 113h295v27H475" fill="#526743" stroke="#bec397" stroke-width="5"/><path d="M756 107h55v38h-55Z" fill="#405638" stroke="#b2b58b" stroke-width="4"/><path d="m357 100 9 20h23l-18 15 6 23-20-13-20 13 6-23-18-15h23Z" fill="#e6c375"/><path d="M288 82V22" stroke="#acb28a" stroke-width="3"/><path d="M289 23c22-14 36 15 64 1v36c-28 14-42-16-64-2Z" fill="#9d392b"/><path d="m310 31 3 7h8l-6 5 2 8-7-4-7 4 2-8-6-5h8Z" fill="#e6c375"/></g><g class="pf-muzzle"><path d="m810 126 41-21-13 22 21 16-48-4Z" fill="#ffe6a2"/><circle cx="815" cy="126" r="27" fill="#e8a84a" opacity=".5"/></g></svg></div><div class="pf-bombs" aria-hidden="true"><svg class="pf-bomb pf-bomb-one" viewBox="0 0 70 160"><path d="m25 41-9-31 19 11L54 9 44 42" fill="#728261" stroke="#a9aa7b" stroke-width="2"/><path d="M25 37C9 64 8 99 19 123l16 22 16-22c11-24 10-59-6-86Z" fill="#3a5035" stroke="#b1b78d" stroke-width="3"/><path d="M14 73h43v13H14Z" fill="#ccb66b"/></svg><svg class="pf-bomb pf-bomb-two" viewBox="0 0 70 160"><path d="m25 41-9-31 19 11L54 9 44 42" fill="#728261" stroke="#a9aa7b" stroke-width="2"/><path d="M25 37C9 64 8 99 19 123l16 22 16-22c11-24 10-59-6-86Z" fill="#3a5035" stroke="#b1b78d" stroke-width="3"/><path d="M14 73h43v13H14Z" fill="#ccb66b"/></svg></div><div class="pf-blast pf-blast-one" aria-hidden="true"><i></i><b></b></div><div class="pf-blast pf-blast-two" aria-hidden="true"><i></i><b></b></div><div class="pf-content"></div>`;
  host.replaceChildren(root);
  root.querySelector('.pf-ground').classList.add('pf-terrain');
  root.querySelectorAll('.pf-embers i').forEach((ember, index) => {
    ember.style.setProperty('--pf-x', `${8 + index * 12}%`);
    ember.style.setProperty('--pf-time', `${8 + index % 4}s`);
    ember.style.setProperty('--pf-delay', `${-index * 1.8}s`);
  });
  const content = root.querySelector('.pf-content');

  function schedule(callback, delay) {
    const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) callback(); }, delay);
    timers.add(timer);
  }
  function boom() {
    if (destroyed || reduced.matches || isMuted()) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audio ||= new AudioContext();
      audio.resume().catch(() => {});
      const duration = .65;
      const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
      const source = audio.createBufferSource(); source.buffer = buffer;
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(650, audio.currentTime); filter.frequency.exponentialRampToValueAtTime(55, audio.currentTime + duration);
      const gain = audio.createGain(); gain.gain.setValueAtTime(.0001, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.14, audio.currentTime + .025); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
      source.connect(filter); filter.connect(gain); gain.connect(audio.destination);
      source.onended = () => { sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
      sources.add(source); source.start();
    } catch { /* Optional audio stays silent when unavailable. */ }
  }
  function showEssay() {
    if (destroyed || stage !== 'intro') return;
    stage = 'essay'; root.dataset.stage = stage;
    content.innerHTML = `<div class="pf-essay"><span class="pf-kicker">CÂU HỎI TỰ LUẬN</span><h1 id="practice-essay-question" class="pf-essay-question" tabindex="-1"></h1></div><button type="button" id="pf-continue" class="pf-continue" aria-label="Tiếp tục đến phần mời đặt câu hỏi">Nhấn <kbd>ENTER ↵</kbd> để tiếp tục</button>`;
    content.querySelector('h1').textContent = practiceEssayQuestion;
    content.querySelector('.pf-continue').addEventListener('click', showQuestions);
    content.querySelector('h1').focus({ preventScroll: true });
    announce?.(practiceEssayQuestion);
  }
  function showQuestions() {
    if (destroyed || stage !== 'essay') return;
    stage = 'questions'; root.dataset.stage = stage;
    content.innerHTML = `<div class="pf-invitation"><span class="pf-kicker">GIAO LƯU & THẢO LUẬN</span><h1 id="practice-final-questions" tabindex="-1">MỜI CÁC BẠN<br><strong>ĐẶT CÂU HỎI</strong></h1><p>CHO NHÓM CHÚNG MÌNH</p><span class="pf-gold-line" aria-hidden="true"></span></div><button type="button" id="pf-restart" class="pf-restart">↻ Luyện tập lại</button>`;
    content.querySelector('.pf-restart').addEventListener('click', () => { if (!destroyed) onRestart?.(); });
    content.querySelector('h1').focus({ preventScroll: true });
    announce?.('Mời các bạn đặt câu hỏi cho nhóm chúng mình.');
  }
  function onKeyDown(event) {
    if (event.key === 'Tab') {
      const button = root.querySelector('button');
      event.preventDefault();
      (button || root).focus({ preventScroll: true });
      return;
    }
    if (event.key !== 'Enter' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    // Consume Enter during the short intro without skipping its reveal.
    if (event.target.closest?.('.pf-restart')) return;
    event.preventDefault(); event.stopPropagation();
    if (stage === 'essay') showQuestions();
  }
  function onMotionChange() { if (reduced.matches && stage === 'intro') showEssay(); }
  document.addEventListener('keydown', onKeyDown, true);
  reduced.addEventListener?.('change', onMotionChange);
  if (reduced.matches) showEssay();
  else {
    content.innerHTML = `<div class="pf-intro-title"><span>HOÀN THÀNH LUYỆN TẬP</span><h1>TIẾN VÀO<br>THỬ THÁCH MỚI</h1></div>`;
    announce?.('Hoàn thành phần luyện tập. Chuẩn bị câu hỏi tự luận.');
    schedule(boom, 1050); schedule(boom, 1700); schedule(boom, 2150);
    schedule(showEssay, 2600);
    root.focus({ preventScroll: true });
  }
  return {
    get stage() { return stage; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      timers.forEach(clearTimeout); timers.clear();
      document.removeEventListener('keydown', onKeyDown, true);
      reduced.removeEventListener?.('change', onMotionChange);
      for (const source of sources) { try { source.stop(); } catch {} }
      sources.clear();
      audio?.close().catch(() => {});
      root.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    },
  };
}
