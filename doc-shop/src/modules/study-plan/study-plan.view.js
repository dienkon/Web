/**
 * Study Planner & Exam Countdown View
 */
import { store } from "../../app/state.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { studyPlanService } from "../../services/study-plan.service.js";
import { toast } from "../../components/toast.js";
import { modal } from "../../components/Modal.js";

export function renderStudyPlanView(container) {
  let subjectFilter = "all";

  function render() {
    const tasks = store.getState().studyPlan.tasks || [];
    const examCountdowns = studyPlanService.getExamCountdowns();

    const filteredTasks = subjectFilter === "all"
      ? tasks
      : tasks.filter(t => t.subject === subjectFilter);

    const completedCount = tasks.filter(t => t.completed).length;

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>📅</span> Kế hoạch học tập & Đếm ngược kỳ thi
            </h1>
            <p class="text-xs text-gray-500 mt-1">Lập mục tiêu học tập hàng ngày và theo dõi sát sao mốc thời gian các kỳ thi quan trọng</p>
          </div>
          <button id="plan-add-task-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto">
            <span>➕</span> Thêm nhiệm vụ học tập
          </button>
        </div>

        <!-- Exam Countdowns Section -->
        <div class="space-y-3">
          <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
            <span>⏳</span> Đếm ngược kỳ thi quan trọng 2027
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${examCountdowns.map(exam => `
              <div class="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                <div class="space-y-1">
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded text-white inline-block" style="background-color: ${exam.color}">
                    ${escapeHtml(exam.badge)}
                  </span>
                  <h4 class="font-bold text-sm text-gray-900 leading-snug">${escapeHtml(exam.name)}</h4>
                </div>

                <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-around text-center">
                  <div>
                    <div class="text-2xl font-black text-gray-900">${exam.days}</div>
                    <div class="text-[10px] uppercase font-bold text-gray-400">Ngày</div>
                  </div>
                  <span class="text-gray-300 font-bold">:</span>
                  <div>
                    <div class="text-2xl font-black text-gray-700">${exam.hours}</div>
                    <div class="text-[10px] uppercase font-bold text-gray-400">Giờ</div>
                  </div>
                  <span class="text-gray-300 font-bold">:</span>
                  <div>
                    <div class="text-2xl font-black text-gray-500">${exam.minutes}</div>
                    <div class="text-[10px] uppercase font-bold text-gray-400">Phút</div>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Tasks Management Section -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-base text-gray-900">Danh sách nhiệm vụ & Mục tiêu</h3>
              <p class="text-xs text-gray-500">Đã hoàn thành: <span class="font-bold text-emerald-600">${completedCount}/${tasks.length}</span> nhiệm vụ</p>
            </div>

            <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button data-subj="all" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${subjectFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Tất cả</button>
              <button data-subj="Toán Học" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${subjectFilter === 'Toán Học' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Toán Học</button>
              <button data-subj="Tiếng Anh" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${subjectFilter === 'Tiếng Anh' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Tiếng Anh</button>
              <button data-subj="Vật Lý" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${subjectFilter === 'Vật Lý' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Vật Lý</button>
              <button data-subj="Hóa Học" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${subjectFilter === 'Hóa Học' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">Hóa Học</button>
            </div>
          </div>

          <!-- Tasks List -->
          ${filteredTasks.length === 0 ? `
            <div class="p-8 text-center text-sm text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Chưa có nhiệm vụ nào cho danh mục này. Hãy thêm nhiệm vụ để theo sát lịch ôn!
            </div>
          ` : `
            <div class="space-y-3">
              ${filteredTasks.map(task => `
                <div class="p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${task.completed ? 'bg-gray-50/60 border-gray-200 opacity-60' : 'bg-white border-gray-200 hover:border-emerald-300 shadow-xs'}">
                  <div class="flex items-center gap-3.5 flex-1 min-w-0">
                    <input type="checkbox" data-action="toggle-task" data-task-id="${task.id}" ${task.completed ? 'checked' : ''} class="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-bold text-gray-900 truncate ${task.completed ? 'line-through text-gray-400' : ''}">${escapeHtml(task.title)}</div>
                      <div class="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span class="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-semibold">${escapeHtml(task.subject)}</span>
                        <span>Hạn hoàn thành: <strong>${task.dueDate}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button data-action="delete-task" data-task-id="${task.id}" class="p-2 text-gray-400 hover:text-red-600 rounded-xl transition-colors" title="Xóa nhiệm vụ">
                    🗑️
                  </button>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    `;

    // Events
    container.querySelectorAll("[data-subj]").forEach(btn => {
      btn.addEventListener("click", () => {
        subjectFilter = btn.dataset.subj;
        render();
      });
    });

    container.querySelector("#plan-add-task-btn")?.addEventListener("click", () => {
      const today = new Date().toISOString().slice(0, 10);
      const formHtml = `
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Nhiệm vụ học tập</label>
          <input type="text" name="title" required placeholder="Ví dụ: Làm đề Toán Hàm số 2026..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Môn học</label>
          <input type="text" name="subject" placeholder="Toán Học, Vật Lý, Hóa Học..." value="Toán Học" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Hạn chót</label>
          <input type="date" name="dueDate" value="${today}" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      `;

      modal.openForm("Thêm nhiệm vụ học tập mới", formHtml, async (formData) => {
        const title = formData.get("title")?.trim();
        const subject = formData.get("subject")?.trim() || "Toán Học";
        const dueDate = formData.get("dueDate") || today;
        if (!title) return;

        studyPlanService.addTask({ title, subject, dueDate });
        toast.success("Đã thêm nhiệm vụ mới vào kế hoạch!");
        render();
      }, "Thêm nhiệm vụ");
    });

    container.querySelectorAll('[data-action="toggle-task"]').forEach(cb => {
      cb.addEventListener("change", () => {
        studyPlanService.toggleTask(cb.dataset.taskId);
        render();
      });
    });

    container.querySelectorAll('[data-action="delete-task"]').forEach(btn => {
      btn.addEventListener("click", () => {
        studyPlanService.deleteTask(btn.dataset.taskId);
        toast.info("Đã xóa nhiệm vụ");
        render();
      });
    });
  }

  render();
}
