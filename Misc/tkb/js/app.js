/**
 * Main Application Orchestrator & Bootstrap
 */

import { store } from "./state/store.js";
import { StorageManager } from "./core/storage.js";
import { HistoryManager } from "./core/history.js";
import { TimeEngine } from "./core/time-engine.js";
import { ValidationEngine } from "./core/validation.js";
import { events } from "./core/events.js";

import { ActivitiesFeature } from "./features/activities.js";
import { TimetableFeature } from "./features/timetable.js";
import { FocusModeFeature } from "./features/focus-mode.js";
import { AnalyticsFeature } from "./features/analytics.js";
import { BackupFeature } from "./features/backup.js";

import { ToastUI } from "./ui/toast.js";
import { ModalUI } from "./ui/modal.js";
import { DrawerUI } from "./ui/drawer.js";
import { CommandPaletteUI } from "./ui/command-palette.js";
import { ResponsiveNavUI } from "./ui/responsive-nav.js";

import { $, $$ } from "./utils/dom.js";
import { DAY_NAMES, pad2, formatDurationShort } from "./utils/format.js";

class ProductivityApp {
  constructor() {
    this.store = store;
    this.storage = new StorageManager(this.store);
    this.history = new HistoryManager(this.store);

    this.toastUI = new ToastUI();
    this.modalUI = new ModalUI(this.store, this.storage, this.history);
    this.drawerUI = new DrawerUI(this.store, this.storage, this.history);
    this.commandPaletteUI = new CommandPaletteUI(this.store);
    this.responsiveNavUI = new ResponsiveNavUI(this.store);

    this.activityLibrary = new ActivitiesFeature(this.store, this.storage, this.history);
    this.timetable = new TimetableFeature(this.store, this.storage, this.history);
    this.focusMode = new FocusModeFeature(this.store, this.storage, this.history);
    this.analytics = new AnalyticsFeature(this.store);
    this.backup = new BackupFeature(this.store, this.storage, this.history);

    this.lastCheckedDate = new Date().getDate();
    this.globalClockInterval = null;
  }

