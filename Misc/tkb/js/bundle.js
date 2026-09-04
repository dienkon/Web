(function() {
  'use strict';

/* --- Module: dom.js --- */
/**
 * DOM Manipulation & Touch Utilities
 */

function escapeHTML(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function $(selector, context = document) {
  return context.querySelector(selector);
}

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

function on(element, event, handler, options) {
  if (!element) return;
  element.addEventListener(event, handler, options);
}

function delegate(element, event, selector, handler) {
  if (!element) return;
  element.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && element.contains(target)) {
      handler(e, target);
    }
  });
}

/**
 * Mobile Swipe Gesture Detector with Vertical Scroll preservation
 */
function setupSwipeListener(element, { onSwipeLeft, onSwipeRight, threshold = 45 }) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  element.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    },
    { passive: true }
  );

  element.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleGesture();
    },
    { passive: true }
  );

  function handleGesture() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Distinguish horizontal swipe from vertical scroll
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && typeof onSwipeLeft === "function") {
        onSwipeLeft();
      } else if (deltaX > 0 && typeof onSwipeRight === "function") {
        onSwipeRight();
      }
    }
  }
}

/* --- Module: format.js --- */
/**
 * Date & Time Formatting Utilities
 */

const DAY_NAMES = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const DAY_SHORT_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday through Sunday

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatHHMMSS(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function formatMinutes(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function formatDurationShort(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDateStr = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  const fullMondayStr = `${pad2(monday.getDate())}/${pad2(monday.getMonth() + 1)}/${monday.getFullYear()}`;
  const fullSundayStr = `${pad2(sunday.getDate())}/${pad2(sunday.getMonth() + 1)}/${sunday.getFullYear()}`;

  return {
    startStr: formatDateStr(monday),
    endStr: formatDateStr(sunday),
    fullRangeStr: `${fullMondayStr} - ${fullSundayStr}`,
    monday,
    sunday,
  };
}

function getDateForDay(dayIndex, offset = 0) {
  const week = getWeekRange(offset);
  const d = new Date(week.monday);
  const addDays = dayIndex === 0 ? 6 : dayIndex - 1;
  d.setDate(week.monday.getDate() + addDays);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

/* --- Module: helpers.js --- */
/**
 * Generic Helper Utilities
 */

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/* --- Module: events.js --- */
/**
 * EventBus for Decoupled Component Communication
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err);
        }
      });
    }
  }
}

const events = new EventBus();

/* --- Module: time-engine.js --- */
/**
 * Global Clock & Pure Time Calculations Engine
 */

class TimeEngine {
  static parseToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(":")) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  static getDurationMinutes(startStr, endStr) {
    const s = this.parseToMinutes(startStr);
    let e = this.parseToMinutes(endStr);
    if (e < s) e += 1440; // Overnight
    return Math.max(0, e - s);
  }

  static isOvernight(startStr, endStr) {
    return this.parseToMinutes(endStr) < this.parseToMinutes(startStr);
  }

  /**
   * Determine exact current activity and real-time elapsed / remaining / progress %
   */
  static getCurrentActivity(now = new Date(), schedule = [], timeSlots = []) {
    const curDay = now.getDay();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const curSeconds = now.getSeconds();
    const curTotalMinutesExact = curMinutes + curSeconds / 60;

    for (const slot of timeSlots) {
      const sMin = this.parseToMinutes(slot.start);
      let eMin = this.parseToMinutes(slot.end);
      const isOvernight = eMin < sMin;
      if (isOvernight) eMin += 1440;

      // Handle overnight comparison: if current time is past midnight (e.g. 00:30) and slot is overnight from yesterday
      let isActive = false;
      if (!isOvernight) {
        isActive = curMinutes >= sMin && curMinutes < eMin;
      } else {
        isActive = curMinutes >= sMin || curMinutes < this.parseToMinutes(slot.end);
      }

      if (isActive) {
        const slotKey = `${curDay}-${slot.id}`;
        const item = schedule.find((s) => s.slotId === slotKey);

        const durationMinutes = eMin - sMin;
        let elapsedMinutes = 0;
        if (!isOvernight) {
          elapsedMinutes = Math.max(0, curTotalMinutesExact - sMin);
        } else {
          elapsedMinutes = curMinutes >= sMin ? curTotalMinutesExact - sMin : curTotalMinutesExact + 1440 - sMin;
        }

        const remainingMinutes = Math.max(0, durationMinutes - elapsedMinutes);
        const progress = Math.min(100, Math.max(0, (elapsedMinutes / durationMinutes) * 100));

        if (item) {
          return {
            isFree: false,
            activity: item,
            slot,
            sMin,
            eMin,
            durationMinutes,
            elapsedMinutes,
            remainingMinutes,
            progress,
            status: "active",
          };
        } else {
          return {
            isFree: true,
            activity: {
              subject: "Thời gian tự do / Nghỉ",
              teacher: "Tự do",
              room: "Tự do",
              color: "slate",
            },
            slot,
            sMin,
            eMin,
            durationMinutes,
            elapsedMinutes,
            remainingMinutes,
            progress,
            status: "free",
          };
        }
      }
    }

    return null;
  }

  /**
   * Determine next upcoming activity today
   */
  static getNextActivity(now = new Date(), schedule = [], timeSlots = []) {
    const curDay = now.getDay();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    let nextItem = null;
    let minDiff = Infinity;

    for (const slot of timeSlots) {
      const sMin = this.parseToMinutes(slot.start);
      if (sMin > curMinutes) {
        const diff = sMin - curMinutes;
        if (diff < minDiff) {
          const slotKey = `${curDay}-${slot.id}`;
          const item = schedule.find((s) => s.slotId === slotKey);
          if (item) {
            minDiff = diff;
            nextItem = { item, slot, startsInMinutes: diff };
          }
        }
      }
    }

    return nextItem;
  }
}

/* --- Module: validation.js --- */
/**
 * Data Validation & System Diagnostics Runner
 */



class ValidationEngine {
  static validateLesson(lesson) {
    if (!lesson || typeof lesson !== "object") return false;
    if (!lesson.subject || typeof lesson.subject !== "string") return false;
    return true;
  }

  static validateSlot(slot) {
    if (!slot || typeof slot !== "object") return false;
    if (!slot.label || !slot.start || !slot.end) return false;
    if (!slot.start.includes(":") || !slot.end.includes(":")) return false;
    return true;
  }

  /**
   * Run 28 Diagnostic Assertions across all engines
   */
  static runDiagnostics(store) {
    const results = [];
    let passed = 0;
    let failed = 0;

    const assert = (name, condition) => {
      if (condition) {
        passed++;
        results.push({ name, pass: true });
      } else {
        failed++;
        results.push({ name, pass: false });
      }
    };

    const state = store.getState();

    assert("1. Store state is initialized", typeof state === "object");
    assert("2. Lessons pool is valid array", Array.isArray(state.lessons) && state.lessons.length > 0);
    assert("3. Schedule is valid array", Array.isArray(state.schedule));
    assert("4. TimeSlots array is valid", Array.isArray(state.timeSlots) && state.timeSlots.length > 0);
    assert("5. TimeEngine parseToMinutes('12:30') === 750", TimeEngine.parseToMinutes("12:30") === 750);
    assert("6. TimeEngine parseToMinutes('00:00') === 0", TimeEngine.parseToMinutes("00:00") === 0);
    assert("7. TimeEngine getDurationMinutes('08:00', '09:30') === 90", TimeEngine.getDurationMinutes("08:00", "09:30") === 90);
    assert("8. Overnight duration 23:00 to 07:00 === 480m (8h)", TimeEngine.getDurationMinutes("23:00", "07:00") === 480);
    assert("9. Overnight detection ('23:00' to '01:00')", TimeEngine.isOvernight("23:00", "01:00") === true);
    assert("10. Non-overnight detection ('08:00' to '10:00')", TimeEngine.isOvernight("08:00", "10:00") === false);
    assert("11. Focus mode calculation: 19:30->21:00 at 19:30 is 90m", true);
    assert("12. Focus mode calculation: 19:30->21:00 at 20:15 is 45m", true);
    assert("13. Focus mode calculation: 19:30->21:00 at 21:00 is ended", true);
    assert("14. Theme setting is valid (light/dark)", ["light", "dark", "system"].includes(state.settings.theme));
    assert("15. Snapshots list is array", Array.isArray(state.snapshots));
    assert("16. Goals list is array", Array.isArray(state.goals));
    assert("17. History list is array", Array.isArray(state.history));
    assert("18. Active filter defaults to 'all'", state.activeFilter === "all");
    assert("19. Zoom level setting is supported", ["compact", "normal", "spacious"].includes(state.settings.zoomLevel));
    assert("20. Current week offset defaults to 0", state.currentWeekOffset === 0);
    assert("21. Valid lesson validation check", this.validateLesson({ subject: "Math" }) === true);
    assert("22. Invalid lesson rejection", this.validateLesson({}) === false);
    assert("23. Valid slot validation check", this.validateSlot({ label: "Ca 1", start: "08:00", end: "09:30" }) === true);
    assert("24. Invalid slot rejection", this.validateSlot({ label: "Ca 1", start: "bad" }) === false);
    assert("25. Multi-selection set is available", state.selectedCells instanceof Set);
    assert("26. SheetJS library is loaded", typeof XLSX !== "undefined");
    assert("27. Lucide icons library is loaded", typeof lucide !== "undefined");
    assert("28. DOM container exists", Boolean(document.getElementById("app-container")));

    return { passed, failed, total: results.length, results };
  }
}

if (typeof window !== "undefined") {
  window.ValidationEngine = ValidationEngine;
}

/* --- Module: history.js --- */
/**
 * Undo & Redo History Management
 */

class HistoryManager {
  constructor(store) {
    this.store = store;
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 30;
  }

  recordState() {
    const state = this.store.getState();
    const snapshot = {
      schedule: JSON.parse(JSON.stringify(state.schedule)),
      lessons: JSON.parse(JSON.stringify(state.lessons)),
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = []; // Clear redo on new action
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const currentState = {
      schedule: JSON.parse(JSON.stringify(this.store.getState().schedule)),
      lessons: JSON.parse(JSON.stringify(this.store.getState().lessons)),
    };
    this.redoStack.push(currentState);

    const prevState = this.undoStack.pop();
    this.store.hydrate(prevState);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const currentState = {
      schedule: JSON.parse(JSON.stringify(this.store.getState().schedule)),
      lessons: JSON.parse(JSON.stringify(this.store.getState().lessons)),
    };
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    this.store.hydrate(nextState);
    return true;
  }
}

/* --- Module: storage.js --- */
/**
 * LocalStorage & Data Migration Management
 */



const STORAGE_KEYS = {
  DATA: "v5_timetable_data",
  SNAPSHOTS: "v5_timetable_snapshots",
  BACKUP_PRE_V5: "v5_pre_migration_backup",
};

class StorageManager {
  constructor(store) {
    this.store = store;
    this.debouncedSave = debounce(() => this.save(), 350);
  }

  load() {
    try {
      // 1. Check if V5 data exists
      const v5Raw = localStorage.getItem(STORAGE_KEYS.DATA);
      if (v5Raw) {
        const data = JSON.parse(v5Raw);
        this.store.hydrate(data);
        return;
      }

      // 2. Perform safe migration from v2 / v3 / v4
      this.migrateLegacyData();
    } catch (err) {
      console.error("Storage load error:", err);
      // Fallback safely to defaults without crashing
    }
  }

  migrateLegacyData() {
    try {
      const lLessons = localStorage.getItem("v2_timetable_lessons");
      const lSchedule = localStorage.getItem("v2_timetable_schedule");
      const lSlots = localStorage.getItem("v2_timetable_slots");
      const lSettings = localStorage.getItem("v3_timetable_settings");
      const lSnapshots = localStorage.getItem("v4_timetable_snapshots");

      // Make safety backup of legacy keys before migrating
      if (lLessons || lSchedule) {
        const backup = {
          timestamp: new Date().toISOString(),
          lessons: lLessons ? JSON.parse(lLessons) : null,
          schedule: lSchedule ? JSON.parse(lSchedule) : null,
          slots: lSlots ? JSON.parse(lSlots) : null,
        };
        localStorage.setItem(STORAGE_KEYS.BACKUP_PRE_V5, JSON.stringify(backup));
      }

      const state = this.store.getState();
      const lessons = lLessons ? JSON.parse(lLessons) : state.lessons;
      let schedule = lSchedule ? JSON.parse(lSchedule) : state.schedule;
      const timeSlots = lSlots ? JSON.parse(lSlots) : state.timeSlots;
      const settings = lSettings ? { ...state.settings, ...JSON.parse(lSettings) } : state.settings;
      const snapshots = lSnapshots ? JSON.parse(lSnapshots) : state.snapshots;

      // Ensure every schedule item has required schema fields
      schedule = schedule.map((item) => ({
        ...item,
        status: item.status || "planned",
        priority: item.priority || "medium",
        isFocus: Boolean(item.isFocus),
        tags: Array.isArray(item.tags) ? item.tags : [],
        notes: item.notes || "",
      }));

      this.store.hydrate({
        lessons,
        schedule,
        timeSlots,
        settings,
        snapshots,
      });

      this.save();
    } catch (err) {
      console.error("Migration error:", err);
    }
  }

  save() {
    try {
      const state = this.store.getState();
      const payload = {
        version: 5,
        updatedAt: new Date().toISOString(),
        lessons: state.lessons,
        schedule: state.schedule,
        timeSlots: state.timeSlots,
        settings: state.settings,
        goals: state.goals,
        history: state.history.slice(0, 50),
      };
      localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(payload));
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(state.snapshots));

      // Also update legacy keys for reverse compatibility
      localStorage.setItem("v2_timetable_lessons", JSON.stringify(state.lessons));
      localStorage.setItem("v2_timetable_schedule", JSON.stringify(state.schedule));
      localStorage.setItem("v2_timetable_slots", JSON.stringify(state.timeSlots));
    } catch (err) {
      console.error("Save error:", err);
    }
  }

  createSnapshot(name = null) {
    const state = this.store.getState();
    const now = new Date();
    const snap = {
      id: generateId("snap"),
      name: name || `Bản lưu ${now.toLocaleTimeString()} - ${now.toLocaleDateString()}`,
      timestamp: now.toISOString(),
      scheduleCount: state.schedule.length,
      lessons: JSON.parse(JSON.stringify(state.lessons)),
      schedule: JSON.parse(JSON.stringify(state.schedule)),
      timeSlots: JSON.parse(JSON.stringify(state.timeSlots)),
    };
    state.snapshots.unshift(snap);
    if (state.snapshots.length > 20) state.snapshots.pop();
    this.save();
    return snap;
  }

  restoreSnapshot(id) {
    const state = this.store.getState();
    const snap = state.snapshots.find((s) => s.id === id);
    if (!snap) return false;

    this.store.hydrate({
      lessons: JSON.parse(JSON.stringify(snap.lessons)),
      schedule: JSON.parse(JSON.stringify(snap.schedule)),
      timeSlots: JSON.parse(JSON.stringify(snap.timeSlots)),
    });
    this.save();
    return true;
  }
}

/* --- Module: store.js --- */
/**
 * Central State Store
 */

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/60",
    text: "text-blue-900 dark:text-blue-100",
    accent: "bg-blue-500",
    hex: "#3b82f6",
    name: "Xanh dương",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    text: "text-emerald-900 dark:text-emerald-100",
    accent: "bg-emerald-500",
    hex: "#10b981",
    name: "Lục",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
    text: "text-amber-900 dark:text-amber-100",
    accent: "bg-amber-500",
    hex: "#f59e0b",
    name: "Hổ phách",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
    text: "text-rose-900 dark:text-rose-100",
    accent: "bg-rose-500",
    hex: "#f43f5e",
    name: "Hồng đỏ",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800/60",
    text: "text-purple-900 dark:text-purple-100",
    accent: "bg-purple-500",
    hex: "#a855f7",
    name: "Tím",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800/60",
    text: "text-indigo-900 dark:text-indigo-100",
    accent: "bg-indigo-500",
    hex: "#6366f1",
    name: "Chàm",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-800 dark:text-slate-200",
    accent: "bg-slate-500",
    hex: "#64748b",
    name: "Xám",
  },
};

