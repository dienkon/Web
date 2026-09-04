/**
 * Date & Time Formatting Utilities
 */

export const DAY_NAMES = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
export const DAY_SHORT_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday through Sunday

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatHHMMSS(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function formatMinutes(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function formatDurationShort(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

export function getWeekRange(offset = 0) {
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

export function getDateForDay(dayIndex, offset = 0) {
  const week = getWeekRange(offset);
  const d = new Date(week.monday);
  const addDays = dayIndex === 0 ? 6 : dayIndex - 1;
  d.setDate(week.monday.getDate() + addDays);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}
