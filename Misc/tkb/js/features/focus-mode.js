/**
 * Real-Time Focus Mode Feature (Calculated strictly from actual time)
 * Enhanced with Smart Merged Block recognition, total time calculation,
 * and high-quality Web Audio chimes & bells.
 */

import { escapeHTML, $ } from "../utils/dom.js";
import { formatHHMMSS } from "../utils/format.js";
import { TimeEngine } from "../core/time-engine.js";
import { events } from "../core/events.js";
import { buildMergedBlocks } from "../core/merge-engine.js";
import { soundEngine } from "../core/sound.js";

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
    this.hasPlayedEndSound = false;
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

    // Sound toggle button in Focus overlay
    const btnSound = $("#btn-focus-sound-toggle");
    if (btnSound) {
      btnSound.addEventListener("click", () => {
        const isEnabled = soundEngine.toggleSound();
        this.updateSoundButtonUI(isEnabled);
        events.emit("toast:show", {
          message: isEnabled ? "🔊 Đã bật âm thanh chuông báo" : "🔇 Đã tắt âm thanh",
          type: "info",
        });
      });
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

  updateSoundButtonUI(isEnabled = soundEngine.isSoundEnabled()) {
    const container = $("#focus-sound-icon-container");
    const label = $("#focus-sound-label");
    if (container) {
      container.innerHTML = `<i data-lucide="${isEnabled ? 'volume-2' : 'volume-x'}" class="w-3.5 h-3.5 ${isEnabled ? 'text-emerald-400' : 'text-slate-500'}"></i>`;
    }
    if (label) {
      label.textContent = isEnabled ? "Chuông: BẬT" : "Chuông: TẮT";
    }
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  startFocus(item = null) {
    const state = this.store.getState();
    const now = new Date();
    const currentDay = now.getDay();
    this.hasPlayedEndSound = false;

    // 1. Resolve Target Item
    let rawSession = null;
    if (item) {
      rawSession = { ...item };
      if (!rawSession.slot && item.slotId) {
        const [, sId] = item.slotId.split("-");
        rawSession.slot = state.timeSlots.find((s) => s.id === sId);
      }
    } else {
      const currentActive = TimeEngine.getCurrentActivity(now, state.schedule, state.timeSlots);
      if (currentActive && !currentActive.isFree) {
        rawSession = { ...currentActive.activity, slot: currentActive.slot };
      } else {
        const next = TimeEngine.getNextActivity(now, state.schedule, state.timeSlots);
        if (next) {
          rawSession = { ...next.item, slot: next.slot };
        } else {
          rawSession = {
            subject: "Tập trung Deep Work",
            teacher: "Cá nhân",
            room: "Bàn học",
            color: "blue",
          };
        }
      }
    }

    // 2. Recognize Merged Blocks (Gộp khối) if applicable
    const autoMerge = state.settings?.autoMergeBlocks !== false;
    let dayNum = currentDay;
    if (rawSession && rawSession.slotId) {
      const parsedDay = parseInt(rawSession.slotId.split("-")[0], 10);
      if (!isNaN(parsedDay)) dayNum = parsedDay;
    }

    const mergedBlocks = buildMergedBlocks(state.schedule, state.timeSlots, dayNum, autoMerge);
    let matchedMergedBlock = null;

    if (rawSession) {
      if (rawSession.slotKeys && Array.isArray(rawSession.slotKeys)) {
        matchedMergedBlock = mergedBlocks.find((b) =>
          rawSession.slotKeys.some((sk) => b.slotKeys.includes(sk))
        );
      } else if (rawSession.slotId) {
        matchedMergedBlock = mergedBlocks.find((b) => b.slotKeys.includes(rawSession.slotId));
      }
    }

    if (matchedMergedBlock && matchedMergedBlock.slotCount > 1) {
      // Configure session as a Merged Block
      this.currentActivitySession = {
        ...rawSession,
        subject: matchedMergedBlock.subject || rawSession.subject,
        teacher: matchedMergedBlock.teacher || rawSession.teacher,
        room: matchedMergedBlock.room || rawSession.room,
        color: matchedMergedBlock.color || rawSession.color,
        isMerged: true,
        slotCount: matchedMergedBlock.slotCount,
        slotKeys: matchedMergedBlock.slotKeys,
        durationMinutes: matchedMergedBlock.durationMinutes,
        startTime: matchedMergedBlock.startTime,
        endTime: matchedMergedBlock.endTime,
        slot: {
          label: `${matchedMergedBlock.startSlot.label} - ${matchedMergedBlock.endSlot.label}`,
          start: matchedMergedBlock.startTime,
          end: matchedMergedBlock.endTime,
        },
      };
    } else {
      // Normal single block
      this.currentActivitySession = {
        ...rawSession,
        isMerged: false,
        slotCount: 1,
        slotKeys: rawSession.slotId ? [rawSession.slotId] : [],
        startTime: rawSession.slot?.start || null,
        endTime: rawSession.slot?.end || null,
      };
    }

    this.pomodoroMinutes = null;
    this.isPaused = false;

    const overlay = $("#focus-mode-overlay");
    if (overlay) overlay.classList.add("active");

    this.updateSoundButtonUI();
    this.updateClock();
    this.startClockInterval();

    // Play subtle chime on focus entrance
    soundEngine.playChime();
    if (typeof lucide !== "undefined") lucide.createIcons();
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
    const mergedBadge = $("#focus-merged-badge");
    const mergedText = $("#focus-merged-text");

    if (!clockEl || !this.currentActivitySession) return;

    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const curSeconds = now.getSeconds();
    const curTotalSec = curMinutes * 60 + curSeconds;

    titleEl.textContent = this.currentActivitySession.subject;
    metaEl.textContent = `Phụ trách: ${this.currentActivitySession.teacher || "Tự do"} • Phòng: ${this.currentActivitySession.room || "-"}`;

    // Merged Block Badge Display
    if (mergedBadge) {
      if (this.currentActivitySession.isMerged && this.currentActivitySession.slotCount > 1) {
        mergedBadge.classList.remove("hidden");
        mergedBadge.classList.add("flex");
        if (mergedText) {
          mergedText.textContent = `GỘP KHỐI: ${this.currentActivitySession.slotCount} TIẾT LIÊN TỤC • TỔNG ${this.currentActivitySession.durationMinutes} PHÚT`;
        }
      } else {
        mergedBadge.classList.add("hidden");
        mergedBadge.classList.remove("flex");
      }
    }

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

      // Check Pomodoro Finish
      if (this.pomodoroRemainingSec === 0 && !this.hasPlayedEndSound) {
        this.hasPlayedEndSound = true;
        soundEngine.playBell();
        events.emit("toast:show", { message: "⏰ Đã kết thúc chu kỳ Pomodoro!", type: "success" });
      }
      return;
    }

    // B. Real-Time Mode (Handles both Single and Merged Blocks)
    const startTimeStr = this.currentActivitySession.startTime || this.currentActivitySession.slot?.start;
    const endTimeStr = this.currentActivitySession.endTime || this.currentActivitySession.slot?.end;

    if (!startTimeStr || !endTimeStr) {
      clockEl.textContent = formatHHMMSS(curTotalSec);
      return;
    }

    const sMin = TimeEngine.parseToMinutes(startTimeStr);
    let eMin = TimeEngine.parseToMinutes(endTimeStr);
    const isOvernight = eMin < sMin;
    if (isOvernight) eMin += 1440;

    const startSec = sMin * 60;
    const endSec = eMin * 60;
    let nowSec = curTotalSec;
    if (isOvernight && curMinutes < TimeEngine.parseToMinutes(endTimeStr)) {
      nowSec += 1440 * 60;
    }

    if (timeRangeEl) {
      const mergedExtra = this.currentActivitySession.isMerged
        ? ` (${this.currentActivitySession.durationMinutes}p)`
        : "";
      timeRangeEl.textContent = `${startTimeStr} ────────────── ${endTimeStr}${mergedExtra}`;
    }

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

      // Play period end sound once
      if (!this.hasPlayedEndSound) {
        this.hasPlayedEndSound = true;
        soundEngine.playPeriodEnd();
      }
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
      statusPill.textContent = this.currentActivitySession.isMerged ? "ĐANG DIỄN RA (KHỐI GỘP)" : "ĐANG DIỄN RA";
    }
    if (remainingEl) {
      remainingEl.textContent = `Còn lại ${Math.ceil(remSec / 60)} phút (${Math.round(progress)}%)`;
    }
    if (barEl) barEl.style.width = `${progress}%`;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const icon = $("#focus-pause-icon");
    if (icon) {
      icon.setAttribute("data-lucide", this.isPaused ? "play" : "pause");
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
    soundEngine.playTone(this.isPaused ? 440 : 880, "sine", 0.15);
    events.emit("toast:show", { message: this.isPaused ? "Đã tạm dừng" : "Tiếp tục đếm giờ", type: "info" });
  }

  setPomodoro(minutes) {
    this.pomodoroMinutes = minutes;
    this.pomodoroRemainingSec = minutes * 60;
    this.isPaused = false;
    this.hasPlayedEndSound = false;
    this.updateClock();
    soundEngine.playChime();
    events.emit("toast:show", { message: `Đã đổi sang chế độ Pomodoro ${minutes} phút`, type: "info" });
  }

  completeCurrentActivity() {
    const state = this.store.getState();
    let target = this.currentActivitySession;

    if (!target || (!target.slotId && (!target.slotKeys || target.slotKeys.length === 0))) {
      const currentActive = TimeEngine.getCurrentActivity(new Date(), state.schedule, state.timeSlots);
      if (currentActive && !currentActive.isFree && currentActive.activity) {
        target = currentActive.activity;
      }
    }

    const keysToComplete = target?.slotKeys?.length ? target.slotKeys : (target?.slotId ? [target.slotId] : []);

    if (keysToComplete.length > 0) {
      this.history.recordState();
      let completedCount = 0;
      state.schedule.forEach((item) => {
        if (keysToComplete.includes(item.slotId)) {
          item.status = "completed";
          completedCount++;
        }
      });

      this.storage.debouncedSave();
      soundEngine.playCelebration();
      events.emit("toast:show", {
        message: `🎉 Đã hoàn thành ${completedCount > 1 ? completedCount + " tiết (khối gộp)" : "ca"} "${target.subject}"!`,
        type: "success",
      });
      events.emit("schedule:updated");
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
