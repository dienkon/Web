import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { isNativeAndroid } from '../../services/offline/sync';
import { APP_LINK_ORIGIN, androidIntentForUrl } from '../../services/appLinks';

export default function OpenInAppBanner() {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || isNativeAndroid() || !/Android/i.test(navigator.userAgent) || new URLSearchParams(location.search).get('dktest_web') === '1') return null;
  const intent = androidIntentForUrl(`${APP_LINK_ORIGIN}${location.pathname}${location.search}${location.hash}`);
  if (!intent) return null;
  return <aside aria-label="Mở DkTEST trên Android" className="mx-4 mt-3 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-950 flex flex-wrap items-center gap-3 text-sm">
    <Smartphone size={20} /><span className="flex-1 min-w-32">Đã cài DkTEST? Mở trang này trong ứng dụng.</span>
    <a href={intent} className="bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg">Mở trong app</a>
    <button type="button" className="text-blue-800 underline text-xs" onClick={() => setDismissed(true)}>Dùng bản web</button>
  </aside>;
}
