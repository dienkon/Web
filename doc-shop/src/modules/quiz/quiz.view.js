/**
 * Interactive Quiz & Practice Exam View
 */
import { store } from "../../app/state.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { SAMPLE_QUIZZES, quizService } from "../../services/quiz.service.js";
import { toast } from "../../components/toast.js";
import { confirmDialog } from "../../components/ConfirmDialog.js";

export function renderQuizView(container) {
  let activeQuizId = null;
  let currentAnswers = {};
  let timerInterval = null;
  let remainingSeconds = 0;
  let activeQuestionIndex = 0;
  let completedAttempt = null;

  function render() {
    if (completedAttempt) {
      renderResult();
      return;
    }

    if (activeQuizId) {
      renderQuizRunner();
      return;
    }

    const attempts = store.getState().quiz.attempts || [];

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>🎯</span> Luyện thi & Thi thử trắc nghiệm
            </h1>
            <p class="text-xs text-gray-500 mt-1">Đề thi bám sát cấu trúc Bộ Giáo dục & Đào tạo có bấm giờ và giải chi tiết</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200">
              Đã làm: ${attempts.length} đề thi
            </span>
          </div>
        </div>

        <!-- Quizzes Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${SAMPLE_QUIZZES.map(quiz => `
            <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-5 card-hover">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200">
                    ${escapeHtml(quiz.subject)}
                  </span>
                  <span class="text-xs text-gray-500 font-medium flex items-center gap-1">
                    ⏱️ ${quiz.durationMinutes} phút • ${quiz.questions.length} câu
                  </span>
                </div>
                <h3 class="font-extrabold text-lg text-gray-900">${escapeHtml(quiz.title)}</h3>
                <p class="text-xs text-gray-500">Bộ câu hỏi trắc nghiệm khách quan có lời giải chi tiết và tính điểm tự động.</p>
              </div>

              <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span class="text-xs font-semibold text-emerald-600">+${30 + quiz.questions.length * 15} XP khi hoàn thành</span>
                <button data-action="start-quiz" data-quiz-id="${quiz.id}" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                  Bắt đầu làm bài ▶
                </button>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- Recent Attempts Table -->
        ${attempts.length > 0 ? `
          <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h3 class="font-bold text-base text-gray-900">Lịch sử bài thi đã hoàn thành</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-gray-200 text-gray-400 uppercase tracking-wider">
                    <th class="py-3 px-4">Đề thi</th>
                    <th class="py-3 px-4">Môn học</th>
                    <th class="py-3 px-4 text-center">Điểm số</th>
                    <th class="py-3 px-4 text-center">Kết quả</th>
                    <th class="py-3 px-4 text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  ${attempts.slice(0, 5).map(att => `
                    <tr class="hover:bg-gray-50">
                      <td class="py-3.5 px-4 font-bold text-gray-900">${escapeHtml(att.quizTitle)}</td>
                      <td class="py-3.5 px-4 text-gray-600">${escapeHtml(att.subject)}</td>
                      <td class="py-3.5 px-4 text-center font-black text-emerald-600 text-sm">${att.scorePct}%</td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${att.scorePct >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                          ${att.correctCount} / ${att.totalQuestions} câu
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right text-gray-400">${new Date(att.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    container.querySelectorAll('[data-action="start-quiz"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const quizId = btn.dataset.quizId;
        const quiz = SAMPLE_QUIZZES.find(q => q.id === quizId);
        if (quiz) {
          activeQuizId = quizId;
          currentAnswers = {};
          activeQuestionIndex = 0;
          completedAttempt = null;
          remainingSeconds = quiz.durationMinutes * 60;
          startTimer();
          render();
        }
      });
    });
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      remainingSeconds--;
      const timerDisplay = document.getElementById("quiz-timer-display");
      if (timerDisplay) {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        timerDisplay.innerText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      }
      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        submitCurrentQuiz();
      }
    }, 1000);
  }

  function submitCurrentQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    const quiz = SAMPLE_QUIZZES.find(q => q.id === activeQuizId);
    const totalDuration = quiz.durationMinutes * 60;
    const timeSpent = totalDuration - remainingSeconds;
    completedAttempt = quizService.submitAttempt(activeQuizId, currentAnswers, timeSpent);
    render();
  }

  function renderQuizRunner() {
    const quiz = SAMPLE_QUIZZES.find(q => q.id === activeQuizId);
    const question = quiz.questions[activeQuestionIndex];
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6 fade-in pb-12">
        <!-- Runner Header -->
        <div class="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div class="space-y-0.5">
            <span class="text-xs font-bold text-gray-400 uppercase">${escapeHtml(quiz.subject)}</span>
            <h2 class="font-extrabold text-sm text-gray-900">${escapeHtml(quiz.title)}</h2>
          </div>
          <div class="flex items-center gap-4">
            <div class="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span class="text-xs">⏱️</span>
              <span id="quiz-timer-display" class="font-black text-sm text-emerald-700 font-mono">
                ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}
              </span>
            </div>
            <button id="quiz-submit-btn" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
              Nộp bài 🏁
            </button>
          </div>
        </div>

        <!-- Question Navigation Bubbles -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 hide-scroll bg-white p-3 rounded-2xl border border-gray-200">
          ${quiz.questions.map((q, idx) => {
            const isAnswered = currentAnswers[q.id] !== undefined;
            const isCurrent = idx === activeQuestionIndex;
            return `
              <button data-q-index="${idx}" class="w-9 h-9 rounded-xl font-bold text-xs shrink-0 transition-colors ${isCurrent ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : isAnswered ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                ${idx + 1}
              </button>
            `;
          }).join("")}
        </div>

        <!-- Active Question Box -->
        <div class="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div class="space-y-2">
            <span class="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">Câu hỏi ${activeQuestionIndex + 1} / ${quiz.questions.length}</span>
            <h3 class="text-base font-bold text-gray-900 leading-relaxed">${escapeHtml(question.text)}</h3>
          </div>

          <!-- Options List -->
          <div class="space-y-3">
            ${question.options.map((opt, optIdx) => {
              const letter = ["A", "B", "C", "D"][optIdx];
              const isSelected = currentAnswers[question.id] === optIdx;
              return `
                <div data-opt-idx="${optIdx}" class="cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' : 'border-gray-200 hover:border-gray-300 bg-white'}">
                  <span class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}">
                    ${letter}
                  </span>
                  <span class="text-sm font-medium text-gray-800">${escapeHtml(opt)}</span>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Bottom Navigation -->
          <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
            <button id="quiz-prev-q" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl disabled:opacity-30" ${activeQuestionIndex <= 0 ? 'disabled' : ''}>
              ◀ Câu trước
            </button>
            <button id="quiz-next-q" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl disabled:opacity-30" ${activeQuestionIndex >= quiz.questions.length - 1 ? 'disabled' : ''}>
              Câu tiếp theo ▶
            </button>
          </div>
        </div>
      </div>
    `;

    // Events
    container.querySelectorAll("[data-q-index]").forEach(btn => {
      btn.addEventListener("click", () => {
        activeQuestionIndex = Number(btn.dataset.qIndex);
        renderQuizRunner();
      });
    });

    container.querySelectorAll("[data-opt-idx]").forEach(card => {
      card.addEventListener("click", () => {
        currentAnswers[question.id] = Number(card.dataset.optIdx);
        renderQuizRunner();
      });
    });

    container.querySelector("#quiz-prev-q")?.addEventListener("click", () => {
      if (activeQuestionIndex > 0) {
        activeQuestionIndex--;
        renderQuizRunner();
      }
    });

    container.querySelector("#quiz-next-q")?.addEventListener("click", () => {
      if (activeQuestionIndex < quiz.questions.length - 1) {
        activeQuestionIndex++;
        renderQuizRunner();
      }
    });

    container.querySelector("#quiz-submit-btn")?.addEventListener("click", async () => {
      const ok = await confirmDialog("Bạn có chắc chắn muốn nộp bài thi?", {
        title: "Xác nhận nộp bài",
        confirmText: "Nộp bài",
      });
      if (ok) {
        submitCurrentQuiz();
      }
    });
  }

  function renderResult() {
    const att = completedAttempt;

    container.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-6 fade-in pb-12">
        <!-- Score Card Banner -->
        <div class="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center space-y-4">
          <span class="text-6xl block">🏆</span>
          <h2 class="text-2xl font-black text-gray-900">Kết quả bài thi</h2>
          <p class="text-xs text-gray-500">${escapeHtml(att.quizTitle)}</p>

          <div class="inline-flex items-baseline gap-2 bg-emerald-50 border border-emerald-200 px-6 py-3 rounded-2xl">
            <span class="text-4xl font-black text-emerald-700">${att.scorePct}%</span>
            <span class="text-sm font-bold text-emerald-600">(${att.correctCount}/${att.totalQuestions} câu đúng)</span>
          </div>

          <div class="pt-4 flex items-center justify-center gap-3">
            <button id="quiz-back-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
              Quay lại danh sách đề thi
            </button>
          </div>
        </div>

        <!-- Detailed Review -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
          <h3 class="font-bold text-base text-gray-900">Xem lại chi tiết & Lời giải</h3>
          <div class="space-y-4">
            ${att.details.map((d, idx) => `
              <div class="p-4 rounded-2xl border ${d.isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'} space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-gray-700">Câu ${idx + 1}</span>
                  <span class="text-xs font-bold ${d.isCorrect ? 'text-emerald-600' : 'text-red-600'}">
                    ${d.isCorrect ? '✓ Đúng' : '✗ Sai'}
                  </span>
                </div>
                <div class="text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
                  <span class="font-bold text-gray-800">Giải thích:</span> ${escapeHtml(d.explanation)}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    container.querySelector("#quiz-back-btn")?.addEventListener("click", () => {
      activeQuizId = null;
      completedAttempt = null;
      render();
    });
  }

  render();
}
