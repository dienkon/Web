/**
 * Authoritative Storage & Keys Management for DkTest
 * Fully Fail-Safe for Chrome Android, Private Browsing, and QuotaExceeded errors.
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

// In-memory memory fallback map when browser storage is blocked or quota is full
const memoryStorage = new Map<string, string>();
const memorySessionStorage = new Map<string, string>();

/**
 * Checks if localStorage is functional and non-throwing
 */
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const testKey = "__dktest_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if sessionStorage is functional and non-throwing
 */
function isSessionStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return false;
    const testKey = "__dktest_session_test__";
    window.sessionStorage.setItem(testKey, "1");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = isLocalStorageAvailable();
const hasSessionStorage = isSessionStorageAvailable();

/**
 * Safely parse JSON without throwing SyntaxError
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Fail-safe wrapper for localStorage
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (hasLocalStorage && typeof window !== "undefined") {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStorage.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (hasLocalStorage && typeof window !== "undefined") {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[safeLocalStorage] Failed to set "${key}" in window.localStorage, falling back to memory:`, e);
    }
    memoryStorage.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (hasLocalStorage && typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryStorage.delete(key);
  },

  clear(): void {
    try {
      if (hasLocalStorage && typeof window !== "undefined") {
        window.localStorage.clear();
      }
    } catch {}
    memoryStorage.clear();
  },
};

/**
 * Fail-safe wrapper for sessionStorage
 */
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      if (hasSessionStorage && typeof window !== "undefined") {
        return window.sessionStorage.getItem(key);
      }
    } catch {}
    return memorySessionStorage.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (hasSessionStorage && typeof window !== "undefined") {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[safeSessionStorage] Failed to set "${key}" in sessionStorage:`, e);
    }
    memorySessionStorage.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (hasSessionStorage && typeof window !== "undefined") {
        window.sessionStorage.removeItem(key);
      }
    } catch {}
    memorySessionStorage.delete(key);
  },

  clear(): void {
    try {
      if (hasSessionStorage && typeof window !== "undefined") {
        window.sessionStorage.clear();
      }
    } catch {}
    memorySessionStorage.clear();
  },
};

/**
 * Helper to get item with fallback to legacy keys for backwards compatibility
 */
export function getStoredItem<T = string>(key: string, legacyKey?: string): T | null {
  try {
    const val = safeLocalStorage.getItem(key);
    if (val !== null) {
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as unknown as T;
      }
    }
    if (legacyKey) {
      const legVal = safeLocalStorage.getItem(legacyKey);
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
    safeLocalStorage.setItem(key, stringVal);
    if (syncLegacyKey) {
      safeLocalStorage.setItem(syncLegacyKey, stringVal);
    }
  } catch (e) {
    console.warn("[setStoredItem] localStorage set error:", e);
  }
}

/**
 * Remove an item from storage
 */
export function removeStoredItem(key: string, legacyKey?: string): void {
  try {
    safeLocalStorage.removeItem(key);
    if (legacyKey) {
      safeLocalStorage.removeItem(legacyKey);
    }
  } catch (e) {
    console.warn("[removeStoredItem] localStorage remove error:", e);
  }
}
