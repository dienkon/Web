/**
 * Analytics Dashboard UI Feature Component
 * Integrates AnalyticsEngine with rich interactive UI: tabs, grouping, sorting, search, heatmap, and exports.
 */

import { analyticsEngine } from "./analytics-engine.js";
import { escapeHTML, $, $$ } from "../utils/dom.js";
import { DAY_NAMES, DAY_SHORT_NAMES, formatDurationShort } from "../utils/format.js";
import { COLOR_MAP } from "../state/store.js";
import { events } from "../core/events.js";

export class AnalyticsFeature {
  constructor(store) {
    this.store = store;
    this.activeTab = "overview";
    this.groupingMode = "subject-teacher-room";
    this.subjectSearch = "";
    this.distributionMetric = "percent"; // 'percent' | 'hours' | 'sessions'
  }

  init() {
    events.on("analytics:open", () => this.open());
  }

  open() {
    this.renderDashboard();
    events.emit("modal:open", "modal-analytics");
  }

  getMetrics() {
    const state = this.store.getState();
    const data = analyticsEngine.computeAll(state.schedule, state.timeSlots, state.lessons, this.groupingMode);
    return {
      totalSessions: data.overview.totalSessions,
      completedCount: data.overview.completedSessions,
      completionRate: data.overview.completionRate,
      focusMinutes: data.overview.totalFocusMinutes,
      totalMinutes: data.overview.totalStudyMinutes,
      balanceStatus: data.overview.completionRate > 70 ? "Tiến độ xuất sắc" : "Bình thường",
      balanceColor: data.overview.completionRate > 70 ? "text-emerald-500" : "text-sky-500",
    };
  }

  generateInsights() {
    const state = this.store.getState();
    const data = analyticsEngine.computeAll(state.schedule, state.timeSlots, state.lessons, this.groupingMode);
    return data.insights;
  }

  renderDashboard(containerId = "analytics-modal-content") {
    const container = $(`#${containerId}`);
    if (!container) return;

    const state = this.store.getState();
    const data = analyticsEngine.computeAll(state.schedule, state.timeSlots, state.lessons, this.groupingMode);

    container.innerHTML = `
      <div class="flex flex-col md:flex-row gap-4 h-full">
        <!-- Sidebar Navigation (Desktop) / Top Nav (Mobile) -->
        <div class="w-full md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pr-0 md:pr-3 text-xs font-semibold select-none no-scrollbar">
          <button type="button" data-analytics-tab="overview" class="analytics-tab-btn ${this.activeTab === "overview" ? "active" : ""}">
            <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
            <span>Tổng quan</span>
          </button>
          <button type="button" data-analytics-tab="subjects" class="analytics-tab-btn ${this.activeTab === "subjects" ? "active" : ""}">
            <i data-lucide="book-open" class="w-4 h-4"></i>
            <span>Theo môn học</span>
          </button>
          <button type="button" data-analytics-tab="daily" class="analytics-tab-btn ${this.activeTab === "daily" ? "active" : ""}">
            <i data-lucide="calendar" class="w-4 h-4"></i>
            <span>Theo ngày & Tải</span>
          </button>
          <button type="button" data-analytics-tab="breaks" class="analytics-tab-btn ${this.activeTab === "breaks" ? "active" : ""}">
            <i data-lucide="coffee" class="w-4 h-4"></i>
            <span>Khoảng nghỉ</span>
          </button>
          <button type="button" data-analytics-tab="teachers-rooms" class="analytics-tab-btn ${this.activeTab === "teachers-rooms" ? "active" : ""}">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span>GV & Phòng</span>
          </button>
          <button type="button" data-analytics-tab="heatmap" class="analytics-tab-btn ${this.activeTab === "heatmap" ? "active" : ""}">
            <i data-lucide="grid" class="w-4 h-4"></i>
            <span>Heatmap & Phân bổ</span>
          </button>
          <button type="button" data-analytics-tab="insights" class="analytics-tab-btn ${this.activeTab === "insights" ? "active" : ""}">
            <i data-lucide="sparkles" class="w-4 h-4 text-amber-500"></i>
            <span>Gợi ý thông minh</span>
          </button>

          <div class="hidden md:block my-2 border-t border-slate-200 dark:border-slate-800"></div>

          <!-- Export Action Buttons -->
          <div class="hidden md:flex flex-col gap-1.5 mt-auto">
            <span class="text-[10px] uppercase font-bold text-slate-400 px-2">Xuất báo cáo:</span>
            <button type="button" id="btn-export-analytics-excel" class="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
              <span>Xuất Excel (.xlsx)</span>
            </button>
            <button type="button" id="btn-export-analytics-csv" class="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
              <span>Xuất CSV</span>
            </button>
            <button type="button" id="btn-export-analytics-json" class="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Xuất JSON</span>
            </button>
          </div>
        </div>

        <!-- Main Tab Content Area -->
        <div class="flex-1 min-w-0 overflow-y-auto max-h-[70vh] pr-1">
          <div id="analytics-tab-view-container">
            ${this.renderActiveTab(data)}
          </div>
        </div>
      </div>
    `;

    if (typeof lucide !== "undefined") lucide.createIcons();
    this.bindTabEvents(container, data);
  }

