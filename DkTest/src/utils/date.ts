/**
 * Helper to safely format timestamps or Date objects from Firestore, ISO strings, or numbers.
 * Prevents "exam.updatedAt.toMillis is not a function" errors.
 */
export function formatDate(val: any, includeTime = false): string {
  if (!val) return "---";
  try {
    let date: Date;
    if (typeof val === "object" && typeof val.toDate === "function") {
      date = val.toDate();
    } else if (typeof val === "object" && typeof val.toMillis === "function") {
      date = new Date(val.toMillis());
    } else if (typeof val === "object" && val.seconds !== undefined) {
      date = new Date(val.seconds * 1000);
    } else if (val instanceof Date) {
      date = val;
    } else if (typeof val === "string" || typeof val === "number") {
      date = new Date(val);
    } else {
      return "---";
    }

    if (isNaN(date.getTime())) return "---";

    return includeTime
      ? date.toLocaleString("vi-VN")
      : date.toLocaleDateString("vi-VN");
  } catch (e) {
    return "---";
  }
}

/**
 * Safely extract millisecond timestamp for sorting or comparison.
 */
export function getTimestampMillis(val: any): number {
  if (!val) return 0;
  try {
    if (typeof val === "object") {
      if (typeof val.toMillis === "function") return val.toMillis();
      if (typeof val.toDate === "function") return val.toDate().getTime();
      if (typeof val.seconds === "number") {
        return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
      }
      if (typeof val._seconds === "number") {
        return val._seconds * 1000 + Math.floor((val._nanoseconds || 0) / 1000000);
      }
    }
    if (val instanceof Date) {
      const t = val.getTime();
      return isNaN(t) ? 0 : t;
    }
    if (typeof val === "number") {
      return val < 1e11 ? val * 1000 : val;
    }
    if (typeof val === "string") {
      const d = new Date(val);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    }
  } catch (e) {
    return 0;
  }
  return 0;
}

/**
 * Returns user-friendly relative time in Vietnamese (e.g. "Vừa xong", "5 phút trước", "Hôm qua lúc 14:20")
 */
export function formatRelativeTime(val: any): string {
  const ms = getTimestampMillis(val);
  if (!ms) return "";
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    const d = new Date(ms);
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `Hôm qua ${timeStr}`;
  }
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return formatDate(val, false);
}
