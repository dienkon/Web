import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Smartphone } from 'lucide-react';
import { isNativeAndroid } from '../../services/offline/sync';
import {
  APP_LINK_ORIGIN,
  androidIntentForUrl,
  getAppVersionMetadata,
  isIosDevice,
  isStandalonePwa,
} from '../../services/appLinks';
import { AppInstallModal } from './AppInstallModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function OpenInAppBanner() {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [pwaPromptEvent, setPwaPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPwaPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (
    dismissed ||
    isNativeAndroid() ||
    isStandalonePwa() ||
    new URLSearchParams(location.search).get('dktest_web') === '1'
  ) {
    return null;
  }

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIos = isIosDevice();

  if (!isAndroid && !isIos) {
    return null;
  }

  const meta = getAppVersionMetadata();

  // iOS Banner (iPhone / iPad)
  if (isIos) {
    return (
      <>
        <aside
          aria-label="Cài đặt DkTEST trên iOS"
          className="mx-3 sm:mx-4 mt-3 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/70 bg-gradient-to-r from-blue-50 to-indigo-50/80 dark:from-blue-950/60 dark:to-indigo-950/50 text-blue-950 dark:text-blue-100 shadow-2xs space-y-2 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs text-base font-black">
              
            </div>
            <div className="flex-1 min-w-44">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm">Ứng dụng DkTEST iOS</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600/10 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-[10px] font-black">
                  v{meta.version}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-800/80 dark:text-blue-200/80 mt-0.5">
                Cài ứng dụng toàn màn hình cho iPhone / iPad chỉ với 1 chạm (không cần App Store).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <a
                href={meta.iosProfileUrl}
                onClick={() => setDownloadStarted(true)}
                className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Tải App iOS v{meta.version}</span>
              </a>

              <button
                type="button"
                onClick={() => setIosModalOpen(true)}
                className="bg-white/90 dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
              >
                Hướng dẫn cài
              </button>

              <button
                type="button"
                className="text-blue-800 dark:text-blue-300 underline text-xs px-1 cursor-pointer"
                onClick={() => setDismissed(true)}
              >
                Dùng bản web
              </button>
            </div>
          </div>

          {downloadStarted && (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
              Đã tải hồ sơ <strong>{meta.iosProfileFileName}</strong> — bấm <b>Cho phép</b> trên Safari → mở <b>Cài đặt → Đã tải về hồ sơ → Cài đặt</b> để thêm App DkTEST ra màn hình chính.
            </div>
          )}
        </aside>

        <AppInstallModal
          open={iosModalOpen}
          onClose={() => setIosModalOpen(false)}
          defaultTab="ios"
        />
      </>
    );
  }

  // Android Banner
  const intent = androidIntentForUrl(`${APP_LINK_ORIGIN}${location.pathname}${location.search}${location.hash}`);
  if (!intent) return null;

  const { version, androidVersionCode, apkFileName, downloadUrl } = meta;

  return (
    <aside
      aria-label="Mở DkTEST trên Android"
      className="mx-3 sm:mx-4 mt-3 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/70 bg-gradient-to-r from-blue-50 to-indigo-50/80 dark:from-blue-950/60 dark:to-indigo-950/50 text-blue-950 dark:text-blue-100 shadow-2xs space-y-2 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Smartphone size={18} />
        </div>
        <div className="flex-1 min-w-44">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-xs sm:text-sm">Ứng dụng DkTEST Android</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-600/10 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-[10px] font-black">
              v{version} (Code {androidVersionCode})
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-blue-800/80 dark:text-blue-200/80 mt-0.5">
            Tải file cài đặt APK thi offline hoặc mở trực tiếp bằng app nếu máy đã cài.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <a
            href={`${downloadUrl}?platform=android`}
            download={apkFileName}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDownloadStarted(true)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Tải App v{version} (APK)</span>
          </a>

          <a
            href={intent}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-xl text-xs text-center transition-colors"
          >
            Mở trong app
          </a>

          {pwaPromptEvent && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await pwaPromptEvent.prompt();
                  await pwaPromptEvent.userChoice;
                } catch {}
                setPwaPromptEvent(null);
              }}
              className="px-2.5 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-white/80 dark:bg-slate-900 text-blue-800 dark:text-blue-200 text-xs font-bold"
            >
              Cài nhanh Web App
            </button>
          )}

          <button
            type="button"
            className="text-blue-800 dark:text-blue-300 underline text-xs px-1 cursor-pointer"
            onClick={() => setDismissed(true)}
          >
            Dùng bản web
          </button>
        </div>
      </div>

      {downloadStarted && (
        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
          Đang tải <strong>{apkFileName}</strong> — mở tệp vừa tải về trên thanh thông báo Android và chọn Cài đặt.
        </div>
      )}
    </aside>
  );
}
