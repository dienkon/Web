import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { useAuth } from '../../context/AuthContext';
import { appRouteFromUrl } from '../../services/appLinks';
import { hasActiveExamInProgress } from '../../services/examSessionService';
import { offlineStore } from '../../services/offline/store';
import { isNativeAndroid } from '../../services/offline/sync';

export default function NativeAppLinks({ navigate }: { navigate: (route: string) => void }) {
  const { user, loading } = useAuth();
  const [pending, setPending] = useState<string>();
  const last = useRef({ url: '', at: 0 });
  useEffect(() => {
    if (!isNativeAndroid()) return;
    let active = true;
    let eventArrived = false;
    const receive = (url: string) => {
      if (!active || !appRouteFromUrl(url)) return;
      if (last.current.url === url && Date.now() - last.current.at < 1000) return;
      last.current = { url, at: Date.now() }; setPending(url);
    };
    const listener = App.addListener('appUrlOpen', ({ url }) => { eventArrived = true; receive(url); });
    void listener.then(async () => {
      if (!active) return;
      const initial = await App.getLaunchUrl();
      if (!eventArrived && initial?.url) receive(initial.url);
    }).catch(() => { /* Unsupported bridge versions continue with regular navigation. */ });
    return () => { active = false; void listener.then((handle) => handle.remove()).catch(() => {}); };
  }, []);
  useEffect(() => {
    if (loading || !pending) return;
    let active = true;
    void (async () => {
      let route = appRouteFromUrl(pending);
      if (!route) { setPending(undefined); return; }
      const attempt = hasActiveExamInProgress(undefined, true);
      if (attempt) {
        const offlineAttempt = !navigator.onLine || new URLSearchParams(window.location.search).get('offline') === '1';
        route = `/student/exam/${encodeURIComponent(attempt.examId)}/take${offlineAttempt ? '?offline=1' : ''}`;
      } else if (!navigator.onLine) {
        const examId = /^\/student\/exam\/([^/]+)$/.exec(route)?.[1];
        if (examId) {
          const packs = user ? await offlineStore.listExams(user.uid) : [];
          const pack = packs.find((item) => item.exam.id === decodeURIComponent(examId) || item.exam.code?.toUpperCase() === decodeURIComponent(examId).toUpperCase());
          route = pack ? `/student/offline/exam/${encodeURIComponent(pack.exam.id)}` : '/student/offline';
        }
      }
      if (active) { setPending(undefined); navigate(route); }
    })().catch(() => { if (active) { setPending(undefined); navigate('/student/offline'); } });
    return () => { active = false; };
  }, [pending, loading, user?.uid, navigate]);
  return null;
}