  renderActiveTab(data) {
    switch (this.activeTab) {
      case "overview":
        return this.renderOverviewTab(data);
      case "subjects":
        return this.renderSubjectsTab(data);
      case "daily":
        return this.renderDailyTab(data);
      case "breaks":
        return this.renderBreaksTab(data);
      case "teachers-rooms":
        return this.renderTeachersRoomsTab(data);
      case "heatmap":
        return this.renderHeatmapTab(data);
      case "insights":
        return this.renderInsightsTab(data);
      default:
        return this.renderOverviewTab(data);
    }
  }

  renderOverviewTab(data) {
    const o = data.overview;
    return `
      <div class="space-y-4">
        <!-- Main 4 Key Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-slate-400">Tổng ca học</span>
            <div class="text-2xl font-black text-slate-900 dark:text-white mt-1">${o.totalSessions} <span class="text-xs font-normal text-slate-500">tiết</span></div>
            <div class="text-[11px] text-slate-500 mt-1">${o.totalStudyHours} giờ học cả tuần</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-slate-400">Hoàn thành</span>
            <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">${o.completionRate}%</div>
            <div class="text-[11px] text-slate-500 mt-1">${o.completedSessions} / ${o.totalSessions} ca hoàn thành</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-slate-400">Thời lượng Focus</span>
            <div class="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">${o.totalFocusHours}h</div>
            <div class="text-[11px] text-slate-500 mt-1">${o.totalFocusMinutes} phút tập trung cao</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-slate-400">Số môn học</span>
            <div class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">${o.activeUniqueSubjects}</div>
            <div class="text-[11px] text-slate-500 mt-1">trên ${o.totalSubjectsInLibrary} môn trong kho</div>
          </div>
        </div>

        <!-- Secondary Highlights Card -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
              <i data-lucide="flame" class="w-4 h-4 text-amber-500"></i>
              <span>Ngày bận rộn nhất</span>
            </div>
            <div class="text-base font-bold text-slate-900 dark:text-white">${o.busiestDay.name}</div>
            <div class="text-xs text-slate-500">${o.busiestDay.minutes} phút (${+(o.busiestDay.minutes / 60).toFixed(1)}h học)</div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
              <i data-lucide="award" class="w-4 h-4 text-sky-500"></i>
              <span>Môn học nhiều nhất</span>
            </div>
            <div class="text-base font-bold text-slate-900 dark:text-white truncate">${escapeHTML(o.topSubject.name)}</div>
            <div class="text-xs text-slate-500">${o.topSubject.count} ca học trong tuần</div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
              <i data-lucide="map-pin" class="w-4 h-4 text-emerald-500"></i>
              <span>Địa điểm / Phòng top</span>
            </div>
            <div class="text-base font-bold text-slate-900 dark:text-white truncate">${escapeHTML(o.topRoom.name)}</div>
            <div class="text-xs text-slate-500">${o.topRoom.count} lượt sử dụng</div>
          </div>
        </div>

        <!-- Weekly Summary Quick Table -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h4 class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">Tổng quan 7 ngày trong tuần</h4>
          <div class="grid grid-cols-7 gap-1.5 text-center">
            ${data.daily
              .map(
                (d) => `
              <div class="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">${d.shortName}</span>
                <span class="text-base font-black text-slate-900 dark:text-white my-1">${d.sessionCount}</span>
                <span class="text-[10px] font-semibold text-slate-400">${d.totalHoursFormatted}h</span>
                <div class="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700 text-[10px] font-bold text-${d.workloadColor}-600 dark:text-${d.workloadColor}-400">
                  ${d.workloadScore}đ
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  renderSubjectsTab(data) {
    let filtered = data.subjects;
    if (this.subjectSearch) {
      const q = this.subjectSearch.toLowerCase().trim();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(q) || s.teacher.toLowerCase().includes(q) || s.room.toLowerCase().includes(q));
    }

    return `
      <div class="space-y-3">
        <!-- Controls: Grouping selector & Search -->
        <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500">Phân tích theo:</span>
            <select id="select-analytics-grouping" class="input py-1 px-2.5 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-lg">
              <option value="subject-teacher-room" ${this.groupingMode === "subject-teacher-room" ? "selected" : ""}>Môn + Phụ trách + Vị trí (Chuẩn)</option>
              <option value="subject" ${this.groupingMode === "subject" ? "selected" : ""}>Chỉ theo Môn</option>
              <option value="subject-teacher" ${this.groupingMode === "subject-teacher" ? "selected" : ""}>Môn + Phụ trách</option>
              <option value="subject-room" ${this.groupingMode === "subject-room" ? "selected" : ""}>Môn + Vị trí / Phòng</option>
              <option value="teacher" ${this.groupingMode === "teacher" ? "selected" : ""}>Theo Giáo viên / Phụ trách</option>
              <option value="room" ${this.groupingMode === "room" ? "selected" : ""}>Theo Vị trí / Phòng học</option>
              <option value="color" ${this.groupingMode === "color" ? "selected" : ""}>Theo Nhãn màu</option>
            </select>
          </div>

          <div class="relative min-w-[200px]">
            <input
              type="text"
              id="input-analytics-subject-search"
              placeholder="Tìm theo môn, GV, phòng..."
              value="${escapeHTML(this.subjectSearch)}"
              class="input py-1 pl-7 pr-3 text-xs w-full bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-lg"
            />
            <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2"></i>
          </div>
        </div>

        <!-- Subjects Table -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="p-3">Môn học / Nhóm</th>
                <th class="p-3">Phụ trách</th>
                <th class="p-3">Vị trí</th>
                <th class="p-3 text-center">Số ca</th>
                <th class="p-3 text-center">Tổng giờ</th>
                <th class="p-3 text-center">Tỷ trọng</th>
                <th class="p-3 text-center">Hoàn thành</th>
                <th class="p-3">Ngày học</th>
                <th class="p-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
              ${filtered.length === 0 ? `
                <tr><td colspan="9" class="p-6 text-center text-slate-400">Không tìm thấy môn học nào phù hợp</td></tr>
              ` : filtered.map((s) => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer" data-subject-key="${escapeHTML(s.key)}">
                  <td class="p-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${s.colorHex}"></span>
                    <span>${escapeHTML(s.name)}</span>
                  </td>
                  <td class="p-3 text-slate-600 dark:text-slate-300">${escapeHTML(s.teacher || "-")}</td>
                  <td class="p-3 text-slate-600 dark:text-slate-300">${escapeHTML(s.room || "-")}</td>
                  <td class="p-3 text-center font-bold text-slate-900 dark:text-white">${s.sessionCount}</td>
                  <td class="p-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400">${s.totalHoursFormatted}h</td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      ${s.percentageOfTotalTime}%
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span class="font-bold ${s.completionRate >= 70 ? "text-emerald-500" : "text-slate-400"}">${s.completionRate}%</span>
                  </td>
                  <td class="p-3 text-slate-500 text-[11px]">${s.daysList.join(", ") || "-"}</td>
                  <td class="p-3 text-right">
                    <button type="button" class="btn btn-secondary px-2 py-1 text-[11px] btn-open-subject-drawer" data-subject-name="${escapeHTML(s.name)}">
                      Xem
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderDailyTab(data) {
    return `
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${data.daily
            .map(
              (d) => `
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2">
                  <span class="font-black text-base text-slate-900 dark:text-white">${d.dayName}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${d.sessionCount} ca</span>
                </div>
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                  <span class="text-[10px] uppercase font-bold text-slate-400">Workload:</span>
                  <span class="font-black text-${d.workloadColor}-600 dark:text-${d.workloadColor}-400">${d.workloadScore}/100 (${d.workloadLevel})</span>
                </div>
              </div>

              <!-- Daily Metrics Grid -->
              <div class="grid grid-cols-3 gap-2 text-xs mb-3">
                <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span class="text-[10px] text-slate-400 block font-semibold">Thời lượng học</span>
                  <span class="font-bold text-slate-900 dark:text-white">${d.totalHoursFormatted}h (${d.totalMinutes}p)</span>
                </div>
                <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span class="text-[10px] text-slate-400 block font-semibold">Khung giờ</span>
                  <span class="font-bold text-slate-900 dark:text-white">${d.startTime} - ${d.endTime}</span>
                </div>
                <div class="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span class="text-[10px] text-slate-400 block font-semibold">Chuỗi liên tục max</span>
                  <span class="font-bold ${d.longestStreak >= 3 ? "text-amber-500" : "text-slate-900 dark:text-white"}">${d.longestStreak} tiết</span>
                </div>
              </div>

              <!-- Breaks in Day -->
              <div class="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                <span>Số khoảng nghỉ: <b>${d.breakCount}</b> (Tổng: ${d.totalBreakMinutes}p)</span>
                <span>Nghỉ dài nhất: <b>${d.longestBreakMinutes}p</b></span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  renderBreaksTab(data) {
    const b = data.breaks;
    return `
      <div class="space-y-4">
        <!-- 4 Duration Brackets Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-rose-500">&lt; 10 phút (Gấp)</span>
            <div class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">${b.brackets.short.count}</div>
            <span class="text-[11px] text-slate-400">chuyển tiếp rất nhanh</span>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-emerald-500">10 - 20 phút (Chuẩn)</span>
            <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">${b.brackets.standard.count}</div>
            <span class="text-[11px] text-slate-400">nghỉ giải lao chuẩn</span>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-sky-500">20 - 30 phút (Vừa)</span>
            <div class="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">${b.brackets.moderate.count}</div>
            <span class="text-[11px] text-slate-400">nghỉ ngơi thư thả</span>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span class="text-[10px] uppercase font-bold text-purple-500">&gt; 30 phút (Dài)</span>
            <div class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">${b.brackets.long.count}</div>
            <span class="text-[11px] text-slate-400">nghỉ trưa / ăn tối</span>
          </div>
        </div>

        <!-- All Breaks List Table -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs uppercase tracking-wider font-bold text-slate-400">Danh sách các khoảng nghỉ trong tuần</h4>
            <span class="text-xs text-slate-500">Tổng ${b.totalBreaks} khoảng nghỉ • Trung bình: ${b.avgBreakMinutes}p/lần</span>
          </div>

          <div class="max-h-72 overflow-y-auto space-y-2 pr-1">
            ${b.allBreaks.length === 0 ? `
              <div class="p-6 text-center text-xs text-slate-400">Không có khoảng nghỉ nào giữa các ca học.</div>
            ` : b.allBreaks.map((item) => `
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 dark:text-white w-14">${item.dayName}</span>
                  <span class="font-mono text-slate-500">${item.startTime} → ${item.endTime}</span>
                  <span class="text-slate-400 hidden sm:inline">(${escapeHTML(item.beforeSubject)} ➔ ${escapeHTML(item.afterSubject)})</span>
                </div>
                <span class="font-bold px-2 py-0.5 rounded-lg ${item.durationMinutes < 10 ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"}">
                  ${item.durationMinutes} phút
                </span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  renderTeachersRoomsTab(data) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Teachers Column -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h4 class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center gap-1.5">
            <i data-lucide="user" class="w-4 h-4 text-sky-500"></i>
            <span>Giáo viên / Người phụ trách (${data.teachers.length})</span>
          </h4>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
            ${data.teachers.length === 0 ? `<div class="text-xs text-slate-400 p-4 text-center">Chưa có thông tin giáo viên.</div>` : data.teachers.map((t) => `
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(t.name)}</span>
                  <span class="font-bold text-sky-600 dark:text-sky-400">${t.totalHoursFormatted}h (${t.sessions} ca)</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-1">Môn: ${escapeHTML(t.subjects || "-")}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Rooms Column -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h4 class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center gap-1.5">
            <i data-lucide="map-pin" class="w-4 h-4 text-emerald-500"></i>
            <span>Phòng học / Địa điểm (${data.rooms.length})</span>
          </h4>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
            ${data.rooms.length === 0 ? `<div class="text-xs text-slate-400 p-4 text-center">Chưa có thông tin phòng học.</div>` : data.rooms.map((r) => `
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-900 dark:text-white">${escapeHTML(r.name)}</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400">${r.totalHoursFormatted}h (${r.sessions} ca)</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-1">Môn: ${escapeHTML(r.subjects || "-")}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  renderHeatmapTab(data) {
    const days = [1, 2, 3, 4, 5, 6, 0];
    const dist = data.distribution;

    return `
      <div class="space-y-5">
        <!-- Workload Heatmap -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <i data-lucide="flame" class="w-4 h-4 text-amber-500"></i>
              <span>Ma trận mật độ học tập trong tuần (Heatmap)</span>
            </h4>
            <div class="flex items-center gap-1 text-[10px] text-slate-400">
              <span>Ít</span>
              <span class="w-2.5 h-2.5 rounded-xs bg-slate-200 dark:bg-slate-800"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-sky-200 dark:bg-sky-950"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-sky-400 dark:bg-sky-700"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-sky-600 dark:bg-sky-500"></span>
              <span>Nhiều</span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-center text-xs border-separate border-spacing-1">
              <thead>
                <tr>
                  <th class="p-1.5 text-left text-[11px] font-bold text-slate-400 w-28">Khung giờ</th>
                  ${days.map((d) => `<th class="p-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">${DAY_SHORT_NAMES[d]}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${data.heatmap.map((row) => `
                  <tr>
                    <td class="p-1.5 text-left text-[11px] font-mono text-slate-500 whitespace-nowrap bg-white dark:bg-slate-800/50 rounded-lg">
                      ${row.label} (${row.start})
                    </td>
                    ${days.map((d) => {
                      const cell = row.cells[d];
                      let cellBg = "bg-slate-100 dark:bg-slate-800/40 text-transparent";
                      if (cell.hasActivity) {
                        cellBg = cell.intensity === 4
                          ? "bg-sky-600 text-white font-bold"
                          : cell.intensity === 3
                          ? "bg-sky-400 dark:bg-sky-600 text-white font-bold"
                          : cell.intensity === 2
                          ? "bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100"
                          : "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300";
                      }
                      return `
                        <td
                          class="p-1.5 rounded-lg text-[10px] transition cursor-pointer ${cellBg}"
                          title="${cell.hasActivity ? `${DAY_NAMES[d]} • ${cell.subject} (${row.start} - ${row.end}) • ${cell.durationMinutes}p` : `${DAY_NAMES[d]} • Trống`}"
                        >
                          ${cell.hasActivity ? escapeHTML(cell.subject.substring(0, 8)) : "—"}
                        </td>
                      `;
                    }).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Subject Distribution Progress Bars -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 class="text-xs uppercase tracking-wider font-bold text-slate-400">Phân bổ tỷ trọng môn học</h4>
            <div class="flex items-center gap-1 text-xs">
              <button type="button" data-dist-metric="percent" class="px-2 py-0.5 rounded-lg font-semibold ${this.distributionMetric === "percent" ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}">
                % Tỷ lệ
              </button>
              <button type="button" data-dist-metric="hours" class="px-2 py-0.5 rounded-lg font-semibold ${this.distributionMetric === "hours" ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}">
                Tổng giờ
              </button>
              <button type="button" data-dist-metric="sessions" class="px-2 py-0.5 rounded-lg font-semibold ${this.distributionMetric === "sessions" ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}">
                Số ca
              </button>
            </div>
          </div>

          <div class="space-y-3">
            ${dist.items.map((item) => {
              const displayVal = this.distributionMetric === "hours"
                ? `${item.hoursFormatted} giờ`
                : this.distributionMetric === "sessions"
                ? `${item.sessions} ca`
                : `${item.percentTime}%`;
              return `
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full" style="background-color: ${item.colorHex}"></span>
                      ${escapeHTML(item.subject)}
                    </span>
                    <span class="font-bold text-slate-600 dark:text-slate-400">${displayVal}</span>
                  </div>
                  <div class="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${item.percentTime}%; background-color: ${item.colorHex};"></div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }

  renderInsightsTab(data) {
    const severityStyles = {
      critical: "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200",
      warning: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200",
      info: "bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-200",
      positive: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200",
    };

    const severityIcons = {
      critical: "alert-octagon",
      warning: "alert-triangle",
      info: "info",
      positive: "check-circle-2",
    };

    return `
      <div class="space-y-3">
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          Hệ thống Rule Engine phân tích lịch trình tự động dựa trên thời lượng, chuỗi học liên tục, phân bổ môn học và khoảng nghỉ giữa các ca.
        </div>

        <div class="space-y-2.5">
          ${data.insights.length === 0 ? `
            <div class="p-8 text-center text-xs text-slate-400">
              Lịch trình của bạn hiện đang rất cân bằng, không có cảnh báo nào đặc biệt!
            </div>
          ` : data.insights.map((ins) => `
            <div class="p-3.5 rounded-2xl border ${severityStyles[ins.severity] || severityStyles.info} text-xs flex items-start gap-3">
              <i data-lucide="${severityIcons[ins.severity] || "info"}" class="w-5 h-5 shrink-0 mt-0.5"></i>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm">${escapeHTML(ins.title)}</span>
                  <span class="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/40">${ins.badge}</span>
                </div>
                <p class="mt-1 leading-relaxed opacity-90">${escapeHTML(ins.desc)}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  bindTabEvents(container, data) {
    // Tab switching
    container.querySelectorAll(".analytics-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.analyticsTab;
        this.renderDashboard();
      });
    });

    // Grouping selector
    const selectGrouping = container.querySelector("#select-analytics-grouping");
    if (selectGrouping) {
      selectGrouping.addEventListener("change", (e) => {
        this.groupingMode = e.target.value;
        this.renderDashboard();
      });
    }

    // Subject search
    const inputSearch = container.querySelector("#input-analytics-subject-search");
    if (inputSearch) {
      inputSearch.addEventListener("input", (e) => {
        this.subjectSearch = e.target.value;
        const viewContainer = container.querySelector("#analytics-tab-view-container");
        if (viewContainer) {
          const freshData = analyticsEngine.computeAll(this.store.getState().schedule, this.store.getState().timeSlots, this.store.getState().lessons, this.groupingMode);
          viewContainer.innerHTML = this.renderSubjectsTab(freshData);
          if (typeof lucide !== "undefined") lucide.createIcons();
          this.bindTabEvents(container, freshData);
        }
      });
    }

    // Distribution metric buttons
    container.querySelectorAll("[data-dist-metric]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.distributionMetric = btn.dataset.distMetric;
        this.renderDashboard();
      });
    });

    // Subject Drawer opener
    container.querySelectorAll(".btn-open-subject-drawer").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const subName = btn.dataset.subjectName;
        const subObj = data.subjects.find((s) => s.name === subName);
        if (subObj) {
          events.emit("drawer:open-subject-detail", subObj);
        }
      });
    });

    // Exports
    container.querySelector("#btn-export-analytics-excel")?.addEventListener("click", () => {
      analyticsEngine.exportData("excel", data);
    });
    container.querySelector("#btn-export-analytics-csv")?.addEventListener("click", () => {
      analyticsEngine.exportData("csv", data);
    });
    container.querySelector("#btn-export-analytics-json")?.addEventListener("click", () => {
      analyticsEngine.exportData("json", data);
    });
  }
}
