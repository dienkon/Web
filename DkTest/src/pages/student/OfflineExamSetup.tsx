import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loadOfflineExam, countOfflineAttempts } from '../../services/offline/exams';
import { offlineStore, type OfflineExam } from '../../services/offline/store';
import { hasActiveExamInProgress, hydrateActiveExamSession } from '../../services/examSessionService';
import StudentSubExamConfig from '../../features/sub-exam/components/StudentSubExamConfig';
import { buildSubExamAttempt } from '../../features/sub-exam/engine/buildSubExamAttempt';
import type { SubExamConfig } from '../../features/sub-exam/types/subExam';
import CopyExamCode from '../../components/exam/CopyExamCode';

export default function OfflineExamSetup() {
  const { examId = '' } = useParams();
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [pack, setPack] = useState<OfflineExam>();
  const [useSubExam, setUseSubExam] = useState(false);
  const [config, setConfig] = useState<SubExamConfig>({ enabled: false, selectionMode: 'by_type' });
  const [password, setPassword] = useState('');
  const [resuming, setResuming] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!user) return;
    void (async () => {
      const value = await loadOfflineExam(examId);
      if (!active) return;
      if (!value) { setError('Đề chưa được tải vào tài khoản này.'); return; }
      const draft = await offlineStore.getDraft(user.uid, examId);
      if (!active) return;
      if (draft) hydrateActiveExamSession(draft.session);
      setResuming(!!hasActiveExamInProgress(examId, true)); setPack(value);
      const used = await countOfflineAttempts(value);
      if (active) { setAttempts(used); setConfig({ selectionMode: 'by_type', ...value.exam.subExamConfig, enabled: false }); }
    })().catch(() => { if (active) setError('Không đọc được đề trên thiết bị.'); });
    return () => { active = false; };
  }, [user?.uid, examId]);
  const selectedCount = useMemo(() => pack ? useSubExam ? buildSubExamAttempt(pack.exam, pack.questions, pack.sections, { ...config, enabled: true }).questions.length : pack.questions.length : 0, [pack, config, useSubExam]);
  if (loading) return <p className="p-6">Đang mở tài khoản…</p>;
  if (!user || userProfile?.role !== 'student') return <div className="p-6"><Link to="/login">Đăng nhập tài khoản đã tải đề</Link></div>;
  return <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-24"><Link className="text-blue-600" to="/student/offline">← Đề thi trên máy</Link><h1 className="font-bold text-2xl">{pack?.exam.title || 'Thiết lập bài thi offline'}</h1>{error && <p role="alert" className="text-red-600">{error}</p>}
    {pack && <><CopyExamCode code={pack.exam.code} className="rounded-lg bg-blue-50 text-blue-700 px-3 py-2 text-sm font-semibold" /><p>{pack.questions.length} câu trong ngân hàng · {pack.exam.timeLimit || pack.exam.duration ? `${pack.exam.timeLimit || pack.exam.duration} phút` : 'Không giới hạn thời gian'}</p>
      {resuming ? <p className="bg-amber-50 text-amber-900 p-4 rounded-xl">Bạn có bài đang làm. Đề con, thứ tự câu hỏi và đồng hồ được giữ nguyên khi tiếp tục.</p> : <>
        {(pack.exam.allowSubExam || pack.exam.subExamConfig?.enabled) && <StudentSubExamConfig useSubExam={useSubExam} setUseSubExam={setUseSubExam} config={config} setConfig={setConfig} questions={pack.questions} sections={pack.sections} />}
        <p role="status">Bài sẽ có {selectedCount} câu hỏi.</p>
        {pack.exam.password && <label className="block">Mật khẩu đề thi<input aria-label="Mật khẩu đề thi" type="password" className="block border rounded-lg p-2 w-full dark:bg-slate-800" value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
      </>}
      <button className="bg-blue-600 text-white rounded-xl px-5 py-3 font-bold disabled:opacity-40" disabled={!resuming && selectedCount === 0} onClick={() => {
        setError('');
        if (!resuming) {
          if (pack.exam.openTime && Date.parse(pack.exam.openTime) > Date.now()) return setError('Chưa đến thời gian mở đề.');
          if (pack.exam.closeTime && Date.parse(pack.exam.closeTime) <= Date.now()) return setError('Đề đã đóng nhận bài.');
          if (pack.exam.maxAttempts > 0 && attempts >= pack.exam.maxAttempts) return setError('Bạn đã hết lượt làm bài của đề này.');
          if (pack.exam.password && password !== pack.exam.password) return setError('Mật khẩu đề thi không chính xác.');
          try { localStorage.setItem(`custom_sub_exam_config_${examId}`, JSON.stringify({ ownerUid: user.uid, useSubExam, config: { ...config, enabled: useSubExam } })); }
          catch { return setError('Không lưu được cấu hình trên thiết bị. Kiểm tra dung lượng máy.'); }
        }
        navigate(`/student/exam/${examId}/take?offline=1`);
      }}>{resuming ? 'Tiếp tục bài đang làm' : 'Bắt đầu làm bài offline'}</button>
    </>}
  </main>;
}
