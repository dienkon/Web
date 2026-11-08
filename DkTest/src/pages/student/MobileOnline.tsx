import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnline } from '../../hooks/useOnline';
import MobileExamTabs from '../../components/student/MobileExamTabs';
import { findMobileExamByCode, getRecentMobileExams } from '../../services/offline/catalog';
import type { Exam } from '../../types';

export default function MobileOnline() {
  const online = useOnline();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Exam[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [found, setFound] = useState<string | null>(null);
  const reload = useCallback(async (force = false) => {
    if (!user || !navigator.onLine) return;
    setBusy(true); setError('');
    try { setItems(await getRecentMobileExams(force)); }
    catch { setError('Không tải được 5 đề mới nhất. Hãy thử làm mới; các đề đã tải vẫn ở tab Offline.'); }
    finally { setBusy(false); }
  }, [user?.uid]);
  useEffect(() => { if (!loading && online) void reload(); }, [reload, loading, online]);
  if (!online) return <Navigate to="/student/offline" replace />;
  if (found) return <Navigate to={`/student/exam/${found}`} />;
  return <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-4">
    <MobileExamTabs /><div className="flex items-center justify-between gap-3"><h1 className="font-bold text-2xl">Đề thi Online</h1><button disabled={busy || !user} className="text-blue-600 disabled:opacity-40" onClick={() => void reload(true)}>Làm mới</button></div>
    <p className="text-slate-500 text-sm">5 đề được chỉnh sửa gần nhất. Mở thông tin đề để thiết lập bài thi hoặc tải về làm offline.</p>
    {!user && !loading && <Link to="/login?redirect=/student/online" className="text-blue-600 underline">Đăng nhập thí sinh</Link>}
    {busy && <p role="status">Đang tải…</p>}{error && <p role="alert" className="text-red-600">{error}</p>}
    {user && <form className="flex gap-2" onSubmit={async (event) => {
      event.preventDefault(); if (!code.trim() || busy) return;
      setBusy(true); setError('');
      try { const id = items.find((item) => item.code === code.trim() || item.id === code.trim())?.id || await findMobileExamByCode(code); if (id) setFound(id); else setError('Không tìm thấy mã đề đã phát hành.'); }
      catch { setError('Chưa tìm được mã đề. Hãy thử lại khi có kết nối ổn định.'); }
      finally { setBusy(false); }
    }}><input aria-label="Tìm mã đề" className="border rounded-lg px-3 py-2 min-w-0 flex-1 dark:bg-slate-800" placeholder="Tìm đề khác bằng mã đề" value={code} onChange={(e) => setCode(e.target.value)} /><button className="bg-blue-600 text-white rounded-lg px-4 disabled:opacity-40" disabled={busy}>Tìm đề</button></form>}
    <section className="space-y-3" aria-label="5 đề vừa chỉnh sửa">{items.map((exam) => <article className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2" key={exam.id}><h2 className="font-bold">{exam.title}</h2><p className="text-sm text-slate-500">{exam.code} · {exam.subject} · {exam.accessMode === 'paid' || Number(exam.priceVnd) > 0 ? `${Number(exam.priceVnd || 0).toLocaleString('vi-VN')}đ` : 'Miễn phí'}</p><Link className="inline-block text-blue-600 font-semibold" to={`/student/exam/${exam.id}`}>Xem thông tin đề</Link></article>)}{!busy && user && !items.length && !error && <p>Chưa có đề được phát hành.</p>}</section>
  </main>;
}
