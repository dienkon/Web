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
    if (typeof val === "object" && typeof val.toMillis === "function") {
      return val.toMillis();
    }
    if (typeof val === "object" && typeof val.toDate === "function") {
      return val.toDate().getTime();
    }
    if (typeof val === "object" && val.seconds !== undefined) {
      return val.seconds * 1000;
    }
    if (val instanceof Date) {
      return val.getTime();
    }
    if (typeof val === "string" || typeof val === "number") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
  } catch (e) {
    return 0;
  }
  return 0;
}
