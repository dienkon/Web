import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth, app } from '../firebase/config';
import { uploadOfflineSubmission } from './firestoreRest';
import { offlineStore, type LocalSubmission } from './store';
import type { Submission } from '../../types';

interface NativeQueue {
  setSession(data: { uid: string; refreshToken: string; apiKey: string; projectId: string }): Promise<void>;
  clearSession(): Promise<void>;
  enqueue(data: { id: string; uid: string; submission: Submission; savedAt: number }): Promise<void>;
  status(): Promise<{ items: { id: string; uid: string; state: LocalSubmission['state']; error?: string }[] }>;
  schedule(): Promise<void>;
}
const native = registerPlugin<NativeQueue>('OfflineSync');
export const isNativeAndroid = () => Capacitor.getPlatform() === 'android';
export const notifyOfflineChange = () => window.dispatchEvent(new Event('dktest-offline-change'));

let sessionEpoch = 0;
let blockedUid: string | undefined;
export function enableNativeSyncSession(uid: string) { if (blockedUid === uid) blockedUid = undefined; }
export async function clearNativeSyncSession() {
  sessionEpoch++;
  blockedUid = auth.currentUser?.uid;
  if (isNativeAndroid()) await native.clearSession();
}

export async function queueSubmission(submission: Submission) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Hãy đăng nhập lại tài khoản đã tải đề. Bài làm vẫn được giữ trên máy.');
  const value = await offlineStore.enqueue({
    id: submission.id, uid, submission: { ...submission, studentUid: uid } as Submission,
    state: 'pending', savedAt: Date.now(),
  });
  // IndexedDB acknowledgement is required before the exam page may clear its draft.
  // Native queue is a second durable copy and supports sync after the WebView closes.
  if (isNativeAndroid()) {
    await native.enqueue({ id: value.id, uid, submission: value.submission, savedAt: value.savedAt });
  }
  notifyOfflineChange();
  void syncOfflineSubmissions();
  return value.submission;
}

let syncing: Promise<void> | undefined;
export function syncOfflineSubmissions(): Promise<void> {
  if (syncing) return syncing;
  syncing = synchronize().catch((error) => {
    console.warn('[OfflineSync] Bài làm vẫn lưu trên máy:', error?.message);
  }).finally(() => { syncing = undefined; });
  return syncing;
}

async function synchronize() {
  const user = auth.currentUser;
  const epoch = sessionEpoch;
  if (!user || user.uid === blockedUid) return;
  const records = await offlineStore.listSubmissions(user.uid);
  if (isNativeAndroid()) {
    if (epoch !== sessionEpoch || auth.currentUser?.uid !== user.uid) return;
    await native.setSession({ uid: user.uid, refreshToken: user.refreshToken, apiKey: app.options.apiKey!, projectId: app.options.projectId! });
    if (epoch !== sessionEpoch || auth.currentUser?.uid !== user.uid) { await native.clearSession(); return; }
    // Reconcile ACKs before enqueueing, including work completed while the app was closed.
    const status = await native.status();
    for (const item of status.items) {
      if (item.uid === user.uid) await offlineStore.mark(item.id, item.state, item.error);
    }
    const current = await offlineStore.listSubmissions(user.uid);
    for (const value of current.filter((s) => s.state !== 'synced')) {
      await native.enqueue({ id: value.id, uid: user.uid, submission: value.submission, savedAt: value.savedAt });
    }
    await native.schedule();
  } else if (navigator.onLine) {
    for (const value of records.filter((s) => s.state !== 'synced')) {
      if (auth.currentUser?.uid !== user.uid) break;
      try {
        const token = await user.getIdToken();
        if (auth.currentUser?.uid !== user.uid) break;
        await uploadOfflineSubmission(app.options.projectId!, token, value);
        await offlineStore.mark(value.id, 'synced');
      } catch (error: any) {
        await offlineStore.mark(value.id, 'error', error?.message || 'Chưa gửi được. Hệ thống sẽ tự thử lại.');
      }
    }
  }
  notifyOfflineChange();
}