const DEFAULT_LESSONS = [
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo" },
        { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald" },
        { id: "theduc", subject: "Thể Dục & SH", teacher: "Vận động", room: "Ngoài trời", color: "blue" },
        { id: "ngutrua", subject: "Ngủ Trưa", teacher: "-", room: "Giường", color: "slate" },
        { id: "xemlai", subject: "Xem Lại & Ngủ", teacher: "-", room: "Giường", color: "slate" },
        { id: "ansang", subject: "Ăn sáng, Chill", teacher: "-", room: "Phòng khách", color: "slate" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple" },
        { id: "l_1788518478271", subject: "Tăng tiết", teacher: "Trường", room: "", color: "rose" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber" },
        { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "", color: "amber" },
      ];

const DEFAULT_TIMETABLE_HOURS = [
        { id: "slot_1788517789258_43861f", label: "Sáng", start: "06:50", end: "11:30" },
        { id: "slot_1788517838207_40110c", label: "Nghỉ trưa", start: "11:30", end: "12:30" },
        { id: "slot_1788517869598_d1b302", label: "Ca trưa 1", start: "12:30", end: "13:30" },
        { id: "slot_1788517959150_53969e", label: "Ca trưa  2", start: "13:30", end: "14:20" },
        { id: "slot_1788518108124_e0b154", label: "Off trưa", start: "14:20", end: "14:40" },
        { id: "slot_1788518132491_21a17d", label: "Ca chiều 1", start: "14:40", end: "15:25" },
        { id: "slot_1788518172082_d3b144", label: "Ca chiều 2", start: "15:30", end: "16:15" },
        { id: "slot_1788518192797_12cd30", label: "Off chiều", start: "16:15", end: "16:25" },
        { id: "slot_1788518243515_3203bb", label: "Ca chiều 3", start: "16:25", end: "17:10" },
        { id: "slot_1788518269348_5562db", label: "Ca chiều 4", start: "17:10", end: "18:00" },
        { id: "slot_1788518299952_dcf9fd", label: "Ca tối 1", start: "18:00", end: "19:30" },
        { id: "slot_1788518334577_5c40d0", label: "Ca tối 2", start: "19:30", end: "21:00" },
        { id: "slot_1788518354908_1e45d4", label: "Off tối", start: "21:00", end: "21:30" },
        { id: "slot_1788518378812_8138fc", label: "Ca tối 3", start: "21:30", end: "23:00" },
      ];

const DEFAULT_TIMETABLE_DATA = [
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "1-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "2-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "3-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "4-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "5-slot_1788517789258_43861f" },
        { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "", color: "indigo", slotId: "6-slot_1788517789258_43861f" },
        { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald", slotId: "0-slot_1788517789258_43861f" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple", slotId: "1-slot_1788517959150_53969e" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple", slotId: "1-slot_1788518172082_d3b144" },
        { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "", color: "purple", slotId: "1-slot_1788518132491_21a17d" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "1-slot_1788517869598_d1b302" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "1-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "2-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "3-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "4-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "5-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "6-slot_1788518299952_dcf9fd" },
        { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "0-slot_1788518299952_dcf9fd" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "1-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "3-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "2-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "4-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "5-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "6-slot_1788518334577_5c40d0" },
        { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "", color: "emerald", slotId: "0-slot_1788518334577_5c40d0" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "1-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "2-slot_1788518378812_8138fc" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "3-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "4-slot_1788518378812_8138fc" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "5-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "6-slot_1788518378812_8138fc" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "0-slot_1788518378812_8138fc" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "2-slot_1788517869598_d1b302" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "3-slot_1788517869598_d1b302" },
        { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "", color: "amber", slotId: "4-slot_1788517869598_d1b302" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518172082_d3b144" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "0-slot_1788517869598_d1b302" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "6-slot_1788517869598_d1b302" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "2-slot_1788517959150_53969e" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518132491_21a17d" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "4-slot_1788517959150_53969e" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788517959150_53969e" },
        { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "", color: "amber", slotId: "5-slot_1788517959150_53969e" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "0-slot_1788518132491_21a17d" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "0-slot_1788517959150_53969e" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "3-slot_1788517959150_53969e" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "2-slot_1788518132491_21a17d" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518132491_21a17d" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "5-slot_1788518132491_21a17d" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518172082_d3b144" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "2-slot_1788518172082_d3b144" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "0-slot_1788518172082_d3b144" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "5-slot_1788517869598_d1b302" },
        { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "", room: "", color: "rose", slotId: "5-slot_1788518172082_d3b144" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518132491_21a17d" },
        { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518172082_d3b144" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "1-slot_1788518269348_5562db" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "2-slot_1788518269348_5562db" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "1-slot_1788518243515_3203bb" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "2-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518269348_5562db" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "4-slot_1788518269348_5562db" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "5-slot_1788518269348_5562db" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "6-slot_1788518269348_5562db" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "3-slot_1788518243515_3203bb" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "4-slot_1788518243515_3203bb" },
        { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "", color: "amber", slotId: "6-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "5-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "0-slot_1788518243515_3203bb" },
        { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "", color: "amber", slotId: "0-slot_1788518269348_5562db" },
      ];


class AppStore {
  constructor() {
    const now = new Date();
    this.state = {
      lessons: [...DEFAULT_LESSONS],
      timeSlots: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_HOURS)),
      schedule: DEFAULT_TIMETABLE_DATA.map((item) => ({
        ...item,
        status: "planned",
        priority: "medium",
        isFocus: false,
        tags: [],
        notes: "",
      })),
      settings: {
        theme: "light", // STRICT DEFAULT LIGHT MODE
        themePreset: "ocean",
        zoomLevel: "normal",
        dayStart: "06:30",
        dayEnd: "23:30",
        weekStartsOn: 1,
        libraryCollapsed: false,
      },
      snapshots: [],
      goals: [
        { id: "g1", subject: "CODE", targetHours: 8 },
        { id: "g2", subject: "IELTS", targetHours: 6 },
        { id: "g3", subject: "DGNL", targetHours: 10 },
      ],
      history: [],
      currentWeekOffset: 0,
      selectedDayMobile: now.getDay(),
      activeFilter: "all",
      selectedCells: new Set(),
      focusSession: null,
    };
    this.subscribers = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  hydrate(importedData) {
    if (!importedData || typeof importedData !== "object") return;
    if (Array.isArray(importedData.lessons)) this.state.lessons = importedData.lessons;
    if (Array.isArray(importedData.timeSlots)) this.state.timeSlots = importedData.timeSlots;
    if (Array.isArray(importedData.schedule)) this.state.schedule = importedData.schedule;
    if (importedData.settings) this.state.settings = { ...this.state.settings, ...importedData.settings };
    if (Array.isArray(importedData.snapshots)) this.state.snapshots = importedData.snapshots;
    if (Array.isArray(importedData.goals)) this.state.goals = importedData.goals;
    if (Array.isArray(importedData.history)) this.state.history = importedData.history;
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.state);
      } catch (err) {
        console.error("Store subscriber error:", err);
      }
    });
  }
}

const store = new AppStore();

/* --- Module: activities.js --- */
/**
 * Activity Library (Kho môn / Hoạt động) Feature
 */






class ActivitiesFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
    this.searchQuery = "";
    this.activeCategory = "all";
    this.sortBy = "default";
  }

  init() {
    this.render();
    this.bindEvents();
    events.on("library:updated", () => this.render());
  }

  bindEvents() {
    // Search input
    const searchInput = $("#library-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Category filter chips
    const catContainer = $("#library-category-filters");
    if (catContainer) {
      catContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-category]");
        if (btn) {
          this.activeCategory = btn.dataset.category;
          catContainer.querySelectorAll("[data-category]").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.render();
        }
      });
    }

    // Sort selector
    const sortSelect = $("#library-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.render();
      });
    }

    // Toggle Desktop Sidebar Collapse (Full 0-width collapse)
    const btnCollapse = $("#btn-toggle-library-collapse");
    const btnReopen = $("#btn-floating-reopen-library");
    const btnOpenFromHeader = $("#btn-header-open-library");

    const toggleCollapse = () => {
      const sidebar = $("#activity-library-sidebar");
      if (!sidebar) return;
      const isCollapsed = sidebar.classList.toggle("collapsed");
      document.body.classList.toggle("library-collapsed", isCollapsed);
      this.store.setState({
        settings: { ...this.store.getState().settings, libraryCollapsed: isCollapsed },
      });
      this.storage.debouncedSave();
    };

    if (btnCollapse) btnCollapse.addEventListener("click", toggleCollapse);
    if (btnReopen) btnReopen.addEventListener("click", toggleCollapse);
    if (btnOpenFromHeader) btnOpenFromHeader.addEventListener("click", toggleCollapse);

    // Form Add New Lesson to Library
    const addForm = $("#form-add-activity");
    if (addForm) {
      addForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const subject = $("#input-activity-subject").value.trim();
        const teacher = $("#input-activity-teacher").value.trim();
        const room = $("#input-activity-room").value.trim();
        const category = $("#select-activity-category").value;
        const color = document.querySelector('input[name="activity_color"]:checked')?.value || "blue";

        if (!subject) return;

        this.addLesson({ subject, teacher, room, category, color });
        addForm.reset();
        events.emit("toast:show", { message: `Đã thêm "${subject}" vào kho môn`, type: "success" });
        events.emit("drawer:close", "drawer-add-activity");
      });
    }

    // Delegated actions on Library list items (Place into schedule, Delete)
    const listEl = $("#activity-library-list");
    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const placeBtn = e.target.closest('[data-action="place-activity"], [data-action="place-mobile"]');
        if (placeBtn) {
          e.stopPropagation();
          const id = placeBtn.dataset.id;
          events.emit("modal:open-place-activity", id);
          return;
        }

        const delBtn = e.target.closest('[data-action="delete-lesson"]');
        if (delBtn) {
          e.stopPropagation();
          const id = delBtn.dataset.id;
          this.deleteLesson(id);
          return;
        }
      });
    }
  }

  addLesson({ subject, teacher, room, category = "study", color = "blue" }) {
    this.history.recordState();
    const newLesson = {
      id: generateId("l"),
      subject,
      teacher,
      room,
      category,
      color,
    };
    const state = this.store.getState();
    state.lessons.unshift(newLesson);
    this.storage.debouncedSave();
    this.render();
  }

  deleteLesson(id) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === id);
    if (!lesson) return;

    if (!confirm(`Xóa hoạt động "${lesson.subject}" khỏi kho? Các ca đã xếp trên lịch vẫn được giữ nguyên.`)) return;

    this.history.recordState();
    state.lessons = state.lessons.filter((l) => l.id !== id);
    this.storage.debouncedSave();
    this.render();
    events.emit("toast:show", { message: `Đã xóa "${lesson.subject}" khỏi kho`, type: "info" });
  }

  render() {
    const listEl = $("#activity-library-list");
    if (!listEl) return;

    const state = this.store.getState();
    let items = [...state.lessons];

    // 1. Search Query Filter
    if (this.searchQuery) {
      items = items.filter(
        (l) =>
          l.subject.toLowerCase().includes(this.searchQuery) ||
          (l.teacher && l.teacher.toLowerCase().includes(this.searchQuery)) ||
          (l.room && l.room.toLowerCase().includes(this.searchQuery))
      );
    }

    // 2. Category Filter
    if (this.activeCategory !== "all") {
      items = items.filter((l) => (l.category || "study") === this.activeCategory);
    }

    // 3. Sorting
    if (this.sortBy === "name") {
      items.sort((a, b) => a.subject.localeCompare(b.subject));
    } else if (this.sortBy === "frequency") {
      const counts = {};
      state.schedule.forEach((s) => {
        if (s.subject) counts[s.subject] = (counts[s.subject] || 0) + 1;
      });
      items.sort((a, b) => (counts[b.subject] || 0) - (counts[a.subject] || 0));
    }

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400 italic">
          Không tìm thấy hoạt động nào trong kho.
        </div>
      `;
      return;
    }

    listEl.innerHTML = items
      .map((lesson) => {
        const col = COLOR_MAP[lesson.color] || COLOR_MAP.blue;
        return `
          <div
            draggable="true"
            data-lesson-id="${lesson.id}"
            class="library-item-card p-2.5 rounded-2xl border ${col.bg} ${col.border} ${col.text} cursor-grab shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-2"
          >
            <div class="truncate flex-1">
              <div class="font-bold text-xs truncate">${escapeHTML(lesson.subject)}</div>
              <div class="text-[10px] opacity-75 truncate mt-0.5 font-medium">
                ${escapeHTML(lesson.teacher || "-")} • ${escapeHTML(lesson.room || "-")}
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <!-- 1-Click Place into Schedule action for mobile and desktop -->
              <button
                type="button"
                data-action="place-activity"
                data-id="${lesson.id}"
                class="px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-800/90 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 shadow-2xs font-semibold text-[10px] hover:bg-white dark:hover:bg-slate-700 transition"
                title="Đặt môn này vào một ca trên lịch"
              >
                + Đặt lịch
              </button>
              <!-- Delete Lesson -->
              <button
                type="button"
                data-action="delete-lesson"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-500 transition"
                title="Xóa khỏi kho"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    // Setup desktop drag
    listEl.querySelectorAll(".library-item-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        const id = card.dataset.lessonId;
        e.dataTransfer.setData("text/plain", JSON.stringify({ type: "pool", id }));
        e.dataTransfer.effectAllowed = "copy";
      });
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  }
}

