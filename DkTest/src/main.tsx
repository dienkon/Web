// Ensure window.fetch is writable and safe in all browser/sandbox contexts
(function fixFetchProperty() {
  if (typeof window !== "undefined") {
    try {
      let orig = window.fetch ? window.fetch.bind(window) : undefined;
      let proto: any = window;
      while (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, "fetch");
        if (desc) {
          if (!desc.set && desc.configurable !== false) {
            let current = orig;
            Object.defineProperty(window, "fetch", {
              get() { return current; },
              set(fn) { current = fn; },
              configurable: true,
              enumerable: true,
            });
          }
          break;
        }
        proto = Object.getPrototypeOf(proto);
      }
    } catch {
      // ignore
    }
  }
})();

// Unregister zombie service workers to prevent stale HTML/chunk caching after Vercel deployments
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  } catch {}
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GlobalErrorBoundary } from "./components/common/GlobalErrorBoundary";
import { reportError } from "./services/errorReporter";
import { isChunkLoadError, triggerChunkRecovery } from "./utils/lazyWithRetry";
import "./index.css";
import "katex/dist/katex.min.css";

// Global JavaScript error listener
window.addEventListener("error", (event) => {
  const error = event.error || new Error(event.message || "Unknown window error");
  reportError(error, {
    source: "global_error",
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  });

  if (isChunkLoadError(error)) {
    triggerChunkRecovery(error);
  }
});

// Global unhandled promise rejection listener
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason || new Error("Unhandled promise rejection");
  reportError(reason, {
    source: "unhandled_rejection",
  });

  if (isChunkLoadError(reason)) {
    triggerChunkRecovery(reason);
  }
});

// Safe React Root Mount
const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>
    );
  } catch (mountErr: any) {
    console.error("[main] Fatal React root mount error:", mountErr);
    reportError(mountErr, { source: "global_error", action: "root_mount_failed" });

    // Fallback UI directly into root DOM
    rootElement.innerHTML = `
      <div style="min-height:100vh;background:#020617;color:#f8fafc;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;text-align:center;">
        <div style="max-width:420px;width:100%;background:#0f172a;border:1px solid #1e293b;border-radius:24px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(59,130,246,0.1);color:#60a5fa;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <svg style="width:28px;height:28px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 style="font-size:20px;font-weight:800;margin-bottom:8px;">DkTEST - Đang cập nhật ứng dụng</h2>
          <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:24px;">Hệ thống vừa cập nhật phiên bản mới. Nhấn bên dưới để làm mới trình duyệt và tiếp tục làm bài.</p>
          <button onclick="sessionStorage.removeItem('dk_last_chunk_recovery');window.location.reload();" style="width:100%;padding:12px 16px;background:#2563eb;color:#ffffff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
            Tải lại trang ngay
          </button>
        </div>
      </div>
    `;
  }
}
