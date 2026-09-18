/**
 * Authoritative Storage & Keys Management for DkTest
 * Namespace:
 *  dktest:auth:*
 *  dktest:exam:*
 *  dktest:ui:*
 *  dktest:cache:*
 *  dktest:session:*
 */

export const STORAGE_KEYS = {
  // Auth
  AUTH_ROLE: "dktest:auth:role",
  ADMIN_TOKEN: "dktest:auth:admin_token",
  ADMIN_PASSWORD: "dktest:auth:admin_password",
  STUDENT_INFO: "dktest:auth:student_info",
  PARENT_INFO: "dktest:auth:parent_info",

  // Exam Defaults & Settings
  EXAM_DEFAULTS: "dktest:exam:defaults",

  // UI preferences
  UI_LIVE_MONITOR_SHOW_MAP: "dktest:ui:live_monitor_show_map",
  UI_LIVE_MONITOR_SHOW_ANSWER_KEY: "dktest:ui:live_monitor_show_answer_key",
  UI_TAKING_SHOW_MAP: "dktest:ui:taking_show_map",
  UI_TAKING_DISPLAY_MODE: "dktest:ui:taking_display_mode",

  // Exam taking state & recovery
  EXAM_ACTIVE_SESSION: (examId: string) => `dktest:session:active_${examId}`,
  EXAM_ATTEMPT_SNAPSHOT: (examId: string, studentId: string) => `dktest:session:snapshot_${examId}_${studentId}`,
  EXAM_START_TIME: (examId: string, studentId: string) => `dktest:session:start_time_${examId}_${studentId}`,
  EXAM_TAB_LOCK: (attemptId: string) => `dktest:session:tab_lock_${attemptId}`,
  STUDENT_SUBMISSION_HISTORY: "dktest:session:submission_history",
} as const;

/**
 * Helper to get item with fallback to legacy keys for backwards compatibility
 */
export function getStoredItem<T = string>(key: string, legacyKey?: string): T | null {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as unknown as T;
      }
    }
    if (legacyKey) {
      const legVal = localStorage.getItem(legacyKey);
      if (legVal !== null) {
        try {
          return JSON.parse(legVal) as T;
        } catch {
          return legVal as unknown as T;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to set item into namespaced storage
 */
export function setStoredItem(key: string, value: any, syncLegacyKey?: string): void {
  try {
    const stringVal = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, stringVal);
    if (syncLegacyKey) {
      localStorage.setItem(syncLegacyKey, stringVal);
    }
  } catch (e) {
    console.warn("localStorage set error:", e);
  }
}

/**
 * Remove an item from storage
 */
export function removeStoredItem(key: string, legacyKey?: string): void {
  try {
    localStorage.removeItem(key);
    if (legacyKey) {
      localStorage.removeItem(legacyKey);
    }
  } catch (e) {
    console.warn("localStorage remove error:", e);
  }
}