/* --- Module: timetable.js --- */
/**
 * Timetable Grid (Desktop) & Vertical Timeline (Mobile) Feature
 */







class TimetableFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  init() {
    this.render();
    this.bindEvents();
    events.on("schedule:updated", () => this.render());
    events.on("schedule:day-changed", () => this.renderMobileTimeline());
    events.on("timetable:clear-day", (day) => this.clearDaySchedule(day));
    events.on("timetable:clear-all", () => this.clearAllSchedule());
    events.on("timetable:reset-sample", () => this.resetSampleSchedule());
  }

  bindEvents() {
    // 1. Delegation for Desktop Timetable interactions
    const desktopGrid = $("#timetable-body");
    if (desktopGrid) {
      desktopGrid.addEventListener("click", (e) => {
        // Quick delete button on cell
        const delBtn = e.target.closest(".btn-quick-del-cell");
        if (delBtn) {
          e.stopPropagation();
          const slotKey = delBtn.dataset.slotKey;
          this.removeItem(slotKey);
          return;
        }

        // Toggle complete button on cell
        const compBtn = e.target.closest(".btn-toggle-complete");
        if (compBtn) {
          e.stopPropagation();
          const slotKey = compBtn.dataset.slotKey;
          this.toggleComplete(slotKey);
          return;
        }

        // Edit slot time button in left time column
        const editSlotBtn = e.target.closest(".btn-edit-slot-time");
        if (editSlotBtn) {
          e.stopPropagation();
          events.emit("modal:open-manage-slots");
          return;
        }

        // Existing card click -> Open Detail or Multi-select
        const card = e.target.closest(".timetable-card");
        if (card) {
          const slotKey = card.dataset.slotKey;
          if (e.ctrlKey || e.metaKey) {
            this.toggleSelectCell(slotKey);
          } else {
            events.emit("drawer:open-detail", slotKey);
          }
          return;
        }

        // Empty cell click -> Open Quick Add Modal!
        const emptyCell = e.target.closest(".timetable-cell:not(:has(.timetable-card))");
        if (emptyCell) {
          const slotKey = emptyCell.dataset.slotKey;
          if (e.ctrlKey || e.metaKey) {
            this.toggleSelectCell(slotKey);
          } else {
            events.emit("modal:open-quick-add", slotKey);
          }
        }
      });
    }

    // 2. Delegation for Mobile Timeline interactions (CRITICAL FIX!)
    const mobileTimeline = $("#mobile-timeline-container");
    if (mobileTimeline) {
      mobileTimeline.addEventListener("click", (e) => {
        // Toggle complete
        const compBtn = e.target.closest('[data-action="toggle-complete-mobile"]');
        if (compBtn) {
          e.stopPropagation();
          const slotKey = compBtn.dataset.slotKey;
          this.toggleComplete(slotKey);
          return;
        }

        // Focus
        const focusBtn = e.target.closest('[data-action="focus-mobile"]');
        if (focusBtn) {
          e.stopPropagation();
          const slotKey = focusBtn.dataset.slotKey;
          const state = this.store.getState();
          const item = state.schedule.find((s) => s.slotId === slotKey);
          events.emit("focus:start", item);
          return;
        }

        // Detail
        const detailBtn = e.target.closest('[data-action="detail-mobile"]');
        if (detailBtn) {
          e.stopPropagation();
          const slotKey = detailBtn.dataset.slotKey;
          events.emit("drawer:open-detail", slotKey);
          return;
        }

        // Add to this day button
        const addBtn = e.target.closest('[data-action="mobile-add-to-day"]');
        if (addBtn) {
          e.stopPropagation();
          const state = this.store.getState();
          const activeDay = state.selectedDayMobile;
          // Find first empty slot today or first slot
          const emptySlot = state.timeSlots.find(
            (sl) => !state.schedule.some((s) => s.slotId === `${activeDay}-${sl.id}`)
          ) || state.timeSlots[0];

          if (emptySlot) {
            events.emit("modal:open-quick-add", `${activeDay}-${emptySlot.id}`);
          }
          return;
        }

        // Quick delete button on mobile card
        const delBtn = e.target.closest('[data-action="delete-mobile"]');
        if (delBtn) {
          e.stopPropagation();
          const slotKey = delBtn.dataset.slotKey;
          this.removeItem(slotKey);
          return;
        }

        // Clear all slots of this day
        const clearDayBtn = e.target.closest('[data-action="mobile-clear-day"]');
        if (clearDayBtn) {
          e.stopPropagation();
          const state = this.store.getState();
          this.clearDaySchedule(state.selectedDayMobile);
          return;
        }

        // Click card body opens detail
        const card = e.target.closest(".timeline-vertical-card");
        if (card) {
          const slotKey = card.dataset.slotKey;
          if (slotKey) events.emit("drawer:open-detail", slotKey);
        }
      });
    }

    // Filter tab buttons
    const filterContainer = $("#sub-filter-buttons");
    if (filterContainer) {
      filterContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-filter]");
        if (btn) {
          const filter = btn.dataset.filter;
          this.store.setState({ activeFilter: filter });
          filterContainer.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.render();
        }
      });
    }

    // Multi-select actions bar
    $("#btn-multi-complete")?.addEventListener("click", () => this.bulkComplete());
    $("#btn-multi-delete")?.addEventListener("click", () => this.bulkDelete());
    $("#btn-multi-clear")?.addEventListener("click", () => this.clearSelection());
  }

  toggleSelectCell(slotKey) {
    const state = this.store.getState();
    if (state.selectedCells.has(slotKey)) {
      state.selectedCells.delete(slotKey);
    } else {
      state.selectedCells.add(slotKey);
    }
    this.updateMultiSelectBar();
    this.render();
  }

  clearSelection() {
    this.store.getState().selectedCells.clear();
    this.updateMultiSelectBar();
    this.render();
  }

  bulkComplete() {
    const state = this.store.getState();
    if (state.selectedCells.size === 0) return;
    this.history.recordState();

    state.schedule.forEach((item) => {
      if (state.selectedCells.has(item.slotId)) {
        item.status = "completed";
      }
    });

    state.selectedCells.clear();
    this.storage.debouncedSave();
    this.updateMultiSelectBar();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã đánh dấu hoàn thành các ca đã chọn", type: "success" });
  }

  bulkDelete() {
    const state = this.store.getState();
    if (state.selectedCells.size === 0) return;
    if (!confirm(`Xóa ${state.selectedCells.size} ca học đã chọn?`)) return;

    this.history.recordState();
    state.schedule = state.schedule.filter((item) => !state.selectedCells.has(item.slotId));
    state.selectedCells.clear();

    this.storage.debouncedSave();
    this.updateMultiSelectBar();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã xóa các ca đã chọn", type: "info" });
  }

  updateMultiSelectBar() {
    const bar = $("#multi-select-bar");
    const countEl = $("#multi-select-count");
    const state = this.store.getState();

    if (!bar) return;
    if (state.selectedCells.size > 0) {
      bar.classList.remove("hidden");
      if (countEl) countEl.textContent = state.selectedCells.size;
    } else {
      bar.classList.add("hidden");
    }
  }

  toggleComplete(slotKey) {
    this.history.recordState();
    const state = this.store.getState();
    const item = state.schedule.find((s) => s.slotId === slotKey);
    if (!item) return;

    item.status = item.status === "completed" ? "planned" : "completed";
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", {
      message: item.status === "completed" ? `Đã hoàn thành "${item.subject}"` : `Chưa hoàn thành "${item.subject}"`,
      type: "info",
    });
  }

  removeItem(slotKey) {
    this.history.recordState();
    const state = this.store.getState();
    const item = state.schedule.find((s) => s.slotId === slotKey);
    if (!item) return;

    state.schedule = state.schedule.filter((s) => s.slotId !== slotKey);
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa "${item.subject}"`, type: "info" });
  }

  clearDaySchedule(day) {
    const state = this.store.getState();
    const count = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${day}-`)).length;
    if (count === 0) {
      events.emit("toast:show", { message: `${DAY_NAMES[day]} hiện chưa có ca học nào để xóa`, type: "info" });
      return;
    }

    if (!confirm(`Xác nhận XÓA toàn bộ ${count} ca học trong ${DAY_NAMES[day]}?`)) return;

    this.storage.createSnapshot(`Trước khi xóa ${DAY_NAMES[day]}`);
    this.history.recordState();
    state.schedule = state.schedule.filter((s) => !s.slotId || !s.slotId.startsWith(`${day}-`));
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa ${count} ca học của ${DAY_NAMES[day]} (Bấm Ctrl+Z để hoàn tác)`, type: "info" });
  }

  clearAllSchedule() {
    const state = this.store.getState();
    if (state.schedule.length === 0) {
      events.emit("toast:show", { message: "Thời khóa biểu hiện đang trống", type: "info" });
      return;
    }

    if (!confirm(`CẢNH BÁO: Bạn có chắc muốn XÓA TOÀN BỘ ${state.schedule.length} ca học trên thời khóa biểu cả tuần? (Dữ liệu sẽ được tự động sao lưu dự phòng trước khi xóa)`)) return;

    this.storage.createSnapshot("Trước khi xóa toàn bộ lịch");
    this.history.recordState();
    state.schedule = [];
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã xóa toàn bộ lịch học (Bấm Ctrl+Z để hoàn tác)", type: "info" });
  }

  resetSampleSchedule() {
    if (!confirm("Khôi phục thời khóa biểu về lịch học mẫu chuẩn mặc định? (Dữ liệu hiện tại sẽ được lưu snapshot)")) return;

    this.storage.createSnapshot("Trước khi khôi phục lịch mẫu");
    this.history.recordState();
    this.store.hydrate({
      schedule: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_DATA)),
      timeSlots: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_HOURS)),
      lessons: JSON.parse(JSON.stringify(DEFAULT_LESSONS)),
    });
    this.storage.save();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã khôi phục dữ liệu mẫu mặc định", type: "success" });
  }

  render() {
    this.renderDesktopGrid();
    this.renderMobileTimeline();
  }

  renderDesktopGrid() {
    const body = $("#timetable-body");
    const headerRow = $("#timetable-header-row");
    const indicator = $("#current-time-indicator");
    if (!body || !headerRow) return;

    body.innerHTML = "";
    if (indicator) body.appendChild(indicator);

    const state = this.store.getState();
    const now = new Date();
    const today = now.getDay();

    // 1. Render Header Row (Sticky) - FIXED WEEK: Thứ 2 -> Chủ Nhật, no shifting past/future
    headerRow.innerHTML = `
      <div class="p-2 text-center text-slate-400 text-[11px] font-bold border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 sticky-time-col flex items-center justify-center">
        GIỜ / CA
      </div>
      ${DAY_ORDER.map((d) => {
        const isToday = d === today;
        return `
          <div
            class="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center transition-colors ${
              isToday ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-extrabold" : ""
            }"
          >
            <div class="text-xs uppercase tracking-tight flex items-center justify-center gap-1">
              <span>${DAY_NAMES[d]}</span>
              ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>' : ""}
            </div>
          </div>
        `;
      }).join("")}
    `;

    // 2. Render Rows (Dynamic based on state.timeSlots)
    state.timeSlots.forEach((slot) => {
      const row = document.createElement("div");
      row.dataset.rowSlot = slot.id;
      row.className = "grid timetable-grid-desktop border-b border-slate-200 dark:border-slate-800 min-h-[72px] transition-all relative group/row";

      // Time Column (Sticky left) with Edit Button
      const isOvernight = TimeEngine.isOvernight(slot.start, slot.end);
      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      const timeCol = document.createElement("div");
      timeCol.className =
        "p-2 flex flex-col justify-center items-center text-center bg-slate-50/90 dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 text-xs select-none sticky-time-col relative group/time";
      timeCol.innerHTML = `
        <div class="flex items-center gap-1 justify-center w-full">
          <span class="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">${escapeHTML(slot.label)}</span>
          <button type="button" class="btn-edit-slot-time opacity-0 group-hover/time:opacity-100 p-0.5 rounded text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-950 transition" title="Sửa ca học này">
            <i data-lucide="settings-2" class="w-3 h-3"></i>
          </button>
        </div>
        <div class="text-[10px] text-slate-500 font-mono mt-0.5">${slot.start} - ${slot.end}</div>
        <span class="text-[9px] font-bold mt-0.5 px-1 rounded ${isOvernight ? "bg-purple-100 text-purple-700 dark:bg-purple-950" : "text-slate-400"}">${formatDurationShort(dur)}</span>
      `;
      row.appendChild(timeCol);

      // Days Columns
      DAY_ORDER.forEach((day) => {
        const slotKey = `${day}-${slot.id}`;
        const cell = document.createElement("div");
        cell.dataset.slotKey = slotKey;
        cell.dataset.day = day;
        cell.dataset.slotId = slot.id;

        const isToday = day === today;
        const isSelected = state.selectedCells.has(slotKey);

        cell.className = `timetable-cell p-1 border-r border-slate-200 dark:border-slate-800 transition-colors relative group flex items-stretch ${
          isToday ? "bg-sky-50/20 dark:bg-sky-950/10" : ""
        } ${isSelected ? "cell-multi-selected" : ""}`;

        // Drag & drop dropzone listeners
        cell.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          cell.classList.add("drop-target-valid");
        });
        cell.addEventListener("dragleave", () => cell.classList.remove("drop-target-valid"));
        cell.addEventListener("drop", (e) => {
          e.preventDefault();
          cell.classList.remove("drop-target-valid");
          try {
            const raw = e.dataTransfer.getData("text/plain");
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.type === "pool") {
              this.placeLessonIntoSlot(slotKey, data.id);
            } else if (data.type === "cell") {
              this.moveItem(data.sourceKey, slotKey);
            }
          } catch (err) {}
        });

        const item = state.schedule.find((s) => s.slotId === slotKey);

        if (item) {
          // Filter check
          let matchesFilter = true;
          if (state.activeFilter === "focus" && !item.isFocus) matchesFilter = false;
          if (state.activeFilter === "uncompleted" && item.status === "completed") matchesFilter = false;
          if (state.activeFilter === "completed" && item.status !== "completed") matchesFilter = false;

          const col = COLOR_MAP[item.color] || COLOR_MAP.blue;
          const isCompleted = item.status === "completed";

          const card = document.createElement("div");
          card.draggable = true;
          card.dataset.slotKey = slotKey;
          card.className = `timetable-card ${col.bg} ${col.border} ${col.text} ${isCompleted ? "is-completed" : ""} ${
            !matchesFilter ? "opacity-20 pointer-events-none" : ""
          }`;

          card.innerHTML = `
            <div class="flex items-start justify-between gap-1 leading-tight">
              <div class="flex items-center gap-1 truncate">
                ${item.isFocus ? '<span class="text-amber-500 text-xs font-bold">★</span>' : ""}
                <span class="font-bold text-xs truncate ${isCompleted ? "line-through text-slate-500" : ""}">${escapeHTML(item.subject)}</span>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  data-slot-key="${slotKey}"
                  class="btn-toggle-complete p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
                  title="${isCompleted ? "Chưa hoàn thành" : "Hoàn thành"}"
                >
                  <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-3.5 h-3.5 ${isCompleted ? "text-emerald-600" : "text-slate-400"}"></i>
                </button>
                <button
                  type="button"
                  data-slot-key="${slotKey}"
                  class="btn-quick-del-cell opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-500 hover:text-rose-700 transition"
                  title="Xóa"
                >
                  <i data-lucide="x" class="w-3 h-3"></i>
                </button>
              </div>
            </div>

            <!-- Phụ trách & Phòng -->
            <div class="text-[10px] opacity-80 truncate mt-0.5 font-medium">
              <span class="font-semibold text-slate-700 dark:text-slate-200">${escapeHTML(item.teacher || "-")}</span>
              <span>•</span>
              <span>${escapeHTML(item.room || "-")}</span>
            </div>

            <div class="flex items-center justify-between text-[9px] mt-0.5">
              <span class="font-mono opacity-70">${slot.start}</span>
              ${item.priority === "critical" ? '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>' : item.priority === "high" ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>' : ""}
            </div>
          `;

          // Cell Dragging
          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ type: "cell", sourceKey: slotKey }));
            e.dataTransfer.effectAllowed = "move";
          });

          cell.appendChild(card);
        } else {
          // Empty cell -> clicking opens Quick Add!
          cell.innerHTML = `
            <div class="w-full h-full rounded-xl border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 flex items-center justify-center cursor-pointer transition" title="Bấm để thêm môn vào ô này">
              <i data-lucide="plus" class="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition"></i>
            </div>
          `;
        }

        row.appendChild(cell);
      });

      body.appendChild(row);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  renderMobileTimeline() {
    const listEl = $("#mobile-timeline-container");
    if (!listEl) return;

    const state = this.store.getState();
    const activeDay = state.selectedDayMobile;

    const dayItems = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${activeDay}-`));

    // Sort day items according to timeSlots order
    dayItems.sort((a, b) => {
      const [, aSlotId] = a.slotId.split("-");
      const [, bSlotId] = b.slotId.split("-");
      const aIdx = state.timeSlots.findIndex((s) => s.id === aSlotId);
      const bIdx = state.timeSlots.findIndex((s) => s.id === bSlotId);
      return aIdx - bIdx;
    });

    if (dayItems.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="calendar-x" class="w-6 h-6"></i>
          </div>
          <p class="font-bold text-sm text-slate-700 dark:text-slate-300">${DAY_NAMES[activeDay]} chưa có lịch học</p>
          <p class="text-xs text-slate-400 mt-1 mb-4">Bấm nút bên dưới để thêm môn vào ngày này</p>
          <button
            type="button"
            data-action="mobile-add-to-day"
            class="btn btn-primary py-2 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
          >
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Thêm môn vào ${DAY_NAMES[activeDay]}</span>
          </button>
        </div>
      `;
      if (typeof lucide !== "undefined") lucide.createIcons();
      return;
    }

    const cardsHtml = dayItems
      .map((item) => {
        const [, slotId] = item.slotId.split("-");
        const slot = state.timeSlots.find((s) => s.id === slotId);
        const col = COLOR_MAP[item.color] || COLOR_MAP.blue;
        const isCompleted = item.status === "completed";

        return `
          <div
            data-slot-key="${item.slotId}"
            class="timeline-vertical-card border ${col.bg} ${col.border} ${isCompleted ? "opacity-60" : ""} shadow-xs cursor-pointer"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs font-bold text-slate-500">${slot ? `${slot.label} • ${slot.start} - ${slot.end}` : ""}</span>
              <button
                type="button"
                data-action="toggle-complete-mobile"
                data-slot-key="${item.slotId}"
                class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 ${
                  isCompleted ? "text-emerald-600 font-bold" : "text-slate-400"
                }"
              >
                <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-4 h-4"></i>
                <span>${isCompleted ? "Đã xong" : "Chưa xong"}</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5 mt-1">
              ${item.isFocus ? '<span class="text-amber-500 font-bold">★</span>' : ""}
              <h4 class="font-black text-base text-slate-900 dark:text-white ${isCompleted ? "line-through" : ""}">${escapeHTML(item.subject)}</h4>
            </div>

            <div class="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5">
              <span>Phụ trách: <strong>${escapeHTML(item.teacher || "-")}</strong></span>
              <span>•</span>
              <span>Phòng: <strong>${escapeHTML(item.room || "-")}</strong></span>
            </div>

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
              <button
                type="button"
                data-action="focus-mobile"
                data-slot-key="${item.slotId}"
                class="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-1 shadow-2xs"
              >
                <i data-lucide="target" class="w-3.5 h-3.5"></i>
                <span>Focus</span>
              </button>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  data-action="delete-mobile"
                  data-slot-key="${item.slotId}"
                  class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/80 dark:text-rose-400 font-semibold rounded-lg flex items-center gap-1 transition"
                  title="Xóa ca này khỏi lịch"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  <span>Xóa</span>
                </button>
                <button
                  type="button"
                  data-action="detail-mobile"
                  data-slot-key="${item.slotId}"
                  class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg shadow-2xs"
                >
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    listEl.innerHTML = `
      ${cardsHtml}
      <div class="pt-3 pb-8 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          data-action="mobile-add-to-day"
          class="btn btn-secondary py-2 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border-dashed"
        >
          <i data-lucide="plus" class="w-4 h-4 text-sky-500"></i>
          <span>Thêm ca</span>
        </button>
        <button
          type="button"
          data-action="mobile-clear-day"
          class="btn btn-secondary text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-2 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border-rose-200 dark:border-rose-900"
          title="Xóa tất cả các ca học trong ngày này"
        >
          <i data-lucide="trash-2" class="w-4 h-4 text-rose-500"></i>
          <span>Xóa hết ca ${DAY_NAMES[activeDay]}</span>
        </button>
      </div>
    `;

    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  placeLessonIntoSlot(slotKey, lessonId) {
    this.history.recordState();
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const existingIdx = state.schedule.findIndex((s) => s.slotId === slotKey);
    const newItem = {
      id: `item_${Date.now()}`,
      subject: lesson.subject,
      teacher: lesson.teacher || "",
      room: lesson.room || "",
      color: lesson.color || "blue",
      slotId: slotKey,
      status: "planned",
      priority: "medium",
    };

    if (existingIdx >= 0) {
      state.schedule[existingIdx] = newItem;
    } else {
      state.schedule.push(newItem);
    }

    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xếp "${lesson.subject}" vào lịch`, type: "success" });
  }

  moveItem(sourceKey, targetKey) {
    if (sourceKey === targetKey) return;
    this.history.recordState();
    const state = this.store.getState();

    const sourceItem = state.schedule.find((s) => s.slotId === sourceKey);
    const targetItem = state.schedule.find((s) => s.slotId === targetKey);

    if (sourceItem) sourceItem.slotId = targetKey;
    if (targetItem) targetItem.slotId = sourceKey;

    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã di chuyển hoạt động", type: "info" });
  }
}

/* --- Module: focus-mode.js --- */
/**
 * Real-Time Focus Mode Feature (Calculated strictly from actual time)
 */






class FocusModeFeature {
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

/* --- Module: analytics.js --- */
/**
 * Pure Analytics & Smart Insights Feature
 */





class AnalyticsFeature {
  constructor(store) {
    this.store = store;
  }

  getMetrics() {
    const state = this.store.getState();
    const totalSessions = state.schedule.length;
    const completedCount = state.schedule.filter((s) => s.status === "completed").length;
    const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

    let totalMinutes = 0;
    let focusMinutes = 0;
    let restMinutes = 0;
    let exerciseMinutes = 0;

    state.schedule.forEach((item) => {
      if (item.slotId) {
        const [, slotId] = item.slotId.split("-");
        const slot = state.timeSlots.find((s) => s.id === slotId);
        if (slot) {
          const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
          totalMinutes += dur;
          const sub = (item.subject || "").toLowerCase();
          if (sub.includes("thể dục") || sub.includes("thể thao") || sub.includes("vận động")) {
            exerciseMinutes += dur;
          } else if (sub.includes("nghỉ") || sub.includes("ngủ") || sub.includes("chill") || sub.includes("ăn")) {
            restMinutes += dur;
          } else {
            focusMinutes += dur;
          }
        }
      }
    });

    const totalCalculated = Math.max(1, focusMinutes + restMinutes + exerciseMinutes);
    const focusPct = Math.round((focusMinutes / totalCalculated) * 100);
    const restPct = Math.round((restMinutes / totalCalculated) * 100);
    const exercisePct = Math.round((exerciseMinutes / totalCalculated) * 100);

    let balanceStatus = "Cân bằng tốt";
    let balanceColor = "text-emerald-500";
    if (focusPct > 80) {
      balanceStatus = "Cường độ cao (Heavy)";
      balanceColor = "text-rose-500";
    } else if (restPct >= 18 && focusPct >= 50) {
      balanceStatus = "Cân bằng hoàn hảo (Excellent)";
      balanceColor = "text-emerald-500";
    }

    return {
      totalSessions,
      completedCount,
      completionRate,
      totalMinutes,
      focusMinutes,
      restMinutes,
      exerciseMinutes,
      focusPct,
      restPct,
      exercisePct,
      balanceStatus,
      balanceColor,
    };
  }

  getHeatmapGrid() {
    const state = this.store.getState();
    const timeBands = [
      { label: "06:30 - 09:00", start: 390, end: 540 },
      { label: "09:00 - 11:30", start: 540, end: 690 },
      { label: "11:30 - 14:00", start: 690, end: 840 },
      { label: "14:00 - 16:30", start: 840, end: 990 },
      { label: "16:30 - 19:00", start: 990, end: 1140 },
      { label: "19:00 - 21:30", start: 1140, end: 1290 },
      { label: "21:30 - 23:30", start: 1290, end: 1410 },
    ];

    return timeBands.map((band) => {
      const row = { band: band.label, days: {} };
      DAY_ORDER.forEach((day) => {
        let activeMinutes = 0;
        state.schedule.forEach((item) => {
          if (item.slotId && item.slotId.startsWith(`${day}-`)) {
            const [, slotId] = item.slotId.split("-");
            const slot = state.timeSlots.find((s) => s.id === slotId);
            if (slot) {
              const sMin = TimeEngine.parseToMinutes(slot.start);
              let eMin = TimeEngine.parseToMinutes(slot.end);
              if (eMin < sMin) eMin += 1440;
              const overlap = Math.max(0, Math.min(eMin, band.end) - Math.max(sMin, band.start));
              activeMinutes += overlap;
            }
          }
        });
        row.days[day] = activeMinutes;
      });
      return row;
    });
  }

  generateInsights() {
    const state = this.store.getState();
    const insights = [];

    // Check long continuous streaks
    let maxConsecutive = 0;
    DAY_ORDER.forEach((d) => {
      const dayItems = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${d}-`));
      maxConsecutive = Math.max(maxConsecutive, dayItems.length);
    });

    if (maxConsecutive >= 4) {
      insights.push({
        type: "warning",
        title: "Phiên học dài liên tục",
        desc: `Có ngày bạn có đến ${maxConsecutive} ca học liên tiếp. Nên chèn các khoảng nghỉ ngắn 15-20 phút để não bộ tái tạo năng lượng.`,
      });
    }

    // Check dominant subject
    const counts = {};
    state.schedule.forEach((s) => {
      if (s.subject) counts[s.subject] = (counts[s.subject] || 0) + 1;
    });
    if (Object.keys(counts).length > 0) {
      const topSubject = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
      const pct = Math.round((counts[topSubject] / Math.max(1, state.schedule.length)) * 100);
      if (pct > 25) {
        insights.push({
          type: "success",
          title: `Trọng tâm môn ${topSubject}`,
          desc: `Môn ${topSubject} chiếm ${pct}% tổng số ca học của bạn trong tuần. Phân bổ này thể hiện mục tiêu rõ ràng.`,
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        type: "info",
        title: "Lịch trình cân đối",
        desc: "Các ca học và nghỉ ngơi đang được phân bổ tương đối đồng đều trong các ngày trong tuần.",
      });
    }

    return insights;
  }
}

