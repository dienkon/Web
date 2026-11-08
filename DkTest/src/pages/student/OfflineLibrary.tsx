import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Wifi, WifiOff, Play, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { offlineStore, type OfflineExam, type LocalSubmission } from '../../services/offline/store';
import { downloadOfflineExam } from '../../services/offline/exams';
import { syncOfflineSubmissions } from '../../services/offline/sync';
import { getExamList } from '../../services/examService';
import type { Exam } from '../../types';

export default function OfflineLibrary() {
  const { user, userProfile, loading } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [packs, setPacks] = useState<OfflineExam[]>([]);
  const [submissions, setSubmissions] = useState<LocalSubmission[]>([]);
  const [catalog, setCatalog] = useState<Exam[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const refresh = useCallback(async () => {
    if (!user) { setPacks([]); setSubmissions([]); return; }
    try {
      const [exams, attempts] = await Promise.all([offlineStore.listExams(user.uid), offlineStore.listSubmissions(user.uid)]);
      setPacks(exams.sort((a, b) => b.downloadedAt - a.downloadedAt));
      setSubmissions(attempts.sort((a, b) => b.savedAt - a.savedAt));
    } catch { setError('Không đọc được kho offline. Kiểm tra dung lượng và quyền lưu trữ của ứng dụng.'); }
  }, [user?.uid]);
  useEffect(() => {
    void refresh();
    const connection = () => setOnline(navigator.onLine);
    const changed = () => { void refresh(); };
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    window.addEventListener('dktest-offline-change', changed);
    return () => {
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      window.removeEventListener('dktest-offline-change', changed);
    };
  }, [refresh]);
  const loadCatalog = useCallback(async () => {
    if (!navigator.onLine || !user) return;
    try {
      const result = await getExamList({ pageSize: 10000, forceRefresh: true });
      setCatalog(result.items.filter((e) => !e.status || e.status === 'published'));
    } catch { setError('Chưa tải được danh sách mới. Các đề đã lưu vẫn làm được bình thường.'); }
  }, [user?.uid]);
  useEffect(() => { if (online) void loadCatalog(); }, [online, loadCatalog]);

  async function download(id: string) {
    setError(''); setBusy(id);
    try { await downloadOfflineExam(id, setMessage); await refresh(); setMessage('Đã tải đủ đề và tài nguyên. Bạn có thể làm bài khi không có mạng.'); }
    catch (e: any) { setError(e?.message || 'Không tải được đề. Bản đã lưu trước đó vẫn được giữ.'); setMessage(''); }
    finally { setBusy(''); }
  }
  async function downloadByCode() {
    const value = code.trim();
    const exam = catalog.find((e) => e.code?.toLowerCase() === value.toLowerCase() || e.id === value);
    if (exam) return download(exam.id);
    if (/^[a-zA-Z0-9_-]+$/.test(value)) return download(value);
    setError('Chưa tìm thấy mã đề. Hãy làm mới danh sách khi có mạng hoặc nhập ID đề.');
  }
  const pending = submissions.filter((s) => s.state !== 'synced');
  if (loading) return <div className="p-8">Đang mở tài khoản đã lưu…</div>;
  if (!user || userProfile?.role !== 'student') return <div className="max-w-lg mx-auto p-6 space-y-4"><h1 className="text-2xl font-bold">DkTEST Offline</h1><p>Đăng nhập tài khoản thí sinh một lần khi có mạng, rồi tải các đề muốn làm offline.</p><Link className="text-blue-600 underline" to="/login?redirect=/student/offline">Đăng nhập thí sinh</Link></div>;
  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
      <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold">Đề thi trên máy</h1><span className="flex items-center gap-2 text-sm">{online ? <Wifi size={18} /> : <WifiOff size={18} />}{online ? 'Có mạng' : 'Offline'}</span></div>
        <p>Xin chào {userProfile.displayName}. Đề đã tải có thể mở và làm bài ngay cả khi tắt mạng, đóng rồi mở lại app.</p>
        <p className="text-sm text-slate-300">AI, cộng đồng và quản trị cần mạng. Điểm offline là điểm tạm tính; câu tự luận cần giáo viên chấm sẽ chờ xử lý.</p>
        <div className="flex flex-wrap items-center gap-3 text-sm"><span>{pending.length ? `${pending.length} bài chờ đồng bộ` : 'Không có bài chờ gửi'}</span><button className="flex items-center gap-1 underline disabled:opacity-40" disabled={!online} onClick={() => void syncOfflineSubmissions()}><RefreshCw size={15} />Đồng bộ ngay</button><Link to="/exams" className="underline">Kho đề trực tuyến</Link></div>
      </div>
      {message && <p role="status" className="rounded-xl bg-blue-50 text-blue-800 p-3">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-3">{error}</p>}
      <section className="space-y-3"><h2 className="font-bold text-lg">Đã tải đầy đủ ({packs.length})</h2>
        {!packs.length && <p className="text-slate-500">Chưa có đề trên máy. Kết nối mạng và chọn “Tải về máy” bên dưới trước khi làm offline.</p>}
        {packs.map((pack) => <article key={pack.key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h3 className="font-bold">{pack.exam.title}</h3><p className="text-sm text-slate-500">{pack.questions.length} câu · {pack.exam.timeLimit || pack.exam.duration || 'Không giới hạn'} phút · Tải {new Date(pack.downloadedAt).toLocaleString('vi-VN')}</p>
          <div className="flex flex-wrap gap-3 items-center"><Link className="bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center gap-2" to={`/student/exam/${pack.exam.id}/take?offline=1`}><Play size={16} />Mở / tiếp tục làm bài</Link>
            <button disabled={!online || !!busy} className="text-blue-600 disabled:opacity-40" onClick={() => void download(pack.exam.id)}>Cập nhật đề</button>
            <button title="Xóa bản đề đã tải" disabled={!!busy} onClick={async () => { if (window.confirm('Xóa bản đề đã tải? Bài đã nộp và bài chờ gửi vẫn được giữ.')) { await offlineStore.deleteExam(user.uid, pack.exam.id); await refresh(); } }}><Trash2 size={17} /></button></div>
        </article>)}
      </section>
      <section className="space-y-3"><h2 className="font-bold text-lg">Bài làm đã lưu ({submissions.length})</h2>
        {submissions.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2"><Link className="font-semibold text-blue-600" to={`/student/exam/${item.submission.examId}/result/${item.id}?offline=1`}>{item.submission.examTitleSnapshot}</Link><p>{item.submission.score}/{item.submission.maxScore} · {new Date(item.savedAt).toLocaleString('vi-VN')}</p><p className={item.state === 'synced' ? 'text-emerald-600 text-sm' : 'text-amber-600 text-sm'}>{item.state === 'synced' ? <><CheckCircle2 className="inline mr-1" size={14} />Máy chủ đã nhận</> : item.error || 'Đã lưu trên máy, đang chờ gửi'}</p></article>)}
      </section>
      <section className="space-y-3"><div className="flex justify-between items-center"><h2 className="font-bold text-lg">Tải đề để làm offline</h2><button disabled={!online || !!busy} onClick={() => void loadCatalog()} className="text-blue-600 disabled:opacity-40">Làm mới</button></div>
        <p className="text-sm text-slate-500">Chỉ báo tải xong sau khi lưu đủ câu hỏi, hình ảnh và âm thanh. Đề có liên kết website bên ngoài cần mạng sẽ chưa thể tải đầy đủ.</p>
        <div className="flex gap-2"><input aria-label="Mã đề" className="flex-1 min-w-0 border rounded-lg px-3 py-2 dark:bg-slate-800" placeholder="Nhập mã đề" value={code} onChange={(e) => setCode(e.target.value)} /><button disabled={!online || !!busy} onClick={() => void downloadByCode()} className="bg-blue-600 text-white px-4 rounded-lg disabled:opacity-40">Tải đề</button></div>
        {catalog.map((exam) => <article key={exam.id} className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 py-3"><div><p className="font-semibold">{exam.title}</p><p className="text-xs text-slate-500">{exam.code} · {exam.subject}</p></div><button className="flex items-center gap-1 text-blue-600 shrink-0 disabled:opacity-40" disabled={!online || !!busy} onClick={() => void download(exam.id)}><Download size={16} />{busy === exam.id ? 'Đang tải…' : 'Tải về máy'}</button></article>)}
      </section>
    </main>
  );
}
