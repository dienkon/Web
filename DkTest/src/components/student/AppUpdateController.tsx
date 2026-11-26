import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import {
  ArrowRight,
  Download,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { isNativeAndroid } from "../../services/offline/sync";
import {
  clearSkippedAppVersion,
  fetchLatestAppReleaseMetadata,
  getInstalledAppVersionInfo,
  performSafeWebAppUpdate,
  resolveApkUpdateActionUrl,
  shouldPromptForAppUpdate,
  type RemoteAppReleaseMetadata,
} from "../../services/appUpdateService";

const CHECK_THROTTLE_MS = 10 * 60 * 1000;

export default function AppUpdateController() {
  const [availableUpdate, setAvailableUpdate] = useState<RemoteAppReleaseMetadata | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [updatingWeb, setUpdatingWeb] = useState(false);
  const [checkingAgain, setCheckingAgain] = useState(false);
  const lastCheckAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  const installed = getInstalledAppVersionInfo();
  const nativeAndroid = isNativeAndroid();
  const platform: "android" | "web" = nativeAndroid ? "android" : "web";

  const runCheck = async (force = false) => {
    if (inFlightRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const now = Date.now();
    if (!force && now - lastCheckAtRef.current < CHECK_THROTTLE_MS) return;

    inFlightRef.current = true;
    lastCheckAtRef.current = now;
    try {
      const remote = await fetchLatestAppReleaseMetadata();
      if (!remote) return;
      if (
        shouldPromptForAppUpdate(installed, remote, null, {
          platform,
          enforceMandatory: true,
        })
      ) {
        clearSkippedAppVersion();
        setAvailableUpdate(remote);
        setIsOpen(true);
      }
    } catch {
      // Silent fail when offline or backend unreachable
    } finally {
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialTimer = setTimeout(() => {
      if (mounted) void runCheck(true);
    }, 1200);

    const handleOnline = () => {
      if (mounted) void runCheck(false);
    };
    const handleVisibility = () => {
      if (mounted && document.visibilityState === "visible") {
        void runCheck(false);
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    let appStateListener: Promise<{ remove: () => Promise<void> }> | undefined;
    if (nativeAndroid) {
      try {
        appStateListener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (mounted && isActive) void runCheck(false);
        });
      } catch {}
    }

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      void appStateListener?.then((l) => l.remove()).catch(() => {});
    };
  }, [installed.version, installed.androidVersionCode, nativeAndroid]);

  if (!isOpen || !availableUpdate) {
    return null;
  }

  const targetUrl = resolveApkUpdateActionUrl(availableUpdate);
  const displayVersion = nativeAndroid
    ? availableUpdate.apkVersion || availableUpdate.version
    : availableUpdate.version;

  const handleStartAndroidUpdate = () => {
    setDownloadStarted(true);
    try {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = targetUrl;
    }
  };

  const handleStartWebUpdate = async () => {
    setUpdatingWeb(true);
    await performSafeWebAppUpdate();
  };

  const handleRecheck = async () => {
    setCheckingAgain(true);
    try {
      await runCheck(true);
    } finally {
      setCheckingAgain(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dktest-app-update-title"
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Mandatory Update Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-blue-600 to-indigo-600" />

        <div className="flex items-start gap-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            {nativeAndroid ? <Smartphone className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3" />
              <span>Bắt buộc cập nhật phiên bản mới</span>
            </span>
            <h2
              id="dktest-app-update-title"
              className="text-base sm:text-lg font-black text-slate-900 mt-1"
            >
              Cập nhật lên DkTEST v{displayVersion}
            </h2>
          </div>
        </div>

        {/* Version Comparison Pill */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Đang dùng</div>
            <div className="font-extrabold text-slate-700">
              v{installed.version}
              {nativeAndroid && (
                <span className="font-normal text-slate-400"> (Code {installed.androidVersionCode})</span>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="text-right">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Bản bắt buộc</div>
            <div className="font-black text-blue-700">
              v{displayVersion}
              {nativeAndroid && availableUpdate.androidVersionCode > 0 && (
                <span className="font-semibold text-blue-500">
                  {" "}
                  (Code {availableUpdate.androidVersionCode})
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Hệ thống đã phát hành bản cập nhật mới quan trọng để đảm bảo đồng bộ dữ liệu, tính năng mới và bảo mật. Vui lòng cập nhật ngay để tiếp tục sử dụng DkTEST.
        </p>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Thông tin đăng nhập tài khoản, đề thi offline và bài làm lưu nháp đều được bảo toàn trên thiết bị — <strong>không cần đăng nhập lại sau khi cập nhật</strong>.
          </span>
        </div>

        {nativeAndroid && downloadStarted && (
          <div className="px-3 py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-900 space-y-1">
            <div>
              Đang tải <strong>{availableUpdate.apkFileName || `DkTEST-${displayVersion}-debug.apk`}</strong>. Khi tải xong, mở tệp và chọn <strong>Cập nhật (Update)</strong> để cài đè trực tiếp.
            </div>
            <div className="text-[10px] text-blue-700">
              Lưu ý: Nếu bạn đang cập nhật từ bản cũ (≤ v2.0.5) ký bằng khóa tạm cũ và Android báo xung đột gói, chỉ cần gỡ bản cũ 1 lần duy nhất rồi cài bản mới; từ v2.0.6 trở đi mọi bản cập nhật sẽ cài đè trực tiếp không lỗi!
            </div>
          </div>
        )}

        {/* Mandatory Actions — No Dismiss / Skip Allowed */}
        <div className="space-y-2 pt-1">
          {nativeAndroid ? (
            <button
              type="button"
              onClick={handleStartAndroidUpdate}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Cập nhật bắt buộc ngay (Tải APK v{displayVersion})</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={updatingWeb}
              onClick={() => void handleStartWebUpdate()}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${updatingWeb ? "animate-spin" : ""}`} />
              <span>
                {updatingWeb
                  ? "Đang tải phiên bản mới..."
                  : `Cập nhật lên v${displayVersion} ngay`}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={checkingAgain}
            onClick={() => void handleRecheck()}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingAgain ? "animate-spin" : ""}`} />
            <span>Kiểm tra lại trạng thái phiên bản</span>
          </button>
        </div>
      </div>
    </div>
  );
}
