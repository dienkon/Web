import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { useAuth } from '../../context/AuthContext';
import { isNativeAndroid, syncOfflineSubmissions } from '../../services/offline/sync';

export default function OfflineSyncController() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const sync = () => { void syncOfflineSubmissions(); };
    sync();
    window.addEventListener('online', sync);
    const visible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(sync, isNativeAndroid() ? 15000 : 30000);
    const network = isNativeAndroid() ? Network.addListener('networkStatusChange', sync) : undefined;
    const resume = isNativeAndroid() ? App.addListener('appStateChange', ({ isActive }) => { if (isActive) sync(); }) : undefined;
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', visible);
      void network?.then((listener) => listener.remove());
      void resume?.then((listener) => listener.remove());
    };
  }, [user?.uid]);
  return null;
}