  init() {
    // 1. Load & Migrate Storage
    this.storage.load();

    // 2. Enforce Light Mode as strict default
    this.applyInitialTheme();

    // 3. Initialize components
    this.activityLibrary.init();
    this.timetable.init();
    this.focusMode.init();
    this.analytics.init();
    this.modalUI.init();
    this.drawerUI.init();
    this.commandPaletteUI.init();
    this.responsiveNavUI.init();

    // 4. Check Week Rollover & Reset Completed Sessions for New Week
    this.checkWeekRollover();

    // 5. Start Global Clock
    this.startGlobalClock();

    // 6. Bind Core App Events
    this.bindAppEvents();

    // 7. First Render
    this.updateHeaderDates();
    this.updateLiveActivities();
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  getMondayOfWeek(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  checkWeekRollover(now = new Date()) {
    const currentWeekKey = this.getMondayOfWeek(now);
    const state = this.store.getState();
    const lastWeekKey = state.settings.lastActiveWeek;

    if (!lastWeekKey) {
      state.settings.lastActiveWeek = currentWeekKey;
      this.storage.debouncedSave();
      return;
    }

    if (lastWeekKey !== currentWeekKey) {
      // New week detected! Automatically reset all completed sessions
      this.history.recordState();
      let resetCount = 0;
      state.schedule.forEach((item) => {
        if (item.status === "completed") {
          item.status = "planned";
          resetCount++;
        }
      });
      state.settings.lastActiveWeek = currentWeekKey;
      this.storage.debouncedSave();
      if (this.timetable) this.timetable.render();
      events.emit("schedule:updated");
      if (resetCount > 0) {
        events.emit("toast:show", {
          message: `Chào tuần mới! Đã làm mới trạng thái (${resetCount} ca) cho tuần này.`,
          type: "success",
        });
      }
    }
  }

  applyInitialTheme() {
    const state = this.store.getState();
    const isDark = state.settings.theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);

    if (state.settings.themePreset) {
      document.body.setAttribute("data-theme", state.settings.themePreset);
    }
  }

  toggleTheme() {
    const state = this.store.getState();
    const newTheme = state.settings.theme === "dark" ? "light" : "dark";
    state.settings.theme = newTheme;
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    this.storage.debouncedSave();
    events.emit("toast:show", { message: `Đã đổi sang giao diện ${newTheme === "dark" ? "Tối" : "Sáng"}`, type: "info" });
  }

  startGlobalClock() {
    if (this.globalClockInterval) clearInterval(this.globalClockInterval);

    const tick = () => {
      this.updateLiveActivities();
      this.updateCurrentTimeIndicator();
      this.checkDateRollover();
    };

    tick();
    this.globalClockInterval = setInterval(tick, 1000);

    // Recalculate immediately when tab becomes visible again
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    });
  }

  checkDateRollover() {
    const now = new Date();
    if (now.getDate() !== this.lastCheckedDate) {
      this.lastCheckedDate = now.getDate();
      this.checkWeekRollover(now);
      this.updateHeaderDates();
      this.timetable.render();
      this.responsiveNavUI.renderDaySelector();
      events.emit("toast:show", { message: "Đã bước sang ngày mới. Lịch trình tự động cập nhật.", type: "info" });
    }
  }

  updateHeaderDates() {
    const todayEl = $("#header-today-label");
    const slotsBadge = $("#header-slots-badge");
    const state = this.store.getState();

    const now = new Date();
    if (todayEl) {
      todayEl.textContent = `${DAY_NAMES[now.getDay()]}, ${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}`;
    }

    if (slotsBadge) {
      slotsBadge.textContent = `${state.timeSlots.length} ca`;
    }
  }

  updateLiveActivities() {
    const state = this.store.getState();
    const now = new Date();
    const current = TimeEngine.getCurrentActivity(now, state.schedule, state.timeSlots);
    const next = TimeEngine.getNextActivity(now, state.schedule, state.timeSlots);

    const headerSub = $("#header-curr-subject");
    const headerCount = $("#header-curr-countdown");
    const floatSub = $("#floating-now-title");
    const floatCount = $("#floating-now-countdown");

    if (current && !current.isFree) {
      const item = current.activity;
      const remSec = Math.max(0, current.remainingMinutes * 60);
      const remH = Math.floor(remSec / 3600);
      const remM = Math.floor((remSec % 3600) / 60);
      const remS = Math.floor(remSec % 60);
      const timeStr = remH > 0 ? `${remH}h${pad2(remM)}m` : `${pad2(remM)}:${pad2(remS)}`;

      if (headerSub) headerSub.textContent = item.subject;
      if (headerCount) headerCount.textContent = timeStr;
      if (floatSub) floatSub.textContent = item.subject;
      if (floatCount) floatCount.textContent = timeStr;
    } else {
      if (headerSub) headerSub.textContent = "Nghỉ ngơi / Tự do";
      if (headerCount) headerCount.textContent = "--:--";
      if (floatSub) floatSub.textContent = "Thời gian tự do";
      if (floatCount) floatCount.textContent = "--:--";
    }

    // Also update modal if currently active
    const modalCurr = $("#modal-current-activity");
    if (modalCurr && modalCurr.classList.contains("active")) {
      this.modalUI.populateOngoingModal(current, next, now);
    }
  }

  updateCurrentTimeIndicator() {
    const indicator = $("#current-time-indicator");
    const timeLabel = $("#indicator-time-label");
    const state = this.store.getState();

    if (!indicator) return;

    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    if (timeLabel) timeLabel.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

    const slots = state.timeSlots;
    if (slots.length === 0) {
      indicator.classList.add("hidden");
      return;
    }

    let targetTop = null;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const sStart = TimeEngine.parseToMinutes(slot.start);
      let sEnd = TimeEngine.parseToMinutes(slot.end);
      if (sEnd < sStart) sEnd += 1440;

      if (curMinutes >= sStart && curMinutes <= sEnd) {
        const rowEl = document.querySelector(`[data-row-slot="${slot.id}"]`);
        if (rowEl) {
          const fraction = (curMinutes - sStart) / Math.max(1, sEnd - sStart);
          targetTop = rowEl.offsetTop + fraction * rowEl.offsetHeight;
        }
        break;
      }
    }

    if (targetTop !== null) {
      indicator.classList.remove("hidden");
      indicator.style.top = `${Math.round(targetTop)}px`;
    } else {
      indicator.classList.add("hidden");
    }
  }

  bindAppEvents() {
    // Open Manage Custom Time Slots
    $("#btn-open-manage-slots")?.addEventListener("click", () => this.modalUI.openManageSlots());

    // Ongoing activity click opens modal with full instructor details
    $("#btn-header-ongoing")?.addEventListener("click", () => {
      const now = new Date();
      const state = this.store.getState();
      const curr = TimeEngine.getCurrentActivity(now, state.schedule, state.timeSlots);
      const next = TimeEngine.getNextActivity(now, state.schedule, state.timeSlots);
      this.modalUI.populateOngoingModal(curr, next, now);
      this.modalUI.open("modal-current-activity");
    });

    $("#floating-now-pill")?.addEventListener("click", () => {
      const now = new Date();
      const state = this.store.getState();
      const curr = TimeEngine.getCurrentActivity(now, state.schedule, state.timeSlots);
      const next = TimeEngine.getNextActivity(now, state.schedule, state.timeSlots);
      this.modalUI.populateOngoingModal(curr, next, now);
      this.modalUI.open("modal-current-activity");
    });

    // Theme toggle & command palette theme event
    $("#btn-theme-toggle")?.addEventListener("click", () => this.toggleTheme());
    events.on("theme:toggle-dark", () => this.toggleTheme());

    // Settings open
    $("#btn-open-settings")?.addEventListener("click", () => this.modalUI.open("modal-settings"));

    // Analytics open
    $("#btn-open-analytics")?.addEventListener("click", () => {
      this.analytics.open();
    });

    // Backup triggers
    events.on("backup:export-excel", () => this.backup.exportExcel());
    events.on("backup:export-json", () => this.backup.exportJSON());

    // Schedule update rerenders
    events.on("schedule:updated", () => {
      this.updateHeaderDates();
      this.timetable.render();
      this.updateLiveActivities();
    });

    events.on("schedule:day-changed", () => {
      this.timetable.renderMobileTimeline();
    });

    // Toolbar Actions: Undo / Redo / Clear schedule
    $("#btn-toolbar-undo")?.addEventListener("click", () => this.handleUndo());
    $("#btn-toolbar-redo")?.addEventListener("click", () => this.handleRedo());
    $("#btn-toolbar-clear-all")?.addEventListener("click", () => this.timetable.clearAllSchedule());
    $("#btn-toolbar-clear-today")?.addEventListener("click", () => {
      const now = new Date();
      this.timetable.clearDaySchedule(now.getDay());
    });
    $("#btn-toolbar-reset-sample")?.addEventListener("click", () => this.timetable.resetSampleSchedule());

    // Settings Modal: Reset & Clear & Import Actions
    $("#btn-settings-clear-all")?.addEventListener("click", () => {
      this.modalUI.close("modal-settings");
      this.timetable.clearAllSchedule();
    });
    $("#btn-settings-reset-sample")?.addEventListener("click", () => {
      this.modalUI.close("modal-settings");
      this.timetable.resetSampleSchedule();
    });
    $("#btn-settings-import-json")?.addEventListener("click", () => {
      $("#input-import-json-file")?.click();
    });
    $("#input-import-json-file")?.addEventListener("change", (e) => this.handleImportJSON(e));

    // Undo / Redo keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          this.handleRedo();
        } else {
          this.handleUndo();
        }
      }
    });

    // Run Diagnostics
    $("#btn-run-diagnostics")?.addEventListener("click", () => {
      const diag = ValidationEngine.runDiagnostics(this.store);
      const resultsContainer = $("#diagnostics-results");
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="p-3 rounded-xl ${diag.failed === 0 ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-900"} font-bold mb-2">
            KẾT QUẢ KIỂM TRA: ${diag.passed} / ${diag.total} PASSED (${diag.failed} FAILED)
          </div>
          <div class="space-y-1 font-mono text-[11px] max-h-60 overflow-y-auto">
            ${diag.results.map((r) => `<div class="${r.pass ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 font-bold"}">${r.pass ? "✓ PASS" : "✕ FAIL"}: ${r.name}</div>`).join("")}
          </div>
        `;
      }
    });
  }

  handleUndo() {
    if (this.history.undo()) {
      this.timetable.render();
      events.emit("toast:show", { message: "Đã hoàn tác (Undo)", type: "info" });
    } else {
      events.emit("toast:show", { message: "Không còn hành động nào để hoàn tác", type: "info" });
    }
  }

  handleRedo() {
    if (this.history.redo()) {
      this.timetable.render();
      events.emit("toast:show", { message: "Đã làm lại (Redo)", type: "info" });
    } else {
      events.emit("toast:show", { message: "Không còn hành động nào để làm lại", type: "info" });
    }
  }

  handleImportJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content !== "string") return;

      const res = this.backup.importJSON(content, true);
      if (res.success) {
        this.timetable.render();
        this.activityLibrary.render();
        this.updateHeaderDates();
        events.emit("toast:show", {
          message: `Nhập dữ liệu thành công! Đã nạp ${res.count} ca học.`,
          type: "success",
        });
        this.modalUI.close("modal-settings");
      } else {
        alert(`Lỗi khi nhập file JSON: ${res.error}`);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }
}

// Global bootstrap on DOM ready or immediate if already loaded
function bootstrapApp() {
  if (!window.app) {
    window.app = new ProductivityApp();
    window.app.init();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
  bootstrapApp();
}
