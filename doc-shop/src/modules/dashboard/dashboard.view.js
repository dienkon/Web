/**
 * Student Personal Dashboard View
 */
import { store } from "../../app/state.js";
import { Routes } from "../../app/constants.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { studyPlanService } from "../../services/study-plan.service.js";

export function renderDashboardView(container) {
  const user = store.getState().auth.currentUser;
  const userData = store.getState().user.data;
  const { xp, level, streak } = store.getState().gamification;
  const readingProgress = store.getState().library.readingProgress;
  const tasks = store.getState().studyPlan.tasks || [];
  const examCountdowns = studyPlanService.getExamCountdowns().slice(0, 2);

  const studentName = userData?.name || user?.displayName || "Học sinh";
  const studentClass = userData?.class || "Khối 12";
  const studentSchool = userData?.school || "THPT Quốc Gia";

  // XP progress to next level
  const nextLevelXP = (level) * (level) * 100;
  const currentLevelBaseXP = (level - 1) * (level - 1) * 100;
  const xpInCurrentLevel = Math.max(0, xp - currentLevelBaseXP);
  const xpNeeded = Math.max(1, nextLevelXP - currentLevelBaseXP);
  const xpPct = Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));

  // Recent reads
  const recentReads = Object.entries(readingProgress || {}).sort((a, b) => b[1].lastReadAt - a[1].lastReadAt).slice(0, 3);

  container.innerHTML = `
    <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
      <!-- Top Welcome Banner -->
      <div class="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="relative z-10 space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">Góc học tập số</span>
            <span class="px-3 py-1 bg-amber-400/30 backdrop-blur-md text-amber-200 border border-amber-400/40 rounded-full text-xs font-bold flex items-center gap-1">
              🔥 Chuỗi ${streak} ngày học liên tiếp
            </span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Xin chào, ${escapeHtml(studentName)}! 👋</h1>
          <p class="text-emerald-100 text-sm max-w-xl">
            ${escapeHtml(studentClass)} • ${escapeHtml(studentSchool)} • Chúc bạn có một buổi học tập hiệu quả và bứt phá điểm số!
          </p>
        </div>

        <!-- Level & XP Badge -->
        <div class="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl w-full md:w-72 shrink-0 space-y-2 relative z-10">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="flex items-center gap-1">⭐ Level ${level}</span>
            <span>${xp} XP</span>
          </div>
          <div class="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
            <div class="bg-amber-400 h-2.5 rounded-full transition-all duration-300" style="width: ${xpPct}%"></div>
          </div>
          <div class="text-[11px] text-emerald-100/90 text-right">
            Cần thêm ${nextLevelXP - xp} XP để lên Level ${level + 1}
          </div>
        </div>

        <!-- Decorative background circles -->
        <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- Exam Countdowns Widget -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${examCountdowns.map(exam => `
          <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div class="space-y-1">
              <span class="text-xs font-bold px-2 py-0.5 rounded text-white" style="background-color: ${exam.color}">${escapeHtml(exam.badge)}</span>
              <h3 class="font-bold text-sm text-gray-900">${escapeHtml(exam.name)}</h3>
              <p class="text-xs text-gray-500">Mục tiêu bứt phá điểm số 2027</p>
            </div>
            <div class="flex items-center gap-2 text-center shrink-0">
              <div class="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <div class="text-xl font-black text-emerald-700">${exam.days}</div>
                <div class="text-[10px] text-emerald-600 uppercase font-bold">Ngày</div>
              </div>
              <div class="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                <div class="text-xl font-black text-gray-700">${exam.hours}</div>
                <div class="text-[10px] text-gray-500 uppercase font-bold">Giờ</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button data-nav="${Routes.LIBRARY}" class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group">
          <span class="text-2xl p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">📚</span>
          <span class="text-xs font-bold text-gray-800">Thư viện của tôi</span>
        </button>
        <button data-nav="${Routes.QUIZ}" class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group">
          <span class="text-2xl p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">🎯</span>
          <span class="text-xs font-bold text-gray-800">Thi thử & Luyện đề</span>
        </button>
        <button data-nav="${Routes.FLASHCARDS}" class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group">
          <span class="text-2xl p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">🧠</span>
          <span class="text-xs font-bold text-gray-800">Ôn Flashcard</span>
        </button>
        <button data-nav="${Routes.NOTES}" class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group">
          <span class="text-2xl p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">📝</span>
          <span class="text-xs font-bold text-gray-800">Sổ tay ghi chú</span>
        </button>
        <button data-nav="${Routes.AI}" class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group">
          <span class="text-2xl p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">🤖</span>
          <span class="text-xs font-bold text-gray-800">Hỏi Trợ lý DkAI</span>
        </button>
        <button data-nav="${Routes.STUDY_PLAN}" class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group">
          <span class="text-2xl p-2.5 bg-teal-50 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">📅</span>
          <span class="text-xs font-bold text-gray-800">Kế hoạch học tập</span>
        </button>
      </div>

      <!-- Two Columns: Recent Reads & Today Tasks -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Document Reads (2 Cols) -->
        <div class="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
              <span>📖</span> Tài liệu đang đọc dở
            </h3>
            <button data-nav="${Routes.LIBRARY}" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Xem tất cả thư viện →</button>
          </div>

          ${recentReads.length === 0 ? `
            <div class="p-8 text-center text-sm text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <span class="text-3xl block mb-2">📑</span>
              Bạn chưa mở tài liệu nào gần đây. Hãy vào Thư viện hoặc Cửa hàng để bắt đầu đọc nhé!
            </div>
          ` : `
            <div class="space-y-3">
              ${recentReads.map(([docId, prog]) => `
                <div class="p-4 rounded-2xl bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 transition-colors flex items-center justify-between">
                  <div class="space-y-1 max-w-[70%]">
                    <h4 class="font-bold text-sm text-gray-900 truncate">${escapeHtml(prog.title || 'Tài liệu học tập')}</h4>
                    <div class="text-xs text-gray-500">Đã đọc đến Trang ${prog.page} / ${prog.totalPages} (${prog.progressPct}%)</div>
                    <div class="w-48 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${prog.progressPct}%"></div>
                    </div>
                  </div>
                  <button data-nav="${Routes.DOCUMENT_DETAIL}" data-nav-params="${docId}" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors">
                    Đọc tiếp
                  </button>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <!-- Today Study Tasks (1 Col) -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
              <span>✅</span> Nhiệm vụ hôm nay
            </h3>
            <button data-nav="${Routes.STUDY_PLAN}" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700">+ Thêm việc</button>
          </div>

          ${tasks.length === 0 ? `
            <div class="p-8 text-center text-sm text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Không có nhiệm vụ nào hôm nay
            </div>
          ` : `
            <div class="space-y-2.5 max-h-72 overflow-y-auto">
              ${tasks.slice(0, 4).map(task => `
                <div class="p-3 rounded-xl border border-gray-200 flex items-start gap-2.5 ${task.completed ? 'bg-gray-50 opacity-60' : 'bg-white'}">
                  <input type="checkbox" ${task.completed ? 'checked' : ''} class="mt-1 rounded text-emerald-600" disabled />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-gray-900 truncate ${task.completed ? 'line-through' : ''}">${escapeHtml(task.title)}</div>
                    <div class="text-[11px] text-gray-500">${escapeHtml(task.subject)} • Hạn: ${task.dueDate}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}