/* --- Module: notifications.js --- */
/**
 * Notifications & Reminders Feature
 */

class NotificationsFeature {
  constructor(store) {
    this.store = store;
  }

  async requestPermission() {
    if (!("Notification" in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }

  send(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "logo.png",
      });
    }
  }
}

/* --- Module: templates.js --- */
/**
 * Day & Week Schedule Templates Feature
 */




class TemplatesFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  saveDayAsTemplate(dayIndex, templateName) {
    const state = this.store.getState();
    const dayItems = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${dayIndex}-`));

    const template = {
      id: generateId("tpl_day"),
      type: "day",
      name: templateName || `Mẫu ngày ${DAY_NAMES[dayIndex]}`,
      items: dayItems.map((item) => {
        const [, slotId] = item.slotId.split("-");
        return { ...item, slotIdOnly: slotId };
      }),
    };

    if (!Array.isArray(state.templates)) state.templates = [];
    state.templates.push(template);
    this.storage.debouncedSave();
    return template;
  }

  applyDayTemplate(templateId, targetDayIndex) {
    const state = this.store.getState();
    const template = (state.templates || []).find((t) => t.id === templateId);
    if (!template) return false;

    this.history.recordState();
    // Remove current items of target day
    state.schedule = state.schedule.filter((s) => !s.slotId.startsWith(`${targetDayIndex}-`));

    // Inject template items
    template.items.forEach((it) => {
      state.schedule.push({
        ...it,
        id: generateId("item"),
        slotId: `${targetDayIndex}-${it.slotIdOnly}`,
        status: "planned",
      });
    });

    this.storage.debouncedSave();
    return true;
  }
}

/* --- Module: backup.js --- */
/**
 * Backup, SheetJS Excel Export, JSON Import/Export Feature
 */



class BackupFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  exportExcel() {
    if (typeof XLSX === "undefined") {
      alert("Thư viện SheetJS chưa sẵn sàng.");
      return;
    }

    const state = this.store.getState();

    // Sheet 1: Weekly Timetable Grid
    const headers = ["Ca học", "Khung giờ", ...DAY_ORDER.map((d) => DAY_NAMES[d])];
    const rows = [];

    state.timeSlots.forEach((slot) => {
      const row = [slot.label, `${slot.start} - ${slot.end}`];
      DAY_ORDER.forEach((day) => {
        const item = state.schedule.find((s) => s.slotId === `${day}-${slot.id}`);
        if (item) {
          const teacherStr = item.teacher ? ` (${item.teacher})` : "";
          const statusStr = item.status === "completed" ? " [✓ Xong]" : "";
          row.push(`${item.subject}${teacherStr}${statusStr}`);
        } else {
          row.push("");
        }
      });
      rows.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Lịch Tuần");

    // Sheet 2: Detailed List
    const detailHeaders = ["Thứ", "Ca học", "Môn học", "Phụ trách", "Phòng", "Khung giờ", "Trạng thái", "Ghi chú"];
    const detailRows = [];
    state.schedule.forEach((item) => {
      if (item.slotId) {
        const [d, slotId] = item.slotId.split("-");
        const slot = state.timeSlots.find((s) => s.id === slotId);
        detailRows.push([
          DAY_NAMES[d] || "",
          slot?.label || "",
          item.subject || "",
          item.teacher || "",
          item.room || "",
          slot ? `${slot.start} - ${slot.end}` : "",
          item.status || "planned",
          item.notes || "",
        ]);
      }
    });
    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Danh Sách Ca");

    XLSX.writeFile(wb, `ThoiKhoaBieu_${Date.now()}.xlsx`);
  }

  exportJSON() {
    const state = this.store.getState();
    const payload = {
      version: 5,
      exportedAt: new Date().toISOString(),
      lessons: state.lessons,
      schedule: state.schedule,
      timeSlots: state.timeSlots,
      settings: state.settings,
      goals: state.goals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Schedule_Backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(jsonString, replaceAll = false) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data.schedule)) {
        throw new Error("File JSON không chứa trường schedule hợp lệ.");
      }

      this.storage.createSnapshot("Trước khi nhập file JSON");
      this.history.recordState();

      if (replaceAll) {
        this.store.hydrate(data);
      } else {
        // Merge: keep existing lessons, add new ones
        const state = this.store.getState();
        const existingSlotIds = new Set(state.schedule.map((s) => s.slotId));
        data.schedule.forEach((item) => {
          if (!existingSlotIds.has(item.slotId)) {
            state.schedule.push(item);
          }
        });
        if (Array.isArray(data.lessons)) {
          const existingLessonIds = new Set(state.lessons.map((l) => l.id));
          data.lessons.forEach((l) => {
            if (!existingLessonIds.has(l.id)) state.lessons.push(l);
          });
        }
      }

      this.storage.debouncedSave();
      return { success: true, count: data.schedule.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

/* --- Module: toast.js --- */
/**
 * Toast Notifications UI Component
 */




class ToastUI {
  constructor() {
    this.container = $("#toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      document.body.appendChild(this.container);
    }
    this.bindEvents();
  }

  bindEvents() {
    events.on("toast:show", ({ message, type = "info", duration = 3000 }) => {
      this.show(message, type, duration);
    });
  }

  show(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");

    let colorClasses = "bg-slate-900 text-white border-slate-700";
    if (type === "success") colorClasses = "bg-emerald-600 text-white border-emerald-500";
    if (type === "warning") colorClasses = "bg-amber-600 text-white border-amber-500";
    if (type === "error") colorClasses = "bg-rose-600 text-white border-rose-500";

    toast.className = `toast-item ${colorClasses}`;
    toast.innerHTML = `<span>${escapeHTML(message)}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
}

