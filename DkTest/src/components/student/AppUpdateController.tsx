import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { ArrowRight, Download, ShieldCheck, Smartphone, Sparkles, X } from "lucide-react";
import { isNativeAndroid } from "../../services/offline/sync";
import {
  fetchLatestAppReleaseMetadata,
  getInstalledAppVersionInfo,
  resolveApkUpdateActionUrl,
  setSkippedAppVersion,
  shouldPromptForAppUpdate,
  type RemoteAppReleaseMetadata,
} from "../../services/appUpdateService";

const CHECK_THROTTLE_MS = 15 * 60 * 1000;

export default function AppUpdateController() {
  const [availableUpdate, setAvailableUpdate] = useState<RemoteAppReleaseMetadata | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const sessionDismissedRef = useRef<string | null>(null);
  const lastCheckAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  const installed = getInstalledAppVersionInfo();

  useEffect(() => {
    if (!isNativeAndroid()) return;
    let mounted = true;

    const runCheck = async (force = false) => {
      if (!mounted || inFlightRef.current) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const now = Date.now();
      if (!force && now - lastCheckAtRef.current < CHECK_THROTTLE_MS) return;

      inFlightRef.current = true;
      lastCheckAtRef.current = now;
      try {
        const remote = await fetchLatestAppReleaseMetadata();
        if (!mounted || !remote) return;
        if (shouldPromptForAppUpdate(installed, remote, sessionDismissedRef.current)) {
          setAvailableUpdate(remote);
          setDownloadStarted(false);
          setIsOpen(true);
        }
      } catch {
        // Silent fail: never disrupt offline or exam flows
      } finally {
        inFlightRef.current = false;
      }
    };

    const initialTimer = setTimeout(() => {
      void runCheck(true);
    }, 1200);

    const handleOnline = () => {
      void runCheck(false);
    };
    window.addEventListener("online", handleOnline);

    let appStateListener: Promise<{ remove: () => Promise<void> }> | undefined;
    try {
      appStateListener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void runCheck(false);
      });
    } catch {}

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      window.removeEventListener("online", handleOnline);
      void appStateListener?.then((l) => l.remove()).catch(() => {});
    };
  }, [installed.version, installed.androidVersionCode]);

  if (!isNativeAndroid() || !isOpen || !availableUpdate) {
    return null;
  }

  const targetUrl = resolveApkUpdateActionUrl(availableUpdate);
  const displayVersion = availableUpdate.apkVersion || availableUpdate.version;

  const handleDismissForSession = () => {
    sessionDismissedRef.current = availableUpdate.version;
    setIsOpen(false);
  };

  const handleSkipThisVersion = () => {
    setSkippedAppVersion(availableUpdate.version);
    sessionDismissedRef.current = availableUpdate.version;
    setIsOpen(false);
  };

  const handleStartDownload = () => {
    setDownloadStarted(true);
    try {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = targetUrl;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dktest-app-update-title"
      className="fixed inset-0 z-[9998] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Bright DKTEST Blue Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Cập nhật ứng dụng</span>
              </span>
              <h2 id="dktest-app-update-title" className="text-base sm:text-lg font-black text-slate-900 mt-1">
                Đã có DkTEST v{displayVersion}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissForSession}
            aria-label="Đóng thông báo cập nhật"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Comparison Pill */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Phiên bản hiện tại</div>
            <div className="font-extrabold text-slate-700">
              v{installed.version} <span className="font-normal text-slate-400">(Code {installed.androidVersionCode})</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="text-right">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Phiên bản mới nhất</div>
            <div className="font-black text-blue-700">
              v{displayVersion}{" "}
              {availableUpdate.androidVersionCode > 0 && (
                <span className="font-semibold text-blue-500">(Code {availableUpdate.androidVersionCode})</span>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Phiên bản mới bổ sung nâng cấp giao diện Khóa học, sửa lỗi hiệu năng và tối ưu tốc độ tải. Bạn có thể cập nhật ngay hoặc bỏ qua nếu đang bận làm bài.
        </p>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Toàn bộ đề thi offline đã tải và bài làm lưu nháp trên máy vẫn được giữ nguyên khi cài đè bản mới.</span>
        </div>

        {downloadStarted && (
          <div className="px-3 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-800">
            Đang mở trình tải tệp <strong>{availableUpdate.apkFileName || `DkTEST-${displayVersion}-debug.apk`}</strong>. Sau khi tải xong, hãy mở tệp trên thanh thông báo Android và chọn <strong>Cài đặt / Cập nhật</strong>.
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleStartDownload}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
          >
            <Download className="w-4 h-4" />
            <span>Cập nhật ngay (Tải APK v{displayVersion})</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDismissForSession}
              className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={handleSkipThisVersion}
              className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
            >
              Bỏ qua bản này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
