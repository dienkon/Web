import bank from "../shared/study-questions.json";
import { shell, escape, read, write, toast } from "./common.js";
shell("study");
let progress = read("study-progress", { answers: {}, current: 0 }),
  mode = "all",
  topic = "",
  answered = false;
if (!progress.answers || typeof progress.answers !== "object")
  progress = { answers: {}, current: 0 };
const $ = (id) => document.getElementById(id);
document.querySelector("#app").innerHTML =
  '<section class="hero"><div><div class="eyebrow">Học một chút, hiểu thêm mỗi ngày</div><h1>Kiến thức được kết nối.</h1><p>60 câu hỏi về nguyên tố, cấu trúc phân tử và thực hành. Mỗi câu đều có giải thích để bạn hiểu bản chất.</p></div></section><div class="toolbar panel"><button class="button primary" id="all">Tất cả câu hỏi</button><button class="button" id="wrong">Ôn lại câu sai</button><label><span class="sr-only">Chủ đề</span><select id="topic"><option value="">Mọi chủ đề</option>Nguyên tố</option><option>Cấu trúc &amp; liên kết</option><option>Thực hành</option></select></label><span class="muted" id="stats"></span><button class="button" id="reset">Đặt lại tiến độ</button></div><section class="panel quiz" id="quiz"></section>';
function queue() {
  return bank.filter(
    (q) =>
      (!topic || q.topic === topic) &&
      (mode !== "wrong" || progress.answers[q.id]?.correct === false),
  );
}
function save() {
  if (!write("study-progress", progress))
    toast("Không lưu được tiến độ trên trình duyệt.");
}
function render() {
  answered = false;
  const list = queue();
  const done = Object.values(progress.answers),
    correct = done.filter((a) => a.correct).length;
  $("stats").textContent =
    `Đã làm ${done.length}/60 · Đúng ${correct} · Cần ôn ${done.length - correct}`;
  if (!list.length) {
    $("quiz").innerHTML =
      '<div class="empty"><h2>Không có câu cần ôn trong chủ đề này.</h2><p>Chọn tất cả câu hỏi hoặc đổi chủ đề để tiếp tục.</p></div>';
    return;
  }
  const index = Math.max(0, Number(progress.current) || 0) % list.length,
    q = list[index];
  $("quiz").innerHTML =
    `<div class="card-top"><span class="badge">${escape(q.topic)}</span><span class="muted">${index + 1} / ${list.length}</span></div><div class="progress"><span style="width:${((index + 1) / list.length) * 100}%"></span></div><h2>${escape(q.question)}</h2><div class="quiz-options">${q.options.map((option, i) => `<button class="button" data-answer="${i}">${String.fromCharCode(65 + i)}. ${escape(option)}</button>`).join("")}</div><div id="explanation" role="status"></div><div class="viewer-toolbar"><button class="button" id="prev" ${index === 0 ? "disabled" : ""}>← Câu trước</button><button class="button primary" id="next">Câu tiếp →</button></div>`;
  $("quiz")
    .querySelectorAll("[data-answer]")
    .forEach(
      (button) =>
        (button.onclick = () => {
          if (answered) return;
          answered = true;
          const choice = Number(button.dataset.answer);
          progress.answers[q.id] = {
            choice,
            correct: choice === q.answer,
            answeredAt: new Date().toISOString(),
          };
          save();
          $("quiz")
            .querySelectorAll("[data-answer]")
            .forEach((b) => {
              b.disabled = true;
              if (Number(b.dataset.answer) === q.answer)
                b.classList.add("correct");
              else if (b === button) b.classList.add("wrong");
            });
          $("explanation").innerHTML =
            `<div class="atom-readout"><strong>${choice === q.answer ? "Chính xác." : "Cùng xem lại nhé."}</strong> ${escape(q.explanation)}</div>`;
        }),
    );
  $("prev").onclick = () => {
    progress.current = Math.max(0, index - 1);
    save();
    render();
  };
  $("next").onclick = () => {
    progress.current = mode === "wrong" && answered ? index : index + 1;
    save();
    render();
  };
}
$("all").onclick = () => {
  mode = "all";
  progress.current = 0;
  render();
};
$("wrong").onclick = () => {
  mode = "wrong";
  progress.current = 0;
  render();
};
$("topic").onchange = (e) => {
  topic = e.target.value;
  progress.current = 0;
  render();
};
$("reset").onclick = () => {
  if (confirm("Đặt lại toàn bộ tiến độ ôn tập trên máy này?")) {
    progress = { answers: {}, current: 0 };
    save();
    render();
  }
};
render();
