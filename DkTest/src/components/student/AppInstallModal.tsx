import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  PlusSquare,
  Share,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { getAppVersionMetadata, isIosDevice } from "../../services/appLinks";

interface AppInstallModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "ios" | "android";
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  open,
  onClose,
  defaultTab,
}) => {
  const [tab, setTab] = useState<"ios" | "android">(
    () => defaultTab || (isIosDevice() ? "ios" : "android")
  );
  const [profileDownloaded, setProfileDownloaded] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(defaultTab || (isIosDevice() ? "ios" : "android"));
      setProfileDownloaded(false);
    }
  }, [open, defaultTab]);

  if (!open) return null;

  const meta = getAppVersionMetadata();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Tải ứng dụng DkTEST cho iOS và Android"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg my-auto overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/images/ios-app-icon-180.png"
              alt="DkTEST App"
              className="w-11 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
                  Tải ứng dụng DkTEST
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black">
                  v{meta.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hỗ trợ đầy đủ iPhone / iPad (iOS) và điện thoại Android
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OS Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setTab("ios")}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === "ios"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span></span>
              <span>iOS (iPhone / iPad)</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("android")}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === "android"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Android (APK)</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {tab === "ios" ? (
            <>
              {/* Primary 1-Tap Profile Install */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                      Khuyên dùng • Cài ngay 15 giây
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                      Cách 1: Tải hồ sơ cài App iOS chuẩn (.mobileconfig)
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Tạo biểu tượng DkTEST toàn màn hình ngay trên Màn hình chính iPhone/iPad, không cần App Store, gỡ bỏ dễ dàng bất cứ lúc nào.
                    </p>
                  </div>
                </div>

                <a
                  href={meta.iosProfileUrl}
                  onClick={() => setProfileDownloaded(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải App iOS v{meta.version} (.mobileconfig)</span>
                </a>

                {profileDownloaded && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>
                      Đã bắt đầu tải hồ sơ <b>{meta.iosProfileFileName}</b>. Hãy bấm <b>Cho phép</b> trên Safari, sau đó mở <b>Cài đặt → Đã tải về hồ sơ → Cài đặt</b>.
                    </span>
                  </div>
                )}

                <ol className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/70 rounded-xl p-3 border border-blue-100 dark:border-blue-900/50">
                  <li>
                    <b>Bước 1:</b> Mở bằng trình duyệt <b>Safari</b> → bấm nút tải phía trên → chọn <b>Cho phép (Allow)</b>.
                  </li>
                  <li>
                    <b>Bước 2:</b> Vào ứng dụng <b>Cài đặt (Settings)</b> → chọn dòng <b>Đã tải về hồ sơ (Profile Downloaded)</b> ở ngay đầu màn hình.
                  </li>
                  <li>
                    <b>Bước 3:</b> Bấm <b>Cài đặt (Install)</b> ở góc trên phải → biểu tượng <b>DkTEST</b> sẽ xuất hiện ngay trên Màn hình chính!
                  </li>
                </ol>
              </div>

              {/* Method 2: Safari Add to Home Screen */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h3 className="text-xs font-black text-slate-900 dark:text-white">
                  Cách 2: Thêm nhanh qua Safari (không cần tải tệp)
                </h3>
                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Share className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Chạm biểu tượng <b>Chia sẻ</b> ở thanh công cụ dưới cùng của Safari.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlusSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Cuộn xuống chọn <b>Thêm vào MH chính (Add to Home Screen)</b> → bấm <b>Thêm</b>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Method 3: Native IPA package for Sideloading */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Bản đóng gói Native iOS (.IPA)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dành cho máy cài qua AltStore / Sideloadly / TrollStore hoặc tự ký bằng Apple Developer.
                  </p>
                </div>
                <a
                  href={meta.iosIpaDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tải .IPA</span>
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-3">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                    DkTEST Android v{meta.version} • Build {meta.androidVersionCode}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                    Cài đặt ứng dụng Android APK chính thức
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Hỗ trợ tải đề thi về máy làm bài offline, thông báo sự kiện trực tiếp và mở link đề thi siêu nhanh.
                  </p>
                </div>

                <a
                  href={`${meta.downloadUrl}?platform=android`}
                  download={meta.apkFileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải tệp cài đặt APK ({meta.apkFileName})</span>
                </a>

                <ol className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/70 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/50">
                  <li>
                    <b>Bước 1:</b> Bấm nút tải màu xanh để tải tệp <code>.apk</code> về máy Android.
                  </li>
                  <li>
                    <b>Bước 2:</b> Mở tệp vừa tải từ thanh thông báo → chọn <b>Cài đặt</b> (cho phép cài từ trình duyệt nếu máy hỏi).
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Phát hành trực tiếp từ kho chính thức DkTEST
                </span>
                <a
                  href={meta.releasesPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  <span>GitHub Releases</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
