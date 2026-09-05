/**
 * Drawers & Bottom Sheets UI Component
 */

import { escapeHTML, $, $$ } from "../utils/dom.js";
import { DAY_NAMES, DAY_SHORT_NAMES, formatDurationShort } from "../utils/format.js";
import { COLOR_MAP } from "../state/store.js";
import { events } from "../core/events.js";
import { analyticsEngine } from "../features/analytics-engine.js";

export class DrawerUI {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  init() {
    this.bindEvents();
    this.bindFormEditDetail();
  }

  bindEvents() {
    // Backdrop clicks to close
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("drawer-backdrop")) {
        this.closeAll();
      }

      // Close buttons
      const closeBtn = e.target.closest("[data-drawer-close]");
      if (closeBtn) {
        const id = closeBtn.dataset.drawerClose;
        this.close(id);
      }

      // Open buttons (CRITICAL FIX: Allow buttons with [data-drawer-open] to open drawers!)
      const openBtn = e.target.closest("[data-drawer-open]");
      if (openBtn) {
        const id = openBtn.dataset.drawerOpen;
        this.open(id);
      }
    });

    events.on("drawer:open", (id) => this.open(id));
    events.on("drawer:close", (id) => this.close(id));
    events.on("drawer:open-detail", (slotKey) => this.openActivityDetail(slotKey));
    events.on("drawer:open-day-detail", (dayNum) => this.openDayDetail(dayNum));
    events.on("drawer:open-subject-detail", (subjectData) => this.openSubjectDetail(subjectData));
  }

  bindFormEditDetail() {
    const form = $("#form-edit-activity-detail");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const slotKey = $("#detail-slot-key").value;
      if (!slotKey) return;

      const state = this.store.getState();
      const item = state.schedule.find((s) => s.slotId === slotKey);
      if (!item) return;

      this.history.recordState();

      item.subject = $("#detail-subject").value.trim();
      item.teacher = $("#detail-teacher").value.trim();
      item.room = $("#detail-room").value.trim();
      item.status = $("#detail-status").value;
      item.priority = $("#detail-priority").value;
      item.isFocus = $("#detail-is-focus").checked;
      item.notes = $("#detail-notes").value.trim();

      const selectedColor = document.querySelector('input[name="edit_detail_color"]:checked');
      if (selectedColor) item.color = selectedColor.value;

      this.storage.debouncedSave();
      this.close("drawer-activity-detail");
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã lưu thay đổi cho "${item.subject}"`, type: "success" });
    });
  }

  open(drawerId) {
    const backdrop = $(`#${drawerId}-backdrop`) || $("#generic-drawer-backdrop");
    const panel = $(`#${drawerId}`);

    if (backdrop) backdrop.classList.add("active");
    if (panel) {
      panel.classList.add("active");
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  }

  close(drawerId) {
    const backdrop = $(`#${drawerId}-backdrop`) || $("#generic-drawer-backdrop");
    const panel = $(`#${drawerId}`);

    if (backdrop) backdrop.classList.remove("active");
    if (panel) panel.classList.remove("active");
  }

  closeAll() {
    $$(".drawer-backdrop.active").forEach((b) => b.classList.remove("active"));
    $$(".drawer-panel.active").forEach((p) => p.classList.remove("active"));
    $$(".mobile-bottom-sheet.active").forEach((s) => s.classList.remove("active"));
  }

  openActivityDetail(slotKey) {
    const state = this.store.getState();
    const item = state.schedule.find((s) => s.slotId === slotKey);
    if (!item) return;

    const [d, slotId] = slotKey.split("-");
    const slot = state.timeSlots.find((s) => s.id === slotId);

    const drawer = $("#drawer-activity-detail");
    if (!drawer) return;

    // Populate form
    $("#detail-slot-key").value = slotKey;
    $("#detail-subject").value = item.subject || "";
    $("#detail-teacher").value = item.teacher || "";
    $("#detail-room").value = item.room || "";
    $("#detail-status").value = item.status || "planned";
    $("#detail-priority").value = item.priority || "medium";
    $("#detail-is-focus").checked = Boolean(item.isFocus);
    $("#detail-notes").value = item.notes || "";

    const slotInfoEl = $("#detail-slot-info");
    if (slotInfoEl && slot) {
      slotInfoEl.textContent = `${DAY_NAMES[d]} • ${slot.label} (${slot.start} - ${slot.end})`;
    }

    // Color options
    const colorContainer = $("#detail-color-options");
    if (colorContainer) {
      colorContainer.innerHTML = Object.keys(COLOR_MAP)
        .map(
          (c) => `
          <label class="cursor-pointer">
            <input type="radio" name="edit_detail_color" value="${c}" class="hidden peer" ${item.color === c ? "checked" : ""} />
            <div class="w-6 h-6 rounded-lg ${COLOR_MAP[c].accent} border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-sky-500 transition"></div>
          </label>
        `
        )
        .join("");
    }

    // Render Quick Copy to Other Days Chips
    const copyContainer = $("#detail-copy-days-container");
    if (copyContainer) {
      const days = [1, 2, 3, 4, 5, 6, 0];
      copyContainer.innerHTML = days
        .filter((targetDay) => String(targetDay) !== String(d))
        .map(
          (targetDay) => `
          <button
            type="button"
            data-copy-target-day="${targetDay}"
            class="btn-copy-day px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 hover:text-sky-600 transition"
            title="Chép ca này sang ${DAY_NAMES[targetDay]}"
          >
            + ${DAY_SHORT_NAMES[targetDay]}
          </button>
        `
        )
        .join("");

      copyContainer.querySelectorAll(".btn-copy-day").forEach((btn) => {
        btn.onclick = () => {
          const targetDay = btn.dataset.copyTargetDay;
          const targetKey = `${targetDay}-${slotId}`;
          this.history.recordState();

          // Remove any existing in target slot or overwrite
          state.schedule = state.schedule.filter((s) => s.slotId !== targetKey);
          state.schedule.push({
            ...item,
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            slotId: targetKey,
          });

          this.storage.debouncedSave();
          events.emit("schedule:updated");
          events.emit("toast:show", {
            message: `Đã sao chép sang ${DAY_NAMES[targetDay]}`,
            type: "success",
          });
        };
      });
    }

    // Delete Button
    const btnDel = $("#btn-detail-delete");
    if (btnDel) {
      btnDel.onclick = () => {
        this.history.recordState();
        state.schedule = state.schedule.filter((s) => s.slotId !== slotKey);
        this.storage.debouncedSave();
        this.close("drawer-activity-detail");
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã xóa "${item.subject}"`, type: "info" });
      };
    }

    // Duplicate Button
    const btnDup = $("#btn-detail-duplicate");
    if (btnDup) {
      btnDup.onclick = () => {
        const emptySlot = state.timeSlots.find((sl) => !state.schedule.some((s) => s.slotId === `${d}-${sl.id}`));
        if (emptySlot) {
          this.history.recordState();
          state.schedule.push({
            ...item,
            id: `item_${Date.now()}`,
            slotId: `${d}-${emptySlot.id}`,
          });
          this.storage.debouncedSave();
          this.close("drawer-activity-detail");
          events.emit("schedule:updated");
          events.emit("toast:show", { message: "Đã nhân bản ca học", type: "success" });
        } else {
          events.emit("toast:show", { message: "Ngày này không còn ô trống để nhân bản", type: "error" });
        }
      };
    }

    this.open("drawer-activity-detail");
  }

  // ==================== DAY DETAIL DRAWER ====================
  openDayDetail(dayNum) {
    const state = this.store.getState();
    const data = analyticsEngine.computeAll(state.schedule, state.timeSlots, state.lessons);
    const dailyList = data.dailyStats || data.daily || [];
    const dayStat = dailyList.find((d) => d.day === dayNum) || {
      day: dayNum,
      dayName: DAY_NAMES[dayNum],
      sessionsCount: 0,
      totalMinutes: 0,
      workloadScore: 0,
      workloadLevel: "Rất nhẹ",
      maxContinuousSessions: 0,
      breaks: [],
    };

    const titleEl = $("#day-detail-title");
    const subTitleEl = $("#day-detail-subtitle");
    const workloadBadge = $("#day-detail-workload-badge");
    const totalTimeEl = $("#day-detail-total-time");
    const sessionCountEl = $("#day-detail-session-count");
    const streakEl = $("#day-detail-streak");
    const breaksSummaryEl = $("#day-detail-breaks-summary");
    const sessionsListEl = $("#day-detail-sessions-list");

    if (titleEl) titleEl.textContent = `Chi tiết ${DAY_NAMES[dayNum]}`;
    if (subTitleEl) {
      subTitleEl.textContent = `${dayStat.sessionsCount} ca học • ${formatDurationShort(dayStat.totalMinutes)}`;
    }
    if (workloadBadge) {
      workloadBadge.textContent = `${dayStat.workloadScore}/100 • ${dayStat.workloadLevel}`;
      let badgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
      if (dayStat.workloadScore >= 75) {
        badgeClass = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
      } else if (dayStat.workloadScore >= 50) {
        badgeClass = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
      }
      workloadBadge.className = `px-2.5 py-1 rounded-xl text-xs font-black ${badgeClass}`;
    }
    if (totalTimeEl) totalTimeEl.textContent = formatDurationShort(dayStat.totalMinutes);
    if (sessionCountEl) sessionCountEl.textContent = `${dayStat.sessionsCount}`;
    if (streakEl) streakEl.textContent = `${dayStat.maxContinuousSessions || 0} ca`;
    if (breaksSummaryEl) {
      const bCount = Array.isArray(dayStat.breaks) ? dayStat.breaks.length : (dayStat.breakCount ?? 0);
      breaksSummaryEl.textContent = `${bCount} khoảng nghỉ`;
    }

    // Render list of day sessions
    if (sessionsListEl) {
      const daySlots = state.timeSlots.map((slot) => {
        const item = state.schedule.find((s) => s.slotId === `${dayNum}-${slot.id}`);
        return { slot, item };
      });

      const activeDaySlots = daySlots.filter((ds) => ds.item);
      if (activeDaySlots.length === 0) {
        sessionsListEl.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Không có ca học nào được xếp vào ngày này.
          </div>
        `;
      } else {
        sessionsListEl.innerHTML = activeDaySlots
          .map(({ slot, item }) => {
            const col = COLOR_MAP[item.color] || COLOR_MAP.blue;
            const isDone = item.status === "completed";
            return `
              <div class="p-3 rounded-2xl border ${col.border} ${col.bg} flex items-center justify-between gap-2 shadow-xs transition">
                <div class="truncate">
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-xs ${col.text} truncate ${isDone ? "line-through opacity-70" : ""}">${escapeHTML(item.subject)}</span>
                    ${item.isFocus ? '<span class="text-[10px] text-amber-500 font-bold">★</span>' : ""}
                  </div>
                  <div class="text-[11px] opacity-75 truncate mt-0.5">
                    ${escapeHTML(slot.label)} (${slot.start} - ${slot.end}) • ${escapeHTML(item.room || "Tự do")}
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-toggle-day-item="${item.slotId}"
                    class="btn-toggle-day-item p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-emerald-500 transition"
                    title="${isDone ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}"
                  >
                    <i data-lucide="${isDone ? "check-circle-2" : "circle"}" class="w-4 h-4 ${isDone ? "text-emerald-500" : ""}"></i>
                  </button>
                  <button
                    type="button"
                    data-edit-day-item="${item.slotId}"
                    class="btn-edit-day-item p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-sky-500 transition"
                    title="Chỉnh sửa chi tiết"
                  >
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `;
          })
          .join("");

        // Bind clicks inside list
        sessionsListEl.querySelectorAll(".btn-toggle-day-item").forEach((btn) => {
          btn.onclick = () => {
            const slotKey = btn.dataset.toggleDayItem;
            events.emit("timetable:toggle-status", slotKey);
            setTimeout(() => this.openDayDetail(dayNum), 50);
          };
        });

        sessionsListEl.querySelectorAll(".btn-edit-day-item").forEach((btn) => {
          btn.onclick = () => {
            const slotKey = btn.dataset.editDayItem;
            this.close("drawer-day-detail");
            this.openActivityDetail(slotKey);
          };
        });
      }
    }

    // Bind Add button
    const btnAdd = $("#btn-day-detail-add");
    if (btnAdd) {
      btnAdd.onclick = () => {
        this.close("drawer-day-detail");
        const emptySlot = state.timeSlots.find((sl) => !state.schedule.some((s) => s.slotId === `${dayNum}-${sl.id}`));
        if (emptySlot) {
          events.emit("modal:open-quick-add", `${dayNum}-${emptySlot.id}`);
        } else {
          events.emit("toast:show", { message: "Ngày này đã đầy tất cả các ca", type: "info" });
        }
      };
    }

    // Bind Clear button
    const btnClear = $("#btn-day-detail-clear");
    if (btnClear) {
      btnClear.onclick = () => {
        if (!confirm(`Bạn có chắc chắn muốn xóa toàn bộ ca học trong ${DAY_NAMES[dayNum]}?`)) return;
        this.history.recordState();
        state.schedule = state.schedule.filter((s) => !s.slotId.startsWith(`${dayNum}-`));
        this.storage.debouncedSave();
        this.close("drawer-day-detail");
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã xóa lịch của ${DAY_NAMES[dayNum]}`, type: "info" });
      };
    }

    this.open("drawer-day-detail");
  }

  // ==================== SUBJECT DETAIL DRAWER ====================
  openSubjectDetail(subjectData) {
    if (!subjectData) return;
    const subjectName = (subjectData.subject || subjectData.name || "").trim();
    if (!subjectName) return;

    const state = this.store.getState();
    const data = analyticsEngine.computeAll(state.schedule, state.timeSlots, state.lessons);
    const subList = data.subjectStats || data.subjects || [];

    const subStat = subList.find(
      (s) => (s.subject || s.name || "").toLowerCase().trim() === subjectName.toLowerCase()
    ) || {
      subject: subjectName,
      color: subjectData.color || "blue",
      sessionsCount: 0,
      totalMinutes: 0,
      percentageOfWeek: 0,
      daysList: [],
    };

    $("#subject-detail-title").textContent = subStat.subject || subjectName;
    const teacher = subjectData.teacher || subStat.teacher || "--";
    const room = subjectData.room || subStat.room || "--";
    $("#subject-detail-subtitle").textContent = `${teacher} • ${room}`;

    const colorPill = $("#subject-detail-color-pill");
    if (colorPill) {
      colorPill.className = `w-3 h-3 rounded-full ${COLOR_MAP[subStat.color]?.accent || "bg-blue-500"}`;
    }

    $("#subject-detail-sessions").textContent = `${subStat.sessionsCount || subStat.sessionCount || 0}`;
    $("#subject-detail-hours").textContent = formatDurationShort(subStat.totalMinutes || 0);
    $("#subject-detail-percentage").textContent = `${subStat.percentageOfWeek || subStat.percentageOfTotalTime || 0}%`;

    // Days list
    const daysListEl = $("#subject-detail-days-list");
    if (daysListEl) {
      const days = subStat.daysList || subStat.days || [];
      if (days.length === 0) {
        daysListEl.innerHTML = `<span class="text-slate-400 text-xs">Chưa có trên lịch</span>`;
      } else {
        daysListEl.innerHTML = days
          .map(
            (d) => `
            <span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              ${typeof d === "number" ? DAY_NAMES[d] : d}
            </span>
          `
          )
          .join("");
      }
    }

    // Occurrences on schedule
    const occurrencesListEl = $("#subject-detail-occurrences-list");
    if (occurrencesListEl) {
      const items = state.schedule.filter(
        (s) => (s.subject || "").toLowerCase().trim() === subjectName.toLowerCase()
      );

      if (items.length === 0) {
        occurrencesListEl.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Môn này chỉ có trong kho, chưa được xếp vào thời khóa biểu.
          </div>
        `;
      } else {
        occurrencesListEl.innerHTML = items
          .map((it) => {
            const [d, sid] = it.slotId.split("-");
            const slot = state.timeSlots.find((s) => s.id === sid);
            const isDone = it.status === "completed";
            return `
              <div class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between">
                <div>
                  <div class="font-bold text-xs text-slate-800 dark:text-slate-200">
                    ${DAY_NAMES[d]} • ${escapeHTML(slot?.label || sid)}
                  </div>
                  <div class="text-slate-400 font-mono text-[10px] mt-0.5">
                    ${slot ? `${slot.start} - ${slot.end}` : "--"} • ${escapeHTML(it.room || "Tự do")}
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}">
                    ${isDone ? "Đã xong" : "Dự kiến"}
                  </span>
                  <button
                    type="button"
                    data-subdetail-edit="${it.slotId}"
                    class="btn-subdetail-edit p-1 text-slate-400 hover:text-sky-500 rounded transition"
                  >
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            `;
          })
          .join("");

        occurrencesListEl.querySelectorAll(".btn-subdetail-edit").forEach((btn) => {
          btn.onclick = () => {
            const key = btn.dataset.subdetailEdit;
            this.close("drawer-subject-detail");
            this.openActivityDetail(key);
          };
        });
      }
    }

    // Complete all button
    const btnCompleteAll = $("#btn-subject-detail-complete-all");
    if (btnCompleteAll) {
      btnCompleteAll.onclick = () => {
        this.history.recordState();
        state.schedule.forEach((s) => {
          if (s.subject.toLowerCase().trim() === subjectData.subject.toLowerCase().trim()) {
            s.status = "completed";
          }
        });
        this.storage.debouncedSave();
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã đánh dấu hoàn thành tất cả ca môn "${subStat.subject}"`, type: "success" });
        setTimeout(() => this.openSubjectDetail(subjectData), 50);
      };
    }

    this.open("drawer-subject-detail");
  }
}
