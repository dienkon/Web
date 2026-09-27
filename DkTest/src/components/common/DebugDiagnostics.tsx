import React, { useState, useEffect } from "react";
import { getRecentErrorLogs, clearErrorLogs, type StructuredErrorLog } from "../../services/errorReporter";
import { safeLocalStorage, safeSessionStorage } from "../../utils/storage";
import { safeCopyText } from "../../utils/mobileCompat";
import { auth, db } from "../../services/firebase/config";
import { X, Copy, Check, Trash2, RefreshCw, Cpu, Database, Wifi, ShieldAlert } from "lucide-react";

export function DebugDiagnostics() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<StructuredErrorLog[]>([]);
  const [copied, setCopied] = useState(false);
  const [storageStatus, setStorageStatus] = useState<string>("Checking...");
  const [firebaseStatus, setFirebaseStatus] = useState<string>("Checking...");

  useEffect(() => {
    // Check if ?debug=1 exists in search params or hash
    const hasDebugParam =
      typeof window !== "undefined" &&
      (window.location.search.includes("debug=1") || window.location.hash.includes("debug=1"));

    if (hasDebugParam) {
      setIsOpen(true);
    }

    // Key shortcut to toggle debug: Ctrl+Shift+D or tapping badge
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Refresh logs
    setLogs(getRecentErrorLogs());

    // Test storage
    try {
      safeLocalStorage.setItem("__dk_test_key__", "1");
      const readVal = safeLocalStorage.getItem("__dk_test_key__");
      safeLocalStorage.removeItem("__dk_test_key__");
      setStorageStatus(readVal === "1" ? "Operational (Writable & Readable)" : "Degraded");
    } catch (e: any) {
      setStorageStatus(`Error: ${e.message}`);
    }

    // Test Firebase instance
    try {
      const authAvailable = !!auth;
      const dbAvailable = !!db;
      setFirebaseStatus(
        `Auth: ${authAvailable ? "OK" : "Null"}, Firestore: ${dbAvailable ? "OK" : "Null"}`
      );
    } catch (e: any) {
      setFirebaseStatus(`Error: ${e.message}`);
    }
  }, [isOpen]);

  const handleCopyReport = async () => {
    const report = {
      appVersion: "1.8.26",
      buildId: import.meta.env?.VITE_BUILD_ID || "stable-production",
      url: window.location.href,
      pathname: window.location.pathname,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      storageStatus,
      firebaseStatus,
      errorCount: logs.length,
      recentErrors: logs.slice(0, 10),
    };

    const success = await safeCopyText(JSON.stringify(report, null, 2));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearCacheAndReload = () => {
    try {
      safeSessionStorage.clear();
      // Remove cache keys safely without deleting user exams
      localStorage.removeItem("dk_last_chunk_recovery");
      localStorage.removeItem("firestore_cache");
      window.location.href = window.location.pathname + "?_t=" + Date.now();
    } catch {
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-sans text-xs">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">DkTEST Live Diagnostics</div>
              <div className="text-[10px] text-slate-400">Build v1.8.26 • Mobile Chrome Android Guard</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Wifi className={`w-5 h-5 shrink-0 ${navigator.onLine ? "text-emerald-400" : "text-red-400"}`} />
              <div className="truncate">
                <div className="text-[10px] text-slate-400">Network</div>
                <div className="font-bold text-white truncate">{navigator.onLine ? "Online" : "Offline"}</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Database className="w-5 h-5 shrink-0 text-blue-400" />
              <div className="truncate">
                <div className="text-[10px] text-slate-400">Storage</div>
                <div className="font-bold text-white truncate">{storageStatus}</div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
              <div className="truncate">
                <div className="text-[10px] text-slate-400">Firebase</div>
                <div className="font-bold text-white truncate">{firebaseStatus}</div>
              </div>
            </div>
          </div>

          {/* Device & Route details */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
            <div className="text-slate-400">
              <span className="text-slate-500 font-bold">Route:</span> {window.location.pathname}
            </div>
            <div className="text-slate-400 truncate">
              <span className="text-slate-500 font-bold">User-Agent:</span> {navigator.userAgent}
            </div>
            <div className="text-slate-400">
              <span className="text-slate-500 font-bold">Viewport:</span> {window.innerWidth} x {window.innerHeight} (dpr {window.devicePixelRatio})
            </div>
          </div>

          {/* Captured Errors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                <span>Recent Captured Errors ({logs.length})</span>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearErrorLogs();
                    setLogs([]);
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa lịch sử lỗi</span>
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                Không ghi nhận lỗi nào kể từ lúc tải trang.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[10px]"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-red-400">{log.type}</span>
                      <span>{log.timestamp.slice(11, 19)}</span>
                    </div>
                    <div className="text-slate-200 break-words">{log.message}</div>
                    {log.stack && (
                      <div className="text-slate-500 max-h-24 overflow-y-auto whitespace-pre-wrap text-[9px] pt-1 border-t border-slate-900">
                        {log.stack.split("\n").slice(0, 4).join("\n")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyReport}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã copy báo cáo" : "Copy Diagnostic Report"}</span>
          </button>

          <button
            type="button"
            onClick={handleClearCacheAndReload}
            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Safe Cache</span>
          </button>
        </div>
      </div>
    </div>
  );
}
