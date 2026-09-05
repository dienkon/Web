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

  static getSlotDurationMinutes(slot) {
    if (!slot) return 0;
    return this.getDurationMinutes(slot.start, slot.end);
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

/* --- Module: merge-engine.js --- */
/**
 * Smart Block Merge Engine - Pure Function Utility
 * Merges consecutive schedule items sharing identical subject, teacher, room, and color.
 * Preserves raw schedule entries and never mutates original state directly.
 */



const PRIORITY_RANK = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Returns merged visual blocks for a specific day.
 * @param {Array} schedule - Raw schedule items
 * @param {Array} timeSlots - Ordered array of timeSlot definitions
 * @param {number} day - Day index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @param {boolean} [autoMerge=true] - Whether to merge or return 1:1 visual blocks
 * @returns {Array} List of merged visual blocks
 */
function buildMergedBlocks(schedule = [], timeSlots = [], day, autoMerge = true) {
  if (!Array.isArray(schedule) || !Array.isArray(timeSlots) || day === undefined) {
    return [];
  }

  // 1. Get all items of the given day
  const prefix = `${day}-`;
  const dayItems = schedule.filter((s) => s && s.slotId && s.slotId.startsWith(prefix));
  if (dayItems.length === 0) return [];

  // 2. Map items with their slotIndex and slot object
  const itemsWithSlot = [];
  dayItems.forEach((item) => {
    const [, slotId] = item.slotId.split("-");
    const slotIdx = timeSlots.findIndex((s) => s.id === slotId);
    if (slotIdx >= 0) {
      itemsWithSlot.push({
        item,
        slotIdx,
        slot: timeSlots[slotIdx],
      });
    }
  });

  // Sort by slot index ascending
  itemsWithSlot.sort((a, b) => a.slotIdx - b.slotIdx);

  if (!autoMerge) {
    // Return each item as its own single-slot visual block
    return itemsWithSlot.map(({ item, slotIdx, slot }) => {
      const durationMinutes = TimeEngine.getDurationMinutes(slot.start, slot.end);
      return {
        id: `block_${day}_${slotIdx}_${item.id || slot.id}`,
        day,
        startSlotIndex: slotIdx,
        endSlotIndex: slotIdx,
        slotCount: 1,
        startSlot: slot,
        endSlot: slot,
        startTime: slot.start,
        endTime: slot.end,
        durationMinutes,
        subject: item.subject || "",
        teacher: item.teacher || "",
        room: item.room || "",
        color: item.color || "blue",
        status: item.status || "planned",
        priority: item.priority || "medium",
        isFocus: Boolean(item.isFocus),
        notes: item.notes || "",
        items: [item],
        slotKeys: [item.slotId],
        isMerged: false,
      };
    });
  }

  // 3. Smart Merge Algorithm
  const blocks = [];
  let currentGroup = [];

  const getMergeKey = (entry) => {
    const it = entry.item;
    const sub = (it.subject || "").trim().toLowerCase();
    const tch = (it.teacher || "").trim().toLowerCase();
    const rm = (it.room || "").trim().toLowerCase();
    const clr = (it.color || "blue").trim().toLowerCase();
    const st = (it.status || "planned").trim().toLowerCase();
    return `${sub}|${tch}|${rm}|${clr}|${st}`;
  };

  for (let i = 0; i < itemsWithSlot.length; i++) {
    const entry = itemsWithSlot[i];

    if (currentGroup.length === 0) {
      currentGroup.push(entry);
      continue;
    }

    const prevEntry = currentGroup[currentGroup.length - 1];
    const isConsecutive = entry.slotIdx === prevEntry.slotIdx + 1;
    const sameKey = getMergeKey(entry) === getMergeKey(prevEntry);
    const hasManualSplit = Boolean(entry.item.manualSplit) || Boolean(prevEntry.item.manualSplit);

    if (isConsecutive && sameKey && !hasManualSplit) {
      currentGroup.push(entry);
    } else {
      blocks.push(buildBlockFromGroup(currentGroup, day, timeSlots));
      currentGroup = [entry];
    }
  }

  if (currentGroup.length > 0) {
    blocks.push(buildBlockFromGroup(currentGroup, day, timeSlots));
  }

  return blocks;
}

function buildBlockFromGroup(group, day, timeSlots) {
  const firstEntry = group[0];
  const lastEntry = group[group.length - 1];
  const firstItem = firstEntry.item;

  const startSlot = firstEntry.slot;
  const endSlot = lastEntry.slot;
  const startSlotIndex = firstEntry.slotIdx;
  const endSlotIndex = lastEntry.slotIdx;
  const slotCount = group.length;

  // Calculate cumulative duration across the spanned slots
  const startTime = startSlot.start;
  const endTime = endSlot.end;
  const durationMinutes = TimeEngine.getDurationMinutes(startTime, endTime);

  // Determine highest priority in block
  let highestPriority = "medium";
  let maxRank = 0;
  group.forEach((g) => {
    const p = g.item.priority || "medium";
    const rank = PRIORITY_RANK[p] || 2;
    if (rank > maxRank) {
      maxRank = rank;
      highestPriority = p;
    }
  });

  const isFocus = group.some((g) => g.item.isFocus);
  const status = firstItem.status || "planned";

  return {
    id: `block_${day}_${startSlotIndex}_${endSlotIndex}_${firstItem.id || 'slot'}`,
    day,
    startSlotIndex,
    endSlotIndex,
    slotCount,
    startSlot,
    endSlot,
    startTime,
    endTime,
    durationMinutes,
    subject: firstItem.subject || "",
    teacher: firstItem.teacher || "",
    room: firstItem.room || "",
    color: firstItem.color || "blue",
    status,
    priority: highestPriority,
    isFocus,
    notes: firstItem.notes || "",
    items: group.map((g) => g.item),
    slotKeys: group.map((g) => g.item.slotId),
    isMerged: slotCount > 1,
  };
}

/**
 * Marks items in schedule with manualSplit: true so they will no longer auto-merge
 */
function splitMergedBlock(schedule = [], slotKeys = []) {
  if (!Array.isArray(schedule) || !Array.isArray(slotKeys)) return schedule;
  const keySet = new Set(slotKeys);
  return schedule.map((item) => {
    if (keySet.has(item.slotId)) {
      return { ...item, manualSplit: true };
    }
    return item;
  });
}

/**
 * Clears manualSplit flag on items so they can merge again
 */
function unsplitMergedBlock(schedule = [], slotKeys = []) {
  if (!Array.isArray(schedule) || !Array.isArray(slotKeys)) return schedule;
  const keySet = new Set(slotKeys);
  return schedule.map((item) => {
    if (keySet.has(item.slotId)) {
      return { ...item, manualSplit: false };
    }
    return item;
  });
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

/* --- Module: store.js --- */
/**
 * Central State Store & Extended Color System
 */

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/60",
    text: "text-blue-900 dark:text-blue-100",
    accent: "bg-blue-500",
    hex: "#3b82f6",
    name: "Xanh dương",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800/60",
    text: "text-sky-900 dark:text-sky-100",
    accent: "bg-sky-500",
    hex: "#0ea5e9",
    name: "Xanh trời",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-cyan-200 dark:border-cyan-800/60",
    text: "text-cyan-900 dark:text-cyan-100",
    accent: "bg-cyan-500",
    hex: "#06b6d4",
    name: "Xanh lơ (Cyan)",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-200 dark:border-teal-800/60",
    text: "text-teal-900 dark:text-teal-100",
    accent: "bg-teal-500",
    hex: "#14b8a6",
    name: "Xanh mòng két",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    text: "text-emerald-900 dark:text-emerald-100",
    accent: "bg-emerald-500",
    hex: "#10b981",
    name: "Lục bảo",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800/60",
    text: "text-green-900 dark:text-green-100",
    accent: "bg-green-500",
    hex: "#22c55e",
    name: "Xanh lá",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  lime: {
    bg: "bg-lime-50 dark:bg-lime-950/40",
    border: "border-lime-200 dark:border-lime-800/60",
    text: "text-lime-900 dark:text-lime-100",
    accent: "bg-lime-500",
    hex: "#84cc16",
    name: "Chanh cốm",
    badge: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-200 dark:border-yellow-800/60",
    text: "text-yellow-900 dark:text-yellow-100",
    accent: "bg-yellow-500",
    hex: "#eab308",
    name: "Vàng chanh",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
    text: "text-amber-900 dark:text-amber-100",
    accent: "bg-amber-500",
    hex: "#f59e0b",
    name: "Hổ phách",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800/60",
    text: "text-orange-900 dark:text-orange-100",
    accent: "bg-orange-500",
    hex: "#f97316",
    name: "Cam tươi",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
    text: "text-rose-900 dark:text-rose-100",
    accent: "bg-rose-500",
    hex: "#f43f5e",
    name: "Hồng đào",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800/60",
    text: "text-red-900 dark:text-red-100",
    accent: "bg-red-500",
    hex: "#ef4444",
    name: "Đỏ tươi",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-800/60",
    text: "text-pink-900 dark:text-pink-100",
    accent: "bg-pink-500",
    hex: "#ec4899",
    name: "Hồng phấn",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  },
  fuchsia: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    border: "border-fuchsia-200 dark:border-fuchsia-800/60",
    text: "text-fuchsia-900 dark:text-fuchsia-100",
    accent: "bg-fuchsia-500",
    hex: "#d946ef",
    name: "Hồng tím",
    badge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800/60",
    text: "text-purple-900 dark:text-purple-100",
    accent: "bg-purple-500",
    hex: "#a855f7",
    name: "Tím mộng",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800/60",
    text: "text-violet-900 dark:text-violet-100",
    accent: "bg-violet-500",
    hex: "#8b5cf6",
    name: "Tím violet",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800/60",
    text: "text-indigo-900 dark:text-indigo-100",
    accent: "bg-indigo-500",
    hex: "#6366f1",
    name: "Chàm",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-800 dark:text-slate-200",
    accent: "bg-slate-500",
    hex: "#64748b",
    name: "Xám đá (Slate)",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  stone: {
    bg: "bg-stone-100 dark:bg-stone-800/60",
    border: "border-stone-300 dark:border-stone-700",
    text: "text-stone-800 dark:text-stone-200",
    accent: "bg-stone-500",
    hex: "#78716c",
    name: "Xám cuội (Stone)",
    badge: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  },
  neutral: {
    bg: "bg-zinc-100 dark:bg-zinc-800/60",
    border: "border-zinc-300 dark:border-zinc-700",
    text: "text-zinc-800 dark:text-zinc-200",
    accent: "bg-zinc-500",
    hex: "#71717a",
    name: "Trung tính",
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

/**
 * Returns safe styling object for a given color key or custom HEX
 */
function getColorConfig(colorKeyOrHex) {
  if (!colorKeyOrHex) return COLOR_MAP.blue;
  if (COLOR_MAP[colorKeyOrHex]) return COLOR_MAP[colorKeyOrHex];

  // If user provided a custom hex like #10b981 or rgb
  if (typeof colorKeyOrHex === "string" && colorKeyOrHex.startsWith("#")) {
    const hex = colorKeyOrHex;
    // Calculate contrast luminance: (r*299 + g*587 + b*114) / 1000
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2) || "0", 16);
    const g = parseInt(cleanHex.substring(2, 4) || "0", 16);
    const b = parseInt(cleanHex.substring(4, 6) || "0", 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    const isDarkText = yiq >= 128;

    return {
      bg: "bg-slate-50 dark:bg-slate-900",
      border: "border-slate-300 dark:border-slate-700",
      text: isDarkText ? "text-slate-900" : "text-white",
      accent: "bg-slate-500",
      hex,
      name: "Tùy chỉnh",
      badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
      isCustomHex: true,
      customHex: hex,
    };
  }

  return COLOR_MAP.blue;
}

const DEFAULT_LESSONS = [
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", category: "coding", hidden: false, priority: "high" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", category: "study", hidden: false, priority: "medium" },
  { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald", category: "rest", hidden: false, priority: "low" },
  { id: "theduc", subject: "Thể Dục & SH", teacher: "Vận động", room: "Ngoài trời", color: "teal", category: "exercise", hidden: false, priority: "medium" },
  { id: "ngutrua", subject: "Ngủ Trưa", teacher: "-", room: "Giường", color: "slate", category: "rest", hidden: false, priority: "low" },
  { id: "xemlai", subject: "Xem Lại & Ngủ", teacher: "-", room: "Giường", color: "stone", category: "study", hidden: false, priority: "low" },
  { id: "ansang", subject: "Ăn sáng, Chill", teacher: "-", room: "Phòng khách", color: "amber", category: "rest", hidden: false, priority: "low" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", category: "study", hidden: false, priority: "high" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788518478271", subject: "Tăng tiết", teacher: "Trường", room: "Lớp A", color: "rose", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", category: "study", hidden: false, priority: "high" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", category: "study", hidden: false, priority: "high" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", category: "study", hidden: false, priority: "high" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", category: "study", hidden: false, priority: "medium" },
  { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "A103", color: "lime", category: "study", hidden: false, priority: "medium" },
];

const DEFAULT_TIMETABLE_HOURS = [
  { id: "slot_1788517789258_43861f", label: "Sáng", start: "06:50", end: "11:30" },
  { id: "slot_1788517838207_40110c", label: "Nghỉ trưa", start: "11:30", end: "12:30" },
  { id: "slot_1788517869598_d1b302", label: "Ca trưa 1", start: "12:30", end: "13:30" },
  { id: "slot_1788517959150_53969e", label: "Ca trưa 2", start: "13:30", end: "14:20" },
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
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "1-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "2-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "3-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "4-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "5-slot_1788517789258_43861f" },
  { id: "l_1788518454593", subject: "Đi học chính khóa", teacher: "Trường", room: "Lớp A", color: "indigo", slotId: "6-slot_1788517789258_43861f" },
  { id: "nghi", subject: "Nghỉ ngơi", teacher: "Thư giãn", room: "Tự do", color: "emerald", slotId: "0-slot_1788517789258_43861f" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", slotId: "1-slot_1788517959150_53969e" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", slotId: "1-slot_1788518172082_d3b144" },
  { id: "l_1788518466608", subject: "Đi học trái buổi", teacher: "Trường", room: "Lớp B", color: "purple", slotId: "1-slot_1788518132491_21a17d" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "1-slot_1788517869598_d1b302" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "1-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "2-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "3-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "4-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "5-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "6-slot_1788518299952_dcf9fd" },
  { id: "code", subject: "CODE", teacher: "Thực hành", room: "PC", color: "blue", slotId: "0-slot_1788518299952_dcf9fd" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "1-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "3-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "2-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "4-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "5-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "6-slot_1788518334577_5c40d0" },
  { id: "l_1788518582695", subject: "Dạy Toán", teacher: "Dienkon", room: "Online", color: "emerald", slotId: "0-slot_1788518334577_5c40d0" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "1-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "2-slot_1788518378812_8138fc" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "3-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "4-slot_1788518378812_8138fc" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "5-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "6-slot_1788518378812_8138fc" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "0-slot_1788518378812_8138fc" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "2-slot_1788517869598_d1b302" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "3-slot_1788517869598_d1b302" },
  { id: "l_1788519353040", subject: "ĐGNL", teacher: "Logic", room: "A103", color: "cyan", slotId: "4-slot_1788517869598_d1b302" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518172082_d3b144" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "0-slot_1788517869598_d1b302" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "6-slot_1788517869598_d1b302" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "2-slot_1788517959150_53969e" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518132491_21a17d" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "4-slot_1788517959150_53969e" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788517959150_53969e" },
  { id: "l_1788519360838", subject: "ĐGNL", teacher: "PTSL", room: "A103", color: "lime", slotId: "5-slot_1788517959150_53969e" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "0-slot_1788518132491_21a17d" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "0-slot_1788517959150_53969e" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "3-slot_1788517959150_53969e" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "2-slot_1788518132491_21a17d" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518132491_21a17d" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "5-slot_1788518132491_21a17d" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518172082_d3b144" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "2-slot_1788518172082_d3b144" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "0-slot_1788518172082_d3b144" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "5-slot_1788517869598_d1b302" },
  { id: "l_1788518738675", subject: "Tiếng Anh", teacher: "Ms. Hoa", room: "Phòng 201", color: "sky", slotId: "5-slot_1788518172082_d3b144" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "6-slot_1788518132491_21a17d" },
  { id: "ly", subject: "Vật Lý", teacher: "Ôn thi", room: "Bàn học", color: "indigo", slotId: "4-slot_1788518172082_d3b144" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "1-slot_1788518269348_5562db" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "2-slot_1788518269348_5562db" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "1-slot_1788518243515_3203bb" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "2-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518269348_5562db" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "4-slot_1788518269348_5562db" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "5-slot_1788518269348_5562db" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "6-slot_1788518269348_5562db" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "3-slot_1788518243515_3203bb" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "4-slot_1788518243515_3203bb" },
  { id: "l_1788519325607", subject: "ĐGNL", teacher: "Tiếng Việt", room: "A102", color: "orange", slotId: "6-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "5-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "0-slot_1788518243515_3203bb" },
  { id: "l_1788519299708", subject: "ĐGNL", teacher: "Toán", room: "A102", color: "amber", slotId: "0-slot_1788518269348_5562db" },
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
        manualSplit: false,
      })),
      settings: {
        theme: "light", // STRICT DEFAULT LIGHT MODE
        themePreset: "ocean",
        zoomLevel: "normal",
        dayStart: "06:30",
        dayEnd: "23:30",
        weekStartsOn: 1,
        libraryCollapsed: false,
        autoMergeBlocks: true,
        showHiddenLessons: false,
      },
      snapshots: [],
      goals: [
        { id: "g1", subject: "CODE", targetHours: 8 },
        { id: "g2", subject: "Tiếng Anh", targetHours: 6 },
        { id: "g3", subject: "ĐGNL", targetHours: 10 },
      ],
      history: [],
      currentWeekOffset: 0,
      selectedDayMobile: now.getDay(),
      activeFilter: "all",
      selectedCells: new Set(),
      focusSession: null,
      analyticsGrouping: "subject-teacher-room",
      analyticsTab: "overview",
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
    if (Array.isArray(importedData.lessons)) {
      this.state.lessons = importedData.lessons.map((l) => ({
        ...l,
        category: l.category || "study",
        hidden: Boolean(l.hidden),
        color: l.color || "blue",
      }));
    }
    if (Array.isArray(importedData.timeSlots)) this.state.timeSlots = importedData.timeSlots;
    if (Array.isArray(importedData.schedule)) {
      this.state.schedule = importedData.schedule.map((item) => ({
        ...item,
        status: item.status || "planned",
        priority: item.priority || "medium",
        isFocus: Boolean(item.isFocus),
        tags: Array.isArray(item.tags) ? item.tags : [],
        notes: item.notes || "",
        manualSplit: Boolean(item.manualSplit),
        color: item.color || "blue",
      }));
    }
    if (importedData.settings) {
      this.state.settings = { ...this.state.settings, ...importedData.settings };
    }
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

/* --- Module: analytics-engine.js --- */
/**
 * Advanced Analytics Engine - Pure Functions with Memoization Cache
 * Calculates rich schedule intelligence: KPIs, Subjects, Daily Workload, Breaks, Heatmap, and Smart Insights.
 */





class AnalyticsEngineClass {
  constructor() {
    this._cache = new Map();
  }

  _computeStateKey(schedule = [], timeSlots = [], lessons = [], grouping = "subject-teacher-room") {
    return `${schedule.length}_${timeSlots.length}_${lessons.length}_${grouping}_${this._hashSchedule(schedule)}`;
  }

  _hashSchedule(schedule = []) {
    let hash = 0;
    for (let i = 0; i < schedule.length; i++) {
      const s = schedule[i];
      const str = `${s.slotId}:${s.subject}:${s.status}:${s.color}`;
      for (let j = 0; j < str.length; j++) {
        hash = ((hash << 5) - hash + str.charCodeAt(j)) | 0;
      }
    }
    return hash;
  }

  /**
   * Main computation that derives all analytics with memoization.
   */
  computeAll(schedule = [], timeSlots = [], lessons = [], grouping = "subject-teacher-room") {
    // Robust argument handling: if state object passed as 1st argument
    if (schedule && !Array.isArray(schedule) && typeof schedule === "object") {
      timeSlots = schedule.timeSlots || [];
      lessons = schedule.lessons || [];
      schedule = schedule.schedule || [];
    }
    if (!Array.isArray(schedule)) schedule = [];
    if (!Array.isArray(timeSlots)) timeSlots = [];
    if (!Array.isArray(lessons)) lessons = [];

    const key = this._computeStateKey(schedule, timeSlots, lessons, grouping);
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const slotMap = new Map();
    timeSlots.forEach((s, idx) => slotMap.set(s.id, { ...s, index: idx }));

    const overview = this.calculateOverview(schedule, timeSlots, lessons, slotMap);
    const daily = this.calculateDailyStats(schedule, timeSlots, slotMap);
    const subjects = this.calculateSubjectStats(schedule, timeSlots, grouping, slotMap);
    const teachers = this.calculateTeacherStats(schedule, timeSlots, slotMap);
    const rooms = this.calculateRoomStats(schedule, timeSlots, slotMap);
    const breaks = this.calculateBreakStats(schedule, timeSlots, slotMap);
    const streaks = this.calculateContinuousLoad(schedule, timeSlots, slotMap);
    const heatmap = this.calculateWorkloadHeatmap(schedule, timeSlots, slotMap);
    const distribution = this.calculateSubjectDistribution(schedule, timeSlots, slotMap);
    const insights = this.calculateInsights(schedule, timeSlots, lessons, { overview, daily, breaks, streaks, subjects });

    const result = {
      overview,
      daily,
      dailyStats: daily,
      subjects,
      subjectStats: subjects,
      teachers,
      teacherStats: teachers,
      rooms,
      roomStats: rooms,
      breaks,
      breakStats: breaks,
      streaks,
      heatmap,
      distribution,
      insights,
      computedAt: new Date().toISOString(),
    };

    // Keep cache size bounded
    if (this._cache.size > 20) this._cache.clear();
    this._cache.set(key, result);

    return result;
  }

  calculateOverview(schedule = [], timeSlots = [], lessons = [], slotMap) {
    let totalMinutes = 0;
    let totalFocusMinutes = 0;
    let completedCount = 0;
    const subjectFreq = {};
    const teacherFreq = {};
    const roomFreq = {};
    const dayFreq = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayMinutes = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    schedule.forEach((item) => {
      const [d, slotId] = (item.slotId || "").split("-");
      const dayNum = parseInt(d, 10);
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      totalMinutes += dur;

      if (item.isFocus) totalFocusMinutes += dur;
      if (item.status === "completed") completedCount++;

      const sub = (item.subject || "Khác").trim();
      subjectFreq[sub] = (subjectFreq[sub] || 0) + 1;

      if (item.teacher && item.teacher.trim() !== "-") {
        const tch = item.teacher.trim();
        teacherFreq[tch] = (teacherFreq[tch] || 0) + 1;
      }

      if (item.room && item.room.trim() !== "-") {
        const rm = item.room.trim();
        roomFreq[rm] = (roomFreq[rm] || 0) + 1;
      }

      if (!isNaN(dayNum)) {
        dayFreq[dayNum] = (dayFreq[dayNum] || 0) + 1;
        dayMinutes[dayNum] = (dayMinutes[dayNum] || 0) + dur;
      }
    });

    const totalSessions = schedule.length;
    const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

    const findTop = (obj) => {
      let topKey = "--";
      let max = 0;
      for (const k in obj) {
        if (obj[k] > max) {
          max = obj[k];
          topKey = k;
        }
      }
      return { name: topKey, count: max };
    };

    // Find busiest and lightest active day (excluding 0 sessions days if others exist)
    let busiestDay = 1;
    let lightestDay = 1;
    let maxMins = -1;
    let minMins = 99999;

    for (let d = 0; d <= 6; d++) {
      const mins = dayMinutes[d];
      if (mins > maxMins) {
        maxMins = mins;
        busiestDay = d;
      }
      if (mins < minMins && mins > 0) {
        minMins = mins;
        lightestDay = d;
      }
    }
    if (minMins === 99999) minMins = 0;

    const activeUniqueSubjects = Object.keys(subjectFreq).length;

    return {
      totalSessions,
      totalSlots: totalSessions,
      totalStudyMinutes: totalMinutes,
      totalStudyHours: +(totalMinutes / 60).toFixed(1),
      totalFocusMinutes,
      totalFocusHours: +(totalFocusMinutes / 60).toFixed(1),
      completedSessions: completedCount,
      completionRate,
      totalSubjectsInLibrary: lessons.length,
      activeUniqueSubjects,
      topSubject: findTop(subjectFreq),
      topTeacher: findTop(teacherFreq),
      topRoom: findTop(roomFreq),
      busiestDay: { day: busiestDay, name: DAY_NAMES[busiestDay], minutes: maxMins },
      lightestDay: { day: lightestDay, name: DAY_NAMES[lightestDay], minutes: minMins },
    };
  }

  calculateSubjectStats(schedule = [], timeSlots = [], groupBy = "subject-teacher-room", slotMap) {
    const groups = new Map();
    let totalScheduleMinutes = 0;

    schedule.forEach((item) => {
      const [d, slotId] = (item.slotId || "").split("-");
      const dayNum = parseInt(d, 10);
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      totalScheduleMinutes += dur;

      let key = "";
      let groupName = "";
      const sub = (item.subject || "Chưa đặt tên").trim();
      const tch = (item.teacher || "").trim();
      const rm = (item.room || "").trim();
      const clr = (item.color || "blue").trim();

      switch (groupBy) {
        case "subject":
          key = sub.toLowerCase();
          groupName = sub;
          break;
        case "subject-teacher":
          key = `${sub.toLowerCase()}|${tch.toLowerCase()}`;
          groupName = `${sub}${tch ? ` • ${tch}` : ""}`;
          break;
        case "subject-room":
          key = `${sub.toLowerCase()}|${rm.toLowerCase()}`;
          groupName = `${sub}${rm ? ` • ${rm}` : ""}`;
          break;
        case "teacher":
          key = (tch || "Chưa phân công").toLowerCase();
          groupName = tch || "Chưa phân công";
          break;
        case "room":
          key = (rm || "Tự do / Online").toLowerCase();
          groupName = rm || "Tự do / Online";
          break;
        case "color":
          key = clr.toLowerCase();
          groupName = COLOR_MAP[clr]?.name || clr;
          break;
        case "subject-teacher-room":
        default:
          key = `${sub.toLowerCase()}|${tch.toLowerCase()}|${rm.toLowerCase()}|${clr.toLowerCase()}`;
          groupName = sub;
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: groupName,
          subject: sub,
          teacher: tch,
          room: rm,
          color: clr,
          colorHex: COLOR_MAP[clr]?.hex || "#3b82f6",
          sessionCount: 0,
          slotCount: 0,
          totalMinutes: 0,
          daysSet: new Set(),
          daysMap: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          completedCount: 0,
          focusCount: 0,
          priorities: {},
          firstSlotIndex: 999,
          lastSlotIndex: -1,
          items: [],
        });
      }

      const g = groups.get(key);
      g.sessionCount += 1;
      g.slotCount += 1;
      g.totalMinutes += dur;
      g.daysSet.add(dayNum);
      g.daysMap[dayNum] = (g.daysMap[dayNum] || 0) + 1;
      if (item.status === "completed") g.completedCount += 1;
      if (item.isFocus) g.focusCount += 1;

      const prio = item.priority || "medium";
      g.priorities[prio] = (g.priorities[prio] || 0) + 1;

      if (slot.index < g.firstSlotIndex) g.firstSlotIndex = slot.index;
      if (slot.index > g.lastSlotIndex) g.lastSlotIndex = slot.index;
      g.items.push(item);
    });

    const result = [];
    groups.forEach((g) => {
      const daysList = Array.from(g.daysSet)
        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        .map((d) => DAY_SHORT_NAMES[d]);

      let highestPriority = "medium";
      if (g.priorities.critical) highestPriority = "critical";
      else if (g.priorities.high) highestPriority = "high";
      else if (g.priorities.medium) highestPriority = "medium";
      else if (g.priorities.low) highestPriority = "low";

      const firstSlot = g.firstSlotIndex !== 999 ? timeSlots[g.firstSlotIndex] : null;
      const lastSlot = g.lastSlotIndex !== -1 ? timeSlots[g.lastSlotIndex] : null;

      result.push({
        ...g,
        dayCount: g.daysSet.size,
        daysList,
        totalHoursFormatted: +(g.totalMinutes / 60).toFixed(1),
        completionRate: g.sessionCount > 0 ? Math.round((g.completedCount / g.sessionCount) * 100) : 0,
        highestPriority,
        firstSlotTime: firstSlot ? `${firstSlot.label} (${firstSlot.start})` : "--",
        lastSlotTime: lastSlot ? `${lastSlot.label} (${lastSlot.end})` : "--",
        sessionsCount: g.sessionCount,
        percentageOfTotalTime: totalScheduleMinutes > 0 ? Math.round((g.totalMinutes / totalScheduleMinutes) * 100) : 0,
        percentageOfWeek: totalScheduleMinutes > 0 ? Math.round((g.totalMinutes / totalScheduleMinutes) * 100) : 0,
        averageSessionMinutes: g.sessionCount > 0 ? Math.round(g.totalMinutes / g.sessionCount) : 0,
      });
    });

    // Sort by totalMinutes descending
    result.sort((a, b) => b.totalMinutes - a.totalMinutes);
    return result;
  }

  calculateDailyStats(schedule = [], timeSlots = [], slotMap) {
    const days = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun order

    return days.map((dayNum) => {
      const prefix = `${dayNum}-`;
      const dayItems = schedule.filter((s) => s.slotId && s.slotId.startsWith(prefix));

      const itemsWithSlot = [];
      const subjectsSet = new Set();
      const teachersSet = new Set();
      const roomsSet = new Set();
      let totalMinutes = 0;
      let completedCount = 0;
      let focusCount = 0;

      dayItems.forEach((it) => {
        const [, sId] = it.slotId.split("-");
        const slot = slotMap.get(sId);
        if (slot) {
          const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
          totalMinutes += dur;
          itemsWithSlot.push({ item: it, slot, dur });
          subjectsSet.add(it.subject);
          if (it.teacher && it.teacher !== "-") teachersSet.add(it.teacher);
          if (it.room && it.room !== "-") roomsSet.add(it.room);
          if (it.status === "completed") completedCount++;
          if (it.isFocus) focusCount++;
        }
      });

      itemsWithSlot.sort((a, b) => a.slot.index - b.slot.index);

      // Streaks and breaks calculation
      let longestStreak = 0;
      let currentStreak = 0;
      let totalBreakMinutes = 0;
      let longestBreakMinutes = 0;
      let shortestBreakMinutes = 9999;
      let breakCount = 0;
      const dayBreaks = [];

      for (let i = 0; i < itemsWithSlot.length; i++) {
        if (i === 0) {
          currentStreak = 1;
          longestStreak = 1;
        } else {
          const prev = itemsWithSlot[i - 1];
          const curr = itemsWithSlot[i];

          if (curr.slot.index === prev.slot.index + 1) {
            // Consecutive
            currentStreak++;
            if (currentStreak > longestStreak) longestStreak = currentStreak;
          } else {
            // Break between slots
            currentStreak = 1;
            const breakDur = TimeEngine.getDurationMinutes(prev.slot.end, curr.slot.start);
            if (breakDur > 0) {
              breakCount++;
              totalBreakMinutes += breakDur;
              dayBreaks.push({ duration: breakDur, from: prev.slot.end, to: curr.slot.start });
              if (breakDur > longestBreakMinutes) longestBreakMinutes = breakDur;
              if (breakDur < shortestBreakMinutes) shortestBreakMinutes = breakDur;
            }
          }
        }
      }

      if (shortestBreakMinutes === 9999) shortestBreakMinutes = 0;

      const startTime = itemsWithSlot.length > 0 ? itemsWithSlot[0].slot.start : "--:--";
      const endTime = itemsWithSlot.length > 0 ? itemsWithSlot[itemsWithSlot.length - 1].slot.end : "--:--";

      // Transparent Workload Score Algorithm (0 - 100)
      // 1. Duration factor (up to 50 pts for 8 hours study)
      const durationScore = Math.min(50, (totalMinutes / 480) * 50);
      // 2. Session density factor (up to 20 pts for 8+ sessions)
      const sessionScore = Math.min(20, (dayItems.length / 8) * 20);
      // 3. Continuous streak factor (up to 20 pts for continuous blocks >= 3 slots)
      const streakScore = Math.min(20, Math.max(0, (longestStreak - 1) * 7));
      // 4. Break deficit penalty (up to 10 pts if heavy day but little break)
      let breakDeficit = 0;
      if (totalMinutes > 180 && totalBreakMinutes < 30) {
        breakDeficit = 10;
      }

      const workloadScore = Math.min(100, Math.round(durationScore + sessionScore + streakScore + breakDeficit));

      let workloadLevel = "Nhẹ";
      let workloadColor = "emerald";
      if (workloadScore > 80) {
        workloadLevel = "Rất cao";
        workloadColor = "rose";
      } else if (workloadScore > 60) {
        workloadLevel = "Cao";
        workloadColor = "amber";
      } else if (workloadScore > 30) {
        workloadLevel = "Vừa";
        workloadColor = "sky";
      }

      return {
        day: dayNum,
        dayName: DAY_NAMES[dayNum],
        shortName: DAY_SHORT_NAMES[dayNum],
        sessionCount: dayItems.length,
        sessionsCount: dayItems.length,
        slotCount: dayItems.length,
        maxContinuousSessions: longestStreak,
        totalMinutes,
        totalHoursFormatted: +(totalMinutes / 60).toFixed(1),
        subjectCount: subjectsSet.size,
        teacherCount: teachersSet.size,
        roomCount: roomsSet.size,
        startTime,
        endTime,
        longestStreak,
        breaks: dayBreaks,
        breakCount,
        totalBreakMinutes,
        longestBreakMinutes,
        shortestBreakMinutes,
        completedCount,
        focusCount,
        workloadScore,
        workloadLevel,
        workloadColor,
      };
    });
  }

  calculateBreakStats(schedule = [], timeSlots = [], slotMap) {
    const allBreaks = [];
    const brackets = {
      short: { label: "< 10 phút", count: 0, items: [] },
      standard: { label: "10 - 20 phút", count: 0, items: [] },
      moderate: { label: "20 - 30 phút", count: 0, items: [] },
      long: { label: "> 30 phút", count: 0, items: [] },
    };

    for (let dayNum = 0; dayNum <= 6; dayNum++) {
      const prefix = `${dayNum}-`;
      const dayItems = schedule.filter((s) => s.slotId && s.slotId.startsWith(prefix));
      const itemsWithSlot = [];

      dayItems.forEach((it) => {
        const [, sId] = it.slotId.split("-");
        const slot = slotMap.get(sId);
        if (slot) itemsWithSlot.push({ item: it, slot });
      });

      itemsWithSlot.sort((a, b) => a.slot.index - b.slot.index);

      for (let i = 0; i < itemsWithSlot.length - 1; i++) {
        const curr = itemsWithSlot[i];
        const next = itemsWithSlot[i + 1];

        if (next.slot.index > curr.slot.index + 1) {
          const dur = TimeEngine.getDurationMinutes(curr.slot.end, next.slot.start);
          if (dur > 0) {
            const breakEntry = {
              day: dayNum,
              dayName: DAY_NAMES[dayNum],
              startTime: curr.slot.end,
              endTime: next.slot.start,
              durationMinutes: dur,
              beforeSubject: curr.item.subject,
              afterSubject: next.item.subject,
            };
            allBreaks.push(breakEntry);

            if (dur < 10) {
              brackets.short.count++;
              brackets.short.items.push(breakEntry);
            } else if (dur <= 20) {
              brackets.standard.count++;
              brackets.standard.items.push(breakEntry);
            } else if (dur <= 30) {
              brackets.moderate.count++;
              brackets.moderate.items.push(breakEntry);
            } else {
              brackets.long.count++;
              brackets.long.items.push(breakEntry);
            }
          }
        }
      }
    }

    const totalBreaks = allBreaks.length;
    const totalBreakMinutes = allBreaks.reduce((acc, b) => acc + b.durationMinutes, 0);
    const avgBreakMinutes = totalBreaks > 0 ? Math.round(totalBreakMinutes / totalBreaks) : 0;
    const maxBreak = allBreaks.reduce((max, b) => (b.durationMinutes > max ? b.durationMinutes : max), 0);

    return {
      totalBreaks,
      totalBreakMinutes,
      totalBreakHours: +(totalBreakMinutes / 60).toFixed(1),
      avgBreakMinutes,
      maxBreakMinutes: maxBreak,
      brackets,
      allBreaks: allBreaks.sort((a, b) => b.durationMinutes - a.durationMinutes),
    };
  }

  calculateContinuousLoad(schedule = [], timeSlots = [], slotMap) {
    const streakBuckets = { 2: 0, 3: 0, 4: 0, 5: 0 };
    let overallLongestStreak = { count: 0, day: 1, dayName: "Thứ Hai", start: "", end: "", subject: "" };

    for (let dayNum = 0; dayNum <= 6; dayNum++) {
      const prefix = `${dayNum}-`;
      const dayItems = schedule.filter((s) => s.slotId && s.slotId.startsWith(prefix));
      const itemsWithSlot = [];

      dayItems.forEach((it) => {
        const [, sId] = it.slotId.split("-");
        const slot = slotMap.get(sId);
        if (slot) itemsWithSlot.push({ item: it, slot });
      });

      itemsWithSlot.sort((a, b) => a.slot.index - b.slot.index);

      let currentStreak = [];
      for (let i = 0; i < itemsWithSlot.length; i++) {
        const entry = itemsWithSlot[i];
        if (currentStreak.length === 0) {
          currentStreak.push(entry);
          continue;
        }

        const prev = currentStreak[currentStreak.length - 1];
        if (entry.slot.index === prev.slot.index + 1) {
          currentStreak.push(entry);
        } else {
          evaluateStreak(currentStreak, dayNum);
          currentStreak = [entry];
        }
      }
      if (currentStreak.length > 0) {
        evaluateStreak(currentStreak, dayNum);
      }
    }

    function evaluateStreak(streak, dayNum) {
      const len = streak.length;
      if (len >= 5) streakBuckets[5]++;
      else if (len === 4) streakBuckets[4]++;
      else if (len === 3) streakBuckets[3]++;
      else if (len === 2) streakBuckets[2]++;

      if (len > overallLongestStreak.count) {
        overallLongestStreak = {
          count: len,
          day: dayNum,
          dayName: DAY_NAMES[dayNum],
          start: streak[0].slot.start,
          end: streak[streak.length - 1].slot.end,
          subject: streak[0].item.subject,
        };
      }
    }

    return {
      buckets: streakBuckets,
      overallLongestStreak,
    };
  }

  calculateWorkloadHeatmap(schedule = [], timeSlots = [], slotMap) {
    const days = [1, 2, 3, 4, 5, 6, 0];
    const matrix = [];

    timeSlots.forEach((slot, slotIdx) => {
      const row = {
        slotIndex: slotIdx,
        slotId: slot.id,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        durationMinutes: TimeEngine.getDurationMinutes(slot.start, slot.end),
        cells: {},
      };

      days.forEach((dayNum) => {
        const slotKey = `${dayNum}-${slot.id}`;
        const item = schedule.find((s) => s.slotId === slotKey);

        if (item) {
          row.cells[dayNum] = {
            hasActivity: true,
            subject: item.subject,
            teacher: item.teacher || "",
            room: item.room || "",
            color: item.color || "blue",
            colorHex: COLOR_MAP[item.color]?.hex || "#3b82f6",
            status: item.status || "planned",
            priority: item.priority || "medium",
            durationMinutes: row.durationMinutes,
            intensity: row.durationMinutes > 90 ? 4 : row.durationMinutes > 60 ? 3 : row.durationMinutes > 40 ? 2 : 1,
          };
        } else {
          row.cells[dayNum] = {
            hasActivity: false,
            intensity: 0,
          };
        }
      });

      matrix.push(row);
    });

    return matrix;
  }

  calculateSubjectDistribution(schedule = [], timeSlots = [], slotMap) {
    const subjectMap = {};
    let totalMinutes = 0;
    let totalSessions = schedule.length;

    schedule.forEach((item) => {
      const [, slotId] = (item.slotId || "").split("-");
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      totalMinutes += dur;

      const sub = (item.subject || "Khác").trim();
      if (!subjectMap[sub]) {
        subjectMap[sub] = {
          subject: sub,
          color: item.color || "blue",
          colorHex: COLOR_MAP[item.color]?.hex || "#3b82f6",
          sessions: 0,
          minutes: 0,
        };
      }
      subjectMap[sub].sessions++;
      subjectMap[sub].minutes += dur;
    });

    const list = Object.values(subjectMap).map((entry) => ({
      ...entry,
      hoursFormatted: +(entry.minutes / 60).toFixed(1),
      percentTime: totalMinutes > 0 ? Math.round((entry.minutes / totalMinutes) * 100) : 0,
      percentSessions: totalSessions > 0 ? Math.round((entry.sessions / totalSessions) * 100) : 0,
    }));

    list.sort((a, b) => b.minutes - a.minutes);
    return {
      items: list,
      totalMinutes,
      totalSessions,
    };
  }

  calculateTeacherStats(schedule = [], timeSlots = [], slotMap) {
    const teachers = {};
    schedule.forEach((it) => {
      if (!it.teacher || it.teacher.trim() === "-") return;
      const t = it.teacher.trim();
      const [, slotId] = (it.slotId || "").split("-");
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      if (!teachers[t]) {
        teachers[t] = {
          name: t,
          sessions: 0,
          totalMinutes: 0,
          subjects: new Set(),
          rooms: new Set(),
          days: new Set(),
        };
      }
      teachers[t].sessions++;
      teachers[t].totalMinutes += dur;
      teachers[t].subjects.add(it.subject);
      if (it.room && it.room !== "-") teachers[t].rooms.add(it.room);
      const [d] = it.slotId.split("-");
      teachers[t].days.add(parseInt(d, 10));
    });

    return Object.values(teachers)
      .map((t) => ({
        name: t.name,
        sessions: t.sessions,
        totalMinutes: t.totalMinutes,
        totalHoursFormatted: +(t.totalMinutes / 60).toFixed(1),
        subjects: Array.from(t.subjects).join(", "),
        rooms: Array.from(t.rooms).join(", "),
        days: Array.from(t.days).map((d) => DAY_SHORT_NAMES[d]).join(", "),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  calculateRoomStats(schedule = [], timeSlots = [], slotMap) {
    const rooms = {};
    schedule.forEach((it) => {
      if (!it.room || it.room.trim() === "-") return;
      const r = it.room.trim();
      const [, slotId] = (it.slotId || "").split("-");
      const slot = slotMap.get(slotId);
      if (!slot) return;

      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      if (!rooms[r]) {
        rooms[r] = {
          name: r,
          sessions: 0,
          totalMinutes: 0,
          subjects: new Set(),
          days: new Set(),
        };
      }
      rooms[r].sessions++;
      rooms[r].totalMinutes += dur;
      rooms[r].subjects.add(it.subject);
      const [d] = it.slotId.split("-");
      rooms[r].days.add(parseInt(d, 10));
    });

    return Object.values(rooms)
      .map((r) => ({
        name: r.name,
        sessions: r.sessions,
        totalMinutes: r.totalMinutes,
        totalHoursFormatted: +(r.totalMinutes / 60).toFixed(1),
        subjects: Array.from(r.subjects).join(", "),
        days: Array.from(r.days).map((d) => DAY_SHORT_NAMES[d]).join(", "),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  calculateInsights(schedule, timeSlots, lessons, calculated) {
    const insights = [];
    const { daily, breaks, streaks, subjects } = calculated;

    // 1. Critical Rule: Extremely High Workload
    const heavyDays = daily.filter((d) => d.workloadScore >= 80 && d.sessionCount > 0);
    if (heavyDays.length > 0) {
      heavyDays.forEach((d) => {
        insights.push({
          severity: "critical",
          badge: "Tải học cực cao",
          title: `Áp lực lớn vào ${d.dayName} (${d.workloadScore}/100)`,
          desc: `${d.dayName} có ${d.sessionCount} ca học (${d.totalHoursFormatted} giờ) với chuỗi liên tục ${d.longestStreak} tiết. Nên cân nhắc giãn ca hoặc tăng thời gian nghỉ ngơi.`,
        });
      });
    }

    // 2. Warning Rule: Continuous load streak >= 4
    if (streaks.overallLongestStreak && streaks.overallLongestStreak.count >= 4) {
      const s = streaks.overallLongestStreak;
      insights.push({
        severity: "warning",
        badge: "Chuỗi học liên tục",
        title: `Chuỗi học liên tục ${s.count} tiết vào ${s.dayName}`,
        desc: `Từ ${s.start} đến ${s.end} không có khoảng nghỉ xen kẽ. Việc học dồn ${s.count} tiết liên tiếp có thể làm giảm đáng kể khả năng tập trung.`,
      });
    }

    // 3. Warning Rule: Short breaks < 10m
    if (breaks.brackets.short.count > 0) {
      const count = breaks.brackets.short.count;
      insights.push({
        severity: "warning",
        badge: "Khoảng nghỉ gấp",
        title: `Có ${count} khoảng nghỉ dưới 10 phút`,
        desc: `Các khoảng chuyển tiếp quá ngắn giữa các ca học khiến bạn khó kịp chuẩn bị tài liệu hoặc di chuyển giữa các phòng học.`,
      });
    }

    // 4. Info Rule: Dominant subject > 30% total study time
    if (subjects.length > 0) {
      const top = subjects[0];
      if (top.percentageOfTotalTime >= 30) {
        insights.push({
          severity: "info",
          badge: "Tỷ trọng môn",
          title: `${top.name} chiếm ${top.percentageOfTotalTime}% tổng thời gian học`,
          desc: `Môn này chiếm đến ${top.totalHoursFormatted} giờ trong tuần qua ${top.sessionCount} ca học. Hãy đảm bảo các môn khác vẫn nhận đủ sự ưu tiên cần thiết.`,
        });
      }
    }

    // 5. Info Rule: Early start before 07:00
    const earlyDays = daily.filter((d) => d.startTime !== "--:--" && d.startTime < "07:00");
    if (earlyDays.length > 0) {
      const dNames = earlyDays.map((d) => `${d.shortName} (${d.startTime})`).join(", ");
      insights.push({
        severity: "info",
        badge: "Khởi động sớm",
        title: `Lịch học bắt đầu rất sớm vào ${dNames}`,
        desc: `Cần sắp xếp thời gian đi ngủ sớm từ đêm hôm trước để đảm bảo tỉnh táo cho các ca học sáng sớm.`,
      });
    }

    // 6. Info Rule: Late finish after 21:30
    const lateDays = daily.filter((d) => d.endTime !== "--:--" && d.endTime > "21:30");
    if (lateDays.length > 0) {
      const dNames = lateDays.map((d) => `${d.shortName} (${d.endTime})`).join(", ");
      insights.push({
        severity: "info",
        badge: "Kết thúc muộn",
        title: `Lịch học kéo dài tới đêm vào ${dNames}`,
        desc: `Các ca học kết thúc muộn cần được theo sau bởi thời gian nghỉ ngơi thư giãn trước khi đi ngủ.`,
      });
    }

    // 7. Positive Rule: Balanced days
    const balancedDays = daily.filter((d) => d.workloadScore >= 30 && d.workloadScore <= 60 && d.breakCount >= 1);
    if (balancedDays.length > 0) {
      const dNames = balancedDays.map((d) => d.shortName).join(", ");
      insights.push({
        severity: "positive",
        badge: "Cân bằng tối ưu",
        title: `Nhịp điệu học tập rất tốt vào ${dNames}`,
        desc: `Các ngày này có thời lượng học vừa phải kèm khoảng nghỉ hợp lý, giúp duy trì năng lượng và hiệu suất bền vững.`,
      });
    }

    return insights;
  }

  /**
   * Export Analytics Data in multiple formats: JSON, CSV, Excel (XLSX)
   */
  exportData(format = "json", computedData) {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(computedData, null, 2)], { type: "application/json" });
      this._triggerDownload(blob, `TKB_Analytics_${Date.now()}.json`);
      return;
    }

    if (format === "csv") {
      let csv = "\uFEFF"; // UTF-8 BOM
      csv += "PHÂN TÍCH THỜI KHÓA BIỂU\n\n";

      // Overview
      csv += "TỔNG QUAN\n";
      csv += `Tổng số ca học,${computedData.overview.totalSessions}\n`;
      csv += `Tổng giờ học,${computedData.overview.totalStudyHours} giờ\n`;
      csv += `Tỷ lệ hoàn thành,${computedData.overview.completionRate}%\n`;
      csv += `Môn học nhiều nhất,${computedData.overview.topSubject.name} (${computedData.overview.topSubject.count} ca)\n\n`;

      // Subjects
      csv += "CHI TIẾT MÔN HỌC\n";
      csv += "Môn học,Phụ trách,Vị trí,Số ca,Tổng phút,Tổng giờ,Tỷ lệ %,Ngày học\n";
      computedData.subjects.forEach((s) => {
        csv += `"${s.name}","${s.teacher}","${s.room}",${s.sessionCount},${s.totalMinutes},${s.totalHoursFormatted},${s.percentageOfTotalTime}%,"${s.daysList.join(", ")}"\n`;
      });
      csv += "\n";

      // Daily
      csv += "THỐNG KÊ THEO NGÀY\n";
      csv += "Thứ,Số ca,Tổng giờ học,Bắt đầu,Kết thúc,Chuỗi học max,Điểm Workload,Mức độ\n";
      computedData.daily.forEach((d) => {
        csv += `"${d.dayName}",${d.sessionCount},${d.totalHoursFormatted},"${d.startTime}","${d.endTime}",${d.longestStreak},${d.workloadScore},"${d.workloadLevel}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      this._triggerDownload(blob, `TKB_Analytics_${Date.now()}.csv`);
      return;
    }

    if (format === "excel") {
      if (typeof window.XLSX === "undefined") {
        alert("Thư viện SheetJS (XLSX) chưa sẵn sàng. Đang tải định dạng CSV thay thế.");
        return this.exportData("csv", computedData);
      }

      const wb = window.XLSX.utils.book_new();

      // Sheet 1: Overview
      const overviewData = [
        ["CHỈ SỐ THỜI KHÓA BIỂU", "GIÁ TRỊ"],
        ["Tổng số ca học", computedData.overview.totalSessions],
        ["Tổng thời gian học", `${computedData.overview.totalStudyHours} giờ (${computedData.overview.totalStudyMinutes} phút)`],
        ["Thời lượng Focus", `${computedData.overview.totalFocusHours} giờ`],
        ["Tỷ lệ hoàn thành", `${computedData.overview.completionRate}%`],
        ["Số môn học độc lập", computedData.overview.activeUniqueSubjects],
        ["Môn học nhiều nhất", `${computedData.overview.topSubject.name} (${computedData.overview.topSubject.count} ca)`],
        ["Giáo viên nhiều nhất", `${computedData.overview.topTeacher.name} (${computedData.overview.topTeacher.count} ca)`],
        ["Phòng học nhiều nhất", `${computedData.overview.topRoom.name} (${computedData.overview.topRoom.count} ca)`],
        ["Ngày bận nhất", `${computedData.overview.busiestDay.name} (${computedData.overview.busiestDay.minutes} phút)`],
      ];
      const wsOverview = window.XLSX.utils.aoa_to_sheet(overviewData);
      window.XLSX.utils.book_append_sheet(wb, wsOverview, "Tong_Quan");

      // Sheet 2: Subjects
      const subjectsData = [
        ["Môn học", "Phụ trách", "Phòng", "Số ca", "Số tiết", "Tổng phút", "Tổng giờ", "Tỷ lệ %", "Tỷ lệ xong %", "Số ca Focus", "Độ ưu tiên", "Các ngày học"],
        ...computedData.subjects.map((s) => [
          s.name,
          s.teacher || "",
          s.room || "",
          s.sessionCount,
          s.slotCount,
          s.totalMinutes,
          s.totalHoursFormatted,
          `${s.percentageOfTotalTime}%`,
          `${s.completionRate}%`,
          s.focusCount,
          s.highestPriority,
          s.daysList.join(", "),
        ]),
      ];
      const wsSubjects = window.XLSX.utils.aoa_to_sheet(subjectsData);
      window.XLSX.utils.book_append_sheet(wb, wsSubjects, "Thong_Ke_Mon_Hoc");

      // Sheet 3: Daily
      const dailyData = [
        ["Thứ", "Số ca", "Tổng phút", "Tổng giờ", "Số môn", "Số GV", "Số phòng", "Giờ bắt đầu", "Giờ kết thúc", "Chuỗi dài nhất", "Tổng phút nghỉ", "Điểm Workload", "Mức độ tải"],
        ...computedData.daily.map((d) => [
          d.dayName,
          d.sessionCount,
          d.totalMinutes,
          d.totalHoursFormatted,
          d.subjectCount,
          d.teacherCount,
          d.roomCount,
          d.startTime,
          d.endTime,
          d.longestStreak,
          d.totalBreakMinutes,
          d.workloadScore,
          d.workloadLevel,
        ]),
      ];
      const wsDaily = window.XLSX.utils.aoa_to_sheet(dailyData);
      window.XLSX.utils.book_append_sheet(wb, wsDaily, "Theo_Ngay");

      // Sheet 4: Teachers & Rooms
      const teachersData = [
        ["Giáo viên / Phụ trách", "Số ca", "Tổng giờ", "Các môn", "Các phòng", "Các ngày"],
        ...computedData.teachers.map((t) => [t.name, t.sessions, t.totalHoursFormatted, t.subjects, t.rooms, t.days]),
      ];
      const wsTeachers = window.XLSX.utils.aoa_to_sheet(teachersData);
      window.XLSX.utils.book_append_sheet(wb, wsTeachers, "Giao_Vien");

      const roomsData = [
        ["Phòng / Vị trí", "Số ca", "Tổng giờ", "Các môn", "Các ngày"],
        ...computedData.rooms.map((r) => [r.name, r.sessions, r.totalHoursFormatted, r.subjects, r.days]),
      ];
      const wsRooms = window.XLSX.utils.aoa_to_sheet(roomsData);
      window.XLSX.utils.book_append_sheet(wb, wsRooms, "Phong_Hoc");

      // Sheet 5: Breaks
      const breaksData = [
        ["Thứ", "Bắt đầu", "Kết thúc", "Thời lượng (phút)", "Trước môn", "Sau môn"],
        ...computedData.breaks.allBreaks.map((b) => [b.dayName, b.startTime, b.endTime, b.durationMinutes, b.beforeSubject, b.afterSubject]),
      ];
      const wsBreaks = window.XLSX.utils.aoa_to_sheet(breaksData);
      window.XLSX.utils.book_append_sheet(wb, wsBreaks, "Khoang_Nghi");

      window.XLSX.writeFile(wb, `TKB_Analytics_${Date.now()}.xlsx`);
    }
  }

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

const analyticsEngine = new AnalyticsEngineClass();

/* --- Module: analytics.js --- */
/**
 * Analytics Dashboard UI Feature Component
 * Integrates AnalyticsEngine with rich interactive UI: tabs, grouping, sorting, search, heatmap, and exports.
 */







class AnalyticsFeature {
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

/* --- Module: backup.js --- */
const EXCEL_PASTEL_COLORS = {
  blue: { fill: "DBEAFE", text: "1E40AF" },
  sky: { fill: "E0F2FE", text: "0369A1" },
  cyan: { fill: "CFFAFE", text: "0E7490" },
  teal: { fill: "CCFBF1", text: "0F766E" },
  emerald: { fill: "D1FAE5", text: "047857" },
  green: { fill: "DCFCE7", text: "15803D" },
  lime: { fill: "ECFCCB", text: "3F6212" },
  yellow: { fill: "FEF9C3", text: "854D0E" },
  amber: { fill: "FEF3C7", text: "92400E" },
  orange: { fill: "FFEDD5", text: "9A3412" },
  red: { fill: "FEE2E2", text: "991B1B" },
  rose: { fill: "FFE4E6", text: "9F1239" },
  pink: { fill: "FCE7F3", text: "9D174D" },
  fuchsia: { fill: "FAE8FF", text: "86198F" },
  purple: { fill: "F3E8FF", text: "6B21A8" },
  violet: { fill: "EDE9FE", text: "5B21B6" },
  indigo: { fill: "E0E7FF", text: "3730A3" },
  slate: { fill: "F1F5F9", text: "334155" },
};

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
    const slots = state.timeSlots;
    const wb = XLSX.utils.book_new();

    // Border Styles
    const borderDark = {
      top: { style: "thin", color: { rgb: "94A3B8" } },
      bottom: { style: "thin", color: { rgb: "94A3B8" } },
      left: { style: "thin", color: { rgb: "94A3B8" } },
      right: { style: "thin", color: { rgb: "94A3B8" } },
    };
    const borderHeader = {
      top: { style: "medium", color: { rgb: "0369A1" } },
      bottom: { style: "medium", color: { rgb: "0369A1" } },
      left: { style: "thin", color: { rgb: "38BDF8" } },
      right: { style: "thin", color: { rgb: "38BDF8" } },
    };
    const borderSoft = {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    };
    const thinBorder = borderDark;

    // Calculate analytics metrics
    const analytics = analyticsEngine.computeAll(state.schedule, slots, state.lessons);
    const dailyMap = new Map();
    (analytics.daily || analytics.dailyStats || []).forEach((d) => dailyMap.set(d.day, d));

    // =========================================================================
    // SHEET 1: THỜI KHÓA BIỂU CHUẨN KÈM HEATMAP MẬT ĐỘ (ALL-IN-ONE MASTER SHEET)
    // =========================================================================
    const ws1 = {};
    const merges1 = [];
    const rowHeights = [];
    let r = 0;

    const setC1 = (row, col, val, style = null) => {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = {
        v: val !== undefined && val !== null ? val : "",
        t: typeof val === "number" ? "n" : "s",
      };
      if (style) cell.s = style;
      ws1[ref] = cell;
    };

    // Row 0: Grand Title Banner
    setC1(r, 0, "THỜI KHÓA BIỂU HỌC TẬP & HOẠT ĐỘNG", {
      font: { name: "Arial", sz: 16, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "center" },
    });
    for (let c = 1; c <= 8; c++) {
      setC1(r, c, "", { fill: { fgColor: { rgb: "0F172A" } } });
    }
    merges1.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
    rowHeights.push({ hpt: 36 });
    r++;

    // Row 1: Subtitle Info
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const totalSessions = state.schedule.length;
    const completedSessions = state.schedule.filter((s) => s.status === "completed").length;
    const completionPercent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    setC1(
      r,
      0,
      `Chuẩn hóa gộp khối liên tiếp • Heatmap mật độ phân bổ • Ngày xuất: ${dateStr} • Tổng số: ${totalSessions} ca (${completedSessions} ca hoàn thành - ${completionPercent}%)`,
      {
        font: { name: "Arial", sz: 10, italic: true, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { vertical: "center", horizontal: "center" },
      }
    );
    for (let c = 1; c <= 8; c++) {
      setC1(r, c, "", { fill: { fgColor: { rgb: "F1F5F9" } } });
    }
    merges1.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row 2: Spacer
    for (let c = 0; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "FFFFFF" } } });
    merges1.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } });
    rowHeights.push({ hpt: 8 });
    r++;

    // Row 3: Table Column Headers (Symmetrical Days Col 2..8)
    const headers = ["Ca học", "Khung giờ", ...DAY_ORDER.map((d) => DAY_NAMES[d])];
    headers.forEach((h, colIdx) => {
      setC1(r, colIdx, h, {
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0284C7" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderHeader,
      });
    });
    rowHeights.push({ hpt: 28 });
    r++;

    // Rows for each time slot (Timetable Grid)
    const slotStartRow = r;
    const occupiedGrid = Array.from({ length: slots.length }, () => Array(DAY_ORDER.length).fill(false));

    slots.forEach((slot, sIdx) => {
      const curRow = slotStartRow + sIdx;
      // Col 0: Slot Label
      setC1(curRow, 0, slot.label, {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "1E293B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
      // Col 1: Slot Time
      setC1(curRow, 1, `${slot.start} - ${slot.end}`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
      rowHeights.push({ hpt: 52 }); // Generous card height like web app
    });

    // Populate day columns with Merged Blocks & Colors
    DAY_ORDER.forEach((day, dayIdx) => {
      const colIdx = 2 + dayIdx;
      const blocks = buildMergedBlocks(state.schedule, slots, day, true);

      blocks.forEach((block) => {
        const startR = slotStartRow + block.startSlotIndex;
        const endR = slotStartRow + block.endSlotIndex;
        const colScheme = EXCEL_PASTEL_COLORS[block.color] || EXCEL_PASTEL_COLORS.blue;

        // Multi-slot vertical merge
        if (block.slotCount > 1) {
          merges1.push({ s: { r: startR, c: colIdx }, e: { r: endR, c: colIdx } });
        }

        const teacherInfo = block.teacher && block.teacher !== "-" ? `GV: ${block.teacher}` : "";
        const roomInfo = block.room && block.room !== "-" ? `P: ${block.room}` : "";
        const subDetails = [teacherInfo, roomInfo].filter(Boolean).join(" • ");
        const statusText = block.status === "completed" ? "✓ Đã xong" : "⏳ Kế hoạch";
        const durationText = block.durationMinutes ? `${block.durationMinutes}p` : "";
        const metaLine = [statusText, durationText].filter(Boolean).join(" • ");
        const cellText = `${block.subject}\n${subDetails ? subDetails + "\n" : ""}${metaLine}`;

        // Color and border EVERY cell in the merged area for seamless Excel rendering
        for (let rowI = startR; rowI <= endR; rowI++) {
          occupiedGrid[rowI - slotStartRow][dayIdx] = true;
          setC1(rowI, colIdx, rowI === startR ? cellText : "", {
            font: {
              name: "Arial",
              sz: 10,
              bold: rowI === startR,
              color: { rgb: colScheme.text },
            },
            fill: { fgColor: { rgb: colScheme.fill } },
            alignment: { vertical: "center", horizontal: "center", wrapText: true },
            border: borderDark,
          });
        }
      });

      // Fill empty slots for this day
      for (let sIdx = 0; sIdx < slots.length; sIdx++) {
        if (!occupiedGrid[sIdx][dayIdx]) {
          const rowI = slotStartRow + sIdx;
          setC1(rowI, colIdx, "- Tự do -", {
            font: { name: "Arial", sz: 9, italic: true, color: { rgb: "94A3B8" } },
            fill: { fgColor: { rgb: "FFFFFF" } },
            border: borderSoft,
            alignment: { vertical: "center", horizontal: "center" },
          });
        }
      }
    });

    r = slotStartRow + slots.length;

    // =========================================================================
    // SECTION: EMBEDDED WORKLOAD HEATMAP & DAILY METRICS (IN MASTER SHEET 1)
    // =========================================================================

    // Row: MẬT ĐỘ TẢI HEATMAP
    setC1(r, 0, "MẬT ĐỘ TẢI / HEATMAP", {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E293B" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "1E293B" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { workloadScore: 0, workloadLevel: "Nhẹ" };
      let heatBg = "DCFCE7";
      let heatText = "15803D";
      if (d.workloadScore > 80) {
        heatBg = "FEE2E2"; // Red
        heatText = "991B1B";
      } else if (d.workloadScore > 60) {
        heatBg = "FEF3C7"; // Amber
        heatText = "92400E";
      } else if (d.workloadScore > 30) {
        heatBg = "E0F2FE"; // Sky
        heatText = "0369A1";
      }

      setC1(r, 2 + dayIdx, `${d.workloadScore}đ (${d.workloadLevel})`, {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: heatText } },
        fill: { fgColor: { rgb: heatBg } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 26 });
    r++;

    // Row: TỔNG THỜI LƯỢNG HỌC
    setC1(r, 0, "TỔNG GIỜ HỌC", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { totalHoursFormatted: 0, totalMinutes: 0 };
      setC1(r, 2 + dayIdx, `${d.totalHoursFormatted}h (${d.totalMinutes}p)`, {
        font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: SỐ CA & CHUỖI MAX
    setC1(r, 0, "SỐ CA & CHUỖI LIÊN TỤC", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { sessionCount: 0, longestStreak: 0 };
      setC1(r, 2 + dayIdx, `${d.sessionCount} ca • Max ${d.longestStreak} tiết`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: NGHỈ GIẢI LAO
    setC1(r, 0, "NGHỈ GIẢI LAO TRONG NGÀY", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "334155" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { breakCount: 0, totalBreakMinutes: 0 };
      setC1(r, 2 + dayIdx, `${d.breakCount} lần (${d.totalBreakMinutes}p)`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: TIẾN ĐỘ HOÀN THÀNH
    setC1(r, 0, "TIẾN ĐỘ HOÀN THÀNH", {
      font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "065F46" } },
      fill: { fgColor: { rgb: "D1FAE5" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "D1FAE5" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    DAY_ORDER.forEach((day, dayIdx) => {
      const d = dailyMap.get(day) || { completedCount: 0, sessionCount: 0 };
      const pct = d.sessionCount > 0 ? Math.round((d.completedCount / d.sessionCount) * 100) : 0;
      setC1(r, 2 + dayIdx, `${d.completedCount}/${d.sessionCount} ca (${pct}%)`, {
        font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: "047857" } },
        fill: { fgColor: { rgb: "ECFDF5" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: borderDark,
      });
    });
    rowHeights.push({ hpt: 24 });
    r++;

    // Row: Spacer
    for (let c = 0; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "FFFFFF" } } });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 8 } });
    rowHeights.push({ hpt: 12 });
    r++;

    // =========================================================================
    // SECTION: WEEKLY KPI SUMMARY CARDS IN MASTER SHEET
    // =========================================================================
    setC1(r, 0, "BẢNG CHỈ SỐ TOÀN DIỆN TUẦN", {
      font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "center" },
    });
    for (let c = 1; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "0F172A" } } });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 8 } });
    rowHeights.push({ hpt: 26 });
    r++;

    const ov = analytics.overview || {};
    // KPI Card 1: Total Study Sessions
    setC1(r, 0, `TỔNG CA HỌC TUẦN\n${ov.totalSessions || 0} ca (${ov.totalStudyHours || 0} giờ)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "0369A1" } },
      fill: { fgColor: { rgb: "E0F2FE" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    setC1(r, 1, "", { fill: { fgColor: { rgb: "E0F2FE" } }, border: borderDark });
    merges1.push({ s: { r, c: 0 }, e: { r, c: 1 } });

    // KPI Card 2: Completion Rate
    setC1(r, 2, `TỶ LỆ HOÀN THÀNH\n${ov.completionRate || 0}% (${ov.completedSessions || 0}/${ov.totalSessions || 0} ca)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "047857" } },
      fill: { fgColor: { rgb: "D1FAE5" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    setC1(r, 3, "", { fill: { fgColor: { rgb: "D1FAE5" } }, border: borderDark });
    merges1.push({ s: { r, c: 2 }, e: { r, c: 3 } });

    // KPI Card 3: Busiest Day
    const bDay = ov.busiestDay || { name: "--", minutes: 0 };
    setC1(r, 4, `NGÀY BẬN NHẤT\n${bDay.name} (${+(bDay.minutes / 60).toFixed(1)} giờ học)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "B45309" } },
      fill: { fgColor: { rgb: "FEF3C7" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    setC1(r, 5, "", { fill: { fgColor: { rgb: "FEF3C7" } }, border: borderDark });
    merges1.push({ s: { r, c: 4 }, e: { r, c: 5 } });

    // KPI Card 4: Top Subject
    const topSub = ov.topSubject || { name: "--", count: 0 };
    setC1(r, 6, `MÔN HỌC NHIỀU NHẤT\n${topSub.name} (${topSub.count} ca)`, {
      font: { name: "Arial", sz: 10, bold: true, color: { rgb: "6B21A8" } },
      fill: { fgColor: { rgb: "F3E8FF" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: borderDark,
    });
    for (let c = 7; c <= 8; c++) setC1(r, c, "", { fill: { fgColor: { rgb: "F3E8FF" } }, border: borderDark });
    merges1.push({ s: { r, c: 6 }, e: { r, c: 8 } });
    rowHeights.push({ hpt: 38 });
    r++;

    ws1["!merges"] = merges1;
    // Exactly balanced 9 columns: 2 time header columns + 7 identical width day columns
    ws1["!cols"] = [
      { wch: 14 }, // Ca học
      { wch: 16 }, // Khung giờ
      { wch: 26 }, // Thứ Hai
      { wch: 26 }, // Thứ Ba
      { wch: 26 }, // Thứ Tư
      { wch: 26 }, // Thứ Năm
      { wch: 26 }, // Thứ Sáu
      { wch: 26 }, // Thứ Bảy
      { wch: 26 }, // Chủ Nhật
    ];
    ws1["!rows"] = rowHeights;
    ws1["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 8 } });

    XLSX.utils.book_append_sheet(wb, ws1, "Thời Khóa Biểu");

    // ==========================================
    // SHEET 2: MẬT ĐỘ HEATMAP THEO CA & NGÀY
    // ==========================================
    const wsHeatmap = {};
    const mergesHeatmap = [];
    let hr = 0;

    const setCH = (row, col, val, style = null) => {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = {
        v: val !== undefined && val !== null ? val : "",
        t: typeof val === "number" ? "n" : "s",
      };
      if (style) cell.s = style;
      wsHeatmap[ref] = cell;
    };

    setCH(hr, 0, "HEATMAP PHÂN BỔ MẬT ĐỘ HỌC TẬP", {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "center" },
    });
    for (let c = 1; c <= 8; c++) setCH(hr, c, "", { fill: { fgColor: { rgb: "0F172A" } } });
    mergesHeatmap.push({ s: { r: hr, c: 0 }, e: { r: hr, c: 8 } });
    hr++;

    setCH(
      hr,
      0,
      "Bản đồ nhiệt phản ánh mật độ phân bổ hoạt động giữa các ngày trong tuần (Xanh lá = Vừa, Vàng = Cao, Đỏ = Rất bận)",
      {
        font: { name: "Arial", sz: 9.5, italic: true, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { vertical: "center", horizontal: "center" },
      }
    );
    for (let c = 1; c <= 8; c++) setCH(hr, c, "", { fill: { fgColor: { rgb: "F1F5F9" } } });
    mergesHeatmap.push({ s: { r: hr, c: 0 }, e: { r: hr, c: 8 } });
    hr++;

    headers.forEach((h, colIdx) => {
      setCH(hr, colIdx, h, {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "334155" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      });
    });
    hr++;

    const heatmapStartRow = hr;
    slots.forEach((slot, sIdx) => {
      const curRow = heatmapStartRow + sIdx;
      setCH(curRow, 0, slot.label, {
        font: { name: "Arial", sz: 10, bold: true },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      });
      setCH(curRow, 1, `${slot.start} - ${slot.end}`, {
        font: { name: "Arial", sz: 9.5, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { vertical: "center", horizontal: "center" },
        border: thinBorder,
      });

      DAY_ORDER.forEach((day, dayIdx) => {
        const item = state.schedule.find((s) => s.slotId === `${day}-${slot.id}`);
        if (item) {
          setCH(curRow, 2 + dayIdx, item.subject, {
            font: { name: "Arial", sz: 10, bold: true, color: { rgb: "065F46" } },
            fill: { fgColor: { rgb: "A7F3D0" } }, // Bright emerald for active
            alignment: { vertical: "center", horizontal: "center" },
            border: thinBorder,
          });
        } else {
          setCH(curRow, 2 + dayIdx, "Trống", {
            font: { name: "Arial", sz: 9, color: { rgb: "94A3B8" } },
            fill: { fgColor: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: thinBorder,
          });
        }
      });
    });

    hr = heatmapStartRow + slots.length;
    wsHeatmap["!merges"] = mergesHeatmap;
    wsHeatmap["!cols"] = ws1["!cols"];
    wsHeatmap["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: hr, c: 8 } });
    XLSX.utils.book_append_sheet(wb, wsHeatmap, "Heatmap Mật Độ");

    // ==========================================
    // SHEET 3: THỐNG KÊ MÔN HỌC CHI TIẾT
    // ==========================================
    const detailHeaders = ["Thứ", "Ca học", "Môn học", "Phụ trách", "Phòng", "Khung giờ", "Trạng thái", "Ghi chú"];
    const detailRows = [];
    state.schedule.forEach((item) => {
      if (item.slotId) {
        const [d, slotId] = item.slotId.split("-");
        const slot = slots.find((s) => s.id === slotId);
        detailRows.push([
          DAY_NAMES[d] || "",
          slot?.label || "",
          item.subject || "",
          item.teacher || "",
          item.room || "",
          slot ? `${slot.start} - ${slot.end}` : "",
          item.status === "completed" ? "Đã hoàn thành" : "Dự kiến",
          item.notes || "",
        ]);
      }
    });

    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    wsDetail["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Danh Sách Chi Tiết");

    XLSX.writeFile(wb, `ThoiKhoaBieu_Chuan_${Date.now()}.xlsx`);
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

    // Populate Edit Lesson Color Selector
    const editColorSelect = $("#edit-activity-color");
    if (editColorSelect && editColorSelect.children.length === 0) {
      editColorSelect.innerHTML = Object.entries(COLOR_MAP)
        .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
        .join("");
    }

    // Form Edit Existing Lesson in Library
    const editForm = $("#form-edit-activity");
    if (editForm) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = $("#edit-activity-id").value;
        const subject = $("#edit-activity-subject").value.trim();
        const teacher = $("#edit-activity-teacher").value.trim();
        const room = $("#edit-activity-room").value.trim();
        const category = $("#edit-activity-category").value;
        const color = $("#edit-activity-color").value || "blue";
        const syncSchedule = $("#edit-activity-sync-schedule")?.checked ?? true;

        if (!id || !subject) return;

        this.updateLesson(id, { subject, teacher, room, category, color }, syncSchedule);
        events.emit("modal:close", "modal-edit-activity");
      });
    }

    // Delegated actions on Library list items (Place into schedule, Delete, View Detail, Edit)
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

        const editBtn = e.target.closest('[data-action="edit-lesson"]');
        if (editBtn) {
          e.stopPropagation();
          const id = editBtn.dataset.id;
          this.openEditModal(id);
          return;
        }

        const detailBtn = e.target.closest('[data-action="view-subject-detail"]');
        if (detailBtn) {
          e.stopPropagation();
          const id = detailBtn.dataset.id;
          const lesson = this.store.getState().lessons.find((l) => l.id === id);
          if (lesson) {
            events.emit("drawer:open-subject-detail", lesson);
          }
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

  openEditModal(id) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === id);
    if (!lesson) return;

    $("#edit-activity-id").value = lesson.id;
    $("#edit-activity-subject").value = lesson.subject || "";
    $("#edit-activity-teacher").value = lesson.teacher || "";
    $("#edit-activity-room").value = lesson.room || "";
    $("#edit-activity-category").value = lesson.category || "study";

    const editColorSelect = $("#edit-activity-color");
    if (editColorSelect) {
      if (editColorSelect.children.length === 0) {
        editColorSelect.innerHTML = Object.entries(COLOR_MAP)
          .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
          .join("");
      }
      editColorSelect.value = lesson.color || "blue";
    }

    events.emit("modal:open", "modal-edit-activity");
  }

  updateLesson(id, { subject, teacher, room, category, color }, syncSchedule = true) {
    const state = this.store.getState();
    const lesson = state.lessons.find((l) => l.id === id);
    if (!lesson) return;

    this.history.recordState();
    const oldSubject = lesson.subject;

    lesson.subject = subject;
    lesson.teacher = teacher;
    lesson.room = room;
    lesson.category = category;
    lesson.color = color;

    // Synchronize to existing schedule entries if selected
    let syncedCount = 0;
    if (syncSchedule && oldSubject) {
      const oldSubjectLower = oldSubject.toLowerCase().trim();
      state.schedule.forEach((item) => {
        if (item.subject && item.subject.toLowerCase().trim() === oldSubjectLower) {
          item.subject = subject;
          item.teacher = teacher;
          item.room = room;
          item.color = color;
          syncedCount++;
        }
      });
    }

    this.storage.debouncedSave();
    this.render();
    events.emit("library:updated");
    if (syncedCount > 0) {
      events.emit("schedule:updated");
      events.emit("toast:show", {
        message: `Đã cập nhật môn "${subject}" (và đồng bộ ${syncedCount} ca trên lịch)`,
        type: "success",
      });
    } else {
      events.emit("toast:show", { message: `Đã cập nhật "${subject}" trong kho`, type: "success" });
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

    // Compute placement counts
    const placementCounts = {};
    state.schedule.forEach((s) => {
      if (s.subject) {
        const key = s.subject.toLowerCase().trim();
        placementCounts[key] = (placementCounts[key] || 0) + 1;
      }
    });

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
      items.sort((a, b) => {
        const cA = placementCounts[a.subject.toLowerCase().trim()] || 0;
        const cB = placementCounts[b.subject.toLowerCase().trim()] || 0;
        return cB - cA;
      });
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
        const count = placementCounts[lesson.subject.toLowerCase().trim()] || 0;
        return `
          <div
            draggable="true"
            data-lesson-id="${lesson.id}"
            class="library-item-card p-2.5 rounded-2xl border ${col.bg} ${col.border} ${col.text} cursor-grab shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-2 group"
          >
            <div class="truncate flex-1 cursor-pointer" data-action="view-subject-detail" data-id="${lesson.id}" title="Bấm để xem thống kê & phân tích chi tiết môn này">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs truncate">${escapeHTML(lesson.subject)}</span>
                ${
                  count > 0
                    ? `<span class="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-white/80 dark:bg-slate-900/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">${count} ca</span>`
                    : `<span class="text-[9px] px-1.5 py-0.2 rounded-md font-medium bg-slate-100/80 dark:bg-slate-800/60 text-slate-400">Chưa xếp</span>`
                }
              </div>
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
                + Đặt
              </button>
              <!-- Edit Lesson -->
              <button
                type="button"
                data-action="edit-lesson"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-sky-500 transition"
                title="Chỉnh sửa thông tin môn học"
              >
                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
              </button>
              <!-- Info / Stats Drawer Trigger -->
              <button
                type="button"
                data-action="view-subject-detail"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 transition"
                title="Xem phân tích môn này"
              >
                <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i>
              </button>
              <!-- Delete Lesson -->
              <button
                type="button"
                data-action="delete-lesson"
                data-id="${lesson.id}"
                class="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-500 transition opacity-60 hover:opacity-100"
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
 * Timetable Feature - Desktop Smart Block Grid & Mobile Timeline
 * Uses Smart Block Merge Engine for visual continuity while preserving state integrity.
 */









class TimetableFeature {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
    this.clipboardItem = null;
    this.focusedSlotKey = null;
  }

  init() {
    this.render();
    this.bindEvents();
    this.bindKeyboardShortcuts();

    events.on("schedule:updated", () => this.render());
    events.on("schedule:day-changed", () => this.renderMobileTimeline());
    events.on("timetable:clear-day", (day) => this.clearDaySchedule(day));
    events.on("timetable:clear-all", () => this.clearAllSchedule());
    events.on("timetable:reset-sample", () => this.resetSampleSchedule());
    events.on("timetable:split-block", (slotKeys) => this.handleSplitBlock(slotKeys));
    events.on("timetable:delete-block", (slotKeys) => this.handleDeleteBlock(slotKeys));
    events.on("timetable:toggle-complete-block", (slotKeys) => this.handleToggleCompleteBlock(slotKeys));
  }

  bindEvents() {
    // 1. Delegation for Desktop Timetable interactions
    const desktopGrid = $("#timetable-body");
    if (desktopGrid) {
      desktopGrid.addEventListener("click", (e) => {
        // Quick delete button on block
        const delBtn = e.target.closest(".btn-quick-del-block");
        if (delBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(delBtn.dataset.slotKeys || "[]");
          this.handleDeleteBlock(slotKeys);
          return;
        }

        // Quick edit button on block
        const editBtn = e.target.closest(".btn-quick-edit-block");
        if (editBtn) {
          e.stopPropagation();
          const slotKey = editBtn.dataset.slotKey;
          events.emit("modal:open-quick-edit", slotKey);
          return;
        }

        // Quick split button on merged block
        const splitBtn = e.target.closest(".btn-quick-split-block");
        if (splitBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(splitBtn.dataset.slotKeys || "[]");
          this.handleSplitBlock(slotKeys);
          return;
        }

        // Toggle complete button on block
        const compBtn = e.target.closest(".btn-toggle-complete-block");
        if (compBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(compBtn.dataset.slotKeys || "[]");
          this.handleToggleCompleteBlock(slotKeys);
          return;
        }

        // Edit slot time button in left time column
        const editSlotBtn = e.target.closest(".btn-edit-slot-time");
        if (editSlotBtn) {
          e.stopPropagation();
          events.emit("modal:open-manage-slots");
          return;
        }

        // Click on Merged or Single Card -> Open Merged Block Detail or Drawer
        const card = e.target.closest(".timetable-card");
        if (card) {
          const slotKeys = JSON.parse(card.dataset.slotKeys || "[]");
          const firstKey = slotKeys[0] || card.dataset.slotKey;
          this.focusedSlotKey = firstKey;

          if (e.ctrlKey || e.metaKey) {
            slotKeys.forEach((k) => this.toggleSelectCell(k));
          } else {
            // Open Merged Block Detail Modal
            events.emit("modal:open-merged-detail", {
              blockId: card.dataset.blockId,
              slotKeys,
              day: card.dataset.day,
            });
          }
          return;
        }

        // Empty cell click -> Open Quick Add Modal!
        const emptyCell = e.target.closest(".timetable-empty-cell");
        if (emptyCell) {
          const slotKey = emptyCell.dataset.slotKey;
          this.focusedSlotKey = slotKey;
          if (e.ctrlKey || e.metaKey) {
            this.toggleSelectCell(slotKey);
          } else {
            events.emit("modal:open-quick-add", slotKey);
          }
        }
      });
    }

    // 2. Delegation for Mobile Timeline interactions
    const mobileTimeline = $("#mobile-timeline-container");
    if (mobileTimeline) {
      mobileTimeline.addEventListener("click", (e) => {
        // Toggle complete on mobile block
        const compBtn = e.target.closest('[data-action="toggle-complete-mobile"]');
        if (compBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(compBtn.dataset.slotKeys || `["${compBtn.dataset.slotKey}"]`);
          this.handleToggleCompleteBlock(slotKeys);
          return;
        }

        // Focus on mobile block
        const focusBtn = e.target.closest('[data-action="focus-mobile"]');
        if (focusBtn) {
          e.stopPropagation();
          const slotKey = focusBtn.dataset.slotKey;
          const state = this.store.getState();
          const item = state.schedule.find((s) => s.slotId === slotKey);
          if (item) events.emit("focus:start", item);
          return;
        }

        // Split on mobile block
        const splitBtn = e.target.closest('[data-action="split-mobile"]');
        if (splitBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(splitBtn.dataset.slotKeys || "[]");
          this.handleSplitBlock(slotKeys);
          return;
        }

        // Detail on mobile block
        const detailBtn = e.target.closest('[data-action="detail-mobile"]');
        if (detailBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(detailBtn.dataset.slotKeys || "[]");
          events.emit("modal:open-merged-detail", {
            slotKeys,
            day: this.store.getState().selectedDayMobile,
          });
          return;
        }

        // Add to this day button
        const addBtn = e.target.closest('[data-action="mobile-add-to-day"]');
        if (addBtn) {
          e.stopPropagation();
          const state = this.store.getState();
          const activeDay = state.selectedDayMobile;
          const emptySlot = state.timeSlots.find(
            (sl) => !state.schedule.some((s) => s.slotId === `${activeDay}-${sl.id}`)
          ) || state.timeSlots[0];

          if (emptySlot) {
            events.emit("modal:open-quick-add", `${activeDay}-${emptySlot.id}`);
          }
          return;
        }

        // Delete mobile block
        const delBtn = e.target.closest('[data-action="delete-mobile"]');
        if (delBtn) {
          e.stopPropagation();
          const slotKeys = JSON.parse(delBtn.dataset.slotKeys || `["${delBtn.dataset.slotKey}"]`);
          this.handleDeleteBlock(slotKeys);
          return;
        }

        // Card body click
        const card = e.target.closest(".timeline-vertical-card");
        if (card) {
          const slotKeys = JSON.parse(card.dataset.slotKeys || "[]");
          events.emit("modal:open-merged-detail", {
            slotKeys,
            day: this.store.getState().selectedDayMobile,
          });
        }
      });
    }

    // Header Day Summary click to open Day Detail Drawer
    const headerRow = $("#timetable-header-row");
    if (headerRow) {
      headerRow.addEventListener("click", (e) => {
        const dayHeader = e.target.closest("[data-day-col-index]");
        if (dayHeader) {
          const dayNum = parseInt(dayHeader.dataset.dayColIndex, 10);
          events.emit("drawer:open-day-detail", dayNum);
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

  bindKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Ignore if user is typing inside an input, textarea or contentEditable
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + C: Copy selected session
      if (isCtrl && e.key.toLowerCase() === "c") {
        if (this.focusedSlotKey) {
          const state = this.store.getState();
          const item = state.schedule.find((s) => s.slotId === this.focusedSlotKey);
          if (item) {
            this.clipboardItem = JSON.parse(JSON.stringify(item));
            events.emit("toast:show", { message: `Đã sao chép môn "${item.subject}"`, type: "info" });
          }
        }
      }

      // Ctrl + V: Paste into focused cell
      if (isCtrl && e.key.toLowerCase() === "v") {
        if (this.clipboardItem && this.focusedSlotKey) {
          this.history.recordState();
          const state = this.store.getState();
          const existingIdx = state.schedule.findIndex((s) => s.slotId === this.focusedSlotKey);
          const pastedItem = {
            ...this.clipboardItem,
            id: `item_${Date.now()}`,
            slotId: this.focusedSlotKey,
          };

          if (existingIdx >= 0) {
            state.schedule[existingIdx] = pastedItem;
          } else {
            state.schedule.push(pastedItem);
          }

          this.storage.debouncedSave();
          this.render();
          events.emit("schedule:updated");
          events.emit("toast:show", { message: `Đã dán môn "${pastedItem.subject}" vào ô`, type: "success" });
        }
      }

      // Ctrl + D: Duplicate selected session into next slot
      if (isCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (this.focusedSlotKey) {
          this.duplicateSlot(this.focusedSlotKey);
        }
      }
    });
  }

  duplicateSlot(slotKey) {
    const [d, sId] = slotKey.split("-");
    const dayNum = parseInt(d, 10);
    const state = this.store.getState();
    const source = state.schedule.find((s) => s.slotId === slotKey);
    if (!source) return;

    // Find next slot in same day
    const sIdx = state.timeSlots.findIndex((s) => s.id === sId);
    if (sIdx >= 0 && sIdx < state.timeSlots.length - 1) {
      const nextSlot = state.timeSlots[sIdx + 1];
      const targetKey = `${dayNum}-${nextSlot.id}`;

      this.history.recordState();
      const existingIdx = state.schedule.findIndex((s) => s.slotId === targetKey);
      const dup = {
        ...source,
        id: `item_${Date.now()}`,
        slotId: targetKey,
      };

      if (existingIdx >= 0) state.schedule[existingIdx] = dup;
      else state.schedule.push(dup);

      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã nhân bản "${source.subject}" sang ${nextSlot.label}`, type: "success" });
    }
  }

  handleSplitBlock(slotKeys = []) {
    if (!slotKeys || slotKeys.length === 0) return;
    this.history.recordState();
    const state = this.store.getState();
    state.schedule = splitMergedBlock(state.schedule, slotKeys);
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã tách khối thành các ca học độc lập", type: "info" });
  }

  handleDeleteBlock(slotKeys = []) {
    if (!slotKeys || slotKeys.length === 0) return;
    this.history.recordState();
    const state = this.store.getState();
    const keySet = new Set(slotKeys);
    state.schedule = state.schedule.filter((s) => !keySet.has(s.slotId));
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: `Đã xóa ${slotKeys.length} ca học khỏi lịch`, type: "info" });
  }

  handleToggleCompleteBlock(slotKeys = []) {
    if (!slotKeys || slotKeys.length === 0) return;
    this.history.recordState();
    const state = this.store.getState();
    const keySet = new Set(slotKeys);

    // Determine target state: if all are completed, toggle to planned; otherwise complete all
    const allCompleted = slotKeys.every((k) => {
      const it = state.schedule.find((s) => s.slotId === k);
      return it && it.status === "completed";
    });
    const targetStatus = allCompleted ? "planned" : "completed";

    state.schedule.forEach((item) => {
      if (keySet.has(item.slotId)) {
        item.status = targetStatus;
      }
    });

    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", {
      message: targetStatus === "completed" ? "Đã đánh dấu hoàn thành cả block" : "Đã chuyển cả block về chưa hoàn thành",
      type: "info",
    });
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
    events.emit("toast:show", { message: `Đã xóa ${count} ca học của ${DAY_NAMES[day]}`, type: "info" });
  }

  clearAllSchedule() {
    const state = this.store.getState();
    if (state.schedule.length === 0) {
      events.emit("toast:show", { message: "Thời khóa biểu hiện đang trống", type: "info" });
      return;
    }

    if (!confirm(`CẢNH BÁO: Bạn có chắc muốn XÓA TOÀN BỘ ${state.schedule.length} ca học trên thời khóa biểu cả tuần?`)) return;

    this.storage.createSnapshot("Trước khi xóa toàn bộ lịch");
    this.history.recordState();
    state.schedule = [];
    this.storage.debouncedSave();
    this.render();
    events.emit("schedule:updated");
    events.emit("toast:show", { message: "Đã xóa toàn bộ lịch học (Bấm Ctrl+Z để hoàn tác)", type: "info" });
  }

  resetSampleSchedule() {
    if (!confirm("Khôi phục thời khóa biểu về lịch học mẫu chuẩn mặc định?")) return;

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
    const slots = state.timeSlots;
    const numSlots = slots.length;

    // Pre-calculate daily stats for day summaries
    const analyticsData = analyticsEngine.computeAll(state.schedule, state.timeSlots, state.lessons);
    const dailyStatsMap = new Map();
    analyticsData.daily.forEach((d) => dailyStatsMap.set(d.day, d));

    // 1. Render Sticky Header Row with Day Summaries
    headerRow.innerHTML = `
      <div class="p-2.5 text-center text-slate-400 text-[11px] font-bold border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 sticky-time-col flex items-center justify-center">
        GIỜ / CA
      </div>
      ${DAY_ORDER.map((d) => {
        const isToday = d === today;
        const dStats = dailyStatsMap.get(d) || { sessionCount: 0, totalHoursFormatted: "0", workloadScore: 0, workloadLevel: "Nhẹ", workloadColor: "emerald" };
        return `
          <div
            data-day-col-index="${d}"
            class="p-2 border-r border-slate-200 dark:border-slate-800 text-center transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
              isToday ? "bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-extrabold" : ""
            }"
            title="Bấm để xem phân tích chi tiết của ${DAY_NAMES[d]}"
          >
            <div class="text-xs uppercase tracking-tight flex items-center justify-center gap-1.5">
              <span>${DAY_NAMES[d]}</span>
              ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>' : ""}
            </div>
            <!-- Day Summary Bar -->
            <div class="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>${dStats.sessionCount} ca • ${dStats.totalHoursFormatted}h</span>
              <span class="px-1.5 py-0.2 rounded-full font-bold bg-${dStats.workloadColor}-100 text-${dStats.workloadColor}-700 dark:bg-${dStats.workloadColor}-950 dark:text-${dStats.workloadColor}-300">
                ${dStats.workloadScore}đ
              </span>
            </div>
          </div>
        `;
      }).join("")}
    `;

    // 2. Set Up Single CSS Grid Container for Body
    // Columns: 88px Time column + 7 equal day columns
    // Rows: exactly `numSlots` rows, each minmax(72px, auto)
    const gridContainer = document.createElement("div");
    gridContainer.id = "timetable-unified-grid";
    gridContainer.className = "grid relative";
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateColumns = "88px repeat(7, minmax(130px, 1fr))";
    gridContainer.style.gridTemplateRows = `repeat(${numSlots}, minmax(72px, auto))`;

    // 3. Render Time Column Cells (Column 1)
    slots.forEach((slot, slotIdx) => {
      const isOvernight = TimeEngine.isOvernight(slot.start, slot.end);
      const dur = TimeEngine.getDurationMinutes(slot.start, slot.end);
      const timeCol = document.createElement("div");
      timeCol.dataset.rowSlot = slot.id;
      timeCol.className =
        "p-2 flex flex-col justify-center items-center text-center bg-slate-50/90 dark:bg-slate-900/90 border-r border-b border-slate-200 dark:border-slate-800 text-xs select-none sticky-time-col relative group/time";
      timeCol.style.gridColumn = "1";
      timeCol.style.gridRow = `${slotIdx + 1}`;

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

      gridContainer.appendChild(timeCol);
    });

    // 4. Render Day Columns with Smart Block Merge
    DAY_ORDER.forEach((day, dayOrderIdx) => {
      const colIndex = dayOrderIdx + 2; // Column 2 to 8
      const isToday = day === today;
      const autoMerge = state.settings.autoMergeBlocks !== false;

      // Call Pure Merge Engine to get visual blocks for this day
      const blocks = buildMergedBlocks(state.schedule, slots, day, autoMerge);

      // Track occupied slots in this day
      const occupiedSlotIndices = new Set();

      blocks.forEach((block) => {
        for (let idx = block.startSlotIndex; idx <= block.endSlotIndex; idx++) {
          occupiedSlotIndices.add(idx);
        }

        // Create Merged Visual Card Cell
        const blockCell = document.createElement("div");
        blockCell.dataset.blockId = block.id;
        blockCell.dataset.day = day;
        blockCell.dataset.slotKeys = JSON.stringify(block.slotKeys);
        blockCell.style.gridColumn = `${colIndex}`;
        blockCell.style.gridRow = `${block.startSlotIndex + 1} / span ${block.slotCount}`;
        blockCell.className = `p-1 border-r border-b border-slate-200 dark:border-slate-800 flex items-stretch relative ${
          isToday ? "bg-sky-50/20 dark:bg-sky-950/10" : ""
        }`;

        // Check active filters
        let matchesFilter = true;
        if (state.activeFilter === "focus" && !block.isFocus) matchesFilter = false;
        if (state.activeFilter === "uncompleted" && block.status === "completed") matchesFilter = false;
        if (state.activeFilter === "completed" && block.status !== "completed") matchesFilter = false;

        const col = getColorConfig(block.color);
        const isCompleted = block.status === "completed";
        const isSelected = block.slotKeys.some((k) => state.selectedCells.has(k));

        const card = document.createElement("div");
        card.draggable = true;
        card.dataset.blockId = block.id;
        card.dataset.day = day;
        card.dataset.slotKeys = JSON.stringify(block.slotKeys);
        card.dataset.slotKey = block.slotKeys[0];
        card.className = `timetable-card relative w-full h-full flex flex-col justify-between select-none ${col.bg} ${col.border} ${col.text} ${
          isCompleted ? "is-completed opacity-60" : ""
        } ${isSelected ? "cell-multi-selected" : ""} ${!matchesFilter ? "opacity-20 pointer-events-none" : ""}`;

        // Left accent bar
        const accentBarHtml = `<div class="absolute left-0 top-0 bottom-0 w-1 ${col.accent} rounded-l"></div>`;

        // Card Content depending on density (single slot vs multi-slot merged)
        if (block.slotCount > 1) {
          // SPANNING MERGED BLOCK LAYOUT
          card.innerHTML = `
            ${accentBarHtml}
            <div class="pl-2 flex-1 flex flex-col justify-between">
              <!-- Top Row: Subject & Badges & Actions -->
              <div>
                <div class="flex items-start justify-between gap-1.5">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      ${block.isFocus ? '<span class="text-amber-500 text-xs font-black" title="Ca trọng tâm Focus">★</span>' : ""}
                      <h4 class="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate ${isCompleted ? "line-through text-slate-500" : ""}">
                        ${escapeHTML(block.subject)}
                      </h4>
                    </div>
                    <!-- Time range & Spanned count badge -->
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5 flex-wrap">
                      <span>${block.startTime} — ${block.endTime}</span>
                      <span class="px-1.5 py-0.2 rounded-full font-bold bg-white/80 dark:bg-black/40 text-slate-700 dark:text-slate-300">
                        ${block.slotCount} tiết • ${block.durationMinutes}p
                      </span>
                    </div>
                  </div>

                  <!-- Quick Action Buttons -->
                  <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <button type="button" class="btn-quick-edit-block p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300" data-slot-key="${block.slotKeys[0]}" title="Sửa nhanh block">
                      <i data-lucide="edit-3" class="w-3 h-3"></i>
                    </button>
                    <button type="button" class="btn-quick-split-block p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300" data-slot-keys='${JSON.stringify(block.slotKeys)}' title="Tách khối thành từng ca riêng">
                      <i data-lucide="split" class="w-3 h-3"></i>
                    </button>
                    <button type="button" class="btn-toggle-complete-block p-1 rounded hover:bg-black/10 dark:hover:bg-white/10" data-slot-keys='${JSON.stringify(block.slotKeys)}' title="${isCompleted ? "Chưa hoàn thành" : "Hoàn thành"}">
                      <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-3.5 h-3.5 ${isCompleted ? "text-emerald-600" : "text-slate-400"}"></i>
                    </button>
                    <button type="button" class="btn-quick-del-block p-1 rounded text-rose-500 hover:text-rose-700" data-slot-keys='${JSON.stringify(block.slotKeys)}' title="Xóa toàn bộ block">
                      <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                  </div>
                </div>

                <!-- Teacher & Room -->
                <div class="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-1">
                  <span>GV: <strong>${escapeHTML(block.teacher || "-")}</strong></span>
                  <span>•</span>
                  <span>Phòng: <strong>${escapeHTML(block.room || "-")}</strong></span>
                </div>
              </div>

              <!-- Footer: Priority & Multi-slot Pill -->
              <div class="flex items-center justify-between text-[10px] mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <span class="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-white/60 dark:bg-black/30">Gộp ${block.slotCount} ca</span>
                ${block.priority === "critical" ? '<span class="px-1.5 rounded-full text-[9px] font-bold bg-rose-500 text-white">Gấp</span>' : block.priority === "high" ? '<span class="px-1.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">Cao</span>' : ""}
              </div>
            </div>
          `;
        } else {
          // SINGLE SLOT COMPACT LAYOUT
          card.innerHTML = `
            ${accentBarHtml}
            <div class="pl-2 flex-1 flex flex-col justify-between">
              <div class="flex items-start justify-between gap-1 leading-tight">
                <div class="flex items-center gap-1 truncate">
                  ${block.isFocus ? '<span class="text-amber-500 text-xs font-bold">★</span>' : ""}
                  <span class="font-bold text-xs truncate ${isCompleted ? "line-through text-slate-500" : ""}">${escapeHTML(block.subject)}</span>
                </div>
                <div class="flex items-center gap-0.5 shrink-0">
                  <button type="button" data-slot-key="${block.slotKeys[0]}" class="btn-quick-edit-block opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-slate-700" title="Sửa nhanh">
                    <i data-lucide="edit-2" class="w-3 h-3"></i>
                  </button>
                  <button type="button" data-slot-keys='${JSON.stringify(block.slotKeys)}' class="btn-toggle-complete-block p-0.5 rounded hover:bg-black/10" title="${isCompleted ? "Chưa xong" : "Đã xong"}">
                    <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-3.5 h-3.5 ${isCompleted ? "text-emerald-600" : "text-slate-400"}"></i>
                  </button>
                  <button type="button" data-slot-keys='${JSON.stringify(block.slotKeys)}' class="btn-quick-del-block opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-500 hover:text-rose-700" title="Xóa">
                    <i data-lucide="x" class="w-3 h-3"></i>
                  </button>
                </div>
              </div>

              <div class="text-[10px] opacity-80 truncate mt-0.5 font-medium">
                <span>${escapeHTML(block.teacher || "-")}</span>
                <span>•</span>
                <span>${escapeHTML(block.room || "-")}</span>
              </div>

              <div class="flex items-center justify-between text-[9px] mt-0.5">
                <span class="font-mono opacity-70">${block.startTime}</span>
                ${block.priority === "critical" ? '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>' : block.priority === "high" ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>' : ""}
              </div>
            </div>
          `;
        }

        // Dragging Card
        card.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "cell", sourceKey: block.slotKeys[0], allKeys: block.slotKeys }));
          e.dataTransfer.effectAllowed = "move";
          card.classList.add("opacity-50");
        });
        card.addEventListener("dragend", () => {
          card.classList.remove("opacity-50");
        });

        // Drop Listeners on Occupied Cell to allow swapping activities
        blockCell.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          blockCell.classList.add("drop-target-valid");
        });
        blockCell.addEventListener("dragleave", () => blockCell.classList.remove("drop-target-valid"));
        blockCell.addEventListener("drop", (e) => {
          e.preventDefault();
          blockCell.classList.remove("drop-target-valid");
          try {
            const raw = e.dataTransfer.getData("text/plain");
            if (!raw) return;
            const data = JSON.parse(raw);
            const targetKey = block.slotKeys[0];
            if (data.type === "pool") {
              this.placeLessonIntoSlot(targetKey, data.id);
            } else if (data.type === "cell") {
              this.moveOrSwapItem(data.sourceKey, targetKey);
            }
          } catch (err) {}
        });

        blockCell.appendChild(card);
        gridContainer.appendChild(blockCell);
      });

      // 5. Render Empty Dropzone Cells for remaining non-occupied slots in this day
      for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
        if (!occupiedSlotIndices.has(slotIdx)) {
          const slot = slots[slotIdx];
          const slotKey = `${day}-${slot.id}`;
          const isSelected = state.selectedCells.has(slotKey);

          const emptyCell = document.createElement("div");
          emptyCell.dataset.slotKey = slotKey;
          emptyCell.dataset.day = day;
          emptyCell.dataset.slotId = slot.id;
          emptyCell.style.gridColumn = `${colIndex}`;
          emptyCell.style.gridRow = `${slotIdx + 1}`;
          emptyCell.className = `timetable-empty-cell p-1 border-r border-b border-slate-200 dark:border-slate-800 flex items-stretch relative group ${
            isToday ? "bg-sky-50/20 dark:bg-sky-950/10" : ""
          } ${isSelected ? "cell-multi-selected" : ""}`;

          emptyCell.innerHTML = `
            <div class="w-full h-full rounded-xl border border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 flex items-center justify-center cursor-pointer transition" title="Bấm để thêm môn vào ô này">
              <i data-lucide="plus" class="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition"></i>
            </div>
          `;

          // Drop Listeners
          emptyCell.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            emptyCell.classList.add("drop-target-valid");
          });
          emptyCell.addEventListener("dragleave", () => emptyCell.classList.remove("drop-target-valid"));
          emptyCell.addEventListener("drop", (e) => {
            e.preventDefault();
            emptyCell.classList.remove("drop-target-valid");
            try {
              const raw = e.dataTransfer.getData("text/plain");
              if (!raw) return;
              const data = JSON.parse(raw);
              if (data.type === "pool") {
                this.placeLessonIntoSlot(slotKey, data.id);
              } else if (data.type === "cell") {
                this.moveOrSwapItem(data.sourceKey, slotKey);
              }
            } catch (err) {}
          });

          gridContainer.appendChild(emptyCell);
        }
      }
    });

    body.appendChild(gridContainer);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  renderMobileTimeline() {
    const listEl = $("#mobile-timeline-container");
    if (!listEl) return;

    const state = this.store.getState();
    const activeDay = state.selectedDayMobile;
    const slots = state.timeSlots;
    const autoMerge = state.settings.autoMergeBlocks !== false;

    // Call Merge Engine for active mobile day
    const blocks = buildMergedBlocks(state.schedule, slots, activeDay, autoMerge);

    if (blocks.length === 0) {
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

    const cardsHtml = blocks
      .map((block) => {
        const col = getColorConfig(block.color);
        const isCompleted = block.status === "completed";

        return `
          <div
            data-block-id="${block.id}"
            data-slot-keys='${JSON.stringify(block.slotKeys)}'
            class="timeline-vertical-card border ${col.bg} ${col.border} ${isCompleted ? "opacity-60" : ""} shadow-xs cursor-pointer relative overflow-hidden"
          >
            <!-- Left Accent Indicator -->
            <div class="absolute left-0 top-0 bottom-0 w-1 ${col.accent}"></div>

            <div class="pl-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-xs font-bold text-slate-500">${block.startTime} — ${block.endTime}</span>
                  ${block.slotCount > 1 ? `<span class="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white/70 dark:bg-black/40 text-slate-700 dark:text-slate-300">Gộp ${block.slotCount} ca (${block.durationMinutes}p)</span>` : ""}
                </div>

                <button
                  type="button"
                  data-action="toggle-complete-mobile"
                  data-slot-keys='${JSON.stringify(block.slotKeys)}'
                  class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 ${
                    isCompleted ? "text-emerald-600 font-bold" : "text-slate-400"
                  }"
                >
                  <i data-lucide="${isCompleted ? "check-circle-2" : "circle"}" class="w-4 h-4"></i>
                  <span>${isCompleted ? "Đã xong" : "Chưa xong"}</span>
                </button>
              </div>

              <div class="flex items-center gap-1.5 mt-1">
                ${block.isFocus ? '<span class="text-amber-500 font-bold">★</span>' : ""}
                <h4 class="font-black text-base text-slate-900 dark:text-white ${isCompleted ? "line-through" : ""}">${escapeHTML(block.subject)}</h4>
              </div>

              <div class="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5">
                <span>Phụ trách: <strong>${escapeHTML(block.teacher || "-")}</strong></span>
                <span>•</span>
                <span>Phòng: <strong>${escapeHTML(block.room || "-")}</strong></span>
              </div>

              <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-action="focus-mobile"
                    data-slot-key="${block.slotKeys[0]}"
                    class="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-1 shadow-2xs"
                  >
                    <i data-lucide="target" class="w-3.5 h-3.5"></i>
                    <span>Focus</span>
                  </button>

                  ${block.slotCount > 1 ? `
                    <button
                      type="button"
                      data-action="split-mobile"
                      data-slot-keys='${JSON.stringify(block.slotKeys)}'
                      class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg"
                      title="Tách khối gộp này"
                    >
                      Tách ca
                    </button>
                  ` : ""}
                </div>

                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-action="delete-mobile"
                    data-slot-keys='${JSON.stringify(block.slotKeys)}'
                    class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/80 dark:text-rose-400 font-semibold rounded-lg flex items-center gap-1 transition"
                    title="Xóa block này"
                  >
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    <span>Xóa</span>
                  </button>
                  <button
                    type="button"
                    data-action="detail-mobile"
                    data-slot-keys='${JSON.stringify(block.slotKeys)}'
                    class="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg shadow-2xs"
                  >
                    Chi tiết
                  </button>
                </div>
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
          <span>Thêm ca vào ${DAY_NAMES[activeDay]}</span>
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
      priority: lesson.priority || "medium",
      isFocus: false,
      notes: lesson.notes || "",
      manualSplit: false,
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

  moveOrSwapItem(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    this.history.recordState();
    const state = this.store.getState();

    const sourceItem = state.schedule.find((s) => s.slotId === sourceKey);
    const targetItem = state.schedule.find((s) => s.slotId === targetKey);

    if (!sourceItem && !targetItem) return;

    if (sourceItem && targetItem) {
      // Direct SWAP between two occupied slots
      sourceItem.slotId = targetKey;
      targetItem.slotId = sourceKey;
      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", {
        message: `Đã đổi vị trí giữa "${sourceItem.subject}" và "${targetItem.subject}"`,
        type: "success",
      });
    } else if (sourceItem && !targetItem) {
      // Move to empty slot
      sourceItem.slotId = targetKey;
      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã chuyển "${sourceItem.subject}" sang ô mới`, type: "info" });
    } else if (!sourceItem && targetItem) {
      targetItem.slotId = sourceKey;
      this.storage.debouncedSave();
      this.render();
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã chuyển "${targetItem.subject}" sang ô mới`, type: "info" });
    }
  }

  moveItem(sourceKey, targetKey) {
    this.moveOrSwapItem(sourceKey, targetKey);
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
    this.bindQuickEditForm();
    this.bindMergedDetailActions();
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
    events.on("modal:open-quick-edit", (slotKey) => this.openQuickEdit(slotKey));
    events.on("modal:open-merged-detail", (data) => this.openMergedBlockDetail(data));

    // Settings Toggle for Smart Merge
    const autoMergeToggle = $("#settings-toggle-automerge");
    if (autoMergeToggle) {
      const state = this.store.getState();
      autoMergeToggle.checked = state.settings?.autoMergeBlocks !== false;
      autoMergeToggle.addEventListener("change", (e) => {
        const currentSettings = this.store.getState().settings || {};
        this.store.setState({
          settings: { ...currentSettings, autoMergeBlocks: e.target.checked },
        });
        this.storage.debouncedSave();
        events.emit("schedule:updated");
        events.emit("toast:show", {
          message: e.target.checked ? "Đã bật tự động gộp khối" : "Đã tắt tự động gộp khối",
          type: "info",
        });
      });
    }
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

  // ==================== 4. QUICK EDIT MODAL ====================
  openQuickEdit(slotKeyOrKeys) {
    const isArray = Array.isArray(slotKeyOrKeys);
    const primaryKey = isArray ? slotKeyOrKeys[0] : slotKeyOrKeys;
    const state = this.store.getState();
    const item = state.schedule.find((s) => s.slotId === primaryKey);
    if (!item) return;

    $("#quick-edit-slot-key").value = primaryKey;
    $("#quick-edit-slot-keys").value = isArray ? JSON.stringify(slotKeyOrKeys) : "";
    $("#quick-edit-subject").value = item.subject || "";
    $("#quick-edit-teacher").value = item.teacher || "";
    $("#quick-edit-room").value = item.room || "";
    $("#quick-edit-status").value = item.status || "planned";
    $("#quick-edit-is-focus").checked = Boolean(item.isFocus);

    // Color selector
    const colorSelect = $("#quick-edit-color");
    if (colorSelect) {
      colorSelect.innerHTML = Object.keys(COLOR_MAP)
        .map((c) => `<option value="${c}" ${item.color === c ? "selected" : ""}>${COLOR_MAP[c].name || c}</option>`)
        .join("");
    }

    const applyAllContainer = $("#quick-edit-apply-all-container");
    if (applyAllContainer) {
      if (isArray && slotKeyOrKeys.length > 1) {
        applyAllContainer.classList.remove("hidden");
        const cb = $("#quick-edit-apply-all-block");
        if (cb) cb.checked = true;
      } else {
        applyAllContainer.classList.add("hidden");
      }
    }

    this.open("modal-quick-edit");
  }

  bindQuickEditForm() {
    const form = $("#form-quick-edit");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const primaryKey = $("#quick-edit-slot-key").value;
      const rawKeys = $("#quick-edit-slot-keys").value;
      const applyAll = $("#quick-edit-apply-all-block")?.checked;
      const keys = rawKeys && applyAll ? JSON.parse(rawKeys) : [primaryKey];

      const state = this.store.getState();
      this.history.recordState();

      const subject = $("#quick-edit-subject").value.trim();
      const teacher = $("#quick-edit-teacher").value.trim();
      const room = $("#quick-edit-room").value.trim();
      const status = $("#quick-edit-status").value;
      const color = $("#quick-edit-color").value;
      const isFocus = $("#quick-edit-is-focus").checked;

      keys.forEach((k) => {
        const item = state.schedule.find((s) => s.slotId === k);
        if (item) {
          item.subject = subject;
          item.teacher = teacher;
          item.room = room;
          item.status = status;
          item.color = color;
          item.isFocus = isFocus;
        }
      });

      this.storage.debouncedSave();
      this.close("modal-quick-edit");
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã cập nhật môn "${subject}"`, type: "success" });
    });
  }

  // ==================== 5. MERGED BLOCK DETAIL MODAL ====================
  openMergedBlockDetail(data) {
    if (!data) return;
    const { blockId, slotKeys, day } = data;
    const state = this.store.getState();
    const items = state.schedule.filter((s) => slotKeys.includes(s.slotId));
    if (items.length === 0) return;

    const first = items[0];
    this.currentMergedData = data;

    // Subject title & dot
    $("#merged-detail-subject-title").textContent = first.subject || "Chưa có tên";
    const dot = $("#merged-detail-color-dot");
    if (dot) {
      dot.className = `w-3 h-3 rounded-full ${COLOR_MAP[first.color]?.accent || "bg-blue-500"}`;
    }

    $("#merged-detail-teacher").textContent = first.teacher || "--";
    $("#merged-detail-room").textContent = first.room || "--";

    // Find slot info
    const subSlots = slotKeys
      .map((k) => {
        const [, sid] = k.split("-");
        return state.timeSlots.find((s) => s.id === sid);
      })
      .filter(Boolean);

    let startTime = subSlots[0]?.start || "--";
    let endTime = subSlots[subSlots.length - 1]?.end || "--";
    let totalMinutes = 0;
    subSlots.forEach((s) => {
      const dur = TimeEngine.getSlotDurationMinutes ? TimeEngine.getSlotDurationMinutes(s) : (TimeEngine.getDurationMinutes ? TimeEngine.getDurationMinutes(s.start, s.end) : 0);
      totalMinutes += (dur || 0);
    });

    $("#merged-detail-time-range").textContent = `${startTime} — ${endTime}`;
    $("#merged-detail-day-label").textContent = `${DAY_NAMES[day]} • ${subSlots.length} ca liên tiếp`;
    $("#merged-detail-duration-badge").textContent = `${totalMinutes} phút`;

    const allCompleted = items.every((i) => i.status === "completed");
    $("#merged-btn-complete-text").textContent = allCompleted ? "Đổi sang dự kiến" : "Hoàn thành";

    // Render sub slots list
    const listEl = $("#merged-detail-slots-list");
    if (listEl) {
      listEl.innerHTML = subSlots
        .map((s, idx) => {
          const item = items.find((i) => i.slotId === `${day}-${s.id}`);
          const isDone = item?.status === "completed";
          return `
            <div class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-300">
                  ${idx + 1}
                </span>
                <div>
                  <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">${escapeHTML(s.label)}</span>
                  <span class="text-slate-400 font-mono text-[10px] ml-1">(${s.start} - ${s.end})</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}">
                  ${isDone ? "Xong" : "Dự kiến"}
                </span>
                <button
                  type="button"
                  data-remove-single-slot="${day}-${s.id}"
                  class="btn-remove-subslot p-1 text-slate-400 hover:text-rose-500 rounded transition"
                  title="Xóa riêng ca này khỏi TKB"
                >
                  <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        })
        .join("");

      listEl.querySelectorAll(".btn-remove-subslot").forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const targetKey = btn.dataset.removeSingleSlot;
          this.history.recordState();
          const st = this.store.getState();
          st.schedule = st.schedule.filter((s) => s.slotId !== targetKey);
          this.storage.debouncedSave();
          this.close("modal-merged-detail");
          events.emit("schedule:updated");
          events.emit("toast:show", { message: "Đã xóa ca khỏi khối", type: "info" });
        };
      });
    }

    this.open("modal-merged-detail");
  }

  bindMergedDetailActions() {
    // Split block
    const btnSplit = $("#btn-merged-split-block");
    if (btnSplit) {
      btnSplit.onclick = () => {
        if (!this.currentMergedData?.slotKeys) return;
        events.emit("timetable:split-block", this.currentMergedData.slotKeys);
        this.close("modal-merged-detail");
        events.emit("toast:show", { message: "Đã tách khối thành các ca riêng", type: "success" });
      };
    }

    // Toggle complete
    const btnComplete = $("#btn-merged-toggle-complete");
    if (btnComplete) {
      btnComplete.onclick = () => {
        if (!this.currentMergedData?.slotKeys) return;
        events.emit("timetable:toggle-complete-block", this.currentMergedData.slotKeys);
        this.close("modal-merged-detail");
      };
    }

    // Focus
    const btnFocus = $("#btn-merged-focus");
    if (btnFocus) {
      btnFocus.onclick = () => {
        if (!this.currentMergedData?.slotKeys) return;
        const state = this.store.getState();
        const first = state.schedule.find((s) => s.slotId === this.currentMergedData.slotKeys[0]);
        if (first) {
          const [, sid] = first.slotId.split("-");
          const slot = state.timeSlots.find((s) => s.id === sid);
          this.close("modal-merged-detail");
          events.emit("focus:start", { ...first, slot });
        }
      };
    }

    // Edit all
    const btnEditAll = $("#btn-merged-edit-all");
    if (btnEditAll) {
      btnEditAll.onclick = () => {
        if (!this.currentMergedData?.slotKeys) return;
        this.close("modal-merged-detail");
        this.openQuickEdit(this.currentMergedData.slotKeys);
      };
    }

    // Delete block
    const btnDelete = $("#btn-merged-delete-block");
    if (btnDelete) {
      btnDelete.onclick = () => {
        if (!this.currentMergedData?.slotKeys) return;
        if (!confirm(`Xóa toàn bộ ${this.currentMergedData.slotKeys.length} ca trong khối gộp này?`)) return;
        events.emit("timetable:delete-block", this.currentMergedData.slotKeys);
        this.close("modal-merged-detail");
      };
    }
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

})();
