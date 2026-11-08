import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { offlineStore, type OfflineExam } from '../../services/offline/store';
import { isNativeAndroid, syncOfflineSubmissions } from '../../services/offline/sync';
import { useOnline } from '../../hooks/useOnline';
import MobileExamTabs from '../../components/student/MobileExamTabs';

export default function OfflineLibrary() {
  const { user, userProfile, loading } = useAuth();
  const online = useOnline();
  const previousOnline = useRef(online);
  const navigate = useNavigate();
  const [packs, setPacks] = useState<OfflineExam[]>([]);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!user) { setPacks([]); setPending(0); return; }
    try {
      const [exams, attempts] = await Promise.all([offlineStore.listExams(user.uid), offlineStore.listSubmissions(user.uid)]);
      setPacks(exams.sort((a, b) => b.downloadedAt - a.downloadedAt)); setPending(attempts.filter((s) => s.state !== 'synced').length);
    } catch { setError('Không đọc được kho offline. Kiểm tra dung lượng thiết bị.'); }
  }, [user?.uid]);
  useEffect(() => {
    void refresh(); const changed = () => { void refresh(); };
    window.addEventListener('dktest-offline-change', changed);
    return () => window.removeEventListener('dktest-offline-change', changed);
  }, [refresh]);
  useEffect(() => {
    if (!previousOnline.current && online && isNativeAndroid()) navigate('/student/online', { replace: true });
    previousOnline.current = online;
  }, [online, navigate]);
  if (loading) return <div className="p-8">Đang mở tài khoản đã lưu…</div>;
  if (!user || userProfile?.role !== 'student') return <div className="max-w-lg mx-auto p-6 space-y-4"><MobileExamTabs /><h1 className="text-2xl font-bold">DkTEST Offline</h1><p>Đăng nhập khi có mạng và tải đề từ trang thông tin đề thi.</p><Link className="text-blue-600 underline" to="/login?redirect=/student/online">Đăng nhập thí sinh</Link></div>;
  return <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 pb-24"><MobileExamTabs /><h1 className="text-2xl font-bold">Đề thi trên máy</h1><p className="text-sm text-slate-500">Chỉ hiển thị các đề đã tải. Mở đề để thiết lập đề con hoặc tiếp tục bài đang làm.</p>
    <div className="flex flex-wrap items-center gap-3 text-sm"><span>{pending ? `${pending} bài chờ đồng bộ` : 'Không có bài chờ gửi'}</span><button disabled={!online} className="text-blue-600 disabled:opacity-40" onClick={() => void syncOfflineSubmissions()}>Đồng bộ ngay</button><Link className="text-blue-600" to="/student/history">Lịch sử bài làm</Link></div>
    {error && <p role="alert" className="text-red-600">{error}</p>}{!packs.length && <p>Chưa có đề trên máy. Khi có mạng, vào Online → Xem thông tin đề → Tải đề về máy.</p>}
    {packs.map((pack) => <article key={pack.key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"><h2 className="font-bold">{pack.exam.title}</h2><p className="text-sm text-slate-500">{pack.questions.length} câu · {pack.exam.timeLimit || pack.exam.duration ? `${pack.exam.timeLimit || pack.exam.duration} phút` : 'Không giới hạn thời gian'} · Tải {new Date(pack.downloadedAt).toLocaleString('vi-VN')}</p><div className="flex gap-4 items-center"><Link className="bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center gap-2" to={`/student/offline/exam/${pack.exam.id}`}><Play size={16} />Thiết lập / tiếp tục làm bài</Link><button title="Xóa bản đề đã tải" onClick={async () => { if (window.confirm('Xóa bản đề đã tải? Bài nháp và bài đã nộp vẫn được giữ.')) { await offlineStore.deleteExam(user.uid, pack.exam.id); await refresh(); } }}><Trash2 size={17} /></button></div></article>)}
  </main>;
}
