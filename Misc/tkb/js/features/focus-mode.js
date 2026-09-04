/**
 * Real-Time Focus Mode Feature (Calculated strictly from actual time)
 */

import { escapeHTML, $ } from "../utils/dom.js";
import { formatHHMMSS } from "../utils/format.js";
import { TimeEngine } from "../core/time-engine.js";
import { events } from "../core/events.js";

export class FocusModeFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
    this.timerInterval = null;
    this.currentActivitySession = null;
    this.isPaused = false;
    this.pomodoroMinutes = null; // null = real-time mode, number = pomodoro mode
    this.pomodoroRemainingSec = 0;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Open Focus Trigger button in header & mobile nav
    const btnHeaderFocus = $("#btn-header-focus");
    if (btnHeaderFocus) {
      btnHeaderFocus.addEventListener("click", () => this.startFocus());
    }

    // Controls in overlay
    const btnToggle = $("#btn-focus-toggle");
    if (btnToggle) {
      btnToggle.addEventListener("click", () => this.togglePause());
    }

    const btnComplete = $("#btn-focus-complete");
    if (btnComplete) {
      btnComplete.addEventListener("click", () => this.completeCurrentActivity());
    }

    const btnExit = $("#btn-focus-exit");
    if (btnExit) {
      btnExit.addEventListener("click", () => this.exitFocus());
    }

    // Pomodoro Presets
    const pomoContainer = $("#focus-pomodoro-presets");
    if (pomoContainer) {
      pomoContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-pomodoro]");
        if (btn) {
          const m = parseInt(btn.dataset.pomodoro, 10);
          this.setPomodoro(m);
        }
      });
    }

    // Global event listeners
    events.on("focus:start", (item) => this.startFocus(item));
    events.on("focus:complete-current", () => this.completeCurrentActivity());
  }

  startFocus(item = null) {
    const state = this.store.getState();
    const now = new Date();

    // 1. If explicit item provided, use it
    if (item) {
      this.currentActivitySession = { ...item };
      if (!this.currentActivitySession.slot && item.slotId) {
        const [, sId] = item.slotId.split("-");
        this.currentActivitySession.slot = state.timeSlots.find((s) => s.id === sId);
      }
    } else {
      // 2. Otherwise find the real-time active activity
      const currentActive = TimeEngine.getCurrentActivity(now, state.schedule, state.timeSlots);
      if (currentActive && !currentActive.isFree) {
        this.currentActivitySession = { ...currentActive.activity, slot: currentActive.slot };
      } else {
        // 3. If in gap or no activity, find next activity
        const next = TimeEngine.getNextActivity(now, state.schedule, state.timeSlots);
        if (next) {
          this.currentActivitySession = { ...next.item, slot: next.slot };
        } else {
          this.currentActivitySession = {
            subject: "Tập trung Deep Work",
            teacher: "Cá nhân",
            room: "Bàn học",
            color: "blue",
          };
        }
      }
    }

    this.pomodoroMinutes = null;
    this.isPaused = false;

    const overlay = $("#focus-mode-overlay");
    if (overlay) overlay.classList.add("active");

    this.updateClock();
    this.startClockInterval();
  }

  startClockInterval() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  updateClock() {
    const clockEl = $("#focus-clock-display");
    const titleEl = $("#focus-activity-title");
    const metaEl = $("#focus-activity-meta");
    const statusPill = $("#focus-status-pill");
    const barEl = $("#focus-progress-bar");
    const timeRangeEl = $("#focus-time-range");
    const remainingEl = $("#focus-remaining-text");

    if (!clockEl || !this.currentActivitySession) return;

    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const curSeconds = now.getSeconds();
    const curTotalSec = curMinutes * 60 + curSeconds;

    titleEl.textContent = this.currentActivitySession.subject;
    metaEl.textContent = `Phụ trách: ${this.currentActivitySession.teacher || "Tự do"} • Phòng: ${this.currentActivitySession.room || "-"}`;

    // A. Pomodoro Mode
    if (this.pomodoroMinutes !== null) {
      if (!this.isPaused && this.pomodoroRemainingSec > 0) {
        this.pomodoroRemainingSec--;
      }
      clockEl.textContent = formatHHMMSS(this.pomodoroRemainingSec);
      if (statusPill) {
        statusPill.className = "focus-status-pill active";
        statusPill.textContent = "POMODORO";
      }
      if (remainingEl) remainingEl.textContent = `Còn lại ${Math.ceil(this.pomodoroRemainingSec / 60)} phút`;
      if (barEl) {
        const total = this.pomodoroMinutes * 60;
        const pct = Math.min(100, Math.max(0, ((total - this.pomodoroRemainingSec) / total) * 100));
        barEl.style.width = `${pct}%`;
      }
      return;
    }

    // B. Real-Time Mode (Based strictly on slot start and end)
    const slot = this.currentActivitySession.slot;
    if (!slot) {
      // Default fallback
      clockEl.textContent = `${formatHHMMSS(curTotalSec)}`;
      return;
    }

    const sMin = TimeEngine.parseToMinutes(slot.start);
    let eMin = TimeEngine.parseToMinutes(slot.end);
    const isOvernight = eMin < sMin;
    if (isOvernight) eMin += 1440;

    const startSec = sMin * 60;
    const endSec = eMin * 60;
    let nowSec = curTotalSec;
    if (isOvernight && curMinutes < TimeEngine.parseToMinutes(slot.end)) {
      nowSec += 1440 * 60;
    }

    if (timeRangeEl) timeRangeEl.textContent = `${slot.start} ────────────── ${slot.end}`;

    // State 1: Sắp bắt đầu (now < start)
    if (nowSec < startSec) {
      const waitSec = startSec - nowSec;
      clockEl.textContent = formatHHMMSS(waitSec);
      if (statusPill) {
        statusPill.className = "focus-status-pill upcoming";
        statusPill.textContent = "SẮP BẮT ĐẦU";
      }
      if (remainingEl) remainingEl.textContent = `Bắt đầu sau ${Math.ceil(waitSec / 60)} phút`;
      if (barEl) barEl.style.width = "0%";
      return;
    }

    // State 2: Đã kết thúc (now >= end)
    if (nowSec >= endSec) {
      clockEl.textContent = "00:00:00";
      if (statusPill) {
        statusPill.className = "focus-status-pill ended";
        statusPill.textContent = "ĐÃ KẾT THÚC";
      }
      if (remainingEl) remainingEl.textContent = "Ca học đã hoàn tất. Hãy bấm Hoàn Thành bên dưới.";
      if (barEl) barEl.style.width = "100%";
      return;
    }

    // State 3: Đang diễn ra (start <= now < end)
    const remSec = endSec - nowSec;
    const elapsedSec = nowSec - startSec;
    const durationSec = endSec - startSec;
    const progress = Math.min(100, Math.max(0, (elapsedSec / durationSec) * 100));

    clockEl.textContent = formatHHMMSS(remSec);
    if (statusPill) {
      statusPill.className = "focus-status-pill active";
      statusPill.textContent = "ĐANG DIỄN RA";
    }
    if (remainingEl) remainingEl.textContent = `Còn lại ${Math.ceil(remSec / 60)} phút (${Math.round(progress)}%)`;
    if (barEl) barEl.style.width = `${progress}%`;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const icon = $("#focus-pause-icon");
    if (icon) {
      icon.setAttribute("data-lucide", this.isPaused ? "play" : "pause");
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
    events.emit("toast:show", { message: this.isPaused ? "Đã tạm dừng" : "Tiếp tục đếm giờ", type: "info" });
  }

  setPomodoro(minutes) {
    this.pomodoroMinutes = minutes;
    this.pomodoroRemainingSec = minutes * 60;
    this.isPaused = false;
    this.updateClock();
    events.emit("toast:show", { message: `Đã đổi sang chế độ Pomodoro ${minutes} phút`, type: "info" });
  }

  completeCurrentActivity() {
    const state = this.store.getState();
    let target = this.currentActivitySession;

    if (!target || !target.slotId) {
      const currentActive = TimeEngine.getCurrentActivity(new Date(), state.schedule, state.timeSlots);
      if (currentActive && !currentActive.isFree && currentActive.activity) {
        target = currentActive.activity;
      }
    }

    if (target && target.slotId) {
      this.history.recordState();
      const item = state.schedule.find((s) => s.slotId === target.slotId);
      if (item) {
        item.status = "completed";
        this.storage.debouncedSave();
      }
      events.emit("toast:show", {
        message: `🎉 Đã hoàn thành ca "${target.subject}"!`,
        type: "success",
      });
    } else {
      events.emit("toast:show", {
        message: "Hiện không có ca học nào để đánh dấu hoàn thành.",
        type: "info",
      });
    }

    this.exitFocus();
  }

  exitFocus() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const overlay = $("#focus-mode-overlay");
    if (overlay) overlay.classList.remove("active");
    events.emit("schedule:updated");
  }
}
