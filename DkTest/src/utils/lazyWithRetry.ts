import React, { ComponentType, lazy, LazyExoticComponent } from "react";
import { reportError } from "../services/errorReporter";

const CHUNK_RECOVERY_KEY = "dk_last_chunk_recovery";
const MAX_RELOAD_INTERVAL_MS = 30000; // 30s window to avoid any infinite reload loop

/**
 * Checks if an error is a dynamic import or chunk loading failure
 */
export function isChunkLoadError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("importing a module script failed") ||
    msg.includes("dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("load failed") ||
    error.name === "ChunkLoadError"
  );
}

/**
 * Attempts a safe page reload if a stale chunk error is detected, with anti-loop protection.
 * Returns true if a reload was initiated, false if max retries exceeded.
 */
export function triggerChunkRecovery(error?: any): boolean {
  try {
    const raw = sessionStorage.getItem(CHUNK_RECOVERY_KEY);
    const lastRecovery = raw ? parseInt(raw, 10) : 0;
    const now = Date.now();

    // If we already attempted recovery within 30 seconds, DO NOT reload again!
    if (now - lastRecovery < MAX_RELOAD_INTERVAL_MS) {
      console.warn("[ChunkRecovery] Already attempted reload recently. Aborting reload loop.");
      return false;
    }

    sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(now));
    reportError(error || new Error("ChunkLoadError auto-reload initiated"), {
      source: "chunk_load",
      action: "safe_reload",
    });

    // Hard reload with cache-bust query to bypass browser HTTP cache on mobile Chrome
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.set("_reload", String(now));
    window.location.replace(cleanUrl.toString());
    return true;
  } catch (e) {
    console.error("[ChunkRecovery] Failed to trigger recovery reload:", e);
    return false;
  }
}

/**
 * Enhanced React.lazy with automatic in-flight retry, delay, and reload recovery.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName = "LazyComponent"
): LazyExoticComponent<T> {
  return lazy(async () => {
    // Attempt 1: Normal import
    try {
      return await componentImport();
    } catch (firstErr: any) {
      if (!isChunkLoadError(firstErr)) {
        reportError(firstErr, {
          source: "chunk_load",
          action: "first_attempt_failed",
          metadata: { componentName },
        });
        throw firstErr;
      }

      console.warn(`[lazyWithRetry] ${componentName} initial import failed with chunk error. Retrying...`, firstErr);

      // Attempt 2: Wait 400ms and retry in-flight
      await new Promise((res) => setTimeout(res, 400));
      try {
        return await componentImport();
      } catch (secondErr: any) {
        if (!isChunkLoadError(secondErr)) {
          reportError(secondErr, {
            source: "chunk_load",
            action: "second_attempt_failed",
            metadata: { componentName },
          });
          throw secondErr;
        }

        console.warn(`[lazyWithRetry] ${componentName} retry 2 failed. Checking auto-recovery...`, secondErr);

        // Check if we can do an auto-reload
        const reloaded = triggerChunkRecovery(secondErr);
        if (reloaded) {
          // Keep a pending promise while the browser reloads so the user doesn't see a flash of error
          return new Promise<{ default: T }>(() => {});
        }

        // If auto-reload already used or forbidden, throw so RouteErrorBoundary / GlobalErrorBoundary renders
        throw secondErr;
      }
    }
  });
}