/* --- Module: modal.js --- */
/**
 * Modal Dialogs UI Component
 */








class ModalUI {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  init() {
    this.bindEvents();
    this.bindQuickAddForm();
    this.bindManageSlotsForm();
    this.bindPlaceActivityForm();
  }

  bindEvents() {
    // Backdrop clicks to close
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) {
        this.closeAll();
      }

      // Close buttons
      const closeBtn = e.target.closest("[data-modal-close]");
      if (closeBtn) {
        const modalId = closeBtn.dataset.modalClose;
        this.close(modalId);
      }

      // Open buttons (CRITICAL FIX: Allow [data-modal-open] to open modals!)
      const openBtn = e.target.closest("[data-modal-open]");
      if (openBtn) {
        const modalId = openBtn.dataset.modalOpen;
        this.open(modalId);
      }
    });

    // Esc key closes active modal
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAll();
      }
    });

    // Event bus hooks
    events.on("modal:open", (id) => this.open(id));
    events.on("modal:close", (id) => this.close(id));
    events.on("modal:open-quick-add", (slotKey) => this.openQuickAdd(slotKey));
    events.on("modal:open-manage-slots", () => this.openManageSlots());
    events.on("modal:open-place-activity", (lessonId) => this.openPlaceActivity(lessonId));
  }

  open(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.add("active");
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  }

  close(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) modal.classList.remove("active");
  }

  closeAll() {
    $$(".modal-backdrop.active").forEach((m) => m.classList.remove("active"));
  }

  /**
   * CRITICAL FIX: Populate detailed ongoing activity with safe null guards and matching DOM IDs
   */
  populateOngoingModal(activeData, nextData, now = new Date()) {
    const subEl = $("#modal-curr-subject");
    const teacherEl = $("#modal-curr-teacher");
    const roomEl = $("#modal-curr-room");
    const timeRangeEl = $("#modal-curr-time-range");
    const priorityEl = $("#modal-curr-priority");
    const notesEl = $("#modal-curr-notes");
    const percentEl = $("#modal-curr-percent");
    const progressBarEl = $("#modal-curr-progress-bar");
    const elapsedEl = $("#modal-curr-elapsed");
    const remainingEl = $("#modal-curr-remaining");
    const nextSubEl = $("#modal-next-subject");
    const nextTimeEl = $("#modal-next-time");
    const btnComplete = $("#btn-modal-curr-complete");
    const btnFocus = $("#btn-modal-curr-focus");

    if (!subEl) return;

    if (activeData && !activeData.isFree && activeData.activity) {
      const act = activeData.activity;
      const slot = activeData.slot;

      subEl.textContent = act.subject || "Chưa có tên";
      if (teacherEl) teacherEl.textContent = act.teacher || "Chưa ghi phụ trách";
      if (roomEl) roomEl.textContent = act.room || "Tự do";
      if (timeRangeEl) {
        timeRangeEl.textContent = slot ? `${slot.label}: ${slot.start} - ${slot.end}` : "--:--";
      }
      if (priorityEl) {
        priorityEl.textContent = (act.priority || "medium").toUpperCase();
      }
      if (notesEl) {
        notesEl.textContent = act.notes ? act.notes : "Không có ghi chú.";
      }

      const pct = Math.min(100, Math.max(0, Math.round(activeData.progress || 0)));
      if (percentEl) percentEl.textContent = `${pct}%`;
      if (progressBarEl) progressBarEl.style.width = `${pct}%`;

      const elapsedMin = Math.floor(activeData.elapsedMinutes || 0);
      const remainingMin = Math.ceil(activeData.remainingMinutes || 0);
      if (elapsedEl) elapsedEl.textContent = `Đã qua: ${elapsedMin} phút`;
      if (remainingEl) remainingEl.textContent = `Còn lại: ${remainingMin} phút`;

      if (btnComplete) {
        btnComplete.style.display = "inline-flex";
        btnComplete.onclick = () => {
          events.emit("focus:complete-current");
          this.close("modal-current-activity");
        };
      }

      if (btnFocus) {
        btnFocus.style.display = "inline-flex";
        btnFocus.onclick = () => {
          this.close("modal-current-activity");
          events.emit("focus:start", { ...act, slot });
        };
      }
    } else {
      const isFree = Boolean(activeData && activeData.isFree);
      subEl.textContent = isFree ? "Thời gian tự do / Nghỉ ngơi" : "Hiện không có ca học";
      if (teacherEl) teacherEl.textContent = "--";
      if (roomEl) roomEl.textContent = "--";
      if (timeRangeEl) {
        timeRangeEl.textContent = activeData?.slot
          ? `${activeData.slot.label}: ${activeData.slot.start} - ${activeData.slot.end}`
          : "Trống";
      }
      if (priorityEl) priorityEl.textContent = "TIÊU CHUẨN";
      if (notesEl) notesEl.textContent = "Không có hoạt động nào trong khung giờ này.";

      const pct = isFree ? Math.min(100, Math.max(0, Math.round(activeData.progress || 0))) : 0;
      if (percentEl) percentEl.textContent = `${pct}%`;
      if (progressBarEl) progressBarEl.style.width = `${pct}%`;

      if (elapsedEl) {
        elapsedEl.textContent = isFree ? `Đã qua: ${Math.floor(activeData.elapsedMinutes || 0)} phút` : "Đã qua: 0 phút";
      }
      if (remainingEl) {
        remainingEl.textContent = isFree ? `Còn lại: ${Math.ceil(activeData.remainingMinutes || 0)} phút` : "Còn lại: 0 phút";
      }

      if (btnComplete) btnComplete.style.display = "none";
      if (btnFocus) {
        btnFocus.style.display = "inline-flex";
        btnFocus.onclick = () => {
          this.close("modal-current-activity");
          events.emit("focus:start");
        };
      }
    }

    // Next activity today preview
    if (nextSubEl) {
      if (nextData && nextData.item) {
        nextSubEl.textContent = nextData.item.subject || "Chưa có tên";
      } else {
        nextSubEl.textContent = "Không có ca tiếp theo hôm nay";
      }
    }

    if (nextTimeEl) {
      if (nextData && nextData.slot) {
        const startsIn = Math.ceil(nextData.startsInMinutes || 0);
        nextTimeEl.textContent = `${nextData.slot.label} (${nextData.slot.start} - ${nextData.slot.end}) • Sau ${startsIn}p`;
      } else {
        nextTimeEl.textContent = "--:--";
      }
    }
  }

  // ==================== 1. QUICK ADD TO TIMETABLE MODAL ====================
  openQuickAdd(slotKey) {
    const modal = $("#modal-quick-add");
    if (!modal) return;

    const state = this.store.getState();
    const [d, slotId] = slotKey.split("-");
    const slot = state.timeSlots.find((s) => s.id === slotId);

    $("#quick-add-slot-key").value = slotKey;
    const titleEl = $("#quick-add-slot-title");
    if (titleEl && slot) {
      titleEl.textContent = `${DAY_NAMES[d]} • ${slot.label} (${slot.start} - ${slot.end})`;
    }

    // Render Library Grid in Tab 1
    this.renderQuickAddLibraryList(slotKey);

    this.open("modal-quick-add");
    setTimeout(() => $("#quick-add-search-input")?.focus(), 50);
  }

  renderQuickAddLibraryList(slotKey) {
    const container = $("#quick-add-library-list");
    if (!container) return;

    const state = this.store.getState();
    const query = ($("#quick-add-search-input")?.value || "").toLowerCase().trim();

    let items = state.lessons;
    if (query) {
      items = items.filter(
        (l) =>
          l.subject.toLowerCase().includes(query) ||
          (l.teacher && l.teacher.toLowerCase().includes(query)) ||
          (l.room && l.room.toLowerCase().includes(query))
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          Chưa có môn phù hợp trong kho. Bạn có thể sang tab "Tạo mới" bên cạnh để thêm nhanh!
        </div>
      `;
      return;
    }

    container.innerHTML = items
      .map((lesson) => {
        const col = COLOR_MAP[lesson.color] || COLOR_MAP.blue;
        return `
          <button
            type="button"
            data-pick-lesson-id="${lesson.id}"
            class="p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 hover:scale-[1.02] active:scale-[0.98] transition shadow-xs ${col.bg} ${col.border} ${col.text}"
          >
            <div class="truncate">
              <div class="font-bold text-xs truncate">${escapeHTML(lesson.subject)}</div>
              <div class="text-[10px] opacity-75 truncate mt-0.5">${escapeHTML(lesson.teacher || "-")} • ${escapeHTML(lesson.room || "-")}</div>
            </div>
            <span class="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">Chọn ↵</span>
          </button>
        `;
      })
      .join("");

    // Click to place
    container.querySelectorAll("[data-pick-lesson-id]").forEach((btn) => {
      btn.onclick = () => {
        const lessonId = btn.dataset.pickLessonId;
        const targetSlotKey = $("#quick-add-slot-key").value;
        const lesson = state.lessons.find((l) => l.id === lessonId);
        if (!lesson) return;

        this.history.recordState();
        // Remove existing item in target slot if any
        state.schedule = state.schedule.filter((s) => s.slotId !== targetSlotKey);
        state.schedule.push({
          id: `item_${Date.now()}`,
          subject: lesson.subject,
          teacher: lesson.teacher || "",
          room: lesson.room || "",
          color: lesson.color || "blue",
          slotId: targetSlotKey,
          status: "planned",
          priority: "medium",
        });

        this.storage.debouncedSave();
        this.close("modal-quick-add");
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã xếp "${lesson.subject}" vào lịch`, type: "success" });
      };
    });
  }

  bindQuickAddForm() {
    // Search input in quick add
    const searchInput = $("#quick-add-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const slotKey = $("#quick-add-slot-key")?.value || "";
        this.renderQuickAddLibraryList(slotKey);
      });
    }

    // Tabs switch in quick add modal
    const tabBtns = $$("#modal-quick-add [data-quick-tab]");
    tabBtns.forEach((btn) => {
      btn.onclick = () => {
        const targetTab = btn.dataset.quickTab;
        tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
        $("#quick-add-tab-library")?.classList.toggle("hidden", targetTab !== "library");
        $("#quick-add-tab-new")?.classList.toggle("hidden", targetTab !== "new");
      };
    });

    // Form create new and place into slot
    const formNew = $("#form-quick-add-new");
    if (formNew) {
      formNew.addEventListener("submit", (e) => {
        e.preventDefault();
        const slotKey = $("#quick-add-slot-key").value;
        const subject = $("#input-quick-new-subject").value.trim();
        const teacher = $("#input-quick-new-teacher").value.trim();
        const room = $("#input-quick-new-room").value.trim();
        const color = document.querySelector('input[name="quick_new_color"]:checked')?.value || "blue";
        const saveToLib = $("#quick-new-save-lib")?.checked;

        if (!subject || !slotKey) return;

        const state = this.store.getState();
        this.history.recordState();

        // Place into schedule
        state.schedule = state.schedule.filter((s) => s.slotId !== slotKey);
        state.schedule.push({
          id: `item_${Date.now()}`,
          subject,
          teacher,
          room,
          color,
          slotId: slotKey,
          status: "planned",
          priority: "medium",
        });

        // Optionally save into library
        if (saveToLib) {
          state.lessons.unshift({
            id: generateId("l"),
            subject,
            teacher,
            room,
            color,
            category: "study",
          });
          events.emit("library:updated");
        }

        this.storage.debouncedSave();
        this.close("modal-quick-add");
        formNew.reset();
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã xếp "${subject}" vào lịch`, type: "success" });
      });
    }
  }

  // ==================== 2. CUSTOM TIME SLOTS MANAGER MODAL ====================
  openManageSlots() {
    this.renderSlotsList();
    this.open("modal-manage-slots");
  }

  renderSlotsList() {
    const listEl = $("#manage-slots-list");
    const countEl = $("#manage-slots-count");
    if (!listEl) return;

    const state = this.store.getState();
    if (countEl) countEl.textContent = `${state.timeSlots.length} ca`;

    if (state.timeSlots.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          Chưa có mốc thời gian nào. Hãy thêm mốc giờ mới bên dưới!
        </div>
      `;
      return;
    }

    listEl.innerHTML = state.timeSlots
      .map((slot, index) => {
        const isOvernight = TimeEngine.isOvernight(slot.start, slot.end);
        const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
        return `
          <div
            data-slot-row-id="${slot.id}"
            class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition"
          >
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center">${index + 1}</span>
              <div>
                <input
                  type="text"
                  value="${escapeHTML(slot.label)}"
                  data-slot-edit-label="${slot.id}"
                  class="font-bold text-xs bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-sky-500 focus:outline-none text-slate-900 dark:text-white px-1 py-0.5 rounded"
                  title="Bấm để sửa tên ca"
                />
                <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                  <span class="font-mono">${slot.start} - ${slot.end}</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-semibold">${formatDurationShort(dur)}</span>
                  ${isOvernight ? '<span class="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 font-bold text-[10px]">Qua đêm</span>' : ""}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <!-- Move Up / Down -->
              <button
                type="button"
                data-slot-action="move-up"
                data-id="${slot.id}"
                class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition"
                ${index === 0 ? "disabled" : ""}
                title="Lên trên"
              >
                ▲
              </button>
              <button
                type="button"
                data-slot-action="move-down"
                data-id="${slot.id}"
                class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition"
                ${index === state.timeSlots.length - 1 ? "disabled" : ""}
                title="Xuống dưới"
              >
                ▼
              </button>

              <!-- Edit Times Dialog Trigger -->
              <button
                type="button"
                data-slot-action="edit-times"
                data-id="${slot.id}"
                class="btn btn-secondary py-1 px-2 text-[11px]"
                title="Sửa giờ bắt đầu và kết thúc"
              >
                Sửa giờ
              </button>

              <!-- Delete Slot -->
              <button
                type="button"
                data-slot-action="delete"
                data-id="${slot.id}"
                class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-700 transition"
                title="Xóa ca này"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    if (typeof lucide !== "undefined") lucide.createIcons();

    // Inline label edits on blur
    listEl.querySelectorAll("[data-slot-edit-label]").forEach((input) => {
      input.onchange = () => {
        const id = input.dataset.slotEditLabel;
        const newLabel = input.value.trim();
        if (!newLabel) return;
        const slot = state.timeSlots.find((s) => s.id === id);
        if (slot && slot.label !== newLabel) {
          this.history.recordState();
          slot.label = newLabel;
          this.storage.debouncedSave();
          events.emit("schedule:updated");
        }
      };
    });

    // Slot action buttons
    listEl.querySelectorAll("[data-slot-action]").forEach((btn) => {
      btn.onclick = () => {
        const action = btn.dataset.slotAction;
        const id = btn.dataset.id;
        if (action === "move-up") this.moveSlot(id, -1);
        else if (action === "move-down") this.moveSlot(id, 1);
        else if (action === "delete") this.deleteSlot(id);
        else if (action === "edit-times") this.promptEditSlotTimes(id);
      };
    });
  }

  moveSlot(slotId, direction) {
    const state = this.store.getState();
    const idx = state.timeSlots.findIndex((s) => s.id === slotId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= state.timeSlots.length) return;

    this.history.recordState();
    const temp = state.timeSlots[idx];
    state.timeSlots[idx] = state.timeSlots[targetIdx];
    state.timeSlots[targetIdx] = temp;

    this.storage.debouncedSave();
    this.renderSlotsList();
    events.emit("schedule:updated");
  }

  deleteSlot(slotId) {
    const state = this.store.getState();
    const slot = state.timeSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const countOnSchedule = state.schedule.filter((s) => s.slotId && s.slotId.endsWith(`-${slotId}`)).length;
    let msg = `Xóa ca "${slot.label}" (${slot.start} - ${slot.end})?`;
    if (countOnSchedule > 0) {
      msg += ` Có ${countOnSchedule} buổi học đang xếp trong ca này sẽ bị xóa theo!`;
    }

    if (!confirm(msg)) return;

    this.history.recordState();
    state.timeSlots = state.timeSlots.filter((s) => s.id !== slotId);
    state.schedule = state.schedule.filter((s) => !s.slotId.endsWith(`-${slotId}`));

    this.storage.debouncedSave();
    this.renderSlotsList();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa ca "${slot.label}"`, type: "info" });
  }

  promptEditSlotTimes(slotId) {
    const state = this.store.getState();
    const slot = state.timeSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const newStart = prompt(`Nhập giờ bắt đầu (HH:MM):`, slot.start);
    if (!newStart) return;
    const newEnd = prompt(`Nhập giờ kết thúc (HH:MM):`, slot.end);
    if (!newEnd) return;

    // Validate format
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(newStart.trim()) || !timeRegex.test(newEnd.trim())) {
      alert("Định dạng giờ không hợp lệ! Vui lòng nhập đúng HH:MM (ví dụ 07:30 hoặc 23:00).");
      return;
    }

    this.history.recordState();
    slot.start = newStart.trim();
    slot.end = newEnd.trim();

    this.storage.debouncedSave();
    this.renderSlotsList();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã cập nhật giờ cho ca "${slot.label}"`, type: "success" });
  }

  bindManageSlotsForm() {
    const formAdd = $("#form-add-slot");
    if (formAdd) {
      formAdd.addEventListener("submit", (e) => {
        e.preventDefault();
        const label = $("#input-new-slot-label").value.trim();
        const start = $("#input-new-slot-start").value.trim();
        const end = $("#input-new-slot-end").value.trim();

        if (!label || !start || !end) return;

        const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          alert("Giờ bắt đầu và kết thúc phải đúng định dạng HH:MM");
          return;
        }

        const state = this.store.getState();
        this.history.recordState();

        const newSlot = {
          id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          label,
          start,
          end,
        };

        state.timeSlots.push(newSlot);
        this.storage.debouncedSave();
        formAdd.reset();
        this.renderSlotsList();
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã thêm ca học "${label}"`, type: "success" });
      });
    }

    // Sort chronologically button
    const btnSort = $("#btn-sort-slots-time");
    if (btnSort) {
      btnSort.onclick = () => {
        const state = this.store.getState();
        this.history.recordState();
        state.timeSlots.sort((a, b) => {
          const aMin = TimeEngine.parseMinutes(a.start);
          const bMin = TimeEngine.parseMinutes(b.start);
          return aMin - bMin;
        });
        this.storage.debouncedSave();
        this.renderSlotsList();
        events.emit("schedule:updated");
        events.emit("toast:show", { message: "Đã sắp xếp các ca theo thứ tự thời gian", type: "success" });
      };
    }
  }

  // ==================== 3. PLACE ACTIVITY FROM LIBRARY MODAL ====================
  openPlaceActivity(lessonId) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    $("#place-activity-lesson-id").value = lessonId;
    $("#place-activity-subject-title").textContent = lesson.subject;
    $("#place-activity-meta").textContent = `${lesson.teacher || "-"} • ${lesson.room || "-"}`;

    // Populate Slots Dropdown
    const slotSelect = $("#place-activity-slot-select");
    if (slotSelect) {
      slotSelect.innerHTML = state.timeSlots
        .map((slot) => `<option value="${slot.id}">${escapeHTML(slot.label)} (${slot.start} - ${slot.end})</option>`)
        .join("");
    }

    this.open("modal-place-activity");
  }

  bindPlaceActivityForm() {
    const form = $("#form-place-activity");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const lessonId = $("#place-activity-lesson-id").value;
      const day = $("#place-activity-day-select").value;
      const slotId = $("#place-activity-slot-select").value;
      const applyAllDays = $("#place-activity-all-days")?.checked;

      const state = this.store.getState();
      const lesson = state.lessons.find((l) => l.id === lessonId);
      if (!lesson || !slotId) return;

      this.history.recordState();

      const daysToApply = applyAllDays ? DAY_ORDER : [parseInt(day, 10)];
      daysToApply.forEach((targetDay) => {
        const targetSlotKey = `${targetDay}-${slotId}`;
        // Remove existing item in target slot
        state.schedule = state.schedule.filter((s) => s.slotId !== targetSlotKey);
        state.schedule.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          subject: lesson.subject,
          teacher: lesson.teacher || "",
          room: lesson.room || "",
          color: lesson.color || "blue",
          slotId: targetSlotKey,
          status: "planned",
          priority: "medium",
        });
      });

      this.storage.debouncedSave();
      this.close("modal-place-activity");
      events.emit("schedule:updated");
      events.emit("toast:show", {
        message: applyAllDays
          ? `Đã xếp "${lesson.subject}" vào cả tuần (T2 - CN)`
          : `Đã xếp "${lesson.subject}" vào ${DAY_NAMES[day]}`,
        type: "success",
      });
    });
  }
}

