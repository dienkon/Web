import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { offlineStore, type LocalSubmission } from '../../services/offline/store';
import { useAuth } from '../../context/AuthContext';

export default function OfflineSubmissionNotice({ id }: { id?: string }) {
  const { user } = useAuth();
  const [record, setRecord] = useState<LocalSubmission>();
  useEffect(() => {
    let active = true;
    const read = async () => {
      if (!id) return;
      const value = await offlineStore.getSubmission(id);
      if (active) setRecord(value?.uid === user?.uid ? value : undefined);
    };
    void read();
    window.addEventListener('dktest-offline-change', read);
    return () => { active = false; window.removeEventListener('dktest-offline-change', read); };
  }, [id, user?.uid]);
  if (!record) return null;
  return <div role="status" className={`rounded-xl p-4 space-y-1 print:hidden ${record.state === 'synced' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
    <p className="font-bold">{record.state === 'synced' ? 'Máy chủ đã nhận bài làm' : 'Đã nộp và lưu bài trên thiết bị'}</p>
    <p className="text-sm">{record.state === 'synced' ? 'Bài làm đã đồng bộ thành công.' : record.error || 'Chưa có xác nhận từ máy chủ. Ứng dụng sẽ tự gửi khi có mạng; không cần nộp lại.'}</p>
    <Link to="/student/offline" className="underline text-sm">Mở kho đề và xem trạng thái đồng bộ</Link>
  </div>;
}
