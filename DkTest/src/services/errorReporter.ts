/**
 * Central Error Reporting and Diagnostic Service for DkTEST
 * Follows directive: "ONE FAILURE MUST NOT KILL THE WHOLE APP."
 */

export interface ErrorReportContext {
  page?: string;
  route?: string;
  action?: string;
  source?: "global_error" | "unhandled_rejection" | "error_boundary" | "route_boundary" | "firebase" | "network" | "storage" | "chunk_load";
  metadata?: Record<string, any>;
}

export interface StructuredErrorLog {
  id: string;
  type: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  isOnline: boolean;
  isMobile: boolean;
  context?: ErrorReportContext;
}

const MAX_IN_MEMORY_LOGS = 30;
const inMemoryLogs: StructuredErrorLog[] = [];

// Expose safe buffer globally for ?debug=1 inspection
if (typeof window !== "undefined") {
  (window as any).__DK_ERROR_LOGS__ = inMemoryLogs;
  (window as any).__DK_LAST_ERROR__ = null;
}

/**
 * Strips potentially sensitive credentials/tokens/passwords from error message or stack
 */
function sanitizeMessage(msg: string): string {
  if (!msg) return "Unknown error";
  return msg
    .replace(/(password|token|secret|apiKey)=([^&\s]+)/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+([A-Za-z0-9-_.]+)/gi, "Bearer [REDACTED]");
}

/**
 * Report and record an error centrally
 */
export function reportError(error: unknown, context: ErrorReportContext = {}): StructuredErrorLog {
  const now = new Date().toISOString();
  let errType = "Error";
  let errMessage = "Unknown runtime error";
  let errStack: string | undefined = undefined;

  if (error instanceof Error) {
    errType = error.name || "Error";
    errMessage = error.message || String(error);
    errStack = error.stack;
  } else if (typeof error === "string") {
    errMessage = error;
  } else if (error && typeof error === "object") {
    try {
      errMessage = JSON.stringify(error);
    } catch {
      errMessage = String(error);
    }
  }

  const cleanMessage = sanitizeMessage(errMessage);
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const logEntry: StructuredErrorLog = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: errType,
    message: cleanMessage,
    stack: errStack,
    url: currentUrl,
    userAgent,
    timestamp: now,
    isOnline,
    isMobile,
    context: {
      ...context,
      route: context.route || (typeof window !== "undefined" ? window.location.pathname : ""),
    },
  };

  // Keep in circular memory buffer
  inMemoryLogs.unshift(logEntry);
  if (inMemoryLogs.length > MAX_IN_MEMORY_LOGS) {
    inMemoryLogs.pop();
  }

  if (typeof window !== "undefined") {
    (window as any).__DK_LAST_ERROR__ = logEntry;
  }

  // Only verbose log in development or if ?debug=1 is enabled
  const isDev = import.meta.env?.DEV || (typeof window !== "undefined" && window.location.search.includes("debug=1"));
  if (isDev) {
    console.error("[DkTEST ErrorReporter]", logEntry);
  } else {
    // Non-spammy prod log
    console.warn(`[DkTEST] ${logEntry.type}: ${logEntry.message} (${logEntry.context?.source || "app"})`);
  }

  return logEntry;
}

/**
 * Retrieve all in-memory recorded errors
 */
export function getRecentErrorLogs(): StructuredErrorLog[] {
  return [...inMemoryLogs];
}

/**
 * Clear recent error logs
 */
export function clearErrorLogs(): void {
  inMemoryLogs.length = 0;
  if (typeof window !== "undefined") {
    (window as any).__DK_LAST_ERROR__ = null;
  }
}
