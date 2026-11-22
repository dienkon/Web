import React, { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, X } from "lucide-react";
import {
  showAppAlert,
  subscribeAppDialogs,
  type AppDialogRequest,
} from "../../services/appDialogService";

/**
 * Global custom popup host for DkTEST.
 * Replaces native browser `window.alert` across the entire app so users always see
 * a clean, consistent DkTEST modal popup on both Web and Android App.
 */
export default function AppDialogHost() {
  const [queue, setQueue] = useState<AppDialogRequest[]>([]);
  const [inputVal, setInputVal] = useState("");

  const current = queue[0] || null;

  useEffect(() => {
    const unsub = subscribeAppDialogs((req) => {
      setQueue((prev) => [...prev, req]);
    });

    // Global safety net: intercept any legacy or third-party window.alert()
    if (typeof window !== "undefined") {
      const w = window as any;
      if (!w.__dktestAlertPatched) {
        w.__dktestAlertPatched = true;
        window.alert = (msg?: any) => {
          void showAppAlert(msg === undefined || msg === null ? "" : String(msg));
        };
      }
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    if (current?.kind === "prompt") {
      setInputVal(current.defaultValue || "");
    }
  }, [current?.id]);

  const closeWith = (value: any) => {
    if (!current) return;
    const active = current;
    setQueue((prev) => prev.slice(1));
    active.resolve(value);
  };

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeWith(current.kind === "confirm" ? false : current.kind === "prompt" ? null : undefined);
      } else if (e.key === "Enter" && current.kind !== "prompt") {
        e.preventDefault();
        closeWith(current.kind === "confirm" ? true : undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, inputVal]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                current.danger
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                  : current.kind === "confirm"
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
              }`}
            >
              {current.danger ? (
                <AlertTriangle className="w-5 h-5" />
              ) : current.kind === "alert" ? (
                <Bell className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {current.title || "Thông báo DkTEST"}
            </h3>
          </div>
          <button
            type="button"
            onClick={() =>
              closeWith(
                current.kind === "confirm" ? false : current.kind === "prompt" ? null : undefined
              )
            }
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
            {current.message}
          </p>
          {current.kind === "prompt" && (
            <input
              type="text"
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  closeWith(inputVal);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          {current.kind !== "alert" && (
            <button
              type="button"
              onClick={() => closeWith(current.kind === "confirm" ? false : null)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
            >
              {current.cancelLabel || "Hủy"}
            </button>
          )}
          <button
            type="button"
            autoFocus={current.kind !== "prompt"}
            onClick={() =>
              closeWith(
                current.kind === "confirm" ? true : current.kind === "prompt" ? inputVal : undefined
              )
            }
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white shadow-xs cursor-pointer ${
              current.danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {current.confirmLabel || "Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  );
}