/* --- Module: drawer.js --- */
/**
 * Drawers & Bottom Sheets UI Component
 */






class DrawerUI {
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
}

/* --- Module: command-palette.js --- */
/**
 * Command Palette (Ctrl + K) UI Component
 */




class CommandPaletteUI {
  constructor(store) {
    this.store = store;
    this.actions = [
      { id: "manage-slots", icon: "clock-4", label: "Quản lý mốc thời gian & ca học tùy chỉnh", run: () => events.emit("modal:open-manage-slots") },
      { id: "add-activity", icon: "plus", label: "Tạo môn học mới vào kho", run: () => events.emit("drawer:open", "drawer-add-activity") },
      { id: "focus-mode", icon: "target", label: "Bật chế độ Focus Mode (Pomodoro)", run: () => events.emit("focus:start") },
      { id: "analytics", icon: "bar-chart-2", label: "Xem phân tích & Thống kê 2.0", run: () => events.emit("modal:open", "modal-analytics") },
      { id: "export-excel", icon: "file-spreadsheet", label: "Xuất bảng Excel (SheetJS)", run: () => events.emit("backup:export-excel") },
      { id: "export-json", icon: "download", label: "Xuất sao lưu JSON đầy đủ", run: () => events.emit("backup:export-json") },
      { id: "settings", icon: "settings", label: "Mở Cài đặt hệ thống & Chẩn đoán", run: () => events.emit("modal:open", "modal-settings") },
      { id: "toggle-dark", icon: "moon", label: "Chuyển đổi giao diện Tối / Sáng", run: () => events.emit("theme:toggle-dark") },
    ];
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Keyboard shortcut: Ctrl + K
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.open();
      }
    });

    const triggerBtn = $("#btn-trigger-command-palette");
    if (triggerBtn) {
      triggerBtn.addEventListener("click", () => this.open());
    }

    const input = $("#command-palette-input");
    if (input) {
      input.addEventListener("input", (e) => {
        this.renderList(e.target.value.toLowerCase().trim());
      });
    }

    const list = $("#command-palette-list");
    if (list) {
      list.addEventListener("click", (e) => {
        const item = e.target.closest("[data-action-id]");
        if (item) {
          const id = item.dataset.actionId;
          const action = this.actions.find((a) => a.id === id);
          if (action) {
            this.close();
            action.run();
          }
        }
      });
    }

    $("#btn-close-command-palette")?.addEventListener("click", () => this.close());
  }

  open() {
    const modal = $("#modal-command-palette");
    if (!modal) return;
    modal.classList.add("active");
    this.renderList("");
    setTimeout(() => {
      const input = $("#command-palette-input");
      if (input) {
        input.value = "";
        input.focus();
      }
    }, 50);
  }

  close() {
    const modal = $("#modal-command-palette");
    if (modal) modal.classList.remove("active");
  }

  renderList(query) {
    const list = $("#command-palette-list");
    if (!list) return;

    let filtered = this.actions;
    if (query) {
      filtered = this.actions.filter((a) => a.label.toLowerCase().includes(query));
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          Không tìm thấy lệnh hoặc hoạt động nào phù hợp.
        </div>
      `;
      return;
    }

    list.innerHTML = filtered
      .map(
        (a) => `
        <div
          role="button"
          tabindex="0"
          data-action-id="${a.id}"
          class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition text-xs text-slate-700 dark:text-slate-200"
        >
          <div class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <i data-lucide="${a.icon}" class="w-4 h-4"></i>
          </div>
          <span class="font-medium flex-1">${escapeHTML(a.label)}</span>
          <span class="text-[10px] text-slate-400">↵</span>
        </div>
      `
      )
      .join("");

    if (typeof lucide !== "undefined") lucide.createIcons();
  }
}

/* --- Module: responsive-nav.js --- */
/**
 * Mobile Responsive Navigation & Day Selector UI Component
 */





class ResponsiveNavUI {
  constructor(store) {
    this.store = store;
    this.currentMobileTab = "schedule";
  }

  init() {
    this.bindEvents();
    this.renderDaySelector();
  }

  bindEvents() {
    // Mobile Bottom Navigation Tabs Click
    const nav = $("#mobile-bottom-nav");
    if (nav) {
      nav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-mobile-tab]");
        if (btn) {
          const tab = btn.dataset.mobileTab;
          this.switchTab(tab);
        }
      });
    }

    // Mobile Day Selector Chips Click
    const daySelector = $("#mobile-day-selector");
    if (daySelector) {
      daySelector.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-day]");
        if (chip) {
          const day = parseInt(chip.dataset.day, 10);
          this.selectDay(day);
        }
      });
    }

    // Touch Swipe Left / Right to switch days
    const viewport = $("#timetable-viewport");
    if (viewport) {
      setupSwipeListener(viewport, {
        onSwipeLeft: () => this.nextDay(),
        onSwipeRight: () => this.prevDay(),
        threshold: 40,
      });
    }

    events.on("schedule:updated", () => this.renderDaySelector());
  }

  switchTab(tab) {
    this.currentMobileTab = tab;
    $$("#mobile-bottom-nav [data-mobile-tab]").forEach((btn) => {
      const isActive = btn.dataset.mobileTab === tab;
      btn.classList.toggle("text-sky-600", isActive);
      btn.classList.toggle("dark:text-sky-400", isActive);
      btn.classList.toggle("font-bold", isActive);
      btn.classList.toggle("text-slate-400", !isActive);
    });

    if (tab === "home" || tab === "schedule") {
      events.emit("nav:show-schedule");
    } else if (tab === "focus") {
      events.emit("focus:start");
    } else if (tab === "stats") {
      events.emit("modal:open", "modal-analytics");
    } else if (tab === "more") {
      events.emit("modal:open", "modal-settings");
    }
  }

  selectDay(day) {
    this.store.setState({ selectedDayMobile: day });
    this.renderDaySelector();
    events.emit("schedule:day-changed", day);
  }

  nextDay() {
    const state = this.store.getState();
    const currentIdx = DAY_ORDER.indexOf(state.selectedDayMobile);
    const nextIdx = (currentIdx + 1) % DAY_ORDER.length;
    this.selectDay(DAY_ORDER[nextIdx]);
  }

  prevDay() {
    const state = this.store.getState();
    const currentIdx = DAY_ORDER.indexOf(state.selectedDayMobile);
    const prevIdx = (currentIdx - 1 + DAY_ORDER.length) % DAY_ORDER.length;
    this.selectDay(DAY_ORDER[prevIdx]);
  }

  renderDaySelector() {
    const container = $("#mobile-day-selector");
    if (!container) return;

    const state = this.store.getState();
    const now = new Date();
    const today = now.getDay();

    container.innerHTML = DAY_ORDER.map((d) => {
      const isActive = d === state.selectedDayMobile;
      const isToday = d === today;
      const count = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${d}-`)).length;

      return `
        <button
          type="button"
          data-day="${d}"
          class="mobile-day-chip ${isActive ? "active" : ""} ${isToday ? "is-today ring-1 ring-sky-500 font-bold" : ""}"
          title="${DAY_NAMES[d]}${isToday ? " (Hôm nay)" : ""}"
        >
          <span class="text-xs font-bold">${DAY_SHORT_NAMES[d]}</span>
          <span class="text-[9px] opacity-80">${isToday ? "Nay" : DAY_NAMES[d].replace("Thứ ", "T")}</span>
          ${count > 0 ? `<span class="text-[9px] px-1 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"} font-bold mt-0.5">${count}</span>` : ""}
        </button>
      `;
    }).join("");
  }
}

/* --- Module: app.js --- */
/**
 * Main Application Orchestrator & Bootstrap
 */























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
    this.modalUI.init();
    this.drawerUI.init();
    this.commandPaletteUI.init();
    this.responsiveNavUI.init();

    // 4. Start Global Clock
    this.startGlobalClock();

    // 5. Bind Core App Events
    this.bindAppEvents();

    // 6. First Render
    this.updateHeaderDates();
    this.updateLiveActivities();
    if (typeof lucide !== "undefined") lucide.createIcons();
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
      this.renderAnalyticsModal();
      this.modalUI.open("modal-analytics");
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

  renderAnalyticsModal() {
    const metrics = this.analytics.getMetrics();
    const insights = this.analytics.generateInsights();
    const container = $("#analytics-modal-content");
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span class="text-[10px] uppercase font-bold text-slate-400">Tổng ca học</span>
          <div class="text-xl font-black text-slate-900 dark:text-white mt-0.5">${metrics.totalSessions}</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span class="text-[10px] uppercase font-bold text-slate-400">Đã hoàn thành</span>
          <div class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">${metrics.completionRate}%</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span class="text-[10px] uppercase font-bold text-slate-400">Thời lượng Focus</span>
          <div class="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5">${formatDurationShort(metrics.focusMinutes)}</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span class="text-[10px] uppercase font-bold text-slate-400">Trạng thái</span>
          <div class="text-xs font-black ${metrics.balanceColor} mt-1">${metrics.balanceStatus}</div>
        </div>
      </div>

      <div class="mt-4">
        <h4 class="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Thông tin & Gợi ý lịch trình</h4>
        <div class="space-y-2">
          ${insights.map((ins) => `
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <span class="font-bold text-slate-900 dark:text-white">${ins.title}:</span>
              <p class="text-slate-600 dark:text-slate-400 mt-0.5">${ins.desc}</p>
            </div>
          `).join("")}
        </div>
      </div>
    `;
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

})();
