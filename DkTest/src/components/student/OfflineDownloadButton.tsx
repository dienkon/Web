import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOnline } from '../../hooks/useOnline';
import { requireOfflineDownloadAccess } from '../../services/offline/access';
import { downloadOfflineExam } from '../../services/offline/exams';
import type { Exam } from '../../types';
export default function OfflineDownloadButton({ exam, refreshKey = '' }: { exam: Exam; refreshKey?: string }) {
  const { user, userProfile } = useAuth();
  const online = useOnline();
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true; setAllowed(false); setMessage('');
    if (online && user && userProfile?.role === 'student' && exam.status === 'published') {
      void requireOfflineDownloadAccess(user.uid, exam).then(() => { if (active) setAllowed(true); }).catch(() => {});
    }
    return () => { active = false; };
  }, [user?.uid, userProfile?.role, online, exam.id, refreshKey]);
  if (!online) return null;
  if (!allowed) return message ? <p role="alert" className="text-red-600 text-sm">{message}</p> : null;
  return <div className="rounded-2xl border border-blue-200 p-4 space-y-2"><button type="button" className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold disabled:opacity-40" disabled={busy} onClick={async () => {
    setBusy(true); setMessage('');
    try { await downloadOfflineExam(exam.id, setMessage); setMessage('Đã tải đầy đủ. Mở tab Offline để thiết lập và làm bài.'); }
    catch (error: any) { setMessage(error?.message || 'Không tải được đề.'); setAllowed(false); }
    finally { setBusy(false); }
  }}>{busy ? 'Đang tải đề…' : 'Tải đề về máy'}</button>{message && <p role="status" className="text-sm">{message}</p>}</div>;
}
